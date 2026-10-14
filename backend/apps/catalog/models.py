from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator, RegexValidator
from django.db import models


class TimeStampedModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class Category(TimeStampedModel):
    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(max_length=120, unique=True)
    description = models.TextField(blank=True)
    image = models.ImageField(upload_to="categories/", blank=True)
    is_active = models.BooleanField(default=True)
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        verbose_name_plural = "categories"
        ordering = ["sort_order", "name"]

    def __str__(self):
        return self.name


class Brand(TimeStampedModel):
    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(max_length=120, unique=True)
    logo = models.ImageField(upload_to="brands/", blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class Product(TimeStampedModel):
    name = models.CharField(max_length=200)
    slug = models.SlugField(max_length=220, unique=True)
    brand = models.ForeignKey(Brand, on_delete=models.PROTECT, related_name="products")
    category = models.ForeignKey(Category, on_delete=models.PROTECT, related_name="products")
    short_description = models.CharField(max_length=300, blank=True)
    description = models.TextField(blank=True)
    ingredients = models.TextField(blank=True)
    how_to_use = models.TextField(blank=True)
    is_active = models.BooleanField(default=True, db_index=True)
    is_featured = models.BooleanField(default=False, db_index=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["category", "is_active"])]

    def __str__(self):
        return self.name


class ProductImage(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="images")
    image = models.ImageField(upload_to="products/")
    alt_text = models.CharField(max_length=200, blank=True)
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["sort_order", "id"]

    def __str__(self):
        return f"Image for {self.product}"


hex_color_validator = RegexValidator(r"^#[0-9A-Fa-f]{6}$", "Enter a colour like #C46A6A.")


class ProductVariant(TimeStampedModel):
    """A sellable item: a specific shade or size of a product, with its own SKU."""

    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="variants")
    name = models.CharField(max_length=100, help_text="e.g. '04 Rose Nude' or '50 ml'")
    sku = models.CharField("SKU", max_length=64, unique=True)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    compare_at_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Original price shown struck through when the item is on sale.",
    )
    stock_quantity = models.PositiveIntegerField(default=0)
    shade_hex = models.CharField(
        max_length=7, blank=True, validators=[hex_color_validator], help_text="Swatch colour"
    )
    is_active = models.BooleanField(default=True)
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["sort_order", "id"]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(price__gte=0), name="variant_price_non_negative"
            ),
            models.CheckConstraint(
                condition=models.Q(compare_at_price__isnull=True)
                | models.Q(compare_at_price__gt=models.F("price")),
                name="variant_compare_price_above_price",
            ),
        ]

    def __str__(self):
        return f"{self.product.name} — {self.name}"

    @property
    def is_in_stock(self):
        return self.stock_quantity > 0


class StockMovement(models.Model):
    """Audit log of every change to a variant's stock quantity."""

    class Reason(models.TextChoices):
        RESTOCK = "restock", "Restock"
        ORDER = "order", "Order placed"
        CANCELLATION = "cancellation", "Order cancelled"
        ADJUSTMENT = "adjustment", "Manual adjustment"

    variant = models.ForeignKey(
        ProductVariant, on_delete=models.CASCADE, related_name="stock_movements"
    )
    quantity_change = models.IntegerField()
    reason = models.CharField(max_length=20, choices=Reason.choices)
    reference = models.CharField(max_length=100, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.variant.sku}: {self.quantity_change:+d} ({self.get_reason_display()})"


class Review(TimeStampedModel):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="reviews")
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="reviews"
    )
    rating = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)]
    )
    title = models.CharField(max_length=120, blank=True)
    body = models.TextField(blank=True)
    is_approved = models.BooleanField(default=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(fields=["product", "user"], name="one_review_per_user"),
            models.CheckConstraint(
                condition=models.Q(rating__gte=1, rating__lte=5), name="review_rating_1_to_5"
            ),
        ]

    def __str__(self):
        return f"{self.rating}★ {self.product} by {self.user}"
