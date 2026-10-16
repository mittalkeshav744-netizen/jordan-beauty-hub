from django.core.exceptions import ValidationError
from django.core.validators import FileExtensionValidator
from django.db import models

from apps.catalog.models import Product, ProductVariant


class Look(models.Model):
    """A ready-made makeup look (Bridal, Office, Festive, ...) built from shop products."""

    title = models.CharField(max_length=120)
    slug = models.SlugField(max_length=140, unique=True)
    occasion = models.CharField(max_length=60, blank=True, help_text="Short tag, e.g. Bridal, Office or Festive.")
    description = models.TextField(blank=True)
    cover_image = models.ImageField(upload_to="looks/", blank=True)
    video = models.FileField(
        upload_to="looks/videos/",
        blank=True,
        validators=[FileExtensionValidator(["mp4", "webm"])],
        help_text="Optional short MP4 or WebM clip, ideally under 10 MB. Plays muted on the look page.",
    )
    is_active = models.BooleanField(default=True)
    sort_order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["sort_order", "-created_at"]

    def __str__(self):
        return self.title


class LookStep(models.Model):
    look = models.ForeignKey(Look, on_delete=models.CASCADE, related_name="steps")
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="look_steps")
    variant = models.ForeignKey(
        ProductVariant,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="look_steps",
        help_text="Optional: the exact shade or size used in this look.",
    )
    instruction = models.CharField(max_length=200, blank=True, help_text="e.g. 'Dab on the lips and blend.'")
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["sort_order", "id"]

    def __str__(self):
        return f"{self.look}: {self.product}"

    def clean(self):
        if self.variant_id and self.product_id and self.variant.product_id != self.product_id:
            raise ValidationError({"variant": "Choose a shade or size of the selected product."})
