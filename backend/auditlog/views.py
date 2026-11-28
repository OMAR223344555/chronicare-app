from rest_framework import generics, status, views
from rest_framework.response import Response

from accounts.permissions import IsPatient, IsPlatformAdmin

from .models import AuditLog, Notification
from .serializers import AuditLogSerializer, NotificationSerializer


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


class NotificationListView(generics.ListAPIView):
    """The signed-in user's own notifications, newest first."""

    serializer_class = NotificationSerializer
    pagination_class = None

    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user)[:30]


class NotificationReadView(views.APIView):
    """Mark one or all of the user's notifications as read."""

    def post(self, request, pk=None):
        qs = Notification.objects.filter(user=request.user, is_read=False)
        if pk is not None:
            qs = qs.filter(pk=pk)
        return Response({"marked_read": qs.update(is_read=True)})
