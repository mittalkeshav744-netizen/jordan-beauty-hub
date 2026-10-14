from decimal import Decimal

from django.conf import settings
from django.db import transaction

from apps.catalog.models import ProductVariant

from .models import Cart, CartItem


class CartError(Exception):
    pass


def get_cart(user):
    cart, _ = Cart.objects.get_or_create(user=user)
    return cart


def cart_items_queryset(cart):
    return cart.items.select_related("variant__product__brand").prefetch_related(
        "variant__product__images"
    )


def validate_quantity(variant, quantity):
    if quantity < 1:
        raise CartError("Quantity must be at least 1.")
    if quantity > settings.MAX_CART_ITEM_QUANTITY:
        raise CartError(f"You can buy at most {settings.MAX_CART_ITEM_QUANTITY} of each item.")
    if not variant.is_active or not variant.product.is_active:
        raise CartError("This product is no longer available.")
    if variant.stock_quantity < quantity:
        if variant.stock_quantity == 0:
            raise CartError(f"{variant.product.name} ({variant.name}) is out of stock.")
        raise CartError(
            f"Only {variant.stock_quantity} of {variant.product.name} ({variant.name}) available."
        )


@transaction.atomic
def add_item(user, variant_id, quantity):
    cart = get_cart(user)
    try:
        variant = ProductVariant.objects.select_related("product").get(pk=variant_id)
    except ProductVariant.DoesNotExist as error:
        raise CartError("This product variant does not exist.") from error

    item = CartItem.objects.select_for_update().filter(cart=cart, variant=variant).first()
    new_quantity = (item.quantity if item else 0) + quantity
    validate_quantity(variant, new_quantity)

    if item:
        item.quantity = new_quantity
        item.save(update_fields=["quantity"])
    else:
        item = CartItem.objects.create(cart=cart, variant=variant, quantity=quantity)
    cart.save(update_fields=["updated_at"])
    return item


@transaction.atomic
def update_item_quantity(item, quantity):
    validate_quantity(item.variant, quantity)
    item.quantity = quantity
    item.save(update_fields=["quantity"])
    return item


def calculate_subtotal(items):
    return sum((item.variant.price * item.quantity for item in items), Decimal("0.00"))
