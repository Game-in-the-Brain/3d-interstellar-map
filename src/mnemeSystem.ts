/**
 * Shared interchange format between 3D Interstellar Map and MWG.
 * Allows whole StarSystem objects to travel with their star coordinates.
 */

export interface MnemeSystemEntry {
  [key: string]: unknown;
  starId: string;
  name: string;
  x: number;
  y: number;
  z: number;
  spec: string;
  absMag: number;
  /** Full MWG StarSystem object (opaque to 3D map) */
  mwgSystem?: Record<string, unknown>;
}

export interface MnemeSystemExport {
  mnemeFormat: 'star-system-batch';
  version: string;
  source: '3d-interstellar-map' | 'mwg';
  exportedAt: string;
  systems: MnemeSystemEntry[];
}

export function isMnemeSystemExport(obj: unknown): obj is MnemeSystemExport {
  if (typeof obj !== 'object' || obj === null) return false;
  const o = obj as Record<string, unknown>;
  return o.mnemeFormat === 'star-system-batch' && Array.isArray(o.systems);
}
