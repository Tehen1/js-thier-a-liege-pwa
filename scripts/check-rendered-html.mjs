import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { Script } from 'node:vm';

const html = readFileSync(new URL('../dist/index.html', import.meta.url), 'utf8');

// Detect escaped templates that would render literal HTML tags to visitors.
assert.doesNotMatch(html, /&lt;\s*(?:a|div|span)\b[^&]*class=/i, 'Rendered page exposes HTML template source');
const cards = [...html.matchAll(/<a\b(?=[^>]*\bclass="team")(?=[^>]*\bdata-group="(?:ecole|jeunes|seniors)")[^>]*>/g)];
assert.equal(cards.length, 15, `Expected 15 server-rendered team cards, found ${cards.length}`);

for (const id of ['togglePh', 'teamGrid', 'themeBtn', 'burger', 'heroShow', 'hsFrames', 'carTrack', 'jeu', 'joinForm']) {
  assert.ok(html.includes(`id="${id}"`), `Missing interactive element: ${id}`);
}
assert.match(html, /<script\b[^>]*type="module"[^>]*src="\/app\.js"/, 'Missing external ES module');
assert.doesNotMatch(html, /\bonerror=/i, 'Inline onerror handler violates the static CSP');
assert.doesNotMatch(html, /<script\b[^>]*client:visible/i, 'Astro client directive leaked into HTML');

// Classic inline scripts must be syntactically valid, including the prohibition
// on top-level await outside modules (the original game error in the screenshot).
for (const [full, attrs, code] of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
  if (/\bsrc\s*=/.test(attrs) || /\btype\s*=\s*['"](?:module|application\/ld\+json|application\/json)['"]/.test(attrs)) continue;
  if (code.trim()) new Script(code, { filename: 'dist/index.html inline script' });
}
console.log(`Validated generated HTML: ${cards.length} team cards and valid inline scripts`);
