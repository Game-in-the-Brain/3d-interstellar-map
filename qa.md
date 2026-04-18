# QA Issues — 3D Interstellar Map

**Project:** 3D Interstellar Sector Map  
**Repo:** `Game-in-the-Brain/3d-interstellar-map`  
**Last Updated:** 2026-04-15

---

## ★ HANDOFF INSTRUCTIONS FOR KIMI (and all AI models) ★

If you are an AI model picking up this project, **read this block first**.

### Project
3D Interstellar Map — Three.js + TypeScript + Vite PWA that visualises nearby real stars as a Cepheus Engine sector reference.  
Working directory: `/home/justin/opencode260220/3d-interstellar-map`  
Build command: `npm run build` (must pass with zero TypeScript errors).

### Current Open Items

| # | Status | Notes |
|---|--------|-------|
| FR-001 | 📋 Spec | Galactic coordinate frame — Sol at origin |
| FR-002 | 📋 Spec | Spectral-class colour/size rendering |
| FR-003 | 📋 Spec | Background starfield with coreward density |
| FR-004 | 📋 Spec | Persistent galactic compass |
| FR-005 | 📋 Spec | Star selection & distance lines |
| FR-006 | 📋 Spec | Star-count slider & FPS guard |
| FR-007 | 📋 Spec | Static star catalogues (10/50/100 pc) |
| FR-008 | 📋 Spec | PWA deployment to GitHub Pages |

### What NOT to change
- Sol must remain at `(0, 0, 0)`.
- Galactic orientation: +X = Coreward, +Y = Spinward, +Z = North Galactic Pole.
- Keep the build dependency-free except for Three.js and Vite tooling.

---

## Index

| # | Area | Title | Priority | Status |
|---|------|-------|----------|--------|
| [QA-001](#qa-001) | Project Setup | Repository scaffold and Vite build pipeline | 🔴 High | 📋 Open |
| [QA-002](#qa-002) | Data | Source and validate stellar catalogue (10 pc minimum) | 🔴 High | 📋 Open |
| [QA-003](#qa-003) | Rendering | Background starfield performance on integrated GPUs | 🟠 Medium | 📋 Open |
| [QA-004](#qa-004) | UX | Touch tap vs. drag ambiguity on mobile | 🟡 Low | 📋 Open |

---

## Bug Details

---

### QA-001

**Title:** Repository scaffold and Vite build pipeline  
**Area:** Project Setup  
**Priority:** 🔴 High  
**Status:** 📋 Open  
**File(s):** `vite.config.ts`, `package.json`, `tsconfig.json`, `index.html`

**Description:**  
The repo currently contains only planning documents (`repoanalysis.md`, `frd.md`, `qa.md`). No code or build configuration exists yet.

**Expected Behaviour:**  
`npm install && npm run build` should produce a working `dist/` folder.

**Acceptance Criteria:**
- [ ] `vite.config.ts` with `base: '/3d-interstellar-map/'`
- [ ] `index.html` entry point with canvas and minimal UI
- [ ] `src/main.ts` bootstrap (scene, camera, renderer, OrbitControls)
- [ ] TypeScript build passes with zero errors

---

### QA-002

**Title:** Source and validate stellar catalogue (10 pc minimum)  
**Area:** Data  
**Priority:** 🔴 High  
**Status:** 📋 Open  
**File(s):** `data/stars-10pc.json`

**Description:**  
No stellar data has been sourced yet. The app cannot render stars without a validated catalogue.

**Expected Behaviour:**  
A JSON file containing all known stars within 10 parsecs of Sol, with accurate galactic Cartesian coordinates and spectral classes.

**Recommended Sources:**
- RECONS "The 10 Parsec Sample" (public domain astrometry)
- Gaia DR3 cross-matched with Simbad for spectral types
- Yale Bright Star Catalogue (for named stars)

**Acceptance Criteria:**
- [ ] At least 300 stars in `stars-10pc.json`
- [ ] Every entry has `id`, `name`, `x`, `y`, `z`, `spec`, `absMag`
- [ ] Sol is explicitly included at `(0, 0, 0)`
- [ ] Alpha Centauri, Barnard's Star, Sirius, and Proxima Centauri are present and correctly positioned

---

### QA-003

**Title:** Background starfield performance on integrated GPUs  
**Area:** Rendering  
**Priority:** 🟠 Medium  
**Status:** 📋 Open  
**File(s):** `src/starfield.ts` (future)

**Description:**  
Drawing 50,000 background particles with a density gradient shader may cause frame drops on Intel UHD or mobile GPUs.

**Expected Behaviour:**  
Maintain ≥ 55 FPS on a 3-year-old mid-range laptop with 20,000+ particles.

**Proposed Mitigations:**
- Use `THREE.Points` with `sizeAttenuation: false`
- Generate particles on a worker thread (if needed)
- Reduce default count to 10,000 on detected low-end GPUs

---

### QA-004

**Title:** Touch tap vs. drag ambiguity on mobile  
**Area:** UX  
**Priority:** 🟡 Low  
**Status:** 📋 Open  
**File(s):** `src/input.ts` (future)

**Description:**  
On touch devices, a short drag intended to rotate the camera may be misinterpreted as a star-selection tap.

**Expected Behaviour:**  
Only register a selection if the finger moved less than ~10 pixels between `touchstart` and `touchend`.

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-04-15 | Initial QA document — 4 open items, all spec-only |
