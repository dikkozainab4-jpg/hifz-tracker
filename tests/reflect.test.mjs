import test from "node:test";
import assert from "node:assert/strict";
import { weekRange, monthRange } from "../site/js/dates.js";
import { summarise } from "../site/js/reflect.js";

const plan = { new: 1, old: 1, recent: 1, tilawah: 1 };
const rec = (pages, completed = false) => ({
  completed,
  entries: { new: pages, old: 0, recent: 0, tilawah: 0 },
});
const full = { completed: false, anyDone: true, entries: { new: 1, old: 1, recent: 1, tilawah: 1 } };
const week = weekRange("2026-09-23"); // Mon 21 .. Sun 27
const W = { targetDays: 6 };

test("finished week without the x6 rule: 3 active of 7 = 43%", () => {
  const m = new Map([["2026-09-21", rec(1)], ["2026-09-22", rec(2)], ["2026-09-24", rec(0, true)]]);
  const s = summarise(week, m, plan, "2026-09-30");
  assert.equal(s.activeDays, 3);
  assert.equal(s.consistencyPct, 43);
  assert.equal(s.totals.new, 3);
});

test("two days done is NOT 100%: weekly is measured against the full six-day week", () => {
  const m = new Map([["2026-09-21", full], ["2026-09-22", full]]);
  for (const today of ["2026-09-22", "2026-09-23", "2026-09-30"]) {
    const s = summarise(week, m, plan, today, W);
    assert.equal(s.consistencyPct, 33, `consistency on ${today}`);
    assert.equal(s.targetPct, 33, `target on ${today}`);
  }
});

test("six full days is a full week (100%), not 6/7", () => {
  const m = new Map(week.days.slice(0, 6).map((d) => [d, full]));
  const s = summarise(week, m, plan, "2026-09-30", W);
  assert.equal(s.consistencyPct, 100);
  assert.equal(s.targetPct, 100);
  assert.equal(s.activeDays, 6);
});

test("three of six days is 50%; seven active days is capped at 100%", () => {
  const three = new Map(week.days.slice(0, 3).map((d) => [d, rec(4)]));
  assert.equal(summarise(week, three, plan, "2026-09-30", W).consistencyPct, 50);
  const seven = new Map(week.days.map((d) => [d, rec(4)]));
  assert.equal(summarise(week, seven, plan, "2026-09-30", W).consistencyPct, 100);
});

test("partly ticked day counts partly toward the target but the day is active", () => {
  const m = new Map([["2026-09-21", { completed: false, anyDone: true, entries: { new: 1, old: 0, recent: 0, tilawah: 0 } }]]);
  const s = summarise(week, m, plan, "2026-09-30", W);
  assert.equal(s.targetPct, 4); // 1 of 24 planned pages
  assert.equal(s.consistencyPct, 17); // 1 of 6 days
});

test("month uses 24 target days", () => {
  const month = monthRange("2026-09-10");
  const m = new Map(month.days.slice(0, 12).map((d) => [d, full]));
  const s = summarise(month, m, plan, "2026-09-30", { targetDays: 24 });
  assert.equal(s.consistencyPct, 50);
  assert.equal(s.targetPct, 50);
});

test("a zero plan gives targetPct 0 and an empty week gives 0 consistency", () => {
  const s = summarise(week, new Map(), { new: 0, old: 0, recent: 0, tilawah: 0 }, "2026-09-30", W);
  assert.equal(s.targetPct, 0);
  assert.equal(s.consistencyPct, 0);
});

test("a period entirely in the future has no NaN", () => {
  const s = summarise(week, new Map(), plan, "2026-01-01", W);
  assert.equal(s.elapsedDays, 0);
  assert.equal(s.consistencyPct, 0);
});

test("targetPct is capped at 100", () => {
  const m = new Map([["2026-09-21", rec(500)]]);
  assert.equal(summarise(week, m, plan, "2026-09-21", W).targetPct, 100);
});
