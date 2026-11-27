from django.contrib import admin

from .models import DoctorNote, Share


@admin.register(Share)
class ShareAdmin(admin.ModelAdmin):
    list_display = ("patient", "doctor", "expires_on", "revoked_at", "created_at")
    list_filter = ("revoked_at",)
    inlines = []  # M2M uses explicit through models (share_files / share_categories)


@admin.register(DoctorNote)
class DoctorNoteAdmin(admin.ModelAdmin):
    list_display = ("doctor", "medical_file", "created_at")
    search_fields = ("doctor__email", "text")
