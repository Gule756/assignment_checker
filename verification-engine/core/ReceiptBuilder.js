/**
 * ================================================================
 *  ReceiptBuilder — Builder Pattern Implementation
 * ================================================================
 *  Pattern  : BUILDER (Creational GoF Pattern)
 *  Intent   : Separate the construction of a complex object from
 *             its representation so that the same construction
 *             process can create different representations.
 *
 *  Participants (GoF roles):
 *    Builder         → ReceiptBuilder (this class)
 *    Product         → the plain receipt Object that is built
 *    Director        → ReceiptFactory (calls builder methods in order)
 *    Client          → SubmissionAPI (asks Factory to use the Builder)
 *
 *  How it applies here:
 *    A receipt has many fields (id, studentId, courseId, hash,
 *    status, timestamp, message). Instead of one giant constructor
 *    call, the Builder lets ReceiptFactory compose receipts step
 *    by step, keeping each receipt type's construction isolated
 *    and easy to extend.
 * ================================================================
 */
const crypto = require('crypto');

class ReceiptBuilder {
  constructor() {
    this.reset();
  }

  /**
   * Reset the builder so it is ready to construct a fresh receipt.
   * Called automatically after every build() to avoid stale state.
   * @returns {ReceiptBuilder} this (fluent interface)
   */
  reset() {
    /** @type {Object} The product under construction */
    this._product = {
      receiptId:      '',
      studentId:      '',
      courseId:       '',
      assignmentHash: '',
      status:         '',       // 'ON_TIME' | 'LATE' | 'REJECTED'
      timestamp:      '',
      message:        '',
      submittedAt:    new Date().toISOString(),
    };
    return this;
  }

  // ── Builder Step Methods (fluent / method-chaining API) ─────────

  /**
   * Generate a cryptographic receipt ID from the submission data.
   * Uses Node's built-in crypto module (SHA-256).
   *
   * @param {string} studentId
   * @param {string} courseId
   * @param {string} hash
   * @returns {ReceiptBuilder} this
   */
  generateReceiptId(studentId, courseId, hash) {
    const raw = `${studentId}::${courseId}::${hash}::${Date.now()}`;
    const digest = crypto
      .createHash('sha256')
      .update(raw)
      .digest('hex')
      .substring(0, 12)
      .toUpperCase();
    this._product.receiptId = `RCT-${digest}`;
    return this;
  }

  /**
   * @param {string} id
   * @returns {ReceiptBuilder}
   */
  setStudentId(id) {
    this._product.studentId = id;
    return this;
  }

  /**
   * @param {string} id
   * @returns {ReceiptBuilder}
   */
  setCourseId(id) {
    this._product.courseId = id;
    return this;
  }

  /**
   * @param {string} hash
   * @returns {ReceiptBuilder}
   */
  setAssignmentHash(hash) {
    this._product.assignmentHash = hash;
    return this;
  }

  /**
   * @param {string} status - 'ON_TIME' | 'LATE' | 'REJECTED'
   * @returns {ReceiptBuilder}
   */
  setStatus(status) {
    this._product.status = status;
    return this;
  }

  /**
   * @param {string} ts - ISO 8601 timestamp string
   * @returns {ReceiptBuilder}
   */
  setTimestamp(ts) {
    this._product.timestamp = ts;
    return this;
  }

  /**
   * @param {string} msg
   * @returns {ReceiptBuilder}
   */
  setMessage(msg) {
    this._product.message = msg;
    return this;
  }

  // ── Final Build Step ────────────────────────────────────────────

  /**
   * Finalise and return the constructed Receipt product.
   * Resets the builder afterwards so it can be reused immediately.
   *
   * @returns {Object} The fully built, immutable receipt snapshot
   */
  build() {
    const result = { ...this._product };   // shallow copy → immutable snapshot
    this.reset();                          // ready for the next build
    return result;
  }
}

module.exports = ReceiptBuilder;
