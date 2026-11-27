from django.http import FileResponse
from django.utils import timezone
from rest_framework import generics, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response

from accounts.permissions import IsActiveAccount, IsPatient, IsPlatformAdmin
from auditlog.services import log_action
from sharing.services import doctor_can_access_file

from .models import Category, Condition, MedicalFile
from .serializers import CategorySerializer, ConditionSerializer, MedicalFileSerializer


class CategoryViewSet(viewsets.ModelViewSet):
    """Everyone reads; only admins add/edit (FR-11)."""

    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    pagination_class = None

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [IsActiveAccount()]
        return [IsPlatformAdmin()]


class ConditionViewSet(CategoryViewSet):
    queryset = Condition.objects.all()
    serializer_class = ConditionSerializer


class MedicalFileViewSet(viewsets.ModelViewSet):
    """FR-02 upload, FR-03 search/filter, FR-06 archive/restore.

    Patients see only their own files. Doctors reach files through the
    sharing endpoints, except download/retrieve of a file actively shared
    with them (checked per object).
    """

    serializer_class = MedicalFileSerializer
    filterset_fields = {
        "condition": ["exact"],
        "category": ["exact"],
        "record_date": ["exact", "gte", "lte"],
        "specialty": ["exact", "icontains"],
        "archived": ["exact"],
    }
    search_fields = ["title", "issuing_facility", "issuing_doctor", "specialty"]
    ordering_fields = ["record_date", "uploaded_at", "title"]

    def get_queryset(self):
        user = self.request.user
        if user.is_platform_admin:
            return MedicalFile.objects.all()
        if user.is_patient:
            return MedicalFile.objects.filter(owner=user)
        if user.is_doctor:
            return MedicalFile.objects.filter(
                pk__in=[f.pk for f in MedicalFile.objects.all() if doctor_can_access_file(user, f)]
            )
        return MedicalFile.objects.none()

    def get_object(self):
        obj = super().get_object()
        # Doctors and admins can read shared files but never change or delete them.
        if self.action in ("update", "partial_update", "destroy") and obj.owner != self.request.user:
            raise PermissionDenied("Only the owner can change or delete this file.")
        return obj

    def perform_create(self, serializer):
        if not self.request.user.is_patient:
            raise PermissionDenied("Only patients upload medical files.")
        obj = serializer.save(owner=self.request.user)
        log_action(self.request.user, "upload", medical_file=obj, details=obj.title)

    def retrieve(self, request, *args, **kwargs):
        obj = self.get_object()
        if request.user != obj.owner and not request.user.is_platform_admin:
            log_action(request.user, "view", medical_file=obj, target_user=obj.owner)
        return super().retrieve(request, *args, **kwargs)

    @action(detail=True, methods=["post"])
    def archive(self, request, pk=None):
        obj = self._own_file(request, pk)
        obj.archived = True
        obj.save(update_fields=["archived", "updated_at"])
        log_action(request.user, "archive", medical_file=obj)
        return Response(MedicalFileSerializer(obj, context={"request": request}).data)

    @action(detail=True, methods=["post"])
    def restore(self, request, pk=None):
        obj = self._own_file(request, pk)
        obj.archived = False
        obj.save(update_fields=["archived", "updated_at"])
        log_action(request.user, "restore", medical_file=obj)
        return Response(MedicalFileSerializer(obj, context={"request": request}).data)

    @action(detail=True, methods=["get"])
    def download(self, request, pk=None):
        obj = self.get_object()
        if request.user != obj.owner and not request.user.is_platform_admin:
            if not (request.user.is_doctor and doctor_can_access_file(request.user, obj)):
                raise PermissionDenied("This file is not shared with you.")
        log_action(request.user, "download", medical_file=obj, target_user=obj.owner)
        return FileResponse(obj.file.open("rb"), as_attachment=True, filename=obj.file.name.split("/")[-1])

    def _own_file(self, request, pk):
        try:
            return MedicalFile.objects.get(pk=pk, owner=request.user)
        except MedicalFile.DoesNotExist:
            raise PermissionDenied("File not found or not yours.")


class TimelineView(generics.ListAPIView):
    """Chronological timeline per condition, archived files included (FR-03/FR-06)."""

    serializer_class = MedicalFileSerializer
    pagination_class = None
    filterset_fields = ["condition", "category"]

    def get_queryset(self):
        return MedicalFile.objects.filter(owner=self.request.user).order_by("record_date")
