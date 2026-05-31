/**
 * ================================================================
 *  MiddlewareHandler — Chain of Responsibility (Abstract Base)
 * ================================================================
 *  Pattern  : CHAIN OF RESPONSIBILITY (Behavioral GoF Pattern)
 *  Intent   : Avoid coupling the sender of a request to its receiver
 *             by giving more than one object a chance to handle it.
 *             Chain the receiving objects and pass the request along
 *             the chain until an object handles it.
 *
 *  Participants (GoF roles):
 *    Handler         → MiddlewareHandler (this abstract base)
 *    ConcreteHandler → AuthHandler       (checks token exists)
 *    ConcreteHandler → RoleHandler       (checks required role)
 *    ConcreteHandler → CourseAccessHandler (checks teacher owns course)
 *
 *  How it applies here:
 *    Every protected API route passes through a chain:
 *    AuthHandler → RoleHandler → CourseAccessHandler → RouteHandler
 *    If any link rejects the request, it stops and sends an error.
 *    Adding new security checks = adding a new ConcreteHandler.
 * ================================================================
 */
class MiddlewareHandler {
  constructor() {
    /** @type {MiddlewareHandler|null} */
    this._next = null;
  }

  /**
   * Set the next handler in the chain.
   * Returns `this` to enable fluent chaining:
   *   authHandler.setNext(roleHandler).setNext(courseHandler)
   *
   * @param {MiddlewareHandler} handler
   * @returns {MiddlewareHandler}
   */
  setNext(handler) {
    this._next = handler;
    return handler;
  }

  /**
   * Handle the request context or pass it to the next handler.
   * Concrete handlers call super.handle(ctx) to pass along the chain.
   *
   * @abstract
   * @param {Object} ctx - request context
   * @param {Object} ctx.req  - Node.js IncomingMessage
   * @param {Object} ctx.res  - Node.js ServerResponse
   * @param {Object} ctx.session - populated by AuthHandler
   * @param {string} [ctx.requiredRole] - role required by RoleHandler
   * @param {string} [ctx.courseId]     - course ID for CourseAccessHandler
   * @returns {{ passed: boolean, session?: Object, error?: string, statusCode?: number }}
   */
  handle(ctx) {
    if (this._next) {
      return this._next.handle(ctx);
    }
    // End of chain — all handlers passed
    return { passed: true, session: ctx.session };
  }
}

module.exports = MiddlewareHandler;
