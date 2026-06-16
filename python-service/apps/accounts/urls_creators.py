"""
Creator URL patterns — listing, detail, apply, own profile.
"""

from django.urls import path

from .views import CreatorApplyView, CreatorDetailView, CreatorListView, CreatorMeView

urlpatterns = [
    path("", CreatorListView.as_view(), name="creator-list"),
    path("apply/", CreatorApplyView.as_view(), name="creator-apply"),
    path("me/", CreatorMeView.as_view(), name="creator-me"),
    path("<str:username>/", CreatorDetailView.as_view(), name="creator-detail"),
]
