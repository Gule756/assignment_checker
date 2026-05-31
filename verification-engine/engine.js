/**
 * ================================================================
 *  Verification Engine v2.0 — Main Entry Point
 *  Digital Assignment Submission & Receipt Validation Grid
 * ================================================================
 *  HOW TO RUN:  node engine.js
 *  PORT:        3001
 *  ZERO external npm dependencies — Node.js built-ins only.
 *
 *  ACTIVE DESIGN PATTERNS (GoF) — 10 Patterns:
 *   Creational: [1] Singleton  [2] Builder  [3] Factory Method
 *   Structural: [4] Facade    [7] Proxy    [10] Decorator
 *   Behavioral: [5] Template Method  [6] Observer
 *               [8] Strategy  [9] Chain of Responsibility  [10] Command
 *
 *  DEFAULT CREDENTIALS:
 *   Admin   : admin / admin123
 *   Teacher1: teacher1 / pass123  (CS101, CS201, CS401)
 *   Teacher2: teacher2 / pass123  (CS301, MATH101)
 *   Students: student1-3 / pass123
 * ================================================================
 */
const http   = require('http');
const path   = require('path');
const crypto = require('crypto');

// ── Core modules ──────────────────────────────────────────────────
const SubmissionStore      = require('./core/SubmissionStore');
const ReceiptBuilder       = require('./core/ReceiptBuilder');
const ReceiptFactory       = require('./core/ReceiptFactory');
const HashFormatValidator  = require('./core/HashFormatValidator');
const DeadlineValidator    = require('./core/DeadlineValidator');
const EventBus             = require('./core/EventBus');
const SubmissionAPI        = require('./core/SubmissionAPI');
const SubmissionRepository = require('./core/SubmissionRepository');
const AuthService          = require('./core/AuthService');
const FileStorageService   = require('./core/FileStorageService');
const { UserRepository, CourseRepository, AssignmentRepository } = require('./core/DataRepositories');
const { AuthHandler, RoleHandler, CourseAccessHandler } = require('./core/AuthMiddlewareChain');
const {
  AdminCommandInvoker, CreateUserCommand, CreateCourseCommand,
  AssignTeacherCommand, SetDeadlineCommand,
  UpdateUserCoursesCommand, CreateAssignmentCommand,
} = require('./core/AdminCommand');

// ── Data paths ────────────────────────────────────────────────────
const DATA_DIR    = path.join(__dirname, '..', 'shared', 'data');
const UPLOADS_DIR = path.join(__dirname, '..', 'shared', 'uploads');
const SUBS_FILE   = path.join(DATA_DIR, 'submissions.json');

// ── Instantiate services ──────────────────────────────────────────
const authService    = AuthService.getInstance();              // [1] Singleton
const userRepo       = new UserRepository(DATA_DIR);           // Proxy
const courseRepo     = new CourseRepository(DATA_DIR);         // Proxy
const assignmentRepo = new AssignmentRepository(DATA_DIR);     // Proxy
const fileStorage    = new FileStorageService(UPLOADS_DIR);
const adminInvoker   = new AdminCommandInvoker();              // Command Invoker

// ── Seed passwords on first load ──────────────────────────────────
userRepo.processSeedPasswords(authService);

// ── Original submission system (patterns 1-7) ─────────────────────
const store       = SubmissionStore.getInstance();             // [1] Singleton
const builder     = new ReceiptBuilder();                      // [2] Builder
const hashVal     = new HashFormatValidator();                 // [5] Template Method
const deadlineVal = new DeadlineValidator();                   // [5] Template Method
const eventBus    = new EventBus();                            // [6] Observer
const subRepo     = new SubmissionRepository(SUBS_FILE);       // Proxy
const submissionAPI = new SubmissionAPI(                       // [4] Facade
  store, builder, hashVal, deadlineVal, eventBus, subRepo
);
store.loadAll(subRepo.loadAll());

// ── Register Observers ────────────────────────────────────────────
eventBus.subscribe('submission:registered', (receipt) => {
  console.log(`[Observer:AuditLog] ${receipt.receiptId} | ${receipt.studentId} | ${receipt.courseId} | ${receipt.status}`);
});
eventBus.subscribe('submission:count_changed', ({ count }) => {
  console.log(`[Observer:Counter] Total submissions: ${count}`);
});

// ── Build Middleware Chain factory ────────────────────────────────
// [9] Chain of Responsibility: AuthHandler → RoleHandler → CourseAccessHandler
/**
 * Decorator pattern [10]: protectRoute wraps any handler function
 * with the auth middleware chain, keeping route logic clean.
 *
 * @param {string[]} requiredRoles - e.g. ['admin'] or ['teacher','admin']
 * @param {string|null} courseIdExtractor - key in body/params for course checking
 * @returns {Function} middleware runner
 */
function protectRoute(requiredRoles = [], courseIdExtractor = null) {
  return function (req, body, res) {
    // Build chain
    const auth   = new AuthHandler();
    const role   = new RoleHandler();
    const course = new CourseAccessHandler();
    auth.setNext(role).setNext(course);

    const ctx = {
      req,
      res,
      requiredRoles,
      courseId: courseIdExtractor ? (body[courseIdExtractor] || null) : null,
      session:  null,
    };
    return auth.handle(ctx);
  };
}

// ── HTTP Utilities ────────────────────────────────────────────────
const PORT = 3001;

function setCORSHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin',  '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

function sendJSON(res, status, data) {
  setCORSHeaders(res);
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data, null, 2));
}

function readBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end',  () => {
      try { resolve(JSON.parse(body || '{}')); }
      catch { resolve({}); }
    });
  });
}

// ── Route: strip query string ─────────────────────────────────────
function parsePath(url) {
  const [pathname, qs] = url.split('?');
  const params = {};
  if (qs) qs.split('&').forEach(p => { const [k,v]=p.split('='); params[k]=decodeURIComponent(v||''); });
  return { pathname, params };
}

// ── HTTP Server ───────────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
  const { method } = req;
  const { pathname, params } = parsePath(req.url);

  console.log(`[Engine] ${method} ${pathname}`);

  // CORS pre-flight
  if (method === 'OPTIONS') { setCORSHeaders(res); res.writeHead(204); res.end(); return; }

  // ──────────────────────────────────────────────────────────────
  // PUBLIC ROUTES (no auth required)
  // ──────────────────────────────────────────────────────────────

  // GET /health
  if (method === 'GET' && pathname === '/health') {
    return sendJSON(res, 200, {
      status: 'ok', engine: 'v2.0', port: PORT,
      uptime: process.uptime().toFixed(1) + 's',
      submissions: store.count,
      patterns: ['1.Singleton','2.Builder','3.FactoryMethod','4.Facade','5.TemplateMethod',
                 '6.Observer','7.Proxy','8.Strategy','9.ChainOfResponsibility','10.Command'],
    });
  }

  // POST /auth/login
  if (method === 'POST' && pathname === '/auth/login') {
    const body = await readBody(req);
    const { username, password } = body;
    if (!username || !password) return sendJSON(res, 400, { error: 'username and password required.' });

    const user = userRepo.findByUsername(username);
    if (!user || !authService.verifyPassword(password, user.passwordHash)) {
      return sendJSON(res, 401, { error: 'Invalid username or password.' });
    }
    const token = authService.createSession(user);
    const { passwordHash: _, ...safeUser } = user;
    console.log(`[Engine] Login: ${username} (${user.role})`);
    return sendJSON(res, 200, { success: true, token, user: safeUser });
  }

  // POST /auth/logout
  if (method === 'POST' && pathname === '/auth/logout') {
    const token = authService.extractToken(req.headers['authorization']);
    authService.destroySession(token);
    return sendJSON(res, 200, { success: true, message: 'Logged out.' });
  }

  // GET /courses (public — for dropdown population)
  if (method === 'GET' && pathname === '/courses') {
    return sendJSON(res, 200, courseRepo.getAll());
  }

  // GET /assignments (public — filtered by courseId query param)
  if (method === 'GET' && pathname === '/assignments') {
    const courseId = params.courseId;
    const list = courseId ? assignmentRepo.findByCourse(courseId) : assignmentRepo.getAll();
    return sendJSON(res, 200, list);
  }

  // ──────────────────────────────────────────────────────────────
  // PROTECTED ROUTES — all require valid session token
  // ──────────────────────────────────────────────────────────────

  const body = await readBody(req);

  // GET /auth/me  — identify logged-in user
  if (method === 'GET' && pathname === '/auth/me') {
    const guard = protectRoute([])(req, body, res);
    if (!guard.passed) return sendJSON(res, guard.statusCode, { error: guard.error });
    const { passwordHash: _, ...safe } = userRepo.findById(guard.session.userId) || {};
    return sendJSON(res, 200, safe);
  }

  // ── STUDENT: POST /submissions (file upload + receipt) ────────
  if (method === 'POST' && pathname === '/submissions') {
    const guard = protectRoute(['student', 'admin'], 'courseId')(req, body, res);
    if (!guard.passed) return sendJSON(res, guard.statusCode, { error: guard.error });

    const { courseId, assignmentId, fileName, fileData, comment } = body;
    const session = guard.session;

    // Validate course & assignment
    const course     = courseRepo.findById(courseId);
    const assignment = assignmentId ? assignmentRepo.findById(assignmentId) : null;
    if (!course) return sendJSON(res, 400, { error: `Course '${courseId}' not found.` });

    // File upload
    if (!fileName || !fileData) return sendJSON(res, 400, { error: 'fileName and fileData (base64) are required.' });

    // Check allowed file types for assignment
    if (assignment && assignment.allowedTypes) {
      const ext = fileName.split('.').pop().toLowerCase();
      if (!assignment.allowedTypes.includes(ext)) {
        return sendJSON(res, 400, { error: `File type '.${ext}' not allowed for this assignment. Allowed: ${assignment.allowedTypes.join(', ')}` });
      }
    }

    const maxMB = assignment ? assignment.maxFileSizeMB : 10;
    const fileResult = fileStorage.saveFile({ fileName, fileData, maxSizeMB: maxMB });
    if (!fileResult.success) return sendJSON(res, 400, { error: fileResult.error });

    // Build submission payload for the Facade
    const isLate = assignment ? assignmentRepo.isPastDeadline(assignmentId) : false;
    const submissionData = {
      studentId:      session.userId,
      studentName:    session.name,
      courseId,
      assignmentId:   assignmentId || 'OPEN',
      assignmentHash: `FILE:${fileResult.fileMeta.originalName}`,
      fileMeta:       fileResult.fileMeta,
      comment:        comment || '',
      _forceLate:     isLate,
    };

    const result = submissionAPI.submit(submissionData);
    return sendJSON(res, result.success ? 201 : 400, result);
  }

  // ── GET /submissions — list (teacher: own courses; admin: all; student: own) ──
  if (method === 'GET' && pathname === '/submissions') {
    const guard = protectRoute([])(req, body, res);
    if (!guard.passed) return sendJSON(res, guard.statusCode, { error: guard.error });
    const session = guard.session;
    let all = submissionAPI.getAllSubmissions();

    if (session.role === 'student') {
      all = all.filter(s => s.studentId === session.userId);
    } else if (session.role === 'teacher') {
      all = all.filter(s => session.courses.includes(s.courseId));
    }
    // admin sees all
    return sendJSON(res, 200, all);
  }

  // ── GET /submissions/stats ────────────────────────────────────
  if (method === 'GET' && pathname === '/submissions/stats') {
    const guard = protectRoute(['teacher','admin'])(req, body, res);
    if (!guard.passed) return sendJSON(res, guard.statusCode, { error: guard.error });
    const session = guard.session;
    let all = submissionAPI.getAllSubmissions();
    if (session.role === 'teacher') all = all.filter(s => session.courses.includes(s.courseId));
    return sendJSON(res, 200, {
      total:    all.length,
      onTime:   all.filter(s => s.status === 'ON_TIME').length,
      late:     all.filter(s => s.status === 'LATE').length,
      rejected: all.filter(s => s.status === 'REJECTED').length,
    });
  }

  // ── PUT /assignments/:id/deadline — teacher or admin ──────────
  if (method === 'PUT' && pathname.startsWith('/assignments/') && pathname.endsWith('/deadline')) {
    const assignmentId = pathname.split('/')[2];
    const assignment   = assignmentRepo.findById(assignmentId);
    const courseId     = assignment ? assignment.courseId : null;

    const guard = protectRoute(['teacher','admin'], null)(req, body, res);
    if (!guard.passed) return sendJSON(res, guard.statusCode, { error: guard.error });

    // CourseAccess check for teacher
    if (guard.session.role === 'teacher' && courseId && !guard.session.courses.includes(courseId)) {
      return sendJSON(res, 403, { error: 'You are not the teacher for this course.' });
    }
    const result = adminInvoker.execute(new SetDeadlineCommand(assignmentRepo, { assignmentId, deadline: body.deadline }));
    return sendJSON(res, result.success ? 200 : 400, result);
  }

  // ── POST /admin/users ────────────────────────────────────────
  if (method === 'POST' && pathname === '/admin/users') {
    const guard = protectRoute(['admin'])(req, body, res);
    if (!guard.passed) return sendJSON(res, guard.statusCode, { error: guard.error });
    const result = adminInvoker.execute(new CreateUserCommand(userRepo, authService, body));
    return sendJSON(res, result.success ? 201 : 400, result);
  }

  // ── GET /admin/users ─────────────────────────────────────────
  if (method === 'GET' && pathname === '/admin/users') {
    const guard = protectRoute(['admin'])(req, body, res);
    if (!guard.passed) return sendJSON(res, guard.statusCode, { error: guard.error });
    const users = userRepo.getAll().map(({ passwordHash: _, ...u }) => u);
    return sendJSON(res, 200, users);
  }

  // ── POST /admin/courses ──────────────────────────────────────
  if (method === 'POST' && pathname === '/admin/courses') {
    const guard = protectRoute(['admin'])(req, body, res);
    if (!guard.passed) return sendJSON(res, guard.statusCode, { error: guard.error });
    const result = adminInvoker.execute(new CreateCourseCommand(courseRepo, body));
    return sendJSON(res, result.success ? 201 : 400, result);
  }

  // ── PUT /admin/courses/:id/teacher ───────────────────────────
  if (method === 'PUT' && pathname.startsWith('/admin/courses/') && pathname.endsWith('/teacher')) {
    const guard = protectRoute(['admin'])(req, body, res);
    if (!guard.passed) return sendJSON(res, guard.statusCode, { error: guard.error });
    const courseId = pathname.split('/')[3];
    const result   = adminInvoker.execute(new AssignTeacherCommand(courseRepo, userRepo, { teacherId: body.teacherId, courseId }));
    return sendJSON(res, result.success ? 200 : 400, result);
  }

  // ── PUT /admin/users/:id/courses ─────────────────────────────
  if (method === 'PUT' && pathname.startsWith('/admin/users/') && pathname.endsWith('/courses')) {
    const guard = protectRoute(['admin'])(req, body, res);
    if (!guard.passed) return sendJSON(res, guard.statusCode, { error: guard.error });
    const userId = pathname.split('/')[3];
    const result  = adminInvoker.execute(new UpdateUserCoursesCommand(userRepo, { userId, courses: body.courses }));
    return sendJSON(res, result.success ? 200 : 400, result);
  }

  // ── POST /admin/assignments ──────────────────────────────────
  if (method === 'POST' && pathname === '/admin/assignments') {
    const guard = protectRoute(['admin','teacher'])(req, body, res);
    if (!guard.passed) return sendJSON(res, guard.statusCode, { error: guard.error });
    const result = adminInvoker.execute(new CreateAssignmentCommand(assignmentRepo, body));
    return sendJSON(res, result.success ? 201 : 400, result);
  }

  // ── GET /admin/history ───────────────────────────────────────
  if (method === 'GET' && pathname === '/admin/history') {
    const guard = protectRoute(['admin'])(req, body, res);
    if (!guard.passed) return sendJSON(res, guard.statusCode, { error: guard.error });
    return sendJSON(res, 200, adminInvoker.getHistory());
  }

  // 404
  sendJSON(res, 404, { error: `Unknown route: ${method} ${pathname}` });
});

server.listen(PORT, () => {
  const line = '═'.repeat(60);
  console.log(`\n${line}`);
  console.log(`  RECEIPT VERIFICATION ENGINE v2.0 — RUNNING`);
  console.log(line);
  console.log(`  URL     : http://localhost:${PORT}`);
  console.log(`  Health  : http://localhost:${PORT}/health`);
  console.log(line);
  console.log(`  10 GoF Design Patterns Active:`);
  console.log(`  [1] Singleton          AuthService + SubmissionStore`);
  console.log(`  [2] Builder            ReceiptBuilder`);
  console.log(`  [3] Factory Method     ReceiptFactory`);
  console.log(`  [4] Facade             SubmissionAPI`);
  console.log(`  [5] Template Method    BaseValidator`);
  console.log(`  [6] Observer           EventBus`);
  console.log(`  [7] Proxy              Repositories`);
  console.log(`  [8] Strategy           HashValidation + Filter`);
  console.log(`  [9] Chain of Resp.     Auth Middleware Chain`);
  console.log(`  [10] Command           AdminCommandInvoker`);
  console.log(line);
  console.log(`  Default Logins:`);
  console.log(`  admin/admin123  |  teacher1/pass123  |  student1/pass123`);
  console.log(`${line}\n`);
});
