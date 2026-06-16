"""
Content URL patterns.
"""

from django.urls import path

from .views import (
    CommentListCreateView,
    CreatorPostListView,
    PostCreateView,
    PostDetailView,
    PostFeedView,
    PostLikeToggleView,
    PostUnlikeToggleView,
    StoryCreateView,
    StoryListView,
    AIHighlightWebhookView
)

urlpatterns = [
    path("feed/", PostFeedView.as_view(), name="post-feed"),
    path("", PostCreateView.as_view(), name="post-create"),
    path("<uuid:id>/", PostDetailView.as_view(), name="post-detail"),
    path("<uuid:id>/like/", PostLikeToggleView.as_view(), name="post-like"),
    path("<uuid:id>/unlike/", PostUnlikeToggleView.as_view(), name="post-unlike"),
    path("<uuid:id>/comments/", CommentListCreateView.as_view(), name="post-comments"),
    path("creator/<str:username>/", CreatorPostListView.as_view(), name="creator-posts"),
    path("stories/", StoryListView.as_view(), name="story-list"),
    path("stories/create/", StoryCreateView.as_view(), name="story-create"),
    path("ai-highlight-webhook/", AIHighlightWebhookView.as_view(), name="ai-highlight-webhook"),
]
