import { existsSync, readFileSync, readdirSync } from 'node:fs';

const publicDir = new URL('../public/', import.meta.url);

const distFiles = readdirSync(new URL('../dist/', import.meta.url))
  .filter((name) => /^sw(?:-[a-z0-9-]+)?\.js$/i.test(name));
const publicFiles = readdirSync(publicDir)
  .filter((name) => /^sw\.js$/i.test(name));

const swFiles = [...new Set([...distFiles, ...publicFiles])];
if (!swFiles.includes('sw.js')) {
  throw new Error('Missing service worker: dist/sw.js or public/sw.js');
}

// Le service worker vanilla public/sw.js est activement utilisé
// (le plugin @vite-pwa/astro a été retiré car son SW Workbox échouait
// à s'évaluer sur le navigateur).
if (existsSync(new URL('sw.js', publicDir))) {
  const swSource = readFileSync(new URL('sw.js', publicDir), 'utf8');
  // Ignore la séquence dans les commentaires (ex: "// Pas d'importScripts()").
  const withoutComments = swSource.replace(/\/\/[^\n]*/g, '');
  if (withoutComments.includes('importScripts')) {
    throw new Error('public/sw.js should be vanilla (no importScripts)');
  }
}

// Vérification du manifest
if (!existsSync(new URL('manifest.webmanifest', publicDir))) {
  throw new Error('Missing PWA manifest: public/manifest.webmanifest');
}
console.log(`Verified PWA manifest and ${swFiles.length} service worker file(s)`);
