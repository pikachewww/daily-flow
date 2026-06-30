import { addDays, toDateKey } from "../utils/date.js";
import { listVisibleDefaultItems } from "../repositories/itemRepository.js";

export function completedCount(record) {
  const items = listVisibleDefaultItems();
  return items.filter((item) => record?.tasks?.[item.id]).length;
}

export function completionRate(record) {
  if (!record) return 0;
  const total = Math.max(listVisibleDefaultItems().length, 1);
  return Math.round((completedCount(record) / total) * 100);
}

export function hasCheckedIn(record) {
  if (!record) return false;
  return completedCount(record) > 0 || Boolean(record.dailyGain || record.aiTopic || record.weight !== "");
}

export function calculateStreak(records, today = toDateKey()) {
  const byDate = new Map(records.map((record) => [record.date, record]));
  let streak = 0;
  let cursor = today;

  while (hasCheckedIn(byDate.get(cursor))) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }

  return streak;
}

export function buildStats(records, today = toDateKey()) {
  const byDate = new Map(records.map((record) => [record.date, record]));
  const sevenDays = Array.from({ length: 7 }, (_, index) => {
    const date = addDays(today, index - 6);
    const rate = completionRate(byDate.get(date));
    return { date, rate };
  });
  const sevenDayAverage = Math.round(
    sevenDays.reduce((sum, item) => sum + item.rate, 0) / sevenDays.length,
  );
  const weights = records
    .filter((record) => record.weight !== "" && !Number.isNaN(Number(record.weight)))
    .sort((a, b) => a.date.localeCompare(b.date));

  const learningCompletedCount = records.filter((record) => record.tasks?.learning).length;

  return {
    streak: calculateStreak(records, today),
    sevenDayAverage,
    sevenDays,
    learningCompletedCount,
    aiCompletedCount: learningCompletedCount,
    weightChange: getWeightChange(weights),
    weightTrend7: buildWeightTrend(weights, 7),
    weightTrend30: buildWeightTrend(weights, 30),
  };
}

function getWeightChange(weights) {
  if (weights.length === 0) return { label: "暂无", value: null };
  if (weights.length === 1) return { label: `${Number(weights[0].weight)} kg`, value: 0 };

  const first = Number(weights[0].weight);
  const last = Number(weights[weights.length - 1].weight);
  const diff = Number((last - first).toFixed(1));

  return {
    label: diff === 0 ? "持平" : `${diff > 0 ? "+" : ""}${diff} kg`,
    value: diff,
    from: first,
    to: last,
  };
}

function buildWeightTrend(weights, limit) {
  const recent = weights.slice(-limit);
  return recent.map((record, index) => {
    const current = Number(record.weight);
    const previous = index > 0 ? Number(recent[index - 1].weight) : null;
    const diff = previous == null ? 0 : Number((current - previous).toFixed(1));
    return {
      date: record.date,
      weight: current,
      diff,
      direction: diff > 0 ? "up" : diff < 0 ? "down" : "same",
    };
  });
}
