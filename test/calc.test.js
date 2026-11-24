import test from "node:test";
import assert from "node:assert/strict";
import { calcDough, freshYeastPct, yeastPct, buildTimeline, stagesFromPlan, toICS, waterTemp } from "../public/src/calc.js";
import { RECIPE } from "../public/src/recipe.js";
import { methodSteps } from "../public/src/method.js";

const near = (a, b, tol) => assert.ok(Math.abs(a - b) <= tol, `${a} not within ${tol} of ${b}`);

test("yeast model anchors", () => {
  near(freshYeastPct([{ hours: 24, tempC: 20 }]), 0.15, 0.001);
  near(freshYeastPct([{ hours: 8, tempC: 22 }]), 0.48, 0.05);
  near(freshYeastPct([{ hours: 2, tempC: 20 }, { hours: 48, tempC: 4 }, { hours: 4, tempC: 20 }]), 0.17, 0.05);
  near(yeastPct([{ hours: 24, tempC: 20 }], "instant"), 0.05, 0.001);
  assert.equal(freshYeastPct([{ hours: 0, tempC: 20 }]), 0);
});

test("dough totals add up to target incl. residue", () => {
  const r = { ...RECIPE.dough, yeastPct: 0.15 };
  const { total } = calcDough(r);
  const sum = total.flour + total.water + total.salt + total.oil + total.sugar + total.yeast;
  near(sum, 4 * 260 * 1.02, 0.01);
  near(total.water / total.flour, 0.63, 1e-9);
});

test("poolish splits flour and water", () => {
  const r = { ...RECIPE.dough, yeastPct: 0.15, preferment: { type: "poolish", flourPct: 30 } };
  const { total, preferment, final } = calcDough(r);
  near(preferment.flour, total.flour * 0.3, 1e-9);
  near(preferment.water, preferment.flour, 1e-9);
  near(final.flour + preferment.flour, total.flour, 1e-9);
  near(final.water + preferment.water, total.water, 1e-9);
  assert.ok(final.yeast >= 0);
});

test("timeline is chronological and ends before eat time", () => {
  const eatAt = new Date("2026-11-28T18:30:00Z");
  for (const mode of ["rt", "cold"]) {
    const steps = buildTimeline({ ...RECIPE.plan, mode, eatAt, preferment: "poolish" });
    for (let i = 1; i < steps.length; i++) assert.ok(steps[i].at >= steps[i - 1].at, mode + " order");
    assert.ok(steps.at(-1).at < eatAt);
    assert.equal(steps[0].label, "Make poolish");
  }
  const rt = buildTimeline({ ...RECIPE.plan, mode: "rt", eatAt, preferment: "none" });
  const mixEnd = rt[0].at.getTime() + (RECIPE.plan.mixMin + RECIPE.plan.restMin) * 60e3;
  near((eatAt - 15 * 60e3 - mixEnd) / 3600e3, RECIPE.plan.rtHours, 1e-9);
});

test("stages + ics + water temp", () => {
  assert.equal(stagesFromPlan({ ...RECIPE.plan, mode: "cold" }).length, 3);
  const ics = toICS(buildTimeline({ ...RECIPE.plan, eatAt: new Date(), preferment: "none" }));
  assert.match(ics, /BEGIN:VCALENDAR[\s\S]*BEGIN:VEVENT[\s\S]*END:VCALENDAR/);
  assert.equal(waterTemp({ targetDough: 24, flourTemp: 20, roomTemp: 20, friction: 10 }), 22);
});

test("method steps reflect recipe, mode and preferment", () => {
  const d = RECIPE.dough;
  const res = calcDough({ ...d, yeastPct: 0.15 });
  const rt = methodSteps({ dough: d, plan: { ...RECIPE.plan, mode: "rt" }, res, waterTempC: 22 });
  assert.ok(rt.some((s) => s.title === "Ball") && rt.some((s) => /^Proof/.test(s.title)));
  assert.ok(rt.find((s) => s.title === "Water + yeast").text.includes(`${Math.round(res.total.water)} g`));
  assert.ok(rt.every((s, i) => s.n === i + 1));
  const pd = { ...d, preferment: { type: "poolish", flourPct: 30 } };
  const cold = methodSteps({ dough: pd, plan: { ...RECIPE.plan, mode: "cold" }, res: calcDough({ ...pd, yeastPct: 0.2 }), waterTempC: 22 });
  assert.equal(cold[0].phase, "Preferment");
  assert.ok(cold.some((s) => /^Fridge/.test(s.title)) && cold.some((s) => /^Temper/.test(s.title)));
});

import { blendFlour } from "../public/src/calc.js";
import { FLOURS, PRESETS } from "../public/src/recipe.js";
test("flour blend math", () => {
  const lib = Object.fromEntries(FLOURS.map((f) => [f.id, f]));
  const b = blendFlour([{ id: "caputo-pizzeria", pct: 70 }, { id: "manitoba", pct: 30 }], lib, 500);
  assert.ok(b.valid);
  near(b.protein.value, 12.5 * 0.7 + 14 * 0.3, 1e-9);
  near(b.W.value, 265 * 0.7 + 350 * 0.3, 1e-9);
  near(b.parts[0].grams + b.parts[1].grams, 500, 1e-9);
  near(b.parts[1].grams, 150, 1e-9);
  const u = blendFlour([{ id: "caputo-pizzeria", pct: 50 }, { id: "dallagiovanna-napoletana", pct: 40 }], lib, 100);
  assert.equal(u.valid, false);
  near(u.W.coverage, 50 / 90, 1e-9);
  for (const p of Object.values(PRESETS)) assert.equal(p.dough.flours.reduce((s, f) => s + f.pct, 0), 100);
});

test("RT calibration reproduces bake 2026-11-24 (~0.037 % fresh peaks ~19 h at 22 °C)", () => {
  const y = freshYeastPct([{ hours: 19, tempC: 22 }], RECIPE.dough.yeastCalRT);
  near(y, 0.037, 0.004);
});
