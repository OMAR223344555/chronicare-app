from rest_framework import generics

from accounts.permissions import IsPatient, IsPlatformAdmin

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


class MyAccessLogView(generics.ListAPIView):
    """Patient-facing transparency (FR-12): every time someone else opened,
    downloaded or annotated one of the patient's own files. The patient's own
    actions are excluded - this list answers "who else touched my files?".
    """

    permission_classes = [IsPatient]
    serializer_class = AuditLogSerializer
    filterset_fields = ["action", "medical_file"]

    def get_queryset(self):
        return (
            AuditLog.objects.select_related("user", "target_user", "medical_file")
            .filter(
                target_user=self.request.user,
                action__in=[
                    AuditLog.Action.VIEW,
                    AuditLog.Action.DOWNLOAD,
                    AuditLog.Action.NOTE,
                ],
            )
            .exclude(user=self.request.user)
        )
