# 3D Interstellar Map

A lightweight, offline-capable 3D star map showing Sol and nearby real stars out to 100 parsecs. Built with Three.js + TypeScript + Vite as a Progressive Web App.

**Live URL:** `https://game-in-the-brain.github.io/3d-interstellar-map/`

---

## Features

- **Real star data** — HYG v4.1 catalogue: 325 stars within 10 pc, 8,750 within 50 pc, 24,705 within 100 pc
- **Two render modes** — Emissive points (default) or 3D spheres, toggled at runtime
- **Spectral-class colours** — Stars coloured by spectral class, sized by absolute magnitude
- **Persistent galactic compass** — Always-visible overlay showing Coreward (+X), Spinward (+Y), Tailward (−Y), Outward (−X)
- **Star selection & distance lines** — Click to select; lines and distances appear between every pair
- **Name labels** — Optional toggle to show star names projected onto the map
- **Brightness control** — Adjust star glow intensity (0.5× – 2.0×)
- **Performance guard** — Star-count slider (10 → max) with FPS meter and auto-suggestions
- **Export / Import** — Save selected or visible stars as JSON; load custom catalogues
- **Offline PWA** — Works without network after first load; service worker precaches catalogues
- **Mobile & touch** — Pinch-zoom, orbit rotate, tap-vs-drag disambiguation

---

## Controls

### Mouse / Desktop

| Action | Result |
|---|---|
| **Left click** a star | Select / deselect the star |
| **Double click** a star | Open **detail panel** with raw JSON stats and 2D map link |
| **Right click** a star | Open **detail panel** (alternative to double-click) |
| **Click empty space** | Close detail panel if open |
| **Drag** | Rotate camera (OrbitControls) |
| **Scroll** | Zoom in / out |
| **Escape** | Deselect all stars **and** close detail panel |

### Touch / Mobile

| Action | Result |
|---|---|
| **Single tap** a star | Select / deselect the star |
| **Double tap** a star | Open **detail panel** |
| **Tap empty space** | Close detail panel if open |
| **Drag** | Rotate camera |
| **Pinch** | Zoom in / out |

> Tap-vs-drag threshold is < 10 px — short drags are interpreted as taps.

### UI Panels (top-right Controls panel)

| Control | Function |
|---|---|
| **Catalogue** | Switch dataset: HYG v4.1 — 10 / 50 / 100 pc, or custom imported JSON |
| **Render** | Toggle between **Points (emissive)** and **Spheres (3D)** |
| **Sphere scale** | Appears only in sphere mode; adjusts sphere size (0.3× – 3.0×) |
| **Brightness** | Adjust star glow intensity for all visible stars (0.5× – 2.0×) |
| **Stars** | Slider to limit how many stars are rendered (default 20) |
| **Show names / Hide names** | Toggle star name labels projected onto the 3D view |
| **Show pc / Show ly** | Toggle distance unit between parsecs and light-years |
| **🔓 Unlock / 🔒 Lock selection** | **Lock** = tapping stars always adds them (never removes). For phone/tablet multi-select without a Shift key. |
| **Export JSON** | Download the current selection (or all visible if none selected) as JSON |
| **Import JSON** | Load a custom star catalogue from a JSON file |

### Selection Panel (bottom-left)

- Lists selected stars and pairwise distances
- **Clear selection** button removes all selections
- **Warning banner** appears at 10+ selected stars (O(n²) line count can crash the browser)

### Detail Panel (centered floating)

- Opens on double-click / right-click / double-tap
- Shows raw **JSON stats** for the star (`id`, `name`, `x`, `y`, `z`, `spec`, `absMag`)
- **Open 2D Map** — links to the 2D Star System Map with this star pre-selected
- **Export this star** — downloads a single-star JSON file
- Close with the ✕ button, by clicking empty canvas, or with **Escape**

---

## Stack

| Layer | Choice |
|-------|--------|
| Renderer | Three.js r0.177+ |
| Build | Vite 6.x |
| Language | TypeScript (strict) |
| PWA | `vite-plugin-pwa` |

---

## Development

```bash
npm install
npm run dev      # Vite dev server
npm run build    # Production build to dist/
npm run preview  # Preview production build locally
```

---

## Deploy to GitHub Pages

The repo includes a GitHub Actions workflow (`.github/workflows/deploy.yml`) that builds and deploys automatically on every push to `main`.

### One-time setup

1. Go to **Settings → Pages** in the GitHub repo.
2. Under **Build and deployment → Source**, select **GitHub Actions**.
3. Push to `main`. The workflow will build `dist/` and deploy it.

### Manual deploy (alternative)

If you prefer not to use Actions, build locally and push `dist/` to the `gh-pages` branch:

```bash
npm run build
cd dist
git init
git add .
git commit -m "deploy"
git push -f git@github.com:Game-in-the-Brain/3d-interstellar-map.git main:gh-pages
```

---

## Data Attribution

Stellar data derived from the **HYG Database v4.1** (David Nash, CC BY-SA 4.0).  
Source: <https://github.com/astronexus/HYG-Database>

---

## Related Projects

- [2D Star System Map](https://github.com/Game-in-the-Brain/2d-star-system-map)
- [Mneme CE World Generator](https://github.com/Game-in-the-Brain/mneme-world-generator-pwa)
