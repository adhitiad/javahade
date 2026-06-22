"""
Content models — Post, Comment, Like, Story.
"""

import uuid
from datetime import timedelta

from django.conf import settings
from django.db import models
from django.utils import timezone


from django.core.files.storage import FileSystemStorage
from storages.backends.s3boto3 import S3Boto3Storage
import os

def get_video_storage():
    """Mengembalikan penyimpan khusus untuk video (S3/Lokal, bukan Box)."""
    # Jika berjalan di production (menggunakan AWS S3)
    if os.environ.get("DJANGO_SETTINGS_MODULE") == "config.settings.production":
        return S3Boto3Storage()
    # Secara default di local, gunakan FileSystemStorage agar masuk ke /media/
    return FileSystemStorage()

class Post(models.Model):
    """Content post by a creator."""

    class ContentType(models.TextChoices):
        TEXT = "text", "Text"
        IMAGE = "image", "Image"
        VIDEO = "video", "Video"
        AUDIO = "audio", "Audio"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    objects = models.Manager()

    creator = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="posts",
        limit_choices_to={"role": "host"},
    )
    content_type = models.CharField(
        max_length=10, choices=ContentType.choices, default=ContentType.TEXT
    )
    title = models.CharField(max_length=200, blank=True, default="")
    body = models.TextField(blank=True, default="")
    media_url = models.URLField(blank=True, default="")
    media_file = models.FileField(upload_to="posts/%Y/%m/", blank=True, null=True, storage=get_video_storage)
    thumbnail = models.ImageField(upload_to="thumbnails/%Y/%m/", blank=True, null=True)

    # Monetization
    is_premium = models.BooleanField(
        default=False, help_text="Requires active subscription to view"
    )  # type: ignore
    price_override = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True,
        help_text="One-time purchase price (overrides subscription requirement)"
    )

    # Engagement counters (denormalized for performance)
    like_count = models.PositiveIntegerField(default=0)
    unlike_count = models.PositiveIntegerField(default=0)
    comment_count = models.PositiveIntegerField(default=0)
    view_count = models.PositiveIntegerField(default=0)
    quality_score = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)

    is_published = models.BooleanField(default=True)  # type: ignore
    is_pinned = models.BooleanField(default=False)  # type: ignore
    scheduled_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "posts"
        ordering = ["-quality_score", "-is_pinned", "-created_at"]
        indexes = [
            models.Index(fields=["creator", "-created_at"]),
            models.Index(fields=["-created_at"]),
        ]

    def __str__(self):
        return f"{self.title or 'Untitled'} by {self.creator.username}"


class Comment(models.Model):
    """Comment on a post, supports threading."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    objects = models.Manager()

    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name="comments")
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="comments"
    )
    body = models.TextField(max_length=2000)
    parent = models.ForeignKey(
        "self", on_delete=models.CASCADE, null=True, blank=True,
        related_name="replies",
    )
    like_count = models.PositiveIntegerField(default=0)
    is_deleted = models.BooleanField(default=False)  # type: ignore
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "comments"
        ordering = ["created_at"]

    def __str__(self):
        return f"Comment by {self.user.username} on {self.post_id}"  # type: ignore


class Like(models.Model):
    """Like on a post (one per user per post)."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    objects = models.Manager()

    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name="likes")
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="likes"
    )
    is_unlike = models.BooleanField(default=False, verbose_name="Is Unlike")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "likes"
        unique_together = ["post", "user"]

    def __str__(self):
        return f"{self.user.username} likes {self.post_id}"  # type: ignore


class PostUnlock(models.Model):
    """Tracks users who have purchased a Pay-Per-View (PPV) post."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    objects = models.Manager()

    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name="unlocks")
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="unlocked_posts"
    )
    price_paid = models.DecimalField(max_digits=10, decimal_places=2)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "post_unlocks"
        unique_together = ["post", "user"]

    def __str__(self):
        return f"{self.user.username} unlocked {self.post.title}"


class Story(models.Model):
    """Ephemeral story (expires after 24h)."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    objects = models.Manager()

    creator = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="stories",
        limit_choices_to={"role": "host"},
    )
    media_file = models.FileField(upload_to="stories/%Y/%m/", storage=get_video_storage)
    caption = models.CharField(max_length=300, blank=True, default="")
    view_count = models.PositiveIntegerField(default=0)
    expires_at = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "stories"
        ordering = ["-created_at"]
        verbose_name_plural = "Stories"

    def save(self, *args, **kwargs):
        if not self.expires_at:
            self.expires_at = timezone.now() + timedelta(hours=24)
        super().save(*args, **kwargs)

    @property
    def is_expired(self):
        return timezone.now() > self.expires_at

    def __str__(self):
        return f"Story by {self.creator.username} ({self.created_at})"
