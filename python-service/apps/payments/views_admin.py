from rest_framework import generics, permissions, serializers
from .models import Payout

class IsSuperAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role in ['admin', 'superadmin'])

class AdminPayoutSerializer(serializers.ModelSerializer):
    creator = serializers.CharField(source='creator.username', read_only=True)
    class Meta:
        model = Payout
        fields = ["id", "creator", "amount", "currency", "method", "status", "bank_details", "created_at", "processed_at"]
        read_only_fields = ["id", "created_at"]

class AdminPayoutListView(generics.ListAPIView):
    permission_classes = [IsSuperAdmin]
    queryset = Payout.objects.all().order_by('-created_at')
    serializer_class = AdminPayoutSerializer

class AdminPayoutDetailView(generics.RetrieveUpdateAPIView):
    permission_classes = [IsSuperAdmin]
    queryset = Payout.objects.all()
    serializer_class = AdminPayoutSerializer
