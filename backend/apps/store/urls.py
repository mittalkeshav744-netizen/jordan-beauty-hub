from django.urls import path

from . import views

urlpatterns = [
    path("settings/", views.StoreSettingsView.as_view(), name="store-settings"),
    path("storefront/", views.StorefrontView.as_view(), name="store-storefront"),
    path("newsletter/", views.NewsletterSignupView.as_view(), name="newsletter-signup"),
    # Register stream before chat/ so older Django matchers never treat it as a SPA path.
    path("chat/stream/", views.BeautyChatStreamView.as_view(), name="beauty-chat-stream"),
    path("chat/", views.BeautyChatView.as_view(), name="beauty-chat"),
]
