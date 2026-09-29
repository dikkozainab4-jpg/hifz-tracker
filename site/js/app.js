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

// Plan-page labels follow the prototype (update.html); the tracker uses the plain category labels.
const PLAN_LABELS = { new: "New Hifz", old: "Revision 1", recent: "Revision 2", tilawah: "Revision 3" };

function hizbLabel(pages) {
  const h = round1(pagesToHizb(pages));
  return `${round1(pages)} pages (${h} Hizb${h === 1 ? "" : "s"})`;
}

function renderPlan() {
  const plan = store.getPlan();
  const column = (title, field) =>
    el("div", { class: "plan-section" }, el("h2", {}, title), ...CATEGORIES.map(({ key }) => field(key)));

  const daily = column("Daily Plan", (key) =>
    el("div", { class: "plan-field" },
      el("label", { for: `plan-${key}` }, `${PLAN_LABELS[key]} — Pages per day`),
      el("input", {
        id: `plan-${key}`, type: "number", min: "0", max: "604", step: "0.1", inputmode: "decimal",
        placeholder: { new: "e.g. 1", old: "e.g. 2", recent: "e.g. 2", tilawah: "e.g. 10" }[key],
        value: plan[key] || "", oninput: onPlanInput,
      })));

  const derived = (title, unit, prefix) =>
    column(title, (key) =>
      el("div", { class: "plan-field calculated" },
        el("label", { class: "calculated-label", for: `${prefix}-${key}` }, `${PLAN_LABELS[key]} — Pages per ${unit}`),
        el("input", { id: `${prefix}-${key}`, readonly: true, placeholder: "—", "aria-describedby": `${prefix}-hizb-${key}` }),
        el("div", { class: "plan-result", id: `${prefix}-hizb-${key}` }, "—")));

  $("#plan-fields").replaceChildren(daily, derived("Weekly Plan", "week", "week"), derived("Monthly Plan", "month", "month"));
  updatePlanReadouts();
}

function readPlanInputs() {
  return Object.fromEntries(CATEGORIES.map(({ key }) => [key, toPages($(`#plan-${key}`).value)]));
}

function updatePlanReadouts() {
  const plan = readPlanInputs();
  for (const { key } of CATEGORIES) {
    const d = plan[key];
    for (const [prefix, pages] of [["week", weeklyOf(d)], ["month", monthlyOf(d)]]) {
      $(`#${prefix}-${key}`).value = d ? round1(pages) : "";
      $(`#${prefix}-hizb-${key}`).textContent = d ? hizbLabel(pages) : "—";
    }
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

  const rows = CATEGORIES.map(({ key, label }) => {
    const target = plan[key];
    return el("tr", {},
      el("th", { scope: "row" }, label, target ? el("span", { class: "row-target" }, `Target: ${fmtPages(target)}`) : null),
      el("td", {}, el("input", {
        id: `note-${key}`, type: "text", maxlength: "200", value: day.entries[key].note, "aria-label": `${label} ayah range`,
        placeholder: key === "tilawah" ? "e.g. Juz 1" : key === "new" ? "e.g. 1–10" : "Ayah range", oninput: onDailyInput,
      })),
      el("td", { class: "check-cell" }, el("input", {
        id: `done-${key}`, class: "check", type: "checkbox", checked: day.entries[key].done, "aria-label": `${label} completed`, onchange: onDailyInput,
      })));
  });

  const fill = el("div", { class: "progress-fill", id: "dailyProgressFill" });
  host.replaceChildren(el("div", { class: "card" },
    el("div", { class: "eyebrow" }, "DAILY HIFZ"),
    el("h2", {}, "Record today's memorisation and revision."),
    el("div", { class: "toolbar" },
      el("div", { class: "field" }, el("label", { for: "dailyDate" }, "Date"), dateInput),
      el("div", { class: "stepper" },
        el("button", { type: "button", class: "secondary-btn", "aria-label": "Previous day", onclick: () => shiftDay(-1) }, "←"),
        el("button", { type: "button", class: "secondary-btn", onclick: () => { state.date = todayStr(); renderDaily(); } }, "Today"),
        el("button", { type: "button", class: "secondary-btn", "aria-label": "Next day", onclick: () => shiftDay(1) }, "→"))),
    el("p", { class: "small-text" }, fmtDate(state.date)),
    el("table", { class: "daily-table" },
      el("thead", {}, el("tr", {}, el("th", { scope: "col" }, "Category"), el("th", { scope: "col" }, "Ayah Range"), el("th", { scope: "col", class: "check-cell" }, "Completed"))),
      el("tbody", {}, ...rows)),
    el("div", { class: "progress-box" },
      el("div", { class: "progress-label" }, el("span", {}, "Daily progress"), el("strong", { id: "dailyPercentage" })),
      el("div", { class: "progress-bar" }, fill),
      el("p", { class: "small-text", id: "dailyMessage" })),
    el("div", { class: "notes" },
      el("label", { for: "dailyNotes" }, "Notes / Reflections"),
      el("p", { class: "small-text" }, "Write anything you want to remember from today."),
      el("textarea", { id: "dailyNotes", placeholder: "How did today's Hifz go?", oninput: onDailyInput }, day.notes)),
    el("div", { class: "daily-actions" },
      el("button", { type: "button", class: "primary-btn", id: "complete-day", "aria-pressed": String(day.completed), onclick: toggleComplete },
        day.completed ? "Day complete ✓ (undo)" : "Mark Day Complete"))));

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
    entries[key] = { done: $(`#done-${key}`).checked, note: $(`#note-${key}`).value };
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
  const done = CATEGORIES.filter(({ key }) => $(`#done-${key}`).checked).length;
  const pct = Math.round((done / CATEGORIES.length) * 100);
  $("#dailyPercentage").textContent = `${pct}%`;
  setBar($("#dailyProgressFill"), pct);
  $("#dailyMessage").textContent = done === CATEGORIES.length ? "Everything done today, alhamdulillah."
    : done > 0 ? `${done} of ${CATEGORIES.length} done. Keep going, every step counts.`
    : "A little is better than none. Start whenever you are ready.";
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
  const s = summarise(range, store.daysBetween(range.start, range.end), plan, todayStr(), { targetDaysPerPeriod: 6 });
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
    periodBar("Days active (6 make a full week)", s.consistencyPct),
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
