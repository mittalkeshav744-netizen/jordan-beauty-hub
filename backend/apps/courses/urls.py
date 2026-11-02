from rest_framework.routers import SimpleRouter

from . import views

router = SimpleRouter()
router.register("", views.CourseViewSet, basename="course")

urlpatterns = router.urls
