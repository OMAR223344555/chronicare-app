# How Chronicare Works - Plain-Language Explainer

This document explains the project in simple words, no programming jargon.
Read it top to bottom and you can answer "how does it work?" confidently.

## The big picture

Chronicare has two halves that talk to each other:

- **Frontend** - the pages you see (patient, doctor, admin portals).
  *Analogy: the dining room of a restaurant - what guests see and touch.*
- **Backend** - a Django server that stores and protects the data.
  *Analogy: the kitchen - guests never enter, but everything is made there.*

They talk through an **API** (a fixed list of URLs like `/api/files/`).
*Analogy: the waiter - carries requests from the dining room to the kitchen
and brings answers back.*

## The database

All information is stored in tables (users, medical files, lab results,
shares, doctor notes, audit log). Each table has columns, each row is one
record. Our ERD diagram and `chronicare-schema.sql` define these tables, and
the backend uses exactly the same table names.

*Analogy: a wall of labeled drawers - one drawer for users, one for files,
one for lab results; every drawer has the same fixed form on each card.*

## Models

A **model** is the backend's definition of one table: what columns exist and
what type each column is (text, number, date...). Models live in
`backend/<app>/models.py`. Changing a model and running `migrate` updates the
real database to match.

*Analogy: the blank form template - before any card is written, the template
says which boxes the card must have.*

## API endpoints

An **endpoint** is one URL that does one job. Examples:

- `POST /api/auth/login/` - check email + password, return a token
- `GET /api/files/` - list my medical files
- `POST /api/files/` - upload a new file
- `POST /api/shares/` - share records with a doctor
- `POST /api/shares/7/revoke/` - cancel share number 7
- `GET /api/doctor/patients/` - patients who shared with me (doctor only)
- `GET /api/admin/users/` - all users (admin only)

*Analogy: items on a menu - each one is a specific order the kitchen knows
how to make; you can't order what isn't on the menu.*

## Login, tokens and roles

When you sign in, the backend checks your password and returns a **token** -
a long random string the frontend saves and sends with every later request.

*Analogy: a wristband at an event - you show your ticket once at the gate,
then the wristband proves who you are everywhere inside.*

Every user has a **role**:

- **Patient** - owns records, uploads files, enters lab results, shares with
  doctors, can revoke sharing.
- **Doctor** - sees only records patients shared with them, and can write
  notes on shared files. New doctors register as *pending* and cannot sign in
  until an admin approves them.
- **Admin** - approves doctors, activates/deactivates accounts, manages
  categories, conditions and lab reference ranges, and reads the audit log.

*Analogy: key cards in a hotel - a guest card opens one room, staff cards
open staff areas, and the manager's card opens everything.*

## How the frontend calls the API

The file `js/api.js` is the single bridge. It knows:

1. **Where the API is** - the base URL (default `http://127.0.0.1:8000/api`;
   a hosted backend URL can be set without touching any other code).
2. **Who is signed in** - it stores the token in the browser
   (`localStorage`) and attaches it to every request.
3. **How to translate** - it converts API answers into the exact shapes the
   pages already used, so the design didn't change at all.

Every page works in two modes:

- **Live mode** - the API answers; pages show real data from the database.
- **Demo mode** - if the API can't be reached, pages fall back to built-in
  sample data, so the design is always viewable.

*Analogy: a TV with cable + a USB stick - when cable (the API) is connected
you watch live channels; unplug it and it plays the videos on the stick.*

### Example: what happens when a patient uploads a file

1. Patient picks a PDF and fills the form, presses Upload.
2. `js/api.js` sends `POST /api/files/` with the file and the token.
3. The backend checks the token (is this an active patient?), saves the file
   under that patient's account, and writes a row in the `medical_files`
   table.
4. The new file appears instantly in the patient's list and timeline.
5. If the patient shared that category with a doctor, the doctor now sees the
   patient marked "new files".
6. The action is recorded in the audit log.

## The audit log

Every sensitive action (login, upload, share, revoke, note, admin approval)
is written to the `audit_log` table: who did it, what they did, on what, and
when. Opening a file in the browser records a `view`; saving it to disk
records a `download`, so the administrator can tell reading a report apart
from taking a copy. Rows are only added, never edited or deleted.

The patient gets their own read-only slice of this log on the Access History
page: everyone else who opened, downloaded or annotated one of their files,
with the time. Their own actions are hidden - the page answers "who else
touched my files?".

*Analogy: a security camera logbook - it doesn't stop anyone, but you can
always replay exactly what happened.*

## Notifications

The bell in the top bar of every portal is live. When something happens that
concerns a user - a patient shares files with a doctor, revokes a share, a
doctor adds a note, a patient uploads a file covered by an active share, an
out-of-range lab result is logged, or an admin approves a doctor - a row is
written to the `notifications` table for that user. The red dot shows while
anything is unread; "Mark all read" clears it. Each user only ever sees
their own notifications (`GET /api/notifications/` is scoped to the
requesting user). With no session the panel falls back to demo items.

*Analogy: the ward whiteboard - one glance and you know what changed since
you last looked.*

## Appointments

A patient books a follow-up from the Appointments page: pick an approved
doctor, a date and time, and an optional reason. The booking lands in the
`appointments` table as *pending* and the doctor is notified instantly. The
doctor confirms or declines from their own Appointments page; either side can
cancel, and the other side is notified every time. Bookings in the past are
rejected, and each user only ever sees their own appointments.

## Medications and the care plan

A patient's *Today's care plan* card is real data too. Each row in the
`medications` table is one daily medication (name, dose, due time). When the
patient taps **Mark taken**, the backend writes one `medication_intakes` row
for that medication and day - asking twice changes nothing, so the card
survives reloads. Doctors can read a patient's medication list only while an
active share with that patient exists; adding, changing, removing and taking
doses is patients-only. Every change lands in the audit log.

*Analogy: the clinic's appointment book - the patient writes a request, the
doctor inks it in or crosses it out, and nobody waits by the phone.*

## Demo accounts

These accounts exist only for the demo (created by `seed_demo`). Passwords
are demo-only and must never be real ones.

| Role    | Email                    | Password      | Notes                        |
| ------- | ------------------------ | ------------- | ---------------------------- |
| Patient | maya@chronicare.demo     | (private)       | has files, labs, one share   |
| Doctor  | dr.sara@chronicare.demo  | (private)        | approved; sees Maya's files  |
| Doctor  | dr.karim@chronicare.demo | (private)        | pending; login blocked until admin approves |
| Admin   | admin@chronicare.demo    | (private)     | approves doctors, sees audit log |

## Where everything lives in this repo

```
index.html / doctor.html / admin.html   the three portals (frontend)
css/  js/                               styling + page logic
js/api.js                               the bridge to the backend
backend/                                the Django backend (API + database)
backend/records/management/commands/seed_demo.py   creates the demo data
chronicare-schema.sql                   MySQL schema script (matches the ERD)
```

## Running it yourself (5 commands)

```bash
cd backend
pip install -r requirements.txt
export DB_ENGINE=sqlite          # demo database, no MySQL needed
python manage.py migrate && python manage.py seed_demo
python manage.py runserver 127.0.0.1:8000
```

Then open the frontend and sign in as `maya@chronicare.demo` /
the demo password you were given. To prove the demo fallback, stop the server and reload the
page: it still works with built-in sample data.
