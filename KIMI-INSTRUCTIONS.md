# Instructions for Kimi — 3D Interstellar Map Execution

**You are picking up this project.** Read this file top to bottom before writing any code. Then read `CONSOLIDATED.md` for the full spec.

**Working directory:** `/home/justin/opencode260220/3d-interstellar-map`
**Build command:** `npm run build` (must exit zero with no TypeScript errors)
**Primary spec:** `CONSOLIDATED.md`

---

## 1. State of the World

- Repo currently contains only planning docs + LICENSE + README. **No code, no `package.json`, no `tsconfig.json`, no `vite.config.ts` exist yet.**
- `.git` exists but nothing is committed besides the docs.
- README points upstream to `https://github.com/Game-in-the-Brain/2d-star-system-map` — that is a *related* project, not a dependency. Do not pull from it.
- Two-track documentation was consolidated on 2026-04-18. Only Track A (standalone Three.js PWA) is active. If you see references to Dexie, MWG JSON, React, or Tailwind v4 in git history, those belong to the removed Track B and are not your target.

---

## 2. Invariants You Must Not Break

1. **Sol stays at `(0, 0, 0)`.** Always.
2. **Galactic axes:** `+X = Coreward, +Y = Spinward, +Z = NGP`. Right-handed.
3. **Dependencies:** Three.js + Vite tooling only. No React, no Vue, no Dexie, no shadcn, no Tailwind v4. (Plain CSS or Tailwind v3 for utility classes is fine — pick one.)
4. **No network at runtime** after first load. Everything ships in the bundle or the service worker cache.
5. **TypeScript strict.** `"strict": true, "noUnusedLocals": true, "noUnusedParameters": true`.
6. **`npm run build` must pass with zero errors.** Non-negotiable.

---

## 3. Execution Order

Follow the phases from `CONSOLIDATED.md §12`. Complete each phase fully before moving to the next — don't scaffold everything half-built.

### Phase 0 — Foundation (resolves QA-001)
1. `npm init -y`, add Three.js + Vite + TypeScript dev deps.
2. `tsconfig.json` with strict settings above. Target `ES2022`, module `ESNext`.
3. `vite.config.ts` with `base: '/3d-interstellar-map/'`.
4. `index.html` with a single `<canvas id="app">` and a slot for UI overlays.
5. `src/main.ts`: create `Scene`, `PerspectiveCamera`, `WebGLRenderer` (antialias, ACESFilmic tone-mapping), `OrbitControls`. Render a blank scene at 60 fps.
6. `npm run build` must succeed.

**Exit gate:** blank scene loads in the browser with orbit-rotate-zoom working.

### Phase 1 — Starfield (FR-003)
1. `src/starfield.ts`: `THREE.Points` sphere, 20 000 particles (configurable constant), density `∝ e^(k·x)` biased coreward.
2. `sizeAttenuation: false`. Deterministic re-seed on resize (use a seeded PRNG, e.g. mulberry32, seeded from canvas dimensions).
3. Use a single buffer geometry; do not recreate on every frame.

**Exit gate:** visible starfield, visibly denser toward +X.

### Phase 2 — Data Pipeline (FR-001, FR-007 partial — resolves QA-002 for 10 pc only)
1. Define `interface Star` in `src/types.ts` matching `CONSOLIDATED.md §6`.
2. Source a 10 pc catalogue. **Prefer the HYG v3.x database** (David Nash, CC BY-SA 2.5 — include attribution in README). Filter to `dist ≤ 10 pc`, keep ≥ 300 stars.
3. Convert RA/Dec/parallax → galactic Cartesian XYZ in parsecs. Sol at `(0, 0, 0)`. Write `data/stars-10pc.json`.
4. **Verify by hand:** Sol present at origin; α Cen ≈ (−1.35, ?, ?) pc; Barnard, Sirius, Proxima present and within ≤ 10 pc. Fail the build if any of those five stars are missing.
5. `src/coordinateUtils.ts`: `pcToScene(pc: number)` and inverse. Settle the conversion factor now (suggest 1 pc = 1 scene unit, with camera zoom handling the rest).
6. Load the catalogue at startup, render Sol as emissive yellow crosshair + first 20 stars as plain white spheres (colours come next phase).

**Exit gate:** Sol + 20 nearest stars visible, positions plausibly match reality.

### Phase 3 — Visual Polish (FR-002, FR-004)
1. `SPECTRAL_COLOURS` lookup from spec §4 FR-002. Unknown class → grey (`#888888`), don't throw.
2. `absMagToRadius(absMag)`: brighter (lower absMag) = larger radius. Map absMag range [−8, +16] → radius [2.0, 0.3] linearly, clamp at ends.
3. Apply colours + radii to all loaded stars. Sol stays as the special crosshair marker.
4. `src/compass.ts`: four SVG or billboarded arrows in a screen corner (bottom-right default). They must rotate so they always point to true galactic directions regardless of camera yaw/pitch. Colours: Coreward red, Spinward cyan, Tailward magenta, Outward yellow (or your choice — document it).

**Exit gate:** stars clearly colour-coded; compass rotates correctly under orbit controls.

### Phase 4 — Selection & Lines (FR-005)
1. `src/selection.ts`: `Raycaster` on `click` / `touchend`. Maintain `selectedStarIds: Set<string>`.
2. Click a star → add to selection; click again → remove. Shift-click = multi-select without deselecting (optional, test UX).
3. `THREE.LineSegments` group rebuilt whenever selection changes. One segment per pair `(i, j)` where `i < j`.
4. UI panel shows pairwise distances. Toggle button pc ↔ ly (constant `1 pc = 3.26156 ly`).
5. Escape key and an explicit "Clear" button both deselect all.

**Exit gate:** select any two stars → line + distance label appear, both correct.

### Phase 5 — Scale & Perf (FR-006, FR-007 full)
1. Slider UI: range `10 → catalogue.length`, default 200. Sort catalogue by `distanceFromSol` once, then slice.
2. Rebuild `StarGroup` on slider change (dispose old geometries/materials to avoid GPU leaks — `geometry.dispose(); material.dispose();`).
3. FPS meter: green ≥ 55, yellow 30–54, red < 30. Show in a corner.
4. If FPS stays green for 5 s AND slider < max, show a non-intrusive suggestion ("You can render more stars").
5. Generate `stars-50pc.json` and `stars-100pc.json` via the same HYG pipeline. Verify combined size < 5 MB.
6. Catalogue selector UI (10 / 50 / 100 pc).

**Exit gate:** 200-star slider stays green on a mid-range laptop; all three catalogues switch cleanly.

### Phase 6 — PWA & Deploy (FR-008)
1. Add `vite-plugin-pwa` with `registerType: 'autoUpdate'`.
2. Precache the three JSON catalogues (add them to `globPatterns` or equivalent).
3. Verify in DevTools → Application: Service Worker active, three JSONs in Cache Storage.
4. Offline test: disable network, hard-reload — app must still load and function.
5. GitHub Pages deploy: `base: '/3d-interstellar-map/'` confirmed. Add a `deploy` workflow or document manual steps in README.

**Exit gate:** app works fully offline after one online load.

### Phase 7 — Cepheus Hooks (optional, FR-010)
Only after Phases 0–6 are shipped. Hex-grid overlay, jump-route bands (1–6 pc), UWP import. Treat as separate PRs.

---

## 4. Parallel Track: Mobile & Touch (FR-009, QA-004)

Weave these in as you build each phase — don't save for the end:

- Phase 0: set `touch-action: none` on the canvas.
- Phase 4: tap vs drag disambiguation — record `touchstart` position, only register a selection click if `touchend` is within 10 px.
- All UI controls: minimum 44 × 44 px touch target. Use CSS `min-width` / `min-height`, not just padding.
- Clamp `renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))`.

---

## 5. File Layout (Suggested — Adjust if You See Better)

```
3d-interstellar-map/
├── CONSOLIDATED.md           ← spec (don't edit during implementation)
├── KIMI-INSTRUCTIONS.md      ← this file
├── frd.md, qa.md, repoanalysis.md  ← source docs, leave alone
├── README.md                 ← update with deploy steps when Phase 6 lands
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── data/
│   ├── stars-10pc.json
│   ├── stars-50pc.json
│   └── stars-100pc.json
├── scripts/
│   └── build-catalogue.ts    ← HYG → JSON pipeline; runnable with tsx
├── src/
│   ├── main.ts               ← entry; scene/camera/renderer/loop
│   ├── types.ts              ← Star interface
│   ├── coordinateUtils.ts    ← pc ↔ scene conversions
│   ├── spectral.ts           ← SPECTRAL_COLOURS, absMagToRadius
│   ├── starfield.ts          ← background particle sphere
│   ├── stars.ts              ← StarGroup builder
│   ├── selection.ts          ← raycaster, selection state, connection lines
│   ├── compass.ts            ← galactic compass overlay
│   ├── ui.ts                 ← slider, FPS meter, catalogue selector, unit toggle
│   └── pwa.ts                ← service worker registration helper (if needed)
└── public/
    └── (icons, manifest if vite-plugin-pwa doesn't generate them)
```

---

## 6. Commit Hygiene

- One commit per phase exit gate (or finer). Don't bundle Phase 2 + Phase 3 into a single blob.
- Commit message format: `phase N: <what>` — e.g. `phase 2: load 10pc catalogue and render 20 nearest stars`.
- Don't commit `dist/` or `node_modules/` (add `.gitignore` in Phase 0).
- Don't commit half-broken builds. If `npm run build` fails, fix it before committing.

---

## 7. Definition of Done (Ship Criteria)

All seven must be true:

1. `npm install && npm run build` succeeds with zero TypeScript errors from a clean clone.
2. All seven Acceptance Criteria in `CONSOLIDATED.md §7` pass manually.
3. Offline mode verified in Chrome DevTools → Application.
4. Three catalogues ship; combined size < 5 MB.
5. 200-star default renders at ≥ 55 FPS on a mid-range laptop.
6. Compass rotation is visually correct from all camera angles.
7. All four QA items (QA-001 … QA-004) closed — specifically: tap vs drag (<10 px), 10 pc catalogue contains Sol + α Cen + Barnard + Sirius + Proxima.

---

## 8. When Stuck

- **Spec ambiguity:** `CONSOLIDATED.md` wins over `frd.md`/`qa.md`/`repoanalysis.md`. If `CONSOLIDATED.md` is silent, default to the simplest thing that satisfies the FR.
- **HYG catalogue format:** columns include `hip`, `proper`, `bf`, `ra`, `dec`, `dist`, `rv`, `mag`, `absmag`, `spect`, `x`, `y`, `z` — the `x/y/z` fields are already galactic Cartesian in parsecs with Sol at origin. Verify this before writing a conversion pipeline; you may not need one.
- **Perf regressions:** first suspect is forgetting to `.dispose()` old geometries/materials when rebuilding `StarGroup`.
- **Three.js version drift:** pin to a specific r0.177+ minor in `package.json` so builds are reproducible.
- **Don't invent features.** If something isn't in `CONSOLIDATED.md §4` or §7, it is out of scope. Future work goes into issues, not into this codebase.

---

## 9. Quick Reference

| Constant | Value |
|----------|-------|
| `1 pc → ly` | × 3.26156 |
| Sol spectral | `G2V` |
| Default star count | 200 |
| FPS thresholds | green ≥ 55, yellow 30–54, red < 30 |
| Touch tap threshold | < 10 px between touchstart and touchend |
| DPR clamp | `Math.min(window.devicePixelRatio, 2)` |
| GitHub Pages base | `/3d-interstellar-map/` |
| Particle count range | 20 000 – 50 000 |

Go.
