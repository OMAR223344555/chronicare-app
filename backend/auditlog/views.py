from rest_framework import generics

from accounts.permissions import IsPlatformAdmin

from .models import AuditLog
from .serializers import AuditLogSerializer


class AuditLogListView(generics.ListAPIView):
    """FR-12: the administrator reviews who accessed which file and when."""

    permission_classes = [IsPlatformAdmin]
    serializer_class = AuditLogSerializer
    filterset_fields = ["action", "user", "target_user", "medical_file"]
    search_fields = ["details", "user__email", "target_user__email"]

    def get_queryset(self):
        return AuditLog.objects.select_related("user", "target_user", "medical_file")
