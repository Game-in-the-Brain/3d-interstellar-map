import type { TLProductivityPreset, TableWeights, DevelopmentLevel, WealthLevel } from '../types';

// =====================
// Constants
// =====================

/** Base Boat purchase price in Credits — reference unit for all ship cost scaling (v1.3.100) */
export const BOAT_PRICE_CR = 5_480_400;

/** Default number of days in a standard year */
export const DAYS_PER_YEAR = 365;

/** Legacy Mneme GDP ratios relative to TL7 baseline */
export const MNEME_RATIOS: Record<number, number> = {
  7: 1,
  8: 552 / 205,
  9: 1_486 / 205,
  10: 4_000 / 205,
  11: 29_000 / 205,
  12: 210_000 / 205,
  13: 1_500_000 / 205,
  14: 11_000_000 / 205,
  15: 80_000_000 / 205,
  16: 578_000_000 / 205,
};

// =====================
// Helpers
// =====================

/**
 * Derive boat-years from a given SOC 7 monthly income.
 */
export function getBoatYears(monthlyIncome: number): number {
  if (!monthlyIncome || monthlyIncome <= 0) return Infinity;
  return BOAT_PRICE_CR / (monthlyIncome * 12);
}

/**
 * Derive SOC 7 monthly income from a target boat-years value (QA-046).
 */
export function getBaseIncomeFromBoatYears(boatYears: number): number {
  if (!boatYears || boatYears <= 0) return 1;
  return BOAT_PRICE_CR / (boatYears * 12);
}

/**
 * Compute SOC 7 monthly income for a given TL using a preset.
 */
export function getSoc7MonthlyIncome(tl: number, preset: TLProductivityPreset): number {
  if (preset.curve === 'custom' && preset.soc7IncomeByTL) {
    return preset.soc7IncomeByTL[tl] ?? preset.soc7IncomeByTL[preset.baseTL] ?? preset.baseIncome;
  }

  if (preset.curve === 'flat') {
    return preset.baseIncome;
  }

  if (preset.curve === 'mneme') {
    const baseRatio = MNEME_RATIOS[preset.baseTL] ?? 1;
    const tlRatio = MNEME_RATIOS[tl] ?? baseRatio;
    return preset.baseIncome * (tlRatio / baseRatio);
  }

  if (preset.curve === 'linear' && preset.linearMultiplier) {
    const steps = tl - preset.baseTL;
    return preset.baseIncome * Math.pow(preset.linearMultiplier, steps);
  }

  return preset.baseIncome;
}

/**
 * Compute GDP per person per day for a given TL using a preset.
 */
export function getGdpPerDayFromPreset(tl: number, preset: TLProductivityPreset): number {
  const monthly = getSoc7MonthlyIncome(tl, preset);
  const annual = monthly * 12;
  return annual / DAYS_PER_YEAR;
}

/**
 * Compute income for any SOC given the SOC 7 income.
 * SOC > 7: doubles per step
 * SOC < 7: halves per step
 */
export function getIncomeForSoc(soc: number, soc7Monthly: number): number {
  const delta = soc - 7;
  return soc7Monthly * Math.pow(2, delta);
}

/**
 * Compute boat-years at a given TL using the preset's curve.
 * Uses preset.boatYears when available (QA-048), otherwise derives from baseIncome.
 */
export function getBoatYearsAtTL(tl: number, preset: TLProductivityPreset): number {
  const reference = preset.boatYears ?? getBoatYears(preset.baseIncome);
  if (!reference || reference <= 0) return Infinity;

  if (preset.curve === 'custom' && preset.soc7IncomeByTL) {
    const tlIncome = preset.soc7IncomeByTL[tl] ?? preset.soc7IncomeByTL[preset.baseTL] ?? preset.baseIncome;
    return getBoatYears(tlIncome);
  }

  if (preset.curve === 'flat') {
    return reference;
  }

  if (preset.curve === 'mneme') {
    const baseRatio = MNEME_RATIOS[preset.baseTL] ?? 1;
    const tlRatio = MNEME_RATIOS[tl] ?? baseRatio;
    return reference * (baseRatio / tlRatio);
  }

  if (preset.curve === 'linear' && preset.linearMultiplier) {
    const steps = tl - preset.baseTL;
    return reference / Math.pow(preset.linearMultiplier, steps);
  }

  return reference;
}

/**
 * Compute "income-years" to buy a ship at a given world's TL.
 * QA-048: uses boatYears directly when decoupled from baseIncome.
 */
export function getIncomeYears(shipPriceCr: number, tl: number, preset: TLProductivityPreset): number {
  const boatYears = getBoatYearsAtTL(tl, preset);
  if (!boatYears || boatYears <= 0 || !BOAT_PRICE_CR) return Infinity;
  return (shipPriceCr / BOAT_PRICE_CR) * boatYears;
}

// =====================
// QA-056: Development & Wealth SOC lookups
// =====================

export const DEVELOPMENT_AVG_SOC: Record<DevelopmentLevel, number> = {
  'UnderDeveloped': 3,
  'Developing': 5,
  'Mature': 6,
  'Developed': 8,
  'Well Developed': 9,
  'Very Developed': 10,
};

export const WEALTH_SOC_BONUS: Record<WealthLevel, number> = {
  'Average': 0,
  'Better-off': 1,
  'Prosperous': 2,
  'Affluent': 3,
};

/**
 * Compute monthly income for any SOC at a given TL using a preset.
 */
export function getSocMonthlyIncome(soc: number, tl: number, preset: TLProductivityPreset): number {
  const soc7Monthly = getSoc7MonthlyIncome(tl, preset);
  return getIncomeForSoc(soc, soc7Monthly);
}

/**
 * QA-056: Compute GDP per person per day for a world using its average SOC
 * (derived from Development + Wealth) instead of hardcoded SOC 7.
 */
export function getGdpPerDayForWorld(
  tl: number,
  dev: DevelopmentLevel,
  wealth: WealthLevel,
  preset: TLProductivityPreset
): number {
  const avgSoc = DEVELOPMENT_AVG_SOC[dev] + WEALTH_SOC_BONUS[wealth];
  const monthly = getSocMonthlyIncome(avgSoc, tl, preset);
  const annual = monthly * 12;
  return annual / DAYS_PER_YEAR;
}

// =====================
// Preset builder
// =====================

export function buildPresetFromBase(
  id: string,
  name: string,
  description: string,
  baseIncome: number,
  baseTL: number,
  curve: TLProductivityPreset['curve'],
  linearMultiplier?: number,
  soc7IncomeByTL?: Record<number, number>
): TLProductivityPreset {
  return {
    id,
    name,
    label: name,
    description,
    baseIncome,
    baseTL,
    curve,
    linearMultiplier,
    soc7IncomeByTL,
    boatYears: getBoatYears(baseIncome),
  };
}

// =====================
// Table Weights Defaults
// =====================

/** Natural 2D6 bell curve weights (rolls 2..12) */
export const NATURAL_2D6_WEIGHTS: TableWeights = {
  dice: [1, 2, 3, 4, 5, 6, 5, 4, 3, 2, 1],
};

/** Flat / uniform distribution weights */
export const FLAT_WEIGHTS: TableWeights = {
  dice: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
};

export const DEFAULT_DEVELOPMENT_WEIGHTS: TableWeights = NATURAL_2D6_WEIGHTS;
export const DEFAULT_POWER_WEIGHTS: TableWeights = NATURAL_2D6_WEIGHTS;
export const DEFAULT_GOV_WEIGHTS: TableWeights = NATURAL_2D6_WEIGHTS;

/** QA-029: Democratic bias — reduces Anarchy probability */
export const DEMOCRATIC_POWER_WEIGHTS: TableWeights = {
  dice: [1, 1, 2, 3, 4, 5, 5, 4, 3, 2, 1],
};

/** QA-029: Stable bias — increases Unitary State probability */
export const STABLE_POWER_WEIGHTS: TableWeights = {
  dice: [1, 2, 3, 4, 5, 5, 4, 3, 2, 1, 3],
};

// =====================
// Roll Profile Weights — Economic Assumptions Customizations (v1.3.106)
// =====================

/** Mneme Default roll profiles */
export const MNEME_WEALTH_WEIGHTS: TableWeights = {
  // Average: 2-8, Better-off: 9-10, Prosperous: 11, Affluent: 12
  dice: [4, 4, 4, 4, 4, 4, 4, 4, 4, 2, 2],
};
export const MNEME_DEV_WEIGHTS: TableWeights = {
  // UnderDev: 2-7, Developing: 8, Mature: 9, Developed: 10, WellDev: 11, VeryDev: 12
  dice: [7, 7, 7, 7, 7, 7, 10, 10, 10, 4, 4],
};
export const MNEME_POWER_WEIGHTS: TableWeights = {
  // Anarchy: 2-7, Confederation: 8-9, Federation: 10-11, Unitary: 12
  dice: [7, 7, 7, 7, 7, 7, 8, 8, 8, 8, 6],
};
export const MNEME_GOV_WEIGHTS: TableWeights = {
  // Aristocracy: 2-5, Ideocracy: 6-7, Kratocracy: 8-9, Democracy: 10-11, Meritocracy: 12
  dice: [15, 15, 15, 15, 16, 16, 16, 16, 16, 16, 4],
};

/** CE / Traveller roll profiles */
export const CE_WEALTH_WEIGHTS: TableWeights = {
  dice: [8, 8, 8, 8, 8, 8, 8, 49, 49, 70, 56],
};
export const CE_DEV_WEIGHTS: TableWeights = {
  dice: [1, 1, 1, 1, 1, 1, 8, 20, 20, 18, 8],
};
export const CE_POWER_WEIGHTS: TableWeights = {
  dice: [2, 2, 2, 2, 2, 2, 12, 12, 27, 27, 30],
};
export const CE_GOV_WEIGHTS: TableWeights = {
  dice: [3, 3, 3, 3, 10, 10, 14, 14, 40, 40, 20],
};

/** Stagnant / Uniform roll profiles */
export const STAGNANT_WEALTH_WEIGHTS: TableWeights = {
  dice: [12, 12, 12, 12, 12, 12, 12, 70, 70, 49, 7],
};
export const STAGNANT_DEV_WEIGHTS: TableWeights = {
  dice: [1, 1, 1, 1, 1, 1, 36, 96, 84, 18, 0],
};
export const STAGNANT_POWER_WEIGHTS: TableWeights = {
  dice: [1, 1, 1, 1, 1, 1, 24, 24, 27, 27, 12],
};
export const STAGNANT_GOV_WEIGHTS: TableWeights = {
  // Aristocracy: 2-5, Ideocracy: 6-7, Kratocracy: 8-9, Democracy: 10-11, Meritocracy: 12
  // QA-051 calibrated: ~13% / ~25% / ~25% / ~33% / ~5%
  dice: [3, 3, 3, 4, 13, 12, 13, 12, 17, 16, 5],
};

// =====================
// Built-in Presets
// =====================

/** Exact Mneme default — compounding productivity curve driven by MNEME_RATIOS */
export const MNEME_PRESET: TLProductivityPreset = {
  id: 'mneme',
  name: 'Mneme',
  label: 'Mneme',
  description: 'Compounding productivity growth per TL. High automation, post-scarcity-adjacent economics.',
  baseIncome: 45_199, // TL 9 SOC 7 monthly income (legacy 1,486 Cr/day × 365 / 12)
  baseTL: 9,
  curve: 'mneme',
  boatYears: 10.1, // derived: 5,480,400 / (45,199 × 12) ≈ 10.1
  wealthWeights: MNEME_WEALTH_WEIGHTS,
  developmentWeights: MNEME_DEV_WEIGHTS,
  powerWeights: MNEME_POWER_WEIGHTS,
  govWeights: MNEME_GOV_WEIGHTS,
};

/** CE / Traveller stagnant preset — flat 2,000 Cr/month SOC 7 at every TL */
export const CE_PRESET: TLProductivityPreset = {
  id: 'ce',
  name: 'CE / Traveller',
  label: 'CE / Traveller',
  description: 'Flat income across all TLs. Human-labour-dominant, low-compound stagnation model.',
  baseIncome: 2_000, // TL 9 SOC 7 monthly income
  baseTL: 9,
  curve: 'flat',
  boatYears: 228.35, // derived: 5,480,400 / (2,000 × 12) = 228.35
  wealthWeights: CE_WEALTH_WEIGHTS,
  developmentWeights: CE_DEV_WEIGHTS,
  powerWeights: CE_POWER_WEIGHTS,
  govWeights: CE_GOV_WEIGHTS,
};

/** Stagnant / Uniform preset — tight clustering around median outcomes, very few extremes */
export const STAGNANT_PRESET: TLProductivityPreset = {
  id: 'stagnant',
  name: 'Stagnant',
  label: 'Stagnant',
  description: 'Flat income with tightly clustered societal outcomes. Bureaucratic equilibrium, minimal variance.',
  baseIncome: 2_000,
  baseTL: 9,
  curve: 'flat',
  boatYears: 228.35,
  wealthWeights: STAGNANT_WEALTH_WEIGHTS,
  developmentWeights: STAGNANT_DEV_WEIGHTS,
  powerWeights: STAGNANT_POWER_WEIGHTS,
  govWeights: STAGNANT_GOV_WEIGHTS,
};

export const BUILT_IN_PRESETS: TLProductivityPreset[] = [MNEME_PRESET, CE_PRESET, STAGNANT_PRESET];

// =====================
// QA: CE TL Display Mapping
// =====================

export const MTL_TO_CE_TL: Record<number, string> = {
  9:  '7.0',
  10: '8.0',
  11: '8.5',
  12: '9.0',
  13: '9.5',
  14: '10.0',
  15: '10.5',
  16: '11.0',
};

export const CE_TL_DESCRIPTORS: Record<number, string> = {
  9:  'Pre-Stellar',
  10: 'Pre-Stellar',
  11: 'Pre-Stellar',
  12: 'Early Stellar',
  13: 'Early Stellar',
  14: 'Average Stellar',
  15: 'Average Stellar',
  16: 'High Stellar',
};

/**
 * Display TL string based on preset. CE/Traveller shows CE TL notation.
 */
export function displayTL(mnemeTL: number, presetLabel?: string): string {
  if (presetLabel === 'CE / Traveller') {
    const ceTL = MTL_TO_CE_TL[mnemeTL];
    return ceTL ? `CE TL ${ceTL}` : `CE TL —`;
  }
  return `MTL ${mnemeTL}`;
}

/**
 * Display TL descriptor/era name based on preset.
 */
export function displayTLDescriptor(mnemeTL: number, presetLabel?: string): string {
  if (presetLabel === 'CE / Traveller') {
    return CE_TL_DESCRIPTORS[mnemeTL] ?? '—';
  }
  return '—';
}

// =====================
// Import / Export
// =====================

export function exportPresetToJSON(preset: TLProductivityPreset): string {
  return JSON.stringify(preset, null, 2);
}

export function importPresetFromJSON(json: string): TLProductivityPreset | null {
  try {
    const parsed = JSON.parse(json);
    if (
      parsed &&
      typeof parsed === 'object' &&
      typeof parsed.id === 'string' &&
      typeof parsed.name === 'string' &&
      typeof parsed.baseIncome === 'number' &&
      typeof parsed.baseTL === 'number' &&
      ['mneme', 'flat', 'linear', 'custom'].includes(parsed.curve)
    ) {
      return parsed as TLProductivityPreset;
    }
  } catch {
    // ignore
  }
  return null;
}
