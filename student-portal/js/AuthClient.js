/**
 * AuthClient — Authentication component (Browser JS)
 * Handles login, logout, token storage and session restoration.
 */
class AuthClient {
  constructor(apiUrl) {
    this._apiUrl = apiUrl;
    this._TOKEN_KEY = 'dasrvg_token';
    this._USER_KEY  = 'dasrvg_user';
  }

  /** @returns {string|null} stored token */
  getToken() { return localStorage.getItem(this._TOKEN_KEY); }

  /** @returns {Object|null} stored user object */
  getUser()  {
    try { return JSON.parse(localStorage.getItem(this._USER_KEY)); }
    catch { return null; }
  }

  /** @returns {boolean} */
  isLoggedIn() { return !!this.getToken(); }

  /**
   * Log in and store the session token.
   * @param {string} username
   * @param {string} password
   * @returns {Promise<{success, user?, error?}>}
   */
  async login(username, password) {
    try {
      const res  = await fetch(`${this._apiUrl}/auth/login`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (data.success) {
        localStorage.setItem(this._TOKEN_KEY, data.token);
        localStorage.setItem(this._USER_KEY,  JSON.stringify(data.user));
        return { success: true, user: data.user };
      }
      return { success: false, error: data.error || 'Login failed.' };
    } catch {
      return { success: false, error: 'Cannot connect to engine. Make sure it is running.' };
    }
  }

  /** Log out and clear stored session. */
  async logout() {
    const token = this.getToken();
    if (token) {
      try {
        await fetch(`${this._apiUrl}/auth/logout`, {
          method: 'POST', headers: { 'Authorization': `Bearer ${token}` },
        });
      } catch {}
    }
    localStorage.removeItem(this._TOKEN_KEY);
    localStorage.removeItem(this._USER_KEY);
  }

  /** @returns {Object} Authorization header */
  authHeader() {
    return { 'Authorization': `Bearer ${this.getToken()}`, 'Content-Type': 'application/json' };
  }
}
