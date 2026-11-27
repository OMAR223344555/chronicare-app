from rest_framework import serializers

from accounts.models import User
from records.models import Category, MedicalFile

from .models import DoctorNote, Share
from .services import share_has_new_content


class DoctorBriefSerializer(serializers.ModelSerializer):
    """Verified doctors a patient can pick from (FR-05)."""

    class Meta:
        model = User
        fields = ["id", "full_name", "specialty", "email"]


class ShareSerializer(serializers.ModelSerializer):
    # DRF auto-generates M2M fields as read-only when the through model is
    # declared explicitly (share_files / share_categories in the ERD), so we
    # declare them writable ourselves; plain .set() is all the junctions need.
    files = serializers.PrimaryKeyRelatedField(
        many=True, queryset=MedicalFile.objects.all(), required=False
    )
    categories = serializers.PrimaryKeyRelatedField(
        many=True, queryset=Category.objects.all(), required=False
    )
    doctor_name = serializers.CharField(source="doctor.full_name", read_only=True)
    doctor_specialty = serializers.CharField(source="doctor.specialty", read_only=True)
    patient_name = serializers.CharField(source="patient.full_name", read_only=True)
    is_active = serializers.BooleanField(read_only=True)

    class Meta:
        model = Share
        fields = [
            "id", "patient", "patient_name", "doctor", "doctor_name",
            "doctor_specialty", "files", "categories", "include_lab_results",
            "expires_on", "revoked_at", "is_active", "created_at",
        ]
        read_only_fields = ["id", "patient", "revoked_at", "created_at"]

    def validate_doctor(self, doctor):
        if not doctor.is_approved_doctor:
            raise serializers.ValidationError(
                "You can only share with an approved doctor."
            )
        return doctor

    def validate_files(self, files):
        request = self.context["request"]
        for f in files:
            if f.owner != request.user:
                raise serializers.ValidationError("You can only share your own files.")
        return files


class DoctorNoteSerializer(serializers.ModelSerializer):
    doctor_name = serializers.CharField(source="doctor.full_name", read_only=True)
    doctor_specialty = serializers.CharField(source="doctor.specialty", read_only=True)
    file_title = serializers.CharField(source="medical_file.title", read_only=True)

    class Meta:
        model = DoctorNote
        fields = [
            "id", "doctor", "doctor_name", "doctor_specialty",
            "medical_file", "file_title", "text", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "doctor", "created_at", "updated_at"]


class SharedPatientSerializer(serializers.Serializer):
    """FR-09: one row per patient in the doctor's portal."""

    id = serializers.IntegerField()
    full_name = serializers.CharField()
    email = serializers.EmailField()
    shared_file_count = serializers.IntegerField()
    has_new = serializers.BooleanField()
    last_shared_at = serializers.DateTimeField()
