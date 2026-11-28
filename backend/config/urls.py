from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path

from auditlog.views import MyAccessLogView, NotificationListView, NotificationReadView, SyncView

urlpatterns = [
    path("django-admin/", admin.site.urls),
    path("api/auth/", include("accounts.urls")),
    path("api/sync/", SyncView.as_view(), name="sync"),
    path("api/my-access-log/", MyAccessLogView.as_view(), name="my-access-log"),
    path("api/notifications/", NotificationListView.as_view(), name="notifications"),
    path("api/notifications/read-all/", NotificationReadView.as_view(), name="notifications-read-all"),
    path("api/notifications/<int:pk>/read/", NotificationReadView.as_view(), name="notification-read"),
    path("api/", include("records.urls")),
    path("api/", include("labs.urls")),
    path("api/", include("sharing.urls")),
    path("api/", include("appointments.urls")),
    path("api/", include("medications.urls")),
    path("api/admin/", include("accounts.urls_admin")),
    path("api/admin/", include("auditlog.urls")),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
