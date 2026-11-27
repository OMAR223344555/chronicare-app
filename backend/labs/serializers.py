from rest_framework import serializers

from .models import LabResult, LabTestType


class LabTestTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = LabTestType
        fields = ["id", "name", "code", "unit", "ref_min", "ref_max"]


class LabResultSerializer(serializers.ModelSerializer):
    test_code = serializers.CharField(source="test_type.code", read_only=True)
    test_name = serializers.CharField(source="test_type.name", read_only=True)
    unit = serializers.CharField(source="test_type.unit", read_only=True)
    ref_min = serializers.DecimalField(
        source="test_type.ref_min", max_digits=8, decimal_places=2, read_only=True
    )
    ref_max = serializers.DecimalField(
        source="test_type.ref_max", max_digits=8, decimal_places=2, read_only=True
    )
    out_of_range = serializers.BooleanField(read_only=True)

    class Meta:
        model = LabResult
        fields = [
            "id", "patient", "test_type", "test_code", "test_name", "unit",
            "value", "ref_min", "ref_max", "out_of_range",
            "measured_at", "note", "created_at",
        ]
        read_only_fields = ["id", "patient", "created_at"]
