import { fileURLToPath } from 'node:url';
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import { AstroPWAIntegration } from '@vite-pwa/astro';

export default defineConfig({
  site: 'https://jsthier-pwa-kit.vercel.app',
  integrations: [
    react(),
    AstroPWAIntegration({
      registerType: 'autoUpdate',
      generateSW: {
        globPatterns: ['**/*.{js,css,svg,png,jpg,jpeg,webp,ico}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        navigateFallback: '/',
        navigateFallbackDenylist: [/^\/_astro/, /^\/api/, /^\/admin/],
        swDest: 'sw.js',
        // Évite les doublons : manifest + icônes déclarés dans le manifest PWA
        // sont déjà pris en charge par le plugin ; pas besoin de les précacher deux fois.
        globIgnores: [
          '**/manifest.webmanifest',
          '**/icons/icon-192.png',
          '**/icons/icon-512.png',
          '**/icons/maskable.svg',
          '**/images/crest.svg',
        ],
      },
      manifest: {
        name: 'JS du Thier à Liège',
        short_name: 'JS Thier',
        description: 'Club de football de quartier à Thier-à-Liège : équipes, matchs, inscriptions, chèques-sport et mini-jeux.',
        lang: 'fr-BE',
        dir: 'ltr',
        start_url: '/?source=pwa',
        scope: './',
        display: 'standalone',
        display_override: ['standalone', 'minimal-ui'],
        orientation: 'any',
        theme_color: '#1a2a5e',
        background_color: '#1a2a5e',
        categories: ['sports', 'kids', 'lifestyle'],
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icons/maskable.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
          { src: 'images/crest.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
        ],
      },
    }),
  ],
  vite: {
    build: {
      // Never inline scripts/assets: keeps every script external so the step-6 CSP can stay `script-src 'self'`.
      assetsInlineLimit: 0,
    },
    resolve: {
      alias: {
        // ClubMarkup.tsx is unchanged during the transition; next/image renders as a plain  tag at build time.
        'next/image': fileURLToPath(new URL('./src/shims/next-image.tsx', import.meta.url)),
      },
    },
  },
});
