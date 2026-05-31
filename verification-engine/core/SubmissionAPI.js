/**
 * ================================================================
 *  SubmissionAPI — Facade Pattern Implementation
 * ================================================================
 *  Pattern  : FACADE (Structural GoF Pattern)
 *  Intent   : Provide a unified interface to a set of interfaces
 *             in a subsystem. Facade defines a higher-level
 *             interface that makes the subsystem easier to use.
 *
 *  Participants (GoF roles):
 *    Facade          → SubmissionAPI (this class)
 *    Subsystem classes:
 *      HashFormatValidator  (Template Method pattern)
 *      DeadlineValidator    (Template Method pattern)
 *      ReceiptBuilder       (Builder pattern)
 *      ReceiptFactory       (Factory Method pattern)
 *      SubmissionStore      (Singleton pattern)
 *      SubmissionRepository (Proxy pattern)
 *      EventBus             (Observer pattern)
 *
 *  How it applies here:
 *    The HTTP handler in engine.js only calls api.submit(data).
 *    It does not know about validators, builders, factories, stores,
 *    or the event bus. The Facade hides all that complexity behind
 *    three clean methods: submit(), getAllSubmissions(), getStats().
 * ================================================================
 */
const ReceiptFactory = require('./ReceiptFactory');

class SubmissionAPI {

  /**
   * @param {SubmissionStore}       store
   * @param {ReceiptBuilder}        builder
   * @param {HashFormatValidator}   hashValidator
   * @param {DeadlineValidator}     deadlineValidator
   * @param {EventBus}              eventBus
   * @param {SubmissionRepository}  repository
   */
  constructor(store, builder, hashValidator, deadlineValidator, eventBus, repository) {
    this._store            = store;
    this._builder          = builder;
    this._hashValidator    = hashValidator;
    this._deadlineValidator= deadlineValidator;
    this._eventBus         = eventBus;
    this._repository       = repository;
  }

  // ── Facade Methods ───────────────────────────────────────────────

  /**
   * FACADE METHOD: submit()
   * Orchestrates the full verification pipeline in one call.
   *
   * Internally it:
   *  1. Validates required fields
   *  2. Runs HashFormatValidator  (Template Method)
   *  3. Runs DeadlineValidator    (Template Method)
   *  4. Creates receipt via ReceiptFactory (Factory Method + Builder)
   *  5. Stores in SubmissionStore (Singleton)
   *  6. Persists via Repository
   *  7. Notifies observers via EventBus (Observer)
   *
   * @param {{ studentId: string, courseId: string, assignmentHash: string }} data
   * @returns {{ success: boolean, receipt: Object, error?: string }}
   */
  submit(data) {
    console.log(`\n[SubmissionAPI] ── Processing submission from: ${data.studentId} ──`);

    // ① Validate required fields
    if (!data.studentId || !data.courseId || !data.assignmentHash) {
      const receipt = ReceiptFactory.createRejectedReceipt(
        this._builder, data,
        'Missing required field(s): studentId, courseId, or assignmentHash.'
      );
      return { success: false, receipt, error: receipt.message };
    }

    // ② Hash format validation — uses Template Method pipeline
    const hashResult = this._hashValidator.validate(data);
    if (!hashResult.valid) {
      const receipt = ReceiptFactory.createRejectedReceipt(
        this._builder, data, hashResult.reason
      );
      return { success: false, receipt, error: hashResult.reason };
    }

    // ③ Deadline check — uses Template Method pipeline
    const deadlineResult = this._deadlineValidator.validate(data);

    // ④ Create the appropriate receipt via Factory Method
    const receipt = deadlineResult.late
      ? ReceiptFactory.createLateReceipt(this._builder, data)
      : ReceiptFactory.createOnTimeReceipt(this._builder, data);

    // ⑤ Store in the Singleton store
    this._store.add(receipt);

    // ⑥ Persist via Repository (Proxy pattern)
    this._repository.persist(this._store.getAll());

    // ⑦ Notify all registered observers via EventBus (Observer pattern)
    this._eventBus.publish('submission:registered', receipt);
    this._eventBus.publish('submission:count_changed', { count: this._store.count });

    console.log(`[SubmissionAPI] ── Receipt issued: ${receipt.receiptId} [${receipt.status}] ──\n`);
    return { success: true, receipt };
  }

  /**
   * FACADE METHOD: getAllSubmissions()
   * Returns all stored submission receipts.
   *
   * @returns {Object[]}
   */
  getAllSubmissions() {
    return this._store.getAll();
  }

  /**
   * FACADE METHOD: getSubmission()
   * Returns one submission by its receipt ID.
   *
   * @param {string} receiptId
   * @returns {Object|null}
   */
  getSubmission(receiptId) {
    return this._store.findById(receiptId) || null;
  }

  /**
   * FACADE METHOD: getStats()
   * Returns a summary count of all submission statuses.
   *
   * @returns {{ total: number, onTime: number, late: number, rejected: number }}
   */
  getStats() {
    const all = this._store.getAll();
    return {
      total:    all.length,
      onTime:   all.filter(s => s.status === 'ON_TIME').length,
      late:     all.filter(s => s.status === 'LATE').length,
      rejected: all.filter(s => s.status === 'REJECTED').length,
    };
  }
}

module.exports = SubmissionAPI;
