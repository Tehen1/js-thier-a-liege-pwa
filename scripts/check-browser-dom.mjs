import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { argv } from 'node:process';

const file = argv[2];
if (!file) throw new Error('Expected path to headless browser DOM dump');
const html = readFileSync(file, 'utf8');
assert.match(html, /<html\b/i, 'Chrome returned no HTML');
assert.doesNotMatch(html, /&lt;a\s+class=/i, 'Escaped team HTML visible in browser');

const heroDots = html.match(/<span\b[^>]*id="hsDots"[^>]*>([\s\S]*?)<\/span>/);
assert.ok(heroDots?.[1].includes('<button'), 'Hero initialization did not run');
const carousel = html.match(/<div\b[^>]*id="carTrack"[^>]*>([\s\S]*?)<\/div>/);
assert.ok(carousel?.[1].includes('class="slide'), 'Gallery initialization did not run');
const teamGrid = html.match(/<div\b[^>]*id="teamGrid"[^>]*>([\s\S]*?)<\/div>/);
assert.ok(teamGrid?.[1].includes('class="team'), 'SSR team cards missing in browser');
assert.match(html, /id="togglePh"/, 'Placeholder toggle missing');
const goal = html.match(/<p\b[^>]*id="podGoal"[^>]*>([\s\S]*?)<\/p>/);
assert.ok(goal?.[1].includes('première place'), 'Game engines failed to initialize the podium');
console.log('Browser runtime smoke: hero, gallery, teams, game engines and controls initialized');
