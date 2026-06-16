"""
Custom middleware for the Kreativa API.
"""

import json
import logging
import time

from django.utils.deprecation import MiddlewareMixin

logger = logging.getLogger(__name__)


class RequestLoggingMiddleware(MiddlewareMixin):
    """Log request method, path, status, and duration."""

    def process_request(self, request):
        request._start_time = time.monotonic()

    def process_response(self, request, response):
        duration = time.monotonic() - getattr(request, "_start_time", time.monotonic())
        logger.info(
            "%s %s %s %.3fs",
            request.method,
            request.get_full_path(),
            response.status_code,
            duration,
        )
        return response


class JSONErrorMiddleware(MiddlewareMixin):
    """Return JSON error responses for 4xx/5xx instead of HTML."""

    def process_response(self, request, response):
        if (
            response.status_code >= 400
            and "application/json" not in response.get("Content-Type", "")
            and request.path.startswith("/api/")
        ):
            from django.http import JsonResponse

            return JsonResponse(
                {
                    "error": True,
                    "status_code": response.status_code,
                    "detail": response.reason_phrase,
                },
                status=response.status_code,
            )
        return response
