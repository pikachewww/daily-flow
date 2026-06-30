import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import { env } from "../config/env.js";
import { DEFAULT_ITEMS } from "../config/tasks.js";

let db;

export function getDb() {
  if (!db) {
    const dbPath = path.resolve(env.databasePath);
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    db = new DatabaseSync(dbPath);
    db.exec("PRAGMA journal_mode = WAL;");
    db.exec("PRAGMA foreign_keys = ON;");
  }

  return db;
}

export function initDatabase() {
  const database = getDb();

  database.exec(`
    CREATE TABLE IF NOT EXISTS checkins (
      date TEXT PRIMARY KEY,
      tasks TEXT NOT NULL,
      ai_topic TEXT NOT NULL DEFAULT '',
      ai_minutes INTEGER,
      daily_gain TEXT NOT NULL DEFAULT '',
      weight REAL,
      ai_summary TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_checkins_updated_at ON checkins(updated_at);

    CREATE TABLE IF NOT EXISTS checkin_items (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 1,
      is_default INTEGER NOT NULL DEFAULT 1,
      sort_order INTEGER NOT NULL DEFAULT 0,
      built_in INTEGER NOT NULL DEFAULT 0,
      deleted_at TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  seedDefaultItems(database);
}

function seedDefaultItems(database) {
  const statement = database.prepare(`
    INSERT INTO checkin_items (id, name, enabled, is_default, sort_order, built_in)
    VALUES (?, ?, 1, 1, ?, 1)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      sort_order = excluded.sort_order
  `);

  DEFAULT_ITEMS.forEach((item) => {
    statement.run(item.id, item.name, item.sortOrder);
  });
}
