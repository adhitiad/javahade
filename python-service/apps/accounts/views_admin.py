from rest_framework import generics, permissions
from rest_framework.response import Response
from .models import KYCDocument, HostBadge
from .serializers import AdminKYCDocumentSerializer, HostBadgeSerializer

class IsSuperAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role in ['admin', 'superadmin'])

class AdminKYCListView(generics.ListAPIView):
    permission_classes = [IsSuperAdmin]
    queryset = KYCDocument.objects.all().order_by('-submitted_at')
    serializer_class = AdminKYCDocumentSerializer

class AdminKYCDetailView(generics.RetrieveUpdateAPIView):
    permission_classes = [IsSuperAdmin]
    queryset = KYCDocument.objects.all()
    serializer_class = AdminKYCDocumentSerializer

class AdminBadgeListView(generics.ListCreateAPIView):
    permission_classes = [IsSuperAdmin]
    queryset = HostBadge.objects.all()
    serializer_class = HostBadgeSerializer

class AdminBadgeDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsSuperAdmin]
    queryset = HostBadge.objects.all()
    serializer_class = HostBadgeSerializer
