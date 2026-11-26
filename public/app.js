"use strict";

/* ============================================================
   Task Manager — web UI logic
   Talks to the Task Manager API with fetch + JWT (Bearer),
   token kept in localStorage. No build step, no dependencies.
   ============================================================ */

const STATUSES = ["todo", "in-progress", "done"];
const STATUS_LABELS = { "todo": "To Do", "in-progress": "In Progress", "done": "Done" };
const PRIORITY_LABELS = { low: "Low", medium: "Medium", high: "High" };
const PAGE_SIZE = 30;
const TOKEN_KEY = "tm_token";
const USER_KEY = "tm_user";

const state = {
  token: localStorage.getItem(TOKEN_KEY) || null,
  user: null,
  tasks: [],
  page: 1,
  totalPages: 1,
  total: 0,
  loading: false,
};
try {
  state.user = JSON.parse(localStorage.getItem(USER_KEY) || "null");
} catch (e) {
  state.user = null;
}

/* ---------------- DOM helpers ---------------- */
const $ = (sel) => document.querySelector(sel);

function escapeHtml(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function show(el) { el.classList.remove("hidden"); }
function hide(el) { el.classList.add("hidden"); }

let toastTimer = null;
function toast(message) {
  const el = $("#toast");
  el.textContent = message;
  show(el);
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => hide(el), 2600);
}

/* ---------------- Dates ----------------
   dueDate is a calendar date — read the YYYY-MM-DD part of the
   ISO string and build a local date so timezones never shift it. */
function dueDateOf(task) {
  if (!task.dueDate) return null;
  const parts = String(task.dueDate).slice(0, 10).split("-").map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return null;
  return new Date(parts[0], parts[1] - 1, parts[2]);
}

function formatDue(task) {
  const d = dueDateOf(task);
  if (!d) return "";
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

function isOverdue(task) {
  if (task.status === "done") return false;
  const d = dueDateOf(task);
  if (!d) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return d < today;
}

/* ---------------- API ---------------- */
async function api(path, options) {
  const opts = options || {};
  const headers = Object.assign({ "Content-Type": "application/json" }, opts.headers || {});
  if (state.token) headers.Authorization = "Bearer " + state.token;

  let res;
  try {
    res = await fetch(path, Object.assign({}, opts, { headers }));
  } catch (err) {
    throw new Error("Cannot reach the server. Check your connection and try again.");
  }

  let data = null;
  try { data = await res.json(); } catch (err) { /* non-JSON response */ }

  if (res.status === 401 && state.token) {
    // Token rejected while we thought we were logged in → session is over.
    expireSession();
    throw new Error("Your session has expired. Please log in again.");
  }
  if (!res.ok) {
    throw new Error((data && data.message) || "Request failed (" + res.status + ").");
  }
  return data;
}

function saveSession(user, token) {
  state.user = user;
  state.token = token;
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

function clearSession() {
  state.user = null;
  state.token = null;
  state.tasks = [];
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

function expireSession() {
  clearSession();
  showAuth("login");
  showAuthInfo("Your session has expired. Please log in again.");
}

/* ---------------- Auth view ---------------- */
function showAuth(tab) {
  hide($("#appView"));
  show($("#authView"));
  switchAuthTab(tab || "login");
}

function switchAuthTab(tab) {
  const isLogin = tab === "login";
  $("#tabLogin").classList.toggle("active", isLogin);
  $("#tabRegister").classList.toggle("active", !isLogin);
  $("#loginForm").classList.toggle("hidden", !isLogin);
  $("#registerForm").classList.toggle("hidden", isLogin);
  hideAuthAlerts();
}

function hideAuthAlerts() {
  hide($("#authError"));
  hide($("#authInfo"));
}

function showAuthError(message) {
  const el = $("#authError");
  el.textContent = message;
  hide($("#authInfo"));
  show(el);
}

function showAuthInfo(message) {
  const el = $("#authInfo");
  el.textContent = message;
  hide($("#authError"));
  show(el);
}

async function handleLogin(event) {
  event.preventDefault();
  hideAuthAlerts();
  const btn = $("#loginBtn");
  btn.disabled = true;
  btn.textContent = "Logging in…";
  try {
    const data = await api("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: $("#loginEmail").value.trim(),
        password: $("#loginPassword").value,
      }),
    });
    saveSession(data.user, data.token);
    $("#loginPassword").value = "";
    enterApp();
    toast(data.message || "Welcome back!");
  } catch (err) {
    showAuthError(err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = "Login";
  }
}

async function handleRegister(event) {
  event.preventDefault();
  hideAuthAlerts();
  const btn = $("#registerBtn");
  btn.disabled = true;
  btn.textContent = "Creating account…";
  try {
    const data = await api("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({
        username: $("#regUsername").value.trim(),
        email: $("#regEmail").value.trim(),
        password: $("#regPassword").value,
      }),
    });
    saveSession(data.user, data.token);
    $("#regPassword").value = "";
    enterApp();
    toast(data.message || "Account created — welcome!");
  } catch (err) {
    showAuthError(err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = "Create account";
  }
}

function handleLogout() {
  clearSession();
  $("#loginPassword").value = "";
  showAuth("login");
  showAuthInfo("You have been logged out.");
}

/* ---------------- App view ---------------- */
function enterApp() {
  hide($("#authView"));
  show($("#appView"));
  $("#userName").textContent = state.user ? state.user.username : "";
  $("#userEmail").textContent = state.user ? state.user.email : "";
  $("#searchInput").value = "";
  $("#priorityFilter").value = "";
  hide($("#boardError"));
  loadTasks(true);
}

function showBoardError(message) {
  const el = $("#boardError");
  el.textContent = message;
  show(el);
}

async function loadTasks(reset) {
  if (state.loading) return false;
  if (reset) {
    state.page = 1;
    state.tasks = [];
  }
  state.loading = true;
  hide($("#boardError"));
  if (state.tasks.length === 0) show($("#boardLoading"));

  try {
    const params = new URLSearchParams({
      page: String(state.page),
      limit: String(PAGE_SIZE),
    });
    const q = $("#searchInput").value.trim();
    if (q) params.set("search", q);
    const p = $("#priorityFilter").value;
    if (p) params.set("priority", p);

    const data = await api("/api/tasks?" + params.toString());
    state.tasks = reset ? data.tasks : state.tasks.concat(data.tasks);
    state.total = data.pagination.total;
    state.totalPages = data.pagination.totalPages;
    renderBoard();
    return true;
  } catch (err) {
    if (state.token) showBoardError(err.message); // token gone = session expired, auth view is showing
    return false;
  } finally {
    state.loading = false;
    hide($("#boardLoading"));
  }
}

async function loadMore() {
  if (state.loading || state.page >= state.totalPages) return;
  const previousPage = state.page;
  state.page += 1;
  const ok = await loadTasks(false);
  if (!ok) state.page = previousPage; // fetch failed — do not skip a page
}

/* ---------------- Rendering ---------------- */
function renderBoard() {
  const byStatus = { "todo": [], "in-progress": [], "done": [] };
  for (const task of state.tasks) {
    if (byStatus[task.status]) byStatus[task.status].push(task);
  }

  for (const status of STATUSES) {
    const col = $("#col-" + status);
    col.innerHTML = byStatus[status].map(taskCardHtml).join("");
    $("#count-" + status).textContent = byStatus[status].length;
    $("#empty-" + status).classList.toggle("hidden", byStatus[status].length > 0);
  }

  // Stats from the loaded tasks
  $("#statTotal").textContent = state.tasks.length;
  $("#statTodo").textContent = byStatus["todo"].length;
  $("#statInProgress").textContent = byStatus["in-progress"].length;
  $("#statDone").textContent = byStatus["done"].length;
  $("#statOverdue").textContent = state.tasks.filter(isOverdue).length;

  // Board-level empty state
  const noTasks = state.tasks.length === 0;
  const filtersActive = $("#searchInput").value.trim() !== "" || $("#priorityFilter").value !== "";
  $("#board").classList.toggle("hidden", noTasks);
  $("#boardEmpty").classList.toggle("hidden", !noTasks);
  if (noTasks) {
    $("#boardEmptyTitle").textContent = filtersActive ? "No tasks match" : "No tasks yet";
    $("#boardEmptyText").textContent = filtersActive
      ? "Nothing matches your current search or filter. Try clearing them."
      : "Create your first task and it will appear on this board.";
    $("#emptyCreateBtn").classList.toggle("hidden", filtersActive);
  }

  // Pagination row
  $("#showingText").textContent = state.total > 0
    ? "Showing " + state.tasks.length + " of " + state.total + " tasks"
    : "";
  $("#loadMoreBtn").classList.toggle("hidden", !(state.page < state.totalPages));
}

function taskCardHtml(task) {
  const overdue = isOverdue(task);
  const due = formatDue(task);
  let dueHtml = "";
  if (due) {
    const cls = task.status === "done" ? "due due-done" : overdue ? "due due-overdue" : "due";
    const label = overdue ? "Overdue · " + due : "Due " + due;
    dueHtml = '<span class="' + cls + '">' + escapeHtml(label) + "</span>";
  }
  const options = STATUSES.map(function (s) {
    return '<option value="' + s + '"' + (s === task.status ? " selected" : "") + ">" +
      STATUS_LABELS[s] + "</option>";
  }).join("");

  return (
    '<article class="card" data-id="' + escapeHtml(task._id) + '">' +
      '<div class="card-top">' +
        '<span class="badge priority-' + escapeHtml(task.priority) + '">' +
          escapeHtml(PRIORITY_LABELS[task.priority] || task.priority) + "</span>" +
        dueHtml +
      "</div>" +
      '<h4 class="card-title">' + escapeHtml(task.title) + "</h4>" +
      (task.description
        ? '<p class="card-desc">' + escapeHtml(task.description) + "</p>"
        : "") +
      '<div class="card-actions">' +
        '<select class="status-select" aria-label="Move task to another status">' + options + "</select>" +
        '<button type="button" class="btn btn-small btn-secondary edit-btn">Edit</button>' +
        '<button type="button" class="btn btn-small btn-danger delete-btn">Delete</button>' +
      "</div>" +
    "</article>"
  );
}

/* ---------------- Board actions (event delegation) ---------------- */
async function handleStatusChange(select) {
  const card = select.closest(".card");
  const id = card.getAttribute("data-id");
  const task = state.tasks.find((t) => t._id === id);
  const newStatus = select.value;
  if (!task || task.status === newStatus) return;
  select.disabled = true;
  try {
    const data = await api("/api/tasks/" + id, {
      method: "PATCH",
      body: JSON.stringify({ status: newStatus }),
    });
    toast(data.message || "Task moved.");
    loadTasks(true);
  } catch (err) {
    if (state.token) showBoardError(err.message);
    select.value = task.status;
    select.disabled = false;
  }
}

async function handleDelete(button) {
  const card = button.closest(".card");
  const id = card.getAttribute("data-id");
  const task = state.tasks.find((t) => t._id === id);
  const name = task ? task.title : "this task";
  if (!window.confirm('Delete "' + name + '"? This cannot be undone.')) return;
  button.disabled = true;
  try {
    const data = await api("/api/tasks/" + id, { method: "DELETE" });
    toast(data.message || "Task deleted.");
    loadTasks(true);
  } catch (err) {
    if (state.token) showBoardError(err.message);
    button.disabled = false;
  }
}

/* ---------------- Task modal ---------------- */
function openModal(task) {
  hide($("#modalError"));
  $("#taskForm").reset();
  if (task) {
    $("#modalTitle").textContent = "Edit Task";
    $("#taskId").value = task._id;
    $("#fTitle").value = task.title || "";
    $("#fDescription").value = task.description || "";
    $("#fStatus").value = task.status || "todo";
    $("#fPriority").value = task.priority || "medium";
    $("#fDueDate").value = task.dueDate ? String(task.dueDate).slice(0, 10) : "";
  } else {
    $("#modalTitle").textContent = "New Task";
    $("#taskId").value = "";
    $("#fStatus").value = "todo";
    $("#fPriority").value = "medium";
  }
  show($("#taskModal"));
  $("#fTitle").focus();
}

function closeModal() {
  hide($("#taskModal"));
}

function showModalError(message) {
  const el = $("#modalError");
  el.textContent = message;
  show(el);
}

async function handleTaskSubmit(event) {
  event.preventDefault();
  hide($("#modalError"));

  const title = $("#fTitle").value.trim();
  if (!title) {
    showModalError("Title is required.");
    $("#fTitle").focus();
    return;
  }
  const payload = {
    title: title,
    description: $("#fDescription").value.trim(),
    status: $("#fStatus").value,
    priority: $("#fPriority").value,
    dueDate: $("#fDueDate").value || null,
  };
  const id = $("#taskId").value;

  const btn = $("#saveTaskBtn");
  btn.disabled = true;
  btn.textContent = "Saving…";
  try {
    const data = id
      ? await api("/api/tasks/" + id, { method: "PATCH", body: JSON.stringify(payload) })
      : await api("/api/tasks", { method: "POST", body: JSON.stringify(payload) });
    closeModal();
    toast(data.message || "Task saved.");
    loadTasks(true);
  } catch (err) {
    if (state.token) {
      showModalError(err.message);
    } else {
      closeModal(); // session expired — auth view is already showing the message
    }
  } finally {
    btn.disabled = false;
    btn.textContent = "Save task";
  }
}

/* ---------------- Wiring ---------------- */
function init() {
  $("#tabLogin").addEventListener("click", () => switchAuthTab("login"));
  $("#tabRegister").addEventListener("click", () => switchAuthTab("register"));
  $("#goRegister").addEventListener("click", (e) => { e.preventDefault(); switchAuthTab("register"); });
  $("#goLogin").addEventListener("click", (e) => { e.preventDefault(); switchAuthTab("login"); });
  $("#loginForm").addEventListener("submit", handleLogin);
  $("#registerForm").addEventListener("submit", handleRegister);
  $("#logoutBtn").addEventListener("click", handleLogout);

  let searchTimer = null;
  $("#searchInput").addEventListener("input", () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => loadTasks(true), 300);
  });
  $("#priorityFilter").addEventListener("change", () => loadTasks(true));
  $("#loadMoreBtn").addEventListener("click", loadMore);
  $("#newTaskBtn").addEventListener("click", () => openModal(null));
  $("#emptyCreateBtn").addEventListener("click", () => openModal(null));

  const board = $("#board");
  board.addEventListener("change", (e) => {
    if (e.target.classList.contains("status-select")) handleStatusChange(e.target);
  });
  board.addEventListener("click", (e) => {
    const editBtn = e.target.closest(".edit-btn");
    if (editBtn) {
      const id = editBtn.closest(".card").getAttribute("data-id");
      const task = state.tasks.find((t) => t._id === id);
      if (task) openModal(task);
      return;
    }
    const deleteBtn = e.target.closest(".delete-btn");
    if (deleteBtn) handleDelete(deleteBtn);
  });

  $("#modalClose").addEventListener("click", closeModal);
  $("#cancelBtn").addEventListener("click", closeModal);
  $("#taskModal").addEventListener("click", (e) => {
    if (e.target === e.currentTarget) closeModal();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !$("#taskModal").classList.contains("hidden")) closeModal();
  });
  $("#taskForm").addEventListener("submit", handleTaskSubmit);

  boot();
}

/* ---------------- Boot ---------------- */
async function boot() {
  if (!state.token) {
    showAuth("login");
    return;
  }
  // We have a stored token — verify it before opening the board.
  try {
    const data = await api("/api/auth/profile");
    state.user = data.user;
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));
    enterApp();
  } catch (err) {
    // 401 already routed through expireSession() inside api().
    if (state.token) {
      // Server/network problem, token may still be valid — fall back to login.
      showAuth("login");
      showAuthError(err.message);
    }
  }
}

init();
