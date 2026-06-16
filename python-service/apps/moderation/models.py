"""Moderation models."""
import uuid
from django.conf import settings
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from django.db import models


class Report(models.Model):
    class Reason(models.TextChoices):
        SPAM = "spam", "Spam"
        HARASSMENT = "harassment", "Harassment"
        INAPPROPRIATE = "inappropriate", "Inappropriate Content"
        COPYRIGHT = "copyright", "Copyright Violation"
        IMPERSONATION = "impersonation", "Impersonation"
        OTHER = "other", "Other"

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        REVIEWED = "reviewed", "Reviewed"
        ACTIONED = "actioned", "Actioned"
        DISMISSED = "dismissed", "Dismissed"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    reporter = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="reports_filed"
    )
    # Generic FK to report any content type
    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE)
    object_id = models.UUIDField()
    content_object = GenericForeignKey("content_type", "object_id")

    reason = models.CharField(max_length=20, choices=Reason.choices)
    description = models.TextField(max_length=2000, blank=True, default="")
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.PENDING)
    moderator_notes = models.TextField(blank=True, default="")
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name="reports_reviewed",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "reports"
        ordering = ["-created_at"]

    def __str__(self):
        return f"Report [{self.reason}] by {self.reporter.username} ({self.status})"

class AuditLog(models.Model):
    """
    Model untuk menyimpan rekam jejak (Event Logs / Audit Trail) aktivitas sistem.
    """
    class ActionType(models.TextChoices):
        AUTH = "auth", "Authentication (Login/Register)"
        FINANCE = "finance", "Finance (Topup/Withdraw/Subscription)"
        MODERATION = "moderation", "Moderation (Ban/KYC)"
        SYSTEM = "system", "System Action"
        OTHER = "other", "Other"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="audit_logs")
    action_type = models.CharField(max_length=20, choices=ActionType.choices, default=ActionType.OTHER)
    description = models.TextField()
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "audit_logs"
        ordering = ["-created_at"]

    def __str__(self):
        return f"[{self.action_type}] {self.user} - {self.created_at}"
