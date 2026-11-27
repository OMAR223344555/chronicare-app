from django.db.models import Q
from django.utils import timezone

from records.models import MedicalFile

from .models import Share


def active_shares_for_doctor(doctor):
    return Share.objects.filter(
        doctor=doctor,
        revoked_at__isnull=True,
        expires_on__gte=timezone.localdate(),
    )


def shared_files_for_doctor(doctor):
    """QuerySet of every file the doctor can currently access (FR-07)."""
    qs = MedicalFile.objects.none()
    for share in active_shares_for_doctor(doctor).prefetch_related("files", "categories"):
        own = share.files.all()
        cat_files = MedicalFile.objects.filter(
            owner=share.patient, category__in=share.categories.all()
        )
        qs = qs | own | cat_files
    return qs.distinct()


def doctor_can_access_file(doctor, medical_file):
    return shared_files_for_doctor(doctor).filter(pk=medical_file.pk).exists()


def patients_sharing_labs_with(doctor):
    """Patient ids whose active shares include lab results."""
    return active_shares_for_doctor(doctor).filter(
        include_lab_results=True
    ).values_list("patient_id", flat=True)


def patients_sharing_with(doctor):
    from accounts.models import User

    return User.objects.filter(
        pk__in=active_shares_for_doctor(doctor).values_list("patient_id", flat=True)
    )


def share_has_new_content(share):
    """FR-09 marker: files uploaded/updated since the doctor last looked.
    A share the doctor never opened counts as entirely new."""
    files_q = Q(pk__in=share.files.values_list("pk", flat=True)) | Q(
        owner=share.patient, category__in=share.categories.all()
    )
    qs = MedicalFile.objects.filter(files_q)
    if share.doctor_seen_at is None:
        return qs.exists()
    return qs.filter(updated_at__gt=share.doctor_seen_at).exists()
