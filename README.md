# Digital Assignment Submission & Receipt Validation Grid
## 3 Languages · 4 Subsystems · Neon PostgreSQL · 7 GoF Patterns

---

## Quick Start

```bash
# Terminal 1 — Auth & Notification Service (Python)
cd auth-service
pip install -r requirements.txt
python app.py
# → http://localhost:5001

# Terminal 2 — Core API (Node.js)
cd backend
npm install
node server.js
# → http://localhost:3001
```

| Portal | URL |
|--------|-----|
| **Student** | http://localhost:3001/ |
| **Instructor** | http://localhost:3001/instructor/ |

---

## Platform & Language Map

| Subsystem | Language | Platform | Port |
|-----------|----------|----------|------|
| Auth & Notification | Python (Flask) | HTTP microservice | 5001 |
| Core API | Node.js (Express) | HTTP server | 3001 |
| Student Portal | JavaScript | Browser | served via 3001 |
| Instructor GradeBook | JavaScript | Browser | served via 3001 |

---

## Features

### Student Portal
- Register / Login as student
- Fill **Full Name** + **Student ID Number** + select course
- **Drag & drop or browse** to upload any file type (PDF, DOCX, ZIP, etc.) up to 50 MB
- Real-time **upload progress bar**
- Receive a **cryptographic receipt** (unique ID, timestamp, ON_TIME / LATE status)
- View personal submission history

### Instructor GradeBook
- Register / Login as teacher
- **🔔 Bell notification icon** — auto-updates every 10 s when students submit
  - Badge shows count of new unseen submissions
  - Dropdown lists each: student name · filename · course · status
  - "Mark all seen" clears the badge; history list stays
- **Deadline Management panel** — set a deadline per course (date + time)
  - Submissions after the deadline are automatically marked **LATE**
  - Existing deadlines shown with ACTIVE / PASSED status; removable
- Filterable submissions table (search by name/ID, filter by course or status)
- **Download** any student's file directly from the cloud database (Neon)
- Live stats dashboard: Total / On-Time / Late / Rejected

### Auth & Notification Service (Python)
- Handles login and signup for both roles (student / teacher)
- Issues JWT tokens signed with a shared secret (verified by Node.js without a round-trip)
- Prints a terminal notification on every new submission via Observer pattern
- Validates all request bodies with `@require_json` decorator

---

## Design Patterns (7 GoF Patterns)

| # | Pattern | Category | File(s) | How it's used |
|---|---------|----------|---------|--------------|
| 1 | **Singleton** | Creational | `backend/db.js`, `auth-service/app.py` | One DB pool shared across all requests |
| 2 | **Factory Method** | Creational | `backend/UserFactory.js`, `auth-service/app.py` | Creates StudentUser or TeacherUser from a DB row |
| 3 | **Facade** | Structural | `backend/SubmissionService.js`, `backend/DeadlineService.js` | Single methods hide multi-step DB operations |
| 4 | **Adapter** | Structural | `backend/NotificationAdapter.js` | Converts Python HTTP endpoint to Node.js callback |
| 5 | **Observer** | Behavioral | `backend/server.js` (EventEmitter) + `auth-service/app.py` | Triggers notification on every submission without coupling |
| 6 | **Strategy** | Behavioral | `backend/ValidationStrategy.js` | Pluggable validation: URL / Hex hash / Any reference |
| 7 | **Decorator** | Structural | `auth-service/app.py` `@require_json` | Validates request body before any route function runs |

---

## Architecture

```
  BROWSER (JS)                NODE.JS (port 3001)          PYTHON (port 5001)
┌──────────────┐  upload file  ┌──────────────────┐  notify  ┌──────────────────┐
│ Student      │ ────────────▶ │                  │ ───────▶ │ Auth &           │
│ Portal       │               │   Core API       │          │ Notification     │
│              │ ◀──────────── │   (Express)      │ ◀─────── │ Service (Flask)  │
└──────────────┘   receipt     │                  │   JWT    └──────────────────┘
                               │                  │                   │
┌──────────────┐  set deadline │                  │            users table
│ Instructor   │ ────────────▶ │                  │            login/signup
│ GradeBook    │               └────────┬─────────┘
│ 🔔 Bell icon │ ◀──────────────────────┘
└──────────────┘  download file from Neon
                               ┌────────────────────┐
                               │  Neon PostgreSQL    │
                               │  (cloud DB)         │
                               │  • users            │
                               │  • submissions      │
                               │    (file_data BYTEA)│
                               │  • deadlines        │
                               └────────────────────┘
```

---

## File Storage — Neon BYTEA (No Local Disk)

Files are stored as `BYTEA` columns in Neon PostgreSQL — not on the server's local disk.

- Student uploads → `multer.memoryStorage()` keeps file in RAM → inserted into Neon as BYTEA
- Teacher downloads → bytes retrieved from Neon → streamed to browser with original filename
- Files persist across server restarts; accessible from any machine connecting to Neon

---

## Database Schema

```sql
-- Managed by Python subsystem
CREATE TABLE users (
  id SERIAL PRIMARY KEY, name VARCHAR(100), email VARCHAR(255) UNIQUE,
  password VARCHAR(255),   -- bcrypt hash
  role VARCHAR(10),        -- 'student' or 'teacher'
  created_at TIMESTAMP DEFAULT NOW()
);

-- Managed by Node.js subsystem
CREATE TABLE submissions (
  id SERIAL PRIMARY KEY,
  receipt_id        VARCHAR(60) UNIQUE,   -- e.g. RCT-4BF0F24D45DC
  student_id        INTEGER,
  full_name         VARCHAR(200),
  student_number    VARCHAR(50),
  course_id         VARCHAR(50),
  original_filename VARCHAR(255),
  mime_type         VARCHAR(100),
  file_data         BYTEA,               -- actual file stored in cloud
  status            VARCHAR(20),         -- ON_TIME | LATE | REJECTED
  submitted_at      TIMESTAMP DEFAULT NOW()
);

CREATE TABLE deadlines (
  id SERIAL PRIMARY KEY,
  course_id   VARCHAR(50) UNIQUE,
  title       VARCHAR(200),
  deadline_at TIMESTAMP,
  teacher_id  INTEGER,
  created_at  TIMESTAMP DEFAULT NOW()
);
```

---

## API Endpoints

| Method | Endpoint | Auth | Role | Description |
|--------|----------|------|------|-------------|
| POST | `/auth/register` | — | any | Create account, returns JWT |
| POST | `/auth/login` | — | any | Login, returns JWT |
| POST | `/api/submissions` | JWT | student | Upload file → receipt |
| GET | `/api/submissions` | JWT | any | List submissions |
| GET | `/api/submissions/stats` | JWT | any | Dashboard counts |
| GET | `/api/download/:id` | JWT | **teacher** | Download file from Neon |
| POST | `/api/deadlines` | JWT | **teacher** | Set/update course deadline |
| GET | `/api/deadlines` | JWT | any | All deadlines |
| DELETE | `/api/deadlines/:courseId` | JWT | **teacher** | Remove deadline |

---

## OOP Principles

| Principle | Evidence |
|-----------|---------|
| **Abstraction** | `Database.query()` hides pool/SSL/retry; `SubmissionService.create()` hides 6 steps |
| **Encapsulation** | `Database._instance` private; `ValidationContext._strategy` private |
| **Inheritance** | `StudentUser` / `TeacherUser`; `HashStrategy` / `UrlStrategy` / `AnyRefStrategy` |
| **Polymorphism** | `ValidationContext.validate()` works with any Strategy; `UserFactory.create()` returns different types |

---

## File Structure

```
assignment-system/
├── .gitignore
├── README.md
│
├── auth-service/               Python — Auth & Notification (port 5001)
│   ├── app.py                  Singleton · Factory · Decorator · Observer
│   └── requirements.txt
│
├── backend/                    Node.js — Core API (port 3001)
│   ├── server.js               Observer EventEmitter · routes
│   ├── db.js                   Singleton DB pool
│   ├── SubmissionService.js    Facade (file upload, receipt, deadline check)
│   ├── DeadlineService.js      Facade (deadline CRUD)
│   ├── NotificationAdapter.js  Adapter (JS → Python HTTP)
│   ├── UserFactory.js          Factory Method
│   ├── ValidationStrategy.js   Strategy
│   ├── middleware/auth.js       JWT verification
│   └── package.json
│
├── student-portal/             Browser JS — Student Portal
│   ├── index.html
│   └── student-app.js
│
└── instructor-portal/          Browser JS — Instructor GradeBook
    ├── index.html              Bell icon · Deadline panel · Submissions table
    └── instructor-app.js
```
