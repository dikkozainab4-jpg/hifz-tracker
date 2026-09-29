# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project state

Hifzly (Hifz Tracker) is a Quran memorization planner and tracker, built as a static web app for Netlify.

- `Hifz Tracker App.md`: the product spec (source of truth for features, tone, MVP scope §31). `# Hifz Tracker App.txt` is an identical copy.
- `docs/specs/2026-09-29-hifzly-web-app-spec.md`: delivery spec with requirement IDs (R-CALC, R-DAY, R-REF, R-DATA, R-HOST...). `docs/superpowers/plans/2026-09-29-hifzly-netlify.md`: the task plan.
- `site/`: the app, and the Netlify publish dir. Vanilla ES modules, no build step.
- `base html/`: the original single-file prototypes (`update.html` is the newest). Reference only.

### Commands
- `npm test`: unit tests (`node --test`) for calc, dates, reflect and the SQLite store.
- `npm run dev`: serve `site/` locally on :8080.
- Deploy: `npx netlify-cli deploy --dir=site --prod` (needs `netlify login` or `NETLIFY_AUTH_TOKEN`), or link the GitHub repo in Netlify (publish dir `site`, no build command; `netlify.toml` sets it).

### Architecture (`site/js/`)
- `calc.js`, `dates.js`, `reflect.js`: pure logic (weekly = daily x 6, monthly = weekly x 4, 10 pages = 1 Hizb; Mon-Sun weeks; consistency ignores future days).
- `store.js` + `schema.js`: SQLite via vendored sql.js (`site/vendor/`). All SQL is parameterised. The DB bytes are saved to IndexedDB (`idb.js`) with a debounce. Falls back to in-memory with a visible notice if IndexedDB is unavailable. Also has JSON export/import and a one-time import of the prototype's `localStorage["quranTrakPersonalData_v2"]` (ticked "Completed" boxes become the plan's daily target).
- `app.js`, `ui.js`: rendering. User text is only inserted with `textContent`. The CSP in `netlify.toml` forbids inline scripts and styles, so use classes and `element.style.x`, never `style=""` or `on*=""`.

### Storage decision
SQLite runs **in the browser** (sql.js + IndexedDB) because Netlify Functions have an ephemeral filesystem. Hosted SQLite (Turso/libSQL) via Functions is deferred until accounts/sync/teacher features (§25-28).

## Prototype architecture (`base html/update.html`, superseded by `site/`)

Everything lives in one file: CSS in `<style>`, markup, and one `<script>`.

- **Navigation**: `<section class="page">` elements are toggled by `showPage(id)`. The pages are `welcome` → `intro` (name + virtues) → `plans` → `tracker`. Inside the tracker, `showAppSection()` switches the `daily`, `weekly` and `monthly` tabs. A modal (`setupModal`) edits name, current Hizbs and goal Hizbs.
- **State**: one global `appData` object is serialized to `localStorage` under the key `quranTrakPersonalData_v2`. `loadAppData()` deep-merges `profile`, `plans` and `weekly` over the defaults. Its shape:
  - `profile`: `{name, currentHizb, targetHizb}`. Progress is measured in Hizbs, with 60 in total.
  - `plans`: daily targets are `pagesDay` (New), `dailyR1` (Old), `dailyR2` (Recent) and `dailyR3` (Tilawah). The derived weekly/monthly values are also stored.
  - `daily[YYYY-MM-DD]`: for each of four rows (`new`, `old`, `recent`, `musa`), a text `*Range`, a `*Completed` checkbox and `*R1/*R2/*R3` checkboxes. It also holds `notes` and `completedDay`.
  - `weekly`: `{days: bool[7], reflection}`.
- **Data flow**: when a Hifz Plan input changes, `calculatePlans()` runs, then `savePlans()`, then `updateDashboard()`. That call refreshes the Daily Target card, which satisfies the spec requirement that the plan feed the Daily Target (§10, §32). Every daily input calls `saveDaily()` on change.

### Domain rules (keep these in any rewrite)
- The category keys are **N = New Hifz**, **R1 = Old Hifz/Old Revision**, **R2 = Recent Hifz/Recent Revision** and **R3 = Musāfahah/Tilawah**. User-facing UI should show the plain labels ("New Hifz", "Old Revision", "Recent Revision", "Tilawah / Musāfahah"), not an R1/R2/R3 column table (§23).
- The conversions are **weekly = daily × 6** (deliberately not ×7, §14), **monthly = weekly × 4** and **10 pages = 1 Hizb**.
- Tone: encourage the user ("Keep going"), never shame them for missed targets (§29). The visual style is ivory/cream and warm neutral, calm and minimal, and mobile-first (§21–22). The prototype's palette uses browns on `#f7f1e8` and `#fffdf9`.
