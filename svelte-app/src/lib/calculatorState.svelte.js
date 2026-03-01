/**
 * Shared reactive calculator state for all UI variants.
 * Uses Svelte 5 class-based reactivity pattern.
 */
import {
  getEffectiveMean,
  getDistributionStats,
  getConfidenceInterval,
  getModelInsight,
  probZero,
  getDetectableFraction,
  getFormationFraction,
  getParameterUncertaintyCI,
} from './survivalMath.js';

export const DEFAULTS = {
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
  civilizationsPerPlanet: 1,
};

export const PRESETS = {
  optimistic: {
    label: 'Optimistic',
    description: 'Life is common, civilizations thrive',
    values: {
      numberOfStars: 400,
      ratioWithPlanets: 95,
      planetsPerStar: 4,
      ratioThirdGen: 85,
      ratioHabitableZone: 40,
      ratioWithWater: 60,
      ratioGuardianPlanet: 50,
      ratioIronCore: 60,
      ratioSufficientMass: 50,
      ratioChemicalPrerequisites: 70,
      ratioLifeBegins: 80,
      ageThirdGen: 10,
      timeForLifeToAppear: 0.5,
      timeToIntelligentLife: 2,
      timeToCivilization: 0.05,
      timeToDetectable: 1_000,
      ratioCommunication: 80,
      civilizationSurvival: 1_000_000,
      survivalModel: 'lognormal',
      civilizationsPerPlanet: 3,
    },
  },
  conservative: {
    label: 'Conservative',
    description: 'Moderate estimates across the board',
    values: {
      numberOfStars: 200,
      ratioWithPlanets: 70,
      planetsPerStar: 2,
      ratioThirdGen: 70,
      ratioHabitableZone: 15,
      ratioWithWater: 20,
      ratioGuardianPlanet: 15,
      ratioIronCore: 35,
      ratioSufficientMass: 25,
      ratioChemicalPrerequisites: 30,
      ratioLifeBegins: 20,
      ageThirdGen: 8,
      timeForLifeToAppear: 1,
      timeToIntelligentLife: 4,
      timeToCivilization: 0.2,
      timeToDetectable: 50_000,
      ratioCommunication: 30,
      civilizationSurvival: 10_000,
      survivalModel: 'gaussian',
      civilizationsPerPlanet: 1,
    },
  },
  rareEarth: {
    label: 'Rare Earth',
    description: 'Complex life is extremely unlikely',
    values: {
      numberOfStars: 100,
      ratioWithPlanets: 50,
      planetsPerStar: 1,
      ratioThirdGen: 60,
      ratioHabitableZone: 5,
      ratioWithWater: 10,
      ratioGuardianPlanet: 10,
      ratioIronCore: 20,
      ratioSufficientMass: 15,
      ratioChemicalPrerequisites: 5,
      ratioLifeBegins: 5,
      ageThirdGen: 6,
      timeForLifeToAppear: 2,
      timeToIntelligentLife: 5,
      timeToCivilization: 0.5,
      timeToDetectable: 100_000,
      ratioCommunication: 20,
      civilizationSurvival: 1_000,
      survivalModel: 'exponential',
      civilizationsPerPlanet: 1,
    },
  },
  drake: {
    label: "Drake's Original",
    description: "Frank Drake's 1961 estimates",
    values: {
      numberOfStars: 200,
      ratioWithPlanets: 50,
      planetsPerStar: 2,
      ratioThirdGen: 100,
      ratioHabitableZone: 100,
      ratioWithWater: 100,
      ratioGuardianPlanet: 100,
      ratioIronCore: 100,
      ratioSufficientMass: 100,
      ratioChemicalPrerequisites: 100,
      ratioLifeBegins: 100,
      ageThirdGen: 10,
      timeForLifeToAppear: 1,
      timeToIntelligentLife: 3.5,
      timeToCivilization: 0.01,
      timeToDetectable: 10_000,
      ratioCommunication: 10,
      civilizationSurvival: 10_000,
      survivalModel: 'gaussian',
      civilizationsPerPlanet: 1,
    },
  },
};

const STORAGE_KEY = 'life-calculator-params';
const NUM_UNCERTAIN_PARAMS = 13;
const MILKY_WAY_VOLUME_LY3 = Math.PI * (33_000 * 33_000 - 13_000 * 13_000) * 1_000;
const EARTH_LISTENING_YEARS = 100;

function loadSaved() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {};
}

export class CalculatorState {
  #saved;

  // === STATE (all parameters) ===
  numberOfStars = $state(0);
  ratioWithPlanets = $state(0);
  planetsPerStar = $state(0);
  ratioThirdGen = $state(0);
  ratioHabitableZone = $state(0);
  ratioWithWater = $state(0);
  ratioGuardianPlanet = $state(0);
  ratioIronCore = $state(0);
  ratioSufficientMass = $state(0);
  ratioChemicalPrerequisites = $state(0);
  ratioLifeBegins = $state(0);
  ageThirdGen = $state(0);
  timeForLifeToAppear = $state(0);
  timeToIntelligentLife = $state(0);
  timeToCivilization = $state(0);
  timeToDetectable = $state(0);
  ratioCommunication = $state(0);
  civilizationSurvival = $state(0);
  survivalModel = $state('gaussian');
  civilizationsPerPlanet = $state(0);

  constructor() {
    this.#saved = loadSaved();
    const init = (key) => this.#saved[key] ?? DEFAULTS[key];

    this.numberOfStars = init('numberOfStars');
    this.ratioWithPlanets = init('ratioWithPlanets');
    this.planetsPerStar = init('planetsPerStar');
    this.ratioThirdGen = init('ratioThirdGen');
    this.ratioHabitableZone = init('ratioHabitableZone');
    this.ratioWithWater = init('ratioWithWater');
    this.ratioGuardianPlanet = init('ratioGuardianPlanet');
    this.ratioIronCore = init('ratioIronCore');
    this.ratioSufficientMass = init('ratioSufficientMass');
    this.ratioChemicalPrerequisites = init('ratioChemicalPrerequisites');
    this.ratioLifeBegins = init('ratioLifeBegins');
    this.ageThirdGen = init('ageThirdGen');
    this.timeForLifeToAppear = init('timeForLifeToAppear');
    this.timeToIntelligentLife = init('timeToIntelligentLife');
    this.timeToCivilization = init('timeToCivilization');
    this.timeToDetectable = init('timeToDetectable');
    this.ratioCommunication = init('ratioCommunication');
    this.civilizationSurvival = init('civilizationSurvival');
    this.survivalModel = init('survivalModel');
    this.civilizationsPerPlanet = init('civilizationsPerPlanet');
  }

  // === DERIVED CALCULATIONS ===

  get planetsInGalaxy() {
    return this.numberOfStars * 1e9 * this.planetsPerStar
      * (this.ratioWithPlanets / 100) * (this.ratioThirdGen / 100);
  }

  get planetsCapableOfLife() {
    return this.planetsInGalaxy
      * (this.ratioHabitableZone / 100)
      * (this.ratioWithWater / 100)
      * (this.ratioGuardianPlanet / 100)
      * (this.ratioIronCore / 100)
      * (this.ratioSufficientMass / 100)
      * (this.ratioChemicalPrerequisites / 100)
      * (this.ratioLifeBegins / 100);
  }

  get totalTimeRequired() {
    return this.timeForLifeToAppear + this.timeToIntelligentLife + this.timeToCivilization;
  }

  get timeWarning() {
    return this.totalTimeRequired >= this.ageThirdGen;
  }

  get timeWindowForLife() {
    return Math.max(0, this.ageThirdGen - this.timeForLifeToAppear);
  }

  get fractionWithLife() {
    return getFormationFraction(this.ageThirdGen, this.timeForLifeToAppear);
  }

  get planetsWithLife() {
    return this.fractionWithLife * this.planetsCapableOfLife;
  }

  get fractionWithIntelligentLife() {
    return getFormationFraction(this.ageThirdGen, this.timeForLifeToAppear + this.timeToIntelligentLife);
  }

  get planetsWithIntelligentLife() {
    return this.fractionWithIntelligentLife * this.planetsCapableOfLife;
  }

  get fractionWithCivilizations() {
    return getFormationFraction(this.ageThirdGen, this.totalTimeRequired);
  }

  get totalCivilizations() {
    return this.fractionWithCivilizations * this.planetsCapableOfLife * this.civilizationsPerPlanet;
  }

  get civilizationTimeSpan() {
    return Math.max(0, this.ageThirdGen - this.totalTimeRequired) * 1e9;
  }

  get newCivilizationFrequency() {
    return this.totalCivilizations > 0 ? this.civilizationTimeSpan / this.totalCivilizations : Infinity;
  }

  get effectiveMeanLifetime() {
    return getEffectiveMean(this.survivalModel, this.civilizationSurvival);
  }

  get distributionStats() {
    return getDistributionStats(this.survivalModel, this.civilizationSurvival);
  }

  get currentCivilizations() {
    return this.newCivilizationFrequency > 0 && isFinite(this.newCivilizationFrequency)
      ? this.effectiveMeanLifetime / this.newCivilizationFrequency
      : 0;
  }

  get ci90() { return getConfidenceInterval(this.currentCivilizations, 0.90); }
  get ci50() { return getConfidenceInterval(this.currentCivilizations, 0.50); }
  get pZero() { return probZero(this.currentCivilizations); }

  get paramUncertaintyCI() {
    return getParameterUncertaintyCI(this.currentCivilizations, NUM_UNCERTAIN_PARAMS, 2.0);
  }

  get detectableFraction() {
    return this.effectiveMeanLifetime > 0
      ? getDetectableFraction(this.survivalModel, this.civilizationSurvival, this.timeToDetectable)
      : 0;
  }

  get detectableCivilizations() {
    return this.currentCivilizations * (this.ratioCommunication / 100) * this.detectableFraction;
  }

  get detectableCI90() {
    return {
      lower: this.ci90.lower * (this.ratioCommunication / 100),
      upper: this.ci90.upper * (this.ratioCommunication / 100),
    };
  }

  get avgDistance() {
    return this.currentCivilizations > 1
      ? Math.cbrt(MILKY_WAY_VOLUME_LY3 / this.currentCivilizations)
      : null;
  }

  get distanceRange() {
    return this.ci90.upper > 1 && this.ci90.lower > 1
      ? {
          near: Math.cbrt(MILKY_WAY_VOLUME_LY3 / this.ci90.upper),
          far: Math.cbrt(MILKY_WAY_VOLUME_LY3 / this.ci90.lower),
        }
      : null;
  }

  get detectionRange() {
    return Math.max(0, this.effectiveMeanLifetime - this.timeToDetectable);
  }

  get pairDetectionProb() {
    return this.detectionRange > 0
      ? Math.min(1, (4 / 3) * Math.PI * Math.pow(this.detectionRange, 3) / MILKY_WAY_VOLUME_LY3)
      : 0;
  }

  get numDetectablePairs() {
    return this.detectableCivilizations >= 2
      ? this.detectableCivilizations * (this.detectableCivilizations - 1) / 2
      : 0;
  }

  get detectionOdds() {
    return this.numDetectablePairs > 0 && this.pairDetectionProb > 0
      ? 1 - Math.exp(this.numDetectablePairs * Math.log(1 - this.pairDetectionProb))
      : 0;
  }

  get earthSphereFraction() {
    return Math.min(1, (4 / 3) * Math.PI * Math.pow(EARTH_LISTENING_YEARS, 3) / MILKY_WAY_VOLUME_LY3);
  }

  get expectedSignalsAtEarth() {
    return this.detectableCivilizations * this.pairDetectionProb;
  }

  get expectedHaveHeardEarth() {
    return this.detectableCivilizations * this.earthSphereFraction;
  }

  get modelInsight() {
    return getModelInsight(this.survivalModel, this.civilizationSurvival, this.currentCivilizations);
  }

  get isExactlyOne() {
    return this.currentCivilizations >= 0.95 && this.currentCivilizations < 1.05;
  }

  // === METHODS ===

  save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        numberOfStars: this.numberOfStars,
        ratioWithPlanets: this.ratioWithPlanets,
        planetsPerStar: this.planetsPerStar,
        ratioThirdGen: this.ratioThirdGen,
        ratioHabitableZone: this.ratioHabitableZone,
        ratioWithWater: this.ratioWithWater,
        ratioGuardianPlanet: this.ratioGuardianPlanet,
        ratioIronCore: this.ratioIronCore,
        ratioSufficientMass: this.ratioSufficientMass,
        ratioChemicalPrerequisites: this.ratioChemicalPrerequisites,
        ratioLifeBegins: this.ratioLifeBegins,
        ageThirdGen: this.ageThirdGen,
        timeForLifeToAppear: this.timeForLifeToAppear,
        timeToIntelligentLife: this.timeToIntelligentLife,
        timeToCivilization: this.timeToCivilization,
        timeToDetectable: this.timeToDetectable,
        ratioCommunication: this.ratioCommunication,
        civilizationSurvival: this.civilizationSurvival,
        survivalModel: this.survivalModel,
        civilizationsPerPlanet: this.civilizationsPerPlanet,
      }));
    } catch {}
  }

  applyPreset(presetKey) {
    const preset = PRESETS[presetKey];
    if (!preset) return;
    const v = preset.values;
    Object.keys(v).forEach(key => { this[key] = v[key]; });
    this.save();
  }

  reset() {
    Object.keys(DEFAULTS).forEach(key => { this[key] = DEFAULTS[key]; });
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
  }
}
