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

export interface AppState {
  selectedStarIds: Set<string>;
  starCount: number;
  catalogue: CatalogueKey;
  unit: 'pc' | 'ly';
}
