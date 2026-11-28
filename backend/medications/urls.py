from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import MedicationViewSet

router = DefaultRouter()
router.register("medications", MedicationViewSet, basename="medication")

urlpatterns = [
    path("", include(router.urls)),
]
