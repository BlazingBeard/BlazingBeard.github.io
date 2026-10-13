// Kessie Klimber: boot, input, fixed-step loop, HUD, coaching and saves.
(function () {
  const { Game, Renderer, Audio, DT } = GRIP;
  const SAVE = 'kessie.jump.v1', REC = 'kessie.jump.records';
  const $ = id => document.getElementById(id);
  const IMGS = ['bg_z1', 'bg_b2', 'bg_b3', 'bg_b4', 'bg_b5', 'bg_b6', 'bg_b7', 'tex_granite', 'tex_limestone', 'tex_canyon', 'tex_snowrock'];
  const fmt = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

  const game = new Game(LEVEL);
  const audio = new Audio();
  let R = null, state = 'loading', acc = 0, last = 0, maxZone = 0, best = 0, saveT = 0;
  const seen = {};
  const keys = new Set();
  const settings = Object.assign({ sound: true, shake: true }, JSON.parse(localStorage.getItem('kessie.settings') || '{}'));
  const records = JSON.parse(localStorage.getItem(REC) || '{}');

  // ---------- input ----------
  const K = {
    left: ['ArrowLeft', 'KeyA'], right: ['ArrowRight', 'KeyD'], up: ['ArrowUp', 'KeyW'], down: ['ArrowDown', 'KeyS'],
    jump: ['Space', 'KeyZ', 'KeyK', 'KeyJ'],
  };
  const held = a => K[a].some(k => keys.has(k));
  addEventListener('keydown', e => {
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
    if (e.repeat) return;
    audio.init();
    if (e.code === 'Escape' || e.code === 'KeyP') { if (state === 'play') pause(); else if (state === 'pause') resume(); return; }
    if (state === 'play' && e.code === 'KeyR') { game.respawn(); msg('Back to the last flag'); }
    if (state === 'title' && (e.code === 'Enter' || e.code === 'Space')) { ($('continue').hidden ? newGame : cont)(); return; }
    keys.add(e.code);
  });
  addEventListener('keyup', e => keys.delete(e.code));
  addEventListener('blur', () => { keys.clear(); if (state === 'play') pause(); });

  function readInput() {
    let x = (held('right') ? 1 : 0) - (held('left') ? 1 : 0), up = held('up'), down = held('down'), jump = held('jump');
    const pad = navigator.getGamepads ? [...navigator.getGamepads()].find(p => p) : null;
    if (pad) {
      const ax = pad.axes[0] || 0, ay = pad.axes[1] || 0, b = i => pad.buttons[i] && pad.buttons[i].pressed;
      if (Math.abs(ax) > 0.35) x = Math.sign(ax);
      if (b(14)) x = -1; if (b(15)) x = 1;
      up = up || b(12) || ay < -0.6; down = down || b(13) || ay > 0.6;
      jump = jump || b(0) || b(1);
      if (b(9) && !readInput.start) { readInput.start = true; state === 'play' ? pause() : state === 'pause' && resume(); }
      if (!b(9)) readInput.start = false;
    }
    // ↑ doubles as jump except when it means "climb" (on ivy)
    if (up && !game.nearIvy() && !game.p.hang) jump = true;
    return { x, up, down, jump };
  }

  // ---------- UI helpers ----------
  let msgT = 0, coachT = 0;
  function msg(s, t = 2.2) { $('msg').textContent = s; $('msg').classList.add('on'); msgT = t; }
  function coach(id, html, t = 6) { if (seen[id]) return; seen[id] = 1; $('coach').innerHTML = html; $('coach').classList.add('on'); coachT = t; }
  function banner(n, name) { const b = $('banner'); b.innerHTML = `<small>ZONE ${n} OF 7</small>${name}`; b.classList.remove('on'); void b.offsetWidth; b.classList.add('on'); }
  function show(id) { for (const s of ['title', 'pause', 'summit']) $(s).hidden = s !== id; $('hud').hidden = !(id === null || id === 'pause'); }

  // ---------- saves ----------
  function save() {
    if (game.won) { localStorage.removeItem(SAVE); return; }
    localStorage.setItem(SAVE, JSON.stringify({ s: game.snapshot(), best, maxZone, seen }));
  }
  function load() { try { return JSON.parse(localStorage.getItem(SAVE)); } catch { return null; } }
  function refreshTitle() {
    const sv = load();
    $('continue').hidden = !sv;
    $('newgame').className = sv ? 'ghost' : '';
    const r = [];
    if (sv) r.push(`Saved climb: ${(sv.best || 0).toFixed(1)} m · ${fmt(sv.s.time)}`);
    if (records.time) r.push(`Best summit ${fmt(records.time)} · ${records.shells || 0}/${game.shellTotal} keepsakes`);
    $('records').textContent = r.join('   ·   ');
  }

  // ---------- flow ----------
  function begin() {
    R.setGame(game);
    state = 'play'; show(null); last = performance.now(); acc = 0;
    audio.setEnabled(settings.sound);
    banner(game.zoneIndex() + 1, LEVEL.zones[game.zoneIndex()].name);
  }
  function newGame() {
    audio.init(); game.reset(); best = 0; maxZone = 0; for (const k in seen) delete seen[k];
    begin();
    setTimeout(() => coach('move', '<b>←/→</b> run · <b>Space</b> jump · tap <b>Space</b> again in mid-air to <b>double jump</b>'), 1200);
  }
  function cont() {
    const sv = load(); if (!sv) return newGame();
    audio.init(); game.restore(sv.s); best = sv.best || 0; maxZone = sv.maxZone || 0; Object.assign(seen, sv.seen || {});
    begin();
  }
  function pause() { state = 'pause'; show('pause'); save(); }
  function resume() { state = 'play'; show(null); last = performance.now(); }
  function summit() {
    state = 'summit'; save();
    const shells = Object.keys(game.shells).length;
    $('stime').textContent = fmt(game.time); $('sfalls').textContent = game.falls; $('sshells').textContent = `${shells}/${game.shellTotal}`;
    const nb = !records.time || game.time < records.time;
    if (nb) records.time = game.time;
    records.shells = Math.max(records.shells || 0, shells);
    localStorage.setItem(REC, JSON.stringify(records));
    $('srecord').textContent = nb ? 'New personal best!' : `Best: ${fmt(records.time)}`;
    audio.summit();
    setTimeout(() => show('summit'), 2600);
  }

  $('newgame').onclick = newGame; $('continue').onclick = cont; $('resume').onclick = resume;
  $('restart').onclick = () => { localStorage.removeItem(SAVE); newGame(); };
  $('totitle').onclick = () => { save(); state = 'title'; refreshTitle(); show('title'); };
  $('again').onclick = newGame; $('summitTitle').onclick = () => { state = 'title'; refreshTitle(); show('title'); };
  $('sound').checked = settings.sound; $('shake').checked = settings.shake;
  $('sound').onchange = e => { settings.sound = e.target.checked; audio.setEnabled(settings.sound); localStorage.setItem('kessie.settings', JSON.stringify(settings)); };
  $('shake').onchange = e => { settings.shake = e.target.checked; if (R) R.shakeOn = settings.shake; localStorage.setItem('kessie.settings', JSON.stringify(settings)); };

  // ---------- events ----------
  function handle(e) {
    R.onEvent(e);
    switch (e.type) {
      case 'jump': audio.jump(); break;
      case 'djump': audio.djump(); break;
      case 'walljump': audio.walljump(); coach('wj2', 'Nice! Chain wall jumps to climb any chimney.', 3.5); break;
      case 'land': audio.land(Math.min(12, e.drop / 40)); break;
      case 'fall': msg(e.m > 12 ? `Oof — ${e.m.toFixed(1)} m. She's fine. Go again!` : 'Shake it off!'); audio.grunt(0.9); break;
      case 'spring': audio.spring(); break;
      case 'shell': audio.shell(Object.keys(game.shells).length); break;
      case 'checkpoint': audio.checkpoint(); save(); break;
      case 'dance': audio.dance(e.move); coach('dance', 'Every flag earns a <b>power move</b>! Press <b>Space</b> to skip.', 4); msg('Checkpoint saved'); break;
      case 'crumble': audio.crumble(); break;
      case 'shake': coach('crumble', 'Dashed sandy rock <b>crumbles</b> under you — keep moving!', 4); break;
      case 'splash': audio.splash(); msg('Splash! Back to the flag'); break;
      case 'ouch': audio.ouch(); if (game.zoneIndex() === 0) coach('urchin', 'Sea urchins sting — <b>jump over</b> them.', 4); else coach('porc', 'Porcupine! Give it room, eh — <b>jump over</b>.', 4); break;
      case 'hang': audio.grip('rock'); coach('hang', 'Kessie <b>grabs ledges</b> automatically. Press <b>↑</b> or <b>Space</b> to pull up, <b>↓</b> to let go.', 6); break;
      case 'mantle': audio.grunt(0.4); break;
      case 'grab': audio.grip('rope'); break;
      case 'gust': audio.gust(); break;
      case 'summit': summit(); break;
    }
  }

  // ---------- loop ----------
  function frame(now) {
    requestAnimationFrame(frame);
    if (!R) return;
    const dt = Math.min(0.05, (now - last) / 1000 || 0); last = now;
    const time = now / 1000;
    if (state === 'play') {
      acc += dt;
      const inp = readInput();
      while (acc >= DT) {
        acc -= DT;
        game.step(inp);
        for (const e of game.events) handle(e);
        game.events.length = 0;
      }
      const h = game.height();
      best = Math.max(best, h);
      const zi = game.zoneIndex(), z = LEVEL.zones[zi];
      if (zi > maxZone) { maxZone = zi; banner(zi + 1, z.name); audio.checkpoint(); save(); }
      $('zone').textContent = `${zi + 1} · ${z.name}`;
      $('h').textContent = h.toFixed(1); $('best').textContent = best.toFixed(1);
      $('time').textContent = fmt(game.time); $('falls').textContent = game.falls;
      $('shells').textContent = `${Object.keys(game.shells).length}/${game.shellTotal}`;
      $('meter').style.height = `${Math.min(100, h / 84 * 100)}%`; $('bestmark').style.bottom = `${Math.min(100, best / 84 * 100)}%`;
      // contextual coaching
      if (game.p.air === 0 && !seen.move2) seen.move2 = 1;
      if (zi === 0 && h > 4) coach('ledge', 'Hold toward a wall as you reach its top — Kessie <b>grabs the ledge</b>.', 5);
      if (zi === 1) coach('wall', '<b>Wall jump:</b> hold into a wall to slide, then press <b>Space</b> to kick off.', 6);
      if (zi === 1) coach('banff', 'Welcome to <b>Banff National Park</b>! Grab the 🍁 maple leaves.', 5);
      if (zi === 2) coach('ivy', '<b>↑</b> climbs ladders and vines · golden springs <b>launch</b> you.', 5);
      if (zi === 5) coach('wind', '<b>Mountain gusts!</b> Arrows warn you. Hide behind rocks, jump when it calms.', 6);
      if (game.nearIvy() && !game.p.climb) coach('ivy2', 'Press <b>↑</b> to climb.', 3);
      audio.ambience(h, game.wind.force ? 1 : 0, game.wind.warn);
      saveT += dt; if (saveT > 3) { saveT = 0; save(); }
      if (msgT > 0 && (msgT -= dt) <= 0) $('msg').classList.remove('on');
      if (coachT > 0 && (coachT -= dt) <= 0) $('coach').classList.remove('on');
    }
    if (state === 'summit' || state === 'play' || state === 'pause') { if (state !== 'pause') R.update(dt, time); R.draw(time); }
    else { R.cam.y -= dt * 18; R.draw(time); }
  }

  // ---------- boot ----------
  Promise.all(IMGS.map(n => new Promise(res => { const i = new Image(); i.onload = () => res([n, i]); i.onerror = () => res([n, null]); i.src = `assets/${n}.jpg`; })))
    .then(list => {
      const A = Object.fromEntries(list);
      R = new Renderer($('game'), game, A); R.shakeOn = settings.shake;
      R.resize(); addEventListener('resize', () => R.resize());
      $('loading').hidden = true; $('loading').style.display = 'none';
      state = 'title'; refreshTitle(); show('title');
      R.cam.y = game.p.y - 300;
      last = performance.now(); requestAnimationFrame(frame);
    });

  // dev hooks for tests
  window.__grip = {
    game, get R() { return R; }, get state() { return state; },
    zone(i) { const z = LEVEL.zones[i]; const g = new Game(LEVEL); game.restore(g.snapshot()); let r = z.bottom; for (; r > z.top; r--) { const c = LEVEL.rows[r].indexOf('F'); if (c > 0) { game.p.x = (c + 0.5) * LEVEL.T; game.p.y = (r + 1) * LEVEL.T; game.cp = { x: game.p.x, y: game.p.y }; break; } } if (R) R.setGame(game); },
  };
})();
