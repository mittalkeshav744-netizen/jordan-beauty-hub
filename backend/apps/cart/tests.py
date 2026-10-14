from django.test import override_settings
from rest_framework import status
from rest_framework.test import APITestCase

from apps.test_factories import make_product, make_user


class CartApiTests(APITestCase):
    def setUp(self):
        self.user = make_user()
        self.client.force_authenticate(self.user)
        self.variant = make_product(price="250.00", stock=5).variants.get()

    def add(self, quantity=1, variant_id=None):
        return self.client.post(
            "/api/cart/items/", {"variant_id": variant_id or self.variant.pk, "quantity": quantity}
        )

    def test_cart_requires_login(self):
        self.client.force_authenticate(None)
        self.assertEqual(self.client.get("/api/cart/").status_code, status.HTTP_403_FORBIDDEN)

    def test_add_item_and_compute_subtotal_on_server(self):
        response = self.add(2)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["item_count"], 2)
        self.assertEqual(response.data["subtotal"], "500.00")

    def test_adding_same_variant_merges_quantity(self):
        self.add(1)
        response = self.add(2)
        self.assertEqual(len(response.data["items"]), 1)
        self.assertEqual(response.data["items"][0]["quantity"], 3)

    def test_cannot_add_more_than_stock(self):
        response = self.add(6)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Only 5", response.data["detail"])

    def test_rejects_zero_and_negative_quantity(self):
        self.assertEqual(self.add(0).status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(self.add(-3).status_code, status.HTTP_400_BAD_REQUEST)

    @override_settings(MAX_CART_ITEM_QUANTITY=2)
    def test_enforces_maximum_quantity_per_item(self):
        self.assertEqual(self.add(3).status_code, status.HTTP_400_BAD_REQUEST)

    def test_cannot_add_inactive_or_missing_variant(self):
        self.variant.is_active = False
        self.variant.save()
        self.assertEqual(self.add(1).status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(self.add(1, variant_id=99999).status_code, status.HTTP_400_BAD_REQUEST)

    def test_update_and_remove_item(self):
        item_id = self.add(1).data["items"][0]["id"]
        response = self.client.patch(f"/api/cart/items/{item_id}/", {"quantity": 4})
        self.assertEqual(response.data["subtotal"], "1000.00")
        response = self.client.delete(f"/api/cart/items/{item_id}/")
        self.assertEqual(response.data["items"], [])

    def test_cannot_modify_another_users_cart_item(self):
        item_id = self.add(1).data["items"][0]["id"]
        self.client.force_authenticate(make_user())
        response = self.client.patch(f"/api/cart/items/{item_id}/", {"quantity": 2})
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
