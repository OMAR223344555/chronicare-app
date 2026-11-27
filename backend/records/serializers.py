from rest_framework import serializers

from .models import Category, Condition, MedicalFile


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ["id", "name", "description"]


class ConditionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Condition
        fields = ["id", "name", "description"]


class MedicalFileSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source="category.name", read_only=True)
    condition_name = serializers.CharField(source="condition.name", read_only=True)
    owner_email = serializers.CharField(source="owner.email", read_only=True)
    file_url = serializers.SerializerMethodField()

    class Meta:
        model = MedicalFile
        fields = [
            "id", "owner", "owner_email", "file", "file_url", "title",
            "category", "category_name", "condition", "condition_name",
            "record_date", "issuing_facility", "issuing_doctor", "specialty",
            "archived", "uploaded_at", "updated_at",
        ]
        read_only_fields = ["id", "owner", "uploaded_at", "updated_at"]

    def get_file_url(self, obj):
        request = self.context.get("request")
        if obj.file and request:
            return request.build_absolute_uri(obj.file.url)
        return None
