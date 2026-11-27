from django.contrib import admin

from .models import Category, Condition, MedicalFile


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "description")
    search_fields = ("name",)


@admin.register(Condition)
class ConditionAdmin(admin.ModelAdmin):
    list_display = ("name", "description")
    search_fields = ("name",)


@admin.register(MedicalFile)
class MedicalFileAdmin(admin.ModelAdmin):
    list_display = ("title", "owner", "category", "condition", "record_date", "archived")
    list_filter = ("category", "condition", "archived")
    search_fields = ("title", "owner__email", "issuing_facility", "issuing_doctor")
