/**
 * Survival distribution math for the Life Calculator.
 *
 * When civilizations arise as a Poisson process at rate R and have
 * independent lifetimes drawn from distribution f(t), the steady-state
 * count of simultaneously alive civilizations is Poisson(R × E[T]).
 *
 * The slider value L is interpreted differently per model:
 *   - Gaussian:     L = mean,   E[T] = L
 *   - Lognormal:    L = median, E[T] = L × exp(σ²/2)  (σ = 1.0)
 *   - Exponential:  L = mean,   E[T] = L
 *   - Zipf/Pareto:  L = median, E[T] = α × x_m / (α − 1)
 */

// Lognormal shape parameter (matches CivilizationAgeCurve.svelte)
const SIGMA_LOG = 1.0;

// exp(σ²/2) — the multiplier that converts lognormal median to mean
const LOGNORMAL_MEAN_FACTOR = Math.exp(SIGMA_LOG * SIGMA_LOG / 2);

// Pareto/Zipf shape parameter (α > 1 required for finite mean)
const PARETO_ALPHA = 1.5;

// x_m from median: median = x_m × 2^(1/α), so x_m = median / 2^(1/α)
const PARETO_MEDIAN_TO_XM = 1 / Math.pow(2, 1 / PARETO_ALPHA);

// Mean = α × x_m / (α−1).  As ratio to median: α / ((α−1) × 2^(1/α))
const PARETO_MEAN_FACTOR = PARETO_ALPHA * PARETO_MEDIAN_TO_XM / (PARETO_ALPHA - 1);

/**
 * Effective mean lifetime E[T] for the chosen distribution model.
 * This is what replaces the raw slider value in the civilization count formula.
 */
export function getEffectiveMean(model, sliderValue) {
  if (model === 'lognormal') return sliderValue * LOGNORMAL_MEAN_FACTOR;
  if (model === 'zipf') return sliderValue * PARETO_MEAN_FACTOR;
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

  if (model === 'zipf') {
    const xm = L * PARETO_MEDIAN_TO_XM;
    const mean = L * PARETO_MEAN_FACTOR;
    // Variance is infinite for α ≤ 2 (our α = 1.5)
    return {
      mean,
      median: L,
      stdDev: Infinity,
      cv: Infinity,
      modelLabel: 'Zipf (Pareto)',
      xm,
      alpha: PARETO_ALPHA,
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

// ─── Error function (Abramowitz & Stegun 7.1.26) ───────────────────

function erf(x) {
  const sign = x >= 0 ? 1 : -1;
  const a = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * a);
  const poly = t * (0.254829592 + t * (-0.284496736 + t * (1.421413741 + t * (-1.453152027 + t * 1.061405429))));
  return sign * (1 - poly * Math.exp(-a * a));
}

// ─── Survival function S(t) = P(lifetime > t) ──────────────────────

export function getSurvivalProbability(model, sliderValue, t) {
  if (t <= 0) return 1;
  const L = sliderValue;

  if (model === 'gaussian') {
    const sigma = L / 3;
    return 0.5 * (1 - erf((t - L) / (sigma * Math.SQRT2)));
  }

  if (model === 'lognormal') {
    if (t <= 0) return 1;
    const muLog = Math.log(L);
    return 0.5 * (1 - erf((Math.log(t) - muLog) / (SIGMA_LOG * Math.SQRT2)));
  }

  if (model === 'exponential') {
    return Math.exp(-t / L);
  }

  if (model === 'zipf') {
    const xm = L * PARETO_MEDIAN_TO_XM;
    if (t < xm) return 1;
    return Math.pow(xm / t, PARETO_ALPHA);
  }

  return 0;
}

// ─── Detectable fraction using survival-function integral ───────────
//
// The fraction of currently-alive civilizations that are broadcasting is:
//   ∫_{t_d}^∞ S(t) dt  /  ∫_0^∞ S(t) dt
// where S(t) is the survival function and t_d = timeToDetectable.

export function getDetectableFraction(model, sliderValue, timeToDetectable) {
  if (timeToDetectable <= 0) return 1;
  const mean = getEffectiveMean(model, sliderValue);
  if (mean <= 0) return 0;

  // Exponential: closed form  S(t) = e^{-t/μ}
  if (model === 'exponential') {
    return Math.exp(-timeToDetectable / sliderValue);
  }

  // Pareto/Zipf: closed form
  if (model === 'zipf') {
    const xm = sliderValue * PARETO_MEDIAN_TO_XM;
    if (timeToDetectable <= xm) {
      // ∫_{td}^∞ S(t)dt = (xm - td) + xm/(α-1);  E[T] = xm × α/(α-1)
      return ((xm - timeToDetectable) + xm / (PARETO_ALPHA - 1)) / mean;
    }
    // td ≥ xm: ∫_{td}^∞ (xm/t)^α dt = xm^α × td^{1-α} / (α-1)
    const integral = Math.pow(xm, PARETO_ALPHA) * Math.pow(timeToDetectable, 1 - PARETO_ALPHA) / (PARETO_ALPHA - 1);
    return integral / mean;
  }

  // Gaussian and Lognormal: numerical integration
  const maxT = mean * 20;
  const N = 500;
  const dt = maxT / N;
  let totalArea = 0, broadcastArea = 0;
  for (let i = 0; i < N; i++) {
    const t = (i + 0.5) * dt;
    const s = getSurvivalProbability(model, sliderValue, t);
    totalArea += s;
    if (t >= timeToDetectable) broadcastArea += s;
  }
  return totalArea > 0 ? broadcastArea / totalArea : 0;
}

// ─── Declining star formation rate ──────────────────────────────────
//
// Stars form at rate SFR(t) ∝ exp(-t/τ), peaking when 3rd-gen stars
// first appeared and declining since.  τ ≈ 3 Gyr matches the Milky Way's
// observed star-formation history.
//
// Returns the fraction of 3rd-gen planets older than timeRequired.

export function getFormationFraction(age, timeRequired, tau) {
  if (tau === undefined) tau = 3.0;
  if (timeRequired >= age) return 0;
  if (timeRequired <= 0) return 1;

  // Uniform fallback when τ → ∞
  if (tau <= 0 || !isFinite(tau)) return (age - timeRequired) / age;

  // F(T) = (1 - exp(-T/τ)) / (1 - exp(-age/τ)),  T = age - timeRequired
  const T = age - timeRequired;
  const denom = 1 - Math.exp(-age / tau);
  if (denom <= 0) return 0;
  return (1 - Math.exp(-T / tau)) / denom;
}

// ─── Parameter uncertainty propagation ──────────────────────────────
//
// Each multiplicative input is treated as the geometric mean of a
// log-normal belief distribution with geometric standard deviation `gsd`.
// The product of N log-normals is log-normal with
//   σ_total = √N × ln(gsd).
//
// Returns 90% credible interval { lower, upper }.

export function getParameterUncertaintyCI(pointEstimate, numParams, gsd) {
  if (gsd === undefined) gsd = 2.0;
  if (pointEstimate <= 0 || numParams <= 0) return { lower: 0, upper: 0 };
  const sigmaTotal = Math.sqrt(numParams) * Math.log(gsd);
  const z90 = 1.645;
  return {
    lower: Math.max(0, pointEstimate * Math.exp(-z90 * sigmaTotal)),
    upper: pointEstimate * Math.exp(z90 * sigmaTotal),
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

  if (model === 'zipf') {
    const xm = L * PARETO_MEDIAN_TO_XM;
    const pctMore = ((PARETO_MEAN_FACTOR - 1) * 100).toFixed(0);
    return `Under the Zipf (Pareto) model (α = ${PARETO_ALPHA}), civilization lifetimes follow ` +
      `a power law — the same pattern seen in city sizes, earthquake magnitudes, and species lifetimes. ` +
      `Most civilizations die very young (minimum lifespan ~${Math.round(xm).toLocaleString()} years), ` +
      `but rare survivors persist for extremely long times. The mean is ~${pctMore}% above the median ` +
      `and the variance is infinite, meaning occasional "ancient" civilizations dominate the galactic census.`;
  }

  // exponential
  return `Under the exponential (Doomsday) model, civilizations face a constant risk of ` +
    `extinction regardless of age. Half die before ${(L * Math.LN2).toFixed(0)} years. ` +
    `Most currently alive civilizations are relatively young.`;
}
