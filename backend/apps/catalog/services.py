from decimal import Decimal

from django.db import transaction
from django.db.models import Avg, Count, Exists, F, IntegerField, OuterRef, Subquery, Value
from django.db.models.functions import Coalesce

from .models import Product, ProductVariant, Review, StockMovement


class InsufficientStockError(Exception):
    pass


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


def build_routine(skin_type=None, concern=None, max_price=None):
    """
    Pick the best in-stock product for each step of a morning and night skincare routine.

    A product qualifies when it has a routine step, suits the skin type (or lists no skin types)
    and costs at most max_price. Products for the chosen concern come first, then the best rated.
    """
    skin_links = Product.skin_types.through.objects.filter(product=OuterRef("pk"))
    products = annotated_products().filter(is_in_stock=True).exclude(routine_step="")
    if skin_type is not None:
        products = products.filter(Exists(skin_links.filter(skintype=skin_type)) | ~Exists(skin_links))
    if max_price is not None:
        products = products.filter(min_price__lte=max_price)
    if concern is not None:
        concern_links = Product.concerns.through.objects.filter(product=OuterRef("pk"), concern=concern)
        products = products.annotate(matches_concern=Exists(concern_links))
    else:
        products = products.annotate(matches_concern=Value(False))
    products = products.order_by(
        "-matches_concern", F("average_rating").desc(nulls_last=True), "-is_featured", "min_price", "pk"
    )

    best = {}
    for product in products:
        best.setdefault(product.routine_step, product)

    def steps(order):
        return [{"step": step.value, "label": step.label, "product": best.get(step)} for step in order]

    variant_ids, total = bag_summary(cheapest_available_variant(product) for product in best.values())
    return {
        "morning": steps(MORNING_ROUTINE),
        "night": steps(NIGHT_ROUTINE),
        "bag_variant_ids": variant_ids,
        "total_price": total,
    }


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


def user_has_received_product(user, product):
    """A review is allowed only after an order containing the product was delivered."""
    from apps.orders.models import Order, OrderItem

    return OrderItem.objects.filter(
        order__user=user,
        order__status=Order.Status.DELIVERED,
        variant__product=product,
    ).exists()
