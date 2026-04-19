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
    xyRoll: number;
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
