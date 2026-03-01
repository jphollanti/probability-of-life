<script>
  import ParameterSlider from './lib/ParameterSlider.svelte';
  import CivilizationAgeCurve from './lib/CivilizationAgeCurve.svelte';
  import MilkyWayGalaxy from './lib/MilkyWayGalaxy.svelte';
  import ResultDistribution from './lib/ResultDistribution.svelte';
  import { formatNumber, formatRange, formatCompact } from './lib/formatNumber.js';
  import { CalculatorState, PRESETS } from './lib/calculatorState.svelte.js';
  import { PARAMS, PARAM_SECTIONS, SIMPLE_MODE_PARAMS } from './lib/parameterDefs.js';

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

  let mode = $state('simple');
  let activePreset = $state(null);
  let activeSection = $state(0);

  function applyPreset(key) {
    calc.applyPreset(key);
    activePreset = key;
  }

  // Funnel data (simplified)
  let funnelStages = $derived([
    { label: 'Stars', value: calc.numberOfStars * 1e9, color: '#4a9eff' },
    { label: 'Planets', value: calc.planetsInGalaxy, color: '#6bb8ff' },
    { label: 'Habitable', value: calc.planetsCapableOfLife, color: '#4ecdc4' },
    { label: 'With life', value: calc.planetsWithLife, color: '#45b7aa' },
    { label: 'Intelligent', value: calc.planetsWithIntelligentLife, color: '#ff9f43' },
    { label: 'Civs ever', value: calc.totalCivilizations, color: '#ff6b6b' },
    { label: 'Civs now', value: calc.currentCivilizations, color: '#ffd700', isFinal: true },
  ]);

  let maxFunnelValue = $derived(funnelStages[0].value);

  function getBarWidth(value) {
    if (maxFunnelValue <= 0 || value <= 0) return 0;
    const logMax = Math.log10(maxFunnelValue);
    const logVal = Math.log10(Math.max(1, value));
    return Math.max(1, (logVal / logMax) * 100);
  }

  function isParamVisible(paramKey) {
    if (mode === 'advanced') return true;
    return SIMPLE_MODE_PARAMS.includes(paramKey);
  }

  // Scroll tracking
  let heroVisible = $state(true);
  let heroEl = $state(null);

  $effect(() => {
    if (!heroEl) return;
    const observer = new IntersectionObserver(
      ([entry]) => { heroVisible = entry.isIntersecting; },
      { threshold: 0 }
    );
    observer.observe(heroEl);
    return () => observer.disconnect();
  });
</script>

<div class="app">
  <!-- Floating header -->
  <div class="floating-header" class:visible={!heroVisible}>
    <span class="floating-label">Civilizations now</span>
    <span class="floating-value">
      {formatCompact(calc.currentCivilizations)}
      {#if calc.currentCivilizations > 0}
        <span class="floating-range">({formatRange(calc.ci90.lower, calc.ci90.upper)})</span>
      {/if}
    </span>
  </div>

  <header>
    <h1>Life Calculator</h1>
    <p class="subtitle">Estimating civilizations in the Milky Way</p>

    <!-- Presets -->
    <div class="presets">
      <span class="presets-label">Start with a scenario:</span>
      <div class="preset-buttons">
        {#each Object.entries(PRESETS) as [key, preset]}
          <button
            class="preset-btn"
            class:active={activePreset === key}
            onclick={() => applyPreset(key)}
          >
            <span class="preset-name">{preset.label}</span>
            <span class="preset-desc">{preset.description}</span>
          </button>
        {/each}
      </div>
    </div>

    <!-- Mode toggle -->
    <div class="mode-toggle">
      <button class:active={mode === 'simple'} onclick={() => mode = 'simple'}>Simple</button>
      <button class:active={mode === 'advanced'} onclick={() => mode = 'advanced'}>Advanced</button>
    </div>

    <!-- Hero result -->
    <div class="hero-civilization" bind:this={heroEl}>
      <span class="hero-label">Civilizations in your Milky Way right now</span>
      <span class="hero-value">{formatNumber(calc.currentCivilizations, 1)}</span>
      {#if calc.currentCivilizations > 0}
        <span class="hero-range">90% CI: {formatRange(calc.ci90.lower, calc.ci90.upper)}</span>
      {/if}
    </div>
  </header>

  <main>
    <!-- Visual Funnel (always visible, compact) -->
    <section class="funnel-card">
      <h3>The Narrowing Funnel</h3>
      <div class="funnel-compact">
        {#each funnelStages as stage}
          <div class="fc-row" class:final={stage.isFinal}>
            <span class="fc-label">{stage.label}</span>
            <div class="fc-bar-wrap">
              <div
                class="fc-bar"
                style="width: {getBarWidth(stage.value)}%; background: {stage.color};"
              ></div>
            </div>
            <span class="fc-value" style="color: {stage.color}">{formatCompact(stage.value)}</span>
          </div>
        {/each}
      </div>
    </section>

    <!-- Accordion sections (wizard-style but all accessible) -->
    {#each PARAM_SECTIONS as section, i}
      {@const hasVisibleParams = section.params.some(p => isParamVisible(p))}
      {#if hasVisibleParams}
        <section class="card">
          <button class="section-header" onclick={() => activeSection = activeSection === i ? -1 : i}>
            <div class="section-header-left">
              <span class="section-step">Step {i + 1}</span>
              <h2>{section.title}</h2>
              <p class="section-subtitle">{section.subtitle}</p>
            </div>
            <div class="section-header-right">
              {#if section.resultKey}
                <span class="section-preview">{formatCompact(calc[section.resultKey])}</span>
              {/if}
              <span class="chevron" class:open={activeSection === i}>&#9660;</span>
            </div>
          </button>

          {#if activeSection === i}
            <div class="section-body">
              {#each section.params as paramKey}
                {#if isParamVisible(paramKey)}
                  {@const p = PARAMS[paramKey]}
                  <div class="param-with-hint">
                    <ParameterSlider
                      bind:value={calc[paramKey]}
                      min={p.min} max={p.max} step={p.step}
                      unit={p.unit}
                      label={mode === 'simple' ? p.shortLabel : p.label}
                      logScale={p.logScale || false}
                      adaptiveStep={p.adaptiveStep || false}
                      scaleUnit={p.scaleUnit || false}
                      info={p.info}
                    />
                    {#if mode === 'simple' && p.hint}
                      <p class="param-hint">{p.hint}</p>
                    {/if}
                  </div>
                {/if}
              {/each}

              {#if section.resultKey}
                <div class="section-result">
                  {@html section.resultTemplate(formatNumber(calc[section.resultKey]))}
                </div>
              {/if}

              {#if section.id === 'time'}
                <CivilizationAgeCurve
                  meanSurvival={calc.civilizationSurvival}
                  bind:model={calc.survivalModel}
                  effectiveMean={calc.effectiveMeanLifetime}
                  civilizationCount={calc.currentCivilizations}
                />

                {#if calc.timeWarning}
                  <div class="warning">
                    Warning: Time required ({calc.totalTimeRequired.toFixed(1)} bn yr) exceeds
                    age of 3rd-gen systems ({calc.ageThirdGen} bn yr).
                  </div>
                {/if}
              {/if}

              <!-- Navigation hint -->
              <div class="section-nav">
                {#if i > 0}
                  <button class="nav-btn" onclick={() => activeSection = i - 1}>&larr; Previous</button>
                {/if}
                {#if i < PARAM_SECTIONS.length - 1}
                  <button class="nav-btn primary" onclick={() => activeSection = i + 1}>Next &rarr;</button>
                {/if}
              </div>
            </div>
          {/if}
        </section>
      {/if}
    {/each}

    <!-- Results -->
    <section class="card results-card">
      <h2>Results</h2>
      <p class="section-subtitle">Based on {calc.distributionStats.modelLabel} model</p>

      <div class="results-grid">
        <div class="result-row">
          <span class="result-label">Planets with life</span>
          <span class="result-value">{formatNumber(calc.planetsWithLife)}</span>
        </div>
        <div class="result-row">
          <span class="result-label">Civilizations ever</span>
          <span class="result-value">{formatNumber(calc.totalCivilizations)}</span>
        </div>

        <div class="result-divider"></div>

        <div class="result-row highlight">
          <span class="result-label">Civilizations right now</span>
          <span class="result-value-stack">
            <span class="result-value big">{formatNumber(calc.currentCivilizations, 1)}</span>
            {#if calc.currentCivilizations > 0}
              <span class="result-ci">Poisson 90%: {formatRange(calc.ci90.lower, calc.ci90.upper)}</span>
              <span class="result-ci uncertainty-ci">Uncertainty: {formatRange(calc.paramUncertaintyCI.lower, calc.paramUncertaintyCI.upper)}</span>
            {/if}
          </span>
        </div>

        {#if calc.currentCivilizations > 0 && calc.currentCivilizations < 200}
          <ResultDistribution
            expectedCount={calc.currentCivilizations}
            ci90={calc.ci90}
            ci50={calc.ci50}
            model={calc.survivalModel}
          />
        {/if}

        <div class="result-row highlight-secondary">
          <span class="result-label">Detectable</span>
          <span class="result-value">{formatNumber(calc.detectableCivilizations)}</span>
        </div>

        {#if calc.avgDistance !== null}
          <div class="result-row">
            <span class="result-label">Avg distance</span>
            <span class="result-value">{formatNumber(calc.avgDistance)} ly</span>
          </div>
        {/if}
      </div>
    </section>

    <MilkyWayGalaxy
      currentCivilizations={calc.currentCivilizations}
      numberOfStars={calc.numberOfStars}
    />
  </main>

  <footer>
    <button class="reset-btn" onclick={() => { calc.reset(); activePreset = null; }}>Reset to defaults</button>
    <p class="footer-note">
      <a href="#/">Original</a> &middot;
      <a href="#/ab">Presets</a> &middot;
      <a href="#/c">Wizard</a> &middot;
      <a href="#/d">Funnel</a> &middot;
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
    padding: 2rem 0 1rem;
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
    margin-bottom: 1rem;
  }

  /* Presets */
  .presets {
    margin: 1.5rem 0;
  }

  .presets-label {
    display: block;
    font-size: 0.9rem;
    color: var(--text-muted);
    margin-bottom: 0.75rem;
  }

  .preset-buttons {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    justify-content: center;
  }

  .preset-btn {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 0.6rem 1rem;
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 10px;
    background: rgba(255, 255, 255, 0.05);
    color: var(--text);
    cursor: pointer;
    transition: all 0.2s;
    min-width: 130px;
  }

  .preset-btn:hover {
    background: rgba(74, 158, 255, 0.1);
    border-color: var(--accent);
  }

  .preset-btn.active {
    background: rgba(74, 158, 255, 0.15);
    border-color: var(--accent);
    box-shadow: 0 0 12px rgba(74, 158, 255, 0.2);
  }

  .preset-name {
    font-size: 0.9rem;
    font-weight: 600;
    color: #fff;
  }

  .preset-desc {
    font-size: 0.72rem;
    color: var(--text-muted);
    margin-top: 0.15rem;
  }

  /* Mode toggle */
  .mode-toggle {
    display: inline-flex;
    margin: 1rem 0;
    border-radius: 8px;
    overflow: hidden;
    border: 1px solid rgba(255, 255, 255, 0.15);
  }

  .mode-toggle button {
    padding: 0.5rem 1.5rem;
    border: none;
    background: rgba(255, 255, 255, 0.05);
    color: var(--text-muted);
    font-size: 0.85rem;
    cursor: pointer;
    transition: all 0.2s;
  }

  .mode-toggle button.active {
    background: var(--accent);
    color: #fff;
    font-weight: 600;
  }

  /* Hero */
  .hero-civilization {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-top: 1.5rem;
    padding: 1.5rem 1rem;
    background: rgba(255, 215, 0, 0.04);
    border: 1px solid rgba(255, 215, 0, 0.12);
    border-radius: 12px;
  }

  .hero-label { font-size: 0.95rem; color: var(--text); margin-bottom: 0.4rem; }
  .hero-value {
    font-size: 3rem; font-weight: 700; color: var(--gold);
    text-shadow: 0 0 25px rgba(255, 215, 0, 0.35); line-height: 1.1;
  }
  .hero-range { font-size: 0.82rem; color: var(--text-muted); margin-top: 0.35rem; }

  /* Floating header */
  .floating-header {
    position: fixed; top: 0; left: 0; right: 0; z-index: 100;
    display: flex; align-items: center; justify-content: center; gap: 0.75rem;
    padding: 0.6rem 1rem;
    background: rgba(10, 10, 26, 0.92);
    border-bottom: 1px solid rgba(255, 215, 0, 0.15);
    backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
    transform: translateY(-100%); opacity: 0;
    transition: transform 0.35s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.35s;
    pointer-events: none;
  }
  .floating-header.visible { transform: translateY(0); opacity: 1; pointer-events: auto; }
  .floating-label { font-size: 0.85rem; color: var(--text-muted); }
  .floating-value { font-size: 1.2rem; font-weight: 700; color: var(--gold); }
  .floating-range { font-size: 0.75rem; font-weight: 400; color: var(--text-muted); margin-left: 0.25rem; }

  /* Funnel card */
  .funnel-card {
    background: var(--card-bg);
    border: 1px solid var(--card-border);
    border-radius: 12px;
    padding: 1.25rem 1.5rem;
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    margin-bottom: 1.5rem;
  }

  .funnel-card h3 {
    font-size: 1rem;
    color: var(--heading);
    margin-bottom: 0.75rem;
  }

  .funnel-compact {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
  }

  .fc-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .fc-row.final {
    margin-top: 0.25rem;
    padding-top: 0.5rem;
    border-top: 1px solid rgba(255, 215, 0, 0.15);
  }

  .fc-label {
    font-size: 0.75rem;
    color: var(--text-muted);
    min-width: 80px;
    flex-shrink: 0;
  }

  .fc-row.final .fc-label {
    color: var(--gold);
    font-weight: 600;
  }

  .fc-bar-wrap {
    flex: 1;
    height: 14px;
    background: rgba(255, 255, 255, 0.04);
    border-radius: 3px;
    overflow: hidden;
  }

  .fc-row.final .fc-bar-wrap {
    height: 20px;
  }

  .fc-bar {
    height: 100%;
    border-radius: 3px;
    transition: width 0.4s ease;
    min-width: 2px;
  }

  .fc-value {
    font-size: 0.75rem;
    font-weight: 600;
    min-width: 50px;
    text-align: right;
    flex-shrink: 0;
  }

  .fc-row.final .fc-value {
    font-size: 0.85rem;
    text-shadow: 0 0 8px rgba(255, 215, 0, 0.3);
  }

  /* Cards */
  .card {
    background: var(--card-bg);
    border: 1px solid var(--card-border);
    border-radius: 12px;
    padding: 0;
    margin-bottom: 1.5rem;
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    overflow: hidden;
  }

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    padding: 1.25rem 1.5rem;
    background: none;
    border: none;
    cursor: pointer;
    text-align: left;
    color: inherit;
  }

  .section-header:hover { background: rgba(255, 255, 255, 0.03); }

  .section-header-left { flex: 1; }

  .section-step {
    font-size: 0.72rem;
    color: var(--accent);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .section-header h2 {
    font-size: 1.4rem;
    color: var(--heading);
    margin: 0.15rem 0 0.1rem;
  }

  .section-subtitle {
    font-size: 0.85rem;
    color: var(--text-muted);
    font-style: italic;
  }

  .section-header-right {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .section-preview {
    font-size: 1.1rem;
    font-weight: 700;
    color: var(--accent);
  }

  .chevron {
    color: var(--text-muted);
    font-size: 0.8rem;
    transition: transform 0.2s;
  }

  .chevron.open { transform: rotate(180deg); }

  .section-body {
    padding: 0 1.5rem 1.5rem;
  }

  .param-with-hint { position: relative; }

  .param-hint {
    font-size: 0.75rem;
    color: var(--text-muted);
    font-style: italic;
    margin-top: -0.75rem;
    margin-bottom: 1rem;
  }

  .section-result {
    margin-top: 0.75rem;
    padding: 0.75rem 1rem;
    background: rgba(74, 158, 255, 0.08);
    border-left: 3px solid var(--accent);
    border-radius: 0 6px 6px 0;
    font-size: 0.95rem;
  }

  .section-result :global(strong) {
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

  .section-nav {
    display: flex;
    justify-content: flex-end;
    gap: 0.5rem;
    margin-top: 1rem;
    padding-top: 0.75rem;
    border-top: 1px solid rgba(255, 255, 255, 0.05);
  }

  .nav-btn {
    padding: 0.5rem 1.25rem;
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.06);
    color: var(--text);
    font-size: 0.85rem;
    cursor: pointer;
    transition: all 0.2s;
  }

  .nav-btn:hover { background: rgba(255, 255, 255, 0.12); border-color: var(--accent); color: #fff; }
  .nav-btn.primary { background: var(--accent); border-color: var(--accent); color: #fff; font-weight: 600; }
  .nav-btn.primary:hover { background: #5aabff; }

  /* Results */
  .results-card {
    padding: 1.5rem;
    border-color: rgba(74, 158, 255, 0.2);
  }

  .results-card h2 {
    font-size: 1.4rem;
    color: var(--heading);
    margin-bottom: 0.15rem;
  }

  .results-grid { display: flex; flex-direction: column; gap: 0.6rem; }

  .result-row {
    display: flex; justify-content: space-between; align-items: baseline;
    padding: 0.5rem 0; border-bottom: 1px solid rgba(255, 255, 255, 0.05); gap: 1rem;
  }

  .result-label { font-size: 0.9rem; color: var(--text); }
  .result-value { font-size: 0.95rem; color: #fff; font-weight: 500; text-align: right; flex-shrink: 0; }

  .result-divider {
    height: 1px;
    background: linear-gradient(to right, transparent, var(--accent), transparent);
    margin: 0.5rem 0;
  }

  .highlight {
    padding: 0.75rem; background: rgba(255, 215, 0, 0.06);
    border-radius: 8px; border: 1px solid rgba(255, 215, 0, 0.15);
  }
  .highlight .result-label { color: #fff; font-weight: 500; }
  .highlight .result-value.big {
    font-size: 1.6rem; color: var(--gold); font-weight: 700;
    text-shadow: 0 0 15px rgba(255, 215, 0, 0.3);
  }

  .highlight-secondary {
    padding: 0.5rem 0.75rem; background: rgba(74, 158, 255, 0.06); border-radius: 6px;
  }
  .highlight-secondary .result-value { color: var(--accent); font-weight: 600; }

  .result-value-stack { display: flex; flex-direction: column; align-items: flex-end; flex-shrink: 0; }
  .result-ci { font-size: 0.75rem; color: var(--text-muted); font-weight: 400; margin-top: 0.15rem; }
  .result-ci.uncertainty-ci { color: rgba(255, 152, 0, 0.7); font-size: 0.72rem; }

  /* Footer */
  footer { text-align: center; padding: 2rem 0 3rem; }

  .reset-btn {
    padding: 0.6rem 1.5rem; border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 8px; background: rgba(255, 255, 255, 0.06);
    color: var(--text); font-size: 0.9rem; cursor: pointer; transition: all 0.2s;
  }
  .reset-btn:hover { background: rgba(255, 255, 255, 0.12); border-color: var(--accent); color: #fff; }

  .footer-note { margin-top: 1rem; font-size: 0.8rem; color: var(--text-muted); }
  .footer-note a { color: var(--accent); text-decoration: none; }
  .footer-note a:hover { text-decoration: underline; }

  @media (max-width: 600px) {
    .app { padding: 0.75rem; }
    h1 { font-size: 1.8rem; }
    .preset-buttons { flex-direction: column; align-items: stretch; }
    .preset-btn { min-width: auto; }
    .hero-value { font-size: 2.2rem; }
    .section-body { padding: 0 1rem 1rem; }
    .section-header { padding: 1rem; }
    .result-row { flex-direction: column; gap: 0.2rem; }
    .result-value { text-align: left; }
    .result-value-stack { align-items: flex-start; }
    .fc-label { min-width: 60px; font-size: 0.7rem; }
  }
</style>
