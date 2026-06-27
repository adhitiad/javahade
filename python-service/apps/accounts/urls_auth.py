"""
Auth URL patterns — register, login (JWT), refresh.
"""

from django.urls import path
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
)

from .views import RegisterView, CustomCookieLoginView, LogoutAllDevicesView, CustomCookieTokenRefreshView, SocialLoginView
from .views_2fa import setup_2fa, enable_2fa, disable_2fa

urlpatterns = [
    path("register/", RegisterView.as_view(), name="auth-register"),
    path("login/", CustomCookieLoginView.as_view(), name="auth-login"),
    path("social-login/", SocialLoginView.as_view(), name="auth-social-login"),
    path("refresh/", CustomCookieTokenRefreshView.as_view(), name="auth-refresh"),
    path("logout-all/", LogoutAllDevicesView.as_view(), name="auth-logout-all"),
    path("2fa/setup/", setup_2fa, name="auth-2fa-setup"),
    path("2fa/enable/", enable_2fa, name="auth-2fa-enable"),
    path("2fa/disable/", disable_2fa, name="auth-2fa-disable"),
]
