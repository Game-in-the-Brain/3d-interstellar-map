export const PC_TO_LY = 3.26156;
export const SCENE_SCALE = 1.0; // 1 parsec = 1 scene unit

export function pcToScene(pc: number): number {
  return pc * SCENE_SCALE;
}

export function sceneToPc(scene: number): number {
  return scene / SCENE_SCALE;
}

export function distanceBetween(a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}
