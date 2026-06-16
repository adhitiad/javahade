"""
User URL patterns — profile management.
"""

from django.urls import path

from .views import UserDetailView, UserMeView, UserDeleteView

urlpatterns = [
    path("me/", UserMeView.as_view(), name="user-me"),
    path("me/delete/", UserDeleteView.as_view(), name="user-delete"),
    path("<uuid:id>/", UserDetailView.as_view(), name="user-detail"),
]
