/**
 * ================================================================
 *  ReceiptFactory — Factory Method Pattern Implementation
 * ================================================================
 *  Pattern  : FACTORY METHOD (Creational GoF Pattern)
 *  Intent   : Define an interface for creating an object, but let
 *             subclasses (or factory methods) decide which class
 *             to instantiate.
 *
 *  Participants (GoF roles):
 *    Creator         → ReceiptFactory (this class — static methods)
 *    Product         → receipt Object (built by ReceiptBuilder)
 *    ConcreteProduct → OnTimeReceipt, LateReceipt, RejectedReceipt
 *
 *  How it applies here:
 *    SubmissionAPI does NOT construct receipts directly. It tells
 *    ReceiptFactory which type is needed (OnTime / Late / Rejected)
 *    and the factory takes over — using the Builder to assemble
 *    the correct receipt. Adding a new receipt type only means
 *    adding one new static factory method here.
 * ================================================================
 */
class ReceiptFactory {

  /**
   * Factory Method: Create an ON_TIME receipt.
   * Chosen when submission arrives before the course deadline.
   *
   * @param {ReceiptBuilder} builder
   * @param {{ studentId: string, courseId: string, assignmentHash: string }} data
   * @returns {Object} Built receipt
   */
  static createOnTimeReceipt(builder, data) {
    return builder
      .reset()
      .generateReceiptId(data.studentId, data.courseId, data.assignmentHash)
      .setStudentId(data.studentId)
      .setCourseId(data.courseId)
      .setAssignmentHash(data.assignmentHash)
      .setStatus('ON_TIME')
      .setTimestamp(new Date().toISOString())
      .setMessage('Assignment received ON TIME. An official digital receipt has been issued.')
      .build();
  }

  /**
   * Factory Method: Create a LATE receipt.
   * Chosen when submission arrives AFTER the course deadline.
   * Submission is still accepted but flagged.
   *
   * @param {ReceiptBuilder} builder
   * @param {{ studentId: string, courseId: string, assignmentHash: string }} data
   * @returns {Object} Built receipt
   */
  static createLateReceipt(builder, data) {
    return builder
      .reset()
      .generateReceiptId(data.studentId, data.courseId, data.assignmentHash)
      .setStudentId(data.studentId)
      .setCourseId(data.courseId)
      .setAssignmentHash(data.assignmentHash)
      .setStatus('LATE')
      .setTimestamp(new Date().toISOString())
      .setMessage('Assignment received AFTER the deadline. Receipt issued with LATE status. Consult your instructor.')
      .build();
  }

  /**
   * Factory Method: Create a REJECTED receipt.
   * Chosen when validation fails (bad hash format, missing fields, etc.)
   *
   * @param {ReceiptBuilder} builder
   * @param {{ studentId?: string, courseId?: string, assignmentHash?: string }} data
   * @param {string} reason - Human-readable rejection reason
   * @returns {Object} Built receipt
   */
  static createRejectedReceipt(builder, data, reason) {
    return builder
      .reset()
      .generateReceiptId(
        data.studentId      || 'UNKNOWN',
        data.courseId       || 'UNKNOWN',
        data.assignmentHash || 'INVALID'
      )
      .setStudentId(data.studentId           || 'UNKNOWN')
      .setCourseId(data.courseId             || 'UNKNOWN')
      .setAssignmentHash(data.assignmentHash || 'N/A')
      .setStatus('REJECTED')
      .setTimestamp(new Date().toISOString())
      .setMessage(`Submission REJECTED — ${reason}`)
      .build();
  }
}

module.exports = ReceiptFactory;
