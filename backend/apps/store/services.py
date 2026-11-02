from django.conf import settings

from .chat import chat_is_configured
from .models import NewsletterSubscriber, StorefrontConfig, StorefrontReel


def public_store_settings():
    """Shop settings the storefront may show to anyone."""
    return {
        "currency": settings.STORE_CURRENCY,
        "shipping_flat_fee": f"{settings.SHIPPING_FLAT_FEE:.2f}",
        "free_shipping_threshold": f"{settings.FREE_SHIPPING_THRESHOLD:.2f}",
        "whatsapp_number": settings.STORE_WHATSAPP_NUMBER,
        "chat_enabled": chat_is_configured(),
    }


def _media_url(file_field, request=None):
    if not file_field:
        return ""
    url = file_field.url
    if request is not None:
        return request.build_absolute_uri(url)
    return url


def public_storefront(request=None):
    """Home page copy and active reels for the shop."""
    config = StorefrontConfig.load()
    reels = StorefrontReel.objects.filter(is_active=True)
    return {
        "config": {
            "announcement_text": config.announcement_text,
            "announcement_link": config.announcement_link,
            "announcement_enabled": config.announcement_enabled,
            "hero_tag": config.hero_tag,
            "hero_title": config.hero_title,
            "hero_rotating_lines": config.hero_rotating_lines or [],
            "hero_media_type": config.hero_media_type,
            "hero_video_file_url": _media_url(config.hero_video_file, request),
            "hero_video_url": config.hero_video_url,
            "hero_video_loop_end": config.hero_video_loop_end,
            "hero_primary_cta_text": config.hero_primary_cta_text,
            "hero_primary_cta_link": config.hero_primary_cta_link,
            "hero_secondary_cta_text": config.hero_secondary_cta_text,
            "hero_secondary_cta_link": config.hero_secondary_cta_link,
            "marquee_items": config.marquee_items or [],
            "quiz_badge": config.quiz_badge,
            "quiz_title": config.quiz_title,
            "quiz_subtitle": config.quiz_subtitle,
            "quiz_button_text": config.quiz_button_text,
            "quiz_link": config.quiz_link,
            "quiz_enabled": config.quiz_enabled,
            "benefits": config.benefits or [],
            "budget_tiles": config.budget_tiles or [],
            "sections_order": config.sections_order or [],
        },
        "reels": [
            {
                "id": reel.id,
                "title": reel.title,
                "video_file_url": _media_url(reel.video_file, request),
                "video_url": reel.video_url,
                "link_url": reel.link_url,
                "start_seconds": reel.start_seconds,
                "loop_end_seconds": reel.loop_end_seconds,
                "sort_order": reel.sort_order,
            }
            for reel in reels
        ],
    }


def subscribe_to_newsletter(email):
    """
    Save the email and send a welcome note on first signup.
    Re-submits of the same address do not send again (same public reply either way).
    """
    cleaned = email.strip().lower()
    _, created = NewsletterSubscriber.objects.get_or_create(email=cleaned)
    if created:
        _send_newsletter_welcome_email(cleaned)
    return created


def _send_newsletter_welcome_email(email):
    from apps.accounts.mail import send_store_email

    store = settings.STORE_NAME
    shop = f"{settings.FRONTEND_URL.rstrip('/')}/shop"
    text = (
        f"Hi,\n\n"
        f"Thanks for joining the {store} newsletter.\n\n"
        "We will email you offers, sales, and new arrivals — nothing spammy.\n\n"
        f"Browse the shop anytime:\n{shop}\n\n"
        f"— {store}\n"
    )
    html = (
        f"<p>Hi,</p>"
        f"<p>Thanks for joining the <strong>{store}</strong> newsletter.</p>"
        "<p>We will email you offers, sales, and new arrivals — nothing spammy.</p>"
        f'<p><a href="{shop}">Browse the shop</a></p>'
        f"<p>— {store}</p>"
    )
    send_store_email(
        subject=f"Welcome to the {store} newsletter",
        to=[email],
        text_body=text,
        html_body=html,
    )
