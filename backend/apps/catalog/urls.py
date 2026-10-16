from django.urls import path
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register("categories", views.CategoryViewSet, basename="category")
router.register("brands", views.BrandViewSet, basename="brand")
router.register("concerns", views.ConcernViewSet, basename="concern")
router.register("skin-types", views.SkinTypeViewSet, basename="skin-type")
router.register("products", views.ProductViewSet, basename="product")

urlpatterns = [
    path("routine/", views.RoutineView.as_view(), name="routine"),
    *router.urls,
]
