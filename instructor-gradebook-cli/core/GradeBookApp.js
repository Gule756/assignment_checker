/**
 * ================================================================
 *  GradeBookApp — Singleton + Facade Pattern Implementation
 * ================================================================
 *  Pattern 1: SINGLETON (Creational GoF)
 *    Ensures only ONE GradeBookApp instance exists throughout the
 *    entire CLI session. All menu commands share the same app state
 *    (submissions cache, active filter, renderer) via getInstance().
 *
 *  Pattern 2: FACADE (Structural GoF)
 *    GradeBookApp is the RECEIVER in the Command pattern. It exposes
 *    a simplified, unified interface (loadSubmissions, filterByCourse,
 *    showStats, exportCSV …) that hides the complexity of coordinating
 *    GradeBookDataService + FilterContext + TableRenderer + CSVExporter.
 *
 *  GoF Participants:
 *    Singleton  → GradeBookApp._instance
 *    Facade     → GradeBookApp public methods
 *    Subsystems → GradeBookDataService, FilterContext,
 *                 TableRenderer, CSVExporter
 * ================================================================
 */

const GradeBookDataService = require('./GradeBookDataService');
const TableRenderer        = require('./TableRenderer');
const CSVExporter          = require('./CSVExporter');
const { FilterContext, CourseFilter, StatusFilter,
        StudentFilter, AllFilter } = require('./FilterStrategy');

// ANSI helpers
const C = {
  reset: '\x1b[0m', bold: '\x1b[1m', green: '\x1b[32m',
  yellow: '\x1b[33m', red: '\x1b[31m', cyan: '\x1b[36m', dim: '\x1b[2m',
};

class GradeBookApp {

  // ── Singleton constructor ──────────────────────────────────────
  constructor() {
    if (GradeBookApp._instance) return GradeBookApp._instance;

    /** @type {Object[]} Full submission list (raw from engine/file) */
    this._allSubmissions    = [];
    /** @type {Object[]} Currently displayed (filtered) subset */
    this._filteredSubmissions = [];
    /** @type {string} Source of last load */
    this._dataSource        = 'none';
    /** @type {boolean} Whether engine is reachable */
    this._engineOnline      = false;

    // ── Subsystem components (Facade hides these) ──────────────
    this._dataService  = new GradeBookDataService();
    this._renderer     = new TableRenderer();
    this._exporter     = new CSVExporter();
    this._filterCtx    = new FilterContext();

    GradeBookApp._instance = this;
    console.log(`${C.dim}[GradeBookApp] Singleton instance created.${C.reset}`);
  }

  /** GoF global access point */
  static getInstance() {
    if (!GradeBookApp._instance) new GradeBookApp();
    return GradeBookApp._instance;
  }

  // ── Facade Methods (called by Command objects) ─────────────────

  /**
   * Load / reload submissions from engine or fallback file.
   * Resets any active filter.
   */
  async loadSubmissions() {
    process.stdout.write(`  ${C.cyan}Loading submissions…${C.reset} `);
    const { submissions, source } = await this._dataService.fetchAll();
    this._engineOnline     = (source === 'engine');
    this._allSubmissions   = submissions;
    this._dataSource       = source;
    this._filterCtx.setStrategy(new AllFilter(), 'All');
    this._filteredSubmissions = [...this._allSubmissions];

    const srcLabel = this._engineOnline
      ? `${C.green}● Engine (live)${C.reset}`
      : `${C.yellow}○ File fallback (engine offline)${C.reset}`;
    console.log(`${srcLabel}  — ${C.bold}${submissions.length}${C.reset} record(s) loaded.\n`);

    this._renderer.renderTable(this._filteredSubmissions, 'All');
  }

  /**
   * Filter visible submissions by Course ID.
   * @param {string} courseId
   */
  async filterByCourse(courseId) {
    if (!courseId) { console.log(`  ${C.yellow}Please provide a Course ID (e.g. CS401).${C.reset}\n`); return; }
    this._filterCtx.setStrategy(new CourseFilter(), `Course = ${courseId.toUpperCase()}`);
    this._filteredSubmissions = this._filterCtx.applyFilter(this._allSubmissions, courseId);
    this._renderer.renderTable(this._filteredSubmissions, this._filterCtx.strategyName);
  }

  /**
   * Filter visible submissions by status.
   * @param {string} status  ON_TIME | LATE | REJECTED
   */
  async filterByStatus(status) {
    const valid = ['ON_TIME', 'LATE', 'REJECTED'];
    const up = (status || '').toUpperCase();
    if (!valid.includes(up)) {
      console.log(`  ${C.yellow}Valid statuses: ON_TIME, LATE, REJECTED${C.reset}\n`); return;
    }
    this._filterCtx.setStrategy(new StatusFilter(), `Status = ${up}`);
    this._filteredSubmissions = this._filterCtx.applyFilter(this._allSubmissions, up);
    this._renderer.renderTable(this._filteredSubmissions, this._filterCtx.strategyName);
  }

  /**
   * Filter by student ID (partial match).
   * @param {string} studentId
   */
  async filterByStudent(studentId) {
    if (!studentId) { console.log(`  ${C.yellow}Please provide a Student ID to search.${C.reset}\n`); return; }
    this._filterCtx.setStrategy(new StudentFilter(), `Student ≈ ${studentId}`);
    this._filteredSubmissions = this._filterCtx.applyFilter(this._allSubmissions, studentId);
    this._renderer.renderTable(this._filteredSubmissions, this._filterCtx.strategyName);
  }

  /** Remove all filters and show full list */
  async showAll() {
    this._filterCtx.setStrategy(new AllFilter(), 'All');
    this._filteredSubmissions = [...this._allSubmissions];
    this._renderer.renderTable(this._filteredSubmissions, 'All');
  }

  /**
   * Show full detail for a row number from the current filtered view.
   * @param {string} rowInput  - 1-based row number as string
   */
  async showDetail(rowInput) {
    const idx = parseInt(rowInput, 10) - 1;
    if (isNaN(idx) || idx < 0 || idx >= this._filteredSubmissions.length) {
      console.log(`  ${C.yellow}Invalid row number. Enter a number between 1 and ${this._filteredSubmissions.length}.${C.reset}\n`);
      return;
    }
    this._renderer.renderDetail(this._filteredSubmissions[idx]);
  }

  /** Show statistics dashboard */
  async showStats() {
    this._renderer.renderStats(this._allSubmissions);
  }

  /**
   * Export current filtered view to a CSV file.
   * @param {string} filePathInput - optional file path; defaults to ./submissions_export.csv
   */
  async exportCSV(filePathInput) {
    const outPath = filePathInput || 'submissions_export.csv';
    const result  = this._exporter.export(this._filteredSubmissions, outPath);
    if (result.success) {
      console.log(`  ${C.green}✔ Exported ${result.rowCount} record(s) → ${result.filePath}${C.reset}\n`);
    } else {
      console.log(`  ${C.red}✘ Export failed: ${result.reason}${C.reset}\n`);
    }
  }

  /** Print the full help / command reference */
  async showHelp() {
    console.log(`\n${C.bold}${C.cyan}  ╔══════════════════════════════════════════╗${C.reset}`);
    console.log(`${C.bold}${C.cyan}  ║   INSTRUCTOR GRADE-BOOK CLI — COMMANDS   ║${C.reset}`);
    console.log(`${C.bold}${C.cyan}  ╚══════════════════════════════════════════╝${C.reset}`);
    console.log(`  ${C.bold}r${C.reset}              Reload submissions from engine`);
    console.log(`  ${C.bold}fc <COURSE>${C.reset}    Filter by Course ID   e.g.  fc CS401`);
    console.log(`  ${C.bold}fs <STATUS>${C.reset}    Filter by Status       e.g.  fs LATE`);
    console.log(`  ${C.bold}ss <ID>${C.reset}        Search by Student ID   e.g.  ss STU-2024`);
    console.log(`  ${C.bold}all${C.reset}            Clear filters — show all`);
    console.log(`  ${C.bold}d <ROW#>${C.reset}       Detail view            e.g.  d 3`);
    console.log(`  ${C.bold}stats${C.reset}          Statistics dashboard`);
    console.log(`  ${C.bold}export [FILE]${C.reset}  Export to CSV file     e.g.  export my.csv`);
    console.log(`  ${C.bold}h${C.reset}              Show this help`);
    console.log(`  ${C.bold}q${C.reset}              Quit\n`);
  }

  /** Graceful exit */
  async quit() {
    console.log(`\n  ${C.cyan}Goodbye! GradeBook session ended.${C.reset}\n`);
    process.exit(0);
  }

  /** Expose loaded data for display purposes */
  get engineOnline()      { return this._engineOnline; }
  get dataSource()        { return this._dataSource; }
  get totalCount()        { return this._allSubmissions.length; }
  get filteredCount()     { return this._filteredSubmissions.length; }
}

// Initialise static singleton pointer
GradeBookApp._instance = null;

module.exports = GradeBookApp;
