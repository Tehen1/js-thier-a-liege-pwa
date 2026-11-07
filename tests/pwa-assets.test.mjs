import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { test } from 'node:test';

const root = resolve(import.meta.dirname, '..');
const read = (file) => readFileSync(resolve(root, file), 'utf8');
const exists = (file) => existsSync(resolve(root, file));

test('Astro source and legacy game modules exist', () => {
  for (const file of [
    'src/layouts/Base.astro', 'src/pages/index.astro', 'src/components/ClubMarkup.tsx',
    'public/manifest.webmanifest',
    'public/game.js', 'public/runner.js', 'public/board.js',
  ]) {
    assert.ok(exists(file), `Missing source: ${file}`);
  }
  // public/sw.js a été retiré : le Service Worker est généré par Workbox
  // (@vite-pwa/astro) dans dist/sw.js au build.
});

test('PWA manifest icons all refer to existing local files', () => {
  const manifest = JSON.parse(read('public/manifest.webmanifest'));
  assert.ok(Array.isArray(manifest.icons) && manifest.icons.length > 0);
  for (const icon of manifest.icons) {
    assert.equal(typeof icon.src, 'string');
    assert.ok(!icon.src.includes('..'), `Unsafe icon path: ${icon.src}`);
    const url = new URL(icon.src, 'https://local.invalid/manifest.webmanifest');
    assert.equal(url.origin, 'https://local.invalid');
    assert.ok(exists(`public${url.pathname}`), `Missing icon: ${url.pathname}`);
  }
  for (const size of ['192x192', '512x512']) {
    assert.ok(manifest.icons.some(icon => icon.sizes === size && icon.type === 'image/png'),
      `Missing installable PNG icon: ${size}`);
  }
});

test('Turborepo gates build on static quality tasks', () => {
  const config = JSON.parse(read('turbo.json'));
  const tasks = config.tasks;
  for (const name of ['typecheck', 'lint', 'test']) {
    assert.ok(tasks[name]?.tags?.includes('ci'), `Missing ci tag: ${name}`);
  }
  assert.ok(!tasks.build?.tags?.includes('ci'), 'Build is not an initial Vercel CI task');
  assert.deepEqual([...tasks.build.dependsOn].sort(), ['lint', 'test', 'typecheck']);
});
