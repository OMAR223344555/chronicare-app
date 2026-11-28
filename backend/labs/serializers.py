from rest_framework import serializers

from .models import LabResult, LabTestType

# Plausibility bounds by test code: reject physiologically impossible values
# (typos), NOT out-of-range medical values, which stay allowed and are flagged
# High/Low by the client. Mirrored in the patient portal Add Result form
# (frontend js/script.js LAB_LIMITS).
# Keyed by backend test_type.code (the frontend's "FBG" key maps to the
# server's "FGLU" Fasting Glucose type via api.js TEST_KEY).
PLAUSIBLE_RANGES = {
    "HBA1C": (3, 18),      # %
    "FGLU": (30, 600),     # mg/dL
    "SBP": (60, 250),      # mmHg
    "EGFR": (5, 150),      # mL/min/1.73m2
}


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

    def validate(self, attrs):
        test_type = attrs.get("test_type")
        value = attrs.get("value")
        if test_type is not None and value is not None:
            bounds = PLAUSIBLE_RANGES.get(test_type.code)
            if bounds and not (bounds[0] <= value <= bounds[1]):
                raise serializers.ValidationError({
                    "value": (
                        f"{value} looks implausible for {test_type.name}; "
                        f"plausible values are roughly {bounds[0]} - {bounds[1]} "
                        f"{test_type.unit}. Check the value or the selected test."
                    )
                })
        return attrs
