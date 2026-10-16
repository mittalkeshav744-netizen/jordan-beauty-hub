from django.urls import path
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register("addresses", views.AddressViewSet, basename="address")

urlpatterns = [
    path("csrf/", views.CsrfTokenView.as_view(), name="csrf"),
    path("register/", views.RegisterView.as_view(), name="register"),
    path("login/", views.LoginView.as_view(), name="login"),
    path("logout/", views.LogoutView.as_view(), name="logout"),
    path("password-reset/", views.PasswordResetRequestView.as_view(), name="password-reset"),
    path(
        "password-reset/confirm/",
        views.PasswordResetConfirmView.as_view(),
        name="password-reset-confirm",
    ),
    path("session/", views.SessionView.as_view(), name="session"),
    path("me/", views.CurrentUserView.as_view(), name="current-user"),
    *router.urls,
]
