from django.shortcuts import redirect
from django.urls import reverse
# pyrefly: ignore [missing-import]
from apps.accounts.models import User

class RoleRedirectMiddleware:
    """
    Middleware yang secara ketat mencegah user mengakses halaman yang tidak sesuai dengan perannya.
    Mencegah User masuk ke halaman Host/Admin, dan sebagainya.
    """
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.user.is_authenticated:
            path = request.path
            role = request.user.role
            
            # --- 1. PROTEKSI AREA ADMIN ---
            if path.startswith('/admin-dashboard/') or path.startswith('/admin/'):
                if role not in [User.Role.ADMIN, User.Role.SUPERADMIN]:
                    return redirect('core_ui:index')
                    
            # --- 2. PROTEKSI AREA HOST ---
            # Dashboard utama Host
            try:
                dashboard_url = reverse('booking:dashboard')
            except Exception:
                dashboard_url = "/booking/"
                
            # Identifikasi path yang HANYA untuk Host / Admin
            is_host_only = (
                path == dashboard_url or
                path.startswith('/booking/host/') or
                path.startswith('/host/tiers/') or
                path.startswith('/host/edit/') or
                path.startswith('/booking/create/') or
                path.startswith('/booking/rooms/')
            )
            
            if is_host_only:
                if role != User.Role.HOST:
                    # Jika User mencoba akses area Host, lempar ke Feed
                    return redirect('core_ui:index')
                    
        response = self.get_response(request)
        return response
