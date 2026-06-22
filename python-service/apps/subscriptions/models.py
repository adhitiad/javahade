"""
Subscription models — SubscriptionTier, Subscription.
"""

import uuid

from django.conf import settings
from django.db import models


class SubscriptionTier(models.Model):
    """Subscription plan offered by a creator."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    creator = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="subscription_tiers",
        limit_choices_to={"role": "host"},
    )
    name = models.CharField(max_length=100, help_text="e.g., Basic, Premium, VIP")
    description = models.TextField(blank=True, default="")
    price = models.DecimalField(max_digits=10, decimal_places=2)
    duration_days = models.PositiveIntegerField(
        default=30, help_text="Duration in days"
    )
    benefits = models.JSONField(
        default=list, blank=True,
        help_text="List of benefit strings"
    )
    is_active = models.BooleanField(default=True)
    sort_order = models.PositiveSmallIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "subscription_tiers"
        ordering = ["sort_order", "price"]
        unique_together = ["creator", "name"]

    def __str__(self):
        return f"{self.name} - ${self.price} ({self.creator.username})"


class Subscription(models.Model):
    """Active subscription between a fan and a creator's tier."""

    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        EXPIRED = "expired", "Expired"
        CANCELLED = "cancelled", "Cancelled"
        PENDING = "pending", "Pending Payment"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    subscriber = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="subscriptions",
    )
    tier = models.ForeignKey(
        SubscriptionTier,
        on_delete=models.CASCADE,
        related_name="subscriptions",
    )
    status = models.CharField(
        max_length=10, choices=Status.choices, default=Status.PENDING
    )
    starts_at = models.DateTimeField(null=True, blank=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    auto_renew = models.BooleanField(default=True)
    payment_ref = models.CharField(max_length=255, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "subscriptions"
        ordering = ["-created_at"]

    def __str__(self):
        return (
            f"{self.subscriber.username} → {self.tier.name} "
            f"({self.tier.creator.username}) [{self.status}]"
        )

    @property
    def is_active(self):
        from django.utils import timezone
        return (
            self.status == self.Status.ACTIVE
            and self.expires_at
            and self.expires_at > timezone.now()
        )

class PlatformRatingAccess(models.Model):
    """
    Paket VIP/Premium bagi User untuk melihat Rating Host.
    """
    class PackageType(models.TextChoices):
        PREMIUM = "premium", "Premium"
        VIP = "vip", "VIP"
        
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="rating_access"
    )
    package_type = models.CharField(max_length=20, choices=PackageType.choices)
    expires_at = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "platform_rating_access"

    def __str__(self):
        return f"{self.user.username} - {self.package_type}"
        
    @property
    def is_active(self):
        from django.utils import timezone
        return self.expires_at and self.expires_at > timezone.now()

class CreatorShare(models.Model):
    """
    Kepemilikan Saham Penonton terhadap Host.
    Digunakan untuk bagi hasil (dividen) dari saweran.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    investor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="shares_owned"
    )
    creator = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="shares_issued",
        limit_choices_to={"role": "host"}
    )
    shares_count = models.PositiveIntegerField(default=0)
    total_dividends_earned = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "creator_shares"
        unique_together = ["investor", "creator"]

    def __str__(self):
        return f"{self.investor.username} owns {self.shares_count} shares of {self.creator.username}"

class ChatAccess(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='chat_accesses_bought')
    host = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='chat_accesses_sold')
    price_paid = models.DecimalField(max_digits=12, decimal_places=2)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'chat_accesses'
        unique_together = ['user', 'host']

    def __str__(self):
        return f'{self.user.username} unlocked chat with {self.host.username}'

