/**
 * SubmissionClient v2 — Facade Pattern (Browser JS)
 * Handles file-based assignment submissions with auth token.
 * Reads file as base64 using FileReader API and sends as JSON.
 */
class SubmissionClient {
  constructor(apiUrl, authClient) {
    this._apiUrl = apiUrl;
    this._auth   = authClient;
  }

  /**
   * Submit an assignment file to the engine.
   * @param {{ courseId, assignmentId, file: File, comment }} data
   * @returns {Promise<{success, receipt?, error?, offline?}>}
   */
  async submit(data) {
    const { courseId, assignmentId, file, comment } = data;
    if (!courseId || !assignmentId || !file) {
      return { success: false, error: 'Course, assignment, and a file are all required.' };
    }

    // Convert File to base64 using FileReader
    let base64Data;
    try {
      base64Data = await this._fileToBase64(file);
    } catch {
      return { success: false, error: 'Failed to read the file. Please try again.' };
    }

    const payload = {
      courseId,
      assignmentId,
      fileName: file.name,
      fileData: base64Data,
      comment:  comment || '',
    };

    try {
      const res  = await fetch(`${this._apiUrl}/submissions`, {
        method:  'POST',
        headers: this._auth.authHeader(),
        body:    JSON.stringify(payload),
      });
      const result = await res.json();
      if (result.receipt) {
        this._cacheReceipt(result.receipt);
      }
      return result;
    } catch {
      return { success: false, error: 'Cannot reach the engine. Check that it is running on port 3001.' };
    }
  }

  /**
   * Fetch this student's own submission history.
   * @returns {Promise<Object[]>}
   */
  async getMySubmissions() {
    try {
      const res  = await fetch(`${this._apiUrl}/submissions`, {
        headers: this._auth.authHeader(),
      });
      return await res.json();
    } catch { return []; }
  }

  /**
   * Load courses from the engine.
   * @returns {Promise<Object[]>}
   */
  async getCourses() {
    try {
      const res = await fetch(`${this._apiUrl}/courses`);
      return await res.json();
    } catch { return []; }
  }

  /**
   * Load assignments for a course.
   * @param {string} courseId
   * @returns {Promise<Object[]>}
   */
  async getAssignments(courseId) {
    try {
      const res = await fetch(`${this._apiUrl}/assignments?courseId=${encodeURIComponent(courseId)}`);
      return await res.json();
    } catch { return []; }
  }

  // ── Private ─────────────────────────────────────────────────────

  /** Convert a File object to a base64 data URL string. */
  _fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload  = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  _cacheReceipt(receipt) {
    try {
      const existing = JSON.parse(localStorage.getItem('dasrvg_receipts') || '[]');
      existing.push(receipt);
      localStorage.setItem('dasrvg_receipts', JSON.stringify(existing));
    } catch {}
  }
}
