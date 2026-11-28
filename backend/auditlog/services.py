from .models import AuditLog, Notification


def log_action(user, action, medical_file=None, target_user=None, details=""):
    """Single entry point so every app logs the same way."""
    return AuditLog.objects.create(
        user=user if getattr(user, "is_authenticated", False) else None,
        action=action,
        medical_file=medical_file,
        target_user=target_user,
        details=details[:255],
    )


def notify(user, kind, text):
    """Create an in-app notification for one user."""
    return Notification.objects.create(user=user, kind=kind, text=text[:255])
