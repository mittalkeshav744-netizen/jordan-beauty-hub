from decimal import Decimal

from django.test import override_settings
from rest_framework import status
from rest_framework.test import APITestCase

from apps.store.models import NewsletterSubscriber


class StoreSettingsTests(APITestCase):
    @override_settings(
        SHIPPING_FLAT_FEE=Decimal("49"),
        FREE_SHIPPING_THRESHOLD=Decimal("499"),
        STORE_WHATSAPP_NUMBER="919876543210",
    )
    def test_public_settings_are_readable_without_login(self):
        response = self.client.get("/api/store/settings/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            response.data,
            {
                "currency": "INR",
                "shipping_flat_fee": "49.00",
                "free_shipping_threshold": "499.00",
                "whatsapp_number": "919876543210",
            },
        )


class NewsletterTests(APITestCase):
    def signup(self, email):
        return self.client.post("/api/store/newsletter/", {"email": email})

    def test_signup_stores_email_once_with_the_same_reply(self):
        first = self.signup("Asha@Example.com")
        again = self.signup("asha@example.com")
        self.assertEqual(first.status_code, status.HTTP_200_OK)
        self.assertEqual(first.data, again.data)
        self.assertEqual(list(NewsletterSubscriber.objects.values_list("email", flat=True)), ["asha@example.com"])

    def test_rejects_invalid_email(self):
        response = self.signup("not-an-email")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("email", response.data["errors"])
        self.assertFalse(NewsletterSubscriber.objects.exists())
