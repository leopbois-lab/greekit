import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

// base relative : l'app est servie depuis un sous-dossier GitHub Pages.
export default defineConfig({
  base: './',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // Une nouvelle version s'installe quand l'utilisateur le décide (bandeau « Mettre à jour »).
      registerType: 'prompt',
      injectRegister: false,
      // Les icônes et le favicon sont déjà pris par globPatterns : on évite les doublons.
      includeManifestIcons: false,
      manifest: {
        name: 'How much fart',
        short_name: 'How much fart',
        description: 'L’empreinte carbone de tes achats, avec une planète à garder en forme.',
        lang: 'fr',
        dir: 'ltr',
        start_url: './',
        scope: './',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#f6f5f1',
        theme_color: '#f6f5f1',
        categories: ['lifestyle', 'utilities'],
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Pré-cache : l'app complète (écrans, données, police, lecteur de codes-barres) pour marcher hors ligne.
        globPatterns: ['**/*.{js,css,html,svg,png,woff2,wasm}'],
        // Le moteur OCR (environ 12 Mo en trois variantes) n'est pas pré-chargé : mis en cache à la première lecture.
        globIgnores: ['ocr/**'],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            urlPattern: ({ url, sameOrigin }) => sameOrigin && url.pathname.includes('/ocr/'),
            handler: 'CacheFirst',
            options: { cacheName: 'ocr', expiration: { maxEntries: 8 } },
          },
        ],
      },
    }),
  ],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
