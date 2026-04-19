# 3D Interstellar Map — Feature Requirements Document

**Project:** 3D Interstellar Sector Map  
**Repo:** `Game-in-the-Brain/3d-interstellar-map`  
**Target:** Cepheus Engine referees and world-builders  
**Current Version:** 0.1.0  
**Last Updated:** 2026-04-19

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 0.1.0 | 2026-04-19 | MVP shipped. Points/spheres toggle, selectable render modes, sphere scaling, selection brightening, crash guards, PWA deploy. |

---

## 1. Core Concept

A lightweight, offline-capable 3D star map showing Sol and nearby real stars out to 100 parsecs. Users can select stars, see connecting lines with distances, and orient themselves using a persistent galactic compass.

---

## 2. Functional Requirements

### FR-001 — Galactic Coordinate Frame
**Status:** ✅ Implemented in v0.1.0  
**Priority:** 🔴 High

Sol fixed at origin. Camera and stellar positions follow galactic orientation:
- +X = Coreward
- +Y = Spinward
- +Z = North Galactic Pole

**Tasks:**
- [x] Define `Star` interface with `x, y, z` in parsecs.
- [x] Create `coordinateUtils.ts` with pc-to-scene-unit conversion.
- [x] Verify Alpha Centauri renders at approximately the correct relative angle.

---

### FR-002 — Star Rendering (Spectral Classes) — v0.1.0 REVISED
**Status:** ✅ Implemented in v0.1.0  
**Priority:** 🔴 High

Stars support **two render modes** toggled at runtime:

#### Mode A: Emissive Points (default)
- `THREE.Points` with custom `ShaderMaterial`
- Additive blending, soft radial glow, per-point size by absolute magnitude
- Size attenuation enabled (stars grow when zoomed in)
- Selected stars: size × 1.8, color brightened +25%

#### Mode B: 3D Spheres (optional toggle)
- `THREE.InstancedMesh` with `SphereGeometry`
- Per-instance color by spectral class, scale by absolute magnitude
- **Sphere scale slider** (0.3× – 3.0×) to adjust sphere sizes
- Selected stars: scale × 1.3, color brightened +20%

`SPECTRAL_COLOURS`:
| Class | Hex | Label |
|-------|-----|-------|
| O | `#A5C8FF` | Blue-White |
| B | `#C2D8FF` | Pale Blue |
| A | `#FFFFFF` | White |
| F | `#FFF8E7` | Yellow-White |
| G | `#FFE4B5` | Yellow |
| K | `#FFB366` | Orange |
| M | `#FF6B6B` | Orange-Red |

**Tasks:**
- [x] Create `SPECTRAL_COLOURS` lookup table
- [x] Implement `absMagToRadius()` function (brighter stars = larger radius)
- [x] Render Sol as a distinct, always-visible marker (emissive yellow crosshair)
- [x] Support for white dwarfs and giants via fallback logic
- [x] **NEW v0.1.0:** Emissive points render mode with custom shader glow
- [x] **NEW v0.1.0:** 3D spheres render mode with adjustable scale
- [x] **NEW v0.1.0:** Runtime toggle between points and spheres
- [x] **NEW v0.1.0:** Selected stars brighten in both modes

---

### FR-003 — Background Starfield
**Status:** ✅ Implemented in v0.1.0  
**Priority:** 🟠 Medium

A procedural particle sphere surrounds the camera. Particle density is higher coreward (+X) and lower outward (−X) to give a sense of galactic structure.

**Tasks:**
- [x] Generate 20 000–50 000 particles in a spherical shell.
- [x] Apply a density gradient function: `density(x) ∝ e^(k * x)` where `x` is the coreward axis.
- [x] Use `THREE.Points` with `sizeAttenuation: false` for performance.
- [x] Re-seed on canvas resize without changing random state.

---

### FR-004 — Persistent Galactic Compass
**Status:** ✅ Implemented in v0.1.0  
**Priority:** 🟠 Medium

A UI compass is always visible, pointing toward the four cardinal galactic directions regardless of camera rotation.

**Tasks:**
- [x] Create `compass.ts` rendering four arrows (Coreward, Spinward, Tailward, Outward).
- [x] Billboard the compass so it stays screen-aligned.
- [x] Position in a screen corner (bottom-right default).
- [x] Colour-code arrows: Coreward = red, Spinward = cyan, etc.

---

### FR-005 — Star Selection & Distance Lines — v0.1.0 REVISED
**Status:** ✅ Implemented in v0.1.0  
**Priority:** 🔴 High

Users click stars to select them. When two or more stars are selected, lines connect every unique pair, and the UI displays the distance.

**Changes in v0.1.0:**
- Connection lines are now bright cyan (`#aaffff`) at 85% opacity for better visibility
- Selected stars brighten in both points and spheres modes
- **Crash guard:** Warning banner appears when ≥ 10 stars are selected (see QA-005)

**Tasks:**
- [x] Implement raycaster click selection on the star group.
- [x] Maintain `selectedStarIds: string[]` in application state.
- [x] Draw `THREE.LineSegments` between all combinations of selected stars.
- [x] Colour lines by distance (optional: short = green, long = red).
- [x] Display distance in parsecs, switchable to light years (1 pc ≈ 3.26156 ly).
- [x] Clear selection with an Escape key handler or a "Clear" button.
- [x] **NEW v0.1.0:** Brighter connection lines and selected-star highlighting

---

### FR-006 — Star Count Slider & Performance Guard
**Status:** ✅ Implemented in v0.1.0  
**Priority:** 🔴 High

To prevent mobile devices from being overwhelmed, a slider controls how many stars are rendered from the loaded catalogue.

**Tasks:**
- [x] Add a UI slider: range 10 to max available, default 200.
- [x] Sort catalogue by distance from Sol before slicing.
- [x] Re-build the star mesh group instantly when the slider changes.
- [x] Show an FPS indicator (green ≥ 55, yellow 30–54, red < 30).
- [x] If FPS stays green for 5 seconds, auto-suggest increasing the slider.

---

### FR-007 — Static Star Catalogues
**Status:** ✅ Implemented in v0.1.0  
**Priority:** 🔴 High

Real stellar data is baked into JSON files and shipped with the app.

**Tasks:**
- [x] Source public-domain stellar data (Hipparcos, Yale Bright Star, or Gaia subset).
- [x] Generate `stars-10pc.json`, `stars-50pc.json`, `stars-100pc.json`.
- [x] Each file must contain: `id, name, x, y, z, spec, absMag`.
- [x] Verify total file size < 5 MB combined.
- [x] Add a catalogue selector UI (10 pc / 50 pc / 100 pc).

---

### FR-008 — PWA Deployment
**Status:** ✅ Implemented in v0.1.0  
**Priority:** 🟠 Medium

The app must work offline after the first load.

**Tasks:**
- [x] Configure `vite-plugin-pwa` with `registerType: 'autoUpdate'`.
- [x] Cache JSON catalogues in the service worker precache.
- [x] Set `base: '/3d-interstellar-map/'` in `vite.config.ts`.
- [x] Deploy to GitHub Pages and verify offline mode in DevTools → Application.

---

### FR-009 — Mobile & Touch Support
**Status:** ✅ Implemented in v0.1.0  
**Priority:** 🟡 Low

The map must be usable on tablets and phones.

**Tasks:**
- [x] Enable `OrbitControls` touch rotate and pinch-zoom.
- [x] Tap-to-select via raycaster (distinguish tap from drag).
- [x] Clamp `devicePixelRatio` to 2 to save GPU bandwidth.
- [x] Ensure UI controls have 44 px minimum touch targets.

---

### FR-010 — Future Cepheus Engine Hooks
**Status:** 📋 Proposed  
**Priority:** 🟡 Low

Reserved extension points for Traveller/Cepheus integration.

**Tasks:**
- [ ] Hex-grid overlay aligned to Cepheus sector coordinates.
- [ ] Jump-route highlighting (1–6 parsecs).
- [ ] Import UWP (Universal World Profile) data for known worlds.

---

### FR-011 — Sector File Load (MWG SectorFile Consumer)
**Status:** 📋 Planned  
**Priority:** 🔴 High

The 3D map is the **host** for a generated sector. It ingests a `SectorFile` produced by MWG FR-045 and makes every star in the catalogue clickable with full planetary content attached.

**Tasks:**
- [ ] `src/sector/sectorTypes.ts` — mirror the MWG `SectorFile` interfaces
- [ ] `src/sector/loader.ts` — parse, validate, report per-system skip reasons
- [ ] `src/ui/SectorLoadPanel.tsx` (or vanilla DOM equivalent) — file picker + "Open from MWG" button
- [ ] Error UI for schema / catalogue mismatch
- [ ] Preserve the ungenerated status as visually-distinct stars

---

### FR-012 — Clickable Worlds & Drill-Down
**Status:** 📋 Planned  
**Priority:** 🔴 High

Once a `SectorFile` is loaded, clicking a star opens its generated content.

**Tasks:**
- [ ] Extend the raycaster path to return the attached `SectorSystemRecord`
- [ ] Build `src/sector/starPopover.tsx` — system summary + open-in buttons
- [ ] `src/sector/handoff.ts` — build the cross-app URLs
- [ ] Visual marker for "has sector data"

---

### FR-013 — Sector Persistence (3D Map is the Host)
**Status:** 📋 Planned  
**Priority:** 🔴 High

The 3D map **owns the storage layer** for sectors.

**Tasks:**
- [ ] `src/sector/sectorStore.ts` — Dexie wrapper exposing `saveSector`, `loadSector`, etc.
- [ ] `src/ui/SectorPicker.tsx` — list + activate + delete + export sectors
- [ ] `src/sector/bus.ts` — BroadcastChannel producer/consumer
- [ ] Quota-estimate warning UI

---

### FR-014 — Sector Age Display & Compass Integration
**Status:** 📋 Planned  
**Priority:** 🟠 Medium

Sector Age is a first-class display element.

**Tasks:**
- [ ] Header chip: "Sector: {sectorName} — Age: {sectorAge.label}"
- [ ] Goals-preset chip next to Sector Age
- [ ] Empty state when no sector is loaded

---

## 3. Technical Stack

| Layer | Choice | Reason |
|---|---|---|
| Build tool | Vite 6.x | Fast HMR, simple config, proven in all analysed repos |
| 3D engine | Three.js r0.177+ | Mature, excellent docs, used successfully in threejs and honzaap repos |
| Language | TypeScript | Type safety for coordinate math and data models |
| Controls | `OrbitControls` (three/addons) | Standard, touch-friendly |
| PWA | `vite-plugin-pwa` | One-config offline caching |
| Styling | Plain CSS | Lightweight, no framework overhead |

---

## 4. Acceptance Criteria (MVP v0.1.0)

- [x] User opens the app and sees Sol at the centre of a 3D starfield.
- [x] At least 200 nearest stars are visible, coloured by spectral class.
- [x] Clicking any two stars draws a line and shows the distance in parsecs.
- [x] The compass always points coreward/spinward/tailward/outward.
- [x] The star-count slider changes the rendered population in real time.
- [x] App works offline after first load (PWA).
- [x] `npm run build` produces a working `dist/` folder with zero TypeScript errors.
- [x] **NEW v0.1.0:** Render mode toggle (points vs spheres) works and persists per session.
- [x] **NEW v0.1.0:** Sphere scale slider adjusts 3D sphere sizes in real time.
- [x] **NEW v0.1.0:** Selected stars brighten and connection lines are clearly visible.
- [x] **NEW v0.1.0:** Browser crash warning at 10+ selected stars.

---

## 5. Out of Scope (MVP)

- Orbital motion (stars are static).
- Planet/moon rendering (INTRAS Level 2 — future feature).
- Real-time API calls (all data is static JSON).
- Bloom/post-processing (may be added if performance is green).
- Sound or music.

---

## 6. Sector Hosting Role (FR-011 → FR-014 Summary)

The 3D map is not only a viewer of real-star catalogues — once MWG FR-045 ships, it becomes the **host** for generated sectors:

```
  ┌──────────────────┐   .sector.json   ┌────────────────────┐
  │  MWG (generator) │ ───────────────▶ │  3D Map (host)     │
  │  FR-045          │                  │  FR-011..014       │
  └──────────────────┘                  │  IndexedDB         │
         ▲                              │  clickable stars   │
         │ edit handoff                 └──────────┬─────────┘
         │                                         │ starId +
         │                                         │ sector ctx
         │                              ┌──────────▼─────────┐
         └──────────────────────────────│  2D Map (viewer)   │
                                        │  §8 sector mode    │
                                        └────────────────────┘
```

- **MWG generates**, produces a SectorFile.
- **3D map hosts**, persists in IndexedDB, shows the sector in 3D, routes clicks.
- **2D map drills down**, reading its system from the shared host or from the legacy `?system=` URL.
- **MWG re-enters** in view or edit mode from a 3D click, writes updates back through the broadcast bus.
