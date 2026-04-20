export interface Star {
  id: string;
  name: string;
  x: number;
  y: number;
  z: number;
  spec: string;
  absMag: number;
}

export type CatalogueKey = '10pc' | '50pc' | '100pc';

export type AppMode = 'hyg' | 'generate';

export interface GeneratedStar extends Star {
  pass: number;
  parentId: string | null;
  rolls: {
    classRoll: number;
    gradeRoll: number;
    /** Recursive Sextet Protocol: [d66, d66] → 1,296 outcomes for XY azimuth */
    xyRoll: [number, number];
    /** Spherical Volume Bell Curve: d66 → cosine-weighted elevation */
    zRoll: number;
    distanceRoll: number;
  };
  distanceFromParent: number;
  hasMwgSystem: boolean;
}

export interface GenerationParameters {
  density: 'sparse' | 'average' | 'dense' | 'custom';
  starCountDice: number;
  distanceDice: number;
  distanceMultiplier: number;
  starCountMultiplier: number;
  maxPasses: number;
}

export type StellarClass = 'O' | 'B' | 'A' | 'F' | 'G' | 'K' | 'M';
export type StellarGrade = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
export type ClassTable = Record<number, StellarClass>;
export type GradeTable = Record<number, StellarGrade>;

export interface GenerationTables {
  classTable: ClassTable;
  gradeTable: GradeTable;
}

export interface MnemeMapExport {
  mnemeFormat: 'starmap-v1';
  name: string;
  version: string;
  exportedAt: string;
  parameters: GenerationParameters;
  tables: GenerationTables;
  stars: GeneratedStar[];
  mwgSystems: Record<string, Record<string, unknown>>;
}

export interface AppState {
  selectedStarIds: Set<string>;
  starCount: number;
  catalogue: CatalogueKey;
  unit: 'pc' | 'ly';
}

export interface MapState {
  version: string;
  savedAt: string;
  camera: { x: number; y: number; z: number; targetX: number; targetY: number; targetZ: number };
  catalogue: CatalogueKey;
  starCount: number;
  renderMode: 'points' | 'spheres';
  sphereScale: number;
  brightness: number;
  unit: 'pc' | 'ly';
  showNames: boolean;
  lockSelection: boolean;
  orderedPathMode: boolean;
  orderedSelection: string[];
  selectedIds: string[];
}
