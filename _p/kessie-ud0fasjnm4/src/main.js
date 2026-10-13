// Kessie Klimber: boot, input, fixed-step loop, HUD, coaching and saves.
(function () {
  const { Game, Renderer, Audio, DT } = GRIP;
  const REC = 'kessie.records.v2', OLD_REC = 'kessie.jump.records';
  const saveKey = r => r.id === 'banff' ? 'kessie.jump.v1' : `kessie.jump.v1.${r.id}`;
  const $ = id => document.getElementById(id);
  const IMGS = [...new Set(ROUTES.flatMap(r => r.images))];
  const fmt = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

  let route = ROUTES.find(r => r.id === localStorage.getItem('kessie.route')) || ROUTES[0];
  let game = new Game(route);
  const audio = new Audio();
  let R = null, state = 'loading', acc = 0, last = 0, maxZone = 0, best = 0, saveT = 0;
  const seen = {};
  const keys = new Set();
  const settings = Object.assign({ sound: true, shake: true }, JSON.parse(localStorage.getItem('kessie.settings') || '{}'));
  const records = JSON.parse(localStorage.getItem(REC) || 'null') || (() => {
    // migrate the single-route records from v5 into the classic route
    const old = JSON.parse(localStorage.getItem(OLD_REC) || '{}');
    return old.time ? { banff: { time: old.time, shells: old.shells || 0, sends: 1 } } : {};
  })();
  const recOf = r => records[r.id] || (records[r.id] = {});
  const grassi = () => route.theme === 'grassi';

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
  document.addEventListener('visibilitychange', () => { if (document.hidden && state === 'play') pause(); });

  // ---------- touch: floating stick on the left, jump anywhere on the right ----------
  const touch = { on: false, x: 0, up: false, down: false, jump: false };
  const stick = { id: null, ox: 0, oy: 0 }, jumpers = new Set(), RAD = 56;
  const tz = $('touch'), stickEl = $('stick'), knob = $('knob');
  const tip = (kb, tc) => touch.on ? tc : kb;
  function enableTouch() {
    if (touch.on) return;
    touch.on = true; document.body.classList.add('touch'); if (R) R.touch = true; restStick();
  }
  function restStick() {
    stickEl.style.left = `calc(${110}px + env(safe-area-inset-left))`; stickEl.style.top = `${innerHeight - 110}px`;
    stickEl.classList.remove('on'); knob.style.transform = '';
  }
  function moveStick(e) {
    let dx = e.clientX - stick.ox, dy = e.clientY - stick.oy;
    const d = Math.hypot(dx, dy);
    // drag the base along so reversing direction is always a short thumb move
    if (d > RAD) { stick.ox += dx * (1 - RAD / d); stick.oy += dy * (1 - RAD / d); dx = e.clientX - stick.ox; dy = e.clientY - stick.oy; }
    stickEl.style.left = `${stick.ox}px`; stickEl.style.top = `${stick.oy}px`;
    knob.style.transform = `translate(${dx}px,${dy}px)`;
    touch.x = dx > 14 ? 1 : dx < -14 ? -1 : 0;
    touch.up = dy < -RAD * 0.6 && -dy > Math.abs(dx) * 0.7;
    touch.down = dy > RAD * 0.6 && dy > Math.abs(dx) * 0.7;
  }
  function endPointer(e) {
    if (e.pointerId === stick.id) { stick.id = null; touch.x = 0; touch.up = touch.down = false; restStick(); }
    if (jumpers.delete(e.pointerId)) { touch.jump = jumpers.size > 0; $('tjump').classList.toggle('on', touch.jump); }
  }
  tz.addEventListener('pointerdown', e => {
    if (e.target.closest('.tbtn')) return;
    e.preventDefault(); audio.init(); enableTouch();
    if (e.clientX < innerWidth * 0.45 && stick.id === null) {
      stick.id = e.pointerId; stick.ox = e.clientX; stick.oy = e.clientY; stickEl.classList.add('on'); moveStick(e);
    } else { jumpers.add(e.pointerId); touch.jump = true; $('tjump').classList.add('on'); }
  });
  tz.addEventListener('pointermove', e => { if (e.pointerId === stick.id) moveStick(e); });
  for (const t of ['pointerup', 'pointercancel', 'lostpointercapture']) tz.addEventListener(t, endPointer);
  tz.addEventListener('contextmenu', e => e.preventDefault());
  $('tpause').onclick = () => state === 'play' && pause();
  $('tflag').onclick = () => { if (state === 'play') { game.respawn(); msg('Back to the last flag'); } };
  if (matchMedia('(pointer: coarse)').matches) enableTouch();
  addEventListener('touchstart', enableTouch, { passive: true });
  addEventListener('resize', () => { if (touch.on && stick.id === null) restStick(); });
  const buzz = ms => touch.on && navigator.vibrate && navigator.vibrate(ms);
  function goFull() {
    if (!touch.on || document.fullscreenElement) return;
    const el = document.documentElement;
    if (el.requestFullscreen) el.requestFullscreen({ navigationUI: 'hide' }).catch(() => {});
  }

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
    // ↑ doubles as jump except when it means "climb" (on ivy); the touch stick never jumps on its own
    if (up && !game.nearIvy() && !game.p.hang) jump = true;
    if (touch.on) { if (touch.x) x = touch.x; up = up || touch.up; down = down || touch.down; jump = jump || touch.jump; }
    return { x, up, down, jump };
  }

  // ---------- UI helpers ----------
  let msgT = 0, coachT = 0;
  function msg(s, t = 2.2) { $('msg').textContent = s; $('msg').classList.add('on'); msgT = t; }
  function coach(id, html, t = 6) { if (seen[id]) return; seen[id] = 1; $('coach').innerHTML = html; $('coach').classList.add('on'); coachT = t; }
  function banner(n, name) { const b = $('banner'); b.innerHTML = `<small>${grassi() ? 'SECTION' : 'ZONE'} ${n} OF ${route.zones.length}</small>${name}`; b.classList.remove('on'); void b.offsetWidth; b.classList.add('on'); }
  function show(id) { for (const s of ['title', 'pause', 'summit']) $(s).hidden = s !== id; $('hud').hidden = !(id === null || id === 'pause'); }

  // ---------- saves ----------
  function save() {
    if (game.won) { localStorage.removeItem(saveKey(route)); return; }
    localStorage.setItem(saveKey(route), JSON.stringify({ s: game.snapshot(), best, maxZone, seen }));
  }
  function load(r = route) { try { return JSON.parse(localStorage.getItem(saveKey(r))); } catch { return null; } }
  const totals = {};
  const shellTotal = r => totals[r.id] ?? (totals[r.id] = r.rows.join('').split('*').length - 1);
  function recLine(r) {
    const rc = records[r.id] || {}, sv = load(r);
    if (rc.time) return `<b>${fmt(rc.time)}</b> best · ${rc.shells || 0}/${shellTotal(r)} ${r.icon} · ${rc.sends || 1} send${(rc.sends || 1) > 1 ? 's' : ''}`;
    if (sv) return `In progress · ${(sv.best || 0).toFixed(1)} m of ${r.metres}`;
    return 'Not sent yet';
  }
  function buildPicker() {
    $('routes').innerHTML = ROUTES.map(r => `<button class="rcard" data-id="${r.id}">
      <i class="${r.flipTitle ? 'flip' : ''}" style="background-image:url(assets/${r.title}.jpg)"></i>
      <span><em>${r.grade}</em><strong>${r.name}</strong><small>${r.area}</small><u id="rec_${r.id}"></u></span></button>`).join('');
    for (const b of $('routes').querySelectorAll('.rcard')) b.onclick = () => pickRoute(b.dataset.id);
  }
  function pickRoute(id) {
    const r = ROUTES.find(x => x.id === id);
    if (!r || (r === route && game)) { refreshTitle(); return; }
    route = r; localStorage.setItem('kessie.route', r.id);
    game = new Game(r);
    if (R) { R.setGame(game); R.cam.y = game.p.y - 300; }
    refreshTitle();
  }
  function refreshTitle() {
    const sv = load();
    $('continue').hidden = !sv;
    $('newgame').className = sv ? 'ghost' : '';
    $('newgame').textContent = sv ? 'New climb' : grassi() ? 'Rope up' : 'Start climb';
    $('rtag').textContent = route.tag;
    $('rblurb').innerHTML = route.blurb;
    $('title').style.setProperty('--tbg', `url(assets/${route.title}.jpg)`);
    $('title').classList.toggle('flip', !!route.flipTitle);
    $('kicon').textContent = route.icon;
    for (const r of ROUTES) { const el = $('rec_' + r.id); if (el) el.innerHTML = recLine(r); }
    for (const b of $('routes').querySelectorAll('.rcard')) b.classList.toggle('on', b.dataset.id === route.id);
    const rc = records[route.id] || {};
    $('records').textContent = sv ? `Saved climb: ${(sv.best || 0).toFixed(1)} m · ${fmt(sv.s.time)}` : rc.falls !== undefined ? `Fewest falls on a send: ${rc.falls}` : '';
  }

  // ---------- flow ----------
  function begin() {
    R.setGame(game);
    state = 'play'; show(null); last = performance.now(); acc = 0;
    audio.setEnabled(settings.sound);
    banner(game.zoneIndex() + 1, route.zones[game.zoneIndex()].name);
  }
  function newGame() {
    audio.init(); goFull(); game.reset(); best = 0; maxZone = 0; for (const k in seen) delete seen[k];
    begin();
    if (grassi()) setTimeout(() => coach('grassi', `Welcome to <b>Grassi Lakes</b>, Canmore! Climb to <b>${route.name} (${route.grade})</b> and find the ${route.icon} fossils in the 350-million-year-old reef.`, 6), 1200);
    else setTimeout(() => coach('move', tip('<b>←/→</b> run · <b>Space</b> jump · tap <b>Space</b> again in mid-air to <b>double jump</b>', '<b>Left thumb</b> runs · tap the <b>right side</b> to jump · tap again mid-air to <b>double jump</b>')), 1200);
  }
  function cont() {
    const sv = load(); if (!sv) return newGame();
    audio.init(); goFull(); game.restore(sv.s); best = sv.best || 0; maxZone = sv.maxZone || 0; Object.assign(seen, sv.seen || {});
    begin();
  }
  function pause() { state = 'pause'; show('pause'); save(); }
  function resume() { state = 'play'; show(null); last = performance.now(); }
  function summit() {
    state = 'summit'; save();
    const shells = Object.keys(game.shells).length, rc = recOf(route);
    $('stitle').textContent = grassi() ? 'SENT!' : 'SUMMIT';
    $('slead').textContent = grassi() ? `Kessie clipped the chains on ${route.name} (${route.grade}) in` : 'Kessie topped out in';
    $('snote').textContent = route.sendNote || '';
    $('stime').textContent = fmt(game.time); $('sfalls').textContent = game.falls; $('sshells').textContent = `${shells}/${game.shellTotal}`;
    const nb = !rc.time || game.time < rc.time;
    if (nb) rc.time = game.time;
    rc.shells = Math.max(rc.shells || 0, shells);
    rc.falls = Math.min(rc.falls ?? Infinity, game.falls);
    rc.sends = (rc.sends || 0) + 1;
    localStorage.setItem(REC, JSON.stringify(records));
    $('srecord').textContent = (nb ? 'New personal best!' : `Best: ${fmt(rc.time)}`) + ` · Send #${rc.sends}`;
    audio.summit();
    setTimeout(() => show('summit'), 2600);
  }

  $('newgame').onclick = newGame; $('continue').onclick = cont; $('resume').onclick = resume;
  $('restart').onclick = () => { localStorage.removeItem(saveKey(route)); newGame(); };
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
      case 'fall': buzz(40); msg(e.m > 12 ? `Oof — ${e.m.toFixed(1)} m. She's fine. Go again!` : 'Shake it off!'); audio.grunt(0.9); break;
      case 'spring': audio.spring(); break;
      case 'shell': audio.shell(Object.keys(game.shells).length); break;
      case 'checkpoint': audio.checkpoint(); save(); break;
      case 'dance': audio.dance(e.move); coach('dance', `Every ${grassi() ? 'bolt clip' : 'flag'} earns a <b>power move</b>! ` + tip('Press <b>Space</b>', 'Tap <b>Jump</b>') + ' to skip.', 4); msg(grassi() ? 'Clipped! Checkpoint saved' : 'Checkpoint saved'); break;
      case 'crumble': audio.crumble(); break;
      case 'shake': coach('crumble', 'Dashed sandy rock <b>crumbles</b> under you — keep moving!', 4); break;
      case 'splash': audio.splash(); msg('Splash! Back to the flag'); break;
      case 'ouch': buzz(25); audio.ouch(); if (route.zones[game.zoneIndex()].coast) coach('urchin', 'Sea urchins sting — <b>jump over</b> them.', 4); else coach('porc', 'Porcupine! Give it room, eh — <b>jump over</b>.', 4); break;
      case 'hang': audio.grip('rock'); coach('hang', 'Kessie <b>grabs ledges</b> automatically. ' + tip('Press <b>↑</b> or <b>Space</b> to pull up, <b>↓</b> to let go.', 'Tap <b>Jump</b> to pull up, pull the stick <b>down</b> to let go.'), 6); break;
      case 'mantle': audio.grunt(0.4); break;
      case 'grab': audio.grip(grassi() ? 'rock' : 'rope'); if (route.zones[game.zoneIndex()].pump) coach('dyno', 'Jugs! ' + tip('<b>Space</b>', 'Tap <b>Jump</b>') + ' to <b>dyno</b> off a hold — every grab resets your double jump.', 5); break;
      case 'pumped': buzz(60); audio.grunt(1); coach('pump2', 'Forearms <b>pumped</b> out! Stand on a ledge to shake out, then go again.', 5); break;
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
      const zi = game.zoneIndex(), z = route.zones[zi];
      if (zi > maxZone) { maxZone = zi; banner(zi + 1, z.name); audio.checkpoint(); save(); }
      $('zone').textContent = `${zi + 1} · ${z.name}`;
      $('h').textContent = h.toFixed(1); $('best').textContent = best.toFixed(1);
      $('time').textContent = fmt(game.time); $('falls').textContent = game.falls;
      $('shells').textContent = `${Object.keys(game.shells).length}/${game.shellTotal}`;
      $('meter').style.height = `${Math.min(100, h / route.metres * 100)}%`; $('bestmark').style.bottom = `${Math.min(100, best / route.metres * 100)}%`;
      // contextual coaching
      if (game.p.air === 0 && !seen.move2) seen.move2 = 1;
      if (grassi()) {
        if (zi === 1) coach('wall', 'The Reef: <b>wall jump</b> up the chimney · hold into a wall, then ' + tip('press <b>Space</b>', 'tap <b>Jump</b>') + '.', 6);
        if (z.pump) coach('pump', `<b>${route.name}</b>: overhanging jugs. Hanging builds <b>pump</b> (ring above Kessie) — rest on ledges.`, 6);
        if (zi === 3 && game.p.climb) coach('roof', 'Traverse the roof: hold <b>←/→</b> on the jugs, then pull for the <b>chains</b>!', 5);
      } else {
      if (zi === 0 && h > 4) coach('ledge', 'Hold toward a wall as you reach its top — Kessie <b>grabs the ledge</b>.', 5);
      if (zi === 1) coach('wall', '<b>Wall jump:</b> hold into a wall to slide, then ' + tip('press <b>Space</b>', 'tap <b>Jump</b>') + ' to kick off.', 6);
      if (zi === 1) coach('banff', 'Welcome to <b>Banff National Park</b>! Grab the 🍁 maple leaves.', 5);
      if (zi === 2) coach('ivy', tip('<b>↑</b>', 'Stick <b>up</b>') + ' climbs ladders and vines · golden springs <b>launch</b> you.', 5);
      if (zi === 5) coach('wind', '<b>Mountain gusts!</b> Arrows warn you. Hide behind rocks, jump when it calms.', 6);
      }
      if (game.nearIvy() && !game.p.climb) coach('ivy2', tip('Press <b>↑</b> to climb.', 'Push the stick <b>up</b> to climb.'), 3);
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
      R = new Renderer($('game'), game, A); R.shakeOn = settings.shake; R.touch = touch.on;
      R.resize(); addEventListener('resize', () => R.resize());
      $('loading').hidden = true; $('loading').style.display = 'none';
      state = 'title'; buildPicker(); refreshTitle(); show('title');
      R.cam.y = game.p.y - 300;
      last = performance.now(); requestAnimationFrame(frame);
    });

  // dev hooks for tests
  window.__grip = {
    get game() { return game; }, get route() { return route; }, touch, get R() { return R; }, get state() { return state; }, pickRoute, records,
    zone(i) { const L = route, z = L.zones[i]; const g = new Game(L); game.restore(g.snapshot()); let r = z.bottom; for (; r > z.top; r--) { const c = L.rows[r].indexOf('F'); if (c > 0) { game.p.x = (c + 0.5) * L.T; game.p.y = (r + 1) * L.T; game.cp = { x: game.p.x, y: game.p.y }; break; } } if (R) R.setGame(game); },
  };
})();
