"""
Subscription serializers.
"""

from rest_framework import serializers
from apps.accounts.serializers import UserPublicSerializer
from .models import SubscriptionTier, Subscription


class SubscriptionTierSerializer(serializers.ModelSerializer):
    creator_username = serializers.CharField(source="creator.username", read_only=True)

    class Meta:
        model = SubscriptionTier
        fields = [
            "id", "creator", "creator_username", "name", "description",
            "price", "duration_days", "benefits", "is_active",
            "sort_order", "created_at",
        ]
        read_only_fields = ["id", "creator", "created_at"]


class SubscriptionSerializer(serializers.ModelSerializer):
    tier = SubscriptionTierSerializer(read_only=True)
    subscriber = UserPublicSerializer(read_only=True)
    is_active = serializers.BooleanField(read_only=True)

    class Meta:
        model = Subscription
        fields = [
            "id", "subscriber", "tier", "status",
            "starts_at", "expires_at", "auto_renew",
            "is_active", "created_at",
        ]
        read_only_fields = [
            "id", "status", "starts_at", "expires_at", "created_at",
        ]


class SubscribeSerializer(serializers.Serializer):
    tier_id = serializers.UUIDField()
    auto_renew = serializers.BooleanField(default=True)
