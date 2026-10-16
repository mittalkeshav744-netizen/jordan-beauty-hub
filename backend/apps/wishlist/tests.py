from rest_framework import status
from rest_framework.test import APITestCase

from apps.test_factories import make_product, make_user
from apps.wishlist.models import WishlistItem


class WishlistApiTests(APITestCase):
    def setUp(self):
        self.user = make_user()
        self.client.force_authenticate(self.user)
        self.product = make_product(price="349.00")

    def save(self, product_id):
        return self.client.post("/api/wishlist/", {"product_id": product_id})

    def test_wishlist_requires_login(self):
        self.client.force_authenticate(None)
        self.assertEqual(self.client.get("/api/wishlist/").status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(self.save(self.product.pk).status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(
            self.client.delete(f"/api/wishlist/{self.product.pk}/").status_code,
            status.HTTP_403_FORBIDDEN,
        )

    def test_save_list_and_remove(self):
        response = self.save(self.product.pk)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["product_ids"], [self.product.pk])
        self.assertEqual(response.data["products"][0]["min_price"], "349.00")

        self.assertEqual(self.client.get("/api/wishlist/").data["product_ids"], [self.product.pk])

        response = self.client.delete(f"/api/wishlist/{self.product.pk}/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["product_ids"], [])

    def test_saving_twice_keeps_one_entry_and_newest_comes_first(self):
        other = make_product()
        self.save(self.product.pk)
        self.save(other.pk)
        response = self.save(self.product.pk)
        self.assertEqual(response.data["product_ids"], [other.pk, self.product.pk])
        self.assertEqual(WishlistItem.objects.filter(user=self.user).count(), 2)

    def test_rejects_unknown_and_inactive_products(self):
        self.assertEqual(self.save(999999).status_code, status.HTTP_400_BAD_REQUEST)
        hidden = make_product(is_active=False)
        response = self.save(hidden.pk)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["detail"], "This product is not available.")

    def test_products_taken_off_sale_drop_out_of_the_list(self):
        self.save(self.product.pk)
        self.product.is_active = False
        self.product.save(update_fields=["is_active"])
        self.assertEqual(self.client.get("/api/wishlist/").data["product_ids"], [])

    def test_customers_only_see_and_change_their_own_wishlist(self):
        self.save(self.product.pk)
        stranger = make_user()
        self.client.force_authenticate(stranger)
        self.assertEqual(self.client.get("/api/wishlist/").data["product_ids"], [])

        self.client.delete(f"/api/wishlist/{self.product.pk}/")
        self.assertTrue(WishlistItem.objects.filter(user=self.user, product=self.product).exists())
