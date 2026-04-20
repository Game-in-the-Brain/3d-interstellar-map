/**
 * Dice rolling utilities for star generation.
 * Traveller/MWG compatible notation.
 */

/** Roll a single D6 (1–6) */
export function rollD6(): number {
  return Math.floor(Math.random() * 6) + 1;
}

/** Roll N D6 and return the array of results */
export function rollND6(n: number): number[] {
  return Array.from({ length: n }, () => rollD6());
}

/** Roll N D6 and return the sum (e.g., 2D6, 3D6, 4D6, 5D6) */
export function rollSum(n: number): number {
  return rollND6(n).reduce((a, b) => a + b, 0);
}

/** Roll 1D3 (D6/2 rounded up): 1, 2, or 3 */
export function rollD3(): number {
  return Math.ceil(rollD6() / 2);
}

/** Roll d66: two D6 read as digits (11–66). Returns numeric value 11–66. */
export function rollD66(): number {
  const tens = rollD6();
  const ones = rollD6();
  return tens * 10 + ones;
}

/** Convert d66 (11–66) to index 0–35 for table lookups */
export function d66ToIndex(d66: number): number {
  const tens = Math.floor(d66 / 10);
  const ones = d66 % 10;
  return (tens - 1) * 6 + (ones - 1);
}

/** Convert d66 index (0–35) to degrees (0–350 in 10° steps) for XY azimuth */
export function d66ToDegrees(d66: number): number {
  return d66ToIndex(d66) * 10;
}

/** Convert d66 index (0–35) to elevation degrees (-90° to +85° in ~5.14° steps) */
export function d66ToElevation(d66: number): number {
  return (d66ToIndex(d66) * 180) / 35 - 90;
}

// =====================
// Recursive Sextet Protocol (d6666)
// =====================

/**
 * Roll d6666: two nested d66 rolls forming a Recursive Sextet address.
 * Returns [primary, secondary] where each is a standard d66 (11–66).
 *
 * Layer 1 (primary):   36 broad sectors  (10° / ~5° resolution)
 * Layer 2 (secondary): 36 subdivisions   (~0.28° / ~0.14° resolution)
 * Total outcomes:      36² = 1,296
 */
export function rollD6666(): [number, number] {
  return [rollD66(), rollD66()];
}

/** Convert d6666 compound roll to a flat index 0–1295 */
export function d6666ToIndex(d6666: [number, number]): number {
  const primary = d66ToIndex(d6666[0]);   // 0–35
  const secondary = d66ToIndex(d6666[1]); // 0–35
  return primary * 36 + secondary;        // 0–1295
}

/** Convert d6666 to azimuth degrees (0–360°) with ~0.278° resolution */
export function d6666ToDegrees(d6666: [number, number]): number {
  return (d6666ToIndex(d6666) * 360) / 1296;
}

/**
 * Convert d6666 to elevation degrees (-90° to +90°) with ~0.139° resolution.
 * The 1296 outcomes are spread evenly across the 180° elevation arc.
 */
export function d6666ToElevation(d6666: [number, number]): number {
  return (d6666ToIndex(d6666) * 180) / 1296 - 90;
}

// =====================
// Spherical Volume Bell Curve (Z-Plane)
// =====================

/**
 * QA-007: Z-Plane Bell Curve Lookup Table
 * Maps d66 (11-66) to elevation bands weighted toward the equator.
 * Prevents polar clustering by simulating the cosine of the vertical angle.
 *
 * Band distribution:
 *   Poles:       2 outcomes each  (5.6%)  → narrow bands
 *   Mid-lats:    6 outcomes each  (16.7%) → medium bands
 *   Equator:    10 outcomes each  (27.8%) → wide bands
 *
 * Within each band, a d20 provides fine-tuning.
 */
const ELEVATION_BANDS: Array<{ d66Min: number; d66Max: number; angleMin: number; angleMax: number }> = [
  { d66Min: 11, d66Max: 12, angleMin:   0, angleMax:  30 }, // North Pole
  { d66Min: 13, d66Max: 22, angleMin:  31, angleMax:  60 }, // North Mid-Latitudes
  { d66Min: 23, d66Max: 36, angleMin:  61, angleMax:  90 }, // North Equator
  { d66Min: 41, d66Max: 54, angleMin:  91, angleMax: 120 }, // South Equator
  { d66Min: 55, d66Max: 64, angleMin: 121, angleMax: 150 }, // South Mid-Latitudes
  { d66Min: 65, d66Max: 66, angleMin: 151, angleMax: 180 }, // South Pole
];

function findElevationBand(d66: number): { angleMin: number; angleMax: number } | null {
  for (const band of ELEVATION_BANDS) {
    if (d66 >= band.d66Min && d66 <= band.d66Max) {
      return { angleMin: band.angleMin, angleMax: band.angleMax };
    }
  }
  return null;
}

/**
 * Convert d66 to inclination angle (0°–180° from North Pole) using the
 * Spherical Volume Bell Curve table. Returns degrees with d20 fine-tuning.
 *
 * To get elevation (-90° to +90°): subtract 90 from the result.
 */
export function d66ToInclinationBellCurve(d66: number): number {
  const band = findElevationBand(d66);
  if (!band) return 90; // fallback to equator
  // Fine-tune within the band using a uniform random offset
  // (In a tabletop context, the GM rolls 1d20 and adds to angleMin)
  const range = band.angleMax - band.angleMin + 1;
  const offset = Math.floor(Math.random() * range);
  return band.angleMin + offset;
}

/** Convenience wrapper: returns elevation in degrees (-90° to +90°) */
export function d66ToElevationBellCurve(d66: number): number {
  return d66ToInclinationBellCurve(d66) - 90;
}
