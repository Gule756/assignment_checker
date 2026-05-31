/**
 * ================================================================
 *  ExportManager — CSV Export Component (Browser JS)
 * ================================================================
 *  Responsibility:
 *    Converts the current filtered submission list into a CSV file
 *    and triggers a browser download — no server required.
 *
 *  Extensibility note:
 *    New export formats (JSON, PDF) would each be a new method here,
 *    demonstrating the Open/Closed Principle alongside the Strategy
 *    pattern if format selection were needed at runtime.
 * ================================================================
 */
class ExportManager {

  /**
   * Export submissions as a downloadable CSV file.
   *
   * @param {Object[]} submissions - The list to export (may be filtered)
   * @param {string}   filename    - Output file name (default: timestamped)
   */
  exportCSV(submissions, filename) {
    if (!submissions || submissions.length === 0) {
      alert('No submissions to export. Adjust your filters and try again.');
      return;
    }

    const defaultName = `submissions_${new Date().toISOString().substring(0,10)}.csv`;
    const outFile     = filename || defaultName;

    const headers = [
      'Receipt ID',
      'Student ID',
      'Course ID',
      'Assignment Hash',
      'Status',
      'Submitted At',
      'Message',
    ];

    const rows = submissions.map(s => [
      this._csvCell(s.receiptId),
      this._csvCell(s.studentId),
      this._csvCell(s.courseId),
      this._csvCell(s.assignmentHash),
      this._csvCell(s.status),
      this._csvCell(new Date(s.timestamp).toLocaleString()),
      this._csvCell(s.message),
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(',')),
    ].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);

    const anchor    = document.createElement('a');
    anchor.href     = url;
    anchor.download = outFile;
    anchor.style.display = 'none';
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);

    console.log(`[ExportManager] Exported ${submissions.length} record(s) → ${outFile}`);
  }

  /**
   * Safely wrap a value for CSV — escapes quotes and wraps in quotes.
   * @private
   * @param {*} value
   * @returns {string}
   */
  _csvCell(value) {
    const str = String(value || '').replace(/"/g, '""');
    return `"${str}"`;
  }
}
