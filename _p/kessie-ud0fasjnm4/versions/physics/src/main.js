// GRIP main — input, loop, HUD, save.
(function () {
  const $ = id => document.getElementById(id);
  const cv = $('game');
  const dev = new URLSearchParams(location.search).has('dev');
  const ASSET_NAMES = ['title', 'bg_z1', 'bg_z2', 'bg_z3', 'bg_z4', 'bg_z5', 'bg_z6', 'bg_z7', 'tex_granite', 'tex_basalt', 'tex_rust', 'tex_sandstone'];
  const assets = {};
  const SAVE = 'grip.save.v2', STATS = 'grip.stats.v1';

  const sim = new GRIP.Sim(LEVEL);
  const audio = new GRIP.Audio();
  let R = null, state = 'title', falls = 0, best = 0, maxZone = 0, lastGrunt = 0, saveT = 0, msgT = 0, rescueT = 0;
  const mouse = { sx: -1, sy: -1, in: false };
  const keys = { l: 0, r: 0 };
  const stats = JSON.parse(localStorage.getItem(STATS) || '{}');
  const settings = Object.assign({ assist: true, sound: true }, JSON.parse(localStorage.getItem('grip.settings') || '{}'));
  audio.setEnabled(settings.sound);

  Promise.all(ASSET_NAMES.map(n => new Promise(res => {
    const img = new Image(); img.onload = () => res(); img.onerror = () => res(); img.src = `../../assets/${n}.jpg`; assets[n] = img;
  }))).then(() => {
    R = new GRIP.Renderer(cv, sim, assets);
    R.resize(); addEventListener('resize', () => R.resize());
    $('loading').remove();
    showTitle();
    requestAnimationFrame(loop);
  });

  // ---------- screens ----------
  function showTitle() {
    state = 'title';
    $('title').hidden = false; $('pause').hidden = true; $('summit').hidden = true; $('hud').hidden = true;
    $('continue').hidden = !localStorage.getItem(SAVE);
    $('records').textContent = [stats.best ? `Highest: ${stats.best.toFixed(1)} m` : '', stats.bestTime ? `Best summit: ${fmt(stats.bestTime)}` : '', stats.summits ? `Summits: ${stats.summits}` : ''].filter(Boolean).join('  ·  ');
  }
  function start(fresh) {
    audio.init();
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); // Space must hop, not re-click the button
    if (fresh) {
      sim.reset(); falls = 0; best = 0; maxZone = 0; localStorage.removeItem(SAVE);
    } else {
      const sv = JSON.parse(localStorage.getItem(SAVE) || 'null');
      if (sv) { sim.reset(); sim.restore(sv.snap); falls = sv.falls || 0; best = sv.best || 0; maxZone = sv.maxZone || 0; }
    }
    R.cam.x = sim.b.C.x; R.cam.y = sim.b.C.y;
    $('title').hidden = true; $('summit').hidden = true; $('hud').hidden = false;
    resume();
    tip = fresh ? 0 : 99;
  }
  function resume() { state = 'play'; $('pause').hidden = true; }
  function pause() {
    if (state !== 'play') return;
    state = 'paused'; keys.l = keys.r = 0; walk(); sim.setPull(0);
    $('pause').hidden = false; save();
  }

  $('newgame').onclick = () => start(true);
  $('continue').onclick = () => start(false);
  $('resume').onclick = resume;
  $('restart').onclick = () => { if (confirm('Start over from the beach?')) start(true); };
  $('totitle').onclick = () => { save(); showTitle(); };
  $('again').onclick = () => start(true);
  $('summitTitle').onclick = showTitle;
  $('assist').checked = settings.assist;
  $('assist').onchange = e => { settings.assist = e.target.checked; persistSettings(); };
  $('sound').checked = settings.sound;
  $('sound').onchange = e => { settings.sound = e.target.checked; audio.setEnabled(settings.sound); persistSettings(); };
  function persistSettings() { localStorage.setItem('grip.settings', JSON.stringify(settings)); }

  // ---------- input ----------
  // Click a glowing hold to reach for it. Right-click lets go. Arrows walk / swing, Space lunges.
  function hover() {
    if (!R || !mouse.in) return null;
    const w = R.toWorld(mouse.sx, mouse.sy);
    const t = sim.targetAt(w.x, w.y, 28);
    return t && sim.usable(t) ? t : null;
  }
  function refreshHover() {
    if (!R) return;
    R.mouse = mouse.in ? R.toWorld(mouse.sx, mouse.sy) : null;
    const t = state === 'play' ? hover() : null;
    R.hover = t ? { t, info: sim.reachInfo(t), mantle: isHeldLip(t) && sim.canMantle() } : null;
  }
  const isHeldLip = t => t.kind === 'hold' && t.hold.lip && sim.hands.some(h => sim.same(h.grip, t));
  function clickHold() {
    const t = hover();
    if (!t) { flash('Click a glowing hold to reach for it.', 1.4); return; }
    if (isHeldLip(t)) { if (sim.canMantle()) sim.mantle(); else flash('Pull closer to the lip first (↑).', 1.4); return; }
    const r = sim.grab(t);
    if (r.state === 'far') flash('Too far — swing with ← → and press Space to lunge for it.', 2.2);
    else if (r.state === 'no') flash(sim.mant ? 'Hold on — mantling.' : 'Can\'t reach that from here.', 1.4);
  }
  function lungeOrHop() {
    const t = hover();
    if (t && !(t.kind === 'hold' && sim.hands.some(h => sim.same(h.grip, t)))) {
      const r = sim.lunge(t);
      if (r.state === 'lunge') return;
      if (r.state === 'no') { flash('No clear line to that hold.', 1.2); return; }
      if (r.state === 'busy') return;
    }
    if (sim.canMantle()) { sim.mantle(); return; }
    if (!sim.hands.some(h => h.grip)) sim.hop();
  }
  cv.addEventListener('mousemove', e => { mouse.sx = e.clientX; mouse.sy = e.clientY; mouse.in = true; });
  cv.addEventListener('mouseleave', () => { mouse.in = false; });
  cv.addEventListener('mousedown', e => {
    if (state !== 'play') return;
    mouse.sx = e.clientX; mouse.sy = e.clientY; mouse.in = true;
    if (e.button === 0) clickHold();
    if (e.button === 2) {
      const w = R.toWorld(e.clientX, e.clientY), held = sim.hands.filter(h => h.grip || h.target);
      if (held.length) sim.letGo(held.sort((a, b) => Math.hypot(a.p.x - w.x, a.p.y - w.y) - Math.hypot(b.p.x - w.x, b.p.y - w.y))[0]);
    }
  });
  cv.addEventListener('contextmenu', e => e.preventDefault());
  addEventListener('keydown', e => {
    const k = e.key.toLowerCase();
    if (['arrowleft', 'arrowright', 'arrowup', 'arrowdown', ' '].includes(k)) e.preventDefault();
    if (e.repeat) return;
    if (state === 'play') {
      if (k === 'arrowleft' || k === 'a') { keys.l = 1; walk(); }
      if (k === 'arrowright' || k === 'd') { keys.r = 1; walk(); }
      if (k === 'arrowup' || k === 'w') {
        if (sim.canMantle()) sim.mantle();
        else if (sim.hands.some(h => h.grip)) sim.setPull(-1);
        else sim.hop();
      }
      if (k === 'arrowdown' || k === 's') { if (sim.hands.some(h => h.grip || h.target)) sim.letGo(); }
      if (k === ' ') lungeOrHop();
      if (k === 'r') { sim.toCheckpoint(); rescueT = 0; R.cam.x = sim.b.C.x; R.cam.y = sim.b.C.y; flash('Back to your last ledge.', 1.2); }
      if (k === 'escape' || k === 'p') pause();
    } else if (state === 'paused' && (k === 'escape' || k === 'p')) resume();
    if (dev && state === 'play') {
      // dev teleports: just above a ledge at the start of each zone (feet must not start inside rock)
      const spots = [[60, 30], [715, -610], [1040, -1030], [1125, -2050], [1250, -3010], [1450, -3810], [2265, -4570]];
      if (k >= '1' && k <= '7') { sim.teleport(...spots[+k - 1]); R.cam.x = sim.b.C.x; R.cam.y = sim.b.C.y; }
      if (k === 'g') R.debug = !R.debug;
    }
  });
  addEventListener('keyup', e => {
    const k = e.key.toLowerCase();
    if (k === 'arrowup' || k === 'w') sim.setPull(0);
    if (k === 'arrowleft' || k === 'a') { keys.l = 0; walk(); }
    if (k === 'arrowright' || k === 'd') { keys.r = 0; walk(); }
  });
  addEventListener('blur', () => { keys.l = keys.r = 0; walk(); sim.setPull(0); });
  function walk() { sim.setWalk(keys.r - keys.l); }
  addEventListener('beforeunload', () => state === 'play' || state === 'paused' ? save() : null);

  // ---------- loop ----------
  let last = performance.now(), acc = 0;
  function loop(now) {
    const dt = Math.min(0.1, (now - last) / 1000); last = now;
    if (state === 'play') {
      acc += dt;
      let n = 0;
      while (acc >= GRIP.DT && n < 12) { sim.step(); acc -= GRIP.DT; n++; }
      if (n === 12) acc = 0;
      handleEvents();
      if (rescueT > 0 && (rescueT -= dt) <= 0) { sim.toCheckpoint(); flash('Back to your last ledge. (Turn off in Settings.)', 1.6); }
      hud(dt);
      saveT += dt; if (saveT > 2) { saveT = 0; save(); }
    }
    refreshHover();
    R.update(dt);
    R.draw(now / 1000);
    audio.ambience(sim.height(), sim.wind.force, sim.wind.warn);
    requestAnimationFrame(loop);
  }

  function handleEvents() {
    for (const e of sim.events) {
      if (e.type === 'grip') { audio.grip(e.surf); R.burst(e.x, e.y, 'chalk', 6); }
      else if (e.type === 'slip') { audio.slip(); flash(e.reason === 'grip gave out' ? 'Grip gave out.' : e.reason === 'slid off' ? 'Too smooth to hold.' : 'The hold crumbled!', 1.8); }
      else if (e.type === 'crumble') { audio.crumble(); const [x1, y1, x2, y2] = e.s.aabb; R.burst((x1 + x2) / 2, (y1 + y2) / 2, 'debris', 14, '#c49a62'); }
      else if (e.type === 'fall') { falls++; audio.land(e.m); R.ghosts.push({ ...e, t: 0 }); if (settings.assist && e.m > 3 && sim.cp) rescueT = 1.2; }
      else if (e.type === 'checkpoint') { flash('Ledge reached — checkpoint saved.', 1.4); R.burst(sim.cp.x, sim.cp.y, 'chalk', 10); }
      else if (e.type === 'miss') flash('Missed — try a closer hold, or swing and lunge.', 1.6);
      else if (e.type === 'lunge') audio.grunt(0.8);
      else if (e.type === 'mantle') audio.grunt(0.6);
      else if (e.type === 'tide') { audio.tide(); flash('The tide carries you back to the beach.', 3); }
      else if (e.type === 'summit') onSummit();
      else if (e.type === 'gust') flash(e.dir > 0 ? 'Gust →' : '← Gust', 1.2);
    }
    sim.events.length = 0;
    // effort grunts while hauling upward
    const t = performance.now() / 1000;
    const up = -sim.b.C.vy();
    const gripping = sim.hands.filter(h => h.grip);
    if (gripping.length && up > 220 && t - lastGrunt > 1.3) {
      const st = Math.min(...gripping.map(h => h.stamina));
      if (st < 65 || Math.random() < 0.25) { audio.grunt(0.4 + (1 - st / 100) * 0.6); lastGrunt = t; }
    }
  }

  function hud(dt) {
    const h = sim.height();
    best = Math.max(best, h);
    $('h').textContent = h.toFixed(1);
    $('best').textContent = best.toFixed(1);
    $('time').textContent = fmt(sim.time);
    $('falls').textContent = falls;
    const zi = Math.max(0, sim.zoneIndex());
    $('zone').textContent = `${zi + 1} · ${LEVEL.zones[zi].name}`;
    $('meter').style.height = Math.min(100, (h / 84.4) * 100) + '%';
    $('bestmark').style.bottom = Math.min(100, (best / 84.4) * 100) + '%';
    if (zi > maxZone) { maxZone = zi; banner(zi); }
    if (msgT > 0 && (msgT -= dt) <= 0) $('msg').classList.remove('on');
    coach(dt);
  }

  // first-wall coaching: each tip waits until the player has actually done the thing
  const TIPS = [
    ['<kbd>←</kbd> <kbd>→</kbd> or <kbd>A</kbd> <kbd>D</kbd> to walk. Head for the cliff.', () => sim.b.C.x > 150],
    ['<b>Click</b> the glowing <b>orange jug</b> — Kessie reaches for any hold you click.', () => sim.hands.some(h => h.grip)],
    ['Now <b>click the ledge lip</b> above. She pulls herself up hand over hand.', () => sim.lipHeld()],
    ['Press <kbd>↑</kbd> (or click the lip again) to <b>mantle</b> onto the ledge.', () => sim.grounded && sim.b.FL.y < -80],
    ['Teal rings = in reach. Dashed amber = too far: <b>swing</b> <kbd>←</kbd><kbd>→</kbd> and <kbd>Space</kbd> to lunge. <kbd>↓</kbd> drops, <kbd>R</kbd> returns to your last ledge.', null, 9],
  ];
  let tip = 99, tipT = 0;
  function coach(dt) {
    const el = $('coach');
    if (tip >= TIPS.length) { el.classList.remove('on'); return; }
    if (tip < TIPS.length - 1 && sim.height() > 4) tip = TIPS.length - 1;
    const [html, done, life] = TIPS[tip];
    if (el.dataset.tip !== String(tip)) { el.innerHTML = html; el.dataset.tip = tip; el.classList.add('on'); tipT = 0; }
    tipT += dt;
    if (done ? done() : tipT > life) { tip++; }
  }

  function banner(zi) {
    const b = $('banner');
    b.innerHTML = `<small>ZONE ${zi + 1}</small>${LEVEL.zones[zi].name}`;
    b.classList.remove('on'); void b.offsetWidth; b.classList.add('on');
  }
  function flash(text, sec) { $('msg').textContent = text; $('msg').classList.add('on'); msgT = sec; }
  function fmt(t) { const m = Math.floor(t / 60), s = Math.floor(t % 60); return `${m}:${String(s).padStart(2, '0')}`; }

  function save() {
    if (state === 'title' || state === 'summit') return;
    localStorage.setItem(SAVE, JSON.stringify({ snap: sim.snapshot(), falls, best, maxZone }));
    stats.best = Math.max(stats.best || 0, best);
    localStorage.setItem(STATS, JSON.stringify(stats));
  }

  function onSummit() {
    state = 'summit';
    audio.summit();
    stats.summits = (stats.summits || 0) + 1;
    stats.bestTime = stats.bestTime ? Math.min(stats.bestTime, sim.time) : sim.time;
    stats.best = Math.max(stats.best || 0, sim.height());
    localStorage.setItem(STATS, JSON.stringify(stats));
    localStorage.removeItem(SAVE);
    $('stime').textContent = fmt(sim.time);
    $('sfalls').textContent = falls;
    setTimeout(() => { $('hud').hidden = true; $('summit').hidden = false; }, 2500);
  }

  if (dev) window.__grip = { sim, get R() { return R; }, start };
})();
