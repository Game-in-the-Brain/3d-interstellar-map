import * as THREE from 'three';
import type { Star } from './types';
import { pcToScene } from './coordinateUtils';
import { getSpectralColor, absMagToRadius } from './spectral';

export class StarGroup {
  group: THREE.Group;
  private starMap = new Map<string, THREE.Vector3>();

  constructor(stars: Star[], count: number) {
    this.group = new THREE.Group();
    const sliced = stars.slice(0, count);

    // Use InstancedMesh for performance
    const geometry = new THREE.SphereGeometry(1, 16, 16);
    const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const mesh = new THREE.InstancedMesh(geometry, material, count);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

    const dummy = new THREE.Object3D();
    const color = new THREE.Color();

    for (let i = 0; i < sliced.length; i++) {
      const star = sliced[i];
      dummy.position.set(pcToScene(star.x), pcToScene(star.y), pcToScene(star.z));
      const radius = absMagToRadius(star.absMag);
      dummy.scale.setScalar(radius);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      mesh.setColorAt(i, color.setHex(getSpectralColor(star.spec)));
      mesh.userData[`star_${star.id}`] = i; // map id to instance index
      this.starMap.set(star.id, dummy.position.clone());
    }

    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    this.group.add(mesh);
  }

  getPositionById(id: string): THREE.Vector3 | undefined {
    return this.starMap.get(id);
  }

  getAllPositions(): Map<string, THREE.Vector3> {
    return this.starMap;
  }

  dispose(): void {
    this.group.traverse((child) => {
      if (child instanceof THREE.InstancedMesh) {
        child.geometry.dispose();
        child.material.dispose();
      }
    });
  }
}

export function createSolMarker(): THREE.Mesh {
  const geo = new THREE.SphereGeometry(0.12, 16, 16);
  const mat = new THREE.MeshBasicMaterial({ color: 0xffd700 });
  const mesh = new THREE.Mesh(geo, mat);

  // Emissive crosshair ring
  const ringGeo = new THREE.RingGeometry(0.18, 0.22, 32);
  const ringMat = new THREE.MeshBasicMaterial({ color: 0xffd700, side: THREE.DoubleSide });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.userData.isSolRing = true;
  mesh.add(ring);

  return mesh;
}
