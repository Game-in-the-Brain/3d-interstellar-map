# 3D Interstellar Map — Repo Analysis & Thesis

**Project:** 3D Interstellar Sector Map for Cepheus Engine  
**Repo:** `Game-in-the-Brain/3d-interstellar-map`  
**Scope:** Visualise real-world stellar data within 100 parsecs of Sol as an interactive 3D sector map.

---

## 1. Identity

| Field | Value |
|---|---|
| Renderer | Three.js (WebGL 2) |
| Build | Vite 6.x |
| Architecture | Vanilla TypeScript, no framework dependency |
| Deployment | GitHub Pages PWA |
| Data source | Gaia/astrometric catalogues (pre-processed JSON) |
| Coordinate frame | Galactic-centric, Sol at origin |

---

## 2. Thesis — Why This Architecture

After analysing four solar-system visualisers (`solar-system-3d-threejs`, `solar-system-honzaap`, `solar-system-simone`, `Solar-System-3D`), the following conclusions drive this project's design:

### 2.1 Keep It Framework-Free
`solar-system-3d-threejs` and `Solar-System-3D` prove that a single `main.ts` (or split into focused modules) is sufficient for a Three.js scene. `solar-system-honzaap` layers Vue on top, adding build complexity and GLB loading orchestration that we do not need. **The interstellar map will be plain Vite + TypeScript + Three.js.**

### 2.2 No Heavy Assets
The analysed projects rely on 25–50 MB of textures, GLBs, and audio. A sector map with thousands of stars cannot afford per-star textures. **Stars will be rendered as emissive `Points` or `SphereGeometry` with simple `MeshBasicMaterial`, sized by stellar class.** This keeps the bundle under 1 MB and load times under 2 seconds.

### 2.3 Performance-First Rendering
- **Instanced rendering** for background starfield particles.
- **LOD (Level of Detail)** via distance-based star size clamping.
- **Dynamic star count slider** so low-end devices never see more objects than their GPU can handle at 60 FPS.
- **No shadows, no post-processing bloom** (initially). If performance is "mostly green" on target devices, bloom may be added later.

### 2.4 Static Data, Not APIs
The NASA API approach in `solar-system-3d-threejs` introduces network fragility. **All star data will be baked into static JSON files** (e.g., `stars-10pc.json`, `stars-50pc.json`, `stars-100pc.json`). The app loads the JSON at runtime and filters/slices it locally.

### 2.5 PWA from Day One
`vite-plugin-pwa` will cache the JSON catalogues and the application shell. This allows the map to work offline after first load — critical for a reference tool used during tabletop RPG sessions.

---

## 3. Galactic Coordinate System

The scene uses a **right-handed coordinate system** with Sol at `(0, 0, 0)`.

| Axis | Positive Direction | Mnemonic |
|---|---|---|
| **+X** | Coreward | Toward the Galactic Centre (Sagittarius A*) |
| **−X** | Rimward | Away from the Galactic Centre |
| **+Y** | Spinward | Direction of Galactic rotation (roughly toward Cygnus) |
| **−Y** | Trailing | Anti-spinward |
| **+Z** | North Galactic Pole | Above the galactic plane |
| **−Z** | South Galactic Pole | Below the galactic plane |

All distances are stored in **parsecs** in the JSON source. The renderer applies a **logarithmic or compressed linear scale** so that 100 pc fits comfortably in the camera frustum without stars becoming invisible specks.

---

## 4. Scene Graph Structure

```
Scene
├── Camera (PerspectiveCamera, OrbitControls)
├── Renderer (WebGLRenderer, antialias, toneMapping=ACESFilmic)
│
├── BackgroundStarfield (THREE.Points, 20 000–50 000 particles)
│     └── ShaderMaterial with coreward density gradient
│
├── ConnectionLines (THREE.LineSegments, dynamic)
│     └── Lines between selected stars, coloured by distance
│
├── StarGroup (THREE.Group)
│     ├── Sol (special marker, always visible)
│     ├── O/B stars (largest spheres, blue/white)
│     ├── A/F stars (medium spheres, white/yellow-white)
│     ├── G/K stars (small spheres, yellow/orange)
│     └── M stars (tiny spheres, red-orange)
│
└── CompassGroup (THREE.Group, billboarded)
      ├── Coreward arrow (+X)
      ├── Spinward arrow (+Y)
      ├── Tailward arrow (−Y)
      └── Outward arrow (−X)
```

---

## 5. Data Model — Star

Each star in the catalogue JSON is a lightweight object:

```typescript
interface Star {
  id: string;           // HIP, Gaia DR3, or custom catalogue ID
  name: string;         // Common name ("Alpha Centauri", "Barnard's Star")
  x: number;            // pc, galactic Cartesian
  y: number;            // pc
  z: number;            // pc
  spec: string;         // Spectral class, e.g. "G2V"
  absMag: number;       // Absolute magnitude (drives rendered size)
  parallax?: number;    // mas
}
```

**Derived at runtime:**
- `distanceFromSol = sqrt(x² + y² + z²)`
- `colour` from spectral-class lookup table
- `radiusPx` or `radiusUnits` from `absMag` (brighter = larger)

---

## 6. Phased Rollout Plan

| Phase | Goal | Deliverable |
|-------|------|-------------|
| **0** | Foundation | Vite + Three.js scaffold, OrbitControls, blank scene |
| **1** | Starfield | Background particle sphere with coreward density gradient |
| **2** | Data Pipeline | Load `stars-10pc.json`, render Sol + first 20 stars |
| **3** | Visual Polish | Spectral-class colours, size scaling, compass UI |
| **4** | Selection & Lines | Raycaster selection, line drawing, distance readout |
| **5** | Scale & Performance | Star-count slider, 50 pc and 100 pc catalogues |
| **6** | PWA & Deploy | `vite-plugin-pwa`, GitHub Pages live |
| **7** | Cepheus Integration | Sector-grid overlay, jump-route highlighting, UWPs |

---

## 7. Risk Register

| Risk | Mitigation |
|---|---|
| 100 pc JSON too large (>5 MB) | Use binary Float32 arrays or split into 10/25/50/100 pc chunks |
| Frame drops with >500 stars | Implement star-count slider; default to 200 |
| Label readability at distance | Use DOM labels with world→screen projection, not canvas text |
| Mobile GPU limits | Clamp pixel ratio to 2; disable anti-aliasing on low-end |
| Astronomical data copyright | Use public-domain catalogues (Hipparcos, Yale Bright Star) |

---

## 8. References Drawn from Analysis

- **threejs repo:** Post-processing pipeline (`EffectComposer` → `UnrealBloomPass`) — deferred to Phase 6+.
- **honzaap repo:** Dual-layer rendering (`renderer.render(backgroundScene, camera)` then main scene) — adopted for compass/starfield separation.
- **simone repo:** Keplerian accuracy not needed (stars are static positions, not orbiting).
- **Solar-System-3D:** `OrbitControls` + `Raycaster` interaction pattern — directly applicable.
