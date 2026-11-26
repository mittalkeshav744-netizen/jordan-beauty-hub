"""Courier / tracking helpers — provider APIs plug in when credentials arrive."""

from __future__ import annotations

from django.conf import settings
from django.utils import timezone


class DeliveryNotConfigured(Exception):
    pass


def provider_name():
    return (getattr(settings, "DELIVERY_PROVIDER", "") or "").strip().lower()


def tracking_enabled():
    return bool(getattr(settings, "DELIVERY_TRACKING_ENABLED", True))


def apply_manual_shipment(order, *, courier_name="", tracking_number="", tracking_url=""):
    """Staff-entered courier details (works without a third-party API)."""
    order.courier_name = (courier_name or order.courier_name or "").strip()
    order.tracking_number = (tracking_number or order.tracking_number or "").strip()
    order.tracking_url = (tracking_url or order.tracking_url or "").strip()
    if order.tracking_number and not order.shipped_at:
        order.shipped_at = timezone.now()
    order.save(
        update_fields=[
            "courier_name",
            "tracking_number",
            "tracking_url",
            "shipped_at",
            "updated_at",
        ]
    )
    return order


def create_shipment(order):
    """
    Hook for Shiprocket / Delhivery / etc.

    Until DELIVERY_API_KEY (and provider) are set, returns a clear error so the
    portal can keep using manual tracking fields.
    """
    provider = provider_name()
    api_key = getattr(settings, "DELIVERY_API_KEY", "") or ""
    if not provider or not api_key:
        raise DeliveryNotConfigured(
            "Delivery API is not configured. Enter courier details manually, "
            "or set DELIVERY_PROVIDER and DELIVERY_API_KEY when ready."
        )
    raise DeliveryNotConfigured(
        f"Provider '{provider}' is selected but the API client is not wired yet. "
        "Share the API docs/keys and we can finish the integration."
    )
