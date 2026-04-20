# Recursive Sextet Protocol (RSP)

**Alias:** Nested Sextet Addressing (NSA)  
**Project:** 3D Interstellar Map  
**Applies to:** Spherical coordinate generation for procedural star placement  
**Version:** 0.2.0+

---

## 1. Motivation

A single `d66` provides only 36 discrete outcomes. When mapping a `d66` roll to a 360° circle, each outcome represents a **10° sector** — coarse enough that sibling stars in the same pass often cluster in visually obvious wedges. For elevation (-90° to +90°), the resolution is even worse (~5° per outcome).

The Recursive Sextet Protocol compounds two `d66` rolls per axis, yielding **1,296 outcomes** (36²). This raises angular resolution to:

| Axis | Span | d66 resolution | d6666 resolution |
|---|---|---|---|
| XY azimuth | 360° | 10° | ~0.278° |
| Z elevation | 180° | ~5.14° | ~0.139° |

The result is a much more natural scatter of stars across the sphere — no visible clustering, no "grid lines."

---

## 2. Mathematical Structure

A `d6666` is not a single four-digit number. It is a **two-layer address**:

```
d6666 = [primary_d66, secondary_d66]
```

Each layer is an independent `d66` (two D6 read as digits, 11–66).

### Flat Index

To convert to a single linear index (0–1295):

```
primary   = d66ToIndex(d66_1)   // 0–35
secondary = d66ToIndex(d66_2)   // 0–35
flatIndex = primary × 36 + secondary   // 0–1295
```

### Outcome Space

| Depth | Notation | Outcomes | Formula |
|---|---|---|---|
| 1 | `d66` | 36 | 36¹ |
| 2 | `d6666` | 1,296 | 36² |
| 3 | `d666666` | 46,656 | 36³ |

The 3D Interstellar Map uses **depth 2** (`d6666`) for both XY azimuth and Z elevation.

---

## 3. Conversion Formulas

### Azimuth (XY plane, 0°–360°)

```typescript
function d6666ToDegrees(d6666: [number, number]): number {
  const index = d6666ToIndex(d6666);   // 0–1295
  return (index * 360) / 1296;          // 0–359.722...
}
```

Step size: `360 / 1296 = 0.277...°`

### Elevation (Z axis, -90° to +90°)

```typescript
function d6666ToElevation(d6666: [number, number]): number {
  const index = d6666ToIndex(d6666);   // 0–1295
  return (index * 180) / 1296 - 90;     // -90 to +89.861...
}
```

Step size: `180 / 1296 = 0.138...°`

---

## 4. Implementation

### Dice Module (`src/dice.ts`)

```typescript
export function rollD6666(): [number, number] {
  return [rollD66(), rollD66()];
}

export function d6666ToIndex(d6666: [number, number]): number {
  const primary   = d66ToIndex(d6666[0]);   // 0–35
  const secondary = d66ToIndex(d6666[1]);   // 0–35
  return primary * 36 + secondary;          // 0–1295
}

export function d6666ToDegrees(d6666: [number, number]): number {
  return (d6666ToIndex(d6666) * 360) / 1296;
}

export function d6666ToElevation(d6666: [number, number]): number {
  return (d6666ToIndex(d6666) * 180) / 1296 - 90;
}
```

### Generator Module (`src/generator.ts`)

Per star, per pass:

```typescript
const xyRoll = rollD6666();        // [11–66, 11–66]
const zRoll  = rollD6666();        // [11–66, 11–66]
const azimuth    = d6666ToDegrees(xyRoll);     // 0–360°
const elevation  = d6666ToElevation(zRoll);    // -90° to +90°
const offset = sphericalToCartesian(azimuth, elevation, distanceRoll);
```

The rolls are stored on `GeneratedStar` as tuples for reproducibility:

```typescript
rolls: {
  classRoll: number;
  gradeRoll: number;
  xyRoll: [number, number];   // d6666
  zRoll: [number, number];    // d6666
  distanceRoll: number;
}
```

---

## 5. Tree / Pathfinding Analogy

Think of the sphere surface as a tree:

- **Layer 1 (primary d66):** Chooses one of 36 broad cones radiating from the parent star.
- **Layer 2 (secondary d66):** Chooses one of 36 sub-directions within that cone.

```
Parent Star
    │
    ├── Cone 0  (primary = 11)
    │   ├── Sub-direction 0   → azimuth 0.000°, elevation -90.000°
    │   ├── Sub-direction 1   → azimuth 0.000°, elevation -89.861°
    │   └── ...
    ├── Cone 1  (primary = 12)
    │   ├── Sub-direction 0
    │   └── ...
    └── ...
```

This is the RPG equivalent of a **vector image** — the more layers you add, the more detail emerges, but the first layer always anchors the result.

---

## 6. Comparison: Before vs After

| Property | d66 (old) | d6666 (RSP) |
|---|---|---|
| XY outcomes | 36 | 1,296 |
| XY step | 10° | ~0.278° |
| Z outcomes | 36 | 1,296 |
| Z step | ~5.14° | ~0.139° |
| Visual clustering | Noticeable wedges | Uniform scatter |
| Dice per star | 2 | 4 |
| Roll notation | `d66` + `d66` | `d6666` + `d6666` |

---

## 7. Future Extensions

- **Depth 3 (`d666666`):** 46,656 outcomes per axis. Overkill for stellar distances but useful for intra-system body placement (moon orbits, Lagrange points).
- **Lazy loading:** Only roll secondary `d66` when the player "zooms in" on a specific sector.
- **Hybrid mode:** Use `d66` for distant passes (low detail) and `d6666` for near passes (high detail).

---

## 8. Files Affected

| File | Change |
|---|---|
| `src/dice.ts` | Added `rollD6666`, `d6666ToIndex`, `d6666ToDegrees`, `d6666ToElevation` |
| `src/generator.ts` | Uses `rollD6666` for `xyRoll` and `zRoll`; stores tuples on `GeneratedStar` |
| `src/types.ts` | `xyRoll` and `zRoll` typed as `[number, number]` |
| `src/main.ts` | Context panel displays tuples natively via `JSON.stringify` |

---

**Related:** FRD-045 Star Generation Mode, §4.2 Generation Algorithm
