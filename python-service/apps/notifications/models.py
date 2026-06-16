"""Notification models."""

import uuid
from django.conf import settings
from django.db import models


class Notification(models.Model):
    class NotificationType(models.TextChoices):
        NEW_SUBSCRIBER = "new_subscriber", "New Subscriber"
        NEW_LIKE = "new_like", "New Like"
        NEW_COMMENT = "new_comment", "New Comment"
        NEW_POST = "new_post", "New Post"
        NEW_MESSAGE = "new_message", "New Message"
        FAMILY_INVITE = "family_invite", "Family Invite"
        FAMILY_JOIN = "family_join", "Family Join"
        NEW_HOST_BOOKING = "new_host_booking", "New Host Booking"
        BOOKING_CONFIRMED = "booking_confirmed", "Booking Confirmed"
        BOOKING_CANCELLED = "booking_cancelled", "Booking Cancelled"
        STREAM_STARTED = "stream_started", "Stream Started"
        PAYOUT_COMPLETED = "payout_completed", "Payout Completed"
        SYSTEM = "system", "System"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name="notifications",
    )
    type = models.CharField(max_length=30, choices=NotificationType.choices)
    title = models.CharField(max_length=200)
    body = models.TextField(max_length=1000, blank=True, default="")
    data = models.JSONField(default=dict, blank=True)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "notifications"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["user", "-created_at"]),
            models.Index(fields=["user", "is_read"]),
        ]

    def __str__(self):
        return f"[{self.type}] {self.title} → {self.user.username}"
