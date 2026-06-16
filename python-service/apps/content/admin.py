"""Content admin configuration."""
from django.contrib import admin
from .models import Post, Comment, Like, Story

@admin.register(Post)
class PostAdmin(admin.ModelAdmin):
    list_display = ["title", "creator", "content_type", "is_premium", "like_count", "view_count", "created_at"]
    list_filter = ["content_type", "is_premium", "is_published"]
    search_fields = ["title", "body", "creator__username"]

@admin.register(Comment)
class CommentAdmin(admin.ModelAdmin):
    list_display = ["user", "post", "body", "is_deleted", "created_at"]
    list_filter = ["is_deleted"]

@admin.register(Like)
class LikeAdmin(admin.ModelAdmin):
    list_display = ["user", "post", "created_at"]

@admin.register(Story)
class StoryAdmin(admin.ModelAdmin):
    list_display = ["creator", "caption", "view_count", "expires_at", "created_at"]
