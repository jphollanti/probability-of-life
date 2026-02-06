<script>
  let {
    value = $bindable(),
    min = 0,
    max = 100,
    step = 1,
    unit = '',
    label = '',
    logScale = false,
  } = $props();

  let sMin = $derived(logScale ? Math.log10(Math.max(min, 1)) : min);
  let sMax = $derived(logScale ? Math.log10(max) : max);
  let sStep = $derived(logScale ? 0.01 : step);
  let sValue = $derived(logScale ? Math.log10(Math.max(value, 1)) : value);
  let fillPercent = $derived(
    sMax > sMin ? ((sValue - sMin) / (sMax - sMin)) * 100 : 0
  );

  let isValid = $derived(value >= min && value <= max);

  function onSliderInput(e) {
    const raw = parseFloat(e.target.value);
    if (logScale) {
      value = Math.round(Math.pow(10, raw));
    } else {
      value = parseFloat((Math.round(raw / step) * step).toFixed(10));
    }
  }

  function onNumberInput(e) {
    const v = parseFloat(e.target.value);
    if (!isNaN(v)) {
      value = v;
    }
  }
</script>

<div class="parameter" class:invalid={!isValid}>
  <p class="label">{label}</p>
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
        value={value}
        onchange={onNumberInput}
        {min}
        {max}
        {step}
        class="number-input"
      />
      {#if unit}
        <span class="unit">{unit}</span>
      {/if}
    </div>
  </div>
</div>

<style>
  .parameter {
    margin-bottom: 1.25rem;
  }

  .label {
    margin: 0 0 0.4rem 0;
    font-size: 0.9rem;
    line-height: 1.4;
    color: #ccc;
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
  }

  .slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: #4a9eff;
    border: 2px solid #fff;
    cursor: pointer;
    box-shadow: 0 0 6px rgba(74, 158, 255, 0.5);
    transition: box-shadow 0.2s;
  }

  .slider::-webkit-slider-thumb:hover {
    box-shadow: 0 0 12px rgba(74, 158, 255, 0.8);
  }

  .slider::-moz-range-thumb {
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: #4a9eff;
    border: 2px solid #fff;
    cursor: pointer;
    box-shadow: 0 0 6px rgba(74, 158, 255, 0.5);
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
  }
</style>
