import { RECIPE, EQUIPMENT, FLOURS, PRESETS } from "./recipe.js";
import { methodSteps } from "./method.js";
import { calcDough, yeastPct, stagesFromPlan, equivalentHours, buildTimeline, toICS, waterTemp, YEAST_FACTORS, blendFlour } from "./calc.js";

const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const LS_STATE = "pizza.state.v1", LS_LOG = "pizza.log.v1", LS_TICKS = "pizza.ticks.v1";

const clone = (o) => JSON.parse(JSON.stringify(o));
const load = (k, d) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } };
const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };

function deepMerge(base, over) {
  if (typeof base !== "object" || base === null || Array.isArray(base)) return over ?? base;
  const out = { ...base };
  for (const k of Object.keys(over || {})) out[k] = k in base ? deepMerge(base[k], over[k]) : over[k];
  return out;
}

let state = deepMerge({ dough: RECIPE.dough, plan: RECIPE.plan, eatAt: null, flourLib: {}, customFlours: [] }, load(LS_STATE, {}));
let log = load(LS_LOG, []);
let ticks = new Set(load(LS_TICKS, []));

const get = (path) => path.split(".").reduce((o, k) => o?.[k], state);
const set = (path, v) => { const ks = path.split("."); const last = ks.pop(); ks.reduce((o, k) => (o[k] ??= {}), state)[last] = v; };

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

// Flour library = built-ins + user's custom flours, with user overrides of protein/W.
function flourLib() {
  const lib = {};
  for (const f of [...FLOURS, ...state.customFlours]) lib[f.id] = { ...f, ...(state.flourLib[f.id] || {}) };
  return lib;
}

function applyPreset(key) {
  const p = PRESETS[key];
  Object.assign(state.dough, clone(p.dough));
  Object.assign(state.plan, clone(p.plan));
  persist(); syncInputs(); render();
}
function presetModified() {
  const p = PRESETS[state.dough.style]; if (!p) return false;
  const diff = (src, tgt) => Object.entries(src).some(([k, v]) => JSON.stringify(v) !== JSON.stringify(tgt[k]));
  return diff(p.dough, state.dough) || diff(p.plan, state.plan);
}
function syncInputs() { $$("[data-k]").forEach((el) => (el.value = String(get(el.dataset.k)))); }

function defaultEatAt() {
  const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(18, 30, 0, 0); return d;
}
const toLocalInput = (d) => new Date(d.getTime() - d.getTimezoneOffset() * 60e3).toISOString().slice(0, 16);
const fmtG = (g) => (g < 10 ? g.toFixed(1) : Math.round(g).toString()) + " g";
const fmtTime = (d) => d.toLocaleString("en-GB", { weekday: "short", hour: "2-digit", minute: "2-digit" });

// ---------- bindings ----------
function bindInputs() {
  $$("[data-k]").forEach((el) => {
    const k = el.dataset.k; const v = get(k);
    el.value = String(v);
    el.addEventListener("input", () => {
      let val = el.value;
      if (el.type === "number") val = parseFloat(val); else if (val === "true" || val === "false") val = val === "true";
      if (el.type === "number" && Number.isNaN(val)) return;
      set(k, val); persist(); render();
    });
  });
  $$("#mode-seg button").forEach((b) => b.addEventListener("click", () => { state.plan.mode = b.dataset.mode; persist(); render(); }));
  $$("#style-seg button").forEach((b) => b.addEventListener("click", () => {
    if (presetModified() && !confirm(`Apply ${PRESETS[b.dataset.style].label} preset? This replaces dough, flour and fermentation settings.`)) return;
    applyPreset(b.dataset.style);
  }));
  bindFlour();
  $$("nav.tabs button").forEach((b) => b.addEventListener("click", () => {
    $$("nav.tabs button").forEach((x) => x.classList.toggle("active", x === b));
    $$(".tab").forEach((t) => t.classList.toggle("active", t.id === "tab-" + b.dataset.tab));
    window.scrollTo(0, 0);
  }));
  const eat = $("#eat-at");
  eat.value = toLocalInput(state.eatAt ? new Date(state.eatAt) : defaultEatAt());
  eat.addEventListener("input", () => { state.eatAt = new Date(eat.value).toISOString(); persist(); render(); });
  $("#reset-recipe").addEventListener("click", () => {
    if (!confirm("Reset dough + plan to house recipe v" + RECIPE.version + "?")) return;
    state.dough = clone(RECIPE.dough); state.plan = clone(RECIPE.plan); persist();
    syncInputs(); render();
  });
  $("#method").addEventListener("change", (ev) => {
    const k = ev.target.dataset?.step; if (!k) return;
    ev.target.checked ? ticks.add(k) : ticks.delete(k); save(LS_TICKS, [...ticks]);
    ev.target.closest("label").classList.toggle("done", ev.target.checked);
  });
  $("#method-clear").addEventListener("click", () => { ticks.clear(); save(LS_TICKS, []); render(); });
  $("#ics").addEventListener("click", () => download("pizza-plan.ics", toICS(currentTimeline(), "Pizza"), "text/calendar"));
  bindLog();
}

function persist() { save(LS_STATE, state); }

// ---------- compute ----------
function currentYeastPct() {
  return yeastPct(stagesFromPlan(state.plan), state.dough.yeastType, state.dough.yeastCalibration);
}
function currentTimeline() {
  const eatAt = state.eatAt ? new Date(state.eatAt) : defaultEatAt();
  return buildTimeline({ ...state.plan, eatAt, preferment: state.dough.preferment.type });
}

// ---------- render ----------
function render() {
  document.body.classList.toggle("mode-cold", state.plan.mode === "cold");
  document.body.classList.toggle("pf", state.dough.preferment.type !== "none");
  $$("#mode-seg button").forEach((b) => b.classList.toggle("on", b.dataset.mode === state.plan.mode));
  $$("#style-seg button").forEach((b) => b.classList.toggle("on", b.dataset.style === state.dough.style));
  $("#style-blurb").textContent = PRESETS[state.dough.style]?.blurb ?? "";
  $("#style-mod").textContent = presetModified() ? "· modified" : "";
  $("#recipe-version").textContent = `house recipe v${RECIPE.version}`;

  const y = currentYeastPct();
  const d = state.dough;
  const res = calcDough({ ...d, yeastPct: y, yeastFactor: YEAST_FACTORS[d.yeastType] });
  const yName = { fresh: "Fresh yeast", instant: "Instant dry yeast", active: "Active dry yeast" }[d.yeastType];
  const lib = flourLib();
  const blend = blendFlour(d.flours, lib, (res.preferment ? res.final : res.total).flour);
  renderFlourCard(blend, lib);
  const flourRows = (grams) => {
    const b = blendFlour(d.flours, lib, grams);
    if (b.parts.length <= 1) return `<tr><td>Flour${b.parts[0] ? ` <span class="muted small">(${esc(b.parts[0].name)})</span>` : ""}</td><td>${fmtG(grams)}</td></tr>`;
    return `<tr><td>Flour (total)</td><td>${fmtG(grams)}</td></tr>` +
      b.parts.map((x) => `<tr><td class="sub">${esc(x.name)} ${x.pct} %</td><td>${fmtG(x.grams)}</td></tr>`).join("");
  };
  const rows = (o, withTotal) => `
    ${flourRows(o.flour)}
    <tr><td>Water</td><td>${fmtG(o.water)}</td></tr>
    <tr><td>Salt</td><td>${fmtG(o.salt)}</td></tr>
    ${o.oil ? `<tr><td>Olive oil</td><td>${fmtG(o.oil)}</td></tr>` : ""}
    ${o.sugar ? `<tr><td>Sugar/malt</td><td>${fmtG(o.sugar)}</td></tr>` : ""}
    <tr><td>${yName}</td><td>${o.yeast.toFixed(2)} g</td></tr>
    ${withTotal ? `<tr class="total"><td>Total dough</td><td>${fmtG(o.dough)}</td></tr>` : ""}`;

  if (res.preferment) {
    const p = res.preferment;
    $("#pf-out").innerHTML = `<h3>${d.preferment.type} (make ${state.plan.prefermentHours} h ahead)</h3>
      <table>${flourRows(p.flour)}<tr><td>Water</td><td>${fmtG(p.water)}</td></tr>
      <tr><td>${yName}</td><td>${p.yeast.toFixed(2)} g</td></tr></table>
      <h3>Final dough (add to preferment)</h3>
      ${res.waterShortfall ? `<p class="warn small">Preferment needs more water than the recipe has — lower preferment %.</p>` : ""}`;
    $("#out").innerHTML = rows(res.final, true);
  } else {
    $("#pf-out").innerHTML = "";
    $("#out").innerHTML = rows(res.total, true);
  }

  const eq = equivalentHours(stagesFromPlan(state.plan));
  $("#yeast-note").textContent =
    `Yeast ${y.toFixed(3)} % (${d.yeastType}) ≈ ${eq.toFixed(1)} h-equivalent at 20 °C. ` +
    `Model estimate: if dough over-proofs, lower calibration (e.g. 0.8); under-proofs, raise it.`;

  const wt = waterTemp({ targetDough: 24, flourTemp: state.plan.rtTemp, roomTemp: state.plan.rtTemp, friction: EQUIPMENT.mixer.frictionC });
  $("#water-temp").textContent = `Water temp for ~24 °C dough: ${Math.round(wt)} °C (Kenwood friction ≈ ${EQUIPMENT.mixer.frictionC} °C).`;

  const steps = methodSteps({ dough: d, plan: state.plan, res, waterTempC: wt });
  let lastPhase = "";
  $("#method").innerHTML = steps.map((s) => {
    const head = s.phase !== lastPhase ? `<li class="phase">${s.phase}</li>` : "";
    lastPhase = s.phase;
    const on = ticks.has(s.title);
    return `${head}<li><label class="step ${on ? "done" : ""}"><input type="checkbox" data-step="${s.title}" ${on ? "checked" : ""}>` +
      `<div><b>${s.n}. ${s.title}</b><span>${s.text}</span></div></label></li>`;
  }).join("");

  const now = Date.now();
  const tl = currentTimeline();
  const late = tl[0].at.getTime() < now;
  $("#timeline").innerHTML = (late ? `<li class="warn small">First step is already in the past: move "Eat at" later or shorten fermentation.</li>` : "") + tl.map((s) =>
    `<li class="${s.at.getTime() < now ? "past" : ""}"><div class="when">${fmtTime(s.at)} — ${s.label}</div><div class="small muted">${s.detail}</div></li>`
  ).join("");

  renderLog();
}

// ---------- flour blend ----------
function renderFlourCard(blend, lib) {
  const opts = (sel) => Object.values(lib).map((f) => `<option value="${esc(f.id)}" ${f.id === sel ? "selected" : ""}>${esc(f.name)}</option>`).join("");
  const focused = document.activeElement?.dataset?.fi;
  $("#flour-rows").innerHTML = state.dough.flours.map((f, i) => `
    <div class="flour-row">
      <select data-fi="${i}" data-f="id">${opts(f.id)}</select>
      <input class="pct" type="number" inputmode="decimal" step="5" min="0" max="100" data-fi="${i}" data-f="pct" value="${f.pct}" aria-label="Percent">
      <button data-fdel="${i}" aria-label="Remove" ${state.dough.flours.length < 2 ? "disabled" : ""}>✕</button>
      ${lib[f.id]?.notes ? `<span class="hint muted small">${esc(lib[f.id].notes)}</span>` : ""}
    </div>`).join("");
  if (focused != null) { const el = $(`#flour-rows input[data-fi="${focused}"]`); if (el) { el.focus(); const v = el.value; el.value = ""; el.value = v; } }
  const pr = blend.protein, W = blend.W;
  const part = (x, unit, dp) => x ? `${x.value.toFixed(dp)}${unit}${x.coverage < 0.999 ? ` (from ${Math.round(x.coverage * 100)} % of blend)` : ""}` : "unknown";
  $("#flour-summary").innerHTML =
    (blend.valid ? "" : `<span class="warn">Blend adds up to ${+blend.total.toFixed(1)} %, not 100 %.</span><br>`) +
    `Protein ≈ ${part(pr, " %", 1)} · W ≈ ${part(W, "", 0)}<br><span class="muted">${blend.tolerance}</span>`;
}

function bindFlour() {
  const rows = $("#flour-rows");
  const onEdit = (ev) => {
    const i = ev.target.dataset.fi; if (i == null) return;
    const f = state.dough.flours[+i];
    if (ev.target.dataset.f === "pct") { const v = parseFloat(ev.target.value); if (Number.isNaN(v)) return; f.pct = v; }
    else f.id = ev.target.value;
    persist(); render();
  };
  rows.addEventListener("input", onEdit);
  rows.addEventListener("change", (ev) => ev.target.tagName === "SELECT" && onEdit(ev));
  rows.addEventListener("click", (ev) => {
    const i = ev.target.dataset?.fdel; if (i == null) return;
    state.dough.flours.splice(+i, 1); persist(); render();
  });
  $("#flour-add").addEventListener("click", () => {
    const used = new Set(state.dough.flours.map((f) => f.id));
    const next = Object.keys(flourLib()).find((id) => !used.has(id)) ?? FLOURS[0].id;
    const rest = Math.max(0, 100 - state.dough.flours.reduce((s, f) => s + f.pct, 0));
    state.dough.flours.push({ id: next, pct: rest || 10 }); persist(); render();
  });
  $("#flour-even").addEventListener("click", () => {
    const fl = state.dough.flours, total = fl.reduce((s, f) => s + f.pct, 0);
    if (!total) fl.forEach((f) => (f.pct = +(100 / fl.length).toFixed(1)));
    else { fl.forEach((f) => (f.pct = Math.round((f.pct * 100) / total))); fl[0].pct += 100 - fl.reduce((s, f) => s + f.pct, 0); }
    persist(); render();
  });
}

// ---------- gear ----------
function renderGear() {
  const e = EQUIPMENT;
  const card = (title, name, notes) => `<div class="card"><h2>${title}</h2><p><b>${name}</b></p><ul class="small">${notes.map((n) => `<li>${n}</li>`).join("")}</ul></div>`;
  $("#gear").innerHTML =
    card("Oven", e.oven.name, e.oven.notes) +
    card("Mixer", e.mixer.name, e.mixer.notes) +
    `<div class="card"><h2>Flours</h2><p class="muted small">Typical values, so check your bag and correct them here. They drive the blend protein/W and the fermentation hint.</p>
      <div class="gear-flour gear-head"><span>Flour</span><span>Protein %</span><span>W</span></div>
      <div id="gear-flours"></div>
      <div class="row"><input id="new-flour" placeholder="New flour name" style="flex:1"><button id="add-flour" class="ghost">Add</button></div></div>` +
    `<div class="card"><h2>Tools</h2><ul class="small">${e.tools.map((t) => `<li>${t}</li>`).join("")}</ul></div>`;
  $("#changelog").innerHTML = RECIPE.changelog.map((c) => `<li>${c}</li>`).join("");
  renderGearFlours();
  $("#gear-flours").addEventListener("input", (ev) => {
    const { gid, gk } = ev.target.dataset; if (!gid) return;
    const v = ev.target.value === "" ? null : parseFloat(ev.target.value);
    if (v != null && Number.isNaN(v)) return;
    (state.flourLib[gid] ??= {})[gk] = v; persist(); render();
  });
  $("#add-flour").addEventListener("click", () => {
    const name = $("#new-flour").value.trim(); if (!name) return;
    state.customFlours.push({ id: "custom-" + Date.now(), name, protein: null, W: null, notes: "Your flour." });
    $("#new-flour").value = ""; persist(); renderGearFlours(); render();
  });
}
function renderGearFlours() {
  $("#gear-flours").innerHTML = Object.values(flourLib()).map((f) => `
    <div class="gear-flour"><span class="n">${esc(f.name)}${f.notes ? `<small>${esc(f.notes)}</small>` : ""}</span>
      <input type="number" step="0.1" data-gid="${esc(f.id)}" data-gk="protein" value="${f.protein ?? ""}" placeholder="?">
      <input type="number" step="10" data-gid="${esc(f.id)}" data-gk="W" value="${f.W ?? ""}" placeholder="?"></div>`).join("");
}

// ---------- log ----------
function bindLog() {
  $("#log-date").value = new Date().toISOString().slice(0, 10);
  $("#log-save").addEventListener("click", () => {
    const n = (id) => { const v = parseFloat($(id).value); return Number.isNaN(v) ? null : v; };
    const entry = {
      id: Date.now(), date: $("#log-date").value, recipeVersion: RECIPE.version,
      flours: state.dough.flours.map((f) => ({ ...f, name: flourLib()[f.id]?.name })), stoneC: n("#log-stone"), bakeSec: n("#log-bake"),
      ratings: { overall: n("#log-overall"), crust: n("#log-crust"), char: n("#log-char"), handling: n("#log-handling") },
      notes: $("#log-notes").value.trim(),
      dough: clone(state.dough), plan: clone(state.plan), yeastPct: +currentYeastPct().toFixed(4),
    };
    log.unshift(entry); save(LS_LOG, log);
    ["#log-overall", "#log-crust", "#log-char", "#log-handling", "#log-notes", "#log-stone", "#log-bake"].forEach((id) => ($(id).value = ""));
    renderLog();
  });
  $("#export").addEventListener("click", () => download(`pizza-export-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(exportData(), null, 2), "application/json"));
  $("#copy-claude").addEventListener("click", async () => {
    const txt = "Pizza Lab export — please analyse my bakes and suggest the next single change to try:\n```json\n" + JSON.stringify(exportData(), null, 1) + "\n```";
    try { await navigator.clipboard.writeText(txt); $("#copy-claude").textContent = "Copied ✓"; }
    catch { download("pizza-for-claude.txt", txt, "text/plain"); }
    setTimeout(() => ($("#copy-claude").textContent = "Copy for Claude"), 2000);
  });
  $("#import").addEventListener("change", async (ev) => {
    const f = ev.target.files[0]; if (!f) return;
    try {
      const data = JSON.parse(await f.text());
      if (Array.isArray(data.log)) { const ids = new Set(log.map((l) => l.id)); log = [...data.log.filter((l) => !ids.has(l.id)), ...log].sort((a, b) => b.id - a.id); save(LS_LOG, log); }
      if (data.state && confirm("Also replace current recipe settings with imported ones?")) { state = deepMerge(state, data.state); persist(); location.reload(); }
      renderLog();
    } catch { alert("Could not read that file."); }
  });
  $("#log-list").addEventListener("click", (ev) => {
    const id = ev.target.dataset?.del; if (!id) return;
    if (!confirm("Delete this bake?")) return;
    log = log.filter((l) => String(l.id) !== id); save(LS_LOG, log); renderLog();
  });
}

function exportData() { return { app: "pizzaapp", exportedAt: new Date().toISOString(), recipeVersion: RECIPE.version, equipment: EQUIPMENT, flours: flourLib(), state, log }; }

function renderLog() {
  $("#log-list").innerHTML = log.length ? log.map((l) => `
    <div class="log-item">
      <button class="del" data-del="${l.id}" aria-label="Delete">✕</button>
      <b>${esc(l.date)}</b> · ${l.ratings.overall ?? "–"}/10 · ${esc(PRESETS[l.dough.style]?.label ?? "")} · ${l.dough.hydration}% hyd · ${l.plan.mode === "cold" ? `${l.plan.coldHours} h cold` : `${l.plan.rtHours} h RT`} · ${esc(l.dough.yeastType)} ${l.yeastPct}%
      <div class="small muted">${l.stoneC ? `stone ${l.stoneC} °C · ` : ""}${l.bakeSec ? `${l.bakeSec} s · ` : ""}crust ${l.ratings.crust ?? "–"} · char ${l.ratings.char ?? "–"} · handling ${l.ratings.handling ?? "–"}</div>
      ${l.flours ? `<div class="small muted">${l.flours.map((f) => `${esc(f.name ?? f.id)} ${f.pct} %`).join(" + ")}</div>` : ""}
      ${l.notes ? `<div class="small">${esc(l.notes)}</div>` : ""}
    </div>`).join("") : `<p class="muted small">No bakes logged yet.</p>`;
}

function download(name, content, type) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([content], { type }));
  a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

renderGear();
bindInputs();
render();

if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
