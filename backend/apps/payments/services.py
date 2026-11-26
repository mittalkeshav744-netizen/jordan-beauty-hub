"""Razorpay helpers — enabled only when keys are configured."""

from __future__ import annotations

import hashlib
import hmac
from decimal import Decimal

from django.conf import settings
from django.utils import timezone

from .models import Payment


class PaymentsNotConfigured(Exception):
    pass


class PaymentVerificationError(Exception):
    pass


def razorpay_enabled():
    return bool(
        getattr(settings, "RAZORPAY_ENABLED", False)
        and getattr(settings, "RAZORPAY_KEY_ID", "")
        and getattr(settings, "RAZORPAY_KEY_SECRET", "")
    )


def public_payment_settings():
    return {
        "cod_enabled": True,
        "razorpay_enabled": razorpay_enabled(),
        "razorpay_key_id": settings.RAZORPAY_KEY_ID if razorpay_enabled() else "",
        "delivery_provider": getattr(settings, "DELIVERY_PROVIDER", "") or "",
        "delivery_tracking_enabled": bool(getattr(settings, "DELIVERY_TRACKING_ENABLED", True)),
    }


def create_razorpay_order(payment: Payment):
    """
    Create a Razorpay order for an existing pending payment.

    Requires the `razorpay` package and live keys. Until you add keys, this
    raises PaymentsNotConfigured so checkout can fall back to COD messaging.
    """
    if not razorpay_enabled():
        raise PaymentsNotConfigured(
            "Razorpay is not configured. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to .env."
        )
    try:
        import razorpay
    except ImportError as exc:
        raise PaymentsNotConfigured(
            "Install the razorpay package (`pip install razorpay`) when you are ready."
        ) from exc

    client = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))
    amount_paise = int(Decimal(payment.amount) * 100)
    data = client.order.create(
        {
            "amount": amount_paise,
            "currency": payment.currency or "INR",
            "receipt": payment.order.number,
            "payment_capture": 1,
            "notes": {"order_number": payment.order.number},
        }
    )
    payment.method = Payment.Method.RAZORPAY
    payment.provider_order_id = data.get("id", "")
    payment.provider_payload = data
    payment.status = Payment.Status.PENDING
    payment.save(
        update_fields=[
            "method",
            "provider_order_id",
            "provider_payload",
            "status",
            "updated_at",
        ]
    )
    return {
        "key_id": settings.RAZORPAY_KEY_ID,
        "order_id": payment.provider_order_id,
        "amount": amount_paise,
        "currency": payment.currency,
        "order_number": payment.order.number,
        "name": "Jordan Beauty Hub",
        "description": f"Order {payment.order.number}",
        "prefill": {
            "name": payment.order.shipping_full_name,
            "contact": payment.order.shipping_phone,
            "email": payment.order.user.email,
        },
    }


def verify_razorpay_payment(
    *,
    payment: Payment,
    razorpay_order_id: str,
    razorpay_payment_id: str,
    razorpay_signature: str,
):
    if not razorpay_enabled():
        raise PaymentsNotConfigured("Razorpay is not configured.")
    if payment.provider_order_id and payment.provider_order_id != razorpay_order_id:
        raise PaymentVerificationError("Order id does not match this payment.")

    body = f"{razorpay_order_id}|{razorpay_payment_id}".encode()
    expected = hmac.new(
        settings.RAZORPAY_KEY_SECRET.encode(),
        body,
        hashlib.sha256,
    ).hexdigest()
    if not hmac.compare_digest(expected, razorpay_signature or ""):
        payment.status = Payment.Status.FAILED
        payment.save(update_fields=["status", "updated_at"])
        raise PaymentVerificationError("Invalid Razorpay signature.")

    payment.provider_reference = razorpay_payment_id
    payment.status = Payment.Status.PAID
    payment.paid_at = timezone.now()
    payment.provider_payload = {
        **(payment.provider_payload or {}),
        "razorpay_payment_id": razorpay_payment_id,
        "razorpay_signature": razorpay_signature,
    }
    payment.save(
        update_fields=[
            "provider_reference",
            "status",
            "paid_at",
            "provider_payload",
            "updated_at",
        ]
    )
    return payment
