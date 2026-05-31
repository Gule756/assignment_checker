/**
 * ================================================================
 *  ValidationStrategy.js — Strategy Pattern
 * ================================================================
 *  Pattern : STRATEGY (Behavioral GoF)
 *  Intent  : Define a family of algorithms (validation rules),
 *            encapsulate each one, and make them interchangeable.
 *
 *  Strategies:
 *    HashStrategy   — validates a hex hash string
 *    UrlStrategy    — validates an http/https file URL
 *    AnyRefStrategy — accepts any non-empty reference
 * ================================================================
 */

class HashStrategy {
  validate(ref) {
    if (!ref) return { valid: false, reason: 'Hash is required.' };
    const hex = /^[a-fA-F0-9]{8,128}$/;
    if (!hex.test(ref.trim())) {
      return { valid: false, reason: 'Invalid hex hash (8-128 hex characters).' };
    }
    return { valid: true };
  }
  get name() { return 'Hash'; }
}

class UrlStrategy {
  validate(ref) {
    if (!ref) return { valid: false, reason: 'File URL is required.' };
    if (!/^https?:\/\/.{5,}/.test(ref.trim())) {
      return { valid: false, reason: 'Must be a valid http/https URL.' };
    }
    return { valid: true };
  }
  get name() { return 'URL'; }
}

class AnyRefStrategy {
  validate(ref) {
    if (!ref || ref.trim().length < 3) {
      return { valid: false, reason: 'Reference must be at least 3 characters.' };
    }
    return { valid: true };
  }
  get name() { return 'AnyRef'; }
}

/** Context: holds and applies the active strategy */
class ValidationContext {
  constructor(strategy = new AnyRefStrategy()) {
    this._strategy = strategy;
  }
  setStrategy(strategy) { this._strategy = strategy; }
  validate(ref) { return this._strategy.validate(ref); }
  get strategyName() { return this._strategy.name; }
}

module.exports = { HashStrategy, UrlStrategy, AnyRefStrategy, ValidationContext };
