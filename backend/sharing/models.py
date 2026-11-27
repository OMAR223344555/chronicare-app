from django.conf import settings
from django.db import models
from django.utils import timezone


class Share(models.Model):
    """FR-05: the patient shares chosen files (or whole categories) with a
    chosen doctor, sets an expiry date, and can revoke at any time."""

    patient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="shares_given",
        limit_choices_to={"role": "patient"},
    )
    doctor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="shares_received",
        limit_choices_to={"role": "doctor"},
    )
    files = models.ManyToManyField(
        "records.MedicalFile", blank=True, related_name="shares", through="ShareFiles"
    )
    categories = models.ManyToManyField(
        "records.Category", blank=True, related_name="shares", through="ShareCategories"
    )
    include_lab_results = models.BooleanField(
        default=True, help_text="Also share this patient's lab trend history."
    )
    expires_on = models.DateField()
    revoked_at = models.DateTimeField(null=True, blank=True)
    doctor_seen_at = models.DateTimeField(
        null=True, blank=True,
        help_text="Last time the doctor opened this patient's shared list; "
                  "anything newer is marked as new (FR-09).",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "shares"
        ordering = ["-created_at"]

    @property
    def is_active(self):
        return self.revoked_at is None and self.expires_on >= timezone.localdate()

    def __str__(self):
        return f"{self.patient} -> {self.doctor} (expires {self.expires_on})"


class ShareFiles(models.Model):
    """Junction (ERD: share_files) - which specific files a share covers."""

    share = models.ForeignKey(Share, on_delete=models.CASCADE)
    medical_file = models.ForeignKey("records.MedicalFile", on_delete=models.CASCADE)

    class Meta:
        db_table = "share_files"
        constraints = [
            models.UniqueConstraint(
                fields=["share", "medical_file"], name="uq_share_files"
            )
        ]


class ShareCategories(models.Model):
    """Junction (ERD: share_categories) - which whole categories a share covers."""

    share = models.ForeignKey(Share, on_delete=models.CASCADE)
    category = models.ForeignKey("records.Category", on_delete=models.CASCADE)

    class Meta:
        db_table = "share_categories"
        constraints = [
            models.UniqueConstraint(
                fields=["share", "category"], name="uq_share_categories"
            )
        ]


class DoctorNote(models.Model):
    """FR-08: a doctor's note on a shared file; the patient can read it."""

    doctor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notes_written",
        limit_choices_to={"role": "doctor"},
    )
    medical_file = models.ForeignKey(
        "records.MedicalFile", on_delete=models.CASCADE, related_name="doctor_notes"
    )
    text = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "doctor_notes"
        ordering = ["-created_at"]

    def __str__(self):
        return f"Note by {self.doctor} on {self.medical_file}"
