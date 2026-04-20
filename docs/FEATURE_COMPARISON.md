# 2D Star System Map ↔ 3D Interstellar Map — Feature Comparison

| Feature | 2D Star System Map | 3D Interstellar Map | Notes |
|---------|-------------------|---------------------|-------|
| **Rendering engine** | HTML5 Canvas 2D | Three.js WebGL | 2D: orbital diagrams. 3D: point clouds / instanced spheres. |
| **Star data source** | Generated or pasted JSON | Real HYG catalogue OR procedural generation | 3D supports 10 pc, 50 pc, 100 pc real-star catalogues. |
| **View scope** | Single star system at a time | Entire sector (up to 500 stars) | 2D zooms into one system; 3D shows the big picture. |
| **Zoom / Pan** | Mouse wheel zoom, drag pan | OrbitControls: rotate, zoom, pan | 3D has full 6-DOF camera control. |
| **Time animation** | ✅ Play / pause / reverse, speed 0.25×–365× | ❌ Static | 2D simulates planetary orbits over time with date display. |
| **Date display** | ✅ Shows epoch date (e.g. 2300-01-01) | ❌ N/A | 2D tracks in-game calendar; 3D is spatial-only. |
| **Star selection** | Click to load system | Click to select/deselect; Ctrl+A select all; Ctrl+Shift+A deselect | 3D supports multi-select with distance readouts. |
| **Selection visualization** | ❌ None | ✅ Connecting lines + distance list | 3D draws lines between selected stars and lists pairwise distances. |
| **Context / Info panel** | System Editor tab (star class, world type, GM notes) | Star context panel (raw data, MWG link, 2D map link) | 2D is editable; 3D is read-only with cross-links. |
| **Export formats** | Snapshot PNG, Interactive HTML, CSV, DOCX, JSON | Plain JSON star list, MnemeSystemExport (.json), .mneme-map | 2D exports self-contained animated HTML files. 3D exports star lists for MWG import. |
| **Import formats** | Paste system JSON from MWG | Star list JSON, .mneme-map, .mneme-batch | 3D can import MWG-generated batches back for visualization. |
| **Zone coloring** | ✅ Planetary orbits colored by zone (Infernal/Hot/Conservative/Cold/Outer) | ❌ No zone display | 3D only shows stars, not planetary orbits. |
| **Background starfield** | ✅ Procedural from 8-char seed | ✅ 20,000 point background | Both have rich starfields; 2D seed is reproducible. |
| **Seed system** | ✅ 8-char seed, regen, copy, paste | ❌ No seed | 3D uses dice rolls or real catalogue data. |
| **System editor** | ✅ Edit star class/grade, world type, GM notes | ❌ No editor | 2D lets you tweak generated systems inline. |
| **Keyboard shortcuts** | None documented | Escape (clear), Ctrl+A (select all), Ctrl+Shift+A (deselect all) | |
| **Mobile / touch** | ✅ Collapsible panel, touch-optimized | ⚠️ Basic touch support | 2D has better mobile UX (panel hides on narrow screens). |
| **PWA / offline** | ❌ Not yet | ✅ Yes (vite-plugin-pwa) | 3D installs to home screen and works offline. |
| **Cross-linking** | Link to MWG world generator | Links to MWG + 2D System Map | 3D can push MWG data to localStorage and open it in 2D. |
| **GM Notes** | ✅ Per-system textarea + saved in export | ❌ No notes field | 2D stores GM notes in the exported HTML. |
| **Batch operations** | ❌ Single system only | ✅ Export all / export selected | 3D can export subsets of a sector. |
| **Distance measurement** | ❌ None | ✅ Between selected stars, in pc or ly | 3D calculates 3D Euclidean distances. |
| **Ordered path mode** | ❌ None | ✅ Connect stars in click order | 3D can show a route through selected stars. |
| **Lock selection** | ❌ N/A | ✅ Prevent accidental deselect | 3D has a toggle to lock the current selection. |
| **Render mode** | Canvas 2D (single mode) | Points (emissive) or Spheres (3D) | 3D can switch between fast point rendering and solid spheres. |
| **Brightness / Scale** | Fixed | Adjustable brightness + sphere scale | 3D has sliders for visual tuning. |
| **Star labels** | ❌ None | Toggle name display | 3D can show star names above each star. |

---

## Missing in 3D Map (Potential Features from 2D)

These 2D Map features could enhance the 3D Map if ported:

1. **Zone coloring** — Show planetary orbital zones (Infernal/Hot/Conservative/Cold/Outer) when a star has MWG data attached.
2. **Time animation** — Simulate stellar motion or planetary orbits over time (very low priority for galactic scale).
3. **System editor** — Allow editing star class, grade, and attached MWG world data directly in the 3D context panel.
4. **Seed-based reproducibility** — Save/load generation seeds so the same sector can be regenerated identically.
5. **Interactive HTML export** — Export a self-contained 3D view of a selected star subset (similar to 2D's interactive export).
6. **GM Notes** — Attach per-star or per-sector notes that travel with exports.
7. **CSV / DOCX export** — Export selected stars in tabular or document format for tabletop use.

---

## Missing in 2D Map (Potential Features from 3D)

These 3D Map features could enhance the 2D Map if ported:

1. **Multi-system view** — Show multiple star systems on a single 2D sector map (jump routes, distances).
2. **Distance measurement** — Calculate and display distances between systems on the 2D map.
3. **Real star catalogues** — Option to load real HYG stars instead of procedurally generated ones.
4. **Selection groups** — Multi-select systems and show connecting lines (trade routes, patrol paths).
5. **PWA support** — Make the 2D Map installable offline with a service worker.
6. **Star name labels** — Show names of planets/stars on the 2D orbital view.
7. **Density / generation controls** — Let users tune how many worlds appear in a system.

---

## Typical Workflow

1. **Generate a sector** in the 3D Interstellar Map (Generate mode or load HYG catalogue).
2. **Select stars** of interest with Ctrl+Click or Ctrl+A.
3. **Export selected stars** as a `.json` star list.
4. **Import the star list** into the MWG World Generator to create full UWP data for each system.
5. **Export from MWG** as a `.mneme-map` or `.mneme-batch`.
6. **Import back into 3D Map** to visualize the enriched sector with world data.
7. **Open individual systems** in the 2D Star System Map to view orbital diagrams and generate animated exports for players.
