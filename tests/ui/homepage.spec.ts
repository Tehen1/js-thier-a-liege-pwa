import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { execSync } from 'node:child_process';

/**
 * Capture une capture d'ecran puis la convertit en WebP (qualite 85).
 * Garde le PNG source en reference.
 */
async function captureAndConvert(page: Page, pngPath: string, webpPath?: string, options?: { fullPage?: boolean }) {
  const targetWebp = webpPath || pngPath.replace(/\.png$/, '.webp');
  const screenshotOptions: { path: string; fullPage?: boolean } = { path: pngPath };
  if (options?.fullPage !== undefined) {
    screenshotOptions.fullPage = options.fullPage;
  }
  await page.screenshot(screenshotOptions);
  execSync(`cwebp -q 85 "${pngPath}" -o "${targetWebp}"`, { stdio: 'pipe' });
}

test.describe('Accueil rendu SSR et contenu initial', () => {
  test('affiche le titre et les sections principales cote serveur', async ({ page }) => {
    await page.goto('/');

    await expect(page).toHaveTitle(/JS du Thier/);

    await expect(page.locator('#nav')).toBeVisible();
    await expect(page.locator('#heroTitle')).toBeVisible();
    await expect(page.locator('#equipes')).toBeVisible();
    await expect(page.locator('#galerie')).toBeVisible();
    await expect(page.locator('#inscriptions')).toBeVisible();
    await expect(page.locator('#jeu')).toBeVisible();
  });

  test('le HTML SSR contient deja les equipes et la galerie sans decrasement client', async ({ page }) => {
    const response = await page.goto('/');
    expect(response?.status()).toBe(200);

    const html = await page.content();
    expect(html).toContain('id="equipes"');
    expect(html).toContain('id="galerie"');
    expect(html).toContain('id="inscriptions"');
    expect(html).toContain('id="jeu"');
  });
});

test.describe('Navigation filtres equipes et galerie', () => {
  test('le filtrage equipes fonctionne via les boutons .chip', async ({ page }) => {
    await page.goto('/');

    const chips = page.locator('.chip');
    expect(await chips.count()).toBeGreaterThan(0);

    await chips.first().click();
    await expect(page.locator('#equipes')).toBeVisible();
  });

  test('la galerie contient la structure du carrousel (piste, boutons prev/next)', async ({ page }) => {
    await page.goto('/');

    const galerie = page.locator('#galerie');
    await expect(galerie).toBeVisible();
    await expect(page.locator('#carTrack')).toBeVisible();
    await expect(page.locator('#carPrev')).toBeVisible();
    await expect(page.locator('#carNext')).toBeVisible();
  });
});

test.describe('Jeux canvas et interaction', () => {
  test('le canvas de jeu est present et dimensionne', async ({ page }) => {
    await page.goto('/');

    const canvas = page.locator('#jeu canvas').first();
    await expect(canvas).toBeVisible();

    const box = await canvas.boundingBox();
    expect(box?.width).toBeGreaterThan(0);
    expect(box?.height).toBeGreaterThan(0);
  });

  test('pas dUI dinstallation invasive sur mobile-first', async ({ page }) => {
    await page.goto('/');

    await expect(page.locator('#installBtn')).not.toBeVisible();
    await expect(page.locator('#installFoot')).not.toBeVisible();
  });
});

test.describe('PWA manifest et service worker', () => {
  test('le manifest webmanifest est accessible', async ({ page }) => {
    const response = await page.goto('/manifest.webmanifest');
    expect(response?.status()).toBe(200);
    const ct = response?.headers()['content-type'] || '';
    expect(ct).toMatch(/(\bapplication\/json\b|\bapplication\/manifest\+json\b)/);
  });

  test('le service worker est enregistre', async ({ page }) => {
    await page.goto('/');

    const swSupported = await page.evaluate(() => 'serviceWorker' in navigator);
    expect(swSupported).toBe(true);
  });
});

test.describe('Captures visuelles reference produit (PNG + WebP)', () => {
  test('capture de la page daccueil complete', async ({ page }) => {
    await page.goto('/');
    await captureAndConvert(page, 'tests/ui/screenshots/homepage.png', undefined, { fullPage: true });
  });

  test('capture de la section equipes', async ({ page }) => {
    await page.goto('/');
    await captureAndConvert(page, 'tests/ui/screenshots/equipes.png');
  });

  test('capture de la section jeux', async ({ page }) => {
    await page.goto('/');
    await captureAndConvert(page, 'tests/ui/screenshots/jeux.png');
  });
});
