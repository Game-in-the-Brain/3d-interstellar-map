# 3D Interstellar Map — Consolidated Specification

**Repo:** `Game-in-the-Brain/3d-interstellar-map`
**Working dir:** `/home/justin/opencode260220/3d-interstellar-map`
**Related upstream:** https://github.com/Game-in-the-Brain/2d-star-system-map
**Consolidated:** 2026-04-18
**Sources merged:** `frd.md` + `qa.md` + `repoanalysis.md` + `README.md`

Single source of truth for this repo. If this doc and any source doc disagree, this doc wins.

---

## 1. Concept

A lightweight, offline-capable 3D star map showing Sol and nearby real stars out to 100 parsecs. Users select stars, see connecting lines with distances, and orient themselves using a persistent galactic compass. Target audience: Cepheus Engine referees and world-builders.

---

## 2. Stack

| Layer | Choice |
|-------|--------|
| Renderer | Three.js r0.177+ (WebGL 2) |
| Build | Vite 6.x |
| Language | TypeScript, strict mode |
| Architecture | Vanilla TS, no framework dependency |
| Controls | `OrbitControls` from `three/addons` |
| PWA | `vite-plugin-pwa`, `registerType: 'autoUpdate'` |
| Styling | Plain CSS or Tailwind (pick one, not both) |
| Deployment | GitHub Pages PWA, base `/3d-interstellar-map/` |
| Data | Static JSON (public-domain: Hipparcos / Yale BSC / Gaia DR3 subset) |

---

## 3. Galactic Coordinate Frame — INVARIANT

Sol pinned at `(0, 0, 0)`. Right-handed coordinate system.

| Axis | Direction | Mnemonic |
|------|-----------|----------|
| **+X** | Coreward | Toward Sagittarius A* |
| **−X** | Rimward / Outward | Away from galactic centre |
| **+Y** | Spinward | Direction of galactic rotation (≈ Cygnus) |
| **−Y** | Trailing / Tailward | Anti-spinward |
| **+Z** | North Galactic Pole | Above the plane |
| **−Z** | South Galactic Pole | Below the plane |

Distances stored in parsecs in JSON. Renderer applies a log/compressed linear scale so 100 pc fits the frustum without stars shrinking to invisible specks.

---

## 4. Functional Requirements

All statuses 📋 Pending.

### FR-001 — Galactic Coordinate Frame · 🔴 High
- Define `Star` interface with `x, y, z` in parsecs.
- `coordinateUtils.ts` with pc → scene-unit conversion.
- Verify Alpha Centauri renders at the correct relative angle.

### FR-002 — Star Rendering (Spectral Classes) · 🔴 High
Spheres, sized by absolute magnitude, coloured by spectral class. No textures.

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

- `absMagToRadius()` — brighter = larger.
- Sol as emissive yellow crosshair, always visible.
- Fallback logic for white dwarfs / giants.
- Unknown spectral class → grey (don't throw).

### FR-003 — Background Starfield · 🟠 Medium
Procedural `THREE.Points` sphere, 20 000–50 000 particles. Density biased coreward via `density(x) ∝ e^(k·x)`. `sizeAttenuation: false`. Re-seed deterministically on resize.

### FR-004 — Persistent Galactic Compass · 🟠 Medium
`compass.ts`. Four billboarded arrows: Coreward (+X red), Spinward (+Y cyan), Tailward (−Y), Outward (−X). Screen-aligned, bottom-right default. Arrows rotate with camera — always point to real galactic directions.

### FR-005 — Selection & Distance Lines · 🔴 High
- Raycaster click selection on the star group.
- `selectedStarIds: string[]` in app state.
- `THREE.LineSegments` between every pair.
- Optional line colour by distance (short green → long red).
- Distance in parsecs, toggle to light-years (1 pc = 3.26156 ly).
- Escape key OR "Clear" button deselects all.

### FR-006 — Star Count Slider & FPS Guard · 🔴 High
- Slider: 10 → max available. Default 200.
- Sort catalogue by distance from Sol, then slice.
- Rebuild star mesh group instantly on change.
- FPS indicator: green ≥ 55, yellow 30–54, red < 30.
- If FPS stays green for 5 s, auto-suggest raising the slider.

### FR-007 — Static Star Catalogues · 🔴 High
- Ship `stars-10pc.json`, `stars-50pc.json`, `stars-100pc.json`.
- Fields per entry: `id, name, x, y, z, spec, absMag`.
- Combined < 5 MB.
- Catalogue selector UI (10 / 50 / 100 pc).
- Sol explicit at `(0, 0, 0)`.
- 10 pc catalogue must include Alpha Centauri, Barnard's Star, Sirius, Proxima Centauri.

### FR-008 — PWA Deployment · 🟠 Medium
- `vite-plugin-pwa` with `registerType: 'autoUpdate'`.
- Precache JSON catalogues.
- `base: '/3d-interstellar-map/'` in `vite.config.ts`.
- Verify offline mode in DevTools → Application.

### FR-009 — Mobile & Touch · 🟡 Low
- `OrbitControls` touch rotate + pinch zoom.
- Tap vs drag disambiguation: < 10 px movement between `touchstart` and `touchend` = tap.
- Clamp `devicePixelRatio` to 2.
- Minimum 44 × 44 px touch targets.

### FR-010 — Future Cepheus Hooks · 🟡 Low (Proposed)
- Hex-grid overlay aligned to Cepheus sector coordinates.
- Jump-route highlighting (1–6 pc bands).
- UWP (Universal World Profile) import.

---

## 5. Scene Graph

```
Scene
├── Camera (PerspectiveCamera + OrbitControls)
├── Renderer (WebGLRenderer, antialias, toneMapping=ACESFilmic)
├── BackgroundStarfield (THREE.Points, 20k–50k, coreward density gradient)
├── ConnectionLines (THREE.LineSegments, dynamic)
├── StarGroup
│   ├── Sol (special marker, always visible)
│   ├── O/B stars (largest, blue/white)
│   ├── A/F stars (medium, white/yellow-white)
│   ├── G/K stars (small, yellow/orange)
│   └── M stars (tiny, red-orange)
└── CompassGroup (billboarded)
    ├── +X Coreward arrow
    ├── +Y Spinward arrow
    ├── −Y Tailward arrow
    └── −X Outward arrow
```

---

## 6. Data Model

```typescript
interface Star {
  id: string;        // HIP, Gaia DR3, or custom catalogue ID
  name: string;      // Proper name, Bayer-Flamsteed fallback
  x: number;         // pc, galactic Cartesian
  y: number;
  z: number;
  spec: string;      // e.g. "G2V"
  absMag: number;    // drives rendered size
  parallax?: number; // mas (optional)
}
```

Derived at runtime:
- `distanceFromSol = Math.sqrt(x*x + y*y + z*z)`
- `colour` from `SPECTRAL_COLOURS[spec[0]]`
- `radiusUnits` from `absMag`

---

## 7. Acceptance Criteria (MVP)

- [ ] User opens the app and sees Sol at scene centre.
- [ ] ≥ 200 nearest stars visible, coloured by spectral class.
- [ ] Clicking any two stars draws a line with distance readout in parsecs.
- [ ] Compass always points coreward / spinward / tailward / outward regardless of camera rotation.
- [ ] Star-count slider changes the rendered population in real time.
- [ ] App works offline after first load.
- [ ] `npm run build` produces a working `dist/` with zero TypeScript errors.

---

## 8. Out of Scope (MVP)

- Orbital motion (stars are static).
- Planet / moon rendering.
- Real-time API calls.
- Post-processing bloom (revisit only if perf is consistently green).
- Sound / music.
- Procedural star generation, GM tools, strategic markers, route planning, Dexie persistence, MWG/2D-map JSON integration — these are separate future features.

---

## 9. QA Open Items

| # | Area | Title | Priority | File(s) |
|---|------|-------|----------|---------|
| QA-001 | Project Setup | Repo scaffold & Vite build pipeline | 🔴 High | `vite.config.ts`, `package.json`, `tsconfig.json`, `index.html` |
| QA-002 | Data | Source + validate 10 pc catalogue (≥ 300 stars; Sol + α Cen + Barnard + Sirius + Proxima present) | 🔴 High | `data/stars-10pc.json` |
| QA-003 | Rendering | 50k-particle starfield perf on integrated GPUs (≥ 55 FPS target) | 🟠 Medium | `src/starfield.ts` |
| QA-004 | UX | Touch tap vs drag ambiguity (< 10 px = tap) | 🟡 Low | `src/input.ts` |

**Recommended data sources:** RECONS "The 10 Parsec Sample", Gaia DR3 × Simbad for spectral types, Yale Bright Star Catalogue for named stars.

**Starfield perf mitigations (QA-003):** `THREE.Points` with `sizeAttenuation: false`; optional worker-thread particle generation; reduce default count to 10 000 on detected low-end GPUs.

---

## 10. Technical Thesis (Why These Choices)

After reviewing four solar-system visualisers (`solar-system-3d-threejs`, `solar-system-honzaap`, `solar-system-simone`, `Solar-System-3D`):

1. **Framework-free.** Single `main.ts` or focused modules is enough. Vue/React add build complexity this project doesn't need.
2. **No heavy assets.** Target < 1 MB bundle, < 2 s load. Emissive `Points` or `SphereGeometry` + `MeshBasicMaterial` only. Zero per-star textures.
3. **Performance-first.** Instanced background rendering. LOD via distance-based size clamping. Dynamic slider so low-end devices never exceed their budget. No shadows, no post-processing initially.
4. **Static data, not APIs.** Network-fetching star data (as in `solar-system-3d-threejs`) introduces runtime fragility. Bake everything.
5. **PWA from day one.** Tabletop RPG sessions happen offline — this is a reference tool that must not require network.

---

## 11. Risk Register

| Risk | Mitigation |
|------|-----------|
| 100 pc JSON > 5 MB | Float32 binary arrays, or split 10/25/50/100 pc chunks |
| Frame drops > 500 stars | Star-count slider; default 200 |
| Label readability at distance | DOM labels via world→screen projection, not canvas text |
| Mobile GPU limits | Clamp DPR to 2; disable AA on low-end |
| Astronomical data copyright | Use public-domain catalogues (Hipparcos, Yale BSC) |

---

## 12. Phased Rollout

| Phase | Goal | Deliverable |
|-------|------|-------------|
| 0 | Foundation | Vite + Three.js scaffold, OrbitControls, blank scene |
| 1 | Starfield | Background particle sphere with coreward density gradient |
| 2 | Data Pipeline | Load `stars-10pc.json`, render Sol + first 20 stars |
| 3 | Visual Polish | Spectral colours, size scaling, compass UI |
| 4 | Selection & Lines | Raycaster, line drawing, distance readout |
| 5 | Scale & Performance | Slider, 50 pc + 100 pc catalogues |
| 6 | PWA & Deploy | `vite-plugin-pwa`, GitHub Pages live |
| 7 | Cepheus Integration | Sector-grid overlay, jump routes, UWPs |

---

## 13. Invariants (DO NOT change)

- Sol at `(0, 0, 0)`.
- Galactic axes: **+X Coreward, +Y Spinward, +Z NGP.** Right-handed.
- No dependencies beyond Three.js and Vite tooling.
- No network calls at runtime after first load.
- Build command: `npm run build`. Must pass with zero TypeScript errors.

---

## 14. Source Files

After consolidation this repo keeps:

- `CONSOLIDATED.md` (this file) — primary spec.
- `KIMI-INSTRUCTIONS.md` — execution runbook for the implementing agent.
- `frd.md`, `qa.md`, `repoanalysis.md` — original source docs retained for provenance.
- `README.md`, `LICENSE` — repo basics.

Track B variants (`FRD-interstellar-starmap.md`, `QA-interstellar-starmap.md`, `repoAnalysis-interstellar-starmap.md`) were removed on 2026-04-18 because they described a different deployment context (the Mneme CE monorepo sub-app with React + Dexie + MWG integration) and their presence created dual-spec confusion. If that port is ever wanted, recover them via `git log` on this directory.
