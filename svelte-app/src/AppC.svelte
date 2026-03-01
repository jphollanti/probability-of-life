<script>
  import ParameterSlider from './lib/ParameterSlider.svelte';
  import CivilizationAgeCurve from './lib/CivilizationAgeCurve.svelte';
  import MilkyWayGalaxy from './lib/MilkyWayGalaxy.svelte';
  import ResultDistribution from './lib/ResultDistribution.svelte';
  import { formatNumber, formatRange, formatCompact } from './lib/formatNumber.js';
  import { CalculatorState, PRESETS } from './lib/calculatorState.svelte.js';
  import { PARAMS, PARAM_SECTIONS } from './lib/parameterDefs.js';

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

  // Wizard steps: 3 parameter sections + 1 results
  const STEPS = [
    { id: 'stars', ...PARAM_SECTIONS[0] },
    { id: 'life', ...PARAM_SECTIONS[1] },
    { id: 'time', ...PARAM_SECTIONS[2] },
    { id: 'results', title: 'Results', subtitle: 'Your galactic census' },
  ];

  let currentStep = $state(0);
  let direction = $state(1); // 1 = forward, -1 = backward

  function next() {
    if (currentStep < STEPS.length - 1) {
      direction = 1;
      currentStep++;
    }
  }

  function prev() {
    if (currentStep > 0) {
      direction = -1;
      currentStep--;
    }
  }

  function goToStep(i) {
    direction = i > currentStep ? 1 : -1;
    currentStep = i;
  }

  let step = $derived(STEPS[currentStep]);
  let isResultsStep = $derived(currentStep === STEPS.length - 1);
  let progress = $derived(((currentStep + 1) / STEPS.length) * 100);
</script>

<div class="app">
  <header>
    <h1>Life Calculator</h1>
    <p class="subtitle">Estimating civilizations in the Milky Way</p>
  </header>

  <!-- Progress bar -->
  <div class="progress-container">
    <div class="progress-bar" style="width: {progress}%"></div>
    <div class="progress-steps">
      {#each STEPS as s, i}
        <button
          class="progress-step"
          class:active={i === currentStep}
          class:completed={i < currentStep}
          onclick={() => goToStep(i)}
        >
          <span class="step-number">{i + 1}</span>
          <span class="step-label">{s.title}</span>
        </button>
      {/each}
    </div>
  </div>

  <!-- Step content -->
  <main>
    {#key currentStep}
      <section class="wizard-card" class:slide-in-right={direction === 1} class:slide-in-left={direction === -1}>
        <div class="step-header">
          <span class="step-count">Step {currentStep + 1} of {STEPS.length}</span>
          <h2>{step.title}</h2>
          {#if step.subtitle}
            <p class="step-subtitle">{step.subtitle}</p>
          {/if}
        </div>

        {#if !isResultsStep}
          <!-- Parameter sliders -->
          <div class="step-body">
            {#each step.params as paramKey}
              {@const p = PARAMS[paramKey]}
              <div class="param-card">
                <ParameterSlider
                  bind:value={calc[paramKey]}
                  min={p.min} max={p.max} step={p.step}
                  unit={p.unit}
                  label={p.label}
                  logScale={p.logScale || false}
                  adaptiveStep={p.adaptiveStep || false}
                  scaleUnit={p.scaleUnit || false}
                  info={p.info}
                />
                <p class="param-hint">{p.hint}</p>
              </div>
            {/each}

            {#if step.id === 'time'}
              <CivilizationAgeCurve
                meanSurvival={calc.civilizationSurvival}
                bind:model={calc.survivalModel}
                effectiveMean={calc.effectiveMeanLifetime}
                civilizationCount={calc.currentCivilizations}
              />
            {/if}

            <!-- Intermediate result -->
            {#if step.resultKey}
              <div class="step-result">
                {@html step.resultTemplate(formatNumber(calc[step.resultKey]))}
              </div>
            {/if}

            {#if step.id === 'time' && calc.timeWarning}
              <div class="warning">
                Warning: The time required ({calc.totalTimeRequired.toFixed(1)} bn yr) exceeds
                the age of 3rd-gen star systems ({calc.ageThirdGen} bn yr).
              </div>
            {/if}
          </div>
        {:else}
          <!-- Results step -->
          <div class="step-body results-body">
            <div class="final-result">
              <span class="final-label">Civilizations in your Milky Way right now</span>
              <span class="final-value">{formatNumber(calc.currentCivilizations, 1)}</span>
              {#if calc.currentCivilizations > 0}
                <span class="final-range">Poisson 90%: {formatRange(calc.ci90.lower, calc.ci90.upper)}</span>
                <span class="final-range uncertainty">Parameter uncertainty: {formatRange(calc.paramUncertaintyCI.lower, calc.paramUncertaintyCI.upper)}</span>
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

            <div class="results-summary">
              <div class="summary-row">
                <span>Planets with life</span>
                <span class="summary-val">{formatNumber(calc.planetsWithLife)}</span>
              </div>
              <div class="summary-row">
                <span>Intelligent civilizations ever</span>
                <span class="summary-val">{formatNumber(calc.totalCivilizations)}</span>
              </div>
              <div class="summary-row">
                <span>Detectable civilizations</span>
                <span class="summary-val">{formatNumber(calc.detectableCivilizations)}</span>
              </div>
              {#if calc.avgDistance !== null}
                <div class="summary-row">
                  <span>Avg distance between civilizations</span>
                  <span class="summary-val">{formatNumber(calc.avgDistance)} ly</span>
                </div>
              {/if}
            </div>

            <MilkyWayGalaxy
              currentCivilizations={calc.currentCivilizations}
              numberOfStars={calc.numberOfStars}
            />
          </div>
        {/if}

        <!-- Navigation -->
        <div class="wizard-nav">
          <button class="nav-btn" onclick={prev} disabled={currentStep === 0}>
            &larr; Back
          </button>
          <div class="nav-dots">
            {#each STEPS as _, i}
              <button
                class="nav-dot"
                class:active={i === currentStep}
                onclick={() => goToStep(i)}
                title="Go to step {i + 1}"
              ></button>
            {/each}
          </div>
          {#if !isResultsStep}
            <button class="nav-btn primary" onclick={next}>
              Next &rarr;
            </button>
          {:else}
            <button class="nav-btn" onclick={() => calc.reset()}>
              Reset
            </button>
          {/if}
        </div>
      </section>
    {/key}
  </main>

  <footer>
    <p class="footer-note">
      <a href="#/">Original</a> &middot;
      <a href="#/ab">Presets</a> &middot;
      <a href="#/d">Funnel</a> &middot;
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
    padding: 1.5rem 0 1rem;
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

  /* Progress bar */
  .progress-container {
    position: relative;
    margin-bottom: 1.5rem;
  }

  .progress-bar {
    height: 3px;
    background: var(--accent);
    border-radius: 2px;
    transition: width 0.4s ease;
    position: absolute;
    top: 0;
    left: 0;
  }

  .progress-steps {
    display: flex;
    justify-content: space-between;
    padding-top: 0.75rem;
  }

  .progress-step {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.3rem;
    background: none;
    border: none;
    cursor: pointer;
    color: var(--text-muted);
    transition: color 0.2s;
    padding: 0.25rem;
  }

  .progress-step.active {
    color: #fff;
  }

  .progress-step.completed {
    color: var(--accent);
  }

  .step-number {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.8rem;
    font-weight: 600;
    border: 2px solid currentColor;
    transition: all 0.2s;
  }

  .progress-step.active .step-number {
    background: var(--accent);
    border-color: var(--accent);
    color: #fff;
  }

  .progress-step.completed .step-number {
    background: var(--accent);
    border-color: var(--accent);
    color: #fff;
  }

  .step-label {
    font-size: 0.72rem;
    white-space: nowrap;
  }

  /* Wizard card */
  .wizard-card {
    background: var(--card-bg);
    border: 1px solid var(--card-border);
    border-radius: 12px;
    padding: 1.5rem;
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    animation: slideIn 0.3s ease;
  }

  .slide-in-right {
    animation: slideInRight 0.3s ease;
  }

  .slide-in-left {
    animation: slideInLeft 0.3s ease;
  }

  @keyframes slideInRight {
    from { opacity: 0; transform: translateX(30px); }
    to { opacity: 1; transform: translateX(0); }
  }

  @keyframes slideInLeft {
    from { opacity: 0; transform: translateX(-30px); }
    to { opacity: 1; transform: translateX(0); }
  }

  .step-header {
    margin-bottom: 1.5rem;
  }

  .step-count {
    font-size: 0.78rem;
    color: var(--accent);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .step-header h2 {
    font-size: 1.6rem;
    color: var(--heading);
    margin: 0.25rem 0 0.15rem;
  }

  .step-subtitle {
    font-size: 0.9rem;
    color: var(--text-muted);
    font-style: italic;
  }

  .step-body {
    margin-bottom: 1.5rem;
  }

  .param-card {
    margin-bottom: 0.5rem;
    padding: 0.75rem;
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.04);
  }

  .param-hint {
    font-size: 0.75rem;
    color: var(--text-muted);
    font-style: italic;
    margin-top: 0;
    padding-left: 0.1rem;
  }

  .step-result {
    margin-top: 1rem;
    padding: 0.75rem 1rem;
    background: rgba(74, 158, 255, 0.08);
    border-left: 3px solid var(--accent);
    border-radius: 0 6px 6px 0;
    font-size: 0.95rem;
  }

  .step-result :global(strong) {
    color: var(--accent);
    font-size: 1.05rem;
  }

  .warning {
    margin-top: 0.75rem;
    padding: 0.75rem 1rem;
    background: rgba(255, 100, 100, 0.1);
    border-left: 3px solid var(--warning);
    border-radius: 0 6px 6px 0;
    color: var(--warning);
    font-size: 0.9rem;
  }

  /* Results step */
  .final-result {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 1.5rem 1rem;
    background: rgba(255, 215, 0, 0.04);
    border: 1px solid rgba(255, 215, 0, 0.15);
    border-radius: 12px;
    text-align: center;
    margin-bottom: 1.5rem;
  }

  .final-label {
    font-size: 1rem;
    color: var(--text);
    margin-bottom: 0.5rem;
  }

  .final-value {
    font-size: 3.5rem;
    font-weight: 700;
    color: var(--gold);
    text-shadow: 0 0 30px rgba(255, 215, 0, 0.4);
    line-height: 1.1;
  }

  .final-range {
    font-size: 0.82rem;
    color: var(--text-muted);
    margin-top: 0.35rem;
  }

  .final-range.uncertainty {
    font-size: 0.78rem;
    color: rgba(255, 152, 0, 0.7);
    margin-top: 0.15rem;
  }

  .results-summary {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    margin-bottom: 1.5rem;
  }

  .summary-row {
    display: flex;
    justify-content: space-between;
    padding: 0.5rem 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    font-size: 0.9rem;
    color: var(--text);
  }

  .summary-val {
    color: #fff;
    font-weight: 500;
  }

  /* Navigation */
  .wizard-nav {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-top: 1rem;
    border-top: 1px solid rgba(255, 255, 255, 0.06);
  }

  .nav-btn {
    padding: 0.6rem 1.5rem;
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.06);
    color: var(--text);
    font-size: 0.9rem;
    cursor: pointer;
    transition: all 0.2s;
    min-width: 100px;
  }

  .nav-btn:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.12);
    border-color: var(--accent);
    color: #fff;
  }

  .nav-btn:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  .nav-btn.primary {
    background: var(--accent);
    border-color: var(--accent);
    color: #fff;
    font-weight: 600;
  }

  .nav-btn.primary:hover {
    background: #5aabff;
    box-shadow: 0 0 15px rgba(74, 158, 255, 0.3);
  }

  .nav-dots {
    display: flex;
    gap: 0.5rem;
  }

  .nav-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    border: none;
    background: rgba(255, 255, 255, 0.2);
    cursor: pointer;
    padding: 0;
    transition: all 0.2s;
  }

  .nav-dot.active {
    background: var(--accent);
    transform: scale(1.3);
  }

  /* Footer */
  footer {
    text-align: center;
    padding: 2rem 0 3rem;
  }

  .footer-note {
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
    .step-header h2 { font-size: 1.3rem; }
    .wizard-card { padding: 1rem; }
    .step-label { display: none; }
    .final-value { font-size: 2.5rem; }
    .nav-btn { min-width: 80px; padding: 0.5rem 1rem; font-size: 0.85rem; }
    .summary-row { flex-direction: column; gap: 0.15rem; }
  }
</style>
