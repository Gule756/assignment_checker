/**
 * ================================================================
 *  HashValidationStrategy — Strategy Pattern (Browser JS)
 * ================================================================
 *  Pattern  : STRATEGY (Behavioral GoF Pattern)
 *  Intent   : Define a family of algorithms, encapsulate each one,
 *             and make them interchangeable. Strategy lets the
 *             algorithm vary independently from clients that use it.
 *
 *  Participants (GoF roles):
 *    Strategy         → HashValidationStrategy  (abstract base)
 *    ConcreteStrategy → HexHashStrategy         (hex format check)
 *    ConcreteStrategy → UrlReferenceStrategy    (URL format check)
 *    Context          → HashValidatorContext    (uses a strategy set)
 *
 *  How it applies here:
 *    The student portal validates the hash format client-side before
 *    sending it to the engine. Different strategies handle different
 *    reference formats. The Context tries each strategy and accepts
 *    if any passes — easy to add new formats without changing Context.
 *
 *  Note: This is plain (class-based) JavaScript for the browser.
 *        No import/export — classes are loaded as global <script> tags.
 * ================================================================
 */

// ── Strategy Interface (Abstract Base) ───────────────────────────
class HashValidationStrategy {
  /**
   * @abstract
   * @param {string} hash
   * @returns {{ valid: boolean, reason: string }}
   */
  validate(hash) {
    throw new Error('[HashValidationStrategy] validate() must be overridden by a concrete strategy.');
  }
}

// ── Concrete Strategy 1: Hex Hash ────────────────────────────────
/**
 * Validates that the input is a hexadecimal hash string.
 * Accepts: MD5 (32 chars), SHA-1 (40 chars), SHA-256 (64 chars),
 *          or any 8–128 hex character string.
 */
class HexHashStrategy extends HashValidationStrategy {
  validate(hash) {
    const pattern = /^[a-fA-F0-9]{8,128}$/;
    const valid   = pattern.test(hash);
    return {
      valid,
      reason: valid ? '' : 'Hash must be a hexadecimal string between 8 and 128 characters.',
    };
  }
}

// ── Concrete Strategy 2: URL Reference ───────────────────────────
/**
 * Validates that the input is a valid http/https URL reference.
 * Accepts: any URL beginning with http:// or https://
 */
class UrlReferenceStrategy extends HashValidationStrategy {
  validate(hash) {
    const pattern = /^https?:\/\/.{4,}/;
    const valid   = pattern.test(hash);
    return {
      valid,
      reason: valid ? '' : 'Reference must be a valid URL starting with http:// or https://',
    };
  }
}

// ── Context Class ────────────────────────────────────────────────
/**
 * Maintains a list of strategies and applies them in order.
 * Accepts the hash if ANY concrete strategy deems it valid.
 * New validation rules → just add a new ConcreteStrategy.
 */
class HashValidatorContext {
  constructor() {
    /** @type {HashValidationStrategy[]} */
    this._strategies = [
      new HexHashStrategy(),
      new UrlReferenceStrategy(),
    ];
  }

  /**
   * Run the hash through all registered strategies.
   * @param {string} hash
   * @returns {{ valid: boolean, reason: string }}
   */
  validate(hash) {
    if (!hash || hash.trim().length === 0) {
      return { valid: false, reason: 'Assignment hash / reference link cannot be empty.' };
    }

    const trimmed = hash.trim();

    // Try each strategy — accept if any passes
    for (const strategy of this._strategies) {
      const result = strategy.validate(trimmed);
      if (result.valid) {
        return { valid: true, reason: '' };
      }
    }

    // All strategies failed
    return {
      valid:  false,
      reason: 'Invalid format. Use a hex hash (8–128 chars, e.g. SHA-256) or a valid URL reference.',
    };
  }
}
