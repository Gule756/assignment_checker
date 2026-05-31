/**
 * ================================================================
 *  SubmissionStore — Singleton Pattern Implementation
 * ================================================================
 *  Pattern  : SINGLETON (Creational GoF Pattern)
 *  Intent   : Ensure a class has only ONE instance and provide a
 *             global point of access to it.
 *
 *  Form used: Lazy Instantiation — instance is created only when
 *             first requested via getInstance().
 *
 *  Participants (GoF roles):
 *    Singleton → SubmissionStore (this class)
 *
 *  How it applies here:
 *    Every component of the engine (SubmissionAPI, engine.js)
 *    must share the SAME in-memory submission list. The Singleton
 *    guarantees that no matter how many times the class is
 *    imported or constructed, only one store ever exists.
 * ================================================================
 */
class SubmissionStore {
  constructor() {
    // ── Singleton guard ──────────────────────────────────────────
    // If an instance already exists, return it instead of creating
    // a new one. This is the core Singleton mechanism.
    if (SubmissionStore._instance) {
      return SubmissionStore._instance;
    }

    /** @type {Object[]} Internal list of all submission receipts */
    this._submissions = [];

    // Save the one and only instance
    SubmissionStore._instance = this;
    console.log('[SubmissionStore] Singleton instance CREATED — only one will ever exist.');
  }

  // ── Global Access Point ─────────────────────────────────────────
  /**
   * GoF: "Provide a global point of access to the instance."
   * All engine components call this instead of `new SubmissionStore()`.
   *
   * @returns {SubmissionStore} The single global instance
   */
  static getInstance() {
    if (!SubmissionStore._instance) {
      new SubmissionStore(); // triggers constructor which sets _instance
    }
    return SubmissionStore._instance;
  }

  // ── Public API ──────────────────────────────────────────────────

  /**
   * Bulk-load persisted submissions on engine startup.
   * Called once by engine.js after reading the JSON data file.
   * @param {Object[]} submissions
   */
  loadAll(submissions) {
    this._submissions = Array.isArray(submissions) ? submissions : [];
    console.log(`[SubmissionStore] Loaded ${this._submissions.length} persisted submission(s) from disk.`);
  }

  /**
   * Add a new validated receipt to the store.
   * @param {Object} receipt - A fully-built receipt object
   */
  add(receipt) {
    this._submissions.push(receipt);
    console.log(`[SubmissionStore] Stored receipt ${receipt.receiptId} | Total: ${this._submissions.length}`);
  }

  /**
   * Return a shallow copy of all stored submissions.
   * (Defensive copy — callers cannot mutate internal state.)
   * @returns {Object[]}
   */
  getAll() {
    return [...this._submissions];
  }

  /**
   * Find a single submission by its unique receipt ID.
   * @param {string} receiptId
   * @returns {Object|undefined}
   */
  findById(receiptId) {
    return this._submissions.find(s => s.receiptId === receiptId);
  }

  /**
   * Find all submissions belonging to a specific student.
   * @param {string} studentId
   * @returns {Object[]}
   */
  findByStudent(studentId) {
    return this._submissions.filter(s => s.studentId === studentId);
  }

  /**
   * Find all submissions for a specific course.
   * @param {string} courseId
   * @returns {Object[]}
   */
  findByCourse(courseId) {
    return this._submissions.filter(s => s.courseId === courseId);
  }

  /**
   * Total number of stored submissions.
   * @returns {number}
   */
  get count() {
    return this._submissions.length;
  }
}

// Static property — holds the ONE instance (null until first call)
SubmissionStore._instance = null;

module.exports = SubmissionStore;
