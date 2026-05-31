/**
 * ================================================================
 *  FilterStrategy — Strategy Pattern (Browser JS)
 * ================================================================
 *  Pattern  : STRATEGY (Behavioral GoF Pattern)
 *             Same pattern reused in a different context — the
 *             instructor gradebook's filtering system.
 *
 *  Participants (GoF roles):
 *    Strategy         → FilterStrategy         (abstract base)
 *    ConcreteStrategy → CourseFilterStrategy   (filter by course)
 *    ConcreteStrategy → StatusFilterStrategy   (filter by status)
 *    ConcreteStrategy → SearchFilterStrategy   (filter by keyword)
 *    Context          → FilterManager          (composes strategies)
 *
 *  How it applies here:
 *    FilterManager holds an array of active strategies. When the
 *    instructor changes a filter dropdown, a new ConcreteStrategy
 *    is created and injected. Adding a "date range" filter only
 *    requires one new ConcreteStrategy — no changes to FilterManager.
 *
 *  This demonstrates the power of the Strategy pattern: the same
 *  pattern solves two different problems across two subsystems.
 * ================================================================
 */

// ── Strategy Interface ────────────────────────────────────────────
class FilterStrategy {
  /**
   * @abstract
   * @param {Object[]} submissions
   * @returns {Object[]} filtered subset
   */
  filter(submissions) {
    throw new Error('[FilterStrategy] filter() must be overridden by a ConcreteStrategy.');
  }
}

// ── Concrete Strategy 1: Course Filter ───────────────────────────
class CourseFilterStrategy extends FilterStrategy {
  /**
   * @param {string} courseId - 'ALL' to disable filtering
   */
  constructor(courseId) {
    super();
    this._courseId = courseId;
  }
  filter(submissions) {
    if (!this._courseId || this._courseId === 'ALL') return submissions;
    return submissions.filter(s => s.courseId === this._courseId);
  }
}

// ── Concrete Strategy 2: Status Filter ───────────────────────────
class StatusFilterStrategy extends FilterStrategy {
  /**
   * @param {string} status - 'ALL' | 'ON_TIME' | 'LATE' | 'REJECTED'
   */
  constructor(status) {
    super();
    this._status = status;
  }
  filter(submissions) {
    if (!this._status || this._status === 'ALL') return submissions;
    return submissions.filter(s => s.status === this._status);
  }
}

// ── Concrete Strategy 3: Keyword Search ──────────────────────────
class SearchFilterStrategy extends FilterStrategy {
  /**
   * @param {string} query - free-text search across key fields
   */
  constructor(query) {
    super();
    this._query = (query || '').toLowerCase().trim();
  }
  filter(submissions) {
    if (!this._query) return submissions;
    return submissions.filter(s =>
      (s.studentId      || '').toLowerCase().includes(this._query) ||
      (s.courseId       || '').toLowerCase().includes(this._query) ||
      (s.receiptId      || '').toLowerCase().includes(this._query) ||
      (s.assignmentHash || '').toLowerCase().includes(this._query)
    );
  }
}

// ── Context Class ─────────────────────────────────────────────────
/**
 * Composes multiple FilterStrategies and applies them in sequence.
 * Each strategy narrows the result set from the previous one
 * (logical AND combination).
 */
class FilterManager {
  constructor() {
    /** @type {FilterStrategy[]} */
    this._strategies = [];
  }

  /**
   * Replace the active strategy set.
   * @param {FilterStrategy[]} strategies
   */
  setStrategies(strategies) {
    this._strategies = strategies;
  }

  /**
   * Apply all strategies to the full submission list.
   * @param {Object[]} submissions
   * @returns {Object[]}
   */
  apply(submissions) {
    let result = [...submissions];
    for (const strategy of this._strategies) {
      result = strategy.filter(result);
    }
    return result;
  }
}
