/**
 * ================================================================
 *  HashFormatValidator — Concrete Template (Template Method Pattern)
 * ================================================================
 *  Pattern  : TEMPLATE METHOD — Concrete Class
 *  Extends  : BaseValidator (Abstract Class)
 *
 *  Responsibility:
 *    Validates that the submitted assignment hash/reference is in
 *    a recognised format before a receipt can be issued.
 *
 *  Accepted formats:
 *    • Hex hash strings  — MD5 (32), SHA-1 (40), SHA-256 (64), etc.
 *                          Minimum 8 characters, maximum 128.
 *    • URL references    — http:// or https:// links to hosted files.
 *
 *  Overrides:
 *    preValidate()  — trims whitespace from the hash field
 *    doValidate()   — the concrete hash-checking algorithm
 *    postValidate() — warns to console if rejected
 * ================================================================
 */
const BaseValidator = require('./BaseValidator');

class HashFormatValidator extends BaseValidator {

  /**
   * HOOK override — sanitise the hash input before checking it.
   * @param {Object} submission
   */
  preValidate(submission) {
    if (typeof submission.assignmentHash === 'string') {
      submission.assignmentHash = submission.assignmentHash.trim();
    }
  }

  /**
   * ABSTRACT STEP implementation — the actual format-checking logic.
   *
   * Accepts:
   *   1. Hex strings:  /^[a-fA-F0-9]{8,128}$/
   *   2. URL refs:     /^https?:\/\/.+/
   *
   * @param {Object} submission - { assignmentHash, ... }
   * @returns {{ valid: boolean, reason?: string }}
   */
  doValidate(submission) {
    const { assignmentHash } = submission;

    if (!assignmentHash || assignmentHash.length === 0) {
      return { valid: false, reason: 'Assignment hash / reference link is required.' };
    }

    const hexPattern = /^[a-fA-F0-9]{8,128}$/;
    const urlPattern = /^https?:\/\/.{4,}/;

    if (hexPattern.test(assignmentHash)) {
      return { valid: true };
    }

    if (urlPattern.test(assignmentHash)) {
      return { valid: true };
    }

    return {
      valid: false,
      reason: `Invalid format. Provide a hex hash (8–128 hex chars) or a valid URL (http/https).`,
    };
  }

  /**
   * HOOK override — log a warning when a hash is rejected.
   * @param {Object} submission
   * @param {Object} result
   */
  postValidate(submission, result) {
    if (!result.valid) {
      console.warn(
        `[HashFormatValidator] Rejected value: "${submission.assignmentHash}" — ${result.reason}`
      );
    }
  }
}

module.exports = HashFormatValidator;
