/**
 * ================================================================
 *  TableRenderer — CLI ASCII Table Renderer
 * ================================================================
 *  Responsibility:
 *    Renders submission data as formatted ASCII box-drawing tables
 *    directly to the terminal using ANSI colour codes and Unicode
 *    box-drawing characters — no external dependencies needed.
 *
 *  Design Note:
 *    This is the CLI equivalent of SubmissionRenderer.js in the
 *    browser gradebook. Same responsibility, different platform.
 *    This demonstrates platform-independent component design.
 * ================================================================
 */

// ── ANSI colour helpers (built-in Node.js, no package needed) ─────
const C = {
  reset:   '\x1b[0m',
  bold:    '\x1b[1m',
  dim:     '\x1b[2m',
  cyan:    '\x1b[36m',
  green:   '\x1b[32m',
  yellow:  '\x1b[33m',
  red:     '\x1b[31m',
  blue:    '\x1b[34m',
  magenta: '\x1b[35m',
  white:   '\x1b[37m',
  bgBlue:  '\x1b[44m',
  bgGreen: '\x1b[42m',
};

class TableRenderer {

  /**
   * Render the full submission table to stdout.
   * @param {Object[]} submissions
   * @param {string}   filterLabel  - active filter description
   */
  renderTable(submissions, filterLabel = 'All Submissions') {
    if (submissions.length === 0) {
      this._renderEmpty(filterLabel);
      return;
    }

    // Column widths
    const cols = {
      num:    4,
      receipt: 18,
      student: 14,
      course:  8,
      status:  10,
      time:    22,
    };

    const W = Object.values(cols).reduce((a, b) => a + b, 0) + (Object.keys(cols).length + 1) * 3 - 2;

    this._hr('┌', '┐', '─', W);
    this._cell(`  ${C.bold}${C.cyan}INSTRUCTOR GRADE-BOOK DESK${C.reset}  Filter: ${C.yellow}${filterLabel}${C.reset}`, W, true);
    this._hr('├', '┤', '─', W);

    // Header row
    process.stdout.write('│ ');
    process.stdout.write(C.bold + '#'.padEnd(cols.num) + C.reset + ' │ ');
    process.stdout.write(C.bold + 'Receipt ID'.padEnd(cols.receipt) + C.reset + ' │ ');
    process.stdout.write(C.bold + 'Student ID'.padEnd(cols.student) + C.reset + ' │ ');
    process.stdout.write(C.bold + 'Course'.padEnd(cols.course) + C.reset + ' │ ');
    process.stdout.write(C.bold + 'Status'.padEnd(cols.status) + C.reset + ' │ ');
    process.stdout.write(C.bold + 'Timestamp'.padEnd(cols.time) + C.reset + ' │\n');

    this._hr('├', '┤', '─', W);

    // Data rows
    submissions.forEach((s, i) => {
      const statusColoured = this._statusBadge(s.status || '?');
      const statusPad = (s.status || '?').padEnd(cols.status);

      process.stdout.write('│ ');
      process.stdout.write(String(i + 1).padEnd(cols.num) + ' │ ');
      process.stdout.write(C.dim + (s.receiptId || 'N/A').substring(0, cols.receipt).padEnd(cols.receipt) + C.reset + ' │ ');
      process.stdout.write(C.cyan + (s.studentId || '?').padEnd(cols.student) + C.reset + ' │ ');
      process.stdout.write((s.courseId || '?').padEnd(cols.course) + ' │ ');
      process.stdout.write(statusColoured + statusPad + C.reset + ' │ ');
      const ts = this._formatTime(s.timestamp || s.submittedAt);
      process.stdout.write(C.dim + ts.padEnd(cols.time) + C.reset + ' │\n');
    });

    this._hr('└', '┘', '─', W);
    console.log(`  ${C.dim}Total: ${C.bold}${submissions.length}${C.reset}${C.dim} record(s)${C.reset}\n`);
  }

  /**
   * Render full details of a single submission.
   * @param {Object} s
   */
  renderDetail(s) {
    console.log('\n' + C.bold + C.cyan + '  ╔══════════════════════════════════════╗' + C.reset);
    console.log(C.bold + C.cyan    + '  ║     SUBMISSION RECEIPT DETAIL        ║' + C.reset);
    console.log(C.bold + C.cyan    + '  ╚══════════════════════════════════════╝' + C.reset);
    console.log(`  ${C.bold}Receipt ID   :${C.reset} ${s.receiptId}`);
    console.log(`  ${C.bold}Student ID   :${C.reset} ${C.cyan}${s.studentId}${C.reset}`);
    console.log(`  ${C.bold}Course ID    :${C.reset} ${s.courseId}`);
    console.log(`  ${C.bold}Status       :${C.reset} ${this._statusBadge(s.status)}${s.status}${C.reset}`);
    console.log(`  ${C.bold}Issued At    :${C.reset} ${this._formatTime(s.timestamp)}`);
    console.log(`  ${C.bold}Submitted At :${C.reset} ${this._formatTime(s.submittedAt)}`);
    console.log(`  ${C.bold}Hash / Ref   :${C.reset} ${C.dim}${(s.assignmentHash || 'N/A').substring(0, 60)}${C.reset}`);
    console.log(`  ${C.bold}Message      :${C.reset} ${s.message || ''}`);
    console.log('');
  }

  /**
   * Render a stats dashboard.
   * @param {Object[]} submissions
   */
  renderStats(submissions) {
    const total    = submissions.length;
    const onTime   = submissions.filter(s => s.status === 'ON_TIME').length;
    const late     = submissions.filter(s => s.status === 'LATE').length;
    const rejected = submissions.filter(s => s.status === 'REJECTED').length;

    const courses = {};
    submissions.forEach(s => {
      if (s.courseId) courses[s.courseId] = (courses[s.courseId] || 0) + 1;
    });

    console.log('\n' + C.bold + C.bgBlue + '  SUBMISSION STATISTICS  ' + C.reset);
    console.log(`  ${C.bold}Total Submissions :${C.reset} ${total}`);
    console.log(`  ${C.green}✔ ON TIME         :${C.reset} ${onTime}`);
    console.log(`  ${C.yellow}⚠ LATE            :${C.reset} ${late}`);
    console.log(`  ${C.red}✘ REJECTED        :${C.reset} ${rejected}`);
    console.log('');
    if (Object.keys(courses).length > 0) {
      console.log(`  ${C.bold}By Course:${C.reset}`);
      Object.entries(courses).forEach(([cid, count]) => {
        const bar = '█'.repeat(Math.min(count, 30));
        console.log(`    ${C.cyan}${cid.padEnd(10)}${C.reset} ${bar} ${count}`);
      });
      console.log('');
    }
  }

  // ── Private helpers ──────────────────────────────────────────────

  _statusBadge(status) {
    switch ((status || '').toUpperCase()) {
      case 'ON_TIME':  return C.green;
      case 'LATE':     return C.yellow;
      case 'REJECTED': return C.red;
      default:         return C.dim;
    }
  }

  _formatTime(ts) {
    if (!ts) return 'N/A';
    try {
      const d = new Date(ts);
      return d.toLocaleString('en-GB', { hour12: false }).replace(',', '');
    } catch {
      return ts.substring(0, 22);
    }
  }

  _hr(left, right, fill, width) {
    console.log(left + fill.repeat(width) + right);
  }

  _cell(text, width, center = false) {
    const visible = text.replace(/\x1b\[[0-9;]*m/g, '');
    const padding = Math.max(0, width - visible.length);
    const pad = center ? ' '.repeat(Math.floor(padding / 2)) : '';
    console.log('│' + pad + text + ' '.repeat(padding - pad.length) + '│');
  }

  _renderEmpty(filterLabel) {
    console.log(`\n  ${C.yellow}No submissions found${C.reset} for filter: ${C.bold}${filterLabel}${C.reset}\n`);
  }
}

module.exports = TableRenderer;
