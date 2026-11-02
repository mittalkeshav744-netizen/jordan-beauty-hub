from django.db import models


def default_rotating_lines():
    return ["Zero compromise.", "Made for Indian skin.", "Glow all day."]


def default_marquee_items():
    return [
        "Cash on delivery across India",
        "Made for Indian skin tones",
        "Genuine products",
        "Take the free skin quiz",
        "Shop complete looks",
    ]


def default_benefits():
    return [
        {"title": "Cash on delivery", "text": "Pay when your order arrives."},
        {"title": "Genuine products", "text": "Sourced directly — never grey-market."},
        {"title": "Easy cancellations", "text": "Cancel any order before it ships."},
    ]


def default_budget_tiles():
    """Homepage “Shop by budget” tiles — owner-editable via storefront settings."""
    return [
        {"label": "Under", "amount": "₹299", "to": "/shop?max_price=299"},
        {"label": "Under", "amount": "₹499", "to": "/shop?max_price=499"},
        {"label": "Under", "amount": "₹999", "to": "/shop?max_price=999"},
        {"label": "Premium", "amount": "₹1000+", "to": "/shop?min_price=1000"},
    ]


def default_sections_order():
    return [
        {"id": "categories", "name": "Shop by category", "enabled": True},
        {"id": "quiz", "name": "Skin quiz", "enabled": True},
        {"id": "recommendations", "name": "Formulated For You (Personalized)", "enabled": True},
        {"id": "bestsellers", "name": "Bestsellers", "enabled": True},
        {"id": "reels", "name": "Watch & shop", "enabled": True},
        {"id": "concerns", "name": "Shop by concern", "enabled": True},
        {"id": "looks", "name": "Get the look", "enabled": True},
        {"id": "budget", "name": "Shop by budget", "enabled": True},
        {"id": "new_arrivals", "name": "New arrivals", "enabled": True},
        {"id": "benefits", "name": "Trust badges", "enabled": True},
    ]


class NewsletterSubscriber(models.Model):
    email = models.EmailField(unique=True)
    subscribed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-subscribed_at"]

    def __str__(self):
        return self.email


class StorefrontConfig(models.Model):
    """Singleton-style home page copy and layout the owner can edit."""

    class HeroMediaType(models.TextChoices):
        VIDEO = "video", "Banner Video"
        COLLAGE = "collage", "Floating Products Collage"

    announcement_text = models.CharField(
        max_length=255, default="Cash on delivery available across India"
    )
    announcement_link = models.CharField(max_length=255, blank=True, default="")
    announcement_enabled = models.BooleanField(default=True)
    hero_tag = models.CharField(max_length=100, default="New season edit")
    hero_title = models.CharField(max_length=150, default="Bold colour.")
    hero_rotating_lines = models.JSONField(default=default_rotating_lines)
    hero_media_type = models.CharField(
        max_length=20, choices=HeroMediaType.choices, default=HeroMediaType.VIDEO
    )
    hero_video_file = models.FileField(upload_to="videos/hero/", blank=True, null=True)
    hero_video_url = models.CharField(max_length=500, blank=True, default="/videos/brand-intro.mp4")
    hero_video_loop_end = models.FloatField(default=7.0)
    hero_primary_cta_text = models.CharField(max_length=60, default="Shop the drop")
    hero_primary_cta_link = models.CharField(max_length=255, default="/shop")
    hero_secondary_cta_text = models.CharField(max_length=60, default="Build your routine")
    hero_secondary_cta_link = models.CharField(max_length=255, default="/skin-quiz")
    marquee_items = models.JSONField(default=default_marquee_items)
    quiz_badge = models.CharField(max_length=100, default="2-minute routine builder")
    quiz_title = models.CharField(max_length=200, default="Find the right routine for your skin")
    quiz_subtitle = models.TextField(
        default="Tell us your skin type and concerns. We will build a routine that actually works."
    )
    quiz_button_text = models.CharField(max_length=60, default="Take the skin quiz")
    quiz_link = models.CharField(max_length=255, default="/skin-quiz")
    quiz_enabled = models.BooleanField(default=True)
    benefits = models.JSONField(default=default_benefits)
    budget_tiles = models.JSONField(default=default_budget_tiles)
    sections_order = models.JSONField(default=default_sections_order)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return "Storefront settings"

    @classmethod
    def load(cls):
        config, _ = cls.objects.get_or_create(pk=1)
        return config

    def save(self, *args, **kwargs):
        self.pk = 1
        super().save(*args, **kwargs)


class StorefrontReel(models.Model):
    title = models.CharField(max_length=150)
    video_file = models.FileField(upload_to="videos/reels/", blank=True, null=True)
    video_url = models.CharField(max_length=500, blank=True, default="")
    link_url = models.CharField(max_length=255, default="/shop")
    start_seconds = models.FloatField(default=0.0)
    loop_end_seconds = models.FloatField(default=7.0)
    sort_order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["sort_order", "id"]

    def __str__(self):
        return self.title
