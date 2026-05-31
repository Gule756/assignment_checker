/**
 * instructor-app.js — Instructor GradeBook Portal Logic
 * Subsystem: Instructor Portal (JavaScript / Browser)
 */

const AUTH_URL = 'http://localhost:5001';
const API_URL  = 'http://localhost:3001';

let token          = null;
let allSubmissions = [];

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
    if (data.user.role !== 'teacher') return showMsg('auth-msg', 'This portal is for instructors only.', 'error');
    onAuthenticated(data.token, data.user);
  } catch {
    showMsg('auth-msg', 'Cannot reach auth service (port 5001). Is Python running?', 'error');
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
    showMsg('auth-msg', 'Cannot reach auth service (port 5001). Is Python running?', 'error');
  } finally { setBtnLoading('btn-register', false); }
}

// ── Post-auth ─────────────────────────────────────────────────────
function onAuthenticated(tok, user) {
  token = tok;
  document.getElementById('auth-screen').style.display = 'none';
  document.getElementById('dashboard').style.display   = 'block';
  document.getElementById('user-name').textContent     = user.name;
  loadAll();
}

// ── Load all data ─────────────────────────────────────────────────
async function loadAll() {
  renderTable(null);
  try {
    const [statsRes, subsRes] = await Promise.all([
      fetch(`${API_URL}/api/submissions/stats`, { headers: authHeader() }),
      fetch(`${API_URL}/api/submissions`,        { headers: authHeader() }),
    ]);

    if (statsRes.ok) {
      const s = await statsRes.json();
      document.getElementById('stat-total').textContent  = s.total    || 0;
      document.getElementById('stat-ontime').textContent = s.on_time  || 0;
      document.getElementById('stat-late').textContent   = s.late     || 0;
      document.getElementById('stat-reject').textContent = s.rejected || 0;
    }

    if (subsRes.ok) {
      const data = await subsRes.json();
      allSubmissions = data.submissions || [];
      applyFilters();
    } else {
      renderTable([]);
    }
  } catch {
    document.getElementById('table-body').innerHTML =
      '<tr><td colspan="9" class="empty">Backend offline — start Node.js on port 3001.</td></tr>';
  }
}

// ── Filter ────────────────────────────────────────────────────────
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

// ── Render table ──────────────────────────────────────────────────
function renderTable(rows) {
  const tbody   = document.getElementById('table-body');
  const countEl = document.getElementById('row-count');

  if (rows === null) {
    tbody.innerHTML = '<tr><td colspan="9" class="empty"><span class="spinner"></span> Loading…</td></tr>';
    if (countEl) countEl.textContent = '';
    return;
  }
  if (!rows.length) {
    tbody.innerHTML = '<tr><td colspan="9" class="empty">No submissions found.</td></tr>';
    if (countEl) countEl.textContent = '';
    return;
  }

  tbody.innerHTML = rows.map((s, i) => `
    <tr>
      <td style="color:var(--muted)">${i + 1}</td>
      <td style="font-size:.76rem;color:var(--muted);font-family:monospace">${s.receipt_id}</td>
      <td>
        <div style="font-weight:500">${s.full_name || s.student_name || '—'}</div>
        <div style="font-size:.76rem;color:var(--muted)">${s.student_number || ''}</div>
      </td>
      <td>${s.course_id}</td>
      <td><span class="sbadge ${s.status}">${s.status}</span></td>
      <td style="color:var(--muted);font-size:.78rem;white-space:nowrap">${fmt(s.submitted_at)}</td>
      <td>
        ${s.file_path
          ? `<div style="font-size:.78rem;color:var(--muted);margin-bottom:4px;max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${s.original_filename||''}">${s.original_filename || s.file_path}</div>
             <a class="btn-dl" href="${API_URL}/api/download/${s.receipt_id}"
                onclick="downloadFile(event,'${s.receipt_id}','${(s.original_filename||'file').replace(/'/g,"\\'")}')">
               Download
             </a>`
          : '<span style="color:var(--muted);font-size:.78rem">No file</span>'}
      </td>
    </tr>`).join('');

  if (countEl) countEl.textContent = `Showing ${rows.length} of ${allSubmissions.length} submission(s)`;
}

// ── Download file via authenticated request ───────────────────────
function downloadFile(event, receiptId, filename) {
  event.preventDefault();
  fetch(`${API_URL}/api/download/${receiptId}`, { headers: authHeader() })
    .then(res => {
      if (!res.ok) return res.json().then(d => { alert('Download error: ' + (d.error || 'Unknown')); });
      return res.blob().then(blob => {
        const url = URL.createObjectURL(blob);
        const a   = document.createElement('a');
        a.href     = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
      });
    })
    .catch(() => alert('Download failed. Is the backend running?'));
}

// ── Logout ────────────────────────────────────────────────────────
function doLogout() {
  token = null; allSubmissions = [];
  document.getElementById('dashboard').style.display   = 'none';
  document.getElementById('auth-screen').style.display = 'flex';
  document.getElementById('l-email').value = '';
  document.getElementById('l-pass').value  = '';
  showTab('login');
}

// ── Helpers ───────────────────────────────────────────────────────
const v       = id => document.getElementById(id)?.value?.trim() || '';
const postJSON = (url, body) => fetch(url, {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
});
const authHeader = () => ({ Authorization: `Bearer ${token}` });
const fmt = ts => ts ? new Date(ts).toLocaleString() : '—';

function showMsg(id, text, type) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = text; el.className = `msg ${type}`;
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
