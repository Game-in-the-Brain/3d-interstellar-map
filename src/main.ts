import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { Star, CatalogueKey } from './types';
import { createStarfield } from './starfield';
import { StarGroup, createSolMarker } from './stars';
import { createCompassContainer, updateCompass } from './compass';
import { SelectionManager } from './selection';
import { setupUI, updateFPSMeter, updateUnitButton, showSuggestion } from './ui';

const VERSION = '0.1.0';

let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let controls: OrbitControls;
let starfield: THREE.Points;
let solMarker: THREE.Mesh;
let currentStarGroup: StarGroup | null = null;
let selectionManager: SelectionManager | null = null;

const catalogues: Record<CatalogueKey, Star[]> = { '10pc': [], '50pc': [], '100pc': [] };
let currentCatalogue: CatalogueKey = '100pc';
let starCount = 200;
let unit: 'pc' | 'ly' = 'pc';

// FPS tracking
let lastFpsTime = performance.now();
let frameCount = 0;
let currentFPS = 60;
let greenSince = 0;

// Touch handling
let touchStartX = 0;
let touchStartY = 0;

// UI refs
let ui: ReturnType<typeof setupUI> | null = null;

async function loadCatalogues(): Promise<void> {
  const keys: CatalogueKey[] = ['10pc', '50pc', '100pc'];
  for (const key of keys) {
    const res = await fetch(`./data/stars-${key}.json`);
    catalogues[key] = (await res.json()) as Star[];
  }
}

function getMaxStars(): number {
  return catalogues[currentCatalogue].length;
}

function rebuildStars(): void {
  const stars = catalogues[currentCatalogue];
  const count = Math.min(starCount, stars.length);

  if (currentStarGroup) {
    scene.remove(currentStarGroup.group);
    currentStarGroup.dispose();
  }

  currentStarGroup = new StarGroup(stars, count);
  scene.add(currentStarGroup.group);

  if (!selectionManager) {
    selectionManager = new SelectionManager(scene, camera, currentStarGroup.group);
  } else {
    selectionManager.updateStarGroup(currentStarGroup.group);
  }

  updateSelectionUI();
}

function updateSelectionUI(): void {
  if (!ui || !selectionManager) return;
  const ids = Array.from(selectionManager.selectedIds);
  if (ids.length === 0) {
    ui.selectionList.innerHTML = '<div class="selection-empty">No stars selected. Click stars to select.</div>';
    return;
  }

  const dists = selectionManager.getDistances(unit);
  let html = `<div class="selection-count">${ids.length} star${ids.length > 1 ? 's' : ''} selected</div>`;
  if (dists.length > 0) {
    html += '<ul class="distance-list">';
    for (const d of dists) {
      html += `<li><span class="dist-pair">${escapeHtml(d.pair)}</span> <span class="dist-val">${d.dist.toFixed(3)} ${unit}</span></li>`;
    }
    html += '</ul>';
  }
  ui.selectionList.innerHTML = html;
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function onResize(): void {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  // Re-seed starfield deterministically from canvas dimensions
  if (starfield) {
    scene.remove(starfield);
    starfield.geometry.dispose();
    (starfield.material as THREE.Material).dispose();
    const seed = Math.floor(window.innerWidth) + Math.floor(window.innerHeight) * 9973;
    starfield = createStarfield(20000, seed);
    scene.add(starfield);
  }
}

function onPointer(clientX: number, clientY: number): void {
  if (!selectionManager) return;
  const handled = selectionManager.onPointerDown(clientX, clientY);
  if (handled) updateSelectionUI();
}

function onClick(event: MouseEvent): void {
  onPointer(event.clientX, event.clientY);
}

function onTouchStart(event: TouchEvent): void {
  if (event.touches.length === 1) {
    touchStartX = event.touches[0].clientX;
    touchStartY = event.touches[0].clientY;
  }
}

function onTouchEnd(event: TouchEvent): void {
  if (event.changedTouches.length === 1) {
    const dx = event.changedTouches[0].clientX - touchStartX;
    const dy = event.changedTouches[0].clientY - touchStartY;
    if (Math.sqrt(dx * dx + dy * dy) < 10) {
      event.preventDefault();
      onPointer(event.changedTouches[0].clientX, event.changedTouches[0].clientY);
    }
  }
}

function onKeyDown(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    onClear();
  }
}

function onStarCountChange(n: number): void {
  starCount = n;
  rebuildStars();
}

function onCatalogueChange(key: CatalogueKey): void {
  currentCatalogue = key;
  const max = getMaxStars();
  if (ui) {
    ui.starSlider.max = String(max);
    if (starCount > max) {
      starCount = max;
      ui.starSlider.value = String(max);
      ui.starSliderValue.textContent = String(max);
    }
  }
  rebuildStars();
}

function onUnitToggle(): void {
  unit = unit === 'pc' ? 'ly' : 'pc';
  if (ui) updateUnitButton(ui.unitToggle, unit);
  updateSelectionUI();
}

function onClear(): void {
  if (selectionManager) {
    selectionManager.clear();
    updateSelectionUI();
  }
}

function animate(): void {
  requestAnimationFrame(animate);
  controls.update();
  updateCompass(camera);
  renderer.render(scene, camera);

  // FPS
  const now = performance.now();
  frameCount++;
  if (now - lastFpsTime >= 1000) {
    currentFPS = frameCount;
    frameCount = 0;
    lastFpsTime = now;
    if (ui) {
      updateFPSMeter(ui.fpsMeter, currentFPS);
      if (currentFPS >= 55) {
        if (greenSince === 0) greenSince = now;
        else if (now - greenSince >= 5000) {
          const max = getMaxStars();
          if (starCount < max) {
            showSuggestion(ui.suggestion, true);
          }
        }
      } else {
        greenSince = 0;
        showSuggestion(ui.suggestion, false);
      }
    }
  }

  // Rotate Sol ring
  if (solMarker) {
    const ring = solMarker.children.find(c => c.userData.isSolRing) as THREE.Mesh | undefined;
    if (ring) {
      ring.lookAt(camera.position);
    }
  }
}

function init(): void {
  const canvas = document.getElementById('glcanvas') as HTMLCanvasElement | null;
  if (!canvas) {
    console.error('Canvas #glcanvas not found');
    return;
  }

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050508);

  camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.set(20, 20, 20);

  renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.target.set(0, 0, 0);

  // Background starfield
  starfield = createStarfield(20000, 42);
  scene.add(starfield);

  // Sol marker
  solMarker = createSolMarker();
  scene.add(solMarker);

  // Compass
  const compass = createCompassContainer();
  document.getElementById('app')!.appendChild(compass);

  // Cross-link panel (preserve existing HTML)
  const linkPanel = document.getElementById('crosslinks');
  const btnCollapse = document.getElementById('btn-collapse-links') as HTMLButtonElement | null;
  const btnExpand = document.getElementById('btn-expand-links') as HTMLButtonElement | null;

  function setLinksCollapsed(collapsed: boolean) {
    if (!linkPanel || !btnExpand) return;
    if (collapsed) {
      linkPanel.classList.add('collapsed');
      btnExpand.style.display = 'flex';
    } else {
      linkPanel.classList.remove('collapsed');
      btnExpand.style.display = 'none';
    }
  }

  btnCollapse?.addEventListener('click', () => setLinksCollapsed(true));
  btnExpand?.addEventListener('click', () => setLinksCollapsed(false));
  if (window.innerWidth <= 768) {
    setLinksCollapsed(true);
  }

  // UI
  ui = setupUI(VERSION, onStarCountChange, onCatalogueChange, onUnitToggle, onClear);

  // Events
  window.addEventListener('resize', onResize);
  canvas.addEventListener('click', onClick);
  canvas.addEventListener('touchstart', onTouchStart, { passive: false });
  canvas.addEventListener('touchend', onTouchEnd, { passive: false });
  document.addEventListener('keydown', onKeyDown);

  // Load data and start
  loadCatalogues().then(() => {
    if (ui) {
      ui.starSlider.max = String(getMaxStars());
    }
    rebuildStars();
    animate();
  });
}

init();
