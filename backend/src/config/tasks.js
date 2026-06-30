export const DEFAULT_ITEMS = [
  { id: "learning", name: "学习", sortOrder: 10 },
  { id: "breakfast", name: "早餐", sortOrder: 20 },
  { id: "lunch", name: "午餐", sortOrder: 30 },
  { id: "dinner", name: "晚餐", sortOrder: 40 },
  { id: "water", name: "喝水", sortOrder: 50 },
  { id: "exercise", name: "运动", sortOrder: 60 },
  { id: "sleep_early", name: "早睡", sortOrder: 70 },
];

export const LEGACY_TASK_NAME_TO_ID = Object.fromEntries(DEFAULT_ITEMS.map((item) => [item.name, item.id]));
LEGACY_TASK_NAME_TO_ID["AI 学习"] = "learning";

export const TASKS = DEFAULT_ITEMS.map((item) => item.id);

export function createEmptyTasks() {
  return Object.fromEntries(TASKS.map((task) => [task, false]));
}
