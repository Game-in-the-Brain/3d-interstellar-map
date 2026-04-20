# Master Implementation Queue

**Date:** 2026-04-20  
**Status:** FRD-044 ✅ | FRD-045 ✅ | FRD-047 M1-M2 ✅ | FRD-047 M3 / FRD-046 Queued

---

## Completed

| FRD | Project | Feature | Status |
|---|---|---|---|
| FRD-044 | 3D Map + MWG | Bidirectional star↔system integration | ✅ v0.1.2 / main |
| FRD-045 | 3D Map | Star Generation Mode (M1-M4) | ✅ v0.2.0 / main |
| FRD-047 M1 | MWG | Batch data model + migration | ✅ v1.4.0 / main |
| FRD-047 M2 | MWG | Systems View UI | ✅ v1.4.0 / main |

---

## Phase 1: 3D Starmap Star Generation (FRD-045)

**Project:** `3d-interstellar-map`  
**Version:** 0.2.0 ✅ **COMPLETE**

### Milestones

1. **M1: Mode Toggle** ✅
2. **M2: Star Generation Core** ✅
3. **M3: Parameters & Tables** ✅
4. **M4: Save/Load/Export** ✅

### Post-Completion QA
- **QA-006:** Recursive Sextet Protocol (`d6666` for XY azimuth) ✅
- **QA-007:** Square-Cube Law scaling + Z-plane bell curve ✅

---

## Phase 2: MWG Batch Management (FRD-047)

**Project:** `Mneme-CE-World-Generator`  
**Target Version:** 1.4.0  
**Priority:** P1  
**Estimated Effort:** 3 sessions (2 complete, 1 remaining)

### Milestones

1. **M1: Data Model + Migration** ✅
   - `StarSystemBatch` type, `batchId` on `StarSystem`
   - IndexedDB v2 migration (legacy systems → "Legacy Systems" batch)
   - Batch CRUD functions

2. **M2: Systems View UI** ✅
   - Systems tab in navigation
   - Batch selector, create/rename/delete
   - System list within batch
   - Active batch tracking
   - Export batch to `.mneme-batch`

3. **M3: Import/Export + 3D Map Flow** 📋 In Progress
   - Progress UI for batch generation
   - "Export to 3D Map" button (batch → `.mneme-map`)
   - Import `.mneme-batch` files
   - Dashboard "Recent Batches" section

---

## Phase 3: 2D Map Star Page Save (FRD-046)

**Project:** `2d-star-system-map`  
**Target Version:** 0.3.0  
**Priority:** P2  
**Estimated Effort:** 2–3 sessions

### Milestones

1. **M1: Save Page + Storage** (1 session)
2. **M2: MWG Editor Tab** (1–2 sessions)

---

## Cross-Cutting Concerns

### Shared Storage Contract

```
localStorage:
  mneme-2dmap-{starId}     → HTML string (2D map page)
  mneme-theme              → 'dark' | 'day' | 'phone'
  mneme-debug-mode         → 'true' | 'false'
  mneme-active-batch-id    → active batch UUID (MWG)

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

1. **FRD-045 M1-M4** ✅ (3D map generation) — COMPLETE
2. **FRD-047 M1-M2** ✅ (MWG batch model + UI) — COMPLETE
3. **FRD-047 M3** 📋 (MWG batch import/export polish) — NEXT
4. **FRD-046 M1-M2** 📋 (2D map save + editor) — queued

---

## Notes for Next Session

When the user says "start the next task", default to **FRD-047 M3** (MWG Batch Import/Export + 3D Map Flow).

Key files to touch:
- `Mneme-CE-World-Generator/src/components/SystemsView.tsx` — progress UI, export to 3D Map
- `Mneme-CE-World-Generator/src/App.tsx` — dashboard recent batches
- `Mneme-CE-World-Generator/src/lib/db.ts` — import `.mneme-batch`
