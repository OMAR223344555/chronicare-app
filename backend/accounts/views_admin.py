
from rest_framework import generics, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from accounts.models import User
from accounts.permissions import IsPlatformAdmin
from accounts.serializers import UserSerializer
from auditlog.services import log_action, notify


class AdminUserViewSet(viewsets.ReadOnlyModelViewSet):
    """FR-10: the admin reviews accounts and approves / deactivates /
    reactivates doctors and patients. Password resets happen through the
    Django admin or a password-reset email flow (out of demo scope)."""

    permission_classes = [IsPlatformAdmin]
    serializer_class = UserSerializer
    filterset_fields = ["role", "status"]
    search_fields = ["email", "full_name", "specialty", "license_number"]

    def get_queryset(self):
        return User.objects.all().order_by("-date_joined")

    @action(detail=True, methods=["post"])
    def approve(self, request, pk=None):
        user = self.get_object()
        user.status = User.Status.ACTIVE
        user.save(update_fields=["status"])
        log_action(request.user, "approve", target_user=user)
        notify(user, "approve", "Your doctor account has been approved. You can now receive shared files.")
        return Response(UserSerializer(user).data)

    @action(detail=True, methods=["post"])
    def deactivate(self, request, pk=None):
        user = self.get_object()
        user.status = User.Status.DEACTIVATED
        user.save(update_fields=["status"])
        log_action(request.user, "deactivate", target_user=user)
        return Response(UserSerializer(user).data)

    @action(detail=True, methods=["post"])
    def activate(self, request, pk=None):
        user = self.get_object()
        user.status = User.Status.ACTIVE
        user.save(update_fields=["status"])
        log_action(request.user, "activate", target_user=user)
        return Response(UserSerializer(user).data)

    @action(detail=True, methods=["delete"])
    def delete_account(self, request, pk=None):
        """Permanently delete an account (FR-10).

        Safeguards: an administrator can never delete their own account, and
        the last remaining administrator can never be deleted.

        A patient's or doctor's medical files, lab results, shares (given and
        received, with their share-file links) and doctor notes are removed
        with the account by the model cascades; the uploaded file bytes are
        deleted from storage first so nothing is left orphaned on disk. The
        audit entry is written before the delete and survives it (the audit
        foreign keys are SET_NULL), so the trail keeps who was removed.
        """
        user = self.get_object()

        if user.pk == request.user.pk:
            return Response(
                {"detail": "You cannot delete your own account."}, status=400
            )

        if user.role == User.Role.ADMIN:
            other_admins = (
                User.objects.filter(role=User.Role.ADMIN)
                .exclude(pk=user.pk)
                .exists()
            )
            if not other_admins:
                return Response(
                    {"detail": "You cannot delete the last administrator account."},
                    status=400,
                )

        label = user.full_name or user.username or user.email
        details = f"deleted {user.role} account {user.email} ({label})"

        # Remove uploaded file bytes from storage before the cascade removes rows.
        for medical_file in user.medical_files.all():
            try:
                if medical_file.file:
                    medical_file.file.delete(save=False)
            except OSError:
                pass

        log_action(request.user, "delete", target_user=user, details=details)
        user.delete()
        return Response(status=204)

    @action(detail=False, methods=["get"])
    def stats(self, request):
        """Platform analytics for the admin dashboard: real file counts per
        category and total storage, computed from the records tables."""
        from django.db.models import Count
        from records.models import Category, MedicalFile

        cats = (
            Category.objects.annotate(n=Count("files"))
            .order_by("name")
            .values("name", "n")
        )
        total_bytes = 0
        for f in MedicalFile.objects.only("file"):
            try:
                total_bytes += f.file.size if f.file else 0
            except OSError:
                pass
        from django.utils import timezone
        from appointments.models import Appointment
        from auditlog.models import AuditLog
        from sharing.models import Share

        today = timezone.now().date()
        week_ago = timezone.now() - timezone.timedelta(days=7)
        appts = Appointment.objects.values("status").annotate(n=Count("id"))
        audit_7d = AuditLog.objects.filter(created_at__gte=week_ago)
        return Response({
            "files_total": MedicalFile.objects.count(),
            "storage_bytes": total_bytes,
            "categories": [{"name": c["name"], "count": c["n"]} for c in cats],
            "shares_active": Share.objects.filter(revoked_at__isnull=True, expires_on__gte=today).count(),
            "appointments": {a["status"]: a["n"] for a in appts},
            "appointments_upcoming": Appointment.objects.filter(
                scheduled_at__gte=timezone.now(),
                status__in=[Appointment.Status.PENDING, Appointment.Status.CONFIRMED],
            ).count(),
            "views_7d": audit_7d.filter(action="view").count(),
            "downloads_7d": audit_7d.filter(action="download").count(),
            "logins_7d": audit_7d.filter(action="login").count(),
        })
