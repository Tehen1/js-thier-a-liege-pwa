import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFileSync(join(root, path), 'utf8');

test('Astro must not include a Next.js root middleware', () => {
  const pkg = JSON.parse(read('package.json'));
  assert.ok(Object.hasOwn(pkg.dependencies, 'astro'));
  assert.equal(existsSync(join(root, 'middleware.ts')), false);
});

test('GitHub CI uses the Node.js major declared by the app', () => {
  const pkg = JSON.parse(read('package.json'));
  assert.match(pkg.engines.node, /^[0-9]+[.]x$/);
  const major = pkg.engines.node.split('.')[0];
  const ci = read('.github/workflows/ci.yml');
  assert.ok(ci.includes(`node-version: '${major}'`));
});

test('Vercel preserves baseline HTTP security headers', () => {
  const config = JSON.parse(read('vercel.json'));
  assert.equal(config.framework, 'astro');
  const global = config.headers.find((entry) => entry.source === '/(.*)');
  assert.ok(global);
  const headers = new Map(global.headers.map(({ key, value }) => [key, value]));
  assert.equal(headers.get('X-Content-Type-Options'), 'nosniff');
  assert.equal(headers.get('X-Frame-Options'), 'DENY');
  assert.equal(headers.get('Referrer-Policy'), 'strict-origin-when-cross-origin');
});

test('Vercel CI discovers tagged Turborepo checks for the single-package app', () => {
  const pkg = JSON.parse(read('package.json'));
  const turbo = JSON.parse(read('turbo.json'));
  assert.match(pkg.devDependencies.turbo, /^[0-9]+[.][0-9]+[.][0-9]+$/);
  for (const task of ['typecheck', 'lint', 'test']) {
    assert.ok(turbo.tasks[task].tags.includes('ci'), `Missing ci tag for ${task}`);
  }
  assert.ok(!turbo.tasks.build.tags?.includes('ci'), 'Build must not run twice in Vercel CI');
});

test('pnpm exposes generated Workbox entrypoint dependencies', () => {
  const config = read('pnpm-workspace.yaml');
  for (const name of ['@vite-pwa/workbox-window', '@vite-pwa/workbox-swkit']) {
    assert.ok(config.includes(name), `Missing hoist for ${name}`);
  }
});
