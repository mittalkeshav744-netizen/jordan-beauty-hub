from django.contrib.auth.forms import UserChangeForm, UserCreationForm

from .models import User


class AdminUserCreationForm(UserCreationForm):
    class Meta:
        model = User
        fields = ("email", "first_name", "last_name", "phone", "is_staff", "is_active")


class AdminUserChangeForm(UserChangeForm):
    class Meta:
        model = User
        fields = ("email", "first_name", "last_name", "phone")
