from rest_framework import serializers

from .models import AuditLog


class AuditLogSerializer(serializers.ModelSerializer):
    user_email = serializers.CharField(source="user.email", default=None)
    target_email = serializers.CharField(source="target_user.email", default=None)
    file_title = serializers.CharField(source="medical_file.title", default=None)
    action_label = serializers.CharField(source="get_action_display", read_only=True)

    class Meta:
        model = AuditLog
        fields = [
            "id", "created_at", "user", "user_email", "action", "action_label",
            "medical_file", "file_title", "target_user", "target_email", "details",
        ]
