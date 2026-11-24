// Versioned house recipe + equipment profile. Edit here (via PR) when we
// change the baseline; the app's own edits are stored on-device.
// Bump `version` and add a changelog line for every baseline change.

export const RECIPE = {
  version: 3,
  name: "House Neapolitan-ish (grill)",
  changelog: [
    "v3 2026-11-24: Yeast recalibrated from bake 2026-11-24 (0.3 g fresh / ~805 g flour peaked at ~19 h, ~22 °C): room-temp calibration 0.23. Cold calibration still 1.0, unvalidated.",
    "v2 2026-11-24: Added style presets (Neapolitan, New York) and flour blends. Neapolitan baseline unchanged.",
    "v1 2026-11-23: Baseline for Weber Spirit 410 + stone (300–330 °C). 63 % hydration, 2.8 % salt, 2 % oil for browning/softness at lower-than-Neapolitan temps.",
  ],
  dough: {
    balls: 4,
    ballWeight: 260,
    hydration: 63,
    salt: 2.8,
    oil: 2,
    sugar: 0,
    residue: 2,
    yeastType: "fresh",
    // Per-mode yeast-model multipliers. RT measured 2026-11-24; cold not yet validated.
    yeastCalRT: 0.23,
    yeastCalCold: 1,
    preferment: { type: "none", flourPct: 30 },
    style: "neapolitan",
    flours: [{ id: "caputo-pizzeria", pct: 100 }],
  },
  plan: {
    mode: "rt",           // 'rt' = 24 h room temp, 'cold' = fridge
    rtHours: 24,
    rtTemp: 20,
    bulkHours: 2,         // rt: bulk before balling; cold: RT bulk before fridge
    coldHours: 48,
    fridgeTemp: 4,
    temperHours: 4,
    ballBeforeCold: true,
    preheatMin: 45,
    mixMin: 10,
    restMin: 15,
    prefermentHours: 16,
  },
};

// Flour library. Values are typical figures for each type, NOT verified per bag:
// edit them in the Gear tab to match what is printed on your bag.
// protein = % ; W = Chopin alveograph strength (null = unknown).
export const FLOURS = [
  { id: "caputo-pizzeria", name: "Caputo Pizzeria 00", protein: 12.5, W: 265, notes: "Your current flour. ~24 h room temp or ≤ 48 h cold." },
  { id: "dallagiovanna-napoletana", name: "Dallagiovanna La Napoletana", protein: null, W: null, notes: "Candidate. Fill in protein/W from the bag." },
  { id: "manitoba", name: "Manitoba / strong flour", protein: 14, W: 350, notes: "Strengthener: 10–30 % extends fermentation tolerance and chew (NY)." },
  { id: "bread", name: "Bread flour (generic)", protein: 12.5, W: null, notes: "NY-style base." },
  { id: "plain", name: "Plain wheat flour (hvedemel)", protein: 10.5, W: 180, notes: "Weak; short ferments only, or blend ≤ 30 %." },
  { id: "semola", name: "Semola rimacinata (durum)", protein: 12, W: null, notes: "5–10 % adds crunch and colour. Also best for dusting the peel." },
  { id: "wholewheat", name: "Wholewheat (fuldkorn)", protein: 13, W: null, notes: "≤ 15 %. Thirstier: +1 % hydration per 10 % used. Ferments faster." },
];

// Style presets. Applying one overwrites dough + plan fields listed here;
// yeast type, calibration, residue and preferment are kept.
export const PRESETS = {
  neapolitan: {
    label: "Neapolitan",
    blurb: "Soft, puffy rim, thin centre. Grill-adapted: 2 % oil helps browning at 300 °C.",
    dough: { style: "neapolitan", balls: 4, ballWeight: 260, hydration: 63, salt: 2.8, oil: 2, sugar: 0,
      flours: [{ id: "caputo-pizzeria", pct: 100 }] },
    plan: { mode: "rt", rtHours: 24, bulkHours: 2, temperHours: 4 },
  },
  newyork: {
    label: "New York",
    blurb: "Thinner, foldable, crisp-chewy. Oil + sugar for browning over a 6–8 min bake; cold-fermented.",
    dough: { style: "newyork", balls: 3, ballWeight: 330, hydration: 62, salt: 2.2, oil: 3, sugar: 1.5,
      flours: [{ id: "caputo-pizzeria", pct: 70 }, { id: "manitoba", pct: 30 }] },
    plan: { mode: "cold", bulkHours: 1, coldHours: 48, temperHours: 3, ballBeforeCold: true },
  },
};

export const EQUIPMENT = {
  oven: { name: "Weber Spirit 410 + pizza stone", maxTempC: 330, notes: [
    "Gas grill = strong bottom heat, weak top heat. Close the lid; preheat 45–60 min.",
    "Stone ~300 °C → expect 3–5 min bakes. Oil (2–3 %) and/or 0.5–1 % sugar/malt help top browning.",
    "If bottoms burn before tops colour: turn the burners under the stone down for the last minute.",
  ]},
  mixer: { name: "Kenwood Chef XL + spiral dough hook", frictionC: 10, notes: [
    "Min speed 8–12 min; add salt after ~2 min. Watch dough temp, aim 23–25 °C after mixing.",
    "For a 4-ball batch (~1 kg dough) the bowl is well within capacity.",
  ]},
  tools: ["Digital scale (0.1 g for yeast/salt ideally)", "Pizza peel", "IR thermometer (recommended for stone temp)"],
};
