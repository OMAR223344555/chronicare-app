import uuid
from datetime import timedelta

from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone


DEMO_EMAIL_SUFFIX = "@chronicare.demo"


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
    def is_reset_protected(self):
        """Admins and the shared demo logins can never be reset through the
        public forgot-password flow; an admin changes those passwords
        through the Django admin instead."""
        return (
            self.role == self.Role.ADMIN
            or self.is_staff
            or self.is_superuser
            or (self.email or "").strip().lower().endswith(DEMO_EMAIL_SUFFIX)
        )

    @property
    def is_platform_admin(self):
        return self.role == self.Role.ADMIN or self.is_staff or self.is_superuser


class PasswordResetToken(models.Model):
    """One-time password-reset token, emailed as a reset link.

    Valid for 30 minutes and marked used after a successful reset.
    """

    EXPIRY_MINUTES = 30

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="password_reset_tokens")
    token = models.UUIDField(default=uuid.uuid4, unique=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    used_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "password_reset_tokens"

    @property
    def is_expired(self):
        return timezone.now() > self.created_at + timedelta(minutes=self.EXPIRY_MINUTES)

    @property
    def is_usable(self):
        return self.used_at is None and not self.is_expired
