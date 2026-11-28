"""Auth, roles and admin-approval flow (FR-01, FR-10)."""
from datetime import timedelta

from django.core.files.storage import default_storage
from django.core.files.uploadedfile import SimpleUploadedFile
from django.utils import timezone
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.test import APITestCase

from .models import User
from auditlog.models import AuditLog
from labs.models import LabResult, LabTestType
from records.models import Category, Condition, MedicalFile
from sharing.models import DoctorNote, Share


def make_user(email, password, role=User.Role.PATIENT, status_=User.Status.ACTIVE, **kw):
    u = User(username=email, email=email, role=role, status=status_, **kw)
    u.set_password(password)
    u.save()
    return u


def auth(client, user):
    token, _ = Token.objects.get_or_create(user=user)
    client.credentials(HTTP_AUTHORIZATION=f"Token {token.key}")


class AuthTests(APITestCase):
    def test_patient_registers_and_gets_token(self):
        r = self.client.post("/api/auth/register/", {
            "email": "p@example.com", "full_name": "Pat One",
            "password": "secret123", "role": "patient",
        }, format="json")
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)
        self.assertIn("token", r.data)
        self.assertEqual(r.data["role"], "patient")
        self.assertEqual(r.data["status"], "active")

    def test_doctor_registers_pending_and_cannot_login_until_approved(self):
        r = self.client.post("/api/auth/register/", {
            "email": "d@example.com", "full_name": "Doc One",
            "password": "secret123", "role": "doctor",
            "specialty": "Endocrinology", "license_number": "EG-1",
        }, format="json")
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)
        self.assertNotIn("token", r.data)

        r = self.client.post("/api/auth/login/", {
            "email": "d@example.com", "password": "secret123",
        }, format="json")
        self.assertEqual(r.status_code, status.HTTP_403_FORBIDDEN)

        # admin approves -> login works
        admin = make_user("a@example.com", "secret123", User.Role.ADMIN)
        auth(self.client, admin)
        doctor = User.objects.get(email="d@example.com")
        r = self.client.post(f"/api/admin/users/{doctor.pk}/approve/")
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(r.data["status"], "active")

        self.client.credentials()
        r = self.client.post("/api/auth/login/", {
            "email": "d@example.com", "password": "secret123",
        }, format="json")
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertIn("token", r.data)

    def test_doctor_requires_specialty_and_license(self):
        r = self.client.post("/api/auth/register/", {
            "email": "d2@example.com", "full_name": "Doc Two",
            "password": "secret123", "role": "doctor",
        }, format="json")
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)

    def test_login_rejects_bad_password(self):
        make_user("p@example.com", "secret123")
        r = self.client.post("/api/auth/login/", {
            "email": "p@example.com", "password": "wrong-pass",
        }, format="json")
        self.assertEqual(r.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_deactivated_user_blocked_even_with_valid_token(self):
        u = make_user("p@example.com", "secret123", status_=User.Status.DEACTIVATED)
        auth(self.client, u)
        r = self.client.get("/api/auth/me/")
        self.assertEqual(r.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_user_list_requires_admin(self):
        patient = make_user("p@example.com", "secret123")
        auth(self.client, patient)
        self.assertEqual(self.client.get("/api/admin/users/").status_code,
                         status.HTTP_403_FORBIDDEN)

    def test_admin_can_deactivate_and_reactivate(self):
        admin = make_user("a@example.com", "secret123", User.Role.ADMIN)
        target = make_user("p@example.com", "secret123")
        auth(self.client, admin)
        r = self.client.post(f"/api/admin/users/{target.pk}/deactivate/")
        self.assertEqual(r.data["status"], "deactivated")
        r = self.client.post(f"/api/admin/users/{target.pk}/activate/")
        self.assertEqual(r.data["status"], "active")


class AdminDeleteAccountTests(APITestCase):
    """FR-10: an admin can delete an account, with safeguards and cleanup."""

    def setUp(self):
        self.admin = make_user(
            "admin@example.com", "secret123", User.Role.ADMIN, full_name="Admin One"
        )
        self.category = Category.objects.create(name="Lab Report")
        self.condition = Condition.objects.create(name="Diabetes")

    def make_patient_with_data(self):
        patient = make_user("pat@example.com", "secret123", full_name="Pat One")
        record = MedicalFile.objects.create(
            owner=patient,
            title="Blood test",
            file=SimpleUploadedFile(
                "blood.pdf", b"%PDF-1.4 minimal\n%%EOF%%", content_type="application/pdf"
            ),
            category=self.category,
            condition=self.condition,
            record_date=timezone.localdate(),
        )
        doctor = make_user(
            "doc@example.com", "secret123", User.Role.DOCTOR, full_name="Doc One"
        )
        share = Share.objects.create(
            patient=patient,
            doctor=doctor,
            expires_on=timezone.localdate() + timedelta(days=7),
        )
        share.files.add(record)
        note = DoctorNote.objects.create(
            doctor=doctor, medical_file=record, text="Looks fine."
        )
        test_type = LabTestType.objects.create(name="HbA1c", code="HBA1C", unit="%")
        LabResult.objects.create(
            patient=patient, test_type=test_type, value=5.4,
            measured_at=timezone.localdate(),
        )
        return patient, doctor, record, share, note

    def test_deleting_a_patient_removes_files_shares_and_lab_results(self):
        patient, _doctor, record, share, note = self.make_patient_with_data()
        file_name = record.file.name
        auth(self.client, self.admin)

        r = self.client.delete(f"/api/admin/users/{patient.pk}/delete_account/")

        self.assertEqual(r.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(User.objects.filter(pk=patient.pk).exists())
        self.assertFalse(MedicalFile.objects.filter(owner_id=patient.pk).exists())
        self.assertFalse(Share.objects.filter(pk=share.pk).exists())
        self.assertFalse(LabResult.objects.filter(patient_id=patient.pk).exists())
        self.assertFalse(DoctorNote.objects.filter(pk=note.pk).exists())
        self.assertFalse(default_storage.exists(file_name))

        entry = AuditLog.objects.filter(action="delete").first()
        self.assertIsNotNone(entry)
        self.assertIn("pat@example.com", entry.details)
        self.assertIsNone(entry.target_user)

    def test_deleting_a_doctor_removes_their_shares_and_notes(self):
        patient, doctor, record, share, note = self.make_patient_with_data()
        auth(self.client, self.admin)

        r = self.client.delete(f"/api/admin/users/{doctor.pk}/delete_account/")

        self.assertEqual(r.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(User.objects.filter(pk=doctor.pk).exists())
        self.assertFalse(Share.objects.filter(pk=share.pk).exists())
        self.assertFalse(DoctorNote.objects.filter(pk=note.pk).exists())
        # the patient and their file stay
        self.assertTrue(MedicalFile.objects.filter(pk=record.pk).exists())

    def test_admin_cannot_delete_their_own_account(self):
        auth(self.client, self.admin)

        r = self.client.delete(f"/api/admin/users/{self.admin.pk}/delete_account/")

        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("own account", r.data["detail"])
        self.assertTrue(User.objects.filter(pk=self.admin.pk).exists())

    def test_last_administrator_cannot_be_deleted(self):
        staff = make_user("staff@example.com", "secret123", is_staff=True)
        auth(self.client, staff)

        r = self.client.delete(f"/api/admin/users/{self.admin.pk}/delete_account/")

        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("last administrator", r.data["detail"])
        self.assertTrue(User.objects.filter(pk=self.admin.pk).exists())

    def test_another_admin_can_be_deleted_when_an_admin_remains(self):
        second = make_user("admin2@example.com", "secret123", User.Role.ADMIN)
        auth(self.client, self.admin)

        r = self.client.delete(f"/api/admin/users/{second.pk}/delete_account/")

        self.assertEqual(r.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(User.objects.filter(pk=second.pk).exists())

    def test_patients_cannot_delete_accounts(self):
        patient, _doctor, _record, _share, _note = self.make_patient_with_data()
        other = make_user("pat2@example.com", "secret123")
        auth(self.client, patient)

        r = self.client.delete(f"/api/admin/users/{other.pk}/delete_account/")

        self.assertEqual(r.status_code, status.HTTP_403_FORBIDDEN)
        self.assertTrue(User.objects.filter(pk=other.pk).exists())
