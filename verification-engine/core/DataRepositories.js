/**
 * UserRepository — Proxy pattern for users.json
 * CourseRepository — Proxy pattern for courses.json
 * AssignmentRepository — Proxy pattern for assignments.json
 *
 * All three follow the same Proxy pattern as SubmissionRepository.
 * Bundled in one file for brevity.
 */
const fs   = require('fs');
const path = require('path');

class BaseRepository {
  constructor(filePath) {
    this._filePath = filePath;
    this._cache    = null;
    this._ensureFile();
  }
  _ensureFile() {
    const dir = path.dirname(this._filePath);
    if (!fs.existsSync(dir))  fs.mkdirSync(dir, { recursive: true });
    if (!fs.existsSync(this._filePath)) fs.writeFileSync(this._filePath, '[]', 'utf8');
  }
  _load() {
    try {
      const raw = fs.readFileSync(this._filePath, 'utf8');
      this._cache = JSON.parse(raw);
    } catch { this._cache = []; }
    return this._cache;
  }
  _persist() {
    fs.writeFileSync(this._filePath, JSON.stringify(this._cache, null, 2), 'utf8');
  }
  getAll()        { return this._load(); }
  findById(id)    { return this._load().find(r => r.id === id) || null; }
  save(record)    { this._load().push(record); this._persist(); return record; }
  update(record)  {
    const all = this._load();
    const idx = all.findIndex(r => r.id === record.id);
    if (idx !== -1) { all[idx] = record; this._cache = all; this._persist(); }
    return record;
  }
  delete(id) {
    this._cache = this._load().filter(r => r.id !== id);
    this._persist();
  }
  count() { return this._load().length; }
}

// ── UserRepository ────────────────────────────────────────────────
class UserRepository extends BaseRepository {
  constructor(dataDir) {
    super(path.join(dataDir, 'users.json'));
  }
  findByUsername(username) {
    return this._load().find(u => u.username === username) || null;
  }
  findByRole(role) {
    return this._load().filter(u => u.role === role);
  }
  /** Hash any seed passwords on first load */
  processSeedPasswords(authService) {
    let changed = false;
    const all   = this._load();
    all.forEach(user => {
      const { needsUpdate, hash } = authService.processSeedHash(user.passwordHash);
      if (needsUpdate) { user.passwordHash = hash; changed = true; }
    });
    if (changed) { this._cache = all; this._persist(); console.log('[UserRepository] Seed passwords hashed.'); }
  }
}

// ── CourseRepository ──────────────────────────────────────────────
class CourseRepository extends BaseRepository {
  constructor(dataDir) {
    super(path.join(dataDir, 'courses.json'));
  }
  findByTeacher(teacherId) {
    return this._load().filter(c => c.teacherId === teacherId);
  }
}

// ── AssignmentRepository ──────────────────────────────────────────
class AssignmentRepository extends BaseRepository {
  constructor(dataDir) {
    super(path.join(dataDir, 'assignments.json'));
  }
  findByCourse(courseId) {
    return this._load().filter(a => a.courseId === courseId);
  }
  isPastDeadline(assignmentId) {
    const a = this.findById(assignmentId);
    if (!a || !a.deadline) return false;
    return new Date() > new Date(a.deadline);
  }
}

module.exports = { UserRepository, CourseRepository, AssignmentRepository };
