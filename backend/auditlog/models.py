from django.conf import settings
from django.db import models


class AuditLog(models.Model):
    """FR-12: every file view, share, revoke and download is recorded here."""

    class Action(models.TextChoices):
        REGISTER = "register", "Account registered"
        LOGIN = "login", "Logged in"
        UPLOAD = "upload", "File uploaded"
        VIEW = "view", "File viewed"
        DOWNLOAD = "download", "File downloaded"
        SHARE = "share", "File(s) shared"
        REVOKE = "revoke", "Share revoked"
        ARCHIVE = "archive", "File archived"
        RESTORE = "restore", "File restored"
        NOTE = "note", "Doctor note added"
        LAB_ADD = "lab_add", "Lab result added"
        APPROVE = "approve", "Account approved"
        DEACTIVATE = "deactivate", "Account deactivated"
        ACTIVATE = "activate", "Account reactivated"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="audit_entries",
    )
    action = models.CharField(max_length=12, choices=Action.choices)
    medical_file = models.ForeignKey(
        "records.MedicalFile",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="audit_entries",
    )
    target_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="audit_entries_about_me",
        help_text="The other party, e.g. the doctor a file was shared with.",
    )
    details = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "audit_log"
        ordering = ["-created_at"]

    def __str__(self):
        who = self.user or "system"
        return f"{self.created_at:%Y-%m-%d %H:%M} {who} {self.action}"
