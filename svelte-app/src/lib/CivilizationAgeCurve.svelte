<script>
  import { getSurvivalProbability } from './survivalMath.js';
  import { formatNumber } from './formatNumber.js';

  let {
    meanSurvival = 100_000,
    model = $bindable('gaussian'),
    effectiveMean = null,
    earthAge = null,
    civilizationCount = 0,
  } = $props();

  // --- Distribution functions (return PDF value at x) ---

  function gaussianPDF(x, mu, sigma) {
    const coeff = 1 / (sigma * Math.sqrt(2 * Math.PI));
    return coeff * Math.exp(-0.5 * ((x - mu) / sigma) ** 2);
  }

  function lognormalPDF(x, muLog, sigmaLog) {
    if (x <= 0) return 0;
    const coeff = 1 / (x * sigmaLog * Math.sqrt(2 * Math.PI));
    return coeff * Math.exp(-0.5 * ((Math.log(x) - muLog) / sigmaLog) ** 2);
  }

  function exponentialPDF(x, lambda) {
    if (x < 0) return 0;
    return lambda * Math.exp(-lambda * x);
  }

  function paretoPDF(x, xm, alpha) {
    if (x < xm) return 0;
    return alpha * Math.pow(xm, alpha) / Math.pow(x, alpha + 1);
  }

  // --- Model configurations ---

  const MODELS = {
    gaussian: {
      label: 'Normal distribution (Gaussian)',
      description: 'Classic bell curve: most civilizations survive close to the mean lifespan.',
    },
    lognormal: {
      label: 'Lognormal distribution (Maccone 2010)',
      description: 'Asymmetric: most civilizations die young, but a few survive for a very long time. Based on Maccone\'s statistical extension (2010).',
    },
    exponential: {
      label: 'Exponential decay (Doomsday model)',
      description: 'Constant probability of destruction: dying young is most likely. The most pessimistic model.',
    },
    zipf: {
      label: "Zipf's law / Pareto (power law)",
      description: "Power-law lifetimes (α\u00A0=\u00A01.5): most civilizations die young, but rare survivors persist for extraordinarily long times. Infinite variance means extreme outliers dominate the galactic census. Mirrors patterns in city sizes, species lifetimes, and earthquake magnitudes.",
    },
  };

  let currentModel = $derived(MODELS[model]);

  // --- Generate curve data points ---

  const WIDTH = 600;
  const HEIGHT = 220;
  const PADDING = { top: 20, right: 30, bottom: 40, left: 50 };
  const PLOT_W = WIDTH - PADDING.left - PADDING.right;
  const PLOT_H = HEIGHT - PADDING.top - PADDING.bottom;
  const NUM_POINTS = 200;

  let curveData = $derived.by(() => {
    const mu = meanSurvival;

    // Determine x-range and PDF function based on model
    let xMin, xMax, pdf;

    if (model === 'gaussian') {
      const sigma = mu / 3;
      xMin = Math.max(0, mu - 4 * sigma);
      xMax = mu + 4 * sigma;
      pdf = (x) => gaussianPDF(x, mu, sigma);
    } else if (model === 'lognormal') {
      // Set lognormal so that the median = mu
      const sigmaLog = 1.0;
      const muLog = Math.log(mu);
      xMin = 0;
      // The mode is exp(muLog - sigmaLog^2), mean is exp(muLog + sigmaLog^2/2)
      // Show up to ~5x the mean to capture the long tail
      const lnMean = Math.exp(muLog + sigmaLog * sigmaLog / 2);
      xMax = lnMean * 4;
      pdf = (x) => lognormalPDF(x, muLog, sigmaLog);
    } else if (model === 'exponential') {
      const lambda = 1 / mu;
      xMin = 0;
      xMax = mu * 5;
      pdf = (x) => exponentialPDF(x, lambda);
    } else {
      // zipf / Pareto
      const alpha = 1.5;
      const xm = mu / Math.pow(2, 1 / alpha);
      xMin = 0;
      const paretoMean = alpha * xm / (alpha - 1);
      xMax = paretoMean * 5;
      pdf = (x) => paretoPDF(x, xm, alpha);
    }

    // Generate points
    const points = [];
    let yMax = 0;
    for (let i = 0; i <= NUM_POINTS; i++) {
      const x = xMin + (xMax - xMin) * (i / NUM_POINTS);
      const y = pdf(x);
      if (y > yMax) yMax = y;
      points.push({ x, y });
    }

    return { points, xMin, xMax, yMax, pdf };
  });

  // --- SVG path from data ---

  let pathD = $derived.by(() => {
    const { points, xMin, xMax, yMax } = curveData;
    if (yMax === 0) return '';

    const scaleX = (x) => PADDING.left + ((x - xMin) / (xMax - xMin)) * PLOT_W;
    const scaleY = (y) => PADDING.top + PLOT_H - (y / yMax) * PLOT_H;

    let d = `M ${scaleX(points[0].x)} ${scaleY(points[0].y)}`;
    for (let i = 1; i < points.length; i++) {
      d += ` L ${scaleX(points[i].x)} ${scaleY(points[i].y)}`;
    }
    return d;
  });

  // Area fill path (closed to baseline)
  let areaD = $derived.by(() => {
    const { points, xMin, xMax, yMax } = curveData;
    if (yMax === 0) return '';

    const scaleX = (x) => PADDING.left + ((x - xMin) / (xMax - xMin)) * PLOT_W;
    const scaleY = (y) => PADDING.top + PLOT_H - (y / yMax) * PLOT_H;
    const baseline = PADDING.top + PLOT_H;

    let d = `M ${scaleX(points[0].x)} ${baseline}`;
    for (const p of points) {
      d += ` L ${scaleX(p.x)} ${scaleY(p.y)}`;
    }
    d += ` L ${scaleX(points[points.length - 1].x)} ${baseline} Z`;
    return d;
  });

  // Mean marker x position (slider value — this is the median for lognormal)
  let meanX = $derived.by(() => {
    const { xMin, xMax } = curveData;
    return PADDING.left + ((meanSurvival - xMin) / (xMax - xMin)) * PLOT_W;
  });

  // Effective mean marker x position (only relevant for lognormal where median != mean)
  let effectiveMeanX = $derived.by(() => {
    if (!effectiveMean || model !== 'lognormal') return null;
    const { xMin, xMax } = curveData;
    const x = PADDING.left + ((effectiveMean - xMin) / (xMax - xMin)) * PLOT_W;
    if (x < PADDING.left || x > PADDING.left + PLOT_W) return null;
    return x;
  });

  // Earth position marker
  let earthMarker = $derived.by(() => {
    if (earthAge == null || earthAge <= 0) return null;
    const { xMin, xMax, yMax } = curveData;
    if (earthAge < xMin || earthAge > xMax) return null;
    const px = PADDING.left + ((earthAge - xMin) / (xMax - xMin)) * PLOT_W;
    if (px < PADDING.left || px > PADDING.left + PLOT_W) return null;
    return px;
  });

  // --- X-axis ticks ---

  function formatAxisValue(val) {
    if (val >= 1e9) return (val / 1e9).toFixed(1) + 'B';
    if (val >= 1e6) return (val / 1e6).toFixed(1) + 'M';
    if (val >= 1e3) return (val / 1e3).toFixed(0) + 'k';
    return val.toFixed(0);
  }

  let xTicks = $derived.by(() => {
    const { xMin, xMax } = curveData;
    const count = 5;
    const ticks = [];
    for (let i = 0; i <= count; i++) {
      const val = xMin + (xMax - xMin) * (i / count);
      const px = PADDING.left + (i / count) * PLOT_W;
      ticks.push({ val, px });
    }
    return ticks;
  });

  // --- Mouse hover tracking ---

  let svgEl = $state(null);
  let mouseX = $state(null);

  function handlePointerMove(e) {
    if (!svgEl) return;
    const rect = svgEl.getBoundingClientRect();
    // Convert DOM coords to SVG viewBox coords
    const scaleX = WIDTH / rect.width;
    const svgX = (e.clientX - rect.left) * scaleX;
    // Only track within the plot area
    if (svgX >= PADDING.left && svgX <= PADDING.left + PLOT_W) {
      mouseX = svgX;
    } else {
      mouseX = null;
    }
  }

  function handlePointerLeave() {
    mouseX = null;
  }

  let hoverInfo = $derived.by(() => {
    if (mouseX == null) return null;
    const { xMin, xMax, yMax, pdf } = curveData;
    if (yMax === 0) return null;
    // Map pixel to age value
    const age = xMin + ((mouseX - PADDING.left) / PLOT_W) * (xMax - xMin);
    const prob = pdf(age);
    // Map probability to SVG y
    const svgY = PADDING.top + PLOT_H - (prob / yMax) * PLOT_H;
    // Number of civilizations surviving to at least this age
    const survivalFrac = getSurvivalProbability(model, meanSurvival, age);
    const civCount = civilizationCount * survivalFrac;
    return { age, prob, svgX: mouseX, svgY, civCount };
  });
</script>

<div class="curve-container">
  <div class="model-selector">
    <label class="selector-label" for="model-select">Distribution model</label>
    <select id="model-select" bind:value={model}>
      {#each Object.entries(MODELS) as [key, m]}
        <option value={key}>{m.label}</option>
      {/each}
    </select>
  </div>

  <p class="model-description">
    {currentModel.description}
  </p>

  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <svg
    bind:this={svgEl}
    viewBox="0 0 {WIDTH} {HEIGHT}"
    class="chart"
    onpointermove={handlePointerMove}
    onpointerleave={handlePointerLeave}
  >
    <defs>
      <linearGradient id="curveGradient" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="rgba(74, 158, 255, 0.4)" />
        <stop offset="100%" stop-color="rgba(74, 158, 255, 0.02)" />
      </linearGradient>
    </defs>

    <!-- Grid lines -->
    {#each xTicks as tick}
      <line
        x1={tick.px} y1={PADDING.top}
        x2={tick.px} y2={PADDING.top + PLOT_H}
        stroke="rgba(255,255,255,0.06)"
        stroke-width="1"
      />
    {/each}

    <!-- Area fill -->
    {#if areaD}
      <path d={areaD} fill="url(#curveGradient)" />
    {/if}

    <!-- Curve line -->
    {#if pathD}
      <path
        d={pathD}
        fill="none"
        stroke="#4a9eff"
        stroke-width="2.5"
        stroke-linejoin="round"
      />
    {/if}

    <!-- Mean marker -->
    {#if meanX >= PADDING.left && meanX <= PADDING.left + PLOT_W}
      <line
        x1={meanX} y1={PADDING.top}
        x2={meanX} y2={PADDING.top + PLOT_H}
        stroke="#ffd700"
        stroke-width="1.5"
        stroke-dasharray="6 4"
      />
      <text
        x={meanX}
        y={PADDING.top - 6}
        text-anchor="middle"
        fill="#ffd700"
        font-size="11"
        font-weight="600"
      >
        {model === 'lognormal' ? 'median' : 'mean'} ({formatAxisValue(meanSurvival)})
      </text>
    {/if}

    <!-- Effective mean marker (lognormal only) -->
    {#if effectiveMeanX !== null}
      <line
        x1={effectiveMeanX} y1={PADDING.top}
        x2={effectiveMeanX} y2={PADDING.top + PLOT_H}
        stroke="#4a9eff"
        stroke-width="1.5"
        stroke-dasharray="6 4"
      />
      <text
        x={effectiveMeanX}
        y={PADDING.top - 6}
        text-anchor="middle"
        fill="#4a9eff"
        font-size="11"
        font-weight="600"
      >
        mean ({formatAxisValue(effectiveMean)})
      </text>
    {/if}

    <!-- Earth position marker -->
    {#if earthMarker !== null}
      <line
        x1={earthMarker} y1={PADDING.top}
        x2={earthMarker} y2={PADDING.top + PLOT_H}
        stroke="#4ade80"
        stroke-width="1.5"
        stroke-dasharray="4 3"
      />
      <text
        x={earthMarker + 5}
        y={PADDING.top + PLOT_H / 2}
        text-anchor="start"
        fill="#4ade80"
        font-size="10"
        font-weight="600"
      >
        Earth ({formatAxisValue(earthAge)})
      </text>
    {/if}

    <!-- X axis -->
    <line
      x1={PADDING.left} y1={PADDING.top + PLOT_H}
      x2={PADDING.left + PLOT_W} y2={PADDING.top + PLOT_H}
      stroke="rgba(255,255,255,0.2)"
      stroke-width="1"
    />

    <!-- X axis ticks + labels -->
    {#each xTicks as tick}
      <line
        x1={tick.px} y1={PADDING.top + PLOT_H}
        x2={tick.px} y2={PADDING.top + PLOT_H + 5}
        stroke="rgba(255,255,255,0.3)"
        stroke-width="1"
      />
      <text
        x={tick.px}
        y={PADDING.top + PLOT_H + 20}
        text-anchor="middle"
        fill="#888"
        font-size="10"
      >
        {formatAxisValue(tick.val)}
      </text>
    {/each}

    <!-- X axis label -->
    <text
      x={PADDING.left + PLOT_W / 2}
      y={HEIGHT - 4}
      text-anchor="middle"
      fill="#888"
      font-size="11"
    >
      Civilization age (years)
    </text>

    <!-- Y axis label -->
    <text
      x={12}
      y={PADDING.top + PLOT_H / 2}
      text-anchor="middle"
      fill="#888"
      font-size="11"
      transform="rotate(-90, 12, {PADDING.top + PLOT_H / 2})"
    >
      Probability
    </text>

    <!-- Hover indicator -->
    {#if hoverInfo}
      <!-- Vertical guide line -->
      <line
        x1={hoverInfo.svgX} y1={PADDING.top}
        x2={hoverInfo.svgX} y2={PADDING.top + PLOT_H}
        stroke="rgba(255,255,255,0.25)"
        stroke-width="1"
      />
      <!-- Dot on curve -->
      <circle
        cx={hoverInfo.svgX}
        cy={hoverInfo.svgY}
        r="4"
        fill="#4a9eff"
        stroke="#fff"
        stroke-width="1.5"
      />
      <!-- Tooltip text -->
      {@const tooltipLeft = hoverInfo.svgX > PADDING.left + PLOT_W / 2}
      {@const tx = tooltipLeft ? hoverInfo.svgX - 8 : hoverInfo.svgX + 8}
      {@const anchor = tooltipLeft ? 'end' : 'start'}
      {@const ty = Math.max(PADDING.top + 14, Math.min(hoverInfo.svgY - 6, PADDING.top + PLOT_H - 20))}
      <text
        x={tx}
        y={ty}
        text-anchor={anchor}
        fill="#fff"
        font-size="10"
        font-weight="600"
      >
        {formatNumber(hoverInfo.civCount)} civs
      </text>
    {/if}

    <!-- Invisible rect to capture pointer events across full plot area -->
    <rect
      x={PADDING.left} y={PADDING.top}
      width={PLOT_W} height={PLOT_H}
      fill="transparent"
    />
  </svg>
</div>

<style>
  .curve-container {
    margin-top: 1rem;
    padding: 1rem;
    background: rgba(74, 158, 255, 0.04);
    border: 1px solid rgba(74, 158, 255, 0.12);
    border-radius: 10px;
  }

  .model-selector {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 0.6rem;
    flex-wrap: wrap;
  }

  .selector-label {
    font-size: 0.85rem;
    color: #ccc;
    white-space: nowrap;
  }

  select {
    flex: 1;
    min-width: 200px;
    padding: 0.4rem 0.6rem;
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 6px;
    background: rgba(255, 255, 255, 0.08);
    color: #fff;
    font-size: 0.85rem;
    cursor: pointer;
    outline: none;
    transition: border-color 0.2s;
  }

  select:focus {
    border-color: #4a9eff;
  }

  select option {
    background: #1a1a2e;
    color: #fff;
  }

  .model-description {
    font-size: 0.82rem;
    color: var(--text-muted, #888);
    margin-bottom: 0.75rem;
    line-height: 1.5;
  }

  .chart {
    width: 100%;
    height: auto;
    display: block;
  }
</style>
