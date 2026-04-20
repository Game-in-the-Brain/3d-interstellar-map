// =====================
// FR-044: Moons / Parent-Child Limit
// =====================

import { v4 as uuidv4 } from 'uuid';
import type { PlanetaryBody, Star, ExtraterrestrialLifeAssumptions } from '../types';
import { rollKeep, roll2D6, roll3D6 } from './dice';
import { rollComposition, getDwarfMass, getTerrestrialMass } from './worldData';
import { recalculatePhysicalProperties } from './physicalProperties';
import { runHabitabilityWaterfall } from './habitabilityPipeline';

const JM_PER_EM = 317.8; // 1 Jupiter Mass ≈ 317.8 Earth Masses
const SOLAR_MASS_IN_EM = 1047 * JM_PER_EM; // ≈ 332,946 Earth masses per solar mass

// ---------------------
// 1. Parent Mass Disadvantage (Child Count)
// ---------------------

/** Return disadvantage level (0–6) for child count roll based on parent mass in EM. */
export function getParentMassDisadvantage(parentMassEM: number): number {
  const parentMassJM = parentMassEM / JM_PER_EM;
  if (parentMassJM >= 3) return 0;           // Super-Jovian
  if (parentMassJM >= 1) return 1;           // Jovian
  if (parentMassJM >= 0.3) return 2;         // Sub-Jovian
  if (parentMassJM >= 0.1) return 3;         // Neptune/Uranus
  if (parentMassJM >= 0.01) return 4;        // Gas-Dwarf
  if (parentMassEM >= 1) return 5;           // Large Terrestrial/Ice
  return 6;                                   // Small Terrestrial/Ice
}

// ---------------------
// 2. Child Count Lookup
// ---------------------

/** Map a 3D6 roll result to number of children. */
export function getChildCountFromRoll(roll: number): number {
  if (roll <= 4) return 0;
  if (roll <= 7) return 1;
  if (roll <= 10) return 2;
  if (roll <= 12) return 3;
  if (roll <= 14) return 4;
  if (roll <= 16) return 5;
  if (roll === 17) return 6;
  // 18: 7 + irregular capture check
  return 7;
}

/** Roll child count with disadvantage, including irregular capture on 18. */
export function rollChildCount(disLevel: number): number {
  const result = rollKeep(3 + disLevel, 6, 3, 'lowest');
  let count = getChildCountFromRoll(result.value);
  if (result.value === 18) {
    const irregular = roll2D6().value;
    if (irregular >= 11) count += 1;
  }
  return count;
}

// ---------------------
// 3. Gas Parent Type Disadvantage (Terrestrial Upgrade)
// ---------------------

/** Return advantage/disadvantage for child type roll on a Gas parent. */
export function getGasParentTypeDisadvantage(parentMassJM: number): number {
  if (parentMassJM > 13) return -1; // Adv+1
  if (parentMassJM >= 3) return 0;  // 3D6 straight
  if (parentMassJM >= 1) return 1;  // Dis+1
  if (parentMassJM >= 0.3) return 2; // Dis+2
  return 3;                          // Dis+3
}

/** Roll child type for a Gas parent. Returns 'terrestrial' on target ≥ 15. */
export function rollChildTypeForGasParent(parentMassJM: number): 'dwarf' | 'terrestrial' {
  const dis = getGasParentTypeDisadvantage(parentMassJM);
  const result = dis < 0
    ? rollKeep(3 + Math.abs(dis), 6, 3, 'highest')
    : rollKeep(3 + dis, 6, 3, 'lowest');
  return result.value >= 15 ? 'terrestrial' : 'dwarf';
}

// ---------------------
// 4. Mass Cap Ratios
// ---------------------

/** Get mass cap ratio for a parent+child combination. */
export function getMassCapRatio(
  parentType: PlanetaryBody['type'],
  childType: 'dwarf' | 'terrestrial'
): number {
  if (parentType === 'terrestrial' || parentType === 'ice') {
    return 0.02; // 2%
  }
  if (parentType === 'gas') {
    return childType === 'terrestrial' ? 0.01 : 0.005; // 1% or 0.5%
  }
  return 0.02;
}

/** Roll mass for a child body using REF-007 tables, capping by parent mass. */
export function rollChildMass(
  childType: 'dwarf' | 'terrestrial',
  parentMassEM: number,
  parentType: PlanetaryBody['type']
): { finalMass: number; wasCapped: boolean; originalMass: number } {
  // Use REF-007 mass tables (2D6 lookup) instead of arbitrary random ranges
  const roll = roll2D6().value;
  let originalMass: number;
  if (childType === 'dwarf') {
    originalMass = getDwarfMass(roll);
  } else {
    originalMass = getTerrestrialMass(roll);
  }

  const capRatio = getMassCapRatio(parentType, childType);
  const cap = parentMassEM * capRatio;
  const finalMass = Math.min(originalMass, cap);

  return {
    finalMass: Math.round(finalMass * 100000) / 100000,
    wasCapped: finalMass < originalMass,
    originalMass: Math.round(originalMass * 100000) / 100000,
  };
}

// ---------------------
// 5. Ring Existence & Classification
// ---------------------

/** Get 2D6 target for ring existence based on parent type. */
export function getRingTarget(parentType: PlanetaryBody['type']): number {
  if (parentType === 'gas') return 8;
  if (parentType === 'ice') return 10;
  return 12;
}

/** Map 3D6 roll to ring class. */
export function getRingClassFromRoll(roll: number): 'faint' | 'visible' | 'showpiece' | 'great' {
  if (roll <= 8) return 'faint';
  if (roll <= 13) return 'visible';
  if (roll <= 17) return 'showpiece';
  return 'great';
}

// ---------------------
// 6. Hill Sphere Positioning
// ---------------------

/** Compute Hill sphere radius in AU.
 *  r_H = a * cbrt(m / (3M))
 *  where a = parent orbital distance (AU)
 *        m = parent mass (Earth masses)
 *        M = star mass (Earth masses)
 */
function computeHillRadiusAU(parentAU: number, parentMassEM: number, starMassEM: number): number {
  return parentAU * Math.cbrt(parentMassEM / (3 * starMassEM));
}

/** Compute Roche limit in AU for a child orbiting a parent.
 *  d_R = R_parent * 2.44 * cbrt(rho_parent / rho_child)
 *
 * Falls back to a conservative 2× parent radius if densities are unknown.
 */
function computeRocheLimitAU(
  parentRadiusKm: number | undefined,
  parentDensityGcm3: number | undefined,
  childDensityGcm3: number | undefined
): number {
  // 1 km = 6.68459e-9 AU
  const KM_TO_AU = 6.68459e-9;

  if (!parentRadiusKm || parentRadiusKm <= 0) {
    return 0.001; // 0.001 AU ≈ 150,000 km fallback
  }

  const parentRadiusAU = parentRadiusKm * KM_TO_AU;

  if (!parentDensityGcm3 || !childDensityGcm3 || parentDensityGcm3 <= 0 || childDensityGcm3 <= 0) {
    // Conservative fallback: 2× parent radius (no density data)
    return parentRadiusAU * 2;
  }

  const ratio = Math.cbrt(parentDensityGcm3 / childDensityGcm3);
  return parentRadiusAU * 2.44 * ratio;
}

/** Position children within parent's Hill sphere. Mutates children in place.
 *  distanceAU is preserved as the parent's star-centric distance.
 *  moonOrbitAU is set to the orbital distance from the parent.
 */
export function positionChildrenInHillSphere(
  parent: PlanetaryBody,
  children: PlanetaryBody[],
  starMassEM: number
): void {
  if (children.length === 0) return;

  const hillRadius = computeHillRadiusAU(parent.distanceAU, parent.mass, starMassEM);
  const maxOrbit = hillRadius * 0.5; // stable region is ~0.5 × Hill radius

  // Sort by mass descending for placement priority
  const sorted = [...children].sort((a, b) => b.mass - a.mass);
  const placed: PlanetaryBody[] = [];

  for (const child of sorted) {
    // Compute Roche limit using actual densities when available
    const rocheLimit = computeRocheLimitAU(
      parent.radiusKm,
      parent.densityGcm3,
      child.densityGcm3
    );

    // Ensure Roche limit doesn't exceed maxOrbit (shouldn't happen for realistic bodies)
    const effectiveMin = Math.min(rocheLimit, maxOrbit * 0.5);
    const effectiveMax = maxOrbit;

    let placedSuccessfully = false;

    for (let attempt = 0; attempt < 5; attempt++) {
      const roll2d6 = roll2D6().value;
      // Map 2–12 to [effectiveMin, effectiveMax] with 2D6 bell curve bias
      const t = (roll2d6 - 2) / 10;
      const distanceFromParent = effectiveMin + t * (effectiveMax - effectiveMin);

      const orbitAU = Math.round(distanceFromParent * 100000) / 100000;

      // Check spacing against already-placed siblings using Hill-fraction separation
      // Minimum separation = 0.15 × Hill radius (generous but prevents overlap)
      const minSepAU = hillRadius * 0.15;

      let conflict = false;
      for (const other of placed) {
        if (Math.abs(orbitAU - (other.moonOrbitAU ?? 0)) < minSepAU) {
          conflict = true;
          break;
        }
      }

      if (!conflict) {
        child.moonOrbitAU = orbitAU;
        placed.push(child);
        placedSuccessfully = true;
        break;
      }
    }

    if (!placedSuccessfully) {
      // Ejected — place at stable Hill edge as fallback
      const orbitAU = Math.round(effectiveMax * 0.95 * 100000) / 100000;
      child.moonOrbitAU = orbitAU;
      child.wasEjected = true;
      child.ejectionReason = 'gravitational';
      placed.push(child);
    }
  }
}

// ---------------------
// 7. Main Entry Point
// ---------------------

export interface Level2ChildrenResult {
  moons: PlanetaryBody[];
  rings: PlanetaryBody[];
}

/** Generate all Level 2 children (moons + rings) for a parent body. */
export function generateLevel2Children(
  parent: PlanetaryBody,
  primaryStar: Star,
  lifePreset: ExtraterrestrialLifeAssumptions
): Level2ChildrenResult {
  const moons: PlanetaryBody[] = [];
  const rings: PlanetaryBody[] = [];

  // Only Terrestrial, Ice, and Gas parents can host children
  if (!['terrestrial', 'ice', 'gas'].includes(parent.type)) {
    return { moons, rings };
  }

  // Step 1: Roll child count
  const disLevel = getParentMassDisadvantage(parent.mass);
  const childCount = rollChildCount(disLevel);

  const parentMassJM = parent.mass / JM_PER_EM;

  // Step 2–5: Generate each child
  for (let i = 0; i < childCount; i++) {
    // Determine child type
    let childType: 'dwarf' | 'terrestrial' = 'dwarf';
    if (parent.type === 'gas') {
      childType = rollChildTypeForGasParent(parentMassJM);
    }

    // Roll mass and apply cap
    const massResult = rollChildMass(childType, parent.mass, parent.type);

    // Build base body
    const child: PlanetaryBody = {
      id: uuidv4(),
      type: childType,
      mass: massResult.finalMass,
      zone: parent.zone,
      distanceAU: parent.distanceAU, // star-centric distance = parent's distance
      parentId: parent.id,
      level: 2,
      parentDistanceAU: parent.distanceAU,
      wasCapturedTerrestrial: childType === 'terrestrial',
      massCapApplied: massResult.wasCapped,
      originalRolledMass: massResult.originalMass,
    };

    // Step 4: Composition + physical properties
    const comp3d6 = roll3D6().value;
    const comp2d6 = roll2D6().value;
    const comp = rollComposition(childType, comp3d6, comp2d6);
    child.composition = comp.composition;
    child.reactivityDM = comp.reactivityDM;
    const phys = recalculatePhysicalProperties(child.mass, comp.densityGcm3);
    child.densityGcm3 = phys.densityGcm3;
    child.radiusKm = phys.radiusKm;
    child.diameterKm = phys.diameterKm;
    child.surfaceGravityG = phys.surfaceGravityG;
    child.escapeVelocityMs = phys.escapeVelocityMs;

    // Step 5: Habitability waterfall (pass parent for proto-star heat + tidal heating)
    runHabitabilityWaterfall(child, lifePreset, parent);

    moons.push(child);
  }

  // Step 6: Rings
  const ringTarget = getRingTarget(parent.type);
  const ringRoll = roll2D6().value;
  if (ringRoll >= ringTarget) {
    const densityRoll = roll3D6().value;
    const ringClass = getRingClassFromRoll(densityRoll);
    const ring: PlanetaryBody = {
      id: uuidv4(),
      type: 'ring',
      mass: 0,
      zone: parent.zone,
      distanceAU: parent.distanceAU, // star-centric distance = parent's distance
      parentId: parent.id,
      level: 2,
      ringClass,
    };
    rings.push(ring);
  }

  // Step 7: Position all children within parent's Hill sphere
  const starMassEM = primaryStar.mass * SOLAR_MASS_IN_EM;
  positionChildrenInHillSphere(parent, [...moons, ...rings], starMassEM);

  return { moons, rings };
}
