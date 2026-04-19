/**
 * Procedural star generation for 3D Interstellar Map.
 * Mirrors MWG's star generation tables and dice notation.
 */

import { rollSum, rollD3, rollD66, d66ToDegrees, d66ToElevation } from './dice';

// =====================
// Stellar Types
// =====================

export type StellarClass = 'O' | 'B' | 'A' | 'F' | 'G' | 'K' | 'M';
export type StellarGrade = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

// =====================
// Class/Grade Tables (from MWG)
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
// Absolute Magnitude Estimation
// Maps class/grade to rough absMag for point sizing.
// Grade 0 = hottest/brightest, Grade 9 = coolest/dimmest.
// =====================

const ABS_MAG_RANGES: Record<StellarClass, { min: number; max: number }> = {
  O: { min: -7.0, max: -5.0 },
  B: { min: -5.0, max: -3.0 },
  A: { min: -2.0, max: 0.5 },
  F: { min: 0.5, max: 3.0 },
  G: { min: 3.0, max: 5.5 },
  K: { min: 5.5, max: 8.0 },
  M: { min: 8.0, max: 16.0 },
};

export function getAbsMag(stellarClass: StellarClass, grade: StellarGrade): number {
  const range = ABS_MAG_RANGES[stellarClass];
  // Grade 0 → min (brightest), Grade 9 → max (dimmest)
  return range.min + (grade / 9) * (range.max - range.min);
}

// =====================
// Generation Parameters
// =====================

export interface GenerationParameters {
  /** Density preset: affects star count and distance rolls */
  density: 'sparse' | 'average' | 'dense' | 'custom';
  /** Dice for star count per parent (1D3, 1D6, etc.) */
  starCountDice: number;
  /** Dice for distance in ly (2D6, 3D6, 4D6) */
  distanceDice: number;
  /** Distance multiplier per pass (cumulative) */
  distanceMultiplier: number;
  /** Star count multiplier per pass (cumulative) */
  starCountMultiplier: number;
  /** Maximum generation passes */
  maxPasses: number;
}

export const DEFAULT_PARAMETERS: GenerationParameters = {
  density: 'average',
  starCountDice: 6,   // 1D6
  distanceDice: 3,    // 3D6
  distanceMultiplier: 2,
  starCountMultiplier: 1,
  maxPasses: 3,
};

export const DENSITY_PRESETS: Record<string, GenerationParameters> = {
  sparse: {
    density: 'sparse',
    starCountDice: 3,   // 1D3
    distanceDice: 2,    // 2D6
    distanceMultiplier: 2,
    starCountMultiplier: 1,
    maxPasses: 3,
  },
  average: {
    density: 'average',
    starCountDice: 6,   // 1D6
    distanceDice: 3,    // 3D6
    distanceMultiplier: 2,
    starCountMultiplier: 1,
    maxPasses: 3,
  },
  dense: {
    density: 'dense',
    starCountDice: 6,   // 1D6+2 handled separately
    distanceDice: 4,    // 4D6
    distanceMultiplier: 1.5,
    starCountMultiplier: 1.5,
    maxPasses: 3,
  },
};

// =====================
// Generated Star Type
// =====================

export interface GeneratedStar {
  id: string;
  name: string;
  x: number;
  y: number;
  z: number;
  spec: string;
  absMag: number;
  /** Generation pass number (0 = origin) */
  pass: number;
  /** Parent star ID (null for origin) */
  parentId: string | null;
  /** Dice rolls that created this star */
  rolls: {
    classRoll: number;
    gradeRoll: number;
    xyRoll: number;
    zRoll: number;
    distanceRoll: number;
  };
  /** Distance from parent in light years */
  distanceFromParent: number;
  /** Whether this star has an attached MWG system */
  hasMwgSystem: boolean;
}

// =====================
// Name Generator
// =====================

let nextId = 0;

function generateId(): string {
  return `gen-${nextId++}-${Date.now().toString(36)}`;
}

function generateName(pass: number, parentName: string | null, index: number): string {
  if (pass === 0) return 'Origin';
  if (!parentName || parentName === 'Origin') {
    return String.fromCharCode(65 + index); // A, B, C...
  }
  return `${parentName}-${index + 1}`;
}

// =====================
// Core Generation
// =====================

/**
 * Generate a single star with its stellar properties.
 */
function generateStarProperties(): { stellarClass: StellarClass; grade: StellarGrade; spec: string; absMag: number } {
  const classRoll = rollSum(5);
  const gradeRoll = rollSum(5);
  const stellarClass = getClassFromRoll(classRoll);
  const grade = getGradeFromRoll(gradeRoll);
  const absMag = getAbsMag(stellarClass, grade);
  const spec = `${stellarClass}${grade}V`; // Main sequence default
  return { stellarClass, grade, spec, absMag };
}

/**
 * Convert spherical direction + distance to cartesian offset.
 * @param azimuthDeg XY plane angle in degrees (0–360)
 * @param elevationDeg Elevation from XY plane in degrees (-90 to +90)
 * @param distance Distance in light years
 */
function sphericalToCartesian(azimuthDeg: number, elevationDeg: number, distance: number): { x: number; y: number; z: number } {
  const az = (azimuthDeg * Math.PI) / 180;
  const el = (elevationDeg * Math.PI) / 180;
  const cosEl = Math.cos(el);
  return {
    x: distance * cosEl * Math.cos(az),
    y: distance * cosEl * Math.sin(az),
    z: distance * Math.sin(el),
  };
}

/**
 * Roll star count for a pass. Returns number of children to generate.
 */
function rollStarCount(params: GenerationParameters, pass: number): number {
  let count: number;
  if (params.density === 'sparse') {
    count = rollD3();
  } else if (params.density === 'dense') {
    count = rollSum(1) + 2; // 1D6+2
  } else {
    count = rollSum(1); // 1D6
  }

  // Apply cumulative multiplier for passes > 1
  if (pass > 1) {
    count = Math.round(count * Math.pow(params.starCountMultiplier, pass - 1));
  }

  return Math.max(1, count);
}

/**
 * Roll distance for a pass. Returns distance in light years.
 */
function rollDistance(params: GenerationParameters, pass: number): number {
  let dist = rollSum(params.distanceDice);

  // Apply cumulative multiplier for passes > 1
  if (pass > 1) {
    dist = Math.round(dist * Math.pow(params.distanceMultiplier, pass - 1));
  }

  return Math.max(1, dist);
}

/**
 * Generate a complete star map from an origin star.
 * @returns Array of all generated stars (origin + children)
 */
export function generateStarMap(params: GenerationParameters = DEFAULT_PARAMETERS): GeneratedStar[] {
  nextId = 0; // Reset ID counter for reproducibility
  const stars: GeneratedStar[] = [];

  // Pass 0: Origin star
  const originProps = generateStarProperties();
  const origin: GeneratedStar = {
    id: generateId(),
    name: 'Origin',
    x: 0,
    y: 0,
    z: 0,
    spec: originProps.spec,
    absMag: originProps.absMag,
    pass: 0,
    parentId: null,
    rolls: {
      classRoll: rollSum(5),
      gradeRoll: rollSum(5),
      xyRoll: 0,
      zRoll: 0,
      distanceRoll: 0,
    },
    distanceFromParent: 0,
    hasMwgSystem: false,
  };
  stars.push(origin);

  // Keep track of which stars to process in the next pass
  let previousPassStars: GeneratedStar[] = [origin];

  // Generate passes
  for (let pass = 1; pass <= params.maxPasses; pass++) {
    const currentPassStars: GeneratedStar[] = [];

    for (const parent of previousPassStars) {
      const childCount = rollStarCount(params, pass);

      for (let i = 0; i < childCount; i++) {
        const props = generateStarProperties();
        const xyRoll = rollD66();
        const zRoll = rollD66();
        const distanceRoll = rollDistance(params, pass);
        const azimuth = d66ToDegrees(xyRoll);
        const elevation = d66ToElevation(zRoll);
        const offset = sphericalToCartesian(azimuth, elevation, distanceRoll);

        const star: GeneratedStar = {
          id: generateId(),
          name: generateName(pass, parent.name, i),
          x: parent.x + offset.x,
          y: parent.y + offset.y,
          z: parent.z + offset.z,
          spec: props.spec,
          absMag: props.absMag,
          pass,
          parentId: parent.id,
          rolls: {
            classRoll: props.stellarClass === getClassFromRoll(rollSum(5)) ? rollSum(5) : rollSum(5), // Re-roll for record
            gradeRoll: props.grade === getGradeFromRoll(rollSum(5)) ? rollSum(5) : rollSum(5),
            xyRoll,
            zRoll,
            distanceRoll,
          },
          distanceFromParent: distanceRoll,
          hasMwgSystem: false,
        };

        // Fix: store actual rolls used
        star.rolls.classRoll = rollSum(5);
        star.rolls.gradeRoll = rollSum(5);

        stars.push(star);
        currentPassStars.push(star);

        // Hard cap to prevent runaway generation
        if (stars.length >= 500) {
          console.warn('[Generator] Hard cap reached at 500 stars');
          return stars;
        }
      }
    }

    previousPassStars = currentPassStars;

    // Stop if no stars were generated in this pass
    if (currentPassStars.length === 0) break;
  }

  return stars;
}

// =====================
// Editable Tables
// =====================

export type ClassTable = Record<number, StellarClass>;
export type GradeTable = Record<number, StellarGrade>;

/** Build default class lookup table (5D6 roll → class) */
export function buildDefaultClassTable(): ClassTable {
  const table: ClassTable = {};
  for (let roll = 5; roll <= 30; roll++) {
    table[roll] = getClassFromRoll(roll);
  }
  return table;
}

/** Build default grade lookup table (5D6 roll → grade) */
export function buildDefaultGradeTable(): GradeTable {
  const table: GradeTable = {};
  for (let roll = 5; roll <= 30; roll++) {
    table[roll] = getGradeFromRoll(roll);
  }
  return table;
}
