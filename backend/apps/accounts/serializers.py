import re

from django.contrib.auth import authenticate, get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from .models import Address

User = get_user_model()

PHONE_PATTERN = re.compile(r"^\+?[0-9]{10,15}$")
POSTAL_CODE_PATTERN = re.compile(r"^[1-9][0-9]{5}$")


def validate_phone_number(value):
    cleaned = value.replace(" ", "").replace("-", "")
    if not PHONE_PATTERN.match(cleaned):
        raise serializers.ValidationError("Enter a valid phone number (10–15 digits).")
    return cleaned


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "email", "first_name", "last_name", "phone", "is_staff"]
        read_only_fields = ["id", "email", "is_staff"]

    def validate_phone(self, value):
        return validate_phone_number(value) if value else value


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, style={"input_type": "password"})

    class Meta:
        model = User
        fields = ["email", "first_name", "last_name", "phone", "password"]
        extra_kwargs = {
            "first_name": {"required": True, "allow_blank": False},
            "last_name": {"required": False, "allow_blank": True},
        }

    def validate_email(self, value):
        email = value.strip().lower()
        if User.objects.filter(email__iexact=email).exists():
            raise serializers.ValidationError("An account with this email already exists.")
        return email

    def validate_phone(self, value):
        return validate_phone_number(value) if value else value

    def validate(self, attrs):
        candidate = User(
            email=attrs.get("email"),
            first_name=attrs.get("first_name", ""),
            last_name=attrs.get("last_name", ""),
        )
        validate_password(attrs["password"], user=candidate)
        return attrs

    def create(self, validated_data):
        password = validated_data.pop("password")
        return User.objects.create_user(password=password, **validated_data)


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, style={"input_type": "password"})

    def validate(self, attrs):
        user = authenticate(
            request=self.context.get("request"),
            email=attrs["email"].strip().lower(),
            password=attrs["password"],
        )
        if user is None:
            raise serializers.ValidationError("Incorrect email or password.")
        attrs["user"] = user
        return attrs


class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()


class PasswordResetConfirmSerializer(serializers.Serializer):
    uid = serializers.CharField(max_length=64)
    token = serializers.CharField(max_length=128)
    new_password = serializers.CharField(write_only=True, style={"input_type": "password"})


class AddressSerializer(serializers.ModelSerializer):
    class Meta:
        model = Address
        fields = [
            "id",
            "full_name",
            "phone",
            "line1",
            "line2",
            "city",
            "state",
            "postal_code",
            "country",
            "is_default",
        ]
        read_only_fields = ["id"]

    def validate_phone(self, value):
        return validate_phone_number(value)

    def validate_postal_code(self, value):
        value = value.strip()
        if not POSTAL_CODE_PATTERN.match(value):
            raise serializers.ValidationError("Enter a valid 6-digit PIN code.")
        return value
