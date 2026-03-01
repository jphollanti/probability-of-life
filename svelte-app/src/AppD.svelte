<script>
  import ParameterSlider from './lib/ParameterSlider.svelte';
  import MilkyWayGalaxy from './lib/MilkyWayGalaxy.svelte';
  import ResultDistribution from './lib/ResultDistribution.svelte';
  import { formatNumber, formatRange, formatCompact } from './lib/formatNumber.js';
  import { CalculatorState } from './lib/calculatorState.svelte.js';
  import { PARAMS } from './lib/parameterDefs.js';

  const calc = new CalculatorState();

  $effect(() => {
    void [calc.numberOfStars, calc.ratioWithPlanets, calc.planetsPerStar, calc.ratioThirdGen,
      calc.ratioHabitableZone, calc.ratioWithWater, calc.ratioGuardianPlanet, calc.ratioIronCore,
      calc.ratioSufficientMass, calc.ratioChemicalPrerequisites, calc.ratioLifeBegins,
      calc.ageThirdGen, calc.timeForLifeToAppear, calc.timeToIntelligentLife, calc.timeToCivilization,
      calc.timeToDetectable, calc.ratioCommunication, calc.civilizationSurvival, calc.survivalModel,
      calc.civilizationsPerPlanet];
    calc.save();
  });

  // Funnel stages: each stage narrows the count
  let funnelStages = $derived([
    {
      label: 'Stars in galaxy',
      value: calc.numberOfStars * 1e9,
      param: 'numberOfStars',
      color: '#4a9eff',
    },
    {
      label: 'With planets',
      value: calc.numberOfStars * 1e9 * (calc.ratioWithPlanets / 100),
      param: 'ratioWithPlanets',
      pct: calc.ratioWithPlanets,
      color: '#5aabff',
    },
    {
      label: 'Total planets',
      value: calc.numberOfStars * 1e9 * (calc.ratioWithPlanets / 100) * calc.planetsPerStar,
      param: 'planetsPerStar',
      color: '#6bb8ff',
    },
    {
      label: '3rd-gen systems',
      value: calc.planetsInGalaxy,
      param: 'ratioThirdGen',
      pct: calc.ratioThirdGen,
      color: '#7dc5ff',
    },
    {
      label: 'Habitable zone',
      value: calc.planetsInGalaxy * (calc.ratioHabitableZone / 100),
      param: 'ratioHabitableZone',
      pct: calc.ratioHabitableZone,
      color: '#4ecdc4',
    },
    {
      label: 'With water',
      value: calc.planetsInGalaxy * (calc.ratioHabitableZone / 100) * (calc.ratioWithWater / 100),
      param: 'ratioWithWater',
      pct: calc.ratioWithWater,
      color: '#45b7aa',
    },
    {
      label: 'Guardian planet',
      value: calc.planetsInGalaxy * (calc.ratioHabitableZone / 100) * (calc.ratioWithWater / 100) * (calc.ratioGuardianPlanet / 100),
      param: 'ratioGuardianPlanet',
      pct: calc.ratioGuardianPlanet,
      color: '#3ca190',
    },
    {
      label: 'Magnetic field',
      value: calc.planetsInGalaxy * (calc.ratioHabitableZone / 100) * (calc.ratioWithWater / 100)
        * (calc.ratioGuardianPlanet / 100) * (calc.ratioIronCore / 100),
      param: 'ratioIronCore',
      pct: calc.ratioIronCore,
      color: '#338b76',
    },
    {
      label: 'Enough mass',
      value: calc.planetsInGalaxy * (calc.ratioHabitableZone / 100) * (calc.ratioWithWater / 100)
        * (calc.ratioGuardianPlanet / 100) * (calc.ratioIronCore / 100)
        * (calc.ratioSufficientMass / 100),
      param: 'ratioSufficientMass',
      pct: calc.ratioSufficientMass,
      color: '#2a755c',
    },
    {
      label: 'Right chemistry',
      value: calc.planetsInGalaxy * (calc.ratioHabitableZone / 100) * (calc.ratioWithWater / 100)
        * (calc.ratioGuardianPlanet / 100) * (calc.ratioIronCore / 100)
        * (calc.ratioSufficientMass / 100) * (calc.ratioChemicalPrerequisites / 100),
      param: 'ratioChemicalPrerequisites',
      pct: calc.ratioChemicalPrerequisites,
      color: '#ff9f43',
    },
    {
      label: 'Life begins',
      value: calc.planetsCapableOfLife,
      param: 'ratioLifeBegins',
      pct: calc.ratioLifeBegins,
      color: '#ee8822',
    },
    {
      label: 'Time for civilizations',
      value: calc.totalCivilizations,
      param: null,
      color: '#ff6b6b',
    },
    {
      label: 'Civilizations now',
      value: calc.currentCivilizations,
      param: null,
      color: '#ffd700',
      isFinal: true,
    },
  ]);

  let maxValue = $derived(funnelStages[0].value);
  let expandedParam = $state(null);

  function toggleParam(paramKey) {
    expandedParam = expandedParam === paramKey ? null : paramKey;
  }

  function getBarWidth(value) {
    if (maxValue <= 0 || value <= 0) return 0;
    // Use log scale for the bar widths to prevent extreme compression
    const logMax = Math.log10(maxValue);
    const logVal = Math.log10(Math.max(1, value));
    return Math.max(1, (logVal / logMax) * 100);
  }
</script>

<div class="app">
  <header>
    <h1>Life Calculator</h1>
    <p class="subtitle">Watch the numbers narrow from stars to civilizations</p>
  </header>

  <main>
    <div class="funnel">
      {#each funnelStages as stage, i}
        {@const barWidth = getBarWidth(stage.value)}
        {@const isExpanded = expandedParam === stage.param}

        <div class="funnel-row" class:final={stage.isFinal} class:expanded={isExpanded}>
          <div class="funnel-label-row">
            <span class="funnel-label">{stage.label}</span>
            {#if stage.pct !== undefined}
              <span class="funnel-pct">{stage.pct}%</span>
            {/if}
            <span class="funnel-value" style="color: {stage.color}">
              {formatCompact(stage.value)}
            </span>
          </div>

          <div class="funnel-bar-container">
            <button
              class="funnel-bar"
              style="width: {barWidth}%; background: {stage.color};"
              onclick={() => stage.param && toggleParam(stage.param)}
              disabled={!stage.param}
            >
              {#if stage.isFinal}
                <span class="bar-inner-label">{formatNumber(stage.value, 1)}</span>
              {/if}
            </button>
          </div>

          {#if i < funnelStages.length - 1}
            <div class="funnel-connector">
              <svg width="20" height="16" viewBox="0 0 20 16">
                <path d="M10 0 L10 16" stroke="rgba(255,255,255,0.15)" stroke-width="1" fill="none"/>
                <path d="M6 10 L10 16 L14 10" stroke="rgba(255,255,255,0.15)" stroke-width="1" fill="none"/>
              </svg>
            </div>
          {/if}

          <!-- Inline parameter editor -->
          {#if isExpanded && stage.param}
            {@const p = PARAMS[stage.param]}
            <div class="inline-editor">
              <ParameterSlider
                bind:value={calc[stage.param]}
                min={p.min} max={p.max} step={p.step}
                unit={p.unit}
                label={p.shortLabel}
                logScale={p.logScale || false}
                adaptiveStep={p.adaptiveStep || false}
                scaleUnit={p.scaleUnit || false}
              />
              <p class="editor-hint">{p.hint}</p>
            </div>
          {/if}
        </div>
      {/each}
    </div>

    <!-- Additional controls not in funnel -->
    <section class="extra-controls">
      <h3>Additional Parameters</h3>
      <p class="extra-subtitle">These parameters affect time calculations and survival</p>

      <div class="extra-grid">
        {#each ['ageThirdGen', 'timeForLifeToAppear', 'timeToIntelligentLife', 'timeToCivilization', 'timeToDetectable', 'ratioCommunication', 'civilizationSurvival', 'civilizationsPerPlanet'] as paramKey}
          {@const p = PARAMS[paramKey]}
          <div class="extra-param">
            <ParameterSlider
              bind:value={calc[paramKey]}
              min={p.min} max={p.max} step={p.step}
              unit={p.unit}
              label={p.shortLabel}
              logScale={p.logScale || false}
              adaptiveStep={p.adaptiveStep || false}
              scaleUnit={p.scaleUnit || false}
            />
          </div>
        {/each}
      </div>
    </section>

    <!-- Final result -->
    <section class="result-card">
      <div class="final-result">
        <span class="final-label">Civilizations in your Milky Way right now</span>
        <span class="final-value">{formatNumber(calc.currentCivilizations, 1)}</span>
        {#if calc.currentCivilizations > 0}
          <span class="final-range">90% CI: {formatRange(calc.ci90.lower, calc.ci90.upper)}</span>
        {/if}
      </div>

      {#if calc.currentCivilizations > 0 && calc.currentCivilizations < 200}
        <ResultDistribution
          expectedCount={calc.currentCivilizations}
          ci90={calc.ci90}
          ci50={calc.ci50}
          model={calc.survivalModel}
        />
      {/if}
    </section>

    <MilkyWayGalaxy
      currentCivilizations={calc.currentCivilizations}
      numberOfStars={calc.numberOfStars}
    />
  </main>

  <footer>
    <button class="reset-btn" onclick={() => calc.reset()}>Reset to defaults</button>
    <p class="footer-note">
      <a href="#/">Original</a> &middot;
      <a href="#/ab">Presets</a> &middot;
      <a href="#/c">Wizard</a> &middot;
      <a href="#/abcd">Combined</a> &middot;
      <a href="https://en.wikipedia.org/wiki/Drake_equation" target="_blank" rel="noopener">Drake equation</a>
    </p>
  </footer>
</div>

<style>
  .app {
    max-width: 860px;
    margin: 0 auto;
    padding: 1.5rem;
  }

  header {
    text-align: center;
    padding: 2rem 0 1.5rem;
  }

  h1 {
    font-size: 2.4rem;
    font-weight: 700;
    color: #fff;
    text-shadow: 0 0 30px rgba(74, 158, 255, 0.4);
    margin-bottom: 0.25rem;
  }

  .subtitle {
    font-size: 1rem;
    color: var(--text-muted);
    font-style: italic;
  }

  /* Funnel */
  .funnel {
    background: var(--card-bg);
    border: 1px solid var(--card-border);
    border-radius: 12px;
    padding: 1.5rem;
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    margin-bottom: 1.5rem;
  }

  .funnel-row {
    margin-bottom: 0.25rem;
  }

  .funnel-row.final {
    margin-top: 0.5rem;
    padding-top: 0.75rem;
    border-top: 1px solid rgba(255, 215, 0, 0.2);
  }

  .funnel-label-row {
    display: flex;
    align-items: baseline;
    gap: 0.5rem;
    margin-bottom: 0.2rem;
  }

  .funnel-label {
    font-size: 0.82rem;
    color: var(--text);
    flex-shrink: 0;
    min-width: 120px;
  }

  .funnel-pct {
    font-size: 0.72rem;
    color: var(--text-muted);
    background: rgba(255, 255, 255, 0.06);
    padding: 0.1rem 0.4rem;
    border-radius: 4px;
  }

  .funnel-value {
    margin-left: auto;
    font-size: 0.85rem;
    font-weight: 600;
  }

  .funnel-bar-container {
    width: 100%;
    height: 24px;
    background: rgba(255, 255, 255, 0.04);
    border-radius: 4px;
    overflow: hidden;
  }

  .funnel-bar {
    height: 100%;
    border-radius: 4px;
    border: none;
    cursor: pointer;
    transition: width 0.4s ease, opacity 0.2s;
    min-width: 2px;
    position: relative;
    text-align: left;
    padding: 0 0.5rem;
  }

  .funnel-bar:disabled {
    cursor: default;
  }

  .funnel-bar:hover:not(:disabled) {
    opacity: 0.85;
    box-shadow: 0 0 10px currentColor;
  }

  .funnel-row.final .funnel-bar-container {
    height: 36px;
  }

  .funnel-row.final .funnel-label {
    font-size: 1rem;
    font-weight: 600;
    color: var(--gold);
  }

  .funnel-row.final .funnel-value {
    font-size: 1.1rem;
    font-weight: 700;
    color: var(--gold);
    text-shadow: 0 0 10px rgba(255, 215, 0, 0.3);
  }

  .bar-inner-label {
    color: #000;
    font-size: 0.75rem;
    font-weight: 700;
    line-height: 36px;
  }

  .funnel-connector {
    display: flex;
    justify-content: center;
    margin: 0;
    line-height: 0;
  }

  .inline-editor {
    margin: 0.5rem 0 0.75rem;
    padding: 0.75rem;
    background: rgba(74, 158, 255, 0.06);
    border: 1px solid rgba(74, 158, 255, 0.15);
    border-radius: 8px;
  }

  .editor-hint {
    font-size: 0.72rem;
    color: var(--text-muted);
    font-style: italic;
    margin-top: 0;
  }

  /* Extra controls */
  .extra-controls {
    background: var(--card-bg);
    border: 1px solid var(--card-border);
    border-radius: 12px;
    padding: 1.5rem;
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    margin-bottom: 1.5rem;
  }

  .extra-controls h3 {
    font-size: 1.2rem;
    color: var(--heading);
    margin-bottom: 0.15rem;
  }

  .extra-subtitle {
    font-size: 0.85rem;
    color: var(--text-muted);
    font-style: italic;
    margin-bottom: 1rem;
  }

  .extra-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.5rem 1.5rem;
  }

  .extra-param {
    padding: 0.5rem;
    border-radius: 6px;
    background: rgba(255, 255, 255, 0.02);
  }

  /* Final result */
  .result-card {
    background: var(--card-bg);
    border: 1px solid rgba(255, 215, 0, 0.15);
    border-radius: 12px;
    padding: 1.5rem;
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    margin-bottom: 1.5rem;
  }

  .final-result {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    padding: 1rem 0;
  }

  .final-label {
    font-size: 1rem;
    color: var(--text);
  }

  .final-value {
    font-size: 3rem;
    font-weight: 700;
    color: var(--gold);
    text-shadow: 0 0 25px rgba(255, 215, 0, 0.35);
    line-height: 1.1;
    margin: 0.25rem 0;
  }

  .final-range {
    font-size: 0.82rem;
    color: var(--text-muted);
  }

  /* Footer */
  footer {
    text-align: center;
    padding: 2rem 0 3rem;
  }

  .reset-btn {
    padding: 0.6rem 1.5rem;
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.06);
    color: var(--text);
    font-size: 0.9rem;
    cursor: pointer;
    transition: all 0.2s;
  }

  .reset-btn:hover {
    background: rgba(255, 255, 255, 0.12);
    border-color: var(--accent);
    color: #fff;
  }

  .footer-note {
    margin-top: 1rem;
    font-size: 0.8rem;
    color: var(--text-muted);
  }

  .footer-note a {
    color: var(--accent);
    text-decoration: none;
  }

  .footer-note a:hover {
    text-decoration: underline;
  }

  @media (max-width: 600px) {
    .app { padding: 0.75rem; }
    h1 { font-size: 1.8rem; }
    .funnel { padding: 1rem; }
    .funnel-label { min-width: 90px; font-size: 0.75rem; }
    .extra-grid { grid-template-columns: 1fr; }
    .final-value { font-size: 2.2rem; }
  }
</style>
