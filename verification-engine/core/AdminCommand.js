/**
 * ================================================================
 *  AdminCommand — Command Pattern Implementation
 * ================================================================
 *  Pattern  : COMMAND (Behavioral GoF Pattern)
 *  Intent   : Encapsulate a request as an object, thereby letting
 *             you parameterize clients with different requests,
 *             queue or log requests, and support undoable operations.
 *
 *  Participants (GoF roles):
 *    Command         → AdminCommand (abstract base)
 *    ConcreteCommand → CreateUserCommand
 *    ConcreteCommand → CreateCourseCommand
 *    ConcreteCommand → AssignTeacherCommand
 *    ConcreteCommand → SetDeadlineCommand
 *    ConcreteCommand → UpdateUserCoursesCommand
 *    Invoker         → AdminCommandInvoker
 *    Receiver        → UserRepository, CourseRepository, AssignmentRepository
 *
 *  How it applies here:
 *    Every admin operation (add user, create course, set deadline) is
 *    encapsulated as a Command object. The Invoker logs and executes
 *    them. New admin actions = one new ConcreteCommand class.
 * ================================================================
 */

// ── Abstract Command ──────────────────────────────────────────────
class AdminCommand {
  /** @abstract @returns {{ success: boolean, data?: any, error?: string }} */
  execute() {
    throw new Error('[AdminCommand] execute() must be implemented by a ConcreteCommand.');
  }
  /** @returns {string} human-readable description for logging */
  describe() { return 'AdminCommand'; }
}

// ── ConcreteCommand 1: Create User ───────────────────────────────
class CreateUserCommand extends AdminCommand {
  /**
   * @param {Object} userRepo
   * @param {Object} authService
   * @param {{ username, password, role, name, email, courses }} data
   */
  constructor(userRepo, authService, data) {
    super();
    this._repo    = userRepo;
    this._auth    = authService;
    this._data    = data;
  }
  describe() { return `CreateUser(${this._data.username}, role=${this._data.role})`; }
  execute() {
    const { username, password, role, name, email, courses } = this._data;
    if (!username || !password || !role || !name) {
      return { success: false, error: 'username, password, role, and name are required.' };
    }
    const allowedRoles = ['student', 'teacher', 'admin'];
    if (!allowedRoles.includes(role)) {
      return { success: false, error: `Invalid role. Must be one of: ${allowedRoles.join(', ')}` };
    }
    const existing = this._repo.findByUsername(username);
    if (existing) {
      return { success: false, error: `Username '${username}' is already taken.` };
    }
    const crypto = require('crypto');
    const newUser = {
      id:           `USR-${role.toUpperCase().slice(0,3)}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`,
      username,
      passwordHash: this._auth.hashPassword(password),
      role,
      name,
      email:        email || '',
      courses:      courses || [],
    };
    this._repo.save(newUser);
    const { passwordHash: _, ...safeUser } = newUser;
    return { success: true, data: safeUser };
  }
}

// ── ConcreteCommand 2: Create Course ────────────────────────────
class CreateCourseCommand extends AdminCommand {
  constructor(courseRepo, data) {
    super();
    this._repo = courseRepo;
    this._data = data;
  }
  describe() { return `CreateCourse(${this._data.id})`; }
  execute() {
    const { id, name, teacherId, teacherName, description } = this._data;
    if (!id || !name) return { success: false, error: 'id and name are required.' };
    if (this._repo.findById(id)) return { success: false, error: `Course '${id}' already exists.` };
    const course = { id, name, teacherId: teacherId || '', teacherName: teacherName || '', description: description || '' };
    this._repo.save(course);
    return { success: true, data: course };
  }
}

// ── ConcreteCommand 3: Assign Teacher to Course ──────────────────
class AssignTeacherCommand extends AdminCommand {
  constructor(courseRepo, userRepo, data) {
    super();
    this._courseRepo = courseRepo;
    this._userRepo   = userRepo;
    this._data       = data;
  }
  describe() { return `AssignTeacher(teacher=${this._data.teacherId}, course=${this._data.courseId})`; }
  execute() {
    const { teacherId, courseId } = this._data;
    const teacher = this._userRepo.findById(teacherId);
    if (!teacher || teacher.role !== 'teacher') return { success: false, error: 'Teacher not found.' };
    const course  = this._courseRepo.findById(courseId);
    if (!course) return { success: false, error: 'Course not found.' };

    // Update course
    course.teacherId   = teacherId;
    course.teacherName = teacher.name;
    this._courseRepo.update(course);

    // Update teacher's course list
    if (!teacher.courses.includes(courseId)) teacher.courses.push(courseId);
    this._userRepo.update(teacher);

    return { success: true, data: { course, teacher: { id: teacher.id, name: teacher.name } } };
  }
}

// ── ConcreteCommand 4: Set Assignment Deadline ───────────────────
class SetDeadlineCommand extends AdminCommand {
  constructor(assignmentRepo, data) {
    super();
    this._repo = assignmentRepo;
    this._data = data;
  }
  describe() { return `SetDeadline(assignment=${this._data.assignmentId}, deadline=${this._data.deadline})`; }
  execute() {
    const { assignmentId, deadline } = this._data;
    const assignment = this._repo.findById(assignmentId);
    if (!assignment) return { success: false, error: `Assignment '${assignmentId}' not found.` };
    const parsed = new Date(deadline);
    if (isNaN(parsed.getTime())) return { success: false, error: 'Invalid deadline date.' };
    assignment.deadline = parsed.toISOString();
    this._repo.update(assignment);
    return { success: true, data: assignment };
  }
}

// ── ConcreteCommand 5: Update User Courses ───────────────────────
class UpdateUserCoursesCommand extends AdminCommand {
  constructor(userRepo, data) {
    super();
    this._repo = userRepo;
    this._data = data;
  }
  describe() { return `UpdateUserCourses(userId=${this._data.userId})`; }
  execute() {
    const { userId, courses } = this._data;
    const user = this._repo.findById(userId);
    if (!user) return { success: false, error: 'User not found.' };
    user.courses = courses || [];
    this._repo.update(user);
    const { passwordHash: _, ...safe } = user;
    return { success: true, data: safe };
  }
}

// ── ConcreteCommand 6: Create Assignment ─────────────────────────
class CreateAssignmentCommand extends AdminCommand {
  constructor(assignmentRepo, data) {
    super();
    this._repo = assignmentRepo;
    this._data = data;
  }
  describe() { return `CreateAssignment(${this._data.title}, course=${this._data.courseId})`; }
  execute() {
    const { courseId, title, description, deadline, allowedTypes, maxFileSizeMB } = this._data;
    if (!courseId || !title || !deadline) return { success: false, error: 'courseId, title, and deadline are required.' };
    const crypto = require('crypto');
    const assignment = {
      id:             `ASGN-${courseId}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`,
      courseId, title,
      description:    description || '',
      deadline:       new Date(deadline).toISOString(),
      allowedTypes:   allowedTypes || ['pdf','docx','zip'],
      maxFileSizeMB:  maxFileSizeMB || 10,
    };
    this._repo.save(assignment);
    return { success: true, data: assignment };
  }
}

// ── Invoker ───────────────────────────────────────────────────────
/**
 * AdminCommandInvoker logs, validates, and executes admin commands.
 * Maintains a history of executed commands for auditing.
 */
class AdminCommandInvoker {
  constructor() {
    /** @type {Array<{command: string, result: object, at: string}>} */
    this._history = [];
  }

  /**
   * Execute a command and record it in history.
   * @param {AdminCommand} command
   * @returns {{ success: boolean, data?: any, error?: string }}
   */
  execute(command) {
    console.log(`[AdminCommandInvoker] Executing: ${command.describe()}`);
    const result = command.execute();
    this._history.push({
      command: command.describe(),
      success: result.success,
      at:      new Date().toISOString(),
    });
    if (result.success) {
      console.log(`[AdminCommandInvoker] ✔ SUCCESS: ${command.describe()}`);
    } else {
      console.log(`[AdminCommandInvoker] ✘ FAILED: ${command.describe()} — ${result.error}`);
    }
    return result;
  }

  /** @returns {Array} audit history */
  getHistory() { return this._history; }
}

module.exports = {
  AdminCommandInvoker,
  CreateUserCommand,
  CreateCourseCommand,
  AssignTeacherCommand,
  SetDeadlineCommand,
  UpdateUserCoursesCommand,
  CreateAssignmentCommand,
};
