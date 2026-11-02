from decimal import Decimal
from io import BytesIO

from django.db import transaction
from PIL import Image, ImageOps, UnidentifiedImageError
from django.db.models import (
    Avg,
    Case,
    Count,
    Exists,
    F,
    IntegerField,
    OuterRef,
    Subquery,
    Value,
    When,
)
from django.db.models.functions import Coalesce

from .models import HomepagePick, Product, ProductFitSignal, ProductVariant, Review, StockMovement

HOMEPAGE_PICKS_LIMIT = 12


class InsufficientStockError(Exception):
    pass


class HomepagePickError(Exception):
    pass


def _annotate_fit_score(queryset):
    """Prefer products that have been shown successfully over ones that failed availability."""
    return queryset.annotate(
        fit_score=Coalesce(
            F("fit_signal__positive_count") - F("fit_signal__negative_count"),
            Value(0),
            output_field=IntegerField(),
        )
    )


def record_fit_positive(product_ids):
    """Mark products as successfully shown while available in the live catalogue."""
    for product_id in {int(pk) for pk in product_ids if pk}:
        signal, _ = ProductFitSignal.objects.get_or_create(product_id=product_id)
        ProductFitSignal.objects.filter(pk=signal.pk).update(
            positive_count=F("positive_count") + 1
        )


def record_fit_negative(product_ids):
    """
    Negative training signal: product was selected for display but is missing,
    inactive, or out of stock — i.e. not sellable in our system right now.
    """
    for product_id in {int(pk) for pk in product_ids if pk}:
        if not Product.objects.filter(pk=product_id).exists():
            continue
        signal, _ = ProductFitSignal.objects.get_or_create(product_id=product_id)
        ProductFitSignal.objects.filter(pk=signal.pk).update(
            negative_count=F("negative_count") + 1
        )


def list_homepage_pick_rows():
    """Portal listing: all owner picks in order (includes unavailable for editing)."""
    return (
        HomepagePick.objects.select_related("product", "product__brand", "product__category")
        .prefetch_related("product__images", "product__variants")
        .order_by("sort_order", "id")
    )


def replace_homepage_picks(product_ids):
    """
    Replace the home shelf with the given product id order (max HOMEPAGE_PICKS_LIMIT).
    Only real catalogue products are accepted.
    """
    cleaned = []
    seen = set()
    for raw in product_ids:
        try:
            pk = int(raw)
        except (TypeError, ValueError) as error:
            raise HomepagePickError("Product ids must be numbers.") from error
        if pk in seen:
            continue
        seen.add(pk)
        cleaned.append(pk)
    if len(cleaned) > HOMEPAGE_PICKS_LIMIT:
        raise HomepagePickError(f"Choose at most {HOMEPAGE_PICKS_LIMIT} products for the home page.")

    existing = set(Product.objects.filter(pk__in=cleaned).values_list("pk", flat=True))
    missing = [pk for pk in cleaned if pk not in existing]
    if missing:
        raise HomepagePickError(
            "Those product ids are not in the catalogue: "
            + ", ".join(str(pk) for pk in missing)
        )

    with transaction.atomic():
        HomepagePick.objects.all().delete()
        HomepagePick.objects.bulk_create(
            [HomepagePick(product_id=pk, sort_order=index) for index, pk in enumerate(cleaned)]
        )
    return list(list_homepage_pick_rows())


def build_homepage_picks(*, limit=HOMEPAGE_PICKS_LIMIT):
    """
    Public home shelf: owner picks that are active and in stock.
    Unavailable / missing picks get a negative fit signal and are skipped.
    Shown picks get a positive fit signal so the algorithm learns from the live catalogue.
    """
    picks = list(
        HomepagePick.objects.select_related("product")
        .order_by("sort_order", "id")[:limit]
    )
    if not picks:
        return []

    available_map = {
        product.pk: product
        for product in annotated_products()
        .filter(is_in_stock=True, pk__in=[pick.product_id for pick in picks])
    }
    shown = []
    rejected = []
    for pick in picks:
        product = available_map.get(pick.product_id)
        if product is None:
            rejected.append(pick.product_id)
            continue
        shown.append(product)
    if rejected:
        record_fit_negative(rejected)
    if shown:
        record_fit_positive([product.pk for product in shown])
    return shown


def annotated_products():
    """Active products with the values product cards need, without N+1 queries."""
    active_variants = ProductVariant.objects.filter(product=OuterRef("pk"), is_active=True)
    cheapest = active_variants.order_by("price", "id")
    approved_reviews = Review.objects.filter(product=OuterRef("pk"), is_approved=True).values(
        "product"
    )
    return (
        Product.objects.filter(is_active=True, brand__is_active=True, category__is_active=True)
        .select_related("brand", "category")
        .prefetch_related("images", "variants")
        .annotate(
            min_price=Subquery(cheapest.values("price")[:1]),
            min_compare_at_price=Subquery(cheapest.values("compare_at_price")[:1]),
            is_in_stock=Exists(active_variants.filter(stock_quantity__gt=0)),
            average_rating=Subquery(
                approved_reviews.annotate(value=Avg("rating")).values("value")[:1]
            ),
            review_count=Coalesce(
                Subquery(
                    approved_reviews.annotate(value=Count("id")).values("value")[:1],
                    output_field=IntegerField(),
                ),
                Value(0),
            ),
        )
        .filter(min_price__isnull=False)
    )


MORNING_ROUTINE = [
    Product.RoutineStep.CLEANSER,
    Product.RoutineStep.TONER,
    Product.RoutineStep.SERUM,
    Product.RoutineStep.MOISTURISER,
    Product.RoutineStep.SUNSCREEN,
]
NIGHT_ROUTINE = [
    Product.RoutineStep.CLEANSER,
    Product.RoutineStep.NIGHT_TREATMENT,
    Product.RoutineStep.MOISTURISER,
]


def cheapest_available_variant(product):
    """Cheapest active, in-stock variant from the prefetched variants, or None."""
    available = [v for v in product.variants.all() if v.is_active and v.stock_quantity > 0]
    return min(available, key=lambda variant: (variant.price, variant.pk), default=None)


def bag_summary(variants):
    """Unique variant ids (in order) and their total price, for "add everything to bag" buttons."""
    unique = {}
    for variant in variants:
        if variant is not None:
            unique.setdefault(variant.pk, variant.price)
    return list(unique), sum(unique.values(), Decimal("0.00"))


def _rank_routine_products(*, skin_type=None, concern=None, max_price=None):
    """
    In-stock routine products ordered by quiz fit.

    Priority: concern match → skin fit (exact > universal > other) → budget use
    (prefer higher price within the cap so Under ₹299 / ₹499 / ₹999 feel different) →
    rating → featured.

    Skin is scored, not hard-filtered, so a strong concern match can still win for a
    different skin type when that is the best tagged option in budget.
    """
    skin_links = Product.skin_types.through.objects.filter(product=OuterRef("pk"))
    products = annotated_products().filter(is_in_stock=True).exclude(routine_step="")
    if max_price is not None:
        products = products.filter(min_price__lte=max_price)

    if skin_type is not None:
        products = products.annotate(
            skin_score=Case(
                When(Exists(skin_links.filter(skintype=skin_type)), then=Value(2)),
                When(~Exists(skin_links), then=Value(1)),
                default=Value(0),
                output_field=IntegerField(),
            )
        )
    else:
        products = products.annotate(skin_score=Value(1, output_field=IntegerField()))

    if concern is not None:
        concern_links = Product.concerns.through.objects.filter(
            product=OuterRef("pk"), concern=concern
        )
        products = products.annotate(
            concern_score=Case(
                When(Exists(concern_links), then=Value(3)),
                default=Value(0),
                output_field=IntegerField(),
            )
        )
    else:
        products = products.annotate(concern_score=Value(0, output_field=IntegerField()))

    products = _annotate_fit_score(products)

    # Within budget: spend toward the ceiling so higher budget answers pick stronger SKUs.
    # Fit score learns from live availability (unavailable picks train negative).
    if max_price is not None:
        return products.order_by(
            "-concern_score",
            "-skin_score",
            "-fit_score",
            "-min_price",
            F("average_rating").desc(nulls_last=True),
            "-is_featured",
            "pk",
        )
    return products.order_by(
        "-concern_score",
        "-skin_score",
        "-fit_score",
        "-is_featured",
        F("average_rating").desc(nulls_last=True),
        "-min_price",
        "pk",
    )


def build_routine(skin_type=None, concern=None, max_price=None):
    """
    Pick the best in-stock product for each morning / night routine step.

    Scoring prefers concern match, then skin-type fit, then using the shopper's budget.
    """
    best = {}
    for product in _rank_routine_products(
        skin_type=skin_type, concern=concern, max_price=max_price
    ):
        best.setdefault(product.routine_step, product)

    if best:
        record_fit_positive([product.pk for product in best.values()])

    def steps(order):
        return [{"step": step.value, "label": step.label, "product": best.get(step)} for step in order]

    variant_ids, total = bag_summary(cheapest_available_variant(product) for product in best.values())
    return {
        "morning": steps(MORNING_ROUTINE),
        "night": steps(NIGHT_ROUTINE),
        "bag_variant_ids": variant_ids,
        "total_price": total,
    }


def build_recommendations(
    *,
    context="home",
    skin_type=None,
    concern=None,
    max_price=None,
    subtotal=None,
    limit=8,
):
    """
    Rank in-stock products for home shelves and cart upsells.

    Home: prefer skin/concern matches, then rating and featured picks.
    Cart: when under the free-shipping threshold, prefer affordable add-ons;
    otherwise featured / highly rated complements.
    """
    from django.conf import settings

    skin_links = Product.skin_types.through.objects.filter(product=OuterRef("pk"))
    products = annotated_products().filter(is_in_stock=True)

    if skin_type is not None:
        products = products.filter(
            Exists(skin_links.filter(skintype=skin_type)) | ~Exists(skin_links)
        )
        products = products.annotate(
            skin_score=Case(
                When(Exists(skin_links.filter(skintype=skin_type)), then=Value(2)),
                When(~Exists(skin_links), then=Value(1)),
                default=Value(0),
                output_field=IntegerField(),
            ),
            matches_skin=Exists(skin_links.filter(skintype=skin_type)),
        )
    else:
        products = products.annotate(
            skin_score=Value(1, output_field=IntegerField()),
            matches_skin=Value(False),
        )

    if concern is not None:
        concern_links = Product.concerns.through.objects.filter(
            product=OuterRef("pk"), concern=concern
        )
        products = products.annotate(
            concern_score=Case(
                When(Exists(concern_links), then=Value(3)),
                default=Value(0),
                output_field=IntegerField(),
            ),
            matches_concern=Exists(concern_links),
        )
    else:
        products = products.annotate(
            concern_score=Value(0, output_field=IntegerField()),
            matches_concern=Value(False),
        )

    if max_price is not None:
        products = products.filter(min_price__lte=max_price)

    products = _annotate_fit_score(products)

    if context == "cart":
        limit = min(limit, 4)
        threshold = Decimal(str(settings.FREE_SHIPPING_THRESHOLD))
        cart_total = Decimal(subtotal) if subtotal is not None else Decimal("0")
        remaining = threshold - cart_total
        if remaining > 0:
            # Prefer items that help reach free shipping without overshooting wildly.
            products = products.filter(min_price__lte=remaining + Decimal("150"))
        products = products.order_by(
            "-concern_score",
            "-skin_score",
            "-fit_score",
            "-is_featured",
            F("average_rating").desc(nulls_last=True),
            "min_price",
            "pk",
        )
    else:
        products = products.order_by(
            "-concern_score",
            "-skin_score",
            "-fit_score",
            F("average_rating").desc(nulls_last=True),
            "-is_featured",
            "min_price",
            "pk",
        )

    chosen = list(products[:limit])
    if chosen:
        record_fit_positive([product.pk for product in chosen])
    return chosen


@transaction.atomic
def change_stock(variant_id, quantity_change, reason, reference="", user=None):
    """
    Atomically change a variant's stock and record a StockMovement.

    Runs inside a write transaction (SQLite BEGIN IMMEDIATE), so concurrent
    changes cannot oversell. Raises InsufficientStockError if the change
    would make stock negative.
    """
    variant = ProductVariant.objects.select_for_update().get(pk=variant_id)
    if variant.stock_quantity + quantity_change < 0:
        raise InsufficientStockError(
            f"Only {variant.stock_quantity} left of {variant.product.name} ({variant.name})."
        )
    ProductVariant.objects.filter(pk=variant_id).update(
        stock_quantity=F("stock_quantity") + quantity_change
    )
    StockMovement.objects.create(
        variant_id=variant_id,
        quantity_change=quantity_change,
        reason=reason,
        reference=reference,
        created_by=user,
    )
    variant.refresh_from_db(fields=["stock_quantity"])
    return variant


PRODUCT_IMAGE_SIDE = 1200


def normalize_product_image(uploaded):
    """Return JPEG bytes cropped to a square and resized to 1200×1200.

    The file pointer is left at the start. A file that is not a photo raises
    UnidentifiedImageError or OSError.
    """
    uploaded.seek(0)
    raw = uploaded.read()
    uploaded.seek(0)
    try:
        image = Image.open(BytesIO(raw))
        image.load()
    except (UnidentifiedImageError, OSError):
        raise
    image = ImageOps.exif_transpose(image)
    if image.mode in ("RGBA", "LA") or (image.mode == "P" and "transparency" in image.info):
        image = image.convert("RGBA")
        background = Image.new("RGB", image.size, (255, 255, 255))
        background.paste(image, mask=image.getchannel("A"))
        image = background
    else:
        image = image.convert("RGB")
    width, height = image.size
    side = min(width, height)
    left = (width - side) // 2
    top = (height - side) // 2
    image = image.crop((left, top, left + side, top + side))
    image = image.resize((PRODUCT_IMAGE_SIDE, PRODUCT_IMAGE_SIDE), Image.Resampling.LANCZOS)
    output = BytesIO()
    image.save(output, format="JPEG", quality=85, optimize=True)
    return output.getvalue()


def user_has_received_product(user, product):
    """A review is allowed only after an order containing the product was delivered."""
    from apps.orders.models import Order, OrderItem

    return OrderItem.objects.filter(
        order__user=user,
        order__status=Order.Status.DELIVERED,
        variant__product=product,
    ).exists()
