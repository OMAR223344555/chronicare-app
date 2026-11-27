import os

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models

ALLOWED_EXTENSIONS = {".pdf", ".jpg", ".jpeg", ".png"}


def validate_medical_file_extension(file):
    ext = os.path.splitext(file.name)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise ValidationError("Only PDF, JPG and PNG files are allowed.")


class Category(models.Model):
    """File category, admin-managed (FR-11). E.g. lab report, prescription,
    imaging, specialist report, discharge summary."""

    name = models.CharField(max_length=80, unique=True)
    description = models.CharField(max_length=255, blank=True)

    class Meta:
        db_table = "categories"
        ordering = ["name"]
        verbose_name_plural = "categories"

    def __str__(self):
        return self.name


class Condition(models.Model):
    """Chronic condition, admin-managed (FR-11). E.g. diabetes, hypertension,
    chronic kidney disease."""

    name = models.CharField(max_length=80, unique=True)
    description = models.CharField(max_length=255, blank=True)

    class Meta:
        db_table = "conditions"
        ordering = ["name"]

    def __str__(self):
        return self.name


class MedicalFile(models.Model):
    """One uploaded medical document with its metadata (FR-02)."""

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="medical_files",
        limit_choices_to={"role": "patient"},
    )
    file = models.FileField(
        upload_to="medical_files/%Y/%m/",
        validators=[validate_medical_file_extension],
    )
    title = models.CharField(max_length=150)
    category = models.ForeignKey(Category, on_delete=models.PROTECT, related_name="files")
    condition = models.ForeignKey(Condition, on_delete=models.PROTECT, related_name="files")
    record_date = models.DateField(help_text="Date the document was issued.")
    issuing_facility = models.CharField(max_length=150, blank=True)
    issuing_doctor = models.CharField(max_length=150, blank=True)
    specialty = models.CharField(max_length=120, blank=True)
    archived = models.BooleanField(default=False)
    uploaded_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "medical_files"
        ordering = ["-record_date", "-uploaded_at"]

    def __str__(self):
        return f"{self.title} ({self.owner})"
