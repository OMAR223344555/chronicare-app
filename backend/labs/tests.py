"""Lab results and reference ranges (FR-04, FR-11)."""
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.test import APITestCase

from accounts.models import User
from .models import LabResult, LabTestType


def auth(client, user):
    token, _ = Token.objects.get_or_create(user=user)
    client.credentials(HTTP_AUTHORIZATION=f"Token {token.key}")


class LabTests(APITestCase):
    def setUp(self):
        self.patient = User.objects.create_user(
            username="p@example.com", email="p@example.com",
            password="secret123", role=User.Role.PATIENT,
        )
        self.admin = User.objects.create_user(
            username="a@example.com", email="a@example.com",
            password="secret123", role=User.Role.ADMIN,
        )
        self.hba1c = LabTestType.objects.create(
            name="HbA1c", code="HBA1C", unit="%", ref_min="4.0", ref_max="5.6",
        )
        auth(self.client, self.patient)

    def add(self, value, date="2026-10-01"):
        return self.client.post("/api/lab-results/", {
            "test_type": self.hba1c.pk, "value": value, "measured_at": date,
        }, format="json")

    def test_patient_adds_result_with_range_flag(self):
        r = self.add("6.9")
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)
        self.assertTrue(r.data["out_of_range"])
        self.assertEqual(r.data["ref_max"], "5.60")
        r = self.add("5.2", "2026-10-02")
        self.assertFalse(r.data["out_of_range"])

    def test_open_ended_range_egfr(self):
        egfr = LabTestType.objects.create(
            name="eGFR", code="EGFR", unit="mL/min/1.73m2", ref_min="90", ref_max=None,
        )
        r = self.client.post("/api/lab-results/", {
            "test_type": egfr.pk, "value": "65", "measured_at": "2026-10-01",
        }, format="json")
        self.assertTrue(r.data["out_of_range"])

    def test_trends_endpoint_orders_by_date(self):
        self.add("7.2", "2026-09-01")
        self.add("6.9", "2026-10-01")
        r = self.client.get(f"/api/lab-results/trends/?test_type={self.hba1c.pk}")
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual([p["value"] for p in r.data], ["7.20", "6.90"])

    def test_implausible_value_rejected(self):
        # HbA1c 19.5 % is above the plausible bound (18) -> 400, nothing stored
        r = self.client.post("/api/lab-results/", {
            "test_type": self.hba1c.pk, "value": "19.5", "measured_at": "2026-10-01",
        }, format="json")
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("value", r.data)
        self.assertEqual(LabResult.objects.count(), 0)
        # glucose 21 mg/dL below the plausible bound (30) -> 400
        fglu = LabTestType.objects.create(
            name="Fasting Glucose", code="FGLU", unit="mg/dL",
            ref_min="70", ref_max="99",
        )
        r = self.client.post("/api/lab-results/", {
            "test_type": fglu.pk, "value": "21", "measured_at": "2026-10-01",
        }, format="json")
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(LabResult.objects.count(), 0)
        # out-of-range but plausible values still pass and are flagged
        r = self.add("9.0")
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)
        self.assertTrue(r.data["out_of_range"])

    def test_patient_cannot_manage_test_types(self):
        r = self.client.post("/api/lab-test-types/", {
            "name": "X", "code": "X", "unit": "mg",
        }, format="json")
        self.assertEqual(r.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_manages_test_types(self):
        auth(self.client, self.admin)
        r = self.client.post("/api/lab-test-types/", {
            "name": "CRP", "code": "CRP", "unit": "mg/L",
            "ref_min": "0", "ref_max": "5",
        }, format="json")
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)
