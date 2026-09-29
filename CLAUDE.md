# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project state

Hifzly (Hifz Tracker) is a Quran memorization planner and tracker. The repo has no application code, build tooling, package.json, tests or git history yet. It contains:

- `Hifz Tracker App.md`: the product spec. It is the source of truth for features, UX tone and the MVP scope (§31). `# Hifz Tracker App.txt` is an identical copy.
- `base html/`: single-file HTML/CSS/vanilla-JS prototypes. **`update.html` is the newest and is the reference.** `hifz.html` and `index.html` are earlier iterations; they differ mainly in the tracker dashboard's "Daily Target" card.

The goal is to turn the prototype into a web app that stores data in **SQLite** and is **hosted on Netlify**. When commands (dev, build, test) are added, document them here.

### Storage/hosting constraint to settle before building
Netlify serves static files plus serverless Functions, and Functions have an ephemeral, read-only filesystem. A `.sqlite` file on the server will **not** persist. The workable options are:
- **SQLite in the browser** (sql.js or the official SQLite WASM build, persisted via OPFS/IndexedDB). This fits the spec's "local saving, no account" MVP (§15), and the app stays fully static on Netlify.
- **Hosted SQLite** (e.g. Turso/libSQL) reached from Netlify Functions. This is needed later for accounts, sync, or the teacher/parent features (§25–28).

Confirm which one the user wants before scaffolding.

## Prototype architecture (`base html/update.html`)

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

### Known gaps between the prototype and the spec
- The spec wants **target vs. actual amounts** per category (§11). The prototype records only checkboxes and ayah-range text, with no completed quantities.
- The weekly view is 7 manual toggles that are not linked to dates or daily records. Weekly and monthly reflections (§12–13) should be derived from the daily records instead.
- The monthly view assumes 30 days of the current month. Its R1/R2/R3 toggles write only to the `new*` fields.
- `updateDashboard()` falls back to the hardcoded name "Zainab". Default `currentHizb` is 33.
- Any migration from the prototype's `localStorage` data should read the key `quranTrakPersonalData_v2`.
