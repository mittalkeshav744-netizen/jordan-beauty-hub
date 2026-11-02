from rest_framework.permissions import BasePermission


class IsStaffUser(BasePermission):
    """Staff-only access for the owner portal API (is_staff=True)."""

    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated and user.is_staff)
