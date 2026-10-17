import json
from decimal import Decimal
from io import BytesIO
from unittest.mock import patch
from urllib.error import HTTPError

from django.test import override_settings
from rest_framework import status
from rest_framework.test import APITestCase

from apps.store.models import NewsletterSubscriber


class StoreSettingsTests(APITestCase):
    @override_settings(
        SHIPPING_FLAT_FEE=Decimal("49"),
        FREE_SHIPPING_THRESHOLD=Decimal("499"),
        STORE_WHATSAPP_NUMBER="919876543210",
        GOOGLE_GEMINI_API_KEY="",
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
                "chat_enabled": False,
            },
        )

    @override_settings(GOOGLE_GEMINI_API_KEY="test-key")
    def test_chat_enabled_when_gemini_key_is_set(self):
        response = self.client.get("/api/store/settings/")
        self.assertTrue(response.data["chat_enabled"])


class BeautyChatTests(APITestCase):
    def post_chat(self, payload):
        return self.client.post("/api/store/chat/", payload, format="json")

    @override_settings(GOOGLE_GEMINI_API_KEY="")
    def test_explains_when_chat_is_not_configured(self):
        response = self.post_chat({"message": "Do you have COD?"})
        self.assertEqual(response.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)
        self.assertIn("GOOGLE_GEMINI_API_KEY", response.data["detail"])

    @override_settings(GOOGLE_GEMINI_API_KEY="test-key", GEMINI_MODEL="gemini-flash-latest")
    @patch("apps.store.chat.urllib.request.urlopen")
    def test_returns_gemini_reply(self, urlopen):
        body = json.dumps(
            {
                "candidates": [
                    {"content": {"parts": [{"text": "Yes - we only take Cash on Delivery."}]}}
                ]
            }
        ).encode()
        urlopen.return_value.__enter__.return_value.read.return_value = body

        response = self.post_chat(
            {
                "message": "Do you have COD?",
                "history": [{"role": "user", "content": "Hi"}, {"role": "assistant", "content": "Hello!"}],
            }
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["reply"], "Yes - we only take Cash on Delivery.")
        request = urlopen.call_args[0][0]
        self.assertIn("gemini-flash-latest", request.full_url)
        self.assertIn("key=test-key", request.full_url)

    @override_settings(GOOGLE_GEMINI_API_KEY="test-key")
    @patch("apps.store.chat.urllib.request.urlopen")
    def test_maps_provider_failures(self, urlopen):
        urlopen.side_effect = HTTPError(
            "https://example.test", 429, "Too Many Requests", hdrs=None, fp=BytesIO(b"{}")
        )
        response = self.post_chat({"message": "Hello"})
        self.assertEqual(response.status_code, status.HTTP_502_BAD_GATEWAY)

    def test_rejects_empty_message(self):
        response = self.post_chat({"message": ""})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


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
