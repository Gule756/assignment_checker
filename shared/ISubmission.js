/**
 * ================================================================
 *  ISubmission — Shared Data Contract (Integration Interface)
 * ================================================================
 *  This file is the SHARED CONTRACT between all three subsystems.
 *  It lives in the /shared/ layer so any subsystem can reference it.
 *
 *  In component-based development, this interface defines the
 *  data schema that crosses subsystem boundaries. The three
 *  subsystems are decoupled in code, but they agree on this schema.
 *
 *  GoF Reference: Acts as the "Product" interface referenced by
 *  Factory Method (ReceiptFactory) and Repository (SubmissionRepository)
 * ================================================================
 *
 *  SUBMISSION LIFECYCLE:
 *
 *   Student Portal          Verification Engine        Instructor GradeBook
 *   ──────────────          ───────────────────        ────────────────────
 *   Fills form          →   Receives POST /submit   →  Displays records
 *   Sends payload       →   Validates hash format   →  Filters by status
 *   Receives receipt    ←   Checks deadline         →  Exports CSV
 *                           Creates receipt         →  Reads submissions.json
 *                           Persists to JSON
 *
 * ================================================================
 */

/**
 * @typedef {Object} ISubmissionPayload
 * The object sent by the Student Portal to POST /submit
 *
 * @property {string} studentId      - Student identifier e.g. "STU-2024-001"
 * @property {string} courseId       - Course code       e.g. "CS401"
 * @property {string} assignmentHash - Hex hash or URL   e.g. "a3f1d2e4b9c7..."
 */

/**
 * @typedef {Object} IReceipt
 * The object stored in submissions.json and returned to clients.
 * This is the canonical data shape for all three subsystems.
 *
 * @property {string} receiptId      - "RCT-" + 12 hex chars (SHA-256 derived)
 * @property {string} studentId      - Mirrors payload.studentId
 * @property {string} courseId       - Mirrors payload.courseId
 * @property {string} assignmentHash - Mirrors payload.assignmentHash
 * @property {string} status         - "ON_TIME" | "LATE" | "REJECTED"
 * @property {string} timestamp      - ISO 8601 — when receipt was issued
 * @property {string} message        - Human-readable status explanation
 * @property {string} submittedAt    - ISO 8601 — when submission was received
 */

/**
 * @typedef {Object} ISubmissionAPIResponse
 * The HTTP response shape from POST /submit
 *
 * @property {boolean}   success - true if receipt was issued (ON_TIME or LATE)
 * @property {IReceipt}  receipt - the issued receipt object
 * @property {string}   [error]  - human-readable error message if success=false
 */

/**
 * @typedef {Object} IStatsResponse
 * The HTTP response shape from GET /submissions/stats
 *
 * @property {number} total    - Total receipts in store
 * @property {number} onTime   - Count with status ON_TIME
 * @property {number} late     - Count with status LATE
 * @property {number} rejected - Count with status REJECTED
 */

// Export schema documentation for Node.js consumers
if (typeof module !== 'undefined') {
  module.exports = {
    STATUS: {
      ON_TIME:  'ON_TIME',
      LATE:     'LATE',
      REJECTED: 'REJECTED',
    },
    RECEIPT_ID_PREFIX: 'RCT-',
    ENDPOINTS: {
      SUBMIT:      'POST /submit',
      LIST:        'GET  /submissions',
      STATS:       'GET  /submissions/stats',
      SINGLE:      'GET  /submissions/:receiptId',
      HEALTH:      'GET  /health',
    },
  };
}
