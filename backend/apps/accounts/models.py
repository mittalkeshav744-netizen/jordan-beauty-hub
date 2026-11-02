from django.conf import settings
from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models


class UserManager(BaseUserManager):
    use_in_migrations = True

    def _create_user(self, email, password, **extra_fields):
        if not email:
            raise ValueError("An email address is required.")
        email = self.normalize_email(email).lower()
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_user(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", False)
        extra_fields.setdefault("is_superuser", False)
        return self._create_user(email, password, **extra_fields)

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("email_verified", True)
        if not extra_fields["is_staff"] or not extra_fields["is_superuser"]:
            raise ValueError("A superuser must have is_staff=True and is_superuser=True.")
        return self._create_user(email, password, **extra_fields)


class User(AbstractUser):
    """Customer and staff account. Customers sign in with their email address."""

    username = None
    email = models.EmailField("email address", unique=True)
    phone = models.CharField(max_length=20, blank=True)
    email_verified = models.BooleanField(
        default=False,
        help_text="True after the shopper confirms the OTP sent to this email.",
    )

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["first_name"]

    objects = UserManager()

    def __str__(self):
        return self.email


class EmailOTP(models.Model):
    """Short-lived one-time codes emailed for password reset and signup verification."""

    class Purpose(models.TextChoices):
        PASSWORD_RESET = "password_reset", "Password reset"
        EMAIL_VERIFY = "email_verify", "Email verification"

    email = models.EmailField(db_index=True)
    purpose = models.CharField(max_length=32, choices=Purpose.choices)
    code_hash = models.CharField(max_length=128)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    attempt_count = models.PositiveSmallIntegerField(default=0)
    consumed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["email", "purpose", "-created_at"]),
        ]

    def __str__(self):
        return f"{self.purpose} OTP for {self.email}"


class Address(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="addresses"
    )
    full_name = models.CharField(max_length=150)
    phone = models.CharField(max_length=20)
    line1 = models.CharField("address line 1", max_length=255)
    line2 = models.CharField("address line 2", max_length=255, blank=True)
    city = models.CharField(max_length=100)
    state = models.CharField(max_length=100)
    postal_code = models.CharField(max_length=10)
    country = models.CharField(max_length=100, default="India")
    is_default = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = "addresses"
        ordering = ["-is_default", "-updated_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["user"],
                condition=models.Q(is_default=True),
                name="unique_default_address_per_user",
            )
        ]

    def __str__(self):
        return f"{self.full_name}, {self.city}"


class UserBeautyProfile(models.Model):
    """Skin quiz answers used for home-page recommendations."""

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="beauty_profile"
    )
    skin_type = models.ForeignKey(
        "catalog.SkinType",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="+",
    )
    primary_concern = models.ForeignKey(
        "catalog.Concern",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="+",
    )
    budget_preference = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    raw_quiz_answers = models.JSONField(blank=True, default=dict)
    quiz_completed_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Beauty profile for {self.user.email}"
