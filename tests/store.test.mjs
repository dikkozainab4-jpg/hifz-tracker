import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { createStore, ImportError } from "../site/js/store.js";

const require = createRequire(import.meta.url);
const SQL = await require("sql.js")();
const fresh = (o) => createStore(SQL, o);
const blank = { new: {}, old: {}, recent: {}, tilawah: {} };

test("profile and plan round-trip, with clamping", () => {
  const s = fresh();
  s.saveProfile({ name: "  Zaynab ", currentHizb: 999, targetHizb: 0 });
  assert.deepEqual(s.getProfile(), { name: "Zaynab", currentHizb: 60, targetHizb: 60 });
  s.savePlan({ new: "2", old: -1, recent: "abc", tilawah: 10 });
  assert.deepEqual(s.getPlan(), { new: 2, old: 0, recent: 0, tilawah: 10 });
});

test("day round-trip and daysBetween only returns rows in range", () => {
  const s = fresh();
  s.saveDay("2026-09-20", { completed: true, entries: { ...blank, new: { pages: 1 } } });
  s.saveDay("2026-09-22", { notes: "good", entries: { ...blank, old: { pages: 2.5, note: "1-10" } } });
  const d = s.getDay("2026-09-22");
  assert.equal(d.notes, "good");
  assert.deepEqual(d.entries.old, { pages: 2.5, note: "1-10", done: false });
  const m = s.daysBetween("2026-09-21", "2026-09-30");
  assert.deepEqual([...m.keys()], ["2026-09-22"]);
  assert.equal(m.get("2026-09-22").entries.old, 2.5);
  s.saveDay("2026-09-22", { entries: blank });
  assert.equal(s.getDay("2026-09-22").entries.old.pages, 0);
});

test("script text is stored verbatim (rendering is textContent's job) and SQL is parameterised", () => {
  const s = fresh();
  s.saveDay("2026-09-22", { notes: "'); DROP TABLE day;-- <script>x</script>", entries: blank });
  assert.equal(s.getDay("2026-09-22").notes, "'); DROP TABLE day;-- <script>x</script>");
});

test("export then import restores everything", () => {
  const a = fresh();
  a.saveProfile({ name: "A", currentHizb: 3, targetHizb: 30 });
  a.savePlan({ new: 1, old: 2, recent: 3, tilawah: 4 });
  a.saveDay("2026-09-22", { notes: "n", completed: true, entries: { ...blank, new: { pages: 1, note: "x" } } });
  a.saveReflection("2026-W39", "ok");
  const json = JSON.parse(JSON.stringify(a.exportJson()));
  const b = fresh();
  b.importJson(json);
  assert.deepEqual(b.exportJson(), a.exportJson());
});

test("importJson rejects garbage, wrong types and bad numbers without changing data", () => {
  const s = fresh();
  s.saveProfile({ name: "Keep", currentHizb: 1, targetHizb: 2 });
  const good = () => JSON.parse(JSON.stringify(s.exportJson()));
  for (const bad of ["garbage", null, 5, { app: "other" }]) assert.throws(() => s.importJson(bad), ImportError);
  let j = good(); j.days = [{ date: "2026-09-22", entries: { new: { pages: -5 } } }];
  assert.throws(() => s.importJson(j), ImportError);
  j = good(); j.days = [{ date: "2026-99-99" }];
  assert.throws(() => s.importJson(j), ImportError);
  j = good(); j.profile.currentHizb = "many";
  assert.throws(() => s.importJson(j), ImportError);
  j = good(); j.days = [{ date: "2026-09-22", entries: { new: { pages: 1e9 } } }];
  assert.throws(() => s.importJson(j), ImportError);
  assert.equal(s.getProfile().name, "Keep");
});

test("importLegacy maps the prototype blob and is idempotent", () => {
  const legacy = JSON.stringify({
    profile: { name: "Zainab", currentHizb: 33, targetHizb: 60 },
    plans: { pagesDay: 2, dailyR1: 5, dailyR2: 2, dailyR3: 10 },
    daily: { "2026-09-20": { newRange: "1-10", newCompleted: true, musaCompleted: false, notes: "hi", completedDay: true } },
    weekly: { reflection: "steady" },
  });
  const s = fresh();
  assert.equal(s.importLegacy(legacy), true);
  assert.deepEqual(s.getPlan(), { new: 2, old: 5, recent: 2, tilawah: 10 });
  const d = s.getDay("2026-09-20");
  assert.equal(d.entries.new.pages, 2);
  assert.equal(d.entries.new.note, "1-10");
  assert.equal(d.entries.tilawah.pages, 0);
  assert.equal(d.completed, true);
  s.saveProfile({ name: "Changed", currentHizb: 1, targetHizb: 2 });
  assert.equal(s.importLegacy(legacy), false);
  assert.equal(s.getProfile().name, "Changed");
  assert.equal(fresh().importLegacy("not json"), false);
  assert.equal(fresh().importLegacy(null), false);
});

test("persistence: debounced save receives bytes that reopen with the same data", async () => {
  let saved;
  const s = fresh({ save: (b) => { saved = b; }, saveDelayMs: 5 });
  s.saveProfile({ name: "P", currentHizb: 1, targetHizb: 2 });
  await s.flush();
  assert.ok(saved instanceof Uint8Array);
  assert.equal(fresh({ bytes: saved }).getProfile().name, "P");
});

test("ticking a category counts the plan's daily target as its pages", () => {
  const s = fresh();
  s.savePlan({ new: 2, old: 5, recent: 2, tilawah: 10 });
  s.saveDay("2026-09-22", { entries: { ...blank, new: { done: true, note: "1-10" }, old: { done: false } } });
  const d = s.getDay("2026-09-22");
  assert.deepEqual(d.entries.new, { pages: 2, note: "1-10", done: true });
  assert.equal(d.entries.old.pages, 0);
  const rec = s.daysBetween("2026-09-22", "2026-09-22").get("2026-09-22");
  assert.equal(rec.entries.new, 2);
  assert.equal(rec.anyDone, true);
  s.saveDay("2026-09-22", { entries: blank });
  assert.equal(s.getDay("2026-09-22").entries.new.done, false);
});

test("a ticked box with no plan still makes the day active", () => {
  const s = fresh();
  s.saveDay("2026-09-22", { entries: { ...blank, new: { done: true } } });
  assert.equal(s.daysBetween("2026-09-22", "2026-09-22").get("2026-09-22").anyDone, true);
});

test("a database from before the done column is migrated", () => {
  const old = new SQL.Database();
  old.run("CREATE TABLE day (date TEXT PRIMARY KEY, notes TEXT NOT NULL DEFAULT '', completed INTEGER NOT NULL DEFAULT 0)");
  old.run("CREATE TABLE day_entry (date TEXT NOT NULL, category TEXT NOT NULL, pages REAL NOT NULL DEFAULT 0, note TEXT NOT NULL DEFAULT '', PRIMARY KEY (date, category))");
  old.run("INSERT INTO day (date) VALUES ('2026-09-22')");
  old.run("INSERT INTO day_entry (date, category, pages) VALUES ('2026-09-22','new',2)");
  const s = fresh({ bytes: old.export() });
  assert.equal(s.getDay("2026-09-22").entries.new.done, true);
});
