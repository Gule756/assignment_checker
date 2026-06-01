/**
 * instructor-app.js — Instructor GradeBook Portal
 * Added: Deadline management panel + auto-download from Neon
 */

const AUTH_URL = 'http://localhost:5001';
const API_URL  = 'http://localhost:3001';

let token          = null;
let allSubmissions = [];
let allDeadlines   = [];

// ── Bell notification state ───────────────────────────────────────
let seenIds      = new Set(); // receipt_ids already known
let notifHistory = [];        // ALL notifications ever received (never cleared)
let unseenCount  = 0;         // how many are new (drives the badge number)
let pollTimer    = null;      // setInterval handle


// ── Tab switch ────────────────────────────────────────────────────
function showTab(tab) {
  document.getElementById('form-login').style.display    = tab === 'login'    ? '' : 'none';
  document.getElementById('form-register').style.display = tab === 'register' ? '' : 'none';
  document.getElementById('tab-login').classList.toggle('active',    tab === 'login');
  document.getElementById('tab-register').classList.toggle('active', tab === 'register');
  clearMsg('auth-msg');
}

// ── Login ─────────────────────────────────────────────────────────
async function doLogin() {
  const email = v('l-email'), pass = v('l-pass');
  if (!email || !pass) return showMsg('auth-msg', 'Please fill all fields.', 'error');
  setBtnLoading('btn-login', true);
  try {
    const res  = await postJSON(`${AUTH_URL}/auth/login`, { email, password: pass });
    const data = await res.json();
    if (!res.ok) return showMsg('auth-msg', data.error || 'Login failed.', 'error');
    if (data.user.role !== 'teacher') return showMsg('auth-msg', 'Instructor portal only.', 'error');
    onAuthenticated(data.token, data.user);
  } catch {
    showMsg('auth-msg', 'Cannot reach auth service (port 5001).', 'error');
  } finally { setBtnLoading('btn-login', false); }
}

// ── Register ──────────────────────────────────────────────────────
async function doRegister() {
  const name = v('r-name'), email = v('r-email'), pass = v('r-pass');
  if (!name || !email || !pass) return showMsg('auth-msg', 'Please fill all fields.', 'error');
  if (pass.length < 6) return showMsg('auth-msg', 'Password must be at least 6 characters.', 'error');
  setBtnLoading('btn-register', true);
  try {
    const res  = await postJSON(`${AUTH_URL}/auth/register`, { name, email, password: pass, role: 'teacher' });
    const data = await res.json();
    if (!res.ok) return showMsg('auth-msg', data.error || 'Registration failed.', 'error');
    onAuthenticated(data.token, data.user);
  } catch {
    showMsg('auth-msg', 'Cannot reach auth service (port 5001).', 'error');
  } finally { setBtnLoading('btn-register', false); }
}

function onAuthenticated(tok, user) {
  token = tok;
  document.getElementById('auth-screen').style.display = 'none';
  document.getElementById('dashboard').style.display   = 'block';
  document.getElementById('user-name').textContent     = user.name;
  loadAll();
  startPolling();  // begin checking for new submissions every 10 s

  // Close bell dropdown when clicking outside
  document.addEventListener('click', (e) => {
    const wrap = document.getElementById('bell-wrap');
    if (wrap && !wrap.contains(e.target)) closeBell();
  });
}

// ── Load all data ─────────────────────────────────────────────────
async function loadAll() {
  renderTable(null);
  try {
    const [statsRes, subsRes, dlRes] = await Promise.all([
      fetch(`${API_URL}/api/submissions/stats`, { headers: authHeader() }),
      fetch(`${API_URL}/api/submissions`,        { headers: authHeader() }),
      fetch(`${API_URL}/api/deadlines`,          { headers: authHeader() }),
    ]);

    if (statsRes.ok) {
      const s = await statsRes.json();
      document.getElementById('stat-total').textContent  = s.total    || 0;
      document.getElementById('stat-ontime').textContent = s.on_time  || 0;
      document.getElementById('stat-late').textContent   = s.late     || 0;
      document.getElementById('stat-reject').textContent = s.rejected || 0;
    }
    if (subsRes.ok) {
      allSubmissions = (await subsRes.json()).submissions || [];
      applyFilters();
    }
    if (dlRes.ok) {
      allDeadlines = (await dlRes.json()).deadlines || [];
      renderDeadlines();
    }
  } catch {
    document.getElementById('table-body').innerHTML =
      '<tr><td colspan="8" class="empty">Backend offline — start Node.js on port 3001.</td></tr>';
  }
}

// ── Set deadline ──────────────────────────────────────────────────
async function setDeadline() {
  const courseId    = v('d-course');
  const title       = v('d-title');
  const deadlineAt  = document.getElementById('d-datetime').value;

  if (!courseId || !deadlineAt) return showMsg('deadline-msg', 'Select a course and date/time.', 'error');

  setBtnLoading('btn-deadline', true);
  try {
    const res  = await postJSON(`${API_URL}/api/deadlines`, { courseId, title, deadlineAt });
    const data = await res.json();
    if (!res.ok) return showMsg('deadline-msg', data.error || 'Failed to set deadline.', 'error');
    showMsg('deadline-msg', `Deadline set for ${courseId}!`, 'success');
    // Refresh deadlines
    const dlRes = await fetch(`${API_URL}/api/deadlines`, { headers: authHeader() });
    if (dlRes.ok) { allDeadlines = (await dlRes.json()).deadlines || []; renderDeadlines(); }
  } catch {
    showMsg('deadline-msg', 'Cannot reach backend.', 'error');
  } finally { setBtnLoading('btn-deadline', false); }
}

// ── Remove deadline ───────────────────────────────────────────────
async function removeDeadline(courseId) {
  if (!confirm(`Remove deadline for ${courseId}?`)) return;
  try {
    await fetch(`${API_URL}/api/deadlines/${courseId}`, { method: 'DELETE', headers: authHeader() });
    const dlRes = await fetch(`${API_URL}/api/deadlines`, { headers: authHeader() });
    if (dlRes.ok) { allDeadlines = (await dlRes.json()).deadlines || []; renderDeadlines(); }
  } catch {
    alert('Failed to remove deadline.');
  }
}

// ── Render deadlines list ─────────────────────────────────────────
function renderDeadlines() {
  const container = document.getElementById('deadlines-list');
  if (!allDeadlines.length) {
    container.innerHTML = '<div class="dl-empty">No deadlines set yet.</div>';
    return;
  }
  const now = new Date();
  container.innerHTML = allDeadlines.map(d => {
    const past   = new Date(d.deadline_at) < now;
    const color  = past ? 'var(--red)' : 'var(--green)';
    const label  = past ? 'PASSED' : 'ACTIVE';
    return `
      <div class="dl-item">
        <div>
          <span class="dl-course">${d.course_id}</span>
          <span class="dl-title">${d.title || ''}</span>
        </div>
        <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
          <span style="font-size:.82rem;color:var(--muted)">${fmt(d.deadline_at)}</span>
          <span style="font-size:.72rem;font-weight:700;color:${color}">${label}</span>
          <button class="btn-remove" onclick="removeDeadline('${d.course_id}')">Remove</button>
        </div>
      </div>`;
  }).join('');
}

// ── Filter table ──────────────────────────────────────────────────
function applyFilters() {
  const search = v('f-search').toLowerCase();
  const course = v('f-course');
  const status = v('f-status');
  const filtered = allSubmissions.filter(s => {
    const matchSearch = !search ||
      (s.full_name      || '').toLowerCase().includes(search) ||
      (s.student_number || '').toLowerCase().includes(search) ||
      (s.receipt_id     || '').toLowerCase().includes(search);
    const matchCourse = !course || s.course_id === course;
    const matchStatus = !status || s.status    === status;
    return matchSearch && matchCourse && matchStatus;
  });
  renderTable(filtered);
}

// ── Render submissions table ──────────────────────────────────────
function renderTable(rows) {
  const tbody   = document.getElementById('table-body');
  const countEl = document.getElementById('row-count');
  if (rows === null) {
    tbody.innerHTML = '<tr><td colspan="8" class="empty"><span class="spinner"></span> Loading…</td></tr>';
    if (countEl) countEl.textContent = '';
    return;
  }
  if (!rows.length) {
    tbody.innerHTML = '<tr><td colspan="8" class="empty">No submissions found.</td></tr>';
    if (countEl) countEl.textContent = '';
    return;
  }
  tbody.innerHTML = rows.map((s, i) => `
    <tr>
      <td style="color:var(--muted)">${i + 1}</td>
      <td style="font-size:.74rem;color:var(--muted);font-family:monospace">${s.receipt_id}</td>
      <td>
        <div style="font-weight:500">${s.full_name || s.student_name || '—'}</div>
        <div style="font-size:.74rem;color:var(--muted)">${s.student_number || ''}</div>
      </td>
      <td>${s.course_id}</td>
      <td><span class="sbadge ${s.status}">${s.status}</span></td>
      <td style="color:var(--muted);font-size:.78rem;white-space:nowrap">${fmt(s.submitted_at)}</td>
      <td style="font-size:.78rem;color:var(--muted);max-width:130px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap"
          title="${s.original_filename||''}">${s.original_filename || '—'}</td>
      <td>
        ${s.original_filename
          ? `<button class="btn-dl" onclick="downloadFile('${s.receipt_id}','${(s.original_filename||'file').replace(/'/g,"\\'")}')">
               Download
             </button>`
          : '<span style="color:var(--muted);font-size:.78rem">No file</span>'}
      </td>
    </tr>`).join('');
  if (countEl) countEl.textContent = `Showing ${rows.length} of ${allSubmissions.length} submission(s)`;
}

// ── Download file from Neon via authenticated request ─────────────
async function downloadFile(receiptId, filename) {
  try {
    const res = await fetch(`${API_URL}/api/download/${receiptId}`, { headers: authHeader() });
    if (!res.ok) {
      const d = await res.json();
      return alert('Download error: ' + (d.error || 'Unknown'));
    }
    const blob = await res.blob();
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  } catch {
    alert('Download failed. Is the backend running?');
  }
}

// ── Logout ────────────────────────────────────────────────────────
function doLogout() {
  token = null; allSubmissions = []; allDeadlines = [];
  stopPolling();
  seenIds.clear(); notifHistory = []; unseenCount = 0;
  document.getElementById('dashboard').style.display   = 'none';
  document.getElementById('auth-screen').style.display = 'flex';
  document.getElementById('l-email').value = '';
  document.getElementById('l-pass').value  = '';
  showTab('login');
}

// ── Helpers ───────────────────────────────────────────────────────
const v        = id => document.getElementById(id)?.value?.trim() || '';
const postJSON = (url, body) => fetch(url, {
  method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeader() }, body: JSON.stringify(body),
});
const authHeader = () => token ? { Authorization: `Bearer ${token}` } : {};
const fmt = ts => ts ? new Date(ts).toLocaleString() : '—';

// ── Bell notification helpers ─────────────────────────────────────
function startPolling() {
  stopPolling();
  pollTimer = setInterval(checkNewSubmissions, 10000); // every 10 seconds
}

function stopPolling() {
  if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
}

async function checkNewSubmissions() {
  if (!token) return;
  try {
    const res  = await fetch(`${API_URL}/api/submissions`, { headers: authHeader() });
    if (!res.ok) return;
    const data = await res.json();
    const subs = data.submissions || [];

    // First poll — seed seenIds so existing submissions don’t trigger alerts
    if (seenIds.size === 0 && allSubmissions.length > 0) {
      subs.forEach(s => seenIds.add(s.receipt_id));
      return;
    }

    // Find genuinely new submissions
    const fresh = subs.filter(s => !seenIds.has(s.receipt_id));
    if (fresh.length > 0) {
      fresh.forEach(s => {
        seenIds.add(s.receipt_id);
        notifHistory.unshift(s);  // add to top of history (stays forever)
        unseenCount++;             // increment badge
      });
      allSubmissions = subs;
      applyFilters();
      renderBell();
    }
  } catch { /* silently ignore polling errors */ }
}

function renderBell() {
  const badge = document.getElementById('bell-badge');
  const items = document.getElementById('bell-items');

  // Badge shows unseen count only
  badge.textContent = unseenCount > 9 ? '9+' : unseenCount;
  badge.classList.toggle('show', unseenCount > 0);

  // Dropdown always shows full history
  if (notifHistory.length === 0) {
    items.innerHTML = '<div class="bell-empty">No new submissions yet.</div>';
    return;
  }
  items.innerHTML = notifHistory.map(s => `
    <div class="bell-item">
      <div class="bi-name">${s.full_name || s.student_name || '—'}</div>
      <div class="bi-detail">
        submitted <strong>${s.original_filename || 'a file'}</strong>
        &nbsp;·&nbsp; Course: <strong>${s.course_id}</strong>
        &nbsp;·&nbsp; ${fmt(s.submitted_at)}
      </div>
      <div class="bi-status ${s.status}">${s.status === 'LATE' ? '⚠ LATE' : '✓ ON TIME'}</div>
    </div>`).join('');
}

function toggleBell() {
  document.getElementById('bell-dropdown').classList.toggle('open');
}

function closeBell() {
  document.getElementById('bell-dropdown').classList.remove('open');
}

// Mark all seen: only clears the badge number — history list stays intact
function markAllSeen() {
  unseenCount = 0;
  renderBell();   // badge disappears, list remains
  closeBell();
}

function showMsg(id, text, type) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = text; el.className = `msg ${type}`;
  setTimeout(() => { if (el.textContent === text) { el.className = 'msg'; el.textContent = ''; } }, 4000);
}
function clearMsg(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.className = 'msg'; el.textContent = '';
}
function setBtnLoading(id, loading) {
  const btn = document.getElementById(id);
  if (!btn) return;
  btn.disabled = loading;
  btn.dataset.orig = btn.dataset.orig || btn.textContent;
  btn.textContent  = loading ? 'Please wait…' : btn.dataset.orig;
}
