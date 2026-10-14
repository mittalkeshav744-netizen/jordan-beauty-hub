"""
Checkout and order lifecycle business rules.

All money is handled as Decimal and every total is calculated here on the
server; nothing the client sends about prices is trusted.
"""

import secrets
from dataclasses import dataclass
from decimal import ROUND_HALF_UP, Decimal

from django.conf import settings
from django.db import IntegrityError, transaction
from django.db.models import F
from django.utils import timezone

from apps.cart.services import cart_items_queryset, get_cart
from apps.catalog.models import ProductVariant, StockMovement
from apps.catalog.services import change_stock
from apps.payments.models import Payment

from .models import Coupon, CouponRedemption, Order, OrderItem, OrderStatusHistory

ZERO = Decimal("0.00")
CENT = Decimal("0.01")


class CheckoutError(Exception):
    pass


class CouponError(CheckoutError):
    pass


class InvalidStatusTransition(Exception):
    pass


ALLOWED_TRANSITIONS = {
    Order.Status.PENDING: {Order.Status.CONFIRMED, Order.Status.CANCELLED},
    Order.Status.CONFIRMED: {Order.Status.PROCESSING, Order.Status.CANCELLED},
    Order.Status.PROCESSING: {Order.Status.SHIPPED, Order.Status.CANCELLED},
    Order.Status.SHIPPED: {Order.Status.DELIVERED},
    Order.Status.DELIVERED: set(),
    Order.Status.CANCELLED: set(),
}


@dataclass
class Quote:
    subtotal: Decimal
    discount_total: Decimal
    shipping_total: Decimal
    grand_total: Decimal
    coupon: Coupon | None = None

    def as_dict(self):
        return {
            "subtotal": f"{self.subtotal:.2f}",
            "discount_total": f"{self.discount_total:.2f}",
            "shipping_total": f"{self.shipping_total:.2f}",
            "grand_total": f"{self.grand_total:.2f}",
            "coupon_code": self.coupon.code if self.coupon else "",
            "coupon_description": self.coupon.description if self.coupon else "",
        }


def money(value):
    return Decimal(value).quantize(CENT, rounding=ROUND_HALF_UP)


def find_coupon(code, lock=False):
    queryset = Coupon.objects.select_for_update() if lock else Coupon.objects.all()
    try:
        return queryset.get(code=code.strip().upper())
    except Coupon.DoesNotExist as error:
        raise CouponError("This coupon code is not valid.") from error


def validate_coupon(coupon, user, subtotal):
    now = timezone.now()
    if not coupon.is_active or coupon.valid_from > now:
        raise CouponError("This coupon code is not valid.")
    if coupon.valid_until and coupon.valid_until < now:
        raise CouponError("This coupon has expired.")
    if coupon.usage_limit is not None and coupon.times_used >= coupon.usage_limit:
        raise CouponError("This coupon has reached its usage limit.")
    if coupon.usage_limit_per_user is not None:
        used_by_user = CouponRedemption.objects.filter(coupon=coupon, user=user).count()
        if used_by_user >= coupon.usage_limit_per_user:
            raise CouponError("You have already used this coupon.")
    if subtotal < coupon.min_order_amount:
        raise CouponError(f"Add items worth ₹{coupon.min_order_amount:.2f} or more to use this coupon.")


def calculate_discount(coupon, subtotal):
    if coupon.discount_type == Coupon.DiscountType.PERCENTAGE:
        discount = money(subtotal * coupon.value / Decimal("100"))
        if coupon.max_discount_amount is not None:
            discount = min(discount, coupon.max_discount_amount)
    else:
        discount = coupon.value
    return money(min(discount, subtotal))


def calculate_shipping(amount_after_discount):
    threshold = settings.FREE_SHIPPING_THRESHOLD
    if threshold > ZERO and amount_after_discount >= threshold:
        return ZERO
    return money(settings.SHIPPING_FLAT_FEE)


def build_quote(user, subtotal, coupon_code="", lock_coupon=False):
    subtotal = money(subtotal)
    coupon = None
    discount = ZERO
    if coupon_code:
        coupon = find_coupon(coupon_code, lock=lock_coupon)
        validate_coupon(coupon, user, subtotal)
        discount = calculate_discount(coupon, subtotal)
    shipping = calculate_shipping(subtotal - discount) if subtotal > ZERO else ZERO
    return Quote(
        subtotal=subtotal,
        discount_total=discount,
        shipping_total=shipping,
        grand_total=money(subtotal - discount + shipping),
        coupon=coupon,
    )


def quote_cart(user, coupon_code=""):
    items = list(cart_items_queryset(get_cart(user)))
    subtotal = sum((item.variant.price * item.quantity for item in items), ZERO)
    return build_quote(user, subtotal, coupon_code)


def generate_order_number():
    return f"JB{timezone.now():%y%m%d}{secrets.token_hex(3).upper()}"


def record_status(order, from_status, to_status, user=None, note=""):
    OrderStatusHistory.objects.create(
        order=order, from_status=from_status, to_status=to_status, changed_by=user, note=note
    )


def place_order(user, address, idempotency_key, coupon_code="", customer_note=""):
    """
    Turn the user's cart into an order. Returns (order, created).

    A repeated request with the same idempotency key returns the existing
    order instead of charging stock twice.
    """
    existing = Order.objects.filter(user=user, idempotency_key=idempotency_key).first()
    if existing:
        return existing, False
    try:
        return _create_order(user, address, idempotency_key, coupon_code, customer_note), True
    except IntegrityError:
        existing = Order.objects.filter(user=user, idempotency_key=idempotency_key).first()
        if existing:
            return existing, False
        raise


@transaction.atomic
def _create_order(user, address, idempotency_key, coupon_code, customer_note):
    cart = get_cart(user)
    cart_items = list(cart.items.all())
    if not cart_items:
        raise CheckoutError("Your bag is empty.")

    # The surrounding transaction holds SQLite's write lock, so concurrent
    # checkouts queue up; select_for_update() keeps this correct if the
    # project ever moves to a database with row locks.
    variants = {
        variant.pk: variant
        for variant in ProductVariant.objects.select_for_update()
        .select_related("product")
        .filter(pk__in=[item.variant_id for item in cart_items])
        .order_by("pk")
    }

    lines = []
    for item in cart_items:
        variant = variants[item.variant_id]
        if not variant.is_active or not variant.product.is_active:
            raise CheckoutError(f"{variant.product.name} ({variant.name}) is no longer available.")
        if variant.stock_quantity < item.quantity:
            raise CheckoutError(
                f"Only {variant.stock_quantity} of {variant.product.name} ({variant.name}) "
                "left in stock. Please update your bag."
            )
        lines.append((variant, item.quantity, money(variant.price * item.quantity)))

    subtotal = sum((line_total for _, _, line_total in lines), ZERO)
    quote = build_quote(user, subtotal, coupon_code, lock_coupon=True)

    order = Order.objects.create(
        number=generate_order_number(),
        user=user,
        idempotency_key=idempotency_key,
        shipping_full_name=address.full_name,
        shipping_phone=address.phone,
        shipping_line1=address.line1,
        shipping_line2=address.line2,
        shipping_city=address.city,
        shipping_state=address.state,
        shipping_postal_code=address.postal_code,
        shipping_country=address.country,
        subtotal=quote.subtotal,
        discount_total=quote.discount_total,
        shipping_total=quote.shipping_total,
        grand_total=quote.grand_total,
        currency=settings.STORE_CURRENCY,
        coupon=quote.coupon,
        coupon_code=quote.coupon.code if quote.coupon else "",
        customer_note=customer_note,
    )

    OrderItem.objects.bulk_create(
        [
            OrderItem(
                order=order,
                variant=variant,
                product_name=variant.product.name,
                variant_name=variant.name,
                sku=variant.sku,
                unit_price=variant.price,
                quantity=quantity,
                line_total=line_total,
            )
            for variant, quantity, line_total in lines
        ]
    )

    for variant, quantity, _ in lines:
        change_stock(variant.pk, -quantity, StockMovement.Reason.ORDER, order.number, user)

    if quote.coupon:
        Coupon.objects.filter(pk=quote.coupon.pk).update(times_used=F("times_used") + 1)
        CouponRedemption.objects.create(
            coupon=quote.coupon, user=user, order=order, discount_amount=quote.discount_total
        )

    Payment.objects.create(
        order=order,
        method=Payment.Method.CASH_ON_DELIVERY,
        amount=order.grand_total,
        currency=order.currency,
    )
    record_status(order, "", Order.Status.PENDING, user, "Order placed")
    cart.items.all().delete()
    return order


@transaction.atomic
def change_order_status(order, new_status, user=None, note=""):
    order = Order.objects.select_for_update().get(pk=order.pk)
    old_status = order.status
    if new_status == old_status:
        return order
    if new_status not in ALLOWED_TRANSITIONS[old_status]:
        raise InvalidStatusTransition(
            f"An order cannot move from '{order.get_status_display()}' to '{new_status}'."
        )

    if new_status == Order.Status.CANCELLED:
        _release_order(order, user)
    elif new_status == Order.Status.DELIVERED:
        # Cash on delivery is collected by the courier when the parcel is handed over.
        Payment.objects.filter(
            order=order, method=Payment.Method.CASH_ON_DELIVERY, status=Payment.Status.PENDING
        ).update(status=Payment.Status.PAID, paid_at=timezone.now())

    order.status = new_status
    order.save(update_fields=["status", "updated_at"])
    record_status(order, old_status, new_status, user, note)
    return order


def _release_order(order, user):
    """Return stock and coupon usage when an order is cancelled."""
    for item in order.items.exclude(variant=None):
        change_stock(
            item.variant_id, item.quantity, StockMovement.Reason.CANCELLATION, order.number, user
        )

    redemption = getattr(order, "coupon_redemption", None)
    if redemption:
        Coupon.objects.filter(pk=redemption.coupon_id, times_used__gt=0).update(
            times_used=F("times_used") - 1
        )
        redemption.delete()

    Payment.objects.filter(order=order, status=Payment.Status.PENDING).update(
        status=Payment.Status.CANCELLED
    )


def cancel_order_by_customer(order, user):
    if not order.can_be_cancelled_by_customer:
        raise InvalidStatusTransition("This order can no longer be cancelled.")
    return change_order_status(order, Order.Status.CANCELLED, user, "Cancelled by customer")
