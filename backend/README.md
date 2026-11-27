# Chronicare Backend (Django + DRF)

Backend API for the course project "File Management System for Patients with
Chronic Conditions" (Borg Al-Arab Technological University, Health Information
Management, Healthcare Platforms course).

## Status

Complete and tested: **28/28 automated tests pass** (`python manage.py test`).
The frontend in this repo (`index.html` / `doctor.html` / `admin.html`) is
already wired to this API through `js/api.js`.

## Stack

- Django 5 + Django REST Framework, token authentication
- MySQL in production (mysqlclient), SQLite fallback for the demo
- django-cors-headers (the static frontend calls the API cross-origin)
- django-filter for search/filter query params

## Quick start (demo, SQLite)

```bash
pip install -r requirements.txt        # mysqlclient is optional for SQLite mode
export DB_ENGINE=sqlite                # Windows: set DB_ENGINE=sqlite
python manage.py migrate
python manage.py seed_demo             # demo accounts + realistic data
python manage.py runserver 127.0.0.1:8000
```

API base: `http://127.0.0.1:8000/api/`
Django admin: `http://127.0.0.1:8000/django-admin/`

Open the frontend (`index.html` on GitHub Pages or any static server) and sign
in with a demo account below. With no reachable API the frontend stays in its
built-in demo mode.

## Demo accounts (demo passwords only - never reuse real ones)

| Role    | Email                    | Password      | State                     |
| ------- | ------------------------ | ------------- | ------------------------- |
| Patient | maya@chronicare.demo     | Patient@12345 | active, seeded records    |
| Doctor  | dr.sara@chronicare.demo  | Doctor@12345  | approved                  |
| Doctor  | dr.karim@chronicare.demo | Doctor@12345  | pending (needs admin OK)  |
| Admin   | admin@chronicare.demo    | Admin@12345   | active                    |

## Configuration (env vars, see .env.example)

- `SECRET_KEY`, `DEBUG`, `ALLOWED_HOSTS`
- `DB_ENGINE` = `mysql` (default) or `sqlite`
- MySQL: `DB_NAME` (default `chronicare`), `DB_USER`, `DB_PASSWORD`,
  `DB_HOST` (127.0.0.1), `DB_PORT` (3306)
- `CORS_ALLOWED_ORIGINS` - comma-separated; default covers localhost and
  `https://omar223344555.github.io`

Secrets are read from the environment only; nothing sensitive is committed.
`chronicare-schema.sql` (repo root) is the matching MySQL schema script; the
Django models map to the same ERD table names via `Meta.db_table`.

## Apps

- `accounts` - custom `User` with `role` (patient / doctor / admin) and
  `status` (pending / active / deactivated). Patients self-register active;
  doctors register as PENDING until an admin approves them. Token auth,
  admin user-management endpoints, verified-doctor list.
- `records` - admin-managed `Category` and `Condition`; `MedicalFile` upload
  (PDF/JPG/PNG) with metadata, search/filter, archive/restore, download,
  per-condition chronological timeline.
- `labs` - admin-managed `LabTestType` with reference ranges; `LabResult`
  entries with out-of-range detection and a trends series.
- `sharing` - `Share` with expiry, per-file or per-category grants through the
  ERD junction tables (`share_files`, `share_categories`), revoke (shares are
  kept for the audit trail), doctor-side patient list with new-content
  marker, `DoctorNote`.
- `auditlog` - every login, upload, share, revoke, note and admin action is
  written to `audit_log` (actor, action, target, details, timestamp).

## Endpoint map (all under /api/)

- `POST auth/register/` - sign up (patient active, doctor pending)
- `POST auth/login/` - returns `{token, user}`; `POST auth/logout/`;
  `GET auth/me/`
- `GET/POST categories/`, `GET/POST conditions/` (admin writes)
- `GET/POST files/`, `GET files/{id}/`, `POST files/{id}/archive/`,
  `POST files/{id}/restore/`, `GET files/{id}/download/`,
  `GET files/timeline/`
- `GET/POST lab-results/`, `GET lab-results/trends/?test=<code>`,
  `GET/PATCH lab-test-types/` (admin writes)
- `GET doctors/` - approved doctors (patient picker)
- `GET/POST shares/`, `POST shares/{id}/revoke/`
- `GET doctor/patients/`, `GET doctor/files/`,
  `POST doctor/patients/{id}/mark-seen/`
- `GET/POST notes/` (`?medical_file=<id>`)
- `GET admin/users/?status=&role=`, `POST admin/users/{id}/approve/`,
  `POST admin/users/{id}/deactivate/`, `POST admin/users/{id}/activate/`
- `GET admin/audit-log/`

List endpoints are paginated (`count`/`next`/`results`, page size 20).

## Tests

```bash
DB_ENGINE=sqlite python manage.py test
```

Covers auth and role gates, file upload/permissions, lab ranges, the full
share lifecycle (create -> doctor sees patient -> note -> revoke), share M2M
persistence through the junction tables, expiry rules and the audit log.

## Deployment notes

For a free hosted demo, deploy on Render/Railway/PythonAnywhere with
`DB_ENGINE=sqlite` (or the host's MySQL/Postgres if provided), set
`CORS_ALLOWED_ORIGINS` to the GitHub Pages origin, run `migrate` and
`seed_demo`, then point the frontend at the public API URL (see
`HOW_IT_WORKS.md`, section "How the frontend talks to the backend").
