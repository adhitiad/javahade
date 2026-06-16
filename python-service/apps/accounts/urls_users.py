"""
User URL patterns — profile management.
"""

from django.urls import path

from .views import UserDetailView, UserMeView

urlpatterns = [
    path("me/", UserMeView.as_view(), name="user-me"),
    path("<uuid:id>/", UserDetailView.as_view(), name="user-detail"),
]
