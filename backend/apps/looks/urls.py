from rest_framework.routers import SimpleRouter

from . import views

router = SimpleRouter()
router.register("", views.LookViewSet, basename="look")

urlpatterns = router.urls
