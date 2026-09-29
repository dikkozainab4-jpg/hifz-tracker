import test from "node:test";
import assert from "node:assert/strict";
import { weekRange } from "../site/js/dates.js";
import { summarise } from "../site/js/reflect.js";

const plan = { new: 1, old: 1, recent: 1, tilawah: 1 };
const rec = (pages, completed = false) => ({
  completed,
  entries: { new: pages, old: 0, recent: 0, tilawah: 0 },
});
const week = weekRange("2026-09-23"); // Mon 21 .. Sun 27

test("finished week: 3 active of 7 = 43%", () => {
  const m = new Map([["2026-09-21", rec(1)], ["2026-09-22", rec(2)], ["2026-09-24", rec(0, true)]]);
  const s = summarise(week, m, plan, "2026-09-30");
  assert.equal(s.activeDays, 3);
  assert.equal(s.elapsedDays, 7);
  assert.equal(s.consistencyPct, 43);
  assert.equal(s.totals.new, 3);
});

test("future days do not lower consistency", () => {
  const m = new Map([["2026-09-21", rec(1)], ["2026-09-22", rec(1)], ["2026-09-23", rec(1)]]);
  const s = summarise(week, m, plan, "2026-09-23");
  assert.equal(s.elapsedDays, 3);
  assert.equal(s.consistencyPct, 100);
});

test("a zero plan gives targetPct 0 and empty week gives 0 consistency", () => {
  const s = summarise(week, new Map(), { new: 0, old: 0, recent: 0, tilawah: 0 }, "2026-09-30");
  assert.equal(s.targetPct, 0);
  assert.equal(s.consistencyPct, 0);
});

test("a period entirely in the future has no elapsed days and no NaN", () => {
  const s = summarise(week, new Map(), plan, "2026-01-01");
  assert.equal(s.elapsedDays, 0);
  assert.equal(s.consistencyPct, 0);
});

test("targetPct is capped at 100", () => {
  const m = new Map([["2026-09-21", rec(500)]]);
  assert.equal(summarise(week, m, plan, "2026-09-21").targetPct, 100);
});
