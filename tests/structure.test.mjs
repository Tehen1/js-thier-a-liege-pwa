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
