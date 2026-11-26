from django.apps import AppConfig


class CertificatesConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.certificates"
    label = "certificates"
    verbose_name = "Certificates"

    def ready(self):
        # Register shop enrollment → certificate student sync.
        from . import signals  # noqa: F401
