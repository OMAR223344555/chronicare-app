from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    DoctorMarkSeenView,
    DoctorNoteViewSet,
    DoctorPatientsView,
    DoctorSharedFilesView,
    ShareViewSet,
    VerifiedDoctorListView,
)

router = DefaultRouter()
router.register("shares", ShareViewSet, basename="share")
router.register("notes", DoctorNoteViewSet, basename="note")

urlpatterns = [
    path("", include(router.urls)),
    path("doctors/", VerifiedDoctorListView.as_view(), name="doctor-list"),
    path("doctor/patients/", DoctorPatientsView.as_view(), name="doctor-patients"),
    path("doctor/files/", DoctorSharedFilesView.as_view(), name="doctor-files"),
    path(
        "doctor/patients/<int:patient_id>/mark-seen/",
        DoctorMarkSeenView.as_view(),
        name="doctor-mark-seen",
    ),
]
