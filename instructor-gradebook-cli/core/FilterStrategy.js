/**
 * ================================================================
 *  FilterStrategy — Strategy Pattern (CLI reuse)
 * ================================================================
 *  Pattern  : STRATEGY (Behavioral GoF Pattern)
 *  Intent   : Define a family of algorithms, encapsulate each one,
 *             and make them interchangeable. Strategy lets the
 *             algorithm vary independently from the clients that use it.
 *
 *  Participants (GoF roles):
 *    Strategy          → IFilterStrategy (abstract base)
 *    ConcreteStrategy  → AllFilter, CourseFilter, StatusFilter,
 *                        StudentFilter, DateFilter
 *    Context           → FilterContext (holds active strategy)
 *
 *  How it applies here:
 *    The CLI instructor app can filter the submission list using
 *    different algorithms at runtime. The user picks a filter option
 *    from the menu; the app swaps the strategy without changing any
 *    rendering or data-fetching code — perfect open/closed principle.
 *
 *  Note on Software Reuse:
 *    This is a DIRECT REUSE of the same design pattern used in the
 *    browser-based gradebook (FilterStrategy.js), proving that design
 *    patterns transcend platform and technology.
 * ================================================================
 */

// ── Abstract Strategy ─────────────────────────────────────────────
class IFilterStrategy {
  /**
   * @abstract
   * @param {Object[]} submissions
   * @param {*} criterion
   * @returns {Object[]}
   */
  filter(submissions, criterion) {
    throw new Error('[IFilterStrategy] filter() must be implemented by every concrete strategy.');
  }
}

// ── Concrete Strategy 1: AllFilter ───────────────────────────────
class AllFilter extends IFilterStrategy {
  filter(submissions) {
    return submissions; // passthrough — no filtering
  }
}

// ── Concrete Strategy 2: CourseFilter ────────────────────────────
class CourseFilter extends IFilterStrategy {
  /**
   * @param {Object[]} submissions
   * @param {string} courseId - course code to match (case-insensitive)
   * @returns {Object[]}
   */
  filter(submissions, courseId) {
    if (!courseId) return submissions;
    return submissions.filter(s =>
      s.courseId && s.courseId.toUpperCase() === courseId.toUpperCase()
    );
  }
}

// ── Concrete Strategy 3: StatusFilter ────────────────────────────
class StatusFilter extends IFilterStrategy {
  /**
   * @param {Object[]} submissions
   * @param {string} status - 'ON_TIME' | 'LATE' | 'REJECTED'
   * @returns {Object[]}
   */
  filter(submissions, status) {
    if (!status) return submissions;
    return submissions.filter(s =>
      s.status && s.status.toUpperCase() === status.toUpperCase()
    );
  }
}

// ── Concrete Strategy 4: StudentFilter ───────────────────────────
class StudentFilter extends IFilterStrategy {
  /**
   * @param {Object[]} submissions
   * @param {string} studentId - partial or full student ID (case-insensitive)
   * @returns {Object[]}
   */
  filter(submissions, studentId) {
    if (!studentId) return submissions;
    const q = studentId.toUpperCase();
    return submissions.filter(s =>
      s.studentId && s.studentId.toUpperCase().includes(q)
    );
  }
}

// ── Concrete Strategy 5: DateFilter ──────────────────────────────
class DateFilter extends IFilterStrategy {
  /**
   * @param {Object[]} submissions
   * @param {{ from: Date, to: Date }} range
   * @returns {Object[]}
   */
  filter(submissions, range) {
    if (!range || !range.from) return submissions;
    return submissions.filter(s => {
      const ts = new Date(s.timestamp || s.submittedAt);
      if (isNaN(ts)) return false;
      if (range.from && ts < range.from) return false;
      if (range.to   && ts > range.to)   return false;
      return true;
    });
  }
}

// ── Context ───────────────────────────────────────────────────────
class FilterContext {
  constructor() {
    /** @type {IFilterStrategy} */
    this._strategy = new AllFilter();
    this._strategyName = 'All';
  }

  /**
   * Swap the active strategy at runtime.
   * @param {IFilterStrategy} strategy
   * @param {string} name
   */
  setStrategy(strategy, name = 'Custom') {
    if (!(strategy instanceof IFilterStrategy)) {
      throw new TypeError('[FilterContext] Strategy must extend IFilterStrategy.');
    }
    this._strategy = strategy;
    this._strategyName = name;
  }

  get strategyName() { return this._strategyName; }

  /**
   * Execute the active strategy.
   * @param {Object[]} submissions
   * @param {*} criterion
   * @returns {Object[]}
   */
  applyFilter(submissions, criterion) {
    return this._strategy.filter(submissions, criterion);
  }
}

module.exports = {
  IFilterStrategy,
  AllFilter,
  CourseFilter,
  StatusFilter,
  StudentFilter,
  DateFilter,
  FilterContext,
};
