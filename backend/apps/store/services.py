from django.conf import settings

from .chat import chat_is_configured
from .models import NewsletterSubscriber


def public_store_settings():
    """Shop settings the storefront may show to anyone."""
    return {
        "currency": settings.STORE_CURRENCY,
        "shipping_flat_fee": f"{settings.SHIPPING_FLAT_FEE:.2f}",
        "free_shipping_threshold": f"{settings.FREE_SHIPPING_THRESHOLD:.2f}",
        "whatsapp_number": settings.STORE_WHATSAPP_NUMBER,
        "chat_enabled": chat_is_configured(),
    }


def subscribe_to_newsletter(email):
    NewsletterSubscriber.objects.get_or_create(email=email.strip().lower())
