// Thème clair / sombre : choix enregistré, sinon préférence du système.
// Le thème initial est déjà posé par le petit script du <head> (pas de flash).
const KEY = 'jsthier-theme';
const root = document.documentElement;
const media = matchMedia('(prefers-color-scheme: dark)');

const stored = () => { try { return localStorage.getItem(KEY); } catch { return null; } };
const store = (v) => { try { localStorage.setItem(KEY, v); } catch {} };

function apply(theme, btn) {
  root.dataset.theme = theme;
  document.querySelectorAll('meta[name="theme-color"]').forEach(m => m.setAttribute('content', theme === 'dark' ? '#0b1126' : '#e6e7e9'));
  if (btn) btn.setAttribute('aria-label', theme === 'dark' ? 'Passer au thème clair' : 'Passer au thème sombre');
}

export function initTheme(btn) {
  apply(root.dataset.theme || (media.matches ? 'dark' : 'light'), btn);
  btn.addEventListener('click', () => {
    const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
    // transition douce, sauf si l'utilisateur limite les animations
    const swap = () => { apply(next, btn); store(next); };
    if (document.startViewTransition && !matchMedia('(prefers-reduced-motion: reduce)').matches) document.startViewTransition(swap);
    else swap();
  });
  // suit le système tant que l'utilisateur n'a rien choisi
  media.addEventListener('change', (e) => { if (!stored()) apply(e.matches ? 'dark' : 'light', btn); });
}
