from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    """Single users table with a role column, per the project design.

    - Patients self-register and are active immediately.
    - Doctors register as PENDING until an administrator approves them.
    - Admins are created manually (createsuperuser / seed script).
    """

    class Role(models.TextChoices):
        PATIENT = "patient", "Patient"
        DOCTOR = "doctor", "Doctor"
        ADMIN = "admin", "Administrator"

    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        PENDING = "pending", "Pending approval"
        DEACTIVATED = "deactivated", "Deactivated"

    class Meta:
        db_table = "users"

    role = models.CharField(max_length=10, choices=Role.choices, default=Role.PATIENT)
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.ACTIVE)
    full_name = models.CharField(max_length=150, blank=True)
    email = models.EmailField(unique=True)
    # Doctor-only fields, filled at registration and checked by the admin.
    specialty = models.CharField(max_length=120, blank=True)
    license_number = models.CharField(max_length=60, blank=True)

    def __str__(self):
        return f"{self.full_name or self.username} ({self.role})"

    @property
    def is_patient(self):
        return self.role == self.Role.PATIENT

    @property
    def is_doctor(self):
        return self.role == self.Role.DOCTOR

    @property
    def is_approved_doctor(self):
        return self.is_doctor and self.status == self.Status.ACTIVE

    @property
    def is_platform_admin(self):
        return self.role == self.Role.ADMIN or self.is_staff or self.is_superuser
