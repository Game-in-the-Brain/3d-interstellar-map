# Master Implementation Queue

**Date:** 2026-04-19  
**Status:** FRD-044 Complete | FRD-045/046/047 Queued

---

## Completed

| FRD | Project | Feature | Status |
|---|---|---|---|
| FRD-044 | 3D Map + MWG | Bidirectional star↔system integration | ✅ v0.1.2 / main |

---

## Phase 1: 3D Starmap Star Generation (FRD-045)

**Project:** `3d-interstellar-map`  
**Target Version:** 0.2.0  
**Priority:** P0  
**Estimated Effort:** 3–4 sessions

### Milestones

1. **M1: Mode Toggle** (1 session)
   - Add HYG / Generate mode toggle in Controls
   - Generate mode shows blank canvas + parameter panel
   - Build passes

2. **M2: Star Generation Core** (1 session)
   - Implement 5D6 class/grade tables (copy from MWG)
   - Implement d66 → 360° spherical coordinate conversion
   - Implement pass-based generation algorithm
   - Origin star + child stars with correct distances

3. **M3: Parameters & Tables** (1 session)
   - Density presets (Sparse / Average / Dense)
   - Editable class/grade tables
   - Save/load generation parameters
   - Named stars (hierarchical auto-naming)

4. **M4: Save/Load/Export** (1 session)
   - `.mneme-map` export format
   - Import `.mneme-map`
   - Attach MWG JSON to stars
   - Context panel MWG stats view

---

## Phase 2: MWG Batch Management (FRD-047)

**Project:** `Mneme-CE-World-Generator`  
**Target Version:** 1.4.0  
**Priority:** P1 (parallel with Phase 1 M3-M4)  
**Estimated Effort:** 3 sessions

### Milestones

1. **M1: Data Model + Migration** (1 session)
   - Add `StarSystemBatch` type
   - Add `batchId` to `StarSystem`
   - IndexedDB migration for legacy systems
   - Batch CRUD functions in `db.ts`

2. **M2: Systems View UI** (1 session)
   - Replace Settings systems list with batch-aware view
   - Batch selector, create/rename/delete
   - System list within batch
   - Active batch tracking

3. **M3: Import/Export + 3D Map Flow** (1 session)
   - Batch import from `.mneme-map` (3D map export)
   - Batch export to `.mneme-batch`
   - Progress UI for batch generation
   - "Export to 3D Map" button

---

## Phase 3: 2D Map Star Page Save (FRD-046)

**Project:** `2d-star-system-map`  
**Target Version:** 0.3.0  
**Priority:** P2  
**Estimated Effort:** 2–3 sessions

### Milestones

1. **M1: Save Page + Storage** (1 session)
   - "Save Page" button downloads self-contained HTML
   - Sync saved HTML to shared `localStorage` / IndexedDB
   - 3D map can read and open saved pages

2. **M2: MWG Editor Tab** (1–2 sessions)
   - New "System Editor" tab
   - Editable fields for star/world/inhabitants
   - GM notes text area
   - Export to DOCX/CSV/JSON (port MWG export code)

---

## Cross-Cutting Concerns

### Shared Storage Contract

All three apps read/write to the same storage namespace:

```
localStorage:
  mneme-2dmap-{starId}     → HTML string (2D map page)
  mneme-theme              → 'dark' | 'day' | 'phone'
  mneme-debug-mode         → 'true' | 'false'

IndexedDB (3D map):
  starMaps                 → MapState objects
  saved2dPages             → { starId, html, savedAt }

IndexedDB (MWG):
  starSystems              → StarSystem objects
  batches                  → StarSystemBatch objects
```

### File Format Versions

| Format | Extension | Used By |
|---|---|---|
| `mneme-map-v1` | `.mneme-map` | 3D Map save/export |
| `star-system-batch` | `.json` | 3D Map ↔ MWG interchange |
| `mwg-batch-v1` | `.mneme-batch` | MWG batch export |
| `mwg-system` | `.json` | MWG single system |

### URL Cross-Linking

| From | To | URL Pattern |
|---|---|---|
| 3D Map → MWG | `https://game-in-the-brain.github.io/Mneme-CE-World-Generator/?starId={id}&name={n}&spec={s}&x={x}&y={y}&z={z}` |
| 3D Map → 2D Map | `https://game-in-the-brain.github.io/2d-star-system-map/?starId={id}` |
| MWG → 3D Map | `https://game-in-the-brain.github.io/3d-interstellar-map/?starId={id}` |
| MWG → 2D Map | `https://game-in-the-brain.github.io/2d-star-system-map/` |
| 2D Map → MWG | `https://game-in-the-brain.github.io/Mneme-CE-World-Generator/?starId={id}` |

---

## Development Order Recommendation

1. **Start FRD-045 M1-M2** (3D map generation core) — this unlocks the most value
2. **Parallel: FRD-047 M1** (MWG batch data model) — foundational
3. **FRD-045 M3-M4** (3D map parameters + save/export)
4. **FRD-047 M2-M3** (MWG batch UI + 3D map import)
5. **FRD-046 M1-M2** (2D map save + editor) — polish layer

---

## Notes for Next Session

When the user says "start the next FDR", default to **FRD-045 Phase 1 M1** (3D Map Star Generation — Mode Toggle + Blank Canvas).

Key files to touch:
- `3d-interstellar-map/src/main.ts` — mode switching logic
- `3d-interstellar-map/src/ui.ts` — Generate tab UI
- `3d-interstellar-map/src/generator.ts` — NEW: star generation algorithm
- `3d-interstellar-map/src/types.ts` — GeneratedStar type
