from django.utils import timezone
from rest_framework import serializers, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response

from accounts.permissions import IsActiveAccount, IsPatient
from auditlog.services import log_action
from sharing.services import active_shares_for_doctor

from .models import Medication, MedicationIntake
from .serializers import MedicationSerializer


class MedicationViewSet(viewsets.ModelViewSet):
    """Patients manage their own medications and mark doses taken.

    Doctors get read-only access to the medications of patients who
    currently share records with them. Listing is always scoped to what
    the requesting user is allowed to see."""

    serializer_class = MedicationSerializer
    pagination_class = None
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]

    def get_permissions(self):
        if self.action in ("create", "update", "partial_update", "destroy", "taken"):
            return [IsPatient()]
        return [IsActiveAccount()]

    def get_queryset(self):
        user = self.request.user
        qs = Medication.objects.select_related("patient").prefetch_related("intakes")
        if user.is_platform_admin:
            base = qs
        elif user.is_patient:
            base = qs.filter(patient=user)
        elif user.is_doctor:
            shared_patient_ids = active_shares_for_doctor(user).values_list("patient_id", flat=True)
            base = qs.filter(patient_id__in=shared_patient_ids)
        else:
            return qs.none()
        patient_id = self.request.query_params.get("patient")
        if patient_id and (user.is_doctor or user.is_platform_admin):
            base = base.filter(patient_id=patient_id)
        return base.filter(active=True)

    def check_object_permissions(self, request, obj):
        super().check_object_permissions(request, obj)
        user = request.user
        if user.is_patient and obj.patient_id != user.id:
            raise PermissionDenied("This is not your medication.")
        if user.is_doctor and not user.is_platform_admin:
            allowed = active_shares_for_doctor(user).filter(patient=obj.patient).exists()
            if not allowed:
                raise PermissionDenied("This patient is not sharing records with you.")

    def perform_create(self, serializer):
        med = serializer.save(patient=self.request.user)
        log_action(self.request.user, "med_add", details=f"Added {med.name} {med.dose} at {med.time:%H:%M}")

    def perform_update(self, serializer):
        med = serializer.save()
        log_action(self.request.user, "med_add", details=f"Updated {med.name} {med.dose} at {med.time:%H:%M}")

    def perform_destroy(self, instance):
        log_action(self.request.user, "med_add", details=f"Removed {instance.name} {instance.dose}")
        instance.delete()

    @action(detail=True, methods=["post"])
    def taken(self, request, pk=None):
        """Mark today's dose taken. Idempotent: one intake row per day."""
        med = self.get_object()
        if med.patient_id != request.user.id:
            raise PermissionDenied("This is not your medication.")
        today = timezone.localdate()
        intake, created = MedicationIntake.objects.get_or_create(medication=med, date=today)
        if created:
            log_action(request.user, "med_taken", details=f"Took {med.name} {med.dose}")
        return Response({"id": med.id, "date": str(today), "taken": True, "already": not created})
