import { RECIPE, EQUIPMENT } from "./recipe.js";
import { calcDough, yeastPct, stagesFromPlan, equivalentHours, buildTimeline, toICS, waterTemp, YEAST_FACTORS } from "./calc.js";

const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const LS_STATE = "pizza.state.v1", LS_LOG = "pizza.log.v1";

const clone = (o) => JSON.parse(JSON.stringify(o));
const load = (k, d) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } };
const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };

function deepMerge(base, over) {
  if (typeof base !== "object" || base === null || Array.isArray(base)) return over ?? base;
  const out = { ...base };
  for (const k of Object.keys(over || {})) out[k] = k in base ? deepMerge(base[k], over[k]) : over[k];
  return out;
}

let state = deepMerge({ dough: RECIPE.dough, plan: RECIPE.plan, eatAt: null }, load(LS_STATE, {}));
let log = load(LS_LOG, []);

const get = (path) => path.split(".").reduce((o, k) => o?.[k], state);
const set = (path, v) => { const ks = path.split("."); const last = ks.pop(); ks.reduce((o, k) => (o[k] ??= {}), state)[last] = v; };

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
  $$(".seg button").forEach((b) => b.addEventListener("click", () => { state.plan.mode = b.dataset.mode; persist(); render(); }));
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
    $$("[data-k]").forEach((el) => (el.value = String(get(el.dataset.k)))); render();
  });
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
  $$(".seg button").forEach((b) => b.classList.toggle("on", b.dataset.mode === state.plan.mode));
  $("#recipe-version").textContent = `house recipe v${RECIPE.version}`;

  const y = currentYeastPct();
  const d = state.dough;
  const res = calcDough({ ...d, yeastPct: y, yeastFactor: YEAST_FACTORS[d.yeastType] });
  const yName = { fresh: "Fresh yeast", instant: "Instant dry yeast", active: "Active dry yeast" }[d.yeastType];
  const rows = (o, withTotal) => `
    <tr><td>Flour</td><td>${fmtG(o.flour)}</td></tr>
    <tr><td>Water</td><td>${fmtG(o.water)}</td></tr>
    <tr><td>Salt</td><td>${fmtG(o.salt)}</td></tr>
    ${o.oil ? `<tr><td>Olive oil</td><td>${fmtG(o.oil)}</td></tr>` : ""}
    ${o.sugar ? `<tr><td>Sugar/malt</td><td>${fmtG(o.sugar)}</td></tr>` : ""}
    <tr><td>${yName}</td><td>${o.yeast.toFixed(2)} g</td></tr>
    ${withTotal ? `<tr class="total"><td>Total dough</td><td>${fmtG(o.dough)}</td></tr>` : ""}`;

  if (res.preferment) {
    const p = res.preferment;
    $("#pf-out").innerHTML = `<h3>${d.preferment.type} (make ${state.plan.prefermentHours} h ahead)</h3>
      <table><tr><td>Flour</td><td>${fmtG(p.flour)}</td></tr><tr><td>Water</td><td>${fmtG(p.water)}</td></tr>
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

  const now = Date.now();
  const tl = currentTimeline();
  const late = tl[0].at.getTime() < now;
  $("#timeline").innerHTML = (late ? `<li class="warn small">First step is already in the past: move "Eat at" later or shorten fermentation.</li>` : "") + tl.map((s) =>
    `<li class="${s.at.getTime() < now ? "past" : ""}"><div class="when">${fmtTime(s.at)} — ${s.label}</div><div class="small muted">${s.detail}</div></li>`
  ).join("");

  renderLog();
}

// ---------- gear ----------
function renderGear() {
  const e = EQUIPMENT;
  const card = (title, name, notes) => `<div class="card"><h2>${title}</h2><p><b>${name}</b></p><ul class="small">${notes.map((n) => `<li>${n}</li>`).join("")}</ul></div>`;
  $("#gear").innerHTML =
    card("Oven", e.oven.name, e.oven.notes) +
    card("Mixer", e.mixer.name, e.mixer.notes) +
    `<div class="card"><h2>Flours</h2>${e.flours.map((f) => `<p><b>${f.name}</b><br><span class="small muted">${f.notes}</span></p>`).join("")}</div>` +
    `<div class="card"><h2>Tools</h2><ul class="small">${e.tools.map((t) => `<li>${t}</li>`).join("")}</ul></div>`;
  $("#changelog").innerHTML = RECIPE.changelog.map((c) => `<li>${c}</li>`).join("");
  $("#log-flour").innerHTML = e.flours.map((f) => `<option value="${f.id}">${f.name}</option>`).join("");
}

// ---------- log ----------
function bindLog() {
  $("#log-date").value = new Date().toISOString().slice(0, 10);
  $("#log-save").addEventListener("click", () => {
    const n = (id) => { const v = parseFloat($(id).value); return Number.isNaN(v) ? null : v; };
    const entry = {
      id: Date.now(), date: $("#log-date").value, recipeVersion: RECIPE.version,
      flour: $("#log-flour").value, stoneC: n("#log-stone"), bakeSec: n("#log-bake"),
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

function exportData() { return { app: "pizzaapp", exportedAt: new Date().toISOString(), recipeVersion: RECIPE.version, equipment: EQUIPMENT, state, log }; }

function renderLog() {
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  $("#log-list").innerHTML = log.length ? log.map((l) => `
    <div class="log-item">
      <button class="del" data-del="${l.id}" aria-label="Delete">✕</button>
      <b>${esc(l.date)}</b> · ${l.ratings.overall ?? "–"}/10 · ${l.dough.hydration}% hyd · ${l.plan.mode === "cold" ? `${l.plan.coldHours} h cold` : `${l.plan.rtHours} h RT`} · ${esc(l.dough.yeastType)} ${l.yeastPct}%
      <div class="small muted">${l.stoneC ? `stone ${l.stoneC} °C · ` : ""}${l.bakeSec ? `${l.bakeSec} s · ` : ""}crust ${l.ratings.crust ?? "–"} · char ${l.ratings.char ?? "–"} · handling ${l.ratings.handling ?? "–"}</div>
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
