// Versioned house recipe + equipment profile. Edit here (via PR) when we
// change the baseline; the app's own edits are stored on-device.
// Bump `version` and add a changelog line for every baseline change.

export const RECIPE = {
  version: 1,
  name: "House Neapolitan-ish (grill)",
  changelog: [
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
    yeastCalibration: 1,
    preferment: { type: "none", flourPct: 30 },
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
  flours: [
    { id: "caputo-pizzeria", name: "Caputo Pizzeria 00", notes: "W 260–270. Good for 24 h RT or ≤ 48 h cold. Hydration sweet spot 60–65 %." },
    { id: "dallagiovanna-napoletana", name: "Dallagiovanna La Napoletana", notes: "Candidate. Fill in W/protein from the bag; change one variable at a time when switching." },
  ],
  tools: ["Digital scale (0.1 g for yeast/salt ideally)", "Pizza peel", "IR thermometer (recommended for stone temp)"],
};
