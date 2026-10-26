import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// `base: './'` keeps every asset path relative, so the same build works on
// GitHub Pages (served from /<repo>/), Netlify, Vercel or a local preview.
export default defineConfig({
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // globPatterns below already picks up every icon in public/.
      includeManifestIcons: false,
      manifest: {
        name: 'Forge — Workout Tracker',
        short_name: 'Forge',
        // Pins the app's identity to today's start URL so installs survive a future start_url change.
        id: '/Fitness-App/',
        description: 'Log workouts, track strength and see your progress in one place.',
        theme_color: '#000000',
        background_color: '#000000',
        display: 'standalone',
        orientation: 'portrait',
        start_url: './',
        scope: './',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Inter is only a fallback for devices without SF Pro (e.g. Android). Precache the Latin
        // subset so the first offline launch still uses it; other subsets are fetched on demand.
        globPatterns: ['**/*.{js,css,html,svg,png}', 'assets/inter-latin-wght-normal-*.woff2'],
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.destination === 'font',
            handler: 'CacheFirst',
            options: { cacheName: 'fonts', expiration: { maxEntries: 20 } },
          },
        ],
      },
    }),
  ],
});
