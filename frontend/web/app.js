const API_BASE_URL = window.__APP_CONFIG__?.API_BASE_URL || "http://localhost:3001/api";

const state = {
  today: null,
  history: [],
  items: [],
  stats: null,
  selectedCalendarRecord: null,
  saving: false,
};

const els = {
  todayDate: document.querySelector("#todayDate"),
  headerStreak: document.querySelector("#headerStreak"),
  statusLine: document.querySelector("#statusLine"),
  todayRate: document.querySelector("#todayRate"),
  streakDays: document.querySelector("#streakDays"),
  encouragement: document.querySelector("#encouragement"),
  taskCount: document.querySelector("#taskCount"),
  taskList: document.querySelector("#taskList"),
  completionFeedback: document.querySelector("#completionFeedback"),
  calendarTitle: document.querySelector("#calendarTitle"),
  calendarGrid: document.querySelector("#calendarGrid"),
  calendarDetail: document.querySelector("#calendarDetail"),
  aiDetails: document.querySelector("#aiDetails"),
  aiTopic: document.querySelector("#aiTopic"),
  aiMinutes: document.querySelector("#aiMinutes"),
  dailyGain: document.querySelector("#dailyGain"),
  weight: document.querySelector("#weight"),
  generateSummary: document.querySelector("#generateSummary"),
  aiSummary: document.querySelector("#aiSummary"),
  historyCount: document.querySelector("#historyCount"),
  historyList: document.querySelector("#historyList"),
  statsStreak: document.querySelector("#statsStreak"),
  statsSevenRate: document.querySelector("#statsSevenRate"),
  statsAiCount: document.querySelector("#statsAiCount"),
  statsWeight: document.querySelector("#statsWeight"),
  sevenDays: document.querySelector("#sevenDays"),
  weightTrend7: document.querySelector("#weightTrend7"),
  weightTrend30: document.querySelector("#weightTrend30"),
  newItemName: document.querySelector("#newItemName"),
  addItem: document.querySelector("#addItem"),
  itemList: document.querySelector("#itemList"),
};

const completionFeedback = new window.CompletionFeedback(els.completionFeedback);

function toDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDate(dateKey) {
  const date = new Date(`${dateKey}T00:00:00`);
  return new Intl.DateTimeFormat("zh-CN", {
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(date);
}

function completedCount(record) {
  return activeDefaultItems().filter((item) => record?.tasks?.[item.id]).length;
}

function completionRate(record) {
  if (!record) return 0;
  return Math.round((completedCount(record) / Math.max(activeDefaultItems().length, 1)) * 100);
}

function activeDefaultItems() {
  return state.items.filter((item) => item.enabled && item.isDefault).sort((a, b) => a.sortOrder - b.sortOrder);
}

function getEncouragement(rate) {
  if (rate === 100) return "今天完成得很漂亮，继续保持。";
  if (rate >= 75) return "已经接近满格，再补一小步。";
  if (rate >= 40) return "节奏不错，先把最容易的做完。";
  if (rate > 0) return "已经开始了，这就是今天的势能。";
  return "从一个小动作开始。";
}

async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    ...options,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error?.message || "请求失败");
  }
  return payload.data;
}

async function loadAll() {
  setStatus("正在连接后端...");
  try {
    const [items, today, history, stats] = await Promise.all([
      apiRequest("/items"),
      apiRequest("/checkin/today"),
      apiRequest("/checkin/history"),
      apiRequest("/stats"),
    ]);
    state.items = items;
    state.today = today;
    state.history = history;
    state.stats = stats;
    setStatus("已连接后端，数据保存到数据库。");
    render();
  } catch (error) {
    setStatus(`后端连接失败：${error.message}`, true);
    renderTasks(state.today);
  }
}

async function saveToday({ silent = true } = {}) {
  if (!state.today || state.saving) return;

  state.saving = true;
  updateControls();
  if (!silent) setStatus("正在保存...");

  try {
    state.today = await apiRequest("/checkin", {
      method: "POST",
      body: JSON.stringify(state.today),
    });
    const [history, stats] = await Promise.all([apiRequest("/checkin/history"), apiRequest("/stats")]);
    state.history = history;
    state.stats = stats;
    setStatus("已保存到数据库。");
  } catch (error) {
    setStatus(`保存失败：${error.message}`, true);
  } finally {
    state.saving = false;
    render();
  }
}

function updateToday(updater) {
  if (!state.today) return;
  updater(state.today);
  render();
  saveToday();
}

function setStatus(message, isError = false) {
  els.statusLine.textContent = message;
  els.statusLine.classList.toggle("is-error", isError);
}

function bindEvents() {
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", () => switchView(tab.dataset.view));
  });

  els.aiTopic.addEventListener("change", () => {
    updateToday((record) => {
      record.aiTopic = els.aiTopic.value.trim();
    });
  });

  els.aiMinutes.addEventListener("change", () => {
    updateToday((record) => {
      record.aiMinutes = els.aiMinutes.value;
    });
  });

  els.dailyGain.addEventListener("change", () => {
    updateToday((record) => {
      record.dailyGain = els.dailyGain.value.trim();
    });
  });

  els.weight.addEventListener("change", () => {
    updateToday((record) => {
      record.weight = els.weight.value;
    });
  });

  els.generateSummary.addEventListener("click", async () => {
    if (!state.today) return;
    await saveToday({ silent: false });
    setStatus("正在生成 AI 总结...");
    try {
      const result = await apiRequest("/summary", {
        method: "POST",
        body: JSON.stringify({ date: state.today.date }),
      });
      state.today = result.record;
      const [history, stats] = await Promise.all([apiRequest("/checkin/history"), apiRequest("/stats")]);
      state.history = history;
      state.stats = stats;
      setStatus("AI 总结已生成。");
    } catch (error) {
      setStatus(`总结生成失败：${error.message}`, true);
    }
    render();
  });

  els.addItem.addEventListener("click", async () => {
    const name = els.newItemName.value.trim();
    if (!name) return;
    try {
      await apiRequest("/items", {
        method: "POST",
        body: JSON.stringify({ name, enabled: true, isDefault: true, sortOrder: nextSortOrder() }),
      });
      els.newItemName.value = "";
      await reloadItemsAndData();
      setStatus("打卡项已新增。");
    } catch (error) {
      setStatus(`新增失败：${error.message}`, true);
    }
  });
}

async function reloadItemsAndData() {
  const [items, today, history, stats] = await Promise.all([
    apiRequest("/items"),
    apiRequest("/checkin/today"),
    apiRequest("/checkin/history"),
    apiRequest("/stats"),
  ]);
  state.items = items;
  state.today = today;
  state.history = history;
  state.stats = stats;
  render();
}

function nextSortOrder() {
  return Math.max(0, ...state.items.map((item) => Number(item.sortOrder) || 0)) + 10;
}

function switchView(viewName) {
  render();
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.classList.toggle("is-active", tab.dataset.view === viewName);
  });
  document.querySelectorAll(".view").forEach((view) => {
    view.classList.toggle("is-active", view.id === `${viewName}View`);
  });
}

function updateControls() {
  const disabled = !state.today || state.saving;
  document.querySelectorAll("button, input, textarea").forEach((control) => {
    control.disabled = disabled;
  });
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.disabled = false;
  });
}

function renderTasks(record) {
  els.taskList.innerHTML = "";

  activeDefaultItems().forEach((item) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `task-row${record?.tasks?.[item.id] ? " is-done" : ""}`;
    button.innerHTML = `<strong>${item.name}</strong><span>${record?.tasks?.[item.id] ? "已完成" : "未完成"}</span>`;
    button.addEventListener("click", () => {
      const willComplete = !state.today?.tasks?.[item.id];
      updateToday((today) => {
        today.tasks[item.id] = !today.tasks[item.id];
      });
      if (willComplete) {
        completionFeedback.play({ message: "已完成" });
      }
    });
    els.taskList.appendChild(button);
  });
}

function renderToday() {
  const record = state.today;
  const done = completedCount(record);
  const rate = completionRate(record);
  const streak = state.stats?.streak || 0;

  els.todayDate.textContent = record?.date ? formatDate(record.date) : formatDate(toDateKey(new Date()));
  els.headerStreak.textContent = streak;
  els.todayRate.textContent = `${rate}%`;
  els.streakDays.textContent = `${streak} 天`;
  els.encouragement.textContent = getEncouragement(rate);
  els.taskCount.textContent = `${done}/${activeDefaultItems().length}`;
  els.aiDetails.classList.toggle("is-visible", Boolean(record?.tasks?.learning));
  els.aiTopic.value = record?.aiTopic || "";
  els.aiMinutes.value = record?.aiMinutes || "";
  els.dailyGain.value = record?.dailyGain || "";
  els.weight.value = record?.weight || "";
  els.aiSummary.textContent = record?.aiSummary || "点击按钮生成一句今日总结。";
  renderTasks(record);
  renderCalendar(record);
}

function renderHistory() {
  const records = state.history || [];
  els.historyCount.textContent = `${records.length} 天`;
  els.historyList.innerHTML = "";

  if (!records.length) {
    els.historyList.innerHTML = '<div class="empty-state">暂无历史记录</div>';
    return;
  }

  records.forEach((record) => {
    const item = document.createElement("article");
    item.className = "history-item";
    const taskItems = record.taskItems || activeDefaultItems().map((task) => ({ ...task, done: record.tasks?.[task.id] }));
    const doneTasks = taskItems.filter((task) => task.done).map((task) => task.name);
    const tags = taskItems.map(
      (task) => `<span class="task-tag${task.done ? " is-done" : ""}">${task.name}</span>`,
    ).join("");
    const aiLine = record.tasks?.learning
      ? `学习：${record.aiTopic || "已完成"}${record.aiMinutes ? `，${record.aiMinutes} 分钟` : ""}`
      : "学习：未完成";

    item.innerHTML = `
      <div class="history-head">
        <strong>${formatDate(record.date)}</strong>
        <span class="rate-badge">${completionRate(record)}%</span>
      </div>
      <div class="task-tags">${tags}</div>
      <div class="history-detail">
        <div>完成：${doneTasks.length ? doneTasks.join("、") : "暂无"}</div>
        <div>${aiLine}</div>
        ${record.weight !== "" ? `<div>体重：${record.weight}kg</div>` : ""}
        ${record.dailyGain ? `<div>收获：${record.dailyGain}</div>` : ""}
        ${record.aiSummary ? `<div>总结：${record.aiSummary}</div>` : ""}
      </div>
    `;
    els.historyList.appendChild(item);
  });
}

function renderStats() {
  const stats = state.stats || {
    streak: 0,
    sevenDayAverage: 0,
    learningCompletedCount: 0,
    weightChange: { label: "暂无" },
    sevenDays: [],
  };

  els.statsStreak.textContent = stats.streak;
  els.statsSevenRate.textContent = `${stats.sevenDayAverage}%`;
  els.statsAiCount.textContent = stats.learningCompletedCount ?? stats.aiCompletedCount;
  els.statsWeight.textContent = stats.weightChange?.label || "暂无";
  els.sevenDays.innerHTML = "";
  els.weightTrend7.innerHTML = renderWeightTrend(stats.weightTrend7);
  els.weightTrend30.innerHTML = renderWeightTrend(stats.weightTrend30);

  stats.sevenDays
    .slice()
    .reverse()
    .forEach((item) => {
      const row = document.createElement("div");
      row.className = "day-line";
      row.innerHTML = `
        <span>${item.date.slice(5)}</span>
        <div class="bar" aria-label="${item.date} 完成率 ${item.rate}%"><span style="width:${item.rate}%"></span></div>
        <strong>${item.rate}%</strong>
      `;
      els.sevenDays.appendChild(row);
    });
}

function renderCalendar(record) {
  if (!record) {
    els.calendarGrid.innerHTML = "";
    return;
  }

  const date = new Date(`${record.date}T00:00:00`);
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const historyByDate = new Map((state.history || []).map((item) => [item.date, item]));
  historyByDate.set(record.date, record);

  els.calendarTitle.textContent = `${year}年${month + 1}月`;
  els.calendarGrid.innerHTML = "";

  for (let index = 0; index < firstDay.getDay(); index += 1) {
    const empty = document.createElement("span");
    empty.className = "calendar-day is-empty";
    els.calendarGrid.appendChild(empty);
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const dateKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const dayRecord = historyByDate.get(dateKey);
    const checkedIn = Boolean(dayRecord && Object.values(dayRecord.tasks || {}).some(Boolean));
    const weightMeta = getWeightMeta(dateKey, historyByDate);
    const item = document.createElement("span");
    item.className = `calendar-day${checkedIn ? " is-checked" : ""}${dateKey === record.date ? " is-today" : ""}`;
    item.innerHTML = `${day}${weightMeta ? `<small class="${weightMeta.className}">${weightMeta.label}</small>` : ""}`;
    item.title = `${dateKey}${checkedIn ? " 已打卡" : ""}`;
    item.addEventListener("click", () => selectCalendarDate(dateKey));
    els.calendarGrid.appendChild(item);
  }

  renderCalendarDetail(state.selectedCalendarRecord || record);
}

async function selectCalendarDate(dateKey) {
  try {
    state.selectedCalendarRecord = await apiRequest(`/checkin/${dateKey}`);
    renderCalendarDetail(state.selectedCalendarRecord);
  } catch (error) {
    setStatus(`读取日期失败：${error.message}`, true);
  }
}

function renderCalendarDetail(record) {
  if (!record) {
    els.calendarDetail.innerHTML = "";
    return;
  }
  const taskItems = record.taskItems || [];
  const done = taskItems.filter((item) => item.done).map((item) => item.name);
  els.calendarDetail.innerHTML = `
    <strong>${formatDate(record.date)}</strong>
    <div>完成：${done.length ? done.join("、") : "暂无"}</div>
    <div>体重：${record.weight !== "" ? `${record.weight}kg` : "未记录"}</div>
    ${record.aiTopic ? `<div>学习：${record.aiTopic}${record.aiMinutes ? `，${record.aiMinutes} 分钟` : ""}</div>` : ""}
    ${record.dailyGain ? `<div>收获：${record.dailyGain}</div>` : ""}
  `;
}

function getWeightMeta(dateKey, historyByDate) {
  const record = historyByDate.get(dateKey);
  if (!record || record.weight === "") return null;

  const previousRecord = Array.from(historyByDate.values())
    .filter((item) => item.date < dateKey && item.weight !== "")
    .sort((a, b) => b.date.localeCompare(a.date))[0];
  const weight = Number(record.weight);
  const previousWeight = previousRecord ? Number(previousRecord.weight) : weight;
  const diff = Number((weight - previousWeight).toFixed(1));
  const arrow = diff > 0 ? "📈" : diff < 0 ? "📉" : "➖";
  const className = diff > 0 ? "weight-up" : diff < 0 ? "weight-down" : "";
  return { label: `${arrow}${weight}kg`, className };
}

function renderWeightTrend(items = []) {
  if (!items.length) return '<div class="empty-state">暂无体重记录</div>';
  return items
    .slice()
    .reverse()
    .map((item) => {
      const arrow = item.direction === "up" ? "📈" : item.direction === "down" ? "📉" : "➖";
      return `<div class="weight-row"><span>${item.date}</span><span>${arrow} ${item.weight}kg</span></div>`;
    })
    .join("");
}

function renderItems() {
  els.itemList.innerHTML = "";
  state.items.forEach((item) => {
    const row = document.createElement("div");
    row.className = "item-row";
    row.innerHTML = `
      <div class="item-main">
        <input class="item-name-input" value="${escapeHtml(item.name)}" data-field="name" />
        <small>${item.enabled ? "启用" : "停用"} · ${item.isDefault ? "默认显示" : "非默认"} · 排序 ${item.sortOrder}</small>
      </div>
      <div class="item-actions">
        <button class="mini-btn" data-action="save">保存</button>
        <button class="mini-btn" data-action="enabled">${item.enabled ? "停用" : "启用"}</button>
        <button class="mini-btn" data-action="default">${item.isDefault ? "取消默认" : "设为默认"}</button>
        <button class="mini-btn is-muted" data-action="up">上移</button>
        <button class="mini-btn is-muted" data-action="down">下移</button>
        <button class="mini-btn is-muted" data-action="delete">删除</button>
      </div>
    `;
    row.querySelectorAll("button").forEach((button) => {
      button.addEventListener("click", () => handleItemAction(item, row, button.dataset.action));
    });
    els.itemList.appendChild(row);
  });
}

async function handleItemAction(item, row, action) {
  const name = row.querySelector(".item-name-input").value.trim();
  const payload = {};
  if (action === "save") payload.name = name;
  if (action === "enabled") payload.enabled = !item.enabled;
  if (action === "default") payload.isDefault = !item.isDefault;
  if (action === "up") payload.sortOrder = item.sortOrder - 15;
  if (action === "down") payload.sortOrder = item.sortOrder + 15;

  try {
    if (action === "delete") {
      await apiRequest(`/items/${encodeURIComponent(item.id)}`, { method: "DELETE" });
    } else {
      await apiRequest(`/items/${encodeURIComponent(item.id)}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
    }
    await reloadItemsAndData();
    setStatus("打卡项已更新。");
  } catch (error) {
    setStatus(`更新失败：${error.message}`, true);
  }
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  })[char]);
}

function render() {
  renderToday();
  renderHistory();
  renderStats();
  renderItems();
  updateControls();
}

bindEvents();
loadAll();
