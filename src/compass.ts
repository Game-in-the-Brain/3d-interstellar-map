import * as THREE from 'three';

const AXES = [
  { name: 'Coreward', dir: new THREE.Vector3(1, 0, 0), color: '#ff4444' },
  { name: 'Spinward', dir: new THREE.Vector3(0, 1, 0), color: '#44ffff' },
  { name: 'Tailward', dir: new THREE.Vector3(0, -1, 0), color: '#ff44ff' },
  { name: 'Outward', dir: new THREE.Vector3(-1, 0, 0), color: '#ffff44' },
];

export function createCompassContainer(): HTMLElement {
  const container = document.createElement('div');
  container.className = 'compass-container';
  container.innerHTML = `
    <svg width="120" height="120" viewBox="-60 -60 120 120" class="compass-svg">
      ${AXES.map((axis, i) => `
        <g id="compass-${i}" transform="rotate(0)">
          <path d="M0,-28 L5,-8 L-5,-8 Z" fill="${axis.color}" opacity="0.9" />
          <text y="-34" text-anchor="middle" fill="${axis.color}" font-size="9" font-weight="600">${axis.name}</text>
        </g>
      `).join('')}
      <circle r="4" fill="#ffffff" opacity="0.8" />
    </svg>
  `;
  return container;
}

export function updateCompass(camera: THREE.PerspectiveCamera): void {
  for (let i = 0; i < AXES.length; i++) {
    const axis = AXES[i];
    const dir = axis.dir.clone().applyQuaternion(camera.quaternion.clone().invert());
    // Project onto camera XY plane; ignore Z (depth)
    const angle = Math.atan2(dir.y, dir.x) * (180 / Math.PI);
    const el = document.getElementById(`compass-${i}`);
    if (el) {
      el.setAttribute('transform', `rotate(${angle - 90})`);
    }
  }
}
