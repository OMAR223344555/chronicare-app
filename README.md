# Chronicare

File Management System for Patients with Chronic Conditions - course project
(Borg Al-Arab Technological University, Health Information Management,
Healthcare Platforms course).

**Live frontend:** https://omar223344555.github.io/chronicare-app/

Three portals (patient, doctor, admin) as a static site, wired to a Django
REST backend in `backend/`. If the API is unreachable the frontend falls back
to built-in demo data.

- **New here? Read [HOW_IT_WORKS.md](HOW_IT_WORKS.md)** - the whole system
  explained in plain language.
- Backend setup, API map and tests: [backend/README.md](backend/README.md)
- Database: `chronicare-schema.sql` (MySQL script matching the ERD; Django
  models use the same table names)
- Design/spec: Tailwind + Inter + lucide, Arabic/English, dark mode.

## Demo accounts

| Role    | Email                    | Password      |
| ------- | ------------------------ | ------------- |
| Patient | maya@chronicare.demo     | Patient@12345 |
| Doctor  | dr.sara@chronicare.demo  | Doctor@12345  |
| Doctor  | dr.karim@chronicare.demo | Doctor@12345  |
| Admin   | admin@chronicare.demo    | Admin@12345   |
