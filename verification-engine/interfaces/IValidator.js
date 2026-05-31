/**
 * ================================================================
 *  IValidator — Abstract Validator Interface
 * ================================================================
 *  Defines the CONTRACT that all concrete validator classes must
 *  honour. Used by the TEMPLATE METHOD pattern via BaseValidator.
 *
 *  GoF Reference: Structural contract for Template Method Pattern
 * ================================================================
 */
class IValidator {
  /**
   * @abstract
   * @param {Object} submission
   * @returns {{ valid: boolean, late?: boolean, reason?: string }}
   */
  validate(submission) {
    throw new Error(
      '[IValidator] validate() is abstract — must be implemented by every concrete subclass.'
    );
  }
}

module.exports = IValidator;
