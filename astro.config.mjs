import { fileURLToPath } from 'node:url';
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

export default defineConfig({
  site: 'https://jsthier-pwa-kit.vercel.app',
  integrations: [react()],
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
