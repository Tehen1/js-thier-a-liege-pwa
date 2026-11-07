import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFileSync(join(root, path), 'utf8');

test('Astro renders team cards as elements instead of escaped HTML strings', () => {
  const source = read('src/components/Teams.astro');
  assert.match(source, /\{TEAMS\.map\(\(team, index\) => \(/);
  assert.match(source, /data-group=\{team\.group\}/);
  assert.match(source, /href=\{`\$\{F24\}\/\$\{team\.path\}`\}/);
  assert.doesNotMatch(source, /\.join\(['"]{2}\)/);
  assert.doesNotMatch(source, /return\s*`\s*<a/);
});

test('one external game loader replaces the invalid Astro inline await script', () => {
  const games = read('src/components/Jeux.astro');
  const client = read('public/app.js');
  assert.doesNotMatch(games, /<script\b/);
  assert.match(client, /function initGames\(\)/);
  assert.match(client, /\ninitGames\(\);/);
  assert.match(client, /Promise\.all\(\[import\('\.\/game\.js'\)/);
  assert.match(client, /button\[data-skip\]/);
});

test('all interactive controls have SSR counterparts and safe initialization', () => {
  const home = read('src/pages/index.astro');
  const app = read('public/app.js');
  assert.match(home, /id="togglePh"/);
  assert.match(home, /<script type="module" src="\/app\.js"><\/script>/);
  assert.doesNotMatch(home, /onerror=/);
  assert.match(app, /const btn = \$\('togglePh'\);\s*if \(!btn\) return/);
  assert.match(app, /card\.hidden = filter !== 'all'/);
  assert.doesNotMatch(app, /setHTML\(grid/);
});

test('service worker updates without destroying other registrations', () => {
  const pwa = read('public/pwa.js');
  assert.doesNotMatch(pwa, /getRegistrations\(\)/);
  assert.match(pwa, /register\('\/sw\.js', \{ scope: '\/'/);
});
