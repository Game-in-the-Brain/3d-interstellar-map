import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { Star, CatalogueKey, MapState, AppMode, GenerationParameters, GeneratedStar } from './types';
import type { MnemeSystemExport } from './mnemeSystem';
import { isMnemeSystemExport } from './mnemeSystem';
import { generateStarMap, DENSITY_PRESETS } from './generator';
import { createStarfield } from './starfield';
import { StarRenderer, createSolMarker, type RenderMode } from './stars';
import { createCompassContainer, updateCompass } from './compass';
import { SelectionManager } from './selection';
import {
  setupUI,
  updateFPSMeter,
  updateUnitButton,
  showSuggestion,
  updateSelectionWarning,
  populateContextPanel,
  hideContextPanel,
} from './ui';

const VERSION = '0.1.3';

let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let controls: OrbitControls;
let starfield: THREE.Points;
let solMarker: THREE.Mesh;
let currentRenderer: StarRenderer | null = null;
let selectionManager: SelectionManager | null = null;

const catalogues: Record<CatalogueKey, Star[]> = { '10pc': [], '50pc': [], '100pc': [] };
let currentCatalogue: CatalogueKey = '10pc';
let starCount = 20;

// App mode
let appMode: AppMode = 'hyg';
let generatedStars: GeneratedStar[] = [];
let renderMode: RenderMode = 'points';
let sphereScale = 1.0;
let brightness = 1.0;
let unit: 'pc' | 'ly' = 'pc';
let showNames = false;

// MWG system data cache (starId -> MWG StarSystem)
const mwgSystems = new Map<string, Record<string, unknown>>();

// Label elements cache
const labelEls = new Map<string, HTMLElement>();

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
  let stars: Star[];
  let count: number;

  if (appMode === 'generate') {
    stars = generatedStars;
    count = generatedStars.length;
  } else {
    stars = catalogues[currentCatalogue];
    count = Math.min(starCount, stars.length);
  }

  if (currentRenderer) {
    scene.remove(currentRenderer.group);
    currentRenderer.dispose();
  }

  currentRenderer = new StarRenderer(stars, count, renderMode, sphereScale, brightness);
  scene.add(currentRenderer.group);

  if (!selectionManager) {
    selectionManager = new SelectionManager(scene, camera);
  }
  selectionManager.setRenderer(currentRenderer);

  // Rebuild labels
  rebuildLabels();
  updateSelectionUI();
}

function rebuildLabels(): void {
  const container = document.getElementById('star-labels');
  if (!container) return;
  container.innerHTML = '';
  labelEls.clear();

  if (!showNames || !currentRenderer) return;

  for (let i = 0; i < currentRenderer.count; i++) {
    const star = currentRenderer['stars'][i];
    const el = document.createElement('div');
    el.className = 'star-label';
    el.textContent = star.name;
    el.style.position = 'absolute';
    el.style.pointerEvents = 'none';
    el.style.color = 'rgba(255,255,255,0.75)';
    el.style.fontSize = '11px';
    el.style.textShadow = '0 1px 3px rgba(0,0,0,0.8)';
    el.style.whiteSpace = 'nowrap';
    el.style.zIndex = '5';
    container.appendChild(el);
    labelEls.set(star.id, el);
  }
}

function updateLabels(): void {
  if (!showNames || !currentRenderer) return;
  const container = document.getElementById('star-labels');
  if (!container) return;

  for (const [id, el] of labelEls) {
    const pos = currentRenderer.getPositionById(id);
    if (!pos) {
      el.style.display = 'none';
      continue;
    }
    const projected = pos.clone().project(camera);
    const x = (projected.x * 0.5 + 0.5) * window.innerWidth;
    const y = (-projected.y * 0.5 + 0.5) * window.innerHeight;

    if (projected.z > 1 || x < 0 || x > window.innerWidth || y < 0 || y > window.innerHeight) {
      el.style.display = 'none';
    } else {
      el.style.display = 'block';
      el.style.left = `${x + 8}px`;
      el.style.top = `${y - 8}px`;
    }
  }
}

function updateSelectionUI(): void {
  if (!ui || !selectionManager || !currentRenderer) return;
  const ids = Array.from(selectionManager.selectedIds);
  currentRenderer.setSelection(selectionManager.selectedIds);
  updateSelectionWarning(ui.selectionWarning, ids.length);

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
  if (starfield) {
    scene.remove(starfield);
    starfield.geometry.dispose();
    (starfield.material as THREE.Material).dispose();
    const seed = Math.floor(window.innerWidth) + Math.floor(window.innerHeight) * 9973;
    starfield = createStarfield(20000, seed);
    scene.add(starfield);
  }
}

function handlePointer(clientX: number, clientY: number, button: number = 0): void {
  if (!selectionManager) return;
  const result = selectionManager.onPointerDown(clientX, clientY, button);

  if (result.isDouble || result.isRightClick) {
    // Open context panel for the star
    if (result.starId && currentRenderer) {
      const star = currentRenderer.getStarById(result.starId);
      if (star && ui) {
        populateContextPanel(ui, star, () => exportSingleStar(star));
      }
    }
    return;
  }

  if (result.handled) {
    updateSelectionUI();
    return;
  }

  // Clicked empty space — close context panel
  if (ui) {
    hideContextPanel(ui);
  }
}

function onClick(event: MouseEvent): void {
  handlePointer(event.clientX, event.clientY, event.button);
}

function onContextMenu(event: MouseEvent): void {
  event.preventDefault();
  handlePointer(event.clientX, event.clientY, 2);
}

function onTouchStart(event: TouchEvent): void {
  if (event.touches.length === 1) {
    touchStartX = event.touches[0].clientX;
    touchStartY = event.touches[0].clientY;
    // track touch start time for double-tap detection if needed in future
  }
}

function onTouchEnd(event: TouchEvent): void {
  if (event.changedTouches.length === 1) {
    const dx = event.changedTouches[0].clientX - touchStartX;
    const dy = event.changedTouches[0].clientY - touchStartY;
    if (Math.sqrt(dx * dx + dy * dy) < 10) {
      event.preventDefault();
      // Treat quick second tap as double-tap if close in time
      handlePointer(event.changedTouches[0].clientX, event.changedTouches[0].clientY);
    }
  }
}

function onKeyDown(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    onClear();
    if (ui) {
      hideContextPanel(ui);
    }
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

function onRenderModeChange(mode: RenderMode): void {
  renderMode = mode;
  if (currentRenderer) {
    currentRenderer.setMode(mode);
  }
}

function onSphereScaleChange(scale: number): void {
  sphereScale = scale;
  if (currentRenderer) {
    currentRenderer.setSphereScale(scale);
  }
}

function onBrightnessChange(b: number): void {
  brightness = b;
  if (currentRenderer) {
    currentRenderer.setBrightness(b);
  }
}

function onNameToggle(show: boolean): void {
  showNames = show;
  rebuildLabels();
}

function onUnitToggle(): void {
  unit = unit === 'pc' ? 'ly' : 'pc';
  if (ui) updateUnitButton(ui.unitToggle, unit);
  updateSelectionUI();
}

function onLockToggle(locked: boolean): void {
  if (selectionManager) {
    selectionManager.lockSelection = locked;
  }
}

function onOrderedPathToggle(enabled: boolean): void {
  if (selectionManager) {
    selectionManager.orderedPathMode = enabled;
    selectionManager.updateLines();
    updateSelectionUI();
  }
}

function exportSingleStar(star: Star): void {
  const blob = new Blob([JSON.stringify(star, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `star-${star.id}-${star.name.replace(/\s+/g, '_')}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function onExportStars(): void {
  if (!currentRenderer) return;
  const ids = selectionManager ? Array.from(selectionManager.selectedIds) : [];
  const stars: Star[] = [];
  for (let i = 0; i < currentRenderer.count; i++) {
    const star = currentRenderer['stars'][i];
    if (ids.length === 0 || ids.includes(star.id)) {
      stars.push(star);
    }
  }

  // If any selected stars have MWG data, export in MnemeSystemExport format
  const hasMwgData = stars.some(s => mwgSystems.has(s.id));
  if (hasMwgData) {
    const exportData: MnemeSystemExport = {
      mnemeFormat: 'star-system-batch',
      version: VERSION,
      source: '3d-interstellar-map',
      exportedAt: new Date().toISOString(),
      systems: stars.map(s => ({
        starId: s.id,
        name: s.name,
        x: s.x,
        y: s.y,
        z: s.z,
        spec: s.spec,
        absMag: s.absMag,
        mwgSystem: mwgSystems.get(s.id),
      })),
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mneme-systems-${stars.length}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  } else {
    // Plain star export (backward compatible)
    const blob = new Blob([JSON.stringify(stars, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stars-${currentCatalogue}-${stars.length}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
}

async function onImportStars(file: File): Promise<void> {
  try {
    const text = await file.text();
    const parsed = JSON.parse(text);

    // Check if this is a MnemeSystemExport (from MWG or 3D map with systems)
    if (isMnemeSystemExport(parsed)) {
      const entries = parsed.systems;
      if (!Array.isArray(entries) || entries.length === 0) {
        alert('Invalid Mneme export: no systems found');
        return;
      }
      // Extract star data
      const stars: Star[] = entries.map((e: Record<string, unknown>) => ({
        id: String(e.starId),
        name: String(e.name),
        x: Number(e.x),
        y: Number(e.y),
        z: Number(e.z),
        spec: String(e.spec),
        absMag: Number(e.absMag),
      }));
      // Store MWG system data
      for (const entry of entries) {
        if (entry.mwgSystem && typeof entry.mwgSystem === 'object') {
          mwgSystems.set(String(entry.starId), entry.mwgSystem as Record<string, unknown>);
        }
      }
      const key = `custom-${Date.now()}` as CatalogueKey;
      catalogues[key] = stars;
      currentCatalogue = key;
      starCount = stars.length;
      if (ui) {
        ui.catalogueSelect.innerHTML += `<option value="${key}">Custom — ${file.name}</option>`;
        ui.catalogueSelect.value = key;
        ui.starSlider.max = String(stars.length);
        ui.starSlider.value = String(stars.length);
        ui.starSliderValue.textContent = String(stars.length);
      }
      rebuildStars();
      alert(`Imported ${stars.length} stars with ${entries.filter((e: Record<string, unknown>) => e.mwgSystem).length} MWG systems`);
      return;
    }

    // Plain star array
    const data = parsed as Star[];
    if (!Array.isArray(data) || data.length === 0) {
      alert('Invalid JSON: expected an array of stars');
      return;
    }
    if (!data[0].id || !data[0].name || data[0].x === undefined) {
      alert('Invalid JSON: stars must have id, name, x, y, z, spec, absMag');
      return;
    }
    const key = `custom-${Date.now()}` as CatalogueKey;
    catalogues[key] = data;
    currentCatalogue = key;
    starCount = data.length;
    if (ui) {
      ui.catalogueSelect.innerHTML += `<option value="${key}">Custom — ${file.name}</option>`;
      ui.catalogueSelect.value = key;
      ui.starSlider.max = String(data.length);
      ui.starSlider.value = String(data.length);
      ui.starSliderValue.textContent = String(data.length);
    }
    rebuildStars();
  } catch {
    alert('Failed to parse JSON file');
  }
}



function buildMapState(): MapState {
  return {
    version: VERSION,
    savedAt: new Date().toISOString(),
    camera: {
      x: camera.position.x,
      y: camera.position.y,
      z: camera.position.z,
      targetX: controls.target.x,
      targetY: controls.target.y,
      targetZ: controls.target.z,
    },
    catalogue: currentCatalogue,
    starCount,
    renderMode,
    sphereScale,
    brightness,
    unit,
    showNames,
    lockSelection: selectionManager?.lockSelection ?? false,
    orderedPathMode: selectionManager?.orderedPathMode ?? false,
    orderedSelection: selectionManager?.orderedSelection ?? [],
    selectedIds: selectionManager ? Array.from(selectionManager.selectedIds) : [],
  };
}

function onModeChange(mode: AppMode): void {
  appMode = mode;
  // Update UI visibility
  if (ui) {
    const hygControls = document.getElementById('hyg-controls');
    const generateControls = document.getElementById('generate-controls');
    if (hygControls) hygControls.style.display = mode === 'hyg' ? 'block' : 'none';
    if (generateControls) generateControls.style.display = mode === 'generate' ? 'block' : 'none';
    ui.hygModeBtn.classList.toggle('active-mode', mode === 'hyg');
    ui.generateModeBtn.classList.toggle('active-mode', mode === 'generate');
  }
  // Rebuild stars for the new mode
  if (mode === 'generate' && generatedStars.length === 0) {
    // Auto-generate on first switch if empty
    const params = DENSITY_PRESETS.average;
    generatedStars = generateStarMap(params);
  }
  rebuildStars();
}

function onGenerate(params: GenerationParameters): void {
  appMode = 'generate';
  generatedStars = generateStarMap(params);
  rebuildStars();
  // Update UI to reflect generate mode
  if (ui) {
    const hygControls = document.getElementById('hyg-controls');
    const generateControls = document.getElementById('generate-controls');
    if (hygControls) hygControls.style.display = 'none';
    if (generateControls) generateControls.style.display = 'block';
    ui.hygModeBtn.classList.remove('active-mode');
    ui.generateModeBtn.classList.add('active-mode');
  }
}

function onSaveMap(saveAs: boolean): void {
  const state = buildMapState();
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const defaultName = `3d-map-${state.catalogue}-${state.savedAt.slice(0, 10)}.json`;
  a.download = saveAs ? (prompt('Save map as:', defaultName) || defaultName) : defaultName;
  a.click();
  URL.revokeObjectURL(url);
}

async function onLoadMap(file: File): Promise<void> {
  try {
    const text = await file.text();
    const state = JSON.parse(text) as MapState;
    if (!state.camera || !state.catalogue || state.starCount === undefined) {
      alert('Invalid map JSON: missing required fields');
      return;
    }

    // Restore catalogue if it exists
    if (catalogues[state.catalogue]) {
      currentCatalogue = state.catalogue;
      if (ui) ui.catalogueSelect.value = state.catalogue;
    }

    starCount = state.starCount;
    renderMode = state.renderMode;
    sphereScale = state.sphereScale;
    brightness = state.brightness;
    unit = state.unit;
    showNames = state.showNames;

    // Update UI controls
    if (ui) {
      ui.starSlider.value = String(starCount);
      ui.starSliderValue.textContent = String(starCount);
      ui.renderModeSelect.value = renderMode;
      ui.sphereScaleRow.style.display = renderMode === 'spheres' ? 'flex' : 'none';
      ui.sphereScaleSlider.value = String(sphereScale);
      ui.sphereScaleValue.textContent = sphereScale.toFixed(1);
      ui.brightnessSlider.value = String(brightness);
      ui.brightnessValue.textContent = brightness.toFixed(1);
      updateUnitButton(ui.unitToggle, unit);
      ui.nameToggle.textContent = showNames ? 'Hide names' : 'Show names';
      if (selectionManager) {
        selectionManager.lockSelection = state.lockSelection;
        ui.lockToggle.textContent = state.lockSelection ? '🔒 Lock selection' : '🔓 Unlock selection';
        selectionManager.orderedPathMode = state.orderedPathMode ?? false;
        ui.orderedPathToggle.textContent = selectionManager.orderedPathMode ? 'Ordered path' : 'Full mesh';
      }
    }

    // Rebuild stars
    rebuildStars();

    // Restore camera
    camera.position.set(state.camera.x, state.camera.y, state.camera.z);
    controls.target.set(state.camera.targetX, state.camera.targetY, state.camera.targetZ);
    controls.update();

    // Restore selection
    if (selectionManager) {
      selectionManager.clear();
      for (const id of state.selectedIds) {
        selectionManager.selectedIds.add(id);
      }
      if (state.orderedSelection && state.orderedSelection.length > 0) {
        selectionManager.orderedSelection = [...state.orderedSelection];
      } else if (state.selectedIds) {
        selectionManager.orderedSelection = [...state.selectedIds];
      }
      selectionManager.updateLines();
      updateSelectionUI();
    }
  } catch {
    alert('Failed to parse map JSON file');
  }
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
  updateLabels();
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

  // Rotate Sol ring to face camera
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
  ui = setupUI(
    VERSION,
    appMode,
    onStarCountChange,
    onCatalogueChange,
    onRenderModeChange,
    onSphereScaleChange,
    onBrightnessChange,
    onNameToggle,
    onUnitToggle,
    onLockToggle,
    onOrderedPathToggle,
    onSaveMap,
    onLoadMap,
    onExportStars,
    onImportStars,
    onClear,
    onModeChange,
    onGenerate
  );

  // Events
  window.addEventListener('resize', onResize);
  canvas.addEventListener('click', onClick);
  canvas.addEventListener('contextmenu', onContextMenu);
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
