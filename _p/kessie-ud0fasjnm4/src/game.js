// Kessie Klimber — platformer core. Pure logic: runs in the browser and in Node tests.
// Position is feet-centre (x, y); y grows downward. Fixed 120 Hz step.
(function (G) {
  const DT = 1 / 120;
  const K = {
    RUN: 255, ACC_G: 2900, DEC_G: 3600, ACC_A: 2000, DEC_A: 800,
    GRAV: 2300, FALL_MUL: 1.25, MAXFALL: 980, JUMP: 720, DJUMP: 660, CUT: 0.45, APEX: 0.55,
    COYOTE: 0.1, BUFFER: 0.13, SLIDE: 130, WJ_X: 300, WJ_Y: 700, WJ_LOCK: 0.16,
    SPRING: 1190, CLIMB: 150, CLIMB_X: 110, HOP_OFF: 560, PW: 18, PH: 44,
    CRUMBLE: 0.5, REGROW: 3, GUST: 7.5, DANCE: 1.3, DANCE_SKIP: 0.35,
  };
  const { PW, PH } = K;

  class Game {
    constructor(L) {
      this.L = L; this.T = L.T;
      this.shellTotal = L.rows.reduce((n, r) => n + (r.match(/\*/g) || []).length, 0);
      this.reset();
    }
    reset() {
      const s = this.L.spawn;
      this.p = this.fresh(s.x, s.y);
      this.cp = { x: s.x, y: s.y };
      this.crumbles = {}; this.shells = {}; this.springT = {};
      this.time = 0; this.won = false; this.falls = 0; this.prevJump = false; this.danceN = 0;
      this.events = [];
      this.wind = { force: 0, warn: 0, dir: 1 };
    }
    fresh(x, y) {
      return { x, y, vx: 0, vy: 0, face: 1, ground: true, coyote: 0, buffer: 0, air: 1, wallT: 0, wallDir: 0, lockT: 0,
        hang: null, climbUp: null, climb: false, dance: 0, danceQ: 0, danceMove: 0, regrab: 0, dropT: 0, hurtT: 0, cut: false, peak: y, land: 0, run: 0 };
    }

    // ---------- tiles ----------
    ch(c, r) { const L = this.L; return c < 0 || c >= L.cols ? '#' : r < 0 ? (r < -3 ? '#' : '.') : r >= L.rows.length ? '#' : L.rows[r][c]; }
    broken(c, r) { const k = this.crumbles[r * this.L.cols + c]; return !!(k && k.broken); }
    solid(c, r) { const k = this.ch(c, r); return k === '#' || (k === '~' && !this.broken(c, r)); }
    boxHits(x, y) {
      const T = this.T;
      for (let r = Math.floor((y - PH) / T); r <= Math.floor((y - 1e-3) / T); r++)
        for (let c = Math.floor((x - PW / 2) / T); c <= Math.floor((x + PW / 2 - 1e-3) / T); c++) if (this.solid(c, r)) return true;
      return false;
    }
    colHits(c, y) { const T = this.T; for (let r = Math.floor((y - PH) / T); r <= Math.floor((y - 1e-3) / T); r++) if (this.solid(c, r)) return true; return false; }
    groundAt(x, y, drop) {
      const T = this.T, r = Math.round(y / T);
      if (Math.abs(y - r * T) > 0.6) return null;
      for (let c = Math.floor((x - PW / 2) / T); c <= Math.floor((x + PW / 2 - 1e-3) / T); c++) {
        if (this.solid(c, r)) return { c, r, k: this.ch(c, r) };
        if (!drop && this.ch(c, r) === '=') return { c, r, k: '=' };
      }
      return null;
    }
    touching(d) { const p = this.p, T = this.T; const c = Math.floor((d > 0 ? p.x + PW / 2 + 1 : p.x - PW / 2 - 1) / T); return this.colHits(c, p.y - 4) ? c : null; }

    // ---------- movement with collision ----------
    moveX(dx) {
      const p = this.p, T = this.T;
      p.x += dx;
      if (!dx) return 0;
      const d = Math.sign(dx), c = Math.floor((d > 0 ? p.x + PW / 2 - 1e-3 : p.x - PW / 2) / T);
      if (!this.colHits(c, p.y)) return 0;
      // forgiving step-up when only the feet clip a corner
      const rt = Math.floor((p.y - 1e-3) / T) * T, lift = p.y - rt;
      if (lift <= 10 && !this.boxHits(p.x, rt)) { p.y = rt; if (p.vy > 0) p.vy = 0; return 0; }
      p.x = d > 0 ? c * T - PW / 2 : (c + 1) * T + PW / 2;
      p.vx = 0;
      return d;
    }
    moveY(dy) {
      const p = this.p, T = this.T, prevB = p.y;
      p.y += dy;
      if (dy > 0) {
        const r = Math.floor((p.y - 1e-3) / T);
        for (let c = Math.floor((p.x - PW / 2) / T); c <= Math.floor((p.x + PW / 2 - 1e-3) / T); c++) {
          if (this.solid(c, r) || (this.ch(c, r) === '=' && p.dropT <= 0 && prevB <= r * T + 0.01)) { p.y = r * T; p.vy = 0; return 1; }
        }
      } else if (dy < 0) {
        const r = Math.floor((p.y - PH) / T);
        let hit = false;
        for (let c = Math.floor((p.x - PW / 2) / T); c <= Math.floor((p.x + PW / 2 - 1e-3) / T); c++) if (this.solid(c, r)) hit = true;
        if (hit) {
          for (let s = 1; s <= 9; s++) for (const sx of [s, -s]) if (!this.boxHits(p.x + sx, p.y)) { p.x += sx; return 0; } // corner correction
          p.y = (r + 1) * T + PH; p.vy = 0; return -1;
        }
      }
      return 0;
    }

    zoneIndex() { const r = Math.floor((this.p.y - 1) / this.T); const i = this.L.zones.findIndex(z => r >= z.top && r <= z.bottom); return i < 0 ? 0 : i; }
    nearIvy() { const p = this.p, T = this.T; return p.climb || this.ch(Math.floor(p.x / T), Math.floor((p.y - PH / 2) / T))     === 'H'; }
    height() { return Math.max(0, (this.L.spawn.y - this.p.y) / this.L.PX_PER_M); }
    respawn() {
      const keep = this.p.face;
      this.p = this.fresh(this.cp.x, this.cp.y); this.p.face = keep;
      this.events.push({ type: 'respawn', x: this.cp.x, y: this.cp.y });
    }

    // ---------- wind ----------
    updateWind() {
      const z = this.L.zones[this.zoneIndex()], w = this.wind;
      const ph = this.time % K.GUST, n = Math.floor(this.time / K.GUST);
      w.dir = n % 2 ? -1 : 1;
      w.warn = z.wind && ph >= 3 && ph < 4.5 ? 1 : 0;
      w.force = z.wind && ph >= 4.5 ? w.dir : 0;
      if (w.force && ph - DT < 4.5) this.events.push({ type: 'gust', dir: w.dir });
    }
    sheltered() {
      const p = this.p, T = this.T, d = this.wind.dir, r = Math.floor((p.y - PH / 2) / T);
      for (let k = 1; k <= 2; k++) if (this.solid(Math.floor((p.x - d * k * T) / T), r)) return true;
      return false;
    }

    // ---------- main step ----------
    step(inp = {}) {
      const p = this.p, T = this.T, ev = this.events;
      const ix = inp.x || 0, up = !!inp.up, down = !!inp.down, jump = !!inp.jump;
      const pressed = jump && !this.prevJump; this.prevJump = jump;
      this.time += DT;
      for (const k of ['regrab', 'dropT', 'hurtT', 'lockT', 'wallT', 'coyote', 'buffer']) p[k] = Math.max(0, p[k] - DT);
      if (pressed) p.buffer = K.BUFFER;
      this.updateCrumbles();
      this.updateWind();
      if (this.won) return;

      // pulling up over a ledge
      if (p.climbUp) {
        const c = p.climbUp; c.t += DT / 0.2;
        const e = Math.min(1, c.t), ey = e < 0.6 ? e / 0.6 : 1, ex = e < 0.4 ? 0 : (e - 0.4) / 0.6;
        p.x = c.fx + (c.tx - c.fx) * ex; p.y = c.fy + (c.ty - c.fy) * ey;
        if (e >= 1) { p.climbUp = null; p.ground = true; p.air = 1; p.peak = p.y; p.buffer = 0; }
        return;
      }
      // hanging from a ledge
      if (p.hang) {
        const h = p.hang;
        if (this.solid(h.c, h.r)) this.touchCrumble(h.c, h.r);
        if (!this.solid(h.c, h.r)) { p.hang = null; p.regrab = 0.3; }
        else if (pressed && ix === -h.dir) { p.hang = null; this.wallJump(h.dir); }
        else if (pressed || up) {
          p.climbUp = { t: 0, fx: p.x, fy: p.y, tx: h.dir > 0 ? h.c * T + PW / 2 + 3 : (h.c + 1) * T - PW / 2 - 3, ty: h.r * T };
          p.hang = null; p.buffer = 0; ev.push({ type: 'mantle' });
        } else if (down) { p.hang = null; p.regrab = 0.35; }
        else { p.vx = p.vy = 0; return; }
        if (p.hang) return;
        if (p.climbUp) return;
      }

      // checkpoint power dance: starts once she's on her feet; a jump press skips the rest
      if (p.danceQ > 0) {
        p.danceQ = Math.max(0, p.danceQ - DT);
        if (p.ground && !p.climb) { p.danceQ = 0; p.dance = K.DANCE; p.danceMove = this.danceN++ % 4; ev.push({ type: 'dance', move: p.danceMove, x: p.x, y: p.y }); p.buffer = 0; return; }
      }
      if (p.dance > 0) {
        p.dance = Math.max(0, p.dance - DT);
        if (pressed && K.DANCE - p.dance > K.DANCE_SKIP) p.dance = 0;
        else {
          p.vx -= Math.sign(p.vx) * Math.min(Math.abs(p.vx), K.DEC_G * DT);
          p.vy = Math.min(K.MAXFALL, p.vy + K.GRAV * DT);
          this.moveX(p.vx * DT); this.moveY(p.vy * DT);
          p.ground = !!this.groundAt(p.x, p.y, false); p.buffer = 0;
          if (!p.ground) p.dance = 0;
          return;
        }
      }

      // ivy / rigging
      const onIvy = () => this.ch(Math.floor(p.x / T), Math.floor((p.y - PH / 2) / T)) === 'H';
      if (!p.climb && p.regrab <= 0 && onIvy() && (up || (down && !p.ground))) { p.climb = true; p.vx = 0; p.air = 1; ev.push({ type: 'grab' }); }
      if (p.climb) {
        if (pressed) {
          p.climb = false; p.vy = -K.JUMP * 0.95; p.vx = ix * K.RUN; p.regrab = 0.3; p.cut = true; p.buffer = 0;
          if (ix) p.face = ix;
          ev.push({ type: 'jump' });
        } else {
          p.vx = ix * K.CLIMB_X; p.vy = (down - up) * K.CLIMB;
          if (ix) p.face = ix;
          this.moveX(p.vx * DT);
          if (this.moveY(p.vy * DT) > 0) p.climb = false;
          if (!onIvy()) {
            p.climb = false;
            if (up) { p.vy = -K.HOP_OFF; p.regrab = 0.3; p.cut = false; }
          }
          p.ground = !!this.groundAt(p.x, p.y, false) && p.vy >= 0;
          p.peak = p.y; p.run += Math.abs(p.vy) * DT;
          this.triggers();
          return;
        }
      }

      // running / air control
      const gust = this.wind.force && !this.sheltered() ? this.wind.force : 0;
      const target = ix * K.RUN + (p.ground ? gust * 110 : 0);
      if (ix) p.face = ix;
      if (p.lockT <= 0) {
        const acc = p.ground ? (ix ? K.ACC_G : K.DEC_G) : (ix ? K.ACC_A : K.DEC_A);
        if (Math.abs(p.vx) > K.RUN && Math.sign(p.vx) === ix) p.vx -= Math.sign(p.vx) * Math.min(Math.abs(p.vx) - K.RUN, 300 * DT);
        else p.vx += Math.max(-acc * DT, Math.min(acc * DT, target - p.vx));
      }
      if (gust && !p.ground) {
        p.vx += gust * 1300 * DT;
        p.vx = Math.max(-K.RUN * 1.7, Math.min(K.RUN * 1.7, p.vx));
      }

      // jumping
      if (p.buffer > 0) {
        const g = p.ground ? this.groundAt(p.x, p.y, false) : null;
        if (p.ground && down && g && g.k === '=' && !this.groundAt(p.x, p.y, true)) {
          p.dropT = 0.22; p.ground = false; p.buffer = 0; p.y += 1;
        } else if (p.ground || p.coyote > 0) {
          p.vy = -K.JUMP; p.ground = false; p.coyote = 0; p.buffer = 0; p.cut = true;
          ev.push({ type: 'jump', x: p.x, y: p.y });
        } else if (p.wallT > 0) {
          this.wallJump(-p.wallDir);
        } else if (pressed && p.air > 0) {
          p.vy = -K.DJUMP; p.air--; p.buffer = 0; p.cut = true;
          if (ix) p.vx = Math.max(Math.abs(p.vx), K.RUN * 0.8) * ix;
          ev.push({ type: 'djump', x: p.x, y: p.y });
        }
      }
      if (!jump && p.cut && p.vy < 0) { p.vy *= K.CUT; p.cut = false; }
      if (p.vy >= 0) p.cut = false;

      // gravity and wall slide
      let g = K.GRAV * (p.vy > 0 ? K.FALL_MUL : 1);
      if (jump && Math.abs(p.vy) < 80) g *= K.APEX;
      p.vy = Math.min(K.MAXFALL, p.vy + g * DT);
      const wl = this.touching(-1) !== null, wr = this.touching(1) !== null;
      const slideDir = !p.ground && ((wr && ix > 0) ? 1 : (wl && ix < 0) ? -1 : 0);
      if (slideDir && p.vy > K.SLIDE) { p.vy = Math.max(K.SLIDE, p.vy - 5000 * DT); p.sliding = slideDir; } else p.sliding = 0;
      if (!p.ground && (wl || wr)) { p.wallDir = wr ? 1 : -1; p.wallT = 0.09; p.air = Math.max(p.air, 0); }

      // integrate
      const was = p.ground;
      this.moveX(p.vx * DT);
      const hitY = this.moveY(p.vy * DT);
      const gr = p.vy >= 0 ? this.groundAt(p.x, p.y, p.dropT > 0) : null;
      p.ground = !!gr;
      if (p.ground) {
        p.coyote = K.COYOTE; p.air = 1;
        if (gr.k === '~') this.touchCrumble(gr.c, gr.r);
        if (!was) {
          const drop = p.y - p.peak;
          p.land = Math.min(1, drop / 300);
          ev.push({ type: 'land', x: p.x, y: p.y, drop });
          if (drop > 7 * T) { this.falls++; ev.push({ type: 'fall', m: drop / this.L.PX_PER_M, x: p.x, y: p.y }); }
        }
        p.peak = p.y;
        p.run += Math.abs(p.vx) * DT;
      } else {
        p.peak = Math.min(p.peak, p.y);
        if (hitY < 0) ev.push({ type: 'bonk' });
      }

      // ledge grab
      if (!p.ground && p.vy > -90 && p.regrab <= 0 && !down) this.tryGrab(ix);
      this.triggers();
    }

    wallJump(away) {
      const p = this.p;
      p.vx = away * K.WJ_X; p.vy = -K.WJ_Y; p.lockT = K.WJ_LOCK; p.face = away; p.air = 1;
      p.wallT = 0; p.buffer = 0; p.cut = true; p.ground = false;
      this.events.push({ type: 'walljump', x: p.x - away * PW / 2, y: p.y - PH / 2, dir: away });
    }

    tryGrab(ix) {
      const p = this.p, T = this.T;
      for (const d of [1, -1]) {
        const c = this.touching(d) ?? (ix === d ? Math.floor((d > 0 ? p.x + PW / 2 + 3 : p.x - PW / 2 - 3) / T) : null);
        if (c === null) continue;
        if (!(ix === d || p.vx * d > 0 || this.touching(d) !== null)) continue;
        const top = p.y - PH;
        for (let r = Math.floor((top - 14) / T); r <= Math.floor((top + 20) / T); r++) {
          const lt = r * T;
          if (lt < top - 14 || lt > top + 20) continue;
          if (!this.solid(c, r) || this.solid(c, r - 1) || this.solid(c, r - 2)) continue;
          const nx = d > 0 ? c * T - PW / 2 - 0.01 : (c + 1) * T + PW / 2 + 0.01, ny = lt - 2 + PH;
          if (this.boxHits(nx, ny)) continue;
          p.x = nx; p.y = ny; p.vx = p.vy = 0; p.face = d; p.air = 1; p.cut = false;
          p.hang = { c, r, dir: d };
          this.events.push({ type: 'hang', x: d > 0 ? c * T : (c + 1) * T, y: lt });
          return true;
        }
      }
      return false;
    }

    // ---------- crumbling rock ----------
    touchCrumble(c, r) {
      const key = r * this.L.cols + c;
      if (!this.crumbles[key]) { this.crumbles[key] = { c, r, t: 0, broken: false }; this.events.push({ type: 'shake', c, r }); }
    }
    updateCrumbles() {
      const T = this.T, p = this.p;
      for (const key in this.crumbles) {
        const k = this.crumbles[key];
        k.t += DT;
        if (!k.broken && k.t > K.CRUMBLE) { k.broken = true; this.events.push({ type: 'crumble', x: (k.c + 0.5) * T, y: (k.r + 0.5) * T }); }
        if (k.broken && k.t > K.CRUMBLE + K.REGROW) {
          const over = p.x + PW / 2 > k.c * T && p.x - PW / 2 < (k.c + 1) * T && p.y > k.r * T && p.y - PH < (k.r + 1) * T;
          if (!over) delete this.crumbles[key];
        }
      }
    }

    // ---------- pickups and hazards ----------
    triggers() {
      const p = this.p, T = this.T, ev = this.events;
      for (let r = Math.floor((p.y - PH) / T); r <= Math.floor((p.y - 1e-3) / T); r++)
        for (let c = Math.floor((p.x - PW / 2) / T); c <= Math.floor((p.x + PW / 2 - 1e-3) / T); c++) {
          const k = this.ch(c, r), key = r * this.L.cols + c, cx = (c + 0.5) * T, cy = (r + 0.5) * T;
          if (k === '*' && !this.shells[key]) {
            if (Math.abs(p.x - cx) < PW / 2 + 10 && p.y > cy - 10 && p.y - PH < cy + 10) { this.shells[key] = 1; ev.push({ type: 'shell', x: cx, y: cy }); }
          } else if (k === 'o') {
            if (p.vy >= 0 && p.y > r * T + 14 && Math.abs(p.x - cx) < 18) {
              p.vy = -K.SPRING; p.ground = false; p.air = 1; p.cut = false; p.climb = false; p.y = Math.min(p.y, (r + 1) * T - 2);
              this.springT[key] = this.time; ev.push({ type: 'spring', x: cx, y: (r + 1) * T });
            }
          } else if (k === 'x') {
            if (p.hurtT <= 0 && Math.abs(p.x - cx) < PW / 2 + 9 && p.y > r * T + 10) {
              const d = Math.sign(p.x - cx) || -p.face;
              p.vx = d * 300; p.vy = -560; p.ground = false; p.hurtT = 0.6; p.lockT = 0.3; p.climb = false;
              ev.push({ type: 'ouch', x: cx, y: cy });
            }
          } else if (k === 'w') {
            if (p.y - PH / 2 > r * T) { ev.push({ type: 'splash', x: p.x, y: r * T }); this.respawn(); return; }
          } else if (k === 'F') {
            if (this.cp.x !== cx || this.cp.y !== (r + 1) * T) { this.cp = { x: cx, y: (r + 1) * T }; p.danceQ = 1; ev.push({ type: 'checkpoint', x: cx, y: (r + 1) * T }); }
          } else if (k === 'T' && !this.won) {
            this.won = true; ev.push({ type: 'summit' });
          }
        }
    }

    // ---------- save / restore ----------
    snapshot() {
      return { p: { ...this.p, hang: this.p.hang && { ...this.p.hang }, climbUp: this.p.climbUp && { ...this.p.climbUp } }, cp: { ...this.cp },
        crumbles: Object.fromEntries(Object.entries(this.crumbles).map(([k, v]) => [k, { ...v }])), shells: { ...this.shells },
        time: this.time, won: this.won, falls: this.falls, prevJump: this.prevJump, danceN: this.danceN };
    }
    restore(s) {
      this.p = { ...s.p, hang: s.p.hang && { ...s.p.hang }, climbUp: s.p.climbUp && { ...s.p.climbUp } }; this.cp = { ...s.cp };
      this.crumbles = Object.fromEntries(Object.entries(s.crumbles || {}).map(([k, v]) => [k, { ...v }]));
      this.shells = { ...(s.shells || {}) }; this.time = s.time || 0; this.won = !!s.won; this.falls = s.falls || 0; this.prevJump = !!s.prevJump; this.danceN = s.danceN || 0;
      this.events = [];
    }
  }

  G.GRIP = G.GRIP || {};
  Object.assign(G.GRIP, { Game, K, DT });
})(typeof window !== 'undefined' ? window : globalThis);
