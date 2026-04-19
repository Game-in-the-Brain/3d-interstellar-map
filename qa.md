# QA Issues — 3D Interstellar Map

**Project:** 3D Interstellar Sector Map  
**Repo:** `Game-in-the-Brain/3d-interstellar-map`  
**Last Updated:** 2026-04-19

---

## ★ HANDOFF INSTRUCTIONS FOR KIMI (and all AI models) ★

If you are an AI model picking up this project, **read this block first**.

### Project
3D Interstellar Map — Three.js + TypeScript + Vite PWA that visualises nearby real stars as a Cepheus Engine sector reference.  
Working directory: `/home/justin/opencode260220/3d-interstellar-map`  
Build command: `npm run build` (must pass with zero TypeScript errors).

### What NOT to change
- Sol must remain at `(0, 0, 0)`.
- Galactic orientation: +X = Coreward, +Y = Spinward, +Z = North Galactic Pole.
- Keep the build dependency-free except for Three.js and Vite tooling.

---

## Index

| # | Area | Title | Priority | Status |
|---|------|-------|----------|--------|
| [QA-001](#qa-001) | Project Setup | Repository scaffold and Vite build pipeline | 🔴 High | ✅ Closed |
| [QA-002](#qa-002) | Data | Source and validate stellar catalogue (10 pc minimum) | 🔴 High | ✅ Closed |
| [QA-003](#qa-003) | Rendering | Background starfield performance on integrated GPUs | 🟠 Medium | 📋 Open |
| [QA-004](#qa-004) | UX | Touch tap vs. drag ambiguity on mobile | 🟡 Low | ✅ Closed |
| [QA-005](#qa-005) | Performance | Browser crash guard for large star selections | 🔴 High | ✅ Closed |

---

## Bug Details

---

### QA-001

**Title:** Repository scaffold and Vite build pipeline  
**Area:** Project Setup  
**Priority:** 🔴 High  
**Status:** ✅ Closed  
**File(s):** `vite.config.ts`, `package.json`, `tsconfig.json`, `index.html`

**Description:**  
Scaffold complete. `npm install && npm run build` produces a working `dist/` folder with zero TypeScript errors.

**Acceptance Criteria:**
- [x] `vite.config.ts` with `base: '/3d-interstellar-map/'`
- [x] `index.html` entry point with canvas and UI overlays
- [x] `src/main.ts` bootstrap (scene, camera, renderer, OrbitControls)
- [x] TypeScript build passes with zero errors

---

### QA-002

**Title:** Source and validate stellar catalogue (10 pc minimum)  
**Area:** Data  
**Priority:** 🔴 High  
**Status:** ✅ Closed  
**File(s):** `public/data/stars-10pc.json`, `public/data/stars-50pc.json`, `public/data/stars-100pc.json`

**Description:**  
Stellar data sourced from HYG v4.1 and filtered to 10 / 50 / 100 parsecs. Combined size 3.35 MB (< 5 MB limit).

**Acceptance Criteria:**
- [x] 325 stars in `stars-10pc.json` (≥ 300 required)
- [x] Every entry has `id`, `name`, `x`, `y`, `z`, `spec`, `absMag`
- [x] Sol is explicitly included at `(0, 0, 0)`
- [x] Alpha Centauri (Rigil Kentaurus + Toliman), Barnard's Star, Sirius, and Proxima Centauri are present and correctly positioned

---

### QA-003

**Title:** Background starfield performance on integrated GPUs  
**Area:** Rendering  
**Priority:** 🟠 Medium  
**Status:** 📋 Open  
**File(s):** `src/starfield.ts`

**Description:**  
Drawing 20,000 background particles may cause frame drops on Intel UHD or mobile GPUs.

**Expected Behaviour:**  
Maintain ≥ 55 FPS on a 3-year-old mid-range laptop with 20,000+ particles.

**Proposed Mitigations:**
- Use `THREE.Points` with `sizeAttenuation: false` ✅
- Generate particles on a worker thread (if needed)
- Reduce default count to 10,000 on detected low-end GPUs

---

### QA-004

**Title:** Touch tap vs. drag ambiguity on mobile  
**Area:** UX  
**Priority:** 🟡 Low  
**Status:** ✅ Closed  
**File(s):** `src/main.ts`

**Description:**  
On touch devices, a short drag intended to rotate the camera may be misinterpreted as a star-selection tap.

**Expected Behaviour:**  
Only register a selection if the finger moved less than ~10 pixels between `touchstart` and `touchend`.

**Acceptance Criteria:**
- [x] Tap threshold < 10 px implemented in touch handlers

---

### QA-005

**Title:** Browser crash guard for large star selections  
**Area:** Performance  
**Priority:** 🔴 High  
**Status:** ✅ Closed  
**File(s):** `src/selection.ts`, `src/ui.ts`, `src/main.ts`

**Description:**  
Selection connects every unique pair of stars with `THREE.LineSegments`. This is O(n²). Selecting hundreds of stars generates hundreds of thousands of line segments, which freezes or crashes the browser tab.

**Example:**
- 10 stars → 45 lines (safe)
- 50 stars → 1,225 lines (lag)
- 100 stars → 4,950 lines (severe lag / GPU memory pressure)
- 1,000 stars → ~500,000 lines (tab crash)

**Implemented Guard:**
- [x] Default catalogue set to **10 pc** (smallest dataset, 325 stars max)
- [x] **Warning banner** appears in the Selection panel when ≥ 10 stars are selected:  
  "⚠️ N stars selected. Connecting lines scale quadratically and may slow down or crash your browser. Consider clearing your selection."
- [x] Warning is visible and non-blocking; user can still select more stars but is informed of the risk

---

### QA-006

**Title:** Lock-selection toggle for tablet/phone additive selection  
**Area:** UX (Mobile)  
**Priority:** 🟡 Low  
**Status:** ✅ Closed  
**File(s):** `src/selection.ts`, `src/ui.ts`, `src/main.ts`

**Description:**  
On desktop, multi-select without deselecting is done via Shift-click. On tablets and phones there is no Shift key, so users need an alternative way to build a selection set without accidentally toggling stars off.

**Implemented Solution:**
- [x] **"🔓 Unlock selection / 🔒 Lock selection"** toggle button in the Controls panel
- [x] **Unlocked mode (default):** tapping a selected star deselects it (normal toggle behaviour)
- [x] **Locked mode:** tapping any star always **adds** it to the selection; existing selections are never removed
- [x] The **Clear** button still works in both modes to remove all selections
- [x] Visual state of the button changes to indicate current mode

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-04-15 | Initial QA document — 4 open items, all spec-only |
| 1.1 | 2026-04-19 | Closed QA-001, QA-002, QA-004. Added QA-005 (selection crash guard). |
| 1.2 | 2026-04-19 | Added QA-006 (lock-selection toggle for mobile/tablet). |
