"""Patient access history endpoint (who opened my files)."""
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.test import APITestCase

from accounts.models import User
from records.models import Category, Condition, MedicalFile

from .models import AuditLog
from .services import log_action


class MyAccessLogTests(APITestCase):
    def setUp(self):
        self.patient = User.objects.create_user(
            username="p@example.com", email="p@example.com",
            password="secret123", role=User.Role.PATIENT,
        )
        self.other_patient = User.objects.create_user(
            username="o@example.com", email="o@example.com",
            password="secret123", role=User.Role.PATIENT,
        )
        self.doctor = User.objects.create_user(
            username="d@example.com", email="d@example.com",
            password="secret123", role=User.Role.DOCTOR,
            status=User.Status.ACTIVE,
        )
        cat = Category.objects.create(name="Lab Report")
        cond = Condition.objects.create(name="Diabetes")
        self.file = MedicalFile.objects.create(
            owner=self.patient, title="HbA1c panel", category=cat,
            condition=cond, record_date="2026-10-01",
        )
        token, _ = Token.objects.get_or_create(user=self.patient)
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {token.key}")

    def test_patient_sees_views_downloads_and_notes_on_own_files(self):
        log_action(self.doctor, "view", medical_file=self.file, target_user=self.patient)
        log_action(self.doctor, "download", medical_file=self.file, target_user=self.patient)
        log_action(self.doctor, "note", medical_file=self.file, target_user=self.patient)
        r = self.client.get("/api/my-access-log/")
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(r.data["count"], 3)
        actions = [row["action"] for row in r.data["results"]]
        self.assertEqual(sorted(actions), ["download", "note", "view"])
        self.assertEqual(r.data["results"][0]["user_email"], "d@example.com")
        self.assertEqual(r.data["results"][0]["file_title"], "HbA1c panel")

    def test_own_actions_and_other_patients_are_hidden(self):
        # The patient opening their own file must not appear...
        log_action(self.patient, "view", medical_file=self.file, target_user=self.patient)
        # ...and events about someone else's files must not leak in.
        other_file = MedicalFile.objects.create(
            owner=self.other_patient, title="Secret", category=self.file.category,
            condition=self.file.condition, record_date="2026-10-02",
        )
        log_action(self.doctor, "view", medical_file=other_file, target_user=self.other_patient)
        r = self.client.get("/api/my-access-log/")
        self.assertEqual(r.data["count"], 0)

    def test_share_and_upload_actions_are_not_listed(self):
        log_action(self.patient, "upload", medical_file=self.file)
        log_action(self.patient, "share", target_user=self.doctor, details="Share #1")
        r = self.client.get("/api/my-access-log/")
        self.assertEqual(r.data["count"], 0)

    def test_doctor_and_anonymous_are_rejected(self):
        token, _ = Token.objects.get_or_create(user=self.doctor)
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {token.key}")
        self.assertEqual(
            self.client.get("/api/my-access-log/").status_code,
            status.HTTP_403_FORBIDDEN,
        )
        self.client.credentials()
        self.assertIn(
            self.client.get("/api/my-access-log/").status_code,
            (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN),
        )


class NotificationTests(APITestCase):
    def setUp(self):
        self.patient = User.objects.create_user(
            username="np@example.com", email="np@example.com",
            password="secret123", role=User.Role.PATIENT,
        )
        self.doctor = User.objects.create_user(
            username="nd@example.com", email="nd@example.com",
            password="secret123", role=User.Role.DOCTOR,
            status=User.Status.ACTIVE,
        )
        token, _ = Token.objects.get_or_create(user=self.doctor)
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {token.key}")

    def test_share_notifies_the_doctor(self):
        r = self.client.get("/api/notifications/")
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(r.data, [])
        # patient shares with the doctor
        token, _ = Token.objects.get_or_create(user=self.patient)
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {token.key}")
        r = self.client.post("/api/shares/", {
            "doctor": self.doctor.pk, "expires_on": "2026-12-31",
            "files": [], "categories": [],
        }, format="json")
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)
        # doctor sees the notification and can mark it read
        token, _ = Token.objects.get_or_create(user=self.doctor)
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {token.key}")
        r = self.client.get("/api/notifications/")
        self.assertEqual(len(r.data), 1)
        self.assertEqual(r.data[0]["kind"], "share")
        self.assertFalse(r.data[0]["is_read"])
        r = self.client.post("/api/notifications/read-all/")
        self.assertEqual(r.data["marked_read"], 1)
        r = self.client.get("/api/notifications/")
        self.assertTrue(r.data[0]["is_read"])

    def test_approve_notifies_the_doctor(self):
        admin = User.objects.create_user(
            username="a@example.com", email="a@example.com",
            password="secret123", role=User.Role.ADMIN,
        )
        token, _ = Token.objects.get_or_create(user=admin)
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {token.key}")
        r = self.client.post(f"/api/admin/users/{self.doctor.pk}/approve/")
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        token, _ = Token.objects.get_or_create(user=self.doctor)
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {token.key}")
        kinds = [n["kind"] for n in self.client.get("/api/notifications/").data]
        self.assertIn("approve", kinds)

    def test_notifications_are_private(self):
        from auditlog.services import notify
        notify(self.patient, "system", "for the patient only")
        r = self.client.get("/api/notifications/")
        self.assertEqual(r.data, [])
