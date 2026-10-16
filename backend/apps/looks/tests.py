from decimal import Decimal

from django.core.exceptions import ValidationError
from rest_framework import status
from rest_framework.test import APITestCase

from apps.catalog.models import ProductVariant
from apps.looks.models import Look, LookStep
from apps.test_factories import make_product


class LookApiTests(APITestCase):
    def setUp(self):
        self.lipstick = make_product("Lipstick", price="699.00")
        self.red = self.lipstick.variants.get()
        self.nude = ProductVariant.objects.create(
            product=self.lipstick, name="Nude", sku="NUDE-1", price=Decimal("649.00"), stock_quantity=0
        )
        self.kajal = make_product("Kajal", price="349.00")
        self.hidden = make_product("Hidden", is_active=False)
        self.look = Look.objects.create(title="Festive glam", slug="festive-glam", occasion="Festive")
        LookStep.objects.create(look=self.look, product=self.kajal, sort_order=0, instruction="Line the eyes.")
        LookStep.objects.create(look=self.look, product=self.lipstick, variant=self.red, sort_order=1)
        LookStep.objects.create(look=self.look, product=self.hidden, sort_order=2)

    def test_list_shows_active_looks_with_product_count(self):
        Look.objects.create(title="Draft", slug="draft", is_active=False)
        response = self.client.get("/api/looks/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual([look["slug"] for look in response.data], ["festive-glam"])
        self.assertEqual(response.data[0]["product_count"], 2)
        self.assertFalse(response.data[0]["has_video"])

    def test_detail_lists_steps_and_prices_the_full_look(self):
        response = self.client.get("/api/looks/festive-glam/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        steps = response.data["steps"]
        self.assertEqual([step["product"]["name"] for step in steps], ["Kajal", "Lipstick"])
        self.assertEqual(steps[0]["instruction"], "Line the eyes.")
        self.assertIsNone(steps[0]["variant"])
        self.assertEqual(steps[1]["variant"]["name"], self.red.name)
        self.assertEqual(
            response.data["bag_variant_ids"], [self.kajal.variants.get().pk, self.red.pk]
        )
        self.assertEqual(response.data["total_price"], "1048.00")

    def test_sold_out_chosen_shade_is_left_out_of_the_bag(self):
        LookStep.objects.filter(product=self.lipstick).update(variant=self.nude)
        response = self.client.get("/api/looks/festive-glam/")
        self.assertEqual(response.data["bag_variant_ids"], [self.kajal.variants.get().pk])
        self.assertEqual(response.data["total_price"], "349.00")

    def test_inactive_look_is_not_found(self):
        Look.objects.filter(pk=self.look.pk).update(is_active=False)
        self.assertEqual(self.client.get("/api/looks/festive-glam/").status_code, 404)

    def test_step_shade_must_belong_to_the_product(self):
        step = LookStep(look=self.look, product=self.kajal, variant=self.red)
        with self.assertRaises(ValidationError):
            step.full_clean()
