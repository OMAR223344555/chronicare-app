"""File upload, filtering, archive and timeline (FR-02, FR-03, FR-06)."""
import io

from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.test import APITestCase

from accounts.models import User
from .models import Category, Condition, MedicalFile

PDF = b"%PDF-1.4 minimal\n%%EOF\n"


def auth(client, user):
    token, _ = Token.objects.get_or_create(user=user)
    client.credentials(HTTP_AUTHORIZATION=f"Token {token.key}")


class FileTests(APITestCase):
    def setUp(self):
        self.patient = User.objects.create_user(
            username="p@example.com", email="p@example.com",
            password="secret123", role=User.Role.PATIENT,
        )
        self.other = User.objects.create_user(
            username="o@example.com", email="o@example.com",
            password="secret123", role=User.Role.PATIENT,
        )
        self.cat = Category.objects.create(name="Lab Report")
        self.cond = Condition.objects.create(name="Diabetes")
        auth(self.client, self.patient)

    def upload(self, title="HbA1c panel"):
        f = SimpleUploadedFile("report.pdf", PDF, content_type="application/pdf")
        return self.client.post("/api/files/", {
            "file": f, "title": title, "category": self.cat.pk,
            "condition": self.cond.pk, "record_date": "2026-10-01",
        }, format="multipart")

    def test_patient_uploads_file(self):
        r = self.upload()
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)
        self.assertEqual(r.data["category_name"], "Lab Report")
        self.assertTrue(MedicalFile.objects.filter(owner=self.patient).exists())

    def test_upload_rejects_non_pdf_jpg_png(self):
        f = SimpleUploadedFile("evil.exe", b"MZ", content_type="application/octet-stream")
        r = self.client.post("/api/files/", {
            "file": f, "title": "x", "category": self.cat.pk,
            "condition": self.cond.pk, "record_date": "2026-10-01",
        }, format="multipart")
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)

    def test_patients_only_see_their_own_files(self):
        self.upload()
        auth(self.client, self.other)
        r = self.client.get("/api/files/")
        self.assertEqual(r.data["count"], 0)

    def test_search_and_filter(self):
        self.upload("Kidney ultrasound")
        r = self.client.get("/api/files/?search=kidney")
        self.assertEqual(r.data["count"], 1)
        r = self.client.get(f"/api/files/?condition={self.cond.pk}")
        self.assertEqual(r.data["count"], 1)
        r = self.client.get("/api/files/?archived=true")
        self.assertEqual(r.data["count"], 0)

    def test_archive_and_restore(self):
        pk = self.upload().data["id"]
        r = self.client.post(f"/api/files/{pk}/archive/")
        self.assertTrue(r.data["archived"])
        r = self.client.get("/api/files/?archived=false")
        self.assertEqual(r.data["count"], 0)
        r = self.client.post(f"/api/files/{pk}/restore/")
        self.assertFalse(r.data["archived"])

    def test_archive_other_patients_file_forbidden(self):
        pk = self.upload().data["id"]
        auth(self.client, self.other)
        r = self.client.post(f"/api/files/{pk}/archive/")
        self.assertEqual(r.status_code, status.HTTP_403_FORBIDDEN)

    def test_download_logs_audit(self):
        from auditlog.models import AuditLog
        pk = self.upload().data["id"]
        r = self.client.get(f"/api/files/{pk}/download/")
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertTrue(AuditLog.objects.filter(action="download").exists())

    def test_timeline_includes_archived(self):
        self.upload()
        pk = MedicalFile.objects.get().pk
        self.client.post(f"/api/files/{pk}/archive/")
        r = self.client.get("/api/timeline/")
        self.assertEqual(len(r.data), 1)

    def test_doctor_cannot_upload(self):
        doc = User.objects.create_user(
            username="d@example.com", email="d@example.com",
            password="secret123", role=User.Role.DOCTOR,
        )
        auth(self.client, doc)
        self.assertEqual(self.upload().status_code, status.HTTP_403_FORBIDDEN)
