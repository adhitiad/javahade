"""
Javahade Platform — URL Configuration
"""

from django.contrib import admin
from django.urls import include, path
from django.views.generic import RedirectView

urlpatterns = [
    # Root: Landing & Feed (OnlyFans style)
    path("", include("apps.core_ui.urls")),
    # Admin
    path("admin/", admin.site.urls),
    # Booking Frontend (Django templates + Tailwind CSS)
    path("booking/", include("apps.booking.urls")),
    # Streaming UI Frontend
    path("streaming/", include("apps.streaming_ui.urls")),
    # API v1
    path("api/v1/auth/", include("apps.accounts.urls_auth")),
    path("api/v1/users/", include("apps.accounts.urls_users")),
    path("api/v1/creators/", include("apps.accounts.urls_creators")),
    path("api/v1/posts/", include("apps.content.urls")),
    path("api/v1/subscriptions/", include("apps.subscriptions.urls")),
    path("api/v1/payments/", include("apps.payments.urls")),
    path("api/v1/families/", include("apps.family.urls")),
    path("api/v1/notifications/", include("apps.notifications.urls")),
    path("api/v1/moderation/", include("apps.moderation.urls")),
    path("api/v1/admin/", include("config.urls_admin")),
    
    # SEO Routes
    path("robots.txt", RedirectView.as_view(url='/static/robots.txt', permanent=True)),
    path("sitemap.xml", RedirectView.as_view(url='/static/sitemap.xml', permanent=True)),
]

from django.conf import settings
from django.conf.urls.static import static

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
