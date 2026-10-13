// GRIP renderer — canvas 2D, ComfyUI-painted backdrops + textured terrain + vector climber.
(function (G) {
  const EDGE = {
    rock: { c: 'rgba(255,236,205,0.35)', w: 2 },
    smooth: { c: 'rgba(200,232,255,0.9)', w: 3.5 },
    wet: { c: 'rgba(79,179,191,0.95)', w: 3.5 },
    metal: { c: 'rgba(214,120,62,0.9)', w: 3 },
    crumbly: { c: 'rgba(242,178,76,0.95)', w: 3, dash: [5, 4] },
    jug: { c: 'rgba(242,178,76,1)', w: 3 },
  };
  const HOLD = {
    rock: { c: '#e9a03b', hi: 'rgba(255,230,180,0.55)', w: 7, h: 4 },
    jug: { c: '#f2b24c', hi: 'rgba(255,240,200,0.6)', w: 10, h: 5.5 },
    lip: { c: '#e9c46a', hi: 'rgba(255,245,210,0.6)', w: 9, h: 4 },
    smooth: { c: '#3fa7a0', hi: 'rgba(200,255,245,0.5)', w: 9, h: 3 },
    wet: { c: '#5cc8d6', hi: 'rgba(220,250,255,0.6)', w: 7, h: 4 },
    crumbly: { c: '#b88a5a', hi: 'rgba(240,210,170,0.45)', w: 7, h: 3.5 },
    metal: { c: '#8a5a3a', hi: 'rgba(230,170,120,0.5)', w: 8, h: 3.5 },
  };
  const ZONE_TINT = ['rgba(40,70,110,0.28)', 'rgba(70,50,110,0.30)', 'rgba(30,40,80,0.36)', 'rgba(10,20,50,0.45)', 'rgba(10,15,45,0.42)', 'rgba(120,70,110,0.22)', 'rgba(255,170,80,0.14)'];
  const SKIN = '#f1c7a3', SKIN_D = '#d9a888', TOP = '#2f9c97', TOP_D = '#227470', SHORTS = '#24324a', HAIR = '#f2cf73', HAIR_L = '#fbe7a6', HAIR_D = '#c99a3b';

  class Renderer {
    constructor(canvas, sim, assets) {
      this.cv = canvas; this.ctx = canvas.getContext('2d'); this.sim = sim; this.A = assets;
      this.cam = { x: sim.b.C.x, y: sim.b.C.y - 60, z: 1 };
      this.particles = []; this.ghosts = [];
      this.pat = {};
      for (const k of ['granite', 'basalt', 'rust', 'sandstone']) this.pat[k] = this.mirrorPattern(assets['tex_' + k]);
      this.debug = false;
    }
    mirrorPattern(img) {
      if (!img || !img.width) return null;
      const w = img.width, h = img.height, c = document.createElement('canvas');
      c.width = w * 2; c.height = h * 2;
      const x = c.getContext('2d');
      x.drawImage(img, 0, 0);
      x.save(); x.translate(w * 2, 0); x.scale(-1, 1); x.drawImage(img, 0, 0); x.restore();
      x.save(); x.translate(0, h * 2); x.scale(1, -1); x.drawImage(img, 0, 0); x.restore();
      x.save(); x.translate(w * 2, h * 2); x.scale(-1, -1); x.drawImage(img, 0, 0); x.restore();
      const p = this.ctx.createPattern(c, 'repeat');
      p.setTransform(new DOMMatrix().scale(0.42));
      return p;
    }

    resize() {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      this.cv.width = innerWidth * dpr; this.cv.height = innerHeight * dpr;
      this.W = this.cv.width; this.H = this.cv.height; this.dpr = dpr;
    }
    toWorld(cx, cy) {
      const sc = this.scale || 1;
      return { x: this.cam.x + (cx * this.dpr - this.W / 2) / sc, y: this.cam.y + (cy * this.dpr - this.H / 2) / sc };
    }

    update(dt) {
      const s = this.sim, C = s.b.C;
      const fast = Math.hypot(C.vx(), C.vy()) > 700 && !s.supported && !s.hands.some(h => h.grip);
      const tz = fast ? 0.72 : 1;
      this.cam.z += (tz - this.cam.z) * Math.min(1, dt * 2.5);
      const k = Math.min(1, dt * 5);
      // follow the chest, leaning a little toward the cursor so you can scout holds
      let lx = 0, ly = 0;
      if (this.mouse) { lx = Math.max(-140, Math.min(140, (this.mouse.x - C.x) * 0.25)); ly = Math.max(-120, Math.min(80, (this.mouse.y - C.y) * 0.25)); }
      this.leadX = (this.leadX || 0) + (lx - (this.leadX || 0)) * Math.min(1, dt * 2);
      this.leadY = (this.leadY || 0) + (ly - (this.leadY || 0)) * Math.min(1, dt * 2);
      this.cam.x += (C.x + this.leadX - this.cam.x) * k;
      this.cam.y += (C.y - 60 + this.leadY - this.cam.y) * k;
      for (const p of this.particles) { p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += (p.g || 0) * dt; p.vx *= 1 - dt * (p.drag || 0); }
      this.particles = this.particles.filter(p => p.t < p.life);
      for (const g of this.ghosts) g.t += dt;
      this.ghosts = this.ghosts.filter(g => g.t < 6);
      if (s.wind.warn > 0 || s.wind.force) {
        const n = s.wind.force ? 3 : 1;
        for (let i = 0; i < n; i++) this.particles.push({ kind: 'streak', x: this.cam.x - s.wind.dir * 900 + (Math.random() - .5) * 200, y: this.cam.y + (Math.random() - .5) * 900, vx: s.wind.dir * (900 + Math.random() * 500), vy: (Math.random() - .5) * 40, t: 0, life: 1.6 });
      }
    }

    burst(x, y, kind, n, color) {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2, sp = 30 + Math.random() * 90;
        this.particles.push({ kind, x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 20, g: kind === 'debris' ? 900 : -10, drag: kind === 'chalk' ? 3 : 0.2, t: 0, life: kind === 'debris' ? 1.8 : 0.9, r: kind === 'debris' ? 2 + Math.random() * 4 : 3 + Math.random() * 5, color });
      }
    }

    draw(time) {
      const ctx = this.ctx, s = this.sim, W = this.W, H = this.H;
      const scale = (H / 820) * this.cam.z;
      this.scale = scale;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      this.drawBackground(scale);
      ctx.setTransform(scale, 0, 0, scale, W / 2 - this.cam.x * scale, H / 2 - this.cam.y * scale);
      this.view = { x1: this.cam.x - W / 2 / scale, x2: this.cam.x + W / 2 / scale, y1: this.cam.y - H / 2 / scale, y2: this.cam.y + H / 2 / scale };
      this.drawClouds(time);
      this.drawTerrain(time);
      this.drawRopes();
      this.drawSummit(time);
      this.drawHolds(time);
      this.drawClimber();
      this.drawWater(time);
      this.drawParticles();
      this.drawGhosts();
      this.drawReach(time);
      if (this.debug) this.drawDebug();
    }

    zoneBlend(y) {
      const Z = this.sim.L.zones;
      let i = Z.findIndex(z => y > z.top); if (i < 0) i = Z.length - 1;
      const top = Z[i].top, f = i < Z.length - 1 ? Math.max(0, Math.min(1, (top + 220 - y) / 220)) : 0;
      return { i, f };
    }

    drawBackground(scale) {
      const ctx = this.ctx, W = this.W, H = this.H, Z = this.sim.L.zones;
      const { i, f } = this.zoneBlend(this.cam.y);
      const paint = (idx, a) => {
        const img = this.A[Z[idx].bg];
        if (!img || !img.width || a <= 0) return;
        const sc = Math.max(W / img.width, H / img.height) * 1.2;
        const bottom = idx > 0 ? Z[idx - 1].top : 40;
        const py = Math.max(-60, Math.min(60, (this.cam.y - (bottom - 400)) * 0.05)) * (H / 900);
        const px = -((this.cam.x - 1200) * 0.04) * (W / 1600);
        ctx.globalAlpha = a;
        ctx.drawImage(img, (W - img.width * sc) / 2 + px, (H - img.height * sc) / 2 - py, img.width * sc, img.height * sc);
      };
      ctx.fillStyle = '#0f1a24'; ctx.fillRect(0, 0, W, H);
      paint(i, 1);
      if (f > 0) paint(i + 1, f);
      ctx.globalAlpha = 1;
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, 'rgba(10,16,26,0.15)'); g.addColorStop(1, 'rgba(10,16,26,0.45)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    }

    drawClouds(time) {
      const ctx = this.ctx, v = this.view;
      if (v.y2 > -3700) return;
      ctx.save();
      for (let i = 0; i < 14; i++) {
        const y = -3900 - i * 120, x = ((i * 397 + time * (12 + i % 4 * 6)) % 3400) - 600;
        const a = Math.max(0, Math.min(0.22, (-3700 - y) / 2000));
        const g = ctx.createRadialGradient(x, y, 0, x, y, 260);
        g.addColorStop(0, `rgba(240,225,235,${a})`); g.addColorStop(1, 'rgba(240,225,235,0)');
        ctx.fillStyle = g; ctx.fillRect(x - 260, y - 260, 520, 520);
      }
      ctx.restore();
    }

    shapePath(sh, jx = 0, jy = 0) {
      const ctx = this.ctx;
      ctx.beginPath();
      sh.pts.forEach(([x, y], i) => (i ? ctx.lineTo(x + jx, y + jy) : ctx.moveTo(x + jx, y + jy)));
      ctx.closePath();
    }

    drawTerrain(time) {
      const ctx = this.ctx, v = this.view, s = this.sim;
      const { i: zi } = this.zoneBlend(this.cam.y);
      for (const sh of s.shapes) {
        const [x1, y1, x2, y2] = sh.aabb;
        if (x2 < v.x1 - 20 || x1 > v.x2 + 20 || y2 < v.y1 - 20 || y1 > v.y2 + 20) continue;
        if (sh.broken > 0) continue;
        let jx = 0, jy = 0;
        if (sh.crumbly && sh.load > 0) { const k = sh.load * 1.4; jx = (Math.random() - .5) * k; jy = (Math.random() - .5) * k; }
        ctx.save();
        this.shapePath(sh, jx, jy);
        ctx.clip();
        const bx = Math.max(x1, v.x1) - 2, by = Math.max(y1, v.y1) - 2, bw = Math.min(x2, v.x2) - bx + 4, bh = Math.min(y2, v.y2) - by + 4;
        if (sh.main) {
          // [texture, yTop, yBottom] in world y (down is positive)
          const bands = [['basalt', -560, 99999], ['granite', -3780, -560], ['sandstone', -99999, -3780]];
          for (const [tex, a, b] of bands) {
            const top = Math.max(by, a), bot = Math.min(by + bh, b);
            if (bot <= top || !this.pat[tex]) continue;
            ctx.fillStyle = this.pat[tex]; ctx.fillRect(bx, top, bw, bot - top);
          }
          // soften band seams
          for (const yb of [-560, -3780]) {
            if (yb < by - 60 || yb > by + bh + 60) continue;
            const g = ctx.createLinearGradient(0, yb - 50, 0, yb + 50);
            g.addColorStop(0, 'rgba(20,28,36,0)'); g.addColorStop(0.5, 'rgba(20,28,36,0.45)'); g.addColorStop(1, 'rgba(20,28,36,0)');
            ctx.fillStyle = g; ctx.fillRect(bx, yb - 50, bw, 100);
          }
        } else {
          ctx.fillStyle = this.pat[sh.tex] || '#556'; ctx.fillRect(bx, by, bw, bh);
        }
        ctx.fillStyle = ZONE_TINT[zi] || ZONE_TINT[0]; ctx.fillRect(bx, by, bw, bh);
        // inner shade for depth
        ctx.lineJoin = 'round';
        ctx.strokeStyle = 'rgba(5,10,16,0.45)'; ctx.lineWidth = sh.main ? 46 : 14; ctx.stroke();
        ctx.strokeStyle = 'rgba(5,10,16,0.35)'; ctx.lineWidth = sh.main ? 16 : 6; ctx.stroke();
        if (sh.hull) this.decorateHull(sh);
        if (sh.crumbly) this.decorateCrumbly(sh, jx, jy);
        ctx.restore();
        this.drawEdges(sh, jx, jy, time);
      }
    }

    drawEdges(sh, jx, jy, time) {
      const ctx = this.ctx, pts = sh.pts, n = pts.length;
      ctx.save(); ctx.lineCap = 'round';
      for (let i = 0; i < n; i++) {
        const type = sh.types[i], st = EDGE[type] || EDGE.rock;
        const a = pts[i], b = pts[(i + 1) % n];
        if (sh.main && a[1] > 300 && b[1] > 300) continue;
        ctx.beginPath(); ctx.moveTo(a[0] + jx, a[1] + jy); ctx.lineTo(b[0] + jx, b[1] + jy);
        ctx.strokeStyle = st.c; ctx.lineWidth = st.w; ctx.setLineDash(st.dash || []);
        if (type === 'jug' || type === 'wet') { ctx.shadowColor = st.c; ctx.shadowBlur = 8; } else ctx.shadowBlur = 0;
        ctx.stroke();
        if (type === 'smooth') { // gloss streaks
          ctx.setLineDash([]); ctx.shadowBlur = 0;
          const L = Math.hypot(b[0] - a[0], b[1] - a[1]), ux = (b[0] - a[0]) / L, uy = (b[1] - a[1]) / L;
          const off = ((time * 40) % 60);
          ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 1.5;
          for (let d = off; d < L; d += 60) {
            ctx.beginPath(); ctx.moveTo(a[0] + ux * d, a[1] + uy * d); ctx.lineTo(a[0] + ux * Math.min(L, d + 14), a[1] + uy * Math.min(L, d + 14)); ctx.stroke();
          }
        }
        if (type === 'wet') { // drips
          ctx.setLineDash([]); ctx.shadowBlur = 0; ctx.fillStyle = 'rgba(140,220,230,0.8)';
          const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
          for (let d = 10; d < L; d += 37) {
            const t = d / L, ph = (time * 0.7 + d * 0.013) % 1;
            ctx.beginPath(); ctx.arc(a[0] + (b[0] - a[0]) * t - 2, a[1] + (b[1] - a[1]) * t + ph * 24, 1.6, 0, 7); ctx.fill();
          }
        }
      }
      ctx.restore();
    }

    decorateHull(sh) {
      const ctx = this.ctx;
      ctx.strokeStyle = 'rgba(40,18,8,0.6)'; ctx.lineWidth = 2;
      for (let y = -1690; y < -1400; y += 34) { ctx.beginPath(); ctx.moveTo(940, y); ctx.lineTo(1400, y + 20); ctx.stroke(); }
      ctx.fillStyle = 'rgba(30,14,6,0.7)';
      for (let x = 1020; x < 1380; x += 22) for (let y = -1660; y < -1420; y += 34) { ctx.beginPath(); ctx.arc(x, y + (x - 1000) * 0.05, 1.6, 0, 7); ctx.fill(); }
      for (const [x, y] of [[1120, -1600], [1200, -1590], [1280, -1580]]) {
        ctx.fillStyle = 'rgba(15,20,26,0.9)'; ctx.beginPath(); ctx.arc(x, y, 9, 0, 7); ctx.fill();
        ctx.strokeStyle = 'rgba(214,140,80,0.8)'; ctx.lineWidth = 2.5; ctx.stroke();
      }
    }

    decorateCrumbly(sh, jx, jy) {
      const ctx = this.ctx, [x1, y1, x2, y2] = sh.aabb;
      ctx.strokeStyle = `rgba(30,15,5,${0.4 + Math.min(0.5, sh.load / 2)})`; ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(x1 + 4 + jx, y1 + jy); ctx.lineTo((x1 + x2) / 2 + jx, (y1 + y2) / 2 + jy); ctx.lineTo(x2 - 3 + jx, y2 + jy);
      if (sh.load > 0.6) { ctx.moveTo((x1 + x2) / 2 + jx, (y1 + y2) / 2 + jy); ctx.lineTo(x1 + jx, y2 - 2 + jy); }
      ctx.stroke();
    }

    drawRopes() {
      const ctx = this.ctx;
      for (const r of this.sim.ropes) {
        const n = r.nodes;
        ctx.save();
        ctx.fillStyle = 'rgba(40,25,15,0.9)'; ctx.beginPath(); ctx.arc(n[0].x, n[0].y, 5, 0, 7); ctx.fill();
        for (let i = 1; i < n.length; i++) {
          const a = n[i - 1], b = n[i], ang = Math.atan2(b.y - a.y, b.x - a.x), L = Math.hypot(b.x - a.x, b.y - a.y);
          for (let k = 0; k < 2; k++) {
            const t = (k + 0.5) / 2, x = a.x + (b.x - a.x) * t, y = a.y + (b.y - a.y) * t;
            ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
            ctx.strokeStyle = (i + k) % 2 ? '#8a5332' : '#b06a3c'; ctx.lineWidth = (i + k) % 2 ? 2 : 3;
            ctx.beginPath(); ctx.ellipse(0, 0, L / 3.2, (i + k) % 2 ? 1.5 : 4, 0, 0, 7); ctx.stroke();
            ctx.restore();
          }
        }
        ctx.restore();
      }
    }

    drawSummit(time) {
      const ctx = this.ctx, x = 2395, y = -5400;
      if (this.view.y1 > y + 50 || this.view.y2 < y - 200) return;
      ctx.save();
      ctx.fillStyle = '#6d6a64';
      [[0, 0, 12], [-3, -12, 9], [2, -21, 7]].forEach(([dx, dy, r]) => { ctx.beginPath(); ctx.ellipse(x + dx, y - 6 + dy, r, r * 0.7, 0, 0, 7); ctx.fill(); });
      ctx.strokeStyle = '#3b2d22'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(x, y - 20); ctx.lineTo(x, y - 90); ctx.stroke();
      ctx.fillStyle = '#f2b24c'; ctx.beginPath(); ctx.moveTo(x, y - 90);
      for (let i = 0; i <= 8; i++) ctx.lineTo(x + i * 5, y - 90 + Math.sin(time * 4 + i * 0.8) * 3 + (i * 0));
      for (let i = 8; i >= 0; i--) ctx.lineTo(x + i * 5, y - 68 + Math.sin(time * 4 + i * 0.8) * 3);
      ctx.fill();
      ctx.restore();
    }

    drawWater(time) {
      const ctx = this.ctx, v = this.view;
      if (v.y2 < 20) return;
      const regions = [[Math.max(v.x1 - 20, -4000), -150], [2420, Math.min(v.x2 + 20, 5000)]];
      for (const [a, b] of regions) {
        if (b <= a) continue;
        const g = ctx.createLinearGradient(0, 20, 0, 420);
        g.addColorStop(0, 'rgba(79,179,191,0.75)'); g.addColorStop(1, 'rgba(10,40,60,0.95)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.moveTo(a, 700);
        for (let x = a; x <= b; x += 12) ctx.lineTo(x, 30 + Math.sin(x * 0.03 + time * 1.6) * 4 + Math.sin(x * 0.011 - time) * 3);
        ctx.lineTo(b, 700); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = 'rgba(232,225,211,0.6)'; ctx.lineWidth = 1.5; ctx.stroke();
      }
      // shore foam on the beach edge
      ctx.fillStyle = 'rgba(232,225,211,0.5)';
      for (let i = 0; i < 6; i++) { const ph = (time * 0.5 + i / 6) % 1; ctx.beginPath(); ctx.arc(-150 + ph * 40, 36 + Math.sin(i) * 3, 3 * (1 - ph), 0, 7); ctx.fill(); }
    }

    // ---------- climber ----------
    ik(sx, sy, hx, hy, l1, l2, bendSign) {
      let dx = hx - sx, dy = hy - sy, d = Math.hypot(dx, dy);
      d = Math.min(d, l1 + l2 - 0.01);
      const a = Math.atan2(dy, dx), cos = (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d);
      const ang = a + bendSign * Math.acos(Math.max(-1, Math.min(1, cos)));
      return { x: sx + Math.cos(ang) * l1, y: sy + Math.sin(ang) * l1 };
    }
    limb(ax, ay, bx, by, cx, cy, w1, w2, col) {
      const ctx = this.ctx;
      ctx.strokeStyle = col; ctx.lineCap = 'round';
      ctx.lineWidth = w1; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
      ctx.lineWidth = w2; ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(cx, cy); ctx.stroke();
    }

    drawClimber() {
      const ctx = this.ctx, s = this.sim, B = s.b, f = s.facing;
      const S = s.S;
      const sh = h => ({ x: S.x + h.side * 3 * -f, y: S.y });
      const tx = B.C.x - B.P.x, ty = B.C.y - B.P.y, tl = Math.hypot(tx, ty) || 1, ux = tx / tl, uy = ty / tl;
      const back = s.hands.find(h => h.side === -f) || s.hands[0], front = s.hands.find(h => h !== back);
      const arm = h => {
        const o = sh(h);
        const bend = (h.p.x - o.x) * f > 0 ? -f : f;
        const e = this.ik(o.x, o.y, h.p.x, h.p.y, 34, 33, bend);
        return { o, e };
      };
      const leg = (K, F) => {
        ctx.lineCap = 'round';
        ctx.strokeStyle = SKIN; ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(B.P.x, B.P.y); ctx.lineTo(K.x, K.y); ctx.lineTo(F.x, F.y); ctx.stroke();
        const mx = B.P.x + (K.x - B.P.x) * 0.45, my = B.P.y + (K.y - B.P.y) * 0.45;
        ctx.strokeStyle = SHORTS; ctx.lineWidth = 12; ctx.beginPath(); ctx.moveTo(B.P.x, B.P.y); ctx.lineTo(mx, my); ctx.stroke();
        const a = Math.atan2(F.y - K.y, F.x - K.x);
        ctx.save(); ctx.translate(F.x, F.y); ctx.rotate(a - Math.PI / 2);
        ctx.fillStyle = '#e8e1d3'; ctx.beginPath(); ctx.ellipse(f * 3, 2, 6, 4.5, 0, 0, 7); ctx.fill();
        ctx.fillStyle = '#f2b24c'; ctx.fillRect(-5, 2, 10, 2);
        ctx.restore();
      };
      // back limbs
      const ba = arm(back);
      ctx.globalAlpha = 0.85;
      this.limb(ba.o.x, ba.o.y, ba.e.x, ba.e.y, back.p.x, back.p.y, 7, 6, SKIN_D);
      leg(f > 0 ? B.KL : B.KR, f > 0 ? B.FL : B.FR);
      ctx.globalAlpha = 1;
      // hair behind
      this.drawHair();
      // torso
      ctx.lineCap = 'round';
      ctx.strokeStyle = TOP_D; ctx.lineWidth = 19; ctx.beginPath(); ctx.moveTo(B.C.x + ux * 4, B.C.y + uy * 4); ctx.lineTo(B.P.x - ux * 2, B.P.y - uy * 2); ctx.stroke();
      ctx.strokeStyle = TOP; ctx.lineWidth = 15; ctx.stroke();
      ctx.strokeStyle = SHORTS; ctx.lineWidth = 18; ctx.beginPath(); ctx.moveTo(B.P.x + ux * 4, B.P.y + uy * 4); ctx.lineTo(B.P.x - ux * 3, B.P.y - uy * 3); ctx.stroke();
      // chalk bag
      ctx.fillStyle = '#e9e4d8'; ctx.beginPath(); ctx.ellipse(B.P.x - f * 9 - ux * 2, B.P.y - uy * 2 + 2, 5, 6, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#f2b24c'; ctx.fillRect(B.P.x - f * 9 - 4, B.P.y - 5, 8, 2);
      // neck + head
      ctx.strokeStyle = SKIN; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(B.C.x + ux * 6, B.C.y + uy * 6); ctx.lineTo(B.H.x, B.H.y); ctx.stroke();
      ctx.fillStyle = SKIN; ctx.beginPath(); ctx.arc(B.H.x, B.H.y, 10, 0, 7); ctx.fill();
      // hair cap
      const ha = Math.atan2(B.H.y - B.C.y, B.H.x - B.C.x);
      ctx.fillStyle = HAIR; ctx.beginPath(); ctx.arc(B.H.x, B.H.y, 11, ha - Math.PI * 0.55 - (f < 0 ? 0.6 : 0), ha + Math.PI * 0.55 + (f > 0 ? 0.6 : 0)); ctx.closePath(); ctx.fill();
      ctx.fillStyle = HAIR_L; ctx.beginPath(); ctx.arc(B.H.x - f * 2, B.H.y - 3, 5, 0, 7); ctx.globalAlpha = 0.6; ctx.fill(); ctx.globalAlpha = 1;
      // face
      const fx = B.H.x + f * 5 - ux * 1, fy = B.H.y - uy * 1;
      ctx.fillStyle = '#2a2320'; ctx.beginPath(); ctx.arc(fx, fy, 1.4, 0, 7); ctx.fill();
      // front limbs
      leg(f > 0 ? B.KR : B.KL, f > 0 ? B.FR : B.FL);
      const fa = arm(front);
      this.limb(fa.o.x, fa.o.y, fa.e.x, fa.e.y, front.p.x, front.p.y, 7.5, 6.5, SKIN);
      ctx.strokeStyle = TOP; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(fa.o.x, fa.o.y); ctx.lineTo(fa.o.x + (fa.e.x - fa.o.x) * 0.15, fa.o.y + (fa.e.y - fa.o.y) * 0.15); ctx.stroke();
      // hands + stamina
      for (const h of s.hands) {
        ctx.fillStyle = h.grip ? '#fff7ea' : SKIN; ctx.beginPath(); ctx.arc(h.p.x, h.p.y, 5, 0, 7); ctx.fill();
        if (h.stamina < 99.5 || h.grip) {
          const st = h.stamina / 100;
          ctx.lineWidth = 2.5; ctx.lineCap = 'round';
          ctx.strokeStyle = 'rgba(15,26,36,0.6)'; ctx.beginPath(); ctx.arc(h.p.x, h.p.y, 11, 0, 7); ctx.stroke();
          ctx.strokeStyle = st > 0.5 ? '#4fb3bf' : st > 0.25 ? '#f2b24c' : '#ff8a3d';
          ctx.beginPath(); ctx.arc(h.p.x, h.p.y, 11, -Math.PI / 2, -Math.PI / 2 + st * Math.PI * 2); ctx.stroke();
        }
      }
    }

    drawHair() {
      const ctx = this.ctx, s = this.sim;
      const cols = [HAIR_D, HAIR, HAIR_L];
      s.hair.forEach((st, k) => {
        const n = st.nodes;
        for (let i = 1; i < n.length; i++) {
          ctx.strokeStyle = cols[k]; ctx.lineCap = 'round';
          ctx.lineWidth = 7.5 - i * 0.8 - (k === 2 ? 2 : 0);
          ctx.beginPath(); ctx.moveTo(n[i - 1].x, n[i - 1].y);
          const mx = (n[i].x + (n[i + 1] || n[i]).x) / 2, my = (n[i].y + (n[i + 1] || n[i]).y) / 2;
          ctx.quadraticCurveTo(n[i].x, n[i].y, mx, my); ctx.stroke();
        }
      });
    }

    drawHolds(time) {
      const ctx = this.ctx, s = this.sim, v = this.view, S = s.S;
      const busy = !!s.mant;
      for (const h of s.holds) {
        if (h.x < v.x1 - 30 || h.x > v.x2 + 30 || h.y < v.y1 - 30 || h.y > v.y2 + 30) continue;
        if (h.s.broken > 0) continue;
        const st = HOLD[h.lip ? 'lip' : h.type] || HOLD.rock;
        const t = { kind: 'hold', hold: h };
        const d = Math.hypot(h.x - S.x, h.y - S.y);
        let ring = null;
        if (!busy && d < 280 && !s.hands.some(o => s.same(o.grip, t))) { const r = s.reachInfo(t).state; if (r === 'ok' || r === 'far') ring = r; }
        const a = Math.atan2(h.ny, h.nx);
        ctx.save(); ctx.translate(h.x, h.y); ctx.rotate(a + Math.PI / 2);
        if (ring === 'ok') { // soft glow behind holds within reach
          const g = ctx.createRadialGradient(0, 0, 2, 0, 0, 20);
          g.addColorStop(0, 'rgba(79,214,200,0.45)'); g.addColorStop(1, 'rgba(79,214,200,0)');
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 20, 0, 7); ctx.fill();
        }
        ctx.fillStyle = 'rgba(10,14,20,0.45)'; ctx.beginPath(); ctx.ellipse(0, 2.5, st.w + 1.5, st.h + 1.5, 0, 0, 7); ctx.fill();
        ctx.fillStyle = st.c; ctx.beginPath(); ctx.ellipse(0, 0, st.w, st.h, 0, 0, 7); ctx.fill();
        ctx.fillStyle = st.hi; ctx.beginPath(); ctx.ellipse(-st.w * 0.25, -st.h * 0.35, st.w * 0.45, st.h * 0.35, 0, 0, 7); ctx.fill();
        if (h.lip) { ctx.strokeStyle = st.c; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-10, -st.h - 3); ctx.lineTo(0, -st.h - 9); ctx.lineTo(10, -st.h - 3); ctx.stroke(); }
        ctx.restore();
        if (ring) {
          ctx.save();
          ctx.lineWidth = 2;
          if (ring === 'ok') { ctx.strokeStyle = `rgba(79,214,200,${0.65 + 0.25 * Math.sin(time * 4 + h.x)})`; }
          else { ctx.strokeStyle = 'rgba(242,178,76,0.55)'; ctx.setLineDash([3, 4]); }
          ctx.beginPath(); ctx.arc(h.x, h.y, 13, 0, 7); ctx.stroke();
          ctx.restore();
        }
      }
    }

    drawReach(time) {
      const ctx = this.ctx, s = this.sim;
      ctx.save();
      // hands on their way to a hold
      for (const h of s.hands) {
        if (!h.target || h.grip) continue;
        const T = s.tpos(h.target);
        ctx.strokeStyle = h.mode === 'lunge' ? 'rgba(242,178,76,0.8)' : 'rgba(79,214,200,0.7)';
        ctx.lineWidth = 1.5; ctx.setLineDash([2, 5]);
        ctx.beginPath(); ctx.moveTo(h.p.x, h.p.y); ctx.lineTo(T.x, T.y); ctx.stroke();
        ctx.setLineDash([]); ctx.beginPath(); ctx.arc(T.x, T.y, 15 + Math.sin(time * 10) * 2, 0, 7); ctx.stroke();
      }
      const hv = this.hover;
      if (hv) {
        const T = s.tpos(hv.t), st = hv.mantle ? 'mantle' : hv.info.state;
        const col = st === 'ok' || st === 'mantle' ? '#4fd6c8' : st === 'far' ? '#f2b24c' : st === 'held' ? '#e9c46a' : 'rgba(170,170,180,0.8)';
        ctx.strokeStyle = col; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.arc(T.x, T.y, 18 + Math.sin(time * 6) * 1.5, 0, 7); ctx.stroke();
        if (hv.info.hand && (st === 'ok' || st === 'far')) {
          const p = hv.info.hand.p;
          ctx.lineWidth = 1.5; ctx.setLineDash(st === 'ok' ? [6, 4] : [2, 6]);
          ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(T.x, T.y); ctx.stroke(); ctx.setLineDash([]);
        }
        const label = { ok: 'click to grab', far: 'too far — swing ←→ · Space to lunge', no: 'out of reach', held: 'holding', mantle: 'click or ↑ to mantle' }[st] || '';
        if (label) {
          ctx.font = '600 13px ui-sans-serif, system-ui, sans-serif';
          const w = ctx.measureText(label).width;
          ctx.fillStyle = 'rgba(12,18,28,0.75)'; ctx.fillRect(T.x + 22, T.y - 28, w + 14, 22);
          ctx.fillStyle = col; ctx.fillText(label, T.x + 29, T.y - 12);
        }
      } else if (this.mouse) {
        ctx.strokeStyle = 'rgba(232,225,211,0.45)'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(this.mouse.x, this.mouse.y, 6, 0, 7); ctx.stroke();
      }
      // checkpoint flag
      if (s.cp && s.cp.y < 0) {
        const { x, y } = s.cp;
        ctx.strokeStyle = 'rgba(232,225,211,0.7)'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(x, y + 2); ctx.lineTo(x, y - 26); ctx.stroke();
        ctx.fillStyle = '#4fd6c8'; ctx.beginPath(); ctx.moveTo(x, y - 26); ctx.lineTo(x + 13, y - 21 + Math.sin(time * 3) * 1.5); ctx.lineTo(x, y - 16); ctx.fill();
      }
      ctx.restore();
    }

    drawParticles() {
      const ctx = this.ctx;
      for (const p of this.particles) {
        const a = 1 - p.t / p.life;
        if (p.kind === 'streak') {
          ctx.strokeStyle = `rgba(232,225,211,${0.25 * a})`; ctx.lineWidth = 1.2;
          ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * 0.05, p.y); ctx.stroke();
        } else if (p.kind === 'debris') {
          ctx.fillStyle = p.color || '#c49a62'; ctx.globalAlpha = Math.min(1, a * 2);
          ctx.fillRect(p.x - p.r / 2, p.y - p.r / 2, p.r, p.r); ctx.globalAlpha = 1;
        } else {
          ctx.fillStyle = `rgba(250,248,240,${0.5 * a})`; ctx.beginPath(); ctx.arc(p.x, p.y, p.r * (1 + p.t), 0, 7); ctx.fill();
        }
      }
    }

    drawGhosts() {
      const ctx = this.ctx;
      for (const g of this.ghosts) {
        const a = Math.min(1, (6 - g.t) / 1.5);
        ctx.save(); ctx.globalAlpha = a;
        ctx.strokeStyle = 'rgba(232,225,211,0.5)'; ctx.setLineDash([4, 6]); ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(g.from.x, g.from.y); ctx.lineTo(g.to.x, g.to.y); ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = '#f2b24c'; ctx.beginPath(); ctx.arc(g.from.x, g.from.y, 3.5, 0, 7); ctx.fill();
        ctx.font = '600 13px ui-monospace, Consolas, monospace'; ctx.fillStyle = '#e8e1d3';
        ctx.fillText(`fell ${g.m.toFixed(1)} m — ${g.reason}`, g.from.x + 10, g.from.y - 6);
        ctx.restore();
      }
    }

    drawDebug() {
      const ctx = this.ctx, s = this.sim;
      ctx.save(); ctx.lineWidth = 1;
      for (const p of [...s.body, ...s.hands.map(h => h.p)]) {
        ctx.strokeStyle = p.contact ? '#4fb3bf' : '#f2b24c'; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7); ctx.stroke();
      }
      ctx.restore();
    }
  }
  G.GRIP.Renderer = Renderer;
})(window);
