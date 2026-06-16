"""
Content serializers.
"""

from django.contrib.auth import get_user_model
from rest_framework import serializers

from apps.accounts.serializers import UserPublicSerializer

from .models import Comment, Like, Post, Story

User = get_user_model()


class PostSerializer(serializers.ModelSerializer):
    """Post serializer with creator info and engagement status."""

    creator = UserPublicSerializer(read_only=True)
    is_liked = serializers.SerializerMethodField()
    is_unliked = serializers.SerializerMethodField()

    class Meta:
        model = Post
        fields = [
            "id", "creator", "content_type", "title", "body",
            "media_url", "media_file", "thumbnail",
            "is_premium", "price_override",
            "like_count", "unlike_count", "comment_count", "view_count",
            "quality_score",
            "is_published", "is_pinned", "scheduled_at",
            "is_liked", "is_unliked", "created_at", "updated_at",
        ]
        read_only_fields = [
            "id", "like_count", "unlike_count", "comment_count", "view_count",
            "quality_score",
            "created_at", "updated_at",
        ]

    def get_is_liked(self, obj):
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            return Like.objects.filter(post=obj, user=request.user, is_unlike=False).exists()
        return False

    def get_is_unliked(self, obj):
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            return Like.objects.filter(post=obj, user=request.user, is_unlike=True).exists()
        return False


class PostCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating/updating posts."""

    class Meta:
        model = Post
        fields = [
            "content_type", "title", "body", "media_url", "media_file",
            "thumbnail", "is_premium", "price_override",
            "is_published", "is_pinned", "scheduled_at",
        ]


class CommentSerializer(serializers.ModelSerializer):
    """Comment serializer with user info and reply support."""

    user = UserPublicSerializer(read_only=True)
    reply_count = serializers.SerializerMethodField()

    class Meta:
        model = Comment
        fields = [
            "id", "post", "user", "body", "parent",
            "like_count", "reply_count",
            "is_deleted", "created_at", "updated_at",
        ]
        read_only_fields = [
            "id", "post", "like_count", "is_deleted",
            "created_at", "updated_at",
        ]

    def get_reply_count(self, obj):
        return obj.replies.count()


class StorySerializer(serializers.ModelSerializer):
    """Story serializer."""

    creator = UserPublicSerializer(read_only=True)
    is_expired = serializers.BooleanField(read_only=True)

    class Meta:
        model = Story
        fields = [
            "id", "creator", "media_file", "caption",
            "view_count", "expires_at", "is_expired", "created_at",
        ]
        read_only_fields = ["id", "view_count", "expires_at", "is_expired", "created_at"]
