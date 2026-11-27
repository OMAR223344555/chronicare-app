from django.utils import timezone
from rest_framework import generics, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response

from accounts.models import User
from accounts.permissions import IsActiveAccount, IsApprovedDoctor, IsPatient
from auditlog.services import log_action
from records.models import MedicalFile
from records.serializers import MedicalFileSerializer

from .models import DoctorNote, Share
from .serializers import (
    DoctorBriefSerializer,
    DoctorNoteSerializer,
    SharedPatientSerializer,
    ShareSerializer,
)
from .services import (
    active_shares_for_doctor,
    doctor_can_access_file,
    share_has_new_content,
    shared_files_for_doctor,
)


class VerifiedDoctorListView(generics.ListAPIView):
    """Approved doctors the patient can share with (FR-05)."""

    permission_classes = [IsActiveAccount]
    serializer_class = DoctorBriefSerializer
    pagination_class = None
    search_fields = ["full_name", "specialty", "email"]

    def get_queryset(self):
        return User.objects.filter(role=User.Role.DOCTOR, status=User.Status.ACTIVE)


class ShareViewSet(viewsets.ModelViewSet):
    """FR-05: create, list and revoke shares. Shares are never deleted;
    revoking keeps the audit trail intact."""

    permission_classes = [IsPatient]
    serializer_class = ShareSerializer
    http_method_names = ["get", "post", "head", "options"]
    filterset_fields = ["doctor", "revoked_at"]

    def get_queryset(self):
        return Share.objects.filter(patient=self.request.user).prefetch_related(
            "files", "categories"
        )

    def perform_create(self, serializer):
        share = serializer.save(patient=self.request.user)
        log_action(
            self.request.user, "share", target_user=share.doctor,
            details=f"Share #{share.pk}, expires {share.expires_on}",
        )

    @action(detail=True, methods=["post"])
    def revoke(self, request, pk=None):
        share = self.get_object()
        if share.revoked_at is None:
            share.revoked_at = timezone.now()
            share.save(update_fields=["revoked_at"])
            log_action(
                request.user, "revoke", target_user=share.doctor,
                details=f"Share #{share.pk} revoked",
            )
        return Response(ShareSerializer(share, context={"request": request}).data)


class DoctorPatientsView(generics.ListAPIView):
    """FR-09: patients who shared with me, with a new-content marker."""

    permission_classes = [IsApprovedDoctor]
    serializer_class = SharedPatientSerializer
    pagination_class = None

    def get_queryset(self):
        return []  # list() builds the rows itself

    def list(self, request, *args, **kwargs):
        rows = {}
        for share in active_shares_for_doctor(request.user).prefetch_related("files", "categories"):
            row = rows.setdefault(
                share.patient_id,
                {
                    "id": share.patient_id,
                    "full_name": share.patient.full_name,
                    "email": share.patient.email,
                    "shared_file_count": 0,
                    "has_new": False,
                    "last_shared_at": share.created_at,
                },
            )
            row["last_shared_at"] = max(row["last_shared_at"], share.created_at)
            row["has_new"] = row["has_new"] or share_has_new_content(share)
        for patient_id, row in rows.items():
            row["shared_file_count"] = shared_files_for_doctor(request.user).filter(
                owner_id=patient_id
            ).count()
        data = sorted(rows.values(), key=lambda r: r["last_shared_at"], reverse=True)
        return Response(SharedPatientSerializer(data, many=True).data)


class DoctorSharedFilesView(generics.ListAPIView):
    """FR-07: only files actively shared with this doctor, nothing else."""

    permission_classes = [IsApprovedDoctor]
    serializer_class = MedicalFileSerializer
    filterset_fields = ["condition", "category", "owner"]
    search_fields = ["title", "issuing_facility", "issuing_doctor"]
    ordering_fields = ["record_date", "uploaded_at"]

    def get_queryset(self):
        return shared_files_for_doctor(self.request.user)


class DoctorMarkSeenView(generics.GenericAPIView):
    permission_classes = [IsApprovedDoctor]

    def post(self, request, patient_id):
        updated = active_shares_for_doctor(request.user).filter(
            patient_id=patient_id
        ).update(doctor_seen_at=timezone.now())
        return Response({"marked_seen": updated})


class DoctorNoteViewSet(viewsets.ModelViewSet):
    """FR-08: doctors add notes to shared files; patients read notes on
    their own files."""

    serializer_class = DoctorNoteSerializer
    http_method_names = ["get", "post", "head", "options"]
    filterset_fields = ["medical_file", "doctor"]

    def get_queryset(self):
        user = self.request.user
        if user.is_doctor:
            return DoctorNote.objects.filter(doctor=user)
        if user.is_patient:
            return DoctorNote.objects.filter(medical_file__owner=user)
        return DoctorNote.objects.none()

    def perform_create(self, serializer):
        user = self.request.user
        if not user.is_approved_doctor:
            raise PermissionDenied("Only approved doctors add notes.")
        medical_file = serializer.validated_data["medical_file"]
        if not doctor_can_access_file(user, medical_file):
            raise PermissionDenied("This file is not shared with you.")
        note = serializer.save(doctor=user)
        log_action(
            user, "note", medical_file=medical_file,
            target_user=medical_file.owner, details=f"Note #{note.pk}",
        )
