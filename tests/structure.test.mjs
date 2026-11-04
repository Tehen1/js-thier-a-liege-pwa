import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
const exists = (file) => existsSync(new URL(`../${file}`, import.meta.url));
test('preserves app router SSR markup and both canvas games', () => {
  const source = read('components/ClubMarkup.tsx');
  assert.match(source, /<main/);
  assert.match(source, /<canvas[^>]+id="runner"/);
  assert.match(source, /<canvas[^>]+id="game"/);
  assert.match(source, /id="inscriptions"/);
  assert.match(source, /id="equipes"/);
});
test('exposes all original game modules and PWA files', () => {
  for (const file of ['app.js', 'game.js', 'runner.js', 'board.js', 'sw.js', 'manifest.webmanifest']) {
    assert.ok(exists(`public/${file}`), `${file} missing`);
  }
});
test('does not ship legacy HTML script tags in JSX', () => {
  assert.doesNotMatch(read('components/ClubMarkup.tsx'), /<script\b/);
  assert.doesNotMatch(read('components/ClubMarkup.tsx'), /dangerouslySetInnerHTML/);
});

test('renders larger mobile-first game stages without installation UI', () => {
  const markup = read('components/ClubMarkup.tsx');
  const css = read('app/globals.css');
  const pwa = read('public/pwa.js');

  assert.match(markup, /id="runWrap"/);
  assert.match(markup, /id="gameWrap"/);
  assert.match(markup, /id="rJump"/);
  assert.match(markup, /id="rShoot"/);
  assert.doesNotMatch(markup, /id="installBtn"|id="installFoot"/);
  assert.doesNotMatch(pwa, /beforeinstallprompt|initInstall/);

  assert.match(css, /\.sec\.game\s*\{[^}]*max-inline-size:\s*1600px/s);
  assert.match(css, /\.game-shell\s*\{\s*order:\s*0/);
  assert.match(css, /\.game-pane\s*>\s*\.rules\s*\{\s*order:\s*1/);
  assert.match(css, /block-size:\s*clamp\(390px,\s*76dvh,\s*780px\)/);
  assert.match(css, /block-size:\s*clamp\(360px,\s*72dvh,\s*740px\)/);
  assert.match(pwa, /initServiceWorker\(\)/);
});
