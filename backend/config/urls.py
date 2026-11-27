from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path("django-admin/", admin.site.urls),
    path("api/auth/", include("accounts.urls")),
    path("api/", include("records.urls")),
    path("api/", include("labs.urls")),
    path("api/", include("sharing.urls")),
    path("api/admin/", include("accounts.urls_admin")),
    path("api/admin/", include("auditlog.urls")),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
