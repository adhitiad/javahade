"""
Kreativa Platform — Development Settings
"""

from .base import *  # noqa: F401, F403

DEBUG = True

# In development, also allow browsable API
REST_FRAMEWORK["DEFAULT_RENDERER_CLASSES"] = (  # noqa: F405
    "rest_framework.renderers.JSONRenderer",
    "rest_framework.renderers.BrowsableAPIRenderer",
)

# Use console email backend in development
EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"

# Use local file storage instead of S3 in dev (unless MinIO is running)
# Comment out the next 2 lines if you have MinIO running locally
DEFAULT_FILE_STORAGE = "django.core.files.storage.FileSystemStorage"

# Additional dev-only apps
# INSTALLED_APPS += ["debug_toolbar"]

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "verbose": {
            "format": "[{asctime}] {levelname} {name} {message}",
            "style": "{",
        },
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "verbose",
        },
    },
    "root": {
        "handlers": ["console"],
        "level": "INFO",
    },
    "loggers": {
        "django": {
            "handlers": ["console"],
            "level": "INFO",
            "propagate": False,
        },
        "apps": {
            "handlers": ["console"],
            "level": "DEBUG",
            "propagate": False,
        },
    },
}
