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
