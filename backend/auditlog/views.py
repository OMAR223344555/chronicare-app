from django.db.models import Count, Max
from django.utils import timezone
from rest_framework import generics, status, views
from rest_framework.response import Response

from accounts.permissions import IsActiveAccount, IsPatient, IsPlatformAdmin

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


class SyncView(views.APIView):
    """Cheap change detector for light client-side polling: the portals call
    this every few seconds instead of refetching whole lists. It returns only
    counts and newest-change timestamps, scoped to the requesting user; the
    client refetches the real data only when one of these values moves.
    """

    permission_classes = [IsActiveAccount]

    def get(self, request):
        from appointments.models import Appointment
        from sharing.models import Share

        user = request.user
        if user.is_patient:
            appts = Appointment.objects.filter(patient=user)
            shares = Share.objects.filter(patient=user)
        elif user.is_doctor:
            appts = Appointment.objects.filter(doctor=user)
            shares = Share.objects.filter(doctor=user)
        else:
            appts = Appointment.objects.all()
            shares = Share.objects.all()

        appt_agg = appts.aggregate(count=Count("id"), max_updated=Max("updated_at"))
        share_agg = shares.aggregate(count=Count("id"), max_created=Max("created_at"))
        return Response({
            "server_time": timezone.now().isoformat(),
            "appointments": {"count": appt_agg["count"], "max_updated": appt_agg["max_updated"]},
            "shares": {"count": share_agg["count"], "max_created": share_agg["max_created"]},
            "notifications_unread": Notification.objects.filter(user=user, is_read=False).count(),
            "notifications_latest": Notification.objects.filter(user=user).aggregate(m=Max("created_at"))["m"],
        })
