import test from "node:test";
import assert from "node:assert/strict";
import { addDays, weekRange, monthRange, isValidDate } from "../site/js/dates.js";

test("Sunday belongs to the week that started on Monday", () => {
  const w = weekRange("2026-09-27");
  assert.equal(w.start, "2026-09-21");
  assert.equal(w.end, "2026-09-27");
  assert.equal(w.days.length, 7);
});

test("month lengths incl. leap year", () => {
  assert.equal(monthRange("2028-02-10").days.length, 29);
  assert.equal(monthRange("2026-02-10").days.length, 28);
  assert.equal(monthRange("2026-09-29").key, "2026-09");
});

test("year boundary", () => {
  assert.equal(addDays("2026-12-31", 1), "2027-01-01");
  assert.equal(weekRange("2026-12-31").key, "2026-W53");
  assert.equal(weekRange("2026-12-31").start, "2026-12-28");
});

test("isValidDate rejects impossible dates", () => {
  assert.equal(isValidDate("2026-02-30"), false);
  assert.equal(isValidDate("2026-9-1"), false);
  assert.equal(isValidDate("2026-09-01"), true);
});
