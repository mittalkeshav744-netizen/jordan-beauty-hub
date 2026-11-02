from rest_framework.exceptions import APIException


class ChatNotConfigured(APIException):
    status_code = 503
    default_detail = (
        "The beauty assistant is not set up yet. Add GOOGLE_GEMINI_API_KEY to the server "
        "environment, or chat with us on WhatsApp from the footer."
    )
    default_code = "chat_not_configured"


class ChatProviderError(APIException):
    status_code = 502
    default_detail = "The beauty assistant is busy right now. Please try again in a moment."
    default_code = "chat_provider_error"
