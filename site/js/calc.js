// Pure calculation rules. weekly = daily x 6 (deliberately not x7), monthly = weekly x 4, 10 pages = 1 Hizb.

export const CATEGORIES = [
  { key: "new", label: "New Hifz" },
  { key: "old", label: "Old Revision" },
  { key: "recent", label: "Recent Revision" },
  { key: "tilawah", label: "Tilawah / Musāfahah" },
];

export const PAGES_PER_HIZB = 10;
export const MAX_PAGES = 604;

export function toPages(value) {
  const n = typeof value === "number" ? value : parseFloat(value);
  return Number.isFinite(n) && n > 0 ? Math.min(n, MAX_PAGES) : 0;
}

export const weeklyOf = (daily) => toPages(daily) * 6;
export const monthlyOf = (daily) => weeklyOf(daily) * 4;
export const pagesToHizb = (pages) => toPages(pages) / PAGES_PER_HIZB;

export function round1(n) {
  return Number(Number(n).toFixed(1));
}

export function goalPercent(current, target) {
  const c = Number(current);
  const t = Number(target);
  if (!Number.isFinite(c) || !Number.isFinite(t) || t <= 0) return 0;
  return round1(Math.min(100, Math.max(0, (c / t) * 100)));
}

// Weeks to reach the goal at the planned New Hifz pace, or null when no estimate is possible.
export function estimateWeeksToGoal(current, target, newPagesPerDay) {
  const remaining = Number(target) - Number(current);
  const weekly = weeklyOf(newPagesPerDay);
  if (!Number.isFinite(remaining) || remaining <= 0 || weekly <= 0) return null;
  return Math.ceil((remaining * PAGES_PER_HIZB) / weekly);
}
