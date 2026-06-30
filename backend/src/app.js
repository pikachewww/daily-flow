import http from "node:http";
import { env } from "./config/env.js";
import { initDatabase } from "./db/database.js";
import { getOrCreateByDate, listHistory, upsert } from "./repositories/checkinRepository.js";
import { validateCheckinPayload } from "./validators/checkinValidator.js";
import { toDateKey, isDateKey } from "./utils/date.js";
import { buildStats } from "./services/checkinStats.js";
import { generateSummary } from "./services/summaryService.js";
import { updateSummary } from "./repositories/checkinRepository.js";
import { badRequest } from "./utils/httpError.js";
import { createItem, deleteItem, listItems, updateItem } from "./repositories/itemRepository.js";

export function createApp() {
  initDatabase();

  return http.createServer(async (req, res) => {
    const startedAt = Date.now();
    const url = new URL(req.url, `http://${req.headers.host}`);

    try {
      applyCors(req, res);
      if (req.method === "OPTIONS") {
        sendJson(res, 204);
        return;
      }

      const body = await readJsonBody(req);
      const data = await handleRoute(req.method, url, body);
      sendJson(res, 200, data);
    } catch (error) {
      const status = error.status || 500;
      if (status >= 500) console.error(error);
      sendJson(res, status, {
        error: {
          message: error.message || "服务器错误",
          details: error.details,
        },
      });
    } finally {
      const duration = Date.now() - startedAt;
      console.log(`${req.method} ${url.pathname} ${duration}ms`);
    }
  });
}

async function handleRoute(method, url, body) {
  if (method === "GET" && url.pathname === "/health") {
    return { ok: true };
  }

  if (method === "GET" && url.pathname === "/api/checkin/today") {
    return { data: getOrCreateByDate(toDateKey()) };
  }

  if (method === "GET" && url.pathname === "/api/checkin/history") {
    const limit = Math.min(Number(url.searchParams.get("limit") || 90), 365);
    return { data: listHistory({ limit }) };
  }

  if (method === "GET" && url.pathname.startsWith("/api/checkin/")) {
    const date = decodeURIComponent(url.pathname.replace("/api/checkin/", ""));
    if (!isDateKey(date)) throw badRequest("date 必须是 YYYY-MM-DD 格式");
    return { data: getOrCreateByDate(date) };
  }

  if (method === "POST" && url.pathname === "/api/checkin") {
    const payload = validateCheckinPayload(body || {});
    return { data: upsert(payload) };
  }

  if (method === "GET" && url.pathname === "/api/stats") {
    return { data: buildStats(listHistory({ limit: 365 }), toDateKey()) };
  }

  if (method === "GET" && url.pathname === "/api/items") {
    return { data: listItems() };
  }

  if (method === "POST" && url.pathname === "/api/items") {
    return { data: createItem(body || {}) };
  }

  if (method === "PATCH" && url.pathname.startsWith("/api/items/")) {
    const id = decodeURIComponent(url.pathname.replace("/api/items/", ""));
    return { data: updateItem(id, body || {}) };
  }

  if (method === "DELETE" && url.pathname.startsWith("/api/items/")) {
    const id = decodeURIComponent(url.pathname.replace("/api/items/", ""));
    return { data: deleteItem(id) };
  }

  if (method === "POST" && url.pathname === "/api/summary") {
    const date = body?.date || toDateKey();
    if (!isDateKey(date)) throw badRequest("date 必须是 YYYY-MM-DD 格式");
    const record = getOrCreateByDate(date);
    const summary = await generateSummary(record);
    const updated = updateSummary(date, summary);
    return { data: { summary, record: updated } };
  }

  const error = new Error("接口不存在");
  error.status = 404;
  throw error;
}

function applyCors(req, res) {
  const origin = req.headers.origin;
  const allowedOrigin = env.corsOrigin === "*" ? origin || "*" : env.corsOrigin;
  res.setHeader("Access-Control-Allow-Origin", allowedOrigin);
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

function sendJson(res, status, payload) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  if (status === 204) {
    res.end();
    return;
  }
  res.end(JSON.stringify(payload));
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    if (!["POST", "PUT", "PATCH"].includes(req.method)) {
      resolve(null);
      return;
    }

    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 64 * 1024) {
        const error = new Error("请求体过大");
        error.status = 413;
        reject(error);
        req.destroy();
      }
    });
    req.on("end", () => {
      if (!raw) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch {
        const error = new Error("JSON 格式错误");
        error.status = 400;
        reject(error);
      }
    });
    req.on("error", reject);
  });
}
