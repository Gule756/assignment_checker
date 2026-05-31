/**
 * student-app.js — Student Portal Logic
 * Subsystem: Student Web Portal (JavaScript / Browser)
 *
 * Connects to:
 *   AUTH_URL (port 5001) — Python: login / register
 *   API_URL  (port 3001) — Node.js: file upload + submissions
 */

const AUTH_URL = 'http://localhost:5001';
const API_URL  = 'http://localhost:3001';

let token    = null;
let userData = null;

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
    if (data.user.role !== 'student') return showMsg('auth-msg', 'This portal is for students only.', 'error');
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
    const res  = await postJSON(`${AUTH_URL}/auth/register`, { name, email, password: pass, role: 'student' });
    const data = await res.json();
    if (!res.ok) return showMsg('auth-msg', data.error || 'Registration failed.', 'error');
    onAuthenticated(data.token, data.user);
  } catch {
    showMsg('auth-msg', 'Cannot reach auth service (port 5001). Is Python running?', 'error');
  } finally { setBtnLoading('btn-register', false); }
}

// ── Post-auth ─────────────────────────────────────────────────────
function onAuthenticated(tok, user) {
  token    = tok;
  userData = user;
  document.getElementById('auth-screen').style.display = 'none';
  document.getElementById('dashboard').style.display   = 'block';
  document.getElementById('user-name').textContent     = user.name;
  loadHistory();
}

// ── File drag & drop helpers ──────────────────────────────────────
function onFileChange(e) {
  const file = e.target.files[0];
  if (file) showChosenFile(file.name);
}
function onDragOver(e) {
  e.preventDefault();
  document.getElementById('file-zone').classList.add('drag');
}
function onDragLeave() {
  document.getElementById('file-zone').classList.remove('drag');
}
function onDrop(e) {
  e.preventDefault();
  document.getElementById('file-zone').classList.remove('drag');
  const file = e.dataTransfer.files[0];
  if (file) {
    const input = document.getElementById('s-file');
    const dt = new DataTransfer();
    dt.items.add(file);
    input.files = dt.files;
    showChosenFile(file.name);
  }
}
function showChosenFile(name) {
  document.getElementById('file-hint').style.display   = 'none';
  document.getElementById('file-chosen').style.display = '';
  document.getElementById('file-chosen').textContent   = '✔ ' + name;
}

// ── Submit assignment (FormData — multipart file upload) ──────────
async function doSubmit() {
  const fullName    = v('s-fullname');
  const studentNumber = v('s-studentid');
  const courseId    = v('s-course');
  const fileInput   = document.getElementById('s-file');
  const file        = fileInput.files[0];

  if (!fullName)      return showMsg('submit-msg', 'Please enter your full name.', 'error');
  if (!studentNumber) return showMsg('submit-msg', 'Please enter your student ID number.', 'error');
  if (!file)          return showMsg('submit-msg', 'Please choose a file to upload.', 'error');

  clearMsg('submit-msg');
  document.getElementById('receipt-box').style.display = 'none';
  setBtnLoading('btn-submit', true);

  // Show progress bar
  const progressWrap = document.getElementById('progress-wrap');
  const progressFill = document.getElementById('progress-fill');
  const progressLabel = document.getElementById('progress-label');
  progressWrap.style.display = '';

  try {
    const formData = new FormData();
    formData.append('courseId',       courseId);
    formData.append('fullName',       fullName);
    formData.append('studentNumber',  studentNumber);
    formData.append('file',           file);

    // Use XMLHttpRequest for upload progress tracking
    const result = await new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${API_URL}/api/submissions`);
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const pct = Math.round((e.loaded / e.total) * 100);
          progressFill.style.width  = pct + '%';
          progressLabel.textContent = `Uploading… ${pct}%`;
        }
      };
      xhr.onload = () => {
        progressFill.style.width  = '100%';
        progressLabel.textContent = 'Processing…';
        resolve(JSON.parse(xhr.responseText));
      };
      xhr.onerror = () => reject(new Error('Upload failed'));
      xhr.send(formData);
    });

    progressWrap.style.display = 'none';

    if (result.error) return showMsg('submit-msg', result.error, 'error');

    const s = result.submission;
    // Show receipt card
    document.getElementById('r-id').textContent        = s.receipt_id;
    document.getElementById('r-fullname').textContent   = s.full_name    || '—';
    document.getElementById('r-studentid').textContent  = s.student_number || '—';
    document.getElementById('r-course').textContent     = s.course_id;
    document.getElementById('r-status').textContent     = s.status;
    document.getElementById('r-file').textContent       = s.original_filename || '—';
    document.getElementById('r-time').textContent       = fmt(s.submitted_at);
    document.getElementById('r-msg').textContent        = s.message;
    document.getElementById('receipt-box').style.display = '';

    // Reset form
    fileInput.value = '';
    document.getElementById('s-fullname').value    = '';
    document.getElementById('s-studentid').value   = '';
    document.getElementById('file-hint').style.display   = '';
    document.getElementById('file-chosen').style.display = 'none';

    showMsg('submit-msg', 'Assignment submitted successfully! Receipt issued.', 'success');
    loadHistory();
  } catch {
    progressWrap.style.display = 'none';
    showMsg('submit-msg', 'Cannot reach backend (port 3001). Is Node.js running?', 'error');
  } finally { setBtnLoading('btn-submit', false); }
}

// ── Load history ──────────────────────────────────────────────────
async function loadHistory() {
  const container = document.getElementById('history-container');
  container.innerHTML = '<div class="empty"><span class="spinner"></span> Loading…</div>';
  try {
    const res  = await fetch(`${API_URL}/api/submissions`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    const rows = data.submissions || [];
    if (!rows.length) { container.innerHTML = '<div class="empty">No submissions yet.</div>'; return; }

    container.innerHTML = `
      <table>
        <thead><tr>
          <th>#</th><th>Receipt ID</th><th>Student ID</th>
          <th>Course</th><th>File</th><th>Status</th><th>Submitted</th>
        </tr></thead>
        <tbody>
          ${rows.map((s, i) => `
            <tr>
              <td>${i + 1}</td>
              <td style="font-size:.78rem;color:var(--muted)">${s.receipt_id}</td>
              <td>${s.student_number || '—'}</td>
              <td>${s.course_id}</td>
              <td style="max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${s.original_filename||''}">
                ${s.original_filename || '—'}
              </td>
              <td><span class="badge ${s.status}">${s.status}</span></td>
              <td style="color:var(--muted);font-size:.8rem">${fmt(s.submitted_at)}</td>
            </tr>`).join('')}
        </tbody>
      </table>`;
  } catch {
    container.innerHTML = '<div class="empty">Backend offline — cannot load history.</div>';
  }
}

// ── Logout ────────────────────────────────────────────────────────
function doLogout() {
  token = null; userData = null;
  document.getElementById('dashboard').style.display   = 'none';
  document.getElementById('auth-screen').style.display = 'flex';
  document.getElementById('l-email').value = '';
  document.getElementById('l-pass').value  = '';
  showTab('login');
}

// ── Helpers ───────────────────────────────────────────────────────
const v = id => document.getElementById(id)?.value?.trim() || '';
const postJSON = (url, body) => fetch(url, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});
const fmt = ts => ts ? new Date(ts).toLocaleString() : '—';

function showMsg(id, text, type) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = text;
  el.className   = `msg ${type}`;
}
function clearMsg(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.className   = 'msg';
  el.textContent = '';
}
function setBtnLoading(id, loading) {
  const btn = document.getElementById(id);
  if (!btn) return;
  btn.disabled     = loading;
  btn.dataset.orig = btn.dataset.orig || btn.textContent;
  btn.textContent  = loading ? 'Please wait…' : btn.dataset.orig;
}
