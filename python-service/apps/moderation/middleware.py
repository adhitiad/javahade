import json
from django.utils.deprecation import MiddlewareMixin
from apps.moderation.models import AuditLog

class AuditLogMiddleware(MiddlewareMixin):
    """
    Middleware untuk merekam aktivitas pengguna (Audit Trail).
    Merekam aktivitas sensitif seperti: POST/PUT/DELETE, login, transaksi, dsb.
    """
    def process_response(self, request, response):
        # Hanya record jika user login
        if not hasattr(request, 'user') or not request.user.is_authenticated:
            return response
            
        # Hanya log POST, PUT, DELETE, PATCH, dan akses dashboard admin
        if request.method in ["POST", "PUT", "DELETE", "PATCH"] or request.path.startswith("/admin-dashboard/"):
            
            # Abaikan endpoint yang terlalu berisik (noisy)
            if "/chat/" in request.path or "/chart-data/" in request.path or "/ping/" in request.path:
                return response
                
            # Tentukan tipe aksi berdasarkan URL
            action_type = AuditLog.ActionType.OTHER
            if "login" in request.path or "register" in request.path or "password" in request.path:
                action_type = AuditLog.ActionType.AUTH
            elif "wallet" in request.path or "withdraw" in request.path or "topup" in request.path or "package" in request.path:
                action_type = AuditLog.ActionType.FINANCE
            elif "kyc" in request.path or "report" in request.path or "ban" in request.path:
                action_type = AuditLog.ActionType.MODERATION
            elif "admin-dashboard" in request.path:
                action_type = AuditLog.ActionType.SYSTEM
                
            # Ambil IP address
            x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
            if x_forwarded_for:
                ip = x_forwarded_for.split(',')[0]
            else:
                ip = request.META.get('REMOTE_ADDR')
                
            # Log detail aksi
            desc = f"Method: {request.method} | Path: {request.path} | Status Code: {response.status_code}"
            
            AuditLog.objects.create(
                user=request.user,
                action_type=action_type,
                description=desc,
                ip_address=ip
            )
            
        return response
