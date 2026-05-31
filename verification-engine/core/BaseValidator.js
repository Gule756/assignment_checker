/**
 * ================================================================
 *  BaseValidator — Template Method Pattern Implementation
 * ================================================================
 *  Pattern  : TEMPLATE METHOD (Behavioral GoF Pattern)
 *  Intent   : Define the SKELETON of an algorithm in a superclass,
 *             deferring some steps to subclasses. Template Method
 *             lets subclasses redefine certain steps of an algorithm
 *             without changing the algorithm's overall structure.
 *
 *  Participants (GoF roles):
 *    AbstractClass  → BaseValidator (this class)
 *    ConcreteClass  → HashFormatValidator, DeadlineValidator
 *
 *  Algorithm skeleton (the template method is validate()):
 *    Step 1 → preValidate()  — HOOK  (empty, optional override)
 *    Step 2 → doValidate()   — ABSTRACT (MUST be overridden)
 *    Step 3 → postValidate() — HOOK  (empty, optional override)
 *
 *  How it applies here:
 *    All validators share the same pipeline (log → validate → log).
 *    Each concrete validator only implements doValidate() with its
 *    specific algorithm, keeping the outer structure identical.
 * ================================================================
 */
const IValidator = require('../interfaces/IValidator');

class BaseValidator extends IValidator {

  /**
   * TEMPLATE METHOD — the invariant algorithm skeleton.
   * Subclasses MUST NOT override this method.
   *
   * @param {Object} submission - The submission data to validate
   * @returns {{ valid: boolean, late?: boolean, reason?: string }}
   */
  validate(submission) {
    console.log(`[${this.constructor.name}] ▶ Starting validation pipeline...`);

    // Step 1: HOOK — optional pre-processing (default: no-op)
    this.preValidate(submission);

    // Step 2: ABSTRACT STEP — concrete algorithm (subclass fills this in)
    const result = this.doValidate(submission);

    // Step 3: HOOK — optional post-processing (default: no-op)
    this.postValidate(submission, result);

    const status = result.valid ? '✔ PASS' : '✘ FAIL';
    console.log(`[${this.constructor.name}] ◀ ${status}${result.reason ? ' — ' + result.reason : ''}`);

    return result;
  }

  // ── Hook Methods ────────────────────────────────────────────────
  // GoF: "hook methods … have empty bodies in the superclass.
  //  Subclasses can (but are not required to) customize the operation
  //  by overriding the hook methods."

  /**
   * HOOK — called before the main validation logic.
   * Override in subclasses to sanitise or log input.
   * @param {Object} submission
   */
  preValidate(submission) {
    // intentionally empty — hook method
  }

  /**
   * HOOK — called after the main validation logic.
   * Override in subclasses for cleanup, metrics, or warnings.
   * @param {Object} submission
   * @param {Object} result
   */
  postValidate(submission, result) {
    // intentionally empty — hook method
  }

  // ── Abstract Step ───────────────────────────────────────────────

  /**
   * ABSTRACT STEP — MUST be overridden by every concrete subclass.
   * This is where each validator's specific algorithm lives.
   *
   * @abstract
   * @param {Object} submission
   * @returns {{ valid: boolean, late?: boolean, reason?: string }}
   */
  doValidate(submission) {
    throw new Error(
      `[BaseValidator] doValidate() is abstract — ${this.constructor.name} must implement it.`
    );
  }
}

module.exports = BaseValidator;
