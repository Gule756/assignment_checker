/**
 * ================================================================
 *  IReceipt — Abstract Receipt Interface / Data Contract
 * ================================================================
 *  Defines the SHAPE every receipt object must conform to.
 *  Used by the FACTORY METHOD pattern (ReceiptFactory creates
 *  concrete receipt objects that satisfy this contract).
 *
 *  GoF Reference: Product interface in Factory Method Pattern
 * ================================================================
 */
class IReceipt {
  constructor() {
    if (new.target === IReceipt) {
      throw new Error('[IReceipt] Cannot instantiate abstract class directly.');
    }
  }
}

/**
 * Static schema — documents the required fields of every receipt.
 * Serves as a living data contract between all three subsystems.
 */
IReceipt.SCHEMA = {
  receiptId:      'string  — Unique cryptographic receipt identifier (e.g. RCT-A1B2C3)',
  studentId:      'string  — Student ID (e.g. STU-2024-001)',
  courseId:       'string  — Course code (e.g. CS301)',
  assignmentHash: 'string  — SHA-256/hex hash or a URL reference link',
  status:         'string  — ON_TIME | LATE | REJECTED',
  timestamp:      'string  — ISO 8601 timestamp of receipt issuance',
  message:        'string  — Human-readable status explanation',
  submittedAt:    'string  — ISO 8601 timestamp of original submission',
};

module.exports = IReceipt;
