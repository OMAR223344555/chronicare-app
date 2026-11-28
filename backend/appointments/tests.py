from datetime import timedelta

from django.test import TestCase
from django.utils import timezone
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient

from accounts.models import User
from auditlog.models import AuditLog, Notification

from .models import Appointment


class AppointmentTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.patient = User.objects.create_user(
            username="ap@example.com", email="ap@example.com",
            password="secret123", full_name="Amina Patient", role=User.Role.PATIENT,
        )
        self.doctor = User.objects.create_user(
            username="ad@example.com", email="ad@example.com",
            password="secret123", full_name="Adel Doctor", role=User.Role.DOCTOR,
            status=User.Status.ACTIVE,
        )
        self.other_patient = User.objects.create_user(
            username="op@example.com", email="op@example.com",
            password="secret123", role=User.Role.PATIENT,
        )
        self.when = timezone.now() + timedelta(days=2)

    def auth(self, user):
        token, _ = Token.objects.get_or_create(user=user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {token.key}")

    def book(self):
        return self.client.post("/api/appointments/", {
            "doctor": self.doctor.pk,
            "scheduled_at": self.when.isoformat(),
            "reason": "Follow-up",
        }, format="json")

    def test_patient_books_and_doctor_is_notified(self):
        self.auth(self.patient)
        r = self.book()
        self.assertEqual(r.status_code, status.HTTP_201_CREATED, r.data)
        self.assertEqual(r.data["status"], "pending")
        self.assertEqual(r.data["doctor_name"], "Adel Doctor")
        n = Notification.objects.get(user=self.doctor)
        self.assertEqual(n.kind, "appt")
        self.assertIn("Amina Patient", n.text)
        self.assertTrue(AuditLog.objects.filter(action="appointment", user=self.patient).exists())

    def test_past_date_rejected(self):
        self.auth(self.patient)
        r = self.client.post("/api/appointments/", {
            "doctor": self.doctor.pk,
            "scheduled_at": (timezone.now() - timedelta(days=1)).isoformat(),
        }, format="json")
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)

    def test_doctor_confirms_and_patient_is_notified(self):
        self.auth(self.patient)
        appt_id = self.book().data["id"]
        self.auth(self.doctor)
        r = self.client.post(f"/api/appointments/{appt_id}/status/", {"action": "confirm"}, format="json")
        self.assertEqual(r.status_code, status.HTTP_200_OK, r.data)
        self.assertEqual(r.data["status"], "confirmed")
        self.assertTrue(Notification.objects.filter(user=self.patient, kind="appt").exists())

    def test_patient_cancels_and_doctor_is_notified(self):
        self.auth(self.patient)
        appt_id = self.book().data["id"]
        r = self.client.post(f"/api/appointments/{appt_id}/status/", {"action": "cancel"}, format="json")
        self.assertEqual(r.data["status"], "cancelled")
        self.assertEqual(Notification.objects.filter(user=self.doctor, kind="appt").count(), 2)

    def test_patient_cannot_confirm(self):
        self.auth(self.patient)
        appt_id = self.book().data["id"]
        r = self.client.post(f"/api/appointments/{appt_id}/status/", {"action": "confirm"}, format="json")
        self.assertEqual(r.status_code, status.HTTP_403_FORBIDDEN)

    def test_lists_are_scoped(self):
        self.auth(self.patient)
        self.book()
        self.auth(self.other_patient)
        self.assertEqual(self.client.get("/api/appointments/").data, [])
        r = self.client.post("/api/appointments/", {
            "doctor": self.doctor.pk, "scheduled_at": self.when.isoformat(),
        }, format="json")
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)
        self.auth(self.doctor)
        self.assertEqual(len(self.client.get("/api/appointments/").data), 2)

    def test_doctors_cannot_book(self):
        self.auth(self.doctor)
        r = self.client.post("/api/appointments/", {
            "doctor": self.doctor.pk, "scheduled_at": self.when.isoformat(),
        }, format="json")
        self.assertEqual(r.status_code, status.HTTP_403_FORBIDDEN)
