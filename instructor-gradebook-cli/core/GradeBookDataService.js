/**
 * ================================================================
 *  GradeBookDataService — Engine API Client
 * ================================================================
 *  Responsibility:
 *    Fetches submission data from the Verification Engine REST API
 *    (Subsystem 2) over HTTP, using Node.js built-in `http` module.
 *    Falls back to reading shared/data/submissions.json directly
 *    if the engine is offline.
 *
 *  Integration boundary:
 *    This is the ONLY file in Subsystem 3 that knows about the
 *    engine's URL. Swapping from REST to GraphQL or gRPC would
 *    only change this one class.
 * ================================================================
 */
const http = require('http');
const fs   = require('fs');
const path = require('path');

// Shared JSON fallback path (relative to this file)
const SHARED_JSON = path.join(__dirname, '..', '..', 'shared', 'data', 'submissions.json');
const ENGINE_HOST = 'localhost';
const ENGINE_PORT = 3001;

class GradeBookDataService {

  /**
   * Fetch all submissions from the engine, or fall back to file.
   * @returns {Promise<{ submissions: Object[], source: string }>}
   */
  fetchAll() {
    return new Promise((resolve) => {
      const options = {
        hostname: ENGINE_HOST,
        port:     ENGINE_PORT,
        path:     '/submissions',
        method:   'GET',
        timeout:  3000,
      };

      const req = http.request(options, (res) => {
        let body = '';
        res.on('data', chunk => { body += chunk; });
        res.on('end', () => {
          try {
            const parsed = JSON.parse(body);
            const subs = parsed.submissions || parsed;
            resolve({ submissions: Array.isArray(subs) ? subs : [], source: 'engine' });
          } catch {
            resolve({ submissions: [], source: 'engine-parse-error' });
          }
        });
      });

      req.on('error', () => {
        // Engine offline — fall back to shared JSON
        resolve(this._readFromFile());
      });

      req.on('timeout', () => {
        req.destroy();
        resolve(this._readFromFile());
      });

      req.end();
    });
  }

  /**
   * Fetch a single submission by receipt ID.
   * @param {string} receiptId
   * @returns {Promise<Object|null>}
   */
  async fetchById(receiptId) {
    const { submissions } = await this.fetchAll();
    return submissions.find(s => s.receiptId === receiptId) || null;
  }

  /**
   * Check if the verification engine is online.
   * @returns {Promise<boolean>}
   */
  isEngineOnline() {
    return new Promise((resolve) => {
      const options = {
        hostname: ENGINE_HOST,
        port:     ENGINE_PORT,
        path:     '/health',
        method:   'GET',
        timeout:  2000,
      };

      const req = http.request(options, (res) => {
        resolve(res.statusCode === 200);
      });

      req.on('error', () => resolve(false));
      req.on('timeout', () => { req.destroy(); resolve(false); });
      req.end();
    });
  }

  // ── Private ────────────────────────────────────────────────────

  _readFromFile() {
    try {
      const raw  = fs.readFileSync(SHARED_JSON, 'utf8');
      const data = JSON.parse(raw);
      const subs = Array.isArray(data) ? data : (data.submissions || []);
      return { submissions: subs, source: 'file-fallback' };
    } catch {
      return { submissions: [], source: 'no-data' };
    }
  }
}

module.exports = GradeBookDataService;
