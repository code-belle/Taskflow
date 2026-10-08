// ===== CONFIG =====
const API = 'api.php';

// ===== PROTOCOL CHECK =====
// Must be opened via http://localhost — not as a file://
if (window.location.protocol === 'file:') {
  document.body.innerHTML = `
    <div style="font-family:Inter,sans-serif;background:#0d0d1a;color:#e8e8f0;min-height:100vh;
      display:flex;align-items:center;justify-content:center;padding:2rem;">
      <div style="background:#1a1a2e;border:1px solid #ef4444;border-radius:16px;padding:2rem;
        max-width:520px;text-align:center;">
        <div style="font-size:3rem;margin-bottom:1rem;">⚠️</div>
        <h2 style="color:#ef4444;margin-bottom:.75rem;">Wrong URL!</h2>
        <p style="color:#a0a0c0;margin-bottom:1.25rem;line-height:1.6;">
          You opened this app as a <strong>file://</strong> — PHP and MySQL will not work that way.
          You must open it through <strong>Apache (XAMPP)</strong>.
        </p>
        <p style="background:#0d0d1a;border-radius:10px;padding:1rem;font-family:monospace;
          font-size:1rem;color:#06b6d4;margin-bottom:1.25rem;word-break:break-all;">
          http://localhost/projects%20prac/project01/
        </p>
        <a href="http://localhost/projects%20prac/project01/"
          style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#06b6d4);
          color:#fff;text-decoration:none;border-radius:8px;padding:.75rem 1.5rem;
          font-weight:600;font-size:.95rem;">Open Correctly ↗</a>
        <p style="color:#7070a0;font-size:.8rem;margin-top:1rem;">
          Make sure XAMPP Apache &amp; MySQL are both <strong style="color:#22c55e;">running</strong> (green) in the XAMPP Control Panel.
        </p>
      </div>
    </div>`;
}

// ===== STATE =====
let tasks = [];
let currentFilter = 'all';
let editingId     = null;

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
  // Default due date = today
  document.getElementById('dueDate').value = todayStr();

  // Date display
  const opts = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  document.getElementById('dateDisplay').textContent = new Date().toLocaleDateString(undefined, opts);

  // Enter key to add task
  document.getElementById('taskInput').addEventListener('keydown', e => {
    if (e.key === 'Enter') addTask();
  });

  loadTasks();
});

// ===== API HELPERS =====
async function apiFetch(url, method = 'GET', body = null) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' }
  };
  if (body) opts.body = JSON.stringify(body);
  const res  = await fetch(url, opts);
  const data = await res.json();
  return data;
}

// ===== LOAD TASKS FROM DB =====
async function loadTasks() {
  showLoading(true);
  try {
    const data = await apiFetch(API);
    if (data.success) {
      tasks = data.tasks;
      renderTasks();
    } else {
      showToast('❌ ' + (data.error || 'Failed to load tasks.'));
    }
  } catch (err) {
    showToast('❌ Cannot connect. Open via http://localhost — not as a file.');
    document.getElementById('emptyState').innerHTML =
      '<div class="empty-icon">⚠️</div><p>Open via <strong>http://localhost/projects%20prac/project01/</strong></p>';
    document.getElementById('emptyState').style.display = 'block';
  }
  showLoading(false);
}

// ===== ADD TASK =====
async function addTask() {
  const input = document.getElementById('taskInput');
  const title = input.value.trim();
  if (!title) { showToast('Please enter a task title.'); return; }

  const btn = document.getElementById('addBtn');
  btn.disabled = true;
  btn.textContent = '...';

  try {
    const data = await apiFetch(API, 'POST', {
      title,
      priority: document.getElementById('prioritySelect').value,
      due_date: document.getElementById('dueDate').value || null
    });

    if (data.success) {
      tasks.unshift(data.task);
      input.value = '';
      document.getElementById('dueDate').value = todayStr();
      renderTasks();
      showToast('✅ Task added!');
    } else {
      showToast('❌ ' + (data.error || 'Could not add task.'));
    }
  } catch {
    showToast('❌ Server error. Is XAMPP running?');
  }

  btn.disabled = false;
  btn.textContent = '+ Add';
}

// ===== TOGGLE DONE =====
async function toggleDone(id) {
  const task = tasks.find(t => t.id == id);
  if (!task) return;
  const newStatus = task.status === 'Completed' ? 'Pending' : 'Completed';

  try {
    const data = await apiFetch(`${API}?id=${id}`, 'PUT', { status: newStatus });
    if (data.success) {
      task.status = newStatus;
      renderTasks();
      showToast(newStatus === 'Completed' ? '✅ Task completed!' : '↩️ Task reopened.');
    }
  } catch {
    showToast('❌ Server error.');
  }
}

// ===== DELETE =====
async function deleteTask(id) {
  try {
    const data = await apiFetch(`${API}?id=${id}`, 'DELETE');
    if (data.success) {
      tasks = tasks.filter(t => t.id != id);
      renderTasks();
      showToast('🗑 Task deleted.');
    }
  } catch {
    showToast('❌ Server error.');
  }
}

// ===== CLEAR COMPLETED =====
async function clearCompleted() {
  const completed = tasks.filter(t => t.status === 'Completed');
  if (completed.length === 0) { showToast('No completed tasks to clear.'); return; }

  for (const task of completed) {
    await apiFetch(`${API}?id=${task.id}`, 'DELETE');
  }
  tasks = tasks.filter(t => t.status !== 'Completed');
  renderTasks();
  showToast(`🗑 Removed ${completed.length} completed task(s).`);
}

// ===== EDIT =====
function openEdit(id) {
  const task = tasks.find(t => t.id == id);
  if (!task) return;
  editingId = id;
  document.getElementById('editInput').value    = task.title;
  document.getElementById('editPriority').value = task.priority;
  document.getElementById('editDue').value      = task.due_date || '';
  document.getElementById('overlay').classList.add('show');
}

async function saveEdit() {
  const title = document.getElementById('editInput').value.trim();
  if (!title) { showToast('Title cannot be empty.'); return; }

  const btn = document.querySelector('.btn-save');
  btn.disabled = true;
  btn.textContent = '...';

  try {
    const data = await apiFetch(`${API}?id=${editingId}`, 'PUT', {
      title,
      priority: document.getElementById('editPriority').value,
      due_date: document.getElementById('editDue').value || null
    });

    if (data.success) {
      const idx = tasks.findIndex(t => t.id == editingId);
      if (idx !== -1) tasks[idx] = data.task;
      closeModal();
      renderTasks();
      showToast('✏️ Task updated!');
    } else {
      showToast('❌ ' + (data.error || 'Could not update task.'));
    }
  } catch {
    showToast('❌ Server error.');
  }

  btn.disabled = false;
  btn.textContent = 'Save';
}

function closeModal() {
  document.getElementById('overlay').classList.remove('show');
  editingId = null;
}

// ===== FILTER =====
function setFilter(filter) {
  currentFilter = filter;
  document.querySelectorAll('.tab').forEach(b => b.classList.remove('active'));
  document.getElementById('tab-' + filter).classList.add('active');
  renderTasks();
}

// ===== RENDER =====
function renderTasks() {
  const search = document.getElementById('searchInput').value.trim().toLowerCase();
  let list = tasks.slice();

  if (currentFilter === 'pending')   list = list.filter(t => t.status === 'Pending');
  if (currentFilter === 'completed') list = list.filter(t => t.status === 'Completed');
  if (search) list = list.filter(t => t.title.toLowerCase().includes(search));

  const ul    = document.getElementById('taskList');
  const empty = document.getElementById('emptyState');

  if (list.length === 0) {
    ul.innerHTML = '';
    empty.style.display = 'block';
  } else {
    empty.style.display = 'none';
    ul.innerHTML = list.map(buildTaskHTML).join('');
  }

  updateStats();
}

function buildTaskHTML(task) {
  const today    = todayStr();
  const isOverdue = task.due_date && task.due_date < today && task.status !== 'Completed';
  const isDone   = task.status === 'Completed';
  const dueLabel = task.due_date
    ? `<span class="due-tag ${isOverdue ? 'overdue' : ''}">📅 ${formatDate(task.due_date)}${isOverdue ? ' ⚠' : ''}</span>`
    : '';

  return `
    <li class="task-item priority-${task.priority} ${isDone ? 'completed' : ''}">
      <div class="task-check ${isDone ? 'checked' : ''}"
           onclick="toggleDone(${task.id})" title="${isDone ? 'Mark pending' : 'Mark complete'}">
        ${isDone ? '✓' : ''}
      </div>
      <div class="task-body">
        <div class="task-title">${escapeHTML(task.title)}</div>
        <div class="task-meta">
          <span class="badge badge-${task.priority}">${task.priority}</span>
          ${dueLabel}
        </div>
      </div>
      <div class="task-actions">
        <button class="icon-btn" onclick="openEdit(${task.id})" title="Edit">✏️</button>
        <button class="icon-btn del" onclick="deleteTask(${task.id})" title="Delete">🗑</button>
      </div>
    </li>`;
}

// ===== STATS =====
function updateStats() {
  const total   = tasks.length;
  const done    = tasks.filter(t => t.status === 'Completed').length;
  const pending = total - done;
  document.getElementById('totalCount').textContent   = total;
  document.getElementById('pendingCount').textContent = pending;
  document.getElementById('doneCount').textContent    = done;
}

// ===== HELPERS =====
function todayStr() {
  return new Date().toISOString().split('T')[0];
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[+m - 1]} ${+d}, ${y}`;
}

function escapeHTML(str) {
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
}

function showLoading(on) {
  const empty = document.getElementById('emptyState');
  if (on) {
    empty.style.display = 'block';
    empty.innerHTML = '<div class="empty-icon">⏳</div><p>Loading tasks...</p>';
  }
}

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2800);
}
