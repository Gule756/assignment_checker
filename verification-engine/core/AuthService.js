/**
 * ================================================================
 *  AuthService — Singleton + Session Management
 * ================================================================
 *  Pattern  : SINGLETON (Creational) — same pattern as SubmissionStore,
 *             demonstrating reuse of the pattern for a different concern.
 *
 *  Intent   : Ensures one and only one session registry exists across
 *             the entire engine process lifetime. All route handlers
 *             call AuthService.getInstance() to validate tokens.
 *
 *  Responsibilities:
 *    - Hash passwords (SHA-256 via Node crypto)
 *    - Issue session tokens (crypto.randomBytes)
 *    - Validate tokens and return session data
 *    - Expire sessions after 8 hours
 *    - Seed default passwords on first load
 * ================================================================
 */
const crypto = require('crypto');

class AuthService {
  constructor() {
    if (AuthService._instance) {
      return AuthService._instance;
    }
    /** @type {Map<string, {userId, username, role, courses, name, expires}>} */
    this._sessions = new Map();
    this._SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours
    AuthService._instance = this;
    console.log('[AuthService] Singleton instance CREATED — session registry ready.');
  }

  static getInstance() {
    if (!AuthService._instance) new AuthService();
    return AuthService._instance;
  }

  // ── Password Utilities ───────────────────────────────────────────

  /**
   * Hash a plain-text password with SHA-256.
   * @param {string} password
   * @returns {string} hex hash
   */
  hashPassword(password) {
    return crypto.createHash('sha256').update(password).digest('hex');
  }

  /**
   * Check if a stored hash is a seed placeholder and hash it if so.
   * Seed format: "__SEED__<plaintext>"
   * @param {string} storedHash
   * @returns {{ needsUpdate: boolean, hash: string }}
   */
  processSeedHash(storedHash) {
    if (storedHash && storedHash.startsWith('__SEED__')) {
      const plain = storedHash.replace('__SEED__', '');
      return { needsUpdate: true, hash: this.hashPassword(plain) };
    }
    return { needsUpdate: false, hash: storedHash };
  }

  /**
   * Verify a plain-text password against a stored hash.
   * @param {string} plain
   * @param {string} hash
   * @returns {boolean}
   */
  verifyPassword(plain, hash) {
    return this.hashPassword(plain) === hash;
  }

  // ── Session Management ───────────────────────────────────────────

  /**
   * Create a new session for an authenticated user.
   * @param {{ id, username, role, courses, name }} user
   * @returns {string} session token
   */
  createSession(user) {
    // Clean up any existing sessions for this user
    for (const [token, session] of this._sessions.entries()) {
      if (session.userId === user.id) {
        this._sessions.delete(token);
      }
    }
    const token = crypto.randomBytes(32).toString('hex');
    this._sessions.set(token, {
      userId:   user.id,
      username: user.username,
      role:     user.role,
      courses:  user.courses || [],
      name:     user.name,
      expires:  Date.now() + this._SESSION_TTL_MS,
    });
    console.log(`[AuthService] Session created for ${user.username} (${user.role})`);
    return token;
  }

  /**
   * Validate a session token and return its payload.
   * @param {string} token
   * @returns {{ userId, username, role, courses, name } | null}
   */
  validateToken(token) {
    if (!token) return null;
    const session = this._sessions.get(token);
    if (!session) return null;
    if (Date.now() > session.expires) {
      this._sessions.delete(token);
      return null;
    }
    return session;
  }

  /**
   * Destroy a session (logout).
   * @param {string} token
   */
  destroySession(token) {
    if (this._sessions.has(token)) {
      const s = this._sessions.get(token);
      console.log(`[AuthService] Session destroyed for ${s.username}`);
      this._sessions.delete(token);
    }
  }

  /**
   * Extract the Bearer token from an Authorization header.
   * @param {string|undefined} authHeader
   * @returns {string|null}
   */
  extractToken(authHeader) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
    return authHeader.replace('Bearer ', '').trim();
  }

  /** @returns {number} active session count */
  get activeSessions() {
    return this._sessions.size;
  }
}

module.exports = AuthService;
