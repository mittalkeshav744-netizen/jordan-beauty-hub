import json

from django.http import StreamingHttpResponse
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_protect
from rest_framework import permissions
from rest_framework.renderers import BaseRenderer, JSONRenderer
from rest_framework.response import Response
from rest_framework.views import APIView

from .chat import ask_beauty_assistant, iter_beauty_assistant
from .chat.exceptions import ChatNotConfigured, ChatProviderError
from .serializers import BeautyChatSerializer, NewsletterSignupSerializer
from .services import public_store_settings, public_storefront, subscribe_to_newsletter


class EventStreamRenderer(BaseRenderer):
    """Allow Accept: text/event-stream on Mira's streaming endpoint."""

    media_type = "text/event-stream"
    format = "txt"
    charset = "utf-8"

    def render(self, data, accepted_media_type=None, renderer_context=None):
        return data


class StoreSettingsView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        return Response(public_store_settings())


class StorefrontView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        return Response(public_storefront(request))


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


def _chat_kwargs(request, validated):
    return {
        "message": validated["message"],
        "history": validated.get("history") or [],
        "is_authenticated": request.user.is_authenticated,
        "page_path": validated.get("page_path") or "",
        "request": request,
        "user": request.user if request.user.is_authenticated else None,
    }


@method_decorator(csrf_protect, name="post")
class BeautyChatView(APIView):
    """Full AI beauty assistant (Google Gemini). API key never leaves the server."""

    permission_classes = [permissions.AllowAny]
    throttle_scope = "chat"

    def post(self, request):
        serializer = BeautyChatSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        result = ask_beauty_assistant(**_chat_kwargs(request, serializer.validated_data))
        return Response(result)


@method_decorator(csrf_protect, name="post")
class BeautyChatStreamView(APIView):
    """
    SSE stream of Mira's reply.
    Events: status | token | done | error  (JSON in `data:` lines).
    """

    permission_classes = [permissions.AllowAny]
    throttle_scope = "chat"
    renderer_classes = [EventStreamRenderer, JSONRenderer]

    def post(self, request):
        serializer = BeautyChatSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        kwargs = _chat_kwargs(request, serializer.validated_data)

        def event_stream():
            try:
                for event in iter_beauty_assistant(**kwargs):
                    yield f"data: {json.dumps(event, ensure_ascii=False)}\n\n"
            except ChatNotConfigured as error:
                payload = {"type": "error", "detail": str(error)}
                yield f"data: {json.dumps(payload, ensure_ascii=False)}\n\n"
            except ChatProviderError as error:
                payload = {"type": "error", "detail": str(error)}
                yield f"data: {json.dumps(payload, ensure_ascii=False)}\n\n"
            except Exception:
                payload = {
                    "type": "error",
                    "detail": "The beauty assistant is busy right now. Please try again in a moment.",
                }
                yield f"data: {json.dumps(payload, ensure_ascii=False)}\n\n"

        response = StreamingHttpResponse(event_stream(), content_type="text/event-stream")
        response["Cache-Control"] = "no-cache"
        response["X-Accel-Buffering"] = "no"
        return response
