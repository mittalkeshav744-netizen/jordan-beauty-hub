"""Verify Firebase phone ID tokens (Identity Toolkit) without firebase-admin.

Live tokens are checked with Google's JWKS. Local demo tokens look like
``demo:+91XXXXXXXXXX`` and only work when ``ALLOW_DEMO_AUTH`` is enabled.
"""

from __future__ import annotations

import re

import jwt
from django.conf import settings
from jwt import PyJWKClient

FIREBASE_JWKS_URL = (
    "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"
)
_PHONE_E164 = re.compile(r"^\+[1-9]\d{7,14}$")
_jwks_client = None


class FirebaseAuthError(Exception):
    """Shopper-safe message when the Firebase token cannot be trusted."""


def normalize_phone(value: str) -> str:
    """
    Normalize Indian mobile numbers to E.164 (+91XXXXXXXXXX).
    Also accepts already-international numbers starting with +.
    """
    raw = (value or "").strip().replace(" ", "").replace("-", "")
    if not raw:
        raise FirebaseAuthError("Enter a valid mobile number.")

    if raw.startswith("demo:"):
        raw = raw[5:]

    digits = re.sub(r"\D", "", raw)
    if len(digits) == 10:
        phone = f"+91{digits}"
    elif len(digits) == 12 and digits.startswith("91"):
        phone = f"+{digits}"
    elif raw.startswith("+") and _PHONE_E164.match(raw):
        phone = raw
    else:
        raise FirebaseAuthError("Enter a valid 10-digit Indian mobile number.")

    if not _PHONE_E164.match(phone):
        raise FirebaseAuthError("Enter a valid mobile number.")
    return phone


def _get_jwks_client():
    global _jwks_client
    if _jwks_client is None:
        _jwks_client = PyJWKClient(FIREBASE_JWKS_URL, cache_keys=True)
    return _jwks_client


def verify_firebase_id_token(id_token: str) -> str:
    """
    Return the verified E.164 phone number from a Firebase ID token.

    Demo bypass (ALLOW_DEMO_AUTH only): ``demo:+91XXXXXXXXXX``.
    """
    token = (id_token or "").strip()
    if not token:
        raise FirebaseAuthError("Missing sign-in token.")

    if token.startswith("demo:"):
        if not settings.ALLOW_DEMO_AUTH:
            raise FirebaseAuthError("Demo phone sign-in is disabled.")
        return normalize_phone(token[5:])

    project_id = (settings.FIREBASE_PROJECT_ID or "").strip()
    if not project_id:
        raise FirebaseAuthError("Phone sign-in is not configured.")

    try:
        signing_key = _get_jwks_client().get_signing_key_from_jwt(token)
        decoded = jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256"],
            audience=project_id,
            issuer=f"https://securetoken.google.com/{project_id}",
        )
    except jwt.PyJWTError as error:
        raise FirebaseAuthError("That sign-in code expired or is invalid. Try again.") from error

    phone = decoded.get("phone_number")
    if not phone:
        raise FirebaseAuthError("Phone number missing from the sign-in token.")
    return normalize_phone(phone)
