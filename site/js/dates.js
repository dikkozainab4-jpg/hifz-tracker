// Local-date helpers. All dates are "YYYY-MM-DD" strings; arithmetic is done in UTC to avoid DST drift.

const pad = (n) => String(n).padStart(2, "0");

export function todayStr(now = new Date()) {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

const parse = (s) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
};

const fmt = (dt) => `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;

export function addDays(dateStr, n) {
  const dt = parse(dateStr);
  dt.setUTCDate(dt.getUTCDate() + n);
  return fmt(dt);
}

export function isValidDate(s) {
  return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && fmt(parse(s)) === s;
}

function isoWeekKey(dateStr) {
  const dt = parse(dateStr);
  const day = dt.getUTCDay() || 7;
  dt.setUTCDate(dt.getUTCDate() + 4 - day); // Thursday of this ISO week
  const yearStart = Date.UTC(dt.getUTCFullYear(), 0, 1);
  const week = Math.ceil(((dt - yearStart) / 86400000 + 1) / 7);
  return `${dt.getUTCFullYear()}-W${pad(week)}`;
}

export function weekRange(dateStr) {
  const dow = (parse(dateStr).getUTCDay() + 6) % 7; // Monday = 0
  const start = addDays(dateStr, -dow);
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  return { start, end: days[6], days, key: isoWeekKey(dateStr) };
}

export function monthRange(dateStr) {
  const [y, m] = dateStr.split("-").map(Number);
  const count = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const days = Array.from({ length: count }, (_, i) => `${y}-${pad(m)}-${pad(i + 1)}`);
  return { start: days[0], end: days[count - 1], days, key: `${y}-${pad(m)}` };
}
