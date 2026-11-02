"""Gemini function declarations and server-side executors (catalogue / looks / orders)."""

from __future__ import annotations

from django.db.models import Min, Q

from apps.catalog.models import Product
from apps.looks.models import Look
from apps.orders.models import Order

def _note_slugs(bucket, *slugs):
    for slug in slugs:
        if slug and slug not in bucket:
            bucket.append(slug)


def member_tool_declarations():
    return [
        {
            "name": "search_products",
            "description": (
                "Search the Jordan Beauty Hub catalogue by keywords, optional category slug, "
                "or concern slug. Returns up to 6 active products (no prices)."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "Search text, e.g. foundation, glow serum, kajal",
                    },
                    "category": {
                        "type": "string",
                        "description": "Optional category slug: face, eyes, lips, skincare, haircare, body-care, accessories",
                    },
                    "concern": {
                        "type": "string",
                        "description": "Optional concern slug such as acne, dryness, glow",
                    },
                },
                "required": ["query"],
            },
        },
        {
            "name": "get_product",
            "description": "Get one product by exact slug (name, brand, category, short description, concerns).",
            "parameters": {
                "type": "object",
                "properties": {
                    "slug": {"type": "string", "description": "Product slug, e.g. second-skin-foundation"},
                },
                "required": ["slug"],
            },
        },
        {
            "name": "list_looks",
            "description": "List active Get the look makeup looks (title, occasion, slug).",
            "parameters": {"type": "object", "properties": {}},
        },
        {
            "name": "get_look",
            "description": "Get one look by slug with step products (for recommending a full look).",
            "parameters": {
                "type": "object",
                "properties": {
                    "slug": {"type": "string", "description": "Look slug"},
                },
                "required": ["slug"],
            },
        },
        {
            "name": "get_my_orders",
            "description": (
                "List this signed-in customer's recent orders (number, status, item names). "
                "Only use when they ask about their order or delivery status."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "order_number": {
                        "type": "string",
                        "description": "Optional specific order number to look up",
                    },
                },
            },
        },
    ]


def _brief_product(product):
    concerns = list(product.concerns.filter(is_active=True).values_list("name", flat=True)[:4])
    return {
        "slug": product.slug,
        "name": product.name,
        "brand": product.brand.name,
        "category": product.category.name,
        "short_description": product.short_description or "",
        "concerns": concerns,
        "marker": f"[[slug:{product.slug}]]",
    }


def _search_products(slug_bucket, query="", category="", concern=""):
    products = (
        Product.objects.filter(is_active=True)
        .select_related("brand", "category")
        .prefetch_related("concerns")
        .annotate(min_price=Min("variants__price"))
    )
    query = (query or "").strip()
    if query:
        products = products.filter(
            Q(name__icontains=query)
            | Q(brand__name__icontains=query)
            | Q(category__name__icontains=query)
            | Q(short_description__icontains=query)
        )
    if category:
        products = products.filter(category__slug=category.strip().lower())
    if concern:
        products = products.filter(concerns__slug=concern.strip().lower(), concerns__is_active=True)
    products = products.distinct().order_by("name")[:6]
    rows = [_brief_product(product) for product in products]
    _note_slugs(slug_bucket, *(row["slug"] for row in rows))
    if not rows and concern:
        return _search_products(slug_bucket, query=query, category=category, concern="")
    return {"products": rows, "count": len(rows)}


def _get_product(slug_bucket, slug=""):
    product = (
        Product.objects.filter(slug=(slug or "").strip().lower(), is_active=True)
        .select_related("brand", "category")
        .prefetch_related("concerns", "variants")
        .first()
    )
    if not product:
        return {"error": "Product not found"}
    _note_slugs(slug_bucket, product.slug)
    shades = [
        variant.name
        for variant in product.variants.filter(is_active=True)[:12]
        if variant.name and variant.name.lower() != "default"
    ]
    data = _brief_product(product)
    data["shades_or_sizes"] = shades
    return data


def _list_looks():
    looks = Look.objects.filter(is_active=True).order_by("sort_order", "-created_at")[:12]
    return {
        "looks": [
            {
                "slug": look.slug,
                "title": look.title,
                "occasion": look.occasion or "",
                "description": (look.description or "")[:160],
            }
            for look in looks
        ]
    }


def _get_look(slug_bucket, slug=""):
    look = (
        Look.objects.filter(slug=(slug or "").strip().lower(), is_active=True)
        .prefetch_related("steps__product__brand")
        .first()
    )
    if not look:
        return {"error": "Look not found"}
    steps = []
    for step in look.steps.all():
        _note_slugs(slug_bucket, step.product.slug)
        steps.append(
            {
                "instruction": step.instruction or "",
                "product_name": step.product.name,
                "product_slug": step.product.slug,
                "marker": f"[[slug:{step.product.slug}]]",
            }
        )
    return {
        "slug": look.slug,
        "title": look.title,
        "occasion": look.occasion or "",
        "description": look.description or "",
        "steps": steps,
    }


def _get_my_orders(user, order_number=""):
    if user is None or not getattr(user, "is_authenticated", False):
        return {"error": "Not signed in"}
    orders = Order.objects.filter(user=user).prefetch_related("items").order_by("-created_at")
    number = (order_number or "").strip().upper()
    if number:
        orders = orders.filter(number__iexact=number)
    orders = list(orders[:5])
    if number and not orders:
        return {"error": "No order with that number for this account"}
    payload = []
    for order in orders:
        items = [item.product_name for item in order.items.all()[:8]]
        payload.append(
            {
                "number": order.number,
                "status": order.get_status_display(),
                "status_code": order.status,
                "placed_on": order.created_at.date().isoformat(),
                "items": items,
                "can_cancel": order.status in {Order.Status.PENDING, Order.Status.CONFIRMED},
            }
        )
    return {"orders": payload}


def execute_tool(name, args, *, user=None, slug_bucket=None):
    args = args or {}
    slug_bucket = slug_bucket if slug_bucket is not None else []
    if name == "search_products":
        return _search_products(
            slug_bucket,
            query=args.get("query", ""),
            category=args.get("category", ""),
            concern=args.get("concern", ""),
        )
    if name == "get_product":
        return _get_product(slug_bucket, args.get("slug", ""))
    if name == "list_looks":
        return _list_looks()
    if name == "get_look":
        return _get_look(slug_bucket, args.get("slug", ""))
    if name == "get_my_orders":
        return _get_my_orders(user, args.get("order_number", ""))
    return {"error": f"Unknown tool: {name}"}
