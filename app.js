const els = {
  gridScroll: document.getElementById("grid-scroll"),
  dayHeaders: document.getElementById("day-headers"),
  rows: document.getElementById("rows"),
  weekRange: document.getElementById("week-range"),
  prevWeek: document.getElementById("prev-week"),
  nextWeek: document.getElementById("next-week"),
  todayBtn: document.getElementById("today-btn"),
  empty: document.getElementById("empty"),
  emptyAdd: document.getElementById("empty-add"),
  addForm: document.getElementById("add-form"),
  newHabit: document.getElementById("new-habit"),
  syncError: document.getElementById("sync-error"),
  syncMessage: document.getElementById("sync-message"),
  syncRetry: document.getElementById("sync-retry"),
};

const state = {
  weekStart: startOfWeek(new Date()),
  habits: [],
  completions: {},
};

const fmtDow = new Intl.DateTimeFormat("fr-FR", { weekday: "short" });
const fmtDay = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
});
const fmtFull = new Intl.DateTimeFormat("fr-FR", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

function startOfWeek(date) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dow = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - dow);
  return d;
}

function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function dateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function shortDow(date) {
  return fmtDow.format(date).replace(".", "");
}

function isSameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function keyFor(habitId, date) {
  return `${dateKey(date)}|${habitId}`;
}

function formatRange(start) {
  const end = addDays(start, 6);
  const startParts = fmtDay.formatToParts(start);
  const endParts = fmtDay.formatToParts(end);
  const startDay = startParts.find((p) => p.type === "day").value;
  const startMonth = startParts.find((p) => p.type === "month").value;
  const endDay = endParts.find((p) => p.type === "day").value;
  const endMonth = endParts.find((p) => p.type === "month").value;
  const startYear = start.getFullYear();
  const endYear = end.getFullYear();

  if (startMonth === endMonth && startYear === endYear) {
    return `${startDay} – ${endDay} ${endMonth} ${endYear}`;
  }
  if (startYear === endYear) {
    return `${startDay} ${startMonth} – ${endDay} ${endMonth} ${endYear}`;
  }
  return `${startDay} ${startMonth} ${startYear} – ${endDay} ${endMonth} ${endYear}`;
}

function renderRange() {
  els.weekRange.textContent = formatRange(state.weekStart);
  const today = startOfWeek(new Date());
  els.todayBtn.disabled = isSameDay(state.weekStart, today);
}

function renderDayHeaders() {
  els.dayHeaders.innerHTML = "";
  for (let i = 0; i < 7; i++) {
    const date = addDays(state.weekStart, i);
    const div = document.createElement("div");
    div.className = "day" + (isSameDay(date, new Date()) ? " is-today" : "");
    div.setAttribute("role", "columnheader");
    if (isSameDay(date, new Date())) div.setAttribute("aria-current", "date");

    const dow = document.createElement("span");
    dow.className = "dow";
    dow.textContent = shortDow(date);

    const num = document.createElement("span");
    num.className = "num";
    num.textContent = date.getDate();

    div.append(dow, num);
    els.dayHeaders.appendChild(div);
  }
}

function countDone(habitId) {
  let n = 0;
  for (let i = 0; i < 7; i++) {
    if (state.completions[keyFor(habitId, addDays(state.weekStart, i))]) n++;
  }
  return n;
}

function makeToggle(habit, date) {
  const done = !!state.completions[keyFor(habit.id, date)];
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "toggle";
  btn.setAttribute("aria-pressed", String(done));
  btn.dataset.habit = habit.id;
  btn.dataset.date = dateKey(date);
  btn.setAttribute(
    "aria-label",
    `${habit.name}, ${fmtFull.format(date)} — ${done ? "réalisée" : "non réalisée"}`
  );
  btn.title = `${habit.name} — ${fmtFull.format(date)}`;

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 16 16");
  svg.setAttribute("class", "check");
  svg.setAttribute("aria-hidden", "true");
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", "M3.5 8.5 6.5 11.5 12.5 4.5");
  svg.appendChild(path);
  btn.appendChild(svg);
  return btn;
}

function makeDeleteBtn(habit) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "delete";
  btn.setAttribute("aria-label", `Supprimer l'habitude « ${habit.name} »`);
  btn.dataset.habit = habit.id;
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 16 16");
  svg.setAttribute("aria-hidden", "true");
  const p1 = document.createElementNS("http://www.w3.org/2000/svg", "path");
  p1.setAttribute("d", "M4 4l8 8M12 4l-8 8");
  svg.append(p1);
  btn.appendChild(svg);
  return btn;
}

function renderRows() {
  els.rows.innerHTML = "";
  state.habits.forEach((habit) => {
    const row = document.createElement("div");
    row.className = "row";
    row.setAttribute("role", "row");
    row.dataset.habit = habit.id;

    const nameCell = document.createElement("div");
    nameCell.className = "cell name";
    nameCell.setAttribute("role", "rowheader");

    const label = document.createElement("span");
    label.className = "name-label";
    label.textContent = habit.name;

    const count = document.createElement("span");
    count.className = "row-count";
    const done = countDone(habit.id);
    count.textContent = `${done}/7`;
    count.setAttribute(
      "aria-label",
      `${done} jour${done > 1 ? "s" : ""} réalisé${done > 1 ? "s" : ""} sur 7 cette semaine`
    );
    count.title = "Jours réalisés cette semaine";

    const del = makeDeleteBtn(habit);
    nameCell.append(label, count, del);
    row.appendChild(nameCell);

    for (let i = 0; i < 7; i++) {
      const cell = document.createElement("div");
      cell.className = "toggle-cell";
      cell.setAttribute("role", "gridcell");
      cell.appendChild(makeToggle(habit, addDays(state.weekStart, i)));
      row.appendChild(cell);
    }

    els.rows.appendChild(row);
  });
}

function render() {
  renderRange();
  renderDayHeaders();
  renderRows();
  const hasHabits = state.habits.length > 0;
  els.gridScroll.hidden = !hasHabits;
  els.empty.hidden = hasHabits;
  els.addForm.hidden = !hasHabits;
}

function showSyncError(message = "Connexion perdue, les changements ne sont pas enregistrés.") {
  els.syncMessage.textContent = message;
  els.syncError.hidden = false;
}

function hideSyncError() {
  els.syncError.hidden = true;
}

async function apiCall(path, opts) {
  try {
    const res = await fetch(path, {
      credentials: "same-origin",
      cache: "no-store",
      ...opts,
    });
    if (res.status === 401) {
      location.reload();
      return null;
    }
    return res;
  } catch (err) {
    return null;
  }
}

async function fetchState() {
  const res = await apiCall("/api/state");
  if (!res || !res.ok) {
    showSyncError(
      !res
        ? "Connexion perdue, les changements ne sont pas enregistrés."
        : res.status === 503
          ? "Service indisponible pour le moment. Réessayez."
          : "Impossible de charger vos habitudes. Réessayez."
    );
    return false;
  }
  const data = await res.json();
  state.habits = data.habits || [];
  state.completions = data.completions || {};
  hideSyncError();
  render();
  return true;
}

async function sendMutation(path, method) {
  const res = await apiCall(path, {
    method,
    headers: { "Content-Type": "application/json" },
  });
  if (!res) {
    showSyncError();
    return false;
  }
  if (!res.ok) {
    showSyncError(
      res.status === 503
        ? "Service indisponible pour le moment. Réessayez."
        : "Impossible d'enregistrer ce changement. Réessayez."
    );
    return false;
  }
  return fetchState();
}

async function handleToggle(btn) {
  const habitId = btn.dataset.habit;
  const date = btn.dataset.date;
  const done = btn.getAttribute("aria-pressed") === "true";
  btn.disabled = true;
  btn.classList.add("is-pending");
  btn.setAttribute("aria-busy", "true");
  const method = done ? "DELETE" : "PUT";
  const sent = await sendMutation(`/api/completions/${habitId}/${date}`, method);
  if (!sent) {
    btn.disabled = false;
    btn.classList.remove("is-pending");
    btn.removeAttribute("aria-busy");
  }
}

function confirmDelete(habitId, habitName, nameCell) {
  delete nameCell.dataset.resolved;
  nameCell.querySelector(".name-label").hidden = true;
  const count = nameCell.querySelector(".row-count");
  if (count) count.hidden = true;
  const del = nameCell.querySelector(".delete");
  if (del) del.hidden = true;

  const confirmBtn = document.createElement("button");
  confirmBtn.type = "button";
  confirmBtn.className = "delete-confirm";
  confirmBtn.textContent = `Supprimer « ${habitName} » ?`;
  confirmBtn.dataset.habit = habitId;
  nameCell.appendChild(confirmBtn);

  const revert = () => {
    if (nameCell.dataset.resolved) return;
    nameCell.dataset.resolved = "1";
    confirmBtn.remove();
    const label = nameCell.querySelector(".name-label");
    if (label) label.hidden = false;
    const c = nameCell.querySelector(".row-count");
    if (c) c.hidden = false;
    const d = nameCell.querySelector(".delete");
    if (d) d.hidden = false;
  };
  setTimeout(revert, 4000);

  confirmBtn.addEventListener("click", async () => {
    confirmBtn.disabled = true;
    confirmBtn.setAttribute("aria-busy", "true");
    const sent = await sendMutation(`/api/habits/${habitId}`, "DELETE");
    if (!sent) {
      confirmBtn.removeAttribute("aria-busy");
      revert();
    }
  });
  confirmBtn.addEventListener("keydown", (e) => {
    if (e.key === "Escape") revert();
  });
  confirmBtn.focus();
}

function handleDelete(btn) {
  const habitId = btn.dataset.habit;
  const habit = state.habits.find((h) => h.id === habitId);
  if (!habit) return;
  confirmDelete(habitId, habit.name, btn.closest(".name"));
}

async function addHabit(name) {
  const trimmed = name.trim();
  if (!trimmed) return;
  const submitBtn = els.addForm.querySelector("button[type=submit]");
  submitBtn.disabled = true;
  submitBtn.setAttribute("aria-busy", "true");
  const res = await apiCall("/api/habits", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: trimmed.slice(0, 60) }),
  });
  submitBtn.disabled = false;
  submitBtn.removeAttribute("aria-busy");
  if (!res) {
    showSyncError();
    return;
  }
  if (!res.ok) {
    showSyncError(
      res.status === 503
        ? "Service indisponible pour le moment. Réessayez."
        : "Impossible d'ajouter l'habitude. Réessayez."
    );
    return;
  }
  await fetchState();
  els.newHabit.value = "";
  els.newHabit.focus();
}

els.rows.addEventListener("click", (e) => {
  const toggle = e.target.closest(".toggle");
  if (toggle) {
    handleToggle(toggle);
    return;
  }
  const del = e.target.closest(".delete");
  if (del) handleDelete(del);
});

els.prevWeek.addEventListener("click", () => {
  state.weekStart = addDays(state.weekStart, -7);
  render();
});

els.nextWeek.addEventListener("click", () => {
  state.weekStart = addDays(state.weekStart, 7);
  render();
});

els.todayBtn.addEventListener("click", () => {
  state.weekStart = startOfWeek(new Date());
  render();
});

els.addForm.addEventListener("submit", (e) => {
  e.preventDefault();
  addHabit(els.newHabit.value);
});

els.emptyAdd.addEventListener("click", () => {
  els.empty.hidden = true;
  els.addForm.hidden = false;
  els.newHabit.focus();
});

els.syncRetry.addEventListener("click", () => {
  fetchState();
});

window.app = { loadState: fetchState };
