import { CATEGORIES, toPages, weeklyOf, monthlyOf, pagesToHizb, round1, goalPercent, estimateWeeksToGoal } from "./calc.js";
import { todayStr, weekRange, monthRange, addDays, isValidDate } from "./dates.js";
import { summarise } from "./reflect.js";
import { createStore, ImportError } from "./store.js";
import { openPersistence } from "./idb.js";
import { $, $$, el, toast, setBar, fmtPages, fmtDate } from "./ui.js";

const LEGACY_KEY = "quranTrakPersonalData_v2";
let store;
const state = { date: todayStr(), tab: "daily" };

/* ---------- boot ---------- */

async function boot() {
  let persistence = {};
  let persisted = false;
  try {
    persistence = await openPersistence();
    persisted = true;
    navigator.storage?.persist?.().catch(() => {});
  } catch {
    $("#storage-notice").hidden = false;
  }

  const SQL = await window.initSqlJs({ locateFile: (f) => `vendor/${f}` });
  store = createStore(SQL, { bytes: persistence.bytes, save: persistence.save, persisted });

  try {
    store.importLegacy(localStorage.getItem(LEGACY_KEY));
  } catch (e) {
    console.warn("Legacy import skipped", e);
  }

  wire();
  if (store.hasData()) openTracker();
  else showPage("welcome");
}

/* ---------- navigation ---------- */

function showPage(id) {
  $$(".page").forEach((p) => p.classList.toggle("active", p.id === id));
  $$("[data-nav]").forEach((b) => {
    if (b.dataset.nav === id || (id === "intro" && b.dataset.nav === "welcome")) b.setAttribute("aria-current", "page");
    else b.removeAttribute("aria-current");
  });
  if (id === "intro") $("#userName").value = store.getProfile().name;
  if (id === "plans") renderPlan();
  window.scrollTo({ top: 0 });
}

function openTracker() {
  showPage("tracker");
  renderDashboard();
  showTab(state.tab);
}

function showTab(tab) {
  state.tab = tab;
  $$("[data-tab]").forEach((b) => {
    const on = b.dataset.tab === tab;
    b.setAttribute("aria-selected", String(on));
    b.tabIndex = on ? 0 : -1;
  });
  $$(".app-section").forEach((s) => s.classList.toggle("active", s.id === tab));
  ({ daily: renderDaily, weekly: renderWeekly, monthly: renderMonthly })[tab]();
}

/* ---------- plan ---------- */

function renderPlan() {
  const plan = store.getPlan();
  const host = $("#plan-fields");
  host.replaceChildren(
    ...CATEGORIES.map(({ key, label }) => {
      const readout = el("p", { class: "small-text", id: `plan-out-${key}` });
      const input = el("input", {
        id: `plan-${key}`, type: "number", min: "0", max: "604", step: "0.1", inputmode: "decimal",
        placeholder: "0", value: plan[key] || "", "aria-describedby": `plan-out-${key}`,
        oninput: () => onPlanInput(),
      });
      return el("div", { class: "plan-item" }, el("label", { for: `plan-${key}` }, `${label}: pages per day`), input, readout);
    }),
  );
  updatePlanReadouts();
}

function readPlanInputs() {
  return Object.fromEntries(CATEGORIES.map(({ key }) => [key, toPages($(`#plan-${key}`).value)]));
}

function hizbLabel(pages) {
  const h = round1(pagesToHizb(pages));
  return `${fmtPages(round1(pages))} (${h} Hizb${h === 1 ? "" : "s"})`;
}

function updatePlanReadouts() {
  const plan = readPlanInputs();
  for (const { key } of CATEGORIES) {
    const d = plan[key];
    $(`#plan-out-${key}`).textContent = d
      ? `Weekly (×6): ${hizbLabel(weeklyOf(d))} · Monthly (×4): ${hizbLabel(monthlyOf(d))}`
      : "Enter a daily amount to see your weekly and monthly targets.";
  }
}

function onPlanInput() {
  store.savePlan(readPlanInputs());
  updatePlanReadouts();
  renderDashboard();
}

/* ---------- dashboard ---------- */

function renderDashboard() {
  const { name, currentHizb, targetHizb } = store.getProfile();
  const plan = store.getPlan();
  $("#greeting").textContent = `Assalamu alaykum${name ? `, ${name}` : ""} 🤍`;
  $("#currentHizb").textContent = round1(currentHizb);
  $("#targetHizb").textContent = round1(targetHizb);
  const pct = goalPercent(currentHizb, targetHizb);
  $("#hifzPercentage").textContent = Math.round(pct);
  setBar($("#hifzProgressFill"), pct);
  $("#goal-bar").setAttribute("aria-valuenow", String(Math.round(pct)));

  const weeks = estimateWeeksToGoal(currentHizb, targetHizb, plan.new);
  $("#estimate").textContent =
    weeks == null
      ? currentHizb >= targetHizb ? "You have reached your goal. Alhamdulillah!" : "Set a New Hifz target in your plan to see an estimate."
      : `At your current pace, about ${weeks} week${weeks === 1 ? "" : "s"} to go, in shā’ Allāh. This is only an estimate.`;

  $("#daily-target").replaceChildren(
    ...CATEGORIES.map(({ key, label }) => el("div", {}, el("dt", {}, label), el("dd", {}, plan[key] ? fmtPages(plan[key]) : "—"))),
  );
}

/* ---------- daily ---------- */

function renderDaily() {
  const plan = store.getPlan();
  const day = store.getDay(state.date);
  const host = $("#daily");

  const dateInput = el("input", {
    id: "dailyDate", type: "date", value: state.date,
    onchange: (e) => { if (isValidDate(e.target.value)) { state.date = e.target.value; renderDaily(); } },
  });

  const entries = CATEGORIES.map(({ key, label }) => {
    const target = plan[key];
    const status = el("p", { class: "entry-status", id: `status-${key}` });
    const pages = el("input", {
      id: `pages-${key}`, type: "number", min: "0", max: "604", step: "0.5", inputmode: "decimal",
      value: day.entries[key].pages || "", placeholder: "0", oninput: onDailyInput,
    });
    const note = el("input", {
      id: `note-${key}`, type: "text", maxlength: "200", value: day.entries[key].note,
      placeholder: key === "tilawah" ? "e.g. Juz 1" : "Ayah range, e.g. 1–10", oninput: onDailyInput,
    });
    return el("div", { class: "entry" },
      el("div", { class: "entry-head" }, el("h3", {}, label), el("span", { class: "small-text" }, target ? `Target: ${fmtPages(target)}` : "No target set")),
      el("div", { class: "entry-grid" },
        el("div", {}, el("label", { for: `pages-${key}` }, "Pages done"), pages),
        el("div", {}, el("label", { for: `note-${key}` }, "Range or note"), note)),
      status);
  });

  const fill = el("div", { class: "progress-fill", id: "dailyProgressFill" });
  host.replaceChildren(el("div", { class: "card" },
    el("div", { class: "eyebrow" }, "DAILY HIFZ"),
    el("h2", {}, "Record today's memorisation and revision"),
    el("div", { class: "toolbar" },
      el("div", { class: "field" }, el("label", { for: "dailyDate" }, "Date"), dateInput),
      el("div", { class: "stepper" },
        el("button", { type: "button", class: "secondary-btn", "aria-label": "Previous day", onclick: () => shiftDay(-1) }, "←"),
        el("button", { type: "button", class: "secondary-btn", onclick: () => { state.date = todayStr(); renderDaily(); } }, "Today"),
        el("button", { type: "button", class: "secondary-btn", "aria-label": "Next day", onclick: () => shiftDay(1) }, "→"))),
    el("p", { class: "small-text" }, fmtDate(state.date)),
    el("div", { class: "entries" }, ...entries),
    el("div", { class: "progress-box" },
      el("div", { class: "progress-label" }, el("span", {}, "Today against your targets"), el("strong", { id: "dailyPercentage" })),
      el("div", { class: "progress-bar" }, fill)),
    el("div", { class: "notes" },
      el("label", { for: "dailyNotes" }, "Notes / reflections"),
      el("textarea", { id: "dailyNotes", placeholder: "How did today's Hifz go?", oninput: onDailyInput }, day.notes)),
    el("div", { class: "daily-actions" },
      el("button", { type: "button", class: "primary-btn", id: "complete-day", "aria-pressed": String(day.completed), onclick: toggleComplete },
        day.completed ? "Day complete ✓ (undo)" : "Mark day complete"))));

  $("#dailyNotes").value = day.notes;
  updateDailyStatus();
}

function shiftDay(n) {
  state.date = addDays(state.date, n);
  renderDaily();
}

function collectDay() {
  const entries = {};
  for (const { key } of CATEGORIES) {
    entries[key] = { pages: toPages($(`#pages-${key}`).value), note: $(`#note-${key}`).value };
  }
  return { notes: $("#dailyNotes").value, completed: $("#complete-day").getAttribute("aria-pressed") === "true", entries };
}

function onDailyInput() {
  store.saveDay(state.date, collectDay());
  updateDailyStatus();
}

function toggleComplete() {
  const d = collectDay();
  d.completed = !d.completed;
  store.saveDay(state.date, d);
  renderDaily();
  toast(d.completed ? "Day complete. Alhamdulillah, well done 🤍" : "Day reopened.");
}

function updateDailyStatus() {
  const plan = store.getPlan();
  const day = collectDay();
  let done = 0;
  let planned = 0;
  for (const { key } of CATEGORIES) {
    const target = plan[key];
    const actual = day.entries[key].pages;
    planned += target;
    done += target ? Math.min(actual, target) : 0;
    const s = $(`#status-${key}`);
    s.classList.toggle("met", Boolean(target) && actual >= target);
    s.textContent = target && actual >= target ? "Target met, alhamdulillah."
      : actual > 0 ? (target ? `${fmtPages(round1(actual))} of ${fmtPages(target)}. Every page counts, keep going.` : `${fmtPages(round1(actual))} recorded.`)
      : target ? "Not started yet. A little is better than none." : "Set a target in your Hifz Plan to compare.";
  }
  const pct = planned ? Math.round((done / planned) * 100) : 0;
  $("#dailyPercentage").textContent = planned ? `${pct}%` : "—";
  setBar($("#dailyProgressFill"), pct);
}

/* ---------- weekly / monthly ---------- */

function periodBar(label, pct) {
  const fill = el("div", { class: "progress-fill" });
  setBar(fill, pct);
  return el("div", { class: "progress-box" },
    el("div", { class: "progress-label" }, el("span", {}, label), el("strong", {}, `${pct}%`)),
    el("div", { class: "progress-bar" }, fill));
}

function statGrid(s, plan, periodDays) {
  return el("div", { class: "stat-grid" },
    ...CATEGORIES.map(({ key, label }) => el("div", { class: "stat" },
      el("span", { class: "num" }, round1(s.totals[key])),
      el("span", { class: "small-text" }, `${label} pages`),
      plan[key] ? el("span", { class: "small-text" }, `Target ${round1(plan[key] * periodDays)}`) : null)));
}

function renderWeekly() {
  const range = weekRange(state.date);
  const plan = store.getPlan();
  const s = summarise(range, store.daysBetween(range.start, range.end), plan, todayStr());
  const letters = ["M", "T", "W", "T", "F", "S", "S"];
  const days = s.perDay.map((d, i) => el("button", {
    type: "button", class: `week-day${d.active ? " active" : ""}${d.elapsed ? "" : " future"}`,
    "aria-label": `${fmtDate(d.date)}: ${d.active ? "active" : "no activity"}`,
    onclick: () => { state.date = d.date; showTab("daily"); },
  }, el("span", { class: "letter" }, letters[i]), el("span", { class: "status" }, d.active ? "✓" : "○")));

  const refl = el("textarea", { id: "weeklyReflection", placeholder: "Write your reflection...", oninput: (e) => store.saveReflection(range.key, e.target.value) });
  $("#weekly").replaceChildren(el("div", { class: "card" },
    el("div", { class: "eyebrow" }, "WEEKLY REFLECTION"),
    el("h2", {}, s.activeDays ? `You showed up on ${s.activeDays} day${s.activeDays === 1 ? "" : "s"} this week` : "A fresh week, a fresh start"),
    stepper(`${fmtDate(range.start, { day: "numeric", month: "short" })} – ${fmtDate(range.end, { day: "numeric", month: "short", year: "numeric" })}`, 7),
    el("div", { class: "week-days" }, ...days),
    statGrid(s, plan, 6),
    periodBar("Days active so far", s.consistencyPct),
    periodBar("Target completion", s.targetPct),
    el("div", { class: "notes" }, el("label", { for: "weeklyReflection" }, "What went well? What can you improve next week?"), refl)));
  refl.value = store.getReflection(range.key);
}

function renderMonthly() {
  const range = monthRange(state.date);
  const plan = store.getPlan();
  const s = summarise(range, store.daysBetween(range.start, range.end), plan, todayStr());
  const list = s.perDay.map((d) => el("li", {}, el("button", { type: "button", onclick: () => { state.date = d.date; showTab("daily"); } },
    el("span", {}, fmtDate(d.date, { weekday: "short", day: "numeric", month: "short" })),
    el("span", { class: d.completed ? "done" : "" }, d.completed ? "Complete ✓" : d.pages ? fmtPages(round1(d.pages)) : "—"))));

  const refl = el("textarea", { id: "monthlyReflection", placeholder: "Write your reflection...", oninput: (e) => store.saveReflection(range.key, e.target.value) });
  $("#monthly").replaceChildren(el("div", { class: "card" },
    el("div", { class: "eyebrow" }, "MONTHLY REFLECTION"),
    el("h2", {}, fmtDate(range.start, { month: "long", year: "numeric" })),
    stepper("", 30),
    statGrid(s, plan, s.elapsedDays),
    periodBar("Days active so far", s.consistencyPct),
    periodBar("Target completion", s.targetPct),
    el("ul", { class: "day-list" }, ...list),
    el("div", { class: "notes" }, el("label", { for: "monthlyReflection" }, "Month reflection"), refl)));
  refl.value = store.getReflection(range.key);
}

function stepper(labelText, step) {
  const move = (dir) => {
    if (step === 7) state.date = addDays(state.date, 7 * dir);
    else {
      const r = monthRange(state.date);
      state.date = dir < 0 ? addDays(r.start, -1) : addDays(r.end, 1);
    }
    showTab(state.tab);
  };
  return el("div", { class: "toolbar" },
    el("span", { class: "range-label" }, labelText),
    el("div", { class: "stepper" },
      el("button", { type: "button", class: "secondary-btn", "aria-label": step === 7 ? "Previous week" : "Previous month", onclick: () => move(-1) }, "←"),
      el("button", { type: "button", class: "secondary-btn", onclick: () => { state.date = todayStr(); showTab(state.tab); } }, step === 7 ? "This week" : "This month"),
      el("button", { type: "button", class: "secondary-btn", "aria-label": step === 7 ? "Next week" : "Next month", onclick: () => move(1) }, "→")));
}

/* ---------- setup dialog ---------- */

function openSetup() {
  const p = store.getProfile();
  $("#setupName").value = p.name;
  $("#setupCurrentHizb").value = p.currentHizb;
  $("#setupTargetHizb").value = p.targetHizb;
  $("#setup").showModal();
}

/* ---------- export / import ---------- */

function exportData() {
  const blob = new Blob([JSON.stringify(store.exportJson(), null, 2)], { type: "application/json" });
  const a = el("a", { href: URL.createObjectURL(blob), download: `hifzly-backup-${todayStr()}.json` });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  toast("Backup downloaded.");
}

async function importData(file) {
  try {
    if (file.size > 5_000_000) throw new ImportError("That file is too large to be a Hifzly backup.");
    let parsed;
    try {
      parsed = JSON.parse(await file.text());
    } catch {
      throw new ImportError("That file could not be read as a backup.");
    }
    store.importJson(parsed);
    toast("Backup restored.");
    openTracker();
  } catch (e) {
    if (!(e instanceof ImportError)) console.error(e);
    toast(e instanceof ImportError ? e.message : "Sorry, the backup could not be restored. Your data is unchanged.");
  }
}

/* ---------- wiring ---------- */

function wire() {
  $$("[data-nav]").forEach((b) => b.addEventListener("click", () => {
    const id = b.dataset.nav;
    if (id === "tracker") openTracker();
    else showPage(id);
  }));
  $("#begin").addEventListener("click", () => showPage("intro"));
  $("#intro-continue").addEventListener("click", () => {
    const name = $("#userName").value.trim();
    if (name) store.saveProfile({ ...store.getProfile(), name });
    showPage("plans");
  });
  $("#plan-open-tracker").addEventListener("click", openTracker);
  $("#open-setup").addEventListener("click", openSetup);
  $("#setup-cancel").addEventListener("click", () => $("#setup").close());
  $("#setup-form").addEventListener("submit", () => {
    store.saveProfile({
      name: $("#setupName").value,
      currentHizb: $("#setupCurrentHizb").value,
      targetHizb: $("#setupTargetHizb").value,
    });
    renderDashboard();
    toast("Your journey is saved.");
  });
  $$("[data-tab]").forEach((b) => {
    b.addEventListener("click", () => showTab(b.dataset.tab));
    b.addEventListener("keydown", (e) => {
      const tabs = $$("[data-tab]");
      const i = tabs.indexOf(b);
      const next = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
      if (next) { const t = tabs[(i + next + tabs.length) % tabs.length]; showTab(t.dataset.tab); t.focus(); }
    });
  });
  $("#export-data").addEventListener("click", exportData);
  $("#import-data").addEventListener("click", () => $("#import-file").click());
  $("#import-file").addEventListener("change", (e) => {
    const f = e.target.files[0];
    e.target.value = "";
    if (f) importData(f);
  });
  $("#dismiss-notice").addEventListener("click", () => { $("#storage-notice").hidden = true; });
  window.addEventListener("pagehide", () => store.flush());
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") store.flush(); });
}

boot().catch((e) => {
  console.error(e);
  document.getElementById("main").prepend(el("p", { class: "notice" }, "Sorry, Hifzly could not start. Please refresh the page."));
});
