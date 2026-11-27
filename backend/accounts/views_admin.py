from rest_framework import generics, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from accounts.models import User
from accounts.permissions import IsPlatformAdmin
from accounts.serializers import UserSerializer
from auditlog.services import log_action


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
