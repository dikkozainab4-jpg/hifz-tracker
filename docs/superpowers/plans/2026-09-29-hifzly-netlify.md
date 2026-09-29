# Hifzly on Netlify Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the Hifzly tracker as a static web app, SQLite-backed in the browser, live on a public Netlify URL.

**Architecture:** Pure logic modules (`calc`, `dates`, `reflect`) are unit-tested with `node --test`. A `store` module wraps sql.js and persists the DB bytes to IndexedDB. `app.js` renders UI from store + logic. `site/` is published as-is.

**Tech Stack:** Vanilla ES modules, sql.js 1.x (vendored WASM), IndexedDB, Node 24 `node --test`, Netlify CLI.

**Spec:** `docs/specs/2026-09-29-hifzly-web-app-spec.md`

## Global Constraints

- weekly = daily × 6, monthly = weekly × 4, 10 pages = 1 Hizb (never ×7)
- UI labels: "New Hifz", "Old Revision", "Recent Revision", "Tilawah / Musāfahah"; no R1/R2/R3 columns
- Encouraging tone, no `alert()`, no shaming copy
- Palette: browns on `#f7f1e8` / `#fffdf9`; mobile-first
- SQL only with bound parameters; user text only via `textContent`
- No CDN runtime dependencies; publish dir is `site/`; no build command
- Local dates as `YYYY-MM-DD`; weeks run Monday–Sunday

## Review Focus

- Blank/negative/NaN plan input: treated as 0 target, no "NaN" shown (Task 1)
- Goal of 0 or current > goal: percentage clamped 0–100, no divide-by-zero (Task 1)
- Week/month boundaries: Sunday belongs to the week that started the previous Monday; February and leap years (Task 2)
- Future days in the current period must not lower consistency (Task 3)
- Imported JSON with wrong types, huge numbers or `<script>` text: rejected or rendered inert (Task 4)
- IndexedDB unavailable: app still runs in memory with a notice (Task 4)

---

### Task 1: Calculation module

**Files:** Create `site/js/calc.js`, `tests/calc.test.mjs`, `package.json`

**Interfaces:**
- Produces: `toPages(v): number` (finite ≥ 0 else 0), `weeklyOf(d)`, `monthlyOf(d)`, `pagesToHizb(p)`, `goalPercent(current, target): number`, `estimateWeeksToGoal(current, target, newPagesPerDay): number|null`, `CATEGORIES: [{key,label}]`

- [ ] Write tests (R-CALC-1, R-CALC-3, R-GOAL-1, R-GOAL-2): `weeklyOf(2)==12`, `monthlyOf(2)==48`, `pagesToHizb(10)==1`, `toPages("abc")==0`, `toPages(-3)==0`, `goalPercent(33,60)==55`, `goalPercent(5,0)==0`, `goalPercent(70,60)==100`, `estimateWeeksToGoal(60,60,1)==null`, `estimateWeeksToGoal(30,60,1)==50` (30 Hizbs remaining = 300 pages ÷ 6 pages/week; formula `remainingHizb*10 / (daily*6)`, rounded up), `estimateWeeksToGoal(30,60,0)==null`
- [ ] Run `node --test` → FAIL
- [ ] Implement minimal module
- [ ] Run → PASS; commit `feat: calculation module`

### Task 2: Date helpers

**Files:** Create `site/js/dates.js`, `tests/dates.test.mjs`

**Interfaces:** Produces `todayStr(now=new Date())`, `weekRange(dateStr): {start,end,days:string[7],key}` (Mon–Sun, key `YYYY-Www` ISO week), `monthRange(dateStr): {start,end,days:string[],key:'YYYY-MM'}`, `addDays(dateStr,n)`

- [ ] Tests: Sunday `2026-09-27` → week start `2026-09-21`; `2028-02` has 29 days; `2026-02` has 28; year-boundary `2026-12-31` week key is ISO `2026-W53`; `addDays('2026-12-31',1)=='2027-01-01'`
- [ ] Run → FAIL; implement using UTC math to avoid DST drift; run → PASS; commit

### Task 3: Reflection aggregation

**Files:** Create `site/js/reflect.js`, `tests/reflect.test.mjs`

**Interfaces:**
- Consumes: `weekRange`, `monthRange`, `todayStr`
- Produces: `summarise(range, dayRecords, plan, today): {totals:{new,old,recent,tilawah}, activeDays, elapsedDays, consistencyPct, targetPct, perDay:[{date,pages,active,completed}]}` where `dayRecords` is `Map<date,{completed, entries:{new,old,recent,tilawah}}>` and `plan` is `{new,old,recent,tilawah}` daily pages.

- [ ] Tests (R-REF-1..4): 3 active days out of 7 elapsed in a finished week → 43%; mid-week (today = Wed, 3 elapsed, 3 active) → 100% (future days ignored); active = pages>0 OR completed; targetPct = total actual ÷ (plan×6 per week / plan × elapsed days in month capped) — use `min(100, actual / (plan_daily × elapsedDays) × 100)` and 0 when plan is 0
- [ ] Run → FAIL; implement; run → PASS; commit

### Task 4: SQLite store and persistence

**Files:** Create `site/js/store.js`, `site/js/schema.js`, `site/vendor/sql-wasm.js`, `site/vendor/sql-wasm.wasm`, `tests/store.test.mjs`

**Interfaces:**
- Produces: `openStore({persist:'idb'|'memory', locateFile}) → Store` with `getProfile()`, `saveProfile({name,currentHizb,targetHizb})`, `getPlan()`, `savePlan({new,old,recent,tilawah})`, `getDay(date)`, `saveDay(date,{notes,completed,entries})`, `daysBetween(start,end): Map`, `getReflection(period)`, `saveReflection(period,text)`, `exportJson()`, `importJson(obj)` (throws `ImportError`), `persisted: boolean`; `importLegacy(localStorageString)`.

- [ ] `npm i --save-dev sql.js` in the scratchpad or repo, copy `dist/sql-wasm.js` and `sql-wasm.wasm` into `site/vendor/`; commit vendor files (sql.js is MIT)
- [ ] Tests with `persist:'memory'`: round-trip a day; `daysBetween` returns only rows in range; `importJson({profile:{name:"<script>"}})` stores text verbatim and bounds numbers (current/target clamp 0–60, pages clamp 0–604); `importJson("garbage")` and negative/`NaN` pages throw `ImportError`; `importLegacy` maps prototype keys (`pagesDay→plan.new`, `dailyR1→old`, `dailyR2→recent`, `dailyR3→tilawah`, `newCompleted` → entry note-only day, ranges → `note`), and is idempotent via `meta.migrated_v2`
- [ ] Run → FAIL; implement (schema in `schema.js`, `PRAGMA foreign_keys=ON`, all statements parameterised); run → PASS
- [ ] Persistence: debounced (250 ms) `db.export()` → IndexedDB `hifzly/db/sqlite`; on `openStore` failure of IDB, fall back to memory with `persisted=false` (R-DATA-2)
- [ ] Commit

### Task 5: UI shell, onboarding, plan

**Files:** Create `site/index.html`, `site/css/styles.css`, `site/js/app.js`, `site/js/ui.js`

**Interfaces:** `ui.js` exports `el(tag, attrs, ...children)` (uses `textContent`), `toast(msg)`, `show(pageId)`. `app.js` boots store, routes Welcome→Intro→Plan→Tracker, and skips to tracker when the profile has a name (R-UX-2).

- [ ] Port palette and layout from `base html/update.html`; labelled inputs, real `<button>` nav, `lang="ar" dir="rtl"` bismillah, `aria-live` toast region
- [ ] Plan page: 4 daily inputs with derived weekly/monthly read-outs via `calc.js`; saving updates the Daily Target card (R-PLAN-2)
- [ ] Dashboard: greeting without hardcoded name, progress bar, estimate line (R-GOAL-1..3), "Edit my journey" dialog
- [ ] Manual check: `npx serve site` and click through on a 360px viewport; commit

### Task 6: Daily, Weekly, Monthly views

**Files:** Modify `site/js/app.js`; Create `site/js/views/daily.js`, `weekly.js`, `monthly.js`

- [ ] Daily: date picker, four category cards showing "actual of target pages" with an ayah-range/note field, notes, "Mark day complete" toggle, encouraging copy when short of target (R-DAY-1..4)
- [ ] Weekly: `summarise(weekRange(date))`, totals, active-day dots (Mon–Sun) derived from records, consistency bar, reflection saved by `week.key` (R-REF-1)
- [ ] Monthly: month picker, real day count, totals, per-day list linking to the Daily view (R-REF-2)
- [ ] Manual check across a month boundary; commit

### Task 7: Data safety and legacy migration wiring

**Files:** Modify `site/js/app.js`, `site/index.html`

- [ ] On boot call `importLegacy(localStorage.getItem("quranTrakPersonalData_v2"))` once inside try/catch
- [ ] "Export my data" downloads `hifzly-backup-YYYY-MM-DD.json`; "Import" validates via `importJson`, showing a calm error toast on `ImportError` (R-DATA-1)
- [ ] Show a dismissible notice when `store.persisted === false` (R-DATA-2); commit

### Task 8: Netlify configuration and deploy

**Files:** Create `netlify.toml`, `site/_headers` (if needed), `.gitignore`, `README.md`; Modify `CLAUDE.md`

- [ ] `netlify.toml`: `[build] publish = "site"` (no command); `[[headers]]` for `/*` with `Content-Security-Policy = "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'"`, `X-Content-Type-Options=nosniff`, `Referrer-Policy=same-origin`; `[[headers]]` for `/vendor/*.wasm` with `Content-Type = "application/wasm"`
- [ ] Run `node --test`; run local server; verify page loads and WASM initialises
- [ ] Deploy: `npx netlify-cli deploy --dir=site --prod --create-site hifzly` (needs `netlify login` or `NETLIFY_AUTH_TOKEN`). If no auth is available, stop and ask the user to run `npx netlify-cli login`, or to link the GitHub repo in the Netlify UI
- [ ] Run the §4 smoke checks against the live URL with `curl -sI` (status, wasm content-type) and a browser click-through
- [ ] Update `CLAUDE.md` (commands, architecture, storage decision), commit, push

## Self-review

- Spec coverage: R-CALC → T1; R-PLAN, R-GOAL, R-UX, R-A11Y → T5; R-DAY, R-REF → T3/T6; R-DATA, D4 → T4/T7; R-HOST → T8.
- Interface names are consistent across tasks (`weekRange`, `monthRange`, `summarise`, `daysBetween`).
