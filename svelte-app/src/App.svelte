<script>
  import ParameterSlider from './lib/ParameterSlider.svelte';
  import CivilizationAgeCurve from './lib/CivilizationAgeCurve.svelte';
  import { formatNumber } from './lib/formatNumber.js';

  // === DEFAULT VALUES ===
  const DEFAULTS = {
    numberOfStars: 250,
    ratioWithPlanets: 50,
    planetsPerStar: 2,
    ratioThirdGen: 15,
    ratioHabitableZone: 15,
    ratioWithWater: 20,
    ratioGuardianPlanet: 50,
    ratioIronCore: 20,
    ratioSufficientMass: 30,
    ratioChemicalPrerequisites: 50,
    ratioLifeBegins: 50,
    ageThirdGen: 6,
    timeForLifeToAppear: 2,
    timeToIntelligentLife: 1,
    timeToCivilization: 0.1,
    ratioCommunication: 50,
    civilizationSurvival: 100_000,
  };

  // === STATE ===
  let numberOfStars = $state(DEFAULTS.numberOfStars);
  let ratioWithPlanets = $state(DEFAULTS.ratioWithPlanets);
  let planetsPerStar = $state(DEFAULTS.planetsPerStar);
  let ratioThirdGen = $state(DEFAULTS.ratioThirdGen);
  let ratioHabitableZone = $state(DEFAULTS.ratioHabitableZone);
  let ratioWithWater = $state(DEFAULTS.ratioWithWater);
  let ratioGuardianPlanet = $state(DEFAULTS.ratioGuardianPlanet);
  let ratioIronCore = $state(DEFAULTS.ratioIronCore);
  let ratioSufficientMass = $state(DEFAULTS.ratioSufficientMass);
  let ratioChemicalPrerequisites = $state(DEFAULTS.ratioChemicalPrerequisites);
  let ratioLifeBegins = $state(DEFAULTS.ratioLifeBegins);
  let ageThirdGen = $state(DEFAULTS.ageThirdGen);
  let timeForLifeToAppear = $state(DEFAULTS.timeForLifeToAppear);
  let timeToIntelligentLife = $state(DEFAULTS.timeToIntelligentLife);
  let timeToCivilization = $state(DEFAULTS.timeToCivilization);
  let ratioCommunication = $state(DEFAULTS.ratioCommunication);
  let civilizationSurvival = $state(DEFAULTS.civilizationSurvival);
  let survivalModel = $state('gaussian');

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

  // Current civilizations alive in the galaxy
  let currentCivilizations = $derived(
    newCivilizationFrequency > 0 && isFinite(newCivilizationFrequency)
      ? civilizationSurvival / newCivilizationFrequency
      : 0
  );

  // Of those, how many have detectable communication?
  let detectableCivilizations = $derived(
    currentCivilizations * (ratioCommunication / 100)
  );

  // Average distance between civilizations (light-years)
  // Milky Way disk: ~100,000 ly diameter, ~1,000 ly thick
  const MILKY_WAY_VOLUME_LY3 = Math.PI * 50_000 * 50_000 * 1_000;
  let avgDistance = $derived(
    currentCivilizations > 1
      ? Math.cbrt(MILKY_WAY_VOLUME_LY3 / currentCivilizations)
      : null
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
    ratioCommunication = DEFAULTS.ratioCommunication;
    civilizationSurvival = DEFAULTS.civilizationSurvival;
  }
</script>

<div class="app">
  <header>
    <h1>Life Calculator</h1>
    <p class="subtitle">Estimating civilizations in the Milky Way</p>
    <p class="intro">
      How many civilizations currently exist in the Milky Way? This calculator
      is based on the <em>Drake Equation</em> and its extensions. Adjust the parameters
      and see how they affect the outcome.
    </p>

    <div class="hero-civilization" bind:this={heroEl}>
      <span class="hero-label">Civilizations in the Milky Way right now</span>
      <span class="hero-value">{formatNumber(currentCivilizations, 1)}</span>
    </div>
  </header>

  <div class="floating-header" class:visible={showFloatingHeader}>
    <span class="floating-label">Civilizations now</span>
    <span class="floating-value">{formatNumber(currentCivilizations, 1)}</span>
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
        info={'The <a href="https://en.wikipedia.org/wiki/Milky_Way" target="_blank" rel="noopener">Milky Way</a> is a barred spiral galaxy with an estimated diameter of 100,000 light-years. Estimates of its total star count range from 100 to 400 billion, with most modern surveys suggesting around 200–400 billion. The number depends on how many faint <a href="https://en.wikipedia.org/wiki/Red_dwarf" target="_blank" rel="noopener">red dwarf</a> stars are included, which make up roughly 70% of all stars.'}
      />

      <ParameterSlider
        bind:value={ratioWithPlanets}
        min={1} max={100} step={1}
        unit="%"
        label="What percentage of stars have planets on average?"
        info={'Data from the <a href="https://en.wikipedia.org/wiki/Kepler_space_telescope" target="_blank" rel="noopener">Kepler space telescope</a> suggests that virtually every star in the galaxy has at least one planet. Studies indicate that <strong>planets are the rule rather than the exception</strong>. Current estimates suggest at least 80–100% of stars host planetary systems. See <a href="https://en.wikipedia.org/wiki/Exoplanet" target="_blank" rel="noopener">Exoplanet</a> for more.'}
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
        info={'Stars are classified into <a href="https://en.wikipedia.org/wiki/Stellar_population" target="_blank" rel="noopener">stellar populations</a>. <strong>Population I</strong> (third-generation) stars are metal-rich, meaning they contain heavy elements forged in earlier generations of supernovae. These heavy elements (carbon, oxygen, iron, silicon) are essential for forming rocky planets and the chemistry of life. Our Sun is a Population I star. Earlier generations lacked sufficient heavy elements for complex chemistry.'}
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
        info={'The <a href="https://en.wikipedia.org/wiki/Circumstellar_habitable_zone" target="_blank" rel="noopener">circumstellar habitable zone</a> (also called the "Goldilocks zone") is the range of orbits around a star where liquid water could exist on a planet\'s surface. The width of this zone depends on the star\'s luminosity and type. For Sun-like stars, it extends roughly from 0.95 to 1.67 AU. Red dwarfs have much narrower habitable zones, while more luminous stars have wider ones.'}
      />

      <ParameterSlider
        bind:value={ratioWithWater}
        min={1} max={100} step={1}
        unit="%"
        label="Water is a prerequisite for life as we know it. What fraction of habitable planets have enough water to sustain life?"
        info={'<a href="https://en.wikipedia.org/wiki/Water" target="_blank" rel="noopener">Water</a> is considered essential because it is an excellent solvent, remains liquid over a wide temperature range, and facilitates complex chemistry. Water is actually quite common in the universe — it has been detected on <a href="https://en.wikipedia.org/wiki/Extraterrestrial_liquid_water" target="_blank" rel="noopener">Mars, Europa, Enceladus</a>, and in many exoplanet atmospheres. The key question is whether enough liquid surface water exists for sustained biochemistry.'}
      />

      <ParameterSlider
        bind:value={ratioGuardianPlanet}
        min={1} max={100} step={1}
        unit="%"
        label="A large planet like Jupiter sweeps up meteorites and protects inner planets. What fraction of star systems have such a guardian planet?"
        info={'The <a href="https://en.wikipedia.org/wiki/Jupiter" target="_blank" rel="noopener">Jupiter</a> shield hypothesis suggests that gas giants protect inner rocky planets by gravitationally deflecting or capturing incoming comets and asteroids, reducing the frequency of catastrophic impacts. While some studies challenge this idea (Jupiter may also <em>redirect</em> objects inward), the presence of a massive outer planet is generally thought to moderate the bombardment rate, giving life more time to evolve. See <a href="https://en.wikipedia.org/wiki/Rare_Earth_hypothesis" target="_blank" rel="noopener">Rare Earth hypothesis</a>.'}
      />

      <ParameterSlider
        bind:value={ratioIronCore}
        min={1} max={100} step={1}
        unit="%"
        label="A metallic core and the magnetic field it generates protect against space radiation. What fraction of planets have a metallic core? (Heavy metals are common in third-generation star systems.)"
        info={'A planet\'s <a href="https://en.wikipedia.org/wiki/Planetary_core" target="_blank" rel="noopener">metallic core</a> generates a <a href="https://en.wikipedia.org/wiki/Magnetosphere" target="_blank" rel="noopener">magnetosphere</a> through the dynamo effect. This magnetic field shields the surface from harmful <a href="https://en.wikipedia.org/wiki/Solar_wind" target="_blank" rel="noopener">solar wind</a> and <a href="https://en.wikipedia.org/wiki/Cosmic_ray" target="_blank" rel="noopener">cosmic radiation</a>, and prevents the atmosphere from being stripped away. Mars, for example, lost most of its atmosphere after its core cooled and its magnetic field collapsed. Earth\'s iron-nickel core remains active, maintaining our protective magnetosphere.'}
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
        info={'The <a href="https://en.wikipedia.org/wiki/Primordial_soup" target="_blank" rel="noopener">primordial soup</a> hypothesis proposes that life arose from a mixture of organic molecules in early Earth\'s oceans, energized by lightning, UV radiation, or hydrothermal vents. The famous <a href="https://en.wikipedia.org/wiki/Miller%E2%80%93Urey_experiment" target="_blank" rel="noopener">Miller–Urey experiment</a> (1952) demonstrated that amino acids can form spontaneously under early Earth-like conditions. Other theories include the <a href="https://en.wikipedia.org/wiki/RNA_world" target="_blank" rel="noopener">RNA world hypothesis</a> and <a href="https://en.wikipedia.org/wiki/Hydrothermal_vent#Origin_of_life" target="_blank" rel="noopener">deep-sea hydrothermal vent</a> origins.'}
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
        info={'The <a href="https://en.wikipedia.org/wiki/Age_of_the_universe" target="_blank" rel="noopener">universe is about 13.8 billion years old</a>. Third-generation (Population I) stars like our Sun began forming roughly 8–10 billion years ago, after earlier stellar generations had enriched the interstellar medium with heavy elements through <a href="https://en.wikipedia.org/wiki/Supernova" target="_blank" rel="noopener">supernovae</a>. Our Sun itself is about <a href="https://en.wikipedia.org/wiki/Sun" target="_blank" rel="noopener">4.6 billion years old</a>, meaning some third-generation systems could be billions of years older than ours.'}
      />

      <ParameterSlider
        bind:value={timeForLifeToAppear}
        min={0.1} max={13} step={0.1}
        unit="bn yr"
        label="How long does it take for life to appear after a planet forms? (On Earth, a few billion years.)"
        info={'On Earth, the <a href="https://en.wikipedia.org/wiki/Earliest_known_life_forms" target="_blank" rel="noopener">earliest evidence of life</a> dates to about 3.5–4.1 billion years ago, roughly 500 million to 1 billion years after the planet formed. This includes <a href="https://en.wikipedia.org/wiki/Stromatolite" target="_blank" rel="noopener">stromatolites</a> and chemical signatures in ancient rocks. The relatively rapid emergence of life on Earth suggests that abiogenesis may occur fairly quickly once conditions are suitable.'}
      />

      <ParameterSlider
        bind:value={timeToIntelligentLife}
        min={0.1} max={13} step={0.1}
        unit="bn yr"
        label="How long does it take from primitive life to intelligent life? (On Earth, from single-celled organisms to primates.)"
        info={'On Earth, the journey from the <a href="https://en.wikipedia.org/wiki/Prokaryote" target="_blank" rel="noopener">first single-celled organisms</a> (~3.8 billion years ago) to <a href="https://en.wikipedia.org/wiki/Evolution_of_human_intelligence" target="_blank" rel="noopener">intelligent primates</a> took roughly 3.5 billion years. Key milestones include the <a href="https://en.wikipedia.org/wiki/Eukaryote" target="_blank" rel="noopener">evolution of eukaryotes</a> (~2 bya), <a href="https://en.wikipedia.org/wiki/Multicellular_organism" target="_blank" rel="noopener">multicellular life</a> (~600 mya), and the <a href="https://en.wikipedia.org/wiki/Cambrian_explosion" target="_blank" rel="noopener">Cambrian explosion</a> (~540 mya). Whether intelligence is an inevitable outcome of evolution or a rare accident is debated.'}
      />

      <ParameterSlider
        bind:value={timeToCivilization}
        min={0.01} max={5} step={0.01}
        unit="bn yr"
        label="How long does it take intelligent life to develop into a civilization?"
        info={'On Earth, <a href="https://en.wikipedia.org/wiki/Homo_sapiens" target="_blank" rel="noopener"><em>Homo sapiens</em></a> appeared about 300,000 years ago, but <a href="https://en.wikipedia.org/wiki/Civilization" target="_blank" rel="noopener">civilization</a> (agriculture, writing, cities) only emerged about 10,000 years ago. Radio technology — making us detectable from space — was invented just over 100 years ago. The transition from intelligence to technological civilization is remarkably brief on cosmic timescales (~0.0003 billion years on Earth).'}
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
        info={'This is one of the most uncertain parameters in the <a href="https://en.wikipedia.org/wiki/Drake_equation" target="_blank" rel="noopener">Drake equation</a>. Estimates range from a few hundred years (if technological civilizations tend to self-destruct through nuclear war, climate change, or AI) to millions or billions of years (if some manage to achieve long-term stability). Drake himself estimated 10,000 years. See <a href="https://en.wikipedia.org/wiki/Global_catastrophic_risk" target="_blank" rel="noopener">global catastrophic risk</a> and the <a href="https://en.wikipedia.org/wiki/Fermi_paradox" target="_blank" rel="noopener">Fermi paradox</a> for more context.'}
      />

      <CivilizationAgeCurve
        meanSurvival={civilizationSurvival}
        bind:model={survivalModel}
      />

      {#if timeWarning}
        <div class="warning">
          Warning: The time required for life to develop ({totalTimeRequired.toFixed(1)} bn yr)
          exceeds the age of third-generation star systems ({ageThirdGen} bn yr).
          This means no civilization has had enough time to evolve.
        </div>
      {/if}
    </section>

    <!-- Results -->
    <section class="card results-card">
      <h2>Results</h2>
      <p class="section-subtitle">Summary of your Drake equation estimate</p>

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

        <div class="result-divider"></div>

        <div class="result-row highlight" bind:this={resultsEl}>
          <span class="result-label">Civilizations in the Milky Way right now</span>
          <span class="result-value big">{formatNumber(currentCivilizations, 1)}</span>
        </div>

        <div class="result-row highlight-secondary">
          <span class="result-label">Of which detectable (communicating)</span>
          <span class="result-value">{formatNumber(detectableCivilizations)}</span>
        </div>

        {#if avgDistance !== null}
          <div class="result-row">
            <span class="result-label">Average distance between civilizations</span>
            <span class="result-value">{formatNumber(avgDistance)} light-years</span>
          </div>
        {/if}

        {#if currentCivilizations < 1 && !timeWarning}
          <div class="lonely-message">
            With your parameters, there are likely no simultaneous civilizations in the Milky Way
            — we are probably alone.
          </div>
        {/if}

        {#if currentCivilizations >= 1 && currentCivilizations < 2}
          <div class="lonely-message hopeful">
            With your parameters, there may be only one civilization in the Milky Way — possibly us.
          </div>
        {/if}
      </div>
    </section>
  </main>

  <footer>
    <button class="reset-btn" onclick={reset}>Reset to defaults</button>
    <p class="footer-note">
      Based on the equation proposed by Frank Drake in 1961, extended with
      additional parameters for the prerequisites of life.
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
