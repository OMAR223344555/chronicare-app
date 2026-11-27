from django.contrib import admin

from .models import AuditLog


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ("created_at", "user", "action", "medical_file", "target_user", "details")
    list_filter = ("action",)
    search_fields = ("user__email", "details")
    readonly_fields = ("created_at",)
