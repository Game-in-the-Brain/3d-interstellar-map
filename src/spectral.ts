export const SPECTRAL_COLOURS: Record<string, number> = {
  O: 0xa5c8ff,
  B: 0xc2d8ff,
  A: 0xffffff,
  F: 0xfff8e7,
  G: 0xffe4b5,
  K: 0xffb366,
  M: 0xff6b6b,
};

export function getSpectralColor(spec: string): number {
  if (!spec) return 0x888888;
  const first = spec[0].toUpperCase();
  return SPECTRAL_COLOURS[first] ?? 0x888888;
}

export function absMagToRadius(absMag: number): number {
  // Map absMag range [-8, 16] → radius [2.0, 0.3] linearly, clamp at ends
  const t = (absMag + 8) / 24; // normalize to 0..1
  const r = 2.0 - t * 1.7; // 2.0 down to 0.3
  return Math.max(0.3, Math.min(2.0, r));
}
