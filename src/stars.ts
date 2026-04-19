import * as THREE from 'three';
import type { Star } from './types';
import { pcToScene } from './coordinateUtils';
import { getSpectralColor, absMagToRadius } from './spectral';

export type RenderMode = 'points' | 'spheres';

const POINT_VERTEX_SHADER = `
  attribute float size;
  attribute vec3 color;
  varying vec3 vColor;
  void main() {
    vColor = color;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = size * (300.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const POINT_FRAGMENT_SHADER = `
  varying vec3 vColor;
  void main() {
    float d = length(gl_PointCoord - vec2(0.5));
    if (d > 0.5) discard;
    float strength = 1.0 - (d * 2.0);
    strength = pow(strength, 1.4);
    gl_FragColor = vec4(vColor * strength, strength);
  }
`;

export class StarRenderer {
  group: THREE.Group;
  private mode: RenderMode;
  private stars: Star[];
  count: number;
  private sphereScale: number;
  private brightness: number;
  private selectedIds: Set<string> = new Set();
  private pointsMesh: THREE.Points | null = null;
  private instancedMesh: THREE.InstancedMesh | null = null;
  private pointSizes: Float32Array | null = null;
  private pointColors: Float32Array | null = null;

  constructor(stars: Star[], count: number, mode: RenderMode, sphereScale: number = 1.0, brightness: number = 1.0) {
    this.stars = stars;
    this.count = Math.min(count, stars.length);
    this.mode = mode;
    this.sphereScale = sphereScale;
    this.brightness = brightness;
    this.group = new THREE.Group();
    this.build();
  }

  setMode(mode: RenderMode): void {
    if (this.mode === mode) return;
    this.mode = mode;
    this.dispose();
    this.build();
    this.applySelection();
  }

  setSphereScale(scale: number): void {
    if (this.sphereScale === scale) return;
    this.sphereScale = scale;
    if (this.mode === 'spheres') {
      this.dispose();
      this.build();
      this.applySelection();
    }
  }

  setBrightness(brightness: number): void {
    if (this.brightness === brightness) return;
    this.brightness = brightness;
    this.dispose();
    this.build();
    this.applySelection();
  }

  setSelection(selectedIds: Set<string>): void {
    this.selectedIds = new Set(selectedIds);
    this.applySelection();
  }

  getStarIdAtIndex(index: number): string | null {
    if (index >= 0 && index < this.count) {
      return this.stars[index].id;
    }
    return null;
  }

  getStarById(id: string): Star | undefined {
    return this.stars.find((s, i) => i < this.count && s.id === id);
  }

  getPositionById(id: string): THREE.Vector3 | undefined {
    const star = this.getStarById(id);
    if (!star) return undefined;
    return new THREE.Vector3(pcToScene(star.x), pcToScene(star.y), pcToScene(star.z));
  }

  getAllPositions(): Map<string, THREE.Vector3> {
    const map = new Map<string, THREE.Vector3>();
    for (let i = 0; i < this.count; i++) {
      const star = this.stars[i];
      map.set(star.id, new THREE.Vector3(pcToScene(star.x), pcToScene(star.y), pcToScene(star.z)));
    }
    return map;
  }

  private applySelection(): void {
    if (this.mode === 'points' && this.pointsMesh && this.pointSizes && this.pointColors) {
      const sizesAttr = this.pointsMesh.geometry.attributes.size as THREE.BufferAttribute;
      const colorsAttr = this.pointsMesh.geometry.attributes.color as THREE.BufferAttribute;
      const colorObj = new THREE.Color();

      for (let i = 0; i < this.count; i++) {
        const star = this.stars[i];
        const isSelected = this.selectedIds.has(star.id);
        const baseSize = this.absMagToPointSize(star.absMag);
        this.pointSizes[i] = isSelected ? baseSize * 1.8 * this.brightness : baseSize * this.brightness;

        colorObj.setHex(getSpectralColor(star.spec));
        if (isSelected) {
          colorObj.addScalar(0.25);
          colorObj.r = Math.max(0, Math.min(1, colorObj.r));
          colorObj.g = Math.max(0, Math.min(1, colorObj.g));
          colorObj.b = Math.max(0, Math.min(1, colorObj.b));
        }
        this.pointColors[i * 3] = colorObj.r;
        this.pointColors[i * 3 + 1] = colorObj.g;
        this.pointColors[i * 3 + 2] = colorObj.b;
      }

      sizesAttr.needsUpdate = true;
      colorsAttr.needsUpdate = true;
    } else if (this.mode === 'spheres' && this.instancedMesh) {
      const dummy = new THREE.Object3D();
      const color = new THREE.Color();

      for (let i = 0; i < this.count; i++) {
        const star = this.stars[i];
        const isSelected = this.selectedIds.has(star.id);
        const baseRadius = absMagToRadius(star.absMag);
        const radius = isSelected
          ? baseRadius * 1.3 * this.sphereScale * this.brightness
          : baseRadius * this.sphereScale * this.brightness;

        dummy.position.set(pcToScene(star.x), pcToScene(star.y), pcToScene(star.z));
        dummy.scale.setScalar(radius);
        dummy.updateMatrix();
        this.instancedMesh.setMatrixAt(i, dummy.matrix);

        color.setHex(getSpectralColor(star.spec));
        if (isSelected) {
          color.addScalar(0.2);
          color.r = Math.max(0, Math.min(1, color.r));
          color.g = Math.max(0, Math.min(1, color.g));
          color.b = Math.max(0, Math.min(1, color.b));
        }
        this.instancedMesh.setColorAt(i, color);
      }

      this.instancedMesh.instanceMatrix.needsUpdate = true;
      if (this.instancedMesh.instanceColor) this.instancedMesh.instanceColor.needsUpdate = true;
    }
  }

  private absMagToPointSize(absMag: number): number {
    const t = (absMag + 8) / 24;
    return Math.max(1.5, Math.min(6.0, 6.0 - t * 4.5));
  }

  private build(): void {
    if (this.mode === 'points') {
      this.buildPoints();
    } else {
      this.buildSpheres();
    }
  }

  private buildPoints(): void {
    const positions = new Float32Array(this.count * 3);
    const colors = new Float32Array(this.count * 3);
    const sizes = new Float32Array(this.count);
    const colorObj = new THREE.Color();

    for (let i = 0; i < this.count; i++) {
      const star = this.stars[i];
      positions[i * 3] = pcToScene(star.x);
      positions[i * 3 + 1] = pcToScene(star.y);
      positions[i * 3 + 2] = pcToScene(star.z);

      colorObj.setHex(getSpectralColor(star.spec));
      colors[i * 3] = colorObj.r;
      colors[i * 3 + 1] = colorObj.g;
      colors[i * 3 + 2] = colorObj.b;

      sizes[i] = this.absMagToPointSize(star.absMag) * this.brightness;
    }

    this.pointSizes = sizes;
    this.pointColors = colors;

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const mat = new THREE.ShaderMaterial({
      vertexShader: POINT_VERTEX_SHADER,
      fragmentShader: POINT_FRAGMENT_SHADER,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.pointsMesh = new THREE.Points(geo, mat);
    this.group.add(this.pointsMesh);
  }

  private buildSpheres(): void {
    const geometry = new THREE.SphereGeometry(1, 16, 16);
    const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const mesh = new THREE.InstancedMesh(geometry, material, this.count);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

    const dummy = new THREE.Object3D();
    const color = new THREE.Color();

    for (let i = 0; i < this.count; i++) {
      const star = this.stars[i];
      dummy.position.set(pcToScene(star.x), pcToScene(star.y), pcToScene(star.z));
      const radius = absMagToRadius(star.absMag) * this.sphereScale * this.brightness;
      dummy.scale.setScalar(radius);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      mesh.setColorAt(i, color.setHex(getSpectralColor(star.spec)));
      mesh.userData[`star_${star.id}`] = i;
    }

    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    this.instancedMesh = mesh;
    this.group.add(mesh);
  }

  dispose(): void {
    if (this.pointsMesh) {
      this.pointsMesh.geometry.dispose();
      if (Array.isArray(this.pointsMesh.material)) {
        this.pointsMesh.material.forEach((m) => m.dispose());
      } else {
        this.pointsMesh.material.dispose();
      }
      this.pointsMesh = null;
    }
    if (this.instancedMesh) {
      this.instancedMesh.geometry.dispose();
      if (Array.isArray(this.instancedMesh.material)) {
        this.instancedMesh.material.forEach((m) => m.dispose());
      } else {
        this.instancedMesh.material.dispose();
      }
      this.instancedMesh = null;
    }
    while (this.group.children.length > 0) {
      this.group.remove(this.group.children[0]);
    }
  }
}

export function createSolMarker(): THREE.Mesh {
  const geo = new THREE.SphereGeometry(0.12, 16, 16);
  const mat = new THREE.MeshBasicMaterial({ color: 0xffd700 });
  const mesh = new THREE.Mesh(geo, mat);

  const ringGeo = new THREE.RingGeometry(0.18, 0.22, 32);
  const ringMat = new THREE.MeshBasicMaterial({ color: 0xffd700, side: THREE.DoubleSide });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.userData.isSolRing = true;
  mesh.add(ring);

  return mesh;
}
