import * as THREE from 'three';

function mulberry32(seed: number): () => number {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createStarfield(count: number = 20000, seed: number = 42): THREE.Points {
  const rng = mulberry32(seed);
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);

  // Stronger coreward density bias, tighter shell for visible gradient
  const k = 0.03;
  const rMin = 40;
  const rMax = 120;
  const maxWeight = Math.exp(k * rMax);
  const colorObj = new THREE.Color();

  let i = 0;
  while (i < count) {
    // Uniform random point in spherical shell via rejection sampling in cube
    const ux = rng() * 2 - 1;
    const uy = rng() * 2 - 1;
    const uz = rng() * 2 - 1;
    const r = Math.sqrt(ux * ux + uy * uy + uz * uz);
    if (r === 0 || r < 0.001) continue;

    // Scale to shell [rMin, rMax]
    const scale = (rMin + rng() * (rMax - rMin)) / r;
    const x = ux * scale;
    const y = uy * scale;
    const z = uz * scale;

    // Coreward density bias: density(x) ∝ e^(k·x)
    const weight = Math.exp(k * x);
    if (rng() > weight / maxWeight) continue;

    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;

    // Directional colour tinge:
    // +Y Spinward → bluish, -Y Tailward → reddish
    const yNorm = Math.max(-1, Math.min(1, y / rMax));
    const hue = yNorm > 0 ? 0.6 : 0.0;
    const sat = Math.abs(yNorm) * 0.35 + rng() * 0.1;
    const light = 0.55 + rng() * 0.35;
    colorObj.setHSL(hue, sat, light);
    colors[i * 3] = colorObj.r;
    colors[i * 3 + 1] = colorObj.g;
    colors[i * 3 + 2] = colorObj.b;

    i++;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const mat = new THREE.PointsMaterial({
    size: 1.2,
    sizeAttenuation: false,
    vertexColors: true,
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
  });

  return new THREE.Points(geo, mat);
}
