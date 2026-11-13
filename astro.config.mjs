import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://jsthier-pwa-kit.vercel.app',
  // Service worker vanilla minimal (public/sw.js) géré manuellement par public/pwa.js.
  // Le plugin @vite-pwa/astro a été retiré car son service worker Workbox généré
  // (dist/sw.js) échouait à s'évaluer sur le navigateur (ServiceWorker script evaluation failed).
  vite: {
    build: {
      // Never inline scripts/assets: keeps every script external so the step-6 CSP can stay `script-src 'self'`.
      assetsInlineLimit: 0,
    },
  },
});
