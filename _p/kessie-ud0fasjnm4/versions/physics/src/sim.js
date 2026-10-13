// Kessie Klimber simulation — pure logic, no DOM. Fixed 120 Hz Verlet ragdoll that climbs on discrete holds:
// click a hold, the right hand reaches for it and the body hauls itself into position.
(function (G) {
  const DT = 1 / 120;
  const GRAV = 1150;
  const ARM = 64;             // shoulder → hand
  const SPAN = 118;           // max hold-to-hold distance for a static move (one hand stays on)
  const STAND_REACH = ARM + 46; // reach from the ground (on tiptoes)
  const LUNGE = 250;          // max distance for a dynamic lunge
  const ITER = 10;
  const MUSCLE_MAX = 560, MUSCLE_KP = 14, MUSCLE_KA = 18;
  const SURF = {
    rock: { drain: 1 }, smooth: { drain: 1.6 }, jug: { drain: -1 }, lip: { drain: 0.3 },
    crumbly: { drain: 1, crumble: 1.8 }, wet: { drain: 1.8 }, metal: { drain: 1.2 }, rope: { drain: 1 },
  };
  const SPACING = { rock: 54, wet: 54, metal: 54, crumbly: 54, jug: 54, smooth: 74 };
  const BASE_DRAIN = 4.5, REGEN_FREE = 14, REGEN_REST = 30;
  const WALK_SPEED = 170, HOP = 400, SWING = 900;

  class Pt {
    constructor(x, y, r, im) { this.x = x; this.y = y; this.px = x; this.py = y; this.r = r; this.im = im; this.contact = null; }
    vx() { return (this.x - this.px) / DT; }
    vy() { return (this.y - this.py) / DT; }
    set(x, y) { this.x = this.px = x; this.y = this.py = y; }
  }

  function closestOnSeg(px, py, ax, ay, bx, by) {
    const ex = bx - ax, ey = by - ay, l2 = ex * ex + ey * ey;
    let t = l2 ? ((px - ax) * ex + (py - ay) * ey) / l2 : 0;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    const x = ax + ex * t, y = ay + ey * t;
    return { x, y, t, d2: (px - x) * (px - x) + (py - y) * (py - y) };
  }
  function inside(px, py, pts) {
    let c = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const [xi, yi] = pts[i], [xj, yj] = pts[j];
      if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) c = !c;
    }
    return c;
  }
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  function segX(ax, ay, bx, by, cx, cy, dx, dy) {
    const r1 = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax), r2 = (bx - ax) * (dy - ay) - (by - ay) * (dx - ax);
    const r3 = (dx - cx) * (ay - cy) - (dy - cy) * (ax - cx), r4 = (dx - cx) * (by - cy) - (dy - cy) * (bx - cx);
    return r1 * r2 < 0 && r3 * r4 < 0;
  }
  // true if the straight line a→b doesn't pass through rock
  function clearLine(shapes, a, b, skip) {
    const x1 = Math.min(a.x, b.x), x2 = Math.max(a.x, b.x), y1 = Math.min(a.y, b.y), y2 = Math.max(a.y, b.y);
    for (const s of shapes) {
      if (s.broken > 0 || (skip && skip.includes(s))) continue;
      const bb = s.aabb;
      if (x2 < bb[0] || x1 > bb[2] || y2 < bb[1] || y1 > bb[3]) continue;
      const P = s.pts;
      for (let i = 0; i < P.length; i++) {
        const c = P[i], d = P[(i + 1) % P.length];
        if (segX(a.x, a.y, b.x, b.y, c[0], c[1], d[0], d[1])) return false;
      }
    }
    return true;
  }  // a hand can also go around a corner: straight, or via an L-shaped elbow
  function clearReach(shapes, a, b, skip) {
    if (clearLine(shapes, a, b, skip)) return true;
    for (const w of [{ x: a.x, y: b.y }, { x: b.x, y: a.y }]) if (clearLine(shapes, a, w, skip) && clearLine(shapes, w, b, skip)) return true;
    return false;
  }


  // ---------- holds, generated from the terrain ----------
  function buildHolds(shapes) {
    const solid = (x, y, r) => shapes.some(s => {
      const [x1, y1, x2, y2] = s.aabb;
      if (x < x1 - r || x > x2 + r || y < y1 - r || y > y2 + r) return false;
      if (inside(x, y, s.pts)) return true;
      for (let i = 0; i < s.pts.length; i++) {
        const a = s.pts[i], b = s.pts[(i + 1) % s.pts.length];
        if (closestOnSeg(x, y, a[0], a[1], b[0], b[1]).d2 < r * r) return true;
      }
      return false;
    });
    const raw = [];
    for (const s of shapes) {
      const [x1, y1, x2, y2] = s.aabb;
      if (x1 < -2000) continue; // seabed
      if ((x2 - x1 <= 26 && y2 - y1 <= 26) || (s.pts.length === 4 && y2 - y1 <= 20 && x2 - x1 <= 45)) {
        raw.push({ x: (x1 + x2) / 2, y: y1 - 4, nx: 0, ny: -1, type: s.types[0], s, pri: 2, small: true });
        continue;
      }
      const n = s.pts.length, N = [];
      for (let i = 0; i < n; i++) {
        const a = s.pts[i], b = s.pts[(i + 1) % n], ex = b[0] - a[0], ey = b[1] - a[1], l = Math.hypot(ex, ey) || 1;
        let nx = ey / l, ny = -ex / l;
        if (inside((a[0] + b[0]) / 2 + nx * 2, (a[1] + b[1]) / 2 + ny * 2, s.pts)) { nx = -nx; ny = -ny; }
        N.push({ a, b, l, nx, ny });
      }
      for (let i = 0; i < n; i++) {
        const e = N[i], type = s.types[i];
        if (e.a[1] > 34 && e.b[1] > 34) continue;
        if (e.ny < -0.7) continue; // a floor you stand on, not a hold
        const k = Math.max(1, Math.round(e.l / (SPACING[type] || 54)));
        for (let j = 0; j < k; j++) {
          const t = (j + 0.5) / k;
          raw.push({ x: e.a[0] + (e.b[0] - e.a[0]) * t + e.nx * 6, y: e.a[1] + (e.b[1] - e.a[1]) * t + e.ny * 6, nx: e.nx, ny: e.ny, type, s, pri: 0 });
        }
      }
      // ledge lips: convex corners where a wall meets a floor
      for (let i = 0; i < n; i++) {
        const p = N[(i - 1 + n) % n], c = N[i], v = s.pts[i];
        const top = p.ny < -0.7 ? p : c.ny < -0.7 ? c : null, wall = top === p ? c : p;
        if (!top || wall.ny < -0.7) continue;
        const far = top.a === v ? top.b : top.a, dir = Math.sign(far[0] - v[0]) || 1;
        if (dir * wall.nx >= 0) continue; // inner corner: the floor runs back under the wall
        let bx = top.nx + wall.nx, by = top.ny + wall.ny; const bl = Math.hypot(bx, by) || 1; bx /= bl; by /= bl;
        raw.push({ x: v[0] + bx * 6, y: v[1] + by * 6, nx: wall.nx, ny: wall.ny, type: 'lip', lip: true, dir, s, pri: 3 });
      }
    }
    raw.sort((a, b) => b.pri - a.pri);
    const out = [];
    for (const h of raw) {
      if (h.y > 30) continue;
      if (!h.lip && solid(h.x, h.y, 3)) continue;
      if (out.some(o => (o.x - h.x) ** 2 + (o.y - h.y) ** 2 < 20 * 20)) continue;
      h.id = out.length; out.push(h);
    }
    return out;
  }

  class Sim {
    constructor(level) {
      this.L = level;
      this.shapes = level.shapes.map(s => {
        let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
        for (const [x, y] of s.pts) { x1 = Math.min(x1, x); y1 = Math.min(y1, y); x2 = Math.max(x2, x); y2 = Math.max(y2, y); }
        return { ...s, aabb: [x1, y1, x2, y2], broken: 0, load: 0 };
      });
      this.holds = buildHolds(this.shapes);
      this.ropes = level.ropes.map(r => {
        const n = Math.round(r.len / 20), nodes = [];
        for (let i = 0; i <= n; i++) nodes.push(new Pt(r.x, r.y + i * 20, 4, i === 0 ? 0 : 1));
        return { ...r, nodes, seg: 20 };
      });
      this.reset();
    }

    reset() {
      const { x, y } = this.L.spawn;
      const B = this.b = {
        H: new Pt(x, y - 100, 10, 1), C: new Pt(x, y - 78, 9, 0.6), P: new Pt(x, y - 44, 9, 0.6),
        KL: new Pt(x - 6, y - 20, 6, 1.2), FL: new Pt(x - 8, y, 6, 1.4),
        KR: new Pt(x + 6, y - 20, 6, 1.2), FR: new Pt(x + 8, y, 6, 1.4),
      };
      this.body = [B.H, B.C, B.P, B.KL, B.FL, B.KR, B.FR];
      this.sticks = [[B.H, B.C, 22], [B.C, B.P, 34], [B.P, B.KL, 26], [B.KL, B.FL, 26], [B.P, B.KR, 26], [B.KR, B.FR, 26]];
      this.ranges = [[B.H, B.P, 50, 58], [B.P, B.FL, 30, 52], [B.P, B.FR, 30, 52], [B.FL, B.FR, 8, 60]];
      this.hands = [-1, 1].map(side => ({ side, p: new Pt(x + side * 12, y - 40, 5, 2), grip: null, target: null, mode: null, reachT: 0, stamina: 100, cool: 0 }));
      this.hair = [-4, 0, 4].map(o => {
        const nodes = [];
        for (let i = 0; i < 8; i++) nodes.push(new Pt(x + o, y - 104 + i * 11, 0, 1));
        return { o, nodes };
      });
      this.facing = 1;
      this.t = 0; this.time = 0;
      this.events = [];
      this.supported = false;
      this.peakY = B.C.y; this.lastRelease = null;
      this.waterTime = 0; this.won = false;
      this.wind = { force: 0, warn: 0 };
      this.walk = 0; this.gait = 0; this.jumpReq = 0; this.jumpCool = 0; this.grounded = false;
      this.lock = 0.6; this.pull = 0; this.mant = null; this.lungeCool = 0;
      this.cp = null; this.restT = 0;
      for (const r of this.ropes) r.nodes.forEach((n, i) => n.set(r.x, r.y + i * r.seg));
      for (const s of this.shapes) { s.broken = 0; s.load = 0; }
      this.teleport(x - 4, y);
    }

    get S() { // shoulder point
      const { H, C } = this.b;
      return { x: C.x + (H.x - C.x) * 0.3, y: C.y + (H.y - C.y) * 0.3 };
    }
    height() { return Math.max(0, (40 - this.b.C.y) / this.L.PX_PER_M); }
    zoneIndex() { const y = this.b.C.y; return this.L.zones.findIndex(z => y > z.top); }

    // ---------- targets (holds and chain links) ----------
    tpos(t) { return t.kind === 'rope' ? t.node : t.hold; }
    same(a, b) { return !!a && !!b && a.kind === b.kind && a.hold === b.hold && a.node === b.node; }
    usable(t) { return t.kind === 'rope' || !(t.hold.s.broken > 0); }
    targetAt(x, y, r = 24) {
      let best = null, bd = r * r;
      for (const h of this.holds) {
        if (h.s.broken > 0) continue;
        const d = (h.x - x) ** 2 + (h.y - y) ** 2;
        if (d < bd) { bd = d; best = { kind: 'hold', hold: h }; }
      }
      for (const rp of this.ropes) rp.nodes.forEach((n, i) => {
        if (!i) return;
        const d = (n.x - x) ** 2 + (n.y - y) ** 2;
        if (d < bd) { bd = d; best = { kind: 'rope', rope: rp, node: n, idx: i }; }
      });
      return best;
    }
    pickHand(t) {
      const H = this.hands, p = this.tpos(t);
      const c = H.filter(h => !this.same(h.grip, t));
      if (c.length < 2) return c[0] || null;
      const free = c.filter(h => !h.grip);
      if (free.length === 1) return free[0];
      if (free.length === 2) return p.x < this.S.x ? H[0] : H[1];
      // both holding: move the hand that is farther from the new hold (hand over hand)
      return dist(this.tpos(H[0].grip), p) > dist(this.tpos(H[1].grip), p) ? H[0] : H[1];
    }
    // state: ok (static reach) | far (lunge / swing into it) | no | held
    reachInfo(t, hand) {
      if (!t || !this.usable(t)) return { state: 'no' };
      const h = hand || this.pickHand(t);
      if (!h) return { state: 'held' };
      const p = this.tpos(t), o = this.hands[1 - this.hands.indexOf(h)];
      let d, lim, from;
      if (o.grip) { from = this.tpos(o.grip); d = this.same(o.grip, t) ? 0 : dist(p, from); lim = SPAN; }
      else if (this.grounded) { from = this.S; d = dist(p, from); lim = p.y < from.y ? STAND_REACH : ARM + 2; }
      else if (h.grip) { from = this.tpos(h.grip); d = dist(p, from); lim = 0; }
      else { from = this.S; d = dist(p, from); lim = ARM + 8; }
      if (this.mant) return { state: 'no', hand: h, d };
      const skip = [t, o.grip].filter(g => g && g.kind === 'hold' && g.hold.small).map(g => g.hold.s);
      if (d > 1 && !clearReach(this.shapes, from, p, skip)) return { state: 'no', hand: h, d, blocked: true };
      return { state: d <= lim ? 'ok' : d <= LUNGE && (o.grip || h.grip || this.grounded) ? 'far' : 'no', hand: h, d };
    }

    // ---------- input ----------
    grab(t, hand) {
      const info = this.reachInfo(t, hand);
      if (info.state === 'no' || info.state === 'held') return info;
      const h = info.hand;
      if (h.grip) this.release(h, 'let go');
      h.target = t; h.mode = info.state; h.reachT = 0;
      if (info.state === 'ok') this.lock = Math.min(this.lock, 0.6);
      return info;
    }
    lunge(t) {
      const info = this.reachInfo(t);
      if (info.state === 'no' || info.state === 'held') return info;
      const gripping = this.hands.some(h => h.grip);
      if (!gripping && !this.grounded) return { state: 'no' };
      if (this.lungeCool > 0) return { state: 'busy' };
      const h = info.hand, T = this.tpos(t), S = this.S;
      const gx = T.x - Math.sign(T.x - S.x) * 8, gy = T.y + ARM * 0.55;
      const dx = gx - S.x, dy = gy - S.y;
      let vy, tt;
      if (dy < -8) { vy = -Math.sqrt(2 * GRAV * -dy) * 1.06; tt = -vy / GRAV; }
      else { vy = -240; tt = 0.32; }
      let vx = dx / Math.max(0.22, tt);
      vx = Math.max(-650, Math.min(650, vx)); vy = Math.max(-1050, vy);
      for (const o of this.hands) if (o.grip) this.release(o, 'let go');
      this.mant = null;
      for (const p of [...this.body, ...this.hands.map(o => o.p)]) { p.px = p.x - vx * DT; p.py = p.y - vy * DT; }
      h.target = t; h.mode = 'lunge'; h.reachT = 0;
      h.stamina = Math.max(10, h.stamina - 8);
      this.lungeCool = 0.5; this.jumpCool = 0.45;
      this.events.push({ type: 'lunge' });
      return { state: 'lunge', hand: h };
    }
    lipHeld() {
      const h = this.hands.find(h => h.grip && h.grip.kind === 'hold' && h.grip.hold.lip);
      return h ? h.grip.hold : null;
    }
    canMantle() { const L = this.lipHeld(); return !!L && !this.mant && dist(this.S, L) < ARM + 24; }
    mantle() {
      if (!this.canMantle()) return false;
      const L = this.lipHeld();
      this.mant = { L, dir: L.dir, t: 0, phase: 0 };
      for (const h of this.hands) { h.target = null; if (h.grip && !(h.grip.kind === 'hold' && h.grip.hold === L)) this.release(h, 'let go'); }
      this.events.push({ type: 'mantle' });
      return true;
    }
    letGo(h) { if (h) { h.target = null; this.release(h, 'let go'); } else for (const o of this.hands) { o.target = null; this.release(o, 'let go'); } this.mant = null; }
    setPull(dir) { this.pull = dir; }
    setWalk(dir) { this.walk = Math.max(-1, Math.min(1, dir)); if (dir) this.facing = Math.sign(dir); }
    hop() { this.jumpReq = 0.15; }
    toCheckpoint() { const c = this.cp || { x: this.L.spawn.x, y: this.L.spawn.y }; this.teleport(c.x, c.y); }

    release(h, reason) {
      if (!h.grip) return;
      this.events.push({ type: reason === 'let go' ? 'release' : 'slip', x: h.p.x, y: h.p.y, reason });
      if (reason !== 'let go') h.cool = 0.7;
      this.lastRelease = { reason, x: h.p.x, y: h.p.y };
      h.grip = null;
    }

    // ---------- collision ----------
    collide(p, friction) {
      p.contact = null;
      for (const s of this.shapes) {
        if (s.broken > 0) continue;
        const [x1, y1, x2, y2] = s.aabb;
        if (p.x < x1 - p.r || p.x > x2 + p.r || p.y < y1 - p.r || p.y > y2 + p.r) continue;
        const pts = s.pts;
        let best = null, bi = -1;
        for (let i = 0; i < pts.length; i++) {
          const a = pts[i], b = pts[(i + 1) % pts.length];
          const c = closestOnSeg(p.x, p.y, a[0], a[1], b[0], b[1]);
          if (!best || c.d2 < best.d2) { best = c; bi = i; }
        }
        const isIn = inside(p.x, p.y, pts);
        const d = Math.sqrt(best.d2);
        if (!isIn && d >= p.r + 1) continue;
        let nx, ny;
        if (d < 1e-6) {
          const a = pts[bi], b = pts[(bi + 1) % pts.length], ex = b[0] - a[0], ey = b[1] - a[1], l = Math.hypot(ex, ey);
          nx = ey / l; ny = -ex / l; if (inside(best.x + nx, best.y + ny, pts)) { nx = -nx; ny = -ny; }
        } else if (isIn) { nx = (best.x - p.x) / d; ny = (best.y - p.y) / d; }
        else { nx = (p.x - best.x) / d; ny = (p.y - best.y) / d; }
        if (isIn || d < p.r) { p.x = best.x + nx * p.r; p.y = best.y + ny * p.r; }
        p.contact = { s, ei: bi, t: best.t, x: best.x, y: best.y, nx, ny, type: s.types[bi] };
        if (friction) {
          const vx = p.x - p.px, vy = p.y - p.py, vn = vx * nx + vy * ny;
          let tx = vx - vn * nx, ty = vy - vn * ny;
          const f = s.types[bi] === 'smooth' ? friction * 0.1 : friction;
          if (p.planted && s.types[bi] !== 'smooth' && ny < -0.5 && tx * tx + ty * ty < 0.8 * 0.8) { tx = 0; ty = 0; }
          const vnn = vn < 0 ? 0 : vn;
          p.px = p.x - (tx * (1 - f) + vnn * nx);
          p.py = p.y - (ty * (1 - f) + vnn * ny);
        }
      }
    }

    // ---------- step ----------
    step() {
      const B = this.b, hands = this.hands;
      this.t += DT; if (!this.won) this.time += DT;
      this.lungeCool = Math.max(0, this.lungeCool - DT);
      for (const s of this.shapes) if (s.broken > 0 && (s.broken -= DT) <= 0) { s.broken = 0; s.load = 0; this.events.push({ type: 'respawn', s }); }

      // wind
      const cy = B.C.y;
      const wz = this.L.wind.find(w => cy > w.top && cy <= w.bottom);
      const cyc = this.t % 7, dir = Math.floor(this.t / 7) % 2 ? 1 : -1;
      this.wind.warn = wz && cyc < 2 ? 1 - cyc / 2 : 0;
      const gust = wz && cyc >= 2 && cyc < 3.6 ? Math.sin(((cyc - 2) / 1.6) * Math.PI) : 0;
      if (gust && !this.wind.force) this.events.push({ type: 'gust', dir });
      this.wind.force = gust ? dir * wz.strength * gust : 0; this.wind.dir = dir;

      const inWater = this.L.water.some(w => B.C.x > w.x1 && B.C.x < w.x2 && B.C.y > w.y - 30);

      // integrate
      const free = [...this.body, ...hands.filter(h => !h.grip).map(h => h.p)];
      for (const p of free) {
        const damp = inWater ? 0.94 : 0.999;
        const vx = (p.x - p.px) * damp, vy = (p.y - p.py) * damp;
        p.px = p.x; p.py = p.y;
        p.x += vx + this.wind.force * DT * DT;
        p.y += vy + (inWater && p.y > 40 ? -GRAV * 0.3 : GRAV) * DT * DT;
      }
      for (const r of this.ropes) for (const n of r.nodes) {
        if (!n.im) continue;
        const vx = (n.x - n.px) * 0.995, vy = (n.y - n.py) * 0.995;
        n.px = n.x; n.py = n.y; n.x += vx + this.wind.force * 0.3 * DT * DT; n.y += vy + GRAV * DT * DT;
      }

      const drive = (p, tvx, tvy, k, cap = 480) => {
        const l = Math.hypot(tvx, tvy); if (l > cap) { tvx *= cap / l; tvy *= cap / l; }
        const vx = p.vx(), vy = p.vy();
        p.px = p.x - (vx + (tvx - vx) * k) * DT; p.py = p.y - (vy + (tvy - vy) * k) * DT;
      };
      const S = this.S;
      const gripping = hands.some(h => h.grip);
      const feet = [B.FL, B.FR].filter(p => p.contact && p.contact.ny < -0.5);
      this.grounded = feet.length > 0;

      // arms: pull/lower adjusts how bent the arms are
      if (this.pull) this.lock = Math.max(0.08, Math.min(0.95, this.lock + this.pull * 1.4 * DT));

      // muscles: position the shoulder so every held hold stays in reach and the reaching hand can get to its target
      const anchors = hands.filter(h => h.grip).map(h => ({ p: this.tpos(h.grip), n: h.grip.kind === 'hold' ? h.grip.hold : { nx: 0, ny: 0 } }));
      const reacher = hands.find(h => h.target && !h.grip && h.mode !== 'lunge');
      if (anchors.length && !this.mant) {
        let mx = 0, my = 0, ox = 0;
        for (const a of anchors) { mx += a.p.x; my += a.p.y; ox += a.n.nx; }
        mx /= anchors.length; my /= anchors.length; ox /= anchors.length;
        let tx = mx + ox * 12, ty = my + ARM * this.lock;
        const T = reacher && this.tpos(reacher.target);
        if (T) { tx = (tx + T.x) / 2; ty = Math.min(ty, T.y + ARM * (reacher.mode === 'ok' ? 0.5 : 0.75)); }
        const P = { x: tx, y: ty };
        const clampTo = (c, r) => { const d = dist(P, c); if (d > r) { P.x = c.x + (P.x - c.x) * r / d; P.y = c.y + (P.y - c.y) * r / d; } };
        for (let k = 0; k < 8; k++) {
          if (T && reacher.mode === 'ok') clampTo(T, ARM * 0.86);
          for (const a of anchors) clampTo(a.p, ARM * 0.96);
        }
        const active = !this.grounded || T || this.pull < 0 || P.y < S.y - 6;
        if (active) {
          let vsx = (P.x - S.x) * MUSCLE_KP, vsy = (P.y - S.y) * MUSCLE_KP;
          const l = Math.hypot(vsx, vsy); if (l > MUSCLE_MAX) { vsx *= MUSCLE_MAX / l; vsy *= MUSCLE_MAX / l; }
          if (this.grounded && vsy > 0) vsy = B.C.vy();      // standing: arms only lift, the legs do the rest
          const k = Math.min(1, MUSCLE_KA * DT);
          const swinging = this.walk && !T && !this.grounded;
          const dvx = swinging ? 0 : (vsx - B.C.vx()) * k * (T ? 1 : 0.5), dvy = (vsy - B.C.vy()) * k;
          for (const p of this.body) {
            const w = p === B.H || p === B.C || p === B.P ? 1 : 0.8;
            p.px -= dvx * DT * w; p.py -= dvy * DT * w;
          }
        }
      }

      // free hands: reach for their target or hang relaxed
      for (const h of hands) {
        if (h.grip) continue;
        const p = h.p;
        if (h.target) {
          h.reachT += DT;
          const T = this.tpos(h.target);
          if (!this.usable(h.target) || h.reachT > (h.mode === 'ok' ? 2.4 : 1.5)) {
            this.events.push({ type: 'miss', x: T.x, y: T.y }); h.target = null; continue;
          }
          drive(p, (T.x - p.x) * 20, (T.y - p.y) * 20, 0.5, 1300);
        } else {
          const tx = B.C.x + h.side * 10, ty = B.C.y + 40;
          drive(p, (tx - p.x) * 4, (ty - p.y) * 4, 0.08, 300);
        }
      }

      // reaching from the ground: step toward the hold, hop if it's above her fingertips
      let walk = this.walk;
      if (reacher && reacher.target && !anchors.length && this.grounded && !this.mant) {
        const T = this.tpos(reacher.target), dx = T.x - S.x;
        if (Math.abs(dx) > 34) { if (!walk) walk = Math.sign(dx); }
        else if (T.y < S.y && dist(T, S) > ARM - 6 && reacher.reachT > 0.12 && this.jumpCool <= 0) this.jumpReq = 0.1;
      }
      // legs: stand up, walk, hop, and swing while hanging
      this.jumpReq = Math.max(0, this.jumpReq - DT); this.jumpCool = Math.max(0, this.jumpCool - DT);
      if (this.grounded && !this.mant) {
        const fx = (B.FL.x + B.FR.x) / 2, fy = Math.min(...feet.map(p => p.y));
        const lean = walk * 7, str = gripping ? 0.7 : 1, walkV = gripping ? 0 : walk * WALK_SPEED;
        for (const [p, ox, oy] of [[B.P, 0, -46], [B.C, lean, -80], [B.H, lean * 1.4, -102]]) {
          let ex = p === B.P ? fx - p.x : B.P.x + ox - p.x;
          if (p === B.P) ex = Math.abs(ex) < 7 ? 0 : ex - Math.sign(ex) * 7;
          const ty = fy + oy;
          const tvx = ex * 10 + walkV;
          const tvy = ty > p.y ? p.vy() : (ty - p.y) * 10; // legs push up, never pull down
          drive(p, tvx, tvy, 0.25 * str);
        }
        if (walkV) for (const k of [B.KL, B.KR]) drive(k, k.vx() * 0.5 + walkV, k.vy(), 0.1 * str);
        if (walk && !gripping) {
          this.gait += DT * 10;
          [[B.FL, 0], [B.FR, Math.PI]].forEach(([f, ph]) => {
            const s = Math.sin(this.gait + ph), lift = Math.max(0, Math.cos(this.gait + ph));
            drive(f, (B.P.x + walk * (s * 15 + 4) - f.x) * 14, f.contact ? -lift * 160 : f.vy(), 0.35, 700);
          });
        } else if (!gripping) {
          [[B.FL, -1], [B.FR, 1]].forEach(([f, side]) => {
            const e = B.P.x + side * 8 - f.x;
            if (f.contact && Math.abs(e) > 16) drive(f, (e - Math.sign(e) * 16) * 6, f.vy(), 0.15);
          });
        }
        if (this.jumpReq > 0 && this.jumpCool <= 0 && !gripping) {
          for (const p of this.body) p.py += HOP * DT;
          for (const h of hands) h.p.py += HOP * DT;
          this.jumpReq = 0; this.jumpCool = 0.45;
          this.events.push({ type: 'hop' });
        }
      } else if (gripping && this.walk && !this.mant) {
        for (const p of [B.P, B.KL, B.KR, B.FL, B.FR]) p.px -= this.walk * SWING * DT * DT;
        for (const p of [B.C]) p.px -= this.walk * SWING * 0.4 * DT * DT;
      }

      // mantle: haul the hips over the lip, then step the feet up
      const m = this.mant;
      if (m) {
        m.t += DT;
        const L = m.L, d = m.dir;
        if (m.phase === 0) {
          const over = B.C.y < L.y - 8;
          drive(B.H, (L.x + d * (over ? 12 : -10) - B.H.x) * 9, (L.y - 60 - B.H.y) * 9, 0.35, 380);
          drive(B.C, (L.x + d * (over ? 6 : -12) - B.C.x) * 9, (L.y - 40 - B.C.y) * 9, 0.35, 380);
          drive(B.P, (L.x - d * 14 - B.P.x) * 9, (L.y - 8 - B.P.y) * 9, 0.3, 380);
          for (const [f, k] of [[B.FL, B.KL], [B.FR, B.KR]]) drive(k, (L.x - d * 18 - k.x) * 6, (L.y + 6 - k.y) * 6, 0.2, 400);
          if (B.P.y < L.y - 2) { m.phase = 1; m.t1 = m.t; for (const h of hands) this.release(h, 'let go'); }
        } else {
          drive(B.H, (L.x + d * 28 - B.H.x) * 8, (L.y - 100 - B.H.y) * 8, 0.3, 380);
          drive(B.C, (L.x + d * 27 - B.C.x) * 8, (L.y - 78 - B.C.y) * 8, 0.3, 380);
          drive(B.P, (L.x + d * 24 - B.P.x) * 8, (L.y - 44 - B.P.y) * 8, 0.3, 380);
          [[B.FL, B.KL, -1], [B.FR, B.KR, 1]].forEach(([f, k, s]) => {
            // a foot still under the lip must clear the corner before stepping over
            const under = (f.x - L.x) * d < 4 && f.y > L.y - 12;
            if (under) drive(f, (L.x - d * 4 - f.x) * 10, (L.y - 22 - f.y) * 12, 0.35, 700);
            else drive(f, (L.x + d * (22 + s * 4) - f.x) * 10, (L.y - 6 - f.y) * 10, 0.35, 650);
            drive(k, (L.x + d * (24 + s * 3) - k.x) * 8, (L.y - 28 - k.y) * 8, 0.25, 500);
          });
          const up = [B.FL, B.FR].filter(f => f.contact && f.contact.ny < -0.5 && f.y < L.y + 2 && (f.x - L.x) * d > 10).length;
          if ((up === 2 && m.t - m.t1 > 0.25) || m.t - m.t1 > 1.4) this.mant = null;
        }
        if (this.mant && m.t > 3.5) { this.mant = null; this.events.push({ type: 'miss', x: L.x, y: L.y }); }
      }

      // planted feet act as anchors while standing still
      const pinned = !walk && !gripping && !this.mant && this.jumpReq <= 0 && this.jumpCool <= 0.3
        ? [B.FL, B.FR].filter(f => f.contact && f.contact.ny < -0.5 && f.contact.type !== 'smooth') : [];
      for (const f of pinned) { f.im0 = f.im; f.im = 0; }

      // constraints
      for (let it = 0; it < ITER; it++) {
        for (const [a, b, len] of this.sticks) this.solveDist(a, b, len, len);
        for (const [a, b, mn, mx] of this.ranges) this.solveDist(a, b, mn, mx);
        for (const r of this.ropes) for (let i = 1; i < r.nodes.length; i++) this.solveDist(r.nodes[i - 1], r.nodes[i], r.seg, r.seg);
        for (const h of hands) this.solveArm(h);
        for (const h of hands) {
          if (!h.grip) continue;
          const g = this.tpos(h.grip); h.p.x = g.x; h.p.y = g.y;
        }
        for (const p of this.body) this.collide(p, 0);
        for (const h of hands) if (!h.grip && !h.target) this.collide(h.p, 0);
      }
      for (const f of pinned) f.im = f.im0;
      const footF = walk && !gripping ? 0.02 : 0.1;
      B.FL.planted = B.FR.planted = !walk;
      for (const p of this.body) this.collide(p, p === B.FL || p === B.FR ? footF : 0.04);
      for (const h of hands) if (!h.grip && !h.target) this.collide(h.p, 0.12);
      for (const h of hands) if (h.grip) { h.p.px = h.p.x; h.p.py = h.p.y; }

      this.supported = [B.FL, B.FR, B.P, B.C].some(p => p.contact && p.contact.ny < -0.5);

      // grips
      const both = hands.filter(h => h.grip).length === 2;
      for (const h of hands) {
        h.cool = Math.max(0, h.cool - DT);
        if (h.target && !h.grip && h.cool <= 0) {
          const T = this.tpos(h.target);
          if ((h.p.x - T.x) ** 2 + (h.p.y - T.y) ** 2 < 12 * 12 && dist(T, this.S) < ARM + 4) {
            h.grip = h.target; h.target = null;
            h.p.x = h.p.px = T.x; h.p.y = h.p.py = T.y;
            if (!this.pull) this.lock = 0.6;
            this.events.push({ type: 'grip', x: T.x, y: T.y, surf: h.grip.kind === 'rope' ? 'rope' : h.grip.hold.type });
          }
        }
        if (h.grip) {
          const g = h.grip, type = g.kind === 'rope' ? 'rope' : g.hold.type, sf = SURF[type] || SURF.rock;
          if (g.kind === 'hold') {
            if (g.hold.s.broken > 0) { this.release(h, 'hold crumbled'); continue; }
            if (sf.crumble) {
              g.hold.s.load += DT;
              if (g.hold.s.load > sf.crumble) {
                g.hold.s.broken = 6;
                this.events.push({ type: 'crumble', s: g.hold.s });
                for (const o of hands) if (o.grip && o.grip.kind === 'hold' && o.grip.hold.s === g.hold.s) this.release(o, 'hold crumbled');
                continue;
              }
            }
          }
          let rate = this.supported ? -20 : BASE_DRAIN * sf.drain * (both && sf.drain > 0 ? 0.4 : 1);
          if (sf.drain < 0) rate = -12;
          h.stamina = Math.min(100, h.stamina - rate * DT);
          if (h.stamina <= 0) { h.stamina = 0; this.release(h, 'grip gave out'); h.cool = 0.9; }
        } else {
          h.stamina = Math.min(100, h.stamina + (this.supported ? REGEN_REST : REGEN_FREE) * DT);
        }
      }

      // hair
      const hx = B.H.x - this.facing * 6, hy = B.H.y - 4;
      for (const s of this.hair) {
        const n = s.nodes;
        n[0].set(hx + s.o * 0.6, hy + Math.abs(s.o) * 0.3);
        for (let i = 1; i < n.length; i++) {
          const p = n[i], vx = (p.x - p.px) * 0.96, vy = (p.y - p.py) * 0.96;
          p.px = p.x; p.py = p.y;
          p.x += vx + (this.wind.force * 1.5 - this.facing * 60) * DT * DT; p.y += vy + 900 * DT * DT;
        }
        for (let k = 0; k < 3; k++) for (let i = 1; i < n.length; i++) {
          const a = n[i - 1], b = n[i], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1, f = (d - 11) / d;
          if (i === 1) { b.x -= dx * f; b.y -= dy * f; } else { a.x += dx * f * 0.5; a.y += dy * f * 0.5; b.x -= dx * f * 0.5; b.y -= dy * f * 0.5; }
        }
      }
      if (reacher && reacher.target) this.facing = Math.sign(this.tpos(reacher.target).x - B.C.x) || this.facing;

      // falls
      if (this.supported || hands.some(h => h.grip)) {
        const drop = B.C.y - this.peakY;
        if (this.supported && drop > 240) {
          this.events.push({ type: 'fall', m: drop / this.L.PX_PER_M, from: { x: this.peakX, y: this.peakY }, to: { x: B.C.x, y: B.C.y }, reason: this.lastRelease ? this.lastRelease.reason : 'lost footing' });
        }
        this.peakY = B.C.y; this.peakX = B.C.x;
      } else if (B.C.y < this.peakY) { this.peakY = B.C.y; this.peakX = B.C.x; }

      // checkpoint: standing calmly on a ledge at least as high as the last one
      const calm = this.grounded && !gripping && !this.mant && !this.walk && Math.hypot(B.C.vx(), B.C.vy()) < 40 && B.FL.contact && B.FL.contact.type !== 'smooth';
      this.restT = calm ? this.restT + DT : 0;
      if (this.restT > 0.5 && (!this.cp || B.FL.y < this.cp.y + 40)) {
        const moved = !this.cp || Math.hypot(this.cp.x - B.FL.x, this.cp.y - B.FL.y) > 40;
        this.cp = { x: B.FL.x, y: B.FL.y - 2 };
        if (moved && this.cp.y < 0) this.events.push({ type: 'checkpoint' });
      }

      // tide
      if (inWater) {
        this.waterTime += DT;
        if (this.waterTime > 2.5) { this.teleport(this.L.spawn.x, this.L.spawn.y); this.events.push({ type: 'tide' }); }
      } else this.waterTime = Math.max(0, this.waterTime - DT * 0.5);

      // summit
      if (!this.won && B.C.y < this.L.summitY - 10 && B.C.x > this.L.summitX[0] - 10 && B.C.x < this.L.summitX[1] + 10 && this.supported) {
        this.won = true; this.events.push({ type: 'summit' });
      }

      if (!Number.isFinite(B.C.x + B.C.y)) this.teleport(this.L.spawn.x, this.L.spawn.y);
    }

    solveDist(a, b, mn, mx) {
      const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1e-6;
      const target = d < mn ? mn : d > mx ? mx : d;
      if (target === d) return;
      const w = a.im + b.im; if (!w) return;
      const f = (d - target) / d / w;
      a.x += dx * f * a.im; a.y += dy * f * a.im;
      b.x -= dx * f * b.im; b.y -= dy * f * b.im;
    }

    solveArm(h) {
      const B = this.b, S = this.S;
      const dx = h.p.x - S.x, dy = h.p.y - S.y, d = Math.hypot(dx, dy);
      if (d <= ARM) return;
      const ex = dx * (1 - ARM / d), ey = dy * (1 - ARM / d);
      let wb, wh;
      if (!h.grip) { wb = 0.05; wh = 0.95; }
      else if (h.grip.kind === 'rope') { wb = 0.35; wh = 0.65; }
      else { wb = 1; wh = 0; }
      for (const p of [B.H, B.C, B.P]) { p.x += ex * wb; p.y += ey * wb; }
      for (const p of [B.KL, B.KR]) { p.x += ex * wb * 0.5; p.y += ey * wb * 0.5; }
      if (wh) {
        if (h.grip && h.grip.kind === 'rope') { h.grip.node.x -= ex * wh; h.grip.node.y -= ey * wh; h.p.x = h.grip.node.x; h.p.y = h.grip.node.y; }
        else { h.p.x -= ex * wh; h.p.y -= ey * wh; }
      }
    }

    teleport(x, y) {
      // rebuild a relaxed standing pose (consistent with stick lengths) so she never pops or embeds; left foot lands at (x, y)
      x += 4;
      const B = this.b;
      B.FL.set(x - 4, y); B.FR.set(x + 4, y);
      B.KL.set(x + 13, y - 19.6); B.KR.set(x + 17, y - 22.4);
      B.P.set(x, y - 42); B.C.set(x, y - 76); B.H.set(x, y - 98);
      for (const h of this.hands) { h.grip = null; h.target = null; h.p.set(x + h.side * 12, y - 38); h.stamina = 100; }
      this.mant = null; this.lock = 0.6;
      for (const s of this.hair) s.nodes.forEach((n, i) => n.set(x + s.o, y - 102 + i * 11));
      this.peakY = this.b.C.y; this.waterTime = 0; this.lastRelease = null;
    }

    snapshot() {
      return {
        pts: [...this.body, ...this.hands.map(h => h.p)].map(p => [p.x, p.y]),
        stamina: this.hands.map(h => h.stamina), time: this.time, won: this.won, cp: this.cp,
      };
    }
    restore(s) {
      const all = [...this.body, ...this.hands.map(h => h.p)];
      s.pts.forEach((v, i) => all[i] && all[i].set(v[0], v[1]));
      s.stamina.forEach((v, i) => (this.hands[i].stamina = v));
      this.time = s.time || 0; this.won = !!s.won; this.cp = s.cp || null;
      const { H } = this.b;
      for (const st of this.hair) st.nodes.forEach((n, i) => n.set(H.x + st.o, H.y + i * 11));
      this.peakY = this.b.C.y;
    }
  }

  G.GRIP = { Sim, DT, ARM, SPAN, STAND_REACH, LUNGE, SURF, clearLine, clearReach };
})(typeof window !== 'undefined' ? window : globalThis);
