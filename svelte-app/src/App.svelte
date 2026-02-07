<script>
  import ParameterSlider from './lib/ParameterSlider.svelte';
  import CivilizationAgeCurve from './lib/CivilizationAgeCurve.svelte';
  import MilkyWayGalaxy from './lib/MilkyWayGalaxy.svelte';
  import ResultDistribution from './lib/ResultDistribution.svelte';
  import { formatNumber, formatRange, formatCompact } from './lib/formatNumber.js';
  import { getEffectiveMean, getDistributionStats, getConfidenceInterval, getModelInsight, probZero } from './lib/survivalMath.js';

  // === DEFAULT VALUES ===
  const DEFAULTS = {
    numberOfStars: 200,
    ratioWithPlanets: 80,
    planetsPerStar: 2,
    ratioThirdGen: 75,
    ratioHabitableZone: 20,
    ratioWithWater: 30,
    ratioGuardianPlanet: 25,
    ratioIronCore: 40,
    ratioSufficientMass: 30,
    ratioChemicalPrerequisites: 50,
    ratioLifeBegins: 50,
    ageThirdGen: 8,
    timeForLifeToAppear: 1,
    timeToIntelligentLife: 3.5,
    timeToCivilization: 0.1,
    timeToDetectable: 10_000,
    ratioCommunication: 50,
    civilizationSurvival: 100_000,
    survivalModel: 'gaussian',
  };

  // === PERSISTENT STORAGE ===
  const STORAGE_KEY = 'life-calculator-params';

  function loadSaved() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
    return {};
  }

  const saved = loadSaved();

  function init(key) {
    return saved[key] ?? DEFAULTS[key];
  }

  // === STATE ===
  let numberOfStars = $state(init('numberOfStars'));
  let ratioWithPlanets = $state(init('ratioWithPlanets'));
  let planetsPerStar = $state(init('planetsPerStar'));
  let ratioThirdGen = $state(init('ratioThirdGen'));
  let ratioHabitableZone = $state(init('ratioHabitableZone'));
  let ratioWithWater = $state(init('ratioWithWater'));
  let ratioGuardianPlanet = $state(init('ratioGuardianPlanet'));
  let ratioIronCore = $state(init('ratioIronCore'));
  let ratioSufficientMass = $state(init('ratioSufficientMass'));
  let ratioChemicalPrerequisites = $state(init('ratioChemicalPrerequisites'));
  let ratioLifeBegins = $state(init('ratioLifeBegins'));
  let ageThirdGen = $state(init('ageThirdGen'));
  let timeForLifeToAppear = $state(init('timeForLifeToAppear'));
  let timeToIntelligentLife = $state(init('timeToIntelligentLife'));
  let timeToCivilization = $state(init('timeToCivilization'));
  let timeToDetectable = $state(init('timeToDetectable'));
  let ratioCommunication = $state(init('ratioCommunication'));
  let civilizationSurvival = $state(init('civilizationSurvival'));
  let survivalModel = $state(init('survivalModel'));

  // Save all parameters to localStorage whenever any value changes
  $effect(() => {
    const params = {
      numberOfStars, ratioWithPlanets, planetsPerStar, ratioThirdGen,
      ratioHabitableZone, ratioWithWater, ratioGuardianPlanet, ratioIronCore,
      ratioSufficientMass, ratioChemicalPrerequisites, ratioLifeBegins,
      ageThirdGen, timeForLifeToAppear, timeToIntelligentLife, timeToCivilization,
      timeToDetectable, ratioCommunication, civilizationSurvival, survivalModel,
    };
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(params)); } catch {}
  });

  // === DERIVED CALCULATIONS ===

  // Section 1: Planets in 3rd-gen star systems
  let planetsInGalaxy = $derived(
    numberOfStars * 1e9
    * planetsPerStar
    * (ratioWithPlanets / 100)
    * (ratioThirdGen / 100)
  );

  // Section 2: Planets capable of supporting life
  let planetsCapableOfLife = $derived(
    planetsInGalaxy
    * (ratioHabitableZone / 100)
    * (ratioWithWater / 100)
    * (ratioGuardianPlanet / 100)
    * (ratioIronCore / 100)
    * (ratioSufficientMass / 100)
    * (ratioChemicalPrerequisites / 100)
    * (ratioLifeBegins / 100)
  );

  // Section 3: Time calculations
  let totalTimeRequired = $derived(
    timeForLifeToAppear + timeToIntelligentLife + timeToCivilization
  );

  let timeWarning = $derived(totalTimeRequired >= ageThirdGen);

  // Time window during which life could have first appeared (billions of years)
  let timeWindowForLife = $derived(
    Math.max(0, ageThirdGen - timeForLifeToAppear)
  );

  // Fraction of 3rd-gen planets old enough for life to have appeared
  let fractionWithLife = $derived(
    ageThirdGen > 0
      ? Math.max(0, (ageThirdGen - timeForLifeToAppear) / ageThirdGen)
      : 0
  );

  // Planets where life has appeared
  let planetsWithLife = $derived(fractionWithLife * planetsCapableOfLife);

  // Fraction old enough for intelligent life
  let fractionWithIntelligentLife = $derived(
    ageThirdGen > 0
      ? Math.max(0, (ageThirdGen - timeForLifeToAppear - timeToIntelligentLife) / ageThirdGen)
      : 0
  );

  let planetsWithIntelligentLife = $derived(
    fractionWithIntelligentLife * planetsCapableOfLife
  );

  // Fraction old enough for civilizations to have formed
  let fractionWithCivilizations = $derived(
    ageThirdGen > 0
      ? Math.max(0, (ageThirdGen - totalTimeRequired) / ageThirdGen)
      : 0
  );

  // Total civilizations that have ever emerged
  let totalCivilizations = $derived(
    fractionWithCivilizations * planetsCapableOfLife
  );

  // Time span during which civilizations could have evolved (years)
  let civilizationTimeSpan = $derived(
    Math.max(0, ageThirdGen - totalTimeRequired) * 1e9
  );

  // How often a new civilization emerges (years)
  let newCivilizationFrequency = $derived(
    totalCivilizations > 0 ? civilizationTimeSpan / totalCivilizations : Infinity
  );

  // Effective mean lifetime, accounting for distribution model
  let effectiveMeanLifetime = $derived(
    getEffectiveMean(survivalModel, civilizationSurvival)
  );

  // Distribution statistics for display
  let distributionStats = $derived(
    getDistributionStats(survivalModel, civilizationSurvival)
  );

  // Current civilizations alive in the galaxy (Poisson lambda)
  let currentCivilizations = $derived(
    newCivilizationFrequency > 0 && isFinite(newCivilizationFrequency)
      ? effectiveMeanLifetime / newCivilizationFrequency
      : 0
  );

  // Confidence intervals from Poisson model
  let ci90 = $derived(getConfidenceInterval(currentCivilizations, 0.90));
  let ci50 = $derived(getConfidenceInterval(currentCivilizations, 0.50));

  // Probability of zero civilizations
  let pZero = $derived(probZero(currentCivilizations));

  // Fraction of a civilization's lifetime during which it broadcasts detectable signals.
  // A civilization must first develop for timeToDetectable years before it starts broadcasting.
  let detectableFraction = $derived(
    effectiveMeanLifetime > 0
      ? Math.max(0, effectiveMeanLifetime - timeToDetectable) / effectiveMeanLifetime
      : 0
  );

  // Of those, how many have detectable communication?
  let detectableCivilizations = $derived(
    currentCivilizations * (ratioCommunication / 100) * detectableFraction
  );

  let detectableCI90 = $derived({
    lower: ci90.lower * (ratioCommunication / 100),
    upper: ci90.upper * (ratioCommunication / 100),
  });

  // Average distance between civilizations (light-years)
  // Milky Way disk: ~100,000 ly diameter, ~1,000 ly thick
  const MILKY_WAY_VOLUME_LY3 = Math.PI * 50_000 * 50_000 * 1_000;
  let avgDistance = $derived(
    currentCivilizations > 1
      ? Math.cbrt(MILKY_WAY_VOLUME_LY3 / currentCivilizations)
      : null
  );

  let distanceRange = $derived(
    ci90.upper > 1 && ci90.lower > 1
      ? {
          near: Math.cbrt(MILKY_WAY_VOLUME_LY3 / ci90.upper),
          far: Math.cbrt(MILKY_WAY_VOLUME_LY3 / ci90.lower),
        }
      : null
  );

  // Detection odds: probability that at least one pair of detectable civilizations
  // is close enough for their signals to have reached each other.
  // Detection range ≈ broadcasting duration in light-years (signals travel at c).
  // Civilizations only broadcast for (lifetime - timeToDetectable) years.
  let detectionRange = $derived(Math.max(0, effectiveMeanLifetime - timeToDetectable));

  let pairDetectionProb = $derived(
    detectionRange > 0
      ? Math.min(1, (4 / 3) * Math.PI * Math.pow(detectionRange, 3) / MILKY_WAY_VOLUME_LY3)
      : 0
  );

  let numDetectablePairs = $derived(
    detectableCivilizations >= 2
      ? detectableCivilizations * (detectableCivilizations - 1) / 2
      : 0
  );

  // 1 - (1-p)^n computed in log-space for numerical stability
  let detectionOdds = $derived(
    numDetectablePairs > 0 && pairDetectionProb > 0
      ? 1 - Math.exp(numDetectablePairs * Math.log(1 - pairDetectionProb))
      : 0
  );

  // === EARTH SANITY CHECK ===
  // Earth has been listening/broadcasting for ~100 years.
  // From Earth's perspective, how many alien signals should we expect to have detected?
  const EARTH_LISTENING_YEARS = 100;

  // Volume fraction of galaxy within Earth's 100-light-year signal sphere
  let earthSphereFraction = $derived(
    Math.min(1, (4 / 3) * Math.PI * Math.pow(EARTH_LISTENING_YEARS, 3) / MILKY_WAY_VOLUME_LY3)
  );

  // Expected number of detectable civilizations whose signals have reached Earth.
  // Each civilization's signals travel detectionRange light-years; the probability
  // that Earth falls within any one civilization's signal sphere = pairDetectionProb.
  let expectedSignalsAtEarth = $derived(
    detectableCivilizations * pairDetectionProb
  );

  // Expected number of civilizations that could have detected Earth's signals.
  // Our signals have only traveled ~100 light-years.
  let expectedHaveHeardEarth = $derived(
    detectableCivilizations * earthSphereFraction
  );

  // Model insight text
  let modelInsight = $derived(
    getModelInsight(survivalModel, civilizationSurvival, currentCivilizations)
  );

  // === SCROLL TRACKING ===
  let heroVisible = $state(true);
  let resultsVisible = $state(false);
  let showFloatingHeader = $derived(!heroVisible && !resultsVisible);

  let heroEl = $state(null);
  let resultsEl = $state(null);

  $effect(() => {
    if (!heroEl || !resultsEl) return;

    const heroObserver = new IntersectionObserver(
      ([entry]) => { heroVisible = entry.isIntersecting; },
      { threshold: 0 }
    );

    const resultsObserver = new IntersectionObserver(
      ([entry]) => { resultsVisible = entry.isIntersecting; },
      { threshold: 0 }
    );

    heroObserver.observe(heroEl);
    resultsObserver.observe(resultsEl);

    return () => {
      heroObserver.disconnect();
      resultsObserver.disconnect();
    };
  });

  // Easter egg: exactly one civilization
  let isExactlyOne = $derived(
    currentCivilizations >= 0.95 && currentCivilizations < 1.05
  );

  function openTshirtDesign() {
    const params = [
      ['Stars in the Milky Way', `${numberOfStars} billion`],
      ['Stars with planets', `${ratioWithPlanets}%`],
      ['Planets per star', `${planetsPerStar}`],
      ['Third-generation stars', `${ratioThirdGen}%`],
      ['In habitable zone', `${ratioHabitableZone}%`],
      ['With water', `${ratioWithWater}%`],
      ['Guardian planet', `${ratioGuardianPlanet}%`],
      ['Iron core / magnetosphere', `${ratioIronCore}%`],
      ['Sufficient mass', `${ratioSufficientMass}%`],
      ['Chemical prerequisites', `${ratioChemicalPrerequisites}%`],
      ['Life begins', `${ratioLifeBegins}%`],
      ['Age of 3rd-gen stars', `${ageThirdGen} bn yr`],
      ['Time for life to appear', `${timeForLifeToAppear} bn yr`],
      ['Time to intelligent life', `${timeToIntelligentLife} bn yr`],
      ['Time to civilization', `${timeToCivilization} bn yr`],
      ['Time to detectable signals', `${formatNumber(timeToDetectable)} yr`],
      ['Detectable communication', `${ratioCommunication}%`],
      ['Civilization survival', `${formatNumber(civilizationSurvival)} years`],
      ['Survival model', survivalModel],
    ];
    const paramRows = params.map(([k, v]) =>
      `<tr><td style="padding:3px 12px 3px 0;color:#aaa">${k}</td><td style="padding:3px 0;color:#ffd700">${v}</td></tr>`
    ).join('');
    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>There Is a God — T-Shirt</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#0a0a1a;color:#d0d0d0;font-family:-apple-system,BlinkMacSystemFont,sans-serif;
display:flex;justify-content:center;align-items:center;min-height:100vh;padding:2rem}
.page{max-width:480px;text-align:center}
.tshirt{background:#111;border:2px solid rgba(255,215,0,0.3);border-radius:16px;padding:2.5rem 2rem;margin-bottom:2rem;
box-shadow:0 0 40px rgba(255,215,0,0.08)}
h1{color:#ffd700;font-size:1.8rem;margin-bottom:0.5rem;text-shadow:0 0 20px rgba(255,215,0,0.3)}
.sub{color:#aaa;font-size:0.9rem;margin-bottom:1.5rem;font-style:italic}
table{margin:0 auto;font-size:0.78rem;text-align:left;border-collapse:collapse}
.divider{height:1px;background:linear-gradient(to right,transparent,rgba(255,215,0,0.3),transparent);margin:1rem 0}
.footer{font-size:0.75rem;color:#666}
@media print{body{background:#fff;color:#000}.tshirt{border-color:#ccc;box-shadow:none}
h1{color:#b8860b;text-shadow:none}td{color:#333!important}.sub,.footer{color:#666}}
</style></head><body><div class="page">
<div class="tshirt">
<h1>There is a God!</h1>
<p class="sub">I tuned the parameters of the Life Calculator<br>and found exactly one civilization.</p>
<div class="divider"></div>
<table>${paramRows}</table>
</div>
<p class="footer">Life Calculator &mdash; probability-of-life</p>
<p style="margin-top:1rem;font-size:0.8rem;color:#888">Print this page (Ctrl+P) to save your t-shirt design</p>
</div></body></html>`;
    const blob = new Blob([html], { type: 'text/html' });
    window.open(URL.createObjectURL(blob), '_blank');
  }

  // Reset to defaults
  function reset() {
    numberOfStars = DEFAULTS.numberOfStars;
    ratioWithPlanets = DEFAULTS.ratioWithPlanets;
    planetsPerStar = DEFAULTS.planetsPerStar;
    ratioThirdGen = DEFAULTS.ratioThirdGen;
    ratioHabitableZone = DEFAULTS.ratioHabitableZone;
    ratioWithWater = DEFAULTS.ratioWithWater;
    ratioGuardianPlanet = DEFAULTS.ratioGuardianPlanet;
    ratioIronCore = DEFAULTS.ratioIronCore;
    ratioSufficientMass = DEFAULTS.ratioSufficientMass;
    ratioChemicalPrerequisites = DEFAULTS.ratioChemicalPrerequisites;
    ratioLifeBegins = DEFAULTS.ratioLifeBegins;
    ageThirdGen = DEFAULTS.ageThirdGen;
    timeForLifeToAppear = DEFAULTS.timeForLifeToAppear;
    timeToIntelligentLife = DEFAULTS.timeToIntelligentLife;
    timeToCivilization = DEFAULTS.timeToCivilization;
    timeToDetectable = DEFAULTS.timeToDetectable;
    ratioCommunication = DEFAULTS.ratioCommunication;
    civilizationSurvival = DEFAULTS.civilizationSurvival;
    survivalModel = DEFAULTS.survivalModel;
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
  }
</script>

<div class="app">
  <header>
    <h1>Life Calculator</h1>
    <p class="subtitle">Estimating civilizations in the Milky Way</p>
    <p class="intro">
      How many civilizations currently exist in the Milky Way? This calculator
      estimates the probability of extraterrestrial civilizations based on astrophysical,
      biological, and sociological factors. Adjust the parameters and see how they affect the outcome.
    </p>

    <div class="hero-civilization" bind:this={heroEl}>
      <span class="hero-label">Civilizations in the Milky Way right now</span>
      <span class="hero-value">{formatNumber(currentCivilizations, 1)}</span>
      {#if currentCivilizations > 0}
        <span class="hero-range">90% range: {formatRange(ci90.lower, ci90.upper)}</span>
      {/if}
    </div>
  </header>

  <div class="floating-header" class:visible={showFloatingHeader}>
    <span class="floating-label">Civilizations now</span>
    <span class="floating-value">
      {formatCompact(currentCivilizations)}
      {#if currentCivilizations > 0}
        <span class="floating-range">({formatRange(ci90.lower, ci90.upper)})</span>
      {/if}
    </span>
  </div>

  <main>
    <!-- Section 1: Stars and Planets -->
    <section class="card">
      <h2>Stars, Planets and Moons</h2>
      <p class="section-subtitle">Stellar and planetary parameters</p>

      <ParameterSlider
        bind:value={numberOfStars}
        min={1} max={1000} step={1}
        unit="billion"
        label="The Milky Way is estimated to contain 100–400 billion stars. What is your estimate?"
        info={'The <a href="https://en.wikipedia.org/wiki/Milky_Way" target="_blank" rel="noopener">Milky Way</a> is a barred spiral galaxy with an estimated diameter of 100,000 light-years. Estimates of its total star count range from 100 to 400 billion. The ESA\'s <a href="https://en.wikipedia.org/wiki/Gaia_(spacecraft)" target="_blank" rel="noopener">Gaia mission</a> has mapped over 2 billion stars (up from 2 million in the 1990s), but the exact total remains uncertain because faint <a href="https://en.wikipedia.org/wiki/Red_dwarf" target="_blank" rel="noopener">red dwarfs</a> — roughly 70% of all stars — are hard to detect at large distances. Most current estimates center around 100–200 billion.'}
      />

      <ParameterSlider
        bind:value={ratioWithPlanets}
        min={1} max={100} step={1}
        unit="%"
        label="What percentage of stars have planets on average?"
        info={'Data from the <a href="https://en.wikipedia.org/wiki/Kepler_space_telescope" target="_blank" rel="noopener">Kepler</a> and <a href="https://en.wikipedia.org/wiki/Transiting_Exoplanet_Survey_Satellite" target="_blank" rel="noopener">TESS</a> missions confirms that <strong>planets are the rule rather than the exception</strong>. Statistical analyses of Kepler data show at least one planet per star on average, meaning there are likely more planets than stars in the Milky Way. Current estimates suggest 80–100% of stars host planetary systems. TESS has identified over 7,800 candidate exoplanets as of 2026, reinforcing these findings.'}
      />

      <ParameterSlider
        bind:value={planetsPerStar}
        min={1} max={20} step={1}
        unit="pcs"
        label="How many planets and planet-like moons does a star with planets have on average? (Our Solar System has 8 planets. Jupiter and Saturn have several planet-like moons.)"
        info={'Our <a href="https://en.wikipedia.org/wiki/Solar_System" target="_blank" rel="noopener">Solar System</a> has 8 planets, but moons like <a href="https://en.wikipedia.org/wiki/Europa_(moon)" target="_blank" rel="noopener">Europa</a>, <a href="https://en.wikipedia.org/wiki/Enceladus" target="_blank" rel="noopener">Enceladus</a>, and <a href="https://en.wikipedia.org/wiki/Titan_(moon)" target="_blank" rel="noopener">Titan</a> are also considered potentially habitable. Kepler data suggests an average of roughly <strong>1.6 planets per star</strong> for Sun-like stars, but including moons and smaller bodies increases this significantly.'}
      />

      <ParameterSlider
        bind:value={ratioThirdGen}
        min={1} max={100} step={1}
        unit="%"
        label="What percentage of all star systems are third-generation? Our Solar System is a third-generation star system, which is considered a prerequisite for life."
        info={'Stars are classified into <a href="https://en.wikipedia.org/wiki/Stellar_population" target="_blank" rel="noopener">stellar populations</a>. <strong>Population I</strong> (third-generation) stars are metal-rich, meaning they contain heavy elements forged in earlier generations of supernovae. These heavy elements (carbon, oxygen, iron, silicon) are essential for forming rocky planets and the chemistry of life. Our Sun is a Population I star. Population I stars dominate the Milky Way\'s <strong>thin disk</strong>, which contains the majority of the galaxy\'s stellar mass (60–80%). The oldest Population I stars are up to 10 billion years old. The galactic halo and bulge host older, metal-poor Population II stars.'}
      />

      <div class="section-result">
        Your Milky Way has <strong>{formatNumber(planetsInGalaxy)}</strong> planets in third-generation star systems.
      </div>
    </section>

    <!-- Section 2: Life-supporting Conditions -->
    <section class="card">
      <h2>Life-Supporting Conditions</h2>
      <p class="section-subtitle">Factors required for life to emerge</p>

      <ParameterSlider
        bind:value={ratioHabitableZone}
        min={1} max={100} step={1}
        unit="%"
        label="The habitable zone is the optimal distance from a star where it is neither too hot nor too cold. In our Solar System, Earth and Mars fall within this zone. What fraction of planets are in the habitable zone?"
        info={'The <a href="https://en.wikipedia.org/wiki/Circumstellar_habitable_zone" target="_blank" rel="noopener">circumstellar habitable zone</a> (also called the "Goldilocks zone") is the range of orbits around a star where liquid water could exist on a planet\'s surface. For Sun-like stars, it extends roughly from 0.95 to 1.67 AU. Kepler data suggests <strong>0.37–0.88 rocky planets per Sun-like star</strong> orbit within the habitable zone (<a href="https://en.wikipedia.org/wiki/Earth_analog#Prevalence" target="_blank" rel="noopener">η⊕</a>). Red dwarfs have much narrower habitable zones, and planets there may be tidally locked or stripped of atmospheres by stellar flares.'}
      />

      <ParameterSlider
        bind:value={ratioWithWater}
        min={1} max={100} step={1}
        unit="%"
        label="Water is a prerequisite for life as we know it. What fraction of habitable planets have enough water to sustain life?"
        info={'<a href="https://en.wikipedia.org/wiki/Water" target="_blank" rel="noopener">Water</a> is considered essential because it is an excellent solvent, remains liquid over a wide temperature range, and facilitates complex chemistry. Water is abundant in the universe — detected on <a href="https://en.wikipedia.org/wiki/Extraterrestrial_liquid_water" target="_blank" rel="noopener">Mars, Europa, Enceladus</a>, and in many exoplanet atmospheres. A 2024 study modelling 28 rocky exoplanets found several (including Proxima Centauri b and TRAPPIST-1 e) may have extended liquid water reservoirs. However, <strong>too much</strong> water creates ocean worlds that may lack the land-ocean balance needed for life\'s chemical cycles.'}
      />

      <ParameterSlider
        bind:value={ratioGuardianPlanet}
        min={1} max={100} step={1}
        unit="%"
        label="A large planet like Jupiter sweeps up meteorites and protects inner planets. What fraction of star systems have such a guardian planet?"
        info={'The <a href="https://en.wikipedia.org/wiki/Jupiter" target="_blank" rel="noopener">Jupiter</a> shield hypothesis suggests gas giants protect inner planets by deflecting comets and asteroids. However, <strong>recent simulations have largely debunked this idea</strong> — Kevin Grazier\'s work shows Jupiter is "just as likely to send comets at Earth as deflect them away," acting as both shield and sniper. Jupiter may have been more important for <em>delivering</em> volatiles needed for life. Observationally, gas giants like Jupiter are found around only <strong>~10–20% of Sun-like stars</strong> (higher for metal-rich stars at ~28%). See <a href="https://en.wikipedia.org/wiki/Rare_Earth_hypothesis" target="_blank" rel="noopener">Rare Earth hypothesis</a>.'}
      />

      <ParameterSlider
        bind:value={ratioIronCore}
        min={1} max={100} step={1}
        unit="%"
        label="A metallic core and the magnetic field it generates protect against space radiation. What fraction of planets have a metallic core? (Heavy metals are common in third-generation star systems.)"
        info={'A planet\'s <a href="https://en.wikipedia.org/wiki/Planetary_core" target="_blank" rel="noopener">metallic core</a> generates a <a href="https://en.wikipedia.org/wiki/Magnetosphere" target="_blank" rel="noopener">magnetosphere</a> through the dynamo effect. This shields the surface from <a href="https://en.wikipedia.org/wiki/Solar_wind" target="_blank" rel="noopener">solar wind</a> and <a href="https://en.wikipedia.org/wiki/Cosmic_ray" target="_blank" rel="noopener">cosmic radiation</a>, and prevents atmospheric stripping. All four terrestrial planets in our Solar System have iron cores, suggesting iron core formation is common in rocky planets. However, <strong>maintaining an active dynamo</strong> requires a liquid, convecting core — Mars lost its magnetic field when its core cooled. The longest-lived fields occur on massive planets with intermediate iron content.'}
      />

      <ParameterSlider
        bind:value={ratioSufficientMass}
        min={1} max={100} step={1}
        unit="%"
        label="Sufficient gravity is required to retain an atmosphere. What fraction of planets have enough mass to maintain an atmosphere?"
        info={'A planet needs sufficient <a href="https://en.wikipedia.org/wiki/Surface_gravity" target="_blank" rel="noopener">surface gravity</a> to prevent <a href="https://en.wikipedia.org/wiki/Atmospheric_escape" target="_blank" rel="noopener">atmospheric escape</a>. Lighter gas molecules (hydrogen, helium) escape more easily, so a planet must be massive enough to hold onto heavier gases like nitrogen and oxygen. Earth\'s mass (~5.97 × 10²⁴ kg) is sufficient, while Mars (about 10% of Earth\'s mass) has lost most of its atmosphere. <a href="https://en.wikipedia.org/wiki/Super-Earth" target="_blank" rel="noopener">Super-Earths</a> retain atmospheres even more effectively.'}
      />

      <ParameterSlider
        bind:value={ratioChemicalPrerequisites}
        min={1} max={100} step={1}
        unit="%"
        label="Is there a chemical prerequisite, such as a specific mixture ('primordial soup'), for life to begin? Estimate what fraction of otherwise habitable planets meet this requirement."
        info={'The <a href="https://en.wikipedia.org/wiki/Primordial_soup" target="_blank" rel="noopener">primordial soup</a> hypothesis proposes that life arose from a mixture of organic molecules in early Earth\'s oceans, energized by lightning, UV radiation, or hydrothermal vents. The <a href="https://en.wikipedia.org/wiki/Miller%E2%80%93Urey_experiment" target="_blank" rel="noopener">Miller–Urey experiment</a> (1952) showed amino acids form spontaneously under early Earth-like conditions. A 2024 study by <a href="https://doi.org/10.1038/s41598-024-54700-x" target="_blank" rel="noopener">Stern &amp; Gerya</a> argues that <strong>plate tectonics</strong> and the right balance of continents and oceans are essential — and that only 0.003–0.2% of habitable planets may meet these geological requirements, potentially explaining the Fermi paradox.'}
      />

      <ParameterSlider
        bind:value={ratioLifeBegins}
        min={1} max={100} step={1}
        unit="%"
        label="Even if all prerequisites are met, what is the probability that life actually begins? This represents the transition from chemistry to biology — how rare is that event?"
        info={'<a href="https://en.wikipedia.org/wiki/Abiogenesis" target="_blank" rel="noopener">Abiogenesis</a> — the natural process of life arising from non-living matter — remains one of the deepest unsolved problems in science. We know it happened at least once (on Earth, within the first billion years), but we don\'t know if it was an extraordinarily unlikely event or a near-certainty given the right conditions. The speed with which life appeared on Earth (within ~500 million years of habitable conditions) suggests it may not be exceedingly rare.'}
      />

      <div class="section-result">
        Your Milky Way has <strong>{formatNumber(planetsCapableOfLife)}</strong> planets where life can emerge.
      </div>
    </section>

    <!-- Section 3: Time, Intelligence and Civilizations -->
    <section class="card">
      <h2>Time, Intelligent Life and Civilizations</h2>
      <p class="section-subtitle">Temporal and sociological factors</p>

      <ParameterSlider
        bind:value={ageThirdGen}
        min={0.5} max={13} step={0.1}
        unit="bn yr"
        label="What is the maximum age of third-generation star systems? (The Milky Way is about 13 billion years old.)"
        info={'The <a href="https://en.wikipedia.org/wiki/Age_of_the_universe" target="_blank" rel="noopener">universe is about 13.8 billion years old</a>. Third-generation (Population I) stars like our Sun began forming after earlier stellar generations enriched the interstellar medium with heavy elements through <a href="https://en.wikipedia.org/wiki/Supernova" target="_blank" rel="noopener">supernovae</a>. <strong>The oldest Population I stars are up to 10 billion years old</strong>, while our Sun is about <a href="https://en.wikipedia.org/wiki/Sun" target="_blank" rel="noopener">4.6 billion years old</a>. Some metal-rich stars in the galactic bulge formed over 10 billion years ago in regions where rapid star formation quickly enriched the gas with heavy elements.'}
      />

      <ParameterSlider
        bind:value={timeForLifeToAppear}
        min={0.1} max={13} step={0.1}
        unit="bn yr"
        label="How long does it take for life to appear after a planet forms? (On Earth, roughly 0.5–1 billion years.)"
        info={'On Earth, the <a href="https://en.wikipedia.org/wiki/Earliest_known_life_forms" target="_blank" rel="noopener">earliest evidence of life</a> dates to about 3.5–4.1 billion years ago, roughly <strong>500 million to 1 billion years</strong> after the planet formed. Recent research (Kipping 2025) places the <a href="https://en.wikipedia.org/wiki/Last_universal_common_ancestor" target="_blank" rel="noopener">Last Universal Common Ancestor (LUCA)</a> at 4.2 billion years ago — only ~350 million years after Earth formed. Bayesian analysis provides "formally strong evidence that life rapidly emerges in Earth-like conditions," though such conditions may themselves be rare.'}
      />

      <ParameterSlider
        bind:value={timeToIntelligentLife}
        min={0.1} max={13} step={0.1}
        unit="bn yr"
        label="How long does it take from primitive life to intelligent life? (On Earth, about 3.5 billion years — from single-celled organisms to primates.)"
        info={'On Earth, the journey from the <a href="https://en.wikipedia.org/wiki/Prokaryote" target="_blank" rel="noopener">first single-celled organisms</a> (~3.8 billion years ago) to <a href="https://en.wikipedia.org/wiki/Evolution_of_human_intelligence" target="_blank" rel="noopener">intelligent primates</a> took roughly <strong>3.5 billion years</strong>. Key milestones: <a href="https://en.wikipedia.org/wiki/Eukaryote" target="_blank" rel="noopener">eukaryotes</a> (~2 bya), <a href="https://en.wikipedia.org/wiki/Multicellular_organism" target="_blank" rel="noopener">multicellular life</a> (~600 mya), the <a href="https://en.wikipedia.org/wiki/Cambrian_explosion" target="_blank" rel="noopener">Cambrian explosion</a> (~540 mya). The prokaryote-to-eukaryote transition alone took over 1 billion years, suggesting it is a highly improbable step. Whether intelligence is an inevitable outcome of evolution or a rare accident remains debated.'}
      />

      <ParameterSlider
        bind:value={timeToCivilization}
        min={0.01} max={5} step={0.01}
        unit="bn yr"
        label="How long does it take intelligent life to develop into a civilization?"
        info={'On Earth, <a href="https://en.wikipedia.org/wiki/Homo_sapiens" target="_blank" rel="noopener"><em>Homo sapiens</em></a> appeared about 300,000 years ago, but <a href="https://en.wikipedia.org/wiki/Civilization" target="_blank" rel="noopener">civilization</a> (agriculture, writing, cities) only emerged about 10,000 years ago. Radio technology — making us detectable from space — was invented just over 100 years ago. The transition from intelligence to technological civilization is remarkably brief on cosmic timescales (~0.0003 billion years on Earth).'}
      />

      <ParameterSlider
        bind:value={timeToDetectable}
        min={100} max={1_000_000} step={1}
        unit="years"
        label="How long does it take a civilization to develop detectable signals (radio, laser, etc.)? Humans have had radio for about 100 years, but civilization existed for ~10,000 years before that."
        logScale={true}
        info={'After a civilization forms, it may take thousands of years before it develops technology that produces detectable signals. On Earth, <a href="https://en.wikipedia.org/wiki/Civilization" target="_blank" rel="noopener">civilization</a> began roughly 10,000 years ago with agriculture and cities, but <a href="https://en.wikipedia.org/wiki/Radio" target="_blank" rel="noopener">radio technology</a> was only invented about 100 years ago. This means Earth was "dark" for 99% of its civilized history. This parameter determines what fraction of a civilization\'s lifetime it spends broadcasting detectable <a href="https://en.wikipedia.org/wiki/Technosignature" target="_blank" rel="noopener">technosignatures</a>, and how far its signals have traveled. If the time to become detectable exceeds the average civilization survival time, no civilization lives long enough to broadcast.'}
      />

      <ParameterSlider
        bind:value={ratioCommunication}
        min={1} max={100} step={1}
        unit="%"
        label="What fraction of civilizations develop detectable technology (radio, laser, etc.)? Not all civilizations necessarily broadcast signals into space."
        info={'This parameter relates to <a href="https://en.wikipedia.org/wiki/Technosignature" target="_blank" rel="noopener">technosignatures</a> — detectable signs of technology. Earth has been emitting radio waves for about a century, creating an expanding <a href="https://en.wikipedia.org/wiki/Radio_wave" target="_blank" rel="noopener">radio bubble</a> roughly 200 light-years in diameter. However, civilizations might choose not to broadcast (the "<a href="https://en.wikipedia.org/wiki/Dark_forest_hypothesis" target="_blank" rel="noopener">dark forest</a>" hypothesis), or might use technologies we can\'t detect. <a href="https://en.wikipedia.org/wiki/Search_for_extraterrestrial_intelligence" target="_blank" rel="noopener">SETI</a> searches for such signals.'}
      />

      <ParameterSlider
        bind:value={civilizationSurvival}
        min={100} max={10_000_000_000} step={1}
        unit="years"
        label="How many years do civilizations survive on average?"
        logScale={true}
        info={'This is one of the most uncertain parameters in estimating galactic civilizations. Estimates range from a few hundred years (if technological civilizations tend to self-destruct through nuclear war, climate change, or AI) to millions or billions of years (if some manage to achieve long-term stability). See <a href="https://en.wikipedia.org/wiki/Global_catastrophic_risk" target="_blank" rel="noopener">global catastrophic risk</a> and the <a href="https://en.wikipedia.org/wiki/Fermi_paradox" target="_blank" rel="noopener">Fermi paradox</a> for more context.'}
      />

      <CivilizationAgeCurve
        meanSurvival={civilizationSurvival}
        bind:model={survivalModel}
        effectiveMean={effectiveMeanLifetime}
      />

      {#if timeWarning}
        <div class="warning">
          Warning: The time required for life to develop ({totalTimeRequired.toFixed(1)} bn yr)
          exceeds the age of third-generation star systems ({ageThirdGen} bn yr).
          This means no civilization has had enough time to evolve.
        </div>
      {/if}

      {#if !timeWarning && timeToDetectable >= effectiveMeanLifetime && effectiveMeanLifetime > 0}
        <div class="warning">
          Warning: Time to develop detectable signals ({formatNumber(timeToDetectable)} years)
          exceeds average civilization survival ({formatNumber(effectiveMeanLifetime)} years).
          No civilization survives long enough to broadcast.
        </div>
      {/if}
    </section>

    <!-- Results -->
    <section class="card results-card">
      <h2>Results</h2>
      <p class="section-subtitle">Estimate based on {distributionStats.modelLabel} survival model</p>

      <div class="results-grid">
        <div class="result-row">
          <span class="result-label">Time window during which life could have emerged</span>
          <span class="result-value">{timeWindowForLife.toFixed(1)} billion years</span>
        </div>

        <div class="result-row">
          <span class="result-label">Planets with life</span>
          <span class="result-value">{formatNumber(planetsWithLife)}</span>
        </div>

        <div class="result-row">
          <span class="result-label">Planets with intelligent life</span>
          <span class="result-value">{formatNumber(planetsWithIntelligentLife)}</span>
        </div>

        <div class="result-row">
          <span class="result-label">Civilizations that have ever developed</span>
          <span class="result-value">{formatNumber(totalCivilizations)}</span>
        </div>

        <div class="result-row">
          <span class="result-label">Time span during which civilizations could evolve</span>
          <span class="result-value">{formatNumber(civilizationTimeSpan)} years</span>
        </div>

        <div class="result-row">
          <span class="result-label">A new civilization emerges on average</span>
          <span class="result-value">
            {#if isFinite(newCivilizationFrequency) && newCivilizationFrequency > 0}
              every {formatNumber(newCivilizationFrequency)} years
            {:else}
              -
            {/if}
          </span>
        </div>

        {#if survivalModel === 'lognormal'}
          <div class="result-row">
            <span class="result-label">Effective mean survival time</span>
            <span class="result-value">
              {formatNumber(effectiveMeanLifetime)} years
              <span class="result-note">(median: {formatNumber(civilizationSurvival)} yr)</span>
            </span>
          </div>
        {/if}

        <div class="result-divider"></div>

        <div class="result-row highlight" bind:this={resultsEl}>
          <span class="result-label">Civilizations in the Milky Way right now</span>
          <span class="result-value-stack">
            <span class="result-value big">{formatNumber(currentCivilizations, 1)}</span>
            {#if currentCivilizations > 0}
              <span class="result-ci">90% range: {formatRange(ci90.lower, ci90.upper)}</span>
            {/if}
          </span>
        </div>

        {#if currentCivilizations > 0 && currentCivilizations < 200}
          <ResultDistribution
            expectedCount={currentCivilizations}
            {ci90}
            {ci50}
            model={survivalModel}
          />
        {/if}

        <div class="result-row highlight-secondary">
          <span class="result-label">Of which detectable (communicating)</span>
          <span class="result-value-stack">
            <span class="result-value">{formatNumber(detectableCivilizations)}</span>
            {#if detectableCivilizations > 0}
              <span class="result-ci">{formatRange(detectableCI90.lower, detectableCI90.upper)}</span>
            {/if}
          </span>
        </div>

        {#if avgDistance !== null}
          <div class="result-row">
            <span class="result-label">Average distance between civilizations</span>
            <span class="result-value-stack">
              <span class="result-value">{formatNumber(avgDistance)} light-years</span>
              {#if distanceRange}
                <span class="result-ci">{formatRange(distanceRange.near, distanceRange.far)} ly</span>
              {/if}
            </span>
          </div>
        {/if}

        {#if detectionOdds > 0 && detectableCivilizations >= 2}
          <div class="detection-odds">
            <span class="detection-headline">
              Chance that any two civilizations have detected each other:
              <strong class="detection-pct">
                {#if detectionOdds > 0.999}
                  ~100%
                {:else if detectionOdds < 0.0001}
                  &lt; 0.01%
                {:else if detectionOdds < 0.01}
                  {(detectionOdds * 100).toFixed(2)}%
                {:else if detectionOdds < 0.1}
                  {(detectionOdds * 100).toFixed(1)}%
                {:else}
                  {(detectionOdds * 100).toFixed(0)}%
                {/if}
              </strong>
            </span>
            <span class="detection-detail">
              Each civilization's signals reach ~{formatNumber(detectionRange)} light-years during its lifetime.
            </span>
          </div>
        {/if}

        {#if detectableCivilizations > 0}
          <div class="earth-check">
            <span class="earth-check-title">Earth sanity check</span>
            <span class="earth-check-subtitle">
              Earthlings have been broadcasting and listening for ~{EARTH_LISTENING_YEARS} years.
              We have detected 0 alien signals. With the parameters you have selected, the numbers are:
            </span>
            <div class="earth-check-stats">
              <div class="earth-stat">
                <span class="earth-stat-value">{formatNumber(expectedSignalsAtEarth)}</span>
                <span class="earth-stat-label">signals expected to reach Earth</span>
              </div>
              <div class="earth-stat">
                <span class="earth-stat-value">{formatNumber(expectedHaveHeardEarth)}</span>
                <span class="earth-stat-label">civilizations have heard Earth</span>
              </div>
            </div>
            <span class="earth-check-verdict">
              {#if expectedSignalsAtEarth > 1}
                Your parameters predict ~{formatNumber(expectedSignalsAtEarth)} signals should have reached Earth in the time we have been listening — yet we have heard nothing. This is the <a href="https://en.wikipedia.org/wiki/Fermi_paradox" target="_blank" rel="noopener">Fermi paradox</a>.
                One sobering resolution: if civilizations only broadcast once they are technologically advanced, the silence may mean they don't last long after that point. Your parameters give each civilization ~{formatNumber(detectionRange)} years of broadcasting — if the true number is much smaller, the galaxy goes quiet fast. The uncomfortable implication for Earth: we started broadcasting {EARTH_LISTENING_YEARS} years ago — are we, too, nearing the end?
              {:else if expectedSignalsAtEarth >= 0.01}
                There's a {(expectedSignalsAtEarth * 100).toFixed(1)}% chance Earth should have detected a signal by now — our silence is plausible but worth noting.
              {:else}
                Detecting 0 signals is expected — Earth's {EARTH_LISTENING_YEARS}-year listening window is a cosmic blink.
              {/if}
            </span>
          </div>
        {/if}

        {#if currentCivilizations < 1 && !timeWarning}
          <div class="lonely-message">
            {#if pZero > 0.5}
              With your parameters, there is a {(pZero * 100).toFixed(0)}% chance of zero
              simultaneous civilizations — we are most likely alone.
            {:else}
              With your parameters, there are likely no simultaneous civilizations in the Milky Way
              — we are probably alone.
            {/if}
          </div>
        {/if}

        {#if isExactlyOne}
          <div class="easter-egg">
            <div class="easter-egg-title">Congratulations, you've discovered that there is a God!</div>
            <p class="easter-egg-sub">
              You've fine-tuned the parameters of the universe to produce exactly one civilization.
              Clearly, this was by design.
            </p>
            <button class="tshirt-btn" onclick={openTshirtDesign}>
              Order the T-Shirt
            </button>
          </div>
        {:else if currentCivilizations >= 1 && currentCivilizations < 2}
          <div class="lonely-message hopeful">
            With your parameters, there may be only one civilization in the Milky Way — possibly us.
            There is still a {((1 - probZero(currentCivilizations) - currentCivilizations * Math.exp(-currentCivilizations)) * 100).toFixed(0)}% chance of 2 or more.
          </div>
        {/if}

        <!-- Model insight -->
        {#if currentCivilizations > 0}
          <div class="model-insight">
            {modelInsight}
          </div>
        {/if}
      </div>
    </section>

    <!-- Milky Way Visualization -->
    <MilkyWayGalaxy
      currentCivilizations={currentCivilizations}
      numberOfStars={numberOfStars}
    />
  </main>

  <footer>
    <button class="reset-btn" onclick={reset}>Reset to defaults</button>
    <p class="footer-note">
      See also: the <a href="https://en.wikipedia.org/wiki/Drake_equation" target="_blank" rel="noopener">Drake equation</a> (1961).
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
    margin-bottom: 0.25rem;
    text-shadow: 0 0 30px rgba(74, 158, 255, 0.4);
  }

  .subtitle {
    font-size: 1rem;
    color: var(--text-muted);
    font-style: italic;
    margin-bottom: 1rem;
  }

  .intro {
    font-size: 0.95rem;
    color: var(--text);
    max-width: 600px;
    margin: 0 auto;
    line-height: 1.6;
  }

  /* Hero civilization display */
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

  .hero-label {
    font-size: 0.95rem;
    color: var(--text);
    margin-bottom: 0.4rem;
  }

  .hero-value {
    font-size: 3rem;
    font-weight: 700;
    color: var(--gold);
    text-shadow: 0 0 25px rgba(255, 215, 0, 0.35);
    line-height: 1.1;
  }

  .hero-range {
    font-size: 0.82rem;
    color: var(--text-muted);
    margin-top: 0.35rem;
  }

  /* Floating header */
  .floating-header {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 100;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    padding: 0.6rem 1rem;
    background: rgba(10, 10, 26, 0.92);
    border-bottom: 1px solid rgba(255, 215, 0, 0.15);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    transform: translateY(-100%);
    opacity: 0;
    transition: transform 0.35s cubic-bezier(0.4, 0, 0.2, 1),
                opacity 0.35s cubic-bezier(0.4, 0, 0.2, 1);
    pointer-events: none;
  }

  .floating-header.visible {
    transform: translateY(0);
    opacity: 1;
    pointer-events: auto;
  }

  .floating-label {
    font-size: 0.85rem;
    color: var(--text-muted);
  }

  .floating-value {
    font-size: 1.2rem;
    font-weight: 700;
    color: var(--gold);
    text-shadow: 0 0 10px rgba(255, 215, 0, 0.3);
  }

  .floating-range {
    font-size: 0.75rem;
    font-weight: 400;
    color: var(--text-muted);
    margin-left: 0.25rem;
  }

  .card {
    background: var(--card-bg);
    border: 1px solid var(--card-border);
    border-radius: 12px;
    padding: 1.5rem;
    margin-bottom: 1.5rem;
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
  }

  h2 {
    font-size: 1.4rem;
    color: var(--heading);
    margin-bottom: 0.15rem;
  }

  .section-subtitle {
    font-size: 0.85rem;
    color: var(--text-muted);
    font-style: italic;
    margin-bottom: 1.25rem;
  }

  .section-result {
    margin-top: 0.75rem;
    padding: 0.75rem 1rem;
    background: rgba(74, 158, 255, 0.08);
    border-left: 3px solid var(--accent);
    border-radius: 0 6px 6px 0;
    font-size: 0.95rem;
  }

  .section-result strong {
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

  /* Results */
  .results-card {
    border-color: rgba(74, 158, 255, 0.2);
  }

  .results-grid {
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
  }

  .result-row {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    padding: 0.5rem 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    gap: 1rem;
  }

  .result-label {
    font-size: 0.9rem;
    color: var(--text);
  }

  .result-value {
    font-size: 0.95rem;
    color: #fff;
    font-weight: 500;
    text-align: right;
    flex-shrink: 0;
  }

  .result-divider {
    height: 1px;
    background: linear-gradient(
      to right,
      transparent,
      var(--accent),
      transparent
    );
    margin: 0.5rem 0;
  }

  .highlight {
    padding: 0.75rem;
    background: rgba(255, 215, 0, 0.06);
    border-radius: 8px;
    border: 1px solid rgba(255, 215, 0, 0.15);
  }

  .highlight .result-label {
    color: #fff;
    font-weight: 500;
  }

  .highlight .result-value.big {
    font-size: 1.6rem;
    color: var(--gold);
    font-weight: 700;
    text-shadow: 0 0 15px rgba(255, 215, 0, 0.3);
  }

  .highlight-secondary {
    padding: 0.5rem 0.75rem;
    background: rgba(74, 158, 255, 0.06);
    border-radius: 6px;
  }

  .highlight-secondary .result-value {
    color: var(--accent);
    font-weight: 600;
  }

  .result-value-stack {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    flex-shrink: 0;
  }

  .result-ci {
    font-size: 0.75rem;
    color: var(--text-muted);
    font-weight: 400;
    margin-top: 0.15rem;
  }

  .result-note {
    display: block;
    font-size: 0.75rem;
    color: var(--text-muted);
    font-weight: 400;
  }

  .model-insight {
    margin-top: 0.5rem;
    padding: 0.75rem 1rem;
    background: rgba(74, 158, 255, 0.06);
    border-left: 3px solid rgba(74, 158, 255, 0.3);
    border-radius: 0 6px 6px 0;
    font-size: 0.82rem;
    color: var(--text-muted);
    line-height: 1.55;
    font-style: italic;
  }

  .detection-odds {
    margin-top: 0.5rem;
    padding: 0.75rem 1rem;
    background: rgba(76, 175, 80, 0.06);
    border: 1px solid rgba(76, 175, 80, 0.2);
    border-radius: 8px;
    text-align: center;
    line-height: 1.6;
  }

  .detection-headline {
    display: block;
    font-size: 0.92rem;
    color: var(--text);
  }

  .detection-pct {
    color: #66bb6a;
    font-size: 1.05rem;
  }

  .detection-detail {
    display: block;
    font-size: 0.78rem;
    color: var(--text-muted);
    margin-top: 0.25rem;
    font-style: italic;
  }

  .earth-check {
    margin-top: 0.5rem;
    padding: 0.75rem 1rem;
    background: rgba(255, 152, 0, 0.06);
    border: 1px solid rgba(255, 152, 0, 0.2);
    border-radius: 8px;
    text-align: center;
    line-height: 1.6;
  }

  .earth-check-title {
    display: block;
    font-size: 0.92rem;
    font-weight: 600;
    color: #ffb74d;
    margin-bottom: 0.15rem;
  }

  .earth-check-subtitle {
    display: block;
    font-size: 0.82rem;
    color: var(--text-muted);
    margin-bottom: 0.5rem;
  }

  .earth-check-stats {
    display: flex;
    justify-content: center;
    gap: 2rem;
    margin: 0.5rem 0;
  }

  .earth-stat {
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .earth-stat-value {
    font-size: 1.1rem;
    font-weight: 700;
    color: #ffb74d;
  }

  .earth-stat-label {
    font-size: 0.75rem;
    color: var(--text-muted);
  }

  .earth-check-verdict {
    display: block;
    font-size: 0.8rem;
    color: var(--text-muted);
    font-style: italic;
    margin-top: 0.25rem;
  }

  .earth-check-verdict a {
    color: #ffb74d;
  }

  .lonely-message {
    text-align: center;
    padding: 1rem;
    font-style: italic;
    color: var(--text-muted);
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.03);
    margin-top: 0.5rem;
  }

  .lonely-message.hopeful {
    color: var(--accent);
    background: rgba(74, 158, 255, 0.05);
  }

  .easter-egg {
    text-align: center;
    padding: 1.25rem 1rem;
    border-radius: 10px;
    background: rgba(255, 215, 0, 0.06);
    border: 1px solid rgba(255, 215, 0, 0.25);
    margin-top: 0.5rem;
  }

  .easter-egg-title {
    font-size: 1.1rem;
    font-weight: 700;
    color: var(--gold);
    text-shadow: 0 0 12px rgba(255, 215, 0, 0.3);
    margin-bottom: 0.5rem;
  }

  .easter-egg-sub {
    font-size: 0.85rem;
    color: var(--text-muted);
    font-style: italic;
    margin-bottom: 0.75rem;
    line-height: 1.5;
  }

  .tshirt-btn {
    padding: 0.5rem 1.25rem;
    border: 1px solid rgba(255, 215, 0, 0.4);
    border-radius: 8px;
    background: rgba(255, 215, 0, 0.1);
    color: var(--gold);
    font-size: 0.9rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }

  .tshirt-btn:hover {
    background: rgba(255, 215, 0, 0.2);
    border-color: var(--gold);
    box-shadow: 0 0 15px rgba(255, 215, 0, 0.15);
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
    max-width: 500px;
    margin-left: auto;
    margin-right: auto;
  }

  @media (max-width: 600px) {
    .app {
      padding: 0.75rem;
    }

    h1 {
      font-size: 1.8rem;
    }

    .card {
      padding: 1rem;
    }

    h2 {
      font-size: 1.2rem;
    }

    .result-row {
      flex-direction: column;
      gap: 0.2rem;
    }

    .result-value {
      text-align: left;
    }

    .result-value-stack {
      align-items: flex-start;
    }

    .highlight .result-value.big {
      font-size: 1.3rem;
    }

    .hero-value {
      font-size: 2.2rem;
    }

    .floating-label {
      font-size: 0.75rem;
    }

    .floating-value {
      font-size: 1rem;
    }
  }
</style>
