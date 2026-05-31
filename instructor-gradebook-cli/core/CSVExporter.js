/**
 * ================================================================
 *  CSVExporter — Export submissions to a CSV file
 * ================================================================
 *  Responsibility:
 *    Serialises the current submission list to a comma-separated
 *    values file and writes it to disk using Node.js built-in `fs`.
 *
 *  Design Note:
 *    This is the CLI counterpart of ExportManager.js in the browser
 *    gradebook. The browser triggers a download; the CLI writes to
 *    a local file path. Same intent — different platform output.
 * ================================================================
 */
const fs   = require('fs');
const path = require('path');

class CSVExporter {

  /**
   * Export a list of submissions to a CSV file.
   *
   * @param {Object[]} submissions  - Array of receipt objects
   * @param {string}   outputPath  - Destination file path
   * @returns {{ success: boolean, filePath: string, rowCount: number }}
   */
  export(submissions, outputPath) {
    if (!submissions || submissions.length === 0) {
      return { success: false, filePath: '', rowCount: 0, reason: 'No submissions to export.' };
    }

    const absPath = path.resolve(outputPath);

    // CSV header
    const header = [
      'Receipt ID',
      'Student ID',
      'Course ID',
      'Status',
      'Timestamp',
      'Submitted At',
      'Assignment Hash',
      'Message',
    ].join(',');

    // CSV rows
    const rows = submissions.map(s => [
      this._escape(s.receiptId    || ''),
      this._escape(s.studentId    || ''),
      this._escape(s.courseId     || ''),
      this._escape(s.status       || ''),
      this._escape(s.timestamp    || ''),
      this._escape(s.submittedAt  || ''),
      this._escape(s.assignmentHash || ''),
      this._escape(s.message      || ''),
    ].join(','));

    const csv = [header, ...rows].join('\r\n');

    fs.writeFileSync(absPath, csv, 'utf8');

    return {
      success:  true,
      filePath: absPath,
      rowCount: submissions.length,
    };
  }

  /**
   * Wrap a CSV field value in quotes if it contains commas, quotes,
   * or newlines. Escapes internal double-quotes by doubling them.
   * @param {string} value
   * @returns {string}
   */
  _escape(value) {
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
  }
}

module.exports = CSVExporter;
