"""Generate, email, and verify one-time passcodes."""

from __future__ import annotations

import hashlib
import secrets
from datetime import timedelta

from django.conf import settings
from django.contrib.auth import get_user_model
from django.utils import timezone

from .mail import send_store_email
from .models import EmailOTP

User = get_user_model()

OTP_LENGTH = 6
OTP_TTL_MINUTES = 10
OTP_MAX_ATTEMPTS = 5
OTP_RESEND_COOLDOWN_SECONDS = 45


class OTPError(Exception):
    pass


def _hash_code(email, purpose, code):
    material = f"{settings.SECRET_KEY}:{purpose}:{email.lower()}:{code}"
    return hashlib.sha256(material.encode("utf-8")).hexdigest()


def _generate_code():
    # 6-digit numeric code, never starts with assumptions — full 000000–999999 space.
    return f"{secrets.randbelow(10**OTP_LENGTH):0{OTP_LENGTH}d}"


def latest_active_otp(email, purpose):
    return (
        EmailOTP.objects.filter(
            email__iexact=email.strip().lower(),
            purpose=purpose,
            consumed_at__isnull=True,
            expires_at__gt=timezone.now(),
        )
        .order_by("-created_at")
        .first()
    )


def create_and_send_otp(email, purpose, *, subject, text_body_factory, html_body_factory=None):
    """
    Invalidate older codes for this email+purpose, create a fresh OTP, and email it.

    text_body_factory(code) → plain text body.
    """
    email = email.strip().lower()
    recent = (
        EmailOTP.objects.filter(email__iexact=email, purpose=purpose)
        .order_by("-created_at")
        .first()
    )
    if recent and (timezone.now() - recent.created_at).total_seconds() < OTP_RESEND_COOLDOWN_SECONDS:
        raise OTPError("Please wait a moment before requesting another code.")

    EmailOTP.objects.filter(
        email__iexact=email, purpose=purpose, consumed_at__isnull=True
    ).update(consumed_at=timezone.now())

    code = _generate_code()
    otp = EmailOTP.objects.create(
        email=email,
        purpose=purpose,
        code_hash=_hash_code(email, purpose, code),
        expires_at=timezone.now() + timedelta(minutes=OTP_TTL_MINUTES),
    )
    text_body = text_body_factory(code)
    html_body = html_body_factory(code) if html_body_factory else None
    sent = send_store_email(
        subject=subject,
        to=[email],
        text_body=text_body,
        html_body=html_body,
    )
    if not sent:
        otp.consumed_at = timezone.now()
        otp.save(update_fields=["consumed_at"])
        raise OTPError("We could not send the email just now. Please try again in a minute.")
    return otp


def verify_otp(email, purpose, code):
    """
    Check a submitted code. Consumes it on success.
    Raises OTPError with a shopper-safe message on failure.
    """
    email = email.strip().lower()
    code = (code or "").strip()
    if not code.isdigit() or len(code) != OTP_LENGTH:
        raise OTPError("Enter the 6-digit code from your email.")

    otp = latest_active_otp(email, purpose)
    if otp is None:
        raise OTPError("That code has expired. Request a new one.")

    if otp.attempt_count >= OTP_MAX_ATTEMPTS:
        otp.consumed_at = timezone.now()
        otp.save(update_fields=["consumed_at"])
        raise OTPError("Too many incorrect attempts. Request a new code.")

    expected = _hash_code(email, purpose, code)
    if not secrets.compare_digest(otp.code_hash, expected):
        EmailOTP.objects.filter(pk=otp.pk).update(attempt_count=otp.attempt_count + 1)
        remaining = OTP_MAX_ATTEMPTS - (otp.attempt_count + 1)
        if remaining <= 0:
            raise OTPError("Too many incorrect attempts. Request a new code.")
        raise OTPError("That code is incorrect. Please try again.")

    otp.consumed_at = timezone.now()
    otp.save(update_fields=["consumed_at"])
    return True
