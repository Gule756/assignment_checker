# Digital Assignment Submission & Receipt Validation Grid
## v2 — 3 Languages · 4 Subsystems · PostgreSQL · 7 Design Patterns

---

## Platform & Language Map

| Subsystem | Language | Platform | Run Command |
|-----------|----------|----------|-------------|
| **Auth & Notification** | **Python** | Flask HTTP microservice (port 5001) | `python app.py` |
| **Core API** | **Node.js** | Express HTTP server (port 3001) | `node server.js` |
| **Student Portal** | **JavaScript** | Browser (open index.html) | Open in browser |
| **Instructor GradeBook** | **JavaScript** | Browser (open index.html) | Open in browser |

---

## Quick Start

```bash
# Terminal 1 — Auth & Notification Service (Python)
cd auth-service
pip install -r requirements.txt
python app.py

# Terminal 2 — Core API (Node.js)
cd backend
npm install
node server.js

# Browser 1 — Student Portal
Open: student-portal/index.html

# Browser 2 — Instructor GradeBook
Open: instructor-portal/index.html
```

---

## Design Patterns (7 GoF Patterns)

| # | Pattern | Category | Where | How it's used |
|---|---------|----------|-------|---------------|
| 1 | **Singleton** | Creational | `backend/db.js` + `auth-service/app.py` | One DB pool shared across all requests |
| 2 | **Factory Method** | Creational | `backend/UserFactory.js` + `auth-service/app.py` | Creates StudentUser or TeacherUser from DB row |
| 3 | **Facade** | Structural | `backend/SubmissionService.js` | Single method hides DB + validation + event logic |
| 4 | **Adapter** | Structural | `backend/NotificationAdapter.js` | Converts Python HTTP endpoint to Node.js callback |
| 5 | **Observer** | Behavioral | `backend/server.js` (EventEmitter) | Triggers notification adapter on every submission |
| 6 | **Strategy** | Behavioral | `backend/ValidationStrategy.js` | Pluggable validation: URL / Hex hash / Any ref |
| 7 | **Decorator** | Structural | `auth-service/app.py` `@require_json` | Validates request body before route runs |

---

## Architecture

```
  BROWSER                     NODE.JS                    PYTHON
┌──────────┐    login/reg   ┌─────────────┐  notify   ┌──────────────┐
│ Student  │ ─────────────▶ │             │ ────────▶ │ Auth &       │
│ Portal   │                │  Core API   │           │ Notification │
│ (JS)     │ ◀─────────────  │ (Express)   │ ◀──────── │ Service      │
└──────────┘  submit/list   └──────┬──────┘  JWT valid │ (Flask)      │
                                   │                   └──────────────┘
┌──────────┐    login/reg          │ PostgreSQL               │
│Instructor│ ─────────────▶        │                    users table
│ Portal   │                ┌──────▼──────┐            login/signup
│ (JS)     │ ◀─────────────  │  Neon DB   │
└──────────┘  view/download  │(PostgreSQL)│
                             └────────────┘
```

---

## Features

### Student Portal
- Register / Login as student
- Submit assignment with file URL + course + name
- Receive cryptographic receipt on submission
- View personal submission history

### Instructor GradeBook
- Register / Login as teacher
- See ALL student submissions in a filterable grid
- Filter by course, status, or search student name
- Click **⬇ Open File** to access/download student's file link
- Live stats dashboard (total / on-time / late / rejected)

### Auth & Notification Service (Python)
- Handles login and signup for both roles
- Prints terminal notification on every new submission
- Validates JSON body via `@require_json` decorator

---

## OOP Principles

| Principle | Evidence |
|-----------|---------|
| **Abstraction** | `IFilterStrategy`, `ICommand`, `IValidator` abstract classes |
| **Encapsulation** | DB pool hidden in Singleton; pipeline hidden in Facade |
| **Inheritance** | `StudentUser`, `TeacherUser` extend base user; concrete strategies extend base |
| **Polymorphism** | `ValidationContext.validate()` works with any Strategy subtype |

---

## File Structure

```
assignment-system/
├── auth-service/           Python — Subsystem: Auth & Notification
│   ├── app.py              Flask server (Singleton · Factory · Decorator · Observer)
│   └── requirements.txt
│
├── backend/                Node.js — Subsystem: Core API
│   ├── server.js           Express server (Observer EventEmitter)
│   ├── db.js               Singleton DB pool
│   ├── UserFactory.js      Factory Method
│   ├── SubmissionService.js Facade
│   ├── NotificationAdapter.js Adapter
│   ├── ValidationStrategy.js Strategy
│   └── middleware/auth.js  JWT verification
│
├── student-portal/         JavaScript/Browser — Subsystem: Student Portal
│   ├── index.html
│   └── student-app.js
│
└── instructor-portal/      JavaScript/Browser — Subsystem: Instructor GradeBook
    ├── index.html
    └── instructor-app.js
```
