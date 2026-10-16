from django.contrib.auth import login, logout
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_protect, ensure_csrf_cookie
from rest_framework import generics, permissions, status, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView

from config.exceptions import error_response

from .models import Address
from .serializers import (
    AddressSerializer,
    LoginSerializer,
    PasswordResetConfirmSerializer,
    PasswordResetRequestSerializer,
    RegisterSerializer,
    UserSerializer,
)
from .services import PasswordResetError, reset_password, send_password_reset_email


@method_decorator(ensure_csrf_cookie, name="get")
class CsrfTokenView(APIView):
    """Sets the csrftoken cookie so the SPA can send it on unsafe requests."""

    permission_classes = [permissions.AllowAny]

    def get(self, request):
        return Response({"detail": "CSRF cookie set."})


@method_decorator(csrf_protect, name="post")
class RegisterView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_scope = "auth"

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        login(request, user, backend="django.contrib.auth.backends.ModelBackend")
        return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)


@method_decorator(csrf_protect, name="post")
class LoginView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_scope = "auth"

    def post(self, request):
        serializer = LoginSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        login(request, serializer.validated_data["user"])
        return Response(UserSerializer(serializer.validated_data["user"]).data)


@method_decorator(csrf_protect, name="post")
class PasswordResetRequestView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_scope = "auth"

    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        send_password_reset_email(serializer.validated_data["email"])
        return Response(
            {"detail": "If an account uses this email, we have sent a link to reset the password."}
        )


@method_decorator(csrf_protect, name="post")
class PasswordResetConfirmView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_scope = "auth"

    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        try:
            reset_password(data["uid"], data["token"], data["new_password"])
        except PasswordResetError as error:
            return error_response(str(error))
        except DjangoValidationError as error:
            return error_response(error.messages[0], errors={"new_password": error.messages})
        return Response({"detail": "Your password has been changed. Please sign in."})


class LogoutView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        logout(request)
        return Response(status=status.HTTP_204_NO_CONTENT)


class SessionView(APIView):
    """Who is signed in: {"user": {...}} or {"user": null}. Lets the SPA check without a 403."""

    permission_classes = [permissions.AllowAny]

    def get(self, request):
        user = request.user if request.user.is_authenticated else None
        return Response({"user": UserSerializer(user).data if user else None})


class CurrentUserView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ["get", "patch"]

    def get_object(self):
        return self.request.user


class AddressViewSet(viewsets.ModelViewSet):
    serializer_class = AddressSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        return Address.objects.filter(user=self.request.user)

    @transaction.atomic
    def perform_create(self, serializer):
        user_addresses = self.get_queryset()
        make_default = serializer.validated_data.get("is_default") or not user_addresses.exists()
        if make_default:
            user_addresses.update(is_default=False)
        serializer.save(user=self.request.user, is_default=make_default)

    @transaction.atomic
    def perform_update(self, serializer):
        if serializer.validated_data.get("is_default"):
            self.get_queryset().exclude(pk=serializer.instance.pk).update(is_default=False)
        serializer.save()

    @transaction.atomic
    def perform_destroy(self, instance):
        was_default = instance.is_default
        instance.delete()
        if was_default:
            replacement = self.get_queryset().order_by("-updated_at").first()
            if replacement:
                replacement.is_default = True
                replacement.save(update_fields=["is_default"])
