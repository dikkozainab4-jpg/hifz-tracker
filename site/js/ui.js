// Tiny DOM helpers. User text is only ever inserted as text nodes.
export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === false || v == null) continue;
    if (k === "class") node.className = v;
    else if (k.startsWith("on")) node.addEventListener(k.slice(2), v);
    else if (k === "value") node.value = v;
    else if (k === "checked") node.checked = Boolean(v);
    else node.setAttribute(k, v === true ? "" : v);
  }
  for (const c of children.flat()) {
    if (c == null || c === false) continue;
    node.append(c.nodeType ? c : document.createTextNode(String(c)));
  }
  return node;
}

let toastTimer;
export function toast(message) {
  const region = $("#toast");
  region.textContent = message;
  region.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => region.classList.remove("show"), 3500);
}

export function setBar(fillEl, pct) {
  fillEl.style.width = `${Math.max(0, Math.min(100, pct))}%`;
}

export const fmtPages = (n) => `${Number.isInteger(n) ? n : Number(n.toFixed(1))} page${n === 1 ? "" : "s"}`;

export function fmtDate(dateStr, opts = { weekday: "long", day: "numeric", month: "long", year: "numeric" }) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, opts);
}
