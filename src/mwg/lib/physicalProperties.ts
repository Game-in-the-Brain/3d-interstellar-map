// =====================
// Physical Properties — QA-009 / QA-ADD-001
// Density-based derivation of radius, diameter, surface gravity, escape velocity
// Reference: references/REF-010-planet-densities.md
// =====================

import type { BodyType } from '../types';

const G = 6.674e-11;       // gravitational constant m³ kg⁻¹ s⁻²
const EM_TO_KG = 5.972e24; // 1 Earth Mass in kg
const PI = Math.PI;

// Density ranges by body type (g/cm³) — see REF-010-planet-densities.md
const DENSITY_BY_TYPE: Record<BodyType, { min: number; max: number }> = {
  star:        { min: 1.4,  max: 1.4 },  // solar mean density — placeholder for unified Body model
  disk:        { min: 0.5,  max: 1.0 },  // diffuse material — not meaningful as solid sphere
  dwarf:       { min: 1.5,  max: 3.5 },  // mixed composition
  terrestrial: { min: 4.0,  max: 6.5 },  // rocky/silicate to compressed core
  ice:         { min: 1.0,  max: 2.0 },  // water/ice mix
  gas:         { min: 0.3,  max: 1.3 },  // gas giants, wide range
  ring:        { min: 0.1,  max: 0.5 },  // diffuse ring material — not a solid sphere
};

export interface PhysicalProperties {
  densityGcm3: number;     // g/cm³
  radiusKm: number;        // km
  diameterKm: number;      // km
  surfaceGravityG: number; // in g (Earth = 1.0)
  escapeVelocityMs: number; // m/s
}

/**
 * Derive physical properties from mass and body type.
 *
 * Formulas:
 *   Volume (m³)     = mass_kg / density_kg_m3
 *   Radius (m)      = ∛(3 × Volume / (4 × π))
 *   Surface Gravity = G × mass_kg / radius² → divided by 9.81 for g
 *   Escape Velocity = √(2 × G × mass_kg / radius)
 *
 * @param massEM  — mass in Earth Masses
 * @param bodyType — determines density range
 */
export function calculatePhysicalProperties(massEM: number, bodyType: BodyType): PhysicalProperties {
  const range = DENSITY_BY_TYPE[bodyType];
  const densityGcm3 = range.min + Math.random() * (range.max - range.min);
  const densityKgM3 = densityGcm3 * 1000;

  const massKg = massEM * EM_TO_KG;
  const volumeM3 = massKg / densityKgM3;
  const radiusM = Math.cbrt((3 * volumeM3) / (4 * PI));
  const radiusKm = radiusM / 1000;
  const diameterKm = 2 * radiusKm;
  const surfaceGravityMs2 = (G * massKg) / (radiusM * radiusM);
  const surfaceGravityG = surfaceGravityMs2 / 9.81;
  const escapeVelocityMs = Math.sqrt(2 * G * massKg / radiusM);

  return {
    densityGcm3:      Math.round(densityGcm3 * 100) / 100,
    radiusKm:         Math.round(radiusKm),
    diameterKm:       Math.round(diameterKm),
    surfaceGravityG:  Math.round(surfaceGravityG * 1000) / 1000,
    escapeVelocityMs: Math.round(escapeVelocityMs),
  };
}

/**
 * Recalculate physical properties from mass and a specific density (v2 composition).
 */
export function recalculatePhysicalProperties(massEM: number, densityGcm3: number): PhysicalProperties {
  const densityKgM3 = densityGcm3 * 1000;
  const massKg = massEM * EM_TO_KG;
  const volumeM3 = massKg / densityKgM3;
  const radiusM = Math.cbrt((3 * volumeM3) / (4 * PI));
  const radiusKm = radiusM / 1000;
  const diameterKm = 2 * radiusKm;
  const surfaceGravityMs2 = (G * massKg) / (radiusM * radiusM);
  const surfaceGravityG = surfaceGravityMs2 / 9.81;
  const escapeVelocityMs = Math.sqrt(2 * G * massKg / radiusM);

  return {
    densityGcm3:      Math.round(densityGcm3 * 100) / 100,
    radiusKm:         Math.round(radiusKm),
    diameterKm:       Math.round(diameterKm),
    surfaceGravityG:  Math.round(surfaceGravityG * 1000) / 1000,
    escapeVelocityMs: Math.round(escapeVelocityMs),
  };
}
