from django.contrib import admin, messages

from apps.payments.models import Payment

from .models import Coupon, CouponRedemption, Order, OrderItem, OrderStatusHistory
from .services import InvalidStatusTransition, change_order_status


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    can_delete = False
    fields = ["product_name", "variant_name", "sku", "unit_price", "quantity", "line_total"]
    readonly_fields = fields

    def has_add_permission(self, request, obj=None):
        return False


class OrderStatusHistoryInline(admin.TabularInline):
    model = OrderStatusHistory
    extra = 0
    can_delete = False
    fields = ["created_at", "from_status", "to_status", "note", "changed_by"]
    readonly_fields = fields

    def has_add_permission(self, request, obj=None):
        return False


class PaymentInline(admin.StackedInline):
    model = Payment
    extra = 0
    can_delete = False
    readonly_fields = ["method", "status", "amount", "currency", "provider_reference", "paid_at"]

    def has_add_permission(self, request, obj=None):
        return False


def make_status_action(target_status):
    def action(modeladmin, request, queryset):
        updated = 0
        for order in queryset:
            try:
                change_order_status(order, target_status, request.user, "Updated from admin")
                updated += 1
            except InvalidStatusTransition as error:
                modeladmin.message_user(request, f"{order.number}: {error}", messages.WARNING)
        if updated:
            modeladmin.message_user(request, f"{updated} order(s) updated.", messages.SUCCESS)

    action.__name__ = f"mark_{target_status}"
    action.short_description = f"Mark selected orders as {Order.Status(target_status).label}"
    return action


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ["number", "user", "status", "grand_total", "created_at"]
    list_filter = ["status", "created_at"]
    search_fields = ["number", "user__email", "shipping_full_name", "shipping_phone"]
    date_hierarchy = "created_at"
    list_select_related = ["user"]
    inlines = [OrderItemInline, PaymentInline, OrderStatusHistoryInline]
    actions = [make_status_action(status) for status in Order.Status.values]
    readonly_fields = [
        field.name
        for field in Order._meta.fields
        if field.name not in {"id", "status"}
    ]

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False

    def save_model(self, request, obj, form, change):
        """Route status edits through the service so stock and history stay correct."""
        if change and "status" in form.changed_data:
            new_status = obj.status
            try:
                change_order_status(obj, new_status, request.user, "Updated from admin")
            except InvalidStatusTransition as error:
                self.message_user(request, str(error), messages.ERROR)
            obj.refresh_from_db()
            return
        super().save_model(request, obj, form, change)


class CouponRedemptionInline(admin.TabularInline):
    model = CouponRedemption
    extra = 0
    can_delete = False
    readonly_fields = ["user", "order", "discount_amount", "created_at"]

    def has_add_permission(self, request, obj=None):
        return False


@admin.register(Coupon)
class CouponAdmin(admin.ModelAdmin):
    list_display = [
        "code",
        "discount_type",
        "value",
        "min_order_amount",
        "times_used",
        "usage_limit",
        "valid_until",
        "is_active",
    ]
    list_filter = ["is_active", "discount_type"]
    search_fields = ["code", "description"]
    readonly_fields = ["times_used"]
    inlines = [CouponRedemptionInline]
