// Turns daily records into weekly/monthly reflections.
import { CATEGORIES, toPages } from "./calc.js";

/**
 * @param range      {days:string[]} from weekRange/monthRange
 * @param dayRecords Map<date,{completed:boolean, entries:{new,old,recent,tilawah}}>
 * @param plan       {new,old,recent,tilawah} daily target pages
 * @param today      "YYYY-MM-DD"
 */
export function summarise(range, dayRecords, plan, today) {
  const totals = { new: 0, old: 0, recent: 0, tilawah: 0 };
  const perDay = [];
  let activeDays = 0;
  let elapsedDays = 0;

  for (const date of range.days) {
    const rec = dayRecords.get(date);
    const entries = rec?.entries ?? {};
    let pages = 0;
    for (const { key } of CATEGORIES) {
      const p = toPages(entries[key]);
      totals[key] += p;
      pages += p;
    }
    const completed = Boolean(rec?.completed);
    const active = pages > 0 || completed;
    const elapsed = date <= today;
    if (elapsed) elapsedDays++;
    if (active) activeDays++;
    perDay.push({ date, pages, active, completed, elapsed });
  }

  const actual = CATEGORIES.reduce((s, c) => s + totals[c.key], 0);
  const planned = CATEGORIES.reduce((s, c) => s + toPages(plan?.[c.key]), 0) * elapsedDays;
  const activeElapsed = perDay.filter((d) => d.active && d.elapsed).length;

  return {
    totals,
    activeDays,
    elapsedDays,
    consistencyPct: elapsedDays ? Math.round((activeElapsed / elapsedDays) * 100) : 0,
    targetPct: planned > 0 ? Math.min(100, Math.round((actual / planned) * 100)) : 0,
    perDay,
  };
}
