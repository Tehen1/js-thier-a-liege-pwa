// Export de la page en un seul fichier .html autonome.
// Les sources viennent de src-bundle.js (pas de fetch : l'aperçu ne l'autorise pas),
// les images sont recopiées depuis le navigateur via un canvas.
const MODULES = ['theme.js', 'game.js', 'runner.js', 'board.js', 'export.js'];
const IMG_RE = /images\/[\w.-]+\.(?:png|svg|jpe?g|webp|gif)/g;
const FILE_NAME = 'js-thier-a-liege.html';

const jsData = (code) => `data:text/javascript;charset=utf-8,${encodeURIComponent(code)}`;
const svgData = (code) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(code)}`;

// image déjà servie par le site -> data URL (JPEG pour les grandes photos, PNG sinon)
function rasterize(src) {
  return new Promise((ok, ko) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = img.naturalWidth; c.height = img.naturalHeight;
      c.getContext('2d').drawImage(img, 0, 0);
      const big = c.width * c.height > 250000;
      ok(c.toDataURL(big ? 'image/jpeg' : 'image/png', 0.86));
    };
    img.onerror = () => ko(new Error(`image ${src}`));
    img.src = src;
  });
}

export async function buildStandalone() {
  const { SRC } = await import('./src-bundle.js');
  const html = SRC['index.html'], css = SRC['style.css'], app = SRC['app.js'];
  const mods = MODULES.map((m) => SRC[m]);

  const all = [html, css, app, ...mods].join('\n');
  const imgs = [...new Set(all.match(IMG_RE) || [])];
  const data = Object.fromEntries(await Promise.all(imgs.map(async (p) => {
    if (SRC[p] && p.endsWith('.svg')) return [p, svgData(SRC[p])];
    try { return [p, await rasterize(p)]; } catch { return [p, p]; }
  })));
  const inlineImgs = (s) => s.replace(IMG_RE, (p) => data[p] || p);

  // les modules feuilles n'importent rien : chaque import './x.js' devient un module data:
  const modURL = Object.fromEntries(MODULES.map((m, i) => [m, jsData(inlineImgs(mods[i]))]));
  const appCode = inlineImgs(app)
    .replace(/(from\s+|import\(\s*)['"]\.\/([\w.-]+\.js)['"]/g, (s, kw, m) => (modURL[m] ? `${kw}'${modURL[m]}'` : s))
    .replace(/<\/script/gi, '<\\/script');

  const out = inlineImgs(html
    .replace(/<html([^>]*)>/i, '<html$1 data-standalone="">')
    .replace(/<link rel="stylesheet" href="style\.css">/, () => `<style>\n${css.replace(/<\/style/gi, '<\\/style')}\n</style>`))
    .replace(/<script type="module" src="app\.js"><\/script>/, () => `<script type="module">\n${appCode}\n</script>`);
  return out;
}

function download(url) {
  const a = Object.assign(document.createElement('a'), { href: url, download: FILE_NAME, rel: 'noopener' });
  document.body.append(a);
  a.click();
  a.remove();
}

// fenêtre de secours : si le navigateur bloque le téléchargement automatique
function showDialog(code, url) {
  let dlg = document.getElementById('exportDlg');
  if (!dlg) {
    dlg = document.createElement('dialog');
    dlg.id = 'exportDlg';
    dlg.className = 'export-dlg';
    dlg.setAttribute('aria-labelledby', 'exportDlgTitle');
    dlg.innerHTML = `
      <h2 id="exportDlgTitle">Page exportée</h2>
      <p>Le fichier <b>${FILE_NAME}</b> est prêt. S'il ne s'est pas téléchargé tout seul, utilisez un des boutons :</p>
      <div class="export-actions">
        <a class="btn btn-navy" data-dl download="${FILE_NAME}">Télécharger le .html</a>
        <button class="btn btn-line" type="button" data-copy>Copier le code</button>
        <a class="btn btn-line" data-open target="_blank" rel="noopener">Ouvrir dans un onglet</a>
      </div>
      <label class="export-code"><span>Code HTML complet (à coller dans un fichier .html)</span><textarea readonly rows="5" spellcheck="false"></textarea></label>
      <p class="export-msg" role="status" aria-live="polite"></p>
      <form method="dialog"><button class="btn btn-line export-close">Fermer</button></form>`;
    document.body.append(dlg);
    const msg = dlg.querySelector('.export-msg');
    const ta = dlg.querySelector('textarea');
    dlg.querySelector('[data-copy]').addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(ta.value); msg.textContent = 'Code copié dans le presse-papiers.'; }
      catch {
        ta.focus(); ta.select();
        msg.textContent = document.execCommand?.('copy') ? 'Code copié.' : 'Code sélectionné : faites Ctrl+C (ou ⌘+C).';
      }
    });
    dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
  }
  dlg.querySelector('[data-dl]').href = url;
  dlg.querySelector('[data-open]').href = url;
  dlg.querySelector('textarea').value = code;
  dlg.querySelector('.export-msg').textContent = '';
  if (!dlg.open) dlg.showModal();
}

export function initExport(buttons) {
  // dans la copie exportée, le bouton n'a plus de sens
  if (document.documentElement.hasAttribute('data-standalone')) {
    buttons.forEach((b) => { b.hidden = true; });
    document.querySelectorAll('[data-online-only]').forEach((el) => { el.hidden = true; });
    return;
  }
  let lastURL = '';
  buttons.forEach((btn) => btn.addEventListener('click', async () => {
    if (btn.getAttribute('aria-busy') === 'true') return;
    const label = btn.querySelector('.btn-label');
    const initial = label?.textContent;
    btn.setAttribute('aria-busy', 'true');
    if (label) label.textContent = 'Préparation…';
    try {
      const code = await buildStandalone();
      if (lastURL) URL.revokeObjectURL(lastURL);
      lastURL = URL.createObjectURL(new Blob([code], { type: 'text/html;charset=utf-8' }));
      try { download(lastURL); } catch {}
      showDialog(code, lastURL);
      if (label) label.textContent = 'Fichier prêt ✓';
    } catch (err) {
      console.error('Export .html', err);
      if (label) label.textContent = 'Échec de l’export';
    } finally {
      btn.removeAttribute('aria-busy');
      if (label) setTimeout(() => { label.textContent = initial; }, 2500);
    }
  }));
}
