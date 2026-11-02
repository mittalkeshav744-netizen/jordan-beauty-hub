import json
from decimal import Decimal
from io import BytesIO
from unittest.mock import patch
from urllib.error import HTTPError

from django.test import override_settings
from rest_framework import status
from rest_framework.test import APITestCase

from apps.store.models import NewsletterSubscriber, StorefrontConfig, StorefrontReel


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


class StorefrontPublicTests(APITestCase):
    def test_public_storefront_returns_config_and_active_reels(self):
        config = StorefrontConfig.load()
        config.hero_title = "Public hero"
        config.save()
        StorefrontReel.objects.create(title="Live", link_url="/shop", is_active=True, sort_order=0)
        StorefrontReel.objects.create(title="Hidden", link_url="/shop", is_active=False, sort_order=1)

        response = self.client.get("/api/store/storefront/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["config"]["hero_title"], "Public hero")
        titles = [row["title"] for row in response.data["reels"]]
        self.assertEqual(titles, ["Live"])
        self.assertGreaterEqual(len(response.data["config"]["budget_tiles"]), 1)
        self.assertIn("amount", response.data["config"]["budget_tiles"][0])
        self.assertIn("to", response.data["config"]["budget_tiles"][0])


class BeautyChatToolTests(APITestCase):
    def test_search_products_tool_returns_markers_without_prices(self):
        from apps.store.chat.tools import execute_tool
        from apps.test_factories import make_product

        product = make_product(name="Glow Serum")
        bucket = []
        result = execute_tool(
            "search_products", {"query": "Glow"}, user=None, slug_bucket=bucket
        )
        self.assertEqual(result["count"], 1)
        self.assertEqual(result["products"][0]["slug"], product.slug)
        self.assertIn("[[slug:", result["products"][0]["marker"])
        self.assertNotIn("price", result["products"][0])
        self.assertEqual(bucket, [product.slug])

    def test_get_my_orders_is_scoped_to_the_signed_in_user(self):
        from apps.store.chat.tools import execute_tool
        from apps.test_factories import make_user

        owner = make_user(email="owner@example.com")
        other = make_user(email="other@example.com")
        denied = execute_tool("get_my_orders", {}, user=other, slug_bucket=[])
        self.assertEqual(denied["orders"], [])
        allowed = execute_tool("get_my_orders", {}, user=owner, slug_bucket=[])
        self.assertEqual(allowed["orders"], [])


class BeautyChatTests(APITestCase):
    def post_chat(self, payload):
        return self.client.post("/api/store/chat/", payload, format="json")

    @override_settings(GOOGLE_GEMINI_API_KEY="")
    def test_explains_when_chat_is_not_configured(self):
        response = self.post_chat({"message": "Tell me a fun beauty tip for dry lips"})
        self.assertEqual(response.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)
        self.assertIn("GOOGLE_GEMINI_API_KEY", response.data["detail"])

    @override_settings(GOOGLE_GEMINI_API_KEY="test-key")
    @patch("apps.store.chat.gemini.urllib.request.urlopen")
    def test_policy_faq_skips_gemini(self, urlopen):
        response = self.post_chat({"message": "Do you have COD?"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("Cash on Delivery", response.data["reply"])
        self.assertFalse(response.data["requires_auth"])
        urlopen.assert_not_called()

    @override_settings(GOOGLE_GEMINI_API_KEY="")
    def test_policy_faq_works_without_gemini_key(self):
        response = self.post_chat({"message": "What is your return policy?"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("Opened beauty products", response.data["reply"])

    @override_settings(GOOGLE_GEMINI_API_KEY="test-key", GEMINI_MODEL="gemini-flash-latest")
    @patch("apps.store.chat.gemini.urllib.request.urlopen")
    def test_returns_gemini_reply(self, urlopen):
        body = json.dumps(
            {
                "candidates": [
                    {"content": {"parts": [{"text": "Tap a little balm and blot — keep lips soft."}]}}
                ]
            }
        ).encode()
        urlopen.return_value.__enter__.return_value.read.return_value = body

        response = self.post_chat(
            {
                "message": "Quick tip for soft lips please",
                "history": [{"role": "user", "content": "Hi"}, {"role": "assistant", "content": "Hello!"}],
            }
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("balm", response.data["reply"])
        self.assertFalse(response.data["requires_auth"])
        request = urlopen.call_args[0][0]
        self.assertIn("gemini-flash-latest", request.full_url)
        self.assertIn("key=test-key", request.full_url)
        self.assertIn("generateContent", request.full_url)

    @override_settings(GOOGLE_GEMINI_API_KEY="test-key")
    def test_guests_must_register_before_product_advice(self):
        response = self.post_chat({"message": "mughe brown skin ke liye makeup suggestion chaiye"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["requires_auth"])
        self.assertIn("create an account", response.data["reply"].lower())
        self.assertIn("/register", response.data["product_paths"])
        self.assertIn("/login", response.data["product_paths"])
        self.assertEqual(response.data["products"], [])

    @override_settings(GOOGLE_GEMINI_API_KEY="test-key", GEMINI_MODEL="gemini-flash-latest")
    @patch("apps.store.chat.gemini.urllib.request.urlopen")
    def test_signed_in_users_get_product_links_without_calling_guest_gate(self, urlopen):
        from apps.test_factories import make_user

        self.client.force_authenticate(user=make_user(email="mira@example.com"))
        body = json.dumps(
            {
                "candidates": [
                    {
                        "content": {
                            "parts": [
                                {
                                    "text": (
                                        "For brown skin start with a base.\n"
                                        "1. Second Skin Foundation — even finish [[slug:second-skin-foundation]]"
                                    )
                                }
                            ]
                        }
                    }
                ]
            }
        ).encode()
        urlopen.return_value.__enter__.return_value.read.return_value = body
        response = self.post_chat({"message": "makeup for brown skin"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data["requires_auth"])
        self.assertIn("/products/second-skin-foundation", response.data["product_paths"])
        self.assertNotIn("₹", response.data["reply"])
        self.assertNotIn("path=", response.data["reply"])
        self.assertNotIn("/products/", response.data["reply"])
        self.assertNotIn("[[slug:", response.data["reply"])
        self.assertIn("suggested_replies", response.data)
        self.assertIn("products", response.data)

    @override_settings(GOOGLE_GEMINI_API_KEY="test-key", GEMINI_MODEL="gemini-flash-latest")
    @patch("apps.store.chat.gemini.urllib.request.urlopen")
    def test_returns_product_cards_without_prices(self, urlopen):
        from apps.test_factories import make_product, make_user

        product = make_product(name="Second Skin Foundation")
        self.client.force_authenticate(user=make_user(email="cards@example.com"))
        body = json.dumps(
            {
                "candidates": [
                    {
                        "content": {
                            "parts": [
                                {
                                    "text": (
                                        "Start with an even base.\n"
                                        f"1. {product.name} — smooth finish [[slug:{product.slug}]]"
                                    )
                                }
                            ]
                        }
                    }
                ]
            }
        ).encode()
        urlopen.return_value.__enter__.return_value.read.return_value = body
        response = self.post_chat(
            {"message": "makeup for brown skin", "page_path": f"/products/{product.slug}"}
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["products"]), 1)
        card = response.data["products"][0]
        self.assertEqual(card["slug"], product.slug)
        self.assertEqual(card["path"], f"/products/{product.slug}")
        self.assertNotIn("price", card)
        self.assertNotIn("min_price", card)
        self.assertTrue(
            any(chip["label"] == "About this product" for chip in response.data["suggested_replies"])
        )

    @override_settings(GOOGLE_GEMINI_API_KEY="test-key", GEMINI_MODEL="gemini-2.0-flash")
    @patch("apps.store.chat.gemini.time.sleep", return_value=None)
    @patch("apps.store.chat.gemini.urllib.request.urlopen")
    def test_falls_back_when_model_is_retired(self, urlopen, _sleep):
        ok_body = json.dumps(
            {
                "candidates": [
                    {"content": {"parts": [{"text": "Cash on Delivery only."}]}}
                ]
            }
        ).encode()

        def side_effect(request, timeout=40):
            if "gemini-2.0-flash" in request.full_url:
                raise HTTPError(
                    "https://example.test/retired", 404, "Not Found", hdrs=None, fp=BytesIO(b"{}")
                )
            mock_response = urlopen.return_value
            mock_response.__enter__.return_value.read.return_value = ok_body
            return mock_response

        urlopen.side_effect = side_effect
        response = self.post_chat({"message": "Payment?"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["reply"], "Cash on Delivery only.")
        self.assertGreaterEqual(urlopen.call_count, 2)

    @override_settings(GOOGLE_GEMINI_API_KEY="test-key")
    @patch("apps.store.chat.gemini.time.sleep", return_value=None)
    @patch("apps.store.chat.gemini.urllib.request.urlopen")
    def test_maps_provider_failures(self, urlopen, _sleep):
        def side_effect(request, timeout=40):
            raise HTTPError(
                "https://example.test", 429, "Too Many Requests", hdrs=None, fp=BytesIO(b"{}")
            )

        urlopen.side_effect = side_effect
        response = self.post_chat({"message": "Hello"})
        self.assertEqual(response.status_code, status.HTTP_502_BAD_GATEWAY)

    @override_settings(GOOGLE_GEMINI_API_KEY="test-key", GEMINI_MODEL="gemini-flash-latest")
    @patch("apps.store.chat.gemini.time.sleep", return_value=None)
    @patch("apps.store.chat.gemini.urllib.request.urlopen")
    def test_retries_transient_503_then_succeeds(self, urlopen, _sleep):
        ok_body = json.dumps(
            {
                "candidates": [
                    {"content": {"parts": [{"text": "We take Cash on Delivery."}]}}
                ]
            }
        ).encode()
        calls = {"n": 0}

        def side_effect(request, timeout=40):
            calls["n"] += 1
            if calls["n"] == 1:
                raise HTTPError(
                    "https://example.test", 503, "Unavailable", hdrs=None, fp=BytesIO(b"{}")
                )
            mock_response = urlopen.return_value
            mock_response.__enter__.return_value.read.return_value = ok_body
            return mock_response

        urlopen.side_effect = side_effect
        response = self.post_chat({"message": "Payment?"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["reply"], "We take Cash on Delivery.")
        self.assertEqual(calls["n"], 2)

    def test_rejects_empty_message(self):
        response = self.post_chat({"message": ""})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def _consume_sse(self, response):
        raw = b"".join(response.streaming_content).decode()
        events = []
        for block in raw.split("\n\n"):
            line = block.strip()
            if line.startswith("data: "):
                events.append(json.loads(line[6:]))
        return events

    @override_settings(GOOGLE_GEMINI_API_KEY="test-key")
    @patch("apps.store.chat.gemini.urllib.request.urlopen")
    def test_stream_policy_faq_skips_gemini(self, urlopen):
        response = self.client.post(
            "/api/store/chat/stream/",
            {"message": "Do you have COD?"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response["Content-Type"], "text/event-stream")
        events = self._consume_sse(response)
        self.assertEqual(len(events), 1)
        self.assertEqual(events[0]["type"], "done")
        self.assertIn("Cash on Delivery", events[0]["reply"])
        urlopen.assert_not_called()

    @override_settings(GOOGLE_GEMINI_API_KEY="test-key", GEMINI_MODEL="gemini-flash-latest")
    @patch("apps.store.chat.gemini.urllib.request.urlopen")
    def test_stream_tokens_then_done(self, urlopen):
        # Guests skip tools → streamGenerateContent only.
        class FakeStream:
            def __enter__(self):
                return self

            def __exit__(self, *args):
                return False

            def read(self, size=-1):
                if not hasattr(self, "_chunks"):
                    self._chunks = [
                        b'data: {"candidates":[{"content":{"parts":[{"text":"Keep lips "}]}}]}\n\n',
                        b'data: {"candidates":[{"content":{"parts":[{"text":"soft."}]}}]}\n\n',
                        b"",
                    ]
                if not self._chunks:
                    return b""
                return self._chunks.pop(0)

        urlopen.side_effect = lambda request, timeout=40: FakeStream()
        response = self.client.post(
            "/api/store/chat/stream/",
            {"message": "Quick tip for soft lips please"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        events = self._consume_sse(response)
        types = [e["type"] for e in events]
        self.assertIn("status", types)
        self.assertIn("token", types)
        self.assertEqual(types[-1], "done")
        self.assertIn("soft", events[-1]["reply"].lower())
        self.assertIn("streamGenerateContent", urlopen.call_args[0][0].full_url)


class NewsletterTests(APITestCase):
    def signup(self, email):
        return self.client.post("/api/store/newsletter/", {"email": email})

    def test_signup_stores_email_once_with_the_same_reply(self):
        from django.core import mail

        mail.outbox.clear()
        first = self.signup("Asha@Example.com")
        self.assertEqual(first.status_code, status.HTTP_200_OK)
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].to, ["asha@example.com"])
        self.assertIn("newsletter", mail.outbox[0].subject.lower())

        again = self.signup("asha@example.com")
        self.assertEqual(again.status_code, status.HTTP_200_OK)
        self.assertEqual(first.data, again.data)
        self.assertEqual(list(NewsletterSubscriber.objects.values_list("email", flat=True)), ["asha@example.com"])
        # Welcome mail only on the first signup.
        self.assertEqual(len(mail.outbox), 1)

    def test_rejects_invalid_email(self):
        response = self.signup("not-an-email")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("email", response.data["errors"])
        self.assertFalse(NewsletterSubscriber.objects.exists())
