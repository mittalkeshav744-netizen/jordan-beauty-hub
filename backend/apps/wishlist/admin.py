from django.contrib import admin

from .models import WishlistItem


@admin.register(WishlistItem)
class WishlistItemAdmin(admin.ModelAdmin):
    list_display = ["product", "user", "added_at"]
    search_fields = ["user__email", "product__name"]
    raw_id_fields = ["user", "product"]
    date_hierarchy = "added_at"
