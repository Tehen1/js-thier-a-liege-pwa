// Point d'entrée : chaque bloc de la page est initialisé par une fonction dédiée.
import { initTheme } from './theme.js';
import { initPwa } from './pwa.js';
import { setHTML } from './safe-html.js';

const $ = (id) => document.getElementById(id);
const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

/* ---------- Données ---------- */
const SEASON_END = 2027; // saison 2026-2027 : un U7 est né en 2020

// Équipes 2026-2027 (source : Foot24.be, octobre 2026). n = nombre d'équipes dans la catégorie.
const F24 = 'https://www.foot24.be/fr/clubs/js-du-thier-a-liege';
const TEAMS = [
  { name: 'U6',  group: 'ecole',  u: 6,  n: 1, div: 'Régionaux', path: 'u6-6286' },
  { name: 'U7',  group: 'ecole',  u: 7,  n: 1, path: 'u7-3023' },
  { name: 'U8',  group: 'ecole',  u: 8,  n: 2, path: 'u8-a-2143' },
  { name: 'U9',  group: 'ecole',  u: 9,  n: 2, path: 'u9-a-2351' },
  { name: 'U10', group: 'jeunes', u: 10, n: 2, path: 'u10-a-1799' },
  { name: 'U11', group: 'jeunes', u: 11, n: 2, path: 'u11-a-1876' },
  { name: 'U12', group: 'jeunes', u: 12, n: 2, path: 'u12-a-1836' },
  { name: 'U13', group: 'jeunes', u: 13, n: 2, div: 'Interprovinciaux (A) · Régionaux (B)', path: 'u13-a-1839' },
  { name: 'U14', group: 'jeunes', u: 14, n: 1, path: 'u14-1570' },
  { name: 'U15', group: 'jeunes', u: 15, n: 1, path: 'u15-8184' },
  { name: 'U17', group: 'jeunes', u: 17, n: 1, path: 'u17-2718' },
  { name: 'Équipe 1A', group: 'seniors', div: '4e provinciale D', path: '1-a-2905' },
  { name: 'Équipe 1B', group: 'seniors', div: '4e provinciale C', path: '1-b-2745' },
  { name: 'Réserves',  group: 'seniors', div: 'Réserves du dimanche', path: 'reserven-3246' },
  { name: 'Vétérans',  group: 'seniors', div: 'Vétérans', path: 'veteranen-245' },
];
// couleur du liseré selon le groupe (variables CSS : suivent le thème)
const GROUP_COLOR = { ecole: 'var(--yellow)', jeunes: 'var(--brand)', seniors: 'var(--strong)' };

// Galerie : déposer la photo dans images/ puis ajouter une ligne ici.
const PHOTOS = [
  { src: 'images/b529bf4e.png', alt: 'Une équipe de jeunes de la JS en maillot jaune et bleu marine avec son entraîneur, devant le club-house', caption: 'Nos jeunes, au Thier', source: 'Facebook' },
// Jsthier gallery assets 2026-11-02 (supplied by club)
  { src: "/images/halloween-party-2026-10-30.jpg", alt: "Affiche de la soirée Halloween du club, le vendredi 30 octobre, à 19 h", caption: "Archives · Halloween, 30 octobre 2026", source: "", poster: true, portrait: true, hero: false },
  { src: "/images/tournois-jeunes-mai.jpg", alt: "Affiche illustrée des tournois de jeunes du club en mai, catégories U7 à U14", caption: "Tournois de jeunes · Mai", source: "", poster: true, portrait: false, hero: false },
  { src: "/images/cotisations-2026-2027.jpg", alt: "Affiche des cotisations 2026-2027 pour les membres du club", caption: "Informations · Cotisations 2026–2027", source: "", poster: true, portrait: false, hero: false },
  { src: "/images/recrutement-u10-u12-u17.jpg", alt: "Affiche de recrutement pour les équipes U10, U12 et U17", caption: "Recrutement · U10, U12 et U17", source: "", poster: true, portrait: false, hero: false },
  { src: "/images/reprise-entrainements.jpg", alt: "Affiche du planning de reprise des entraînements des équipes de jeunes", caption: "Vie du club · Reprise des entraînements", source: "", poster: true, portrait: false, hero: false },
  { src: "/images/recrutement-u17-joueurs-gardiens.jpg", alt: "Affiche de recrutement de joueurs et gardiens pour les U17", caption: "Recrutement · U17, joueurs et gardiens", source: "", poster: true, portrait: false, hero: false },
  { src: "/images/photo-equipe-jeunes-clubhouse.jpg", alt: "Équipe de jeunes du club avec son encadrement, devant le club-house", caption: "Photo de club · Équipe de jeunes", source: "", poster: true, portrait: false, hero: false },
];
const SOCIAL = [
  { kind: 'instagram', title: 'Suivez-nous sur Instagram', handle: '@js_thier_a_liege_a_', href: 'https://www.instagram.com/js_thier_a_liege_a_/' },
  { kind: 'facebook', title: 'Retrouvez-nous sur Facebook', handle: '@JSTHIERALIEGE', href: 'https://www.facebook.com/JSTHIERALIEGE/' },
];

/* ---------- Navigation ---------- */
function initNav() {
  const nav = $('nav'), burger = $('burger'), links = $('links');
  const setOpen = (open) => {
    links.classList.toggle('open', open);
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Fermer le menu' : 'Ouvrir le menu');
  };
  burger.addEventListener('click', () => setOpen(!links.classList.contains('open')));
  links.addEventListener('click', (e) => { if (e.target.closest('a')) setOpen(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && links.classList.contains('open')) { setOpen(false); burger.focus(); } });

  // ombre de la barre au défilement, sans écouter le scroll en continu
  const sentinel = $('top');
  new IntersectionObserver(([e]) => nav.classList.toggle('scrolled', !e.isIntersecting)).observe(sentinel);

  // lien actif selon la section visible
  const map = new Map($$('a[href^="#"]', links).map(a => [a.getAttribute('href').slice(1), a]));
  const spy = new IntersectionObserver((entries) => {
    entries.forEach(en => {
      const a = map.get(en.target.id);
      if (a && en.isIntersecting) { map.forEach(l => l.removeAttribute('aria-current')); a.setAttribute('aria-current', 'true'); }
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  map.forEach((_, id) => { const s = $(id); if (s) spy.observe(s); });
}

/* ---------- Apparition des sections ---------- */
function initReveal() {
  if (reducedMotion.matches || !('IntersectionObserver' in window)) return;
  const io = new IntersectionObserver((entries) => {
    entries.forEach(en => { if (en.isIntersecting) { en.target.classList.add('seen'); io.unobserve(en.target); } });
  }, { threshold: 0.08 });
  $$('.sec').forEach(s => { s.classList.add('sec-in'); io.observe(s); });
}

/* ---------- Surlignage des champs à compléter ---------- */
function initPlaceholders() {
  const btn = $('togglePh');
  btn.addEventListener('click', () => {
    const clean = document.body.classList.toggle('clean');
    btn.setAttribute('aria-pressed', String(clean));
    btn.textContent = clean ? 'Afficher le surlignage' : 'Masquer le surlignage';
  });
}

/* ---------- Équipes ---------- */
function initTeams() {
  const grid = $('teamGrid');
  const ph = (txt) => `<mark class="ph">${txt}</mark>`;
  const render = (filter) => {
    const list = TEAMS.filter(t => filter === 'all' || t.group === filter);
    setHTML(grid, list
      .map((t) => {
        const age = t.u ? `Né·es en ${SEASON_END - t.u}${t.div ? ` · ${t.div}` : ''}` : `Seniors · ${t.div}`;
        return `
        <a class="team" href="${F24}/${t.path}" target="_blank" rel="noopener noreferrer">
          <div class="cat">${t.name}${t.n > 1 ? '<sup>A·B</sup>' : ''}</div>
          <div class="age">${age}</div>
          <div class="meta">
            <span><b>Coach</b> · ${ph('à compléter')}</span>
            <span><b>Entraînement</b> · ${ph('jour et heure')}</span>
            <span class="cal">Calendrier et résultats <span aria-hidden="true">→</span></span>
          </div>
        </a>`;
      }).join(''));
    // couleur et décalage d'animation posés via le CSSOM (autorisé par la CSP, contrairement à style="")
    [...grid.children].forEach((a, i) => {
      a.style.setProperty('--c', GROUP_COLOR[list[i].group]);
      a.style.animationDelay = `${i * 40}ms`;
    });
  };
  const chips = $$('.chip');
  chips.forEach(chip => chip.addEventListener('click', () => {
    chips.forEach(c => c.setAttribute('aria-selected', String(c === chip)));
    render(chip.dataset.f);
  }));
  render('all');
}

/* ---------- Pré-inscription (démo : aucun envoi pour l'instant) ---------- */
function initForm() {
  const form = $('joinForm'), msg = $('formMsg');
  const year = $('annee'), cat = $('cat');
  year.addEventListener('input', () => {
    const y = Number.parseInt(year.value, 10);
    if (!y || y < 1950) { cat.value = ''; return; }
    const age = SEASON_END - y;
    cat.value = age < 5 ? 'Trop jeune pour cette saison' : age <= 19 ? `U${age}` : 'Seniors';
  });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const fields = $$('input[required]', form);
    let firstBad = null;
    fields.forEach(inp => {
      const bad = !inp.checkValidity() || !inp.value.trim();
      inp.setAttribute('aria-invalid', String(bad));
      if (bad && !firstBad) firstBad = inp;
    });
    if (firstBad) {
      msg.className = 'form-msg err';
      msg.textContent = 'Merci de compléter les champs en rouge.';
      firstBad.focus();
      return;
    }
    const name = form.elements.enfant.value.trim().split(/\s+/)[0];
    msg.className = 'form-msg ok';
    msg.textContent = `Merci ! La demande pour ${name} est prête. Le club vous recontactera.`;
    form.reset();
    cat.value = '';
    fields.forEach(inp => inp.removeAttribute('aria-invalid'));
  });
}

/* ---------- Diaporama de l'accueil ---------- */
// Utilise les mêmes photos que la galerie, complétées par deux vignettes aux couleurs du club.
const HERO_CARDS = [
  { html: '<b>21</b><span>équipes en 2026-2027</span><small>Des U6 aux vétérans</small>', caption: 'La JS en chiffres' },
  { html: '<img src="images/crest.svg" alt="" width="92" height="107"><span>Inscriptions ouvertes</span><small>Chèques-sport acceptés</small>', caption: 'Rejoignez le club', alt: true },
];
function initHeroShow() {
  const box = $('heroShow'), frames = $('hsFrames'), cap = $('hsCap'), dots = $('hsDots');
  const slides = [
    ...PHOTOS.filter(p => p.hero !== false).map(p => ({ caption: p.caption, el: Object.assign(new Image(), { src: p.src, alt: p.alt, decoding: 'async', className: 'hs-frame' }) })),
    ...HERO_CARDS.map(c => {
      const el = document.createElement('div');
      el.className = `hs-frame hs-card${c.alt ? ' alt' : ''}`;
      el.setAttribute('role', 'img');
      el.setAttribute('aria-label', c.caption);
      setHTML(el, c.html);
      return { caption: c.caption, el };
    }),
  ];
  frames.replaceChildren(...slides.map(s => s.el));
  setHTML(dots, slides.map((_, i) => `<button type="button" aria-label="Image ${i + 1} sur ${slides.length}"></button>`).join(''));
  const dotEls = [...dots.children];
  let i = 0;
  const show = (n) => {
    i = (n + slides.length) % slides.length;
    slides.forEach((s, k) => { s.el.classList.toggle('on', k === i); s.el.setAttribute('aria-hidden', String(k !== i)); });
    dotEls.forEach((d, k) => d.setAttribute('aria-current', String(k === i)));
    cap.textContent = slides[i].caption;
    // relance l'animation de la légende à chaque image
    cap.classList.remove('in'); box.classList.remove('hs-swap'); void cap.offsetWidth;
    cap.classList.add('in'); if (n !== 0 || box.dataset.ready) box.classList.add('hs-swap');
    box.dataset.ready = '1';
  };
  dotEls.forEach((d, k) => d.addEventListener('click', () => { show(k); restart(); }));
  show(0);

  // défile toutes les 4 s quand l'accueil est visible ; pause au survol, au focus ou si l'onglet est masqué
  let timer = 0, visible = true, hold = false;
  const restart = () => {
    clearInterval(timer); timer = 0;
    if (slides.length > 1 && visible && !hold && !document.hidden && !reducedMotion.matches) timer = setInterval(() => show(i + 1), 4000);
    // barre de progression du point actif : repart de zéro, se fige quand le diaporama est en pause
    box.classList.toggle('hs-paused', !timer);
    box.classList.remove('hs-run'); void box.offsetWidth; if (timer) box.classList.add('hs-run');
  };
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; restart(); }).observe(box);
  box.addEventListener('pointerenter', () => { hold = true; restart(); });
  box.addEventListener('pointerleave', () => { hold = false; restart(); });
  box.addEventListener('focusin', () => { hold = true; restart(); });
  box.addEventListener('focusout', () => { hold = false; restart(); });
  document.addEventListener('visibilitychange', restart);
  // glisser au doigt pour changer d'image
  let x0 = null;
  box.addEventListener('pointerdown', (e) => { x0 = e.clientX; });
  box.addEventListener('pointerup', (e) => {
    if (x0 === null) return;
    const dx = e.clientX - x0; x0 = null;
    if (Math.abs(dx) > 40) { show(i + (dx < 0 ? 1 : -1)); restart(); }
  });
  restart();
}

/* ---------- Filtre domicile / extérieur ---------- */
function initFixtures() {
  const btns = $$('.fix-filter button');
  const rows = $$('#fixList li');
  btns.forEach(b => b.addEventListener('click', () => {
    const v = b.dataset.venue;
    btns.forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    rows.forEach(r => { r.hidden = v !== 'all' && r.dataset.venue !== v; });
  }));
}

/* ---------- Galerie ---------- */
function initCarousel() {
  const box = $('carousel'), track = $('carTrack'), dots = $('carDots');
  const total = PHOTOS.length + SOCIAL.length;
  setHTML(track, [
    ...PHOTOS.map((p, i) => `
      <figure class="slide${p.poster ? ' slide-poster' : ''}${p.portrait ? ' slide-poster--portrait' : ''}" role="group" aria-roledescription="diapositive" aria-label="${i + 1} sur ${total}">
        <img src="${p.src}" alt="${p.alt}" loading="lazy" decoding="async" width="720" height="540">
        <figcaption><span>${p.caption}</span>${p.source ? `<small>via ${p.source}</small>` : ''}</figcaption>
      </figure>`),
    ...SOCIAL.map((s, i) => `
      <a class="slide slide-social ${s.kind}" href="${s.href}" target="_blank" rel="noopener noreferrer" aria-label="${s.title} (${PHOTOS.length + i + 1} sur ${total})">
        <img src="images/crest.svg" alt="" loading="lazy" decoding="async" width="96" height="112">
        <b>${s.title}</b><span>${s.handle}</span><i>Voir les photos →</i>
      </a>`),
  ].join(''));
  const items = [...track.children];
  setHTML(dots, items.map((_, i) => `<button type="button" aria-label="Aller à la diapositive ${i + 1}"></button>`).join(''));
  const dotEls = [...dots.children];

  const current = () => {
    const x = track.scrollLeft;
    return items.reduce((best, it, i) => Math.abs(it.offsetLeft - track.offsetLeft - x) < Math.abs(items[best].offsetLeft - track.offsetLeft - x) ? i : best, 0);
  };
  const go = (i) => {
    const n = (i + items.length) % items.length;
    track.scrollTo({ left: items[n].offsetLeft - track.offsetLeft, behavior: reducedMotion.matches ? 'auto' : 'smooth' });
  };
  let raf = 0;
  const sync = () => { const c = current(); dotEls.forEach((d, i) => d.setAttribute('aria-current', String(i === c))); dotEls.forEach((d, i) => d.classList.toggle('on', i === c)); };
  track.addEventListener('scroll', () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(sync); }, { passive: true });
  $('carPrev').addEventListener('click', () => go(current() - 1));
  $('carNext').addEventListener('click', () => go(current() + 1));
  dotEls.forEach((d, i) => d.addEventListener('click', () => go(i)));
  box.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); go(current() + 1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); go(current() - 1); }
  });
  box.tabIndex = 0;
  sync();

  // défilement automatique : seulement visible, sans survol ni focus, et si les animations sont permises
  let timer = 0, visible = false, hold = false;
  const update = () => {
    clearInterval(timer); timer = 0;
    if (visible && !hold && !reducedMotion.matches && !document.hidden) timer = setInterval(() => go(current() + 1), 5000);
  };
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; update(); }, { threshold: 0.4 }).observe(box);
  box.addEventListener('pointerenter', () => { hold = true; update(); });
  box.addEventListener('pointerleave', () => { hold = false; update(); });
  box.addEventListener('focusin', () => { hold = true; update(); });
  box.addEventListener('focusout', () => { hold = false; update(); });
  document.addEventListener('visibilitychange', update);
}

/* ---------- Jeux + top 3 ---------- */
// Les jeux (~65 Ko) ne sont chargés qu'à l'approche de la section, pour un affichage initial rapide.
function initGames() {
  const section = $('jeu');
  let started = false;
  const load = () => {
    if (started) return;
    started = true;
    Promise.all([import('./game.js'), import('./runner.js'), import('./board.js')])
      .then((mods) => setupGames(...mods))
      .catch((err) => console.error('Jeux', err));
  };
  if (!('IntersectionObserver' in window) || location.hash === '#jeu') return load();
  const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { io.disconnect(); load(); } }, { rootMargin: '800px 0px' });
  io.observe(section);
  // si le navigateur est inactif avant, on précharge quand même
  (window.requestIdleCallback || ((f) => setTimeout(f, 3000)))(load, { timeout: 6000 });
}
function setupGames({ createGame, LEVELS }, { createRunner }, { createBoard }) {
  let mode = 'runner';
  const tops = { runner: [], penalty: [] };
  const showGoal = () => {
    const list = tops[mode];
    const unit = mode === 'runner' ? 'pts' : 'buts';
    const free = 3 - list.length;
    setHTML($('podGoal'), !list.length
      ? 'Personne au classement : la première place est libre.'
      : free > 0
        ? `Encore ${free} place${free > 1 ? 's' : ''} libre${free > 1 ? 's' : ''} sur le podium.`
        : `À battre pour entrer : <b>${list[2].score + 1} ${unit}</b>`);
  };
  const onBoard = (m, recId, unit) => (list) => {
    tops[m] = list;
    $(recId).textContent = list[0] ? `${list[0].score} ${unit}` : '—';
    if (m === mode) showGoal();
  };
  const boardRunner = createBoard({ key: 'jsthier-top-runner', listEl: $('boardRunner'), unit: 'pts', onRender: onBoard('runner', 'recRunner', 'pts') });
  // un top 3 par niveau de penalty (l'ancien classement devient celui du niveau Normal)
  const penaltyBoards = Object.fromEntries(Object.keys(LEVELS).map(lv => [lv, createBoard({
    key: lv === 'normal' ? 'jsthier-top-penalty' : `jsthier-top-penalty-${lv}`,
    listEl: $('boardPenalty'), unit: 'buts', onRender: onBoard('penalty', 'recPenalty', '/ 5'),
  })]));
  let boardPenalty = penaltyBoards.normal;

  const runner = createRunner({
    wrap: $('runWrap'), canvas: $('runner'),
    overlay: $('rOverlay'), ovTitle: $('rTitle'), ovSub: $('rSub'), startBtn: $('rStart'),
    form: $('rForm'), nameInput: $('rName'),
    scoreEl: $('rScore'), levelEl: $('rLevel'), livesEl: $('rLives'), progEl: $('rProg'),
    jumpBtn: $('rJump'), shootBtn: $('rShoot'),
    onEnd: { qualifies: boardRunner.qualifies, save: boardRunner.add },
  });

  let penaltyScore = 0;
  let savedLevel = 'normal';
  try { savedLevel = localStorage.getItem('jsthier-penalty-level') || 'normal'; } catch {}
  const penalty = createGame({
    wrap: $('gameWrap'), canvas: $('game'), overlay: $('overlay'),
    ovTitle: $('ovTitle'), ovSub: $('ovSub'), startBtn: $('startBtn'),
    shotsEl: $('shots'), goalsEl: $('goals'), bestEl: $('best'),
    level: savedLevel,
    onLevel(lv) {
      boardPenalty = penaltyBoards[lv];
      boardPenalty.render();
      $('pLvlBadge').textContent = LEVELS[lv].label;
      $('pLvlBadge').dataset.level = lv;
      const radio = $('pLevel').querySelector(`input[value="${lv}"]`);
      if (radio) radio.checked = true;
      if (mode === 'penalty') $('boardTitle').textContent = `Tirs au but · ${LEVELS[lv].label}`;
      try { localStorage.setItem('jsthier-penalty-level', lv); } catch {}
    },
    onEnd(goals) {
      penaltyScore = goals;
      const top = boardPenalty.qualifies(goals);
      $('pForm').hidden = !top;
      $('startBtn').hidden = top;
      $('pLevel').hidden = top;
      if (top) requestAnimationFrame(() => $('pName').focus());
    },
  });
  $('pLevel').addEventListener('change', (e) => penalty.setLevel(e.target.value));
  $('pForm').addEventListener('submit', (e) => {
    e.preventDefault();
    boardPenalty.add($('pName').value, penaltyScore);
    $('pForm').hidden = true;
    $('startBtn').hidden = false;
    $('pLevel').hidden = false;
    $('ovSub').textContent = 'Score enregistré dans le top 3.';
  });
  $$('.skip').forEach(b => b.addEventListener('click', () => {
    const r = b.dataset.skip === 'r';
    $(r ? 'rForm' : 'pForm').hidden = true;
    $(r ? 'rStart' : 'startBtn').hidden = false;
    if (!r) $('pLevel').hidden = false;
  }));

  // onglets accessibles (clic + flèches gauche/droite)
  const tabs = $$('.gtab');
  const select = (tab) => {
    mode = tab.dataset.mode;
    tabs.forEach(t => { const on = t === tab; t.setAttribute('aria-selected', String(on)); t.tabIndex = on ? 0 : -1; });
    $$('.game-pane').forEach(p => { p.hidden = p.dataset.pane !== mode; });
    $('boardRunner').hidden = mode !== 'runner';
    $('boardPenalty').hidden = mode !== 'penalty';
    $('boardTitle').textContent = mode === 'runner' ? 'Runner' : `Tirs au but · ${LEVELS[penalty.level].label}`;
    showGoal();
    if (mode !== 'runner') runner.pause();
  };
  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => select(tab));
    tab.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      const next = tabs[(i + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length];
      next.focus(); select(next);
    });
  });
  select(tabs[0]);
}

/* ---------- Démarrage ---------- */
initTheme($('themeBtn'));
initNav();
initReveal();
initPlaceholders();
initHeroShow();
initTeams();
initForm();
initFixtures();
initCarousel();
initGames();
initPwa();
