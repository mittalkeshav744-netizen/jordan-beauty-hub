from django.contrib import admin

from .models import NewsletterSubscriber, StorefrontConfig, StorefrontReel


@admin.register(NewsletterSubscriber)
class NewsletterSubscriberAdmin(admin.ModelAdmin):
    list_display = ["email", "subscribed_at"]
    search_fields = ["email"]
    readonly_fields = ["subscribed_at"]


@admin.register(StorefrontConfig)
class StorefrontConfigAdmin(admin.ModelAdmin):
    fieldsets = (
        ("Announcement", {"fields": ("announcement_enabled", "announcement_text", "announcement_link")}),
        (
            "Hero",
            {
                "fields": (
                    "hero_tag",
                    "hero_title",
                    "hero_rotating_lines",
                    "hero_media_type",
                    "hero_video_file",
                    "hero_video_url",
                    "hero_video_loop_end",
                    "hero_primary_cta_text",
                    "hero_primary_cta_link",
                    "hero_secondary_cta_text",
                    "hero_secondary_cta_link",
                )
            },
        ),
        ("Marquee and trust", {"fields": ("marquee_items", "benefits", "budget_tiles")}),
        (
            "Skin quiz promo",
            {
                "fields": (
                    "quiz_enabled",
                    "quiz_badge",
                    "quiz_title",
                    "quiz_subtitle",
                    "quiz_button_text",
                    "quiz_link",
                )
            },
        ),
        ("Homepage sections", {"fields": ("sections_order", "updated_at")}),
    )
    readonly_fields = ["updated_at"]

    def has_add_permission(self, request):
        return not StorefrontConfig.objects.exists()

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(StorefrontReel)
class StorefrontReelAdmin(admin.ModelAdmin):
    list_display = ["title", "is_active", "sort_order", "link_url", "updated_at"]
    list_editable = ["is_active", "sort_order"]
    list_filter = ["is_active"]
    search_fields = ["title", "link_url"]
