"""
Auth URL patterns — register, login (JWT), refresh.
"""

from django.urls import path
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)

from .views import RegisterView, CustomCookieLoginView, LogoutAllDevicesView

urlpatterns = [
    path("register/", RegisterView.as_view(), name="auth-register"),
    path("login/", CustomCookieLoginView.as_view(), name="auth-login"),
    path("refresh/", TokenRefreshView.as_view(), name="auth-refresh"),
    path("logout-all/", LogoutAllDevicesView.as_view(), name="auth-logout-all"),
]
