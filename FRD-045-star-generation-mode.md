# FRD-045: Star Generation Mode

**Project:** 3D Interstellar Map  
**Version Target:** 0.2.0  
**Priority:** P0 — Next major feature  
**Depends On:** FRD-044 (MWG bidirectional integration) — ✅ COMPLETE

---

## 1. Overview

Add a **Generate Star** mode to the 3D Interstellar Map. Switching to this mode replaces the HYG catalogue view with a **blank procedural starmap** generated from a single origin star using dice rolls identical to MWG's star generation pipeline.

GMs and worldbuilders can create custom sectors, share them as portable map bundles, and attach MWG-generated system data to any star.

---

## 2. User Story

> As a GM, I want to generate a custom sector from scratch so that I can build a consistent campaign setting with procedurally placed stars whose stats I control.

---

## 3. UI: New "Generate" Tab in Controls Panel

```
┌─ Controls ───────────────────────┐
│ Catalogue  [10pc ▼]              │
│ Render     [Points ▼]            │
│ ...                              │
│ ┌─────────────────────────────┐  │
│ │ ⭐ Generate  │  📂 HYG Mode  │  │  ← Toggle between modes
│ └─────────────────────────────┘  │
└──────────────────────────────────┘
```

When **Generate** is active, the canvas clears and a setup panel appears:

### 3.1 Generation Parameters Panel

| Parameter | Control | Default |
|---|---|---|
| **Density** | Dropdown: Sparse / Average / Dense / Custom | Average |
| **First pass stars** | Slider 1D3–1D6 (or fixed 1–6) | 1D3 |
| **First pass distance** | Slider 2D6–4D6 ly | 2D6 |
| **Next pass distance multiplier** | Slider ×1.5 / ×2 / ×2.5 / ×3 | ×2 |
| **Next pass stars multiplier** | Slider ×1 / ×1.5 / ×2 | ×1 |
| **Max passes** | Slider 1–5 | 3 |
| **Star Class Table** | Editable 5D6 → O/B/A/F/G/K/M | MWG default |
| **Star Grade Table** | Editable 5D6 → 0–9 | MWG default |

**Density presets affect:**
- Sparse: 1D3 stars/pass, 2D6 ly, ×2 distance
- Average: 1D6 stars/pass, 3D6 ly, ×2 distance
- Dense: 1D6+2 stars/pass, 4D6 ly, ×1.5 distance

### 3.2 Star Generation Table (Editable)

A collapsible panel showing the 5D6 → class/grade lookup. User can click any cell to change the mapping. Changes are saved with the map.

```
Class from 5D6          Grade from 5D6
30+  → O                0–17  → 9
28+  → B                18–20 → 8
26+  → A                21–22 → 7
24+  → F                23–24 → 6
22+  → G                25    → 5
20+  → K                26    → 4
<20  → M                27    → 3
                        28    → 2
                        29    → 1
                        30    → 0
```

---

## 4. Generation Algorithm

### 4.1 Pass 0 — Origin Star

1. Roll 5D6 for **class** → look up in class table
2. Roll 5D6 for **grade** → look up in grade table
3. Place at origin `(0, 0, 0)`
4. Name: "Origin" or user-editable

### 4.2 Pass N — Child Stars

For each star generated in the previous pass:

1. Roll **star count** for this pass (e.g., 1D3)
2. For each child:
   a. Roll **d6666** → map to 360° XY azimuth (~0.278° resolution)
   b. Roll **d66** → consult Spherical Volume Bell Curve table for Z elevation (cosine-weighted toward equator)
   c. Roll **distance** in light years (e.g., 2D6)
   d. Convert spherical → cartesian:
      ```
      x = parent.x + dist * cos(z) * cos(xy)
      y = parent.y + dist * cos(z) * sin(xy)
      z = parent.z + dist * sin(z)
      ```
   e. Roll 5D6 for class, 5D6 for grade
   f. Name: auto-generated (e.g., "Origin-A", "Origin-A-1")

3. After all children placed, **next pass** uses:
   - Distance roll × multiplier (cumulative)
   - Star count roll × multiplier (cumulative)

### 4.3 Example: 3 Passes, Average Density

```
Pass 0: Origin (G2) @ (0,0,0)
Pass 1: 1D6=4 stars, 3D6 ly from Origin
  → Alpha (M5) @ (4.2, -1.1, 0.8)
  → Beta  (K3) @ (-2.5, 3.7, -0.2)
  → Gamma (F7) @ (0.1, -4.5, 1.2)
  → Delta (G1) @ (3.3, 2.8, -0.5)
Pass 2: 1D6=3 stars each parent, 3D6×2=6D6 ly
  → Alpha-A (M8) @ (9.1, 2.4, 1.5)  ← from Alpha
  → Alpha-B (K2) @ (7.8, -3.1, 2.2)
  → Alpha-C (G4) @ (11.2, 0.5, -0.8)
  → ... (etc)
Pass 3: 1D6×2=6 stars each parent, 6D6×2=12D6 ly
  → ...
```

---

## 5. Data Model: GeneratedStar

```typescript
interface GeneratedStar extends Star {
  /** Generation pass number (0 = origin) */
  pass: number;
  /** Parent star ID (null for origin) */
  parentId: string | null;
  /** Dice rolls that created this star (for reproducibility) */
  rolls: {
    classRoll: number;
    gradeRoll: number;
    xyRoll: number;      // d66
    zRoll: number;       // d66
    distanceRoll: number;
  };
  /** Distance from parent in light years */
  distanceFromParent: number;
  /** Whether this star has an attached MWG system */
  hasMwgSystem: boolean;
  /** MWG system data (if loaded/imported) */
  mwgSystem?: Record<string, unknown>;
}
```

---

## 6. Save / Load / Import / Export

### 6.1 MapState Extension

```typescript
interface MapState {
  // ... existing fields ...
  
  /** Generation mode state */
  generationMode?: {
    active: boolean;
    originStar: GeneratedStar;
    allStars: GeneratedStar[];
    parameters: GenerationParameters;
    classTable: Record<number, StellarClass>;
    gradeTable: Record<number, StellarGrade>;
  };
}
```

### 6.2 Export Format

**`.mneme-map` file** (JSON with metadata):

```json
{
  "mnemeFormat": "starmap-v1",
  "name": "My Custom Sector",
  "version": "0.2.0",
  "exportedAt": "2026-04-19T...",
  "parameters": { /* generation settings */ },
  "classTable": { "30": "O", "28": "B", ... },
  "gradeTable": { "0": "9", "17": "9", ... },
  "stars": [ /* GeneratedStar[] */ ],
  "mwgSystems": {
    "star-id-1": { /* MWG system */ },
    "star-id-2": { /* MWG system */ }
  }
}
```

### 6.3 Saved 2D Map Pages

When exporting, if stars have 2D map HTML pages saved locally, include them in the export bundle as a ZIP:

```
my-sector.mneme.zip
├── starmap.json
├── stars/
│   ├── sol.html          (2D map page)
│   ├── alpha-centauri.html
│   └── ...
└── mwg/
    ├── sol.json
    └── ...
```

---

## 7. Context Menu: Load MWG JSON

When right-clicking / double-clicking a generated star:

1. If star has **no MWG data**: show "Generate MWG System" button → opens MWG in new tab with star params
2. If star **has MWG data**: show "View MWG System" button → opens MWG system viewer
3. Show "Load MWG JSON..." → file picker to attach an existing MWG export

### 7.1 System Stats View (Back Button)

The context panel gets a **System Stats** sub-view:

```
┌─ Star Details ───────────────────┐
│ ← Back to list                   │
│                                  │
│ Star: Alpha (M5V)                │
│ Distance from parent: 4.2 ly     │
│ Pass: 1                          │
│                                  │
│ [🪐 Open MWG]  [🗺️ Open 2D Map]  │
│ [📂 Load MWG JSON]               │
│                                  │
│ MWG Stats (if attached):         │
│   World Type: Terrestrial        │
│   Habitability: 3                │
│   Population: 1.2M               │
│   Starport: C                    │
│   Travel Zone: Green             │
└──────────────────────────────────┘
```

Clicking "Open 2D Map" opens the **saved HTML page** for this star in a new tab.

---

## 8. Local Storage: Saved 2D Map Pages

The 3D map stores 2D map HTML pages in **IndexedDB** (or localStorage fallback):

```typescript
// Key: `2dmap-${starId}`
// Value: HTML string of the 2D map page for this star
```

When a user saves a 2D map page from the 2D map viewer, it syncs to the 3D map's storage.

---

## 9. Open Questions / Decisions

| Question | Default Decision |
|---|---|
| d6666 → 360° mapping | Recursive Sextet Protocol: two nested d66 rolls for XY azimuth. Primary d66 selects broad cone (36 sectors), secondary d66 selects sub-direction (36 subdivisions). Total 1,296 outcomes. See `RECURSIVE_SEXTET_PROTOCOL.md`. |
| Z-elevation bell curve | d66 mapped to 6 cosine-weighted bands (pole→mid→equator). Prevents polar clustering by assigning more outcomes to equatorial regions. |
| Name generation | Origin → Origin-A → Origin-A-1. User can rename any star. |
| Max stars hard limit | 500 stars (performance guard). |
| Regenerate single star | Allowed; re-rolls class/grade only, keeps position. |
| Coordinate units | Light-years (consistent with 2D map). |

---

## 10. Acceptance Criteria

- [x] Toggle between HYG mode and Generate mode
- [x] Generate mode shows blank canvas with origin star
- [x] Parameter panel: density, pass count, distance, multipliers
- [x] Editable class/grade tables
- [x] Algorithm produces stars in passes with correct dice rolls
- [x] Stars are named hierarchically
- [x] Generated stars can be selected, lines drawn between them
- [x] Context panel shows generation stats (pass, parent, distance)
- [x] Can attach MWG system to any star
- [x] Can save/load/import/export generated maps
- [x] Export includes MWG data if present
- [ ] Context panel can open saved 2D map HTML in new tab *(deferred to FRD-046)*
- [x] Build passes zero TypeScript errors

---

## 11. Related FRDs

- FRD-044 (MWG Bidirectional Integration) — ✅ DONE
- FRD-046 (2D Map Star Page Save) — QUEUED
- FRD-047 (MWG Batch Management) — QUEUED
