from django.contrib import admin

from .models import Look, LookStep


class LookStepInline(admin.TabularInline):
    model = LookStep
    extra = 1
    fields = ["sort_order", "product", "variant", "instruction"]
    autocomplete_fields = ["product"]


@admin.register(Look)
class LookAdmin(admin.ModelAdmin):
    list_display = ["title", "occasion", "is_active", "sort_order", "updated_at"]
    list_editable = ["is_active", "sort_order"]
    list_filter = ["is_active", "occasion"]
    search_fields = ["title", "occasion"]
    prepopulated_fields = {"slug": ["title"]}
    inlines = [LookStepInline]
