import { badRequest } from "../utils/httpError.js";
import { isDateKey, toDateKey } from "../utils/date.js";

export function validateCheckinPayload(body) {
  const errors = [];
  const date = body.date || toDateKey();

  if (!isDateKey(date)) {
    errors.push({ field: "date", message: "date 必须是 YYYY-MM-DD 格式" });
  }

  const tasks = {};
  if (body.tasks && typeof body.tasks !== "object") {
    errors.push({ field: "tasks", message: "tasks 必须是对象" });
  } else {
    Object.entries(body.tasks || {}).forEach(([key, value]) => {
      tasks[key] = Boolean(value);
    });
  }

  const aiMinutes = normalizeOptionalNumber(body.aiMinutes, "aiMinutes", errors, { integer: true });
  const weight = normalizeOptionalNumber(body.weight, "weight", errors);

  if (errors.length) {
    throw badRequest("参数校验失败", errors);
  }

  return {
    date,
    tasks,
    aiTopic: normalizeString(body.aiTopic),
    aiMinutes,
    dailyGain: normalizeString(body.dailyGain),
    weight,
    aiSummary: normalizeString(body.aiSummary),
  };
}

function normalizeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeOptionalNumber(value, field, errors, options = {}) {
  if (value === "" || value == null) return "";
  const number = Number(value);
  if (Number.isNaN(number) || number < 0 || (options.integer && !Number.isInteger(number))) {
    errors.push({ field, message: `${field} 必须是非负数字` });
    return "";
  }
  return number;
}
