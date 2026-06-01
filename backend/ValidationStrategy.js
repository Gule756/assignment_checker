/* Strategy pattern: this encapsulates each validation algorithm — URL check,
   hex-hash check, or any-reference check — into its own class so they can
   be swapped at runtime through ValidationContext.setStrategy(). The submission
   route never contains an if/else chain for validation; it just calls
   context.validate(ref) and the active strategy handles the logic. Adding
   a new file-reference type only requires a new class here with no changes
   to any other file. */

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

class ValidationContext {
  constructor(strategy = new AnyRefStrategy()) {
    this._strategy = strategy;
  }
  setStrategy(strategy) { this._strategy = strategy; }
  validate(ref)  { return this._strategy.validate(ref); }
  get strategyName() { return this._strategy.name; }
}

module.exports = { HashStrategy, UrlStrategy, AnyRefStrategy, ValidationContext };
