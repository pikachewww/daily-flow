import { getDb } from "../db/database.js";
import { LEGACY_TASK_NAME_TO_ID } from "../config/tasks.js";
import { listItems, listVisibleDefaultItems } from "./itemRepository.js";

function normalizeRow(row) {
  if (!row) return null;
  const storedTasks = JSON.parse(row.tasks);
  const items = listItems({ includeDeleted: true });
  const tasks = normalizeTasks(storedTasks, items);

  const record = {
    date: row.date,
    tasks,
    taskItems: buildTaskItems(tasks, items),
    aiTopic: row.ai_topic || "",
    aiMinutes: row.ai_minutes ?? "",
    dailyGain: row.daily_gain || "",
    weight: row.weight ?? "",
    aiSummary: row.ai_summary || "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };

  return record;
}

export function getByDate(date) {
  const row = getDb()
    .prepare("SELECT * FROM checkins WHERE date = ?")
    .get(date);
  return normalizeRow(row);
}

export function getOrCreateByDate(date) {
  const existing = getByDate(date);
  if (existing) return existing;

  const record = {
    date,
    tasks: Object.fromEntries(listVisibleDefaultItems().map((item) => [item.id, false])),
    aiTopic: "",
    aiMinutes: "",
    dailyGain: "",
    weight: "",
    aiSummary: "",
  };
  upsert(record);
  return getByDate(date);
}

export function upsert(record) {
  const cleanTasks = normalizeTasks(record.tasks || {}, listItems({ includeDeleted: true }));

  getDb()
    .prepare(`
      INSERT INTO checkins (
        date, tasks, ai_topic, ai_minutes, daily_gain, weight, ai_summary, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(date) DO UPDATE SET
        tasks = excluded.tasks,
        ai_topic = excluded.ai_topic,
        ai_minutes = excluded.ai_minutes,
        daily_gain = excluded.daily_gain,
        weight = excluded.weight,
        ai_summary = excluded.ai_summary,
        updated_at = CURRENT_TIMESTAMP
    `)
    .run(
      record.date,
      JSON.stringify(cleanTasks),
      record.aiTopic || "",
      record.aiMinutes === "" || record.aiMinutes == null ? null : Number(record.aiMinutes),
      record.dailyGain || "",
      record.weight === "" || record.weight == null ? null : Number(record.weight),
      record.aiSummary || "",
    );

  return getByDate(record.date);
}

export function updateSummary(date, aiSummary) {
  getDb()
    .prepare("UPDATE checkins SET ai_summary = ?, updated_at = CURRENT_TIMESTAMP WHERE date = ?")
    .run(aiSummary, date);
  return getByDate(date);
}

export function listHistory({ limit = 90 } = {}) {
  const rows = getDb()
    .prepare("SELECT * FROM checkins ORDER BY date DESC LIMIT ?")
    .all(limit);
  return rows.map(normalizeRow).filter(hasRecordContent);
}

function hasRecordContent(record) {
  return (
    Object.values(record.tasks || {}).some(Boolean) ||
    Boolean(record.aiTopic || record.dailyGain || record.aiSummary || record.weight !== "")
  );
}

function normalizeTasks(storedTasks, items) {
  const itemIds = new Set(items.map((item) => item.id));
  const tasks = {};

  listVisibleDefaultItems().forEach((item) => {
    tasks[item.id] = false;
  });

  Object.entries(storedTasks || {}).forEach(([key, value]) => {
    const id = LEGACY_TASK_NAME_TO_ID[key] || key;
    if (itemIds.has(id)) {
      tasks[id] = Boolean(value);
    }
  });

  return tasks;
}

function buildTaskItems(tasks, items) {
  const itemById = new Map(items.map((item) => [item.id, item]));
  const ids = new Set([
    ...items.filter((item) => item.enabled && item.isDefault && !item.deletedAt).map((item) => item.id),
    ...Object.keys(tasks).filter((id) => tasks[id]),
  ]);

  return Array.from(ids)
    .map((id) => {
      const item = itemById.get(id);
      return {
        id,
        name: item?.name || id,
        done: Boolean(tasks[id]),
        enabled: item ? item.enabled : false,
        isDefault: item ? item.isDefault : false,
        sortOrder: item?.sortOrder ?? 999,
      };
    })
    .sort((a, b) => a.sortOrder - b.sortOrder);
}
