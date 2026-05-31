/**
 * ================================================================
 *  Concrete Middleware Handlers — Chain of Responsibility
 * ================================================================
 *  Three concrete handlers that form the security middleware chain.
 *
 *  Chain order in engine.js:
 *    AuthHandler → RoleHandler → CourseAccessHandler
 *
 *  Each handler either:
 *    (a) Rejects the request (returns { passed:false })
 *    (b) Passes it to the next handler in the chain
 * ================================================================
 */
const MiddlewareHandler = require('./MiddlewareHandler');
const AuthService        = require('./AuthService');

// ── ConcreteHandler 1: Authentication ────────────────────────────
/**
 * Validates the Bearer token in the Authorization header.
 * Populates ctx.session on success.
 * Rejects with HTTP 401 if missing or invalid.
 */
class AuthHandler extends MiddlewareHandler {
  handle(ctx) {
    const authService = AuthService.getInstance();
    const token       = authService.extractToken(ctx.req.headers['authorization']);
    const session     = authService.validateToken(token);

    if (!session) {
      console.log(`[AuthHandler] ✘ REJECTED — no valid token`);
      return {
        passed:     false,
        statusCode: 401,
        error:      'Unauthorized. Please log in to access this resource.',
      };
    }

    ctx.session = session;
    console.log(`[AuthHandler] ✔ PASS — user: ${session.username} (${session.role})`);
    return super.handle(ctx);
  }
}

// ── ConcreteHandler 2: Role Authorization ────────────────────────
/**
 * Checks that the authenticated user has one of the required roles.
 * ctx.requiredRoles = ['admin'] | ['teacher'] | ['admin','teacher'] etc.
 * Rejects with HTTP 403 if role not permitted.
 */
class RoleHandler extends MiddlewareHandler {
  handle(ctx) {
    if (!ctx.requiredRoles || ctx.requiredRoles.length === 0) {
      return super.handle(ctx); // no role constraint
    }

    const userRole = ctx.session.role;
    if (!ctx.requiredRoles.includes(userRole)) {
      console.log(`[RoleHandler] ✘ REJECTED — role '${userRole}' not in [${ctx.requiredRoles}]`);
      return {
        passed:     false,
        statusCode: 403,
        error:      `Access denied. This action requires role: ${ctx.requiredRoles.join(' or ')}.`,
      };
    }

    console.log(`[RoleHandler] ✔ PASS — role '${userRole}' is permitted`);
    return super.handle(ctx);
  }
}

// ── ConcreteHandler 3: Course Access ─────────────────────────────
/**
 * Ensures a teacher can only access submissions for their own courses.
 * Admins bypass this check (they can see everything).
 * Students bypass this check (filtered elsewhere).
 * ctx.courseId = the course ID being requested.
 */
class CourseAccessHandler extends MiddlewareHandler {
  handle(ctx) {
    const { session, courseId } = ctx;

    // Admins have unrestricted access
    if (session.role === 'admin') {
      console.log(`[CourseAccessHandler] ✔ PASS — admin has full access`);
      return super.handle(ctx);
    }

    // Students access is not restricted at this layer
    if (session.role === 'student') {
      return super.handle(ctx);
    }

    // Teachers: only their own courses
    if (session.role === 'teacher' && courseId) {
      const hasCourse = session.courses.includes(courseId);
      if (!hasCourse) {
        console.log(`[CourseAccessHandler] ✘ REJECTED — teacher does not own course ${courseId}`);
        return {
          passed:     false,
          statusCode: 403,
          error:      `Access denied. You are not the registered teacher for course: ${courseId}.`,
        };
      }
    }

    console.log(`[CourseAccessHandler] ✔ PASS`);
    return super.handle(ctx);
  }
}

module.exports = { AuthHandler, RoleHandler, CourseAccessHandler };
