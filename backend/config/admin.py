from django.contrib.admin import AdminSite


class DeveloperAdminSite(AdminSite):
    """
    Django Admin is developer-only.

    Store owners use the React owner portal (/manage) with is_staff=True.
    Only accounts with is_superuser=True (created via createsuperuser) may open /admin/.
    """

    site_header = "Jordan Beauty Hub administration"
    site_title = "Jordan Beauty Hub admin"
    index_title = "Catalogue, orders, looks, customers and payments"

    def has_permission(self, request):
        user = request.user
        return bool(user and user.is_active and user.is_superuser)
