"""Owner-portal queries and aggregates. Stock/order mutations stay in catalog/orders services."""

from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.db import transaction
from django.db.models import Count, IntegerField, Min, OuterRef, Q, Subquery, Sum
from django.db.models.functions import Coalesce
from django.utils import timezone
from django.utils.text import slugify

from apps.catalog.models import Brand, Category, Product, ProductImage, ProductVariant, Review
from apps.catalog.services import change_stock
from apps.looks.models import Look
from apps.orders.models import Coupon, Order
from apps.orders.services import ALLOWED_TRANSITIONS
from apps.store.models import NewsletterSubscriber
from apps.store.services import public_store_settings


def nav_badges():
    """Counts shown in the owner-portal sidebar."""
    return {
        "pending_orders": Order.objects.filter(status=Order.Status.PENDING).count(),
        "pending_reviews": Review.objects.filter(is_approved=False).count(),
        "low_stock_variants": ProductVariant.objects.filter(
            product__is_active=True, stock_quantity__lte=5
        ).count(),
    }


def dashboard_stats():
    """KPI snapshot plus work queue for the owner portal home screen."""
    now = timezone.now()
    today_start = timezone.localtime(now).replace(hour=0, minute=0, second=0, microsecond=0)
    week_ago = now - timedelta(days=7)
    month_ago = now - timedelta(days=30)

    open_statuses = [
        Order.Status.PENDING,
        Order.Status.CONFIRMED,
        Order.Status.PROCESSING,
        Order.Status.SHIPPED,
    ]
    orders = Order.objects.all()
    revenue_today = orders.filter(
        status=Order.Status.DELIVERED, created_at__gte=today_start
    ).aggregate(total=Sum("grand_total"))["total"] or Decimal("0.00")
    revenue = orders.filter(
        status=Order.Status.DELIVERED, created_at__gte=month_ago
    ).aggregate(total=Sum("grand_total"))["total"] or Decimal("0.00")

    badges = nav_badges()
    pending_orders = badges["pending_orders"]
    low_stock = badges["low_stock_variants"]
    pending_reviews = badges["pending_reviews"]

    attention = []
    if pending_orders:
        attention.append(
            {
                "key": "pending_orders",
                "label": f"{pending_orders} order{'s' if pending_orders != 1 else ''} waiting",
                "detail": "Confirm or cancel pending checkouts",
                "to": "/manage/orders?status=pending",
                "tone": "warning",
            }
        )
    if low_stock:
        attention.append(
            {
                "key": "low_stock",
                "label": f"{low_stock} low-stock variant{'s' if low_stock != 1 else ''}",
                "detail": "Restock before the next rush",
                "to": "/manage/products?low_stock=1",
                "tone": "danger",
            }
        )
    if pending_reviews:
        attention.append(
            {
                "key": "pending_reviews",
                "label": f"{pending_reviews} review{'s' if pending_reviews != 1 else ''} to moderate",
                "detail": "Approve or hide before they go live",
                "to": "/manage/reviews?approved=0",
                "tone": "accent",
            }
        )

    recent = Order.objects.select_related("user").prefetch_related("items").order_by("-created_at")[:8]
    recent_orders = [
        {
            "number": order.number,
            "status": order.status,
            "status_display": order.get_status_display(),
            "grand_total": f"{order.grand_total:.2f}",
            "currency": order.currency,
            "item_count": sum(item.quantity for item in order.items.all()),
            "customer_email": order.user.email,
            "customer_name": order.shipping_full_name or order.user.get_full_name() or "",
            "created_at": order.created_at.isoformat(),
        }
        for order in recent
    ]

    return {
        "orders_today": orders.filter(created_at__gte=today_start).count(),
        "orders_this_week": orders.filter(created_at__gte=week_ago).count(),
        "open_orders": orders.filter(status__in=open_statuses).count(),
        "pending_orders": pending_orders,
        "revenue_today": f"{revenue_today:.2f}",
        "revenue_30d": f"{revenue:.2f}",
        "currency": "INR",
        "active_products": Product.objects.filter(is_active=True).count(),
        "low_stock_variants": low_stock,
        "pending_reviews": pending_reviews,
        "active_coupons": Coupon.objects.filter(is_active=True).count(),
        "customers": get_user_model().objects.count(),
        "newsletter_subscribers": NewsletterSubscriber.objects.count(),
        "active_looks": Look.objects.filter(is_active=True).count(),
        "status_breakdown": {
            status: orders.filter(status=status).count() for status, _ in Order.Status.choices
        },
        "nav_badges": badges,
        "attention": attention,
        "recent_orders": recent_orders,
    }


def allowed_next_statuses(order):
    return sorted(ALLOWED_TRANSITIONS.get(order.status, set()))


def portal_settings_payload(user=None):
    """Read-only store config for staff. The owner portal does not link to Django Admin."""
    public = public_store_settings()
    return {
        **public,
        "store_name": "Jordan Beauty Hub",
        "is_developer": bool(user and user.is_superuser),
        "notes": (
            "Shipping, WhatsApp and Gemini API keys are set in backend/.env by the developer. "
            "Day-to-day store work stays in this owner portal."
        ),
    }


def customer_queryset():
    """
    Everyone who can shop — including a staff/dev account used for local test checkouts.
    Staff accounts are flagged in the API so the UI can badge them.
    """
    return (
        get_user_model()
        .objects.all()
        .annotate(order_count=Count("orders", distinct=True))
        .order_by("-date_joined")
    )


def product_queryset():
    # Subqueries so a name/shade search join cannot double the stock or price.
    stock_total = (
        ProductVariant.objects.filter(product=OuterRef("pk"))
        .values("product")
        .annotate(total=Sum("stock_quantity"))
        .values("total")
    )
    lowest_price = (
        ProductVariant.objects.filter(product=OuterRef("pk"))
        .values("product")
        .annotate(lowest=Min("price"))
        .values("lowest")
    )
    return (
        Product.objects        .select_related("brand", "category")
        .prefetch_related("variants", "images")
        .annotate(
            total_stock=Coalesce(Subquery(stock_total, output_field=IntegerField()), 0),
            review_count=Count("reviews", distinct=True),
            min_price=Subquery(lowest_price),
        )
        .order_by("name")
    )


def order_queryset():
    return Order.objects.select_related("user", "payment").prefetch_related(
        "items", "status_history"
    )


def review_queryset():
    return Review.objects.select_related("product", "user").order_by("-created_at")


def coupon_queryset():
    return Coupon.objects.all()


def look_queryset():
    return (
        Look.objects.annotate(step_count=Count("steps"))
        .prefetch_related("steps__product__images")
        .order_by("sort_order", "-created_at")
    )


def newsletter_queryset():
    return NewsletterSubscriber.objects.all()


def filter_orders(qs, *, status="", search=""):
    if status:
        qs = qs.filter(status=status)
    if search:
        qs = qs.filter(
            Q(number__icontains=search)
            | Q(user__email__icontains=search)
            | Q(shipping_full_name__icontains=search)
            | Q(shipping_phone__icontains=search)
        )
    return qs


def filter_products(qs, *, search="", active=None, low_stock=False, stock="", category_id=None):
    if category_id:
        qs = qs.filter(category_id=category_id)
    if search:
        # Match the product name and each option (shade / size / SKU), including out of stock.
        qs = qs.filter(
            Q(name__icontains=search)
            | Q(slug__icontains=search)
            | Q(variants__name__icontains=search)
            | Q(variants__sku__icontains=search)
        ).distinct()
    if active is True:
        qs = qs.filter(is_active=True)
    elif active is False:
        qs = qs.filter(is_active=False)
    if low_stock or stock == "low":
        qs = qs.filter(variants__stock_quantity__lte=5).distinct()
    elif stock == "out":
        qs = qs.filter(total_stock=0)
    elif stock == "in":
        qs = qs.filter(total_stock__gt=0)
    return qs


def catalog_options():
    return {
        "brands": list(Brand.objects.order_by("name").values("id", "name")),
        "categories": list(Category.objects.order_by("sort_order", "name").values("id", "name")),
    }


def category_queryset():
    return Category.objects.annotate(product_count=Count("products", distinct=True)).order_by(
        "sort_order", "name"
    )


def reorder_storefront_reels(ordered_ids):
    """Set sort_order from a list of reel primary keys."""
    from apps.store.models import StorefrontReel

    reels = {reel.pk: reel for reel in StorefrontReel.objects.filter(pk__in=ordered_ids)}
    if len(reels) != len(ordered_ids):
        raise PortalImageError("One of those reels was not found.")
    for index, reel_id in enumerate(ordered_ids):
        StorefrontReel.objects.filter(pk=reel_id).update(sort_order=index)


def reorder_categories(ordered_ids):
    """Set sort_order from a list of category primary keys (shop display order)."""
    found = set(Category.objects.filter(pk__in=ordered_ids).values_list("pk", flat=True))
    if len(found) != len(ordered_ids):
        raise PortalImageError("One of those categories was not found.")
    if Category.objects.exclude(pk__in=ordered_ids).exists():
        raise PortalImageError("Send every category id when reordering.")
    for index, category_id in enumerate(ordered_ids):
        Category.objects.filter(pk=category_id).update(sort_order=index)


def _unique_slug(name):
    base = (slugify(name) or "product")[:200]
    slug = base
    number = 2
    while Product.objects.filter(slug=slug).exists():
        suffix = f"-{number}"
        slug = f"{base[: 220 - len(suffix)]}{suffix}"
        number += 1
    return slug


def _unique_sku(seed):
    base = "".join(ch for ch in seed.upper() if ch.isalnum())[:24] or "SKU"
    sku = base
    number = 2
    while ProductVariant.objects.filter(sku=sku).exists():
        suffix = f"-{number}"
        sku = f"{base[: 64 - len(suffix)]}{suffix}"
        number += 1
    return sku


@transaction.atomic
def create_portal_product(
    *,
    name,
    brand_id,
    category_id,
    short_description="",
    variant_name="",
    price,
    compare_at_price=None,
    stock_quantity=0,
    user=None,
):
    product = Product.objects.create(
        name=name.strip(),
        slug=_unique_slug(name),
        brand_id=brand_id,
        category_id=category_id,
        short_description=(short_description or "").strip(),
        is_active=True,
    )
    variant = ProductVariant.objects.create(
        product=product,
        name=(variant_name or "Default").strip() or "Default",
        sku=_unique_sku(product.slug),
        price=price,
        compare_at_price=compare_at_price,
        stock_quantity=0,
        is_active=True,
    )
    if stock_quantity:
        change_stock(variant.id, int(stock_quantity), "restock", "Owner portal create", user)
    return product


@transaction.atomic
def add_portal_variant(product, *, name, price, compare_at_price=None, stock_quantity=0, user=None):
    variant = ProductVariant.objects.create(
        product=product,
        name=name.strip(),
        sku=_unique_sku(f"{product.slug}-{name}"),
        price=price,
        compare_at_price=compare_at_price,
        stock_quantity=0,
        is_active=True,
    )
    if stock_quantity:
        change_stock(variant.id, int(stock_quantity), "restock", "Owner portal variant", user)
    return variant


def update_portal_variant(variant, *, name, price, compare_at_price, is_active):
    variant.name = name.strip()
    variant.price = price
    variant.compare_at_price = compare_at_price
    variant.is_active = is_active
    variant.save(update_fields=["name", "price", "compare_at_price", "is_active", "updated_at"])
    return variant


MAX_PORTAL_PRODUCT_IMAGES = 8


class PortalImageError(Exception):
    """A product photo the owner portal cannot accept."""


@transaction.atomic
def add_product_images(product, files, *, alt_text=""):
    """Attach photos. Each file is stored as the shop's 1200×1200 JPEG."""
    uploads = [uploaded for uploaded in files if uploaded]
    if not uploads:
        raise PortalImageError("Choose a photo.")
    if product.images.count() + len(uploads) > MAX_PORTAL_PRODUCT_IMAGES:
        raise PortalImageError(f"A product can have at most {MAX_PORTAL_PRODUCT_IMAGES} photos.")
    label = (alt_text or product.name).strip()[:200]
    start = product.images.count()
    for offset, uploaded in enumerate(uploads):
        photo = ProductImage(product=product, alt_text=label, sort_order=start + offset)
        photo.image = uploaded
        try:
            photo.save()
        except ValidationError as error:
            message = error.messages[0] if error.messages else "Upload a JPEG, PNG, or WebP photo."
            raise PortalImageError(message) from error
    return product


@transaction.atomic
def delete_product_image(product, image_id):
    photo = product.images.filter(pk=image_id).first()
    if photo is None:
        raise PortalImageError("That photo is not on this product.")
    photo.image.delete(save=False)
    photo.delete()
    for index, row in enumerate(product.images.order_by("sort_order", "id")):
        if row.sort_order != index:
            ProductImage.objects.filter(pk=row.pk).update(sort_order=index)
    return product


def update_product_image(product, image_id, *, alt_text):
    photo = product.images.filter(pk=image_id).first()
    if photo is None:
        raise PortalImageError("That photo is not on this product.")
    photo.alt_text = (alt_text or "").strip()[:200]
    photo.save(update_fields=["alt_text"])
    return product


@transaction.atomic
def place_product_image(product, image_id, position):
    """Move one photo to a new index. Index 0 is the shop card."""
    try:
        position = int(position)
    except (TypeError, ValueError) as error:
        raise PortalImageError("Choose a place in the photo list.") from error
    rows = list(product.images.order_by("sort_order", "id"))
    index = next((place for place, row in enumerate(rows) if row.pk == image_id), None)
    if index is None:
        raise PortalImageError("That photo is not on this product.")
    position = min(max(position, 0), len(rows) - 1)
    if position == index:
        return product
    row = rows.pop(index)
    rows.insert(position, row)
    for place, item in enumerate(rows):
        if item.sort_order != place:
            ProductImage.objects.filter(pk=item.pk).update(sort_order=place)
    return product


@transaction.atomic
def move_product_image(product, image_id, direction):
    rows = list(product.images.order_by("sort_order", "id"))
    index = next((position for position, row in enumerate(rows) if row.pk == image_id), None)
    if index is None:
        raise PortalImageError("That photo is not on this product.")
    swap = index - 1 if direction == "earlier" else index + 1
    if direction not in {"earlier", "later"} or swap < 0 or swap >= len(rows):
        return product
    rows[index], rows[swap] = rows[swap], rows[index]
    for position, row in enumerate(rows):
        if row.sort_order != position:
            ProductImage.objects.filter(pk=row.pk).update(sort_order=position)
    return product


def mark_variant_out_of_stock(variant, user):
    if variant.stock_quantity <= 0:
        return variant
    return change_stock(
        variant.id,
        -variant.stock_quantity,
        "adjustment",
        "Marked out of stock",
        user,
    )


def filter_reviews(qs, *, approved=None, search=""):
    if approved is True:
        qs = qs.filter(is_approved=True)
    elif approved is False:
        qs = qs.filter(is_approved=False)
    if search:
        qs = qs.filter(
            Q(product__name__icontains=search)
            | Q(user__email__icontains=search)
            | Q(title__icontains=search)
            | Q(body__icontains=search)
        )
    return qs
