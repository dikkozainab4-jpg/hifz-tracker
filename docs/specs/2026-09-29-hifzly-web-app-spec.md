# Hifzly Web App — Delivery Spec

Source of truth for product behaviour: `Hifz Tracker App.md` (section numbers below refer to it).
Reference prototype: `base html/update.html`.

## 1. Goal

Turn the single-file prototype into a static web app that is **live on Netlify**, stores data in **SQLite**, and satisfies the MVP (§31) plus the known gaps listed in `CLAUDE.md`.

## 2. Decisions

| # | Decision | Rationale |
|---|----------|-----------|
| D1 | Storage is **SQLite in the browser** (sql.js WASM), the DB file is persisted to **IndexedDB** on every write. | §15 wants local saving with no account. Netlify Functions have an ephemeral filesystem, so a server-side `.sqlite` file cannot persist. Hosted SQLite (Turso) is deferred to the accounts/teacher phase (§25–28). |
| D2 | No framework and no bundler. Native ES modules, plain CSS, `node --test` for logic tests. | The prototype is vanilla JS. Netlify publishes the `site/` folder as-is, so there is nothing to break in the build. |
| D3 | The WASM binary is **vendored** into `site/vendor/`, not loaded from a CDN. | The app must keep working offline and must not depend on third-party uptime. |
| D4 | Migration: on first run, if `localStorage["quranTrakPersonalData_v2"]` exists it is imported into SQLite once, then left untouched. | CLAUDE.md requirement. Existing prototype users keep their history. |

## 3. Requirements

Each requirement has an ID that plan tasks and tests reference.

### Domain rules (from §8, §14, CLAUDE.md)
- **R-CALC-1** weekly = daily × 6, monthly = weekly × 4, 10 pages = 1 Hizb.
- **R-CALC-2** Category keys: N New Hifz, R1 Old Revision, R2 Recent Revision, R3 Tilawah / Musāfahah. UI shows plain labels only, no R1/R2/R3 column table (§23).
- **R-CALC-3** Negative, blank or non-numeric plan inputs are treated as "no target", never as NaN in the UI.

### Plan and Daily Target (§9–10)
- **R-PLAN-1** Hifz Plan holds four daily targets in pages, and shows derived weekly and monthly values.
- **R-PLAN-2** Editing the plan updates the Daily Target card in the tracker immediately.

### Daily tracking (§11)
- **R-DAY-1** Per date, per category: the actual amount completed in pages (number), an optional ayah range or note, and a done state.
- **R-DAY-2** Each row shows **target vs actual** (e.g. "1.5 of 2 pages"). Meeting the target is celebrated, missing it is met with encouragement (§29).
- **R-DAY-3** Free-text notes per day. "Mark day complete" toggles a day as done.
- **R-DAY-4** Changing the date loads that date's record. Editing past dates is allowed.

### Reflections (§12–13)
- **R-REF-1** Weekly view is **derived from daily records** for the Monday to Sunday week containing the selected date: totals per category, active days, target completion, consistency. It has a week reflection text saved per ISO week.
- **R-REF-2** Monthly view is derived for the real calendar month, with the correct number of days, the same totals, and a per-day list. It links each day to the daily editor.
- **R-REF-3** A day is "active" when any category has actual > 0 or it is marked complete.
- **R-REF-4** Consistency = active days ÷ days elapsed in the period, capped at the period length. Future days do not count against the user.

### Overall progress (§16–18)
- **R-GOAL-1** Profile holds name, Hizbs memorised, goal Hizbs (0–60). The dashboard shows progress and percentage. The percentage never exceeds 100 or drops below 0, and never divides by zero.
- **R-GOAL-2** Estimated completion is shown from current pace as an estimate, not a deadline. It shows only when weekly New Hifz > 0 and the goal is not yet reached.
- **R-GOAL-3** No hardcoded default name. If the name is blank, greet without one.

### Flow and UX (§5–7, §20–22, §29)
- **R-UX-1** Pages: Welcome → Intro (name) → Hifz Plan → Tracker (Daily / Weekly / Monthly). Nav: Home, Hifz Plan, My Tracker.
- **R-UX-2** Returning users (profile exists) skip Welcome/Intro and land on the tracker.
- **R-UX-3** Ivory/cream palette from the prototype, mobile-first, no tables that force horizontal scroll on a 360px screen.
- **R-UX-4** Tone: encouraging, never shaming. No `alert()` popups: use inline toasts.
- **R-UX-5** The intro explains the four categories and the ×6 rule briefly (§7).

### Data safety
- **R-DATA-1** Export all data as a JSON file, and import from a JSON file (validated). This is the safety net for browser-local storage.
- **R-DATA-2** If persistent storage cannot be used (private mode, IndexedDB blocked), the app still works in memory and shows a visible, calm notice that data will not be kept.
- **R-DATA-3** SQL always uses bound parameters. Imported and stored text is rendered with `textContent`, never `innerHTML`.

### Accessibility
- **R-A11Y-1** Every input has a label. Nav and tabs are real buttons, tabs use `role="tablist"`/`aria-selected`, and the page sets `lang="en"`. Focus is visible. Toasts use `aria-live="polite"`. The Arabic bismillah is marked `lang="ar" dir="rtl"`.
- **R-A11Y-2** Text contrast is at least WCAG AA against the cream backgrounds.

### Hosting (the goal)
- **R-HOST-1** `netlify.toml` publishes `site/` with no build command.
- **R-HOST-2** `.wasm` is served as `application/wasm`. Security headers are set (CSP allowing `'wasm-unsafe-eval'`, `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`).
- **R-HOST-3** A public `https://*.netlify.app` URL loads the app and passes the smoke checks in §4.
- **R-HOST-4** Deploys come from the GitHub repo `origin` (continuous deploy) when the user links it. A CLI deploy is used to get a first live URL.

## 4. Acceptance / smoke checks (run against the live URL)

1. `GET /` returns 200 and the HTML contains the app title.
2. `GET /vendor/sql-wasm.wasm` returns 200 with `content-type: application/wasm`.
3. In a real browser: complete onboarding, set a plan, log a day, reload, and the data is still there.
4. The weekly and monthly views reflect the logged day.
5. Export → clear → import restores the data.

## 5. Out of scope (deferred)

Accounts, sync, teacher/parent dashboards, notifications, multiple plans, revision history, milestones (§25–28). The SQLite schema is kept simple so a Turso-backed sync can be added later.

## 6. Schema (SQLite)

```sql
CREATE TABLE meta      (key TEXT PRIMARY KEY, value TEXT NOT NULL);           -- schema_version, migrated_v2
CREATE TABLE profile   (id INTEGER PRIMARY KEY CHECK (id = 1), name TEXT NOT NULL DEFAULT '',
                        current_hizb REAL NOT NULL DEFAULT 0, target_hizb REAL NOT NULL DEFAULT 60);
CREATE TABLE plan      (id INTEGER PRIMARY KEY CHECK (id = 1), new_pages REAL NOT NULL DEFAULT 0,
                        old_pages REAL NOT NULL DEFAULT 0, recent_pages REAL NOT NULL DEFAULT 0,
                        tilawah_pages REAL NOT NULL DEFAULT 0);
CREATE TABLE day       (date TEXT PRIMARY KEY, notes TEXT NOT NULL DEFAULT '', completed INTEGER NOT NULL DEFAULT 0);
CREATE TABLE day_entry (date TEXT NOT NULL REFERENCES day(date) ON DELETE CASCADE,
                        category TEXT NOT NULL CHECK (category IN ('new','old','recent','tilawah')),
                        pages REAL NOT NULL DEFAULT 0, note TEXT NOT NULL DEFAULT '',
                        PRIMARY KEY (date, category));
CREATE TABLE reflection(period TEXT PRIMARY KEY, text TEXT NOT NULL DEFAULT '');   -- 'W2026-W40'
```

`date` is `YYYY-MM-DD` in local time.
