"""
Accounts views — registration, user profile, creator management.
"""

from django.contrib.auth import get_user_model
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import generics, permissions, status
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.pagination import PageNumberPagination
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

from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from django.conf import settings

class CustomCookieLoginView(TokenObtainPairView):
    """
    POST /api/v1/auth/login/
    Custom login view yang menaruh token di HttpOnly Cookie,
    BUKAN di body JSON, untuk mencegah pencurian token via XSS.
    """
    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        if response.status_code == 200 and isinstance(response.data, dict):
            from django.contrib.auth import logout
            logout(request._request)  # Membersihkan session lama (mencegah Session Fixation)
            
            access_token = str(response.data.get('access', ''))
            refresh_token = str(response.data.get('refresh', ''))
            
            # Hapus token dari JSON body
            del response.data['access']
            del response.data['refresh']
            response.data['detail'] = "Login successful. Tokens are stored in HttpOnly cookies."
            
            # Set Cookies
            response.set_cookie(
                key='access_token',
                value=access_token,
                httponly=True,
                secure=not settings.DEBUG,
                samesite='Strict',
                max_age=3600
            )
            response.set_cookie(
                key='refresh_token',
                value=refresh_token,
                httponly=True,
                secure=not settings.DEBUG,
                samesite='Strict',
                max_age=7*24*3600
            )
        return response

class CustomCookieTokenRefreshView(TokenRefreshView):
    """
    POST /api/v1/auth/refresh/
    Membaca refresh token dari HttpOnly cookie jika tidak ada di body,
    lalu menuliskan token baru ke dalam HttpOnly cookie.
    """
    def post(self, request, *args, **kwargs):
        # Ambil refresh token dari cookie jika tidak ada di body
        refresh_token = request.data.get("refresh")
        if not refresh_token:
            refresh_token = request.COOKIES.get("refresh_token")
            
        if refresh_token:
            # Masukkan ke dalam request data agar serializer memprosesnya
            mutable_data = request.data.copy() if hasattr(request.data, "copy") else {}
            mutable_data["refresh"] = refresh_token
            request._full_data = mutable_data
            
        response = super().post(request, *args, **kwargs)
        
        if response.status_code == 200 and isinstance(response.data, dict):
            access_token = str(response.data.get('access', ''))
            new_refresh_token = str(response.data.get('refresh', ''))
            
            # Hapus token dari JSON body
            if 'access' in response.data:
                del response.data['access']
            if 'refresh' in response.data:
                del response.data['refresh']
                
            response.data['detail'] = "Token refresh successful."
            
            # Set Cookies
            response.set_cookie(
                key='access_token',
                value=access_token,
                httponly=True,
                secure=not settings.DEBUG,
                samesite='Strict',
                max_age=3600
            )
            if new_refresh_token:
                response.set_cookie(
                    key='refresh_token',
                    value=new_refresh_token,
                    httponly=True,
                    secure=not settings.DEBUG,
                    samesite='Strict',
                    max_age=7*24*3600
                )
        return response

class LogoutAllDevicesView(APIView):
    """
    POST /api/v1/auth/logout-all/
    Memutus sesi di seluruh perangkat dengan memutar JWT Secret Version.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        user = request.user
        user.jwt_secret_version += 1
        user.save(update_fields=['jwt_secret_version'])
        return Response({"detail": "Successfully logged out from all devices."}, status=status.HTTP_200_OK)


class SocialLoginView(APIView):
    """
    POST /api/v1/auth/social-login/
    Internal endpoint called by Next.js Better Auth to sync user session.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        # Validate internal service token
        service_token = request.headers.get("X-Service-Token")
        expected_token = getattr(settings, "INTERNAL_SERVICE_TOKEN", "")
        if service_token != expected_token:
            return Response({"detail": "Unauthorized internal call."}, status=status.HTTP_403_FORBIDDEN)

        email = request.data.get("email")
        name = request.data.get("name")
        provider = request.data.get("provider")
        avatar = request.data.get("avatar", "")

        if not email:
            return Response({"detail": "Email is required."}, status=status.HTTP_400_BAD_REQUEST)

        # "sandingkan dgn email" - Link account by email
        user = User.objects.filter(email=email).first()
        
        if not user:
            import uuid
            # Create new user
            username = f"user_{uuid.uuid4().hex[:8]}"
            user = User.objects.create(
                email=email,
                username=username,
                first_name=name or "",
                is_verified=True,
                has_accepted_cookies=True,
            )
            # Set un-usable password
            user.set_unusable_password()
            if avatar:
                user.avatar = avatar
            user.save()
        else:
            # Sync avatar/name optionally if empty
            updated = False
            if avatar and not user.avatar:
                user.avatar = avatar
                updated = True
            if name and not user.first_name:
                user.first_name = name
                updated = True
            if updated:
                user.save()

        # Generate JWT Tokens
        from rest_framework_simplejwt.tokens import RefreshToken
        refresh = RefreshToken.for_user(user)
        access_token = str(refresh.access_token)
        refresh_token = str(refresh)

        response = Response({
            "detail": "Social login sync successful.",
            "user": {
                "id": str(user.id),
                "username": user.username,
                "email": user.email,
            }
        }, status=status.HTTP_200_OK)

        # Set HttpOnly Cookies
        response.set_cookie(
            key='access_token',
            value=access_token,
            httponly=True,
            secure=not settings.DEBUG,
            samesite='Strict',
            max_age=3600
        )
        response.set_cookie(
            key='refresh_token',
            value=refresh_token,
            httponly=True,
            secure=not settings.DEBUG,
            samesite='Strict',
            max_age=7*24*3600
        )
        return response


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
        import uuid
        # Data Scrubbing (Anonimisasi) untuk menjaga integritas transaksi/Saga
        scrubbed_id = f"deleted_{uuid.uuid4().hex[:16]}"
        user.username = scrubbed_id
        user.email = f"{scrubbed_id}@javahade.app"
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

class UserExportView(APIView):
    """GET /api/v1/users/me/export/ — GDPR Data Portability."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        data = {
            "profile": {
                "id": str(user.id),
                "username": user.username,
                "email": user.email,
                "date_of_birth": str(user.date_of_birth) if user.date_of_birth else None,
                "date_joined": str(user.date_joined),
                "has_accepted_cookies": user.has_accepted_cookies,
            },
            "wallets": {
                "USD": float(user.balance_usd),
                "SGD": float(user.balance_sgd),
                "IDR": float(user.balance_idr),
                "MYR": float(user.balance_myr),
                "CNY": float(user.balance_cny),
            }
        }
        return Response(data, status=status.HTTP_200_OK)

class UserConsentView(APIView):
    """POST /api/v1/users/me/consent/ — Update Cookie Consent."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        accept = request.data.get("accept", True)
        user = request.user
        user.has_accepted_cookies = bool(accept)
        user.save(update_fields=["has_accepted_cookies"])
        return Response({"detail": "Consent updated."}, status=status.HTTP_200_OK)

class PrivacyDisclosureView(APIView):
    """GET /api/v1/users/privacy-policy/ — Third-party sharing disclosure."""
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        disclosure = {
            "version": "1.0",
            "effective_date": "2026-06-17",
            "third_party_sharing": [
                {
                    "entity": "OpenAI & Google Cloud Vision",
                    "purpose": "Automated content moderation for chat and profile pictures to ensure community safety."
                },
                {
                    "entity": "PayPal",
                    "purpose": "Payment processing for top-ups and creator payouts."
                },
                {
                    "entity": "OvenMediaEngine (OME)",
                    "purpose": "Streaming infrastructure to broadcast your video and audio data securely."
                }
            ],
            "data_retention": "Soft-deleted accounts are anonymized. Deleted stream data is completely erased after 30 days."
        }
        return Response(disclosure, status=status.HTTP_200_OK)


# ─────────────────────────────────────────────
# Creator Views
# ─────────────────────────────────────────────


class StandardResultsSetPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100

class CreatorListView(generics.ListAPIView):
    """GET /api/v1/creators/ — List all approved creators (searchable)."""

    serializer_class = CreatorProfileSerializer
    permission_classes = [permissions.AllowAny]
    queryset = CreatorProfile.objects.filter(is_approved=True).select_related("user")
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["category"]
    search_fields = ["display_name", "user__username"]
    ordering_fields = ["subscriber_count", "created_at"]
    pagination_class = StandardResultsSetPagination


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
