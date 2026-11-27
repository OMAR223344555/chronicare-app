from rest_framework.permissions import BasePermission

from .models import User


class IsPatient(BasePermission):
    message = "Only patients can do this."

    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == User.Role.PATIENT


class IsApprovedDoctor(BasePermission):
    message = "Only approved doctors can do this."

    def has_permission(self, request, view):
        return (
            request.user.is_authenticated
            and request.user.role == User.Role.DOCTOR
            and request.user.status == User.Status.ACTIVE
        )


class IsPlatformAdmin(BasePermission):
    message = "Only administrators can do this."

    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.is_platform_admin


class IsActiveAccount(BasePermission):
    message = "This account is pending approval or deactivated."

    def has_permission(self, request, view):
        return (
            request.user.is_authenticated
            and request.user.status == User.Status.ACTIVE
        )
