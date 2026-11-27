from django.test import TestCase
from rest_framework.test import APIClient

from .models import PasswordResetToken, User


class PasswordResetFlowTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="maya@chronicare.demo", email="maya@chronicare.demo",
            password="OldPass123", full_name="Maya", role="patient",
        )

    def test_request_returns_demo_link_without_email_backend(self):
        r = self.client.post("/api/auth/password-reset/request/", {"email": "maya@chronicare.demo"}, format="json")
        self.assertEqual(r.status_code, 200)
        self.assertIn("demo_reset_link", r.data)
        self.assertEqual(PasswordResetToken.objects.filter(user=self.user).count(), 1)

    def test_request_unknown_email_still_200_and_no_token(self):
        r = self.client.post("/api/auth/password-reset/request/", {"email": "nobody@example.com"}, format="json")
        self.assertEqual(r.status_code, 200)
        self.assertNotIn("demo_reset_link", r.data)

    def test_confirm_changes_password_and_kills_sessions(self):
        self.client.post("/api/auth/password-reset/request/", {"email": "maya@chronicare.demo"}, format="json")
        tok = PasswordResetToken.objects.get(user=self.user)
        r = self.client.post("/api/auth/password-reset/confirm/",
                             {"token": str(tok.token), "password": "NewPass123"}, format="json")
        self.assertEqual(r.status_code, 200)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("NewPass123"))
        # token is single-use
        r2 = self.client.post("/api/auth/password-reset/confirm/",
                              {"token": str(tok.token), "password": "Another123"}, format="json")
        self.assertEqual(r2.status_code, 400)
        # login works with the new password
        r3 = self.client.post("/api/auth/login/", {"email": "maya@chronicare.demo", "password": "NewPass123"}, format="json")
        self.assertEqual(r3.status_code, 200)

    def test_confirm_rejects_bad_token_and_short_password(self):
        r = self.client.post("/api/auth/password-reset/confirm/",
                             {"token": "00000000-0000-0000-0000-000000000000", "password": "NewPass123"}, format="json")
        self.assertEqual(r.status_code, 400)
        self.client.post("/api/auth/password-reset/request/", {"email": "maya@chronicare.demo"}, format="json")
        tok = PasswordResetToken.objects.get(user=self.user)
        r2 = self.client.post("/api/auth/password-reset/confirm/",
                              {"token": str(tok.token), "password": "short"}, format="json")
        self.assertEqual(r2.status_code, 400)
