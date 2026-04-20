import type { StellarClass, StellarGrade } from '../types';

/**
 * Parse a standard spectral type string (e.g., "G2V", "M5Ve", "K1V", "sdM4")
 * into MWG's StellarClass and StellarGrade.
 *
 * Spectral type format: [luminosity prefix] [class][digit][suffix]
 *   class: O, B, A, F, G, K, M
 *   digit: 0-9 (temperature sub-type, 0 = hottest)
 *   suffix: e, m, n, p, etc. (ignored for class/grade)
 *   luminosity prefix: sd (subdwarf), D (white dwarf) — we ignore these and map to main sequence
 */
export function parseSpectralType(spec: string): { stellarClass: StellarClass; grade: StellarGrade } | null {
  if (!spec || typeof spec !== 'string') return null;

  // Normalize: uppercase, strip whitespace
  const normalized = spec.trim().toUpperCase();

  // Extract the spectral class letter (O, B, A, F, G, K, M)
  // Look for the first occurrence of these letters
  const classMatch = normalized.match(/[OBafgkm]/i);
  if (!classMatch) return null;

  const stellarClass = classMatch[0].toUpperCase() as StellarClass;

  // Extract the digit following the class (0-9)
  // The digit indicates temperature: 0 = hottest, 9 = coolest
  // MWG grade: 0 = most luminous/hottest, 9 = least luminous/coolest
  const digitMatch = normalized.match(/[OBafgkm](\d)/i);
  const digit = digitMatch ? parseInt(digitMatch[1], 10) : 5;

  // Map digit (0-9) to MWG grade (0-9)
  // In spectral types: 0 = hottest, 9 = coolest
  // In MWG grades: 0 = hottest/most luminous, 9 = coolest/least luminous
  // This is a direct mapping
  const grade = Math.max(0, Math.min(9, digit)) as StellarGrade;

  return { stellarClass, grade };
}

/**
 * Map HYG spectral type to a rough guess of stellar class/grade.
 * Fallback for non-standard spectral types.
 */
export function guessFromSpectralType(spec: string): { stellarClass: StellarClass; grade: StellarGrade } {
  const parsed = parseSpectralType(spec);
  if (parsed) return parsed;

  // Fallback: search for any OBAFGKM letter
  const upper = spec.toUpperCase();
  if (upper.includes('O')) return { stellarClass: 'O', grade: 5 };
  if (upper.includes('B')) return { stellarClass: 'B', grade: 5 };
  if (upper.includes('A')) return { stellarClass: 'A', grade: 5 };
  if (upper.includes('F')) return { stellarClass: 'F', grade: 5 };
  if (upper.includes('G')) return { stellarClass: 'G', grade: 5 };
  if (upper.includes('K')) return { stellarClass: 'K', grade: 5 };
  if (upper.includes('M')) return { stellarClass: 'M', grade: 5 };

  // Ultimate fallback: Sun-like
  return { stellarClass: 'G', grade: 2 };
}
