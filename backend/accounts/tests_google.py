from unittest import mock
import io, json
from django.test import TestCase
from django.test.utils import override_settings
from rest_framework.authtoken.models import Token
from .models import User


def fake_payload(payload):
    class R(io.BytesIO):
        def __enter__(self): return self
        def __exit__(self, *a): return False
    return R(json.dumps(payload).encode())


@override_settings(GOOGLE_CLIENT_ID="test-client-id")
class GoogleLoginTests(TestCase):
    def test_creates_patient_and_returns_token(self):
        body = {"aud": "test-client-id", "email": "newuser@gmail.com", "email_verified": "true", "name": "New User"}
        with mock.patch("urllib.request.urlopen", return_value=fake_payload(body)):
            res = self.client.post("/api/auth/google/", {"credential": "x"}, content_type="application/json")
        self.assertEqual(res.status_code, 200, res.content)
        u = User.objects.get(email="newuser@gmail.com")
        self.assertEqual(u.role, "patient")
        self.assertEqual(u.full_name, "New User")
        self.assertEqual(res.json()["token"], Token.objects.get(user=u).key)

    def test_wrong_audience_rejected(self):
        body = {"aud": "someone-else", "email": "a@b.com", "email_verified": "true"}
        with mock.patch("urllib.request.urlopen", return_value=fake_payload(body)):
            res = self.client.post("/api/auth/google/", {"credential": "x"}, content_type="application/json")
        self.assertEqual(res.status_code, 401)

    def test_existing_user_logs_in(self):
        User.objects.create_user(username="maya@x.com", email="maya@x.com", password="pw1234567", full_name="Maya")
        body = {"aud": "test-client-id", "email": "maya@x.com", "email_verified": "true", "name": "Maya"}
        with mock.patch("urllib.request.urlopen", return_value=fake_payload(body)):
            res = self.client.post("/api/auth/google/", {"credential": "x"}, content_type="application/json")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["user"]["full_name"], "Maya")


@override_settings(GOOGLE_CLIENT_ID="test-client-id")
class GoogleDoctorApprovalTests(TestCase):
    def _post(self, email, role, name="Doc User"):
        body = {"aud": "test-client-id", "email": email, "email_verified": "true", "name": name}
        with mock.patch("urllib.request.urlopen", return_value=fake_payload(body)):
            return self.client.post("/api/auth/google/", {"credential": "x", "role": role}, content_type="application/json")

    def test_new_doctor_via_google_is_pending_and_gets_no_token(self):
        res = self._post("newdoc@gmail.com", "doctor")
        self.assertEqual(res.status_code, 403, res.content)
        self.assertEqual(res.json()["code"], "account_pending")
        u = User.objects.get(email="newdoc@gmail.com")
        self.assertEqual(u.role, "doctor")
        self.assertEqual(u.status, "pending")
        self.assertFalse(Token.objects.filter(user=u).exists())

    def test_pending_doctor_via_google_rejected_with_code(self):
        User.objects.create_user(username="pd@x.com", email="pd@x.com", password="pw1234567",
                                 full_name="P D", role="doctor", status="pending")
        res = self._post("pd@x.com", "doctor")
        self.assertEqual(res.status_code, 403)
        self.assertEqual(res.json()["code"], "account_pending")

    def test_approved_doctor_via_google_gets_token(self):
        u = User.objects.create_user(username="ad@x.com", email="ad@x.com", password="pw1234567",
                                     full_name="A D", role="doctor", status="active")
        res = self._post("ad@x.com", "doctor")
        self.assertEqual(res.status_code, 200, res.content)
        self.assertEqual(res.json()["token"], Token.objects.get(user=u).key)

    def test_role_mismatch_rejected(self):
        User.objects.create_user(username="pat@x.com", email="pat@x.com", password="pw1234567",
                                 full_name="Pat", role="patient", status="active")
        res = self._post("pat@x.com", "doctor")
        self.assertEqual(res.status_code, 403)
        self.assertEqual(res.json()["code"], "role_mismatch")

    def test_admin_role_is_never_created_via_google(self):
        res = self._post("wannabe@gmail.com", "admin")
        self.assertEqual(res.status_code, 403)
        self.assertEqual(res.json()["code"], "no_account")
        self.assertFalse(User.objects.filter(email="wannabe@gmail.com").exists())

    def test_email_login_pending_doctor_returns_code(self):
        User.objects.create_user(username="pd2@x.com", email="pd2@x.com", password="pw1234567",
                                 full_name="P D2", role="doctor", status="pending")
        res = self.client.post("/api/auth/login/", {"email": "pd2@x.com", "password": "pw1234567"},
                               content_type="application/json")
        self.assertEqual(res.status_code, 403)
        self.assertEqual(res.json()["code"], "account_pending")


@override_settings(GOOGLE_CLIENT_ID="test-client-id")
class OneEmailOneRoleTests(TestCase):
    def test_register_rejects_email_used_by_another_role(self):
        User.objects.create_user(username="pat2@x.com", email="pat2@x.com", password="pw1234567",
                                 full_name="Pat", role="patient", status="active")
        res = self.client.post("/api/auth/register/", {
            "email": "PAT2@x.com", "full_name": "Pat Doc", "password": "pw1234567",
            "role": "doctor", "specialty": "Cardiology", "license_number": "L-1"},
            content_type="application/json")
        self.assertEqual(res.status_code, 400)
        self.assertIn("already registered as a patient", str(res.content))

    def test_register_rejects_email_used_by_same_role(self):
        User.objects.create_user(username="doc2@x.com", email="doc2@x.com", password="pw1234567",
                                 full_name="Doc", role="doctor", status="pending")
        res = self.client.post("/api/auth/register/", {
            "email": "doc2@x.com", "full_name": "Doc Again", "password": "pw1234567",
            "role": "doctor", "specialty": "Cardiology", "license_number": "L-2"},
            content_type="application/json")
        self.assertEqual(res.status_code, 400)

    def test_google_with_admin_email_and_patient_role_is_mismatch(self):
        User.objects.create_user(username="root@x.com", email="root@x.com", password="pw1234567",
                                 full_name="Root", role="admin", status="active")
        body = {"aud": "test-client-id", "email": "root@x.com", "email_verified": "true", "name": "Root"}
        with mock.patch("urllib.request.urlopen", return_value=fake_payload(body)):
            res = self.client.post("/api/auth/google/", {"credential": "x", "role": "patient"},
                                   content_type="application/json")
        self.assertEqual(res.status_code, 403)
        self.assertEqual(res.json()["code"], "role_mismatch")
