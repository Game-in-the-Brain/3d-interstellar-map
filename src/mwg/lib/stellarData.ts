import type { StellarClass, StellarGrade, ZoneBoundaries, Zone, OuterZoneBoundaries } from '../types';

// =====================
// Stellar Mass by Class and Grade (M☉)
// =====================

export const STELLAR_MASS: Record<StellarClass, readonly number[]> = {
  O: [128.0, 116.8, 105.6, 94.4, 83.2, 72.0, 60.8, 49.6, 38.4, 27.2],
  B: [16.0, 14.61, 13.22, 11.83, 10.44, 9.05, 7.66, 6.27, 4.88, 3.49],
  A: [2.1, 2.03, 1.96, 1.89, 1.82, 1.75, 1.68, 1.61, 1.54, 1.47],
  F: [1.4, 1.36, 1.33, 1.29, 1.26, 1.22, 1.18, 1.15, 1.11, 1.08],
  G: [1.04, 1.02, 0.99, 0.97, 0.94, 0.92, 0.90, 0.87, 0.85, 0.82],
  K: [0.80, 0.77, 0.73, 0.70, 0.66, 0.63, 0.59, 0.56, 0.52, 0.49],
  M: [0.45, 0.41, 0.38, 0.34, 0.30, 0.27, 0.23, 0.19, 0.15, 0.12],
} as const;

// =====================
// Stellar Luminosity by Class and Grade (L☉)
// =====================

export const STELLAR_LUMINOSITY: Record<StellarClass, readonly number[]> = {
  O: [3516325, 2071113, 1219884, 718510, 423202, 249266, 146817, 86475, 50934, 30000],
  B: [14752.9, 7260.98, 3573.66, 1758.86, 865.66, 426.06, 209.69, 103.21, 50.8, 25.0],
  A: [23.0, 21.2, 19.4, 17.6, 15.8, 14.0, 12.2, 10.4, 8.6, 5.0],
  F: [4.65, 4.34, 4.02, 3.71, 3.39, 3.08, 2.76, 2.45, 2.13, 1.5],
  G: [1.41, 1.33, 1.25, 1.17, 1.09, 1.01, 0.92, 0.84, 0.76, 0.60],
  K: [0.55, 0.50, 0.45, 0.41, 0.36, 0.31, 0.27, 0.22, 0.17, 0.08],
  M: [0.07, 0.07, 0.06, 0.05, 0.05, 0.04, 0.03, 0.03, 0.02, 0.01],
} as const;

// =====================
// Stellar Temperature by Class and Grade (K)
// =====================

export const STELLAR_TEMPERATURE: Record<StellarClass, readonly number[]> = {
  O: [50000, 47000, 44000, 41000, 38000, 35000, 33000, 31000, 30000, 30000],
  B: [30000, 25000, 22000, 18500, 16000, 15000, 14000, 13000, 11500, 10500],
  A: [10000, 9750, 9500, 9250, 9000, 8750, 8500, 8250, 8000, 7500],
  F: [7500, 7300, 7100, 6900, 6700, 6500, 6400, 6300, 6200, 6000],
  G: [6000, 5900, 5850, 5800, 5750, 5700, 5600, 5500, 5400, 5200],
  K: [5200, 5000, 4800, 4600, 4400, 4200, 4000, 3900, 3800, 3700],
  M: [3700, 3600, 3500, 3400, 3300, 3200, 3100, 3000, 2800, 2400],
} as const;

// =====================
// Star Class Metadata
// =====================

export const STAR_COLORS: Record<StellarClass, string> = {
  O: '#a8d8ff',
  B: '#6bb6ff',
  A: '#ffffff',
  F: '#fff8e1',
  G: '#ffecb3',
  K: '#ffcc80',
  M: '#ff8a65',
};

// QA-031: Simplified human-readable stellar spectrum names
export const STAR_COLOR_NAMES: Record<StellarClass, string> = {
  O: 'Blue-White',
  B: 'Pale Blue',
  A: 'White',
  F: 'Yellow-White',
  G: 'Yellow',
  K: 'Orange',
  M: 'Orange-Red',
};

export const STAR_DESCRIPTIONS: Record<StellarClass, string> = {
  O: 'Hottest, most massive',
  B: 'Very hot, very massive',
  A: 'Hot, white',
  F: 'Yellowish white',
  G: 'Yellowish white (Sun-like)',
  K: 'Pale yellow orange',
  M: 'Light orange red, coolest',
};

export const CLASS_RANK: Record<StellarClass, number> = {
  O: 7, B: 6, A: 5, F: 4, G: 3, K: 2, M: 1
};

// =====================
// Class/Grade from 5D6
// =====================

export function getClassFromRoll(roll: number): StellarClass {
  if (roll >= 30) return 'O';
  if (roll >= 28) return 'B';
  if (roll >= 26) return 'A';
  if (roll >= 24) return 'F';
  if (roll >= 22) return 'G';
  if (roll >= 20) return 'K';
  return 'M';
}

export function getGradeFromRoll(roll: number): StellarGrade {
  if (roll <= 17) return 9;
  if (roll <= 20) return 8;
  if (roll <= 22) return 7;
  if (roll <= 24) return 6;
  if (roll === 25) return 5;
  if (roll === 26) return 4;
  if (roll === 27) return 3;
  if (roll === 28) return 2;
  if (roll === 29) return 1;
  return 0;
}

// =====================
// Stellar Properties
// =====================

export function getStellarMass(stellarClass: StellarClass, grade: StellarGrade): number {
  return STELLAR_MASS[stellarClass][grade];
}

export function getStellarLuminosity(stellarClass: StellarClass, grade: StellarGrade): number {
  return STELLAR_LUMINOSITY[stellarClass][grade];
}

export function getStellarTemperature(stellarClass: StellarClass, grade: StellarGrade): number {
  return STELLAR_TEMPERATURE[stellarClass][grade];
}

// =====================
// Zone Calculations
// =====================

export function calculateZoneBoundaries(luminosity: number): ZoneBoundaries {
  const sqrtL = Math.sqrt(luminosity);
  
  return {
    infernal: { min: 0, max: round(sqrtL * 0.4, 2) },
    hot: { min: round(sqrtL * 0.4, 2), max: round(sqrtL * 0.8, 2) },
    conservative: { min: round(sqrtL * 0.8, 2), max: round(sqrtL * 1.2, 2) },
    cold: { min: round(sqrtL * 1.2, 2), max: round(sqrtL * 4.85, 2) },
    outer: { min: round(sqrtL * 4.85, 2), max: null },
  };
}

export function getZoneForDistance(distance: number, zones: ZoneBoundaries): Zone {
  if (distance < zones.hot.min) return 'Infernal';
  if (distance < zones.conservative.min) return 'Hot';
  if (distance < zones.cold.min) return 'Conservative';
  if (distance < zones.outer.min) return 'Cold';
  return 'Outer';
}

// =====================
// V2 Zone Architecture (FR-042)
// =====================

export interface V2ZoneData {
  heliopauseAU: number;
  frostLineAU: number;
  outerSystemZones: OuterZoneBoundaries;
}

export function calculateV2Zones(luminosity: number): V2ZoneData {
  const sqrtL = Math.sqrt(luminosity);
  const frostLineAU = round(sqrtL * 4.85, 2);
  const heliopauseAU = round(sqrtL * 120, 2);
  const outerSpan = heliopauseAU - frostLineAU;

  // Geometric growth: O1=3.125%, O2=6.25%, O3=12.5%, O4=25%, O5=50%
  const o1Width = outerSpan * 0.03125;
  const o2Width = outerSpan * 0.0625;
  const o3Width = outerSpan * 0.125;
  const o4Width = outerSpan * 0.25;
  // O5 gets the remainder

  const outerSystemZones: OuterZoneBoundaries = {
    o1: { minAU: frostLineAU, maxAU: round(frostLineAU + o1Width, 2) },
    o2: { minAU: round(frostLineAU + o1Width, 2), maxAU: round(frostLineAU + o1Width + o2Width, 2) },
    o3: { minAU: round(frostLineAU + o1Width + o2Width, 2), maxAU: round(frostLineAU + o1Width + o2Width + o3Width, 2) },
    o4: { minAU: round(frostLineAU + o1Width + o2Width + o3Width, 2), maxAU: round(frostLineAU + o1Width + o2Width + o3Width + o4Width, 2) },
    o5: { minAU: round(frostLineAU + o1Width + o2Width + o3Width + o4Width, 2), maxAU: heliopauseAU },
  };

  return { heliopauseAU, frostLineAU, outerSystemZones };
}



// =====================
// Companion Star Logic
// =====================

export function getCompanionTarget(classRank: number): number {
  // O=7 → 4+, B=6 → 5+, A=5 → 6+, F=4 → 7+, G=3 → 8+, K=2 → 9+, M=1 → 10+
  return 11 - classRank;
}

export function constrainCompanionClass(
  rolledClass: StellarClass,
  previousClass: StellarClass
): StellarClass {
  const rolledRank = CLASS_RANK[rolledClass];
  const previousRank = CLASS_RANK[previousClass];
  
  if (rolledRank <= previousRank) {
    return rolledClass;
  }
  
  // Scale down: scaledRank = round(rolledRank × (previousRank / 7))
  const scaledRank = Math.round(rolledRank * (previousRank / 7));
  const constrainedRank = Math.max(1, Math.min(7, scaledRank));
  
  // Convert rank back to class
  const classes: StellarClass[] = ['M', 'K', 'G', 'F', 'A', 'B', 'O'];
  return classes[constrainedRank - 1];
}

export function constrainCompanionGrade(
  rolledGrade: StellarGrade,
  previousGrade: StellarGrade
): StellarGrade {
  // Grade 0 = most luminous, Grade 9 = least luminous
  // If rolled grade < previous grade (too luminous), scale it
  if (rolledGrade >= previousGrade) {
    return rolledGrade;
  }
  
  // Scale up: scaledGrade = round(rolledGrade × (previousGrade / 9))
  const scaledGrade = Math.round(rolledGrade * (previousGrade / 9));
  return Math.max(previousGrade, Math.min(9, scaledGrade)) as StellarGrade;
}

// =====================
// Companion Orbit Table
// =====================

export function getCompanionOrbitDistance(previousClass: StellarClass, roll: number): number {
  // Roll is 3D6
  const baseDistances: Record<StellarClass, number> = {
    O: 120, B: 80, A: 60, F: 50, G: 40, K: 30, M: 20
  };
  
  const base = baseDistances[previousClass];
  const multiplier = 0.5 + (roll / 36) * 1.5; // 0.5 to 2.0
  
  return round(base * multiplier, 1);
}

// =====================
// Utility
// =====================

function round(value: number, decimals: number = 2): number {
  return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
}
