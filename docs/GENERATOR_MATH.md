# 3D Interstellar Map — Generation Math Reference

This document explains the star-generation algorithm used by the 3D Interstellar Map's **Generate** mode.

---

## 1. Density Presets — Star Count Per Roll

The **Density** control sets how many child stars each parent produces on **Pass 1**.

| Preset | Pass 1 Roll | Range | Mean |
|--------|-------------|-------|------|
| Sparse | 1D3 | 1–3 | 2.0 |
| Average | 1D6 | 1–6 | 3.5 |
| Dense | 1D6 + 2 | 3–8 | 5.5 |

> **Key point:** Density only affects **Pass 1** (the first children of the Origin star). Pass 2+ use the Square-Cube Law instead.

---

## 2. Square-Cube Law — Why Star Count Scales with Distance³

In 3D space, the volume of a sphere grows as **r³**. If each generation pass expands outward by distance multiplier **m**, the shell volume between pass N and pass N−1 is:

```
Shell Volume = (m³ − 1) × Inner Sphere Volume
```

To maintain roughly uniform stellar density, the number of stars in each shell should be proportional to that shell's volume.

### Implementation (`rollStarCount`)

| Pass | Formula | m = 2.0 | m = 1.5 | m = 1.0 | m = 0.5 |
|------|---------|---------|---------|---------|---------|
| 1 | Dice roll (see above) | — | — | — | — |
| 2 | `max(1, round(m³ − 1))` | **7** | **2** | **1** | **1** |
| 3+ | Fixed cap | **8** | **8** | **8** | **8** |

### Walkthrough (Average, m = 2.0, 3 passes)

| Pass | Parents | Children/Parent | New Stars | Cumulative |
|------|---------|-----------------|-----------|------------|
| 0 (Origin) | — | — | 1 | 1 |
| 1 | 1 | 1D6 = 4 | 4 | 5 |
| 2 | 4 | 7 | 28 | 33 |
| 3 | 28 | 8 | 224 | 257 |

> The **500-star hard cap** triggers after Pass 3, preventing browser performance issues.

---

## 3. Distance Per Pass

Each child star's distance from its parent is rolled in light years, then multiplied by the distance multiplier for deeper passes.

| Density | Distance Dice | Pass 1 | Pass 2 (m=2) | Pass 3 (m=4) |
|---------|---------------|--------|--------------|--------------|
| Sparse | 2D6 | 2–12 ly | 4–24 ly | 8–48 ly |
| Average | 3D6 | 3–18 ly | 6–36 ly | 12–72 ly |
| Dense | 4D6 | 4–24 ly | 8–48 ly | 16–96 ly |

Formula:
```
Distance = rollSum(distanceDice) × m^(pass − 1)
```

---

## 4. Recursive Sextet Protocol (Azimuth / XY Plane)

The **Recursive Sextet Protocol** determines the horizontal direction (azimuth) of each child star from its parent.

### How it works

1. Roll **d66** twice: `[primary, secondary]`
   - Each d66 is two D6 read as digits (11–66)
   - 36 possible values per roll
2. Total outcomes: **36 × 36 = 1,296**
3. Convert to azimuth degrees:
   ```
   azimuth = (index × 360) / 1296
   ```
   - Resolution: **~0.278°**
   - Uniform distribution around the full 360° circle

### Why "Recursive Sextet"?

- **Sextet** = six-sided die (D6)
- **Recursive** = nested rolls (d66 inside d66)
- Two layers provide coarse→fine resolution:
  - Layer 1 (primary): 36 broad sectors (~10° each)
  - Layer 2 (secondary): 36 subdivisions (~0.28° each)

---

## 5. Spherical Volume Bell Curve (Elevation / Z-Plane)

A single **d66** roll maps to elevation bands that are **cosine-weighted** toward the equator. This prevents the "polar clustering" problem that happens with naive uniform random elevation.

### Band Distribution

| Region | d66 Outcomes | Probability | Elevation Band |
|--------|--------------|-------------|----------------|
| North Pole | 11–12 | 5.6% | 0°–30° |
| North Mid-Lat | 13–22 | 16.7% | 31°–60° |
| North Equator | 23–36 | 27.8% | 61°–90° |
| South Equator | 41–54 | 27.8% | 91°–120° |
| South Mid-Lat | 55–64 | 16.7% | 121°–150° |
| South Pole | 65–66 | 5.6% | 151°–180° |

> After subtracting 90°, this gives elevation from **−90° to +90°** with most stars near the equatorial plane.

### Fine-Tuning

Within each band, a uniform random offset provides sub-degree resolution, simulating a GM rolling 1D20 for fine adjustment.

---

## 6. Complete Generation Example

**Settings:** Average density, Distance Multiplier = 2.0, 3 passes

### Pass 0 — Origin
```
Name:     Origin
Position: (0, 0, 0)
Spec:     rolled from 5D6 class + 5D6 grade tables
```

### Pass 1 — First Children
```
Origin rolls 1D6 = 4 children

Child 1:
  Azimuth:  d6666 → [23, 45] → 127.5°
  Elevation: d66 → 34 → +12°
  Distance:  3D6 → 11 ly
  Position:  (11 × cos(12°) × cos(127.5°), ...)

Child 2, 3, 4: similar...
```

### Pass 2 — Grandchildren
```
Each of the 4 Pass-1 parents gets 7 children
Total new stars: 28

Each child's distance from parent: 3D6 × 2 = 6–36 ly
```

### Pass 3 — Great-Grandchildren
```
Each of the 28 Pass-2 parents gets 8 children
Total new stars: 224

Each child's distance: 3D6 × 4 = 12–72 ly

→ Hard cap at 500 stars triggers here
```

### Final Count
```
1 (origin) + 4 (Pass 1) + 28 (Pass 2) + 224 (Pass 3) = 257 stars
```

---

## Summary Table

| Control | What It Affects | Formula |
|---------|-----------------|---------|
| **Density** | Pass 1 child count | 1D3 / 1D6 / 1D6+2 |
| **Distance Multiplier** | Pass N distance & Pass 2 child count | `m^(N−1)` for distance; `m³ − 1` for count |
| **Max Passes** | Generation depth | Fixed cap of 3–5 |
| **d6666** | Azimuth (XY direction) | 1,296 outcomes → 0.278° resolution |
| **d66 + Bell Curve** | Elevation (Z direction) | Cosine-weighted toward equator |
