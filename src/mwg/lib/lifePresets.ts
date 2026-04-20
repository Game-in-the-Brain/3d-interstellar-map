// =====================
// FR-041: Extraterrestrial Life Assumptions Presets
// =====================

import type { ExtraterrestrialLifeAssumptions } from '../types';

export const MNEME_DEFAULT_LIFE_PRESET: ExtraterrestrialLifeAssumptions = {
  id: 'mneme-default',
  name: 'Mneme Default',
  description: 'Balanced emergence: roughly 3–10% of candidate worlds develop N-O atmospheres.',
  biosphereTN: 20,
  biosphereDisadvantage: 2,
  minBiochemForBiosphereRoll: 'Common',
  enableTransitionalAtmospheres: true,
  biochemOffsetRule: 'standard',
};

export const RARE_EARTH_LIFE_PRESET: ExtraterrestrialLifeAssumptions = {
  id: 'rare-earth',
  name: 'Rare Earth',
  description: 'Life is extremely rare. Less than 1% of candidates develop biospheres.',
  biosphereTN: 28,
  biosphereDisadvantage: 3,
  minBiochemForBiosphereRoll: 'Abundant',
  enableTransitionalAtmospheres: false,
  biochemOffsetRule: 'halved',
};

export const PANSPERMIA_LIFE_PRESET: ExtraterrestrialLifeAssumptions = {
  id: 'panspermia',
  name: 'Panspermia',
  description: 'Life spreads easily. 15–30% of candidates develop biospheres.',
  biosphereTN: 15,
  biosphereDisadvantage: 0,
  minBiochemForBiosphereRoll: 'Common',
  enableTransitionalAtmospheres: true,
  biochemOffsetRule: 'standard',
};

export const BUILT_IN_LIFE_PRESETS: ExtraterrestrialLifeAssumptions[] = [
  MNEME_DEFAULT_LIFE_PRESET,
  RARE_EARTH_LIFE_PRESET,
  PANSPERMIA_LIFE_PRESET,
];

/** Find a built-in or custom preset by ID. */
export function getLifePresetById(
  id: string,
  customPresets: ExtraterrestrialLifeAssumptions[] = []
): ExtraterrestrialLifeAssumptions | undefined {
  return [...BUILT_IN_LIFE_PRESETS, ...customPresets].find(p => p.id === id);
}

/** Export a preset to JSON string. */
export function exportLifePresetToJSON(preset: ExtraterrestrialLifeAssumptions): string {
  return JSON.stringify(preset, null, 2);
}

/** Import a preset from JSON string. */
export function importLifePresetFromJSON(json: string): ExtraterrestrialLifeAssumptions | null {
  try {
    const parsed = JSON.parse(json);
    if (
      parsed &&
      typeof parsed.id === 'string' &&
      typeof parsed.name === 'string' &&
      typeof parsed.biosphereTN === 'number' &&
      typeof parsed.biosphereDisadvantage === 'number' &&
      ['Common', 'Abundant', 'Rich'].includes(parsed.minBiochemForBiosphereRoll) &&
      typeof parsed.enableTransitionalAtmospheres === 'boolean' &&
      ['standard', 'halved', 'none'].includes(parsed.biochemOffsetRule)
    ) {
      return parsed as ExtraterrestrialLifeAssumptions;
    }
  } catch {
    // ignore parse errors
  }
  return null;
}

/** Load custom life assumption presets from localStorage. */
export function loadCustomLifePresets(): ExtraterrestrialLifeAssumptions[] {
  try {
    const raw = localStorage.getItem('mneme_life_assumptions_presets');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.filter(p => importLifePresetFromJSON(JSON.stringify(p)) !== null);
      }
    }
  } catch {
    // ignore
  }
  return [];
}

/** Save custom life assumption presets to localStorage. */
export function saveCustomLifePresets(presets: ExtraterrestrialLifeAssumptions[]): void {
  try {
    localStorage.setItem('mneme_life_assumptions_presets', JSON.stringify(presets));
  } catch {
    // ignore storage errors
  }
}
