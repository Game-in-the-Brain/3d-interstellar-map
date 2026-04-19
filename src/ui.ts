import type { CatalogueKey } from './types';
import type { RenderMode } from './stars';

export interface UIElements {
  versionBadge: HTMLElement;
  fpsMeter: HTMLElement;
  starSlider: HTMLInputElement;
  starSliderValue: HTMLElement;
  catalogueSelect: HTMLSelectElement;
  renderModeSelect: HTMLSelectElement;
  sphereScaleSlider: HTMLInputElement;
  sphereScaleValue: HTMLElement;
  sphereScaleRow: HTMLElement;
  brightnessSlider: HTMLInputElement;
  brightnessValue: HTMLElement;
  nameToggle: HTMLButtonElement;
  unitToggle: HTMLButtonElement;
  lockToggle: HTMLButtonElement;
  saveMapBtn: HTMLButtonElement;
  saveAsBtn: HTMLButtonElement;
  loadMapBtn: HTMLInputElement;
  exportStarsBtn: HTMLButtonElement;
  importStarsBtn: HTMLInputElement;
  selectionPanel: HTMLElement;
  selectionList: HTMLElement;
  selectionWarning: HTMLElement;
  clearBtn: HTMLButtonElement;
  contextPanel: HTMLElement;
  contextTitle: HTMLElement;
  contextJson: HTMLElement;
  context2dLink: HTMLAnchorElement;
  contextExportBtn: HTMLButtonElement;
  contextCloseBtn: HTMLButtonElement;
  suggestion: HTMLElement;
  controlsPanel: HTMLElement;
}

function createPanel(id: string, title: string, collapsedDefault: boolean): HTMLElement {
  const panel = document.createElement('div');
  panel.id = id;
  panel.className = 'ui-panel' + (collapsedDefault ? ' collapsed' : '');
  panel.innerHTML = `
    <div class="panel-bar">
      <span class="panel-title">${title}</span>
      <button class="panel-toggle-btn" aria-label="Toggle ${title}">▼</button>
    </div>
    <div class="panel-body"></div>
  `;
  const btn = panel.querySelector('.panel-toggle-btn') as HTMLButtonElement;
  btn.addEventListener('click', () => {
    panel.classList.toggle('collapsed');
    btn.textContent = panel.classList.contains('collapsed') ? '▶' : '▼';
  });
  return panel;
}

export function setupUI(
  version: string,
  onStarCountChange: (n: number) => void,
  onCatalogueChange: (key: CatalogueKey) => void,
  onRenderModeChange: (mode: RenderMode) => void,
  onSphereScaleChange: (scale: number) => void,
  onBrightnessChange: (brightness: number) => void,
  onNameToggle: (show: boolean) => void,
  onUnitToggle: () => void,
  onLockToggle: (locked: boolean) => void,
  onSaveMap: (saveAs: boolean) => void,
  onLoadMap: (file: File) => void,
  onExportStars: () => void,
  onImportStars: (file: File) => void,
  onClear: () => void
): UIElements {
  const app = document.getElementById('app')!;

  // Version badge (bottom-left, always visible)
  const versionBadge = document.createElement('div');
  versionBadge.className = 'version-badge';
  versionBadge.textContent = `v${version}`;
  app.appendChild(versionBadge);

  // Controls panel (top-right)
  const controlsPanel = createPanel('controls-panel', 'Controls', false);
  controlsPanel.classList.add('controls-panel-pos');
  const controlsBody = controlsPanel.querySelector('.panel-body') as HTMLElement;
  controlsBody.innerHTML = `
    <div class="control-row">
      <label>Catalogue</label>
      <select id="cat-select" class="ui-select">
        <option value="10pc" selected>HYG v4.1 — 10 pc</option>
        <option value="50pc">HYG v4.1 — 50 pc</option>
        <option value="100pc">HYG v4.1 — 100 pc</option>
      </select>
    </div>
    <div class="control-row">
      <label>Render</label>
      <select id="render-mode" class="ui-select">
        <option value="points" selected>Points (emissive)</option>
        <option value="spheres">Spheres (3D)</option>
      </select>
    </div>
    <div class="control-row" id="sphere-scale-row" style="display:none">
      <label>Sphere scale <span id="sphere-scale-val">1.0</span></label>
      <input id="sphere-scale" type="range" min="0.3" max="3.0" step="0.1" value="1.0" />
    </div>
    <div class="control-row">
      <label>Brightness <span id="brightness-val">1.0</span></label>
      <input id="brightness" type="range" min="0.5" max="2.0" step="0.1" value="1.0" />
    </div>
    <div class="control-row">
      <label>Stars <span id="slider-val">20</span></label>
      <input id="star-slider" type="range" min="10" max="200" value="20" />
    </div>
    <div class="control-row row-horizontal">
      <button id="name-toggle" class="ui-btn">Show names</button>
      <button id="unit-toggle" class="ui-btn">Show ly</button>
    </div>
    <div class="control-row">
      <button id="lock-toggle" class="ui-btn">🔓 Unlock selection</button>
    </div>
    <div class="control-row row-horizontal">
      <button id="save-map-btn" class="ui-btn">💾 Save Map</button>
      <button id="save-as-btn" class="ui-btn">💾 Save As…</button>
      <label class="ui-btn file-btn">
        📂 Load Map
        <input id="load-map-btn" type="file" accept=".json" style="display:none" />
      </label>
    </div>
    <div class="control-row row-horizontal">
      <button id="export-stars-btn" class="ui-btn">⭐ Export Stars</button>
      <label class="ui-btn file-btn">
        ⭐ Import Stars
        <input id="import-stars-btn" type="file" accept=".json" style="display:none" />
      </label>
    </div>
    <div class="control-row">
      <div id="fps-meter" class="fps-green">-- FPS</div>
    </div>
  `;
  app.appendChild(controlsPanel);

  // Selection panel (bottom-left, above version)
  const selectionPanel = createPanel('selection-panel', 'Selection', true);
  selectionPanel.classList.add('selection-panel-pos');
  const selBody = selectionPanel.querySelector('.panel-body') as HTMLElement;
  selBody.innerHTML = `
    <div id="selection-warning" class="selection-warning" style="display:none"></div>
    <div id="selection-list" class="selection-list"></div>
    <button id="clear-btn" class="ui-btn danger">Clear selection</button>
  `;
  app.appendChild(selectionPanel);

  // Context / detail panel (centered floating)
  const contextPanel = document.createElement('div');
  contextPanel.id = 'context-panel';
  contextPanel.className = 'context-panel';
  contextPanel.style.display = 'none';
  contextPanel.innerHTML = `
    <div class="context-header">
      <span id="context-title" class="context-title">Star Details</span>
      <button id="context-close" class="panel-toggle" aria-label="Close details">✕</button>
    </div>
    <div class="context-body">
      <pre id="context-json" class="context-json"></pre>
      <div class="context-actions">
        <a id="context-2d-link" href="#" target="_blank" rel="noopener noreferrer" class="btn crosslink-btn" style="width:auto">🗺️ Open 2D Map</a>
        <button id="context-export" class="ui-btn">💾 Export this star</button>
      </div>
    </div>
  `;
  app.appendChild(contextPanel);

  // Name labels container
  const labelsContainer = document.createElement('div');
  labelsContainer.id = 'star-labels';
  labelsContainer.className = 'star-labels-container';
  app.appendChild(labelsContainer);

  // Suggestion toast
  const suggestion = document.createElement('div');
  suggestion.id = 'perf-suggestion';
  suggestion.className = 'suggestion-toast';
  suggestion.textContent = 'You can render more stars';
  app.appendChild(suggestion);

  const starSlider = document.getElementById('star-slider') as HTMLInputElement;
  const starSliderValue = document.getElementById('slider-val') as HTMLElement;
  const catalogueSelect = document.getElementById('cat-select') as HTMLSelectElement;
  const renderModeSelect = document.getElementById('render-mode') as HTMLSelectElement;
  const sphereScaleSlider = document.getElementById('sphere-scale') as HTMLInputElement;
  const sphereScaleValue = document.getElementById('sphere-scale-val') as HTMLElement;
  const sphereScaleRow = document.getElementById('sphere-scale-row') as HTMLElement;
  const brightnessSlider = document.getElementById('brightness') as HTMLInputElement;
  const brightnessValue = document.getElementById('brightness-val') as HTMLElement;
  const nameToggle = document.getElementById('name-toggle') as HTMLButtonElement;
  const unitToggle = document.getElementById('unit-toggle') as HTMLButtonElement;
  const lockToggle = document.getElementById('lock-toggle') as HTMLButtonElement;
  const saveMapBtn = document.getElementById('save-map-btn') as HTMLButtonElement;
  const saveAsBtn = document.getElementById('save-as-btn') as HTMLButtonElement;
  const loadMapBtn = document.getElementById('load-map-btn') as HTMLInputElement;
  const exportStarsBtn = document.getElementById('export-stars-btn') as HTMLButtonElement;
  const importStarsBtn = document.getElementById('import-stars-btn') as HTMLInputElement;
  const fpsMeter = document.getElementById('fps-meter') as HTMLElement;
  const selectionList = document.getElementById('selection-list') as HTMLElement;
  const selectionWarning = document.getElementById('selection-warning') as HTMLElement;
  const clearBtn = document.getElementById('clear-btn') as HTMLButtonElement;
  const contextTitle = document.getElementById('context-title') as HTMLElement;
  const contextJson = document.getElementById('context-json') as HTMLElement;
  const context2dLink = document.getElementById('context-2d-link') as HTMLAnchorElement;
  const contextExportBtn = document.getElementById('context-export') as HTMLButtonElement;
  const contextCloseBtn = document.getElementById('context-close') as HTMLButtonElement;

  starSlider.addEventListener('input', () => {
    const n = parseInt(starSlider.value, 10);
    starSliderValue.textContent = String(n);
    onStarCountChange(n);
  });

  catalogueSelect.addEventListener('change', () => {
    onCatalogueChange(catalogueSelect.value as CatalogueKey);
  });

  renderModeSelect.addEventListener('change', () => {
    const mode = renderModeSelect.value as RenderMode;
    sphereScaleRow.style.display = mode === 'spheres' ? 'flex' : 'none';
    onRenderModeChange(mode);
  });

  sphereScaleSlider.addEventListener('input', () => {
    const val = parseFloat(sphereScaleSlider.value);
    sphereScaleValue.textContent = val.toFixed(1);
    onSphereScaleChange(val);
  });

  brightnessSlider.addEventListener('input', () => {
    const val = parseFloat(brightnessSlider.value);
    brightnessValue.textContent = val.toFixed(1);
    onBrightnessChange(val);
  });

  nameToggle.addEventListener('click', () => {
    const showing = nameToggle.textContent === 'Hide names';
    nameToggle.textContent = showing ? 'Show names' : 'Hide names';
    onNameToggle(!showing);
  });

  unitToggle.addEventListener('click', () => {
    onUnitToggle();
  });

  lockToggle.addEventListener('click', () => {
    const locked = lockToggle.textContent?.includes('🔒') ?? false;
    lockToggle.textContent = locked ? '🔓 Unlock selection' : '🔒 Lock selection';
    onLockToggle(!locked);
  });

  saveMapBtn.addEventListener('click', () => {
    onSaveMap(false);
  });

  saveAsBtn.addEventListener('click', () => {
    onSaveMap(true);
  });

  loadMapBtn.addEventListener('change', () => {
    const file = loadMapBtn.files?.[0];
    if (file) onLoadMap(file);
    loadMapBtn.value = '';
  });

  exportStarsBtn.addEventListener('click', () => {
    onExportStars();
  });

  importStarsBtn.addEventListener('change', () => {
    const file = importStarsBtn.files?.[0];
    if (file) onImportStars(file);
    importStarsBtn.value = '';
  });

  clearBtn.addEventListener('click', () => {
    onClear();
  });

  contextCloseBtn.addEventListener('click', () => {
    contextPanel.style.display = 'none';
  });

  return {
    versionBadge,
    fpsMeter,
    starSlider,
    starSliderValue,
    catalogueSelect,
    renderModeSelect,
    sphereScaleSlider,
    sphereScaleValue,
    sphereScaleRow,
    brightnessSlider,
    brightnessValue,
    nameToggle,
    unitToggle,
    saveMapBtn,
    saveAsBtn,
    loadMapBtn,
    exportStarsBtn,
    importStarsBtn,
    selectionPanel,
    selectionList,
    selectionWarning,
    clearBtn,
    lockToggle,
    contextPanel,
    contextTitle,
    contextJson,
    context2dLink,
    contextExportBtn,
    contextCloseBtn,
    suggestion,
    controlsPanel,
  };
}

export function updateFPSMeter(el: HTMLElement, fps: number): void {
  el.textContent = `${Math.round(fps)} FPS`;
  el.className = fps >= 55 ? 'fps-green' : fps >= 30 ? 'fps-yellow' : 'fps-red';
}

export function updateUnitButton(el: HTMLButtonElement, unit: 'pc' | 'ly'): void {
  el.textContent = unit === 'pc' ? 'Show ly' : 'Show pc';
}

export function showSuggestion(el: HTMLElement, show: boolean): void {
  el.style.opacity = show ? '1' : '0';
}

export function updateSelectionWarning(el: HTMLElement, count: number): void {
  if (count >= 10) {
    el.style.display = 'block';
    el.textContent = `⚠️ ${count} stars selected. Connecting lines scale quadratically and may slow down or crash your browser. Consider clearing your selection.`;
  } else {
    el.style.display = 'none';
    el.textContent = '';
  }
}

export function populateContextPanel(
  ui: UIElements,
  star: { id: string; name: string; x: number; y: number; z: number; spec: string; absMag: number },
  onExportOne: () => void
): void {
  ui.contextTitle.textContent = star.name || `Star ${star.id}`;
  ui.contextJson.textContent = JSON.stringify(star, null, 2);
  ui.context2dLink.href = `https://game-in-the-brain.github.io/2d-star-system-map/?starId=${encodeURIComponent(star.id)}`;
  ui.contextExportBtn.onclick = onExportOne;
  ui.contextPanel.style.display = 'block';
}

export function hideContextPanel(ui: UIElements): void {
  ui.contextPanel.style.display = 'none';
}
