// Application installable : service worker, bouton « Installer », aide iPhone,
// mise à jour disponible et état hors ligne.
const $ = (id) => document.getElementById(id);
const isStandalone = () => navigator.standalone === true || matchMedia('(display-mode: standalone)').matches;
const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

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
  window.addEventListener('load', async () => {
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
  });
}

function initInstall() {
  const buttons = [$('installBtn'), $('installFoot')].filter(Boolean);
  if (isStandalone()) return; // déjà installée
  let deferred = null;

  // Android / Chrome / Edge : le navigateur propose l'installation
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e;
    buttons.forEach((b) => { b.hidden = false; });
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    buttons.forEach((b) => { b.hidden = true; });
    toast('Application installée. Retrouvez-la sur votre écran d’accueil.');
  });

  // iPhone / iPad : pas d'invite automatique, on explique le geste
  if (isIOS()) buttons.forEach((b) => { b.hidden = false; });

  buttons.forEach((b) => b.addEventListener('click', async () => {
    if (deferred) {
      deferred.prompt();
      await deferred.userChoice.catch(() => null);
      deferred = null;
      return;
    }
    if (isIOS()) {
      toast('Sur iPhone : touchez Partager (carré avec une flèche), puis « Sur l’écran d’accueil ».');
    } else {
      toast('Ouvrez le menu du navigateur puis « Installer l’application » ou « Ajouter à l’écran d’accueil ».');
    }
  }));
}

function initNetwork() {
  const set = () => document.documentElement.toggleAttribute('data-offline', !navigator.onLine);
  window.addEventListener('offline', () => { set(); toast('Hors ligne : le site reste consultable, les jeux aussi.'); });
  window.addEventListener('online', () => { set(); toast('Connexion rétablie.'); });
  set();
}

export function initPwa() {
  initServiceWorker();
  initInstall();
  initNetwork();
  if (isStandalone()) document.documentElement.setAttribute('data-standalone-app', '');
}
