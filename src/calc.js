// Pure calculation functions. No DOM. Tested in test/calc.test.js.

// Relative fermentation rate vs 20 °C. Rate roughly doubles every ~9 °C in the
// 4–30 °C range. Empirical; tune via profile.yeastCalibration.
export function fermentRate(tempC) {
  return Math.pow(2, (tempC - 20) / 9);
}

// Fermentation stages -> equivalent hours at 20 °C.
export function equivalentHours(stages) {
  return stages.reduce((s, st) => s + st.hours * fermentRate(st.tempC), 0);
}

// Fresh-yeast % (of total flour) for a given fermentation schedule.
// Model: yeast% = C * eqHours^-1.2, anchored at ~0.15 % fresh for 24 h @ 20 °C.
// Sanity anchors: 8 h @ 22 °C ≈ 0.5 %, 48 h fridge + 4 h RT ≈ 0.2 %.
const YEAST_C = 0.15 * Math.pow(24, 1.2);
export function freshYeastPct(stages, calibration = 1) {
  const eq = equivalentHours(stages);
  if (eq <= 0) return 0;
  return Math.min(3, (YEAST_C * Math.pow(eq, -1.2)) * calibration);
}

export const YEAST_FACTORS = { fresh: 1, instant: 1 / 3, active: 0.4 };

export function yeastPct(stages, type = "fresh", calibration = 1) {
  return freshYeastPct(stages, calibration) * (YEAST_FACTORS[type] ?? 1);
}

// Main dough calculation.
// r: { balls, ballWeight, hydration, salt, oil, sugar, yeastPct, residue,
//      preferment: { type: 'none'|'poolish'|'biga', flourPct } }
// All percentages are baker's % (of total flour), as numbers (63 = 63 %).
export function calcDough(r) {
  const totalDough = r.balls * r.ballWeight * (1 + (r.residue || 0) / 100);
  const pctSum = 100 + r.hydration + r.salt + (r.oil || 0) + (r.sugar || 0) + r.yeastPct;
  const flour = (totalDough * 100) / pctSum;
  const g = (p) => (flour * p) / 100;
  const total = {
    flour,
    water: g(r.hydration),
    salt: g(r.salt),
    oil: g(r.oil || 0),
    sugar: g(r.sugar || 0),
    yeast: g(r.yeastPct),
    dough: totalDough,
  };

  const pf = r.preferment || { type: "none" };
  if (pf.type === "none" || !pf.flourPct) return { total, preferment: null, final: total };

  const pfHydration = pf.type === "poolish" ? 100 : (pf.hydration ?? 50);
  const pfFlour = g(pf.flourPct);
  const pfWater = (pfFlour * pfHydration) / 100;
  // Preferment yeast: fixed small dose (poolish 0.1 %, biga 1 % fresh of its flour,
  // scaled by yeast type ratio already baked into r.yeastPct vs fresh).
  const pfYeastPctOfPf = pf.type === "poolish" ? 0.1 : 1.0;
  const typeFactor = r.yeastFactor ?? 1;
  const pfYeast = Math.min(total.yeast, (pfFlour * pfYeastPctOfPf * typeFactor) / 100);
  const preferment = { flour: pfFlour, water: pfWater, yeast: pfYeast, hydration: pfHydration };
  const final = {
    flour: total.flour - pfFlour,
    water: Math.max(0, total.water - pfWater),
    salt: total.salt,
    oil: total.oil,
    sugar: total.sugar,
    yeast: Math.max(0, total.yeast - pfYeast),
    dough: total.dough,
  };
  return { total, preferment, final, waterShortfall: Math.max(0, pfWater - total.water) };
}

// Water temperature to hit a target dough temp (classic "friction factor" rule).
// targetDDT*3 = flour + room + water + friction (spiral hook on Kenwood ≈ 8–12 °C).
export function waterTemp({ targetDough = 24, flourTemp = 20, roomTemp = 20, friction = 10 }) {
  return targetDough * 3 - flourTemp - roomTemp - friction;
}

// Build a backward timeline from eat time.
// plan: { eatAt: Date, mode: 'rt'|'cold', rtHours, rtTemp, bulkHours, coldHours,
//         temperHours, preheatMin, mixMin, restMin, ballAfterBulk }
export function buildTimeline(p) {
  const steps = [];
  const eat = new Date(p.eatAt).getTime();
  const H = 3600e3, M = 60e3;
  let t = eat;
  const push = (label, at, detail = "", durMin = 0) => steps.unshift({ label, at: new Date(at), detail, durMin });

  const bakeStart = t - 15 * M;
  push("Bake", bakeStart, "Stretch, top, bake ~3–5 min per pizza; rotate at halfway.", 15);
  const preheat = bakeStart - p.preheatMin * M;
  push("Preheat grill + stone", preheat, `All burners high, lid closed, ${p.preheatMin} min. Aim for stone ≥ 300 °C.`, p.preheatMin);

  if (p.mode === "cold") {
    const temperStart = bakeStart - p.temperHours * H;
    push("Fridge → room temp", temperStart, `Take dough balls out to temper ${p.temperHours} h.`, p.temperHours * 60);
    const coldStart = temperStart - p.coldHours * H;
    if (p.ballBeforeCold) {
      push("Ball + into fridge", coldStart, `Divide, ball, cover. Fridge ${p.coldHours} h.`, 10);
    } else {
      push("Bulk into fridge", coldStart, `Covered tub, fridge ${p.coldHours} h. Ball when tempering starts.`, 0);
    }
    const bulkStart = coldStart - p.bulkHours * H;
    if (p.bulkHours > 0) push("Room-temp bulk", bulkStart, `${p.bulkHours} h at room temp before fridge.`, p.bulkHours * 60);
    t = bulkStart;
  } else {
    const ballAt = bakeStart - (p.rtHours - p.bulkHours) * H;
    push("Ball", ballAt, `Divide, ball, cover. Proof ${(p.rtHours - p.bulkHours).toFixed(1)} h at room temp.`, 10);
    const bulkStart = ballAt - p.bulkHours * H;
    push("Bulk ferment", bulkStart, `${p.bulkHours} h covered at ~${p.rtTemp} °C.`, p.bulkHours * 60);
    t = bulkStart;
  }
  const mixStart = t - (p.mixMin + p.restMin) * M;
  push("Mix", mixStart, `Kenwood spiral hook: water+yeast, flour, min speed ${p.mixMin} min; salt last; rest ${p.restMin} min.`, p.mixMin + p.restMin);
  if (p.preferment && p.preferment !== "none") {
    const pfAt = mixStart - p.prefermentHours * H;
    push(`Make ${p.preferment}`, pfAt, `Mix preferment, ${p.prefermentHours} h at room temp (or per plan).`, 5);
  }
  return steps;
}

// Derive fermentation stages from a plan (for the yeast model).
export function stagesFromPlan(p) {
  if (p.mode === "cold") {
    return [
      { hours: p.bulkHours, tempC: p.rtTemp },
      { hours: p.coldHours, tempC: p.fridgeTemp ?? 4 },
      { hours: p.temperHours, tempC: p.rtTemp },
    ];
  }
  return [{ hours: p.rtHours, tempC: p.rtTemp }];
}

// iCalendar export for the timeline.
export function toICS(steps, title = "Pizza") {
  const fmt = (d) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const esc = (s) => String(s).replace(/[\\,;]/g, (m) => "\\" + m).replace(/\n/g, "\\n");
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//pizzaapp//EN"];
  steps.forEach((s, i) => {
    const end = new Date(s.at.getTime() + Math.max(5, s.durMin) * 60e3);
    lines.push(
      "BEGIN:VEVENT",
      `UID:${fmt(s.at)}-${i}@pizzaapp`,
      `DTSTAMP:${fmt(new Date())}`,
      `DTSTART:${fmt(s.at)}`,
      `DTEND:${fmt(end)}`,
      `SUMMARY:${esc(title + ": " + s.label)}`,
      `DESCRIPTION:${esc(s.detail)}`,
      "BEGIN:VALARM", "TRIGGER:-PT0M", "ACTION:DISPLAY", `DESCRIPTION:${esc(s.label)}`, "END:VALARM",
      "END:VEVENT"
    );
  });
  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}
