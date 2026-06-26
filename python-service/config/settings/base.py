"""
Javahade Platform — Base Django Settings
Shared across all environments.
"""

import os
from datetime import timedelta
from pathlib import Path

from decouple import Csv, config

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent.parent

# =============================================================================
# Core
# =============================================================================

SECRET_KEY = config("SECRET_KEY", default="insecure-dev-key-change-me")

ALLOWED_HOSTS = config("ALLOWED_HOSTS", default="localhost,127.0.0.1", cast=Csv())

# =============================================================================
# Application definition
# =============================================================================

DJANGO_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
]

THIRD_PARTY_APPS = [
    "rest_framework",
    "rest_framework_simplejwt",
    "rest_framework_simplejwt.token_blacklist",
    "corsheaders",
    "django_filters",
    "storages",
]

LOCAL_APPS = [
    "apps.accounts",
    "apps.content",
    "apps.subscriptions",
    "apps.payments",
    "apps.family",
    "apps.notifications",
    "apps.moderation",
    "apps.booking",
    "apps.streaming_ui",
    "apps.core_ui",
    "apps.mongo_app",
]

INSTALLED_APPS = DJANGO_APPS + THIRD_PARTY_APPS + LOCAL_APPS

# =============================================================================
# Middleware
# =============================================================================

MIDDLEWARE = [
    "common.logging.CorrelationIDMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "apps.accounts.middleware.RoleRedirectMiddleware",
    "apps.moderation.middleware.AuditLogMiddleware",
    "common.middleware.GeoBlockingMiddleware",
    "common.middleware.RateLimitMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"

# =============================================================================
# Custom User Model
# =============================================================================

AUTH_USER_MODEL = "accounts.User"

# =============================================================================
# Database — PostgreSQL
# =============================================================================

import dj_database_url

DATABASES = {
    "default": dj_database_url.config(
        default=config(
            "DATABASE_URL",
            default="postgres://javahade_user:secret_password@localhost:5432/javahade_db",
        ),  # type: ignore
        conn_max_age=600,
    ),
    "mongo": {
        "ENGINE": "djongo",
        "NAME": config("MONGO_DATABASE", default="javahade_mongo"),
        "CLIENT": {
            "host": config("MONGO_HOST", default="localhost"),
            "port": config("MONGO_PORT", default=27017, cast=int),
            "username": config("MONGO_ROOT_USERNAME", default="mongo_admin"),
            "password": config("MONGO_ROOT_PASSWORD", default="mongo_secret"),
            "authSource": "admin",
            "authMechanism": "SCRAM-SHA-256",
        }
    }
}

# Database router for MongoDB
DATABASE_ROUTERS = ['config.routers.MongoRouter']

# =============================================================================
# Cache — Redis
# =============================================================================

REDIS_URL = config("REDIS_URL", default="redis://localhost:6379/0")

CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.redis.RedisCache",
        "LOCATION": REDIS_URL,
    }
}

# =============================================================================
# Password validation
# https://docs.djangoproject.com/en/5.0/ref/settings/#auth-password-validators

PASSWORD_HASHERS = [
    "django.contrib.auth.hashers.Argon2PasswordHasher",
    "django.contrib.auth.hashers.PBKDF2PasswordHasher",
    "django.contrib.auth.hashers.PBKDF2SHA1PasswordHasher",
    "django.contrib.auth.hashers.BCryptSHA256PasswordHasher",
]

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

# =============================================================================
# Internationalization
# =============================================================================

LANGUAGE_CODE = "en-us"
TIME_ZONE = "Asia/Jakarta"
USE_I18N = True
USE_TZ = True

# =============================================================================
# Static & Media files
# =============================================================================

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
STATICFILES_DIRS = [BASE_DIR / "static"]

MEDIA_URL = "media/"
MEDIA_ROOT = BASE_DIR / "media"

# =============================================================================
# Authentication URLs (untuk booking frontend)
# =============================================================================

LOGIN_URL = "booking:login"
LOGIN_REDIRECT_URL = "booking:dashboard"
LOGOUT_REDIRECT_URL = "booking:login"

# =============================================================================
# Chat WebSocket (Go service)
# =============================================================================

CHAT_WS_URL = config("CHAT_WS_URL", default="ws://localhost:8081/ws/chat")

# =============================================================================
# Default primary key field type
# =============================================================================

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# =============================================================================
# REST Framework
# =============================================================================

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "common.authentication.CustomJWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": (
        "rest_framework.permissions.IsAuthenticated",
    ),
    "DEFAULT_FILTER_BACKENDS": (
        "django_filters.rest_framework.DjangoFilterBackend",
        "rest_framework.filters.SearchFilter",
        "rest_framework.filters.OrderingFilter",
    ),
    "DEFAULT_PAGINATION_CLASS": "common.pagination.StandardPagination",
    "PAGE_SIZE": 20,
    "DEFAULT_RENDERER_CLASSES": (
        "rest_framework.renderers.JSONRenderer",
    ),
    "DEFAULT_THROTTLE_CLASSES": [
        "rest_framework.throttling.AnonRateThrottle",
        "rest_framework.throttling.UserRateThrottle"
    ],
    "DEFAULT_THROTTLE_RATES": {
        "anon": "100/day",
        "user": "1000/day"
    },
    "DATETIME_FORMAT": "%Y-%m-%dT%H:%M:%S%z",
    "EXCEPTION_HANDLER": "common.exceptions.custom_exception_handler",
}

# =============================================================================
# File Uploads
# =============================================================================

# Default is 2.5MB (2621440). Do not increase to prevent OOM during video streams.
FILE_UPLOAD_MAX_MEMORY_SIZE = 2621440

# =============================================================================
# Simple JWT
# =============================================================================

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(
        minutes=config("JWT_ACCESS_TOKEN_LIFETIME_MINUTES", default=60, cast=int)
    ),
    "REFRESH_TOKEN_LIFETIME": timedelta(
        days=config("JWT_REFRESH_TOKEN_LIFETIME_DAYS", default=7, cast=int)
    ),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "SIGNING_KEY": config("JWT_SECRET_KEY"),
    "ALGORITHM": "HS256",
    "AUTH_HEADER_TYPES": ("Bearer",),
    "USER_ID_FIELD": "id",
    "USER_ID_CLAIM": "user_id",
    "TOKEN_TYPE_CLAIM": "token_type",
    "TOKEN_OBTAIN_SERIALIZER": "apps.accounts.serializers.CustomTokenObtainPairSerializer",
}

# =============================================================================
# CORS
# =============================================================================

CORS_ALLOWED_ORIGINS = config(
    "CORS_ALLOWED_ORIGINS",
    default="http://localhost:3000,http://localhost:5173",
    cast=Csv(),
)
if isinstance(CORS_ALLOWED_ORIGINS, list) and "*" in CORS_ALLOWED_ORIGINS:
    CORS_ALLOW_ALL_ORIGINS = True
    CORS_ALLOWED_ORIGINS = [] # Harus dikosongkan agar django-cors-headers tidak error E013
CORS_ALLOW_CREDENTIALS = True

# =============================================================================
# Celery
# =============================================================================

CELERY_BROKER_URL = config("CELERY_BROKER_URL", default=REDIS_URL)
CELERY_RESULT_BACKEND = config("CELERY_RESULT_BACKEND", default=REDIS_URL)
CELERY_ACCEPT_CONTENT = ["json"]
CELERY_TASK_SERIALIZER = "json"
CELERY_RESULT_SERIALIZER = "json"
CELERY_TIMEZONE = TIME_ZONE

# =============================================================================
# Security & Cookies (Phase 2)
# =============================================================================
SESSION_COOKIE_SECURE = config("SESSION_COOKIE_SECURE", default=False, cast=bool)
CSRF_COOKIE_SECURE = config("CSRF_COOKIE_SECURE", default=False, cast=bool)
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = 'Strict'

# =============================================================================
# Email
# =============================================================================

EMAIL_HOST = config("EMAIL_HOST", default="smtp.gmail.com")
EMAIL_PORT = config("EMAIL_PORT", default=587, cast=int)
EMAIL_HOST_USER = config("EMAIL_HOST_USER", default="")
EMAIL_HOST_PASSWORD = config("EMAIL_HOST_PASSWORD", default="")
EMAIL_USE_TLS = config("EMAIL_USE_TLS", default=True, cast=bool)
DEFAULT_FROM_EMAIL = config("DEFAULT_FROM_EMAIL", default="noreply@javahade.app")

# Payment settings
DEFAULT_PAYMENT_PROVIDER = config("DEFAULT_PAYMENT_PROVIDER", default="stripe")
STRIPE_SECRET_KEY = config("STRIPE_SECRET_KEY", default="")
STRIPE_WEBHOOK_SECRET = config("STRIPE_WEBHOOK_SECRET", default="")

# =============================================================================
# Storage — S3 / MinIO (For Video/Streaming) & Box SDK (Default Media)
# =============================================================================

# Default to Box for all generic media (Images, KYC docs, Avatars)
DEFAULT_FILE_STORAGE = "common.storage.BoxStorage"

# --- Box Storage Settings ---
# We will use either JWT Config Path or Developer Token
BOX_JWT_CONFIG_PATH = config("BOX_JWT_CONFIG_PATH", default="")
BOX_DEVELOPER_TOKEN = config("BOX_DEVELOPER_TOKEN", default="")
BOX_CLIENT_ID = config("BOX_CLIENT_ID", default="")
BOX_CLIENT_SECRET = config("BOX_CLIENT_SECRET", default="")
BOX_ROOT_FOLDER_ID = config("BOX_ROOT_FOLDER_ID", default="0")

# --- S3 Storage Settings (Fallback / Video Storage) ---
AWS_ACCESS_KEY_ID = config("AWS_ACCESS_KEY_ID", default="minioadmin")
AWS_SECRET_ACCESS_KEY = config("AWS_SECRET_ACCESS_KEY", default="minioadmin")
AWS_STORAGE_BUCKET_NAME = config("AWS_STORAGE_BUCKET_NAME", default="javahade-media")
AWS_S3_ENDPOINT_URL = config("AWS_S3_ENDPOINT_URL", default="http://localhost:9000")
AWS_S3_REGION_NAME = config("AWS_S3_REGION_NAME", default="us-east-1")
AWS_S3_FILE_OVERWRITE = False
AWS_DEFAULT_ACL = None
AWS_QUERYSTRING_AUTH = True
AWS_S3_SIGNATURE_VERSION = "s3v4"

# =============================================================================
# Redis PubSub (for Go service notifications)
# =============================================================================

REDIS_PUBSUB_URL = config("REDIS_URL", default="redis://localhost:6379/0")

# =============================================================================
# Groq AI Integration
# =============================================================================
# OpenRouter AI Integration
# Digunakan untuk analisis KYC (KTP & Wajah) dengan Llama Vision
OPENROUTER_API_KEY = config("OPENROUTER_API_KEY", default="")
OPENAI_API_KEY = config("OPENAI_API_KEY", default="")

# External APIs
FREECURRENCY_API_KEY = config("FREECURRENCY_API_KEY", default="")

# =============================================================================
# PAYPAL CONFIGURATION
# =============================================================================
PAYPAL_CLIENT_ID = config("PAYPAL_CLIENT_ID", default="")
PAYPAL_SECRET = config("PAYPAL_SECRET", default="")
PAYPAL_MODE = config("PAYPAL_MODE", default="sandbox") # "sandbox" or "live"

# =============================================================================
# Moderation API Keys
# =============================================================================
OPENAI_API_KEY = config("OPENAI_API_KEY", default="")
GOOGLE_APPLICATION_CREDENTIALS = config("GOOGLE_APPLICATION_CREDENTIALS", default="")

CURRENCY_API_KEY = config("CURRENCY_API_KEY", default="")

# =============================================================================
# VideoSDK
# =============================================================================
VIDEOSDK_TOKEN = config("VIDEOSDK_TOKEN", default="")

# =============================================================================
# Internal Microservice Auth
# =============================================================================
INTERNAL_SERVICE_TOKEN = config("INTERNAL_SERVICE_TOKEN", default="token-rahasia-kreativa-internal")
