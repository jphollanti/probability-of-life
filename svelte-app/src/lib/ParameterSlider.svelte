<script>
  let {
    value = $bindable(),
    min = 0,
    max = 100,
    step = 1,
    unit = '',
    label = '',
    logScale = false,
    adaptiveStep = false,
    info = '',
    scaleUnit = false,
  } = $props();

  let showInfo = $state(false);

  let sMin = $derived(logScale ? Math.log10(Math.max(min, 1)) : min);
  let sMax = $derived(logScale ? Math.log10(max) : max);
  let sStep = $derived(logScale ? 0.01 : step);
  let sValue = $derived(logScale ? Math.log10(Math.max(value, 1)) : value);
  let fillPercent = $derived(
    sMax > sMin ? ((sValue - sMin) / (sMax - sMin)) * 100 : 0
  );

  let isValid = $derived(value >= min && value <= max);

  // Scale factor for large-unit display (thousand, million, billion)
  let scaleFactor = $derived(
    scaleUnit && Math.abs(value) >= 1_000_000_000 ? 1_000_000_000 :
    scaleUnit && Math.abs(value) >= 1_000_000 ? 1_000_000 :
    scaleUnit && Math.abs(value) >= 1_000 ? 1_000 :
    1
  );
  let scaleLabel = $derived(
    scaleFactor === 1_000_000_000 ? 'billion ' + unit :
    scaleFactor === 1_000_000 ? 'million ' + unit :
    scaleFactor === 1_000 ? 'thousand ' + unit :
    unit
  );
  let displayValue = $derived(value / scaleFactor);
  let displayMin = $derived(min / scaleFactor);
  let displayMax = $derived(max / scaleFactor);

  function adaptiveRound(rawValue) {
    if (rawValue < 1) return Math.max(min, 1);
    if (rawValue < 10) return Math.round(rawValue);
    const exponent = Math.floor(Math.log10(rawValue));
    const magnitude = Math.pow(10, exponent);
    return Math.round(rawValue / magnitude) * magnitude;
  }

  function onSliderInput(e) {
    const raw = parseFloat(e.target.value);
    if (logScale) {
      const rawValue = Math.pow(10, raw);
      if (adaptiveStep) {
        value = Math.min(max, Math.max(min, adaptiveRound(rawValue)));
      } else {
        value = Math.round(rawValue / step) * step;
      }
    } else {
      value = parseFloat((Math.round(raw / step) * step).toFixed(10));
    }
  }

  function onNumberInput(e) {
    const v = parseFloat(e.target.value);
    if (!isNaN(v)) {
      value = Math.round(v * scaleFactor);
    }
  }

  function toggleInfo() {
    showInfo = !showInfo;
  }
</script>

<div class="parameter" class:invalid={!isValid}>
  <div class="label-row">
    <p class="label">{label}</p>
    {#if info}
      <button class="info-btn" class:active={showInfo} onclick={toggleInfo} title="Learn more">i</button>
    {/if}
  </div>
  {#if info && showInfo}
    <div class="info-panel">
      {@html info}
    </div>
  {/if}
  <div class="controls">
    <input
      type="range"
      min={sMin}
      max={sMax}
      step={sStep}
      value={sValue}
      oninput={onSliderInput}
      class="slider"
      style="--fill: {fillPercent}%"
    />
    <div class="value-group">
      <input
        type="number"
        value={displayValue}
        onchange={onNumberInput}
        min={displayMin}
        max={displayMax}
        step={logScale ? 'any' : step}
        class="number-input"
      />
      {#if unit || scaleLabel}
        <span class="unit">{scaleLabel}</span>
      {/if}
    </div>
  </div>
</div>

<style>
  .parameter {
    margin-bottom: 1.25rem;
  }

  .label-row {
    display: flex;
    align-items: flex-start;
    gap: 0.5rem;
    margin-bottom: 0.4rem;
  }

  .label {
    margin: 0;
    font-size: 0.9rem;
    line-height: 1.4;
    color: #ccc;
    flex: 1;
  }

  .info-btn {
    flex-shrink: 0;
    width: 22px;
    height: 22px;
    border-radius: 50%;
    border: 1px solid rgba(74, 158, 255, 0.4);
    background: rgba(74, 158, 255, 0.1);
    color: #4a9eff;
    font-size: 0.75rem;
    font-weight: 700;
    font-style: italic;
    font-family: Georgia, 'Times New Roman', serif;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
    padding: 0;
    line-height: 1;
    margin-top: 0.1rem;
  }

  .info-btn:hover {
    background: rgba(74, 158, 255, 0.25);
    border-color: #4a9eff;
    box-shadow: 0 0 8px rgba(74, 158, 255, 0.3);
  }

  .info-btn.active {
    background: rgba(74, 158, 255, 0.3);
    border-color: #4a9eff;
    color: #fff;
  }

  .info-panel {
    margin: 0 0 0.6rem 0;
    padding: 0.7rem 0.9rem;
    background: rgba(74, 158, 255, 0.06);
    border-left: 2px solid rgba(74, 158, 255, 0.3);
    border-radius: 0 6px 6px 0;
    font-size: 0.82rem;
    line-height: 1.6;
    color: #aab;
  }

  .info-panel :global(a) {
    color: #6db3f8;
    text-decoration: none;
    border-bottom: 1px solid rgba(109, 179, 248, 0.3);
    transition: border-color 0.2s, color 0.2s;
  }

  .info-panel :global(a:hover) {
    color: #9dcbff;
    border-bottom-color: #9dcbff;
  }

  .info-panel :global(strong) {
    color: #ccd;
    font-weight: 600;
  }

  .controls {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .slider {
    flex: 1;
    -webkit-appearance: none;
    appearance: none;
    height: 6px;
    border-radius: 3px;
    background: linear-gradient(
      to right,
      #4a9eff 0%,
      #4a9eff var(--fill, 50%),
      rgba(255, 255, 255, 0.15) var(--fill, 50%),
      rgba(255, 255, 255, 0.15) 100%
    );
    outline: none;
    cursor: pointer;
    touch-action: none;
  }

  .slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 22px;
    height: 22px;
    border-radius: 50%;
    background: #4a9eff;
    border: 2px solid #fff;
    cursor: pointer;
    box-shadow: 0 0 6px rgba(74, 158, 255, 0.5);
    transition: box-shadow 0.2s, transform 0.15s;
  }

  .slider::-webkit-slider-thumb:hover {
    box-shadow: 0 0 12px rgba(74, 158, 255, 0.8);
    transform: scale(1.15);
  }

  .slider:active::-webkit-slider-thumb {
    transform: scale(1.25);
    box-shadow: 0 0 16px rgba(74, 158, 255, 0.9);
  }

  .slider::-moz-range-thumb {
    width: 22px;
    height: 22px;
    border-radius: 50%;
    background: #4a9eff;
    border: 2px solid #fff;
    cursor: pointer;
    box-shadow: 0 0 6px rgba(74, 158, 255, 0.5);
  }

  .slider:active::-moz-range-thumb {
    box-shadow: 0 0 16px rgba(74, 158, 255, 0.9);
  }

  .slider::-moz-range-track {
    height: 6px;
    border-radius: 3px;
    background: rgba(255, 255, 255, 0.15);
  }

  .value-group {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    flex-shrink: 0;
  }

  .number-input {
    width: 5rem;
    padding: 0.35rem 0.5rem;
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 4px;
    background: rgba(255, 255, 255, 0.08);
    color: #fff;
    font-size: 0.9rem;
    text-align: right;
    outline: none;
    transition: border-color 0.2s;
  }

  .number-input:focus {
    border-color: #4a9eff;
  }

  .invalid .number-input {
    border-color: #ff6b6b;
    background: rgba(255, 100, 100, 0.15);
  }

  .unit {
    font-size: 0.8rem;
    color: #888;
    white-space: nowrap;
    min-width: 2rem;
  }

  @media (max-width: 600px) {
    .controls {
      flex-direction: column;
      align-items: stretch;
    }

    .value-group {
      justify-content: flex-end;
    }

    .slider {
      height: 8px;
      border-radius: 4px;
      padding: 12px 0;
      box-sizing: content-box;
      margin: -12px 0;
      background-clip: content-box;
    }

    .slider::-webkit-slider-thumb {
      width: 32px;
      height: 32px;
      border-width: 3px;
    }

    .slider::-moz-range-thumb {
      width: 32px;
      height: 32px;
      border-width: 3px;
    }

    .slider::-moz-range-track {
      height: 8px;
      border-radius: 4px;
    }
  }

  @media (pointer: coarse) {
    .slider::-webkit-slider-thumb {
      width: 32px;
      height: 32px;
      border-width: 3px;
    }

    .slider::-moz-range-thumb {
      width: 32px;
      height: 32px;
      border-width: 3px;
    }
  }
</style>
