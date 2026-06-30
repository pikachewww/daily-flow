export function toDateKey(date = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(date);
}

export function addDays(dateKey, amount) {
  const date = new Date(`${dateKey}T00:00:00+08:00`);
  date.setDate(date.getDate() + amount);
  return toDateKey(date);
}

export function isDateKey(value) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}
