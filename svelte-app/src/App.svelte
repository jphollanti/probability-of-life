<script>
  import ParameterSlider from './lib/ParameterSlider.svelte';
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
    <h1>Elämän todennäköisyys</h1>
    <p class="subtitle">Probability of Life in the Milky Way</p>
    <p class="intro">
      Kuinka monta sivilisaatiota Linnunradassa on tällä hetkellä? Tämä laskuri
      perustuu <em>Draken yhtälöön</em> ja sen laajennuksiin. Säädä parametreja
      ja katso, miten ne vaikuttavat lopputulokseen.
    </p>

    <div class="hero-civilization" bind:this={heroEl}>
      <span class="hero-label">Sivilisaatioita Linnunradassa tällä hetkellä</span>
      <span class="hero-value">{formatNumber(currentCivilizations, 1)}</span>
    </div>
  </header>

  <div class="floating-header" class:visible={showFloatingHeader}>
    <span class="floating-label">Sivilisaatioita nyt</span>
    <span class="floating-value">{formatNumber(currentCivilizations, 1)}</span>
  </div>

  <main>
    <!-- Section 1: Stars and Planets -->
    <section class="card">
      <h2>Tähtikunnat, planeetat ja kuut</h2>
      <p class="section-subtitle">Stars, planets and moons</p>

      <ParameterSlider
        bind:value={numberOfStars}
        min={1} max={1000} step={1}
        unit="miljardia"
        label="Linnunradalla arvioidaan olevan 100–400 miljardia tähteä. Mikä on sinun arviosi?"
      />

      <ParameterSlider
        bind:value={ratioWithPlanets}
        min={1} max={100} step={1}
        unit="%"
        label="Monellako tähtikunnalla on planeettoja keskimäärin?"
      />

      <ParameterSlider
        bind:value={planetsPerStar}
        min={1} max={20} step={1}
        unit="kpl"
        label="Montako planeettaa ja planeetan kaltaista kuuta on keskimäärin tähdellä, jolla planeettoja ylipäätään on? (Aurinkokunnassa on 8 planeettaa. Jupiterilla ja Saturnuksella on muutamia planeetan tapaisia kuita.)"
      />

      <ParameterSlider
        bind:value={ratioThirdGen}
        min={1} max={100} step={1}
        unit="%"
        label="Montako prosenttia kaikista tähtikunnista on kolmannen sukupolven tähtikuntia? Aurinkokunta on kolmannen sukupolven tähtikunta, ja sitä pidetään elämän edellytyksenä."
      />

      <div class="section-result">
        Linnunradallasi on <strong>{formatNumber(planetsInGalaxy)}</strong> planeettaa kolmannen sukupolven tähtikunnissa.
      </div>
    </section>

    <!-- Section 2: Life-supporting Conditions -->
    <section class="card">
      <h2>Elämää ylläpitävät olosuhteet</h2>
      <p class="section-subtitle">Life-supporting conditions</p>

      <ParameterSlider
        bind:value={ratioHabitableZone}
        min={1} max={100} step={1}
        unit="%"
        label="Elämälle sopiva vyöhyke on optimaalinen etäisyys keskustähdestä, missä ei ole liian kuumaa tai kylmää. Aurinkokunnassa tällaiselle vyöhykkeelle kuuluvat Maa ja Mars. Moniko planeetta kuuluu keskimäärin tällaiselle vyöhykkeelle?"
      />

      <ParameterSlider
        bind:value={ratioWithWater}
        min={1} max={100} step={1}
        unit="%"
        label="Tuntemamme elämän edellytys on vesi. Monellako elinkelpoisella planeetalla on riittävästi vettä elämän ylläpitämiseksi?"
      />

      <ParameterSlider
        bind:value={ratioGuardianPlanet}
        min={1} max={100} step={1}
        unit="%"
        label="Jupiterin kaltainen suuri planeetta imuroi meteoriitteja ja suojelee sisempiä planeettoja. Monellako tähtijärjestelmällä on tällainen suojelijaplaneetta?"
      />

      <ParameterSlider
        bind:value={ratioIronCore}
        min={1} max={100} step={1}
        unit="%"
        label="Metalliydin ja sen aiheuttama magneettikenttä suojaa avaruuden säteilyltä. Monellako planeetalla on metalliydin? (Raskaat metallit ovat yleisiä kolmannen sukupolven tähtikunnissa.)"
      />

      <ParameterSlider
        bind:value={ratioSufficientMass}
        min={1} max={100} step={1}
        unit="%"
        label="Riittävä painovoima on edellytys kaasukehän säilymiselle. Monellako planeetalla on riittävästi massaa ylläpitää kaasukehä?"
      />

      <ParameterSlider
        bind:value={ratioChemicalPrerequisites}
        min={1} max={100} step={1}
        unit="%"
        label="Onko olemassa kemiallinen edellytys, kuten tietty seos ('alkuliemi'), jotta elämä voi saada alkunsa? Arvioi, monellako muuten elinkelpoisella planeetalla tällainen edellytys täyttyy."
      />

      <ParameterSlider
        bind:value={ratioLifeBegins}
        min={1} max={100} step={1}
        unit="%"
        label="Vaikka kaikki edellytykset olisivat kohdallaan, millä todennäköisyydellä elämä todella käynnistyy? Tämä kuvaa siirtymää kemiasta biologiaan — kuinka harvinainen tapahtuma se on?"
      />

      <div class="section-result">
        Linnunradallasi on <strong>{formatNumber(planetsCapableOfLife)}</strong> planeettaa, joilla elämä voi syntyä.
      </div>
    </section>

    <!-- Section 3: Time, Intelligence and Civilizations -->
    <section class="card">
      <h2>Aika, älyllinen elämä ja sivilisaatiot</h2>
      <p class="section-subtitle">Time, intelligent life and civilizations</p>

      <ParameterSlider
        bind:value={ageThirdGen}
        min={0.5} max={13} step={0.1}
        unit="mrd v"
        label="Kuinka vanhoja kolmannen sukupolven tähtikunnat ovat enintään? (Linnunrata on noin 13 miljardia vuotta vanha.)"
      />

      <ParameterSlider
        bind:value={timeForLifeToAppear}
        min={0.1} max={13} step={0.1}
        unit="mrd v"
        label="Kuinka kauan kestää elämän ilmaantuminen planeetan synnystä? (Maassa muutamia miljardeja vuosia.)"
      />

      <ParameterSlider
        bind:value={timeToIntelligentLife}
        min={0.1} max={13} step={0.1}
        unit="mrd v"
        label="Kuinka kauan alkeellisesta elämästä menee älykkään elämän syntyyn? (Maassa yksisoluisista kädellisiin.)"
      />

      <ParameterSlider
        bind:value={timeToCivilization}
        min={0.01} max={5} step={0.01}
        unit="mrd v"
        label="Kuinka kauan älyllisellä elämällä menee kehittyä sivilisaatioksi?"
      />

      <ParameterSlider
        bind:value={ratioCommunication}
        min={1} max={100} step={1}
        unit="%"
        label="Moniko sivilisaatio kehittää havaittavaa teknologiaa (radio, laser, jne.)? Kaikki sivilisaatiot eivät välttämättä lähetä signaaleja avaruuteen."
      />

      <ParameterSlider
        bind:value={civilizationSurvival}
        min={100} max={10_000_000_000} step={1}
        unit="vuotta"
        label="Kuinka monta vuotta sivilisaatiot selviytyvät keskimäärin?"
        logScale={true}
      />

      {#if timeWarning}
        <div class="warning">
          Varoitus: Elämän kehitykseen tarvittava aika ({totalTimeRequired.toFixed(1)} mrd v)
          ylittää kolmannen sukupolven tähtikuntien iän ({ageThirdGen} mrd v).
          Tämä tarkoittaa, ettei yksikään sivilisaatio ole ehtinyt kehittyä.
        </div>
      {/if}
    </section>

    <!-- Results -->
    <section class="card results-card">
      <h2>Tulokset</h2>
      <p class="section-subtitle">Results</p>

      <div class="results-grid">
        <div class="result-row">
          <span class="result-label">Aikaikkuna, jolloin elämää on voinut syntyä</span>
          <span class="result-value">{timeWindowForLife.toFixed(1)} miljardia vuotta</span>
        </div>

        <div class="result-row">
          <span class="result-label">Planeettoja, joilla on elämää</span>
          <span class="result-value">{formatNumber(planetsWithLife)}</span>
        </div>

        <div class="result-row">
          <span class="result-label">Planeettoja, joilla on älykästä elämää</span>
          <span class="result-value">{formatNumber(planetsWithIntelligentLife)}</span>
        </div>

        <div class="result-row">
          <span class="result-label">Sivilisaatioita, jotka ovat koskaan kehittyneet</span>
          <span class="result-value">{formatNumber(totalCivilizations)}</span>
        </div>

        <div class="result-row">
          <span class="result-label">Aika, jolloin sivilisaatioita on ehtinyt kehittyä</span>
          <span class="result-value">{formatNumber(civilizationTimeSpan)} vuotta</span>
        </div>

        <div class="result-row">
          <span class="result-label">Uusi sivilisaatio kehittyy keskimäärin</span>
          <span class="result-value">
            {#if isFinite(newCivilizationFrequency) && newCivilizationFrequency > 0}
              joka {formatNumber(newCivilizationFrequency)}:s vuosi
            {:else}
              -
            {/if}
          </span>
        </div>

        <div class="result-divider"></div>

        <div class="result-row highlight" bind:this={resultsEl}>
          <span class="result-label">Sivilisaatioita Linnunradassa tällä hetkellä</span>
          <span class="result-value big">{formatNumber(currentCivilizations, 1)}</span>
        </div>

        <div class="result-row highlight-secondary">
          <span class="result-label">Joista havaittavia (kommunikoivia)</span>
          <span class="result-value">{formatNumber(detectableCivilizations)}</span>
        </div>

        {#if avgDistance !== null}
          <div class="result-row">
            <span class="result-label">Keskimääräinen etäisyys sivilisaatioiden välillä</span>
            <span class="result-value">{formatNumber(avgDistance)} valovuotta</span>
          </div>
        {/if}

        {#if currentCivilizations < 1 && !timeWarning}
          <div class="lonely-message">
            Parametreillasi Linnunradassa ei todennäköisesti ole yhtään samanaikaista sivilisaatiota
            — olemme todennäköisesti yksin.
          </div>
        {/if}

        {#if currentCivilizations >= 1 && currentCivilizations < 2}
          <div class="lonely-message hopeful">
            Parametreillasi Linnunradassa on ehkä vain yksi sivilisaatio — mahdollisesti me.
          </div>
        {/if}
      </div>
    </section>
  </main>

  <footer>
    <button class="reset-btn" onclick={reset}>Palauta oletusarvot</button>
    <p class="footer-note">
      Perustuu Frank Draken vuonna 1961 esittämään yhtälöön, laajennettuna
      lisäparametreilla elämän edellytyksistä.
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
