"""Auth, roles and admin-approval flow (FR-01, FR-10)."""
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.test import APITestCase

from .models import User


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
