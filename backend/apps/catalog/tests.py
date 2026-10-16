import shutil
import tempfile
from io import StringIO
from unittest.mock import patch

from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import TestCase, override_settings
from rest_framework import status
from rest_framework.test import APITestCase

from apps.catalog.models import (
    Brand,
    Category,
    Concern,
    ProductImage,
    ProductVariant,
    Review,
    SkinType,
    StockMovement,
)
from apps.catalog.services import InsufficientStockError, change_stock
from apps.orders.models import Order
from apps.orders.services import change_order_status, place_order
from apps.test_factories import make_address, make_product, make_user

COMMAND_MODULE = "apps.catalog.management.commands.attach_sample_images"


class ProductApiTests(APITestCase):
    def setUp(self):
        self.lips = Category.objects.create(name="Lips", slug="lips")
        self.skin = Category.objects.create(name="Skincare", slug="skincare")
        self.brand = Brand.objects.create(name="Jordan", slug="jordan")
        self.lipstick = make_product(
            "Matte Lipstick", price="699.00", category=self.lips, brand=self.brand, is_featured=True
        )
        self.serum = make_product("Glow Serum", price="899.00", category=self.skin, brand=self.brand)
        self.hidden = make_product("Hidden", category=self.lips, brand=self.brand, is_active=False)

    def results(self, url):
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        return [item["name"] for item in response.data["results"]]

    def test_list_is_paginated_and_hides_inactive_products(self):
        response = self.client.get("/api/catalog/products/")
        self.assertEqual(response.data["count"], 2)
        self.assertNotIn("Hidden", [item["name"] for item in response.data["results"]])

    def test_filter_by_category_search_and_price(self):
        self.assertEqual(self.results("/api/catalog/products/?category=lips"), ["Matte Lipstick"])
        self.assertEqual(self.results("/api/catalog/products/?search=serum"), ["Glow Serum"])
        self.assertEqual(self.results("/api/catalog/products/?max_price=700"), ["Matte Lipstick"])
        self.assertEqual(self.results("/api/catalog/products/?featured=true"), ["Matte Lipstick"])

    def test_ordering_by_price(self):
        self.assertEqual(
            self.results("/api/catalog/products/?ordering=price_desc"),
            ["Glow Serum", "Matte Lipstick"],
        )

    def test_price_range_follows_filters_but_ignores_price(self):
        url = "/api/catalog/products/price-range/"
        self.assertEqual(self.client.get(url).data, {"min": "699.00", "max": "899.00"})
        self.assertEqual(self.client.get(f"{url}?min_price=800").data, {"min": "699.00", "max": "899.00"})
        self.assertEqual(self.client.get(f"{url}?category=skincare").data, {"min": "899.00", "max": "899.00"})
        self.assertEqual(self.client.get(f"{url}?category=nope").data, {"min": None, "max": None})

    def test_invalid_price_filter_is_ignored(self):
        self.assertEqual(len(self.results("/api/catalog/products/?min_price=abc")), 2)

    def test_detail_includes_variants_and_min_price(self):
        response = self.client.get(f"/api/catalog/products/{self.lipstick.slug}/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["min_price"], "699.00")
        self.assertEqual(len(response.data["variants"]), 1)

    def test_detail_includes_net_quantity_and_empty_rating_breakdown(self):
        self.lipstick.net_quantity = "4.5 g"
        self.lipstick.save()
        response = self.client.get(f"/api/catalog/products/{self.lipstick.slug}/")
        self.assertEqual(response.data["net_quantity"], "4.5 g")
        self.assertEqual(response.data["rating_breakdown"], {"5": 0, "4": 0, "3": 0, "2": 0, "1": 0})

    def test_filter_by_ids_ignores_junk_and_hidden_products(self):
        ids = f"{self.serum.pk},abc,{self.hidden.pk}"
        self.assertEqual(self.results(f"/api/catalog/products/?ids={ids}"), ["Glow Serum"])

    def test_related_products_share_the_category_and_exclude_the_product(self):
        balm = make_product("Lip Balm", category=self.lips, brand=self.brand)
        response = self.client.get(f"/api/catalog/products/{self.lipstick.slug}/related/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual([item["name"] for item in response.data], [balm.name])

    def test_inactive_product_detail_returns_404(self):
        response = self.client.get(f"/api/catalog/products/{self.hidden.slug}/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_catalog_is_read_only_even_for_customers(self):
        self.client.force_authenticate(make_user())
        response = self.client.post("/api/catalog/products/", {"name": "Hack"})
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)


class ConcernAndRoutineTests(APITestCase):
    def setUp(self):
        self.oily = SkinType.objects.get(slug="oily")
        self.dry = SkinType.objects.get(slug="dry")
        self.acne = Concern.objects.create(name="Acne", slug="acne")
        self.skincare = Category.objects.create(name="Skincare", slug="skincare")
        self.brand = Brand.objects.create(name="Jordan", slug="jordan")

    def product(self, name, step="", price="400.00", skin_types=(), concerns=(), **extra):
        product = make_product(
            name, price=price, category=self.skincare, brand=self.brand, routine_step=step, **extra
        )
        product.skin_types.set(skin_types)
        product.concerns.set(concerns)
        return product

    def test_concerns_are_listed_and_filter_products(self):
        self.product("Acne Gel", concerns=[self.acne])
        self.product("Plain Cream")
        Concern.objects.create(name="Hidden", slug="hidden", is_active=False)

        concerns = self.client.get("/api/catalog/concerns/").data
        self.assertEqual([item["slug"] for item in concerns], ["acne"])
        response = self.client.get("/api/catalog/products/?concern=acne")
        self.assertEqual([item["name"] for item in response.data["results"]], ["Acne Gel"])

    def test_skin_types_come_from_the_migration(self):
        slugs = [item["slug"] for item in self.client.get("/api/catalog/skin-types/").data]
        self.assertEqual(slugs, ["normal", "oily", "dry", "combination", "sensitive"])

    def test_routine_prefers_concern_and_respects_skin_type_budget_and_stock(self):
        self.product("Basic Wash", "cleanser", "300.00")
        acne_wash = self.product("Acne Wash", "cleanser", "350.00", concerns=[self.acne])
        self.product("Dry Skin Cream", "moisturiser", skin_types=[self.dry])
        gel = self.product("Oily Gel", "moisturiser", "450.00", skin_types=[self.oily])
        self.product("Luxury Sunscreen", "sunscreen", "1500.00")
        self.product("Sold Out Serum", "serum", stock=0)

        response = self.client.get("/api/catalog/routine/?skin_type=oily&concern=acne&max_price=500")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        morning = {step["step"]: step["product"] for step in response.data["morning"]}
        self.assertEqual(morning["cleanser"]["name"], "Acne Wash")
        self.assertEqual(morning["moisturiser"]["name"], "Oily Gel")
        self.assertIsNone(morning["serum"])
        self.assertIsNone(morning["sunscreen"])
        self.assertEqual([step["step"] for step in response.data["night"]], ["cleanser", "night_treatment", "moisturiser"])
        expected_ids = {acne_wash.variants.get().pk, gel.variants.get().pk}
        self.assertEqual(set(response.data["bag_variant_ids"]), expected_ids)
        self.assertEqual(response.data["total_price"], "800.00")

    def test_routine_rejects_unknown_skin_type(self):
        response = self.client.get("/api/catalog/routine/?skin_type=martian")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("skin_type", response.data["errors"])


class StockServiceTests(APITestCase):
    def test_change_stock_logs_movement_and_blocks_negative_stock(self):
        variant = make_product(stock=3).variants.get()
        change_stock(variant.pk, -2, StockMovement.Reason.ORDER, "TEST")
        variant.refresh_from_db()
        self.assertEqual(variant.stock_quantity, 1)
        self.assertEqual(variant.stock_movements.count(), 1)
        with self.assertRaises(InsufficientStockError):
            change_stock(variant.pk, -2, StockMovement.Reason.ORDER, "TEST")


class ReviewTests(APITestCase):
    def setUp(self):
        self.user = make_user()
        self.product = make_product()
        self.url = f"/api/catalog/products/{self.product.slug}/reviews/"
        self.client.force_authenticate(self.user)

    def deliver_order(self):
        import uuid

        from apps.cart.services import add_item

        add_item(self.user, ProductVariant.objects.get(product=self.product).pk, 1)
        order, _ = place_order(self.user, make_address(self.user), uuid.uuid4())
        for next_status in ["confirmed", "processing", "shipped", "delivered"]:
            order = change_order_status(order, next_status)
        return order

    def test_review_requires_delivered_order(self):
        response = self.client.post(self.url, {"rating": 5, "title": "Love it"})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_verified_customer_can_review_once(self):
        order = self.deliver_order()
        self.assertEqual(order.status, Order.Status.DELIVERED)
        response = self.client.post(self.url, {"rating": 4, "title": "Nice"})
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(self.client.post(self.url, {"rating": 5}).status_code, 400)

        listing = self.client.get(f"/api/catalog/products/{self.product.slug}/")
        self.assertEqual(listing.data["review_count"], 1)
        self.assertEqual(listing.data["average_rating"], 4.0)
        self.assertEqual(listing.data["rating_breakdown"], {"5": 0, "4": 1, "3": 0, "2": 0, "1": 0})

    def test_rating_must_be_between_1_and_5(self):
        self.deliver_order()
        response = self.client.post(self.url, {"rating": 6})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(Review.objects.exists())

    def test_anonymous_user_cannot_post_review(self):
        self.client.force_authenticate(None)
        self.assertEqual(self.client.post(self.url, {"rating": 5}).status_code, 403)


class SeedCatalogCommandTests(TestCase):
    def test_creates_sample_reviews_once_from_accounts_nobody_can_sign_in_to(self):
        with override_settings(DEBUG=True):
            call_command("seed_catalog", stdout=StringIO())
            call_command("seed_catalog", stdout=StringIO())

        reviews = Review.objects.select_related("user")
        self.assertEqual(reviews.count(), 34)
        self.assertTrue(all(review.user.email.endswith("@example.com") for review in reviews))
        self.assertFalse(any(review.user.has_usable_password() for review in reviews))
        self.assertTrue(all(review.product.reviews.count() >= 2 for review in reviews))


class AttachSampleImagesCommandTests(TestCase):
    def setUp(self):
        self.media_root = tempfile.mkdtemp()
        self.addCleanup(shutil.rmtree, self.media_root, ignore_errors=True)
        self.product = make_product()
        self.product.slug = "hydrating-lip-balm"
        self.product.save()
        self.category = self.product.category
        self.category.slug = "lips"
        self.category.save()

    def test_refuses_to_run_without_debug(self):
        with override_settings(DEBUG=False), self.assertRaises(CommandError):
            call_command("attach_sample_images", stdout=StringIO())

    def test_attaches_images_once_without_network(self):
        with (
            override_settings(DEBUG=True, MEDIA_ROOT=self.media_root),
            patch(f"{COMMAND_MODULE}.fetch_image", return_value=b"jpeg-bytes") as fetch,
        ):
            call_command("attach_sample_images", stdout=StringIO())
            call_command("attach_sample_images", stdout=StringIO())

        images = list(self.product.images.order_by("sort_order"))
        self.assertEqual(len(images), 3)
        self.assertEqual(fetch.call_count, 3)
        self.assertTrue(all(image.alt_text for image in images))
        self.assertEqual([image.sort_order for image in images], [0, 1, 2])
        self.assertTrue(images[0].image.name.startswith("products/hydrating-lip-balm-1"))
        self.assertTrue(images[2].image.name.startswith("products/hydrating-lip-balm-3-ai"))
        self.category.refresh_from_db()
        self.assertTrue(self.category.image.name.startswith("categories/category-lips"))

    def test_tops_up_a_product_without_going_over_three_images(self):
        ProductImage.objects.create(product=self.product, image="products/own-photo.jpg", alt_text="Own photo")
        with (
            override_settings(DEBUG=True, MEDIA_ROOT=self.media_root),
            patch(f"{COMMAND_MODULE}.fetch_image", return_value=b"jpeg-bytes"),
        ):
            call_command("attach_sample_images", stdout=StringIO())

        alts = list(self.product.images.order_by("sort_order").values_list("alt_text", flat=True))
        self.assertEqual(len(alts), 3)
        self.assertEqual(alts[0], "Own photo")
