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

### FR-011 — Sector File Load (MWG SectorFile Consumer)
**Status:** 📋 Planned
**Priority:** 🔴 High
**Companion specs:** `Mneme-CE-World-Generator/…FRD.md` §14.6 FR-045; `2d-star-system-map/FRD.md` §8.

The 3D map is the **host** for a generated sector. It ingests a `SectorFile` produced by MWG FR-045 and makes every star in the catalogue clickable with full planetary content attached.

**Ingest modes:**
1. **File upload** — drag-and-drop or file picker for `.sector.json`. Required for v1 (works across origins, offline, portable).
2. **Broadcast handoff** — listen on `BroadcastChannel('gi7b-sector-bus')` for a `{ type: 'sector:push', payload: SectorFile }` message from MWG when both apps share origin `game-in-the-brain.github.io`. v1.1.
3. **PostMessage** — accept a `postMessage` from an opener window with origin check against the MWG URL. Fallback.

**Validation on load:**
- `schemaVersion` matches a supported set (`'1.0'` in v1; unknown versions rejected with a visible error).
- `catalogueHash` matches a known built-in catalogue OR the user confirms "load anyway with mismatched catalogue".
- `systems[].starId` must map 1:1 onto the active catalogue's star IDs. Unmatched IDs are listed, not silently dropped.

**Tasks:**
- [ ] `src/sector/sectorTypes.ts` — mirror the MWG `SectorFile`/`SectorSystemRecord`/`SectorAge`/`SectorGoals` interfaces (single source of truth: MWG; copy until the two repos share a `@gi7b/sector-schema` package).
- [ ] `src/sector/loader.ts` — parse, validate, report per-system skip reasons.
- [ ] `src/ui/SectorLoadPanel.tsx` (or vanilla DOM equivalent) — file picker + "Open from MWG" button (BroadcastChannel subscription).
- [ ] Error UI for schema / catalogue mismatch.
- [ ] Preserve the ungenerated status (MWG's `starSystem: null` systems) as visually-distinct stars (desaturated + ❓ on hover).

---

### FR-012 — Clickable Worlds & Drill-Down
**Status:** 📋 Planned
**Priority:** 🔴 High

Once a `SectorFile` is loaded, clicking a star opens its generated content.

**Interaction model:**
- Single click selects the star (existing FR-005 behaviour preserved).
- Double-click OR a click on the selected star's "Open" UI chip surfaces a popover with:
  - Mainworld name, UWP, starport, TL, population summary.
  - **"Open System Map (2D)"** button → launches the 2D Star System Map with this system (see §2d-star-system-map §8 Sector-Hosted Mode).
  - **"Open World Details (MWG)"** button → launches MWG in read-only "View Record" mode for this system.
  - **"Edit in MWG"** button → launches MWG in edit mode; on save, MWG posts the updated `StarSystem` back via BroadcastChannel and the 3D map replaces the record in IndexedDB (see FR-013).
- Ungenerated systems show a "Generate this system" chip that opens MWG with the catalogue star preselected.

**Cross-app URL contract:**
- 2D handoff: `https://game-in-the-brain.github.io/2d-star-system-map/?sector=<sectorId>&starId=<starId>` (reads from the shared IndexedDB origin) **or** the existing `?system=<base64>` URL when IndexedDB is unavailable (falls back automatically).
- MWG view handoff: `…/Mneme-CE-World-Generator/?mode=view&sector=<sectorId>&starId=<starId>`.
- MWG edit handoff: `…/Mneme-CE-World-Generator/?mode=edit&sector=<sectorId>&starId=<starId>`.

**Tasks:**
- [ ] Extend the raycaster path to return the attached `SectorSystemRecord` alongside the star.
- [ ] Build `src/sector/starPopover.tsx` — system summary + open-in buttons.
- [ ] `src/sector/handoff.ts` — build the cross-app URLs, fall back to URL-encoded `MapPayload` when IndexedDB/BroadcastChannel is unavailable (this matches the existing 2D map contract).
- [ ] Visual marker for "has sector data" — e.g. a subtle ring around stars with attached content; a question-mark on ungenerated.

---

### FR-013 — Sector Persistence (3D Map is the Host)
**Status:** 📋 Planned
**Priority:** 🔴 High

The 3D map **owns the storage layer** for sectors. Once a SectorFile is loaded, it persists across reloads and is available to the 2D map (same origin) and to MWG's view/edit handoff.

**Storage:**
- IndexedDB database `gi7b_sectors`, object store `sectors` keyed by `sectorId`.
- Secondary store `systems` keyed by `${sectorId}:${starId}` for per-system reads without deserialising the whole sector (critical for large catalogues — the 100 pc sector can be ~100 MB).
- Metadata store `sectors_meta` keyed by `sectorId` with: `sectorName`, `sectorAge`, `goals.name`, `catalogueSource`, `systemCount`, `inhabitedCount`, `generatedAt`, `activeSector: boolean`.
- LocalStorage mirror of `sectors_meta` (small, synchronous) for the sector-picker UI on app open.

**Multi-sector support:**
- The user can load many sectors (e.g. "Near Sol 50 pc — Golden Age" and "Near Sol 50 pc — Collapse" for comparison) and switch between them.
- One sector is `activeSector` at a time; only its records drive clickable content.
- A sector-picker UI (dropdown or sidebar) lists all sectors in IndexedDB with inhabited-count and age.

**Update paths:**
- MWG edit handoff → MWG posts updated `StarSystem` → 3D map writes it into `systems` store → in-memory record updated if this is the active sector.
- Conflict: if the user edits the same system in two tabs, last-write-wins (v1). A `revision` counter per `SectorSystemRecord` is emitted for v1.1 conflict UI.

**Export / delete:**
- Each sector has "Export .sector.json" and "Delete sector" in the sector picker.
- Export round-trips cleanly: exported file equals the originally imported file except for any edits made since import.

**Quota guard:**
- Pre-flight `navigator.storage.estimate()` before importing a large sector. Warn if `usage + sectorSize > 0.9 × quota`.
- If IndexedDB is unavailable (Firefox private mode, some embedded browsers), fall back to in-memory-only mode with a visible "this sector will not persist" banner.

**Tasks:**
- [ ] `src/sector/sectorStore.ts` — Dexie (or hand-rolled IDB) wrapper exposing `saveSector`, `loadSector`, `loadSystem(sectorId, starId)`, `updateSystem`, `listSectors`, `deleteSector`, `exportSector`.
- [ ] `src/ui/SectorPicker.tsx` — list + activate + delete + export sectors.
- [ ] `src/sector/bus.ts` — BroadcastChannel producer/consumer for `sector:push` (MWG → 3D) and `system:update` (MWG edit → 3D).
- [ ] Quota-estimate warning UI.
- [ ] Migration hook: on schemaVersion bump, run `src/sector/migrations/*.ts`.

---

### FR-014 — Sector Age Display & Compass Integration
**Status:** 📋 Planned
**Priority:** 🟠 Medium

Sector Age (from MWG FR-045) is a first-class display element, not buried in metadata.

**Tasks:**
- [ ] Header chip: "Sector: {sectorName} — Age: {sectorAge.label || `${year} ${era}`}".
- [ ] Goals-preset chip next to Sector Age (e.g. "Frontier Expansion").
- [ ] Empty state when no sector is loaded: "No sector loaded — Import a .sector.json or generate one in MWG".
- [ ] The persistent galactic compass (FR-004) is unchanged; Sector Age lives in a separate top-centre strip.
- [ ] Respect system theme (dark/light) using the 2D map's existing palette conventions where applicable.

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
