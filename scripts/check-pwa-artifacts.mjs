import { existsSync, readFileSync, readdirSync } from 'node:fs';

const dist = new URL('../dist/', import.meta.url);
const files = readdirSync(dist).filter((name) => /^sw(?:-[a-z0-9-]+)?\.js$/i.test(name));
if (!files.includes('sw.js')) {
  throw new Error('Missing generated service worker: dist/sw.js');
}
if (!existsSync(new URL('manifest.webmanifest', dist))) {
  throw new Error('Missing PWA manifest: dist/manifest.webmanifest');
}
for (const file of files) {
  const source = readFileSync(new URL(file, dist), 'utf8');
  if (/\b(?:from\s*|import\s*\(\s*|import\s*)[\x27\x22]@vite-pwa\//.test(source)) {
    throw new Error(`Unresolved Workbox import in dist/${file}`);
  }
}
console.log(`Verified PWA manifest and ${files.length} generated service worker file(s)`);
