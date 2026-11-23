# Pizza Lab

Personal pizza PWA: dough calculator, fermentation timeline, equipment notes, bake log. Vanilla JS with no build step, and it works offline once loaded.

## Tabs
- **Dough**: baker's % → grams. Yeast amount comes from a time/temperature model (`src/calc.js`), with a per-user calibration factor. Supports poolish and biga.
- **Plan**: works backwards from the time you want to eat to a step-by-step schedule. Export it to your calendar as `.ics` (alarms included).
- **Log**: rate each bake. The current recipe and plan are snapshotted with it. *Copy for Claude* puts the whole export on the clipboard so we can analyse it and choose the next change.
- **Gear**: oven, mixer and flour notes, plus the recipe changelog.

## The optimization loop
1. Bake, then log it in the app.
2. Paste *Copy for Claude* into the project chat.
3. We agree on **one** variable to change. Claude updates `src/recipe.js`, bumps `version`, and adds a changelog line in a PR.

Data lives in the phone's localStorage. Use Export or Import (JSON) for backups.

## Dev
```
npm test        # calc unit tests (node --test)
npm start       # serve locally on :5173
```

## Hosting (static, no build)
- **Cloudflare Pages**: connect the repo, set framework to *None*, leave the build command empty and set the output dir to `/`.
- **GitHub Pages**: in Settings → Pages, set Source to *GitHub Actions*. `.github/workflows/pages.yml` deploys on every push to `main`.

To install on your phone, open the URL and choose Share/Menu → *Add to Home Screen*.
