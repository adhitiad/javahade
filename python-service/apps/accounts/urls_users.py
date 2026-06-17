"""
User URL patterns — profile management.
"""

from django.urls import path

from .views import UserDetailView, UserMeView, UserDeleteView, UserExportView, UserConsentView, PrivacyDisclosureView

urlpatterns = [
    path("me/", UserMeView.as_view(), name="user-me"),
    path("me/delete/", UserDeleteView.as_view(), name="user-delete"),
    path("me/export/", UserExportView.as_view(), name="user-export"),
    path("me/consent/", UserConsentView.as_view(), name="user-consent"),
    path("privacy-policy/", PrivacyDisclosureView.as_view(), name="privacy-policy"),
    path("<uuid:id>/", UserDetailView.as_view(), name="user-detail"),
]
