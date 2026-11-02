from django.contrib.admin.apps import AdminConfig


class DeveloperAdminConfig(AdminConfig):
    """Swap in DeveloperAdminSite so /admin/ is limited to superusers."""

    default_site = "config.admin.DeveloperAdminSite"
