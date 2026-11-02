"""Marketing emails to newsletter subscribers and signed-up customers."""

from __future__ import annotations

import logging

from django.conf import settings
from django.contrib.auth import get_user_model

from apps.accounts.mail import send_store_email
from apps.store.models import NewsletterSubscriber

logger = logging.getLogger(__name__)

KIND_OFFER = "offer"
KIND_NEW_ARRIVALS = "new_arrivals"
KIND_CUSTOM = "custom"
CAMPAIGN_KINDS = {KIND_OFFER, KIND_NEW_ARRIVALS, KIND_CUSTOM}


def marketing_recipient_emails():
    """Unique emails: newsletter list + active non-staff account emails."""
    emails = {email.strip().lower() for email in NewsletterSubscriber.objects.values_list("email", flat=True)}
    User = get_user_model()
    account_emails = (
        User.objects.filter(is_active=True)
        .exclude(email="")
        .exclude(is_staff=True)
        .values_list("email", flat=True)
    )
    emails.update(email.strip().lower() for email in account_emails if email)
    return sorted(emails)


def send_marketing_campaign(*, subject, text_body, html_body=None):
    """
    Send one message to every marketing recipient (one email at a time for privacy).
    Returns {'sent': int, 'failed': int, 'total': int}.
    """
    recipients = marketing_recipient_emails()
    sent = 0
    failed = 0
    for email in recipients:
        ok = send_store_email(
            subject=subject,
            to=[email],
            text_body=text_body,
            html_body=html_body,
        )
        if ok:
            sent += 1
        else:
            failed += 1
    return {"sent": sent, "failed": failed, "total": len(recipients)}


def _shop_link(path="/shop"):
    base = settings.FRONTEND_URL.rstrip("/")
    path = path if path.startswith("/") else f"/{path}"
    return f"{base}{path}"


def compose_owner_campaign(*, kind, subject, message):
    """Build text/html for an owner-written campaign."""
    store = settings.STORE_NAME
    shop = _shop_link("/shop")
    kind_label = {
        KIND_OFFER: "Offer",
        KIND_NEW_ARRIVALS: "New arrivals",
        KIND_CUSTOM: "Update",
    }.get(kind, "Update")
    text = (
        f"Hi from {store},\n\n"
        f"{message.strip()}\n\n"
        f"Shop now: {shop}\n\n"
        "You received this because you subscribed to our newsletter or created an account.\n"
    )
    html = (
        f"<p>Hi from <strong>{store}</strong>,</p>"
        f"<p>{message.strip().replace(chr(10), '<br>')}</p>"
        f'<p><a href="{shop}">Shop now</a></p>'
        f"<p style=\"color:#686868;font-size:12px\">You received this {kind_label.lower()} "
        "because you subscribed to our newsletter or created an account.</p>"
    )
    return subject.strip(), text, html


def notify_coupon_offer(coupon):
    """Email everyone when an active coupon/sale code is published."""
    if not coupon or not coupon.is_active:
        return {"sent": 0, "failed": 0, "total": 0}
    store = settings.STORE_NAME
    shop = _shop_link("/shop")
    value = coupon.value
    if coupon.discount_type == "percentage":
        deal = f"{value}% off"
    else:
        deal = f"₹{value} off"
    subject = f"{store}: {deal} with code {coupon.code}"
    detail = coupon.description.strip() or "Use this code at checkout while the offer lasts."
    text = (
        f"Hi from {store},\n\n"
        f"A new offer is live: {deal}.\n"
        f"Code: {coupon.code}\n"
        f"{detail}\n\n"
        f"Shop and apply the code at checkout:\n{shop}\n"
    )
    html = (
        f"<p>Hi from <strong>{store}</strong>,</p>"
        f"<p>A new offer is live: <strong>{deal}</strong>.</p>"
        f"<p>Code: <strong>{coupon.code}</strong><br>{detail}</p>"
        f'<p><a href="{shop}">Shop now</a></p>'
    )
    result = send_marketing_campaign(subject=subject, text_body=text, html_body=html)
    logger.info("Coupon offer campaign %s → %s", coupon.code, result)
    return result


def notify_new_arrival(product):
    """Email everyone when a new product is added."""
    if not product or not product.is_active:
        return {"sent": 0, "failed": 0, "total": 0}
    store = settings.STORE_NAME
    link = _shop_link(f"/products/{product.slug}")
    subject = f"{store}: New arrival — {product.name}"
    blurb = (product.short_description or "").strip() or "Just landed in the shop."
    text = (
        f"Hi from {store},\n\n"
        f"New arrival: {product.name}\n"
        f"{blurb}\n\n"
        f"See it here:\n{link}\n"
    )
    html = (
        f"<p>Hi from <strong>{store}</strong>,</p>"
        f"<p>New arrival: <strong>{product.name}</strong></p>"
        f"<p>{blurb}</p>"
        f'<p><a href="{link}">View product</a></p>'
    )
    result = send_marketing_campaign(subject=subject, text_body=text, html_body=html)
    logger.info("New arrival campaign %s → %s", product.slug, result)
    return result


def notify_product_sale(product, *, price, compare_at_price):
    """Email everyone when a product goes on sale (compare-at price set above price)."""
    if not product or not product.is_active or compare_at_price is None:
        return {"sent": 0, "failed": 0, "total": 0}
    if price is None or compare_at_price <= price:
        return {"sent": 0, "failed": 0, "total": 0}
    store = settings.STORE_NAME
    link = _shop_link(f"/products/{product.slug}")
    subject = f"{store}: Sale on {product.name}"
    text = (
        f"Hi from {store},\n\n"
        f"{product.name} is on sale — now ₹{price} (was ₹{compare_at_price}).\n\n"
        f"Shop the offer:\n{link}\n"
    )
    html = (
        f"<p>Hi from <strong>{store}</strong>,</p>"
        f"<p><strong>{product.name}</strong> is on sale — now <strong>₹{price}</strong> "
        f"(was ₹{compare_at_price}).</p>"
        f'<p><a href="{link}">Shop the offer</a></p>'
    )
    result = send_marketing_campaign(subject=subject, text_body=text, html_body=html)
    logger.info("Product sale campaign %s → %s", product.slug, result)
    return result


def safe_notify(fn, *args, **kwargs):
    """Run a notify helper without breaking the owner action if mail fails."""
    try:
        return fn(*args, **kwargs)
    except Exception:
        logger.exception("Marketing email failed for %s", getattr(fn, "__name__", fn))
        return {"sent": 0, "failed": 0, "total": 0}
