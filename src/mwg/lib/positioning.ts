// =====================
// FR-042: V2 Positioning System — 4-Phase Placement Algorithm
// =====================

import type { PlanetaryBody, Star, ZoneBoundaries, ZoneId } from '../types';
import { roll3D6 } from './dice';
import { calculateV2Zones, type V2ZoneData } from './stellarData';

const EM_PER_SOLAR_MASS = 333000; // 1 M☉ ≈ 333,000 Earth Masses

// ---------------------
// Zone Roll Functions
// ---------------------

/** Unified 3D6 → ZoneId (Step 1: inner/frost/outer). */
export function rollUnifiedZone(): ZoneId {
  const roll = roll3D6().value;
  if (roll === 3) return 'Infernal';
  if (roll <= 7) return 'Hot';
  if (roll <= 11) return 'Conservative';
  if (roll <= 13) return 'Cool';
  if (roll === 14) return 'FrostLine';
  return rollOuterZone();
}

/** Step 2: outer zone 3D6 → O1–O5. */
export function rollOuterZone(): ZoneId {
  const roll = roll3D6().value;
  if (roll <= 9) return 'O1';
  if (roll <= 11) return 'O2';
  if (roll <= 13) return 'O3';
  if (roll <= 17) return 'O4';
  return 'O5';
}

/** Roll position (AU) within a zone, uniformly distributed. */
export function rollPositionInZone(zone: ZoneId, v2: V2ZoneData, zones: ZoneBoundaries): number {

  switch (zone) {
    case 'Infernal': {
      const min = zones.infernal.min;
      const max = zones.infernal.max;
      return min + Math.random() * (max - min);
    }
    case 'Hot': {
      const min = zones.hot.min;
      const max = zones.hot.max;
      return min + Math.random() * (max - min);
    }
    case 'Conservative': {
      const min = zones.conservative.min;
      const max = zones.conservative.max;
      return min + Math.random() * (max - min);
    }
    case 'Cool': {
      const min = zones.cold.min;
      const max = zones.cold.max;
      return min + Math.random() * (max - min);
    }
    case 'FrostLine': {
      // Frost line anchor with 3D6 jitter ±7%
      const jitter = roll3D6().value * 0.01 - 0.10;
      return v2.frostLineAU * (1 + jitter);
    }
    case 'O1': return v2.outerSystemZones.o1.minAU + Math.random() * (v2.outerSystemZones.o1.maxAU - v2.outerSystemZones.o1.minAU);
    case 'O2': return v2.outerSystemZones.o2.minAU + Math.random() * (v2.outerSystemZones.o2.maxAU - v2.outerSystemZones.o2.minAU);
    case 'O3': return v2.outerSystemZones.o3.minAU + Math.random() * (v2.outerSystemZones.o3.maxAU - v2.outerSystemZones.o3.minAU);
    case 'O4': return v2.outerSystemZones.o4.minAU + Math.random() * (v2.outerSystemZones.o4.maxAU - v2.outerSystemZones.o4.minAU);
    case 'O5': return v2.outerSystemZones.o5.minAU + Math.random() * (v2.outerSystemZones.o5.maxAU - v2.outerSystemZones.o5.minAU);
  }
}

/** Get min/max AU bounds for an outer zone. */
function getOuterZoneBounds(zone: ZoneId, v2: V2ZoneData): { minAU: number; maxAU: number } {
  switch (zone) {
    case 'O1': return v2.outerSystemZones.o1;
    case 'O2': return v2.outerSystemZones.o2;
    case 'O3': return v2.outerSystemZones.o3;
    case 'O4': return v2.outerSystemZones.o4;
    case 'O5': return v2.outerSystemZones.o5;
    default: return v2.outerSystemZones.o1; // fallback
  }
}

// ---------------------
// Hill Sphere & Conflict
// ---------------------

/** Compute Hill sphere radius in AU. */
export function computeHillSphere(bodyMassEM: number, orbitalAU: number, starMassEM: number): number {
  return orbitalAU * Math.cbrt(bodyMassEM / (3 * starMassEM));
}

/** Check if two bodies' Hill spheres conflict (within 4× max radius). */
export function hasConflict(body: PlanetaryBody, placedBodies: PlanetaryBody[], starMassEM: number): boolean {
  const bodyHill = computeHillSphere(body.mass, body.distanceAU, starMassEM);
  for (const other of placedBodies) {
    if (other.id === body.id) continue;
    const otherHill = computeHillSphere(other.mass, other.distanceAU, starMassEM);
    const minSep = 4.0 * Math.max(bodyHill, otherHill);
    const sep = Math.abs(body.distanceAU - other.distanceAU);
    if (sep < minSep) return true;
  }
  return false;
}

// ---------------------
// Disk Blocking
// ---------------------

/** Check if a body is blocked by a disk in the given zone. */
export function isBlockedByDisk(body: PlanetaryBody, zone: ZoneId, diskZones: Set<ZoneId>): boolean {
  if (!diskZones.has(zone)) return false;
  // Terrestrials are blocked by disks
  if (body.type === 'terrestrial') return true;
  // Gas/Ice Giants are blocked (would have consumed the disk)
  if (body.type === 'gas' || body.type === 'ice') return true;
  // Dwarfs coexist with disks
  return false;
}

// ---------------------
// Hot Jupiter Stability Roll
// ---------------------

/** 5D6 keep lowest 3, sum >= 5 = stable. */
export function hotJupiterStabilityRoll(): { sum: number; stable: boolean } {
  const dice = Array.from({ length: 5 }, () => Math.floor(Math.random() * 6) + 1);
  dice.sort((a, b) => a - b);
  const kept = dice.slice(0, 3);
  const sum = kept.reduce((s, v) => s + v, 0);
  return { sum, stable: sum >= 5 };
}

/** Roll shepherding retention percentage (70 + roll). */
export function rollShepherdingRetention(stellarClass: string): number {
  switch (stellarClass) {
    case 'F': {
      const dice = Array.from({ length: 6 }, () => Math.floor(Math.random() * 6) + 1);
      dice.sort((a, b) => a - b);
      return 70 + dice.slice(0, 4).reduce((s, v) => s + v, 0);
    }
    case 'G': {
      const dice = Array.from({ length: 5 }, () => Math.floor(Math.random() * 6) + 1);
      dice.sort((a, b) => a - b);
      return 70 + dice.slice(0, 4).reduce((s, v) => s + v, 0);
    }
    case 'K': {
      const dice = Array.from({ length: 4 }, () => Math.floor(Math.random() * 6) + 1);
      return 70 + dice.reduce((s, v) => s + v, 0);
    }
    case 'M': {
      const dice = Array.from({ length: 5 }, () => Math.floor(Math.random() * 6) + 1);
      dice.sort((a, b) => b - a);
      return 70 + dice.slice(0, 4).reduce((s, v) => s + v, 0);
    }
    default: {
      const dice = Array.from({ length: 4 }, () => Math.floor(Math.random() * 6) + 1);
      return 70 + dice.reduce((s, v) => s + v, 0);
    }
  }
}

// ---------------------
// Main Placement Algorithm
// ---------------------

export interface V2PlacementResult {
  placedBodies: PlanetaryBody[];
  ejectedBodies: PlanetaryBody[];
  consumedBodies: PlanetaryBody[];
}

/** 4-phase placement algorithm. */
export function placeBodiesV2(
  disks: PlanetaryBody[],
  dwarfs: PlanetaryBody[],
  terrestrials: PlanetaryBody[],
  ices: PlanetaryBody[],
  gases: PlanetaryBody[],
  primaryStar: Star,
  zones: ZoneBoundaries
): V2PlacementResult {
  const v2 = calculateV2Zones(primaryStar.luminosity);
  const starMassEM = primaryStar.mass * EM_PER_SOLAR_MASS;

  const placed: PlanetaryBody[] = [];
  const ejected: PlanetaryBody[] = [];
  const consumed: PlanetaryBody[] = [];

  // Track which zones have disks
  const diskZones = new Set<ZoneId>();

  // Helper: mark a body as placed
  const markPlaced = (body: PlanetaryBody, zone: ZoneId, au: number) => {
    body.zone = zone as unknown as typeof body.zone; // cast for compatibility
    body.distanceAU = Math.round(au * 100) / 100;
    body.positionRoll = body.positionRoll ?? roll3D6().value;
    placed.push(body);
  };

  // =====================
  // Phase A — Anchors
  // =====================

  // A1: Largest Gas/Ice Giant → frost line anchor
  const allGasIce = [...gases, ...ices].sort((a, b) => b.mass - a.mass);
  if (allGasIce.length > 0) {
    const largest = allGasIce[0];
    const jitter = roll3D6().value * 0.01 - 0.10;
    const au = v2.frostLineAU * (1 + jitter);
    markPlaced(largest, 'FrostLine', au);
  }

  // A2: Largest Terrestrial → unified roll
  const sortedTerrestrials = [...terrestrials].sort((a, b) => b.mass - a.mass);
  if (sortedTerrestrials.length > 0) {
    const largest = sortedTerrestrials[0];
    const zone = rollUnifiedZone();
    const au = rollPositionInZone(zone, v2, zones);
    markPlaced(largest, zone, au);
  }

  // =====================
  // Phase B — Disks FIRST
  // =====================

  for (const disk of disks) {
    const zone = rollUnifiedZone();
    const au = rollPositionInZone(zone, v2, zones);
    diskZones.add(zone);
    markPlaced(disk, zone, au);
  }

  // =====================
  // Phase C — Remaining bodies (mass-descending)
  // =====================

  // Gather all unplaced non-disk bodies
  const placedIds = new Set(placed.map(b => b.id));
  const remaining = [
    ...gases.filter(b => !placedIds.has(b.id)),
    ...ices.filter(b => !placedIds.has(b.id)),
    ...terrestrials.filter(b => !placedIds.has(b.id)),
    ...dwarfs,
  ].sort((a, b) => b.mass - a.mass);

  const innerZones: ZoneId[] = ['Infernal', 'Hot', 'Conservative', 'Cool'];

  for (const body of remaining) {
    // Ice Worlds → skip unified, roll outer directly.
    // Check Hill sphere conflict; on conflict nudge inward/outward (1D6 direction).
    // If nudge fails in the assigned zone, try remaining outer zones before ejecting.
    // With 5 outer zones (O1–O5), ejection is statistically near-impossible.
    if (body.type === 'ice') {
      const outerZoneOrder: ZoneId[] = ['O1', 'O2', 'O3', 'O4', 'O5'];
      const firstZone = rollOuterZone();
      // Try assigned zone first, then remaining outer zones in order
      const tryOrder = [firstZone, ...outerZoneOrder.filter(z => z !== firstZone)];
      let iceWorldPlaced = false;

      for (const zone of tryOrder) {
        let au = rollPositionInZone(zone, v2, zones);
        body.distanceAU = Math.round(au * 100) / 100;
        body.zone = zone as unknown as typeof body.zone;

        if (!hasConflict(body, placed, starMassEM)) {
          markPlaced(body, zone, au);
          iceWorldPlaced = true;
          break;
        }

        // Conflict — try nudging within this zone
        const bodyHill = computeHillSphere(body.mass, au, starMassEM);
        const conflicting = placed.find(other => {
          if (other.id === body.id) return false;
          const otherHill = computeHillSphere(other.mass, other.distanceAU, starMassEM);
          const minSep = 4.0 * Math.max(bodyHill, otherHill);
          return Math.abs(au - other.distanceAU) < minSep;
        });
        if (conflicting) {
          const otherHill = computeHillSphere(conflicting.mass, conflicting.distanceAU, starMassEM);
          const minSep = 4.0 * Math.max(bodyHill, otherHill);
          const zoneBounds = getOuterZoneBounds(zone, v2);
          // Roll 1D6: 1–3 = nudge inward, 4–6 = nudge outward
          const directionRoll = Math.floor(Math.random() * 6) + 1;
          let nudgedAU: number;

          if (directionRoll <= 3) {
            nudgedAU = conflicting.distanceAU - minSep;
            if (nudgedAU < zoneBounds.minAU) nudgedAU = conflicting.distanceAU + minSep;
          } else {
            nudgedAU = conflicting.distanceAU + minSep;
            if (nudgedAU > zoneBounds.maxAU) nudgedAU = conflicting.distanceAU - minSep;
          }

          if (nudgedAU >= zoneBounds.minAU && nudgedAU <= zoneBounds.maxAU) {
            body.distanceAU = Math.round(nudgedAU * 100) / 100;
            if (!hasConflict(body, placed, starMassEM)) {
              markPlaced(body, zone, nudgedAU);
              iceWorldPlaced = true;
              break;
            }
          }
        }
        // This zone didn't work — try next outer zone
      }

      if (!iceWorldPlaced) {
        // All 5 outer zones exhausted (statistically near-impossible)
        body.wasEjected = true;
        body.ejectionReason = 'saturation';
        ejected.push(body);
      }
      continue;
    }

    // Gas Giants → check Hot Jupiter trigger in inner zones
    if (body.type === 'gas') {
      const targetZone = rollUnifiedZone();
      const originalAU = rollPositionInZone(targetZone, v2, zones);

      // Check if inner zones are saturated (all 4 have at least one body)
      const innerFilled = innerZones.filter(z => placed.some(b => b.zone === z)).length;
      const isInner = innerZones.includes(targetZone);

      if (isInner && innerFilled >= 4) {
        const stability = hotJupiterStabilityRoll();
        if (!stability.stable) {
          // ========== Hot Jupiter Event fires ==========
          // Final zone: natural 3 (all 1s) → Infernal; else → Hot
          const finalZone: ZoneId = stability.sum === 3 ? 'Infernal' : 'Hot';
          const finalAU = rollPositionInZone(finalZone, v2, zones);

          // Determine consumed bodies: those with AU between final and original
          const [nearAU, farAU] = finalAU < originalAU
            ? [finalAU, originalAU]
            : [originalAU, finalAU];

          const consumedBodies = placed.filter(b =>
            b.id !== body.id &&
            b.distanceAU > nearAU &&
            b.distanceAU < farAU
          );

          // Remove consumed from placed and transfer to consumed array
          for (const c of consumedBodies) {
            consumed.push(c);
            const idx = placed.indexOf(c);
            if (idx >= 0) placed.splice(idx, 1);
          }

          // Absorb consumed mass and recalculate density proportionally
          const absorbedMass = consumedBodies.reduce((s, b) => s + b.mass, 0);
          const absorbedDensity = consumedBodies.length > 0
            ? consumedBodies.reduce((s, b) => s + (b.densityGcm3 ?? 3), 0) / consumedBodies.length
            : (body.densityGcm3 ?? 1.3);

          body.mass += absorbedMass;
          const massRatio = absorbedMass / body.mass;
          body.densityGcm3 = ((body.densityGcm3 ?? 1.3) * (1 - massRatio)) + (absorbedDensity * massRatio);

          // Class upgrade check (20 JM = Proto-Star, 50 JM = Brown Dwarf)
          const massJM = body.mass / 317.8;
          if (massJM >= 50) {
            body.type = 'star' as typeof body.type; // Promoted to Level 0 companion
            // Brown Dwarf relocation to outer orbit deferred to caller
          } else if (massJM >= 20) {
            // Proto-Star trait — would be added to traits array if we had one
          }

          // Shepherded bodies: those inside (closer than) the final position
          const shepherdedBodies = placed.filter(b =>
            b.id !== body.id && b.distanceAU < finalAU
          );

          for (const sb of shepherdedBodies) {
            const retention = rollShepherdingRetention(primaryStar.class) / 100;
            sb.distanceAU = Math.round(sb.distanceAU * retention * 100) / 100;
            sb.wasShepherded = true;
            // Update zone label based on new AU
            if (sb.distanceAU < zones.hot.min) sb.zone = 'Infernal' as unknown as typeof sb.zone;
            else if (sb.distanceAU < zones.conservative.min) sb.zone = 'Hot' as unknown as typeof sb.zone;
            else if (sb.distanceAU < zones.cold.min) sb.zone = 'Conservative' as unknown as typeof sb.zone;
            else if (sb.distanceAU < zones.outer.min) sb.zone = 'Cold' as unknown as typeof sb.zone;
            else sb.zone = 'Outer' as unknown as typeof sb.zone;
          }

          markPlaced(body, finalZone, finalAU);
          continue;
        }
      }

      // Stable or non-saturated: place normally at original position
      markPlaced(body, targetZone, originalAU);
      continue;
    }

    // Terrestrials and Dwarfs → unified roll with disk-blocking + Hill conflict + rerolls
    const blockedZones = new Set<ZoneId>();
    let placedSuccessfully = false;

    for (let attempt = 0; attempt < 5; attempt++) {
      const zone = rollUnifiedZone();

      if (blockedZones.has(zone)) continue;

      // Disk-blocking check
      if (isBlockedByDisk(body, zone, diskZones)) {
        blockedZones.add(zone);
        continue;
      }

      const au = rollPositionInZone(zone, v2, zones);
      body.distanceAU = Math.round(au * 100) / 100;
      body.zone = zone as unknown as typeof body.zone;

      // Hill sphere conflict check
      if (hasConflict(body, placed, starMassEM)) {
        blockedZones.add(zone);
        body.positionRerollCount = (body.positionRerollCount ?? 0) + 1;
        continue;
      }

      markPlaced(body, zone, au);
      placedSuccessfully = true;
      break;
    }

    if (!placedSuccessfully) {
      body.wasEjected = true;
      body.ejectionReason = 'saturation';
      ejected.push(body);
    }
  }

  return { placedBodies: placed, ejectedBodies: ejected, consumedBodies: consumed };
}
