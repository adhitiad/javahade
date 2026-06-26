"""
Accounts serializers — registration, login, user profiles.
"""

from django.contrib.auth import get_user_model
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import CreatorProfile, KYCDocument

User = get_user_model()


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    _current_request = None

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)

        # Add custom claims
        token["role"] = user.role
        token["username"] = user.username
        token["jwt_secret_version"] = user.jwt_secret_version

        # Get request to compute device fingerprint
        request = getattr(cls, "_current_request", None)
        if request:
            import hashlib

            user_agent = request.META.get("HTTP_USER_AGENT", "")
            ip = request.META.get("REMOTE_ADDR", "")
            raw_fp = f"{user.id}-{user_agent}-{ip}"
            token["device_fingerprint"] = hashlib.sha256(raw_fp.encode()).hexdigest()

        return token

    def validate(self, attrs):
        self.__class__._current_request = self.context.get("request")
        try:
            data = super().validate(attrs)
        finally:
            self.__class__._current_request = None
        return data


class RegisterSerializer(serializers.ModelSerializer):
    """User registration serializer."""

    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True)
    date_of_birth = serializers.DateField(required=True)

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "password",
            "password_confirm",
            "date_of_birth",
            "gender",
        ]
        read_only_fields = ["id"]

    def validate(self, attrs):
        from datetime import date

        if attrs["password"] != attrs.pop("password_confirm"):
            raise serializers.ValidationError(
                {"password_confirm": "Passwords do not match."}
            )

        # Age Verification (18+)
        dob = attrs.get("date_of_birth")
        if dob:
            today = date.today()
            age = (
                today.year
                - dob.year
                - ((today.month, today.day) < (dob.month, dob.day))
            )
            if age < 18:
                raise serializers.ValidationError(
                    {
                        "date_of_birth": "Anda harus berusia minimal 18 tahun untuk mendaftar."
                    }
                )

        return attrs

    def create(self, validated_data):
        user = User.objects.create_user(  # type: ignore
            username=validated_data["username"],
            email=validated_data["email"],
            password=validated_data["password"],
            date_of_birth=validated_data.get("date_of_birth"),
            gender=validated_data.get("gender", "U"),
        )
        return user


class UserSerializer(serializers.ModelSerializer):
    """Full user profile serializer."""

    has_creator_profile = serializers.SerializerMethodField()
    created_at = serializers.DateTimeField(source="date_joined", read_only=True)

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "avatar",
            "bio",
            "role",
            "gender",
            "is_verified",
            "date_of_birth",
            "has_creator_profile",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "role", "is_verified", "created_at"]

    def get_has_creator_profile(self, obj):
        return hasattr(obj, "creator_profile")

    def update(self, instance, validated_data):
        avatar = validated_data.get("avatar")
        if avatar:
            # pyrefly: ignore [missing-import]
            from apps.moderation.services import ContentModerationService
            from django.core.exceptions import ValidationError
            from rest_framework.exceptions import ValidationError as DRFValidationError

            try:
                ContentModerationService.check_content(image_file=avatar)
            except ValidationError as e:
                raise DRFValidationError({"avatar": str(e.message)})

        return super().update(instance, validated_data)


class UserPublicSerializer(serializers.ModelSerializer):
    """Public user profile (limited fields)."""

    class Meta:
        model = User
        fields = ["id", "username", "avatar", "bio", "role", "is_verified"]


class CreatorProfileBasicSerializer(serializers.ModelSerializer):
    """Basic creator profile for universal profile endpoint."""
    
    class Meta:
        model = CreatorProfile
        fields = [
            "id", "display_name", "category", "cover_image", 
            "subscription_price", "subscriber_count", "is_approved", 
            "website", "social_links", "created_at"
        ]


class UserProfileUniversalSerializer(UserPublicSerializer):
    """Universal profile combining User and optionally CreatorProfile."""
    
    creator_profile = CreatorProfileBasicSerializer(read_only=True)

    class Meta(UserPublicSerializer.Meta):
        fields = UserPublicSerializer.Meta.fields + ["creator_profile"]


class CreatorProfileSerializer(serializers.ModelSerializer):
    """Creator profile serializer."""

    user = UserPublicSerializer(read_only=True)
    username = serializers.CharField(source="user.username", read_only=True)

    class Meta:
        model = CreatorProfile
        fields = [
            "id",
            "user",
            "username",
            "display_name",
            "category",
            "cover_image",
            "subscription_price",
            "subscriber_count",
            "is_approved",
            "website",
            "social_links",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "subscriber_count",
            "is_approved",
            "created_at",
            "updated_at",
        ]


class CreatorProfileDetailSerializer(CreatorProfileSerializer):
    """Creator profile with earnings (only for owner)."""

    class Meta(CreatorProfileSerializer.Meta):
        fields = CreatorProfileSerializer.Meta.fields + [
            "earnings_balance",
            "total_earnings",
        ]
        read_only_fields = CreatorProfileSerializer.Meta.read_only_fields + [
            "earnings_balance",
            "total_earnings",
        ]


class CreatorApplySerializer(serializers.ModelSerializer):
    """Serializer for applying to become a creator."""

    class Meta:
        model = CreatorProfile
        fields = [
            "display_name",
            "category",
            "subscription_price",
            "website",
            "social_links",
        ]


class KYCDocumentSerializer(serializers.ModelSerializer):
    """KYC document serializer."""

    class Meta:
        model = KYCDocument
        fields = [
            "id",
            "document_type",
            "document_file",
            "status",
            "submitted_at",
            "reviewed_at",
        ]
        read_only_fields = ["id", "status", "submitted_at", "reviewed_at"]

class AdminKYCDocumentSerializer(serializers.ModelSerializer):
    """KYC document serializer for Admin."""
    username = serializers.CharField(source="user.username", read_only=True)

    class Meta:
        model = KYCDocument
        fields = [
            "id",
            "username",
            "document_type",
            "full_name",
            "document_number",
            "document_file",
            "selfie_file",
            "status",
            "submitted_at",
            "reviewed_at",
            "reviewer_notes",
        ]
        read_only_fields = ["id", "submitted_at", "reviewed_at"]

from .models import HostBadge
class HostBadgeSerializer(serializers.ModelSerializer):
    class Meta:
        model = HostBadge
        fields = "__all__"
