from django.conf import settings
from django.db import models


class LabTestType(models.Model):
    """Admin-managed lab test with its reference range (FR-11).

    e.g. HbA1c (%), fasting glucose (mg/dL), systolic/diastolic blood
    pressure (mmHg), creatinine (mg/dL), eGFR (mL/min/1.73m2).
    A NULL bound means "no limit on that side" (e.g. eGFR has only a minimum).
    """

    name = models.CharField(max_length=80)
    code = models.CharField(max_length=20, unique=True, help_text="Short code, e.g. HBA1C")
    unit = models.CharField(max_length=30)
    ref_min = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    ref_max = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)

    class Meta:
        db_table = "lab_test_types"
        ordering = ["name"]

    def __str__(self):
        return f"{self.name} ({self.unit})"


class LabResult(models.Model):
    """One measured lab value for a patient (FR-04)."""

    patient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="lab_results",
        limit_choices_to={"role": "patient"},
    )
    test_type = models.ForeignKey(LabTestType, on_delete=models.PROTECT, related_name="results")
    value = models.DecimalField(max_digits=10, decimal_places=2)
    measured_at = models.DateField()
    note = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "lab_results"
        ordering = ["-measured_at"]

    @property
    def out_of_range(self):
        t = self.test_type
        if t.ref_min is not None and self.value < t.ref_min:
            return True
        if t.ref_max is not None and self.value > t.ref_max:
            return True
        return False

    def __str__(self):
        return f"{self.test_type.code}={self.value} on {self.measured_at}"
