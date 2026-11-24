// Step-by-step method generated from the current recipe + plan. Pure; no DOM.
// ctx: { dough, plan, res (calcDough result), waterTempC, mixer, oven }

const g = (x) => (x < 10 ? x.toFixed(1) : Math.round(x).toString()) + " g";
const yg = (x) => x.toFixed(2) + " g";
const h = (x) => (Number.isInteger(x) ? x : x.toFixed(1)) + " h";

export function methodSteps({ dough, plan, res, waterTempC }) {
  const steps = [];
  const add = (phase, title, text) => steps.push({ phase, title, text });
  const yName = { fresh: "fresh yeast", instant: "instant dry yeast", active: "active dry yeast" }[dough.yeastType];
  const pfType = dough.preferment?.type ?? "none";
  const pf = res.preferment;
  const f = res.final;
  const cold = plan.mode === "cold";
  const wt = Math.round(waterTempC);

  // --- Preferment ---
  if (pf) {
    if (pfType === "poolish") {
      add("Preferment", `Make poolish (${h(plan.prefermentHours)} ahead)`,
        `Dissolve ${yg(pf.yeast)} ${yName} in ${g(pf.water)} water (~20 °C). Whisk in ${g(pf.flour)} flour until smooth, like thick batter. ` +
        `Cover and leave at room temp ${h(plan.prefermentHours)}. Ready when domed, bubbly and just starting to sink in the centre.`);
    } else {
      add("Preferment", `Make biga (${h(plan.prefermentHours)} ahead)`,
        `Dissolve ${yg(pf.yeast)} ${yName} in ${g(pf.water)} water (~18 °C). Mix with ${g(pf.flour)} flour into a dry, shaggy mass — do not knead. ` +
        `Cover and leave ${h(plan.prefermentHours)} at a cool room temp (16–18 °C ideal). Ready when it smells sweet-alcoholic and has risen.`);
    }
  }

  // --- Mix ---
  const yeastStep = {
    fresh: `crumble in ${yg(f.yeast)} fresh yeast and stir to dissolve`,
    instant: `instant yeast (${yg(f.yeast)}) goes in with the flour, no dissolving needed`,
    active: `stir in ${yg(f.yeast)} active dry yeast and let it stand 10 min until foamy`,
  }[dough.yeastType];
  add("Mix", "Water + yeast",
    `Weigh ${g(f.water)} water at ~${wt} °C into the Kenwood bowl; ${yeastStep}.` +
    (pf ? ` Add the ${pfType} and break it up in the water with the hook on min speed (~1 min).` : ""));
  add("Mix", "Add flour",
    `Fit the spiral hook. On min speed add ~90 % of the ${g(f.flour)} flour (≈ ${g(f.flour * 0.9)}) over 1 min. Mix 2 min until no dry flour remains.`);
  add("Mix", "Add salt",
    `Add ${g(f.salt)} salt, then the remaining flour (≈ ${g(f.flour * 0.1)}) gradually.` +
    (f.sugar ? ` Add ${g(f.sugar)} sugar/malt now too.` : ""));
  add("Mix", `Knead ${plan.mixMin} min`,
    `Min speed → speed 1 for ~${plan.mixMin} min until the dough clears the bowl and is smooth and elastic (stretches thin before tearing).` +
    (f.oil ? ` Drizzle in ${g(f.oil)} olive oil during the last 2 min.` : "") +
    ` Target dough temp 23–25 °C — check with a probe; if warmer, use colder water next time.`);
  add("Mix", `Rest ${plan.restMin} min`,
    `Tip onto the bench, cover with the upturned bowl, rest ${plan.restMin} min. Then a few folds to make a smooth ball.`);

  // --- Ferment ---
  const ballText = `Weigh and divide into ${dough.balls} × ${dough.ballWeight} g. For each: fold the edges into the centre, flip, and drag ` +
    `towards you on the bench to tighten the skin; pinch the seam. Into lightly oiled, covered containers (or a dough box with space between).`;
  if (cold) {
    if (plan.bulkHours > 0) add("Ferment", `Bulk ${h(plan.bulkHours)} at room temp`,
      `Lightly oiled, covered tub, ~${plan.rtTemp} °C. Optional: one stretch-and-fold after 30 min.`);
    if (plan.ballBeforeCold) {
      add("Ferment", "Ball", ballText);
      add("Ferment", `Fridge ${h(plan.coldHours)}`, `Covered, at ~${plan.fridgeTemp ?? 4} °C. Keep containers airtight so balls don't skin.`);
      add("Ferment", `Temper ${h(plan.temperHours)}`,
        `Out of the fridge ${h(plan.temperHours)} before baking, covered, at room temp. Ready when relaxed, ~doubled and a poke springs back slowly.`);
    } else {
      add("Ferment", `Bulk fridge ${h(plan.coldHours)}`, `Covered tub at ~${plan.fridgeTemp ?? 4} °C.`);
      add("Ferment", "Ball, then temper",
        `${ballText} Then rest covered at room temp ${h(plan.temperHours)} until relaxed and ~doubled.`);
    }
  } else {
    add("Ferment", `Bulk ${h(plan.bulkHours)}`, `Lightly oiled, covered tub at ~${plan.rtTemp} °C.`);
    add("Ferment", "Ball", ballText);
    add("Ferment", `Proof ${h(plan.rtHours - plan.bulkHours)}`,
      `Covered at ~${plan.rtTemp} °C. Ready when ~doubled, relaxed, with small bubbles on the surface. ` +
      `If it is racing ahead, park the balls in the fridge and take them out 1–2 h before baking.`);
  }

  // --- Bake ---
  add("Bake", `Preheat ${plan.preheatMin} min`,
    `Stone on the centre grates. All burners high, lid closed, ${plan.preheatMin} min. Aim for ≥ 300 °C on the stone (IR thermometer). ` +
    `Meanwhile: drain sauce/tomatoes, tear and drain mozzarella (wet cheese + 300 °C = soupy pizza), set up toppings.`);
  if (dough.style === "newyork") {
    add("Bake", "Stretch",
      `Flour both sides. Press out leaving a thin 1 cm lip, then stretch over the knuckles to ~33–35 cm (fit your stone). ` +
      `Thin and even in the centre: it should almost let light through. No rolling pin.`);
    add("Bake", "Top",
      `Lightly dusted peel (semolina helps). Uncooked tomato sauce (crushed tomatoes, salt, oregano), then grated low-moisture mozzarella edge to edge, ` +
      `with a little parmesan. Shake the peel to make sure it slides freely.`);
    add("Bake", "Bake 6–8 min",
      `Slide onto the stone and close the lid immediately. Rotate after ~3 min. Done when the cheese is bubbling with brown spots and the base is ` +
      `crisp and browned all over (lift an edge to check). If the base gets too dark, turn the burners under the stone down. ` +
      `Close the lid for 5–10 min between pizzas so the stone recovers. Rest the pizza 1 min on a rack before slicing.`);
  } else {
    add("Bake", "Stretch",
      `Flip a ball into a bowl of flour (or semolina) and coat both sides. Press from the centre outwards, leaving a 1–2 cm rim untouched. ` +
      `Stretch over the knuckles to ~28–30 cm. Don't use a rolling pin, because it crushes the rim.`);
    add("Bake", "Top",
      `Lightly dusted peel. Keep the sauce thin and the toppings light, because heavy toppings won't cook through at grill temperatures. Shake the peel to make sure it slides freely.`);
    add("Bake", "Bake 3–5 min",
      `Slide onto the stone and close the lid immediately. After ~90 s rotate 180°. Total 3–5 min: done when the rim is spotted and the base is browned. ` +
      `If the bottom burns before the top is done, turn the burners under the stone down for the last minute. ` +
      `Close the lid for 5–10 min between pizzas so the stone recovers.`);
  }
  add("Bake", "Log it", "Note stone temp, bake time and what you'd change — Log tab.");
  return steps.map((s, i) => ({ ...s, n: i + 1 }));
}
