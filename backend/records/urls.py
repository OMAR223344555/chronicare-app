from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import CategoryViewSet, ConditionViewSet, MedicalFileViewSet, TimelineView

router = DefaultRouter()
router.register("categories", CategoryViewSet, basename="category")
router.register("conditions", ConditionViewSet, basename="condition")
router.register("files", MedicalFileViewSet, basename="medical-file")

urlpatterns = [
    path("", include(router.urls)),
    path("timeline/", TimelineView.as_view(), name="timeline"),
]
