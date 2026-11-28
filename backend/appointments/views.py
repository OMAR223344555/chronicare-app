from django.utils import timezone
from rest_framework import serializers, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response

from accounts.permissions import IsActiveAccount, IsPatient
from auditlog.services import log_action, notify

from .models import Appointment
from .serializers import AppointmentSerializer


class AppointmentViewSet(viewsets.ModelViewSet):
    """Patients book appointments; doctors confirm or decline; either side
    cancels. Listing is scoped to the requesting user."""

    serializer_class = AppointmentSerializer
    pagination_class = None
    http_method_names = ["get", "post", "head", "options"]

    def get_permissions(self):
        if self.action == "create":
            return [IsPatient()]
        return [IsActiveAccount()]

    def get_queryset(self):
        user = self.request.user
        qs = Appointment.objects.select_related("patient", "doctor")
        if user.is_platform_admin:
            return qs.all()
        if user.is_patient:
            return qs.filter(patient=user)
        if user.is_doctor:
            return qs.filter(doctor=user)
        return qs.none()

    def perform_create(self, serializer):
        appt = serializer.save(patient=self.request.user)
        log_action(
            self.request.user, "appointment",
            target_user=appt.doctor,
            details=f"Booked #{appt.pk} at {appt.scheduled_at:%Y-%m-%d %H:%M}",
        )
        notify(
            appt.doctor, "appt",
            f"{appt.patient.full_name} requested an appointment on "
            f"{appt.scheduled_at:%d %b %Y, %H:%M}.",
        )

    @action(detail=True, methods=["post"])
    def status(self, request, pk=None):
        appt = self.get_object()
        user = request.user
        act = (request.data.get("action") or "").lower()
        S = Appointment.Status

        if act == "confirm":
            if user != appt.doctor:
                raise PermissionDenied("Only the doctor can confirm.")
            if appt.status != S.PENDING:
                raise serializers.ValidationError("Only a pending appointment can be confirmed.")
            appt.status = S.CONFIRMED
            notify(appt.patient, "appt",
                   f"{appt.doctor.full_name} confirmed your appointment on {appt.scheduled_at:%d %b %Y, %H:%M}.")
        elif act == "decline":
            if user != appt.doctor:
                raise PermissionDenied("Only the doctor can decline.")
            if appt.status != S.PENDING:
                raise serializers.ValidationError("Only a pending appointment can be declined.")
            appt.status = S.DECLINED
            notify(appt.patient, "appt",
                   f"{appt.doctor.full_name} declined your appointment on {appt.scheduled_at:%d %b %Y, %H:%M}.")
        elif act == "cancel":
            if user not in (appt.patient, appt.doctor):
                raise PermissionDenied("Only the patient or the doctor can cancel.")
            if appt.status not in (S.PENDING, S.CONFIRMED):
                raise serializers.ValidationError("This appointment can no longer be cancelled.")
            appt.status = S.CANCELLED
            other = appt.doctor if user == appt.patient else appt.patient
            notify(other, "appt",
                   f"{user.full_name} cancelled the appointment on {appt.scheduled_at:%d %b %Y, %H:%M}.")
        elif act == "complete":
            if user != appt.doctor:
                raise PermissionDenied("Only the doctor can mark an appointment completed.")
            if appt.status != S.CONFIRMED or appt.scheduled_at > timezone.now():
                raise serializers.ValidationError("Only a confirmed appointment in the past can be completed.")
            appt.status = S.COMPLETED
        else:
            raise serializers.ValidationError("Unknown action. Use confirm, decline, cancel or complete.")

        appt.save(update_fields=["status", "updated_at"])
        log_action(
            user, "appointment",
            target_user=appt.doctor if user == appt.patient else appt.patient,
            details=f"{act} #{appt.pk}",
        )
        return Response(AppointmentSerializer(appt).data)
