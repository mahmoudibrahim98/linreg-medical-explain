# Models in Medicine — Interactive Explainers

By **Mahmoud Ibrahim** for the AI in Medicine course at Maastricht
University. Interactive React + D3 explainers of linear regression,
logistic regression, and decision trees, modelled after the AWS MLU-Explain
visual essays.

Four medical scenarios, drag-to-fit line, residuals overlay, MSE/R² panel, and
a 2-D loss landscape that mirrors the user's line in real time.

## Run it

```bash
npm install
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`).

> **OneDrive note.** If `npm install` is unusually slow or fails midway because
> the project is inside a OneDrive-synced folder, copy the project to a
> non-synced location (e.g. `C:\dev\linreg-medical-explain`) and run from
> there. OneDrive's file watcher fights with `node_modules`.

## Build a static version

```bash
npm run build
npm run preview
```

`dist/` contains a static bundle you can host anywhere (GitHub Pages, an
LMS file upload, a Maastricht-hosted static site).

## Datasets

All four are simulated from a known truth so the analytic least-squares fit
can be compared to the generative slope/intercept. Edit
`src/data/datasets.js` to add more.

| ID | x | y | Story |
|---|---|---|---|
| `bmi-sbp` | BMI (kg/m²) | Systolic BP (mmHg) | Population screening trend |
| `age-hba1c` | Age (yr) | HbA1c (%) | Subtle age effect on glycation |
| `tumor-recurrence` | Tumor diameter (mm) | 5-yr recurrence risk (%) | Surgical oncology registry |
| `dose-response` | Dose (mg) | Pain reduction (VAS) | Phase-I dose-finding |

## Adding a dataset

In `src/data/datasets.js` push a new entry with:

- `id`, `label`, `short` — for the picker
- `description`, `clinicalNote` — narrative around the scatter
- `xLabel`, `yLabel`, `xUnit`, `yUnit`
- `xRange`, `yRange` — plot domain (kept fixed when you draw new samples so
  the axes don't jump)
- `n`, `truth: { slope, intercept, noise }`
- `sample(seed)` — returns `{x, y}[]`. The included samplers use a seedable
  PRNG so each `(dataset, seed)` is reproducible.

The app will auto-pick up new entries. The loss-surface bounds are derived
from the OLS fit, so they stay sensible as you add scenarios.

## File map

```
src/
  main.jsx              entry
  App.jsx               page layout, state, narrative
  App.css               styles
  data/datasets.js      simulated medical scenarios
  stats/regression.js   OLS, MSE, R²
  components/
    DatasetPicker.jsx   pill-tab scenario selector
    ScatterPlot.jsx     draggable line + residuals (D3)
    MetricsPanel.jsx    user vs OLS metric comparison
    LossSurface.jsx     MSE heatmap over (slope, intercept)
```

## Tech notes

- **Vite + React 18.** No SSR; this is a client-side teaching app.
- **D3 v7** for axes, scales, drag, and the colour ramp on the loss heatmap.
- The scatter plot keeps its own internal "live" slope/intercept in a ref so
  drag stays smooth even though React re-renders every other panel on each
  pointer move. External state changes (snap-to-best, reset) push back in
  through props.
- The loss heatmap is drawn on a `<canvas>` overlaid by an `<svg>` for axes
  and markers — recomputing the 64×64 grid is cheap so it stays in JS.
