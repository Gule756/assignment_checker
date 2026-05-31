/**
 * ================================================================
 *  GradeBookClient — Data Access Component (Browser JS)
 * ================================================================
 *  Responsibility:
 *    Fetches submission data from the Verification Engine API
 *    and provides an offline fallback using localStorage cache.
 *
 *  Decoupling:
 *    app.js never calls fetch() directly. All HTTP communication
 *    is encapsulated here, so changing the API URL or switching to
 *    a different data source only affects this one class.
 * ================================================================
 */
class GradeBookClient {

  /**
   * @param {string} apiUrl - Base URL of the Verification Engine
   */
  constructor(apiUrl) {
    this._apiUrl      = apiUrl;
    this._submissions = [];
  }

  /**
   * Load all submission records from the engine.
   * Falls back to localStorage on network failure.
   *
   * @returns {Promise<{ success: boolean, data: Object[], offline?: boolean }>}
   */
  async loadSubmissions() {
    try {
      const res  = await fetch(`${this._apiUrl}/submissions`);
      const data = await res.json();

      if (!Array.isArray(data)) throw new Error('Unexpected response format');

      this._submissions = data;

      // Cache a copy for offline use
      localStorage.setItem('gb_submissions_cache', JSON.stringify(data));

      return { success: true, data };

    } catch (err) {
      console.warn('[GradeBookClient] Engine unreachable — using cached data.', err.message);

      const cached = JSON.parse(localStorage.getItem('gb_submissions_cache') || '[]');
      this._submissions = cached;
      return { success: false, data: cached, offline: true };
    }
  }

  /**
   * Load stats summary from the engine.
   * Derives stats locally on network failure.
   *
   * @returns {Promise<{ total, onTime, late, rejected }>}
   */
  async loadStats() {
    try {
      const res  = await fetch(`${this._apiUrl}/submissions/stats`);
      return await res.json();
    } catch {
      // Derive locally
      const all = this._submissions;
      return {
        total:    all.length,
        onTime:   all.filter(s => s.status === 'ON_TIME').length,
        late:     all.filter(s => s.status === 'LATE').length,
        rejected: all.filter(s => s.status === 'REJECTED').length,
      };
    }
  }

  /**
   * Return the last-loaded submission list.
   * @returns {Object[]}
   */
  getAll() {
    return this._submissions;
  }

  /**
   * Return all unique course IDs present in the data.
   * Used to populate the course filter dropdown dynamically.
   * @returns {string[]}
   */
  getUniqueCourses() {
    const set = new Set(this._submissions.map(s => s.courseId).filter(Boolean));
    return [...set].sort();
  }
}
