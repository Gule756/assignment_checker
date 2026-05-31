/**
 * Student Portal — Main App Controller v2
 * Manages login flow, file drag-and-drop, dynamic dropdowns, submission.
 */
const ENGINE_URL = 'http://localhost:3001';

document.addEventListener('DOMContentLoaded', () => {

  const auth   = new AuthClient(ENGINE_URL);
  const client = new SubmissionClient(ENGINE_URL, auth);
  const display = new ReceiptDisplay('receipt-container');

  // DOM refs
  const loginPanel      = document.getElementById('login-panel');
  const submissionPanel = document.getElementById('submission-panel');
  const loginForm       = document.getElementById('login-form');
  const loginError      = document.getElementById('login-error');
  const btnLogin        = document.getElementById('btn-login');
  const btnLogout       = document.getElementById('btn-logout');
  const userInfo        = document.getElementById('user-info');
  const userNameDisplay = document.getElementById('user-name-display');
  const engineStatus    = document.getElementById('engine-status');
  const welcomeMsg      = document.getElementById('welcome-msg');

  const submissionForm  = document.getElementById('submission-form');
  const courseSelect    = document.getElementById('courseId');
  const assignmentSelect= document.getElementById('assignmentId');
  const assignmentInfo  = document.getElementById('assignment-info');
  const dropZone        = document.getElementById('drop-zone');
  const fileInput       = document.getElementById('file-input');
  const filePreview     = document.getElementById('file-preview');
  const allowedTypes    = document.getElementById('allowed-types');
  const btnSubmit       = document.getElementById('btn-submit');
  const spinner         = document.getElementById('loading-spinner');
  const mySubsSection   = document.getElementById('my-subs-section');
  const mySubsList      = document.getElementById('my-subs-list');

  let selectedFile      = null;
  let currentAssignment = null;

  // ── Engine health check ────────────────────────────────────────
  fetch(`${ENGINE_URL}/health`)
    .then(() => { engineStatus.textContent='🟢 Engine Online'; engineStatus.className='engine-badge online'; })
    .catch(()=> { engineStatus.textContent='🔴 Engine Offline'; engineStatus.className='engine-badge offline'; });

  // ── Restore session ────────────────────────────────────────────
  if (auth.isLoggedIn()) showSubmissionPanel(auth.getUser());

  // ── LOGIN ──────────────────────────────────────────────────────
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    loginError.style.display = 'none';
    btnLogin.disabled        = true;
    btnLogin.textContent     = 'Signing in…';

    const result = await auth.login(
      document.getElementById('login-username').value.trim(),
      document.getElementById('login-password').value
    );

    btnLogin.disabled    = false;
    btnLogin.textContent = '🔑 Sign In';

    if (result.success) {
      showSubmissionPanel(result.user);
    } else {
      loginError.textContent     = result.error;
      loginError.style.display   = 'block';
    }
  });

  // ── LOGOUT ─────────────────────────────────────────────────────
  btnLogout.addEventListener('click', async () => {
    await auth.logout();
    loginPanel.style.display      = 'block';
    submissionPanel.style.display = 'none';
    userInfo.style.display        = 'none';
    loginForm.reset();
  });

  // ── Show submission panel ──────────────────────────────────────
  async function showSubmissionPanel(user) {
    loginPanel.style.display      = 'none';
    submissionPanel.style.display = 'block';
    userInfo.style.display        = 'flex';
    userNameDisplay.textContent   = `👤 ${user.name}`;
    welcomeMsg.textContent        = `Welcome, ${user.name}!`;

    // Load courses
    const courses = await client.getCourses();
    courseSelect.innerHTML = '<option value="">— Select your course —</option>';
    courses.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.id; opt.textContent = `${c.id} — ${c.name}`;
      courseSelect.appendChild(opt);
    });

    // Load my submissions
    loadMySubmissions();
  }

  // ── Course change → load assignments ──────────────────────────
  courseSelect.addEventListener('change', async () => {
    const courseId = courseSelect.value;
    assignmentSelect.innerHTML = '<option value="">Loading…</option>';
    assignmentInfo.textContent  = '';
    currentAssignment = null;
    fileInput.accept   = '';
    allowedTypes.textContent = 'Select an assignment to see allowed file types';
    btnSubmit.disabled = true;

    if (!courseId) {
      assignmentSelect.innerHTML = '<option value="">— Select course first —</option>';
      return;
    }

    const assignments = await client.getAssignments(courseId);
    assignmentSelect.innerHTML = '<option value="">— Select assignment —</option>';
    assignments.forEach(a => {
      const opt = document.createElement('option');
      opt.value = a.id;
      const deadline = new Date(a.deadline);
      const isPast   = deadline < new Date();
      opt.textContent = `${a.title}${isPast ? ' ⚠ PAST DEADLINE' : ''}`;
      assignmentSelect.appendChild(opt);
    });
  });

  // ── Assignment change → update file restrictions ───────────────
  assignmentSelect.addEventListener('change', () => {
    const id = assignmentSelect.value;
    const courseId = courseSelect.value;
    if (!id || !courseId) { currentAssignment = null; btnSubmit.disabled = true; return; }

    // Find assignment in DOM data (re-fetch if needed)
    client.getAssignments(courseId).then(list => {
      currentAssignment = list.find(a => a.id === id) || null;
      if (!currentAssignment) return;

      const deadline  = new Date(currentAssignment.deadline);
      const isPast    = deadline < new Date();
      const remaining = isPast ? 'PAST DEADLINE' : formatTimeLeft(deadline);
      const exts      = currentAssignment.allowedTypes.map(e => `.${e}`).join(', ');

      assignmentInfo.innerHTML = `
        <strong>Deadline:</strong> ${deadline.toLocaleString()} 
        — <span style="color:${isPast?'#fc5c7d':'#48cfad'}">${remaining}</span><br/>
        <strong>Max size:</strong> ${currentAssignment.maxFileSizeMB}MB &nbsp;|&nbsp;
        <strong>Allowed:</strong> ${exts}`;

      fileInput.accept = currentAssignment.allowedTypes.map(e => `.${e}`).join(',');
      allowedTypes.textContent = `Allowed: ${exts} | Max: ${currentAssignment.maxFileSizeMB}MB`;
      updateSubmitButton();
    });
  });

  // ── Drag & Drop ────────────────────────────────────────────────
  dropZone.addEventListener('click', () => fileInput.click());
  dropZone.addEventListener('keydown', e => { if (e.key==='Enter'||e.key===' ') fileInput.click(); });

  dropZone.addEventListener('dragover',  e => { e.preventDefault(); dropZone.classList.add('drag-over'); });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
  dropZone.addEventListener('drop', e => {
    e.preventDefault(); dropZone.classList.remove('drag-over');
    if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
  });

  fileInput.addEventListener('change', () => {
    if (fileInput.files.length) handleFile(fileInput.files[0]);
  });

  function handleFile(file) {
    selectedFile = file;
    const sizeMB = (file.size / (1024*1024)).toFixed(2);
    filePreview.style.display = 'flex';
    filePreview.innerHTML = `
      <span class="file-icon">${getFileIcon(file.name)}</span>
      <div class="file-meta">
        <div class="file-name">${file.name}</div>
        <div class="file-size">${sizeMB} MB</div>
      </div>
      <button type="button" class="btn-remove-file" onclick="clearFile()">✕</button>`;
    dropZone.style.display = 'none';
    updateSubmitButton();
  }

  window.clearFile = () => {
    selectedFile = null; fileInput.value = '';
    filePreview.style.display = 'none';
    dropZone.style.display    = 'flex';
    updateSubmitButton();
  };

  function updateSubmitButton() {
    btnSubmit.disabled = !(courseSelect.value && assignmentSelect.value && selectedFile);
  }

  // ── SUBMIT ─────────────────────────────────────────────────────
  submissionForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    display.clear();
    spinner.style.display  = 'flex';
    btnSubmit.disabled     = true;
    btnSubmit.textContent  = 'Uploading…';

    const result = await client.submit({
      courseId:     courseSelect.value,
      assignmentId: assignmentSelect.value,
      file:         selectedFile,
      comment:      document.getElementById('comment').value,
    });

    spinner.style.display = 'none';
    btnSubmit.disabled    = false;
    btnSubmit.textContent = '📤 Submit Assignment';

    if (result.success) {
      display.show(result.receipt);
      window.clearFile();
      submissionForm.reset();
      await courseSelect.dispatchEvent(new Event('change'));
      loadMySubmissions();
    } else {
      display.showError(result.error || 'Submission failed.');
    }
  });

  // ── My submissions ─────────────────────────────────────────────
  async function loadMySubmissions() {
    const subs = await client.getMySubmissions();
    if (!subs.length) { mySubsSection.style.display='none'; return; }
    mySubsSection.style.display = 'block';
    mySubsList.innerHTML = subs.map(s => `
      <div class="sub-row status-bg-${(s.status||'').toLowerCase().replace('_','-')}">
        <span class="sub-status status-pill status-${(s.status||'').toLowerCase().replace('_','-')}">${s.status}</span>
        <span class="sub-course">${s.courseId}</span>
        <span class="sub-file">${(s.fileMeta||{}).originalName || s.assignmentHash}</span>
        <span class="sub-id mono">${s.receiptId}</span>
        <span class="sub-time">${new Date(s.timestamp).toLocaleDateString()}</span>
      </div>`).join('');
  }

  // ── Helpers ────────────────────────────────────────────────────
  function getFileIcon(name) {
    const ext = name.split('.').pop().toLowerCase();
    const icons = { pdf:'📄', docx:'📝', doc:'📝', ppt:'📊', pptx:'📊',
                    py:'🐍', java:'☕', js:'🟨', zip:'🗜', rar:'🗜',
                    jpg:'🖼', png:'🖼', txt:'📃', c:'⚙', cpp:'⚙' };
    return icons[ext] || '📁';
  }

  function formatTimeLeft(deadline) {
    const ms = deadline - new Date();
    const d  = Math.floor(ms / 86400000);
    const h  = Math.floor((ms % 86400000) / 3600000);
    if (d > 0) return `${d}d ${h}h remaining`;
    if (h > 0) return `${h}h remaining`;
    return 'Due very soon!';
  }
});
