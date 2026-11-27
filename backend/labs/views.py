from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response

from accounts.permissions import IsActiveAccount, IsPatient, IsPlatformAdmin
from auditlog.services import log_action

from .models import LabResult, LabTestType
from .serializers import LabResultSerializer, LabTestTypeSerializer


class LabTestTypeViewSet(viewsets.ModelViewSet):
    """Everyone reads; only admins manage test types and ranges (FR-11)."""

    queryset = LabTestType.objects.all()
    serializer_class = LabTestTypeSerializer
    pagination_class = None

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [IsActiveAccount()]
        return [IsPlatformAdmin()]


class LabResultViewSet(viewsets.ModelViewSet):
    """FR-04: patients enter lab values and read them back with
    out-of-range flags; doctors read results of patients who shared
    lab access with them."""

    serializer_class = LabResultSerializer
    filterset_fields = {"test_type": ["exact"], "measured_at": ["exact", "gte", "lte"]}
    ordering_fields = ["measured_at", "value"]

    def get_queryset(self):
        user = self.request.user
        if user.is_platform_admin:
            return LabResult.objects.all()
        if user.is_patient:
            return LabResult.objects.filter(patient=user)
        if user.is_doctor:
            from sharing.services import patients_sharing_labs_with

            return LabResult.objects.filter(patient__in=patients_sharing_labs_with(user))
        return LabResult.objects.none()

    def get_object(self):
        obj = super().get_object()
        # Doctors and admins can read shared results but never change or delete them.
        if self.action in ("update", "partial_update", "destroy") and obj.patient != self.request.user:
            raise PermissionDenied("Only the patient can change or delete this result.")
        return obj

    def perform_create(self, serializer):
        if not self.request.user.is_patient:
            raise PermissionDenied("Only patients enter their own lab results.")
        obj = serializer.save(patient=self.request.user)
        log_action(
            self.request.user, "lab_add",
            details=f"{obj.test_type.code}={obj.value} {obj.test_type.unit}",
        )

    @action(detail=False, methods=["get"])
    def trends(self, request):
        """Series for the trend chart: /api/lab-results/trends/?test_type=<id>
        Every point carries its out_of_range flag for highlighting (FR-04)."""
        qs = self.filter_queryset(self.get_queryset()).order_by("measured_at")
        test_type = request.query_params.get("test_type")
        if test_type:
            qs = qs.filter(test_type_id=test_type)
        data = LabResultSerializer(qs, many=True, context={"request": request}).data
        return Response(data)
