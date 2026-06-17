"""Moderation views."""
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import serializers as drf_serializers
from django.contrib.contenttypes.models import ContentType
from .models import Report


class ReportSerializer(drf_serializers.ModelSerializer):
    class Meta:
        model = Report
        fields = ["id", "reason", "description", "status", "created_at"]
        read_only_fields = ["id", "status", "created_at"]


class CreateReportSerializer(drf_serializers.Serializer):
    content_type = drf_serializers.CharField(help_text="e.g., 'post', 'comment', 'user'")
    object_id = drf_serializers.UUIDField()
    reason = drf_serializers.ChoiceField(choices=Report.Reason.choices)
    description = drf_serializers.CharField(max_length=2000, required=False, default="")


class ReportCreateView(APIView):
    """POST /api/v1/moderation/reports/ — File a report."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = CreateReportSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        from typing import cast
        data = cast(dict, serializer.validated_data)

        ct_key = data["content_type"].lower()
        ct = ContentType.objects.filter(model=ct_key).first()
        
        if not ct:
            return Response(
                {"detail": f"Invalid content_type. Unknown model: {ct_key}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        report = Report.objects.create(
            reporter=request.user,
            content_type=ct,
            object_id=data["object_id"],
            reason=data["reason"],
            description=data.get("description", ""),
        )

        return Response(ReportSerializer(report).data, status=status.HTTP_201_CREATED)


class ReportListView(generics.ListAPIView):
    """GET /api/v1/moderation/reports/ — My filed reports."""
    queryset = Report.objects.none()
    serializer_class = ReportSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self): # type: ignore
        return Report.objects.filter(reporter=self.request.user)

class ModerationCheckView(APIView):
    """
    POST /api/v1/moderation/check/
    Internal API endpoint for Go service to check message content before broadcasting.
    Expects {"text": "message content"}
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        from django.conf import settings
        
        # Validasi akses internal dari Go service
        auth_header = request.META.get("HTTP_AUTHORIZATION", "")
        internal_token = getattr(settings, "INTERNAL_SERVICE_TOKEN", "javahade-internal-secret")
        
        if auth_header != f"Bearer {internal_token}":
            return Response({"error": "Unauthorized"}, status=status.HTTP_401_UNAUTHORIZED)
            
        text = request.data.get("text", "")
        if not text:
            return Response({"status": "ok"}, status=status.HTTP_200_OK)
            
        # pyrefly: ignore [missing-import]
        from apps.moderation.services import ContentModerationService
        from django.core.exceptions import ValidationError
        
        try:
            ContentModerationService.check_content(text=text)
            return Response({"status": "ok"}, status=status.HTTP_200_OK)
        except ValidationError as e:
            return Response(
                {"status": "rejected", "reason": str(e.message)},
                status=status.HTTP_400_BAD_REQUEST
            )
