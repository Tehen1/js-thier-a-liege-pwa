import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
const exists = (file) => existsSync(new URL(`../${file}`, import.meta.url));

// --- Données typées ---
test('data files exist with typed exports', () => {
  for (const file of ['src/data/teams.ts', 'src/data/photos.ts', 'src/data/social.ts']) {
    assert.ok(exists(file), `${file} missing`);
    const src = read(file);
    assert.match(src, /export\s+(const|interface)/, `${file} has no export`);
  }
  const teams = read('src/data/teams.ts');
  assert.match(teams, /TEAMS\s*:\s*Team\[\]/);
  assert.match(teams, /group:\s*'ecole'|'jeunes'|'seniors'/);
  const photos = read('src/data/photos.ts');
  assert.match(photos, /PHOTOS\s*:\s*Photo\[\]/);
  const social = read('src/data/social.ts');
  assert.match(social, /SOCIAL\s*:\s*Social\[\]/);
});

// --- Composants .astro ---
test('astro components exist and render their section ids', () => {
  const components = [
    ['src/components/Nav.astro', /id="nav"/],
    ['src/components/Hero.astro', /id="heroTitle"/],
    ['src/components/Teams.astro', /id="equipes"/],
    ['src/components/Gallery.astro', /id="galerie"/],
    ['src/components/JoinForm.astro', /id="inscriptions"/],
    ['src/components/Footer.astro', /class="foot"/],
    ['src/components/Jeux.astro', /id="jeu"/],
  ];
  for (const [file, re] of components) {
    assert.ok(exists(file), `${file} missing`);
    assert.match(read(file), re, `${file} missing expected marker`);
  }
});

// --- Page d'accueil compose les composants ---
test('index.astro imports all astro components', () => {
  const src = read('src/pages/index.astro');
  for (const comp of ['Nav', 'Hero', 'Teams', 'Gallery', 'JoinForm', 'Footer', 'Jeux']) {
    assert.match(src, new RegExp(`from ['"]\\.\\./components/${comp}\\.astro['"]`), `index.astro does not import ${comp}`);
  }
  // /app.js toujours chargé pour l'initialisation
  assert.match(src, /src="\/app\.js"/);
});

// --- ClubMarkup.tsx (compatibilité Astro) ---
test('ClubMarkup.tsx exists as compatibility component', () => {
  const source = read('src/components/ClubMarkup.tsx');
  assert.ok(source.length > 0, 'ClubMarkup.tsx should still exist');
});

// --- Fichiers PWA et jeux ---
test('exposes all original game modules and PWA files', () => {
  for (const file of ['app.js', 'game.js', 'runner.js', 'board.js', 'manifest.webmanifest']) {
    assert.ok(exists(`public/${file}`), `${file} missing`);
  }
  // sw.js est généré par Workbox (@vite-pwa/astro) dans dist/ au build ;
  // le fichier public/sw.js manuel a été retiré.
});

// --- Compatibilité Next.js supprimée ---
// Ancienne vérification du format ClubMarkup.tsx retirée ; maintenant Astro compose la page à partir de composants .astro

// --- Rendu mobile-first des jeux et CSS ---
test('renders larger mobile-first game stages without installation UI', () => {
  const jeux = read('src/components/Jeux.astro');
  const css = read('src/styles/globals.css');
  const pwa = read('public/pwa.js');

  assert.match(jeux, /id="runWrap"/);
  assert.match(jeux, /id="gameWrap"/);
  assert.match(jeux, /id="rJump"/);
  assert.match(jeux, /id="rShoot"/);
  assert.doesNotMatch(jeux, /id="installBtn"|id="installFoot"/);
  assert.doesNotMatch(pwa, /beforeinstallprompt|initInstall/);

  assert.match(css, /\.sec\.game\s*\{[^}]*max-inline-size:\s*1600px/s);
  assert.match(css, /\.game-shell\s*\{\s*order:\s*0/);
  assert.match(css, /\.game-pane\s*>\s*\.rules\s*\{\s*order:\s*1/);
  assert.match(css, /block-size:\s*clamp\(390px,\s*76dvh,\s*780px\)/);
  assert.match(css, /block-size:\s*clamp\(360px,\s*72dvh,\s*740px\)/);
  assert.match(pwa, /initServiceWorker\(\)/);
});
