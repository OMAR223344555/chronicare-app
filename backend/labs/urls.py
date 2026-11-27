from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import LabResultViewSet, LabTestTypeViewSet

router = DefaultRouter()
router.register("lab-test-types", LabTestTypeViewSet, basename="lab-test-type")
router.register("lab-results", LabResultViewSet, basename="lab-result")

urlpatterns = [
    path("", include(router.urls)),
]
