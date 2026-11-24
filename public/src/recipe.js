// Versioned house recipe + equipment profile. Edit here (via PR) when we
// change the baseline; the app's own edits are stored on-device.
// Bump `version` and add a changelog line for every baseline change.

export const RECIPE = {
  version: 5,
  name: "House Neapolitan (video baseline)",
  changelog: [
    "v5 2026-11-24: Baseline = pizzaiolo video recipe, by user choice: 90 % Dallagiovanna 00 + 10 % Uniqua Blu, 62 % hydration, 3 % salt, no oil, 0.1 % fresh yeast for 24 h at 18 °C (10 h bulk + 14 h balls), 6 × 270 g, dough 23.5 °C. Room-temp yeast calibration 0.55 reproduces 0.1 % (replaces 0.23 from own 22 °C bake). Kenwood friction 20 °C (video: 15 °C water + 17 °C flour → 23.6 °C).",
    "v4 2026-11-24: Method switched to mixing by temperature (hold back 20 % water, salt at ~19 °C, stop at 23–24 °C, 10 min rest), plus re-balling. Dallagiovanna flours added (W from video, unconfirmed).",
    "v3 2026-11-24: Yeast recalibrated from bake 2026-11-24 (0.3 g fresh / ~805 g flour peaked at ~19 h, ~22 °C): room-temp calibration 0.23. Cold calibration still 1.0, unvalidated.",
    "v2 2026-11-24: Added style presets (Neapolitan, New York) and flour blends. Neapolitan baseline unchanged.",
    "v1 2026-11-23: Baseline for Weber Spirit 410 + stone (300–330 °C). 63 % hydration, 2.8 % salt, 2 % oil for browning/softness at lower-than-Neapolitan temps.",
  ],
  dough: {
    balls: 6,
    ballWeight: 270,
    hydration: 62,
    salt: 3,
    oil: 0,
    sugar: 0,
    residue: 2,
    yeastType: "fresh",
    // Per-mode yeast-model multipliers. RT 0.55 = video baseline (0.1 % fresh, 24 h @ 18 °C).
    // Own bake 2026-11-24 at ~22 °C fitted 0.23 instead. Cold not yet validated.
    yeastCalRT: 0.55,
    yeastCalCold: 1,
    preferment: { type: "none", flourPct: 30 },
    style: "neapolitan",
    flours: [{ id: "dallagiovanna-napoletana", pct: 90 }, { id: "dallagiovanna-uniqua-blu", pct: 10 }],
  },
  plan: {
    mode: "rt",           // 'rt' = 24 h room temp, 'cold' = fridge
    rtHours: 24,
    rtTemp: 18,
    bulkHours: 10,        // rt: bulk before balling; cold: RT bulk before fridge
    coldHours: 48,
    fridgeTemp: 4,
    temperHours: 4,
    ballBeforeCold: true,
    preheatMin: 45,
    mixMin: 13,
    restMin: 10,
    prefermentHours: 16,
  },
};

// Flour library. Values are typical figures for each type, NOT verified per bag:
// edit them in the Gear tab to match what is printed on your bag.
// protein = % ; W = Chopin alveograph strength (null = unknown).
export const FLOURS = [
  { id: "caputo-pizzeria", name: "Caputo Pizzeria 00", protein: 12.5, W: 265, notes: "~24 h room temp max (video says W≈290); blend 10–20 % stronger flour for long cold." },
  { id: "dallagiovanna-napoletana", name: "Dallagiovanna La Napoletana", protein: null, W: 310, notes: "W≈310 per a pizzaiolo's video (check bag). Made for ~24 h room temp." },
  { id: "dallagiovanna-uniqua-blu", name: "Dallagiovanna Uniqua Blu (Tipo 1)", protein: null, W: 340, notes: "W≈340 per the same video (unconfirmed). 10 % pushes past 24 h; 15–20 % for longer." },
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
    blurb: "Pizzaiolo video baseline: 62 % hydration, 3 % salt, 24 h at ~18 °C (10 h bulk + 14 h balls). No oil, so watch the top browning on the grill.",
    dough: { style: "neapolitan", balls: 6, ballWeight: 270, hydration: 62, salt: 3, oil: 0, sugar: 0,
      flours: [{ id: "dallagiovanna-napoletana", pct: 90 }, { id: "dallagiovanna-uniqua-blu", pct: 10 }] },
    plan: { mode: "rt", rtHours: 24, rtTemp: 18, bulkHours: 10, temperHours: 4 },
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
  mixer: { name: "Kenwood Chef XL + spiral dough hook", frictionC: 20, notes: [
    "Mix to temperature: stop at a 23–24 °C core. Friction 20 °C is from the video's 13 min mix; tune it from your own probe readings.",
    "For a 4-ball batch (~1 kg dough) the bowl is well within capacity.",
  ]},
  tools: ["Digital scale (0.1 g for yeast/salt ideally)", "Pizza peel", "IR thermometer (recommended for stone temp)"],
};
