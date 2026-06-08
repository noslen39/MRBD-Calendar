const calendarScreen = document.getElementById("calendarScreen");
const addScreen = document.getElementById("addScreen");

const monthTitle = document.getElementById("monthTitle");
const rangeLabel = document.getElementById("rangeLabel");
const calendarGrid = document.getElementById("calendarGrid");
const selectedDateLabel = document.getElementById("selectedDateLabel");
const eventLabel = document.getElementById("eventLabel");
const addDateTitle = document.getElementById("addDateTitle");

const prevBtn = document.getElementById("prevBtn");
const todayBtn = document.getElementById("todayBtn");
const nextBtn = document.getElementById("nextBtn");
const addBtn = document.getElementById("addBtn");
const deleteBtn = document.getElementById("deleteBtn");

const storageKey = "rayban-calendar-events-v2";
const appStateKey = "rayban-calendar-ui-state-v1";
const maxVisibleCells = 35;
const eventTypes = ["work", "personal", "important", "urgent"];

const today = new Date();
today.setHours(0, 0, 0, 0);

const startDate = new Date(today.getFullYear(), today.getMonth(), 1);
const endDate = new Date(today.getFullYear() + 10, today.getMonth(), 1);

function loadUiState() {
  const raw = localStorage.getItem(appStateKey);

  if (!raw) return {};

  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function saveUiState() {
  const uiState = {
    visibleYear: state.visibleYear,
    visibleMonth: state.visibleMonth,
    selectedDate: toDateKey(state.selectedDate),
    selectedCellIndex: state.selectedCellIndex
  };

  localStorage.setItem(appStateKey, JSON.stringify(uiState));
}

function loadEvents() {
  const raw = localStorage.getItem(storageKey);

  if (!raw) return {};

  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function saveEvents() {
  localStorage.setItem(storageKey, JSON.stringify(state.events));
}

const savedUiState = loadUiState();

const state = {
  screen: "calendar",
  visibleYear: savedUiState.visibleYear ?? today.getFullYear(),
  visibleMonth: savedUiState.visibleMonth ?? today.getMonth(),
  selectedDate: savedUiState.selectedDate ? new Date(savedUiState.selectedDate) : new Date(today),
  focusArea: "grid",
  selectedCellIndex: savedUiState.selectedCellIndex ?? 0,
  events: loadEvents(),
  addIndex: 0
};

function toDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function isSameDay(a, b) {
  return toDateKey(a) === toDateKey(b);
}

function formatMonthTitle(year, month) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric"
  }).format(new Date(year, month, 1));
}

function formatFullDate(date) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(date);
}

function getMonthCells(year, month) {
  const firstOfMonth = new Date(year, month, 1);
  const startingDay = firstOfMonth.getDay();
  const gridStart = new Date(year, month, 1 - startingDay);

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);
    return date;
  });
}

function clampVisibleMonth() {
  const visible = new Date(state.visibleYear, state.visibleMonth, 1);

  if (visible < startDate) {
    state.visibleYear = startDate.getFullYear();
    state.visibleMonth = startDate.getMonth();
  }

  if (visible > endDate) {
    state.visibleYear = endDate.getFullYear();
    state.visibleMonth = endDate.getMonth();
  }
}

function getEventsForDate(date) {
  return state.events[toDateKey(date)] || [];
}

function getPrimaryEventType(date) {
  const events = getEventsForDate(date);
  return events[0]?.type || null;
}

function render() {
  requestAnimationFrame(() => {
    if (state.screen === "calendar") {
      renderCalendarScreen();
      saveUiState();
    }

    if (state.screen === "add") {
      renderAddScreen();
    }
  });
}

function renderCalendarScreen() {
  calendarScreen.classList.add("active");
  addScreen.classList.remove("active");

  clampVisibleMonth();

  monthTitle.textContent = formatMonthTitle(state.visibleYear, state.visibleMonth);
  rangeLabel.textContent = `${startDate.getFullYear()}–${endDate.getFullYear()} planner`;

  calendarGrid.innerHTML = "";

  const cells = getMonthCells(state.visibleYear, state.visibleMonth).slice(0, maxVisibleCells);

  if (state.selectedCellIndex >= cells.length) {
    state.selectedCellIndex = cells.length - 1;
  }

  cells.forEach((date, index) => {
    const button = document.createElement("button");
    const events = getEventsForDate(date);
    const primaryType = getPrimaryEventType(date);

    button.className = "day focusable";
    button.textContent = date.getDate();
    button.dataset.index = index;
    button.dataset.date = toDateKey(date);

    if (date.getMonth() !== state.visibleMonth) {
      button.classList.add("outside");
      button.setAttribute("aria-hidden", "true");
      button.tabIndex = -1;
    }

    if (isSameDay(date, today)) {
      button.classList.add("today");
    }

    if (events.length > 0) {
      button.classList.add("has-event", `event-${primaryType}`);
      button.setAttribute("aria-label", `${formatFullDate(date)}, ${events.length} events`);
    } else {
      button.setAttribute("aria-label", formatFullDate(date));
    }

    if (isSameDay(date, state.selectedDate)) {
      state.selectedCellIndex = index;
    }

    button.addEventListener("click", () => {
      state.selectedDate = new Date(date);
      state.focusArea = "grid";
      state.selectedCellIndex = index;
      render();
    });

    calendarGrid.appendChild(button);
  });

  updateDetails();
  updateSelectionStyles();
}

function renderAddScreen() {
  calendarScreen.classList.remove("active");
  addScreen.classList.add("active");

  addDateTitle.textContent = formatFullDate(state.selectedDate);

  const presetButtons = Array.from(document.querySelectorAll(".preset-btn"));

  presetButtons.forEach((button, index) => {
    button.classList.toggle("selected", index === state.addIndex);
  });
}

function updateDetails() {
  const events = getEventsForDate(state.selectedDate);

  selectedDateLabel.textContent = formatFullDate(state.selectedDate);

  if (events.length === 0) {
    eventLabel.textContent = "No events";
    return;
  }

  const first = events[0];
  const extraCount = events.length - 1;
  eventLabel.textContent =
    extraCount > 0
      ? `${first.label}: ${first.title} +${extraCount} more`
      : `${first.label}: ${first.title}`;
}

function clearSelectedClasses() {
  document.querySelectorAll(".selected").forEach((element) => {
    element.classList.remove("selected");
  });
}

function updateSelectionStyles() {
  clearSelectedClasses();

  if (state.focusArea === "top") {
    const topButtons = [prevBtn, todayBtn, nextBtn];
    topButtons[state.selectedCellIndex]?.classList.add("selected");
    return;
  }

  if (state.focusArea === "grid") {
    const dayButtons = Array.from(document.querySelectorAll(".day"));
    dayButtons[state.selectedCellIndex]?.classList.add("selected");
    return;
  }

  if (state.focusArea === "actions") {
    const actionButtons = [addBtn, deleteBtn];
    actionButtons[state.selectedCellIndex]?.classList.add("selected");
  }
}

function moveMonth(amount) {
  state.visibleMonth += amount;

  if (state.visibleMonth < 0) {
    state.visibleMonth = 11;
    state.visibleYear -= 1;
  }

  if (state.visibleMonth > 11) {
    state.visibleMonth = 0;
    state.visibleYear += 1;
  }

  clampVisibleMonth();

  state.selectedDate = new Date(state.visibleYear, state.visibleMonth, 1);
  state.focusArea = "grid";

  const cells = getMonthCells(state.visibleYear, state.visibleMonth).slice(0, maxVisibleCells);
  state.selectedCellIndex = cells.findIndex((date) =>
    date.getMonth() === state.visibleMonth && date.getDate() === 1
  );

  render();
}

function goToToday() {
  state.visibleYear = today.getFullYear();
  state.visibleMonth = today.getMonth();
  state.selectedDate = new Date(today);
  state.focusArea = "grid";
  render();
}

function openAddScreen() {
  state.screen = "add";
  state.addIndex = 0;
  render();
}

function closeAddScreen() {
  state.screen = "calendar";
  state.focusArea = "actions";
  state.selectedCellIndex = 0;
  render();
}

function addPresetEvent(title, type) {
  if (type === "cancel") {
    closeAddScreen();
    return;
  }

  const key = toDateKey(state.selectedDate);

  if (!state.events[key]) {
    state.events[key] = [];
  }

  state.events[key].push({
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    title,
    type: eventTypes.includes(type) ? type : "personal",
    label: type[0].toUpperCase() + type.slice(1)
  });

  saveEvents();
  closeAddScreen();
}

function deleteLatestEvent() {
  const key = toDateKey(state.selectedDate);
  const dayEvents = state.events[key];

  if (!dayEvents || dayEvents.length === 0) return;

  dayEvents.pop();

  if (dayEvents.length === 0) {
    delete state.events[key];
  }

  saveEvents();
  render();
}

function selectCurrent() {
  if (state.screen === "add") {
    const presetButtons = Array.from(document.querySelectorAll(".preset-btn"));
    const selected = presetButtons[state.addIndex];

    addPresetEvent(selected.dataset.title, selected.dataset.type);
    return;
  }

  if (state.focusArea === "top") {
    if (state.selectedCellIndex === 0) moveMonth(-1);
    if (state.selectedCellIndex === 1) goToToday();
    if (state.selectedCellIndex === 2) moveMonth(1);
    return;
  }

  if (state.focusArea === "grid") {
    const cells = getMonthCells(state.visibleYear, state.visibleMonth);
    const date = cells[state.selectedCellIndex];

    state.selectedDate = new Date(date);
    state.visibleYear = state.selectedDate.getFullYear();
    state.visibleMonth = state.selectedDate.getMonth();

    render();
    return;
  }

  if (state.focusArea === "actions") {
    if (state.selectedCellIndex === 0) openAddScreen();
    if (state.selectedCellIndex === 1) deleteLatestEvent();
  }
}

function moveGrid(direction) {
  if (direction === "left" && state.selectedCellIndex % 7 !== 0) {
    state.selectedCellIndex -= 1;
  }

  if (direction === "right" && state.selectedCellIndex % 7 !== 6) {
    state.selectedCellIndex += 1;
  }

  if (direction === "up") {
    if (state.selectedCellIndex <= 6) {
      state.focusArea = "top";
      state.selectedCellIndex = 1;
      updateSelectionStyles();
      return;
    }

    state.selectedCellIndex -= 7;
  }

  if (direction === "down") {
    if (state.selectedCellIndex >= maxVisibleCells - 7) {
      state.focusArea = "actions";
      state.selectedCellIndex = 0;
      updateSelectionStyles();
      return;
    }

    state.selectedCellIndex += 7;
  }

  const cells = getMonthCells(state.visibleYear, state.visibleMonth).slice(0, maxVisibleCells);
  state.selectedDate = new Date(cells[state.selectedCellIndex]);

  if (state.selectedDate.getMonth() !== state.visibleMonth) {
    state.visibleYear = state.selectedDate.getFullYear();
    state.visibleMonth = state.selectedDate.getMonth();

    state.selectedCellIndex = getMonthCells(state.visibleYear, state.visibleMonth)
      .slice(0, maxVisibleCells)
      .findIndex((date) => isSameDay(date, state.selectedDate));

    if (state.selectedCellIndex < 0) {
      state.selectedCellIndex = 0;
    }

    render();
    return;
  }

  updateDetails();
  updateSelectionStyles();
}

function moveTop(direction) {
  if (direction === "left" && state.selectedCellIndex > 0) {
    state.selectedCellIndex -= 1;
  }

  if (direction === "right" && state.selectedCellIndex < 2) {
    state.selectedCellIndex += 1;
  }

  if (direction === "down") {
    state.focusArea = "grid";
    state.selectedCellIndex = 0;
  }

  updateSelectionStyles();
}

function moveActions(direction) {
  if (direction === "left" && state.selectedCellIndex > 0) {
    state.selectedCellIndex -= 1;
  }

  if (direction === "right" && state.selectedCellIndex < 1) {
    state.selectedCellIndex += 1;
  }

  if (direction === "up") {
    state.focusArea = "grid";
    state.selectedCellIndex = maxVisibleCells - 7;
  }

  updateSelectionStyles();
}

function moveAddScreen(direction) {
  const presetButtons = Array.from(document.querySelectorAll(".preset-btn"));

  if (direction === "up" && state.addIndex > 0) {
    state.addIndex -= 1;
  }

  if (direction === "down" && state.addIndex < presetButtons.length - 1) {
    state.addIndex += 1;
  }

  if (direction === "left" || direction === "right") {
    closeAddScreen();
    return;
  }

  renderAddScreen();
}

function handleMove(direction) {
  if (state.screen === "add") {
    moveAddScreen(direction);
    return;
  }

  if (state.focusArea === "top") moveTop(direction);
  if (state.focusArea === "grid") moveGrid(direction);
  if (state.focusArea === "actions") moveActions(direction);
}

prevBtn.addEventListener("click", () => moveMonth(-1));
todayBtn.addEventListener("click", goToToday);
nextBtn.addEventListener("click", () => moveMonth(1));
addBtn.addEventListener("click", openAddScreen);
deleteBtn.addEventListener("click", deleteLatestEvent);

document.querySelectorAll(".preset-btn").forEach((button, index) => {
  button.addEventListener("click", () => {
    state.addIndex = index;
    addPresetEvent(button.dataset.title, button.dataset.type);
  });
});

document.addEventListener("keydown", (event) => {
  if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) {
    event.preventDefault();
  }

  if (event.key === "ArrowLeft") handleMove("left");
  if (event.key === "ArrowRight") handleMove("right");
  if (event.key === "ArrowUp") handleMove("up");
  if (event.key === "ArrowDown") handleMove("down");

  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    selectCurrent();
  }

  if (event.key === "Escape") {
    closeAddScreen();
  }
});

render();
