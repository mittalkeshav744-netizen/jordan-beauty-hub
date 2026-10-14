from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import status
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import exception_handler


def api_exception_handler(exc, context):
    """
    Return every API error in one shape:

        {"detail": "Human readable summary", "errors": {"field": ["message"]}}

    Unexpected exceptions still fall through to Django (500, no traceback
    exposed when DEBUG is off).
    """
    if isinstance(exc, DjangoValidationError):
        exc = ValidationError(exc.message_dict if hasattr(exc, "error_dict") else exc.messages)

    response = exception_handler(exc, context)
    if response is None:
        return None

    data = response.data
    if isinstance(exc, ValidationError):
        errors = data if isinstance(data, dict) else {"non_field_errors": data}
        detail = _first_message(errors) or "Please correct the errors below."
        response.data = {"detail": detail, "errors": errors}
    elif isinstance(data, dict) and "detail" in data:
        response.data = {"detail": str(data["detail"]), "errors": {}}
    else:
        response.data = {"detail": "Request failed.", "errors": data}
    return response


def _first_message(errors):
    for value in errors.values() if isinstance(errors, dict) else [errors]:
        if isinstance(value, (list, tuple)) and value:
            first = value[0]
            return _first_message(first) if isinstance(first, (dict, list)) else str(first)
        if isinstance(value, dict):
            return _first_message(value)
        if value:
            return str(value)
    return None


def error_response(message, status_code=status.HTTP_400_BAD_REQUEST, errors=None):
    return Response({"detail": message, "errors": errors or {}}, status=status_code)
