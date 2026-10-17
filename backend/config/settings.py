"""
Django settings for the Jordan Beauty Hub backend.

All environment-specific values are read from environment variables
(loaded from backend/.env during local development). See .env.example.
"""

import os
import sys
from decimal import Decimal
from pathlib import Path

from django.core.exceptions import ImproperlyConfigured
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent

load_dotenv(BASE_DIR / ".env")


def env(name, default=None, required=False):
    value = os.environ.get(name, default)
    if required and (value is None or value == ""):
        raise ImproperlyConfigured(
            f"Missing required environment variable '{name}'. "
            "Copy backend/.env.example to backend/.env and fill it in."
        )
    return value


def env_bool(name, default=False):
    return str(env(name, str(default))).strip().lower() in {"1", "true", "yes", "on"}


def env_list(name, default=""):
    return [item.strip() for item in env(name, default).split(",") if item.strip()]


# ---------------------------------------------------------------------------
# Core
# ---------------------------------------------------------------------------

SECRET_KEY = env("DJANGO_SECRET_KEY", required=True)
DEBUG = env_bool("DJANGO_DEBUG", False)
ALLOWED_HOSTS = env_list("DJANGO_ALLOWED_HOSTS", "localhost,127.0.0.1")

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    # Third party
    "rest_framework",
    "corsheaders",
    # Project apps
    "apps.accounts",
    "apps.catalog",
    "apps.cart",
    "apps.orders",
    "apps.payments",
    "apps.wishlist",
    "apps.store",
    "apps.looks",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"

# ---------------------------------------------------------------------------
# Database (SQLite)
# ---------------------------------------------------------------------------
# SQLite ignores select_for_update(), so atomic blocks start with BEGIN
# IMMEDIATE instead: each transaction takes the write lock up front and
# concurrent checkouts run one after another (no overselling). WAL mode lets
# readers continue while a write is in progress.

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / env("SQLITE_PATH", "db.sqlite3"),
        "OPTIONS": {
            "transaction_mode": "IMMEDIATE",
            "timeout": 20,
            "init_command": "PRAGMA journal_mode=WAL; PRAGMA synchronous=NORMAL;",
        },
    }
}

# ---------------------------------------------------------------------------
# Authentication
# ---------------------------------------------------------------------------

AUTH_USER_MODEL = "accounts.User"

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

if len(sys.argv) > 1 and sys.argv[1] == "test":
    # Strong hashing is deliberately slow; tests don't need it.
    PASSWORD_HASHERS = ["django.contrib.auth.hashers.MD5PasswordHasher"]

# ---------------------------------------------------------------------------
# Internationalisation
# ---------------------------------------------------------------------------

LANGUAGE_CODE = "en-in"
TIME_ZONE = env("DJANGO_TIME_ZONE", "Asia/Kolkata")
USE_I18N = True
USE_TZ = True

# ---------------------------------------------------------------------------
# Static and media files
# ---------------------------------------------------------------------------

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
MEDIA_URL = "/media/"
MEDIA_ROOT = Path(env("DJANGO_MEDIA_ROOT", str(BASE_DIR / "media")))
# React production build (`npm run build` in frontend/). Served by config.spa when present.
FRONTEND_DIST = Path(env("FRONTEND_DIST", str(BASE_DIR.parent / "frontend" / "dist")))

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# ---------------------------------------------------------------------------
# Django REST Framework
# ---------------------------------------------------------------------------

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework.authentication.SessionAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticatedOrReadOnly",
    ],
    "DEFAULT_PAGINATION_CLASS": "config.pagination.StandardPagination",
    "PAGE_SIZE": 12,
    "EXCEPTION_HANDLER": "config.exceptions.api_exception_handler",
    "DEFAULT_THROTTLE_CLASSES": [
        "rest_framework.throttling.ScopedRateThrottle",
    ],
    "DEFAULT_THROTTLE_RATES": {
        "auth": env("AUTH_THROTTLE_RATE", "20/min"),
        "newsletter": env("NEWSLETTER_THROTTLE_RATE", "10/min"),
        "chat": env("CHAT_THROTTLE_RATE", "20/min"),
    },
}

# Google Gemini — beauty assistant chat (`/api/store/chat/`). Leave empty to disable the widget.
GOOGLE_GEMINI_API_KEY = env("GOOGLE_GEMINI_API_KEY", "")
GEMINI_MODEL = env("GEMINI_MODEL", "gemini-flash-latest")

# ---------------------------------------------------------------------------
# CORS / CSRF / cookies
# ---------------------------------------------------------------------------
# In development the Vite dev server proxies /api to Django, so requests are
# same-origin. CORS is only needed when the frontend is served from a
# different origin; list those origins explicitly.

CORS_ALLOWED_ORIGINS = env_list(
    "CORS_ALLOWED_ORIGINS",
    "http://localhost:5173,http://127.0.0.1:5173,http://localhost:8000,http://127.0.0.1:8000",
)
CORS_ALLOW_CREDENTIALS = True
CSRF_TRUSTED_ORIGINS = env_list(
    "CSRF_TRUSTED_ORIGINS",
    "http://localhost:5173,http://127.0.0.1:5173,http://localhost:8000,http://127.0.0.1:8000",
)

SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = "Lax"
CSRF_COOKIE_SAMESITE = "Lax"
# The SPA reads the CSRF cookie and sends it back in the X-CSRFToken header.
CSRF_COOKIE_HTTPONLY = False

if not DEBUG:
    SECURE_SSL_REDIRECT = env_bool("DJANGO_SECURE_SSL_REDIRECT", True)
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_HSTS_SECONDS = int(env("DJANGO_SECURE_HSTS_SECONDS", "31536000"))
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
    SECURE_CONTENT_TYPE_NOSNIFF = True

# ---------------------------------------------------------------------------
# Store business settings
# ---------------------------------------------------------------------------

STORE_NAME = "Jordan Beauty Hub"
STORE_CURRENCY = "INR"
SHIPPING_FLAT_FEE = Decimal(env("SHIPPING_FLAT_FEE", "0.00"))
FREE_SHIPPING_THRESHOLD = Decimal(env("FREE_SHIPPING_THRESHOLD", "0.00"))
MAX_CART_ITEM_QUANTITY = int(env("MAX_CART_ITEM_QUANTITY", "10"))
# Digits only, with country code (e.g. 91 followed by the 10-digit number). Empty hides the button.
STORE_WHATSAPP_NUMBER = "".join(ch for ch in env("STORE_WHATSAPP_NUMBER", "") if ch.isdigit())
# Public address of the storefront; used in links inside emails.
# Use http://127.0.0.1:8000 when Django serves the built frontend; keep :5173 for Vite.
FRONTEND_URL = env("FRONTEND_URL", "http://localhost:5173").rstrip("/")

# ---------------------------------------------------------------------------
# Email (password reset)
# ---------------------------------------------------------------------------
# The console backend prints emails in the Django terminal. For real delivery set
# EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend and the SMTP values.

EMAIL_BACKEND = env("EMAIL_BACKEND", "django.core.mail.backends.console.EmailBackend")
EMAIL_HOST = env("EMAIL_HOST", "localhost")
EMAIL_PORT = int(env("EMAIL_PORT", "587"))
EMAIL_HOST_USER = env("EMAIL_HOST_USER", "")
EMAIL_HOST_PASSWORD = env("EMAIL_HOST_PASSWORD", "")
EMAIL_USE_TLS = env_bool("EMAIL_USE_TLS", True)
DEFAULT_FROM_EMAIL = env("DEFAULT_FROM_EMAIL", "webmaster@localhost")

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "simple": {"format": "{asctime} {levelname} {name}: {message}", "style": "{"},
    },
    "handlers": {
        "console": {"class": "logging.StreamHandler", "formatter": "simple"},
    },
    "root": {"handlers": ["console"], "level": env("DJANGO_LOG_LEVEL", "INFO")},
}
