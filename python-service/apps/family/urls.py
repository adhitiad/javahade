from django.urls import path
from .views import (
    FamilyCreateView, FamilyListView, FamilyDetailView,
    FamilyInviteView, FamilyJoinView, FamilyMemberListView,
    FamilyFeedView, FamilyShareContentView,
)

urlpatterns = [
    path("", FamilyListView.as_view(), name="family-list"),
    path("create/", FamilyCreateView.as_view(), name="family-create"),
    path("join/<str:code>/", FamilyJoinView.as_view(), name="family-join"),
    path("<uuid:id>/", FamilyDetailView.as_view(), name="family-detail"),
    path("<uuid:id>/invite/", FamilyInviteView.as_view(), name="family-invite"),
    path("<uuid:id>/members/", FamilyMemberListView.as_view(), name="family-members"),
    path("<uuid:id>/feed/", FamilyFeedView.as_view(), name="family-feed"),
    path("<uuid:id>/share/", FamilyShareContentView.as_view(), name="family-share"),
]
