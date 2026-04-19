import * as THREE from 'three';
import { PC_TO_LY } from './coordinateUtils';
import type { StarRenderer } from './stars';

export class SelectionManager {
  selectedIds: Set<string> = new Set();
  private linesGroup: THREE.Group;
  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();
  private starPositions = new Map<string, THREE.Vector3>();
  private renderer: StarRenderer | null = null;

  constructor(
    scene: THREE.Scene,
    private camera: THREE.PerspectiveCamera,
  ) {
    this.linesGroup = new THREE.Group();
    scene.add(this.linesGroup);
  }

  setRenderer(renderer: StarRenderer): void {
    this.renderer = renderer;
    this.starPositions.clear();
    const positions = renderer.getAllPositions();
    for (const [id, pos] of positions) {
      this.starPositions.set(id, pos.clone());
    }
    this.updateLines();
  }

  onPointerDown(clientX: number, clientY: number): boolean {
    if (!this.renderer) return false;
    this.mouse.x = (clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(clientY / window.innerHeight) * 2 + 1;
    this.raycaster.setFromCamera(this.mouse, this.camera);

    const intersects = this.raycaster.intersectObjects(this.renderer.group.children, false);
    if (intersects.length > 0) {
      const hit = intersects[0];
      let starId: string | null = null;

      if (hit.object instanceof THREE.InstancedMesh && hit.instanceId !== undefined) {
        const mesh = hit.object as THREE.InstancedMesh;
        const instanceId = hit.instanceId;
        for (const [key, val] of Object.entries(mesh.userData)) {
          if (val === instanceId && key.startsWith('star_')) {
            starId = key.slice(5);
            break;
          }
        }
      } else if (hit.object instanceof THREE.Points && hit.index !== undefined) {
        starId = this.renderer.getStarIdAtIndex(hit.index);
      }

      if (starId) {
        if (this.selectedIds.has(starId)) {
          this.selectedIds.delete(starId);
        } else {
          this.selectedIds.add(starId);
        }
        this.updateLines();
        return true;
      }
    }
    return false;
  }

  clear(): void {
    this.selectedIds.clear();
    this.updateLines();
  }

  getDistances(unit: 'pc' | 'ly'): { pair: string; dist: number }[] {
    const ids = Array.from(this.selectedIds);
    const result: { pair: string; dist: number }[] = [];
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const a = this.starPositions.get(ids[i]);
        const b = this.starPositions.get(ids[j]);
        if (!a || !b) continue;
        const dPc = Math.sqrt(
          (a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2
        );
        const dist = unit === 'ly' ? dPc * PC_TO_LY : dPc;
        result.push({ pair: `${ids[i]} ↔ ${ids[j]}`, dist: Math.round(dist * 1000) / 1000 });
      }
    }
    return result;
  }

  private updateLines(): void {
    while (this.linesGroup.children.length > 0) {
      const child = this.linesGroup.children[0];
      if (child instanceof THREE.LineSegments) {
        child.geometry.dispose();
        (child.material as THREE.Material).dispose();
      }
      this.linesGroup.remove(child);
    }

    const ids = Array.from(this.selectedIds);
    if (ids.length < 2) return;

    const positions: number[] = [];
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const a = this.starPositions.get(ids[i]);
        const b = this.starPositions.get(ids[j]);
        if (!a || !b) continue;
        positions.push(a.x, a.y, a.z, b.x, b.y, b.z);
      }
    }

    if (positions.length === 0) return;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    const mat = new THREE.LineBasicMaterial({
      color: 0xaaffff,
      transparent: true,
      opacity: 0.85,
    });
    this.linesGroup.add(new THREE.LineSegments(geo, mat));
  }
}
