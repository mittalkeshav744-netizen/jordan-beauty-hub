from django.contrib import admin

from .models import Payment


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ["order", "method", "status", "amount", "paid_at", "created_at"]
    list_filter = ["method", "status"]
    search_fields = ["order__number", "provider_reference"]
    list_select_related = ["order"]
    readonly_fields = ["order", "method", "amount", "currency", "created_at", "updated_at"]

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
