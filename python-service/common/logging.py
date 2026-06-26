import json
import logging
import uuid
import re
from django.utils import timezone
from opentelemetry import trace

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
        
        # Mask Emails: a***@domain.com
        msg = re.sub(r'([a-zA-Z0-9_.+-])[a-zA-Z0-9_.+-]+@([a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+)', r'\1***@\2', msg)
        
        # Mask Phone/NIK (10+ consecutive digits): +62***890
        msg = re.sub(r'(\+?\d{2})\d{5,}(\d{3})', r'\1***\2', msg)

        if "password" in msg.lower() or "token" in msg.lower():
            msg = "*** PII MASKED ***"
            
        log_record["message"] = msg

        # Correlation ID
        request_id = getattr(record, 'request_id', None)
        if request_id:
            log_record["request_id"] = request_id
            
        user_id = getattr(record, 'user_id', None)
        if user_id:
            log_record["user_id"] = user_id

        if record.exc_info:
            log_record["exception"] = self.formatException(record.exc_info)

        # OpenTelemetry Trace ID injection
        current_span = trace.get_current_span()
        if current_span and current_span.is_recording():
            log_record["trace_id"] = format(current_span.get_span_context().trace_id, "032x")
            log_record["span_id"] = format(current_span.get_span_context().span_id, "016x")

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
        
        if hasattr(request, 'user') and request.user.is_authenticated:
            _local.user_id = str(request.user.id)
        else:
            _local.user_id = 'anonymous'
        
        response = self.get_response(request)
        response["X-Request-ID"] = request_id
        return response

class RequestIDFilter(logging.Filter):
    """Filter untuk menyuntikkan request_id ke dalam record log."""
    def filter(self, record):
        record.request_id = getattr(_local, 'request_id', 'system')
        record.user_id = getattr(_local, 'user_id', 'anonymous')
        return True
