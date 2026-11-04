// PWA service worker, update notifications, and offline status.
const $ = (id) => document.getElementById(id);
const isStandalone = () => navigator.standalone === true || matchMedia('(display-mode: standalone)').matches;

function toast(text, action) {
  let el = $('pwaToast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'pwaToast';
    el.className = 'pwa-toast';
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    document.body.append(el);
  }
  el.replaceChildren();
  const p = document.createElement('p');
  p.textContent = text;
  el.append(p);
  if (action) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn btn-yellow';
    b.textContent = action.label;
    b.addEventListener('click', action.run, { once: true });
    el.append(b);
  }
  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'pwa-close';
  close.setAttribute('aria-label', 'Fermer');
  close.textContent = '×';
  close.addEventListener('click', () => el.classList.remove('on'), { once: true });
  el.append(close);
  requestAnimationFrame(() => el.classList.add('on'));
  clearTimeout(toast.t);
  if (!action) toast.t = setTimeout(() => el.classList.remove('on'), 4000);
}

function initServiceWorker() {
  // uniquement en HTTPS (ou en local) : sinon le navigateur refuse
  if (!('serviceWorker' in navigator) || !window.isSecureContext || !/^https?:$/.test(location.protocol)) return;
  const register = async () => {
    try {
      const reg = await navigator.serviceWorker.register('sw.js', { scope: './', updateViaCache: 'none' });
      const offerUpdate = (worker) => toast('Une nouvelle version du site est disponible.', {
        label: 'Mettre à jour',
        run: () => worker.postMessage('SKIP_WAITING'),
      });
      if (reg.waiting && navigator.serviceWorker.controller) offerUpdate(reg.waiting);
      reg.addEventListener('updatefound', () => {
        const w = reg.installing;
        w?.addEventListener('statechange', () => {
          if (w.state === 'installed' && navigator.serviceWorker.controller) offerUpdate(w);
        });
      });
      let reloaded = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (reloaded) return;
        reloaded = true;
        location.reload();
      });
      // vérifie les mises à jour quand on revient sur l'app
      document.addEventListener('visibilitychange', () => { if (!document.hidden) reg.update().catch(() => {}); });
    } catch (err) {
      console.warn('Service worker non enregistré', err);
    }
  };
  if (document.readyState === 'complete') void register();
  else window.addEventListener('load', () => { void register(); }, { once: true });
}


function initNetwork() {
  const set = () => document.documentElement.toggleAttribute('data-offline', !navigator.onLine);
  window.addEventListener('offline', () => { set(); toast('Hors ligne : le site reste consultable, les jeux aussi.'); });
  window.addEventListener('online', () => { set(); toast('Connexion rétablie.'); });
  set();
}

export function initPwa() {
  initServiceWorker();
  initNetwork();
  if (isStandalone()) document.documentElement.setAttribute('data-standalone-app', '');
}
