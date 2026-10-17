"""Customer beauty advisor via Google Gemini (key stays on the server)."""

from __future__ import annotations

import json
import urllib.error
import urllib.request
from decimal import Decimal

from django.conf import settings
from django.db.models import Min
from rest_framework.exceptions import APIException

from apps.catalog.models import Product


class ChatNotConfigured(APIException):
    status_code = 503
    default_detail = (
        "The beauty assistant is not set up yet. Add GOOGLE_GEMINI_API_KEY to the server "
        "environment, or chat with us on WhatsApp from the footer."
    )
    default_code = "chat_not_configured"


class ChatProviderError(APIException):
    status_code = 502
    default_detail = "The beauty assistant is busy right now. Please try again in a moment."
    default_code = "chat_provider_error"


STORE_KNOWLEDGE = """
You are the Jordan Beauty Hub shopping assistant for an Indian beauty store (INR, Cash on Delivery).

Store facts (always follow these):
- Payment: Cash on Delivery only. No card, UPI or online payment on the website.
- Delivery: Across India. Any delivery fee or free-shipping threshold is shown in the bag and at checkout.
- Returns: No returns of opened beauty products for change of mind. Damaged, wrong, or missing items can be replaced — customer should contact us with order number and photos.
- Cancel: Customers can cancel from My orders while status is pending or confirmed.
- Account: Login is required for bag and checkout.
- Helpful pages: Skin quiz at /skin-quiz, Get the look at /looks, shop at /shop, policies under /policies/returns and /policies/shipping.
- Never invent medical advice. For serious skin conditions, suggest seeing a dermatologist.
- Only recommend products from the catalogue list below. If unsure, say so and suggest the skin quiz or WhatsApp.
- Keep answers short (2–5 short sentences). Use plain language. Prices in ₹.
- Do not invent discounts, stock levels, or delivery times that are not in the facts above.
""".strip()


def chat_is_configured():
    return bool(settings.GOOGLE_GEMINI_API_KEY)


def _catalogue_brief(limit=40):
    products = (
        Product.objects.filter(is_active=True)
        .select_related("category", "brand")
        .annotate(min_price=Min("variants__price"))
        .order_by("name")[:limit]
    )
    lines = []
    for product in products:
        price = product.min_price
        price_text = f"from ₹{price:.0f}" if isinstance(price, Decimal) else "see shop"
        lines.append(
            f"- {product.name} ({product.category.name}, {product.brand.name}): "
            f"{product.short_description or 'beauty product'} — {price_text} — /products/{product.slug}"
        )
    return "\n".join(lines) if lines else "- (catalogue empty)"


def _system_instruction():
    whatsapp = settings.STORE_WHATSAPP_NUMBER
    contact = (
        f"WhatsApp contact number on file: +{whatsapp}. Invite the customer to use Chat on WhatsApp in the footer if needed."
        if whatsapp
        else "No WhatsApp number is configured; point customers to the footer contact options or My orders."
    )
    return (
        f"{STORE_KNOWLEDGE}\n\n{contact}\n\nCurrent catalogue:\n{_catalogue_brief()}"
    )


def _gemini_contents(message, history):
    contents = []
    for turn in history:
        role = "user" if turn["role"] == "user" else "model"
        contents.append({"role": role, "parts": [{"text": turn["content"]}]})
    contents.append({"role": "user", "parts": [{"text": message}]})
    return contents


def ask_beauty_assistant(message, history=None):
    """Send a customer message to Gemini and return the assistant reply text."""
    if not chat_is_configured():
        raise ChatNotConfigured()

    history = history or []
    model = settings.GEMINI_MODEL
    url = (
        f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
        f"?key={settings.GOOGLE_GEMINI_API_KEY}"
    )
    payload = {
        "systemInstruction": {"parts": [{"text": _system_instruction()}]},
        "contents": _gemini_contents(message, history),
        "generationConfig": {
            "temperature": 0.4,
            "maxOutputTokens": 512,
        },
    }
    request = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json", "User-Agent": "JordanBeautyHub/1.0"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=25) as response:
            data = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as error:
        error.read()  # drain the body so the connection can close cleanly
        raise ChatProviderError(detail=f"Assistant error ({error.code}). Please try again.") from error
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as error:
        raise ChatProviderError() from error

    try:
        text = data["candidates"][0]["content"]["parts"][0]["text"].strip()
    except (KeyError, IndexError, TypeError) as error:
        raise ChatProviderError() from error
    if not text:
        raise ChatProviderError()
    return text
