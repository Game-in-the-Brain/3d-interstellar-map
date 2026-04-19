# 3D Interstellar Map

A lightweight, offline-capable 3D star map showing Sol and nearby real stars out to 100 parsecs. Built with Three.js + TypeScript + Vite as a Progressive Web App.

**Live URL:** `https://game-in-the-brain.github.io/3d-interstellar-map/`

---

## Features

- **Real star data** — 325 stars within 10 pc, 8,750 within 50 pc, 24,705 within 100 pc (HYG v4.1 catalogue)
- **Spectral-class colours** — Stars rendered as coloured spheres sized by absolute magnitude
- **Persistent galactic compass** — Always-visible overlay showing Coreward (+X), Spinward (+Y), Tailward (−Y), Outward (−X)
- **Star selection & distance lines** — Click/tap to select stars; lines and distances appear between every pair
- **Performance guard** — Star-count slider (10 → max) with FPS meter and auto-suggestions
- **Offline PWA** — Works without network after first load; service worker precaches catalogues
- **Mobile & touch** — Pinch-zoom, orbit rotate, tap-vs-drag disambiguation (< 10 px)

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
