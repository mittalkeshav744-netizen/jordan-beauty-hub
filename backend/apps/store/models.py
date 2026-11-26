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


def default_footer_shop_links():
    return [
        {"label": "All products", "to": "/shop"},
        {"label": "Bestsellers", "to": "/shop?featured=true"},
    ]


def default_footer_account_links():
    return [
        {"label": "Sign in", "to": "/login", "show": "guest"},
        {"label": "My account", "to": "/account", "show": "member"},
        {"label": "My orders", "to": "/account/orders"},
        {"label": "My courses", "to": "/account/courses", "show": "member"},
        {"label": "Wishlist", "to": "/account/wishlist"},
        {"label": "Addresses", "to": "/account"},
        {"label": "Bag", "to": "/cart"},
    ]


def default_footer_help_links():
    return [
        {"label": "Returns & replacements", "to": "/policies/returns"},
        {"label": "Shipping & delivery", "to": "/policies/shipping"},
        {"label": "Privacy policy", "to": "/policies/privacy"},
        {"label": "Terms & conditions", "to": "/policies/terms"},
    ]


def default_policies():
    """Editable legal pages — mirrors frontend/src/constants/policies.js defaults."""
    return {
        "returns": {
            "title": "Returns & replacements",
            "intro": (
                "For hygiene and safety reasons we do not accept returns of beauty and personal care products. "
                "If something arrives damaged or is not what you ordered, we will replace it."
            ),
            "sections": [
                {
                    "heading": "When we replace an item",
                    "paragraphs": [
                        "The product arrived damaged, leaking or broken.",
                        "You received a different product, shade or size from the one you ordered.",
                        "Part of your order is missing.",
                    ],
                },
                {
                    "heading": "How to ask for a replacement",
                    "paragraphs": [
                        "Contact us with your order number and clear photos of the product and packaging.",
                        "Please keep the item and its packaging until your request is resolved.",
                    ],
                },
            ],
        },
        "shipping": {
            "title": "Shipping & delivery",
            "intro": "We deliver across India. Tracking details appear on your order once the parcel ships.",
            "sections": [
                {
                    "heading": "Delivery charges",
                    "paragraphs": [
                        "Any delivery charge, and the order value above which delivery is free, is shown in your bag and at checkout.",
                    ],
                },
                {
                    "heading": "Paying for your order",
                    "paragraphs": [
                        "Cash on Delivery is always available. Online payment (Razorpay) appears at checkout when enabled.",
                    ],
                },
            ],
        },
        "privacy": {
            "title": "Privacy policy",
            "intro": "This page explains what information we collect when you use this website and how we use it.",
            "sections": [
                {
                    "heading": "Information we collect",
                    "paragraphs": [
                        "Account details, delivery addresses, orders, bag, wishlist and reviews.",
                        "Newsletter email if you subscribe.",
                    ],
                },
                {
                    "heading": "Payments",
                    "paragraphs": [
                        "COD orders do not collect card details. Razorpay payments are processed by Razorpay; we store payment references only.",
                    ],
                },
            ],
        },
        "terms": {
            "title": "Terms & conditions",
            "intro": "By using this website and placing an order you agree to these terms.",
            "sections": [
                {
                    "heading": "Products and prices",
                    "paragraphs": [
                        "Prices are in Indian Rupees (₹) and include taxes unless stated otherwise.",
                        "The price that applies is the one shown at checkout when you place the order.",
                    ],
                },
                {
                    "heading": "Orders",
                    "paragraphs": [
                        "You need an account to place an order. We may cancel an order if stock or delivery is unavailable.",
                    ],
                },
            ],
        },
    }


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
    footer_tagline = models.TextField(
        default=(
            "Makeup, skincare, haircare and body care — chosen with care "
            "and delivered across India."
        )
    )
    footer_shop_title = models.CharField(max_length=60, default="Shop")
    footer_account_title = models.CharField(max_length=60, default="My account")
    footer_help_title = models.CharField(max_length=60, default="Help")
    footer_shop_links = models.JSONField(default=default_footer_shop_links)
    footer_account_links = models.JSONField(default=default_footer_account_links)
    footer_help_links = models.JSONField(default=default_footer_help_links)
    footer_include_categories = models.BooleanField(
        default=True,
        help_text="Append live category links under the Shop column.",
    )
    policies = models.JSONField(default=default_policies)
    store_logo = models.ImageField(upload_to="storefront/brand/", blank=True, null=True)
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
    class LinkType(models.TextChoices):
        PATH = "path", "Category / shop path"
        PRODUCT = "product", "Specific product"

    title = models.CharField(max_length=150)
    video_file = models.FileField(upload_to="videos/reels/", blank=True, null=True)
    video_url = models.CharField(max_length=500, blank=True, default="")
    link_type = models.CharField(
        max_length=20,
        choices=LinkType.choices,
        default=LinkType.PATH,
    )
    link_url = models.CharField(max_length=255, default="/shop", blank=True)
    product = models.ForeignKey(
        "catalog.Product",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="storefront_reels",
    )
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

    def resolved_link_url(self):
        """Shop destination for the storefront Shop now button."""
        if self.link_type == self.LinkType.PRODUCT and self.product_id:
            product = self.product
            if product is not None and product.is_active and product.slug:
                return f"/products/{product.slug}"
        return (self.link_url or "").strip() or "/shop"
