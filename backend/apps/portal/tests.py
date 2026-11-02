import shutil
import tempfile
import uuid
from io import BytesIO

from django.core import mail
from django.test import override_settings
from django.core.files.uploadedfile import SimpleUploadedFile
from django.utils import timezone
from PIL import Image
from rest_framework import status
from rest_framework.test import APITestCase

from apps.cart.services import add_item
from apps.catalog.models import ProductImage, Review
from apps.catalog.services import PRODUCT_IMAGE_SIDE
from apps.store.models import NewsletterSubscriber
from apps.test_factories import make_address, make_coupon, make_product, make_user


def _png_upload(name, width, height, colour):
    image = Image.new("RGB", (width, height), colour)
    buffer = BytesIO()
    image.save(buffer, format="PNG")
    return SimpleUploadedFile(name, buffer.getvalue(), content_type="image/png")


class PortalAccessTests(APITestCase):
    def setUp(self):
        self.customer = make_user()
        self.staff = make_user(email="owner@example.com", is_staff=True)

    def test_guest_cannot_open_dashboard(self):
        response = self.client.get("/api/portal/dashboard/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_customer_cannot_open_dashboard(self):
        self.client.force_authenticate(self.customer)
        response = self.client.get("/api/portal/dashboard/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_staff_can_open_dashboard(self):
        self.client.force_authenticate(self.staff)
        response = self.client.get("/api/portal/dashboard/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("orders_today", response.data)
        self.assertIn("revenue_30d", response.data)
        self.assertIn("attention", response.data)
        self.assertIn("recent_orders", response.data)
        self.assertIn("nav_badges", response.data)
        self.assertIn("status_breakdown", response.data)
        self.assertIn("orders_this_week", response.data)

        nav = self.client.get("/api/portal/nav/")
        self.assertEqual(nav.status_code, status.HTTP_200_OK)
        self.assertIn("pending_orders", nav.data)


class PortalOrderTests(APITestCase):
    def setUp(self):
        self.staff = make_user(email="owner@example.com", is_staff=True)
        self.customer = make_user()
        self.address = make_address(self.customer)
        self.variant = make_product(stock=5).variants.get()
        self.client.force_authenticate(self.customer)
        add_item(self.customer, self.variant.pk, 1)
        place = self.client.post(
            "/api/orders/",
            {"address_id": self.address.pk, "idempotency_key": str(uuid.uuid4())},
            format="json",
        )
        self.assertEqual(place.status_code, status.HTTP_201_CREATED)
        self.order_number = place.data["number"]
        self.client.force_authenticate(self.staff)

    def test_staff_lists_and_updates_order_status(self):
        listing = self.client.get("/api/portal/orders/")
        self.assertEqual(listing.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(listing.data["count"], 1)

        detail = self.client.get(f"/api/portal/orders/{self.order_number}/")
        self.assertEqual(detail.status_code, status.HTTP_200_OK)
        self.assertEqual(detail.data["customer_id"], self.customer.pk)
        self.assertEqual(set(detail.data["allowed_next_statuses"]), {"confirmed", "cancelled"})

        update = self.client.post(
            f"/api/portal/orders/{self.order_number}/status/",
            {"status": "confirmed", "note": "Payment verified"},
            format="json",
        )
        self.assertEqual(update.status_code, status.HTTP_200_OK)
        self.assertEqual(update.data["status"], "confirmed")

        bad = self.client.post(
            f"/api/portal/orders/{self.order_number}/status/",
            {"status": "delivered"},
            format="json",
        )
        self.assertEqual(bad.status_code, status.HTTP_400_BAD_REQUEST)


class PortalProductStockTests(APITestCase):
    def setUp(self):
        self.staff = make_user(email="owner@example.com", is_staff=True)
        self.product = make_product(stock=3)
        self.variant = self.product.variants.first()
        self.client.force_authenticate(self.staff)

    def test_patch_product_and_adjust_stock(self):
        patch = self.client.patch(
            f"/api/portal/products/{self.product.id}/",
            {"is_featured": True, "short_description": "Staff pick"},
            format="json",
        )
        self.assertEqual(patch.status_code, status.HTTP_200_OK)
        self.assertTrue(patch.data["is_featured"])

        stock = self.client.post(
            f"/api/portal/variants/{self.variant.id}/stock/",
            {"quantity_change": 7, "reason": "restock", "reference": "Shipment A"},
            format="json",
        )
        self.assertEqual(stock.status_code, status.HTTP_200_OK)
        self.assertEqual(stock.data["stock_quantity"], 10)

    def test_list_filters_by_category_id(self):
        from apps.catalog.models import Category

        other = Category.objects.create(name="Other Cat", slug="other-cat-filter")
        make_product(name="In Other Category", category=other, stock=1)
        filtered = self.client.get(
            "/api/portal/products/",
            {"category": self.product.category_id, "page_size": 200},
        )
        self.assertEqual(filtered.status_code, status.HTTP_200_OK)
        names = {row["name"] for row in filtered.data["results"]}
        self.assertIn(self.product.name, names)
        self.assertNotIn("In Other Category", names)

    def test_lists_every_product_and_can_create_edit_discount_and_delete(self):
        from apps.catalog.models import Brand, Category

        hidden = make_product(name="Hidden Shade", stock=0)
        hidden.is_active = False
        hidden.save(update_fields=["is_active"])

        listing = self.client.get("/api/portal/products/", {"page_size": 200})
        self.assertEqual(listing.status_code, status.HTTP_200_OK)
        names = {row["name"] for row in listing.data["results"]}
        self.assertIn(self.product.name, names)
        self.assertIn("Hidden Shade", names)

        brand = Brand.objects.order_by("id").first()
        category = Category.objects.order_by("id").first()
        created = self.client.post(
            "/api/portal/products/",
            {
                "name": "Portal Lip Oil",
                "brand_id": brand.id,
                "category_id": category.id,
                "short_description": "Shine",
                "variant_name": "Rose",
                "price": "499.00",
                "compare_at_price": "699.00",
                "stock_quantity": 4,
            },
            format="json",
        )
        self.assertEqual(created.status_code, status.HTTP_201_CREATED)
        variant = created.data["variants"][0]
        self.assertEqual(variant["stock_quantity"], 4)
        self.assertEqual(variant["compare_at_price"], "699.00")

        edited = self.client.patch(
            f"/api/portal/variants/{variant['id']}/",
            {
                "name": "Rose Nude",
                "price": "450.00",
                "compare_at_price": "699.00",
                "is_active": True,
            },
            format="json",
        )
        self.assertEqual(edited.status_code, status.HTTP_200_OK)
        saved = next(row for row in edited.data["variants"] if row["id"] == variant["id"])
        self.assertEqual(saved["price"], "450.00")
        self.assertEqual(saved["name"], "Rose Nude")

        out = self.client.post(f"/api/portal/variants/{variant['id']}/out-of-stock/")
        self.assertEqual(out.status_code, status.HTTP_200_OK)
        self.assertEqual(out.data["stock_quantity"], 0)

        bad_discount = self.client.patch(
            f"/api/portal/variants/{variant['id']}/",
            {"name": "Rose Nude", "price": "800.00", "compare_at_price": "699.00", "is_active": True},
            format="json",
        )
        self.assertEqual(bad_discount.status_code, status.HTTP_400_BAD_REQUEST)

        deleted = self.client.delete(f"/api/portal/products/{created.data['id']}/")
        self.assertEqual(deleted.status_code, status.HTTP_204_NO_CONTENT)


class PortalProductImageTests(APITestCase):
    def setUp(self):
        self.media_root = tempfile.mkdtemp()
        self.addCleanup(shutil.rmtree, self.media_root, ignore_errors=True)
        self.settings_override = override_settings(MEDIA_ROOT=self.media_root)
        self.settings_override.enable()
        self.addCleanup(self.settings_override.disable)
        self.staff = make_user(email="owner@example.com", is_staff=True)
        self.customer = make_user(email="shopper@example.com")
        self.product = make_product(name="Portal Cream")
        self.client.force_authenticate(self.staff)

    def test_staff_can_add_reorder_and_remove_photos(self):
        added = self.client.post(
            f"/api/portal/products/{self.product.id}/images/",
            {
                "images": [
                    _png_upload("wide.png", 80, 40, (255, 0, 0)),
                    _png_upload("second.png", 40, 40, (0, 0, 255)),
                ]
            },
            format="multipart",
        )
        self.assertEqual(added.status_code, status.HTTP_201_CREATED)
        images = added.data["images"]
        self.assertEqual(len(images), 2)
        self.assertTrue(images[0]["url"].endswith(".jpg"))
        self.assertEqual(images[0]["alt_text"], "Portal Cream")
        stored = ProductImage.objects.get(pk=images[0]["id"])
        with Image.open(stored.image.path) as saved:
            self.assertEqual(saved.format, "JPEG")
            self.assertEqual(saved.size, (PRODUCT_IMAGE_SIDE, PRODUCT_IMAGE_SIDE))

        listing = self.client.get("/api/portal/products/")
        row = next(item for item in listing.data["results"] if item["id"] == self.product.id)
        self.assertTrue(row["primary_image"].endswith(".jpg"))

        moved = self.client.patch(
            f"/api/portal/products/{self.product.id}/images/{images[1]['id']}/",
            {"move": "earlier", "alt_text": "Texture"},
            format="json",
        )
        self.assertEqual(moved.status_code, status.HTTP_200_OK)
        self.assertEqual(moved.data["images"][0]["id"], images[1]["id"])
        self.assertEqual(moved.data["images"][0]["alt_text"], "Texture")

        placed = self.client.patch(
            f"/api/portal/products/{self.product.id}/images/{images[1]['id']}/",
            {"position": 1},
            format="json",
        )
        self.assertEqual(placed.status_code, status.HTTP_200_OK)
        self.assertEqual(placed.data["images"][1]["id"], images[1]["id"])

        removed = self.client.delete(
            f"/api/portal/products/{self.product.id}/images/{images[1]['id']}/"
        )
        self.assertEqual(removed.status_code, status.HTTP_200_OK)
        self.assertEqual([image["id"] for image in removed.data["images"]], [images[0]["id"]])

    def test_a_non_photo_is_rejected_and_customers_cannot_upload(self):
        rejected = self.client.post(
            f"/api/portal/products/{self.product.id}/images/",
            {"images": SimpleUploadedFile("notes.png", b"not-a-photo", content_type="image/png")},
            format="multipart",
        )
        self.assertEqual(rejected.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(ProductImage.objects.filter(product=self.product).exists())

        self.client.force_authenticate(self.customer)
        denied = self.client.post(
            f"/api/portal/products/{self.product.id}/images/",
            {"images": _png_upload("ok.png", 20, 20, (0, 0, 0))},
            format="multipart",
        )
        self.assertEqual(denied.status_code, status.HTTP_403_FORBIDDEN)


class PortalReviewCouponTests(APITestCase):
    def setUp(self):
        self.staff = make_user(email="owner@example.com", is_staff=True)
        self.customer = make_user()
        self.product = make_product()
        self.review = Review.objects.create(
            product=self.product,
            user=self.customer,
            rating=4,
            title="Nice",
            body="Works well",
            is_approved=False,
        )
        self.client.force_authenticate(self.staff)

    def test_approve_review_and_create_coupon(self):
        approve = self.client.patch(
            f"/api/portal/reviews/{self.review.id}/",
            {"is_approved": True},
            format="json",
        )
        self.assertEqual(approve.status_code, status.HTTP_200_OK)
        self.review.refresh_from_db()
        self.assertTrue(self.review.is_approved)

        create = self.client.post(
            "/api/portal/coupons/",
            {
                "code": "portal10",
                "description": "Portal coupon",
                "discount_type": "percentage",
                "value": "10.00",
                "min_order_amount": "0.00",
                "valid_from": timezone.now().isoformat(),
                "is_active": True,
            },
            format="json",
        )
        self.assertEqual(create.status_code, status.HTTP_201_CREATED)
        self.assertEqual(create.data["code"], "PORTAL10")

        listing = self.client.get("/api/portal/coupons/")
        self.assertEqual(listing.status_code, status.HTTP_200_OK)
        codes = [row["code"] for row in listing.data["results"]]
        self.assertIn("PORTAL10", codes)


class PortalCustomersLooksSettingsTests(APITestCase):
    def setUp(self):
        self.staff = make_user(email="owner@example.com", is_staff=True)
        self.developer = make_user(
            email="developer@example.com", is_staff=True, is_superuser=True
        )
        self.customer = make_user(email="buyer@example.com")
        make_coupon()
        self.client.force_authenticate(self.staff)

    def test_customers_settings_and_newsletter(self):
        customers = self.client.get("/api/portal/customers/")
        self.assertEqual(customers.status_code, status.HTTP_200_OK)
        emails = [row["email"] for row in customers.data["results"]]
        self.assertIn("buyer@example.com", emails)
        # Staff accounts are listed too (local test checkouts use the same login).
        self.assertIn("owner@example.com", emails)
        staff_row = next(row for row in customers.data["results"] if row["email"] == "owner@example.com")
        self.assertTrue(staff_row["is_staff"])

        settings_resp = self.client.get("/api/portal/settings/")
        self.assertEqual(settings_resp.status_code, status.HTTP_200_OK)
        self.assertFalse(settings_resp.data["is_developer"])
        self.assertNotIn("django_admin_url", settings_resp.data)

        newsletter = self.client.get("/api/portal/newsletter/")
        self.assertEqual(newsletter.status_code, status.HTTP_200_OK)

        looks = self.client.get("/api/portal/looks/")
        self.assertEqual(looks.status_code, status.HTTP_200_OK)

    def test_looks_list_returns_seeded_look_fields(self):
        from apps.looks.models import Look, LookStep
        from apps.test_factories import make_product

        product = make_product(name="Portal Look Product")
        look = Look.objects.create(
            title="Portal demo look",
            slug="portal-demo-look",
            occasion="Everyday",
            description="A sample look for the owner portal.",
            is_active=True,
            sort_order=99,
        )
        LookStep.objects.create(look=look, product=product, instruction="Apply lightly.", sort_order=0)

        response = self.client.get("/api/portal/looks/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        titles = [row["title"] for row in response.data["results"]]
        self.assertIn("Portal demo look", titles)
        row = next(item for item in response.data["results"] if item["slug"] == "portal-demo-look")
        self.assertEqual(row["step_count"], 1)
        self.assertEqual(row["step_labels"], ["Portal Look Product"])
        self.assertIn("preview_images", row)
        self.assertIn("cover_image_url", row)

    def test_developer_settings_do_not_include_admin_link(self):
        self.client.force_authenticate(self.developer)
        settings_resp = self.client.get("/api/portal/settings/")
        self.assertEqual(settings_resp.status_code, status.HTTP_200_OK)
        self.assertTrue(settings_resp.data["is_developer"])
        self.assertNotIn("django_admin_url", settings_resp.data)
        self.assertNotIn("Django Admin", settings_resp.data["notes"])


class PortalCategoriesStorefrontTests(APITestCase):
    def setUp(self):
        self.staff = make_user(email="owner@example.com", is_staff=True)
        self.client.force_authenticate(self.staff)

    def test_staff_can_manage_categories(self):
        create = self.client.post(
            "/api/portal/categories/",
            {"name": "Lips", "slug": "lips", "is_active": True, "sort_order": 1},
            format="json",
        )
        self.assertEqual(create.status_code, status.HTTP_201_CREATED)
        self.assertEqual(create.data["name"], "Lips")
        self.assertEqual(create.data["product_count"], 0)

        listing = self.client.get("/api/portal/categories/")
        self.assertEqual(listing.status_code, status.HTTP_200_OK)
        self.assertTrue(any(row["slug"] == "lips" for row in listing.data))

        category_id = create.data["id"]
        update = self.client.patch(
            f"/api/portal/categories/{category_id}/",
            {"description": "Lip colour"},
            format="json",
        )
        self.assertEqual(update.status_code, status.HTTP_200_OK)
        self.assertEqual(update.data["description"], "Lip colour")

    def test_staff_can_read_and_update_storefront_config(self):
        response = self.client.get("/api/portal/storefront/config/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("hero_title", response.data)

        update = self.client.patch(
            "/api/portal/storefront/config/",
            {
                "hero_title": "Fresh drop.",
                "announcement_enabled": False,
                "budget_tiles": [
                    {"label": "Under", "amount": "₹399", "to": "/shop?max_price=399"},
                ],
            },
            format="json",
        )
        self.assertEqual(update.status_code, status.HTTP_200_OK)
        self.assertEqual(update.data["hero_title"], "Fresh drop.")
        self.assertFalse(update.data["announcement_enabled"])
        self.assertEqual(update.data["budget_tiles"][0]["amount"], "₹399")
        self.assertEqual(update.data["budget_tiles"][0]["to"], "/shop?max_price=399")

    def test_staff_can_set_homepage_picks(self):
        product = make_product(name="Home Pick Serum")
        response = self.client.get("/api/portal/homepage-picks/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["product_ids"], [])

        save = self.client.put(
            "/api/portal/homepage-picks/",
            {"product_ids": [product.id]},
            format="json",
        )
        self.assertEqual(save.status_code, status.HTTP_200_OK)
        self.assertEqual(save.data["product_ids"], [product.id])
        self.assertEqual(save.data["products"][0]["id"], product.id)

        bad = self.client.put(
            "/api/portal/homepage-picks/",
            {"product_ids": [999999]},
            format="json",
        )
        self.assertEqual(bad.status_code, status.HTTP_400_BAD_REQUEST)

    def test_staff_can_reorder_categories(self):
        from apps.catalog.models import Category

        first = Category.objects.create(name="Reorder A", slug="reorder-a", sort_order=0, is_active=True)
        second = Category.objects.create(name="Reorder B", slug="reorder-b", sort_order=1, is_active=True)
        response = self.client.post(
            "/api/portal/categories/reorder/",
            {"ordered_ids": [second.id, first.id]},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        first.refresh_from_db()
        second.refresh_from_db()
        self.assertEqual(second.sort_order, 0)
        self.assertEqual(first.sort_order, 1)

    def test_staff_can_create_and_reorder_reels(self):
        first = self.client.post(
            "/api/portal/storefront/reels/",
            {"title": "Reel A", "link_url": "/shop", "is_active": True},
            format="json",
        )
        second = self.client.post(
            "/api/portal/storefront/reels/",
            {"title": "Reel B", "link_url": "/shop", "is_active": True},
            format="json",
        )
        self.assertEqual(first.status_code, status.HTTP_201_CREATED)
        self.assertEqual(second.status_code, status.HTTP_201_CREATED)

        reorder = self.client.post(
            "/api/portal/storefront/reels/reorder/",
            {"ordered_ids": [second.data["id"], first.data["id"]]},
            format="json",
        )
        self.assertEqual(reorder.status_code, status.HTTP_200_OK)
        self.assertEqual([row["id"] for row in reorder.data], [second.data["id"], first.data["id"]])


class PortalNewsletterCampaignTests(APITestCase):
    def setUp(self):
        self.staff = make_user(email="owner@example.com", is_staff=True)
        self.customer = make_user(email="buyer@example.com")
        NewsletterSubscriber.objects.create(email="fan@example.com")
        self.client.force_authenticate(self.staff)

    def test_audience_counts_subscribers_and_customers(self):
        response = self.client.get("/api/portal/newsletter/audience/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["newsletter_subscribers"], 1)
        # fan + buyer (staff owner excluded)
        self.assertEqual(response.data["total_recipients"], 2)

    def test_owner_can_send_campaign(self):
        mail.outbox.clear()
        response = self.client.post(
            "/api/portal/newsletter/send/",
            {
                "kind": "offer",
                "subject": "Weekend glow sale",
                "message": "Enjoy 15% off selected skincare this weekend only.",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["sent"], 2)
        self.assertEqual(len(mail.outbox), 2)
        subjects = {message.subject for message in mail.outbox}
        self.assertTrue(any("Weekend glow sale" in subject for subject in subjects))

    def test_creating_active_coupon_emails_the_list(self):
        mail.outbox.clear()
        response = self.client.post(
            "/api/portal/coupons/",
            {
                "code": "GLOW15",
                "description": "Glow weekend",
                "discount_type": "percentage",
                "value": "15.00",
                "min_order_amount": "0.00",
                "valid_from": timezone.now().isoformat(),
                "is_active": True,
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertGreaterEqual(len(mail.outbox), 2)
        self.assertTrue(any("GLOW15" in message.body for message in mail.outbox))
