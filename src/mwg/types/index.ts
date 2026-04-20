// =====================
// Enums
// =====================

export type StellarClass = 'O' | 'B' | 'A' | 'F' | 'G' | 'K' | 'M';
export type StellarGrade = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

export type Zone = 'Infernal' | 'Hot' | 'Conservative' | 'Cold' | 'Outer';

export type WorldType = 'Habitat' | 'Dwarf' | 'Terrestrial';
export type LesserEarthType = 'Carbonaceous' | 'Silicaceous' | 'Metallic' | 'Other';

export type AtmosphereType = 'Average' | 'Thin' | 'Trace' | 'Dense' | 'Crushing';
export type TemperatureType = 'Average' | 'Cold' | 'Freezing' | 'Hot' | 'Inferno';
export type HazardType = 'None' | 'Polluted' | 'Corrosive' | 'Biohazard' | 'Toxic' | 'Radioactive';
export type HazardIntensityType = 'Very Mild' | 'Mild' | 'Serious' | 'High' | 'Intense';
export type HazardIntensity = 'Trace' | 'Light' | 'Moderate' | 'Heavy' | 'Extreme';
export type ResourceLevel = 'Scarce' | 'Rare' | 'Uncommon' | 'Abundant' | 'Inexhaustible';

// FR-041: v2 composition / atmosphere / biosphere types
export type CompositionTerrestrial = 'Exotic' | 'Iron-Dominant' | 'Iron-Silicate' | 'Silicate-Basaltic' | 'Hydrous' | 'Carbonaceous' | 'Ceramic';
export type CompositionDwarf = 'Exotic' | 'Metallic' | 'Silicaceous' | 'Hydrous' | 'Carbonaceous' | 'Rubble-Pile' | 'Volatile-Rich';
export type AtmosphereComp = 'H-He' | 'Methane-Ammonia' | 'Nitrogen-Inert' | 'Carbon-Dioxide' | 'Water-Steam' | 'Sulfuric' | 'Exotic' | 'None';
export type AtmoDensity = 'Trace' | 'Thin' | 'Average' | 'Dense' | 'Crushing';
export type BiochemTier = 'Scarce' | 'Rare' | 'Uncommon' | 'Poor' | 'Deficient' | 'Common' | 'Abundant' | 'Rich' | 'Bountiful' | 'Prolific' | 'Inexhaustible';
export type BiosphereRating = 'B0' | 'B1' | 'B2' | 'B3' | 'B4' | 'B5' | 'B6';
export type RingProminence = 'faint' | 'moderate' | 'prominent' | 'brilliant' | 'massive';

export type WealthLevel = 'Average' | 'Better-off' | 'Prosperous' | 'Affluent';
export type PowerStructure = 'Anarchy' | 'Confederation' | 'Federation' | 'Unitary State';
export type DevelopmentLevel = 'UnderDeveloped' | 'Developing' | 'Mature' | 'Developed' | 'Well Developed' | 'Very Developed';
export type PowerSource = 'Aristocracy' | 'Ideocracy' | 'Kratocracy' | 'Democracy' | 'Meritocracy';
export type StarportClass = 'X' | 'E' | 'D' | 'C' | 'B' | 'A';
export type TravelZone = 'Green' | 'Amber' | 'Red';

export type GasWorldClass = 'I' | 'II' | 'III' | 'IV' | 'V';
export type BodyType = 'star' | 'disk' | 'dwarf' | 'terrestrial' | 'ice' | 'gas' | 'ring';
export type OrbitLevel = 0 | 1 | 2;

// =====================
// Core Interfaces
// =====================

export interface Star {
  id: string;
  class: StellarClass;
  grade: StellarGrade;
  mass: number;
  luminosity: number;
  color: string;
  isPrimary: boolean;
  orbitDistance?: number;
  orbits?: 'primary' | 'companion';
}

export interface ZoneBoundaries {
  infernal: { min: number; max: number };
  hot: { min: number; max: number };
  conservative: { min: number; max: number };
  cold: { min: number; max: number };
  outer: { min: number; max: null };
}

// FR-042: v2 zone architecture
export type ZoneId = 'Infernal' | 'Hot' | 'Conservative' | 'Cool' | 'FrostLine' | 'O1' | 'O2' | 'O3' | 'O4' | 'O5';

export interface OuterZoneBoundaries {
  o1: { minAU: number; maxAU: number };
  o2: { minAU: number; maxAU: number };
  o3: { minAU: number; maxAU: number };
  o4: { minAU: number; maxAU: number };
  o5: { minAU: number; maxAU: number };
}

export interface MainWorld {
  type: WorldType;
  size: number;                // diameter in km (derived from mass + density)
  lesserEarthType?: LesserEarthType;
  
  // QA-023: Mass + Density physics pipeline
  massEM: number;              // mass in Earth Masses
  densityGcm3: number;         // density in g/cm³
  
  gravity: number;             // derived from mass + density
  radius: number;              // derived from mass + density
  escapeVelocity: number;      // derived from mass + density
  
  atmosphere: AtmosphereType;
  atmosphereTL: number;
  
  temperature: TemperatureType;
  temperatureTL: number;
  
  hazard: HazardType;
  hazardIntensity: HazardIntensityType;
  hazardIntensityTL: number;
  
  biochemicalResources: ResourceLevel;
  
  // QA-009: Tech Level affects habitability, so it's stored in MainWorld
  techLevel: number;
  
  habitability: number;
  
  // Component breakdown for debugging/analysis
  habitabilityComponents?: {
    gravity: number;
    atmosphere: number;
    temperature: number;
    hazard: number;
    hazardIntensity: number;
    biochem: number;
    techLevel: number;
  };
  
  zone: Zone;
  distanceAU: number;
}

export interface Starport {
  class: StarportClass;
  pss: number;              // Port Size Score (GDP-derived, pre-cap)
  rawClass: StarportClass;  // Class from PSS before TL capability cap
  tlCap: StarportClass;     // TL capability ceiling
  annualTrade: number;      // Annual port trade volume (Credits/year)
  weeklyBase: number;       // annualTrade ÷ 364
  weeklyActivity: number;   // weeklyBase × 3D6 (this week's actual throughput)
  weeklyRoll?: number;      // FR-029: stored 3D6 roll result
  hasNavalBase: boolean;
  hasScoutBase: boolean;
  hasPirateBase: boolean;
  // QA-026 after-starport: founding starport metrics before depression penalty
  foundingClass?: StarportClass;
  foundingPSS?: number;
  foundingRawClass?: StarportClass;
}

// FR-030: Ships in the Area
export type ShipLocation = 'Orbit' | 'System' | 'Docked';

export interface ShipInArea {
  name: string;
  dt: number;
  monthlyOperatingCost: number;
  purchasePrice: number;    // FR-032: for income-years calculation
  visitingCost: number;     // QA-058: raw visiting cost in Credits
  location: ShipLocation;
  systemPosition?: number;  // QA-024: body index 1–N, only set when location === 'System'
  trafficPool: 'small' | 'civilian' | 'warship';
}

export interface ShipsInAreaResult {
  budget: number;
  distributionRoll: number;
  smallCraftBudget: number;
  civilianBudget: number;
  warshipBudget: number;
  ships: ShipInArea[];
}

export interface Inhabitants {
  populated?: boolean;      // false = unpopulated world; undefined treated as true
  habitatType?: string;     // set when Hab ≤ 0 and populated — inhabitants live in artificial habitat
  techLevel: number;
  foundingTL?: number;      // QA-026: original TL before depression penalty
  effectiveTL?: number;     // QA-026: TL after depression penalty
  population: number;
  wealth: WealthLevel;
  powerStructure: PowerStructure;
  development: DevelopmentLevel;
  sourceOfPower: PowerSource;
  governance: number;
  starport: Starport;
  travelZone: TravelZone;
  travelZoneReason?: string;
  cultureTraits: string[];
}

export interface PlanetaryBody {
  id: string;
  type: BodyType;
  mass: number;
  zone: Zone;
  distanceAU: number;
  gasClass?: GasWorldClass;
  lesserEarthType?: LesserEarthType;
  gravity?: number;
  atmosphere?: string;
  density?: number;
  // Derived physical properties — see QA-009, REF-010-planet-densities.md
  densityGcm3?: number;
  radiusKm?: number;
  diameterKm?: number;
  surfaceGravityG?: number;
  escapeVelocityMs?: number;

  // FR-041/042/043: v2 optional fields (additive, non-breaking)
  orbitLevel?: OrbitLevel;
  parentId?: string;

  // Composition
  composition?: string;
  reactivityDM?: number;

  // Atmosphere (v2)
  atmosphereCompositionAbiotic?: AtmosphereComp;
  atmosphereComposition?: AtmosphereComp;
  atmosphereDensityV2?: AtmoDensity;

  // Habitability waterfall (v2)
  temperatureV2?: TemperatureType;
  hazardV2?: HazardType;
  hazardIntensityV2?: HazardIntensity;
  biochem?: BiochemTier;
  biosphereRating?: BiosphereRating;
  biosphereRoll?: number;
  biosphereTN?: number;
  hasSubsurfaceOceanOverride?: boolean;

  baselineHabitability?: number;
  habitabilityBreakdown?: {
    gravity: number;
    atmosphereComp: number;
    atmosphereDensity: number;
    temperature: number;
    hazard: number;
    hazardIntensity: number;
    biochem: number;
    biosphere: number;
  };

  // Positioning (v2)
  positionRoll?: number;
  positionRerollCount?: number;
  wasEjected?: boolean;
  ejectionReason?: 'saturation' | 'gravitational';
  wasShepherded?: boolean;

  // Selection (v2)
  wasSelectedAsMainworld?: boolean;
  tiebreakerRank?: number;

  // Rings (v2)
  ringProminence?: RingProminence;

  // FR-044: Level 2 children (moons)
  level?: 0 | 1 | 2;
  wasCapturedTerrestrial?: boolean;
  massCapApplied?: boolean;
  originalRolledMass?: number;
  parentDistanceAU?: number; // parent's star-distance, used when moon wins mainworld
  moonOrbitAU?: number;      // orbital distance from parent (for moons)

  // FR-044: Ring classification
  ringClass?: 'faint' | 'visible' | 'showpiece' | 'great';
}

export interface StarSystem {
  id: string;
  createdAt: number;
  name?: string;
  /** 3D map coordinates (parsecs) */
  x?: number;
  y?: number;
  z?: number;
  /** Source star ID from 3D interstellar map */
  sourceStarId?: string;
  
  primaryStar: Star;
  companionStars: Star[];
  zones: ZoneBoundaries;
  
  mainWorld: MainWorld;
  inhabitants: Inhabitants;
  
  circumstellarDisks: PlanetaryBody[];
  dwarfPlanets: PlanetaryBody[];
  terrestrialWorlds: PlanetaryBody[];
  iceWorlds: PlanetaryBody[];
  gasWorlds: PlanetaryBody[];
  
  /** FR-032: the economic assumptions this world was generated with */
  economicPreset?: TLProductivityPreset;
  /** Snapshot of preset label used at generation time */
  economicPresetLabel?: string;
  /** Full snapshot of preset values used at generation time */
  economicPresetSnapshot?: TLProductivityPreset;
  /** QA-058: allow ships to be generated at X-class ports */
  allowShipsAtXPort?: boolean;

  // FR-042: v2 positioning fields (additive, non-breaking)
  heliopauseAU?: number;
  frostLineAU?: number;
  outerSystemZones?: OuterZoneBoundaries;
  ejectedBodies?: PlanetaryBody[];
  consumedBodies?: PlanetaryBody[];

  // FR-043: v2 mainworld selection
  mainworldId?: string;
  mainworldSelectionLog?: {
    candidates: Array<{ id: string; score: number; rank: number }>;
    tiebreakerApplied: boolean;
    fallbackTriggered: boolean;
    fallbackReason?: string;
  };

  // FR-044: Level 2 children (moons and rings)
  moons?: PlanetaryBody[];
  rings?: PlanetaryBody[];

  // FRD-047: Batch management
  batchId?: string;
  batchOrder?: number;
}

// =====================
// Batch Management (FRD-047)
// =====================

export interface StarSystemBatch {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  /** Source: 'manual', '3dmap-import', 'generated' */
  source: string;
  /** If imported from 3D map, store the original map metadata */
  sourceMapId?: string;
  /** Systems in this batch */
  systemIds: string[];
  /** Batch-level notes */
  notes?: string;
}

// =====================
// Dice Roll Types
// =====================

export interface DiceRoll {
  notation: string;
  dice: number[];
  modifier: number;
  total: number;
}

export interface RollResult {
  value: number;
  rolls: DiceRoll[];
}

// =====================
// UI Types
// =====================

export type ViewMode = 'dashboard' | 'system' | 'settings' | 'glossary' | 'systems';

export interface GeneratorState {
  currentSystem: StarSystem | null;
  savedSystems: StarSystem[];
  view: ViewMode;
  isGenerating: boolean;
}

export type ProductivityCurve = 'mneme' | 'flat' | 'linear' | 'custom';

export interface TLProductivityPreset {
  id: string;
  name: string;
  label?: string;
  description: string;
  /** Primary calibration: SOC 7 monthly income at the base TL */
  baseIncome: number;
  /** The TL that serves as the anchor for the curve (default: 9) */
  baseTL: number;
  curve: ProductivityCurve;
  linearMultiplier?: number;
  /** Direct override table for custom curves */
  soc7IncomeByTL?: Record<number, number>;
  /** Derived: years for SOC 7 to buy the 10DT Boat at baseTL */
  boatYears?: number;
  /** Roll-profile weights bundled with the preset (v1.3.106) */
  wealthWeights?: TableWeights;
  developmentWeights?: TableWeights;
  powerWeights?: TableWeights;
  govWeights?: TableWeights;
}

export interface TableWeights {
  dice: number[]; // length 11, indices 0..10 map to rolls 2..12
}

export interface GeneratorOptions {
  starClass: StellarClass | 'random';
  starGrade: StellarGrade | 'random';
  mainWorldType: WorldType | 'random';
  populated: boolean;
  tlProductivityPreset?: TLProductivityPreset;
  developmentWeights?: TableWeights;
  powerWeights?: TableWeights;
  govWeights?: TableWeights;
  wealthWeights?: TableWeights;
  /** FR-033: optional goal-loop targets */
  goalStarportMin?: StarportClass;
  goalMinPopulation?: number;
  goalHabitable?: boolean;
  /** QA-058: allow ships to be generated at X-class ports */
  allowShipsAtXPort?: boolean;
  /** FR-042: v2 positioning feature flag */
  v2Positioning?: boolean;
  /** FR-041: active extraterrestrial life assumptions preset ID */
  activeLifeAssumptionsId?: string;
  /** QA-Mega+: allow Mega+ structure habitats (default OFF for CE/Traveller) */
  allowMegaStructures?: boolean;
}

export interface ExtraterrestrialLifeAssumptions {
  id: string;
  name: string;
  description: string;
  biosphereTN: number;
  biosphereDisadvantage: number;
  minBiochemForBiosphereRoll: 'Common' | 'Abundant' | 'Rich';
  enableTransitionalAtmospheres: boolean;
  biochemOffsetRule: 'standard' | 'halved' | 'none';
}

export type BodyAnnotations = Record<string, { name: string; notes: string }>;
