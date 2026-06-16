"""
Family models — FamilyGroup, FamilyMember, FamilyContent.
"""

import uuid
import secrets

from django.conf import settings
from django.db import models


class FamilyGroup(models.Model):
    """Family group — a private community of fans/creators."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    description = models.TextField(max_length=1000, blank=True, default="")
    avatar = models.ImageField(upload_to="families/%Y/%m/", blank=True, null=True)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name="owned_families",
    )
    max_members = models.PositiveIntegerField(default=50)
    is_private = models.BooleanField(default=True)
    invite_code = models.CharField(max_length=20, unique=True, blank=True)
    member_count = models.PositiveIntegerField(default=1)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "family_groups"
        ordering = ["-created_at"]

    def save(self, *args, **kwargs):
        if not self.invite_code:
            self.invite_code = secrets.token_urlsafe(8)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.name} (by {self.owner.username})"


class FamilyMember(models.Model):
    """Membership in a family group."""

    class Role(models.TextChoices):
        OWNER = "owner", "Owner"
        ADMIN = "admin", "Admin"
        MEMBER = "member", "Member"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    family = models.ForeignKey(
        FamilyGroup, on_delete=models.CASCADE, related_name="members"
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name="family_memberships",
    )
    role = models.CharField(max_length=10, choices=Role.choices, default=Role.MEMBER)
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "family_members"
        unique_together = ["family", "user"]
        ordering = ["joined_at"]

    def __str__(self):
        return f"{self.user.username} in {self.family.name} ({self.role})"


class FamilyContent(models.Model):
    """Content shared to a family group."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    family = models.ForeignKey(
        FamilyGroup, on_delete=models.CASCADE, related_name="shared_content"
    )
    post = models.ForeignKey(
        "content.Post", on_delete=models.CASCADE, related_name="family_shares"
    )
    shared_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name="family_shared_posts",
    )
    message = models.CharField(max_length=500, blank=True, default="")
    shared_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "family_content"
        ordering = ["-shared_at"]
        unique_together = ["family", "post"]

    def __str__(self):
        return f"Post {self.post_id} shared to {self.family.name}"
