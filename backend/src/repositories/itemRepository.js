import { getDb } from "../db/database.js";
import { badRequest } from "../utils/httpError.js";

function normalizeRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    enabled: Boolean(row.enabled),
    isDefault: Boolean(row.is_default),
    sortOrder: row.sort_order,
    builtIn: Boolean(row.built_in),
    deletedAt: row.deleted_at || "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function listItems({ includeDeleted = false } = {}) {
  const rows = getDb()
    .prepare(`
      SELECT * FROM checkin_items
      ${includeDeleted ? "" : "WHERE deleted_at IS NULL"}
      ORDER BY sort_order ASC, created_at ASC
    `)
    .all();
  return rows.map(normalizeRow);
}

export function listVisibleDefaultItems() {
  return listItems().filter((item) => item.enabled && item.isDefault);
}

export function getItemById(id) {
  return normalizeRow(getDb().prepare("SELECT * FROM checkin_items WHERE id = ?").get(id));
}

export function createItem(payload) {
  const name = normalizeName(payload.name);
  const id = payload.id || createId(name);
  const sortOrder = normalizeSortOrder(payload.sortOrder);

  getDb()
    .prepare(`
      INSERT INTO checkin_items (id, name, enabled, is_default, sort_order, built_in)
      VALUES (?, ?, ?, ?, ?, 0)
    `)
    .run(id, name, payload.enabled === false ? 0 : 1, payload.isDefault === false ? 0 : 1, sortOrder);

  return getItemById(id);
}

export function updateItem(id, payload) {
  const existing = getItemById(id);
  if (!existing || existing.deletedAt) throw badRequest("打卡项不存在");

  const name = payload.name == null ? existing.name : normalizeName(payload.name);
  const enabled = payload.enabled == null ? existing.enabled : Boolean(payload.enabled);
  const isDefault = payload.isDefault == null ? existing.isDefault : Boolean(payload.isDefault);
  const sortOrder = payload.sortOrder == null ? existing.sortOrder : normalizeSortOrder(payload.sortOrder);

  getDb()
    .prepare(`
      UPDATE checkin_items
      SET name = ?, enabled = ?, is_default = ?, sort_order = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `)
    .run(name, enabled ? 1 : 0, isDefault ? 1 : 0, sortOrder, id);

  return getItemById(id);
}

export function deleteItem(id) {
  const existing = getItemById(id);
  if (!existing || existing.deletedAt) throw badRequest("打卡项不存在");

  getDb()
    .prepare(`
      UPDATE checkin_items
      SET enabled = 0, is_default = 0, deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `)
    .run(id);

  return { ok: true };
}

function normalizeName(name) {
  const value = String(name || "").trim();
  if (!value) throw badRequest("打卡项名称不能为空");
  if (value.length > 20) throw badRequest("打卡项名称不能超过 20 个字");
  return value;
}

function normalizeSortOrder(value) {
  if (value == null || value === "") return 100;
  const number = Number(value);
  if (!Number.isInteger(number)) throw badRequest("排序必须是整数");
  return number;
}

function createId(name) {
  return `custom_${Date.now()}_${Buffer.from(name).toString("hex").slice(0, 8)}`;
}
