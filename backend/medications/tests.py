from datetime import date, time, timedelta

from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone
from rest_framework.authtoken.models import Token
from rest_framework.test import APITestCase

from auditlog.models import AuditLog
from sharing.models import Share

from .models import Medication, MedicationIntake

User = get_user_model()


def make_user(email, role, status="active", **kw):
    return User.objects.create_user(username=email, email=email, password="pass12345", role=role, status=status, **kw)


class MedicationApiTests(APITestCase):
    def setUp(self):
        self.patient = make_user("pat@x.demo", "patient", full_name="Pat One")
        self.other_patient = make_user("pat2@x.demo", "patient", full_name="Pat Two")
        self.doctor = make_user("doc@x.demo", "doctor", full_name="Doc One", specialty="Cardiology", license_number="L1")
        self.admin = make_user("adm@x.demo", "admin", full_name="Admin One")
        for u in (self.patient, self.other_patient, self.doctor, self.admin):
            Token.objects.create(user=u)
        self.med = Medication.objects.create(
            patient=self.patient, name="Metformin", dose="500mg", time=time(9, 0)
        )

    def auth(self, user):
        self.client.credentials(HTTP_AUTHORIZATION="Token " + Token.objects.get(user=user).key)

    def url(self, pk=None, action=None):
        base = "/api/medications/"
        if pk is None:
            return base
        return f"{base}{pk}/" + (f"{action}/" if action else "")

    def test_patient_crud_and_audit(self):
        self.auth(self.patient)
        r = self.client.post(self.url(), {"name": "Lisinopril", "dose": "10mg", "time": "21:00"}, format="json")
        self.assertEqual(r.status_code, 201, r.content)
        self.assertEqual(Medication.objects.filter(patient=self.patient).count(), 2)
        self.assertTrue(AuditLog.objects.filter(user=self.patient, action="med_add").exists())

        mid = r.data["id"]
        r = self.client.patch(self.url(mid), {"dose": "20mg"}, format="json")
        self.assertEqual(r.status_code, 200, r.content)
        self.assertEqual(Medication.objects.get(pk=mid).dose, "20mg")

        r = self.client.delete(self.url(mid))
        self.assertIn(r.status_code, (200, 204))
        self.assertFalse(Medication.objects.filter(pk=mid).exists())

    def test_list_scoped_to_owner(self):
        Medication.objects.create(patient=self.other_patient, name="Aspirin", dose="75mg", time=time(8, 0))
        self.auth(self.patient)
        r = self.client.get(self.url())
        self.assertEqual(r.status_code, 200)
        names = [m["name"] for m in r.data]
        self.assertEqual(names, ["Metformin"])

    def test_inactive_meds_hidden(self):
        self.med.active = False
        self.med.save()
        self.auth(self.patient)
        r = self.client.get(self.url())
        self.assertEqual(r.data, [])

    def test_taken_idempotent_and_audited(self):
        self.auth(self.patient)
        r1 = self.client.post(self.url(self.med.pk, "taken"))
        self.assertEqual(r1.status_code, 200, r1.content)
        self.assertFalse(r1.data["already"])
        r2 = self.client.post(self.url(self.med.pk, "taken"))
        self.assertTrue(r2.data["already"])
        self.assertEqual(MedicationIntake.objects.filter(medication=self.med).count(), 1)
        self.assertTrue(AuditLog.objects.filter(action="med_taken").exists())
        # taken_today flag in list
        r = self.client.get(self.url())
        self.assertTrue(r.data[0]["taken_today"])

    def test_patient_cannot_touch_others(self):
        self.auth(self.other_patient)
        for method in ("get", "patch", "delete"):
            r = getattr(self.client, method)(self.url(self.med.pk))
            self.assertIn(r.status_code, (403, 404), (method, r.status_code, r.content))
        r = self.client.post(self.url(self.med.pk, "taken"))
        self.assertIn(r.status_code, (403, 404))

    def test_doctor_read_only_with_share(self):
        # no share yet: doctor sees nothing and is blocked from detail
        self.auth(self.doctor)
        self.assertEqual(self.client.get(self.url()).data, [])
        self.assertIn(self.client.get(self.url(self.med.pk)).status_code, (403, 404))
        r = self.client.post(self.url(), {"name": "X", "dose": "1", "time": "10:00"}, format="json")
        self.assertEqual(r.status_code, 403)
        r = self.client.post(self.url(self.med.pk, "taken"))
        self.assertEqual(r.status_code, 403)

        # with an active share the doctor can read
        Share.objects.create(patient=self.patient, doctor=self.doctor, expires_on=date.today() + timedelta(days=30))
        r = self.client.get(self.url())
        self.assertEqual(len(r.data), 1)
        self.assertEqual(r.data[0]["patient_name"], "Pat One")
        r = self.client.get(self.url(self.med.pk))
        self.assertEqual(r.status_code, 200)
        # but never write
        r = self.client.patch(self.url(self.med.pk), {"dose": "1g"}, format="json")
        self.assertEqual(r.status_code, 403)

        # revoked share closes access again
        share = Share.objects.get()
        share.revoked_at = timezone.now()
        share.save()
        self.assertEqual(self.client.get(self.url()).data, [])

    def test_doctor_patient_filter_scoped(self):
        Medication.objects.create(patient=self.other_patient, name="Aspirin", dose="75mg", time=time(8, 0))
        Share.objects.create(patient=self.patient, doctor=self.doctor, expires_on=date.today() + timedelta(days=30))
        self.auth(self.doctor)
        r = self.client.get(self.url() + f"?patient={self.other_patient.id}")
        self.assertEqual(r.data, [])
        r = self.client.get(self.url() + f"?patient={self.patient.id}")
        self.assertEqual(len(r.data), 1)

    def test_admin_lists_all(self):
        Medication.objects.create(patient=self.other_patient, name="Aspirin", dose="75mg", time=time(8, 0))
        self.auth(self.admin)
        r = self.client.get(self.url())
        self.assertEqual(len(r.data), 2)

    def test_validation(self):
        self.auth(self.patient)
        r = self.client.post(self.url(), {"name": "", "dose": "x", "time": "09:00"}, format="json")
        self.assertEqual(r.status_code, 400)
        r = self.client.post(self.url(), {"name": "X", "dose": "1", "time": "not-a-time"}, format="json")
        self.assertEqual(r.status_code, 400)
