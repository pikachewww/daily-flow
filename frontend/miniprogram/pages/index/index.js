const { request } = require("../../utils/api");

Page({
  data: {
    viewName: "today",
    today: { tasks: {} },
    history: [],
    items: [],
    stats: { streak: 0, sevenDays: [], weightChange: { label: "暂无" } },
    taskList: [],
    taskTotal: 0,
    doneCount: 0,
    todayRate: 0,
    calendarDays: [],
    calendarTitle: "",
    selectedRecord: null,
    newItemName: "",
    completionFeedbackVisible: false,
    completionFeedbackMessage: "已完成",
    completionFeedbackIcon: ""
  },

  onLoad() {
    this.loadAll();
  },

  async loadAll() {
    try {
      const [items, today, history, stats] = await Promise.all([
        request("/items"),
        request("/checkin/today"),
        request("/checkin/history"),
        request("/stats")
      ]);
      this.applyData(items, today, history, stats);
    } catch (error) {
      wx.showToast({ title: error.message, icon: "none" });
    }
  },

  applyData(items, today, history, stats) {
    const activeItems = this.activeItems(items);
    const doneCount = activeItems.filter((item) => today.tasks?.[item.id]).length;
    const taskList = activeItems.map((item) => ({ ...item, done: Boolean(today.tasks?.[item.id]) }));
    const mappedHistory = history.map((item) => ({
      ...item,
      rate: Math.round((activeItems.filter((task) => item.tasks?.[task.id]).length / Math.max(activeItems.length, 1)) * 100),
      aiLine: item.tasks?.learning
        ? `${item.aiTopic || "已完成"}${item.aiMinutes ? `，${item.aiMinutes} 分钟` : ""}`
        : "未完成"
    }));
    this.setData({
      today,
      items,
      history: mappedHistory,
      stats,
      taskList,
      taskTotal: activeItems.length,
      doneCount,
      todayRate: Math.round((doneCount / Math.max(activeItems.length, 1)) * 100),
      calendarDays: this.buildCalendar(today, mappedHistory),
      calendarTitle: this.formatCalendarTitle(today.date),
      selectedRecord: today
    });
  },

  activeItems(items = this.data.items) {
    return items.filter((item) => item.enabled && item.isDefault).sort((a, b) => a.sortOrder - b.sortOrder);
  },

  switchView(event) {
    this.setData({ viewName: event.currentTarget.dataset.view });
  },

  async toggleTask(event) {
    const name = event.currentTarget.dataset.name;
    const willComplete = !this.data.today.tasks?.[name];
    const today = {
      ...this.data.today,
      tasks: {
        ...this.data.today.tasks,
        [name]: !this.data.today.tasks?.[name]
      }
    };
    await this.saveToday(today);
    if (willComplete) {
      this.playCompletionFeedback();
    }
  },

  async onFieldBlur(event) {
    const field = event.currentTarget.dataset.field;
    const today = { ...this.data.today, [field]: event.detail.value };
    await this.saveToday(today);
  },

  async saveToday(today) {
    try {
      const saved = await request("/checkin", { method: "POST", data: today });
      const [items, history, stats] = await Promise.all([request("/items"), request("/checkin/history"), request("/stats")]);
      this.applyData(items, saved, history, stats);
    } catch (error) {
      wx.showToast({ title: error.message, icon: "none" });
    }
  },

  async generateSummary() {
    try {
      const result = await request("/summary", {
        method: "POST",
        data: { date: this.data.today.date }
      });
      const [history, stats] = await Promise.all([request("/checkin/history"), request("/stats")]);
      const items = await request("/items");
      this.applyData(items, result.record, history, stats);
    } catch (error) {
      wx.showToast({ title: error.message, icon: "none" });
    }
  },

  buildCalendar(today, history) {
    const todayDate = new Date(`${today.date}T00:00:00`);
    const year = todayDate.getFullYear();
    const month = todayDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const historyByDate = {};

    history.forEach((record) => {
      historyByDate[record.date] = record;
    });
    historyByDate[today.date] = today;

    const days = [];
    for (let index = 0; index < firstDay.getDay(); index += 1) {
      days.push({ key: `empty-${index}`, label: "", empty: true });
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
      const date = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const record = historyByDate[date];
      const checkedIn = Boolean(record && Object.values(record.tasks || {}).some(Boolean));
      const weightMeta = this.getWeightMeta(date, historyByDate);
      days.push({
        key: date,
        date,
        label: day,
        checkedIn,
        isToday: date === today.date,
        weightLabel: weightMeta.label,
        weightClass: weightMeta.className
      });
    }

    return days;
  },

  formatCalendarTitle(dateKey) {
    const [year, month] = dateKey.split("-");
    return `${year}年${Number(month)}月`;
  },

  playCompletionFeedback() {
    this.setData({ completionFeedbackVisible: false });
    clearTimeout(this.completionFeedbackTimer);
    setTimeout(() => {
      this.setData({
        completionFeedbackVisible: true,
        completionFeedbackMessage: "已完成"
      });
      this.completionFeedbackTimer = setTimeout(() => {
        this.setData({ completionFeedbackVisible: false });
      }, 980);
    }, 16);
  },

  getWeightMeta(date, historyByDate) {
    const record = historyByDate[date];
    if (!record || record.weight === "") return {};
    const previous = Object.values(historyByDate)
      .filter((item) => item.date < date && item.weight !== "")
      .sort((a, b) => b.date.localeCompare(a.date))[0];
    const weight = Number(record.weight);
    const previousWeight = previous ? Number(previous.weight) : weight;
    const diff = Number((weight - previousWeight).toFixed(1));
    const arrow = diff > 0 ? "📈" : diff < 0 ? "📉" : "➖";
    return {
      label: `${arrow}${weight}kg`,
      className: diff > 0 ? "up" : diff < 0 ? "down" : "same"
    };
  },

  async selectCalendarDate(event) {
    const date = event.currentTarget.dataset.date;
    if (!date) return;
    try {
      const selectedRecord = await request(`/checkin/${date}`);
      this.setData({ selectedRecord });
    } catch (error) {
      wx.showToast({ title: error.message, icon: "none" });
    }
  },

  onNewItemInput(event) {
    this.setData({ newItemName: event.detail.value });
  },

  async addItem() {
    const name = this.data.newItemName.trim();
    if (!name) return;
    try {
      await request("/items", {
        method: "POST",
        data: { name, enabled: true, isDefault: true, sortOrder: this.nextSortOrder() }
      });
      this.setData({ newItemName: "" });
      await this.loadAll();
    } catch (error) {
      wx.showToast({ title: error.message, icon: "none" });
    }
  },

  nextSortOrder() {
    return Math.max(0, ...this.data.items.map((item) => Number(item.sortOrder) || 0)) + 10;
  },

  async updateItem(event) {
    const { id, action } = event.currentTarget.dataset;
    const item = this.data.items.find((entry) => entry.id === id);
    if (!item) return;
    const payload = {};
    if (action === "enabled") payload.enabled = !item.enabled;
    if (action === "default") payload.isDefault = !item.isDefault;
    if (action === "up") payload.sortOrder = item.sortOrder - 15;
    if (action === "down") payload.sortOrder = item.sortOrder + 15;
    try {
      if (action === "delete") {
        await request(`/items/${id}`, { method: "DELETE" });
      } else {
        await request(`/items/${id}`, { method: "PATCH", data: payload });
      }
      await this.loadAll();
    } catch (error) {
      wx.showToast({ title: error.message, icon: "none" });
    }
  },

  async renameItem(event) {
    const id = event.currentTarget.dataset.id;
    const name = event.detail.value.trim();
    if (!name) return;
    try {
      await request(`/items/${id}`, { method: "PATCH", data: { name } });
      await this.loadAll();
    } catch (error) {
      wx.showToast({ title: error.message, icon: "none" });
    }
  }
});
