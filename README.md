probability-of-life
===================

An interactive calculator that estimates the number of technological civilizations currently alive in the Milky Way galaxy.

Built with Svelte 5 and Vite. No backend — all calculations run in the browser.

## How it works

The calculator combines astrophysical, biological, and sociological parameters into a Drake equation-style estimation pipeline. The user adjusts ~20 sliders and the results update in real time.

The calculation flows through four stages:

1. **Planets in 3rd-generation star systems** — how many potential homes exist
2. **Planets capable of supporting life** — filtering for habitability
3. **Time, intelligence, and civilizations** — how many civilizations have ever emerged
4. **Currently alive civilizations** — accounting for survival distributions

The final output is a Poisson-distributed expected count of simultaneously existing civilizations, along with confidence intervals and detection odds.

---

## Calculation pipeline

### Stage 1: Planets in the galaxy

```
planetsInGalaxy = numberOfStars × 10⁹
               × planetsPerStar
               × (ratioWithPlanets / 100)
               × (ratioThirdGen / 100)
```

Only third-generation (Population I) stars are considered, since they contain the heavy elements necessary for rocky planets and complex chemistry.

### Stage 2: Planets capable of supporting life

```
planetsCapableOfLife = planetsInGalaxy
                    × (ratioHabitableZone / 100)
                    × (ratioWithWater / 100)
                    × (ratioGuardianPlanet / 100)
                    × (ratioIronCore / 100)
                    × (ratioSufficientMass / 100)
                    × (ratioChemicalPrerequisites / 100)
                    × (ratioLifeBegins / 100)
```

Seven multiplicative filters reduce the planet count. Each has a slider and an info panel explaining the science.

### Stage 3: Civilizations that have ever emerged

The time required for a civilization to develop is:

```
totalTimeRequired = timeForLifeToAppear + timeToIntelligentLife + timeToCivilization
```

Not all planets are old enough. The fraction that have had enough time is computed using a **declining exponential star formation model** (see below). The total number of civilizations that have ever emerged is:

```
totalCivilizations = fractionOldEnough × planetsCapableOfLife × civilizationsPerPlanet
```

The `civilizationsPerPlanet` parameter (default 1) allows modeling re-emergence cycles — a planet habitable for billions of years can produce multiple sequential civilizations.

### Stage 4: Currently alive civilizations

Civilizations emerge at a rate:

```
birthRate = totalCivilizations / civilizationTimeSpan
```

The steady-state count of simultaneously alive civilizations follows from the Poisson process model:

```
λ = E[lifetime] / (civilizationTimeSpan / totalCivilizations)
  = E[lifetime] × birthRate
```

where `E[lifetime]` is the effective mean lifetime under the chosen survival distribution (Gaussian, Lognormal, Exponential, or Zipf/Pareto).

The count `N ~ Poisson(λ)` gives confidence intervals and the probability of zero civilizations.

---

## Mathematical models

### Survival distributions

The user selects one of four models for civilization lifetimes. The slider value `L` has different interpretations per model:

| Model | Slider = | E\[T\] | Median | Variance |
|-------|----------|--------|--------|----------|
| **Gaussian** | mean (μ) | L | L | (L/3)² |
| **Lognormal** (Maccone 2010) | median | L × e^(σ²/2) ≈ 1.65L | L | finite but large |
| **Exponential** (Doomsday) | mean (μ) | L | L × ln 2 | L² |
| **Zipf/Pareto** (α = 1.5) | median | ≈ 1.89L | L | **∞** |

#### Gaussian (σ = μ/3)

Classic bell curve. Civilizations cluster around the mean lifespan. Few die very young or survive far beyond average. The least realistic model biologically, but the simplest.

#### Lognormal (σ_log = 1.0)

Based on Maccone's 2010 statistical extension of the Drake equation. The slider sets the median; the mean is ~65% higher due to the heavy right tail. Most civilizations die relatively young, but a few survivors pull up the average. This matches many natural phenomena (species lifetimes, income distributions).

#### Exponential (constant hazard rate)

The "Doomsday model." Civilizations face a constant probability of destruction regardless of age — like radioactive decay. Half die before `μ × ln(2)` years. The most pessimistic common model.

#### Zipf/Pareto (power law, α = 1.5)

Zipf's law applied to civilization lifetimes. The PDF follows a power law:

```
f(x) = α × x_m^α / x^(α+1)    for x ≥ x_m
```

where `x_m = median / 2^(1/α)` is the minimum possible lifetime. With α = 1.5:

- The mean exists (≈ 1.89 × median) but the **variance is infinite**
- Extreme outliers — ancient civilizations surviving millions of times the median — are rare but expected
- This matches empirical power laws observed in city sizes, earthquake magnitudes, species lifetimes, and extinction intervals
- A few extremely long-lived civilizations dominate the galactic census at any given time

### Detectable fraction (survival-function integral)

The fraction of currently-alive civilizations that are broadcasting detectable signals is computed using the survival function `S(t) = P(lifetime > t)`, not a naive mean ratio:

```
detectableFraction = ∫_{t_d}^∞ S(t) dt  /  ∫_0^∞ S(t) dt
```

where `t_d` is the time to develop detectable signals.

This correctly accounts for civilizations that die before ever reaching the broadcasting phase. For skewed distributions (exponential, Pareto), the difference from the naive formula `(mean - t_d) / mean` can be significant.

**Closed-form solutions** are used where available:
- **Exponential:** `exp(-t_d / μ)`
- **Pareto:** `x_m^α × t_d^(1-α) / ((α-1) × mean)` when `t_d ≥ x_m`
- **Gaussian/Lognormal:** numerical integration (midpoint rule, N=500)

### Non-uniform star formation rate

Instead of assuming stars formed uniformly over time, the calculator models star formation as a declining exponential:

```
SFR(t) ∝ exp(-t / τ)    where τ = 3.0 Gyr
```

This matches observations that the Milky Way's star formation rate peaked ~10 Gyr ago and has been declining. The fraction of 3rd-gen planets old enough for civilizations to have developed is:

```
F(T) = (1 - exp(-T/τ)) / (1 - exp(-age/τ))
```

where `T = age - timeRequired`.

**Effect:** With default parameters (age = 8 Gyr, τ = 3 Gyr, timeRequired ≈ 4.6 Gyr), ~73% of planets are old enough — compared to only ~43% under the uniform model. This is because most stars formed early when the rate was highest.

When `τ → ∞`, this reduces to the classic uniform formula `(age - timeRequired) / age`.

### Galactic habitable zone

Distance and detection calculations use the **galactic habitable zone** (GHZ) rather than the full Milky Way disk:

```
V_GHZ = π × (33,000² - 13,000²) × 1,000 ly³ ≈ 2.89 × 10¹² ly³
```

The GHZ spans roughly 4–10 kpc (13,000–33,000 light-years) from the galactic center — where metallicity is high enough for rocky planets but radiation isn't too intense. This is ~37% of the full disk volume (π × 50,000² × 1,000), making civilizations ~40% closer together than a full-galaxy calculation would suggest.

### Parameter uncertainty propagation

The calculator displays two types of confidence intervals:

1. **Poisson CI** — "given this birth rate λ, how many civilizations happen to be alive right now?" This is the narrow statistical noise.

2. **Parameter uncertainty CI** — "how uncertain are we about λ itself?" This is the dominant source of uncertainty.

The parameter uncertainty model treats each of the 13 multiplicative inputs as the geometric mean of a log-normal belief distribution with geometric standard deviation (GSD) = 2.0. Since the product of independent log-normals is log-normal:

```
σ_total = √N × ln(GSD) = √13 × ln(2) ≈ 2.50
```

The 90% credible interval is:

```
[λ × exp(-1.645 × σ_total),  λ × exp(+1.645 × σ_total)]
≈ [λ / 61,  λ × 61]
```

This means the true value could plausibly be ~60× lower or ~60× higher than the point estimate — spanning roughly 4 orders of magnitude. This honestly reflects how uncertain these calculations really are, and is displayed alongside the much narrower Poisson CI.

### Multiple civilizations per planet

The standard Drake equation assumes at most one civilization per planet. The `civilizationsPerPlanet` parameter (default 1, range 1–100) relaxes this constraint.

If civilizations are short-lived (~100,000 years) and a planet remains habitable for billions of years, there are millions of independent windows for intelligence to re-evolve. On Earth, mass extinctions have repeatedly reset the evolutionary clock — mammals rose to dominance only after dinosaurs were wiped out.

Increasing this parameter multiplies the total number of civilizations that have ever emerged, which directly increases the birth rate and therefore the steady-state count.

---

## Detection calculations

### Average distance between civilizations

Assuming civilizations are uniformly distributed within the galactic habitable zone:

```
d_avg = ∛(V_GHZ / N)
```

where N is the number of currently alive civilizations.

### Detection odds

The probability that at least one pair of detectable civilizations has exchanged signals:

```
detectionRange = E[lifetime] - timeToDetectable     (light-years, since signals travel at c)
p_pair = min(1, (4/3)π × detectionRange³ / V_GHZ)   (probability one pair overlaps)
n_pairs = N_detectable × (N_detectable - 1) / 2      (number of pairs)
P(detection) = 1 - exp(n_pairs × ln(1 - p_pair))     (log-space for numerical stability)
```

### Earth sanity check

The calculator compares predictions against the observed fact that Earth has detected zero alien signals in ~100 years of listening:

- **Expected signals at Earth** = `N_detectable × p_pair` (each civilization's signal sphere has probability `p_pair` of including Earth)
- **Civilizations that have heard Earth** = `N_detectable × V_earth_sphere / V_GHZ` (Earth's 100-light-year signal sphere as a fraction of the GHZ)

If the expected signals at Earth greatly exceed 1, the user is confronted with the Fermi paradox.

---

## Poisson process model

Civilizations emerge as a homogeneous Poisson process at rate `R = totalCivilizations / civilizationTimeSpan`. Each civilization has an independent random lifetime drawn from the chosen survival distribution with mean `E[T]`.

At steady state, the number of simultaneously alive civilizations is:

```
N ~ Poisson(λ)    where λ = R × E[T]
```

This is a standard result from queueing theory (M/G/∞ queue).

### Confidence intervals

- **Poisson 50% CI:** `[Q(0.25, λ), Q(0.75, λ)]`
- **Poisson 90% CI:** `[Q(0.05, λ), Q(0.95, λ)]`

where `Q(p, λ)` is the Poisson quantile function, computed via:
- Iterative CDF summation for λ ≤ 200
- Normal approximation `Q ≈ λ + z_p × √λ` for λ > 200

### Numerical methods

- **Poisson PMF** is computed in log-space: `log P(k) = k ln λ - λ - ln(k!)` to avoid overflow
- **Log-factorial** uses exact summation for k < 20 and Stirling's approximation with correction terms for larger k
- **Normal quantile** uses the Abramowitz & Stegun 26.2.23 rational approximation (accuracy ~4.5×10⁻⁴)
- **Error function** uses the Abramowitz & Stegun 7.1.26 polynomial approximation (accuracy ~1.5×10⁻⁷)

---

## Input parameters

### Stars and planets (4 parameters)

| Parameter | Range | Default | Unit | Description |
|-----------|-------|---------|------|-------------|
| Stars in the Milky Way | 1–1,000 | 200 | billion | Total star count (estimates: 100–400 billion) |
| Stars with planets | 1–100 | 80 | % | Kepler/TESS data: 80–100% of stars have planets |
| Planets per star | 1–20 | 2 | count | Including planet-like moons (Europa, Titan, etc.) |
| Third-generation stars | 1–100 | 75 | % | Population I stars with heavy elements |

### Life-supporting conditions (7 parameters)

| Parameter | Range | Default | Unit | Description |
|-----------|-------|---------|------|-------------|
| In habitable zone | 1–100 | 20 | % | Goldilocks zone for liquid water |
| With water | 1–100 | 30 | % | Sufficient water for life's chemistry |
| Guardian planet | 1–100 | 25 | % | Gas giant to deflect/deliver material |
| Iron core | 1–100 | 40 | % | Metallic core generating magnetosphere |
| Sufficient mass | 1–100 | 30 | % | Enough gravity to retain atmosphere |
| Chemical prerequisites | 1–100 | 50 | % | Primordial soup, plate tectonics, etc. |
| Life begins | 1–100 | 50 | % | Abiogenesis probability given all prerequisites |

### Time, intelligence, and civilizations (8 parameters)

| Parameter | Range | Default | Unit | Scale |
|-----------|-------|---------|------|-------|
| Age of 3rd-gen stars | 0.5–13 | 8 | bn yr | linear |
| Time for life to appear | 0.1–13 | 1 | bn yr | linear |
| Time to intelligent life | 0.1–13 | 3.5 | bn yr | linear |
| Time to civilization | 0.01–5 | 0.1 | bn yr | linear |
| Time to detectable signals | 100–1,000,000 | 10,000 | years | **log** |
| Detectable communication | 1–100 | 50 | % | linear |
| Civilization survival | 1–10,000,000,000 | 100,000 | years | **log** |
| Civilizations per planet | 1–100 | 1 | count | linear |

---

## Visualizations

### Civilization survival curve

An SVG chart showing the probability density function (PDF) of the selected survival distribution. Includes markers for the mean (and effective mean for lognormal/Zipf). Updated reactively as the user changes the model or survival time.

### Poisson result distribution

A discrete bar chart showing the PMF of the Poisson distribution for the expected civilization count. Bars are color-coded by confidence interval region (50% CI in dark blue, 90% CI in medium blue, tails in light blue).

### Animated Milky Way

A Canvas-based visualization of the galaxy with:
- 600 star dots in spiral arm configuration (2 main + 2 secondary arms)
- Central bar structure and dust band
- Green dots for civilizations (proportional to count)
- Gold dot for "Our Sun" at ~54% galactic radius
- Differential orbital speeds and twinkling animation at ~30 FPS

---

## Project structure

```
svelte-app/src/
├── App.svelte                       Main component (parameters, calculations, UI)
├── main.js                          App entry point
├── app.css                          Global CSS variables and reset
└── lib/
    ├── survivalMath.js              All statistical math (distributions, Poisson,
    │                                 uncertainty, star formation, detection)
    ├── formatNumber.js              Number formatting (compact, range, locale)
    ├── ParameterSlider.svelte       Reusable slider with log-scale, info panels
    ├── CivilizationAgeCurve.svelte  SVG survival distribution chart
    ├── ResultDistribution.svelte    Poisson PMF bar chart
    └── MilkyWayGalaxy.svelte        Canvas galaxy animation
```

## Running locally

```bash
cd svelte-app
npm install
npm run dev
```

## Building for production

```bash
cd svelte-app
npm run build
```

Output goes to `svelte-app/dist/`.

---

## References

- Drake, F. (1961). "The Drake Equation." Green Bank conference.
- Maccone, C. (2010). "The Statistical Drake Equation." *Acta Astronautica*, 67(11-12), 1366-1383.
- Stern, R. J. & Gerya, T. (2024). "Plate tectonics and the Fermi paradox." *Scientific Reports*.
- Ward, P. & Brownlee, D. (2000). *Rare Earth: Why Complex Life is Uncommon in the Universe.*
- Kipping, D. (2025). Bayesian analysis of LUCA timing and abiogenesis probability.
