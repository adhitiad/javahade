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

class RateLimitMiddleware(MiddlewareMixin):
    """
    Rate limiting middleware.
    Menggunakan kombinasi Device ID (dari cookie) dan data User-Agent.
    (MAC Address tidak bisa diambil dari Backend web karena batasan jaringan OSI layer 3).
    """
    def process_request(self, request):
        from django.core.cache import cache
        from django.http import JsonResponse, HttpResponseForbidden
        import uuid
        import hashlib
        from user_agents import parse
        
        # Kecualikan path statis
        if request.path.startswith('/static/') or request.path.startswith('/media/'):
            return None
            
        # Parse Device Info dari User-Agent
        ua_string = request.META.get('HTTP_USER_AGENT', '')
        user_agent = parse(ua_string)
        
        # Deteksi tipe device (Mobile, Tablet, PC/Desktop)
        device_type = "Unknown"
        if user_agent.is_mobile:
            device_type = "Mobile"
        elif user_agent.is_tablet:
            device_type = "Tablet"
        elif user_agent.is_pc:
            device_type = "PC/Desktop"
            
        device_os = user_agent.os.family # e.g. iOS, Android, Windows
        device_name = f"{device_type} ({device_os})"
        
        # Ambil atau buat Device ID dari Cookie
        device_id = request.COOKIES.get('device_id')
        if not device_id:
            device_id = str(uuid.uuid4())
            # Simpan state agar bisa di-set ke cookie nanti di process_response
            request._new_device_id = device_id 
            
        # Gabungkan Device ID dan User-Agent (fingerprint)
        fingerprint = f"{device_id}_{ua_string}"
        hashed_fp = hashlib.md5(fingerprint.encode()).hexdigest()
        
        cache_key = f"ratelimit_device_{hashed_fp}"
        
        # Batasan: 100 request per menit per Device
        RATE_LIMIT = 100
        TIMEOUT = 60
        
        request_count = cache.get(cache_key, 0)
        
        if request_count >= RATE_LIMIT:
            msg = f"Too Many Requests. Device Anda ({device_name}) dibatasi."
            if request.path.startswith('/api/'):
                return JsonResponse({"error": msg, "retry_after": TIMEOUT}, status=429)
            else:
                return HttpResponseForbidden(msg)
                
        cache.set(cache_key, request_count + 1, TIMEOUT)
        return None

    def process_response(self, request, response):
        # Set cookie device_id jika baru pertama kali dibuat
        if hasattr(request, '_new_device_id'):
            response.set_cookie(
                'device_id', 
                request._new_device_id, 
                max_age=31536000, # 1 tahun
                httponly=True, 
                samesite='Lax'
            )
        return response

class GeoBlockingMiddleware(MiddlewareMixin):
    """
    Middleware untuk memblokir akses dari negara tertentu.
    Menggunakan Header HTTP_CF_IPCOUNTRY dari Cloudflare atau X-Real-IP.
    """
    def process_request(self, request):
        from django.http import HttpResponseForbidden
        from django.conf import settings

        # Daftar kode negara yang DIBLOKIR (ISO 3166-1 alpha-2)
        # Misal: memblokir negara 'KP' (Korea Utara) atau 'RU' (Rusia) 
        # Bisa juga dibuat sebagai whitelist (hanya ID, SG, MY).
        BLOCKED_COUNTRIES = getattr(settings, 'GEO_BLOCKED_COUNTRIES', ['KP', 'RU', 'IR', 'CU'])

        # Cek Header dari Cloudflare
        country_code = request.META.get('HTTP_CF_IPCOUNTRY')
        
        if country_code and country_code.upper() in BLOCKED_COUNTRIES:
            return HttpResponseForbidden(f"Access Denied: Layanan tidak tersedia untuk region Anda ({country_code}).")
            
        return None
