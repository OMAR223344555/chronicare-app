from django.utils import timezone
from rest_framework import serializers

from .models import Medication


class MedicationSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source="patient.full_name", read_only=True)
    taken_today = serializers.SerializerMethodField()
    time = serializers.TimeField(format="%H:%M")

    class Meta:
        model = Medication
        fields = ["id", "name", "dose", "time", "notes", "active", "patient_name", "taken_today", "created_at"]
        read_only_fields = ["created_at"]

    def get_taken_today(self, obj):
        today = timezone.localdate()
        return obj.intakes.filter(date=today).exists()
