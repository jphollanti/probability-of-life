# CLAUDE.md — Project guide for AI assistants

## Project overview

**probability-of-life** is an interactive calculator estimating the number of civilizations in the Milky Way. The primary app is in `svelte-app/` (Svelte 5 + Vite). The root-level `index.html`, `equation.js`, and `styles.css` are a legacy version and are not actively developed.

## Tech stack

- **Svelte 5** with Runes (`$state`, `$derived`, `$effect`, `$bindable`)
- **Vite 7** for dev server and production builds
- No external runtime dependencies — all math is hand-written in `survivalMath.js`
- Canvas API for the galaxy visualization (no charting libraries)

## Repository layout

```
svelte-app/src/
├── App.svelte                       Main component: state, calculations, UI
├── main.js                          Entry point (mounts App)
├── app.css                          CSS custom properties (--bg, --accent, --gold, etc.)
└── lib/
    ├── survivalMath.js              Core math: distributions, Poisson, uncertainty, detection
    ├── formatNumber.js              Number formatting utilities
    ├── ParameterSlider.svelte       Reusable slider (supports log-scale, info panels)
    ├── CivilizationAgeCurve.svelte  SVG chart: survival distribution PDF
    ├── ResultDistribution.svelte    SVG chart: Poisson PMF bars
    └── MilkyWayGalaxy.svelte        Canvas: animated spiral galaxy
```

## Commands

```bash
cd svelte-app
npm install          # Install dependencies (first time only)
npm run dev          # Start dev server with HMR
npm run build        # Production build → svelte-app/dist/
npm run preview      # Preview production build locally
```

There are no tests, linters, or CI configured. The build (`npm run build`) is the primary verification step.

## Architecture notes

### Calculation flow

All computation happens in the `<script>` block of `App.svelte` using Svelte 5's `$derived` rune for reactive computation. The pipeline is:

1. **planetsInGalaxy** ← star count × planet ratios
2. **planetsCapableOfLife** ← habitability filters (7 multiplicative ratios)
3. **totalCivilizations** ← time fractions × capable planets × civilizationsPerPlanet
4. **currentCivilizations** ← Poisson λ = birthRate × E[lifetime]

Helper math lives in `survivalMath.js`. App.svelte imports specific functions; there are no side effects.

### Survival distribution models

Four models are supported: `gaussian`, `lognormal`, `exponential`, `zipf`. The `survivalModel` state variable is a string key. When adding a new model:

1. Add a case in `getEffectiveMean()`, `getDistributionStats()`, `getSurvivalProbability()`, `getDetectableFraction()`, and `getModelInsight()` in `survivalMath.js`
2. Add a PDF function and model entry in `CivilizationAgeCurve.svelte`
3. The `<select>` in CivilizationAgeCurve iterates `MODELS` automatically

### State persistence

All slider values are auto-saved to `localStorage` under key `life-calculator-params`. The `init(key)` function falls back to `DEFAULTS` for any missing key, so adding new parameters is backwards-compatible.

### Key constants

- `SIGMA_LOG = 1.0` — lognormal shape parameter (shared between survivalMath.js and CivilizationAgeCurve.svelte)
- `PARETO_ALPHA = 1.5` — Zipf/Pareto shape parameter
- `τ = 3.0 Gyr` — star formation decline timescale (in `getFormationFraction`)
- `GHZ volume = π × (33,000² − 13,000²) × 1,000 ly³` — galactic habitable zone for distance calculations
- `NUM_UNCERTAIN_PARAMS = 13` — count of multiplicative parameters for uncertainty propagation
- `GSD = 2.0` — geometric standard deviation per parameter for uncertainty CI

## Conventions

- No TypeScript — the project uses plain `.js` and `.svelte` files
- Slider values are stored as raw numbers (percentages as 0–100, not 0–1)
- Time parameters are in billions of years; survival/detection times are in years
- `formatNumber()` auto-scales to million/billion/trillion; `formatCompact()` uses k/M/B suffixes
- CSS uses custom properties defined in `app.css` (dark theme, accent blue, gold highlights)
- The galaxy canvas runs at ~30 FPS (throttled for battery) with pre-rendered sprite caches

## Common tasks

### Adding a new input parameter

1. Add to `DEFAULTS` object in App.svelte
2. Add `$state(init('paramName'))` variable
3. Add to the `$effect` localStorage save object
4. Add to the `reset()` function
5. Add `<ParameterSlider>` in the template
6. Wire into the derived calculations

### Modifying the math

All statistical math is in `survivalMath.js`. Functions are pure (no side effects, no DOM access) and exported individually. The file has no dependencies.

### Changing the galaxy visualization

`MilkyWayGalaxy.svelte` is self-contained. It receives only `currentCivilizations` and `numberOfStars` as props. Star generation and rendering are independent of the calculation pipeline.
