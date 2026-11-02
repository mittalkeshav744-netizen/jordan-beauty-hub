from django.contrib import admin, messages
from django.core.exceptions import ValidationError
from django.core.files.uploadedfile import UploadedFile
from django.db import transaction
from django.forms import ModelForm
from django.utils.html import format_html

from .models import (
    HomepagePick,
    ProductFitSignal,
    Brand,
    Category,
    Concern,
    Product,
    ProductImage,
    ProductVariant,
    Review,
    SkinType,
    StockMovement,
)
from .services import InsufficientStockError, change_stock, normalize_product_image


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ["name", "slug", "is_active", "sort_order"]
    list_editable = ["is_active", "sort_order"]
    prepopulated_fields = {"slug": ["name"]}
    search_fields = ["name"]
    fields = ["name", "slug", "description", "image", "is_active", "sort_order"]


@admin.register(Brand)
class BrandAdmin(admin.ModelAdmin):
    list_display = ["name", "slug", "is_active"]
    list_editable = ["is_active"]
    prepopulated_fields = {"slug": ["name"]}
    search_fields = ["name"]
    fields = ["name", "slug", "logo", "is_active"]


@admin.register(Concern)
class ConcernAdmin(admin.ModelAdmin):
    list_display = ["name", "slug", "is_active", "sort_order"]
    list_editable = ["is_active", "sort_order"]
    prepopulated_fields = {"slug": ["name"]}
    search_fields = ["name"]
    fields = ["name", "slug", "description", "image", "is_active", "sort_order"]


@admin.register(SkinType)
class SkinTypeAdmin(admin.ModelAdmin):
    list_display = ["name", "slug", "sort_order"]
    list_editable = ["sort_order"]
    prepopulated_fields = {"slug": ["name"]}
    search_fields = ["name"]
    fields = ["name", "slug", "description", "sort_order"]


class ProductImageForm(ModelForm):
    def clean_image(self):
        image = self.cleaned_data.get("image")
        if not isinstance(image, UploadedFile):
            return image
        try:
            normalize_product_image(image)
        except (OSError, ValueError) as error:
            raise ValidationError("Upload a JPEG, PNG, or WebP photo.") from error
        return image


class ProductImageInline(admin.TabularInline):
    model = ProductImage
    form = ProductImageForm
    extra = 1
    fields = ["preview", "image", "alt_text", "sort_order"]
    readonly_fields = ["preview"]

    @admin.display(description="Preview")
    def preview(self, obj):
        if obj.pk and obj.image:
            return format_html('<img src="{}" style="height:60px;border-radius:4px">', obj.image.url)
        return "—"


class ProductVariantInline(admin.TabularInline):
    model = ProductVariant
    extra = 1
    fields = [
        "name",
        "sku",
        "price",
        "compare_at_price",
        "stock_quantity",
        "shade_hex",
        "is_active",
        "sort_order",
    ]


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ["name", "brand", "category", "is_active", "is_featured", "updated_at"]
    list_filter = ["is_active", "is_featured", "category", "brand", "routine_step", "concerns"]
    list_editable = ["is_active", "is_featured"]
    search_fields = ["name", "variants__sku", "brand__name"]
    prepopulated_fields = {"slug": ["name"]}
    autocomplete_fields = ["brand", "category"]
    filter_horizontal = ["skin_types", "concerns"]
    list_select_related = ["brand", "category"]
    inlines = [ProductVariantInline, ProductImageInline]
    fieldsets = (
        (None, {"fields": ("name", "slug", "brand", "category", "net_quantity")}),
        (
            "Page copy",
            {"fields": ("short_description", "description", "ingredients", "how_to_use")},
        ),
        (
            "Shop placement",
            {"fields": ("routine_step", "skin_types", "concerns", "is_active", "is_featured")},
        ),
    )

    def save_formset(self, request, form, formset, change):
        if formset.model is not ProductVariant:
            return super().save_formset(request, form, formset, change)
        with transaction.atomic():
            self._save_variant_formset(request, formset)

    def _save_variant_formset(self, request, formset):
        """
        Stock edits are applied as a delta through change_stock(), so every
        change is logged and a concurrent customer order is never overwritten.
        """
        formset.save(commit=False)
        for variant in formset.deleted_objects:
            variant.delete()

        for variant_form in formset.forms:
            if not variant_form.has_changed() or variant_form in formset.deleted_forms:
                continue
            variant = variant_form.instance
            requested_stock = variant.stock_quantity

            if variant.pk is None:
                variant.stock_quantity = 0
                variant.save()
                if requested_stock:
                    change_stock(
                        variant.pk,
                        requested_stock,
                        StockMovement.Reason.RESTOCK,
                        "Initial stock",
                        request.user,
                    )
                continue

            previous_stock = variant_form.initial.get("stock_quantity", 0)
            other_fields = [name for name in variant_form.changed_data if name != "stock_quantity"]
            if other_fields:
                variant.save(update_fields=[*other_fields, "updated_at"])
            delta = requested_stock - previous_stock
            if delta:
                try:
                    change_stock(
                        variant.pk,
                        delta,
                        StockMovement.Reason.ADJUSTMENT,
                        "Admin edit",
                        request.user,
                    )
                except InsufficientStockError as error:
                    self.message_user(request, str(error), messages.ERROR)
        formset.save_m2m()


@admin.register(ProductVariant)
class ProductVariantAdmin(admin.ModelAdmin):
    """Shade, size, price and stock. Stock changes are written to the stock log."""

    list_display = ["sku", "product", "name", "price", "compare_at_price", "stock_quantity", "is_active"]
    list_filter = ["is_active", "product__category", "product__brand"]
    search_fields = ["sku", "product__name", "name"]
    list_select_related = ["product"]
    autocomplete_fields = ["product"]
    ordering = ["stock_quantity"]
    fields = [
        "product",
        "name",
        "sku",
        "price",
        "compare_at_price",
        "stock_quantity",
        "shade_hex",
        "is_active",
        "sort_order",
    ]

    def save_model(self, request, obj, form, change):
        requested_stock = obj.stock_quantity or 0
        if obj.pk is None:
            obj.stock_quantity = 0
            super().save_model(request, obj, form, change)
            if requested_stock:
                change_stock(
                    obj.pk,
                    requested_stock,
                    StockMovement.Reason.RESTOCK,
                    "Initial stock",
                    request.user,
                )
            return

        previous_stock = form.initial.get("stock_quantity", 0)
        obj.stock_quantity = previous_stock
        super().save_model(request, obj, form, change)
        delta = requested_stock - previous_stock
        if not delta:
            return
        try:
            change_stock(
                obj.pk,
                delta,
                StockMovement.Reason.ADJUSTMENT,
                "Admin edit",
                request.user,
            )
        except InsufficientStockError as error:
            self.message_user(request, str(error), messages.ERROR)


@admin.register(StockMovement)
class StockMovementAdmin(admin.ModelAdmin):
    list_display = ["created_at", "variant", "quantity_change", "reason", "reference", "created_by"]
    list_filter = ["reason"]
    search_fields = ["variant__sku", "reference"]
    list_select_related = ["variant__product", "created_by"]

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = ["product", "user", "rating", "title", "is_approved", "created_at"]
    list_filter = ["is_approved", "rating"]
    list_editable = ["is_approved"]
    search_fields = ["product__name", "user__email", "title", "body"]
    list_select_related = ["product", "user"]
    autocomplete_fields = ["product", "user"]
    fields = ["product", "user", "rating", "title", "body", "is_approved"]


@admin.register(HomepagePick)
class HomepagePickAdmin(admin.ModelAdmin):
    list_display = ["product", "sort_order", "created_at"]
    list_editable = ["sort_order"]
    ordering = ["sort_order", "id"]
    autocomplete_fields = ["product"]


@admin.register(ProductFitSignal)
class ProductFitSignalAdmin(admin.ModelAdmin):
    list_display = ["product", "positive_count", "negative_count", "updated_at"]
    search_fields = ["product__name"]
    readonly_fields = ["product", "positive_count", "negative_count", "updated_at"]

    def has_add_permission(self, request):
        return False
