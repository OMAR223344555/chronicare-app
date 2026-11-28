from django.utils import timezone
from rest_framework import serializers

from accounts.models import User

from .models import Appointment


class AppointmentSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source="patient.full_name", read_only=True)
    doctor_name = serializers.CharField(source="doctor.full_name", read_only=True)
    doctor_specialty = serializers.CharField(source="doctor.specialty", read_only=True)

    class Meta:
        model = Appointment
        fields = [
            "id", "patient", "doctor", "patient_name", "doctor_name",
            "doctor_specialty", "scheduled_at", "reason", "status", "created_at",
        ]
        read_only_fields = ["patient", "status", "created_at"]

    def validate_doctor(self, doctor):
        if not (doctor.role == User.Role.DOCTOR and doctor.status == User.Status.ACTIVE):
            raise serializers.ValidationError("Appointments can only be booked with an approved doctor.")
        return doctor

    def validate_scheduled_at(self, dt):
        if dt < timezone.now():
            raise serializers.ValidationError("Appointments must be in the future.")
        return dt
