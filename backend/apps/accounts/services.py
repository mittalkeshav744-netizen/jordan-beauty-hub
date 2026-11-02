from decimal import Decimal, InvalidOperation

from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.tokens import default_token_generator
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode

from apps.catalog.models import Concern, SkinType

from .mail import send_store_email
from .models import EmailOTP, UserBeautyProfile
from .otp import OTPError, create_and_send_otp, verify_otp

User = get_user_model()

NO_CONCERN_SLUG = "none"
ANY_BUDGET_VALUE = "any"


class PasswordResetError(Exception):
    pass


class BeautyProfileError(Exception):
    pass


class EmailVerifyError(Exception):
    pass


def save_beauty_profile(
    user,
    *,
    skin_type_slug=None,
    concern_slug=None,
    budget_preference=None,
    raw_quiz_answers=None,
):
    """
    Create or update the shopper's skin-quiz answers.

    concern_slug "none" and budget "any" clear those fields.
    """
    skin_type = None
    if skin_type_slug:
        skin_type = SkinType.objects.filter(slug=skin_type_slug).first()
        if skin_type is None:
            raise BeautyProfileError("Choose a valid skin type.")

    primary_concern = None
    if concern_slug and concern_slug != NO_CONCERN_SLUG:
        primary_concern = Concern.objects.filter(slug=concern_slug, is_active=True).first()
        if primary_concern is None:
            raise BeautyProfileError("Choose a valid skin concern.")

    budget = None
    if budget_preference not in (None, "", ANY_BUDGET_VALUE):
        try:
            budget = Decimal(str(budget_preference))
        except (InvalidOperation, TypeError) as error:
            raise BeautyProfileError("Enter a valid budget.") from error
        if budget < 0:
            raise BeautyProfileError("Enter a valid budget.")

    raw = raw_quiz_answers if isinstance(raw_quiz_answers, dict) else {
        "skin": skin_type_slug or "",
        "concern": concern_slug or NO_CONCERN_SLUG,
        "budget": str(budget_preference) if budget_preference not in (None, "") else ANY_BUDGET_VALUE,
    }

    profile, _ = UserBeautyProfile.objects.update_or_create(
        user=user,
        defaults={
            "skin_type": skin_type,
            "primary_concern": primary_concern,
            "budget_preference": budget,
            "raw_quiz_answers": raw,
        },
    )
    return profile


def send_password_reset_email(email):
    """
    Email a 6-digit OTP (and a backup link) if an active account uses this address.
    Does nothing otherwise, so the response never reveals who has an account.
    """
    user = User.objects.filter(email__iexact=email.strip(), is_active=True).first()
    if user is None or not user.has_usable_password():
        return

    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = default_token_generator.make_token(user)
    link = f"{settings.FRONTEND_URL}/reset-password/{uid}/{token}"
    store = settings.STORE_NAME

    def text_body(code):
        return (
            f"Hi {user.first_name or 'there'},\n\n"
            f"Your {store} password reset code is: {code}\n\n"
            f"It expires in 10 minutes. Or open this link instead:\n{link}\n\n"
            "If you did not ask for a reset, you can ignore this email.\n"
        )

    def html_body(code):
        return (
            f"<p>Hi {user.first_name or 'there'},</p>"
            f"<p>Your <strong>{store}</strong> password reset code is:</p>"
            f"<p style='font-size:28px;letter-spacing:6px;font-weight:700'>{code}</p>"
            f"<p>It expires in 10 minutes.</p>"
            f"<p>Or <a href=\"{link}\">choose a new password with this link</a>.</p>"
            "<p>If you did not ask for a reset, ignore this email.</p>"
        )

    try:
        create_and_send_otp(
            user.email,
            EmailOTP.Purpose.PASSWORD_RESET,
            subject=f"Your {store} password reset code",
            text_body_factory=text_body,
            html_body_factory=html_body,
        )
    except OTPError:
        # Still send the link-only fallback so a cooldown cannot lock someone out forever.
        send_store_email(
            subject=f"Reset your {store} password",
            to=[user.email],
            text_body=(
                f"Hi {user.first_name or 'there'},\n\n"
                f"Use this link to choose a new password:\n{link}\n\n"
                "If you did not ask for it, ignore this email.\n"
            ),
        )


def reset_password_with_otp(email, code, new_password):
    """Verify the emailed OTP and set a new password."""
    email = email.strip().lower()
    user = User.objects.filter(email__iexact=email, is_active=True).first()
    if user is None or not user.has_usable_password():
        raise PasswordResetError("That code is incorrect or has expired.")
    try:
        verify_otp(email, EmailOTP.Purpose.PASSWORD_RESET, code)
    except OTPError as error:
        raise PasswordResetError(str(error)) from error
    validate_password(new_password, user=user)
    user.set_password(new_password)
    user.save(update_fields=["password"])
    return user


def reset_password(uid, token, new_password):
    """Set a new password from a reset link. Raises PasswordResetError or a password ValidationError."""
    try:
        user = User.objects.get(pk=force_str(urlsafe_base64_decode(uid)), is_active=True)
    except (TypeError, ValueError, OverflowError, User.DoesNotExist):
        user = None
    if user is None or not default_token_generator.check_token(user, token):
        raise PasswordResetError("This reset link is invalid or has expired. Please request a new one.")

    validate_password(new_password, user=user)
    user.set_password(new_password)
    user.save(update_fields=["password"])
    return user


def send_email_verification_otp(user):
    """Email a signup verification code to the user."""
    store = settings.STORE_NAME

    def text_body(code):
        return (
            f"Hi {user.first_name or 'there'},\n\n"
            f"Welcome to {store}. Your email verification code is: {code}\n\n"
            "It expires in 10 minutes.\n"
        )

    def html_body(code):
        return (
            f"<p>Hi {user.first_name or 'there'},</p>"
            f"<p>Welcome to <strong>{store}</strong>. Your verification code is:</p>"
            f"<p style='font-size:28px;letter-spacing:6px;font-weight:700'>{code}</p>"
            "<p>It expires in 10 minutes.</p>"
        )

    create_and_send_otp(
        user.email,
        EmailOTP.Purpose.EMAIL_VERIFY,
        subject=f"Verify your {store} email",
        text_body_factory=text_body,
        html_body_factory=html_body,
    )


def verify_user_email(email, code):
    email = email.strip().lower()
    user = User.objects.filter(email__iexact=email, is_active=True).first()
    if user is None:
        raise EmailVerifyError("That code is incorrect or has expired.")
    if user.email_verified:
        return user
    try:
        verify_otp(email, EmailOTP.Purpose.EMAIL_VERIFY, code)
    except OTPError as error:
        raise EmailVerifyError(str(error)) from error
    user.email_verified = True
    user.save(update_fields=["email_verified"])
    return user
