import json
import logging
import uuid
from django.utils import timezone

class JSONFormatter(logging.Formatter):
    """
    Formatter kustom untuk mengeluarkan log dalam format JSON.
    Termasuk PII Masking dan X-Request-ID (Correlation ID).
    """
    def format(self, record):
        log_record = {
            "timestamp": timezone.now().isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }

        # Masking PII Data
        msg = log_record["message"]
        if "password" in msg.lower() or "token" in msg.lower():
            log_record["message"] = "*** PII MASKED ***"

        # Correlation ID
        if hasattr(record, 'request_id'):
            log_record["request_id"] = record.request_id

        if record.exc_info:
            log_record["exception"] = self.formatException(record.exc_info)

        return json.dumps(log_record)


import threading
_local = threading.local()

class CorrelationIDMiddleware:
    """
    Middleware untuk menangkap X-Request-ID dari headers (atau membuatnya jika belum ada).
    """
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
        _local.request_id = request_id
        
        response = self.get_response(request)
        response["X-Request-ID"] = request_id
        return response

class RequestIDFilter(logging.Filter):
    """Filter untuk menyuntikkan request_id ke dalam record log."""
    def filter(self, record):
        record.request_id = getattr(_local, 'request_id', 'system')
        return True
