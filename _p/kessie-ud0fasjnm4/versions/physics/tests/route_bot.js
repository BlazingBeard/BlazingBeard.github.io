// Route planner + bot that climbs the cliff using only player actions (grab / mantle / walk / hop / lunge / letGo).
const { SPAN, STAND_REACH, clearReach: clearLine } = globalThis.GRIP;
let SH = null;

function insidePoly(px, py, P) {
  let c = false;
  for (let i = 0, j = P.length - 1; i < P.length; j = i++) {
    const [xi, yi] = P[i], [xj, yj] = P[j];
    if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}

function graph(s) {
  const nodes = s.holds.map(h => ({ x: h.x, y: h.y, k: 'h', t: { kind: 'hold', hold: h }, lip: h.lip }));
  for (const r of s.ropes) r.nodes.forEach((n, i) => { if (i) nodes.push({ x: n.x, y: n.y, k: 'h', t: { kind: 'rope', rope: r, node: n, idx: i } }); });
  for (const sh of s.shapes) {
    const n = sh.pts.length;
    for (let i = 0; i < n; i++) {
      const a = sh.pts[i], b = sh.pts[(i + 1) % n], ex = b[0] - a[0], ey = b[1] - a[1], l = Math.hypot(ex, ey);
      let nx = ey / l, ny = -ex / l;
      if (insidePoly((a[0] + b[0]) / 2 + nx * 2, (a[1] + b[1]) / 2 + ny * 2, sh.pts)) { nx = -nx; ny = -ny; }
      if (ny > -0.7 || (sh.types[i] === 'smooth' && ny > -0.9)) continue;
      if (Math.max(a[0], b[0]) < -150 || Math.min(a[0], b[0]) > 2440 || a[1] > 45) continue;
      const k = Math.max(1, Math.ceil(l / 20));
      for (let j = 0; j <= k; j++) nodes.push({ x: a[0] + ex * j / k, y: a[1] + ey * j / k - 6, k: 'f' });
    }
  }
  return nodes;
}
function adj(A, B) {
  const ok = adj0(A, B);
  if (!ok || (A.k === 'f' && B.k === 'f')) return ok;
  const F = A.k === 'f' ? A : B, H = A.k === 'f' ? B : A;
  const skip = [A, B].filter(n => n.t && n.t.kind === 'hold' && n.t.hold.small).map(n => n.t.hold.s);
  return A.k === 'h' && B.k === 'h' ? clearLine(SH, A, B, skip) : (H.lip && H === A) || clearLine(SH, { x: F.x, y: F.y - 82 }, H, skip);
}
function adj0(A, B) {
  const d = Math.hypot(A.x - B.x, A.y - B.y);
  if (A.k === 'h' && B.k === 'h') return d <= SPAN - 4;
  if (A.k === 'f' && B.k === 'f') return d <= 26;
  const F = A.k === 'f' ? A : B, H = A.k === 'f' ? B : A;
  if (H === A && H.lip && d <= 30) return true; // mantle onto the ledge
  const sy = F.y - 82, dd = Math.hypot(H.x - F.x, H.y - sy);
  return H.y < sy ? dd <= STAND_REACH - 8 : dd <= 60;
}
function plan(s, from, goalY, bans = new Map()) {
  const key = (a, b) => `${a.x | 0},${a.y | 0}>${b.x | 0},${b.y | 0}`;
  SH = s.shapes;
  const nodes = graph(s);
  let start = 0, bd = 1e9;
  nodes.forEach((n, i) => { if (n.k === 'f') { const d = Math.hypot(n.x - from.x, n.y - from.y); if (d < bd) { bd = d; start = i; } } });
  const prev = new Int32Array(nodes.length).fill(-1), q = [start]; prev[start] = start;
  let goal = -1;
  while (q.length) {
    const i = q.shift();
    if (nodes[i].k === 'f' && nodes[i].y < goalY) { goal = i; break; }
    for (let j = 0; j < nodes.length; j++) if (prev[j] < 0 && adj(nodes[i], nodes[j]) && (bans.get(key(nodes[i], nodes[j])) || 0) < 2) { prev[j] = i; q.push(j); }
  }
  if (goal < 0) return null;
  const path = [];
  for (let i = goal; i !== start; i = prev[i]) path.push(nodes[i]);
  path.push(nodes[start]);
  return path.reverse();
}

// Executes the plan with the real physics. Returns { ok, log }.
function climb(s, goalY, { maxSec = 600, verbose = false } = {}) {
  const log = [];
  const say = m => { log.push(m); if (verbose) console.log(m); };
  let t = 0;
  const run = (sec, until) => { for (let i = 0; i < sec * 120; i++) { s.step(); t += 1 / 120; if (until && until()) return true; } return false; };
  const held = n => s.hands.some(h => s.same(h.grip, n.t));
  let replans = 0;
  const bans = new Map(), ban = (a, b) => { const k = `${a.x | 0},${a.y | 0}>${b.x | 0},${b.y | 0}`; bans.set(k, (bans.get(k) || 0) + 1); };
  outer: while (t < maxSec) {
    if (s.b.C.y < goalY - 40 && s.grounded) return { ok: true, log, t };
    const B = s.b;
    const from = s.hands.some(h => h.grip) ? null : { x: (B.FL.x + B.FR.x) / 2, y: Math.min(B.FL.y, B.FR.y) };
    let path;
    if (from) path = plan(s, from, goalY, bans);
    if (!from || !path) { s.letGo(); run(1.2); if (++replans > 40) break; continue; }
    for (let i = 1; i < path.length; i++) {
      const n = path[i], p = path[i - 1];
      if (n.k === 'f' && p.k === 'f') {
        let j = i; while (j + 1 < path.length && path[j + 1].k === 'f') j++;
        const tgt = path[j];
        let best = 1e9, stuck = 0;
        const ok = run(8, () => {
          const fx = (s.b.FL.x + s.b.FR.x) / 2, dx = tgt.x - fx;
          s.setWalk(Math.abs(dx) < 8 ? 0 : Math.sign(dx));
          const dd = Math.hypot(dx, tgt.y - s.b.FL.y);
          if (dd < best - 1) { best = dd; stuck = 0; } else if (++stuck > 90) { s.hop(); stuck = 0; }
          return Math.abs(dx) < 8 && s.grounded;
        });
        s.setWalk(0); run(0.3);
        if (!ok) { say(`walk stuck near ${tgt.x.toFixed(0)},${tgt.y.toFixed(0)}`); replans++; continue outer; }
        i = j;
      } else if (n.k === 'h') {
        let info = s.grab(n.t);
        if (info.state === 'far') { s.letGo(info.hand); info = s.lunge(n.t); say(`lunge to ${n.x.toFixed(0)},${n.y.toFixed(0)}`); }
        if (info.state === 'no' || info.state === 'held') { say(`cannot reach ${n.x.toFixed(0)},${n.y.toFixed(0)} (${info.state})`); ban(p, n); replans++; s.letGo(); run(1.5); continue outer; }
        if (!run(3, () => held(n))) { say(`missed ${n.t.kind} ${n.x.toFixed(0)},${n.y.toFixed(0)} C=${s.b.C.x.toFixed(0)},${s.b.C.y.toFixed(0)}`); ban(p, n); replans++; s.letGo(); run(1.5); if (replans > 40) break outer; continue outer; }
        run(0.25);
      } else { // hold -> floor
        if (s.canMantle()) { s.mantle(); run(4, () => !s.mant); run(0.4); }
        else { s.letGo(); run(1.2, () => s.grounded && Math.hypot(s.b.C.vx(), s.b.C.vy()) < 30); }
        if (!s.grounded) { say(`didn't land after ${p.x.toFixed(0)},${p.y.toFixed(0)}`); replans++; continue outer; }
        // replan from wherever we stand now
        continue outer;
      }
    }
    replans++;
    if (replans > 60) break;
  }
  return { ok: s.b.C.y < goalY - 40, log, t };
}

module.exports = { plan, climb, graph, adj };
