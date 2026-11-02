"""Product cards, path polishing, page context, suggested reply chips."""

from __future__ import annotations

import re
from urllib.parse import quote

from django.conf import settings

from apps.catalog.models import Product

_PRODUCT_PATH = re.compile(r"/products/[a-z0-9-]+", re.IGNORECASE)
_PRODUCT_SLUG = re.compile(r"/products/([a-z0-9-]+)", re.IGNORECASE)
_SLUG_MARKER = re.compile(r"\[\[slug:([a-z0-9-]+)\]\]", re.IGNORECASE)
_PATH_EQUALS = re.compile(r"\bpath=/products/[a-z0-9-]+\b", re.IGNORECASE)


def whatsapp_chat_url(message=None):
    number = (settings.STORE_WHATSAPP_NUMBER or "").strip()
    if not number:
        return None
    text = message or "Hi, I need help from Jordan Beauty Hub."
    return f"https://wa.me/{number}?text={quote(text)}"


def suggested_replies(*, is_authenticated: bool, page_path: str = ""):
    path = (page_path or "").strip()
    if not is_authenticated:
        chips = [
            {"label": "Cash on Delivery?", "message": "Do you have Cash on Delivery?"},
            {"label": "Delivery", "message": "How does delivery work across India?"},
            {"label": "Returns", "message": "What is your return and replacement policy?"},
            {"label": "Create account", "message": "How do I create an account?"},
        ]
        if path.startswith("/products/"):
            chips.insert(
                0,
                {
                    "label": "Sign in for this product",
                    "message": "I want advice about the product on this page — should I sign in first?",
                },
            )
        return chips

    chips = [
        {"label": "Brown skin makeup", "message": "I need makeup suggestions for brown / Indian skin"},
        {"label": "Glowing skin", "message": "I want a simple glowing skincare routine"},
        {"label": "Gift idea", "message": "I need a beauty gift idea — please ask me who it is for and the occasion"},
        {"label": "My orders", "message": "Where is my latest order?"},
        {"label": "Get the look", "message": "Suggest a makeup look from Get the look"},
        {"label": "Skin quiz", "message": "Should I take the skin quiz?"},
    ]
    if path.startswith("/products/"):
        slug = path.rstrip("/").split("/")[-1]
        chips.insert(
            0,
            {
                "label": "About this product",
                "message": (
                    f"I am looking at {slug.replace('-', ' ')}. "
                    f"Tell me who it suits and how to use it. Mark it with [[slug:{slug}]]"
                ),
            },
        )
    elif path.startswith("/looks"):
        chips.insert(0, {"label": "Pick a look", "message": "Help me pick a look from Get the look"})
    elif path.startswith("/skin-quiz"):
        chips.insert(0, {"label": "After my quiz", "message": "I am on the skin quiz — how do I use the results?"})
    elif path.startswith("/cart"):
        chips.insert(
            0,
            {
                "label": "Bag help",
                "message": "I am in my bag — any tip before I checkout with Cash on Delivery?",
            },
        )
    return chips


def page_context_block(page_path: str, is_authenticated: bool):
    path = (page_path or "").strip()
    if not path or path == "/":
        return "Page context: customer is on the home page."
    if path.startswith("/products/"):
        slug = path.rstrip("/").split("/")[-1]
        product = (
            Product.objects.filter(slug=slug, is_active=True)
            .select_related("category", "brand")
            .first()
        )
        if product and is_authenticated:
            return (
                f"Page context: customer is viewing {product.name} "
                f"({product.category.name}, {product.brand.name}), slug={product.slug}. "
                "Focus on this product first; call get_product if you need details."
            )
        if product:
            return (
                f"Page context: guest is viewing {product.name}. "
                "Do not give product advice until they sign in."
            )
        return f"Page context: customer is on a product page ({path})."
    if path.startswith("/cart"):
        return "Page context: customer is on the bag / cart page."
    if path.startswith("/looks"):
        return "Page context: customer is browsing Get the look."
    if path.startswith("/skin-quiz"):
        return "Page context: customer is on the skin quiz."
    return f"Page context: customer is on {path}."


def product_paths_from_text(text: str):
    seen = []
    for slug in _SLUG_MARKER.findall(text or ""):
        path = f"/products/{slug.lower()}"
        if path not in seen:
            seen.append(path)
    for match in _PRODUCT_PATH.findall(text or ""):
        slug = match.split("/products/")[-1].lower()
        path = f"/products/{slug}"
        if path not in seen:
            seen.append(path)
    return seen


def polish_reply(text: str) -> str:
    cleaned = _SLUG_MARKER.sub("", text or "")
    cleaned = _PATH_EQUALS.sub("", cleaned)
    cleaned = _PRODUCT_PATH.sub("", cleaned)
    cleaned = re.sub(r"[ \t]+\n", "\n", cleaned)
    cleaned = re.sub(r" *[-—] *\n", "\n", cleaned)
    cleaned = re.sub(r" {2,}", " ", cleaned)
    cleaned = re.sub(r"\n{3,}", "\n\n", cleaned)
    return cleaned.strip()


def _reason_for_slug(text: str, slug: str):
    for line in (text or "").splitlines():
        if slug in line.lower() or slug.replace("-", " ") in line.lower():
            cleaned = _SLUG_MARKER.sub("", line)
            cleaned = _PATH_EQUALS.sub("", cleaned)
            cleaned = _PRODUCT_PATH.sub("", cleaned)
            cleaned = re.sub(r"^\s*\d+[.)]\s*", "", cleaned).strip(" -—:\t")
            return cleaned[:160] if cleaned else ""
    return ""


def _default_variant_id(product):
    variants = [v for v in product.variants.all() if v.is_active]
    in_stock = [v for v in variants if v.stock_quantity > 0]
    chosen = in_stock[0] if in_stock else (variants[0] if variants else None)
    return chosen.id if chosen else None


def product_cards(paths, reply_text="", *, request=None, extra_slugs=None):
    """Structured product cards for the UI — no prices; includes default_variant_id for add-to-bag."""
    slugs = []
    for path in paths or []:
        match = _PRODUCT_SLUG.search(path or "")
        if match and match.group(1) not in slugs:
            slugs.append(match.group(1))
    for slug in extra_slugs or []:
        if slug and slug not in slugs:
            slugs.append(slug)
    if not slugs:
        return []

    products = (
        Product.objects.filter(slug__in=slugs, is_active=True)
        .select_related("brand", "category")
        .prefetch_related("images", "variants")
    )
    by_slug = {product.slug: product for product in products}
    cards = []
    for slug in slugs:
        product = by_slug.get(slug)
        if not product:
            continue
        image = None
        first_image = product.images.first()
        if first_image and first_image.image:
            url = first_image.image.url
            if request is not None:
                url = request.build_absolute_uri(url)
            image = {"url": url, "alt": first_image.alt_text or product.name}
        cards.append(
            {
                "slug": product.slug,
                "name": product.name,
                "path": f"/products/{product.slug}",
                "brand": product.brand.name,
                "category": product.category.name,
                "short_description": product.short_description or "",
                "reason": _reason_for_slug(reply_text, slug),
                "image": image,
                "default_variant_id": _default_variant_id(product),
                "variant_count": sum(1 for v in product.variants.all() if v.is_active),
            }
        )
    return cards
