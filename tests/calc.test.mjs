import test from "node:test";
import assert from "node:assert/strict";
import {
  toPages, weeklyOf, monthlyOf, pagesToHizb, goalPercent, estimateWeeksToGoal, CATEGORIES,
} from "../site/js/calc.js";

test("weekly is x6 and monthly is x4 of weekly", () => {
  assert.equal(weeklyOf(2), 12);
  assert.equal(monthlyOf(2), 48);
});

test("10 pages = 1 Hizb", () => assert.equal(pagesToHizb(10), 1));

test("blank, negative and non-numeric input is no target, never NaN", () => {
  for (const bad of ["", "abc", -3, null, undefined, NaN, Infinity]) assert.equal(toPages(bad), 0);
  assert.equal(toPages("1.5"), 1.5);
  assert.equal(weeklyOf(""), 0);
});

test("goalPercent is clamped and safe for a zero goal", () => {
  assert.equal(goalPercent(33, 60), 55);
  assert.equal(goalPercent(5, 0), 0);
  assert.equal(goalPercent(70, 60), 100);
  assert.equal(goalPercent(-4, 60), 0);
});

test("estimateWeeksToGoal", () => {
  assert.equal(estimateWeeksToGoal(60, 60, 1), null);
  assert.equal(estimateWeeksToGoal(30, 60, 0), null);
  assert.equal(estimateWeeksToGoal(30, 60, 1), 50);
});

test("category labels are the plain labels", () => {
  assert.deepEqual(CATEGORIES.map((c) => c.label), [
    "New Hifz", "Old Revision", "Recent Revision", "Tilawah / Musāfahah",
  ]);
});
