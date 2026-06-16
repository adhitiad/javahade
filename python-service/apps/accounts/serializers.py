"""
Accounts serializers — registration, login, user profiles.
"""

from django.contrib.auth import get_user_model
from rest_framework import serializers

from .models import CreatorProfile, KYCDocument

User = get_user_model()


class RegisterSerializer(serializers.ModelSerializer):
    """User registration serializer."""

    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = [
            "id", "username", "email", "password", "password_confirm",
            "date_of_birth",
        ]
        read_only_fields = ["id"]

    def validate(self, attrs):
        if attrs["password"] != attrs.pop("password_confirm"):
            raise serializers.ValidationError(
                {"password_confirm": "Passwords do not match."}
            )
        return attrs

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data["username"],
            email=validated_data["email"],
            password=validated_data["password"],
            date_of_birth=validated_data.get("date_of_birth"),
        )
        return user


class UserSerializer(serializers.ModelSerializer):
    """Full user profile serializer."""

    has_creator_profile = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id", "username", "email", "avatar", "bio", "role",
            "is_verified", "date_of_birth", "phone",
            "has_creator_profile", "date_joined", "updated_at",
        ]
        read_only_fields = ["id", "role", "is_verified", "date_joined"]

    def get_has_creator_profile(self, obj):
        return hasattr(obj, "creator_profile")


class UserPublicSerializer(serializers.ModelSerializer):
    """Public user profile (limited fields)."""

    class Meta:
        model = User
        fields = ["id", "username", "avatar", "bio", "role", "is_verified"]


class CreatorProfileSerializer(serializers.ModelSerializer):
    """Creator profile serializer."""

    user = UserPublicSerializer(read_only=True)
    username = serializers.CharField(source="user.username", read_only=True)

    class Meta:
        model = CreatorProfile
        fields = [
            "id", "user", "username", "display_name", "category",
            "cover_image", "subscription_price", "subscriber_count",
            "is_approved", "website", "social_links",
            "created_at", "updated_at",
        ]
        read_only_fields = [
            "id", "subscriber_count", "is_approved", "created_at", "updated_at",
        ]


class CreatorProfileDetailSerializer(CreatorProfileSerializer):
    """Creator profile with earnings (only for owner)."""

    class Meta(CreatorProfileSerializer.Meta):
        fields = CreatorProfileSerializer.Meta.fields + [
            "earnings_balance", "total_earnings",
        ]


class CreatorApplySerializer(serializers.ModelSerializer):
    """Serializer for applying to become a creator."""

    class Meta:
        model = CreatorProfile
        fields = [
            "display_name", "category", "subscription_price",
            "website", "social_links",
        ]


class KYCDocumentSerializer(serializers.ModelSerializer):
    """KYC document serializer."""

    class Meta:
        model = KYCDocument
        fields = [
            "id", "document_type", "document_file", "status",
            "submitted_at", "reviewed_at",
        ]
        read_only_fields = ["id", "status", "submitted_at", "reviewed_at"]
