# Instructor GradeBook CLI — Subsystem 3

> **Platform**: Node.js Terminal Application (standalone CLI desktop tool)  
> **Run**: `node gradebook.js`  
> **No npm install required** — uses only Node.js built-in modules.

---

## What This Solves

This is the **instructor-side** standalone desktop application for the
Digital Assignment Submission & Receipt Validation Grid.

It gives instructors a dedicated **terminal interface** to:
- View all student submission receipts in a formatted table
- Filter by Course, Status, or Student ID
- Inspect individual receipt details
- View statistics dashboards
- Export filtered data to CSV

---

## How to Run

```bash
# Step 1: Start the Verification Engine first (Subsystem 2)
cd ../verification-engine
node engine.js

# Step 2: In a new terminal, launch the GradeBook
cd ../instructor-gradebook-cli
node gradebook.js
```

> **Offline mode**: If the engine is not running, the GradeBook
> automatically falls back to reading `shared/data/submissions.json`
> directly. You will see `○ File fallback` in the status line.

---

## Commands

| Command          | Description                              | Example          |
|------------------|------------------------------------------|------------------|
| `r`              | Reload submissions from engine/file      | `r`              |
| `fc <COURSE>`    | Filter by Course ID                      | `fc CS401`       |
| `fs <STATUS>`    | Filter by Status                         | `fs LATE`        |
| `ss <ID>`        | Search by Student ID (partial match)     | `ss STU-2024`    |
| `all`            | Clear all filters — show everything      | `all`            |
| `d <ROW#>`       | Detail view of a submission              | `d 3`            |
| `stats`          | Statistics dashboard                     | `stats`          |
| `export [FILE]`  | Export current view to CSV               | `export out.csv` |
| `h`              | Show help                                | `h`              |
| `q`              | Quit                                     | `q`              |

---

## Design Patterns Used

| Pattern | File | Role |
|---------|------|------|
| **Singleton** | `GradeBookApp.js` | One shared app state across the session |
| **Facade** | `GradeBookApp.js` | Unified interface hiding data/filter/render complexity |
| **Command** | `MenuCommand.js` | Each menu action is an encapsulated Command object |
| **Strategy** | `FilterStrategy.js` | Pluggable filter algorithms swapped at runtime |

---

## File Structure

```
instructor-gradebook-cli/
├── gradebook.js                ← Entry point (Invoker)
├── README.md
└── core/
    ├── GradeBookApp.js         ← Singleton + Facade (Receiver)
    ├── MenuCommand.js          ← Command Pattern (10 concrete commands)
    ├── FilterStrategy.js       ← Strategy Pattern (5 strategies)
    ├── GradeBookDataService.js ← HTTP client + file fallback
    ├── TableRenderer.js        ← ASCII table output with ANSI colours
    └── CSVExporter.js          ← CSV file writer
```

---

## Platform Diversity Note

This CLI app provides **genuine platform independence** from the browser:

| Subsystem | Platform | How to Run |
|-----------|----------|------------|
| Student Portal | Browser (HTML + JS) | Open `student-portal/index.html` |
| Verification Engine | Node.js HTTP Server | `node engine.js` |
| **Instructor GradeBook** | **Node.js Terminal CLI** | **`node gradebook.js`** |
