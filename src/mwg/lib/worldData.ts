import type { 
  StellarClass, Zone, LesserEarthType, 
  AtmosphereType, TemperatureType, HazardType, HazardIntensityType, ResourceLevel,
  WealthLevel, PowerStructure, DevelopmentLevel, PowerSource, StarportClass, TravelZone,
  TableWeights
} from '../types';
import { rollWeighted2D6, rollExplodingD6, sumLowest } from './dice';

// =====================
// World Type by Stellar Class
// =====================

export function getWorldTypeRoll(stellarClass: StellarClass): { dice: number; keep: number } {
  switch (stellarClass) {
    case 'F': return { dice: 4, keep: 2 };
    case 'G': return { dice: 3, keep: 2 };
    default: return { dice: 2, keep: 2 };
  }
}

// =====================
// Lesser Earth Type
// =====================

export function getLesserEarthType(roll: number): { type: LesserEarthType; modifier: number } {
  if (roll <= 7) return { type: 'Carbonaceous', modifier: 1 };
  if (roll <= 10) return { type: 'Silicaceous', modifier: 0 };
  if (roll === 11) return { type: 'Metallic', modifier: -1 };
  return { type: 'Other', modifier: 0 };
}

// =====================
// Gravity Table (DEPRECATED — QA-023)
// =====================

/*
export function getDwarfGravity(roll: number): { gravity: number; habitability: number } {
  const table: Record<number, { gravity: number; habitability: number }> = {
    2: { gravity: 0.001, habitability: -2.5 },
    3: { gravity: 0.02, habitability: -2 },
    4: { gravity: 0.04, habitability: -1.5 },
    5: { gravity: 0.06, habitability: -1 },
    6: { gravity: 0.08, habitability: -0.5 },
    7: { gravity: 0.10, habitability: -0.5 },
    8: { gravity: 0.12, habitability: -0.5 },
    9: { gravity: 0.14, habitability: -0.5 },
    10: { gravity: 0.16, habitability: 0 },
    11: { gravity: 0.18, habitability: 0 },
    12: { gravity: 0.2, habitability: 0 },
  };
  return table[roll] || table[7];
}

export function getTerrestrialGravity(roll: number): { gravity: number; habitability: number } {
  const table: Record<number, { gravity: number; habitability: number }> = {
    2: { gravity: 3.0, habitability: -2.5 },
    3: { gravity: 2.0, habitability: -2 },
    4: { gravity: 1.5, habitability: -1.5 },
    5: { gravity: 1.3, habitability: -1 },
    6: { gravity: 1.2, habitability: -0.5 },
    7: { gravity: 0.3, habitability: -0.5 },
    8: { gravity: 0.4, habitability: -0.5 },
    9: { gravity: 0.5, habitability: -0.5 },
    10: { gravity: 0.7, habitability: 0 },
    11: { gravity: 0.9, habitability: 0 },
    12: { gravity: 1.0, habitability: 0 },
  };
  return table[roll] || table[7];
}
*/

// =====================
// Mass Tables (REF-004) — QA-023
// =====================

export function getDwarfMass(roll: number): number {
  // Returns mass in Earth Masses (converted from Lunar Masses)
  const lmTable: Record<number, number> = {
    2: 0.1, 3: 0.2, 4: 0.3, 5: 0.5, 6: 0.7,
    7: 1.0, 8: 1.5, 9: 2.0, 10: 3.0, 11: 5.0, 12: 7.0,
  };
  const lm = lmTable[roll] || lmTable[7];
  return lm * 0.0123; // convert Lunar Masses to Earth Masses
}

export function getTerrestrialMass(roll: number): number {
  // Returns mass in Earth Masses
  const table: Record<number, number> = {
    2: 0.1, 3: 0.2, 4: 0.3, 5: 0.5, 6: 0.7,
    7: 1.0, 8: 1.5, 9: 2.0, 10: 3.0, 11: 5.0, 12: 7.0,
  };
  return table[roll] || table[7];
}

export function getHabitatMass(roll: number): number {
  // Returns mass in Giga‑Tons (GVT) for physics consistency
  const table: Record<number, number> = {
    2: 0.001,   // 1 MVT = 1 Mt = 0.001 Gt
    3: 0.003,
    4: 0.01,
    5: 0.03,
    6: 0.1,
    7: 0.3,
    8: 1.0,     // 1 GVT
    9: 3.0,
    10: 10.0,
    11: 30.0,
    12: 100.0,
  };
  return table[roll] || table[7];
}

// =====================
// Density Tables — QA-023 (Option B)
// =====================

export function getDwarfDensity(roll: number): number {
  const table: Record<number, number> = {
    2: 1.5,   // Carbonaceous/icy — lowest density
    3: 1.8,
    4: 2.1,
    5: 2.4,
    6: 2.7,
    7: 3.0,   // Silicaceous baseline (most common)
    8: 3.2,
    9: 3.4,
    10: 3.5,  // Metallic-rich
    11: 3.5,
    12: 3.5,
  };
  return table[roll] || table[7];
}

export function getTerrestrialDensity(roll: number): number {
  const table: Record<number, number> = {
    2: 6.5,   // Iron-core super-dense (high gravity)
    3: 6.0,
    4: 5.7,
    5: 5.4,
    6: 5.1,
    7: 5.0,   // Earth-like density (5.0 g/cm³)
    8: 4.8,
    9: 4.6,
    10: 4.4,  // Low-density silicate
    11: 4.2,
    12: 4.0,  // Lowest density (lower gravity)
  };
  return table[roll] || table[7];
}

// =====================
// Gravity-to-Habitability Threshold Functions — QA-023 (Option B)
// =====================

export function dwarfGravityToHab(gravityG: number): number {
  if (gravityG < 0.06) return -2.5;   // Extremely low gravity
  if (gravityG < 0.08) return -2.0;   // Very low gravity
  if (gravityG < 0.10) return -1.5;   // Low gravity
  if (gravityG < 0.12) return -1.0;   // Moderately low gravity
  if (gravityG < 0.16) return -0.5;   // Slightly low gravity
  return 0;                           // Adequate gravity (≥0.16G)
}

export function terrestrialGravityToHab(gravityG: number): number {
  if (gravityG > 1.8) return -2.5;    // Crushing gravity
  if (gravityG > 1.4) return -2.0;    // Very high gravity
  if (gravityG > 1.2) return -1.5;    // High gravity
  if (gravityG > 1.0) return -1.0;    // Moderately high gravity
  if (gravityG < 0.5) return -0.5;    // Too low gravity
  if (gravityG < 0.7) return -0.5;    // Low gravity
  return 0;                           // Optimal (0.7–1.0G)
}

// =====================
// Atmosphere Table
// =====================

export function getAtmosphere(roll: number): { type: AtmosphereType; tl: number; habitability: number } {
  if (roll <= 1) return { type: 'Crushing', tl: 9, habitability: -2.5 };
  if (roll <= 5) return { type: 'Dense', tl: 8, habitability: -2 };
  if (roll <= 8) return { type: 'Trace', tl: 8, habitability: -1.5 };
  if (roll <= 11) return { type: 'Thin', tl: 7, habitability: -1 };
  return { type: 'Average', tl: 0, habitability: 0 };
}

// =====================
// Temperature Table
// =====================

export function getTemperatureModifier(atmosphere: AtmosphereType): number {
  switch (atmosphere) {
    case 'Crushing': return 2;
    case 'Dense': return 1;
    case 'Thin': return -1;
    case 'Trace': return -2;
    default: return 0;
  }
}

export function getTemperature(roll: number): { type: TemperatureType; tl: number; habitability: number } {
  if (roll <= 2) return { type: 'Inferno', tl: 8, habitability: -2 };
  if (roll <= 6) return { type: 'Hot', tl: 7, habitability: -1.5 };
  if (roll <= 10) return { type: 'Freezing', tl: 7, habitability: -1 };
  if (roll === 11) return { type: 'Cold', tl: 6, habitability: -0.5 };
  return { type: 'Average', tl: 0, habitability: 0 };
}

// =====================
// Hazard Table
// =====================

export function getHazard(roll: number): { type: HazardType; habitability: number } {
  if (roll <= 2) return { type: 'Radioactive', habitability: -1.5 };
  if (roll <= 4) return { type: 'Toxic', habitability: -1.5 };
  if (roll <= 6) return { type: 'Biohazard', habitability: -1 };
  if (roll === 7) return { type: 'Corrosive', habitability: -1 };
  if (roll <= 9) return { type: 'Polluted', habitability: -0.5 };
  return { type: 'None', habitability: 0 };
}

// =====================
// Hazard Intensity Table
// =====================

export function getHazardIntensity(roll: number): { intensity: HazardIntensityType; tl: number; habitability: number } {
  if (roll <= 3) return { intensity: 'Intense', tl: 9, habitability: -2 };
  if (roll <= 6) return { intensity: 'High', tl: 8, habitability: -1.5 };
  if (roll <= 8) return { intensity: 'Serious', tl: 7, habitability: -1 };
  if (roll <= 10) return { intensity: 'Mild', tl: 6, habitability: -0.5 };
  return { intensity: 'Very Mild', tl: 11, habitability: 0 };
}

// =====================
// Biochemical Resources Table
// =====================

export function getBiochemicalResources(roll: number): { level: ResourceLevel; tl: number; habitability: number } {
  // Fixed: Abundant and Inexhaustible must provide POSITIVE habitability
  if (roll === 2) return { level: 'Scarce', tl: 8, habitability: -5 };
  if (roll <= 4) return { level: 'Rare', tl: 7, habitability: -4 };
  if (roll <= 7) return { level: 'Uncommon', tl: 4, habitability: -3 };
  if (roll <= 11) return { level: 'Abundant', tl: 0, habitability: 3 };  // Was 0, should be +3
  return { level: 'Inexhaustible', tl: 0, habitability: 5 };             // Correctly +5
}

// =====================
// Habitability Calculation with TL modifier
// =====================

/**
 * Calculate total habitability including Tech Level modifier.
 * 
 * TL Modifier = TL - 7, clamped to 0-9 (so TL 7 = 0, TL 8 = 1, ..., TL 16 = 9)
 * 
 * Expected component ranges:
 *   Gravity:           -2.5 to 0
 *   Atmosphere:        -2.5 to 0
 *   Temperature:       -2.0 to 0
 *   Hazard type:       -1.5 to 0
 *   Hazard intensity:  -2.0 to 0
 *   Biochem resources: -5 to +5
 *   Tech Level:         0 to +9
 */
export function calculateTotalHabitability(
  gravityHabitability: number,
  atmosphereHabitability: number,
  temperatureHabitability: number,
  hazardHabitability: number,
  hazardIntensityHabitability: number,
  biochemHabitability: number,
  techLevel: number
): number {
  // TL modifier: TL - 7, clamped 0-9
  const tlModifier = Math.max(0, Math.min(9, techLevel - 7));
  
  const total = 
    gravityHabitability +
    atmosphereHabitability +
    temperatureHabitability +
    hazardHabitability +
    hazardIntensityHabitability +
    biochemHabitability +
    tlModifier;
  
  // Debug logging in development
  if (import.meta.env.DEV) {
    console.log('Habitability breakdown:', {
      gravity: gravityHabitability,
      atmosphere: atmosphereHabitability,
      temperature: temperatureHabitability,
      hazard: hazardHabitability,
      hazardIntensity: hazardIntensityHabitability,
      biochem: biochemHabitability,
      techLevel,
      tlModifier,
      total: Math.round(total * 10) / 10,
    });
  }
  
  return Math.round(total * 10) / 10;
}

// =====================
// Tech Level Table
// =====================

export function getTechLevel(roll: number): number {
  if (roll === 2) return 7;
  if (roll === 3) return 8;
  if (roll === 4) return 9;
  if (roll === 5) return 10;
  if (roll <= 7) return 11;
  if (roll === 8) return 12;
  if (roll === 9) return 13;
  if (roll === 10) return 14;
  if (roll === 11) return 15;
  return 16;
}

export function getTechLevelDescription(tl: number): string {
  const descriptions: Record<number, string> = {
    7: 'Early Space Age (1950-2000)',
    8: 'Commercial Space (2000-2050)',
    9: 'New Space Race (2050-2100)',
    10: 'Cis Lunar Development (2100-2200)',
    11: 'Interstellar Settlement (2200-2300)',
    12: 'Post Earth Dependence (2300-2400)',
    13: 'Early Jump-Drive (2400-2500)',
    14: 'Interstellar Space (2500-2600)',
    15: 'Interstellar Colonization',
    16: 'Self-Sufficient Mega Structures',
  };
  return descriptions[tl] || 'Unknown';
}

// =====================
// Population
// =====================


// =====================
// Wealth Table
// =====================

export function getWealth(roll: number, resources: ResourceLevel): WealthLevel;
export function getWealth(roll: undefined, resources: ResourceLevel, weights?: TableWeights): WealthLevel;
export function getWealth(roll: number | undefined, resources: ResourceLevel, weights?: TableWeights): WealthLevel {
  const r = roll ?? (weights ? rollWeighted2D6(weights).value : (() => {
    const v = Math.floor(Math.random() * 6) + 1 + Math.floor(Math.random() * 6) + 1;
    return v;
  })());

  let modifier = 0;
  if (resources === 'Abundant') modifier = 1;
  if (resources === 'Inexhaustible') modifier = 2;

  const adjustedRoll = r + modifier;

  if (adjustedRoll <= 8) return 'Average';
  if (adjustedRoll <= 10) return 'Better-off';
  if (adjustedRoll === 11) return 'Prosperous';
  return 'Affluent';
}

export function getWealthModifier(wealth: WealthLevel): number {
  switch (wealth) {
    case 'Average': return 0;
    case 'Better-off': return 1;
    case 'Prosperous': return 2;
    case 'Affluent': return 3;
  }
}

// =====================
// Power Structure Table
// =====================

export function getPowerStructure(roll?: number, weights?: TableWeights): PowerStructure {
  const r = roll ?? (weights ? rollWeighted2D6(weights).value : (() => {
    const v = Math.floor(Math.random() * 6) + 1 + Math.floor(Math.random() * 6) + 1;
    return v;
  })());
  if (r <= 7) return 'Anarchy';
  if (r <= 9) return 'Confederation';
  if (r <= 11) return 'Federation';
  return 'Unitary State';
}

// =====================
// Development Table
// =====================

export function getDevelopment(roll?: number, weights?: TableWeights): { level: DevelopmentLevel; hdi: string; soc: number } {
  const r = roll ?? (weights ? rollWeighted2D6(weights).value : (() => {
    const v = Math.floor(Math.random() * 6) + 1 + Math.floor(Math.random() * 6) + 1;
    return v;
  })());
  if (r === 2) return { level: 'UnderDeveloped', hdi: '0.0-0.39', soc: 2 };
  if (r <= 5) return { level: 'UnderDeveloped', hdi: '0.40-0.49', soc: 3 };
  if (r <= 7) return { level: 'UnderDeveloped', hdi: '0.50-0.59', soc: 4 };
  if (r === 8) return { level: 'Developing', hdi: '0.60-0.69', soc: 5 };
  if (r === 9) return { level: 'Mature', hdi: '0.70-0.79', soc: 6 };
  if (r === 10) return { level: 'Developed', hdi: '0.80-0.89', soc: 8 };
  if (r === 11) return { level: 'Well Developed', hdi: '0.9-0.94', soc: 9 };
  return { level: 'Very Developed', hdi: '>0.95', soc: 10 };
}

export function getDevelopmentModifier(dev: DevelopmentLevel): number {
  switch (dev) {
    case 'UnderDeveloped': return -2;
    case 'Developing': return -1;
    case 'Mature': return 0;
    case 'Developed': return 1;
    case 'Well Developed': return 2;
    case 'Very Developed': return 3;
  }
}

// =====================
// Source of Power Table
// =====================

export function getSourceOfPower(roll?: number, weights?: TableWeights): PowerSource {
  const r = roll ?? (weights ? rollWeighted2D6(weights).value : (() => {
    const v = Math.floor(Math.random() * 6) + 1 + Math.floor(Math.random() * 6) + 1;
    return v;
  })());
  if (r <= 5) return 'Aristocracy';
  if (r <= 7) return 'Ideocracy';
  if (r <= 9) return 'Kratocracy';
  if (r <= 11) return 'Democracy';
  return 'Meritocracy';
}

// =====================
// Governance DM Table
// =====================

export function getGovernanceDM(dev: DevelopmentLevel, wealth: WealthLevel): number {
  const table: Record<DevelopmentLevel, Record<WealthLevel, number>> = {
    'UnderDeveloped': { 'Average': -9, 'Better-off': -3, 'Prosperous': 3, 'Affluent': 9 },
    'Developing': { 'Average': -8, 'Better-off': -2, 'Prosperous': 4, 'Affluent': 10 },
    'Mature': { 'Average': -7, 'Better-off': -1, 'Prosperous': 5, 'Affluent': 11 },
    'Developed': { 'Average': -6, 'Better-off': 0, 'Prosperous': 6, 'Affluent': 12 },
    'Well Developed': { 'Average': -5, 'Better-off': 1, 'Prosperous': 7, 'Affluent': 13 },
    'Very Developed': { 'Average': -4, 'Better-off': 2, 'Prosperous': 8, 'Affluent': 14 },
  };
  return table[dev][wealth];
}

// =====================
// Starport (PSS v1.1 — GDP-based with TL capability cap)
// =====================

/** Trade fraction of GDP that flows through the starport, by development level. */
export function getTradeFraction(dev: DevelopmentLevel): number {
  switch (dev) {
    case 'UnderDeveloped': return 0.05;
    case 'Developing':     return 0.065 + (Math.floor(Math.random() * 6) + 1) * 0.01;
    case 'Mature':         return 0.10 + (Math.floor(Math.random() * 6) + Math.floor(Math.random() * 6) + 2) * 0.007;
    case 'Developed':      return 0.15 + (Math.floor(Math.random() * 6) + Math.floor(Math.random() * 6) + 2) * 0.007;
    case 'Well Developed': return 0.20 + (Math.floor(Math.random() * 6) + Math.floor(Math.random() * 6) + 2) * 0.007;
    case 'Very Developed': return 0.25 + (Math.floor(Math.random() * 6) + Math.floor(Math.random() * 6) + 2) * 0.007;
  }
}

/** Wealth trade multiplier — wealthier economies generate proportionally more starport traffic. */
export function getWealthTradeMultiplier(wealth: WealthLevel): number {
  switch (wealth) {
    case 'Average':    return 1.0;
    case 'Better-off': return 1.2;
    case 'Prosperous': return 1.5;
    case 'Affluent':   return 2.0;
  }
}

/** TL capability ceiling — what the port can physically build/service. */
export function getTLCapClass(tl: number): StarportClass {
  if (tl < 4)   return 'X';
  if (tl <= 5)  return 'E';
  if (tl <= 7)  return 'D';
  if (tl <= 9)  return 'C';
  if (tl <= 11) return 'B';
  return 'A'; // TL 12+: starship construction capable
}

const CLASS_ORDER: Record<StarportClass, number> = { X: 0, E: 1, D: 2, C: 3, B: 4, A: 5 };
const ORDER_TO_CLASS: Record<number, StarportClass> = { 0: 'X', 1: 'E', 2: 'D', 3: 'C', 4: 'B', 5: 'A' };

function pssToClass(pss: number): StarportClass {
  if (pss < 1.5) return 'X';
  if (pss < 2.5) return 'E';
  if (pss < 3.5) return 'D';
  if (pss < 4.5) return 'C';
  if (pss < 5.5) return 'B';
  return 'A';
}

function minClass(a: StarportClass, b: StarportClass): StarportClass {
  return ORDER_TO_CLASS[Math.min(CLASS_ORDER[a], CLASS_ORDER[b])];
}

/**
 * Calculate starport class and throughput.
 * Step 1 — GDP × trade fraction → Annual Port Trade → PSS → raw class
 * Step 2 — TL capability cap
 * Step 3 — Final class = min(rawClass, tlCap)
 * Weekly throughput: annualTrade ÷ 52 × weeklyRoll (3D6)
 */
export function calculateStarport(
  population: number,
  tl: number,
  _wealth: WealthLevel,
  dev: DevelopmentLevel,
  weeklyRoll: number,
  gdpPerDayOverride: number,
): {
  class: StarportClass;
  pss: number;
  rawClass: StarportClass;
  tlCap: StarportClass;
  annualTrade: number;
  weeklyBase: number;
  weeklyActivity: number;
} {
  const gdpPerDay   = gdpPerDayOverride;
  // QA-057: removed wealth multiplier to avoid double-counting (Wealth is now baked into GDP/day via SOC)
  const annualTrade = population * gdpPerDay * 365 * getTradeFraction(dev);

  const pss       = Math.floor(Math.log10(Math.max(1, annualTrade)) * 100) / 100 - 6;
  const rawClass  = pssToClass(pss);
  const tlCap     = getTLCapClass(tl);
  const finalClass = minClass(rawClass, tlCap);

  const weeklyBaseRaw  = annualTrade / 52;

  // QA-062: scale weekly throughput by actual starport class
  // A world with A-class economic potential but X-class facilities can't process trade
  const classScale: Record<string, number> = {
    X: 0,
    E: 0.05,
    D: 0.15,
    C: 0.35,
    B: 0.60,
    A: 1.0,
  };
  const scale = classScale[finalClass] ?? 1.0;
  const weeklyBase     = weeklyBaseRaw * scale;
  const weeklyActivity = weeklyBase * weeklyRoll;

  return { class: finalClass, pss, rawClass, tlCap, annualTrade, weeklyBase, weeklyActivity };
}

export function rollForBase(starportClass: StarportClass, baseType: 'naval' | 'scout' | 'pirate'): boolean {
  const roll = Math.floor(Math.random() * 6) + 1 + Math.floor(Math.random() * 6) + 1;
  
  switch (baseType) {
    case 'naval':
      return starportClass === 'A' || starportClass === 'B' ? roll >= 8 : false;
    case 'scout':
      if (starportClass === 'A') return roll >= 5;
      if (starportClass === 'B') return roll >= 6;
      if (starportClass === 'C') return roll >= 7;
      if (starportClass === 'D') return roll >= 8;
      return false;
    case 'pirate':
      return starportClass === 'A' || starportClass === 'B' ? roll === 12 : false;
    default:
      return false;
  }
}

// =====================
// Depression Penalty (QA-026)
// =====================

export function calculateDepressionPenalty(population: number, development: DevelopmentLevel): number {
  let penalty = 0;
  if (population < 1_000_000) penalty += 1;
  if (population < 100_000) penalty += 1;
  if (population < 10_000) penalty += 1;
  if (development === 'UnderDeveloped' || development === 'Developing') penalty += 1;
  return penalty;
}

// =====================
// Travel Zone
// =====================

export function determineTravelZone(
  hazard: HazardType,
  intensity: HazardIntensityType,
  effectiveTL?: number
): { zone: TravelZone; reason?: string } {
  // High Biohazard or Radioactive = Automatic Amber Zone
  if (hazard === 'Radioactive' || (hazard === 'Biohazard' && intensity === 'High')) {
    return { zone: 'Amber', reason: `High ${hazard}` };
  }

  // Otherwise roll 2D6, on 2 = Amber Zone
  const roll = Math.floor(Math.random() * 6) + 1 + Math.floor(Math.random() * 6) + 1;
  let zone: TravelZone = 'Green';
  let reason: string | undefined;

  if (roll === 2) {
    const reasons = [
      'Civil unrest',
      'Disease outbreak',
      'Environmental hazard',
      'Political instability',
      'Trade restrictions',
      'Military activity'
    ];
    zone = 'Amber';
    reason = reasons[Math.floor(Math.random() * reasons.length)];
  }

  // QA-026: low effectiveTL forces Amber/Red zones
  if (effectiveTL !== undefined) {
    if (effectiveTL < 9) {
      zone = 'Red';
      reason = 'Depressed technology base (TL < 9)';
    } else if (effectiveTL < 10 && zone === 'Green') {
      zone = 'Amber';
      reason = 'Marginal technology base (TL < 10)';
    }
  }

  return { zone, reason };
}

// =====================
// Culture Table (D66 × D6)
// =====================

const CULTURE_TRAITS: string[][] = [
  ['Anarchist', 'Bureaucratic', 'Caste system', 'Collectivist', 'Competitive', 'Cosmopolitan'],
  ['Deceptive', 'Degenerate', 'Devoted', 'Egalitarian', 'Elitist', 'Fatalistic'],
  ['Fearful', 'Generous', 'Gregarious', 'Heroic', 'Honest', 'Honorable'],
  ['Hospitable', 'Hostile', 'Idealistic', 'Indifferent', 'Individualist', 'Intolerant'],
  ['Isolationist', 'Legalistic', 'Libertarian', 'Militarist', 'Pacifist', 'Paranoid'],
  ['Piety', 'Progressive', 'Proud', 'Rustic', 'Ruthless', 'Scheming'],
];

export const CULTURE_OPPOSITES: Record<string, string[]> = {
  'Anarchist':     ['Bureaucratic', 'Legalistic'],
  'Bureaucratic':  ['Anarchist', 'Libertarian'],
  'Caste system':  ['Egalitarian'],
  'Collectivist':  ['Individualist'],
  'Cosmopolitan':  ['Isolationist', 'Rustic'],
  'Deceptive':     ['Honest', 'Honorable'],
  'Degenerate':    ['Honorable', 'Proud'],
  'Devoted':       ['Indifferent'],
  'Egalitarian':   ['Elitist', 'Caste system'],
  'Elitist':       ['Egalitarian'],
  'Fatalistic':    ['Idealistic'],
  'Fearful':       ['Heroic'],
  'Generous':      ['Ruthless'],
  'Gregarious':    ['Paranoid'],
  'Heroic':        ['Fearful'],
  'Honest':        ['Deceptive', 'Scheming'],
  'Honorable':     ['Ruthless', 'Deceptive', 'Degenerate'],
  'Hospitable':    ['Hostile'],
  'Hostile':       ['Hospitable', 'Pacifist'],
  'Idealistic':    ['Fatalistic'],
  'Indifferent':   ['Devoted'],
  'Individualist': ['Collectivist'],
  'Isolationist':  ['Cosmopolitan'],
  'Legalistic':    ['Libertarian', 'Anarchist'],
  'Libertarian':   ['Legalistic', 'Bureaucratic'],
  'Militarist':    ['Pacifist'],
  'Pacifist':      ['Militarist', 'Hostile'],
  'Paranoid':      ['Gregarious'],
  'Progressive':   ['Rustic'],
  'Proud':         ['Degenerate'],
  'Rustic':        ['Cosmopolitan', 'Progressive'],
  'Ruthless':      ['Honorable', 'Generous'],
  'Scheming':      ['Honest'],
};

export const POWER_CULTURE_CONFLICTS: Record<PowerSource, string[]> = {
  'Kratocracy':  ['Pacifist', 'Egalitarian', 'Legalistic'],
  'Democracy':   ['Anarchist'],
  'Aristocracy': ['Egalitarian'],
  'Meritocracy': ['Caste system'],
  'Ideocracy':   ['Anarchist', 'Libertarian'],
};

export function generateCultureTraits(count: number = 1, exclude: string[] = []): string[] {
  const traits: string[] = [];

  for (let i = 0; i < count; i++) {
    let trait: string | undefined;
    let attempts = 0;
    while (attempts < 20) {
      const roll1 = Math.floor(Math.random() * 6);
      const roll2 = Math.floor(Math.random() * 6);
      const roll3 = Math.floor(Math.random() * 6);
      const row = roll1 + roll2; // 0-10, clamp to 0-5
      const col = roll3;
      const candidate = CULTURE_TRAITS[Math.min(5, row)]?.[col];
      const opposesExisting = candidate ? traits.some(t =>
        CULTURE_OPPOSITES[t]?.includes(candidate) ||
        CULTURE_OPPOSITES[candidate]?.includes(t)
      ) : false;
      if (candidate && !traits.includes(candidate) && !exclude.includes(candidate) && !opposesExisting) {
        trait = candidate;
        break;
      }
      attempts++;
    }
    if (trait) traits.push(trait);
  }

  return traits;
}

export const CULTURE_TRAIT_DESCRIPTIONS: Record<string, string> = {
  'Anarchist':    'Society operates without centralised authority. Power is distributed among local communities or strong individuals. Disputes are settled by consensus, reputation, or force — formal government is absent or minimal.',
  'Bureaucratic': 'Governed by elaborate formal procedures and hierarchies of officials. Progress is slow and paper-heavy. Outsiders find the system impenetrable without local contacts or expert knowledge.',
  'Caste system': 'Social class is fixed at birth and rarely changes. Occupation, marriage, and rights are tied to caste membership. Intermingling between castes is discouraged or forbidden.',
  'Collectivist': 'The group takes precedence over the individual. Resources and achievements are shared communally. Individual ambition is viewed with suspicion; loyalty to the collective is the highest virtue.',
  'Competitive':  'Driven by rivalry — economic, political, or social. Factions constantly vie for status and resources. Innovation is high but cooperation is low; betrayal is common in business and politics.',
  'Cosmopolitan': 'Open, diverse, and outward-looking. Outsiders are welcomed; multiple languages and customs coexist. Trade and cultural exchange are celebrated; insularity is considered backward.',
  'Deceptive':    'Dissembling is culturally accepted or even admired. Contracts are honoured only when convenient. Visitors should assume they are being misled; direct dealing is considered naïve.',
  'Degenerate':   'Social structures are in visible decay. Corruption, excess, and breakdown of shared norms are widespread. The ruling class indulges itself while the population suffers.',
  'Devoted':      'Organised around a powerful faith, ideology, or cause. Members sacrifice personal interests readily. Outsiders who do not share the devotion may be viewed as threats or potential converts.',
  'Egalitarian':  'Social equality is a core value. Titles, inherited wealth, and privilege are viewed with suspicion. Everyone is expected to contribute and receive fair reward.',
  'Elitist':      'Stratified by talent, birth, or achievement — and those at the top are unapologetic about it. Access to power is tightly controlled by a privileged few.',
  'Fatalistic':   'Outcomes are believed to be predetermined — by fate, the stars, or divine will. There is little sense of personal agency. Tragedy is accepted with resignation; risk is taken boldly.',
  'Fearful':      'Chronic fear shapes daily life — of authority, outsiders, or each other. Informants are common. Public behaviour is guarded. Creativity and dissent are suppressed by the constant threat of consequences.',
  'Generous':     'Hospitality and giving are core values. Wealth is measured by how much is given away. Visitors can expect food, shelter, and help; refusing a gift is a serious insult.',
  'Gregarious':   'Outgoing and social. Business is conducted over meals and celebrations. Silence and reserve are read as hostility. Networking is essential to getting anything done.',
  'Heroic':       'Celebrates bold action, personal courage, and decisive leadership. Self-sacrifice for a worthy cause is the highest honour. Caution and compromise are viewed as cowardice.',
  'Honest':       'Directness and truthfulness are paramount virtues. Lying — even polite social lies — is deeply shameful. Negotiations are blunt; what you see is what you get.',
  'Honorable':    'A strict code of personal conduct governs all interactions. Promises made are kept regardless of cost. Insults demand satisfaction. Reputation is everything.',
  'Hospitable':   'Welcoming strangers is a near-sacred duty. Travellers receive food, shelter, and protection as guests. In return, guests must behave with respect; violating hospitality is unforgivable.',
  'Hostile':      'Outsiders are viewed with deep suspicion or open aggression. Trade and diplomacy are grudging. Violence is a common first response to perceived threats.',
  'Idealistic':   'Driven by a vision of a better future — political, spiritual, or philosophical. Pragmatism is subordinated to principle. Grand projects are launched with enthusiasm; results rarely match the vision.',
  'Indifferent':  'Largely apathetic to politics, religion, and outside events. People focus on day-to-day comfort. The society is stable but difficult to mobilise for collective action, good or ill.',
  'Individualist':'Personal freedom and self-determination are paramount. Community obligations are minimal; everyone makes their own way. Privacy is jealously guarded; mutual aid is transactional.',
  'Intolerant':   'Conformity is enforced in belief, appearance, or behaviour. Minorities or those who deviate from norms face discrimination. The dominant group defines what is acceptable.',
  'Isolationist': 'Prefers minimal contact with outsiders. Off-world trade and immigration are restricted. Self-sufficiency is a point of pride. Outsiders are rarely made welcome.',
  'Legalistic':   'Governed by an intricate body of law applied rigorously. Contracts are everything. Legal disputes are common and consume years. An advocate is essential for any significant dealings.',
  'Libertarian':  'Personal freedom is the supreme value. Government is minimal by design; taxation and regulation are resisted. The individual is sovereign. The resulting society is dynamic, unequal, and occasionally chaotic.',
  'Militarist':   'Military virtues — discipline, strength, sacrifice — dominate culture. A significant fraction of the population serves or has served. Foreign policy is assertive; war is always a near possibility.',
  'Pacifist':     'Violence is culturally abhorrent. Conflict is resolved through mediation or passive resistance. Military forces are minimal. The society may be vulnerable but its internal cohesion is usually high.',
  'Paranoid':     'Lives in fear of hidden enemies — foreign agents, conspirators, or unseen forces. Surveillance is normalised. Strangers are automatically suspect. Accusations of betrayal are common and dangerous.',
  'Piety':        'Religious observance permeates every aspect of daily life. Festivals, prayers, and ritual duties structure the calendar. Offending religious sensibilities — even unknowingly — has serious consequences.',
  'Progressive':  'Embraces change, experimentation, and modernisation. Traditional structures are questioned or dismantled. Innovation is celebrated; rapid social change creates opportunity and instability in equal measure.',
  'Proud':        'Has a strong sense of its own greatness — historical, cultural, or racial. Perceived slights against national honour are taken very seriously. Admitting weakness is almost impossible.',
  'Rustic':       'Values simplicity, self-reliance, and closeness to the land. Urban sophistication is viewed with suspicion. Hard work, practical skills, and community ties are the true measures of a person.',
  'Ruthless':     'Winning is everything. Compassion and sentiment are luxuries. Competitors are destroyed, not merely defeated. Visitors are advised not to show weakness.',
  'Scheming':     'Political and social life is a labyrinth of alliances, betrayals, and counter-moves. Everyone has an agenda; nothing is said directly. Information is currency. Naïveté is fatal.',
};

// =====================
// Inhabitants Descriptions
// =====================

export const WEALTH_DESCRIPTIONS: Record<WealthLevel, { description: string }> = {
  'Average':    { description: 'The working population meets basic needs with little surplus. Consumer goods are limited; saving is difficult. Standard of living varies widely between regions.' },
  'Better-off': { description: 'An above-average economy with a growing middle class. Basic luxuries are accessible; disposable income exists. Trade is active and investment is beginning to circulate.' },
  'Prosperous': { description: 'A strong economy with significant trade surplus. Luxury goods are available; investment capital circulates freely. Quality of life is high for most citizens.' },
  'Affluent':   { description: 'A wealthy, thriving society with high per-capita income. Premium services are standard; off-world investment is significant. Poverty is minimal; consumption is conspicuous.' },
};

/** QA-025: Low-population terminology variants for populations < 1,000,000 */
export const WEALTH_DESCRIPTIONS_LOW_POP: Record<WealthLevel, { description: string }> = {
  'Average':    { description: 'The population meets basic needs with little surplus. Vital supplies are limited; saving is difficult. Standard of living varies widely between individuals.' },
  'Better-off': { description: 'An above-average fiscal condition with growing specialist groups. Basic luxuries are accessible; disposable income exists. Trade is active and communal resources are beginning to circulate.' },
  'Prosperous': { description: 'A strong fiscal condition with significant trade surplus. Luxury goods are available; communal resources circulate freely. Quality of life is high for most members.' },
  'Affluent':   { description: 'A wealthy, thriving community with high per-capita income. Premium services are standard; off-world support is significant. Hardship is minimal; resource use is conspicuous.' },
};

export const POWER_STRUCTURE_DESCRIPTIONS: Record<PowerStructure, { description: string }> = {
  'Anarchy':       { description: 'No recognised central authority exists. Power is fragmented among local strongmen, warlords, community councils, or guilds. Rules vary by location; travel between zones can be unpredictable.' },
  'Confederation': { description: 'A loose alliance of member-states that retain sovereignty. The central body has limited powers — primarily defence and trade arbitration. Member interests frequently conflict with collective decisions.' },
  'Federation':    { description: 'Member-states have delegated significant powers to a central government. Strong federal institutions co-exist with retained regional identity and local law. The most stable structure for diverse worlds.' },
  'Unitary State': { description: 'A single centralised government rules directly. Regions are administrative divisions, not political entities. Policy is imposed from the top; efficient but can be brittle under stress.' },
};

export const DEVELOPMENT_DESCRIPTIONS: Record<DevelopmentLevel, { hdi: string; description: string }> = {
  'UnderDeveloped': { hdi: '0.0–0.59', description: 'Subsistence economy dominates. High infant mortality, minimal infrastructure, most of the population engaged in agricultural or extractive labour. Basic literacy and healthcare are patchy. Significant poverty is the norm. (Book p.29)' },
  'Developing':     { hdi: '0.60–0.69', description: 'Industrial base is forming. A middle class is emerging. Access to basic technology — communications, medicine, transport — is becoming widespread. Rural-to-urban migration is accelerating. Inequality is often high during this transition. (Book p.29)' },
  'Mature':         { hdi: '0.70–0.79', description: 'A stable industrial economy with broadly accessible education and healthcare. A consumer economy is growing. Social institutions are functioning but under strain. Life expectancy has improved markedly. (Book p.29)' },
  'Developed':      { hdi: '0.80–0.89', description: 'High standard of living. Service and knowledge economy is dominant. Strong institutions; rule of law is generally reliable. Life expectancy is high; most citizens have access to advanced medical care and education. (Book p.29)' },
  'Well Developed': { hdi: '0.90–0.94', description: 'Post-industrial, technology-intensive economy. High educational attainment across the population. A strong social safety net reduces extreme hardship. Automation handles much routine labour. Off-world investment is common. (Book p.29)' },
  'Very Developed': { hdi: '>0.95', description: 'Near-optimal material conditions. Automation handles most labour; citizens pursue creative, scientific, and exploratory vocations. Inequality is minimal. This society is a significant player in interstellar trade and culture. (Book p.29)' },
};

/** QA-025: Low-population terminology variants for populations < 1,000,000 */
export const DEVELOPMENT_DESCRIPTIONS_LOW_POP: Record<DevelopmentLevel, { hdi: string; description: string }> = {
  'UnderDeveloped': { hdi: '0.0–0.59', description: 'Subsistence framework dominates. High infant mortality, minimal infrastructure, most of the population engaged in agricultural or extractive labour. Basic literacy and healthcare are patchy. Significant deprivation is the norm. (Book p.29)' },
  'Developing':     { hdi: '0.60–0.69', description: 'Industrial base is forming. Specialist groups are emerging. Access to basic technology — communications, medicine, transport — is becoming widespread. Labour mobility is accelerating. Inequality is often high during this transition. (Book p.29)' },
  'Mature':         { hdi: '0.70–0.79', description: 'A stable industrial framework with broadly accessible education and healthcare. Vital supply chains are growing. Social institutions are functioning but under strain. Life expectancy has improved markedly. (Book p.29)' },
  'Developed':      { hdi: '0.80–0.89', description: 'High standard of living. Service and knowledge framework is dominant. Strong institutions; rule of law is generally reliable. Life expectancy is high; most members have access to advanced medical care and education. (Book p.29)' },
  'Well Developed': { hdi: '0.90–0.94', description: 'Post-industrial, technology-intensive framework. High educational attainment across the population. A strong communal safety net reduces extreme hardship. Automation handles much routine labour. Off-world support is common. (Book p.29)' },
  'Very Developed': { hdi: '>0.95', description: 'Near-optimal material conditions. Automation handles most labour; individuals pursue creative, scientific, and exploratory vocations. Inequality is minimal. This community is a significant player in interstellar trade and culture. (Book p.29)' },
};

export const SOURCE_OF_POWER_DESCRIPTIONS: Record<PowerSource, { description: string }> = {
  'Aristocracy': { description: 'Power is held by hereditary noble families or landed gentry. Bloodlines and inheritance determine access to governance. Reform is slow; the system perpetuates itself across generations.' },
  'Ideocracy':   { description: 'Power is legitimised by adherence to an ideology, religion, or doctrine. True believers run the state; deviation from orthodoxy is a political as well as moral offence.' },
  'Kratocracy':  { description: 'Power belongs to the strongest. Might makes right — leadership changes through contest, coup, or demonstrated dominance. Can be dynamic but is inherently unstable.' },
  'Democracy':   { description: 'Power is derived from popular will through elections, referenda, or direct participation. Legitimacy requires ongoing consent of the governed. Prone to short-termism but resilient to abuse.' },
  'Meritocracy': { description: 'Power is awarded to those who demonstrate competence through examination, achievement, or proven track record. Efficient and innovative, but risks creating a self-perpetuating technocratic elite.' },
};

// =====================
// Planetary System
// =====================

/**
 * Generate body count with optional stellar class Adv/Dis modifiers (QA-007 / QA-015 / FRD 8.1-8.2).
 *
 * | Class | Modifier               |
 * |-------|------------------------|
 * | F     | Adv+2 on d6            |
 * | G     | Baseline (d6)          |
 * | K     | Dis+3 on d6            |
 * | M     | Half Dice + Dis+1 (d3) |
 * | O,B,A | Disks only             |
 *
 * House Rule REF-007 v1.2 — Half Dice mechanic for M-class stars (QA-015).
 * K-class: d6 with Dis+3 (reduced planet counts).
 * M-class: d3 with Dis+1 (significantly reduced planet counts — Half Dice).
 * F-class: Adv+2 on d6 (more planets).
 * G-class: Baseline d6 (standard distribution).
 */
export function getBodyCount(
  type: 'disk' | 'dwarf' | 'terrestrial' | 'ice' | 'gas',
  stellarClass?: StellarClass
): number {
  // O, B, A stars: only circumstellar disks
  if (stellarClass && (stellarClass === 'O' || stellarClass === 'B' || stellarClass === 'A')) {
    if (type !== 'disk') return 0;
  }

  // Roll N dice, keep best/worst M (for d6)
  function rollNd6KeepM(n: number, keep: number, keepLowest: boolean): number {
    const rolls = Array.from({ length: n }, () => Math.floor(Math.random() * 6) + 1);
    rolls.sort((a, b) => keepLowest ? a - b : b - a);
    return rolls.slice(0, keep).reduce((s, r) => s + r, 0);
  }

  // Roll N d3 dice, keep best/worst M (for Half Dice mechanic)
  function rollNd3KeepM(n: number, keep: number, keepLowest: boolean): number {
    const rolls = Array.from({ length: n }, () => Math.floor(Math.random() * 3) + 1);
    rolls.sort((a, b) => keepLowest ? a - b : b - a);
    return rolls.slice(0, keep).reduce((s, r) => s + r, 0);
  }

  const advExtra = stellarClass === 'F' ? 2 : 0;
  const disExtraK = stellarClass === 'K' ? 3 : 0; // K-class: Dis+3 on d6
  // M-class: Half Dice (d3) with Dis+1 — handled separately per type

  switch (type) {
    case 'disk': {
      if (stellarClass === 'M') {
        // Half Dice + Dis+1: 1d3-1, roll 2d3 keep lowest 1
        const rolls = Array.from({ length: 2 }, () => Math.floor(Math.random() * 3) + 1);
        rolls.sort((a, b) => a - b);
        return Math.max(0, rolls[0] - 1);
      }
      // Standard: 2D3 - 2 (disks use d3 for all stars)
      const r1 = Math.floor(Math.random() * 3) + 1;
      const r2 = Math.floor(Math.random() * 3) + 1;
      return Math.max(0, r1 + r2 - 2);
    }
    case 'dwarf': {
      if (stellarClass === 'M') {
        // Half Dice + Dis+1: 3d3-3, roll 4d3 keep lowest 3
        return Math.max(0, rollNd3KeepM(4, 3, true) - 3);
      }
      // Standard: 3D6 - 3 with Adv/Dis
      if (advExtra > 0) return Math.max(0, rollNd6KeepM(3 + advExtra, 3, false) - 3);
      if (disExtraK > 0) return Math.max(0, rollNd6KeepM(3 + disExtraK, 3, true) - 3);
      return Math.max(0,
        (Math.floor(Math.random() * 6) + 1) +
        (Math.floor(Math.random() * 6) + 1) +
        (Math.floor(Math.random() * 6) + 1) - 3
      );
    }
    case 'terrestrial': {
      if (stellarClass === 'M') {
        // Half Dice + Dis+1: 2d3-2, roll 3d3 keep lowest 2
        return Math.max(0, rollNd3KeepM(3, 2, true) - 2);
      }
      // Standard: 2D6 - 2 with Adv/Dis
      if (advExtra > 0) return Math.max(0, rollNd6KeepM(2 + advExtra, 2, false) - 2);
      if (disExtraK > 0) return Math.max(0, rollNd6KeepM(2 + disExtraK, 2, true) - 2);
      return Math.max(0,
        (Math.floor(Math.random() * 6) + 1) +
        (Math.floor(Math.random() * 6) + 1) - 2
      );
    }
    case 'ice': {
      if (stellarClass === 'M') {
        // Half Dice + Dis+1: 1d3-1, roll 2d3 keep lowest 1
        const rolls = Array.from({ length: 2 }, () => Math.floor(Math.random() * 3) + 1);
        rolls.sort((a, b) => a - b);
        return Math.max(0, rolls[0] - 1);
      }
      // Standard: 2D3 - 2 (ice worlds use d3 for all stars)
      const r1 = Math.floor(Math.random() * 3) + 1;
      const r2 = Math.floor(Math.random() * 3) + 1;
      return Math.max(0, r1 + r2 - 2);
    }
    case 'gas': {
      if (stellarClass === 'M') {
        // Half Dice + Dis+1: 1d3-1, roll 2d3 keep lowest 1
        const rolls = Array.from({ length: 2 }, () => Math.floor(Math.random() * 3) + 1);
        rolls.sort((a, b) => a - b);
        return Math.max(0, rolls[0] - 1);
      }
      // Standard: 2D3 - 2 (gas worlds use d3 for all stars)
      const r1 = Math.floor(Math.random() * 3) + 1;
      const r2 = Math.floor(Math.random() * 3) + 1;
      return Math.max(0, r1 + r2 - 2);
    }
  }
}

export function getGasWorldClass(roll: number): string {
  if (roll <= 17) return 'V';
  if (roll <= 20) return 'IV';
  if (roll <= 22) return 'III';
  if (roll <= 26) return 'II';
  return 'I';
}

// =====================
// World Position
// =====================

export function calculateWorldPosition(
  _atmosphere: AtmosphereType,
  temperature: TemperatureType,
  luminosity: number
): { zone: Zone; distanceAU: number } {
  const sqrtL = Math.sqrt(luminosity);
  const roll = Math.floor(Math.random() * 6) + 1;
  
  // Determine base zone from atmosphere + temperature
  let baseZone: Zone;
  
  if (temperature === 'Inferno') baseZone = 'Infernal';
  else if (temperature === 'Hot') baseZone = 'Hot';
  else if (temperature === 'Average') baseZone = 'Conservative';
  else if (temperature === 'Cold') baseZone = 'Cold';
  else baseZone = 'Outer';
  
  // Calculate distance based on zone
  let distance: number;
  switch (baseZone) {
    case 'Infernal':
      distance = sqrtL * (0.067 * roll);
      break;
    case 'Hot':
      distance = sqrtL * ((0.067 * roll) + 0.4);
      break;
    case 'Conservative':
      distance = sqrtL * ((0.067 * roll) + 0.7);
      break;
    case 'Cold':
      distance = sqrtL * ((0.61 * roll) + 1.2);
      break;
    case 'Outer': {
      const outerRoll = Math.floor(Math.random() * 6) + 1;
      let multiplier = 1;
      if (outerRoll === 6) {
        // Roll again and multiply
        let sixes = 1;
        let reroll = 6;
        while (reroll === 6) {
          reroll = Math.floor(Math.random() * 6) + 1;
          if (reroll === 6) sixes++;
        }
        multiplier = sixes;
      }
      distance = sqrtL * (Math.pow(outerRoll, 2) + 4.85) * multiplier;
      break;
    }
  }
  
  return { zone: baseZone, distanceAU: Math.round(distance * 100) / 100 };
}

// =====================
// Habitat Size Table (Hab ≤ 0 populated worlds — MVT/GVT)
// =====================

export function getHabitatSize(roll: number): { type: string; population: number } {
  if (roll === 2)  return { type: 'Frontier Outpost',   population: Math.floor(Math.random() * 90)       + 10 };
  if (roll <= 4)   return { type: 'Research Station',   population: Math.floor(Math.random() * 900)      + 100 };
  if (roll <= 6)   return { type: 'Mining Habitat',     population: Math.floor(Math.random() * 9000)     + 1000 };
  if (roll <= 8)   return { type: 'Industrial Habitat', population: Math.floor(Math.random() * 90000)    + 10000 };
  if (roll <= 10)  return { type: 'Colonial Habitat',   population: Math.floor(Math.random() * 900000)   + 100000 };
  if (roll === 11) return { type: 'City Habitat',       population: Math.floor(Math.random() * 9000000)  + 1000000 };
  return             { type: 'Megastructure',           population: Math.floor(Math.random() * 90000000) + 10000000 };
}

// =====================
// Tech Level Reference Table (REF-013)
// =====================

export interface TLEntry {
  mtl: number;
  ceTL: number;
  ceYear: string;
  heYear: string;
  eraName: string;
  keyTechnologies: string;
}

export const TL_TABLE: Record<number, TLEntry> = {
  9:  { mtl: 9,  ceTL: 7.0, ceYear: '2050 CE', heYear: '12,050 HE', eraName: 'New Space Race / Space Industrialisation',        keyTechnologies: 'Reliable orbit access, maker era, companion AI, graphene fibre, orbital manufacturing, and Lunar colonisation. Xeno-surrogacy and human gene-engineering emerge.' },
  10: { mtl: 10, ceTL: 8.0, ceYear: '2100 CE', heYear: '12,100 HE', eraName: 'Cis-Lunar Development',                           keyTechnologies: 'Skyhook networks, Lagrange manufacturing, Lunar Frontier Economy developing with footholds to other planets. Voidborn colonisation begins. Combined Cis-Lunar economy exceeds any single nation on Earth.' },
  11: { mtl: 11, ceTL: 8.5, ceYear: '2200 CE', heYear: '12,200 HE', eraName: 'Interplanetary Settlement & Jovian Colonisation',  keyTechnologies: 'Space economy surpasses Earth. Jupiter colonisation enabled by Carbon Nanotube construction — gigaton-scale structures and ships. Jovian Variant humans. Space elevator construction begins. Jovian economy surpasses Cis-Lunar.' },
  12: { mtl: 12, ceTL: 9.0, ceYear: '2300 CE', heYear: '12,300 HE', eraName: 'Post-Earth Dependence',                           keyTechnologies: 'Early jump gate (initially only at the Jupiter/Sol Lagrange point). Jovian economy independent of Earth, population exceeding Earth\'s. Jovian Hammers skim Jupiter for unique materials. The Bakunawa/Antaboga Coil — 898,394 km particle accelerator — creates antimatter to power jump gates.' },
  13: { mtl: 13, ceTL: 9.5, ceYear: '2400 CE', heYear: '12,400 HE', eraName: 'Outer System Development',                        keyTechnologies: 'World Serpents (particle accelerators on radiation belts) and jump gates connect star systems. Great Trees (fixed space elevators, Bradley C. Edwards design) viable for >1G escape by 24th century. Celestials (inner system solar swarms) sail light. Terraforming Worms process microbiomes on low-G worlds. Colony ships — O\'Neill cylinders and spiral CNT constructs — jump to new stars. Earth restoration begins.' },
  14: { mtl: 14, ceTL: 10.0, ceYear: '2500 CE', heYear: '12,500 HE', eraName: 'Early Interstellar Trade & Exploration',         keyTechnologies: 'Jump opens nearby systems. First contact with Divergent Humans — outside-Sol humans using Xeno-Surrogacy (early FTL). 200+ years of freedom allowed billions to emerge. Convergent technology exchange. Terraforming increases Venus and Mars habitability. Intense exodus from Sol.' },
  15: { mtl: 15, ceTL: 10.5, ceYear: '2600 CE', heYear: '12,600 HE', eraName: 'Interstellar Colonisation',                      keyTechnologies: 'Interstellar colonisation well underway with 100 billion+ people outside Sol. Spiral Ships — CNT space elevators twisted into spiral O\'Neill cylinders — fit Jump Gates to carry communities to new stars. Generated primarily by Jupiter, which keeps growing.' },
  16: { mtl: 16, ceTL: 11.0, ceYear: '2700 CE', heYear: '12,700 HE', eraName: 'Self-Sufficient Megastructures & Swarms',        keyTechnologies: 'Serpents, Trees, and Celestials become self-directed — jumping and spreading outward. Humanity cannot help but be carried away by the momentum of its own creations.' },
  17: { mtl: 17, ceTL: 11.5, ceYear: '2800 CE', heYear: '12,800 HE', eraName: 'Post-Megastructure Expansion',                   keyTechnologies: 'Civilisation expands beyond any single direction. The megastructures carry it outward.' },
  18: { mtl: 18, ceTL: 12.0, ceYear: '2900+ CE', heYear: '12,900+ HE', eraName: 'Unknown Future',                               keyTechnologies: 'Beyond current modelling. Civilisational trajectory unknown.' },
};



// =====================
// FR-041 / FR-042 / FR-043: v2 Redesign Tables
// =====================

import type {
  AtmosphereComp,
  AtmoDensity, BiochemTier, BiosphereRating, HazardIntensity,
  RingProminence, ZoneId
} from '../types';

// ---------------------
// 3.1 Composition Tables
// ---------------------

export interface CompositionEntry {
  name: string;
  densityMin: number;
  densityMax: number;
  reactivityDM: number;
}

export const TERRESTRIAL_COMPOSITION: Record<number, CompositionEntry> = {
  3:  { name: 'Exotic (Heavy-Element)',        densityMin: 7.5, densityMax: 9.5, reactivityDM: 2 },
  4:  { name: 'Iron-Dominant',                 densityMin: 6.0, densityMax: 7.5, reactivityDM: -1 },
  5:  { name: 'Iron-Dominant',                 densityMin: 6.0, densityMax: 7.5, reactivityDM: -1 },
  6:  { name: 'Iron-Silicate',                 densityMin: 5.0, densityMax: 6.0, reactivityDM: 1 },
  7:  { name: 'Iron-Silicate',                 densityMin: 5.0, densityMax: 6.0, reactivityDM: 1 },
  8:  { name: 'Iron-Silicate',                 densityMin: 5.0, densityMax: 6.0, reactivityDM: 1 },
  9:  { name: 'Silicate-Basaltic',             densityMin: 3.8, densityMax: 5.0, reactivityDM: 0 },
  10: { name: 'Silicate-Basaltic',             densityMin: 3.8, densityMax: 5.0, reactivityDM: 0 },
  11: { name: 'Silicate-Basaltic',             densityMin: 3.8, densityMax: 5.0, reactivityDM: 0 },
  12: { name: 'Silicate-Basaltic',             densityMin: 3.8, densityMax: 5.0, reactivityDM: 0 },
  13: { name: 'Hydrous / Ocean',               densityMin: 2.5, densityMax: 3.8, reactivityDM: 2 },
  14: { name: 'Hydrous / Ocean',               densityMin: 2.5, densityMax: 3.8, reactivityDM: 2 },
  15: { name: 'Hydrous / Ocean',               densityMin: 2.5, densityMax: 3.8, reactivityDM: 2 },
  16: { name: 'Carbonaceous',                  densityMin: 2.0, densityMax: 3.0, reactivityDM: 1 },
  17: { name: 'Carbonaceous',                  densityMin: 2.0, densityMax: 3.0, reactivityDM: 1 },
  18: { name: 'Ceramic / Silicate-Pure',       densityMin: 3.0, densityMax: 4.0, reactivityDM: 0 },
};

export const DWARF_COMPOSITION: Record<number, CompositionEntry> = {
  3:  { name: 'Exotic',                        densityMin: 1.5, densityMax: 4.0, reactivityDM: 1 },
  4:  { name: 'Metallic (M-type)',             densityMin: 5.0, densityMax: 7.5, reactivityDM: -1 },
  5:  { name: 'Metallic (M-type)',             densityMin: 5.0, densityMax: 7.5, reactivityDM: -1 },
  6:  { name: 'Silicaceous (S-type)',          densityMin: 2.8, densityMax: 3.8, reactivityDM: 0 },
  7:  { name: 'Silicaceous (S-type)',          densityMin: 2.8, densityMax: 3.8, reactivityDM: 0 },
  8:  { name: 'Silicaceous (S-type)',          densityMin: 2.8, densityMax: 3.8, reactivityDM: 0 },
  9:  { name: 'Hydrous / Icy-Rock',            densityMin: 1.5, densityMax: 2.5, reactivityDM: 2 },
  10: { name: 'Hydrous / Icy-Rock',            densityMin: 1.5, densityMax: 2.5, reactivityDM: 2 },
  11: { name: 'Hydrous / Icy-Rock',            densityMin: 1.5, densityMax: 2.5, reactivityDM: 2 },
  12: { name: 'Hydrous / Icy-Rock',            densityMin: 1.5, densityMax: 2.5, reactivityDM: 2 },
  13: { name: 'Carbonaceous (C-type)',         densityMin: 1.8, densityMax: 2.5, reactivityDM: 1 },
  14: { name: 'Carbonaceous (C-type)',         densityMin: 1.8, densityMax: 2.5, reactivityDM: 1 },
  15: { name: 'Carbonaceous (C-type)',         densityMin: 1.8, densityMax: 2.5, reactivityDM: 1 },
  16: { name: 'Rubble-Pile',                   densityMin: 1.5, densityMax: 2.2, reactivityDM: 0 },
  17: { name: 'Rubble-Pile',                   densityMin: 1.5, densityMax: 2.2, reactivityDM: 0 },
  18: { name: 'Volatile-Rich',                 densityMin: 1.2, densityMax: 2.0, reactivityDM: 2 },
};

/** Interpolate density within composition range using a 2D6 roll (2=min, 12=max). */
export function interpolateDensity(densityMin: number, densityMax: number, roll2d6: number): number {
  const t = Math.max(0, Math.min(1, (roll2d6 - 2) / 10));
  return densityMin + (densityMax - densityMin) * t;
}

/** Roll composition for a terrestrial or dwarf body (FR-042 Phase 2). */
export function rollComposition(
  type: 'terrestrial' | 'dwarf',
  roll3d6: number,
  roll2d6: number
): { composition: string; densityGcm3: number; reactivityDM: number } {
  const table = type === 'terrestrial' ? TERRESTRIAL_COMPOSITION : DWARF_COMPOSITION;
  const entry = table[roll3d6];
  if (!entry) {
    // Fallback for out-of-range rolls (shouldn't happen with 3D6 = 3–18)
    const fallback = table[10];
    return {
      composition: fallback?.name ?? 'Unknown',
      densityGcm3: 3.0,
      reactivityDM: fallback?.reactivityDM ?? 0,
    };
  }
  return {
    composition: entry.name,
    densityGcm3: interpolateDensity(entry.densityMin, entry.densityMax, roll2d6),
    reactivityDM: entry.reactivityDM,
  };
}

// ---------------------
// 3.2 Atmosphere Composition — Abiotic
// ---------------------

export interface AtmoCompEntry {
  name: AtmosphereComp;
  tempDM: number;
  hazardBias: { corrosive?: number; toxic?: number };
  habMod: number;
}

export const ATMOSPHERE_COMPOSITION: Record<number, AtmoCompEntry> = {
  3:  { name: 'H-He',            tempDM: -2, hazardBias: {},                       habMod: 0 },
  4:  { name: 'Methane-Ammonia', tempDM: -1, hazardBias: { toxic: 1 },             habMod: -1 },
  5:  { name: 'Methane-Ammonia', tempDM: -1, hazardBias: { toxic: 1 },             habMod: -1 },
  6:  { name: 'Nitrogen-Inert',  tempDM: 0,  hazardBias: {},                       habMod: 0 },
  7:  { name: 'Nitrogen-Inert',  tempDM: 0,  hazardBias: {},                       habMod: 0 },
  8:  { name: 'Nitrogen-Inert',  tempDM: 0,  hazardBias: {},                       habMod: 0 },
  9:  { name: 'Carbon-Dioxide',  tempDM: 1,  hazardBias: {},                       habMod: -1 },
  10: { name: 'Carbon-Dioxide',  tempDM: 1,  hazardBias: {},                       habMod: -1 },
  11: { name: 'Carbon-Dioxide',  tempDM: 1,  hazardBias: {},                       habMod: -1 },
  12: { name: 'Carbon-Dioxide',  tempDM: 1,  hazardBias: {},                       habMod: -1 },
  13: { name: 'Water-Steam',     tempDM: 2,  hazardBias: { corrosive: 1 },         habMod: -2 },
  14: { name: 'Water-Steam',     tempDM: 2,  hazardBias: { corrosive: 1 },         habMod: -2 },
  15: { name: 'Water-Steam',     tempDM: 2,  hazardBias: { corrosive: 1 },         habMod: -2 },
  16: { name: 'Sulfuric',        tempDM: 2,  hazardBias: { corrosive: 2, toxic: 1 }, habMod: -3 },
  17: { name: 'Sulfuric',        tempDM: 2,  hazardBias: { corrosive: 2, toxic: 1 }, habMod: -3 },
  18: { name: 'Exotic',          tempDM: 0,  hazardBias: { toxic: 1 },             habMod: -3 },
};

// ---------------------
// 3.3 Atmosphere Density
// ---------------------

export const ATMOSPHERE_DENSITY_TABLE: Record<number, { density: AtmoDensity; habMod: number }> = {
  2:  { density: 'Trace',     habMod: -3 },
  3:  { density: 'Trace',     habMod: -3 },
  4:  { density: 'Thin',      habMod: -1 },
  5:  { density: 'Thin',      habMod: -1 },
  6:  { density: 'Average',   habMod: 0 },
  7:  { density: 'Average',   habMod: 0 },
  8:  { density: 'Average',   habMod: 0 },
  9:  { density: 'Average',   habMod: 0 },
  10: { density: 'Dense',     habMod: -1 },
  11: { density: 'Dense',     habMod: -1 },
  12: { density: 'Crushing',  habMod: -3 },
};

export function getAtmosphereDensityModifiers(
  reactivityDM: number,
  gravity: number,
  isCeramic: boolean,
  isHHEscape: boolean
): number {
  if (isHHEscape) return -99; // force Trace
  let mod = 0;
  if (reactivityDM >= 2) mod += 1;
  if (reactivityDM <= -1) mod -= 1;
  if (gravity >= 2.0) mod += 2;
  if (gravity <= 0.3) mod -= 2;
  if (isCeramic) mod -= 1;
  return mod;
}

// ---------------------
// 3.4 Biochem Resources (11-tier)
// ---------------------

export interface BiochemEntry {
  tier: BiochemTier;
  habMod: number;
}

export const BIOCHEM_TABLE: Record<number, BiochemEntry> = {
  3:  { tier: 'Scarce',        habMod: -5 },
  4:  { tier: 'Rare',          habMod: -4 },
  5:  { tier: 'Uncommon',      habMod: -3 },
  6:  { tier: 'Poor',          habMod: -2 },
  7:  { tier: 'Poor',          habMod: -2 },
  8:  { tier: 'Deficient',     habMod: -1 },
  9:  { tier: 'Deficient',     habMod: -1 },
  10: { tier: 'Common',        habMod: 0 },
  11: { tier: 'Common',        habMod: 0 },
  12: { tier: 'Abundant',      habMod: 1 },
  13: { tier: 'Abundant',      habMod: 1 },
  14: { tier: 'Rich',          habMod: 2 },
  15: { tier: 'Bountiful',     habMod: 3 },
  16: { tier: 'Prolific',      habMod: 4 },
  17: { tier: 'Inexhaustible', habMod: 5 },
  18: { tier: 'Inexhaustible', habMod: 5 },
};

export function lookupBiochem(modifiedRoll: number): BiochemEntry {
  const clamped = Math.max(3, Math.min(18, modifiedRoll));
  return BIOCHEM_TABLE[clamped];
}

// ---------------------
// 3.5 Biosphere Test — Dice Pool
// ---------------------

export interface DicePool {
  diceCount: number;   // total dice rolled
  keepCount: number;   // dice kept (always 5 for biosphere)
  keepType: 'highest' | 'lowest';
}

/** Build the dice pool from net disadvantage level.
 *  Negative disLevel = advantage; positive = disadvantage.
 */
export function buildBiosphereDicePool(netDisLevel: number): DicePool {
  // Base: 5D6. Each dis level adds 1 die and keeps lowest 5.
  // Each adv level adds 1 die and keeps highest 5.
  const baseDice = 5;
  const keep = 5;
  if (netDisLevel >= 0) {
    return { diceCount: baseDice + netDisLevel, keepCount: keep, keepType: 'lowest' };
  }
  return { diceCount: baseDice + Math.abs(netDisLevel), keepCount: keep, keepType: 'highest' };
}

export function getBiochemHabMod(tier: BiochemTier): number {
  const entry = Object.values(BIOCHEM_TABLE).find(e => e.tier === tier);
  return entry?.habMod ?? 0;
}

// ---------------------
// 3.6 Biosphere Rating
// ---------------------

export function computeBiosphereRating(roll: number, tn: number): { rating: BiosphereRating; habMod: number } {
  const margin = roll - tn;
  if (margin < -5) return { rating: 'B0', habMod: 0 };
  if (margin < 0)  return { rating: 'B1', habMod: 0 };
  if (margin <= 2) return { rating: 'B2', habMod: 1 };
  if (margin <= 5) return { rating: 'B3', habMod: 2 };
  if (margin <= 8) return { rating: 'B4', habMod: 4 };
  if (margin <= 11) return { rating: 'B5', habMod: 6 };
  return { rating: 'B6', habMod: 8 };
}

// ---------------------
// 3.7 Atmosphere Conversion
// ---------------------

export function convertAtmosphere(abiotic: AtmosphereComp, rating: BiosphereRating): AtmosphereComp {
  if (rating < 'B3') return abiotic;
  const isB3 = rating === 'B3';
  switch (abiotic) {
    case 'H-He':            return 'H-He';
    case 'Methane-Ammonia': return isB3 ? 'Methane-Ammonia' : 'Nitrogen-Inert';
    case 'Nitrogen-Inert':  return isB3 ? 'Nitrogen-Inert' : 'Nitrogen-Inert'; // B4+ = N-O
    case 'Carbon-Dioxide':  return isB3 ? 'Carbon-Dioxide' : 'Nitrogen-Inert'; // B4+ = N-O
    case 'Water-Steam':     return isB3 ? 'Water-Steam' : 'Nitrogen-Inert';     // B4+ = humid N-O
    case 'Sulfuric':        return isB3 ? 'Sulfuric' : 'Carbon-Dioxide';
    case 'Exotic':          return 'Exotic';
    default:                return abiotic;
  }
}

/** After conversion, what is the hab mod for the (possibly converted) atmosphere? */
export function getConvertedAtmoHabMod(abiotic: AtmosphereComp, rating: BiosphereRating): number {
  const converted = convertAtmosphere(abiotic, rating);
  if (converted === 'Nitrogen-Inert' && rating >= 'B4') return 0; // N-O is breathable
  // Otherwise use abiotic penalty
  const entry = Object.values(ATMOSPHERE_COMPOSITION).find(e => e.name === abiotic);
  return entry?.habMod ?? 0;
}

// ---------------------
// 4.2 Zone Temperature DM
// ---------------------

export const ZONE_TEMPERATURE_DM: Record<ZoneId, number> = {
  'Infernal': 5,
  'Hot': 3,
  'Conservative': 0,
  'Cool': -2,
  'FrostLine': -3,
  'O1': -4,
  'O2': -5,
  'O3': -6,
  'O4': -7,
  'O5': -8,
};

// ---------------------
// 4.3 Atmosphere Density Greenhouse DM
// ---------------------

export const DENSITY_GREENHOUSE_DM: Record<AtmoDensity, number> = {
  'Trace': -2,
  'Thin': -1,
  'Average': 0,
  'Dense': 1,
  'Crushing': 2,
};

// ---------------------
// 6.3 Hazard (v2)
// ---------------------

export const HAZARD_TABLE_V2: Record<number, { hazard: import('../types').HazardType; habMod: number }> = {
  2:  { hazard: 'None',       habMod: 0 },
  3:  { hazard: 'None',       habMod: 0 },
  4:  { hazard: 'Polluted',   habMod: -1 },
  5:  { hazard: 'Polluted',   habMod: -1 },
  6:  { hazard: 'Polluted',   habMod: -1 },
  7:  { hazard: 'Corrosive',  habMod: -2 },
  8:  { hazard: 'Corrosive',  habMod: -2 },
  9:  { hazard: 'Biohazard',  habMod: -2 },
  10: { hazard: 'Toxic',      habMod: -3 },
  11: { hazard: 'Radioactive',habMod: -4 },
  12: { hazard: 'Radioactive',habMod: -4 },
};

// ---------------------
// 6.4 Hazard Intensity (v2)
// ---------------------

export const HAZARD_INTENSITY_V2: Record<number, { intensity: HazardIntensity; habMod: number }> = {
  2:  { intensity: 'Trace',    habMod: 0 },
  3:  { intensity: 'Trace',    habMod: 0 },
  4:  { intensity: 'Light',    habMod: 0 },
  5:  { intensity: 'Light',    habMod: 0 },
  6:  { intensity: 'Light',    habMod: 0 },
  7:  { intensity: 'Moderate', habMod: -1 },
  8:  { intensity: 'Moderate', habMod: -1 },
  9:  { intensity: 'Moderate', habMod: -1 },
  10: { intensity: 'Heavy',    habMod: -2 },
  11: { intensity: 'Heavy',    habMod: -2 },
  12: { intensity: 'Extreme',  habMod: -3 },
};

// ---------------------
// 6.5 Gravity Modifier (Symmetric)
// ---------------------

export function getGravityHabMod(gravity: number): number {
  if (gravity < 0.1) return -3;
  if (gravity < 0.3) return -2;
  if (gravity < 0.7) return -1;
  if (gravity < 1.3) return 0;
  if (gravity < 1.7) return -1;
  if (gravity < 2.5) return -2;
  return -3;
}

// ---------------------
// 5. Rings
// ---------------------

export function getRingExistenceThreshold(parentType: 'terrestrial' | 'ice' | 'gas'): number {
  switch (parentType) {
    case 'gas': return 7;
    case 'ice': return 9;
    case 'terrestrial': return 11;
  }
}

export const RING_PROMINENCE_TABLE: Record<number, { prominence: RingProminence; label: string }> = {
  2:  { prominence: 'faint',     label: 'Faint dusty band' },
  3:  { prominence: 'faint',     label: 'Faint dusty band' },
  4:  { prominence: 'moderate',  label: 'Moderate ring system' },
  5:  { prominence: 'moderate',  label: 'Moderate ring system' },
  6:  { prominence: 'moderate',  label: 'Moderate ring system' },
  7:  { prominence: 'prominent', label: 'Prominent rings' },
  8:  { prominence: 'prominent', label: 'Prominent rings' },
  9:  { prominence: 'prominent', label: 'Prominent rings' },
  10: { prominence: 'brilliant', label: 'Brilliant rings' },
  11: { prominence: 'brilliant', label: 'Brilliant rings' },
  12: { prominence: 'massive',   label: 'Massive ring system' },
};

// ---------------------
// 4.3 Disk Generation (v2)
// ---------------------

export function getDiskClassModifier(stellarClass: StellarClass): number {
  switch (stellarClass) {
    case 'M': return -1;
    case 'K': return 0;
    case 'G': return 0;
    case 'F': return 1;
    case 'A': return 2;
    case 'B': return 3;
    case 'O': return 4;
  }
}

/** v2 disk count formula. */
export function rollDiskCount(stellarClass: StellarClass): number {
  const exploding = rollExplodingD6(3);
  const baseRoll = sumLowest(exploding, 2);
  const classMod = getDiskClassModifier(stellarClass);
  return Math.max(0, Math.floor((baseRoll + classMod) / 2) - 1);
}

// ---------------------
// 4.7 Hot Jupiter Shepherding Roll
// ---------------------

export function rollShepherdingRetention(stellarClass: StellarClass): number {
  switch (stellarClass) {
    case 'F': {
      // 6D6 keep lowest 4
      const dice = Array.from({ length: 6 }, () => Math.floor(Math.random() * 6) + 1);
      dice.sort((a, b) => a - b);
      const kept = dice.slice(0, 4);
      return 70 + kept.reduce((s, v) => s + v, 0);
    }
    case 'G': {
      // 5D6 keep lowest 4
      const dice = Array.from({ length: 5 }, () => Math.floor(Math.random() * 6) + 1);
      dice.sort((a, b) => a - b);
      const kept = dice.slice(0, 4);
      return 70 + kept.reduce((s, v) => s + v, 0);
    }
    case 'K': {
      // 4D6 straight
      const dice = Array.from({ length: 4 }, () => Math.floor(Math.random() * 6) + 1);
      return 70 + dice.reduce((s, v) => s + v, 0);
    }
    case 'M': {
      // 5D6 keep highest 4
      const dice = Array.from({ length: 5 }, () => Math.floor(Math.random() * 6) + 1);
      dice.sort((a, b) => b - a);
      const kept = dice.slice(0, 4);
      return 70 + kept.reduce((s, v) => s + v, 0);
    }
    default: {
      const dice = Array.from({ length: 4 }, () => Math.floor(Math.random() * 6) + 1);
      return 70 + dice.reduce((s, v) => s + v, 0);
    }
  }
}
