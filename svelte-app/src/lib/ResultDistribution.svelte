<script>
  import { poissonPMF, poissonQuantile } from './survivalMath.js';

  let {
    expectedCount = 0,
    ci90 = { lower: 0, upper: 0 },
    ci50 = { lower: 0, upper: 0 },
    model = 'gaussian',
  } = $props();

  const WIDTH = 400;
  const HEIGHT = 120;
  const PAD = { top: 16, right: 16, bottom: 24, left: 16 };
  const PLOT_W = WIDTH - PAD.left - PAD.right;
  const PLOT_H = HEIGHT - PAD.top - PAD.bottom;

  // Compute the PMF bars for discrete Poisson distribution
  let chartData = $derived.by(() => {
    const lambda = expectedCount;
    if (lambda <= 0) return { bars: [], maxP: 0, kMin: 0, kMax: 0 };

    // Range to display: from 0 to some upper bound
    const kMax = Math.min(
      poissonQuantile(0.999, lambda),
      Math.ceil(lambda + 6 * Math.sqrt(lambda + 1)),
      100 // cap at 100 bars for readability
    );
    const kMin = 0;

    let bars = [];
    let maxP = 0;
    for (let k = kMin; k <= kMax; k++) {
      const p = poissonPMF(k, lambda);
      if (p > maxP) maxP = p;
      bars.push({ k, p });
    }

    return { bars, maxP, kMin, kMax };
  });

  // Classify each bar into CI region for coloring
  function barColor(k) {
    if (k >= ci50.lower && k <= ci50.upper) return 'rgba(74, 158, 255, 0.7)';
    if (k >= ci90.lower && k <= ci90.upper) return 'rgba(74, 158, 255, 0.35)';
    return 'rgba(74, 158, 255, 0.12)';
  }

  function barStroke(k) {
    if (k >= ci50.lower && k <= ci50.upper) return 'rgba(74, 158, 255, 0.9)';
    if (k >= ci90.lower && k <= ci90.upper) return 'rgba(74, 158, 255, 0.5)';
    return 'rgba(74, 158, 255, 0.2)';
  }

  // Bar layout calculations
  let barCount = $derived(chartData.kMax - chartData.kMin + 1);
  let barWidth = $derived(Math.max(1, PLOT_W / barCount - (barCount > 30 ? 0.5 : 1.5)));
  let barGap = $derived((PLOT_W - barWidth * barCount) / (barCount - 1 || 1));

  function barX(k) {
    return PAD.left + (k - chartData.kMin) * (barWidth + barGap);
  }

  function barH(p) {
    return chartData.maxP > 0 ? (p / chartData.maxP) * PLOT_H : 0;
  }

  // Expected value marker position
  let meanMarkerX = $derived(
    PAD.left + (expectedCount - chartData.kMin) * (barWidth + barGap) + barWidth / 2
  );

  // X-axis labels: show a few key values
  let xLabels = $derived.by(() => {
    const { kMin, kMax } = chartData;
    if (kMax <= 0) return [];
    const range = kMax - kMin;
    if (range <= 10) {
      // Show every value
      return Array.from({ length: range + 1 }, (_, i) => kMin + i);
    }
    // Show ~5 evenly spaced labels
    const step = Math.max(1, Math.round(range / 5));
    const labels = [];
    for (let k = kMin; k <= kMax; k += step) labels.push(k);
    if (labels[labels.length - 1] !== kMax) labels.push(kMax);
    return labels;
  });
</script>

{#if chartData.bars.length > 0}
  <div class="dist-chart">
    <svg viewBox="0 0 {WIDTH} {HEIGHT}" class="dist-svg">
      {#each chartData.bars as bar}
        {@const x = barX(bar.k)}
        {@const h = barH(bar.p)}
        <rect
          {x}
          y={PAD.top + PLOT_H - h}
          width={barWidth}
          height={Math.max(0, h)}
          fill={barColor(bar.k)}
          stroke={barStroke(bar.k)}
          stroke-width="0.5"
          rx="1"
        />
      {/each}

      <!-- Expected value marker -->
      {#if meanMarkerX >= PAD.left && meanMarkerX <= PAD.left + PLOT_W}
        <line
          x1={meanMarkerX} y1={PAD.top - 2}
          x2={meanMarkerX} y2={PAD.top + PLOT_H}
          stroke="#ffd700"
          stroke-width="1.5"
          stroke-dasharray="4 3"
          opacity="0.7"
        />
      {/if}

      <!-- X axis -->
      <line
        x1={PAD.left} y1={PAD.top + PLOT_H}
        x2={PAD.left + PLOT_W} y2={PAD.top + PLOT_H}
        stroke="rgba(255,255,255,0.15)"
        stroke-width="1"
      />

      <!-- X axis labels -->
      {#each xLabels as k}
        {@const labelX = barX(k) + barWidth / 2}
        <text
          x={labelX}
          y={HEIGHT - 4}
          text-anchor="middle"
          fill="#888"
          font-size="9"
        >
          {k}
        </text>
      {/each}
    </svg>

    <div class="dist-legend">
      <span class="legend-item">
        <span class="legend-swatch ci50"></span> 50% CI
      </span>
      <span class="legend-item">
        <span class="legend-swatch ci90"></span> 90% CI
      </span>
      <span class="legend-item">
        <span class="legend-swatch mean-line"></span> expected
      </span>
    </div>
  </div>
{/if}

<style>
  .dist-chart {
    margin: 0.5rem 0;
    padding: 0.5rem;
    background: rgba(74, 158, 255, 0.03);
    border-radius: 8px;
  }

  .dist-svg {
    width: 100%;
    height: auto;
    display: block;
  }

  .dist-legend {
    display: flex;
    justify-content: center;
    gap: 1rem;
    margin-top: 0.25rem;
  }

  .legend-item {
    display: flex;
    align-items: center;
    gap: 0.3rem;
    font-size: 0.7rem;
    color: #888;
  }

  .legend-swatch {
    display: inline-block;
    width: 12px;
    height: 8px;
    border-radius: 2px;
  }

  .legend-swatch.ci50 {
    background: rgba(74, 158, 255, 0.7);
  }

  .legend-swatch.ci90 {
    background: rgba(74, 158, 255, 0.35);
  }

  .legend-swatch.mean-line {
    width: 12px;
    height: 2px;
    background: #ffd700;
    border-radius: 0;
  }
</style>
