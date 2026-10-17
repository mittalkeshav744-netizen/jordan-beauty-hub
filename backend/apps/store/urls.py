from django.urls import path

from . import views

urlpatterns = [
    path("settings/", views.StoreSettingsView.as_view(), name="store-settings"),
    path("newsletter/", views.NewsletterSignupView.as_view(), name="newsletter-signup"),
    path("chat/", views.BeautyChatView.as_view(), name="beauty-chat"),
]
