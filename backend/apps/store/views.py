from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_protect
from rest_framework import permissions
from rest_framework.response import Response
from rest_framework.views import APIView

from .serializers import NewsletterSignupSerializer
from .services import public_store_settings, subscribe_to_newsletter


class StoreSettingsView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        return Response(public_store_settings())


@method_decorator(csrf_protect, name="post")
class NewsletterSignupView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_scope = "newsletter"

    def post(self, request):
        serializer = NewsletterSignupSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        subscribe_to_newsletter(serializer.validated_data["email"])
        # Same reply for new and existing subscribers, so the form can't be used to look up emails.
        return Response({"detail": "Thanks for subscribing! Watch your inbox for offers and new launches."})
