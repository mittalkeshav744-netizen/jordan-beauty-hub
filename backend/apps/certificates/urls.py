from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register("courses", views.CourseViewSet, basename="certificate-courses")
router.register("students", views.StudentViewSet, basename="certificate-students")
router.register("enrollments", views.EnrollmentViewSet, basename="certificate-enrollments")
router.register("groups", views.GroupViewSet, basename="certificate-groups")
router.register("templates", views.TemplateViewSet, basename="certificate-templates")
router.register("issued", views.CertificateViewSet, basename="certificate-issued")
router.register("email-logs", views.EmailLogViewSet, basename="certificate-email-logs")
router.register("email-templates", views.EmailTemplateViewSet, basename="certificate-email-templates")
router.register("fields", views.FieldViewSet, basename="certificate-fields")
router.register("jobs", views.JobViewSet, basename="certificate-jobs")

urlpatterns = [
    path("dashboard/", views.dashboard, name="certificate-dashboard"),
    path("settings/", views.settings_view, name="certificate-settings"),
    path("reports/", views.reports_summary, name="certificate-reports"),
    path("reports/export/", views.reports_export, name="certificate-reports-export"),
    path("queue/process/", views.process_queue, name="certificate-process-queue"),
    path("verify/<str:public_id>/", views.verify_certificate, name="certificate-verify"),
    path("", include(router.urls)),
]
