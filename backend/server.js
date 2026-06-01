/* Observer pattern: eventBus is the subject — it emits a 'submission' event
   every time a student successfully saves an assignment. The NotificationAdapter
   is the observer registered on that event at line 38. When the event fires, the
   adapter sends a notification to the Python service without the submission-saving
   code knowing or caring what happens next. New observers (email alerts, live
   dashboards) can be added with one more eventBus.on() call and zero changes
   to the submission logic. */
const express    = require('express');
const cors       = require('cors');
const path       = require('path');
const multer     = require('multer');
const { EventEmitter } = require('events');
const { authMiddleware, teacherOnly } = require('./middleware/auth');
const SubmissionService   = require('./SubmissionService');
const DeadlineService     = require('./DeadlineService');
const notificationAdapter = require('./NotificationAdapter');

const app  = express();
const PORT = 3001;

// ── Multer: memory storage — files go to Neon, not disk ──────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
});

// ── Middleware ────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ── Serve portals as static files ────────────────────────────────
app.use('/instructor', express.static(path.join(__dirname, '..', 'instructor-portal')));
app.use('/',           express.static(path.join(__dirname, '..', 'student-portal')));

// ── Observer: submission event → Python notification ──────────────
const eventBus = new EventEmitter();
eventBus.on('submission', (data) => notificationAdapter.send(data));


// ================================================================
// ROUTES
// ================================================================

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'backend-api', language: 'Node.js', port: PORT });
});

// ── POST /api/submissions — student uploads file to Neon ──────────
app.post('/api/submissions', authMiddleware, upload.single('file'), async (req, res) => {
  const { courseId, fullName, studentNumber } = req.body;
  const { id: studentId, name: studentName, role } = req.user;

  if (role !== 'student') {
    return res.status(403).json({ error: 'Only students can submit assignments' });
  }
  if (!courseId || !fullName || !studentNumber) {
    return res.status(400).json({ error: 'courseId, fullName and studentNumber are required' });
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
      fileBuffer:       req.file.buffer,        // in-memory → goes to Neon BYTEA
      originalFilename: req.file.originalname,
      mimeType:         req.file.mimetype,
    }, eventBus);

    res.status(201).json({ success: true, submission });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ── GET /api/submissions ──────────────────────────────────────────
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

// ── GET /api/submissions/stats ────────────────────────────────────
app.get('/api/submissions/stats', authMiddleware, async (req, res) => {
  try {
    res.json(await SubmissionService.getStats());
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

// ── GET /api/download/:receiptId — teacher downloads from Neon ────
app.get('/api/download/:receiptId', authMiddleware, teacherOnly, async (req, res) => {
  try {
    const sub = await SubmissionService.getByReceiptIdWithFile(req.params.receiptId);
    if (!sub)           return res.status(404).json({ error: 'Submission not found' });
    if (!sub.file_data) return res.status(404).json({ error: 'No file stored for this submission' });

    const filename = sub.original_filename || 'download';
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', sub.mime_type || 'application/octet-stream');
    res.send(sub.file_data); // Buffer from Neon BYTEA column
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/deadlines — teacher sets a deadline ─────────────────
app.post('/api/deadlines', authMiddleware, teacherOnly, async (req, res) => {
  const { courseId, title, deadlineAt } = req.body;
  if (!courseId || !deadlineAt) {
    return res.status(400).json({ error: 'courseId and deadlineAt are required' });
  }
  try {
    const deadline = await DeadlineService.set({
      courseId,
      title,
      deadlineAt: new Date(deadlineAt),
      teacherId: req.user.id,
    });
    res.status(201).json({ success: true, deadline });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ── GET /api/deadlines — get all deadlines ────────────────────────
app.get('/api/deadlines', authMiddleware, async (req, res) => {
  try {
    res.json({ deadlines: await DeadlineService.getAll() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /api/deadlines/:courseId — teacher removes deadline ────
app.delete('/api/deadlines/:courseId', authMiddleware, teacherOnly, async (req, res) => {
  try {
    await DeadlineService.remove(req.params.courseId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ================================================================
app.listen(PORT, () => {
  console.log('\n  [Node.js] Backend API running');
  console.log(`  Subsystem : Core API`);
  console.log(`  Port      : ${PORT}`);
  console.log(`  Storage   : Neon PostgreSQL BYTEA (no local disk)`);
  console.log(`  Patterns  : Observer, Adapter, Facade, Singleton, Factory, Strategy`);
  console.log('');
  console.log('  Open in browser:');
  console.log(`    Student Portal   -> http://localhost:${PORT}/`);
  console.log(`    Instructor Desk  -> http://localhost:${PORT}/instructor/`);
  console.log(`    API Health       -> http://localhost:${PORT}/api/health\n`);
});
