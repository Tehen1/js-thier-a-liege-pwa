// Mini-jeu de tirs au but — canvas, sans dépendance
const SHOTS = 5;
// Niveaux : read = le gardien devine le bon côté, reach = taille de ses gants,
// spread = dispersion du tir, delay/move = temps de réaction et vitesse du plongeon (ms), shake = cible qui tremble
export const LEVELS = {
  facile: { label: 'Facile', read: 0.06, reach: 0.085, spread: 0.6, delay: 170, move: 540, shake: 0, ball: 600 },
  normal: { label: 'Normal', read: 0.2, reach: 0.11, spread: 1, delay: 90, move: 420, shake: 0, ball: 560 },
  pro: { label: 'Pro', read: 0.42, reach: 0.13, spread: 1.3, delay: 40, move: 320, shake: 0.018, ball: 500 },
};
const bestKey = (lv) => (lv === 'normal' ? 'jsthier-best' : `jsthier-best-${lv}`);
const C = {
  grassA: '#1d5b38', grassB: '#246b43', chalk: '#fdfbf5',
  ink: '#1a2a5e', keeper: '#f6d327', flag: '#f6d327',
};

export function createGame(el) {
  const { wrap, canvas, overlay, ovTitle, ovSub, startBtn, shotsEl, goalsEl, bestEl } = el;
  const ctx = canvas.getContext('2d');
  let W = 0, H = 0, dpr = 1, L = {};
  let state = 'idle';           // idle | aim | flying | result | over
  let aim = { x: 0, y: 0 };
  let shot = null, keeper = null, results = [], flash = null, t0 = 0;
  let parts = [], fx = [], ripple = null;   // effets : particules, ondes, filet qui bouge
  function burst(x, y, n, colors, speed, confetti = false) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, v = speed * (0.4 + Math.random());
      parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - (confetti ? 2 : 0), g: confetti ? 0.12 : 0.08, life: confetti ? 70 + Math.random() * 40 : 30, age: 0, r: confetti ? 3 : 2.2, c: colors[i % colors.length], rect: confetti, rot: Math.random() * 6 });
    }
  }
  let level = 'normal', lv = LEVELS.normal, best = 0;
  function setLevel(name) {
    if (!LEVELS[name] || state === 'aim' || state === 'flying') return;
    level = name; lv = LEVELS[name];
    try { best = +localStorage.getItem(bestKey(level)) || 0; } catch { best = 0; }
    bestEl.textContent = best;
    el.onLevel?.(level);
  }
  setLevel(el.level || 'normal');

  /* ---------- mise en page ---------- */
  function layout() {
    const r = wrap.getBoundingClientRect();
    dpr = Math.min(devicePixelRatio || 1, 2);
    W = r.width; H = r.height;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const gw = Math.min(W * 0.7, 600);
    const gh = gw * 0.36;
    L = {
      gw, gh,
      gx: (W - gw) / 2,
      gy: H * 0.13,
      ballX: W / 2,
      ballY: H * 0.84,
      ballR: Math.max(10, gw * 0.03),
    };
    if (!keeper || state !== 'flying') keeper = idleKeeper();
    if (state !== 'flying') aim = { x: W / 2, y: L.gy + gh / 2 };
  }
  new ResizeObserver(layout).observe(wrap);
  let visible = false; // pas de dessin hors écran
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(wrap);

  const idleKeeper = () => ({ x: L.gx + L.gw / 2, y: L.gy + L.gh, fromX: L.gx + L.gw / 2, fromY: L.gy + L.gh, toX: L.gx + L.gw / 2, toY: L.gy + L.gh, tilt: 0, toTilt: 0 });

  /* ---------- entrées ---------- */
  function toLocal(e) {
    const r = canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }
  wrap.addEventListener('pointermove', (e) => { if (state === 'aim') aim = toLocal(e); });
  wrap.addEventListener('pointerdown', (e) => {
    if (state !== 'aim') return;
    aim = toLocal(e);
    if (aim.y > L.ballY - L.ballR * 2) return; // clic sur le ballon : ignoré
    shoot();
  });

  startBtn.addEventListener('click', start);

  function start() {
    results = [];
    renderHud();
    overlay.classList.add('hide');
    keeper = idleKeeper();
    state = 'aim';
  }

  /* ---------- tir ---------- */
  function shoot() {
    const cx = L.gx + L.gw / 2, cy = L.gy + L.gh / 2;
    // plus on vise loin du centre, plus le tir dévie (réglage adouci)
    const off = Math.min(1, Math.hypot((aim.x - cx) / (L.gw / 2), (aim.y - cy) / (L.gh / 2)));
    const spread = L.gw * (0.015 + 0.045 * off * off) * lv.spread;
    const { x: ax, y: ay } = shaken(performance.now());
    const tx = ax + gauss() * spread;
    const ty = ay + gauss() * spread * 0.7;
    shot = { sx: L.ballX, sy: L.ballY, tx, ty, dur: lv.ball, trail: [] };

    // le gardien choisit un côté ; plus le niveau monte, plus il lit le tir
    const read = Math.random() < lv.read;
    const zones = [-0.38, -0.2, 0, 0.2, 0.38];
    const dx = read ? (tx - cx) / L.gw : zones[Math.floor(Math.random() * zones.length)];
    const high = read ? ty < cy : Math.random() < 0.45;
    keeper.fromX = keeper.x; keeper.fromY = keeper.y;
    keeper.toX = cx + Math.max(-0.4, Math.min(0.4, dx)) * L.gw;
    keeper.toY = high ? L.gy + L.gh * 0.45 : L.gy + L.gh * 0.85;
    keeper.toTilt = Math.max(-1.3, Math.min(1.3, dx * 3.4));
    t0 = performance.now();
    state = 'flying';
    // impact de la frappe : onde + mottes d'herbe
    fx.push({ kind: 'kick', x: L.ballX, y: L.ballY, t: t0 });
    for (let i = 0; i < 12; i++) {
      const a = -Math.PI * (0.15 + Math.random() * 0.7);
      const v = 1.5 + Math.random() * 3;
      parts.push({ x: L.ballX, y: L.ballY + L.ballR * 0.6, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: 0.18, life: 40 + Math.random() * 20, age: 0, r: 2 + Math.random() * 2.5, c: Math.random() < 0.7 ? '#3f9a5b' : '#6b4a2a' });
    }
  }

  function resolve() {
    const { tx, ty } = shot;
    const inGoal = tx > L.gx + 3 && tx < L.gx + L.gw - 3 && ty > L.gy + 3 && ty < L.gy + L.gh;
    const post = !inGoal && (Math.abs(tx - L.gx) < 8 || Math.abs(tx - (L.gx + L.gw)) < 8 || Math.abs(ty - L.gy) < 8) && ty < L.gy + L.gh + 4;
    const reach = L.gw * lv.reach;
    const saved = inGoal && Math.hypot(tx - keeper.toX, (ty - keeper.toY) * 1.2) < reach;
    let r, label;
    const now = performance.now();
    if (saved) {
      r = 'miss'; label = 'ARRÊT !';
      fx.push({ kind: 'star', x: tx, y: ty, t: now });
      burst(tx, ty, 14, ['#fdfdfb', '#f6d327'], 4);
    } else if (inGoal) {
      r = 'goal'; label = 'BUT !';
      ripple = { x: tx, y: ty, t: now };
      fx.push({ kind: 'flash', t: now });
      burst(tx, ty, 40, ['#f6d327', '#1a2a5e', '#fdfdfb'], 6, true);
    } else if (post) {
      r = 'miss'; label = 'POTEAU';
      fx.push({ kind: 'ring', x: tx, y: ty, t: now });
      burst(tx, ty, 10, ['#fdfdfb'], 3);
    } else { r = 'miss'; label = 'À CÔTÉ'; }
    results.push(r);
    renderHud();
    flash = { label, good: r === 'goal', t: performance.now() };
    state = 'result';
    setTimeout(next, 1100);
  }

  function next() {
    shot = null; flash = null; ripple = null;
    keeper = idleKeeper();
    if (results.length >= SHOTS) return end();
    state = 'aim';
  }

  function end() {
    state = 'over';
    const g = goals();
    if (g > best) {
      best = g; bestEl.textContent = best;
      try { localStorage.setItem(bestKey(level), String(best)); } catch {}
    }
    const msgs = ['Le gardien de la JS a tout arrêté.', 'Un seul, il faut revenir à l’entraînement.', 'Pas mal, mais le gardien a gagné.', 'Belle série, vous avez battu le gardien !', 'Quatre sur cinq : du niveau P4.', 'Parfait. On vous attend à l’entraînement.'];
    const nextUp = { facile: ' Essayez le niveau Normal !', normal: ' Prêt pour le niveau Pro ?', pro: '' };
    ovTitle.textContent = `${g} / ${SHOTS}`;
    ovSub.textContent = `${lv.label} · ${msgs[g]}${g >= 4 ? nextUp[level] : ''}`;
    startBtn.textContent = 'Rejouer';
    overlay.classList.remove('hide');
    el.onEnd?.(g);
  }

  const goals = () => results.filter(r => r === 'goal').length;
  function renderHud() {
    shotsEl.innerHTML = Array.from({ length: SHOTS }, (_, i) => `<i class="${results[i] || ''}"></i>`).join('');
    goalsEl.textContent = goals();
  }
  renderHud();

  /* ---------- dessin ---------- */
  function draw(now) {
    if (!W || !visible) { requestAnimationFrame(draw); return; }
    ctx.clearRect(0, 0, W, H);
    drawPitch();
    drawGoal();

    let p = 0;
    if (state === 'flying') {
      p = Math.min(1, (now - t0) / shot.dur);
      const kp = easeOut(Math.min(1, (now - t0 - lv.delay) / lv.move));
      if (kp > 0) {
        keeper.x = lerp(keeper.fromX, keeper.toX, kp);
        keeper.y = lerp(keeper.fromY, keeper.toY, kp);
        keeper.tilt = lerp(0, keeper.toTilt, kp);
      }
      if (p >= 1) resolve();
    } else if (state === 'aim') {
      // le gardien se balance en attendant
      keeper.x = L.gx + L.gw / 2 + Math.sin(now / 380) * L.gw * 0.04;
    }

    drawKeeper();

    if (shot) {
      const e = easeOut(Math.min(1, p || 1));
      const bx = lerp(shot.sx, shot.tx, e);
      const by = lerp(shot.sy, shot.ty, e) - Math.sin(e * Math.PI) * L.gh * 0.25;
      const scale = lerp(1, 0.55, e);
      if (state === 'flying') { shot.trail.push({ x: bx, y: by, r: L.ballR * scale }); if (shot.trail.length > 14) shot.trail.shift(); }
      drawShadow(lerp(shot.sx, shot.tx, e), lerp(shot.sy, Math.min(shot.ty + 6, L.gy + L.gh + 4), e), scale);
      drawTrail(shot.trail, state === 'flying');
      if (state === 'flying') drawAura(bx, by, L.ballR * scale, now);
      drawBall(bx, by, L.ballR * scale, now / 50);
    } else {
      drawShadow(L.ballX, L.ballY + L.ballR * 0.7, 1);
      drawBall(L.ballX, L.ballY, L.ballR, 0);
    }

    drawFx(now);
    if (state === 'aim') drawAim(now);
    if (flash) drawFlash(now);
    requestAnimationFrame(draw);
  }

  /* ---------- effets ---------- */
  // traînée de comète derrière le ballon
  function drawTrail(trail, live) {
    if (trail.length < 2) return;
    for (let i = 0; i < trail.length - 1; i++) {
      const a = trail[i], b = trail[i + 1], k = i / trail.length;
      ctx.strokeStyle = `rgba(246,211,39,${(live ? 0.55 : 0.25) * k})`;
      ctx.lineWidth = b.r * 1.6 * k; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    }
    // lignes de vitesse façon anime
    if (live) {
      const a = trail[0], b = trail[trail.length - 1];
      const ang = Math.atan2(b.y - a.y, b.x - a.x), n = [-Math.sin(ang), Math.cos(ang)];
      ctx.strokeStyle = 'rgba(253,253,251,.7)'; ctx.lineWidth = 1.6;
      for (const o of [-1.4, -0.6, 0.7, 1.5]) {
        const ox = n[0] * b.r * o * 1.2, oy = n[1] * b.r * o * 1.2;
        ctx.beginPath(); ctx.moveTo(b.x - Math.cos(ang) * b.r * 1.5 + ox, b.y - Math.sin(ang) * b.r * 1.5 + oy);
        ctx.lineTo(b.x - Math.cos(ang) * b.r * (4 + Math.abs(o) * 2) + ox, b.y - Math.sin(ang) * b.r * (4 + Math.abs(o) * 2) + oy); ctx.stroke();
      }
    }
  }
  // halo de « frappe spéciale » autour du ballon
  function drawAura(x, y, r, now) {
    const g = ctx.createRadialGradient(x, y, r * 0.6, x, y, r * 2.4);
    g.addColorStop(0, 'rgba(246,211,39,.55)'); g.addColorStop(1, 'rgba(246,211,39,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r * 2.4, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(253,253,251,.8)'; ctx.lineWidth = 1.5;
    for (let i = 0; i < 3; i++) {
      const a = now / 80 + i * 2.1;
      ctx.beginPath(); ctx.arc(x, y, r * 1.45, a, a + 0.8); ctx.stroke();
    }
  }
  function drawFx(now) {
    // particules (herbe, étincelles, confettis)
    for (const p of parts) {
      p.age++; p.x += p.vx; p.y += p.vy; p.vy += p.g; p.vx *= 0.985; p.rot = (p.rot || 0) + 0.2;
      ctx.globalAlpha = Math.max(0, 1 - p.age / p.life);
      ctx.fillStyle = p.c;
      if (p.rect) { ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillRect(-p.r, -p.r * 0.5, p.r * 2, p.r); ctx.restore(); }
      else { ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill(); }
    }
    ctx.globalAlpha = 1;
    parts = parts.filter(p => p.age < p.life);
    // ondes et éclairs
    for (const f of fx) {
      const k = (now - f.t) / (f.kind === 'flash' ? 260 : 420);
      if (k > 1) continue;
      if (f.kind === 'kick' || f.kind === 'ring') {
        ctx.strokeStyle = `rgba(253,253,251,${1 - k})`; ctx.lineWidth = 3 * (1 - k) + 1;
        ctx.beginPath(); ctx.ellipse(f.x, f.y, L.ballR * (1 + k * 3), L.ballR * (0.5 + k * 1.5), 0, 0, Math.PI * 2); ctx.stroke();
        if (f.kind === 'kick') drawStar(f.x, f.y - L.ballR * 0.3, L.ballR * (1.2 + k * 1.5), 1 - k, '#fdfdfb');
      } else if (f.kind === 'star') {
        drawStar(f.x, f.y, L.ballR * (1.5 + k * 2.5), 1 - k, '#f6d327');
      } else if (f.kind === 'flash') {
        ctx.fillStyle = `rgba(253,253,251,${0.45 * (1 - k)})`; ctx.fillRect(0, 0, W, H);
      }
    }
    fx = fx.filter(f => now - f.t < 420);
  }
  // étoile d'impact à branches, typique des mangas
  function drawStar(x, y, r, alpha, color) {
    ctx.save(); ctx.globalAlpha = alpha; ctx.translate(x, y);
    ctx.beginPath();
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2, rr = i % 2 ? r * 0.45 : r * (i % 4 ? 0.8 : 1);
      ctx[i ? 'lineTo' : 'moveTo'](Math.cos(a) * rr, Math.sin(a) * rr);
    }
    ctx.closePath(); ctx.fillStyle = color; ctx.fill();
    ctx.strokeStyle = '#0b1230'; ctx.lineWidth = 2; ctx.stroke();
    ctx.restore();
  }

  function drawPitch() {
    const n = 10;
    for (let i = 0; i < n; i++) {
      ctx.fillStyle = i % 2 ? C.grassA : C.grassB;
      ctx.fillRect((W / n) * i, 0, W / n + 1, H);
    }
    ctx.strokeStyle = 'rgba(253,251,245,.55)';
    ctx.lineWidth = 3;
    const base = L.gy + L.gh;
    // surface de réparation en perspective
    ctx.beginPath();
    ctx.moveTo(L.gx - L.gw * 0.45, base);
    ctx.lineTo(L.gx - L.gw * 0.75, H * 0.98);
    ctx.moveTo(L.gx + L.gw * 1.45, base);
    ctx.lineTo(L.gx + L.gw * 1.75, H * 0.98);
    ctx.moveTo(0, base); ctx.lineTo(W, base);
    // petit rectangle
    ctx.moveTo(L.gx - L.gw * 0.12, base);
    ctx.lineTo(L.gx - L.gw * 0.18, base + H * 0.12);
    ctx.lineTo(L.gx + L.gw * 1.18, base + H * 0.12);
    ctx.lineTo(L.gx + L.gw * 1.12, base);
    ctx.stroke();
    // point de penalty
    ctx.fillStyle = 'rgba(253,251,245,.8)';
    ctx.beginPath(); ctx.ellipse(L.ballX, L.ballY + L.ballR * 0.75, 6, 3, 0, 0, Math.PI * 2); ctx.fill();
  }

  function drawGoal() {
    const { gx, gy, gw, gh } = L;
    // fond du filet
    ctx.fillStyle = 'rgba(19,34,26,.28)';
    ctx.fillRect(gx, gy, gw, gh);
    ctx.strokeStyle = 'rgba(253,251,245,.28)';
    ctx.lineWidth = 1;
    const step = gw / 28;
    // le filet se déforme autour du point d'impact quand on marque
    const rk = ripple ? (performance.now() - ripple.t) / 900 : 1;
    const bulge = (x, y) => {
      if (rk >= 1) return [x, y];
      const dx = x - ripple.x, dy = y - ripple.y, d = Math.hypot(dx, dy) || 1;
      const amp = gw * 0.05 * Math.exp(-(d * d) / (gw * gw * 0.02)) * Math.cos(rk * 14) * (1 - rk);
      return [x + (dx / d) * amp, y + (dy / d) * amp];
    };
    ctx.beginPath();
    for (let x = gx; x <= gx + gw; x += step) { for (let y = gy, i = 0; y <= gy + gh + 0.1; y += step / 2, i++) { const [px, py] = bulge(x, y); i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); } }
    for (let y = gy; y <= gy + gh; y += step) { for (let x = gx, i = 0; x <= gx + gw + 0.1; x += step / 2, i++) { const [px, py] = bulge(x, y); i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); } }
    ctx.stroke();
    if (rk < 1) {
      ctx.fillStyle = `rgba(11,18,48,${0.35 * (1 - rk)})`;
      ctx.beginPath(); ctx.ellipse(ripple.x, ripple.y, gw * 0.07, gw * 0.05, 0, 0, Math.PI * 2); ctx.fill();
    }
    // poteaux
    ctx.strokeStyle = C.chalk;
    ctx.lineWidth = Math.max(5, gw * 0.014);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(gx, gy + gh); ctx.lineTo(gx, gy); ctx.lineTo(gx + gw, gy); ctx.lineTo(gx + gw, gy + gh);
    ctx.stroke();
  }

  /* gardien de face, style dessin animé 90s : contours épais, maillot à motifs, gros gants */
  const K = {
    out: '#0b1230', skin: '#e3b38a', skinD: '#c99670', hair: '#151a33', hairHi: '#4256a8',
    shirt: '#f6d327', shirtD: '#d9b81a', navy: '#1a2a5e', white: '#fdfdfb',
  };
  function kLine(pts, w, color, s) {
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x * s, y * s) : ctx.moveTo(x * s, y * s)));
    ctx.strokeStyle = K.out; ctx.lineWidth = (w + 3.2) * s; ctx.stroke();
    ctx.strokeStyle = color; ctx.lineWidth = w * s; ctx.stroke();
  }
  function kShape(pts, color, s) {
    ctx.lineJoin = 'round';
    ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x * s, y * s) : ctx.moveTo(x * s, y * s))); ctx.closePath();
    ctx.fillStyle = color; ctx.fill();
    ctx.strokeStyle = K.out; ctx.lineWidth = 1.6 * s; ctx.stroke();
  }
  const mix = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];

  function drawKeeper() {
    const s = L.gh / 125;
    const now = performance.now();
    const lift = state === 'flying' ? 1 : 0.15 + Math.sin(now / 300) * 0.06;  // bras levés
    const dive = Math.min(1, Math.abs(keeper.tilt) / 1.1);                    // plongeon
    const side = keeper.tilt >= 0 ? 1 : -1;
    const hop = state === 'aim' ? Math.abs(Math.sin(now / 190)) * 2.5 : 0;     // petits sauts sur place
    ctx.save();
    ctx.translate(keeper.x, keeper.y - hop * s);
    ctx.rotate(keeper.tilt);

    // ombre
    ctx.fillStyle = 'rgba(0,0,0,.22)';
    ctx.beginPath(); ctx.ellipse(0, 2 * s, 26 * s, 4 * s, 0, 0, Math.PI * 2); ctx.fill();

    // jambes : position d'attente genoux fléchis, tendues pendant le plongeon
    const hipL = [-9, -42], hipR = [9, -42];
    const kneeL = mix([-20, -22], [-12 * side - 4, -22], dive), kneeR = mix([20, -22], [-12 * side + 4, -20], dive);
    const footL = mix([-17, -1], [-22 * side - 6, -2], dive), footR = mix([17, -1], [-22 * side + 6, 0], dive);
    for (const [hip, knee, foot, back] of [[hipL, kneeL, footL, side > 0], [hipR, kneeR, footR, side < 0]]) {
      const sock = mix(knee, foot, 0.25);
      kLine([hip, knee], 8.5, back ? K.skinD : K.skin, s);
      kLine([knee, sock], 7, back ? K.skinD : K.skin, s);
      kLine([sock, foot], 7.5, K.navy, s);
      ctx.strokeStyle = K.shirt; ctx.lineWidth = 2 * s; ctx.lineCap = 'butt';
      const st = mix(sock, foot, 0.25), st2 = mix(sock, foot, 0.35);
      ctx.beginPath(); ctx.moveTo(st[0] * s, st[1] * s); ctx.lineTo(st2[0] * s, st2[1] * s); ctx.stroke();
      // chaussure
      ctx.beginPath(); ctx.ellipse(foot[0] * s + (foot[0] > 0 ? 2 : -2) * s, foot[1] * s, 7 * s, 3.6 * s, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#16161c'; ctx.fill(); ctx.strokeStyle = K.out; ctx.lineWidth = 1.6 * s; ctx.stroke();
    }

    // short
    kShape([[-15, -51], [15, -51], [18, -36], [3, -34], [0, -39], [-3, -34], [-18, -36]], K.navy, s);

    // maillot de gardien années 90 : jaune, zigzags marine, numéro 1
    const torso = [[-13, -50], [13, -50], [22, -78], [11, -84], [-11, -84], [-22, -78]];
    kShape(torso, K.shirt, s);
    ctx.save();
    ctx.beginPath(); torso.forEach(([x, y], i) => (i ? ctx.lineTo(x * s, y * s) : ctx.moveTo(x * s, y * s))); ctx.closePath(); ctx.clip();
    ctx.strokeStyle = K.navy; ctx.lineWidth = 3.4 * s; ctx.lineJoin = 'miter';
    for (const y0 of [-58, -68]) {
      ctx.beginPath();
      for (let x = -24, i = 0; x <= 24; x += 6, i++) ctx[i ? 'lineTo' : 'moveTo'](x * s, (y0 + (i % 2 ? -4 : 0)) * s);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(15,26,63,.12)';
    ctx.beginPath(); ctx.moveTo(-24 * s, -84 * s); ctx.lineTo(-4 * s, -84 * s); ctx.lineTo(-24 * s, -50 * s); ctx.fill();
    ctx.restore();
    ctx.strokeStyle = K.out; ctx.lineWidth = 1.6 * s;
    ctx.beginPath(); torso.forEach(([x, y], i) => (i ? ctx.lineTo(x * s, y * s) : ctx.moveTo(x * s, y * s))); ctx.closePath(); ctx.stroke();
    // col en V
    kLine([[-5, -84], [0, -78], [5, -84]], 1.8, K.navy, s);
    // numéro
    ctx.font = `italic 900 ${11 * s}px "Avenir Next Condensed","Arial Narrow",Impact,sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineWidth = 3 * s; ctx.strokeStyle = K.white; ctx.strokeText('1', 0, -74 * s);
    ctx.fillStyle = K.navy; ctx.fillText('1', 0, -74 * s);

    // bras à manches longues + gros gants
    const shL = [-18, -78], shR = [18, -78];
    const reach = Math.max(lift, dive);
    for (const [sh, sgn] of [[shL, -1], [shR, 1]]) {
      const elbow = mix([sgn * 32, -66], [sgn * 30, -98], reach);
      const hand = mix([sgn * 40, -76], [sgn * 34, -120], reach);
      kLine([sh, elbow, hand], 7.5, K.shirt, s);
      kLine([mix(elbow, hand, 0.82), hand], 7.5, K.navy, s);  // poignet marine
      // gant : paume ouverte, doigts écartés
      ctx.save();
      ctx.translate(hand[0] * s, hand[1] * s);
      ctx.rotate(Math.atan2(hand[1] - elbow[1], hand[0] - elbow[0]) + Math.PI / 2);
      ctx.beginPath(); ctx.ellipse(0, -5 * s, 7 * s, 8 * s, 0, 0, Math.PI * 2);
      ctx.fillStyle = K.white; ctx.fill(); ctx.strokeStyle = K.out; ctx.lineWidth = 1.6 * s; ctx.stroke();
      for (const fx of [-4.5, -1.5, 1.5, 4.5]) {
        ctx.beginPath(); ctx.ellipse(fx * s, -13 * s, 1.7 * s, 3.4 * s, fx * 0.05, 0, Math.PI * 2);
        ctx.fillStyle = K.white; ctx.fill(); ctx.stroke();
      }
      ctx.fillStyle = K.shirt; ctx.fillRect(-6 * s, -1 * s, 12 * s, 3 * s);
      ctx.restore();
    }

    // cou
    kLine([[0, -84], [0, -88]], 6, K.skin, s);
    drawKeeperHead([0, -98], s, now);
    ctx.restore();
  }

  function drawKeeperHead([hx, hy], s, now) {
    ctx.save();
    ctx.translate(hx * s, hy * s);
    // le regard suit la cible du tireur
    const look = state === 'aim' ? Math.max(-1, Math.min(1, (aim.x - keeper.x) / (L.gw * 0.4))) : 0;
    const sway = Math.sin(now / 90) * 0.6;
    // cheveux en pointes, coiffure d'anime
    const spikes = [[-13, 2], [-17, -6], [-13, -8], [-16, -16], [-9, -13], [-8, -22], [-2, -15], [3, -24], [5, -15], [12, -21], [11, -12], [18, -12], [13, -5], [16, 1]];
    ctx.beginPath();
    spikes.forEach(([x, y], i) => { const px = (x + (y < -14 ? sway : 0)) * s, py = y * s; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); });
    ctx.closePath(); ctx.fillStyle = K.hair; ctx.fill(); ctx.strokeStyle = K.out; ctx.lineWidth = 1.6 * s; ctx.stroke();
    // oreilles
    for (const ex of [-12, 12]) {
      ctx.beginPath(); ctx.ellipse(ex * s, 1 * s, 2.6 * s, 3.6 * s, 0, 0, Math.PI * 2);
      ctx.fillStyle = K.skinD; ctx.fill(); ctx.lineWidth = 1.2 * s; ctx.stroke();
    }
    // visage
    ctx.beginPath(); ctx.ellipse(0, 1 * s, 11 * s, 12.5 * s, 0, 0, Math.PI * 2);
    ctx.fillStyle = K.skin; ctx.fill(); ctx.lineWidth = 1.6 * s; ctx.stroke();
    // frange
    ctx.beginPath();
    ctx.moveTo(-11 * s, -4 * s); ctx.lineTo(-7 * s, -12 * s); ctx.lineTo(-4 * s, -5 * s); ctx.lineTo(0, -12 * s);
    ctx.lineTo(3 * s, -4 * s); ctx.lineTo(7 * s, -11 * s); ctx.lineTo(11 * s, -3 * s); ctx.lineTo(10 * s, -11 * s); ctx.lineTo(-10 * s, -11 * s); ctx.closePath();
    ctx.fillStyle = K.hair; ctx.fill(); ctx.stroke();
    ctx.strokeStyle = K.hairHi; ctx.lineWidth = 1.4 * s;
    ctx.beginPath(); ctx.moveTo(-9 * s, -16 * s); ctx.quadraticCurveTo(-2 * s, -21 * s, 6 * s, -17 * s); ctx.stroke();
    // grands yeux d'anime
    for (const ex of [-4.8, 4.8]) {
      ctx.beginPath(); ctx.ellipse(ex * s, 0, 3.2 * s, 4.2 * s, 0, 0, Math.PI * 2);
      ctx.fillStyle = K.white; ctx.fill(); ctx.strokeStyle = K.out; ctx.lineWidth = 1.1 * s; ctx.stroke();
      ctx.beginPath(); ctx.ellipse((ex + look * 1.2) * s, 0.6 * s, 1.9 * s, 3 * s, 0, 0, Math.PI * 2);
      ctx.fillStyle = K.navy; ctx.fill();
      ctx.beginPath(); ctx.arc((ex + look * 1.2 + 0.7) * s, -0.8 * s, 0.75 * s, 0, Math.PI * 2);
      ctx.fillStyle = K.white; ctx.fill();
    }
    // sourcils froncés : il est concentré
    ctx.strokeStyle = K.out; ctx.lineWidth = 1.8 * s; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-8 * s, -6 * s); ctx.lineTo(-2.5 * s, -4.5 * s); ctx.moveTo(8 * s, -6 * s); ctx.lineTo(2.5 * s, -4.5 * s); ctx.stroke();
    // nez et bouche
    ctx.lineWidth = 1 * s;
    ctx.beginPath(); ctx.moveTo(0.6 * s, 3 * s); ctx.lineTo(-0.6 * s, 5.4 * s); ctx.stroke();
    ctx.lineWidth = 1.3 * s;
    ctx.beginPath();
    if (flash && !flash.good) { ctx.arc(0, 7.5 * s, 3 * s, 0.15 * Math.PI, 0.85 * Math.PI); }   // sourire après un arrêt
    else { ctx.moveTo(-3 * s, 8.5 * s); ctx.lineTo(3 * s, 8 * s); }
    ctx.stroke();
    ctx.restore();
  }

  // ballon façon anime : ombrage en dégradé, contour épais, reflet fixe
  function drawBall(x, y, r, spin) {
    ctx.save();
    ctx.translate(x, y);
    ctx.save();
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.clip();
    const g = ctx.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.1, 0, 0, r * 1.05);
    g.addColorStop(0, '#ffffff'); g.addColorStop(0.65, '#eef0f4'); g.addColorStop(1, '#a9b1c6');
    ctx.fillStyle = g; ctx.fillRect(-r, -r, r * 2, r * 2);
    ctx.rotate(spin);
    ctx.fillStyle = '#16204a';
    pentagon(0, 0, r * 0.38);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
      pentagon(Math.cos(a) * r * 0.9, Math.sin(a) * r * 0.9, r * 0.26);
    }
    ctx.restore();
    // ombre propre en croissant + reflet
    ctx.fillStyle = 'rgba(11,18,48,.18)';
    ctx.beginPath(); ctx.arc(0, 0, r, -0.3, Math.PI * 0.85); ctx.arc(-r * 0.15, -r * 0.15, r * 0.95, Math.PI * 0.85, -0.3, true); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.9)';
    ctx.beginPath(); ctx.ellipse(-r * 0.38, -r * 0.42, r * 0.2, r * 0.12, -0.6, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#0b1230'; ctx.lineWidth = Math.max(1.5, r * 0.12);
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }

  function pentagon(x, y, r) {
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
      i ? ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r) : ctx.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
    }
    ctx.closePath(); ctx.fill();
  }

  function drawShadow(x, y, s) {
    ctx.fillStyle = 'rgba(0,0,0,.25)';
    ctx.beginPath(); ctx.ellipse(x, y, L.ballR * s * 1.1, L.ballR * s * 0.4, 0, 0, Math.PI * 2); ctx.fill();
  }

  // en Pro, la cible tremble un peu (la pression du tir au but)
  function shaken(now) {
    if (!lv.shake) return aim;
    const a = L.gw * lv.shake;
    return { x: aim.x + Math.sin(now / 170) * a + Math.sin(now / 53) * a * 0.4, y: aim.y + Math.cos(now / 210) * a * 0.7 };
  }
  function drawAim(now) {
    const aim = shaken(now);
    const pulse = 1 + Math.sin(now / 160) * 0.08;
    const r = L.gw * 0.035 * pulse;
    ctx.strokeStyle = C.flag; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(aim.x, aim.y, r, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(aim.x - r * 1.6, aim.y); ctx.lineTo(aim.x - r * 0.5, aim.y);
    ctx.moveTo(aim.x + r * 0.5, aim.y); ctx.lineTo(aim.x + r * 1.6, aim.y);
    ctx.moveTo(aim.x, aim.y - r * 1.6); ctx.lineTo(aim.x, aim.y - r * 0.5);
    ctx.moveTo(aim.x, aim.y + r * 0.5); ctx.lineTo(aim.x, aim.y + r * 1.6);
    ctx.stroke();
    // trajectoire en pointillés
    ctx.setLineDash([4, 8]);
    ctx.strokeStyle = 'rgba(253,251,245,.45)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(L.ballX, L.ballY - L.ballR);
    ctx.quadraticCurveTo((L.ballX + aim.x) / 2, (L.ballY + aim.y) / 2 - L.gh * 0.4, aim.x, aim.y);
    ctx.stroke(); ctx.setLineDash([]);
  }

  function drawFlash(now) {
    const k = Math.min(1, (now - flash.t) / 220);
    const size = Math.min(W * 0.16, 120) * (0.6 + 0.4 * easeOut(k));
    ctx.save();
    ctx.globalAlpha = k;
    ctx.font = `800 ${size}px "Avenir Next Condensed","Arial Narrow",Impact,sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineWidth = size * 0.08; ctx.strokeStyle = C.ink;
    ctx.fillStyle = flash.good ? C.flag : C.chalk;
    ctx.translate(W / 2, H * 0.58); ctx.rotate(-0.05);
    ctx.strokeText(flash.label, 0, 0); ctx.fillText(flash.label, 0, 0);
    ctx.restore();
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }

  requestAnimationFrame(draw);
  return { setLevel, get level() { return level; } };
}

const lerp = (a, b, t) => a + (b - a) * t;
const easeOut = (t) => (t <= 0 ? 0 : 1 - Math.pow(1 - t, 3));
function gauss() {
  let u = 0, v = 0;
  while (!u) u = Math.random();
  while (!v) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
