// Mode runner : on dribble sur le terrain, on saute les tacles (−) et on tire dans les ballons (+)
// Unités du monde en mètres ; conversion en pixels à chaque image (s'adapte au redimensionnement).
const C = {
  navy: '#1a2a5e', navy2: '#0f1a3f', yellow: '#f6d327', white: '#fdfdfb',
  grassA: '#2c7a47', grassB: '#33874f', silver: '#e6e7e9', red: '#c8392b', skin: '#e3b38a',
  skinD: '#c99670', out: '#0b1230', hair: '#151a33', hairHi: '#4256a8',
  redD: '#9c2a1f', sky1: '#5fa8e8', sky2: '#bfe0f7',
};
const LEVEL_M = 220;        // mètres à parcourir pour passer un niveau
const LIVES = 3;
const GRAV = 34, JUMP_V = 12; // saut ≈ 2,1 m de haut

export function createRunner(el) {
  const { wrap, canvas, overlay, ovTitle, ovSub, startBtn, form, nameInput, scoreEl, levelEl, livesEl, progEl, jumpBtn, shootBtn, onEnd } = el;
  const ctx = canvas.getContext('2d');
  let W = 0, H = 0, dpr = 1;
  let S;                       // état de la partie
  let state = 'idle';          // idle | run | paused | over
  let last = 0;

  function reset() {
    S = {
      dist: 0, score: 0, level: 1, lives: LIVES,
      py: 0, vy: 0, onGround: true,
      invuln: 0, shake: 0, cool: 0, t: 0,
      tackles: [], balloons: [], shots: [], parts: [], pops: [],
      nextTackle: 30, nextBalloon: 18,
      banner: { text: 'NIVEAU 1', t: 1.6 },
    };
  }
  reset();

  /* ---------- taille ---------- */
  function layout() {
    const r = wrap.getBoundingClientRect();
    dpr = Math.min(devicePixelRatio || 1, 2);
    W = r.width; H = r.height;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  new ResizeObserver(layout).observe(wrap);
  // ne dessine que lorsque le jeu est à l'écran ; met la partie en pause s'il sort de la vue
  let visible = false;
  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    if (!visible && state === 'run') pauseGame();
  }).observe(wrap);
  document.addEventListener('visibilitychange', () => { if (document.hidden && state === 'run') pauseGame(); });

  const ppm = () => (H * 0.2) / 1.8;              // joueur ≈ 20 % de la hauteur
  const groundY = () => H * 0.82;
  const px0 = () => Math.max(70, W * 0.18);       // position écran du joueur
  const sx = (wx) => px0() + (wx - S.dist) * ppm();
  const sy = (wy) => groundY() - wy * ppm();
  const speed = () => 8 + (S.level - 1) * 1.15;    // m/s

  /* ---------- commandes ---------- */
  function jump() {
    if (state !== 'run') return;
    if (S.onGround) { S.vy = JUMP_V; S.onGround = false; puff(S.dist, 0, 6); }
  }
  function shoot() {
    if (state !== 'run' || S.cool > 0 || S.shots.length >= 2) return;
    S.cool = 0.32;
    S.shots.push({ wx: S.dist + 0.45, wy: S.py + 0.35, spin: 0 });
    S.parts.push({ wx: S.dist + 0.5, wy: S.py + 0.25, vx: 0, vy: 0, t: 0, life: 0.18, c: C.white, r: 0.32, star: true });
  }
  const inView = () => { const r = wrap.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight; };
  addEventListener('keydown', (e) => {
    if (state !== 'run' || !inView() || document.activeElement === nameInput) return;
    if (['Space', 'ArrowUp', 'KeyW', 'KeyZ'].includes(e.code)) { e.preventDefault(); jump(); }
    if (['KeyX', 'KeyD', 'ArrowRight', 'Enter'].includes(e.code)) { e.preventDefault(); shoot(); }
  });
  wrap.addEventListener('pointerdown', (e) => {
    if (state !== 'run' || e.target.closest('button')) return;
    const r = canvas.getBoundingClientRect();
    (e.clientX - r.left < r.width / 2 ? jump : shoot)();
  });
  jumpBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); jump(); });
  shootBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); shoot(); });

  startBtn.addEventListener('click', () => (state === 'paused' ? resume() : start()));
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    onEnd.save(nameInput.value, S.score);
    form.hidden = true;
    startBtn.hidden = false;
    ovSub.textContent = 'Score enregistré dans le top 3.';
  });

  function start() {
    reset();
    overlay.classList.add('hide');
    form.hidden = true;
    state = 'run';
    last = performance.now();
    hud();
  }

  function gameOver() {
    state = 'over';
    S.score = Math.floor(S.score);
    hud();
    ovTitle.textContent = `${S.score} pts`;
    ovSub.textContent = `Niveau ${S.level} atteint · ${Math.floor(S.dist)} m dribblés`;
    startBtn.textContent = 'Rejouer';
    const top = onEnd.qualifies(S.score);
    form.hidden = !top;
    startBtn.hidden = top;
    if (top) { ovSub.textContent += ' · Nouveau top 3 !'; }
    overlay.classList.remove('hide');
    if (top) setTimeout(() => nameInput.focus(), 50);
  }

  /* ---------- logique ---------- */
  function update(dt) {
    S.t += dt;
    const v = speed();
    S.dist += v * dt;
    S.score += Math.round(v * dt * 10) / 10;
    S.cool = Math.max(0, S.cool - dt);
    S.invuln = Math.max(0, S.invuln - dt);
    S.shake = Math.max(0, S.shake - dt);
    if (S.banner) { S.banner.t -= dt; if (S.banner.t <= 0) S.banner = null; }

    // saut
    if (!S.onGround) {
      S.vy -= GRAV * dt;
      S.py += S.vy * dt;
      if (S.py <= 0) { S.py = 0; S.vy = 0; S.onGround = true; puff(S.dist, 0, 4); }
    }

    // niveau suivant
    const lvl = 1 + Math.floor(S.dist / LEVEL_M);
    if (lvl > S.level) {
      S.level = lvl;
      S.score += 100 * (lvl - 1);
      S.banner = { text: `NIVEAU ${lvl}`, sub: `+${100 * (lvl - 1)} bonus`, t: 1.8 };
    }

    // apparitions
    const ahead = S.dist + (W - px0()) / ppm() + 4;
    if (ahead > S.nextTackle) spawnTackle(ahead);
    if (ahead > S.nextBalloon) spawnBalloon(ahead);

    // tacles
    for (const t of S.tackles) {
      t.wx -= t.slide * dt;
      t.anim += dt;
      const hit = S.invuln <= 0 && !t.done &&
        S.dist + 0.25 > t.wx && S.dist - 0.25 < t.wx + t.len &&
        S.py < t.top && S.py + 1.6 > t.bottom;
      if (hit) {
        t.done = true; t.hit = true;
        S.lives--; S.invuln = 1.3; S.shake = 0.35;
        S.pops.push({ wx: S.dist, wy: 2.2, text: 'TACLE !', bad: true, t: 0 });
        if (S.lives <= 0) return gameOver();
      } else if (!t.done && t.wx + t.len < S.dist - 0.3) {
        t.done = true;
        const pts = 25 * S.level;
        S.score += pts;
        S.pops.push({ wx: S.dist, wy: 2.4, text: `+${pts}`, t: 0 });
      }
    }
    S.tackles = S.tackles.filter(t => t.wx + t.len > S.dist - 8);

    // ballons
    for (const b of S.balloons) { b.bob += dt; }
    // tirs
    for (const s of S.shots) {
      s.wx += (v + 20) * dt;
      s.spin += dt * 20;
      for (const b of S.balloons) {
        if (b.popped) continue;
        const by = b.wy + Math.sin(b.bob * 2) * 0.15;
        if (Math.hypot(s.wx - b.wx, s.wy - by) < b.r + 0.2) {
          b.popped = true; s.dead = true;
          const pts = b.gold ? 150 * S.level : 50 * S.level;
          S.score += pts;
          S.pops.push({ wx: b.wx, wy: by + 0.5, text: `+${pts}`, gold: b.gold, t: 0 });
          burst(b.wx, by, b.gold ? C.yellow : b.color);
        }
      }
      for (const t of S.tackles) {
        if (!t.hit && s.wx > t.wx && s.wx < t.wx + t.len && s.wy < t.top && s.wy > t.bottom) s.dead = true;
      }
      if (s.wx > S.dist + (W - px0()) / ppm() + 2) s.dead = true;
    }
    S.shots = S.shots.filter(s => !s.dead);
    S.balloons = S.balloons.filter(b => !b.popped && b.wx > S.dist - 4);

    // particules et textes
    for (const p of S.parts) { p.t += dt; p.wx += p.vx * dt; p.wy += p.vy * dt; p.vy -= 12 * dt; }
    S.parts = S.parts.filter(p => p.t < p.life);
    for (const p of S.pops) p.t += dt;
    S.pops = S.pops.filter(p => p.t < 0.9);
  }

  function spawnTackle(ahead) {
    const L = S.level;
    const r = Math.random();
    let t;
    if (L >= 4 && r < 0.22) t = { len: 1.4, bottom: 0.45, top: 1.15, kind: 'fly' };      // tacle volant
    else t = { len: 1.7, bottom: 0, top: 0.6, kind: 'slide' };                           // tacle glissé
    t.wx = ahead; t.slide = 1.5 + Math.random() * (1 + L * 0.35); t.anim = 0;
    S.tackles.push(t);
    // doublé à partir du niveau 3
    if (L >= 3 && Math.random() < 0.25 + L * 0.03) {
      S.tackles.push({ len: 1.7, bottom: 0, top: 0.6, kind: 'slide', wx: ahead + 2.4, slide: t.slide, anim: 0 });
    }
    const gap = Math.max(8, 17 - L * 1.1);
    S.nextTackle = ahead + gap + Math.random() * 9;
  }

  function spawnBalloon(ahead) {
    const high = Math.random() < 0.45;
    const gold = Math.random() < 0.12;
    S.balloons.push({
      wx: ahead, wy: high ? 2.1 + Math.random() * 0.6 : 0.6 + Math.random() * 0.4,
      r: 0.38, bob: Math.random() * 6, gold,
      color: Math.random() < 0.5 ? C.yellow : C.navy,
    });
    S.nextBalloon = ahead + 7 + Math.random() * 8;
  }

  function puff(wx, wy, n) {
    for (let i = 0; i < n; i++) S.parts.push({ wx, wy: wy + 0.05, vx: -2 - Math.random() * 3, vy: Math.random() * 2, t: 0, life: 0.4, c: 'rgba(253,253,251,.7)', r: 0.08 });
  }
  function burst(wx, wy, c) {
    for (let i = 0; i < 18; i++) {
      const a = Math.random() * Math.PI * 2, s = 3 + Math.random() * 5;
      S.parts.push({ wx, wy, vx: Math.cos(a) * s, vy: Math.sin(a) * s, t: 0, life: 0.7, c: i % 3 ? c : C.white, r: 0.06 + Math.random() * 0.05, rect: i % 2 === 0 });
    }
    S.parts.push({ wx, wy, vx: 0, vy: 0, t: 0, life: 0.35, c: C.white, r: 0.3, ring: true });
    S.parts.push({ wx, wy, vx: 0, vy: 0, t: 0, life: 0.25, c: c, r: 0.45, star: true });
  }

  function hud() {
    scoreEl.textContent = Math.floor(S.score);
    levelEl.textContent = S.level;
    livesEl.innerHTML = Array.from({ length: LIVES }, (_, i) => `<i class="${i < S.lives ? 'on' : ''}"></i>`).join('');
    progEl.style.width = `${((S.dist % LEVEL_M) / LEVEL_M) * 100}%`;
  }

  /* ---------- dessin ---------- */
  function draw() {
    const g = groundY(), m = ppm();
    ctx.save();
    if (S.shake > 0) ctx.translate((Math.random() - 0.5) * 10 * S.shake, (Math.random() - 0.5) * 10 * S.shake);
    ctx.clearRect(-20, -20, W + 40, H + 40);

    // ciel bleu d'anime, nuages en parallaxe
    const sky = ctx.createLinearGradient(0, 0, 0, H * 0.4);
    sky.addColorStop(0, C.sky1); sky.addColorStop(1, C.sky2);
    ctx.fillStyle = sky; ctx.fillRect(-20, -20, W + 40, H + 40);
    const cw = W + m * 12;
    for (let i = 0; i < 3; i++) {
      const cx = ((i * cw / 3 - S.dist * m * 0.06) % cw + cw) % cw - m * 4;
      cloud(cx, H * (0.07 + i * 0.035), m * (1 + i * 0.25));
    }

    // tribune (parallaxe lente)
    const standTop = H * 0.2, standBot = g - m * 2.6;
    ctx.fillStyle = C.navy2; ctx.fillRect(-20, standTop, W + 40, standBot - standTop);
    const off = (S.dist * m * 0.25) % 22;
    for (let y = standTop + 10; y < standBot - 6; y += 16) {
      for (let x = -off - 22; x < W + 22; x += 22) {
        const k = (Math.floor((x + S.dist * m * 0.25) / 22) * 7 + y) % 5;
        ctx.fillStyle = k === 0 ? C.yellow : k === 1 ? C.white : 'rgba(253,253,251,.22)';
        const jump = state === 'run' && k < 2 ? Math.abs(Math.sin(S.t * 6 + x)) * 3 : 0;
        ctx.beginPath(); ctx.arc(x + (y % 32 ? 11 : 0), y - jump, 4, 0, Math.PI * 2); ctx.fill();
      }
    }

    // panneaux publicitaires
    const adH = m * 0.9, adY = standBot;
    ctx.fillStyle = C.yellow; ctx.fillRect(-20, adY, W + 40, adH);
    ctx.fillStyle = C.navy;
    ctx.font = `700 ${adH * 0.5}px "Avenir Next Condensed","Arial Narrow",sans-serif`;
    ctx.textBaseline = 'middle';
    const label = 'JS THIER À LIÈGE  ·  1906  ·  ';
    const lw = ctx.measureText(label).width;
    const aoff = (S.dist * m * 0.6) % lw;
    for (let x = -aoff; x < W + lw; x += lw) ctx.fillText(label, x, adY + adH / 2);

    // pelouse rayée
    const stripe = m * 4;
    const goff = (S.dist * m) % (stripe * 2);
    ctx.fillStyle = C.grassA; ctx.fillRect(-20, adY + adH, W + 40, H);
    ctx.fillStyle = C.grassB;
    for (let x = -goff; x < W + stripe; x += stripe * 2) ctx.fillRect(x, adY + adH, stripe, H);
    // ligne de touche
    ctx.fillStyle = 'rgba(253,253,251,.85)';
    ctx.fillRect(-20, g + m * 0.25, W + 40, 3);
    // cercle central de temps en temps
    const cwx = Math.ceil(S.dist / 60) * 60;
    ctx.strokeStyle = 'rgba(253,253,251,.6)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.ellipse(sx(cwx), g + m * 0.7, m * 3, m * 0.35, 0, 0, Math.PI * 2); ctx.stroke();

    // ballons (+)
    for (const b of S.balloons) drawBalloon(b);
    // tacles (−)
    for (const t of S.tackles) drawTackler(t);
    // joueur
    drawPlayer();
    // tirs : traînée de comète + halo
    for (const s of S.shots) {
      const bx = sx(s.wx), by = sy(s.wy), r = m * 0.2;
      const tg = ctx.createLinearGradient(bx - m * 2.2, by, bx, by);
      tg.addColorStop(0, 'rgba(246,211,39,0)'); tg.addColorStop(1, 'rgba(246,211,39,.75)');
      ctx.fillStyle = tg;
      ctx.beginPath(); ctx.moveTo(bx, by - r * 1.1); ctx.lineTo(bx - m * 2.2, by - r * 0.2); ctx.lineTo(bx - m * 2.2, by + r * 0.2); ctx.lineTo(bx, by + r * 1.1); ctx.fill();
      ctx.strokeStyle = 'rgba(253,253,251,.8)'; ctx.lineWidth = 1.6;
      for (const o of [-0.9, 0, 0.9]) { ctx.beginPath(); ctx.moveTo(bx - r * 1.4, by + o * r); ctx.lineTo(bx - m * (1 + Math.abs(o) * 0.6), by + o * r); ctx.stroke(); }
      const ag = ctx.createRadialGradient(bx, by, r * 0.6, bx, by, r * 2.2);
      ag.addColorStop(0, 'rgba(246,211,39,.5)'); ag.addColorStop(1, 'rgba(246,211,39,0)');
      ctx.fillStyle = ag; ctx.beginPath(); ctx.arc(bx, by, r * 2.2, 0, Math.PI * 2); ctx.fill();
      drawBall(bx, by, r, s.spin);
    }
    // particules, ondes et étoiles d'impact
    for (const p of S.parts) {
      const k = p.t / p.life, px = sx(p.wx), py = sy(p.wy);
      ctx.globalAlpha = 1 - k;
      if (p.ring) {
        ctx.strokeStyle = p.c; ctx.lineWidth = 4 * (1 - k) + 1;
        ctx.beginPath(); ctx.arc(px, py, p.r * m * (1 + k * 2.5), 0, Math.PI * 2); ctx.stroke();
      } else if (p.star) {
        star(px, py, p.r * m * (0.8 + k * 0.8), p.c);
      } else if (p.rect) {
        ctx.save(); ctx.translate(px, py); ctx.rotate(p.t * 12); ctx.fillStyle = p.c;
        ctx.fillRect(-p.r * m, -p.r * m * 0.5, p.r * m * 2, p.r * m); ctx.restore();
      } else {
        ctx.fillStyle = p.c;
        ctx.beginPath(); ctx.arc(px, py, p.r * m, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
    // textes de points
    for (const p of S.pops) {
      ctx.globalAlpha = 1 - p.t / 0.9;
      ctx.font = `italic 900 ${m * (p.gold ? 0.8 : 0.6)}px "Avenir Next Condensed","Arial Narrow",sans-serif`;
      ctx.textAlign = 'center';
      ctx.lineJoin = 'round';
      ctx.lineWidth = 6; ctx.strokeStyle = C.out;
      ctx.fillStyle = p.bad ? C.red : C.yellow;
      const y = sy(p.wy) - p.t * m * 1.2;
      ctx.strokeText(p.text, sx(p.wx), y); ctx.fillText(p.text, sx(p.wx), y);
    }
    ctx.globalAlpha = 1; ctx.textAlign = 'left';

    // bannière de niveau
    if (S.banner && state === 'run') {
      const k = Math.min(1, (1.8 - S.banner.t) * 5);
      ctx.save();
      ctx.globalAlpha = Math.min(1, S.banner.t * 2);
      ctx.translate(W / 2, H * 0.42);
      ctx.rotate(-0.04);
      ctx.scale(0.7 + 0.3 * k, 0.7 + 0.3 * k);
      // bandeau en parallélogramme, façon générique d'anime
      const bw = W * 0.34, bh = m * 0.78;
      ctx.beginPath(); ctx.moveTo(-bw + bh * 0.6, -bh); ctx.lineTo(bw + bh * 0.6, -bh); ctx.lineTo(bw - bh * 0.6, bh); ctx.lineTo(-bw - bh * 0.6, bh); ctx.closePath();
      ctx.fillStyle = C.navy; ctx.fill();
      ctx.lineWidth = 4; ctx.strokeStyle = C.yellow; ctx.stroke();
      ctx.fillStyle = C.yellow; ctx.textAlign = 'center';
      ctx.font = `italic 900 ${m * 1}px "Avenir Next Condensed","Arial Narrow",sans-serif`;
      ctx.fillText(S.banner.text, 0, S.banner.sub ? -m * 0.1 : 0);
      if (S.banner.sub) {
        ctx.font = `600 ${m * 0.35}px "Avenir Next","Segoe UI",sans-serif`;
        ctx.fillStyle = C.white; ctx.fillText(S.banner.sub, 0, m * 0.5);
      }
      ctx.restore();
    }
    ctx.restore();
  }

  /* ---------- personnages : style dessin animé 90s (contours épais, articulations) ---------- */
  // Coordonnées en mètres (y vers le haut) depuis l'origine courante ; P() convertit en pixels.
  const P = (x, y) => [x * ppm(), -y * ppm()];
  const OL = () => Math.max(2, ppm() * 0.045);  // épaisseur du contour
  function line(pts, w, color) {
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.strokeStyle = C.out; ctx.lineWidth = w + OL() * 2; ctx.stroke();
    ctx.strokeStyle = color; ctx.lineWidth = w; ctx.stroke();
  }
  function shape(pts, color) {
    ctx.lineJoin = 'round';
    ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath();
    ctx.fillStyle = color; ctx.fill();
    ctx.strokeStyle = C.out; ctx.lineWidth = OL(); ctx.stroke();
  }
  const add = (a, b, k = 1) => [a[0] + b[0] * k, a[1] + b[1] * k];
  const dirDown = (a) => [Math.sin(a), -Math.cos(a)]; // angle 0 = vers le bas, + = vers l'avant

  // jambe : hanche -> genou -> pied, avec cuisse, chaussette rayée et crampon
  function leg(hip, th, bend, kit, back) {
    const knee = add(hip, dirDown(th), 0.46);
    const sa = th - bend;
    legPts(hip, knee, add(knee, dirDown(sa), 0.46), kit, back, 1, -sa * 0.5);
  }
  function legPts(hip, knee, foot, kit, back, face = 1, bootRot = 0) {
    const m = ppm();
    const sd = [foot[0] - knee[0], foot[1] - knee[1]], sl = Math.hypot(...sd);
    const u = [sd[0] / sl, sd[1] / sl];
    const sock = add(knee, u, sl * 0.35), stripe = add(knee, u, sl * 0.5);
    line([P(...hip), P(...knee)], m * 0.15, back ? C.skinD : C.skin);
    line([P(...knee), P(...sock)], m * 0.12, back ? C.skinD : C.skin);
    line([P(...sock), P(...foot)], m * 0.125, back ? kit.sockD : kit.sock);
    ctx.strokeStyle = kit.stripe; ctx.lineWidth = m * 0.035; ctx.lineCap = 'butt';
    ctx.beginPath(); ctx.moveTo(...P(...stripe)); ctx.lineTo(...P(...add(stripe, u, 0.04))); ctx.stroke();
    // chaussure orientée vers l'avant
    const [fx, fy] = P(...foot);
    ctx.save(); ctx.translate(fx, fy); ctx.rotate(bootRot);
    ctx.beginPath(); ctx.ellipse(face * m * 0.07, -m * 0.01, m * 0.12, m * 0.055, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#16161c'; ctx.fill(); ctx.strokeStyle = C.out; ctx.lineWidth = OL(); ctx.stroke();
    ctx.fillStyle = C.white; ctx.fillRect(face > 0 ? m * 0.02 : -m * 0.1, -m * 0.03, m * 0.08, m * 0.018);
    ctx.restore();
  }
  // bras : épaule -> coude -> main, manche courte
  function arm(sh, ua, eb, kit, back) {
    const elbow = add(sh, dirDown(ua), 0.29);
    armPts(sh, elbow, add(elbow, dirDown(ua + eb), 0.27), kit, back);
  }
  function armPts(sh, elbow, hand, kit, back) {
    const m = ppm();
    const sleeve = [sh[0] + (elbow[0] - sh[0]) * 0.4, sh[1] + (elbow[1] - sh[1]) * 0.4];
    line([P(...sh), P(...sleeve)], m * 0.13, back ? kit.shirtD : kit.shirt);
    line([P(...sleeve), P(...elbow), P(...hand)], m * 0.095, back ? C.skinD : C.skin);
  }
  const neck = (sh, hc) => line([P(...sh), P(...hc)], ppm() * 0.08, C.skin);
  // torse effilé (épaules larges, taille fine) avec motif du maillot
  function torso(hip, sh, kit) {
    const ax = [sh[0] - hip[0], sh[1] - hip[1]];
    const len = Math.hypot(...ax);
    const d = [ax[0] / len, ax[1] / len], n = [d[1], -d[0]];
    const waist = add(hip, d, 0.05);
    const pts = [add(waist, n, -0.13), add(waist, n, 0.13), add(sh, n, 0.17), add(sh, n, -0.15)].map(p => P(...p));
    shape(pts, kit.shirt);
    ctx.save();
    ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); ctx.clip();
    kit.pattern(pts);
    ctx.restore();
    ctx.strokeStyle = C.out; ctx.lineWidth = OL();
    ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); ctx.stroke();
  }
  // tête : grands yeux, sourcils déterminés, cheveux en pointes au vent
  function head(c, kit, face = 1, mood = 'focus') {
    const m = ppm(), [hx, hy] = P(...c), r = m * 0.125;
    const sway = Math.sin(S.t * 18) * m * 0.012;
    ctx.save(); ctx.translate(hx, hy); ctx.scale(face, 1);
    // cheveux arrière
    const spikes = [[0.1, 0.07], [0.12, 0.15], [0.04, 0.13], [0.02, 0.24], [-0.05, 0.14], [-0.17, 0.22], [-0.13, 0.09], [-0.27, 0.08], [-0.13, 0.0], [-0.22, -0.08], [-0.1, -0.05], [-0.09, -0.11]];
    ctx.beginPath();
    spikes.forEach(([x, y], i) => { const px = x * m + (x < -0.1 ? sway * 2 : 0), py = -y * m; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); });
    ctx.closePath(); ctx.fillStyle = kit.hair; ctx.fill(); ctx.strokeStyle = C.out; ctx.lineWidth = OL(); ctx.stroke();
    // visage
    ctx.beginPath(); ctx.ellipse(m * 0.015, m * 0.005, r * 0.95, r, 0, 0, Math.PI * 2);
    ctx.fillStyle = C.skin; ctx.fill(); ctx.stroke();
    // mèche avant par-dessus le front
    ctx.beginPath(); ctx.moveTo(-m * 0.1, -m * 0.06); ctx.lineTo(m * 0.02, -m * 0.135); ctx.lineTo(m * 0.13, -m * 0.07);
    ctx.lineTo(m * 0.07, -m * 0.06); ctx.lineTo(m * 0.09, -m * 0.02); ctx.lineTo(m * 0.02, -m * 0.06); ctx.lineTo(-m * 0.04, -m * 0.01); ctx.closePath();
    ctx.fillStyle = kit.hair; ctx.fill(); ctx.stroke();
    ctx.strokeStyle = C.hairHi; ctx.lineWidth = m * 0.018;
    ctx.beginPath(); ctx.moveTo(-m * 0.12, -m * 0.12); ctx.quadraticCurveTo(-m * 0.04, -m * 0.17, m * 0.03, -m * 0.12); ctx.stroke();
    // oreille
    ctx.beginPath(); ctx.ellipse(-m * 0.035, m * 0.01, m * 0.025, m * 0.035, 0, 0, Math.PI * 2);
    ctx.fillStyle = C.skinD; ctx.fill(); ctx.lineWidth = 1.2 * m; ctx.stroke();
    // œil d'anime
    ctx.beginPath(); ctx.ellipse(m * 0.075, -m * 0.005, m * 0.03, m * 0.042, 0, 0, Math.PI * 2);
    ctx.fillStyle = C.white; ctx.fill(); ctx.lineWidth = OL() * 0.7; ctx.stroke();
    ctx.beginPath(); ctx.ellipse(m * 0.085, 0, m * 0.018, m * 0.03, 0, 0, Math.PI * 2);
    ctx.fillStyle = kit.eye; ctx.fill();
    ctx.beginPath(); ctx.arc(m * 0.09, -m * 0.012, m * 0.007, 0, Math.PI * 2);
    ctx.fillStyle = C.white; ctx.fill();
    // sourcil
    ctx.strokeStyle = C.out; ctx.lineWidth = m * 0.02; ctx.lineCap = 'round';
    ctx.beginPath();
    if (mood === 'angry') { ctx.moveTo(m * 0.045, -m * 0.07); ctx.lineTo(m * 0.115, -m * 0.045); }
    else { ctx.moveTo(m * 0.045, -m * 0.06); ctx.lineTo(m * 0.115, -m * 0.068); }
    ctx.stroke();
    // bouche
    ctx.lineWidth = m * 0.012;
    ctx.beginPath(); ctx.moveTo(m * 0.07, m * 0.065); ctx.lineTo(m * 0.105, m * (mood === 'angry' ? 0.07 : 0.06)); ctx.stroke();
    ctx.restore();
  }

  const KIT_JS = {
    shirt: C.yellow, shirtD: '#d9b81a', shorts: C.navy, sock: C.navy, sockD: C.navy2, stripe: C.yellow,
    hair: C.hair, eye: C.navy,
    pattern(pts) { // bande diagonale marine et fines rayures, comme le vrai maillot
      const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
      const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys), m = ppm();
      ctx.strokeStyle = 'rgba(15,26,63,.18)'; ctx.lineWidth = 1;
      for (let y = y0; y < y1; y += m * 0.06) { ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke(); }
      ctx.strokeStyle = C.navy; ctx.lineWidth = m * 0.12;
      ctx.beginPath(); ctx.moveTo(x0 - m * 0.1, y1 - m * 0.05); ctx.lineTo(x1 + m * 0.1, y0 + m * 0.12); ctx.stroke();
    },
  };
  const KIT_RIVAL = {
    shirt: C.red, shirtD: C.redD, shorts: C.white, sock: C.red, sockD: C.redD, stripe: C.white,
    hair: '#4a2a17', eye: '#3a1a10',
    pattern(pts) { // rayures verticales blanches
      const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]), m = ppm();
      ctx.strokeStyle = 'rgba(253,253,251,.75)'; ctx.lineWidth = m * 0.05;
      for (let x = Math.min(...xs); x < Math.max(...xs); x += m * 0.14) { ctx.beginPath(); ctx.moveTo(x, Math.min(...ys)); ctx.lineTo(x + m * 0.06, Math.max(...ys)); ctx.stroke(); }
    },
  };
  function shorts(hip, lean, kit) {
    const n = [Math.cos(lean), -Math.sin(lean)], d = [Math.sin(lean), Math.cos(lean)];
    shape([add(add(hip, n, -0.15), d, 0.1), add(add(hip, n, 0.16), d, 0.1), add(add(hip, n, 0.19), d, -0.13), add(add(hip, n, -0.17), d, -0.15)].map(p => P(...p)), kit.shorts);
  }

  function drawPlayer() {
    const m = ppm(), x = px0(), y = sy(S.py);
    if (S.invuln > 0 && Math.floor(S.invuln * 12) % 2) return;
    // ombre au sol
    ctx.fillStyle = 'rgba(0,0,0,.2)';
    ctx.beginPath(); ctx.ellipse(x, groundY(), m * 0.45 * (1 - S.py / 4), m * 0.08, 0, 0, Math.PI * 2); ctx.fill();
    // lignes de vitesse, comme dans les dessins animés de l'époque
    if (state === 'run') {
      ctx.strokeStyle = 'rgba(253,253,251,.6)'; ctx.lineCap = 'round';
      for (let i = 0; i < 6; i++) {
        const ly = y - m * (0.25 + i * 0.28);
        const k = ((S.t * 2.2 + i * 0.37) % 1);
        const lx = x - m * (0.5 + k * 2.2);
        ctx.lineWidth = 2 + (i % 2);
        ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(lx - m * (0.6 + (i % 3) * 0.3) * (1 - k), ly); ctx.stroke();
      }
    }
    const ph = S.onGround ? S.t * speed() * 1.35 : 0;
    const bob = S.onGround ? Math.abs(Math.sin(ph)) * 0.05 : 0;
    const lean = S.onGround ? 0.22 : 0.1;
    ctx.save(); ctx.translate(x, y);
    const hip = [0, 0.93 + bob];
    const sh = add(hip, [Math.sin(lean), Math.cos(lean)], 0.5);
    const pose = (p) => ({ th: Math.sin(p) * 0.8, bend: 0.25 + Math.max(0, -Math.cos(p)) * 1.35 });
    const [lb, lf] = S.onGround ? [pose(ph + Math.PI), pose(ph)] : [{ th: -0.5, bend: 1.0 }, { th: 1.2, bend: 1.8 }];
    const [ab, af] = S.onGround ? [Math.sin(ph) * 0.9, -Math.sin(ph) * 0.9] : [-0.7, 2.5];
    arm(add(sh, [-0.03, 0]), ab, 1.3, KIT_JS, true);
    leg(hip, lb.th, lb.bend, KIT_JS, true);
    leg(hip, lf.th, lf.bend, KIT_JS, false);
    shorts(hip, lean, KIT_JS);
    torso(hip, sh, KIT_JS);
    const hc = add(sh, [Math.sin(lean) * 0.2 + 0.03, 0.2]);
    neck(sh, hc);
    head(hc, KIT_JS, 1, 'focus');
    arm(sh, af, S.onGround ? 1.4 : -0.4, KIT_JS, false);
    ctx.restore();
    // ballon au pied (dribble)
    if (S.cool < 0.15) {
      const bx = x + m * 0.5 + Math.abs(Math.sin(S.t * 6)) * m * 0.1;
      const by = y - m * 0.15 - (S.onGround ? Math.abs(Math.sin(S.t * 6)) * m * 0.2 : 0);
      drawBall(bx, by, m * 0.17, S.t * 12);
    }
  }

  function drawTackler(t) {
    const m = ppm();
    const x = sx(t.wx), base = sy(t.bottom);
    ctx.save(); ctx.translate(x, base);
    // l'adversaire arrive face au joueur (vers la gauche) : face = -1, coordonnées en mètres depuis l'avant
    const F = -1;
    if (t.kind === 'slide') {
      // gerbe d'herbe et de terre derrière la glissade
      for (let i = 0; i < 7; i++) {
        const k = (t.anim * 3 + i * 0.17) % 1;
        const [gx, gy] = P(1.1 + i * 0.12 + k * 0.5, 0.05 + Math.sin(k * Math.PI) * 0.35);
        ctx.globalAlpha = 1 - k;
        ctx.fillStyle = i % 3 ? '#3f9a5b' : '#6b4a2a';
        ctx.beginPath(); ctx.ellipse(gx, gy, m * 0.05, m * 0.03, k * 3, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.fillStyle = 'rgba(253,253,251,.4)'; ctx.fillRect(m * 0.4, -m * 0.04, m * 1.8, m * 0.05);
      const hip = [1.0, 0.3], sh = [1.42, 0.64];
      armPts(sh, [1.62, 0.38], [1.7, 0.06], KIT_RIVAL, true);           // bras d'appui au sol, derrière
      legPts(hip, [0.78, 0.52], [0.62, 0.16], KIT_RIVAL, true, F);      // jambe repliée
      shorts(hip, 0.9, KIT_RIVAL);
      torso(hip, sh, KIT_RIVAL);
      neck(sh, [1.56, 0.82]);
      head([1.56, 0.82], KIT_RIVAL, F, 'angry');
      // jambe tendue, crampons vers le joueur
      line([P(...hip), P(0.52, 0.22)], m * 0.15, C.skin);
      line([P(0.52, 0.22), P(0.36, 0.19)], m * 0.12, C.skin);
      line([P(0.36, 0.19), P(0.08, 0.15)], m * 0.125, KIT_RIVAL.sock);
      const [fx, fy] = P(0.04, 0.16);
      ctx.beginPath(); ctx.ellipse(fx, fy, m * 0.11, m * 0.06, -1.2, 0, Math.PI * 2);
      ctx.fillStyle = '#16161c'; ctx.fill(); ctx.strokeStyle = C.out; ctx.lineWidth = OL(); ctx.stroke();
      ctx.fillStyle = '#9aa0ad';
      for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.arc(fx - m * 0.08, fy + i * m * 0.04, m * 0.015, 0, Math.PI * 2); ctx.fill(); }
      armPts(sh, [1.3, 0.88], [1.12, 1.0], KIT_RIVAL, false);           // bras levé pour l'équilibre
    } else {
      // tacle volant, corps à l'horizontale
      ctx.strokeStyle = 'rgba(253,253,251,.6)'; ctx.lineWidth = 2;
      for (let i = 0; i < 4; i++) { const [lx, ly] = P(1.8 + i * 0.15, 0.15 + i * 0.12); ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(lx + m * 0.8, ly); ctx.stroke(); }
      const hip = [0.9, 0.24], sh = [1.38, 0.32];
      armPts(sh, [1.62, 0.2], [1.86, 0.24], KIT_RIVAL, true);
      legPts(hip, [0.62, 0.5], [0.86, 0.62], KIT_RIVAL, true, F);
      shorts(hip, 1.4, KIT_RIVAL);
      torso(hip, sh, KIT_RIVAL);
      neck(sh, [1.58, 0.4]);
      head([1.58, 0.4], KIT_RIVAL, F, 'angry');
      line([P(...hip), P(0.45, 0.2)], m * 0.15, C.skin);
      line([P(0.45, 0.2), P(0.3, 0.19)], m * 0.12, C.skin);
      line([P(0.3, 0.19), P(0.05, 0.18)], m * 0.125, KIT_RIVAL.sock);
      const [fx, fy] = P(0.02, 0.18);
      ctx.beginPath(); ctx.ellipse(fx, fy, m * 0.11, m * 0.06, -1.4, 0, Math.PI * 2);
      ctx.fillStyle = '#16161c'; ctx.fill(); ctx.strokeStyle = C.out; ctx.lineWidth = OL(); ctx.stroke();
      armPts(sh, [1.35, 0.55], [1.15, 0.68], KIT_RIVAL, false);
    }
    // pastille −
    if (!t.done) {
      const [px, py] = P(0.9, t.kind === 'slide' ? 1.25 : 0.95);
      ctx.beginPath(); ctx.arc(px, py, m * 0.2, 0, Math.PI * 2);
      ctx.fillStyle = C.red; ctx.fill(); ctx.strokeStyle = C.out; ctx.lineWidth = OL(); ctx.stroke();
      ctx.fillStyle = C.white; ctx.fillRect(px - m * 0.1, py - m * 0.03, m * 0.2, m * 0.06);
    }
    ctx.restore();
  }

  function cloud(x, y, s) {
    ctx.fillStyle = 'rgba(255,255,255,.95)';
    ctx.beginPath();
    [[0, 0, 0.55], [0.6, -0.25, 0.7], [1.3, 0, 0.55], [0.65, 0.15, 0.6]].forEach(([dx, dy, r]) => { ctx.moveTo(x + dx * s + r * s, y + dy * s); ctx.arc(x + dx * s, y + dy * s, r * s, 0, Math.PI * 2); });
    ctx.fill();
    ctx.fillStyle = 'rgba(95,168,232,.25)';
    ctx.beginPath(); ctx.ellipse(x + 0.65 * s, y + 0.45 * s, 1.1 * s, 0.18 * s, 0, 0, Math.PI * 2); ctx.fill();
  }

  // ballon de baudruche : dégradé, contour épais, nœud et ficelle
  function drawBalloon(b) {
    const m = ppm(), x = sx(b.wx), y = sy(b.wy + Math.sin(b.bob * 2) * 0.15), r = b.r * m;
    const base = b.gold ? C.yellow : b.color;
    ctx.strokeStyle = 'rgba(11,18,48,.55)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(x, y + r * 1.05); ctx.quadraticCurveTo(x - r * 0.5 + Math.sin(b.bob * 3) * r * 0.2, y + r * 2, x, y + r * 2.9); ctx.stroke();
    if (b.gold) { // halo scintillant
      const hg = ctx.createRadialGradient(x, y, r * 0.8, x, y, r * 2);
      hg.addColorStop(0, 'rgba(246,211,39,.45)'); hg.addColorStop(1, 'rgba(246,211,39,0)');
      ctx.fillStyle = hg; ctx.beginPath(); ctx.arc(x, y, r * 2, 0, Math.PI * 2); ctx.fill();
    }
    const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r * 1.1);
    g.addColorStop(0, b.color === C.navy && !b.gold ? '#4a62b8' : '#fff6b0'); g.addColorStop(0.5, base); g.addColorStop(1, b.color === C.navy && !b.gold ? C.navy2 : '#c9a40c');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.ellipse(x, y, r * 0.88, r, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = C.out; ctx.lineWidth = OL(); ctx.stroke();
    // nœud
    ctx.beginPath(); ctx.moveTo(x - r * 0.12, y + r * 1.12); ctx.lineTo(x + r * 0.12, y + r * 1.12); ctx.lineTo(x, y + r * 0.96); ctx.closePath();
    ctx.fillStyle = base; ctx.fill(); ctx.stroke();
    // reflet
    ctx.fillStyle = 'rgba(255,255,255,.7)';
    ctx.beginPath(); ctx.ellipse(x - r * 0.32, y - r * 0.38, r * 0.14, r * 0.26, -0.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = b.color === C.navy && !b.gold ? C.yellow : C.navy;
    ctx.font = `italic 900 ${r * (b.gold ? 0.75 : 0.95)}px "Avenir Next Condensed","Arial Narrow",sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(b.gold ? '★+' : '+', x, y + r * 0.05);
    if (b.gold && Math.sin(S.t * 8 + b.bob) > 0.6) star(x + r * 0.7, y - r * 0.8, r * 0.35, C.white);
    ctx.textAlign = 'left';
  }

  function star(x, y, r, color) {
    ctx.save(); ctx.translate(x, y);
    ctx.beginPath();
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2, rr = i % 2 ? r * 0.42 : r * (i % 4 ? 0.75 : 1);
      ctx[i ? 'lineTo' : 'moveTo'](Math.cos(a) * rr, Math.sin(a) * rr);
    }
    ctx.closePath(); ctx.fillStyle = color; ctx.fill();
    ctx.strokeStyle = C.out; ctx.lineWidth = 1.6; ctx.stroke();
    ctx.restore();
  }

  function drawBall(x, y, r, spin) {
    ctx.save(); ctx.translate(x, y);
    ctx.save(); ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.clip();
    const g = ctx.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.1, 0, 0, r * 1.05);
    g.addColorStop(0, '#ffffff'); g.addColorStop(0.65, '#eef0f4'); g.addColorStop(1, '#a9b1c6');
    ctx.fillStyle = g; ctx.fillRect(-r, -r, r * 2, r * 2);
    ctx.rotate(spin);
    ctx.fillStyle = C.navy2;
    pent(0, 0, r * 0.4);
    for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; pent(Math.cos(a) * r * 0.9, Math.sin(a) * r * 0.9, r * 0.26); }
    ctx.restore();
    ctx.fillStyle = 'rgba(255,255,255,.9)';
    ctx.beginPath(); ctx.ellipse(-r * 0.38, -r * 0.42, r * 0.2, r * 0.12, -0.6, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = C.out; ctx.lineWidth = Math.max(1.5, r * 0.14);
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }
  function pent(x, y, r) {
    ctx.beginPath();
    for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2 - Math.PI / 2; ctx[i ? 'lineTo' : 'moveTo'](x + Math.cos(a) * r, y + Math.sin(a) * r); }
    ctx.closePath(); ctx.fill();
  }
  function rr(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); ctx.fill();
  }

  /* ---------- boucle ---------- */
  function loop(now) {
    const dt = Math.min(0.05, (now - last) / 1000 || 0);
    last = now;
    if (W && visible) {
      if (state === 'run') { update(dt); hud(); }
      else S.t += dt;
      draw();
    }
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
  hud();

  // pause (onglet changé, jeu hors écran ou onglet du navigateur masqué) : la partie peut reprendre
  function pauseGame() {
    if (state !== 'run') return;
    state = 'paused';
    ovTitle.textContent = 'Pause';
    ovSub.textContent = `${Math.floor(S.score)} pts · niveau ${S.level}`;
    startBtn.textContent = 'Reprendre';
    startBtn.hidden = false; form.hidden = true;
    overlay.classList.remove('hide');
  }
  function resume() {
    state = 'run';
    last = performance.now();
    overlay.classList.add('hide');
  }

  return { pause: pauseGame };
}
