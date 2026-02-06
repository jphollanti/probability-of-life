/**
 * Survival distribution math for the Life Calculator.
 *
 * When civilizations arise as a Poisson process at rate R and have
 * independent lifetimes drawn from distribution f(t), the steady-state
 * count of simultaneously alive civilizations is Poisson(R × E[T]).
 *
 * The slider value L is interpreted differently per model:
 *   - Gaussian:    L = mean,   E[T] = L
 *   - Lognormal:   L = median, E[T] = L × exp(σ²/2)  (σ = 1.0)
 *   - Exponential:  L = mean,   E[T] = L
 */

// Lognormal shape parameter (matches CivilizationAgeCurve.svelte)
const SIGMA_LOG = 1.0;

// exp(σ²/2) — the multiplier that converts lognormal median to mean
const LOGNORMAL_MEAN_FACTOR = Math.exp(SIGMA_LOG * SIGMA_LOG / 2);

/**
 * Effective mean lifetime E[T] for the chosen distribution model.
 * This is what replaces the raw slider value in the civilization count formula.
 */
export function getEffectiveMean(model, sliderValue) {
  if (model === 'lognormal') {
    return sliderValue * LOGNORMAL_MEAN_FACTOR;
  }
  return sliderValue; // Gaussian and Exponential: slider IS the mean
}

/**
 * Summary statistics for the lifetime distribution.
 */
export function getDistributionStats(model, sliderValue) {
  const L = sliderValue;

  if (model === 'gaussian') {
    const sigma = L / 3;
    return {
      mean: L,
      median: L,
      stdDev: sigma,
      cv: 1 / 3,
      modelLabel: 'Gaussian',
    };
  }

  if (model === 'lognormal') {
    const mean = L * LOGNORMAL_MEAN_FACTOR;
    const variance = mean * mean * (Math.exp(SIGMA_LOG * SIGMA_LOG) - 1);
    return {
      mean,
      median: L,
      stdDev: Math.sqrt(variance),
      cv: Math.sqrt(Math.exp(SIGMA_LOG * SIGMA_LOG) - 1),
      modelLabel: 'Lognormal',
    };
  }

  // exponential
  return {
    mean: L,
    median: L * Math.LN2,
    stdDev: L,
    cv: 1,
    modelLabel: 'Exponential',
  };
}

// ─── Poisson distribution helpers ───────────────────────────────────

/**
 * Poisson PMF: P(X = k) for X ~ Poisson(lambda).
 * Computed in log-space to avoid overflow.
 */
export function poissonPMF(k, lambda) {
  if (lambda <= 0) return k === 0 ? 1 : 0;
  if (k < 0) return 0;

  // log(P) = k·ln(λ) − λ − ln(k!)
  let logP = k * Math.log(lambda) - lambda - logFactorial(k);
  return Math.exp(logP);
}

/**
 * ln(k!) using Stirling's approximation for large k,
 * exact for small k.
 */
function logFactorial(k) {
  if (k <= 1) return 0;
  if (k < 20) {
    let result = 0;
    for (let i = 2; i <= k; i++) result += Math.log(i);
    return result;
  }
  // Stirling with correction terms
  return k * Math.log(k) - k + 0.5 * Math.log(2 * Math.PI * k) + 1 / (12 * k);
}

/**
 * Poisson quantile: smallest k such that P(X ≤ k) ≥ p.
 * Uses Normal approximation for large lambda (> 200).
 */
export function poissonQuantile(p, lambda) {
  if (lambda <= 0) return 0;

  if (lambda > 200) {
    // Normal approximation with continuity correction
    const z = normalQuantile(p);
    return Math.max(0, Math.round(lambda + z * Math.sqrt(lambda)));
  }

  // Iterative CDF summation for small lambda
  let cumulative = 0;
  let k = 0;
  const maxK = Math.ceil(lambda + 20 * Math.sqrt(lambda + 1));
  while (k <= maxK) {
    cumulative += poissonPMF(k, lambda);
    if (cumulative >= p) return k;
    k++;
  }
  return k;
}

/**
 * Standard normal quantile (inverse CDF) via rational approximation.
 * Abramowitz & Stegun 26.2.23, accurate to ~4.5e-4.
 */
function normalQuantile(p) {
  if (p <= 0) return -Infinity;
  if (p >= 1) return Infinity;
  if (p === 0.5) return 0;

  const sign = p < 0.5 ? -1 : 1;
  const t = Math.sqrt(-2 * Math.log(Math.min(p, 1 - p)));

  // Coefficients for the rational approximation
  const c0 = 2.515517;
  const c1 = 0.802853;
  const c2 = 0.010328;
  const d1 = 1.432788;
  const d2 = 0.189269;
  const d3 = 0.001308;

  return sign * (t - (c0 + c1 * t + c2 * t * t) / (1 + d1 * t + d2 * t * t + d3 * t * t * t));
}

/**
 * Confidence interval for the number of civilizations.
 * Returns { lower, upper } for the given confidence level (e.g. 0.90).
 */
export function getConfidenceInterval(lambda, level) {
  if (lambda <= 0) return { lower: 0, upper: 0 };

  const alpha = (1 - level) / 2;
  return {
    lower: poissonQuantile(alpha, lambda),
    upper: poissonQuantile(1 - alpha, lambda),
  };
}

/**
 * Probability that there are zero civilizations: P(X = 0) = e^(-λ).
 */
export function probZero(lambda) {
  if (lambda <= 0) return 1;
  return Math.exp(-lambda);
}

/**
 * Model-specific insight text explaining what the distribution implies.
 */
export function getModelInsight(model, sliderValue, expectedN) {
  const L = sliderValue;
  const stats = getDistributionStats(model, L);

  if (model === 'gaussian') {
    return `Under the Gaussian model, civilizations cluster around the mean lifespan. ` +
      `The population is homogeneous — few die very young or survive far beyond the average.`;
  }

  if (model === 'lognormal') {
    const pctMore = ((LOGNORMAL_MEAN_FACTOR - 1) * 100).toFixed(0);
    return `Under the lognormal model (Maccone 2010), the median survival is the slider value ` +
      `but the mean is ~${pctMore}% higher due to the heavy right tail. ` +
      `A few extremely long-lived civilizations pull the average up, ` +
      `yielding more civilizations alive at any moment than symmetric models.`;
  }

  // exponential
  return `Under the exponential (Doomsday) model, civilizations face a constant risk of ` +
    `extinction regardless of age. Half die before ${(L * Math.LN2).toFixed(0)} years. ` +
    `Most currently alive civilizations are relatively young.`;
}
