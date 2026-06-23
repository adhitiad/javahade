"""Family views."""

from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.content.models import Post
from common.redis_pubsub import publish_event

from .models import FamilyContent, FamilyGroup, FamilyMember
from .serializers import (
    FamilyContentSerializer,
    FamilyGroupCreateSerializer,
    FamilyGroupSerializer,
    FamilyMemberSerializer,
    ShareContentSerializer,
)


class FamilyCreateView(generics.CreateAPIView):
    """POST /api/v1/families/ — Create a family group."""

    serializer_class = FamilyGroupCreateSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        family = serializer.save(owner=self.request.user)
        # Add owner as member
        FamilyMember.objects.create(
            family=family, user=self.request.user, role=FamilyMember.Role.OWNER
        )


class FamilyListView(generics.ListAPIView):
    """GET /api/v1/families/ — List my families."""

    serializer_class = FamilyGroupSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return FamilyGroup.objects.filter(
            members__user=self.request.user
        ).distinct()


class FamilyDetailView(generics.RetrieveUpdateDestroyAPIView):
    """GET/PUT/DELETE /api/v1/families/{id}/"""

    serializer_class = FamilyGroupSerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = FamilyGroup.objects.all()
    lookup_field = "id"


class FamilyInviteView(APIView):
    """POST /api/v1/families/{id}/invite/ — Generate/refresh invite code."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, id):
        import secrets
        try:
            family = FamilyGroup.objects.get(id=id, owner=request.user)
        except FamilyGroup.DoesNotExist:
            return Response(
                {"detail": "Family not found or not owner."},
                status=status.HTTP_404_NOT_FOUND,
            )

        family.invite_code = secrets.token_urlsafe(8)
        family.save(update_fields=["invite_code"])

        return Response({
            "invite_code": family.invite_code,
            "invite_link": f"/families/join/{family.invite_code}",
        })


class FamilyJoinView(APIView):
    """POST /api/v1/families/join/{code}/ — Join family via invite code."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, code):
        try:
            family = FamilyGroup.objects.get(invite_code=code)
        except FamilyGroup.DoesNotExist:
            return Response(
                {"detail": "Invalid invite code."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if family.member_count >= family.max_members:
            return Response(
                {"detail": "Family is full."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        member, created = FamilyMember.objects.get_or_create(
            family=family, user=request.user,
            defaults={"role": FamilyMember.Role.MEMBER},
        )

        if not created:
            return Response(
                {"detail": "Already a member."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        family.member_count += 1
        family.save(update_fields=["member_count"])

        # Notify family chat room via Redis
        publish_event(
            channel=f"family:{family.id}",
            event_type="member_joined",
            data={
                "user_id": str(request.user.id),
                "username": request.user.username,
                "family_id": str(family.id),
            },
        )

        return Response(
            FamilyGroupSerializer(family, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


class FamilyMemberListView(generics.ListAPIView):
    """GET /api/v1/families/{id}/members/"""

    serializer_class = FamilyMemberSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return FamilyMember.objects.filter(
            family_id=self.kwargs["id"]
        ).select_related("user")


class FamilyFeedView(generics.ListAPIView):
    """GET /api/v1/families/{id}/feed/ — Family shared content feed."""

    serializer_class = FamilyContentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self): # type: ignore
        family_id = self.kwargs["id"]
        # Verify membership
        if not FamilyMember.objects.filter(
            family_id=family_id, user=self.request.user
        ).exists():
            return FamilyContent.objects.none()

        return FamilyContent.objects.filter(
            family_id=family_id
        ).select_related("post", "post__creator", "shared_by")


class FamilyShareContentView(APIView):
    """POST /api/v1/families/{id}/share/ — Share content to family."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, id):
        # Verify membership
        if not FamilyMember.objects.filter(
            family_id=id, user=request.user
        ).exists():
            return Response(
                {"detail": "Not a member of this family."},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = ShareContentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        v_data: dict = serializer.validated_data # type: ignore

        try:
            post = Post.objects.get(id=v_data["post_id"])
        except Post.DoesNotExist:
            return Response(
                {"detail": "Post not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        content, created = FamilyContent.objects.get_or_create(
            family_id=id, post=post,
            defaults={
                "shared_by": request.user,
                "message": v_data.get("message", ""),
            },
        )

        if not created:
            return Response(
                {"detail": "Already shared to this family."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Notify family members
        publish_event(
            channel=f"family:{id}",
            event_type="content_shared",
            data={
                "shared_by": request.user.username,
                "post_id": str(post.id),
                "family_id": str(id),
            },
        )

        return Response(
            FamilyContentSerializer(content, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )

class VerifyFamilyMemberAPIView(APIView):
    """GET /api/v1/families/{id}/verify-member/ — Internal use to verify membership."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, id):
        if FamilyMember.objects.filter(family_id=id, user=request.user).exists():
            return Response({"allowed": True}, status=status.HTTP_200_OK)
        return Response({"allowed": False, "detail": "Not a family member."}, status=status.HTTP_403_FORBIDDEN)

