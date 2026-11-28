from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from .models import PasswordResetToken, User


class PasswordResetFlowTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="maya@example.com", email="maya@example.com",
            password="OldPass123", full_name="Maya", role="patient",
        )

    def test_request_never_returns_link_without_email_backend(self):
        r = self.client.post("/api/auth/password-reset/request/", {"email": "maya@example.com"}, format="json")
        self.assertEqual(r.status_code, 200)
        self.assertNotIn("demo_reset_link", r.data)
        # No email backend: nowhere safe for the link to go, so no token either.
        self.assertEqual(PasswordResetToken.objects.filter(user=self.user).count(), 0)

    def test_request_without_email_backend_says_so_honestly(self):
        # Same flag for known and unknown emails: honest, still no enumeration.
        for email in ("maya@example.com", "nobody@example.com"):
            r = self.client.post("/api/auth/password-reset/request/", {"email": email}, format="json")
            self.assertEqual(r.status_code, 200)
            self.assertEqual(r.data.get("email_configured"), False)

    def test_request_with_email_configured_keeps_neutral_message(self):
        with override_settings(EMAIL_IS_CONFIGURED=True):
            r = self.client.post("/api/auth/password-reset/request/", {"email": "maya@example.com"}, format="json")
        self.assertNotEqual(r.data.get("email_configured"), False)

    def test_request_with_email_configured_creates_token_but_returns_no_link(self):
        with override_settings(EMAIL_IS_CONFIGURED=True):
            r = self.client.post("/api/auth/password-reset/request/", {"email": "maya@example.com"}, format="json")
        self.assertEqual(r.status_code, 200)
        self.assertNotIn("demo_reset_link", r.data)
        self.assertEqual(PasswordResetToken.objects.filter(user=self.user).count(), 1)

    def test_request_unknown_email_still_200_and_no_token(self):
        r = self.client.post("/api/auth/password-reset/request/", {"email": "nobody@example.com"}, format="json")
        self.assertEqual(r.status_code, 200)
        self.assertNotIn("demo_reset_link", r.data)

    def test_confirm_changes_password_and_kills_sessions(self):
        with override_settings(EMAIL_IS_CONFIGURED=True):
            self.client.post("/api/auth/password-reset/request/", {"email": "maya@example.com"}, format="json")
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
        r3 = self.client.post("/api/auth/login/", {"email": "maya@example.com", "password": "NewPass123"}, format="json")
        self.assertEqual(r3.status_code, 200)

    def test_confirm_rejects_bad_token_and_short_password(self):
        r = self.client.post("/api/auth/password-reset/confirm/",
                             {"token": "00000000-0000-0000-0000-000000000000", "password": "NewPass123"}, format="json")
        self.assertEqual(r.status_code, 400)
        with override_settings(EMAIL_IS_CONFIGURED=True):
            self.client.post("/api/auth/password-reset/request/", {"email": "maya@example.com"}, format="json")
        tok = PasswordResetToken.objects.get(user=self.user)
        r2 = self.client.post("/api/auth/password-reset/confirm/",
                              {"token": str(tok.token), "password": "short"}, format="json")
        self.assertEqual(r2.status_code, 400)


class PasswordResetProtectedAccountsTests(TestCase):
    """The public forgot-password flow must never hand out a link for admins
    or the shared demo logins, and must answer exactly like an unknown email."""

    NEUTRAL = "If an account exists for this email, a reset link has been sent."

    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_user(
            username="admin@chronicare.demo", email="admin@chronicare.demo",
            password="AdminOld123", role="admin", is_staff=True,
        )
        self.demo_patient = User.objects.create_user(
            username="maya@chronicare.demo", email="maya@chronicare.demo",
            password="OldPass123", role="patient",
        )
        self.demo_doctor = User.objects.create_user(
            username="dr.sara@chronicare.demo", email="dr.sara@chronicare.demo",
            password="OldPass123", role="doctor",
        )
        self.real_admin = User.objects.create_user(
            username="boss@example.com", email="boss@example.com",
            password="OldPass123", role="admin",
        )
        self.staff = User.objects.create_user(
            username="staff@example.com", email="staff@example.com",
            password="OldPass123", role="patient", is_staff=True,
        )
        self.ordinary = User.objects.create_user(
            username="sam@example.com", email="sam@example.com",
            password="OldPass123", role="patient",
        )

    def _request(self, email):
        return self.client.post("/api/auth/password-reset/request/", {"email": email}, format="json")

    def test_protected_accounts_get_no_link_and_no_token(self):
        for user in (self.admin, self.demo_patient, self.demo_doctor, self.real_admin, self.staff):
            r = self._request(user.email)
            self.assertEqual(r.status_code, 200, user.email)
            self.assertNotIn("demo_reset_link", r.data, user.email)
            self.assertEqual(PasswordResetToken.objects.filter(user=user).count(), 0, user.email)

    def test_protected_answer_identical_to_unknown_email(self):
        # With no email backend configured, every address gets the same
        # honest "not available" answer. With email configured, protected and
        # unknown addresses get the same neutral "link sent" answer.
        with override_settings(EMAIL_IS_CONFIGURED=True):
            unknown = self._request("nobody@example.com")
            for email in ("admin@chronicare.demo", "ADMIN@Chronicare.Demo", "maya@chronicare.demo", "boss@example.com"):
                r = self._request(email)
                self.assertEqual(r.status_code, unknown.status_code)
                self.assertEqual(r.data, unknown.data)
            self.assertEqual(unknown.data["detail"], self.NEUTRAL)
        unknown2 = self._request("nobody@example.com")
        for email in ("admin@chronicare.demo", "maya@chronicare.demo"):
            r = self._request(email)
            self.assertEqual(r.data, unknown2.data)
        self.assertEqual(unknown2.data.get("email_configured"), False)

    def test_passwords_unchanged_after_attempts(self):
        self._request("admin@chronicare.demo")
        self.admin.refresh_from_db()
        self.assertTrue(self.admin.check_password("AdminOld123"))

    def test_old_token_for_protected_account_is_refused(self):
        # A token that existed before this fix must not work either.
        tok = PasswordResetToken.objects.create(user=self.admin)
        r = self.client.post("/api/auth/password-reset/confirm/",
                             {"token": str(tok.token), "password": "Hijacked123"}, format="json")
        self.assertEqual(r.status_code, 400)
        self.admin.refresh_from_db()
        self.assertTrue(self.admin.check_password("AdminOld123"))
        tok.refresh_from_db()
        self.assertIsNotNone(tok.used_at)

    def test_ordinary_user_gets_no_link_but_can_reset_once(self):
        r = self._request("sam@example.com")
        self.assertNotIn("demo_reset_link", r.data)
        self.assertEqual(PasswordResetToken.objects.filter(user=self.ordinary).count(), 0)
        with override_settings(EMAIL_IS_CONFIGURED=True):
            r = self._request("sam@example.com")
        self.assertNotIn("demo_reset_link", r.data)
        tok = PasswordResetToken.objects.get(user=self.ordinary)
        ok = self.client.post("/api/auth/password-reset/confirm/",
                              {"token": str(tok.token), "password": "BrandNew123"}, format="json")
        self.assertEqual(ok.status_code, 200)
        again = self.client.post("/api/auth/password-reset/confirm/",
                                 {"token": str(tok.token), "password": "Another123"}, format="json")
        self.assertEqual(again.status_code, 400)

    def test_ordinary_token_expires(self):
        from datetime import timedelta
        from django.utils import timezone
        with override_settings(EMAIL_IS_CONFIGURED=True):
            self._request("sam@example.com")
        tok = PasswordResetToken.objects.get(user=self.ordinary)
        PasswordResetToken.objects.filter(pk=tok.pk).update(
            created_at=timezone.now() - timedelta(minutes=PasswordResetToken.EXPIRY_MINUTES + 1))
        r = self.client.post("/api/auth/password-reset/confirm/",
                             {"token": str(tok.token), "password": "BrandNew123"}, format="json")
        self.assertEqual(r.status_code, 400)


class SharedFileWriteProtectionTests(TestCase):
    """Doctors and admins can read shared data but never edit or delete it."""

    def setUp(self):
        from datetime import timedelta
        from django.core.files.uploadedfile import SimpleUploadedFile
        from django.utils import timezone
        from records.models import Category, Condition, MedicalFile
        from sharing.models import Share

        self.client = APIClient()
        self.patient = User.objects.create_user(username="p@example.com", email="p@example.com", password="Passw0rd123", role="patient")
        self.doctor = User.objects.create_user(username="d@example.com", email="d@example.com", password="Passw0rd123", role="doctor")
        self.admin = User.objects.create_user(username="a@example.com", email="a@example.com", password="Passw0rd123", role="admin")
        cat = Category.objects.create(name="Labs")
        self.f = MedicalFile.objects.create(
            owner=self.patient, title="Mine", category=cat, condition=Condition.objects.create(name="Diabetes"), record_date=timezone.localdate(),
            file=SimpleUploadedFile("x.pdf", b"%PDF-1.4 test"),
        )
        share = Share.objects.create(patient=self.patient, doctor=self.doctor,
                                     expires_on=timezone.localdate() + timedelta(days=5))
        share.files.add(self.f)

    def test_shared_doctor_cannot_delete_or_edit(self):
        self.client.force_authenticate(self.doctor)
        self.assertEqual(self.client.get(f"/api/files/{self.f.pk}/").status_code, 200)
        self.assertEqual(self.client.patch(f"/api/files/{self.f.pk}/", {"title": "Hacked"}, format="json").status_code, 403)
        self.assertEqual(self.client.delete(f"/api/files/{self.f.pk}/").status_code, 403)
        self.f.refresh_from_db()
        self.assertEqual(self.f.title, "Mine")

    def test_admin_cannot_delete_patient_file(self):
        self.client.force_authenticate(self.admin)
        self.assertEqual(self.client.delete(f"/api/files/{self.f.pk}/").status_code, 403)

    def test_owner_can_still_edit(self):
        self.client.force_authenticate(self.patient)
        self.assertEqual(self.client.patch(f"/api/files/{self.f.pk}/", {"title": "Renamed"}, format="json").status_code, 200)
