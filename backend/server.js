/**
 * ================================================================
 *  server.js — Node.js Backend API (Subsystem: Core API)
 * ================================================================
 *  Language  : Node.js (JavaScript)
 *  Framework : Express + Multer (file uploads)
 *  Port      : 3001
 *  Run with  : node server.js  (after: npm install)
 *
 *  Design Patterns active here:
 *    [OBSERVER]  EventEmitter emits 'submission' on every new save
 *    [ADAPTER]   NotificationAdapter bridges Observer to Python HTTP
 *    [FACADE]    SubmissionService is the single entry point
 *    [SINGLETON] Database (via SubmissionService import)
 *    [FACTORY]   UserFactory used in JWT auth flow
 * ================================================================
 */
const express    = require('express');
const cors       = require('cors');
const path       = require('path');
const multer     = require('multer');
const fs         = require('fs');
const { EventEmitter } = require('events');
const { authMiddleware, teacherOnly } = require('./middleware/auth');
const SubmissionService   = require('./SubmissionService');
const notificationAdapter = require('./NotificationAdapter');

const app  = express();
const PORT = 3001;

// ── Ensure uploads directory exists ──────────────────────────────
const UPLOADS_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR);

// ── Multer config — accept all file types, 50 MB max ─────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  },
});
const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } });

// ── Middleware ────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ── Serve portals as static files ────────────────────────────────
// Student portal  → http://localhost:3001/
// Instructor desk → http://localhost:3001/instructor/
// Uploaded files  → http://localhost:3001/uploads/<filename>
app.use('/uploads',    express.static(UPLOADS_DIR));
app.use('/instructor', express.static(path.join(__dirname, '..', 'instructor-portal')));
app.use('/',           express.static(path.join(__dirname, '..', 'student-portal')));

// ── PATTERN: OBSERVER ─────────────────────────────────────────────
const eventBus = new EventEmitter();
eventBus.on('submission', (data) => {
  notificationAdapter.send(data);  // Adapter → Python
});


// ================================================================
// ROUTES
// ================================================================

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'backend-api', language: 'Node.js', port: PORT });
});

// ── POST /api/submissions — student uploads file ──────────────────
app.post('/api/submissions', authMiddleware, upload.single('file'), async (req, res) => {
  const { courseId, fullName, studentNumber } = req.body;
  const { id: studentId, name: studentName, role } = req.user;

  if (role !== 'student') {
    // Clean up uploaded file if wrong role
    if (req.file) fs.unlinkSync(req.file.path);
    return res.status(403).json({ error: 'Only students can submit assignments' });
  }

  if (!courseId || !fullName || !studentNumber) {
    if (req.file) fs.unlinkSync(req.file.path);
    return res.status(400).json({ error: 'courseId, fullName, and studentNumber are required' });
  }

  if (!req.file) {
    return res.status(400).json({ error: 'Please upload a file' });
  }

  try {
    const submission = await SubmissionService.create({
      studentId,
      studentName,
      courseId,
      fullName,
      studentNumber,
      filePath:         req.file.filename,
      originalFilename: req.file.originalname,
    }, eventBus);

    res.status(201).json({ success: true, submission });
  } catch (err) {
    if (req.file) fs.unlinkSync(req.file.path);
    res.status(400).json({ error: err.message });
  }
});

// ── GET /api/submissions — teacher sees all, student sees own ─────
app.get('/api/submissions', authMiddleware, async (req, res) => {
  try {
    const { id: userId, role } = req.user;
    const submissions = role === 'teacher'
      ? await SubmissionService.getAll()
      : await SubmissionService.getForStudent(userId);
    res.json({ submissions });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/submissions/stats ───────────────────────────────────
app.get('/api/submissions/stats', authMiddleware, async (req, res) => {
  try {
    const stats = await SubmissionService.getStats();
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/submissions/:receiptId ──────────────────────────────
app.get('/api/submissions/:receiptId', authMiddleware, async (req, res) => {
  try {
    const sub = await SubmissionService.getByReceiptId(req.params.receiptId);
    if (!sub) return res.status(404).json({ error: 'Receipt not found' });
    res.json(sub);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/download/:receiptId — teacher downloads file ─────────
app.get('/api/download/:receiptId', authMiddleware, teacherOnly, async (req, res) => {
  try {
    const sub = await SubmissionService.getByReceiptId(req.params.receiptId);
    if (!sub) return res.status(404).json({ error: 'Not found' });
    if (!sub.file_path) return res.status(404).json({ error: 'No file for this submission' });

    const filePath = path.join(UPLOADS_DIR, sub.file_path);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found on server' });

    // Force download with original filename
    res.download(filePath, sub.original_filename || sub.file_path);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ================================================================
app.listen(PORT, () => {
  console.log('\n  [Node.js] Backend API running');
  console.log(`  Subsystem : Core API`);
  console.log(`  Port      : ${PORT}`);
  console.log(`  Patterns  : Observer, Adapter, Facade, Singleton, Factory, Strategy`);
  console.log('');
  console.log('  Open in browser:');
  console.log(`    Student Portal   -> http://localhost:${PORT}/`);
  console.log(`    Instructor Desk  -> http://localhost:${PORT}/instructor/`);
  console.log(`    API Health       -> http://localhost:${PORT}/api/health\n`);
});
