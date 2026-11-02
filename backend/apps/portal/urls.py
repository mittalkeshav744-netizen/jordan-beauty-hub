from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register("orders", views.OrderViewSet, basename="portal-orders")
router.register("products", views.ProductViewSet, basename="portal-products")
router.register("reviews", views.ReviewViewSet, basename="portal-reviews")
router.register("coupons", views.CouponViewSet, basename="portal-coupons")
router.register("customers", views.CustomerViewSet, basename="portal-customers")
router.register("looks", views.LookViewSet, basename="portal-looks")
router.register("courses", views.CourseViewSet, basename="portal-courses")
router.register("newsletter", views.NewsletterViewSet, basename="portal-newsletter")
router.register("categories", views.CategoryViewSet, basename="portal-categories")
router.register("storefront/reels", views.StorefrontReelViewSet, basename="portal-storefront-reels")

urlpatterns = [
    path("products/<int:pk>/images/", views.ProductImagesView.as_view(), name="portal-product-images"),
    path(
        "products/<int:pk>/images/<int:image_id>/",
        views.ProductImageView.as_view(),
        name="portal-product-image",
    ),
    path("dashboard/", views.DashboardView.as_view(), name="portal-dashboard"),
    path("nav/", views.NavBadgesView.as_view(), name="portal-nav"),
    path("settings/", views.SettingsView.as_view(), name="portal-settings"),
    path("catalog-options/", views.CatalogOptionsView.as_view(), name="portal-catalog-options"),
    path(
        "storefront/config/",
        views.StorefrontConfigView.as_view(),
        name="portal-storefront-config",
    ),
    path(
        "storefront/reels/reorder/",
        views.StorefrontReelReorderView.as_view(),
        name="portal-storefront-reels-reorder",
    ),
    path(
        "homepage-picks/",
        views.HomepagePicksView.as_view(),
        name="portal-homepage-picks",
    ),
    path("variants/<int:pk>/stock/", views.VariantStockView.as_view(), name="portal-variant-stock"),
    path("variants/<int:pk>/out-of-stock/", views.VariantOutOfStockView.as_view(), name="portal-variant-oos"),
    path("variants/<int:pk>/", views.VariantDetailView.as_view(), name="portal-variant-detail"),
    path("", include(router.urls)),
]
