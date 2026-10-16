from django.contrib import admin, messages
from django.db import transaction
from django.utils.html import format_html

from .models import (
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
from .services import InsufficientStockError, change_stock


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ["name", "slug", "is_active", "sort_order"]
    list_editable = ["is_active", "sort_order"]
    prepopulated_fields = {"slug": ["name"]}
    search_fields = ["name"]


@admin.register(Brand)
class BrandAdmin(admin.ModelAdmin):
    list_display = ["name", "slug", "is_active"]
    list_editable = ["is_active"]
    prepopulated_fields = {"slug": ["name"]}
    search_fields = ["name"]


@admin.register(Concern)
class ConcernAdmin(admin.ModelAdmin):
    list_display = ["name", "slug", "is_active", "sort_order"]
    list_editable = ["is_active", "sort_order"]
    prepopulated_fields = {"slug": ["name"]}
    search_fields = ["name"]


@admin.register(SkinType)
class SkinTypeAdmin(admin.ModelAdmin):
    list_display = ["name", "slug", "sort_order"]
    list_editable = ["sort_order"]
    prepopulated_fields = {"slug": ["name"]}


class ProductImageInline(admin.TabularInline):
    model = ProductImage
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
    filter_horizontal = ["skin_types", "concerns"]
    list_select_related = ["brand", "category"]
    inlines = [ProductVariantInline, ProductImageInline]

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
    """Stock overview. Edit stock from the product page so changes are logged."""

    list_display = ["sku", "product", "name", "price", "stock_quantity", "is_active"]
    list_filter = ["is_active", "product__category", "product__brand"]
    search_fields = ["sku", "product__name", "name"]
    list_select_related = ["product"]
    ordering = ["stock_quantity"]
    readonly_fields = ["stock_quantity"]

    def has_add_permission(self, request):
        return False


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
    list_display = ["product", "user", "rating", "is_approved", "created_at"]
    list_filter = ["is_approved", "rating"]
    list_editable = ["is_approved"]
    search_fields = ["product__name", "user__email", "title"]
    list_select_related = ["product", "user"]
