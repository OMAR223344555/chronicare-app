"""Seed demo data for the Chronicare live demo.

Creates (idempotently):
- admin@chronicare.demo      / $DEMO_ADMIN_PASSWORD (platform admin; random if unset)
- maya@chronicare.demo       / Patient@12345  (patient, "Maya Hassan")
- dr.sara@chronicare.demo    / Doctor@12345   (approved doctor)
- dr.karim@chronicare.demo   / Doctor@12345   (PENDING doctor, for the admin approval demo)
plus categories, conditions, lab test types with reference ranges, sample
medical files (small generated PDFs), a lab-results series, an active share
from Maya to Dr. Sara, and a doctor note.

Run: python manage.py seed_demo
"""
import datetime
import io
import os
import secrets

from django.core.files.base import ContentFile
from django.core.management.base import BaseCommand
from django.utils import timezone

from accounts.models import User
from labs.models import LabResult, LabTestType
from records.models import Category, Condition, MedicalFile
from sharing.models import DoctorNote, Share

# A minimal valid one-page PDF
PDF = (
    b"%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n"
    b"2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n"
    b"3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 300 144]>>endobj\n"
    b"xref\n0 4\n0000000000 65535 f \ntrailer<</Size 4/Root 1 0 R>>\n"
    b"startxref\n110\n%%EOF\n"
)


def make_user(email, password, role, status, full_name, **extra):
    user, created = User.objects.get_or_create(
        username=email,
        defaults=dict(
            email=email, full_name=full_name, role=role, status=status, **extra
        ),
    )
    if created:
        user.set_password(password)
        user.save()
    return user


class Command(BaseCommand):
    help = "Seed demo accounts and data (idempotent)."

    def handle(self, *args, **options):
        admin = make_user(
            "admin@chronicare.demo", os.environ.get("DEMO_ADMIN_PASSWORD") or secrets.token_urlsafe(18),
            User.Role.ADMIN, User.Status.ACTIVE, "System Administrator",
        )
        admin.is_staff = True
        admin.is_superuser = True
        admin.save()

        maya = make_user(
            "maya@chronicare.demo", "Patient@12345",
            User.Role.PATIENT, User.Status.ACTIVE, "Maya Hassan",
        )
        sara = make_user(
            "dr.sara@chronicare.demo", "Doctor@12345",
            User.Role.DOCTOR, User.Status.ACTIVE, "Dr. Sara Adel",
            specialty="Endocrinology", license_number="EG-ENDO-10482",
        )
        make_user(
            "dr.karim@chronicare.demo", "Doctor@12345",
            User.Role.DOCTOR, User.Status.PENDING, "Dr. Karim Nabil",
            specialty="Cardiology", license_number="EG-CARD-22771",
        )

        cats = {}
        for name, desc in [
            ("Lab Report", "Blood tests and other laboratory reports"),
            ("Prescription", "Medication prescriptions"),
            ("Imaging", "X-ray, MRI, ultrasound and CT scans"),
            ("Discharge Summary", "Hospital discharge summaries"),
            ("Specialist Report", "Reports from specialist consultations"),
        ]:
            cats[name], _ = Category.objects.get_or_create(
                name=name, defaults={"description": desc}
            )

        conds = {}
        for name, desc in [
            ("Diabetes", "Type 2 diabetes mellitus"),
            ("Hypertension", "Chronic high blood pressure"),
            ("Chronic Kidney Disease", "Reduced kidney function"),
        ]:
            conds[name], _ = Condition.objects.get_or_create(
                name=name, defaults={"description": desc}
            )

        tests = {}
        for name, code, unit, lo, hi in [
            ("HbA1c", "HBA1C", "%", "4.0", "5.6"),
            ("Fasting Glucose", "FGLU", "mg/dL", "70", "99"),
            ("Systolic BP", "SBP", "mmHg", "90", "129"),
            ("Creatinine", "CREA", "mg/dL", "0.7", "1.3"),
            ("eGFR", "EGFR", "mL/min/1.73m2", "90", None),
        ]:
            tests[code], _ = LabTestType.objects.get_or_create(
                code=code,
                defaults=dict(name=name, unit=unit, ref_min=lo, ref_max=hi),
            )

        today = timezone.localdate()

        files_spec = [
            ("HbA1c panel - October", "Lab Report", "Diabetes", 34,
             "Nile Labs", "Dr. Hany Samir", "Endocrinology", False),
            ("Metformin prescription", "Prescription", "Diabetes", 62,
             "Smouha Clinic", "Dr. Sara Adel", "Endocrinology", False),
            ("Kidney ultrasound", "Imaging", "Chronic Kidney Disease", 90,
             "Alex Scan Center", "Dr. Mona Fathy", "Nephrology", False),
            ("Lipid profile - September", "Lab Report", "Hypertension", 68,
             "Nile Labs", "Dr. Hany Samir", "Cardiology", True),
            ("Discharge summary - July", "Discharge Summary", "Hypertension", 140,
             "Alexandria Main Hospital", "Dr. Adel Roshdy", "Internal Medicine", True),
        ]
        created_files = []
        for title, cat, cond, days, facility, doctor, specialty, archived in files_spec:
            mf, created = MedicalFile.objects.get_or_create(
                owner=maya, title=title,
                defaults=dict(
                    category=cats[cat], condition=conds[cond],
                    record_date=today - datetime.timedelta(days=days),
                    issuing_facility=facility, issuing_doctor=doctor,
                    specialty=specialty, archived=archived,
                ),
            )
            if created:
                mf.file.save(f"{title.lower().replace(' ', '_')}.pdf",
                             ContentFile(PDF), save=True)
            created_files.append(mf)

        for code, series in {
            "HBA1C": [(240, "8.1"), (180, "7.6"), (120, "7.2"), (60, "6.9"), (7, "6.7")],
            "FGLU": [(240, "148"), (180, "132"), (120, "121"), (60, "110"), (7, "104")],
            "SBP": [(240, "152"), (180, "145"), (120, "138"), (60, "133"), (7, "128")],
            "CREA": [(240, "1.5"), (120, "1.4"), (7, "1.3")],
        }.items():
            for days, value in series:
                LabResult.objects.get_or_create(
                    patient=maya, test_type=tests[code], value=value,
                    measured_at=today - datetime.timedelta(days=days),
                )

        share, created = Share.objects.get_or_create(
            patient=maya, doctor=sara,
            defaults=dict(
                include_lab_results=True,
                expires_on=today + datetime.timedelta(days=90),
            ),
        )
        if created:
            share.files.set([created_files[0], created_files[1]])
            share.categories.set([cats["Lab Report"]])

        note_file = created_files[0]
        DoctorNote.objects.get_or_create(
            doctor=sara, medical_file=note_file,
            defaults=dict(
                text="HbA1c is trending down nicely. Keep the current Metformin "
                     "dose and repeat the panel in 3 months."
            ),
        )

        self.stdout.write(self.style.SUCCESS(
            "Demo data ready:\n"
            "  admin@chronicare.demo    / (from DEMO_ADMIN_PASSWORD, else random)\n"
            "  maya@chronicare.demo     / Patient@12345 (patient)\n"
            "  dr.sara@chronicare.demo  / Doctor@12345  (approved doctor)\n"
            "  dr.karim@chronicare.demo / Doctor@12345  (pending approval)"
        ))
