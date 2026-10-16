from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import send_mail
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode

User = get_user_model()


class PasswordResetError(Exception):
    pass


def send_password_reset_email(email):
    """
    Email a one-time reset link if an active account uses this address.
    Does nothing otherwise, so the response never reveals who has an account.
    """
    user = User.objects.filter(email__iexact=email.strip(), is_active=True).first()
    if user is None or not user.has_usable_password():
        return

    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = default_token_generator.make_token(user)
    link = f"{settings.FRONTEND_URL}/reset-password/{uid}/{token}"
    send_mail(
        subject=f"Reset your {settings.STORE_NAME} password",
        message=(
            f"Hi {user.first_name or 'there'},\n\n"
            f"Use this link to choose a new password:\n{link}\n\n"
            "The link works once and expires in a few days. If you did not ask for it, "
            "you can ignore this email; your password stays the same.\n"
        ),
        from_email=None,
        recipient_list=[user.email],
    )


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
