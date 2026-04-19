import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: '/3d-interstellar-map/',
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: '3D Interstellar Map',
        short_name: '3D Star Map',
        description: 'Interactive 3D map of nearby real stars for Cepheus Engine',
        theme_color: '#050508',
        background_color: '#050508',
        display: 'standalone',
        start_url: '/3d-interstellar-map/',
        icons: [
          {
            src: './favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
          },
        ],
      },
      workbox: {
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        globPatterns: ['**/*.{js,css,html,json,svg}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/game-in-the-brain\.github\.io\/3d-interstellar-map\/data\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'star-catalogues',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
            },
          },
        ],
      },
    }),
  ],
});
