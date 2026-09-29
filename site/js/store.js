// SQLite-backed store (sql.js). All SQL uses bound parameters.
import { CATEGORIES, toPages, MAX_PAGES } from "./calc.js";
import { isValidDate, todayStr, weekRange } from "./dates.js";
import { SCHEMA_SQL } from "./schema.js";

export class ImportError extends Error {}

const KEYS = CATEGORIES.map((c) => c.key);
const MAX_TEXT = 20000;
const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
const text = (v) => (typeof v === "string" ? v.slice(0, MAX_TEXT) : "");

function num(v, lo, hi, what) {
  if (typeof v !== "number" || !Number.isFinite(v) || v < lo || v > hi) {
    throw new ImportError(`${what} must be a number between ${lo} and ${hi}`);
  }
  return v;
}

/**
 * @param SQL    an initialised sql.js module
 * @param opts   { bytes?: Uint8Array, save?: (bytes)=>Promise|void, persisted?: boolean, saveDelayMs?: number }
 */
export function createStore(SQL, { bytes, save, persisted = false, saveDelayMs = 250 } = {}) {
  const db = bytes ? new SQL.Database(bytes) : new SQL.Database();
  db.run("PRAGMA foreign_keys = ON;");
  db.exec(SCHEMA_SQL);
  // Databases created before the "done" checkbox existed: add the column and treat recorded pages as done.
  const cols = db.exec("PRAGMA table_info(day_entry)")[0].values.map((r) => r[1]);
  if (!cols.includes("done")) {
    db.run("ALTER TABLE day_entry ADD COLUMN done INTEGER NOT NULL DEFAULT 0");
    db.run("UPDATE day_entry SET done = 1 WHERE pages > 0");
  }

  let timer = null;
  let edited = false; // true when there are edits since the last save; passed to save() as its 2nd argument
  const flush = async () => {
    clearTimeout(timer);
    timer = null;
    const hadEdits = edited;
    edited = false;
    if (save) await save(db.export(), hadEdits);
  };
  const changed = () => {
    if (!save) return;
    edited = true;
    clearTimeout(timer);
    timer = setTimeout(() => flush().catch((e) => console.warn("Could not persist data", e)), saveDelayMs);
  };

  const all = (sql, params = []) => {
    const stmt = db.prepare(sql, params);
    const rows = [];
    while (stmt.step()) rows.push(stmt.getAsObject());
    stmt.free();
    return rows;
  };
  const one = (sql, params) => all(sql, params)[0];
  const run = (sql, params = []) => db.run(sql, params);
  let depth = 0;
  const tx = (fn) => {
    if (depth > 0) return fn();
    run("BEGIN");
    depth++;
    try {
      const r = fn();
      run("COMMIT");
      return r;
    } catch (e) {
      run("ROLLBACK");
      throw e;
    } finally {
      depth--;
    }
  };

  const store = {
    persisted,
    flush,

    getProfile() {
      const r = one("SELECT name, current_hizb, target_hizb FROM profile WHERE id = 1");
      return { name: r.name, currentHizb: r.current_hizb, targetHizb: r.target_hizb };
    },
    saveProfile({ name, currentHizb, targetHizb }) {
      run("UPDATE profile SET name = ?, current_hizb = ?, target_hizb = ? WHERE id = 1", [
        text(name).trim().slice(0, 80),
        clamp(Number(currentHizb) || 0, 0, 60),
        clamp(Number(targetHizb) || 60, 1, 60),
      ]);
      changed();
    },

    getPlan() {
      const r = one("SELECT new_pages, old_pages, recent_pages, tilawah_pages FROM plan WHERE id = 1");
      return { new: r.new_pages, old: r.old_pages, recent: r.recent_pages, tilawah: r.tilawah_pages };
    },
    savePlan(p) {
      run("UPDATE plan SET new_pages = ?, old_pages = ?, recent_pages = ?, tilawah_pages = ? WHERE id = 1", [
        toPages(p.new), toPages(p.old), toPages(p.recent), toPages(p.tilawah),
      ]);
      changed();
    },

    getDay(date) {
      const day = one("SELECT notes, completed FROM day WHERE date = ?", [date]);
      const entries = Object.fromEntries(KEYS.map((k) => [k, { pages: 0, note: "", done: false }]));
      for (const e of all("SELECT category, pages, note, done FROM day_entry WHERE date = ?", [date])) {
        entries[e.category] = { pages: e.pages, note: e.note, done: Boolean(e.done) };
      }
      return { date, notes: day?.notes ?? "", completed: Boolean(day?.completed), entries };
    },
    saveDay(date, { notes = "", completed = false, entries = {} }) {
      if (!isValidDate(date)) throw new ImportError("Invalid date");
      const plan = store.getPlan();
      tx(() => {
        run(
          "INSERT INTO day (date, notes, completed) VALUES (?, ?, ?) " +
            "ON CONFLICT(date) DO UPDATE SET notes = excluded.notes, completed = excluded.completed",
          [date, text(notes), completed ? 1 : 0],
        );
        for (const k of KEYS) {
          const e = entries[k] ?? {};
          const done = Boolean(e.done);
          // A ticked box counts as that category's daily target at the time it was ticked.
          const pages = e.pages !== undefined ? toPages(e.pages) : done ? toPages(plan[k]) : 0;
          run(
            "INSERT INTO day_entry (date, category, pages, note, done) VALUES (?, ?, ?, ?, ?) " +
              "ON CONFLICT(date, category) DO UPDATE SET pages = excluded.pages, note = excluded.note, done = excluded.done",
            [date, k, pages, text(e.note).slice(0, 200), done ? 1 : 0],
          );
        }
      });
      changed();
    },

    /** Map<date,{completed, notes, entries:{new,old,recent,tilawah}}> with entries as page numbers. */
    daysBetween(start, end) {
      const map = new Map();
      for (const d of all("SELECT date, notes, completed FROM day WHERE date BETWEEN ? AND ?", [start, end])) {
        map.set(d.date, { completed: Boolean(d.completed), anyDone: false, notes: d.notes, entries: { new: 0, old: 0, recent: 0, tilawah: 0 } });
      }
      for (const e of all("SELECT date, category, pages, done FROM day_entry WHERE date BETWEEN ? AND ?", [start, end])) {
        const rec = map.get(e.date);
        if (!rec) continue;
        rec.entries[e.category] = e.pages;
        if (e.done) rec.anyDone = true;
      }
      return map;
    },

    getReflection(period) {
      return one("SELECT text FROM reflection WHERE period = ?", [period])?.text ?? "";
    },
    saveReflection(period, value) {
      run(
        "INSERT INTO reflection (period, text) VALUES (?, ?) ON CONFLICT(period) DO UPDATE SET text = excluded.text",
        [String(period).slice(0, 20), text(value)],
      );
      changed();
    },

    hasData() {
      return Boolean(store.getProfile().name) || one("SELECT COUNT(*) AS n FROM day").n > 0;
    },

    exportJson() {
      const days = all("SELECT date FROM day ORDER BY date").map(({ date }) => store.getDay(date));
      const reflections = Object.fromEntries(all("SELECT period, text FROM reflection").map((r) => [r.period, r.text]));
      return { app: "hifzly", version: 1, profile: store.getProfile(), plan: store.getPlan(), days, reflections };
    },

    /** Validates fully before touching the database; replaces all existing data. */
    importJson(obj) {
      if (!obj || typeof obj !== "object" || obj.app !== "hifzly" || obj.version !== 1) {
        throw new ImportError("This does not look like a Hifzly backup file.");
      }
      const p = obj.profile ?? {};
      const profile = {
        name: text(p.name).slice(0, 80),
        currentHizb: num(p.currentHizb ?? 0, 0, 60, "Hizbs memorised"),
        targetHizb: num(p.targetHizb ?? 60, 1, 60, "Hifz goal"),
      };
      const plan = {};
      for (const k of KEYS) plan[k] = num(obj.plan?.[k] ?? 0, 0, MAX_PAGES, `Plan ${k}`);
      if (!Array.isArray(obj.days)) throw new ImportError("Backup has no days list.");
      const days = obj.days.map((d) => {
        if (!isValidDate(d?.date)) throw new ImportError("Backup contains an invalid date.");
        const entries = {};
        for (const k of KEYS) {
          const pages = num(d.entries?.[k]?.pages ?? 0, 0, MAX_PAGES, `${d.date} ${k}`);
          entries[k] = { pages, note: text(d.entries?.[k]?.note), done: d.entries?.[k]?.done === undefined ? pages > 0 : Boolean(d.entries[k].done) };
        }
        return { date: d.date, notes: text(d.notes), completed: Boolean(d.completed), entries };
      });
      const reflections = Object.entries(obj.reflections ?? {}).map(([k, v]) => [k, text(v)]);

      tx(() => {
        run("DELETE FROM day");
        run("DELETE FROM reflection");
        store.saveProfile(profile);
        store.savePlan(plan);
        for (const d of days) store.saveDay(d.date, d);
        for (const [k, v] of reflections) store.saveReflection(k, v);
      });
      changed();
    },

    /**
     * One-time import of the prototype's localStorage blob (key quranTrakPersonalData_v2).
     * The prototype stored checkboxes, not amounts, so a ticked "Completed" box is imported as the plan's
     * daily target for that category. Returns true if anything was imported.
     */
    importLegacy(raw) {
      if (!raw || one("SELECT value FROM meta WHERE key = 'migrated_v2'")) return false;
      let old;
      try {
        old = JSON.parse(raw);
      } catch {
        return false;
      }
      if (!old || typeof old !== "object") return false;

      const cap = (v, d) => toPages(v) || d;
      const profile = old.profile ?? {};
      const oldPlans = old.plans ?? {};
      const plan = { new: toPages(oldPlans.pagesDay), old: toPages(oldPlans.dailyR1), recent: toPages(oldPlans.dailyR2), tilawah: toPages(oldPlans.dailyR3) };
      const legacyKeys = { new: "new", old: "old", recent: "recent", tilawah: "musa" };

      tx(() => {
        store.saveProfile({
          name: text(profile.name),
          currentHizb: cap(profile.currentHizb, 0),
          targetHizb: cap(profile.targetHizb, 60),
        });
        store.savePlan(plan);
        for (const [date, d] of Object.entries(old.daily ?? {})) {
          if (!isValidDate(date) || !d || typeof d !== "object") continue;
          const entries = {};
          for (const k of KEYS) {
            const lk = legacyKeys[k];
            const done = Boolean(d[`${lk}Completed`]);
            entries[k] = { pages: done ? plan[k] : 0, note: text(d[`${lk}Range`]), done };
          }
          store.saveDay(date, { notes: text(d.notes), completed: Boolean(d.completedDay), entries });
        }
        const reflection = text(old.weekly?.reflection);
        if (reflection) store.saveReflection(weekRange(todayStr()).key, reflection);
        run("INSERT OR REPLACE INTO meta (key, value) VALUES ('migrated_v2', '1')");
      });
      changed();
      return true;
    },

    close() {
      clearTimeout(timer);
      db.close();
    },
  };
  return store;
}
