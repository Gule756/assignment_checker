/**
 * ================================================================
 *  DeadlineValidator — Concrete Template (Template Method Pattern)
 * ================================================================
 *  Pattern  : TEMPLATE METHOD — Concrete Class
 *  Extends  : BaseValidator (Abstract Class)
 *
 *  Responsibility:
 *    Checks whether a submission arrives before or after the
 *    registered deadline for the specified course.
 *
 *  Return contract:
 *    { valid: true,  late: false } — on time
 *    { valid: true,  late: true  } — past deadline (still accepted)
 *    Deadline validator never rejects — it only flags lateness.
 *    Rejection is handled upstream by HashFormatValidator.
 *
 *  Course Deadline Registry:
 *    Simulates a database of per-course deadlines. In a production
 *    system this would be fetched from an external data source.
 * ================================================================
 */
const BaseValidator = require('./BaseValidator');

// ── Simulated Course Deadline Registry ────────────────────────────
// Represents a data store of assignment deadlines per course.
// CS301 is intentionally set in the past to demo the LATE path.
const COURSE_DEADLINES = {
  'CS101':   new Date(Date.now() + 7  * 24 * 60 * 60 * 1000), // 7 days ahead
  'CS201':   new Date(Date.now() + 3  * 24 * 60 * 60 * 1000), // 3 days ahead
  'CS301':   new Date(Date.now() - 1  * 24 * 60 * 60 * 1000), // 1 day AGO → LATE
  'CS401':   new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days ahead
  'MATH101': new Date(Date.now() + 5  * 24 * 60 * 60 * 1000), // 5 days ahead
};

// Fallback for courses not in the registry
const DEFAULT_DEADLINE = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

class DeadlineValidator extends BaseValidator {

  /**
   * ABSTRACT STEP implementation — deadline comparison logic.
   *
   * @param {Object} submission - { courseId, ... }
   * @returns {{ valid: true, late: boolean, deadline: string, reason?: string }}
   */
  doValidate(submission) {
    const { courseId } = submission;
    const deadline = COURSE_DEADLINES[courseId] || DEFAULT_DEADLINE;
    const now = new Date();

    if (now > deadline) {
      return {
        valid:    true,
        late:     true,
        deadline: deadline.toISOString(),
        reason:   `Submitted after deadline (${deadline.toLocaleDateString()}).`,
      };
    }

    return {
      valid:    true,
      late:     false,
      deadline: deadline.toISOString(),
    };
  }
}

module.exports = DeadlineValidator;
