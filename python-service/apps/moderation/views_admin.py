from rest_framework import generics, permissions, serializers
from .models import Report

class IsSuperAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role in ['admin', 'superadmin'])

class AdminReportSerializer(serializers.ModelSerializer):
    reporter = serializers.CharField(source='reporter.username', read_only=True)
    class Meta:
        model = Report
        fields = ["id", "reporter", "object_id", "reason", "description", "status", "created_at"]
        read_only_fields = ["id", "created_at"]

class AdminReportListView(generics.ListAPIView):
    permission_classes = [IsSuperAdmin]
    queryset = Report.objects.all().order_by('-created_at')
    serializer_class = AdminReportSerializer

class AdminReportDetailView(generics.RetrieveUpdateAPIView):
    permission_classes = [IsSuperAdmin]
    queryset = Report.objects.all()
    serializer_class = AdminReportSerializer
