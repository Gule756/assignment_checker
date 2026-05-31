/**
 * ================================================================
 *  Instructor GradeBook — Main Application Controller (Browser JS)
 * ================================================================
 *  Coordinates all gradebook components:
 *    • GradeBookClient     — fetch submissions from engine
 *    • FilterManager       — Strategy pattern composition
 *    • SubmissionRenderer  — render the submissions grid
 *    • ExportManager       — CSV download
 *
 *  Auto-refresh every 30 seconds to pick up new submissions.
 * ================================================================
 */

const ENGINE_URL = 'http://localhost:3001';

document.addEventListener('DOMContentLoaded', async () => {

  // ── Instantiate components ──────────────────────────────────────
  const client   = new GradeBookClient(ENGINE_URL);
  const renderer = new SubmissionRenderer('table-container');
  const exporter = new ExportManager();
  const filterMgr= new FilterManager();   // Strategy Context

  // DOM references
  const engineStatus  = document.getElementById('engine-status');
  const statTotal     = document.getElementById('stat-total');
  const statOnTime    = document.getElementById('stat-ontime');
  const statLate      = document.getElementById('stat-late');
  const statRejected  = document.getElementById('stat-rejected');
  const resultCount   = document.getElementById('result-count');
  const filterCourse  = document.getElementById('filter-course');
  const filterStatus  = document.getElementById('filter-status');
  const searchInput   = document.getElementById('search-input');
  const btnRefresh    = document.getElementById('btn-refresh');
  const btnExport     = document.getElementById('btn-export');

  // ── Core: Load and Render ───────────────────────────────────────
  async function loadAndRender() {
    renderer.showLoading();

    const result = await client.loadSubmissions();

    // Update engine status badge
    if (result.offline) {
      engineStatus.textContent = '🔴 Engine Offline — Cached Data';
      engineStatus.className   = 'engine-badge offline';
    } else {
      engineStatus.textContent = '🟢 Engine Online';
      engineStatus.className   = 'engine-badge online';
    }

    // Populate the course filter dynamically
    populateCourseFilter(client.getUniqueCourses());

    // Load and display stats
    const stats = await client.loadStats();
    statTotal.textContent    = stats.total    || 0;
    statOnTime.textContent   = stats.onTime   || 0;
    statLate.textContent     = stats.late     || 0;
    statRejected.textContent = stats.rejected || 0;

    // Apply active filters and render
    applyFilters();
  }

  // ── Filtering (Strategy Pattern in action) ─────────────────────
  function applyFilters() {
    const courseVal  = filterCourse.value;
    const statusVal  = filterStatus.value;
    const searchVal  = searchInput.value;

    // Build the strategy set from current UI state
    filterMgr.setStrategies([
      new CourseFilterStrategy(courseVal),   // Concrete Strategy 1
      new StatusFilterStrategy(statusVal),   // Concrete Strategy 2
      new SearchFilterStrategy(searchVal),   // Concrete Strategy 3
    ]);

    const all      = client.getAll();
    const filtered = filterMgr.apply(all);

    resultCount.textContent = `Showing ${filtered.length} of ${all.length} submission${all.length !== 1 ? 's' : ''}`;
    renderer.render(filtered);
  }

  // ── Populate course dropdown from live data ────────────────────
  function populateCourseFilter(courses) {
    // Keep the existing static options, add any new ones from data
    const existing = new Set([...filterCourse.options].map(o => o.value));
    courses.forEach(c => {
      if (c && !existing.has(c)) {
        const opt   = document.createElement('option');
        opt.value   = c;
        opt.textContent = c;
        filterCourse.appendChild(opt);
        existing.add(c);
      }
    });
  }

  // ── Event Listeners ─────────────────────────────────────────────
  filterCourse.addEventListener('change', applyFilters);
  filterStatus.addEventListener('change', applyFilters);
  searchInput.addEventListener('input',   applyFilters);

  btnRefresh.addEventListener('click', async () => {
    btnRefresh.disabled    = true;
    btnRefresh.textContent = '⏳ Refreshing…';
    await loadAndRender();
    btnRefresh.disabled    = false;
    btnRefresh.textContent = '🔄 Refresh';
  });

  btnExport.addEventListener('click', () => {
    const all      = client.getAll();
    const filtered = filterMgr.apply(all);
    exporter.exportCSV(filtered);
  });

  // ── Stat card click → quick filter ─────────────────────────────
  document.querySelectorAll('.stat-card[data-filter-status]').forEach(card => {
    card.addEventListener('click', () => {
      const val           = card.dataset.filterStatus;
      filterStatus.value  = val;
      applyFilters();
      document.getElementById('filters-bar').scrollIntoView({ behavior: 'smooth' });
    });
  });

  // ── Initial load ─────────────────────────────────────────────────
  await loadAndRender();

  // ── Auto-refresh every 30 seconds ───────────────────────────────
  setInterval(loadAndRender, 30000);
});
