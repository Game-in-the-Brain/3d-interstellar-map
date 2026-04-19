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
  unitToggle: HTMLButtonElement;
  selectionPanel: HTMLElement;
  selectionList: HTMLElement;
  selectionWarning: HTMLElement;
  clearBtn: HTMLButtonElement;
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
  onUnitToggle: () => void,
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
        <option value="10pc" selected>10 pc</option>
        <option value="50pc">50 pc</option>
        <option value="100pc">100 pc</option>
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
      <label>Stars <span id="slider-val">200</span></label>
      <input id="star-slider" type="range" min="10" max="200" value="200" />
    </div>
    <div class="control-row">
      <button id="unit-toggle" class="ui-btn">Show ly</button>
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
  const unitToggle = document.getElementById('unit-toggle') as HTMLButtonElement;
  const fpsMeter = document.getElementById('fps-meter') as HTMLElement;
  const selectionList = document.getElementById('selection-list') as HTMLElement;
  const selectionWarning = document.getElementById('selection-warning') as HTMLElement;
  const clearBtn = document.getElementById('clear-btn') as HTMLButtonElement;

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

  unitToggle.addEventListener('click', () => {
    onUnitToggle();
  });

  clearBtn.addEventListener('click', () => {
    onClear();
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
    unitToggle,
    selectionPanel,
    selectionList,
    selectionWarning,
    clearBtn,
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
