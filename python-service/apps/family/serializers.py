"""Family serializers."""

from rest_framework import serializers
from apps.accounts.serializers import UserPublicSerializer  # type: ignore
from apps.content.serializers import PostSerializer  # type: ignore
from .models import FamilyGroup, FamilyMember, FamilyContent


class FamilyGroupSerializer(serializers.ModelSerializer):
    owner = UserPublicSerializer(read_only=True)
    is_member = serializers.SerializerMethodField()

    class Meta:
        model = FamilyGroup
        fields = [
            "id", "name", "description", "avatar", "owner",
            "max_members", "is_private", "invite_code",
            "member_count", "is_member", "created_at",
        ]
        read_only_fields = [
            "id", "owner", "invite_code", "member_count", "created_at",
        ]

    def get_is_member(self, obj):
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            return obj.members.filter(user=request.user).exists()
        return False


class FamilyGroupCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = FamilyGroup
        fields = ["name", "description", "avatar", "max_members", "is_private"]


class FamilyMemberSerializer(serializers.ModelSerializer):
    user = UserPublicSerializer(read_only=True)

    class Meta:
        model = FamilyMember
        fields = ["id", "user", "role", "joined_at"]
        read_only_fields = ["id", "joined_at"]


class FamilyContentSerializer(serializers.ModelSerializer):
    post = PostSerializer(read_only=True)
    shared_by = UserPublicSerializer(read_only=True)

    class Meta:
        model = FamilyContent
        fields = ["id", "post", "shared_by", "message", "shared_at"]
        read_only_fields = ["id", "shared_at"]


class ShareContentSerializer(serializers.Serializer):
    post_id = serializers.UUIDField()
    message = serializers.CharField(max_length=500, required=False, default="")
