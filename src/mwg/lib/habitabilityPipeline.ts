// =====================
// FR-043: Habitability Pipeline — 10-Step Waterfall + Mainworld Selection
// =====================

import type {
  PlanetaryBody,
  ExtraterrestrialLifeAssumptions,
  Zone,
  ZoneId,
  TemperatureType,
  BiosphereRating,
  BiochemTier,
} from '../types';
import { roll2D6, roll3D6, rollKeep } from './dice';
import {
  ATMOSPHERE_COMPOSITION,
  ATMOSPHERE_DENSITY_TABLE,
  getAtmosphereDensityModifiers,
  lookupBiochem,
  getBiochemHabMod,
  buildBiosphereDicePool,
  computeBiosphereRating,
  convertAtmosphere,
  getConvertedAtmoHabMod,
  ZONE_TEMPERATURE_DM,
  DENSITY_GREENHOUSE_DM,
  HAZARD_TABLE_V2,
  HAZARD_INTENSITY_V2,
  getGravityHabMod,
} from './worldData';

// ---------------------
// Temperature Lookup (V2)
// ---------------------

function lookupTemperatureV2(roll: number): { type: TemperatureType; habMod: number } {
  if (roll <= 3) return { type: 'Freezing', habMod: -5 };
  if (roll <= 5) return { type: 'Cold', habMod: -2 };
  if (roll <= 9) return { type: 'Average', habMod: 0 };
  if (roll <= 11) return { type: 'Hot', habMod: -2 };
  return { type: 'Inferno', habMod: -5 };
}

// ---------------------
// Zone Temperature DM Helper
// ---------------------

function getZoneTempDM(zone: Zone | ZoneId): number {
  if (zone === 'Cold') return -2; // legacy Zone maps to Cool
  return ZONE_TEMPERATURE_DM[zone as ZoneId] ?? 0;
}

// ---------------------
// Temperature Dice Adjustment
// ---------------------

function getTemperatureDiceAdjust(temp: TemperatureType): number {
  switch (temp) {
    case 'Freezing': return 3;
    case 'Cold': return 2;
    case 'Average': return -2;
    case 'Hot': return 2;
    case 'Inferno': return 3;
  }
}

// ---------------------
// Zone Preference Rank (for tiebreakers)
// ---------------------

/** Lower = more desirable for habitation. Conservative is ideal. */
function getZonePreferenceRank(zone: Zone): number {
  switch (zone) {
    case 'Conservative': return 0;
    case 'Hot': return 1;
    case 'Cold': return 2;
    case 'Infernal': return 3;
    case 'Outer': return 4;
    default: return 5;
  }
}

// ---------------------
// Hazard Severity Rank (for tiebreakers)
// ---------------------

/** Lower = less hazardous. Used as tiebreaker. */
function getHazardSeverityRank(hazard?: string): number {
  if (!hazard || hazard === 'None') return 0;
  if (hazard === 'Weather') return 1;
  if (hazard === 'Seismic') return 2;
  if (hazard === 'Radiation') return 3;
  if (hazard === 'Atmospheric') return 4;
  if (hazard === 'Biological') return 5;
  return 6;
}

// ---------------------
// Composition Quality Rank (for tiebreakers)
// ---------------------

function getCompositionQualityRank(composition?: string): number {
  if (!composition) return 0;
  // Terrestrial ranking (higher = better)
  if (composition.includes('Iron-Silicate')) return 6;
  if (composition.includes('Hydrous')) return 5;
  if (composition.includes('Silicate-Basaltic')) return 4;
  if (composition.includes('Carbonaceous')) return 3;
  if (composition.includes('Iron-Dominant')) return 2;
  if (composition.includes('Ceramic')) return 1;
  if (composition.includes('Exotic') && !composition.includes('Volatile')) return 0;
  // Dwarf ranking
  if (composition.includes('Volatile-Rich')) return 5;
  if (composition.includes('Hydrous')) return 5; // also for dwarfs
  if (composition.includes('Silicaceous')) return 3;
  if (composition.includes('Rubble-Pile')) return 2;
  if (composition.includes('Metallic')) return 1;
  return 0;
}

// ---------------------
// 10-Step Habitability Waterfall
// ---------------------

/**
 * Run the full 10-step habitability waterfall on a single body.
 * Mutates the body in place with all v2 habitability fields.
 * Returns the Baseline Habitability score (no TL).
 */
/** Jupiter Mass in Earth Masses */
const JM_PER_EM = 317.8;

/** Compute temperature DM from parent heat (proto-stars / brown dwarfs). */
function getProtoStarHeatDM(parent?: PlanetaryBody): number {
  if (!parent || parent.type !== 'gas') return 0;
  const parentMassJM = parent.mass / JM_PER_EM;
  if (parentMassJM >= 50) return 4; // Brown Dwarf
  if (parentMassJM >= 20) return 2; // Proto-Star
  return 0; // Normal gas giant
}

/** Moons of gas giants (including proto-stars and brown dwarfs) experience tidal heating. */
function getHasTidalHeating(parent?: PlanetaryBody): boolean {
  return parent !== undefined && parent.type === 'gas';
}

/**
 * Run the full 10-step habitability waterfall on a single body.
 * Mutates the body in place with all v2 habitability fields.
 * Returns the Baseline Habitability score (no TL).
 */
export function runHabitabilityWaterfall(
  body: PlanetaryBody,
  lifePreset: ExtraterrestrialLifeAssumptions,
  parent?: PlanetaryBody
): number {
  const reactivity = body.reactivityDM ?? 0;
  const gravity = body.surfaceGravityG ?? 0;
  const zone = body.zone;
  const isCeramic = body.composition?.includes('Ceramic') ?? false;

  // === Step 1: Atmosphere Composition (3D6, abiotic) ===
  const atmoCompRoll = Math.max(3, Math.min(18, roll3D6().value));
  const atmoCompEntry = ATMOSPHERE_COMPOSITION[atmoCompRoll] ?? ATMOSPHERE_COMPOSITION[9];
  let atmoComp = atmoCompEntry.name;

  // H-He auto-escape for low gravity
  let isHHEscape = false;
  if (atmoComp === 'H-He' && gravity < 1.5) {
    atmoComp = 'None';
    isHHEscape = true;
  }

  body.atmosphereCompositionAbiotic = atmoComp;
  body.atmosphereComposition = atmoComp;

  // === Step 2: Atmosphere Density (2D6 + modifiers) ===
  const densityMod = getAtmosphereDensityModifiers(reactivity, gravity, isCeramic, isHHEscape);
  const densityRollRaw = roll2D6().value + densityMod;
  const densityRoll = Math.max(2, Math.min(12, densityRollRaw));
  const densityEntry = ATMOSPHERE_DENSITY_TABLE[densityRoll] ?? ATMOSPHERE_DENSITY_TABLE[6];
  const atmoDensity = densityEntry.density;
  body.atmosphereDensityV2 = atmoDensity;

  // === Step 3: Temperature (2D6 + stacked modifiers) ===
  const zoneDM = getZoneTempDM(zone);
  const atmoCompTempDM = atmoCompEntry.tempDM;
  const atmoDensityTempDM = DENSITY_GREENHOUSE_DM[atmoDensity] ?? 0;
  const protoStarHeatDM = getProtoStarHeatDM(parent);

  const tempRollRaw = roll2D6().value + zoneDM + atmoCompTempDM + atmoDensityTempDM + protoStarHeatDM;
  const tempResult = lookupTemperatureV2(tempRollRaw);
  body.temperatureV2 = tempResult.type;

  // === Step 4: Hazard (2D6 + Reactivity DM + atmosphere hazard bias) ===
  const hazardBias = atmoCompEntry.hazardBias;
  let hazardRollMod = reactivity;
  if (hazardBias.corrosive) hazardRollMod += hazardBias.corrosive;
  if (hazardBias.toxic) hazardRollMod += hazardBias.toxic;

  const hazardRoll = Math.max(2, Math.min(12, roll2D6().value + hazardRollMod));
  const hazardEntry = HAZARD_TABLE_V2[hazardRoll] ?? HAZARD_TABLE_V2[2];
  body.hazardV2 = hazardEntry.hazard;

  // === Step 5: Hazard Intensity (2D6) ===
  const intensityRoll = Math.max(2, Math.min(12, roll2D6().value));
  const intensityEntry = HAZARD_INTENSITY_V2[intensityRoll] ?? HAZARD_INTENSITY_V2[2];
  body.hazardIntensityV2 = intensityEntry.intensity;

  // === Step 6: Biochem Resources (3D6 + Reactivity DM) ===
  const biochemRollRaw = roll3D6().value + reactivity;
  const biochemRoll = Math.max(3, Math.min(18, biochemRollRaw));
  const biochemEntry = lookupBiochem(biochemRoll);
  body.biochem = biochemEntry.tier;

  // === Step 7–8: Biosphere Test + Rating ===
  let biosphereRating: BiosphereRating = 'B0';
  let biosphereHabMod = 0;

  const minBiochem: BiochemTier = lifePreset.minBiochemForBiosphereRoll;
  const biochemOrder: BiochemTier[] = [
    'Scarce', 'Rare', 'Uncommon', 'Poor', 'Deficient',
    'Common', 'Abundant', 'Rich', 'Bountiful', 'Prolific', 'Inexhaustible'
  ];
  const biochemIndex = biochemOrder.indexOf(biochemEntry.tier);
  const minIndex = biochemOrder.indexOf(minBiochem);

  if (biochemIndex >= minIndex) {
    // Build dice pool from temperature + biochem modifiers
    const tempDiceAdjust = getTemperatureDiceAdjust(tempResult.type);

    // Subsurface ocean override check
    const isHydrous = body.composition?.includes('Hydrous') ?? false;
    const isVolatileRich = body.composition?.includes('Volatile-Rich') ?? false;
    const isCold = tempResult.type === 'Cold' || tempResult.type === 'Freezing';
    const hasTidalHeating = getHasTidalHeating(parent);

    let effectiveTempAdjust = tempDiceAdjust;
    if ((isHydrous || isVolatileRich) && isCold && hasTidalHeating) {
      effectiveTempAdjust = Math.ceil(tempDiceAdjust / 2);
    }

    // Apply biochem offset rule
    let biochemOffset = getBiochemHabMod(biochemEntry.tier);
    if (lifePreset.biochemOffsetRule === 'halved') {
      biochemOffset = Math.ceil(biochemOffset / 2);
    } else if (lifePreset.biochemOffsetRule === 'none') {
      biochemOffset = 0;
    }

    let disLevel = lifePreset.biosphereDisadvantage;
    if (biochemOffset > 0) disLevel -= biochemOffset;
    disLevel += effectiveTempAdjust;

    const pool = buildBiosphereDicePool(disLevel);
    const rollResult = rollKeep(pool.diceCount, 6, pool.keepCount, pool.keepType);
    const biosphereRoll = rollResult.value;

    const ratingResult = computeBiosphereRating(biosphereRoll, lifePreset.biosphereTN);
    biosphereRating = ratingResult.rating;
    biosphereHabMod = ratingResult.habMod;

    body.biosphereRoll = biosphereRoll;
    body.biosphereTN = lifePreset.biosphereTN;
  }

  body.biosphereRating = biosphereRating;

  // === Step 9: Atmosphere Conversion ===
  if (lifePreset.enableTransitionalAtmospheres && biosphereRating >= 'B3') {
    body.atmosphereComposition = convertAtmosphere(atmoComp, biosphereRating);
  }

  // === Step 10: Baseline Habitability ===
  const gravityMod = getGravityHabMod(gravity);
  const atmoCompMod = getConvertedAtmoHabMod(atmoComp, biosphereRating);
  const atmoDensityMod = densityEntry.habMod;
  const tempMod = tempResult.habMod;
  const hazardMod = hazardEntry.habMod;
  const intensityMod = intensityEntry.habMod;
  const biochemMod = biochemEntry.habMod;

  const baseline = gravityMod + atmoCompMod + atmoDensityMod + tempMod + hazardMod + intensityMod + biochemMod + biosphereHabMod;

  body.baselineHabitability = baseline;
  body.habitabilityBreakdown = {
    gravity: gravityMod,
    atmosphereComp: atmoCompMod,
    atmosphereDensity: atmoDensityMod,
    temperature: tempMod,
    hazard: hazardMod,
    hazardIntensity: intensityMod,
    biochem: biochemMod,
    biosphere: biosphereHabMod,
  };

  return baseline;
}

// ---------------------
// Mainworld Selection
// ---------------------

export interface MainworldSelectionResult {
  mainworldId: string;
  candidates: Array<{ id: string; score: number; rank: number }>;
  tiebreakerApplied: boolean;
  fallbackTriggered: boolean;
  fallbackReason?: string;
}

/**
 * Select the mainworld from all habitability candidates.
 * Highest Baseline Habitability wins. TL is NOT included.
 */
export function selectMainworld(bodies: PlanetaryBody[]): MainworldSelectionResult {
  const candidates = bodies
    .filter(b => {
      // Habitability candidate: Dwarf or Terrestrial
      const isRightType = b.type === 'dwarf' || b.type === 'terrestrial';
      const hasScore = b.baselineHabitability !== undefined;
      return isRightType && hasScore;
    })
    .map(b => ({ body: b, score: b.baselineHabitability! }));

  // Sort by score descending, then tiebreakers
  candidates.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;

    // Tiebreaker 1: Zone preference — Conservative is ideal
    const zoneRankA = getZonePreferenceRank(a.body.zone);
    const zoneRankB = getZonePreferenceRank(b.body.zone);
    if (zoneRankA !== zoneRankB) return zoneRankA - zoneRankB;

    // Tiebreaker 2: Least hazardous
    const hazardRankA = getHazardSeverityRank(a.body.hazardV2);
    const hazardRankB = getHazardSeverityRank(b.body.hazardV2);
    if (hazardRankA !== hazardRankB) return hazardRankA - hazardRankB;

    // Tiebreaker 3: Higher Biosphere Rating
    const ratingA = a.body.biosphereRating ?? 'B0';
    const ratingB = b.body.biosphereRating ?? 'B0';
    if (ratingB !== ratingA) return ratingB.localeCompare(ratingA);

    // Tiebreaker 4: Composition quality
    const rankA = getCompositionQualityRank(a.body.composition);
    const rankB = getCompositionQualityRank(b.body.composition);
    if (rankB !== rankA) return rankB - rankA;

    // Tiebreaker 5: Larger mass
    if (b.body.mass !== a.body.mass) return b.body.mass - a.body.mass;

    // Tiebreaker 6: Random (stable sort fallback)
    return 0;
  });

  const ranked = candidates.map((c, i) => ({
    id: c.body.id,
    score: c.score,
    rank: i + 1,
  }));

  let winner = candidates[0];
  let fallbackTriggered = false;
  let fallbackReason: string | undefined;

  if (!winner) {
    return {
      mainworldId: '',
      candidates: [],
      tiebreakerApplied: false,
      fallbackTriggered: true,
      fallbackReason: 'No habitability candidates found',
    };
  }

  if (winner.score <= 0) {
    fallbackTriggered = true;
    fallbackReason = 'All candidates scored ≤ 0; MVT/GVT fallback triggered';
  }

  winner.body.wasSelectedAsMainworld = true;

  const tiebreakerApplied = candidates.length > 1 &&
    candidates[0].score === candidates[1].score &&
    (candidates[0].body.zone !== candidates[1].body.zone ||
     candidates[0].body.hazardV2 !== candidates[1].body.hazardV2 ||
     candidates[0].body.biosphereRating !== candidates[1].body.biosphereRating ||
     candidates[0].body.composition !== candidates[1].body.composition ||
     candidates[0].body.mass !== candidates[1].body.mass);

  return {
    mainworldId: winner.body.id,
    candidates: ranked,
    tiebreakerApplied,
    fallbackTriggered,
    fallbackReason,
  };
}
