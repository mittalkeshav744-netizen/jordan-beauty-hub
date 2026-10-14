from django.db import transaction
from django.db.models import F

from .models import ProductVariant, StockMovement


class InsufficientStockError(Exception):
    pass


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
