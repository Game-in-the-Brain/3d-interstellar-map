import { v4 as uuidv4 } from 'uuid';
import type {
  StarSystem, Star, MainWorld, Inhabitants, PlanetaryBody,
  StellarClass, StellarGrade, Zone, BodyType, GasWorldClass, LesserEarthType, ZoneBoundaries,
  WorldType, GeneratorOptions
} from '../types';
import { getGdpPerDayForWorld, getSoc7MonthlyIncome, CE_PRESET, DEFAULT_DEVELOPMENT_WEIGHTS, DEFAULT_POWER_WEIGHTS, DEFAULT_GOV_WEIGHTS, MNEME_WEALTH_WEIGHTS } from './economicPresets';
import { roll5D6, roll2D6, roll3D6, rollExploding, rollKeep, rollD6, rollTL } from './dice';
import {
  getClassFromRoll, getGradeFromRoll, getStellarMass, getStellarLuminosity,
  calculateZoneBoundaries, calculateV2Zones, getCompanionTarget,
  constrainCompanionClass, constrainCompanionGrade, getCompanionOrbitDistance,
  STAR_COLORS
} from './stellarData';
import {
  getLesserEarthType, getDwarfMass, getTerrestrialMass, getHabitatMass,
  getDwarfDensity, getTerrestrialDensity, dwarfGravityToHab, terrestrialGravityToHab,
  getAtmosphere, getTemperatureModifier, getTemperature,
  getHazard, getHazardIntensity, getBiochemicalResources,
  getTechLevel, calculateTotalHabitability,
  getWealth, getPowerStructure, getDevelopment, getSourceOfPower,
  getGovernanceDM, calculateStarport, rollForBase, determineTravelZone,
  generateCultureTraits, POWER_CULTURE_CONFLICTS, getBodyCount, getGasWorldClass, calculateWorldPosition,
  getWorldTypeRoll, getHabitatSize, calculateDepressionPenalty,
  rollComposition,
} from './worldData';
import { calculatePhysicalProperties, recalculatePhysicalProperties } from './physicalProperties';
import { placeBodiesV2 } from './positioning';
import { runHabitabilityWaterfall, selectMainworld } from './habitabilityPipeline';
import { getLifePresetById, BUILT_IN_LIFE_PRESETS } from './lifePresets';
import { generateLevel2Children } from './moons';

// =====================
// Star System Generator
// =====================

export function generateStarSystem(options?: Partial<GeneratorOptions>): StarSystem {
  const opts: GeneratorOptions = {
    starClass:               options?.starClass               ?? 'random',
    starGrade:               options?.starGrade               ?? 'random',
    mainWorldType:           options?.mainWorldType           ?? 'random',
    populated:               options?.populated               ?? true,
    tlProductivityPreset:    options?.tlProductivityPreset    ?? CE_PRESET,
    developmentWeights:      options?.developmentWeights      ?? options?.tlProductivityPreset?.developmentWeights ?? DEFAULT_DEVELOPMENT_WEIGHTS,
    powerWeights:            options?.powerWeights            ?? options?.tlProductivityPreset?.powerWeights ?? DEFAULT_POWER_WEIGHTS,
    govWeights:              options?.govWeights              ?? options?.tlProductivityPreset?.govWeights ?? DEFAULT_GOV_WEIGHTS,
    wealthWeights:           options?.wealthWeights           ?? options?.tlProductivityPreset?.wealthWeights ?? MNEME_WEALTH_WEIGHTS,
  };

  const id = uuidv4();
  const createdAt = Date.now();

  // Generate primary star
  const primaryStar = generatePrimaryStar(opts);

  // Calculate zones based on primary star luminosity
  const zones = calculateZoneBoundaries(primaryStar.luminosity);

  // Generate companion stars
  const companionStars = generateCompanionStars(primaryStar);

  // Generate planetary system FIRST to determine largest body mass (for Habitat sizing)
  const planetaryResult = generatePlanetarySystem(
    primaryStar, zones, opts.v2Positioning ?? true
  );
  const { disks, dwarfs, terrestrials, ices, gases, largestBodyMass } = planetaryResult;

  // Load active life preset (used in both v1 and v2 paths)
  const lifePreset = getLifePresetById(opts.activeLifeAssumptionsId ?? 'mneme-default')
    ?? BUILT_IN_LIFE_PRESETS[0];

  // Run habitability waterfall on EVERY Dwarf and Terrestrial body
  // regardless of v1/v2 path so all worlds have habitability scores (QA-063)
  const allBodiesForHab = [...disks, ...dwarfs, ...terrestrials, ...ices, ...gases];
  for (const body of allBodiesForHab) {
    if (body.type === 'dwarf' || body.type === 'terrestrial') {
      runHabitabilityWaterfall(body, lifePreset);
    }
  }

  // FR-044: Generate Level 2 children (moons + rings) for all L1 parents
  const allMoons: PlanetaryBody[] = [];
  const allRings: PlanetaryBody[] = [];
  const l1Parents = [...terrestrials, ...ices, ...gases];
  for (const parent of l1Parents) {
    const l2 = generateLevel2Children(parent, primaryStar, lifePreset);
    allMoons.push(...l2.moons);
    allRings.push(...l2.rings);
  }

  let mainWorld: MainWorld;
  let inhabitants: Inhabitants;
  let v2SystemFields: Partial<StarSystem> = {};

  if (opts.v2Positioning) {
    // FR-043: v2 pipeline — system-first generation + competitive mainworld selection
    const allBodies = [...disks, ...dwarfs, ...terrestrials, ...ices, ...gases, ...allMoons];

    // Select mainworld by highest Baseline Habitability (L1 + L2 candidates)
    const selection = selectMainworld(allBodies);

    // Build MainWorld from winner
    const winner = allBodies.find(b => b.id === selection.mainworldId);
    if (winner) {
      mainWorld = buildMainWorldFromV2Winner(winner);
    } else {
      // Absolute fallback: generate a v1-style mainworld
      mainWorld = generateMainWorld(primaryStar, zones, opts.mainWorldType, largestBodyMass, opts.allowMegaStructures);
    }

    // Generate inhabitants (TL applied post-selection)
    inhabitants = generateInhabitants(mainWorld, opts);

    // Populate v2 fields on StarSystem
    const v2Zones = calculateV2Zones(primaryStar.luminosity);
    v2SystemFields = {
      heliopauseAU: v2Zones.heliopauseAU,
      frostLineAU: v2Zones.frostLineAU,
      outerSystemZones: v2Zones.outerSystemZones,
      ejectedBodies: planetaryResult.ejectedBodies,
      consumedBodies: planetaryResult.consumedBodies,
      mainworldId: selection.mainworldId,
      mainworldSelectionLog: {
        candidates: selection.candidates,
        tiebreakerApplied: selection.tiebreakerApplied,
        fallbackTriggered: selection.fallbackTriggered,
        fallbackReason: selection.fallbackReason,
      },
    };
  } else {
    // Legacy v1 pipeline: mainworld-first generation
    mainWorld = generateMainWorld(primaryStar, zones, opts.mainWorldType, largestBodyMass, opts.allowMegaStructures);
    inhabitants = generateInhabitants(mainWorld, opts);
  }

  return {
    id,
    createdAt,
    primaryStar,
    companionStars,
    zones,
    mainWorld,
    inhabitants,
    circumstellarDisks: disks,
    dwarfPlanets: dwarfs,
    terrestrialWorlds: terrestrials,
    iceWorlds: ices,
    gasWorlds: gases,
    economicPreset: opts.tlProductivityPreset,
    economicPresetLabel: opts.tlProductivityPreset?.label ?? opts.tlProductivityPreset?.name ?? 'Mneme',
    economicPresetSnapshot: opts.tlProductivityPreset ? { ...opts.tlProductivityPreset } : undefined,
    allowShipsAtXPort: opts.allowShipsAtXPort,
    moons: allMoons,
    rings: allRings,
    ...v2SystemFields,
  };
}

// =====================
// Star Generation
// =====================

function generatePrimaryStar(opts: GeneratorOptions): Star {
  const stellarClass: StellarClass = opts.starClass === 'random'
    ? getClassFromRoll(roll5D6().value)
    : (opts.starClass as StellarClass);

  const grade: StellarGrade = opts.starGrade === 'random'
    ? getGradeFromRoll(roll5D6().value)
    : (opts.starGrade as StellarGrade);

  return createStar(stellarClass, grade, true);
}

function createStar(
  stellarClass: StellarClass,
  grade: StellarGrade,
  isPrimary: boolean,
  orbitDistance?: number,
  orbits?: 'primary' | 'companion'
): Star {
  return {
    id: uuidv4(),
    class: stellarClass,
    grade,
    mass: getStellarMass(stellarClass, grade),
    luminosity: getStellarLuminosity(stellarClass, grade),
    color: STAR_COLORS[stellarClass],
    isPrimary,
    orbitDistance,
    orbits,
  };
}

function generateCompanionStars(primaryStar: Star): Star[] {
  const companions: Star[] = [];
  let previousStar = primaryStar;

  let shouldContinue = true;
  let safetyCounter = 0;

  while (shouldContinue && safetyCounter < 10) {
    safetyCounter++;

    const existenceRoll = roll2D6().value;
    const target = getCompanionTarget(previousStar.class === 'O' ? 7 :
      previousStar.class === 'B' ? 6 :
      previousStar.class === 'A' ? 5 :
      previousStar.class === 'F' ? 4 :
      previousStar.class === 'G' ? 3 :
      previousStar.class === 'K' ? 2 : 1);

    if (existenceRoll >= target) {
      const classRoll = roll5D6().value;
      const gradeRoll = roll5D6().value;

      let stellarClass = getClassFromRoll(classRoll);
      let grade = getGradeFromRoll(gradeRoll);

      stellarClass = constrainCompanionClass(stellarClass, previousStar.class);
      grade = constrainCompanionGrade(grade, previousStar.grade);

      const orbitRoll = roll3D6().value;
      const orbitDistance = getCompanionOrbitDistance(previousStar.class, orbitRoll);

      const companion = createStar(
        stellarClass,
        grade,
        false,
        orbitDistance,
        previousStar.isPrimary ? 'primary' : 'companion'
      );

      companions.push(companion);
      previousStar = companion;

      shouldContinue = existenceRoll === 12;
    } else {
      shouldContinue = false;
    }
  }

  return companions;
}

// =====================
// Main World Generation
// =====================



// eslint-disable-next-line @typescript-eslint/no-unused-vars
function generateMainWorld(
  primaryStar: Star,
  _zones: ZoneBoundaries,
  forcedType: WorldType | 'random' = 'random',
  _largestBodyMass: number = 1.0,
  allowMegaStructures?: boolean,
): MainWorld {
  let worldType: WorldType;
  // eslint-disable-next-line prefer-const
  let size: number;
  let lesserEarthType: LesserEarthType | undefined;
  let massEM: number;
  let densityGcm3: number;
  // eslint-disable-next-line prefer-const
  let gravity: number;
  let gravityHabitability: number;

  // Constants for physics calculations
  const G = 6.674e-11;       // gravitational constant m³ kg⁻¹ s⁻²
  const EM_TO_KG = 5.972e24; // 1 Earth Mass in kg
  const PI = Math.PI;

  if (forcedType !== 'random') {
    worldType = forcedType;
  } else {
    const { dice, keep } = getWorldTypeRoll(primaryStar.class);
    const typeRoll = rollKeep(dice, 6, keep, 'highest', 0).value;
    if (typeRoll <= 7) {
      worldType = 'Dwarf';
    } else if (typeRoll <= 10) {
      worldType = 'Terrestrial';
    } else {
      worldType = 'Habitat';
    }
  }

  // QA-Mega+: gate Habitat generation
  if (worldType === 'Habitat' && !allowMegaStructures) {
    worldType = 'Terrestrial';
  }

  // Roll mass and density based on world type
  if (worldType === 'Dwarf') {
    massEM = getDwarfMass(roll2D6().value);
    densityGcm3 = getDwarfDensity(roll2D6().value);
    lesserEarthType = getLesserEarthType(roll2D6().value).type;
  } else if (worldType === 'Terrestrial') {
    massEM = getTerrestrialMass(roll2D6().value);
    densityGcm3 = getTerrestrialDensity(roll2D6().value);
  } else {
    // Habitat: use habitat mass table and assume low density (0.1 g/cm³ for artificial structures)
    massEM = getHabitatMass(roll2D6().value) / 5.972e12; // Convert Gt to EM (1 Gt = 1e12 kg, 1 EM = 5.972e24 kg)
    densityGcm3 = 0.1;
  }

  // Calculate physical properties from mass + density (all world types)
  const densityKgM3 = densityGcm3 * 1000;
  const massKg = massEM * EM_TO_KG;
  const volumeM3 = massKg / densityKgM3;
  const radiusM = Math.cbrt((3 * volumeM3) / (4 * PI));
  const radiusKm = radiusM / 1000;
  const diameterKm = 2 * radiusKm;
  const surfaceGravityMs2 = (G * massKg) / (radiusM * radiusM);
  const surfaceGravityG = surfaceGravityMs2 / 9.81;
  const escapeVelocityMs = Math.sqrt(2 * G * massKg / radiusM);
  const escapeVelocityKmS = escapeVelocityMs / 1000;
  
  size = Math.round(diameterKm);
  gravity = Math.round(surfaceGravityG * 1000) / 1000;
  // Store radius and escape velocity for return object
  const radius = radiusKm;
  const escapeVelocity = Math.round(escapeVelocityKmS * 100) / 100; // km/s, 2 decimal places

  // Calculate gravity habitability using threshold functions
  if (worldType === 'Dwarf') {
    gravityHabitability = dwarfGravityToHab(gravity);
  } else if (worldType === 'Terrestrial') {
    gravityHabitability = terrestrialGravityToHab(gravity);
  } else {
    // Habitat: negligible gravity penalty
    gravityHabitability = 0;
  }



  const atmoRoll = roll2D6().value;
  const atmoResult = getAtmosphere(atmoRoll);

  const tempModifier = getTemperatureModifier(atmoResult.type);
  const tempRoll = roll2D6().value + tempModifier;
  const tempResult = getTemperature(tempRoll);

  const hazardRoll = roll2D6().value;
  const hazardResult = getHazard(hazardRoll);

  const intensityRoll = roll2D6().value;
  const intensityResult = getHazardIntensity(intensityRoll);

  const bioRoll = roll2D6().value;
  const bioResult = getBiochemicalResources(bioRoll);

  // Generate Tech Level early so it can affect habitability (QA-009 fix)
  // QA-053: replaced 2D6 with 6D6 keep lowest 4 ÷ 2 for downward-biased TL distribution
  const tlRoll = rollTL();
  const techLevel = getTechLevel(tlRoll);

  // Calculate habitability WITH Tech Level modifier (QA-009 fix)
  const totalHabitability = calculateTotalHabitability(
    gravityHabitability,
    atmoResult.habitability,
    tempResult.habitability,
    hazardResult.habitability,
    intensityResult.habitability,
    bioResult.habitability,
    techLevel  // Now includes TL modifier
  );

  const position = calculateWorldPosition(atmoResult.type, tempResult.type, primaryStar.luminosity);

  // Component breakdown for debugging/analysis
  const tlModifier = Math.max(0, Math.min(9, techLevel - 7));
  const habitabilityComponents = {
    gravity: gravityHabitability,
    atmosphere: atmoResult.habitability,
    temperature: tempResult.habitability,
    hazard: hazardResult.habitability,
    hazardIntensity: intensityResult.habitability,
    biochem: bioResult.habitability,
    techLevel: tlModifier,
  };

  return {
    type: worldType,
    size,
    lesserEarthType,
    // QA-023: Mass + Density physics pipeline
    massEM,
    densityGcm3,
    gravity,
    radius,
    escapeVelocity,
    atmosphere: atmoResult.type,
    atmosphereTL: atmoResult.tl,
    temperature: tempResult.type,
    temperatureTL: tempResult.tl,
    hazard: hazardResult.type,
    hazardIntensity: intensityResult.intensity,
    hazardIntensityTL: intensityResult.tl,
    biochemicalResources: bioResult.level,
    techLevel,  // Store TL in mainWorld for use by inhabitants
    habitability: totalHabitability,
    habitabilityComponents,
    zone: position.zone,
    distanceAU: position.distanceAU,
  };
}

// =====================
// Inhabitant Generation
// =====================

function generateInhabitants(
  mainWorld: MainWorld,
  opts: GeneratorOptions
): Inhabitants {
  if (!opts.populated) {
    return {
      populated: false,
      techLevel: 0,
      population: 0,
      wealth: 'Average',
      powerStructure: 'Anarchy',
      development: 'UnderDeveloped',
      sourceOfPower: 'Kratocracy',
      governance: -9,
      starport: { class: 'X', pss: 0, rawClass: 'X', tlCap: 'X', annualTrade: 0, weeklyBase: 0, weeklyActivity: 0, hasNavalBase: false, hasScoutBase: false, hasPirateBase: false },
      travelZone: 'Green',
      cultureTraits: [],
    };
  }

  // Use Tech Level from MainWorld (QA-009 fix) — TL affects habitability
  const techLevel = mainWorld.techLevel;

  // EnvHab = natural habitability without TL display modifier
  const tlDisplayMod = mainWorld.habitabilityComponents?.techLevel ?? Math.max(0, Math.min(9, techLevel - 7));
  const envHab = mainWorld.habitability - tlDisplayMod;

  // Productivity multiplier = income improvement at this TL vs base TL
  const preset = opts.tlProductivityPreset!;
  const productivityMultiplier = getSoc7MonthlyIncome(techLevel, preset) / getSoc7MonthlyIncome(preset.baseTL, preset);

  let population: number;
  let habitatType: string | undefined;

  if (envHab <= 0) {
    // Hostile world: artificial habitats scaled by productivity
    const habitatRoll = roll2D6().value;
    const habitatResult = getHabitatSize(habitatRoll);
    population = Math.max(10, Math.floor(habitatResult.population * productivityMultiplier));
    habitatType = habitatResult.type;
  } else {
    // Natural world: carrying capacity scaled by productivity and exploding 2d6
    const carryingCapacityRoll = rollExploding(2, 6).value;
    const maxPopulation = Math.pow(10, envHab + 1) * productivityMultiplier * carryingCapacityRoll;
    const popRoll = roll3D6().value;
    population = Math.max(10, Math.floor(popRoll * maxPopulation * 0.05));
  }

  const wealth = getWealth(undefined, mainWorld.biochemicalResources, opts.wealthWeights);

  const powerStructure = getPowerStructure(undefined, opts.powerWeights);

  const devResult = getDevelopment(undefined, opts.developmentWeights);

  const sourceOfPower = getSourceOfPower(undefined, opts.govWeights);

  const governance = getGovernanceDM(devResult.level, wealth);

  const penalty = calculateDepressionPenalty(population, devResult.level);
  const effectiveTL = Math.max(0, techLevel - penalty);

  const weeklyRoll = roll3D6().value;

  const gdpPerDay = getGdpPerDayForWorld(techLevel, devResult.level, wealth, opts.tlProductivityPreset!);

  // QA-034: depression penalty is always applied after starport calculation
  let foundingStarportResult = calculateStarport(population, techLevel, wealth, devResult.level, weeklyRoll, gdpPerDay);
  let starportResult = foundingStarportResult;

  if (effectiveTL !== techLevel) {
    const effectiveGdpPerDay = getGdpPerDayForWorld(effectiveTL, devResult.level, wealth, opts.tlProductivityPreset!);
    starportResult = calculateStarport(population, effectiveTL, wealth, devResult.level, weeklyRoll, effectiveGdpPerDay);
  }

  const starport = {
    class: starportResult.class,
    pss: starportResult.pss,
    rawClass: starportResult.rawClass,
    tlCap: starportResult.tlCap,
    annualTrade: starportResult.annualTrade,
    weeklyBase: starportResult.weeklyBase,
    weeklyActivity: starportResult.weeklyActivity,
    hasNavalBase: rollForBase(starportResult.class, 'naval'),
    hasScoutBase: rollForBase(starportResult.class, 'scout'),
    hasPirateBase: rollForBase(starportResult.class, 'pirate'),
    foundingClass: foundingStarportResult.class,
    foundingPSS: foundingStarportResult.pss,
    foundingRawClass: foundingStarportResult.rawClass,
  };

  const zoneResult = determineTravelZone(mainWorld.hazard, mainWorld.hazardIntensity, effectiveTL);

  const cultureExclude = POWER_CULTURE_CONFLICTS[sourceOfPower] ?? [];
  const cultureTraits = generateCultureTraits(2, cultureExclude);

  return {
    populated: true,
    habitatType,
    techLevel,
    foundingTL: techLevel,
    effectiveTL,
    population,
    wealth,
    powerStructure,
    development: devResult.level,
    sourceOfPower,
    governance,
    starport,
    travelZone: zoneResult.zone,
    travelZoneReason: zoneResult.reason,
    cultureTraits,
  };
}

// =====================
// V2 MainWorld Builder (FR-043)
// =====================

/** Map v2 HazardIntensity to v1 HazardIntensityType. */
function mapHazardIntensity(v2: string | undefined): import('../types').HazardIntensityType {
  switch (v2) {
    case 'Trace': return 'Very Mild';
    case 'Light': return 'Mild';
    case 'Moderate': return 'Serious';
    case 'Heavy': return 'High';
    case 'Extreme': return 'Intense';
    default: return 'Very Mild';
  }
}

/** Map v2 BiochemTier to v1 ResourceLevel. */
function mapBiochemToResource(v2: string | undefined): import('../types').ResourceLevel {
  switch (v2) {
    case 'Scarce': return 'Scarce';
    case 'Rare': return 'Rare';
    case 'Uncommon':
    case 'Poor':
    case 'Deficient':
    case 'Common': return 'Uncommon';
    case 'Abundant':
    case 'Rich':
    case 'Bountiful': return 'Abundant';
    case 'Prolific':
    case 'Inexhaustible': return 'Inexhaustible';
    default: return 'Uncommon';
  }
}

/** Build a v1 MainWorld from a v2 winning PlanetaryBody. */
function buildMainWorldFromV2Winner(body: PlanetaryBody): MainWorld {
  // Roll TL post-selection (v2 spec: TL applies only after mainworld selection)
  const tlRoll = rollTL();
  const techLevel = getTechLevel(tlRoll);
  const tlModifier = Math.max(0, Math.min(9, techLevel - 7));

  const baseline = body.baselineHabitability ?? 0;
  const effectiveHab = baseline + tlModifier;

  const bd = body.habitabilityBreakdown;
  const habitabilityComponents = bd ? {
    gravity: bd.gravity,
    atmosphere: bd.atmosphereComp + bd.atmosphereDensity,
    temperature: bd.temperature,
    hazard: bd.hazard,
    hazardIntensity: bd.hazardIntensity,
    biochem: bd.biochem + bd.biosphere,
    techLevel: tlModifier,
  } : {
    gravity: 0, atmosphere: 0, temperature: 0,
    hazard: 0, hazardIntensity: 0, biochem: 0, techLevel: tlModifier,
  };

  // Derive world type from body type
  const worldType: import('../types').WorldType =
    body.type === 'dwarf' ? 'Dwarf' : 'Terrestrial';

  return {
    type: worldType,
    size: Math.round(body.diameterKm ?? body.radiusKm ? (body.radiusKm! * 2) : 1000),
    lesserEarthType: undefined,
    massEM: body.mass,
    densityGcm3: body.densityGcm3 ?? 0,
    gravity: body.surfaceGravityG ?? 0,
    radius: body.radiusKm ?? 0,
    escapeVelocity: body.escapeVelocityMs ? Math.round((body.escapeVelocityMs / 1000) * 100) / 100 : 0,
    atmosphere: (body.atmosphereDensityV2 ?? 'Trace') as import('../types').AtmosphereType,
    atmosphereTL: 0,
    temperature: (body.temperatureV2 ?? 'Average') as import('../types').TemperatureType,
    temperatureTL: 0,
    hazard: (body.hazardV2 ?? 'None') as import('../types').HazardType,
    hazardIntensity: mapHazardIntensity(body.hazardIntensityV2),
    hazardIntensityTL: 0,
    biochemicalResources: mapBiochemToResource(body.biochem),
    techLevel,
    habitability: effectiveHab,
    habitabilityComponents,
    zone: body.zone,
    distanceAU: (body as PlanetaryBody).parentDistanceAU ?? body.distanceAU,
  };
}

// =====================
// Planetary System Generation
// =====================

// Hill sphere factor — bodies must be separated by at least this multiple of Hill radius
const HILL_FACTOR = 1.5;

// Minimum floor separation regardless of Hill sphere (QA-006)
const MIN_FLOOR_AU_INNER = 0.05;  // Infernal, Hot, Conservative, Cold zones
const MIN_FLOOR_AU_OUTER = 0.15;  // Outer zone

/**
 * Calculate Hill sphere radius in AU for a body.
 * @param a — semi-major axis (AU)
 * @param m — body mass (Earth masses)
 * @param M — star mass (Solar masses)
 */
function hillSphereAU(a: number, m: number, M: number): number {
  // Hill sphere ≈ a * (m / 3M)^(1/3)
  // m is in Earth masses, M is in Solar masses
  // 1 Solar mass = 333,000 Earth masses
  const mSolar = m / 333000; // Convert Earth masses to Solar masses
  const ratio = mSolar / (3 * M);
  if (ratio <= 0) return 0;
  return a * Math.cbrt(ratio);
}

/**
 * Calculate minimum required separation between two bodies.
 */
function minSeparationAU(a1: number, m1: number, a2: number, m2: number, M: number): number {
  const h1 = hillSphereAU(a1, m1, M);
  const h2 = hillSphereAU(a2, m2, M);
  return Math.max(h1, h2) * HILL_FACTOR;
}

/**
 * Apply Hot Jupiter migration: Class III in Infernal, or Class IV/V in Hot,
 * clears that zone of all other non-disk bodies (QA-011).
 */
function applyHotJupiterMigration(
  bodies: PlanetaryBody[]
): { bodies: PlanetaryBody[]; clearedZones: Zone[] } {
  const clearedZones: Zone[] = [];

  // Find hot jupiters: Gas III in Infernal, Gas IV/V in Hot
  const hotJupiters = bodies.filter(b => {
    if (b.type !== 'gas') return false;
    if (b.zone === 'Infernal' && b.gasClass === 'III') return true;
    if (b.zone === 'Hot' && (b.gasClass === 'IV' || b.gasClass === 'V')) return true;
    return false;
  });

  if (hotJupiters.length === 0) return { bodies, clearedZones };

  // Collect zones to clear
  hotJupiters.forEach(hj => {
    if (!clearedZones.includes(hj.zone)) clearedZones.push(hj.zone);
  });

  // Remove all non-disk, non-hot-jupiter bodies from cleared zones
  const filtered = bodies.filter(b => {
    if (b.type === 'disk') return true;
    if (hotJupiters.some(hj => hj.id === b.id)) return true;
    return !clearedZones.includes(b.zone);
  });

  // Roll for one captured rogue per cleared zone (2D6 >= 11)
  for (const zone of clearedZones) {
    const captureRoll = roll2D6().value;
    if (captureRoll >= 11) {
      // Add one small rogue world (0.1-0.5 EM)
      const rogue: PlanetaryBody = {
        id: uuidv4(),
        type: 'dwarf',
        mass: Math.round((0.1 + Math.random() * 0.4) * 10000) / 10000,
        zone,
        distanceAU: 0, // Will be placed by placement algorithm
        lesserEarthType: 'Carbonaceous',
      };
      filtered.push(rogue);
    }
  }

  return { bodies: filtered, clearedZones };
}

/**
 * Resolve spacing conflicts using Hill sphere calculations with minimum floor (QA-006).
 */
function resolveConflicts(
  bodies: PlanetaryBody[],
  starMass: number
): PlanetaryBody[] {
  if (bodies.length === 0) return bodies;
  
  const sorted = [...bodies].sort((a, b) => a.distanceAU - b.distanceAU);
  const resolved: PlanetaryBody[] = [];

  for (const body of sorted) {
    if (resolved.length === 0) {
      resolved.push(body);
      continue;
    }

    // Find the previous body that would create a conflict
    const prev = resolved[resolved.length - 1];
    
    // Calculate minimum required separation
    const isOuter = body.zone === 'Outer' || prev.zone === 'Outer';
    const minFloor = isOuter ? MIN_FLOOR_AU_OUTER : MIN_FLOOR_AU_INNER;
    
    // Hill sphere based separation
    const hillSep = minSeparationAU(
      prev.distanceAU, prev.mass,
      body.distanceAU, body.mass,
      starMass
    );
    
    // Use the larger of Hill separation or floor
    const requiredSep = Math.max(hillSep, minFloor);
    
    const actualSep = body.distanceAU - prev.distanceAU;
    
    if (actualSep < requiredSep) {
      // Push this body outward to meet the separation requirement
      const newAU = Math.round((prev.distanceAU + requiredSep) * 100) / 100;
      resolved.push({ ...body, distanceAU: newAU });
    } else {
      resolved.push(body);
    }
  }

  return resolved;
}

/**
 * Verify spacing and log any violations for debugging.
 */
function verifySpacing(
  bodies: PlanetaryBody[],
  starMass: number
): { violations: number; log: string[] } {
  const sorted = [...bodies].sort((a, b) => a.distanceAU - b.distanceAU);
  const violations: string[] = [];
  let violationCount = 0;

  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i];
    const b = sorted[i + 1];
    const sep = Math.abs(b.distanceAU - a.distanceAU);
    const isOuter = a.zone === 'Outer' || b.zone === 'Outer';
    const minFloor = isOuter ? MIN_FLOOR_AU_OUTER : MIN_FLOOR_AU_INNER;
    const hillSep = minSeparationAU(a.distanceAU, a.mass, b.distanceAU, b.mass, starMass);
    const minSep = Math.max(hillSep, minFloor);
    
    if (sep < minSep - 0.001) { // Small epsilon for floating point
      violationCount++;
      violations.push(
        `HILL VIOLATION: ${a.type} @ ${a.distanceAU.toFixed(2)} AU and ${b.type} @ ${b.distanceAU.toFixed(2)} AU — sep=${sep.toFixed(4)}, min=${minSep.toFixed(4)} (Hill=${hillSep.toFixed(4)}, floor=${minFloor})`
      );
    }
  }

  // Log violations in dev mode
  if (import.meta.env.DEV && violations.length > 0) {
    console.warn(`[QA-006] ${violationCount} Hill sphere spacing violations:`);
    violations.forEach(v => console.warn('  ' + v));
  }

  return { violations: violationCount, log: violations };
}

function generatePlanetarySystem(primaryStar: Star, zones: ZoneBoundaries, useV2: boolean = false) {
  const stellarClass = primaryStar.class;
  const starMass = primaryStar.mass;

  const disks: PlanetaryBody[] = [];
  const dwarfs: PlanetaryBody[] = [];
  const terrestrials: PlanetaryBody[] = [];
  const ices: PlanetaryBody[] = [];
  const gases: PlanetaryBody[] = [];

  // Generate bodies, passing stellarClass for Adv/Dis modifiers (QA-007)
  const diskCount = getBodyCount('disk', stellarClass);
  for (let i = 0; i < diskCount; i++) {
    disks.push(generateBody('disk', primaryStar, zones));
  }

  const dwarfCount = getBodyCount('dwarf', stellarClass);
  for (let i = 0; i < dwarfCount; i++) {
    dwarfs.push(generateBody('dwarf', primaryStar, zones));
  }

  const terrestrialCount = getBodyCount('terrestrial', stellarClass);
  for (let i = 0; i < terrestrialCount; i++) {
    terrestrials.push(generateBody('terrestrial', primaryStar, zones));
  }

  const iceCount = getBodyCount('ice', stellarClass);
  for (let i = 0; i < iceCount; i++) {
    ices.push(generateBody('ice', primaryStar, zones));
  }

  const gasCount = getBodyCount('gas', stellarClass);
  for (let i = 0; i < gasCount; i++) {
    gases.push(generateBody('gas', primaryStar, zones));
  }

  // FR-042: v2 composition — roll for each Dwarf and Terrestrial body
  for (const body of dwarfs) {
    const comp = rollComposition('dwarf', roll3D6().value, roll2D6().value);
    body.composition = comp.composition;
    body.reactivityDM = comp.reactivityDM;
    const phys = recalculatePhysicalProperties(body.mass, comp.densityGcm3);
    body.densityGcm3 = phys.densityGcm3;
    body.radiusKm = phys.radiusKm;
    body.diameterKm = phys.diameterKm;
    body.surfaceGravityG = phys.surfaceGravityG;
    body.escapeVelocityMs = phys.escapeVelocityMs;
  }
  for (const body of terrestrials) {
    const comp = rollComposition('terrestrial', roll3D6().value, roll2D6().value);
    body.composition = comp.composition;
    body.reactivityDM = comp.reactivityDM;
    const phys = recalculatePhysicalProperties(body.mass, comp.densityGcm3);
    body.densityGcm3 = phys.densityGcm3;
    body.radiusKm = phys.radiusKm;
    body.diameterKm = phys.diameterKm;
    body.surfaceGravityG = phys.surfaceGravityG;
    body.escapeVelocityMs = phys.escapeVelocityMs;
  }

  let allBodies: PlanetaryBody[];
  let v2Ejected: PlanetaryBody[] = [];
  let v2Consumed: PlanetaryBody[] = [];

  if (useV2) {
    // FR-042: v2 positioning system
    const v2Result = placeBodiesV2(disks, dwarfs, terrestrials, ices, gases, primaryStar, zones);
    allBodies = v2Result.placedBodies;
    v2Ejected = v2Result.ejectedBodies;
    v2Consumed = v2Result.consumedBodies;

    if (import.meta.env.DEV) {
      console.log('[Planetary System V2] Generated:', {
        total: allBodies.length,
        disks: allBodies.filter(b => b.type === 'disk').length,
        dwarfs: allBodies.filter(b => b.type === 'dwarf').length,
        terrestrials: allBodies.filter(b => b.type === 'terrestrial').length,
        ices: allBodies.filter(b => b.type === 'ice').length,
        gases: allBodies.filter(b => b.type === 'gas').length,
        ejected: v2Ejected.length,
        consumed: v2Consumed.length,
      });
    }
  } else {
    // Legacy positioning
    allBodies = [
      ...disks, ...dwarfs, ...terrestrials, ...ices, ...gases,
    ];

    // Apply Hot Jupiter migration sweep BEFORE spacing enforcement (QA-011)
    const hjResult = applyHotJupiterMigration(allBodies);
    allBodies = hjResult.bodies;

    // Enforce Hill sphere spacing with minimum floor (QA-006)
    allBodies = resolveConflicts(allBodies, starMass);

    // Verify spacing and log violations
    const spacingCheck = verifySpacing(allBodies, starMass);

    if (import.meta.env.DEV) {
      console.log('[Planetary System] Generated:', {
        total: allBodies.length,
        disks: allBodies.filter(b => b.type === 'disk').length,
        dwarfs: allBodies.filter(b => b.type === 'dwarf').length,
        terrestrials: allBodies.filter(b => b.type === 'terrestrial').length,
        ices: allBodies.filter(b => b.type === 'ice').length,
        gases: allBodies.filter(b => b.type === 'gas').length,
        hotJupiterCleared: hjResult.clearedZones,
        hillViolations: spacingCheck.violations,
      });
    }
  }

  // Find largest body mass for Habitat sizing (excluding stars)
  const nonDiskBodies = allBodies.filter(b => b.type !== 'disk');
  const largestBodyMass = nonDiskBodies.length > 0
    ? Math.max(...nonDiskBodies.map(b => b.mass))
    : 1.0; // Default to 1 EM if only disks exist

  return {
    disks:        allBodies.filter(b => b.type === 'disk'),
    dwarfs:       allBodies.filter(b => b.type === 'dwarf'),
    terrestrials: allBodies.filter(b => b.type === 'terrestrial'),
    ices:         allBodies.filter(b => b.type === 'ice'),
    gases:        allBodies.filter(b => b.type === 'gas'),
    largestBodyMass,
    ejectedBodies: v2Ejected,
    consumedBodies: v2Consumed,
  };
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function generateBody(type: BodyType, primaryStar: Star, _zones: ZoneBoundaries): PlanetaryBody {
  const id = uuidv4();
  const sqrtL = Math.sqrt(primaryStar.luminosity);

  let zone: Zone = 'Outer';
  let distanceAU = 0;
  let mass = 0;
  let gasClass: GasWorldClass | undefined;
  let lesserEarthType: LesserEarthType | undefined;

  switch (type) {
    case 'disk':
      // QA-006: vary disk AU so disks don't all land on the same position
      zone = 'Outer';
      distanceAU = sqrtL * (5 + Math.random() * 15);
      mass = Math.random() * 0.001;
      break;

    case 'dwarf': {
      let dwarfRoll = rollD6();
      while (dwarfRoll === 6) dwarfRoll = rollD6();
      const dwarfZones: Zone[] = ['Infernal', 'Hot', 'Conservative', 'Cold', 'Outer'];
      zone = dwarfZones[dwarfRoll - 1];
      distanceAU = calculateDistanceForZone(zone, sqrtL);
      mass = 0.0001 + Math.random() * 0.001;
      const lesserResult = getLesserEarthType(roll2D6().value);
      lesserEarthType = lesserResult.type;
      break;
    }

    case 'terrestrial': {
      const terrestrialRoll = Math.random();
      if (terrestrialRoll < 0.1) zone = 'Infernal';
      else if (terrestrialRoll < 0.2) zone = 'Hot';
      else if (terrestrialRoll < 0.5) zone = 'Conservative';
      else if (terrestrialRoll < 0.7) zone = 'Cold';
      else zone = 'Outer';
      distanceAU = calculateDistanceForZone(zone, sqrtL);
      mass = 0.5 + Math.random() * 4;
      break;
    }

    case 'ice':
      zone = 'Outer';
      distanceAU = sqrtL * (4.85 + Math.random() * 10);
      mass = 0.1 + Math.random() * 2;
      break;

    case 'gas': {
      const classRoll = roll5D6().value;
      const gasClassResult = getGasWorldClass(classRoll);
      gasClass = gasClassResult as GasWorldClass;

      switch (gasClass) {
        case 'I':
          zone = 'Outer';
          distanceAU = sqrtL * (10 + Math.random() * 20);
          break;
        case 'II': {
          const iiRoll = rollD6();
          zone = iiRoll >= 4 ? 'Conservative' : 'Cold';
          distanceAU = calculateDistanceForZone(zone, sqrtL);
          break;
        }
        case 'III':
          zone = 'Infernal';
          distanceAU = sqrtL * 0.2;
          break;
        case 'IV':
        case 'V':
          zone = 'Hot';
          distanceAU = sqrtL * (0.4 + Math.random() * 0.4);
          break;
        default:
          zone = 'Outer';
          distanceAU = sqrtL * 10;
      }
      mass = 10 + Math.random() * 300;
      break;
    }
  }

  const body: PlanetaryBody = {
    id,
    type,
    mass: Math.round(mass * 10000) / 10000,
    zone,
    distanceAU: Math.round(distanceAU * 100) / 100,
    gasClass,
    lesserEarthType,
  };

  // Calculate physical properties for non-disk bodies (QA-009)
  if (type !== 'disk') {
    const physProps = calculatePhysicalProperties(body.mass, type);
    body.densityGcm3 = physProps.densityGcm3;
    body.radiusKm = physProps.radiusKm;
    body.diameterKm = physProps.diameterKm;
    body.surfaceGravityG = physProps.surfaceGravityG;
    body.escapeVelocityMs = physProps.escapeVelocityMs;
  }

  return body;
}

function calculateDistanceForZone(zone: Zone, sqrtL: number): number {
  switch (zone) {
    case 'Infernal':
      return sqrtL * (0.1 + Math.random() * 0.3);
    case 'Hot':
      return sqrtL * (0.4 + Math.random() * 0.4);
    case 'Conservative':
      return sqrtL * (0.8 + Math.random() * 0.4);
    case 'Cold':
      return sqrtL * (1.2 + Math.random() * 2);
    case 'Outer':
      return sqrtL * (4.85 + Math.random() * 10);
  }
}
