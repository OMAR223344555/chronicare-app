from django.contrib import admin

from .models import LabResult, LabTestType


@admin.register(LabTestType)
class LabTestTypeAdmin(admin.ModelAdmin):
    list_display = ("name", "code", "unit", "ref_min", "ref_max")
    search_fields = ("name", "code")


@admin.register(LabResult)
class LabResultAdmin(admin.ModelAdmin):
    list_display = ("patient", "test_type", "value", "measured_at")
    list_filter = ("test_type",)
    search_fields = ("patient__email",)
