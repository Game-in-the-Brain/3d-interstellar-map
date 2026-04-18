# 3D Interstellar Map — Feature Requirements Document

**Project:** 3D Interstellar Sector Map  
**Repo:** `Game-in-the-Brain/3d-interstellar-map`  
**Target:** Cepheus Engine referees and world-builders  

---

## 1. Core Concept

A lightweight, offline-capable 3D star map showing Sol and nearby real stars out to 100 parsecs. Users can select stars, see connecting lines with distances, and orient themselves using a persistent galactic compass.

---

## 2. Functional Requirements

### FR-001 — Galactic Coordinate Frame
**Status:** 📋 Pending  
**Priority:** 🔴 High

Sol must be fixed at the origin. The camera and all stellar positions must follow the galactic orientation defined in `repoanalysis.md`:
- +X = Coreward
- +Y = Spinward
- +Z = North Galactic Pole

**Tasks:**
- [ ] Define `Star` interface with `x, y, z` in parsecs.
- [ ] Create `coordinateUtils.ts` with pc-to-scene-unit conversion.
- [ ] Verify Alpha Centauri renders at approximately the correct relative angle.

---

### FR-002 — Star Rendering (Spectral Classes)
**Status:** 📋 Pending  
**Priority:** 🔴 High

Stars are rendered as coloured spheres with sizes relative to their absolute magnitude / spectral class. No textures required.

**Tasks:**
- [ ] Create `SPECTRAL_COLOURS` lookup table:
  - O: `#A5C8FF` (Blue-White)
  - B: `#C2D8FF` (Pale Blue)
  - A: `#FFFFFF` (White)
  - F: `#FFF8E7` (Yellow-White)
  - G: `#FFE4B5` (Yellow)
  - K: `#FFB366` (Orange)
  - M: `#FF6B6B` (Orange-Red)
- [ ] Implement `absMagToRadius()` function (brighter stars = larger radius).
- [ ] Render Sol as a distinct, always-visible marker (e.g. emissive yellow crosshair).
- [ ] Support for white dwarfs and giants via fallback logic.

---

### FR-003 — Background Starfield
**Status:** 📋 Pending  
**Priority:** 🟠 Medium

A procedural particle sphere surrounds the camera. Particle density is higher coreward (+X) and lower outward (−X) to give a sense of galactic structure.

**Tasks:**
- [ ] Generate 20 000–50 000 particles in a spherical shell.
- [ ] Apply a density gradient function: `density(x) ∝ e^(k * x)` where `x` is the coreward axis.
- [ ] Use `THREE.Points` with `sizeAttenuation: false` for performance.
- [ ] Re-seed on canvas resize without changing random state.

---

### FR-004 — Persistent Galactic Compass
**Status:** 📋 Pending  
**Priority:** 🟠 Medium

A UI compass is always visible, pointing toward the four cardinal galactic directions regardless of camera rotation.

**Tasks:**
- [ ] Create `compass.ts` rendering four arrows (Coreward, Spinward, Tailward, Outward).
- [ ] Billboard the compass so it stays screen-aligned.
- [ ] Position in a screen corner (bottom-right default).
- [ ] Colour-code arrows: Coreward = red, Spinward = cyan, etc.

---

### FR-005 — Star Selection & Distance Lines
**Status:** 📋 Pending  
**Priority:** 🔴 High

Users click stars to select them. When two or more stars are selected, lines connect every unique pair, and the UI displays the distance.

**Tasks:**
- [ ] Implement raycaster click selection on the star group.
- [ ] Maintain `selectedStarIds: string[]` in application state.
- [ ] Draw `THREE.LineSegments` between all combinations of selected stars.
- [ ] Colour lines by distance (optional: short = green, long = red).
- [ ] Display distance in parsecs, switchable to light years (1 pc ≈ 3.26156 ly).
- [ ] Clear selection with an Escape key handler or a "Clear" button.

---

### FR-006 — Star Count Slider & Performance Guard
**Status:** 📋 Pending  
**Priority:** 🔴 High

To prevent mobile devices from being overwhelmed, a slider controls how many stars are rendered from the loaded catalogue.

**Tasks:**
- [ ] Add a UI slider: range 10 to max available, default 200.
- [ ] Sort catalogue by distance from Sol before slicing.
- [ ] Re-build the star mesh group instantly when the slider changes.
- [ ] Show an FPS indicator (green ≥ 55, yellow 30–54, red < 30).
- [ ] If FPS stays green for 5 seconds, auto-suggest increasing the slider.

---

### FR-007 — Static Star Catalogues
**Status:** 📋 Pending  
**Priority:** 🔴 High

Real stellar data is baked into JSON files and shipped with the app.

**Tasks:**
- [ ] Source public-domain stellar data (Hipparcos, Yale Bright Star, or Gaia subset).
- [ ] Generate `stars-10pc.json`, `stars-50pc.json`, `stars-100pc.json`.
- [ ] Each file must contain: `id, name, x, y, z, spec, absMag`.
- [ ] Verify total file size < 5 MB combined.
- [ ] Add a catalogue selector UI (10 pc / 50 pc / 100 pc).

---

### FR-008 — PWA Deployment
**Status:** 📋 Pending  
**Priority:** 🟠 Medium

The app must work offline after the first load.

**Tasks:**
- [ ] Configure `vite-plugin-pwa` with `registerType: 'autoUpdate'`.
- [ ] Cache JSON catalogues in the service worker precache.
- [ ] Set `base: '/3d-interstellar-map/'` in `vite.config.ts`.
- [ ] Deploy to GitHub Pages and verify offline mode in DevTools → Application.

---

### FR-009 — Mobile & Touch Support
**Status:** 📋 Pending  
**Priority:** 🟡 Low

The map must be usable on tablets and phones.

**Tasks:**
- [ ] Enable `OrbitControls` touch rotate and pinch-zoom.
- [ ] Tap-to-select via raycaster (distinguish tap from drag).
- [ ] Clamp `devicePixelRatio` to 2 to save GPU bandwidth.
- [ ] Ensure UI controls have 44 px minimum touch targets.

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

## 3. Technical Stack

| Layer | Choice | Reason |
|---|---|---|
| Build tool | Vite 6.x | Fast HMR, simple config, proven in all analysed repos |
| 3D engine | Three.js r0.177+ | Mature, excellent docs, used successfully in threejs and honzaap repos |
| Language | TypeScript | Type safety for coordinate math and data models |
| Controls | `OrbitControls` (three/addons) | Standard, touch-friendly |
| PWA | `vite-plugin-pwa` | One-config offline caching |
| Styling | Plain CSS or Tailwind | Lightweight, no framework overhead |

---

## 4. Acceptance Criteria (MVP)

- [ ] User opens the app and sees Sol at the centre of a 3D starfield.
- [ ] At least 200 nearest stars are visible, coloured by spectral class.
- [ ] Clicking any two stars draws a line and shows the distance in parsecs.
- [ ] The compass always points coreward/spinward/tailward/outward.
- [ ] The star-count slider changes the rendered population in real time.
- [ ] App works offline after first load (PWA).
- [ ] `npm run build` produces a working `dist/` folder with zero TypeScript errors.

---

## 5. Out of Scope (MVP)

- Orbital motion (stars are static).
- Planet/moon rendering (INTRAS Level 2 — future feature).
- Real-time API calls (all data is static JSON).
- Bloom/post-processing (may be added if performance is green).
- Sound or music.
