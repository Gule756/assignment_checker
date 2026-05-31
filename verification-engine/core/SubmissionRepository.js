/**
 * ================================================================
 *  SubmissionRepository — Repository / Proxy Pattern
 * ================================================================
 *  Pattern  : Closest GoF equivalent is PROXY (Structural)
 *             specifically a "Virtual Proxy" — it stands in for
 *             the underlying file-system data store and controls
 *             access to it, adding error-handling and lazy init.
 *
 *  Intent   : Provide a surrogate that controls access to the real
 *             data store. Business logic talks to the Repository;
 *             it never touches the file-system directly.
 *
 *  Participants (GoF Proxy roles):
 *    Subject     → IDataStore (conceptual interface)
 *    Proxy       → SubmissionRepository (this class)
 *    RealSubject → Node.js fs module + submissions.json file
 *
 *  How it applies here:
 *    SubmissionAPI calls repository.persist() and repository.loadAll()
 *    without knowing whether data is on disk, in a DB, or in memory.
 *    Swapping storage (e.g. to SQLite) only means replacing this file.
 * ================================================================
 */
const fs   = require('fs');
const path = require('path');

class SubmissionRepository {

  /**
   * @param {string} filePath - Absolute path to the JSON data file
   */
  constructor(filePath) {
    this._filePath = filePath;
    this._ensureFile();
  }

  // ── Private ─────────────────────────────────────────────────────

  /**
   * Ensure the data directory and file exist before any operation.
   * (Lazy initialisation — part of the Proxy pattern's role.)
   */
  _ensureFile() {
    const dir = path.dirname(this._filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`[SubmissionRepository] Created directory: ${dir}`);
    }
    if (!fs.existsSync(this._filePath)) {
      fs.writeFileSync(this._filePath, JSON.stringify([], null, 2), 'utf8');
      console.log(`[SubmissionRepository] Initialised data file: ${this._filePath}`);
    }
  }

  // ── Public API ──────────────────────────────────────────────────

  /**
   * Load all submissions from the persistent JSON store.
   * Called once on engine startup to warm the SubmissionStore.
   *
   * @returns {Object[]} Array of stored receipt objects (may be empty)
   */
  loadAll() {
    try {
      const raw = fs.readFileSync(this._filePath, 'utf8');
      const data = JSON.parse(raw);
      return Array.isArray(data) ? data : [];
    } catch (err) {
      console.error(`[SubmissionRepository] Failed to load: ${err.message}`);
      return [];
    }
  }

  /**
   * Persist the full submission list to the JSON store.
   * Called every time a new receipt is added to SubmissionStore.
   *
   * @param {Object[]} submissions - The current list from SubmissionStore
   */
  persist(submissions) {
    try {
      fs.writeFileSync(
        this._filePath,
        JSON.stringify(submissions, null, 2),
        'utf8'
      );
      console.log(`[SubmissionRepository] Persisted ${submissions.length} record(s) to disk.`);
    } catch (err) {
      console.error(`[SubmissionRepository] Failed to persist: ${err.message}`);
    }
  }
}

module.exports = SubmissionRepository;
