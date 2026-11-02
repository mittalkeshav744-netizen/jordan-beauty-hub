"""Outgoing shop emails. Uses Django's EMAIL_* settings (console in dev, SMTP in production)."""

from __future__ import annotations

import logging
import smtplib
import time

from django.conf import settings
from django.core.mail import EmailMultiAlternatives, get_connection

logger = logging.getLogger(__name__)

# GoDaddy (and similar hosts) sometimes drop AUTH mid-handshake; a short retry usually works.
_SMTP_ATTEMPTS = 3
_SMTP_RETRY_DELAY_SECONDS = 1.5


def send_store_email(*, subject, to, text_body, html_body=None):
    """
    Send one transactional email. Returns True when Django accepts it.

    Failures are logged and return False so checkout / auth can continue;
    the console backend always succeeds in development.
    """
    recipients = [address for address in to if address]
    if not recipients:
        return False

    last_error = None
    for attempt in range(1, _SMTP_ATTEMPTS + 1):
        connection = get_connection(fail_silently=False)
        message = EmailMultiAlternatives(
            subject=subject,
            body=text_body,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=recipients,
            connection=connection,
        )
        if html_body:
            message.attach_alternative(html_body, "text/html")
        try:
            sent = message.send(fail_silently=False)
            return bool(sent)
        except (smtplib.SMTPServerDisconnected, smtplib.SMTPConnectError, TimeoutError, OSError) as error:
            last_error = error
            logger.warning(
                "Email attempt %s/%s failed for %r to %s: %s",
                attempt,
                _SMTP_ATTEMPTS,
                subject,
                recipients,
                error,
            )
            if attempt < _SMTP_ATTEMPTS:
                time.sleep(_SMTP_RETRY_DELAY_SECONDS)
        except Exception:
            logger.exception("Failed to send email %r to %s", subject, recipients)
            return False

    logger.error(
        "Failed to send email %r to %s after %s attempts: %s",
        subject,
        recipients,
        _SMTP_ATTEMPTS,
        last_error,
    )
    return False
