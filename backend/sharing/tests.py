"""Sharing with expiry/revoke, doctor views and notes (FR-05..FR-09)."""
import datetime

from django.core.files.uploadedfile import SimpleUploadedFile
from django.utils import timezone
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.test import APITestCase

from accounts.models import User
from records.models import Category, Condition, MedicalFile
from .models import DoctorNote, Share

PDF = b"%PDF-1.4 minimal\n%%EOF\n"


def auth(client, user):
    token, _ = Token.objects.get_or_create(user=user)
    client.credentials(HTTP_AUTHORIZATION=f"Token {token.key}")


class ShareFlowTests(APITestCase):
    def setUp(self):
        self.patient = User.objects.create_user(
            username="p@example.com", email="p@example.com",
            password="secret123", role=User.Role.PATIENT, full_name="Maya Hassan",
        )
        self.doctor = User.objects.create_user(
            username="d@example.com", email="d@example.com",
            password="secret123", role=User.Role.DOCTOR, full_name="Dr. Sara Adel",
        )
        self.other_doctor = User.objects.create_user(
            username="d2@example.com", email="d2@example.com",
            password="secret123", role=User.Role.DOCTOR,
        )
        self.cat = Category.objects.create(name="Lab Report")
        self.cond = Condition.objects.create(name="Diabetes")
        auth(self.client, self.patient)
        f = SimpleUploadedFile("r.pdf", PDF, content_type="application/pdf")
        r = self.client.post("/api/files/", {
            "file": f, "title": "HbA1c panel", "category": self.cat.pk,
            "condition": self.cond.pk, "record_date": "2026-10-01",
        }, format="multipart")
        self.file_id = r.data["id"]

    def create_share(self, days=90, doctor=None):
        return self.client.post("/api/shares/", {
            "doctor": (doctor or self.doctor).pk,
            "files": [self.file_id],
            "categories": [],
            "include_lab_results": True,
            "expires_on": (timezone.localdate() + datetime.timedelta(days=days)).isoformat(),
        }, format="json")

    def test_full_share_flow(self):
        # doctor list visible to patient
        r = self.client.get("/api/doctors/")
        self.assertEqual(len(r.data), 2)

        # create share
        r = self.create_share()
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)
        self.assertTrue(r.data["is_active"])
        share_id = r.data["id"]

        # doctor sees the patient and the file
        auth(self.client, self.doctor)
        r = self.client.get("/api/doctor/patients/")
        self.assertEqual(len(r.data), 1)
        self.assertEqual(r.data[0]["full_name"], "Maya Hassan")
        self.assertTrue(r.data[0]["has_new"])
        r = self.client.get("/api/doctor/files/")
        self.assertEqual(r.data["count"], 1)

        # mark seen clears the new marker
        r = self.client.post(f"/api/doctor/patients/{self.patient.pk}/mark-seen/")
        self.assertEqual(r.data["marked_seen"], 1)
        r = self.client.get("/api/doctor/patients/")
        self.assertFalse(r.data[0]["has_new"])

        # doctor adds a note; patient reads it
        r = self.client.post("/api/notes/", {
            "medical_file": self.file_id, "text": "Looking better.",
        }, format="json")
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)
        auth(self.client, self.patient)
        r = self.client.get(f"/api/notes/?medical_file={self.file_id}")
        self.assertEqual(r.data["count"], 1)

        # revoke cuts doctor access
        r = self.client.post(f"/api/shares/{share_id}/revoke/")
        self.assertIsNotNone(r.data["revoked_at"])
        self.assertFalse(r.data["is_active"])
        auth(self.client, self.doctor)
        r = self.client.get("/api/doctor/files/")
        self.assertEqual(r.data["count"], 0)

    def test_share_files_and_categories_persist(self):
        # Regression: with the ERD junction tables (share_files /
        # share_categories) the M2M payload must survive create and re-read.
        r = self.client.post("/api/shares/", {
            "doctor": self.doctor.pk,
            "files": [self.file_id],
            "categories": [self.cat.pk],
            "include_lab_results": True,
            "expires_on": (timezone.localdate() + datetime.timedelta(days=30)).isoformat(),
        }, format="json")
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)
        self.assertEqual(r.data["files"], [self.file_id])
        self.assertEqual(r.data["categories"], [self.cat.pk])
        r2 = self.client.get("/api/shares/")
        row = [s for s in r2.data["results"] if s["id"] == r.data["id"]][0]
        self.assertEqual(row["files"], [self.file_id])
        self.assertEqual(row["categories"], [self.cat.pk])

    def test_expired_share_grants_nothing(self):
        self.create_share(days=-1)
        auth(self.client, self.doctor)
        self.assertEqual(self.client.get("/api/doctor/files/").data["count"], 0)

    def test_other_doctor_sees_nothing(self):
        self.create_share()
        auth(self.client, self.other_doctor)
        self.assertEqual(self.client.get("/api/doctor/files/").data["count"], 0)

    def test_cannot_share_someone_elses_file(self):
        other_file = MedicalFile.objects.create(
            owner=self.other_doctor,  # not a patient, but ownership is what matters here
            category=self.cat, condition=self.cond,
            title="x", record_date="2026-01-01",
        )
        r = self.client.post("/api/shares/", {
            "doctor": self.doctor.pk, "files": [other_file.pk], "categories": [],
            "include_lab_results": False,
            "expires_on": "2027-01-01",
        }, format="json")
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)

    def test_doctor_cannot_note_unshared_file(self):
        auth(self.client, self.doctor)
        r = self.client.post("/api/notes/", {
            "medical_file": self.file_id, "text": "Should fail.",
        }, format="json")
        self.assertEqual(r.status_code, status.HTTP_403_FORBIDDEN)

    def test_share_logs_audit(self):
        from auditlog.models import AuditLog
        self.create_share()
        self.assertTrue(AuditLog.objects.filter(action="share").exists())
