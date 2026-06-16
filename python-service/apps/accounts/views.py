"""
Accounts views — registration, user profile, creator management.
"""

from django.contrib.auth import get_user_model
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import CreatorProfile
from .permissions import IsCreator, IsOwnerOrReadOnly
from .serializers import (
    CreatorApplySerializer,
    CreatorProfileDetailSerializer,
    CreatorProfileSerializer,
    RegisterSerializer,
    UserPublicSerializer,
    UserSerializer,
)

User = get_user_model()


# ─────────────────────────────────────────────
# Auth Views
# ─────────────────────────────────────────────


class RegisterView(generics.CreateAPIView):
    """POST /api/v1/auth/register/ — Register a new user."""

    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(
            {
                "id": str(user.id),
                "username": user.username,
                "email": user.email,
                "message": "Registration successful.",
            },
            status=status.HTTP_201_CREATED,
        )


# ─────────────────────────────────────────────
# User Views
# ─────────────────────────────────────────────


class UserMeView(generics.RetrieveUpdateAPIView):
    """GET/PUT /api/v1/users/me/ — Current user profile."""

    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):  # type: ignore
        return self.request.user


class UserDetailView(generics.RetrieveAPIView):
    """GET /api/v1/users/{id}/ — Public user profile."""

    serializer_class = UserPublicSerializer
    permission_classes = [permissions.AllowAny]
    queryset = User.objects.all()
    lookup_field = "id"

class UserDeleteView(APIView):
    """DELETE /api/v1/users/me/ — GDPR Right to Erasure (Data Scrubbing)."""
    
    permission_classes = [permissions.IsAuthenticated]
    
    def delete(self, request):
        user = request.user
        
        # Data Scrubbing (Anonimisasi) untuk menjaga integritas transaksi/Saga
        scrubbed_id = f"deleted_{user.id}"
        user.username = scrubbed_id[:150] # Batasi panjang username
        user.email = f"{scrubbed_id}@kreativa.app"
        user.bio = ""
        user.first_name = ""
        user.last_name = ""
        user.is_active = False
        
        if user.avatar:
            user.avatar.delete(save=False)
            
        # Jika host, hapus info creator profile sensitif
        if hasattr(user, 'creator_profile'):
            profile = user.creator_profile
            profile.display_name = "Deleted Host"
            profile.social_links = {}
            profile.website = ""
            profile.save()
            
        user.save()
        
        return Response(
            {"detail": "Akun Anda beserta seluruh data pribadi telah dihapus secara permanen (Anonimisasi)."},
            status=status.HTTP_200_OK
        )


# ─────────────────────────────────────────────
# Creator Views
# ─────────────────────────────────────────────


class CreatorListView(generics.ListAPIView):
    """GET /api/v1/creators/ — List approved creators."""

    serializer_class = CreatorProfileSerializer
    permission_classes = [permissions.AllowAny]
    queryset = CreatorProfile.objects.filter(is_approved=True).select_related("user")
    filterset_fields = ["category"]
    search_fields = ["display_name", "user__username"]
    ordering_fields = ["subscriber_count", "created_at"]


class CreatorDetailView(generics.RetrieveAPIView):
    """GET /api/v1/creators/{username}/ — Creator profile by username."""

    serializer_class = CreatorProfileSerializer
    permission_classes = [permissions.AllowAny]
    lookup_field = "user__username"
    lookup_url_kwarg = "username"
    queryset = CreatorProfile.objects.filter(is_approved=True).select_related("user")


class CreatorApplyView(APIView):
    """POST /api/v1/creators/apply/ — Apply to become a creator."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        user = request.user

        if user.role == User.Role.HOST:  # type: ignore
            return Response(
                {"detail": "You are already a creator."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if CreatorProfile.objects.filter(user=user).exists():
            return Response(
                {"detail": "Application already submitted."},
                status=status.HTTP_400_BAD_REQUEST,
            )
            
        # KYC Enforcement: Wajib memiliki KYC yang APPROVED
        from .models import KYCDocument
        has_approved_kyc = KYCDocument.objects.filter(
            user=user, 
            status=KYCDocument.Status.APPROVED
        ).exists()
        
        if not has_approved_kyc:
            return Response(
                {"detail": "Anda harus menyelesaikan verifikasi identitas (KYC) yang disetujui Admin sebelum menjadi Host."},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = CreatorApplySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        profile = serializer.save(user=user)

        # Update user role to creator (pending approval)
        user.role = User.Role.HOST  # type: ignore
        user.save(update_fields=["role"])

        return Response(
            CreatorProfileSerializer(profile).data,
            status=status.HTTP_201_CREATED,
        )


class CreatorMeView(generics.RetrieveUpdateAPIView):
    """GET/PUT /api/v1/creators/me/ — Own creator profile with earnings."""

    serializer_class = CreatorProfileDetailSerializer
    permission_classes = [permissions.IsAuthenticated, IsCreator]

    def get_object(self):
        return self.request.user.creator_profile  # type: ignore
