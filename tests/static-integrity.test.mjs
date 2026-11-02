import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { test } from 'node:test';

const root = resolve(import.meta.dirname, '..');
const read = (name) => readFileSync(resolve(root, name), 'utf8');
const exists = (name) => existsSync(resolve(root, name));

test('static entrypoints required by the current deployment exist', () => {
  for (const name of [
    'index.html', 'style.css', 'app.js', 'game.js', 'runner.js',
    'board.js', 'sw.js', 'offline.html', 'manifest.webmanifest',
  ]) {
    assert.ok(exists(name), `Missing deployed asset: ${name}`);
  }
});

test('manifest points to real local icons, including installability sizes', () => {
  const manifest = JSON.parse(read('manifest.webmanifest'));
  assert.equal(manifest.start_url, '/');
  assert.ok(Array.isArray(manifest.icons) && manifest.icons.length > 0);
  for (const icon of manifest.icons) {
    assert.equal(typeof icon.src, 'string');
    assert.ok(!/^[a-z]+:/i.test(icon.src), `Unexpected remote icon: ${icon.src}`);
    assert.ok(!icon.src.includes('..'), `Unsafe icon path: ${icon.src}`);
    assert.ok(exists(icon.src.replace(/^\//, '')), `Missing icon: ${icon.src}`);
  }
  for (const size of ['192x192', '512x512']) {
    assert.ok(manifest.icons.some(icon =>
      icon.type === 'image/png' && icon.sizes === size
    ), `Missing installable PNG size ${size}`);
  }
});

test('Service Worker precache contains only existing static assets', () => {
  const sw = read('sw.js');
  const shell = sw.match(/const STATIC_ASSETS\s*=\s*\[([\s\S]*?)\]/);
  assert.ok(shell, 'Cannot find STATIC_ASSETS list');
  const entries = [...shell[1].matchAll(/'([^']+)'/g)].map(match => match[1]);
  assert.ok(entries.length > 0);
  for (const asset of entries) {
    if (asset === '/') continue;
    assert.ok(asset.startsWith('/'), `Invalid SW path: ${asset}`);
    assert.ok(exists(asset.slice(1)), `Missing SW precache asset: ${asset}`);
  }
});

test('Vercel config does not rewrite all asset requests to HTML', () => {
  const config = JSON.parse(read('vercel.json'));
  assert.ok(!config.routes?.some(route =>
    route.src === '/(.*)' && route.dest === '/index.html'
  ), 'A catch-all SPA rewrite breaks JS/PWA assets');
  assert.ok(!config.functions || !JSON.stringify(config.functions).includes('nodejs16'));
});
