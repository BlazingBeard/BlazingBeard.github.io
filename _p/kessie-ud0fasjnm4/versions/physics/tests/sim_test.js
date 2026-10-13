// Headless physics checks: node tests/sim_test.js
const path = require('path');
require(path.join(__dirname, '..', 'src', 'level.js'));
require(path.join(__dirname, '..', 'src', 'sim.js'));
const { Sim, clearLine, clearReach } = globalThis.GRIP;
const { climb } = require('./route_bot.js');
const L = globalThis.LEVEL;
let fails = 0;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const run = (sim, sec, fn) => { for (let i = 0; i < sec * 120; i++) { fn && fn(i / 120); sim.step(); } };
const hold = (s, x, y) => s.targetAt(x, y, 30);
const holding = (s, t) => s.hands.some(h => s.same(h.grip, t));

// 1. stands upright on the beach
{
  const s = new Sim(L);
  run(s, 3);
  const B = s.b;
  ok(s.grounded && B.H.y < B.C.y && B.C.y < B.P.y && B.H.y < -45 && Math.abs(B.H.x - (B.FL.x + B.FR.x) / 2) < 20, `stands upright (head y=${B.H.y.toFixed(0)})`);
  ok(s.body.every(p => Number.isFinite(p.x)), 'no NaN');
}

// 2. walks, hops, and gets back up after lying flat
{
  const s = new Sim(L);
  run(s, 1);
  const x0 = s.b.C.x;
  s.setWalk(1); run(s, 1); s.setWalk(0); run(s, 0.3);
  ok(s.b.C.x > x0 + 100 && s.grounded, `walks right: chest x ${x0.toFixed(0)} -> ${s.b.C.x.toFixed(0)}`);
  let peak = 1e9; s.hop(); run(s, 1, () => { peak = Math.min(peak, s.b.FL.y); });
  ok(peak < 34 - 25 && s.grounded, `hops (feet peak y=${peak.toFixed(0)})`);
  const y = 34, B = s.b; B.H.set(160, y - 4); B.C.set(138, y - 4); B.P.set(104, y - 4); B.KL.set(80, y - 4); B.FL.set(56, y); B.KR.set(80, y - 4); B.FR.set(56, y);
  run(s, 2);
  ok(B.H.y < -45, `gets up after lying flat (head y=${B.H.y.toFixed(0)})`);
}

// 3. holds are generated along the whole cliff, never inside rock
{
  const s = new Sim(L);
  const jug = hold(s, 243, -69), lip = hold(s, 249, -95);
  ok(s.holds.length > 200 && jug && jug.hold.type === 'jug' && lip && lip.hold.lip && lip.hold.dir === 1, `holds generated (${s.holds.length}, first-wall jug + lip found)`);
  const inRock = s.holds.filter(h => { const p = { x: h.x, y: h.y, px: h.x, py: h.y, r: 2 }; s.collide(p, 0); return p.contact && !h.lip; });
  ok(inRock.length === 0 && Math.max(...s.holds.map(h => h.y)) < 31, `no holds buried in rock or under water`);
  ok(!clearLine(s.shapes, { x: 1100, y: -1990 }, { x: 1100, y: -2050 }) && clearReach(s.shapes, { x: 1079, y: -1994 }, { x: 1044, y: -2020 }), 'reach is blocked by rock but can wrap a corner');
}

// 4. clicking a hold from the ground: she steps over (and hops if needed) to grab it
{
  const s = new Sim(L);
  s.teleport(140, 34); run(s, 0.5);
  const jug = hold(s, 243, -69);
  const r = s.grab(jug);
  run(s, 2.5, () => {});
  ok(r.state === 'ok' && holding(s, jug), `click-to-grab from 1.5 m away (state=${r.state}, holding=${holding(s, jug)})`);
}

// 5. the beginner wall: jug, lip, mantle, stand on the ledge, checkpoint saved
{
  const s = new Sim(L);
  run(s, 1); s.setWalk(1); run(s, 3, () => { if (s.b.C.x > 215) s.setWalk(0); }); s.setWalk(0); run(s, 0.4);
  const jug = hold(s, 243, -69), lip = hold(s, 249, -95);
  s.grab(jug); run(s, 1);
  const g1 = holding(s, jug);
  const info = s.grab(lip); run(s, 1);
  const g2 = holding(s, lip);
  const m = s.canMantle() && s.mantle(); run(s, 4, () => {});
  run(s, 1);
  ok(g1 && info.state === 'ok' && g2 && m && s.grounded && s.b.FL.y < -85 && s.b.H.y < -150, `jug → lip → mantle → standing on the ledge (feet y=${s.b.FL.y.toFixed(0)})`);
  ok(s.cp && s.cp.y < -80, `checkpoint saved on the ledge (cp y=${s.cp && s.cp.y.toFixed(0)})`);
  s.teleport(60, 30); run(s, 0.3); s.toCheckpoint(); run(s, 1);
  ok(s.b.FL.y < -85 && s.grounded, 'R returns to the checkpoint');
}

// 6. hand over hand: hanging in the chimney, each click on a higher hold hauls her up
{
  const s = new Sim(L);
  const A = hold(s, 1194, -2227).hold;
  s.teleport(A.x - 30, A.y + 80);
  for (const h of s.hands) { h.grip = { kind: 'hold', hold: A }; h.p.set(A.x, A.y); }
  run(s, 1.5);
  const y0 = s.b.C.y, hanging = !s.grounded;
  const x0 = s.b.P.x; let maxDx = 0;
  s.setWalk(1); run(s, 0.8, () => { maxDx = Math.max(maxDx, Math.abs(s.b.P.x - x0)); }); s.setWalk(0); run(s, 1.5);
  ok(hanging && maxDx > 25, `arrows swing her while hanging (hips moved ${maxDx.toFixed(0)} px)`);
  let got = 0;
  for (const y of [-2280, -2333, -2387, -2440]) { const t = hold(s, 1194, y); s.grab(t); run(s, 1.4); if (holding(s, t)) got++; }
  ok(got === 4 && s.b.C.y < y0 - 180, `hand-over-hand up a wall (${got}/4 holds, chest rose ${(y0 - s.b.C.y).toFixed(0)} px)`);
}

// 7. swinging and lunging: too-far holds are reachable dynamically
{
  const s = new Sim(L);
  // pick a hold with another hold 150-220 px straight-ish above it, clear line between
  let A = null, Bh = null;
  for (const a of s.holds) {
    if (a.lip || a.small || a.type !== 'rock' || a.y > -150) continue;
    const b = s.holds.find(b => b !== a && b.y < a.y - 120 && Math.hypot(b.x - a.x, b.y - a.y) > 150 && Math.hypot(b.x - a.x, b.y - a.y) < 210 && Math.abs(b.x - a.x) < 60 && clearReach(s.shapes, a, b));
    if (b) { A = a; Bh = b; break; }
  }
  s.teleport(A.x - A.nx * 10 + A.nx * 30, A.y + 60); // stand-in; will hang immediately
  for (const h of s.hands) { h.grip = { kind: 'hold', hold: A }; h.p.set(A.x, A.y); }
  run(s, 1.5);
  const tb = { kind: 'hold', hold: Bh };
  const st = s.reachInfo(tb).state;
  const r = s.lunge(tb);
  run(s, 1.6);
  ok(st === 'far' && r.state === 'lunge' && holding(s, tb), `lunge catches a hold ${Math.hypot(Bh.x - A.x, Bh.y - A.y).toFixed(0)} px away (reach=${st}, caught=${holding(s, tb)})`);
}

// 8. stamina drains on smooth holds, crumbly flakes break
{
  const s = new Sim(L);
  const sm = s.holds.find(h => h.type === 'smooth' && Math.abs(h.nx) > 0.9 && h.y < -2100 && h.y > -2900);
  s.teleport(sm.x + sm.nx * 20, sm.y + 70);
  s.hands[1].grip = { kind: 'hold', hold: sm }; s.hands[1].p.set(sm.x, sm.y);
  run(s, 5);
  ok(s.hands[1].stamina < 85, `stamina drains on a sloper (stamina=${s.hands[1].stamina.toFixed(0)})`);
  const fl = s.holds.find(h => h.type === 'crumbly');
  s.teleport(fl.x - 30, fl.y + 80);
  s.hands[0].grip = { kind: 'hold', hold: fl }; s.hands[0].p.set(fl.x, fl.y);
  run(s, 2.5);
  ok(fl.s.broken > 0 && !s.hands[0].grip, `crumbly flake breaks under load`);
}

// 9. chains hang, tide washes back
{
  const s = new Sim(L);
  const r = s.ropes[1];
  run(s, 1);
  ok(Math.abs(r.nodes.at(-1).y - (r.y + r.len)) < 20, `chain hangs to ~${(r.y + r.len)} (y=${r.nodes.at(-1).y.toFixed(0)})`);
  s.teleport(-600, 20);
  run(s, 4);
  ok(s.b.C.x > -150 && s.b.C.x < 250, `tide washes back (x=${s.b.C.x.toFixed(0)})`);
}

// 10. a bot using only player actions (click holds, mantle, walk, lunge) climbs beach → summit
{
  const s = new Sim(L);
  const r = climb(s, L.summitY, { maxSec: 900 });
  ok(r.ok && s.won, `bot climbs all ${s.height().toFixed(0)} m to the summit in ${(r.t / 60).toFixed(1)} min game time (${r.log.length} retries)`);
}

console.log(fails ? `\n${fails} failing` : '\nall passed');
process.exit(fails ? 1 : 0);
