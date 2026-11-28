from django.conf import settings
from django.db import models


class Medication(models.Model):
    """A patient's daily medication: what to take, how much, and when.

    The patient manages their own list; doctors read it only while an
    active share with that patient exists. Marking a dose taken writes a
    MedicationIntake row for the day, so the care plan survives reloads
    and adherence can be reported later.
    """

    patient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="medications",
        limit_choices_to={"role": "patient"},
    )
    name = models.CharField(max_length=120)
    dose = models.CharField(max_length=80, help_text='Free text, e.g. "500mg" or "1 tablet".')
    time = models.TimeField(help_text="Daily due time for the dose.")
    notes = models.CharField(max_length=255, blank=True)
    active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "medications"
        ordering = ["time", "id"]

    def __str__(self):
        return f"{self.name} {self.dose} @ {self.time:%H:%M} ({self.patient})"


class MedicationIntake(models.Model):
    """One row per medication per day the patient marked the dose taken."""

    medication = models.ForeignKey(
        Medication, on_delete=models.CASCADE, related_name="intakes"
    )
    date = models.DateField()
    taken_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "medication_intakes"
        constraints = [
            models.UniqueConstraint(fields=["medication", "date"], name="uniq_intake_per_day")
        ]
        ordering = ["-date", "-id"]

    def __str__(self):
        return f"{self.medication.name} taken on {self.date}"
