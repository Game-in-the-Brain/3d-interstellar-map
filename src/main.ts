import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { Star, CatalogueKey, MapState, AppMode, GenerationParameters, GeneratedStar, GenerationTables, StellarClass, StellarGrade, MnemeMapExport } from './types';
import type { MnemeSystemExport } from './mnemeSystem';
import { isMnemeSystemExport } from './mnemeSystem';
import { generateStarMap, DENSITY_PRESETS, buildDefaultClassTable, buildDefaultGradeTable } from './generator';
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
  hideContextPanel,
} from './ui';
import { generateStarSystem } from './mwg/lib/generator';
import { parseSpectralType } from './mwg/lib/spectralParser';

const VERSION = '0.2.0';

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
let generationTables: GenerationTables = {
  classTable: buildDefaultClassTable(),
  gradeTable: buildDefaultGradeTable(),
};
let mapName = 'Untitled Sector';
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
        showStarContextPanel(star);
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

function showStarContextPanel(star: Star): void {
  if (!ui) return;

  // Build rich content
  const gen = generatedStars.find(s => s.id === star.id);
  const mwg = mwgSystems.get(star.id);
  const display: Record<string, unknown> = { ...star };

  if (gen) {
    display._generation = {
      pass: gen.pass,
      parentId: gen.parentId,
      distanceFromParentLy: gen.distanceFromParent,
      rolls: gen.rolls,
    };
  }

  if (mwg) {
    const primary = (mwg.primaryStar as Record<string, unknown>) || {};
    const mw = (mwg.mainWorld as Record<string, unknown>) || {};
    const inh = (mwg.inhabitants as Record<string, unknown>) || {};
    const sp = (inh.starport as Record<string, unknown>) || {};
    display._mwgSystem = {
      starClass: primary.class,
      starGrade: primary.grade,
      starMass: primary.mass,
      starLuminosity: primary.luminosity,
      worldType: mw.type,
      worldSizeKm: mw.size,
      worldGravity: mw.gravity,
      worldAtmosphere: mw.atmosphere,
      worldTemperature: mw.temperature,
      worldHabitability: mw.habitability,
      techLevel: inh.techLevel,
      population: inh.population,
      wealth: inh.wealth,
      powerStructure: inh.powerStructure,
      development: inh.development,
      starportClass: sp.class,
      travelZone: inh.travelZone,
      companionCount: (mwg.companionStars as unknown[] || []).length,
      bodyCount: (
        (mwg.circumstellarDisks as unknown[] || []).length +
        (mwg.dwarfPlanets as unknown[] || []).length +
        (mwg.terrestrialWorlds as unknown[] || []).length +
        (mwg.iceWorlds as unknown[] || []).length +
        (mwg.gasWorlds as unknown[] || []).length +
        (mwg.moons as unknown[] || []).length
      ),
    };
  }

  ui.contextTitle.textContent = star.name || `Star ${star.id}`;
  ui.contextJson.textContent = JSON.stringify(display, null, 2);
  ui.context2dLink.href = `https://game-in-the-brain.github.io/2d-star-system-map/?starId=${encodeURIComponent(star.id)}`;
  ui.context2dLink.onclick = (e) => {
    e.preventDefault();
    // Push MWG data to shared localStorage so 2D map can load it
    const mwgData = mwgSystems.get(star.id);
    if (mwgData) {
      const payload = {
        starSystem: mwgData,
        starfieldSeed: String(star.id).replace(/[^a-zA-Z0-9]/g, '').slice(0, 8) || 'SEED0000',
        epoch: { year: 2300, month: 1, day: 1 },
      };
      const savedPage = {
        starId: star.id,
        starName: star.name || `${star.id}`,
        savedAt: new Date().toISOString(),
        payload,
        mwgSystem: mwgData,
        gmNotes: '',
        version: VERSION,
      };
      localStorage.setItem(`mneme-2dmap-${star.id}`, JSON.stringify(savedPage));
    }
    window.open(ui!.context2dLink.href, '_blank');
  };
  ui.contextExportBtn.onclick = () => exportSingleStar(star);

  // FRD-051: Generate World button
  if (ui.contextGenerateBtn) {
    const hasMwg = mwgSystems.has(star.id);
    ui.contextGenerateBtn.style.display = hasMwg ? 'none' : 'inline-block';
    ui.contextGenerateBtn.onclick = () => generateWorldForStar(star);
  }

  if (ui.contextLoadMwgBtn) {
    ui.contextLoadMwgBtn.onchange = (e) => {
      const input = e.target as HTMLInputElement;
      const f = input.files?.[0];
      if (f) onLoadMwgJsonForStar(star, f);
      input.value = '';
    };
  }

  // MWG link
  const hasMwg = mwgSystems.has(star.id);
  if (ui.contextMwgLink) {
    ui.contextMwgLink.style.display = hasMwg ? 'inline-flex' : 'none';
    if (hasMwg) {
      const params = new URLSearchParams({
        starId: star.id,
        name: star.name,
        spec: star.spec,
        x: String(star.x),
        y: String(star.y),
        z: String(star.z),
      });
      ui.contextMwgLink.href = `https://game-in-the-brain.github.io/Mneme-CE-World-Generator/?${params.toString()}`;
    }
  }

  ui.contextPanel.style.display = 'block';
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
  // Ctrl+A — select all stars
  if (event.key === 'a' && event.ctrlKey && !event.shiftKey) {
    event.preventDefault();
    if (selectionManager && currentRenderer) {
      for (let i = 0; i < currentRenderer.count; i++) {
        const star = currentRenderer['stars'][i];
        if (!selectionManager.selectedIds.has(star.id)) {
          selectionManager.selectedIds.add(star.id);
          selectionManager.orderedSelection.push(star.id);
        }
      }
      selectionManager.updateLines();
      updateSelectionUI();
    }
    return;
  }

  // Ctrl+Shift+A — deselect all stars
  if (event.key === 'A' && event.ctrlKey && event.shiftKey) {
    event.preventDefault();
    onClear();
    return;
  }

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

/**
 * FRD-051: Generate a full MWG star system for a star using its spectral type.
 */
function generateWorldForStar(star: Star): void {
  const parsedSpec = parseSpectralType(star.spec);
  if (!parsedSpec) {
    alert(`Cannot parse spectral type "${star.spec}" for ${star.name}`);
    return;
  }

  try {
    const system = generateStarSystem({
      starClass: parsedSpec.stellarClass,
      starGrade: parsedSpec.grade,
      mainWorldType: 'random',
      populated: true,
    });

    // Enrich with 3D map coordinates and name
    system.name = star.name || `${parsedSpec.stellarClass}${parsedSpec.grade} System`;
    system.sourceStarId = star.id;
    system.x = star.x;
    system.y = star.y;
    system.z = star.z;

    // Attach to mwgSystems map
    mwgSystems.set(star.id, system as unknown as Record<string, unknown>);

    // Persist to localStorage for cross-app access
    localStorage.setItem(`mwg-system-${star.id}`, JSON.stringify(system));

    // Refresh context panel to show the generated data
    showStarContextPanel(star);

    // Show success notification
    if (ui) {
      ui.contextTitle.textContent = `${star.name} — Generated!`;
    }
  } catch (err) {
    console.error('Generation failed:', err);
    alert(`Failed to generate world for ${star.name}: ${err instanceof Error ? err.message : String(err)}`);
  }
}

function onExportStars(): void {
  if (!currentRenderer) return;
  const ids = selectionManager ? Array.from(selectionManager.selectedIds) : [];

  // QA-048: export only works when stars are selected
  if (ids.length === 0) {
    alert('No stars selected. Click stars to select, or press Ctrl+A to select all.');
    return;
  }

  const stars: Star[] = [];
  for (let i = 0; i < currentRenderer.count; i++) {
    const star = currentRenderer['stars'][i];
    if (ids.includes(star.id)) {
      stars.push(star);
    }
  }

  if (stars.length === 0) {
    alert('Selected stars not found in current view.');
    return;
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
  if (mode === 'generate') {
    renderTables();
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
  generatedStars = generateStarMap(params, generationTables);
  rebuildStars();
  renderTables();
  if (ui) {
    const hygControls = document.getElementById('hyg-controls');
    const generateControls = document.getElementById('generate-controls');
    if (hygControls) hygControls.style.display = 'none';
    if (generateControls) generateControls.style.display = 'block';
    ui.hygModeBtn.classList.remove('active-mode');
    ui.generateModeBtn.classList.add('active-mode');
  }
}

// =====================
// Table Rendering
// =====================

function renderTables(): void {
  if (!ui) return;
  const classEl = ui.classTableEl;
  const gradeEl = ui.gradeTableEl;
  if (!classEl || !gradeEl) return;

  // Render class table: rows of 13 cells (rolls 5–30 = 26 values, 2 rows of 13)
  let classHtml = '';
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 13; col++) {
      const roll = 5 + row * 13 + col;
      if (roll > 30) break;
      const cls = generationTables.classTable[roll];
      classHtml += `<div class="gen-table-cell" data-roll="${roll}" data-type="class" title="5D6=${roll} → ${cls}">${cls}</div>`;
    }
  }
  classEl.innerHTML = classHtml;

  // Render grade table
  let gradeHtml = '';
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 13; col++) {
      const roll = 5 + row * 13 + col;
      if (roll > 30) break;
      const grade = generationTables.gradeTable[roll];
      gradeHtml += `<div class="gen-table-cell" data-roll="${roll}" data-type="grade" title="5D6=${roll} → ${grade}">${grade}</div>`;
    }
  }
  gradeEl.innerHTML = gradeHtml;

  // Add click handlers
  classEl.querySelectorAll('.gen-table-cell').forEach(cell => {
    cell.addEventListener('click', (e) => {
      const target = e.currentTarget as HTMLElement;
      const roll = parseInt(target.dataset.roll || '0', 10);
      const type = target.dataset.type;
      if (type === 'class') {
        cycleClass(roll);
      } else if (type === 'grade') {
        cycleGrade(roll);
      }
      renderTables();
      // Regenerate if in generate mode
      if (appMode === 'generate') {
        const params = getCurrentGenerationParams();
        generatedStars = generateStarMap(params, generationTables);
        rebuildStars();
      }
    });
  });
}

function cycleClass(roll: number): void {
  const order: StellarClass[] = ['O', 'B', 'A', 'F', 'G', 'K', 'M'];
  const current = generationTables.classTable[roll];
  const idx = order.indexOf(current);
  generationTables.classTable[roll] = order[(idx + 1) % order.length];
}

function cycleGrade(roll: number): void {
  const current = generationTables.gradeTable[roll];
  generationTables.gradeTable[roll] = ((current + 1) % 10) as StellarGrade;
}

function getCurrentGenerationParams(): GenerationParameters {
  if (!ui) return DENSITY_PRESETS.average;
  return {
    density: ui.densitySelect.value as 'sparse' | 'average' | 'dense' | 'custom',
    starCountDice: 6,
    distanceDice: ui.densitySelect.value === 'sparse' ? 2 : ui.densitySelect.value === 'dense' ? 4 : 3,
    distanceMultiplier: parseFloat(ui.distMultSlider.value),
    starCountMultiplier: parseFloat(ui.countMultSlider.value),
    maxPasses: parseInt(ui.passesSlider.value, 10),
  };
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

function onExportMnemeMap(): void {
  if (appMode !== 'generate' || generatedStars.length === 0) {
    alert('No generated map to export. Switch to Generate mode and create a map first.');
    return;
  }
  const exportData: MnemeMapExport = {
    mnemeFormat: 'starmap-v1',
    name: mapName,
    version: VERSION,
    exportedAt: new Date().toISOString(),
    parameters: getCurrentGenerationParams(),
    tables: { classTable: { ...generationTables.classTable }, gradeTable: { ...generationTables.gradeTable } },
    stars: generatedStars,
    mwgSystems: Object.fromEntries(mwgSystems),
  };
  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const safeName = mapName.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'sector';
  a.download = `${safeName}.mneme-map`;
  a.click();
  URL.revokeObjectURL(url);
}

async function onImportMnemeMap(file: File): Promise<void> {
  try {
    const text = await file.text();
    const data = JSON.parse(text) as MnemeMapExport;
    if (data.mnemeFormat !== 'starmap-v1') {
      alert('Invalid .mneme-map file: missing or incorrect mnemeFormat');
      return;
    }
    if (!Array.isArray(data.stars) || data.stars.length === 0) {
      alert('Invalid .mneme-map file: no stars found');
      return;
    }
    mapName = data.name || file.name.replace(/\.mneme-map$/, '').replace(/\.json$/, '') || 'Imported Sector';
    generatedStars = data.stars as GeneratedStar[];
    if (data.tables) {
      generationTables = {
        classTable: { ...data.tables.classTable },
        gradeTable: { ...data.tables.gradeTable },
      };
    }
    mwgSystems.clear();
    if (data.mwgSystems) {
      for (const [key, value] of Object.entries(data.mwgSystems)) {
        mwgSystems.set(key, value);
      }
    }
    appMode = 'generate';
    if (ui) {
      const hygControls = document.getElementById('hyg-controls');
      const generateControls = document.getElementById('generate-controls');
      if (hygControls) hygControls.style.display = 'none';
      if (generateControls) generateControls.style.display = 'block';
      ui.hygModeBtn.classList.remove('active-mode');
      ui.generateModeBtn.classList.add('active-mode');
      if (data.parameters) {
        ui.densitySelect.value = data.parameters.density;
        ui.passesSlider.value = String(data.parameters.maxPasses);
        ui.passesValue.textContent = String(data.parameters.maxPasses);
        ui.distMultSlider.value = String(data.parameters.distanceMultiplier);
        ui.distMultValue.textContent = parseFloat(String(data.parameters.distanceMultiplier)).toFixed(1);
        ui.countMultSlider.value = String(data.parameters.starCountMultiplier);
        ui.countMultValue.textContent = parseFloat(String(data.parameters.starCountMultiplier)).toFixed(1);
      }
    }
    rebuildStars();
    renderTables();
    alert(`Imported "${mapName}" with ${generatedStars.length} stars`);
  } catch {
    alert('Failed to parse .mneme-map file');
  }
}

async function onLoadMwgJsonForStar(star: Star, file: File): Promise<void> {
  try {
    const text = await file.text();
    const data = JSON.parse(text);
    if (!data.primaryStar || typeof data.primaryStar.class !== 'string') {
      alert('Invalid MWG system file: expected primaryStar.class');
      return;
    }
    mwgSystems.set(star.id, data as Record<string, unknown>);
    showStarContextPanel(star);
  } catch {
    alert('Failed to parse MWG JSON file');
  }
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
    onGenerate,
    onExportMnemeMap,
    onImportMnemeMap
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
