"""Order notification emails."""

from django.conf import settings

from apps.accounts.mail import send_store_email


def send_order_confirmation_email(order):
    """Email the shopper a short confirmation after checkout."""
    user = order.user
    if not user or not user.email:
        return False
    store = settings.STORE_NAME
    link = f"{settings.FRONTEND_URL}/account/orders/{order.number}"
    total = f"{order.currency} {order.grand_total}"
    text = (
        f"Hi {order.shipping_full_name or user.first_name or 'there'},\n\n"
        f"Thank you for shopping at {store}.\n\n"
        f"Order number: {order.number}\n"
        f"Total: {total} (Cash on delivery)\n\n"
        f"Track your order:\n{link}\n\n"
        "We will update you when it ships.\n"
    )
    html = (
        f"<p>Hi {order.shipping_full_name or user.first_name or 'there'},</p>"
        f"<p>Thank you for shopping at <strong>{store}</strong>.</p>"
        f"<p>Order number: <strong>{order.number}</strong><br>"
        f"Total: <strong>{total}</strong> (Cash on delivery)</p>"
        f"<p><a href=\"{link}\">View your order</a></p>"
        "<p>We will update you when it ships.</p>"
    )
    return send_store_email(
        subject=f"{store} order {order.number} confirmed",
        to=[user.email],
        text_body=text,
        html_body=html,
    )
