from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import User


@admin.register(User)
class ChronicareUserAdmin(UserAdmin):
    list_display = ("username", "full_name", "email", "role", "status", "specialty")
    list_filter = ("role", "status")
    fieldsets = UserAdmin.fieldsets + (
        ("Chronicare", {"fields": ("role", "status", "full_name", "specialty", "license_number")}),
    )
