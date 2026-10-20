// Kessie Klimber renderer: painted ComfyUI backdrops, textured tiles, and a vector Kessie with flowing blond hair.
(function (G) {
  const SKIN = '#f1c7a3', SKIN_D = '#d9a888', TOP_C = '#2f9c97', TOP_DC = '#227470', SHORTS_C = '#24324a', HAIR = '#f2cf73', HAIR_L = '#fbe7a6', HAIR_D = '#c99a3b';
  const TUFT = { granite: ['#3f8f6f', '#5fb08a'], rust: ['#4a7f6a', '#7aa58a'], basalt: ['#2e6a6a', '#4f9c97'], sandstone: ['#c9a25a', '#e8c27a'], limestone: ['#4f7f4a', '#7aa060'], canyon: ['#3f7f4f', '#6fa86a'], snowrock: ['#e8f2f4', '#c8dde3'], reef: ['#5f8a4a', '#8fb06a'], rubble: ['#7a7040', '#9c8f52'] };
  const LEAF = '#e0602c', LEAF_L = '#f2a03b';
  const DANCES = ['The Floss', 'Spin & Shine', 'Fist Pump', 'The Dab'];
  const PERKS = ['Iron Grip', 'Rad Resistant', 'Cap Collector', 'Gravity Is Optional', 'Chalk Wizard', "Jade's Luck", 'Roach Stomper', 'Wasteland Gymnast'];
  const SUIT = '#2f5fa8', SUIT_D = '#22457d', SUIT_Y = '#f2c94c';
  const RIM = { granite: 'rgba(230,240,235,0.55)', rust: 'rgba(240,190,140,0.55)', basalt: 'rgba(170,220,225,0.45)', sandstone: 'rgba(255,225,170,0.6)', limestone: 'rgba(235,235,225,0.6)', canyon: 'rgba(190,230,220,0.55)', snowrock: 'rgba(245,250,255,0.9)', reef: 'rgba(240,232,214,0.6)', rubble: 'rgba(150,240,140,0.45)' };
  const hash = (a, b) => { let h = (a * 374761393 + b * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

  class Renderer {
    constructor(canvas, game, assets) {
      this.cv = canvas; this.ctx = canvas.getContext('2d'); this.A = assets;
      this.pat = {};
      for (const k of ['granite', 'basalt', 'rust', 'sandstone', 'limestone', 'canyon', 'snowrock', 'reef', 'rubble']) this.pat[k] = this.mirrorPattern(assets['tex_' + k]);
      this.shakeOn = true;
      this.setGame(game);
    }
    setGame(game) {
      this.g = game; this.L = game.L; this.T = game.T;
      this.cam = { x: game.p.x, y: game.p.y - 80, lead: 0, vy: 0 };
      this.particles = []; this.texts = []; this.shake = 0; this.spin = 0; this.sq = 0; this.flash = 0;
      this.hair = null;
      this.jade = this.L.theme === 'jade' || this.L.theme === 'waste';
      this.grassi = this.L.theme === 'grassi' || this.jade;
      this.morphT = 0; this.lvl = 0; this.wonT = -1;
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
      p.setTransform(new DOMMatrix().scale(0.3));
      return p;
    }
    resize() {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      this.cv.width = innerWidth * dpr; this.cv.height = innerHeight * dpr;
      this.W = this.cv.width; this.H = this.cv.height; this.dpr = dpr;
    }
    waste(y = this.g.p.y - 20) { return !!this.L.zones[this.zoneOfRow(Math.floor(y / this.T))].waste; }
    morph() { this.morphT = 3.4; this.kick(26); }
    zoneOfRow(r) { const Z = this.L.zones; const i = Z.findIndex(z => r >= z.top && r <= z.bottom); return i < 0 ? (r < 0 ? Z.length - 1 : 0) : i; }

    // ---------- events from the game ----------
    onEvent(e) {
      const T = this.T, p = this.g.p;
      switch (e.type) {
        case 'jump': this.dust(p.x, p.y, 6, 0.6); this.sq = -0.18; break;
        case 'djump': this.spin = 0.001; this.ring(p.x, p.y - 20, '#4fd6c8'); this.sq = -0.15; break;
        case 'walljump': this.dust(e.x, e.y + 10, 7, 0.7, e.dir); this.sq = -0.12; break;
        case 'land': { const k = Math.min(1, e.drop / 260); if (e.drop > 40) this.dust(p.x, p.y, 4 + 10 * k, 0.4 + k); this.sq = 0.1 + 0.28 * k; if (e.drop > 200) this.kick(4 + 10 * k); break; }
        case 'fall': this.text(p.x, p.y - 70, `${e.m.toFixed(1)} m fall`, '#ffd98a'); break;
        case 'spring': this.ring(e.x, e.y - 10, '#f2b24c'); this.dust(e.x, e.y, 10, 0.9); this.sq = -0.3; this.kick(3); break;
        case 'shell': this.sparkle(e.x, e.y); this.text(e.x, e.y - 20, this.waste(e.y) ? '+1 bottle cap' : this.jade ? '+1 jade' : this.grassi ? '+1 fossil' : '+1 shell', this.waste(e.y) ? '#9dff8a' : '#fbe7a6'); break;
        case 'checkpoint': this.ring(e.x, e.y - 30, '#ffd98a'); this.sparkle(e.x, e.y - 50); break;
        case 'dance': if (this.waste(e.y)) { this.lvl++; this.rads(e.x, e.y - 40, 40); this.ring(e.x, e.y - 25, '#9dff8a'); this.text(e.x, e.y - 110, `LEVEL UP!  LV ${this.lvl + 1}`, '#9dff8a'); this.text(e.x, e.y - 86, `Perk: ${PERKS[(this.lvl - 1) % PERKS.length]}`, '#ffd98a'); this.kick(3); break; }
          this.grassi ? this.chalk(e.x, e.y - 40, 30) : this.leaves(e.x, e.y - 40, 26); this.ring(e.x, e.y - 25, '#4fd6c8'); this.text(e.x, e.y - 90, `Power move: ${DANCES[e.move]}!`, '#ffd98a'); this.kick(2); break;
        case 'crumble': this.debris(e.x, e.y); this.kick(3); break;
        case 'splash': this.splash(e.x, e.y); this.flash = 0.5; break;
        case 'ouch': this.kick(7); this.flash = 0.25; for (let i = 0; i < 8; i++) this.particles.push({ k: 'star', x: p.x, y: p.y - 40, vx: (Math.random() - .5) * 260, vy: -Math.random() * 220, g: 600, t: 0, life: 0.7, r: 3 }); break;
        case 'hang': this.dust(e.x, e.y, 3, 0.3); break;
        case 'mantle': this.sq = -0.08; break;
        case 'pumped': this.chalk(p.x, p.y - 40, 10); this.text(p.x, p.y - 80, this.waste() ? 'RAD OVERLOAD! Find clean ground' : 'Pumped! Shake out on a ledge', this.waste() ? '#9dff8a' : '#ffd98a'); this.kick(3); break;
        case 'grab': if (this.waste()) this.rads(p.x, p.y - 40, 5); else if (this.grassi) this.chalk(p.x, p.y - 40, 4); break;
        case 'respawn': this.hair = null; this.cam.x = e.x; this.cam.y = e.y - 80; this.ring(e.x, e.y - 22, '#4fd6c8'); break;
        case 'summit': this.wonT = 0; for (let i = 0; i < 140; i++) { const a = Math.random() * 7; this.particles.push({ k: i % 3 || this.grassi ? 'confetti' : 'leaf', x: p.x, y: p.y - 60, vx: Math.cos(a) * (150 + Math.random() * 350), vy: -250 - Math.random() * 500, g: 500, drag: 1.2, t: 0, life: 4 + Math.random() * 2, r: 4, c: (this.jade ? ['#9dff8a', '#f2c94c', '#2f5fa8', '#4fd6c8', '#ffd98a'] : ['#f2b24c', '#4fd6c8', '#fbe7a6', '#2f9c97', '#ffd98a'])[i % 5], rot: Math.random() * 6 }); } break;
      }
    }
    kick(n) { if (this.shakeOn) this.shake = Math.max(this.shake, n); }
    dust(x, y, n, s = 1, dir = 0) {
      for (let i = 0; i < n; i++) this.particles.push({ k: 'dust', x: x + (Math.random() - .5) * 16, y: y - 3, vx: (Math.random() - .5) * 160 * s + dir * 60, vy: -Math.random() * 70 * s, g: 80, drag: 4, t: 0, life: 0.45 + Math.random() * 0.35, r: 4 + Math.random() * 6 * s });
    }
    ring(x, y, c) { this.particles.push({ k: 'ring', x, y, vx: 0, vy: 0, t: 0, life: 0.45, c }); }
    sparkle(x, y) { for (let i = 0; i < 14; i++) { const a = i / 14 * 6.28; this.particles.push({ k: 'spark', x, y, vx: Math.cos(a) * 170, vy: Math.sin(a) * 170, drag: 5, t: 0, life: 0.6, r: 2.5 }); } }
    debris(x, y) { for (let i = 0; i < 12; i++) this.particles.push({ k: 'rock', x: x + (Math.random() - .5) * 28, y: y + (Math.random() - .5) * 20, vx: (Math.random() - .5) * 120, vy: -Math.random() * 120, g: 1300, t: 0, life: 1.4, r: 2 + Math.random() * 4, rot: Math.random() * 6 }); }
    splash(x, y) { for (let i = 0; i < 26; i++) this.particles.push({ k: 'drop', x, y, vx: (Math.random() - .5) * 300, vy: -150 - Math.random() * 420, g: 1300, t: 0, life: 1.1, r: 2 + Math.random() * 3 }); }
    leaves(x, y, n) { for (let i = 0; i < n; i++) { const a = -Math.PI / 2 + (Math.random() - .5) * 2.4; this.particles.push({ k: 'leaf', x, y, vx: Math.cos(a) * (120 + Math.random() * 260), vy: Math.sin(a) * (200 + Math.random() * 300), g: 380, drag: 1.6, t: 0, life: 2 + Math.random(), r: 5 + Math.random() * 3, rot: Math.random() * 6, c: i % 3 ? LEAF : LEAF_L }); } }
    chalk(x, y, n) { for (let i = 0; i < n; i++) { const a = Math.random() * 6.28, sp = 60 + Math.random() * 220; this.particles.push({ k: 'chalk', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 60, g: -20, drag: 2.6, t: 0, life: 1.1 + Math.random() * 0.8, r: 6 + Math.random() * 10 }); } }
    rads(x, y, n) { for (let i = 0; i < n; i++) { const a = Math.random() * 6.28, sp = 40 + Math.random() * 200; this.particles.push({ k: 'mote', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 40, g: -30, drag: 2, t: 0, life: 1 + Math.random(), r: 1.5 + Math.random() * 2.5 }); } }
    text(x, y, s, c) { this.texts.push({ x, y, s, c, t: 0 }); }

    // ---------- per-frame update ----------
    update(dt, time) {
      const g = this.g, p = g.p, T = this.T;
      // camera: look ahead horizontally, peek down when falling fast
      this.cam.lead += (p.face * 46 - this.cam.lead) * Math.min(1, dt * 1.6);
      this.cam.vy += ((p.vy > 500 ? Math.min(140, (p.vy - 500) * 0.4) : 0) - this.cam.vy) * Math.min(1, dt * 3);
      const tx = p.x + this.cam.lead, ty = p.y - 70 + this.cam.vy;
      this.cam.x += (tx - this.cam.x) * Math.min(1, dt * 6);
      this.cam.y += (ty - this.cam.y) * Math.min(1, dt * (p.ground || p.hang ? 5 : 3.2));
      this.shake = Math.max(0, this.shake - dt * 30);
      this.flash = Math.max(0, this.flash - dt * 1.5);
      this.sq *= Math.exp(-dt * 12);
      if (this.spin) { this.spin += dt / 0.36; if (this.spin >= 1) this.spin = 0; }
      if (p.ground && Math.abs(p.vx) > 200 && Math.random() < dt * 14) this.dust(p.x - p.face * 6, p.y, 1, 0.35);
      if (p.sliding && Math.random() < dt * 30) this.dust(p.x + p.sliding * 9, p.y - 30, 1, 0.3);
      const w = g.wind;
      if (w.force || w.warn) {
        const n = w.force ? 2 : 0.5;
        for (let i = 0; i < n * dt * 60; i++) this.particles.push({ k: 'streak', x: this.cam.x - w.dir * 900 + (Math.random() - .5) * 300, y: this.cam.y + (Math.random() - .5) * 800, vx: w.dir * (900 + Math.random() * 500), vy: (Math.random() - .5) * 40, t: 0, life: 1.6, a: w.force ? 0.5 : 0.2 });
      }
      const zz = this.L.zones[this.zoneOfRow(Math.floor(this.cam.y / this.T))];
      if (this.morphT > 0) this.morphT = Math.max(0, this.morphT - dt);
      if (this.wonT >= 0) this.wonT += dt;
      if (zz.waste && Math.random() < dt * 9) this.particles.push({ k: 'mote', x: this.cam.x + (Math.random() - .5) * 1500, y: this.cam.y + 450, vx: (Math.random() - .5) * 20, vy: -30 - Math.random() * 50, t: 0, life: 9, r: 1 + Math.random() * 2.5 });
      if (zz.snow) for (let i = 0; i < dt * 40; i++) this.particles.push({ k: 'snow', ash: !!zz.waste, x: this.cam.x + (Math.random() - .5) * 1700, y: this.cam.y - 560, vx: (w.force ? w.force * 380 : 0) + (Math.random() - .5) * 30, vy: 50 + Math.random() * 50, t: 0, life: 14, r: 1 + Math.random() * 2.2, ph: Math.random() * 6 });
      for (const q of this.particles) { if (q.k === 'snow') q.x += Math.sin(time * 1.5 + q.ph) * 12 * dt; q.t += dt; q.vy += (q.g || 0) * dt; q.vx *= 1 - dt * (q.drag || 0); q.vy *= 1 - dt * (q.drag || 0) * 0.5; q.x += q.vx * dt; q.y += q.vy * dt; if (q.rot !== undefined) q.rot += dt * 8; }
      this.particles = this.particles.filter(q => q.t < q.life);
      for (const t of this.texts) t.t += dt;
      this.texts = this.texts.filter(t => t.t < 1.4);
      this.updateHair(dt, w.force && !g.sheltered() ? w.force : 0);
    }

    // ---------- draw ----------
    draw(time) {
      const ctx = this.ctx, W = this.W, H = this.H, T = this.T, L = this.L;
      // phones get a closer camera; in portrait, Kessie sits higher to clear the thumb controls
      const portrait = H > W * 1.05;
      const scale = this.touch ? (portrait ? W / 540 : Math.max(H / 520, W / 1040)) : Math.max(H / 660, W / 1300);
      this.scale = scale;
      const vw = W / scale, vh = H / scale;
      const lift = this.touch && portrait ? vh * 0.12 : 0;
      let cx = this.cam.x, cy = this.cam.y + lift;
      cx = vw >= L.W ? L.W / 2 : Math.max(vw / 2, Math.min(L.W - vw / 2, cx));
      cy = Math.min(L.H - vh / 2 + 10 + lift * 1.6, cy);
      if (this.shake) { cx += (Math.random() - .5) * this.shake; cy += (Math.random() - .5) * this.shake; }
      this.view = { x1: cx - vw / 2, x2: cx + vw / 2, y1: cy - vh / 2, y2: cy + vh / 2 };
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      this.drawBackground(cy, time);
      ctx.setTransform(scale, 0, 0, scale, W / 2 - cx * scale, H / 2 - cy * scale);
      this.drawSkyGlow(time);
      this.drawTiles(time);
      this.drawProps(time);
      this.drawKessie(time);
      this.drawPump(time);
      this.drawWater(time);
      this.drawParticles();
      this.drawTexts();
      this.drawWindHint(time);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      if (this.flash) { ctx.fillStyle = `rgba(79,214,200,${this.flash * 0.35})`; ctx.fillRect(0, 0, W, H); }
      if (this.waste(cy)) this.drawCRT(time);
      if (this.morphT > 0) this.drawMorph(time);
      const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.45, W / 2, H / 2, H * 0.95);
      vg.addColorStop(0, 'rgba(5,12,18,0)'); vg.addColorStop(1, 'rgba(5,12,18,0.55)');
      ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
    }

    drawBackground(cy, time) {
      const ctx = this.ctx, W = this.W, H = this.H, Z = this.L.zones, T = this.T;
      const r = cy / T, i = this.zoneOfRow(Math.floor(r));
      const z = Z[i];
      const f = i < Z.length - 1 ? Math.max(0, Math.min(1, (z.top + 6 - r) / 8)) : 0;
      const paint = (idx, a) => {
        const img = this.A[Z[idx].bg];
        if (!img || !img.width || a <= 0) return;
        const sc = Math.max(W / img.width, H / img.height) * 1.18;
        const zz = Z[idx], prog = Math.max(-0.3, Math.min(1.3, (zz.bottom - r) / (zz.bottom - zz.top)));
        const py = (prog - 0.5) * H * 0.12;
        const px = -((this.cam.x - this.L.W / 2) * 0.05) * (W / 1600);
        ctx.globalAlpha = a;
        ctx.drawImage(img, (W - img.width * sc) / 2 + px, (H - img.height * sc) / 2 + py, img.width * sc, img.height * sc);
      };
      ctx.fillStyle = '#0f1a24'; ctx.fillRect(0, 0, W, H);
      paint(i, 1);
      if (f > 0) paint(i + 1, f);
      ctx.globalAlpha = 1;
      const az = Z[i].aurora ? 1 : (Z[i + 1] && Z[i + 1].aurora ? f : 0);
      if (az > 0) this.drawAurora(time, az);
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, 'rgba(10,16,26,0.05)'); g.addColorStop(1, 'rgba(10,16,26,0.4)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    }
    drawAurora(time, a) {
      const ctx = this.ctx, W = this.W, H = this.H;
      ctx.save(); ctx.globalCompositeOperation = 'screen';
      for (let b = 0; b < 3; b++) {
        ctx.beginPath();
        for (let x = 0; x <= W; x += W / 40) { const y = H * (0.16 + b * 0.07) + Math.sin(x / W * 6 + time * (0.4 + b * 0.15) + b) * H * 0.05; x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
        const gr = ctx.createLinearGradient(0, H * 0.05, 0, H * 0.45);
        gr.addColorStop(0, 'rgba(79,214,200,0)'); gr.addColorStop(0.5, `rgba(${b === 1 ? '120,240,170' : '79,214,200'},${0.16 * a})`); gr.addColorStop(1, 'rgba(79,214,200,0)');
        ctx.strokeStyle = gr; ctx.lineWidth = H * 0.12; ctx.stroke();
      }
      ctx.restore();
    }
    drawSkyGlow(time) {
      // warm haze near the summit
      const ctx = this.ctx, v = this.view;
      if (v.y1 > 30 * this.T) return;
      for (let i = 0; i < 8; i++) {
        const y = 200 + i * 110, x = ((i * 397 + time * (10 + i % 3 * 6)) % 1800) - 260;
        const gr = ctx.createRadialGradient(x, y, 0, x, y, 220);
        gr.addColorStop(0, 'rgba(255,225,200,0.10)'); gr.addColorStop(1, 'rgba(255,225,200,0)');
        ctx.fillStyle = gr; ctx.fillRect(x - 220, y - 220, 440, 440);
      }
    }

    drawTiles(time) {
      const ctx = this.ctx, g = this.g, L = this.L, T = this.T, v = this.view;
      const c1 = Math.floor(v.x1 / T) - 1, c2 = Math.ceil(v.x2 / T) + 1, r1 = Math.max(-4, Math.floor(v.y1 / T) - 1), r2 = Math.min(L.rows.length, Math.ceil(v.y2 / T) + 1);
      const solidR = (c, r) => r < 0 ? false : g.ch(c, r) === '#';
      for (let r = r1; r < r2; r++) {
        if (r < 0) continue;
        const zi = this.zoneOfRow(r), tex = L.zones[zi].tex;
        ctx.fillStyle = this.pat[tex] || '#4a4f55';
        let run = null;
        for (let c = c1; c <= c2 + 1; c++) {
          const s = c <= c2 && solidR(c, r);
          if (s && run === null) run = c;
          if (!s && run !== null) { ctx.fillRect(run * T, r * T, (c - run) * T + 0.5, T + 0.5); run = null; }
        }
        // depth shading + rims
        for (let c = c1; c <= c2; c++) {
          if (!solidR(c, r)) continue;
          const up = solidR(c, r - 1) || r === 0 && false, dn = r + 1 >= L.rows.length || solidR(c, r + 1), lf = solidR(c - 1, r), rt = solidR(c + 1, r);
          const x = c * T, y = r * T;
          if (up && dn && lf && rt) {
            const deep = solidR(c, r - 2) && solidR(c - 2, r) && solidR(c + 2, r) ? 0.42 : 0.24;
            ctx.fillStyle = `rgba(8,14,20,${deep})`; ctx.fillRect(x, y, T + 0.5, T + 0.5);
            continue;
          }
          ctx.fillStyle = 'rgba(8,14,20,0.12)'; ctx.fillRect(x, y + 6, T, T - 6);
          if (!dn) { ctx.fillStyle = 'rgba(5,10,16,0.45)'; ctx.fillRect(x, y + T - 6, T, 6); }
          if (!lf) { ctx.fillStyle = 'rgba(5,10,16,0.3)'; ctx.fillRect(x, y, 4, T); }
          if (!rt) { ctx.fillStyle = 'rgba(5,10,16,0.3)'; ctx.fillRect(x + T - 4, y, 4, T); }
          if (!up) {
            ctx.fillStyle = RIM[L.zones[this.zoneOfRow(r)].tex]; ctx.fillRect(x, y, T + 0.5, 3);
            const zn = L.zones[this.zoneOfRow(r)], cols = TUFT[zn.tex];
            if (zn.snow) {
              ctx.fillStyle = '#f4f8fb'; ctx.beginPath(); ctx.moveTo(x, y + 2);
              for (let k = 0; k <= 4; k++) ctx.lineTo(x + k * 8, y - 3 - hash(c * 5 + k, r) * 3);
              ctx.lineTo(x + T, y + 2); for (let k = 4; k >= 0; k--) ctx.lineTo(x + k * 8, y + 4 + (k % 2) * 3 + hash(c, r + k) * 4); ctx.fill();
              ctx.fillStyle = 'rgba(180,215,230,0.6)'; ctx.fillRect(x, y + 3, T, 1.5);
              continue;
            }
            for (let k = 0; k < 3; k++) {
              const hx = x + 4 + hash(c * 3 + k, r) * (T - 8), hh = 4 + hash(c, r * 7 + k) * 7;
              const sway = Math.sin(time * 2 + hx * 0.05) * 1.5;
              ctx.strokeStyle = cols[k % 2]; ctx.lineWidth = 2; ctx.lineCap = 'round';
              ctx.beginPath(); ctx.moveTo(hx, y + 1); ctx.quadraticCurveTo(hx + sway, y - hh / 2, hx + sway * 2, y - hh); ctx.stroke();
            }
          }
        }
      }
    }

    drawProps(time) {
      const ctx = this.ctx, g = this.g, L = this.L, T = this.T, v = this.view;
      const c1 = Math.max(0, Math.floor(v.x1 / T) - 1), c2 = Math.min(L.cols - 1, Math.ceil(v.x2 / T) + 1), r1 = Math.max(0, Math.floor(v.y1 / T) - 1), r2 = Math.min(L.rows.length - 1, Math.ceil(v.y2 / T) + 1);
      for (let r = r1; r <= r2; r++) for (let c = c1; c <= c2; c++) {
        const k = L.rows[r][c], x = c * T, y = r * T, key = r * L.cols + c;
        const zn = L.zones[this.zoneOfRow(r)];
        if (zn.waste && '=H*xFT'.includes(k)) {
          if (k === '=') this.girder(x, y, c, r);
          else if (k === 'H') this.scaffold(x, y, c, r, time);
          else if (k === '*') { if (!g.shells[key]) this.cap(x + T / 2, y + T / 2 + Math.sin(time * 2.5 + c) * 3, time); }
          else if (k === 'x') this.roach(x + T / 2, y + T - 8, time, c);
          else if (k === 'F') this.terminal(x + T / 2, y + T, g.cp.x === x + T / 2 && g.cp.y === y + T, time);
          else this.vault(x + T / 2, y + T, time);
          continue;
        }
        if (k === '=') this.plank(x, y, c, r, zn.tex === 'canyon');
        else if (k === '~') this.crumbleTile(x, y, g.crumbles[key], time);
        else if (k === 'o') this.spring(x, y, time - (g.springT[key] ?? -9));
        else if (k === 'H') this.grassi ? this.jug(x, y, c, r) : this.ivy(x, y, c, r, time, zn.tex === 'canyon');
        else if (k === '*' && !g.shells[key]) (this.jade ? this.gem : this.grassi ? this.fossil : zn.coast ? this.shell : this.mapleLeaf).call(this, x + T / 2, y + T / 2 + Math.sin(time * 2.5 + c) * 3, time);
        else if (k === 'x') (zn.coast ? this.urchin : this.porcupine).call(this, x + T / 2, y + T - 12, time);
        else if (k === 'F') (this.grassi ? this.bolt : this.flag).call(this, x + T / 2, y + T, g.cp.x === x + T / 2 && g.cp.y === y + T, time);
        else if (k === 'T') (this.grassi ? this.anchor : this.summit).call(this, x + T / 2, y + T, time);
      }
    }
    plank(x, y, c, r, catwalk) {
      const ctx = this.ctx, T = this.T, L = this.L;
      if (catwalk) {
        ctx.fillStyle = '#7a5a3a'; ctx.fillRect(x, y, T + 0.5, 7); ctx.fillStyle = '#a07a50'; ctx.fillRect(x, y, T + 0.5, 2);
        ctx.strokeStyle = 'rgba(30,20,12,0.6)'; ctx.lineWidth = 1; for (let k = 8; k < T; k += 8) { ctx.beginPath(); ctx.moveTo(x + k, y); ctx.lineTo(x + k, y + 7); ctx.stroke(); }
        ctx.strokeStyle = '#6a7378'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, y + 7); ctx.lineTo(x + T / 2, y + 18); ctx.lineTo(x + T, y + 7); ctx.stroke();
        ctx.strokeStyle = 'rgba(160,122,80,0.75)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, y - 16); ctx.lineTo(x + T, y - 16); ctx.moveTo(x + 2, y - 16); ctx.lineTo(x + 2, y); ctx.stroke();
        return;
      }
      ctx.fillStyle = '#6b4a2e'; ctx.fillRect(x, y, T + 0.5, 9);
      ctx.fillStyle = '#8c6440'; ctx.fillRect(x, y, T + 0.5, 3);
      ctx.fillStyle = 'rgba(30,18,10,0.5)'; ctx.fillRect(x, y + 8, T, 2);
      if (hash(c, r) < 0.35) { ctx.fillStyle = 'rgba(30,18,10,0.6)'; ctx.fillRect(x + 6 + hash(r, c) * 18, y + 4, 6, 1.5); }
      const lft = L.rows[r][c - 1] !== '=', rgt = L.rows[r][c + 1] !== '=';
      ctx.strokeStyle = '#d8c79a'; ctx.lineWidth = 2;
      if (lft) { ctx.beginPath(); ctx.moveTo(x + 4, y - 1); ctx.lineTo(x + 4, y + 10); ctx.stroke(); }
      if (rgt) { ctx.beginPath(); ctx.moveTo(x + T - 4, y - 1); ctx.lineTo(x + T - 4, y + 10); ctx.stroke(); }
    }
    crumbleTile(x, y, st, time) {
      const ctx = this.ctx, T = this.T;
      if (st && st.broken) {
        const back = st.t - G.GRIP.K.CRUMBLE - G.GRIP.K.REGROW + 0.6;
        if (back > 0) { ctx.globalAlpha = Math.min(0.5, back); ctx.strokeStyle = '#e8c27a'; ctx.setLineDash([4, 4]); ctx.strokeRect(x + 2, y + 2, T - 4, T - 4); ctx.setLineDash([]); ctx.globalAlpha = 1; }
        return;
      }
      const sh = st ? Math.sin(time * 70) * 2 * Math.min(1, st.t * 3) : 0;
      ctx.save(); ctx.translate(sh, st ? st.t * 3 : 0);
      ctx.fillStyle = this.pat.sandstone || '#c9a25a'; ctx.fillRect(x + 1, y + 1, T - 2, T - 2);
      ctx.fillStyle = st ? 'rgba(242,178,76,0.35)' : 'rgba(242,178,76,0.18)'; ctx.fillRect(x + 1, y + 1, T - 2, T - 2);
      ctx.strokeStyle = 'rgba(60,35,15,0.75)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(x + 6, y + 2); ctx.lineTo(x + 13, y + 14); ctx.lineTo(x + 9, y + 24); ctx.moveTo(x + 13, y + 14); ctx.lineTo(x + 24, y + 18); ctx.lineTo(x + 28, y + 30); ctx.stroke();
      ctx.strokeStyle = '#f2b24c'; ctx.setLineDash([5, 4]); ctx.lineWidth = 2; ctx.strokeRect(x + 1.5, y + 1.5, T - 3, T - 3); ctx.setLineDash([]);
      ctx.restore();
    }
    spring(x, y, since, ) {
      const ctx = this.ctx, T = this.T;
      const comp = since < 0.25 ? Math.sin(since / 0.25 * Math.PI) : 0;
      const base = y + T, top = base - 14 - comp * 10 + (since < 0.06 ? 6 : 0);
      ctx.strokeStyle = '#9fb8b8'; ctx.lineWidth = 3;
      ctx.beginPath();
      for (let i = 0; i <= 6; i++) { const yy = base - 2 - (base - 2 - top) * i / 6; ctx.lineTo(x + T / 2 + (i % 2 ? 9 : -9), yy); }
      ctx.stroke();
      ctx.fillStyle = '#2f9c97'; ctx.fillRect(x + 3, base - 4, T - 6, 4);
      // clam-shell pad
      ctx.fillStyle = '#f2b24c'; ctx.beginPath(); ctx.ellipse(x + T / 2, top, 15, 6, 0, Math.PI, 0); ctx.fill();
      ctx.fillStyle = '#ffd98a'; ctx.fillRect(x + 1, top, T - 2, 3);
      const glow = 0.25 + 0.15 * Math.sin(Date.now() / 300);
      ctx.fillStyle = `rgba(242,178,76,${glow})`; ctx.beginPath(); ctx.arc(x + T / 2, top - 6, 10, 0, 7); ctx.fill();
    }
    ivy(x, y, c, r, time, rope) {
      const ctx = this.ctx, T = this.T, cx = x + T / 2;
      if (rope) {
        ctx.strokeStyle = '#a07a50'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(cx - 9, y); ctx.lineTo(cx - 9, y + T); ctx.moveTo(cx + 9, y); ctx.lineTo(cx + 9, y + T); ctx.stroke();
        ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx - 9, y + 8); ctx.lineTo(cx + 9, y + 8); ctx.moveTo(cx - 9, y + 24); ctx.lineTo(cx + 9, y + 24); ctx.stroke();
        return;
      }
      ctx.strokeStyle = '#2e6a4a'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(cx + Math.sin(r * 1.7) * 5, y); ctx.bezierCurveTo(cx - 8, y + 10, cx + 8, y + 20, cx + Math.sin((r + 1) * 1.7) * 5, y + T); ctx.stroke();
      for (let k = 0; k < 3; k++) {
        const ly = y + 5 + k * 10, side = (k + r) % 2 ? 1 : -1, sw = Math.sin(time * 2 + r + k) * 0.2;
        ctx.save(); ctx.translate(cx, ly); ctx.rotate(side * 0.9 + sw);
        ctx.fillStyle = k % 2 ? '#5fb08a' : '#3f8f6f';
        ctx.beginPath(); ctx.ellipse(side * 6, 0, 6, 3.2, 0, 0, 7); ctx.fill(); ctx.restore();
      }
    }
    shell(x, y, time) {
      const ctx = this.ctx;
      const gl = ctx.createRadialGradient(x, y, 0, x, y, 20);
      gl.addColorStop(0, 'rgba(255,240,200,0.45)'); gl.addColorStop(1, 'rgba(255,240,200,0)');
      ctx.fillStyle = gl; ctx.fillRect(x - 20, y - 20, 40, 40);
      ctx.save(); ctx.translate(x, y); ctx.rotate(Math.sin(time * 1.7 + x) * 0.15);
      ctx.fillStyle = '#ffd9b8'; ctx.beginPath(); ctx.moveTo(0, 8);
      for (let i = 0; i <= 8; i++) { const a = Math.PI + i / 8 * Math.PI; ctx.lineTo(Math.cos(a) * 11, Math.sin(a) * 10 + 1); }
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#e9a03b'; ctx.lineWidth = 1.2;
      for (let i = 1; i < 8; i++) { const a = Math.PI + i / 8 * Math.PI; ctx.beginPath(); ctx.moveTo(0, 8); ctx.lineTo(Math.cos(a) * 10, Math.sin(a) * 9 + 1); ctx.stroke(); }
      ctx.fillStyle = '#f2b24c'; ctx.fillRect(-4, 6, 8, 4);
      const tw = (Math.sin(time * 5 + x) + 1) / 2;
      ctx.fillStyle = `rgba(255,255,255,${tw})`; ctx.fillRect(-6, -7, 2, 2);
      ctx.restore();
    }
    mapleLeaf(x, y, time) {
      const ctx = this.ctx;
      const gl = ctx.createRadialGradient(x, y, 0, x, y, 22);
      gl.addColorStop(0, 'rgba(242,160,59,0.45)'); gl.addColorStop(1, 'rgba(242,160,59,0)');
      ctx.fillStyle = gl; ctx.fillRect(x - 22, y - 22, 44, 44);
      ctx.save(); ctx.translate(x, y); ctx.rotate(Math.sin(time * 1.7 + x) * 0.2); ctx.scale(Math.cos(time * 1.3 + x) * 0.25 + 0.95, 1);
      this.leafPath(11); ctx.fillStyle = LEAF; ctx.fill(); ctx.strokeStyle = LEAF_L; ctx.lineWidth = 1.2; ctx.stroke();
      ctx.strokeStyle = '#8a3418'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(0, 5); ctx.lineTo(0, 13); ctx.stroke();
      const tw = (Math.sin(time * 5 + x) + 1) / 2; ctx.fillStyle = `rgba(255,240,200,${tw})`; ctx.fillRect(-5, -6, 2, 2);
      ctx.restore();
    }
    leafPath(s) {
      // stylised 11-point maple leaf, unit size s
      const P = [[0, -1], [.18, -.62], [.42, -.74], [.36, -.32], [.82, -.46], [.7, -.2], [.92, 0], [.5, .12], [.56, .34], [.12, .3], [.06, .5], [-.06, .5], [-.12, .3], [-.56, .34], [-.5, .12], [-.92, 0], [-.7, -.2], [-.82, -.46], [-.36, -.32], [-.42, -.74], [-.18, -.62]];
      const ctx = this.ctx; ctx.beginPath(); P.forEach(([a, b], i) => i ? ctx.lineTo(a * s, b * s) : ctx.moveTo(a * s, b * s)); ctx.closePath();
    }
    porcupine(x, y, time) {
      const ctx = this.ctx, b = Math.sin(time * 4) * 0.6;
      ctx.strokeStyle = '#c9b48a'; ctx.lineWidth = 1.6;
      for (let i = 0; i < 15; i++) { const a = Math.PI + 0.15 + i / 14 * (Math.PI - 0.3), l = 15 + (i % 2) * 4 + b; ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * 7, y + 6 + Math.sin(a) * 7); ctx.lineTo(x + Math.cos(a) * l, y + 6 + Math.sin(a) * l * 0.9); ctx.stroke(); }
      ctx.fillStyle = '#4a3a2c'; ctx.beginPath(); ctx.ellipse(x, y + 6, 13, 8, 0, Math.PI, 0); ctx.fill(); ctx.fillRect(x - 13, y + 5, 26, 6);
      ctx.fillStyle = '#6a5440'; ctx.beginPath(); ctx.ellipse(x + 13, y + 7, 5, 4, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(x + 15, y + 6, 1.2, 0, 7); ctx.fill(); ctx.beginPath(); ctx.arc(x + 18, y + 8, 1, 0, 7); ctx.fill();
    }
    urchin(x, y, time) {
      const ctx = this.ctx;
      ctx.strokeStyle = '#6a3d7a'; ctx.lineWidth = 2;
      for (let i = 0; i < 16; i++) { const a = i / 16 * 6.28 + Math.sin(time * 3) * 0.05, l = 12 + (i % 2) * 4; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l * 0.85); ctx.stroke(); }
      ctx.fillStyle = '#3a1f4a'; ctx.beginPath(); ctx.arc(x, y, 8, 0, 7); ctx.fill();
      ctx.fillStyle = '#b07ac0'; ctx.beginPath(); ctx.arc(x - 2, y - 3, 2, 0, 7); ctx.fill();
    }
    canada(x, y, w, h, time, dim) {
      // waving Canadian flag, top-left at (x, y)
      const ctx = this.ctx, wv = i => Math.sin(time * 5 + i * 0.9) * h * 0.12, N = 8;
      const band = (i0, i1, col) => {
        ctx.fillStyle = col; ctx.beginPath();
        for (let i = i0; i <= i1; i++) ctx.lineTo(x + w * i / N, y + wv(i));
        for (let i = i1; i >= i0; i--) ctx.lineTo(x + w * i / N, y + h + wv(i));
        ctx.closePath(); ctx.fill();
      };
      ctx.globalAlpha = dim ? 0.7 : 1;
      band(0, 2, '#d52b1e'); band(2, 6, '#f6f1e7'); band(6, 8, '#d52b1e');
      ctx.save(); ctx.translate(x + w / 2, y + h / 2 + wv(4)); this.leafPath(h * 0.36); ctx.fillStyle = '#d52b1e'; ctx.fill(); ctx.restore();
      ctx.globalAlpha = 1;
    }
    flag(x, y, on, time) {
      const ctx = this.ctx;
      ctx.strokeStyle = '#d8c79a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - 54); ctx.stroke();
      ctx.fillStyle = '#f2b24c'; ctx.beginPath(); ctx.arc(x, y - 55, 2.5, 0, 7); ctx.fill();
      this.canada(x + 1, y - 53, 34, 17, time, !on);
      if (on) { const gl = ctx.createRadialGradient(x, y - 30, 0, x, y - 30, 50); gl.addColorStop(0, 'rgba(242,178,76,0.3)'); gl.addColorStop(1, 'rgba(242,178,76,0)'); ctx.fillStyle = gl; ctx.fillRect(x - 50, y - 80, 100, 100); }
    }
    summit(x, y, time) {
      const ctx = this.ctx;
      const gl = ctx.createRadialGradient(x, y - 50, 0, x, y - 50, 140);
      gl.addColorStop(0, `rgba(255,217,138,${0.35 + Math.sin(time * 2) * 0.1})`); gl.addColorStop(1, 'rgba(255,217,138,0)');
      ctx.fillStyle = gl; ctx.fillRect(x - 140, y - 190, 280, 280);
      for (let i = 0; i < 6; i++) { const a = time * 0.4 + i; ctx.strokeStyle = 'rgba(255,217,138,0.18)'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(x, y - 50); ctx.lineTo(x + Math.cos(a) * 160, y - 50 + Math.sin(a) * 160); ctx.stroke(); }
      ctx.strokeStyle = '#fbe7a6'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - 90); ctx.stroke();
      this.canada(x + 1, y - 90, 60, 30, time, false);
    }
    // ---------- Grassi Lakes props: jugs, glue-in bolts, chain anchor, fossils ----------
    jug(x, y, c, r) {
      const ctx = this.ctx, T = this.T, L = this.L;
      const up = L.rows[r - 1] && L.rows[r - 1][c] === 'H', dn = L.rows[r + 1] && L.rows[r + 1][c] === 'H';
      ctx.fillStyle = this.pat.reef || '#b9a98a';
      ctx.beginPath(); ctx.roundRect(x + 1, y + (up ? 0 : 3), T - 2, T - (up ? 0 : 3) - (dn ? 0 : 3), up || dn ? 4 : 10); ctx.fill();
      ctx.fillStyle = 'rgba(30,24,18,0.22)'; ctx.fillRect(x + 1, y, 3, T);
      const ox = (hash(c, r) - 0.5) * 10, oy = ((c + r) % 2) * 9;
      const gx = x + T / 2 + ox, gy = y + 9 + oy;
      ctx.fillStyle = 'rgba(245,242,232,0.55)'; ctx.beginPath(); ctx.ellipse(gx, gy - 1, 11, 6, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#1c140e'; ctx.beginPath(); ctx.ellipse(gx, gy + 1, 9, 4.5, 0, 0, 7); ctx.fill();
      ctx.fillStyle = 'rgba(255,250,235,0.7)'; ctx.fillRect(gx - 8, gy - 4, 16, 1.5);
    }
    bolt(x, y, on, time) {
      const ctx = this.ctx, hx = x + 9, hy = y - 46;
      if (on) { const gl = ctx.createRadialGradient(hx, hy + 14, 0, hx, hy + 14, 48); gl.addColorStop(0, 'rgba(79,214,200,0.35)'); gl.addColorStop(1, 'rgba(79,214,200,0)'); ctx.fillStyle = gl; ctx.fillRect(hx - 48, hy - 34, 96, 96); }
      ctx.fillStyle = this.pat.reef || '#b9a98a'; ctx.beginPath(); ctx.roundRect(hx - 13, hy - 16, 26, 30, 9); ctx.fill();
      ctx.fillStyle = 'rgba(8,14,20,0.25)'; ctx.beginPath(); ctx.roundRect(hx - 13, hy + 6, 26, 8, [0, 0, 9, 9]); ctx.fill();
      ctx.strokeStyle = '#cfd6d8'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(hx, hy, 5, 0.2, Math.PI * 2 - 0.2); ctx.stroke();
      ctx.fillStyle = '#7d878a'; ctx.beginPath(); ctx.arc(hx, hy - 6, 3, 0, 7); ctx.fill();
      const sw = Math.sin(time * 2 + x) * 0.08;
      ctx.save(); ctx.translate(hx, hy + 5); ctx.rotate(sw);
      ctx.strokeStyle = '#b8c2c6'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(0, 6, 3.5, 6, 0, 0, 7); ctx.stroke();
      ctx.fillStyle = on ? '#2f9c97' : '#5f7d7b'; ctx.fillRect(-2.5, 11, 5, 13);
      ctx.strokeStyle = on ? '#ffd98a' : '#b8c2c6'; ctx.beginPath(); ctx.ellipse(0, 29, 4, 6.5, 0, 0, 7); ctx.stroke();
      ctx.restore();
      if (on) {
        ctx.strokeStyle = '#f2b24c'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(hx, hy + 34);
        ctx.bezierCurveTo(hx - 10, hy + 48, hx - 4, hy + 60, hx - 14, y + 2); ctx.stroke();
        ctx.strokeStyle = 'rgba(36,50,74,0.7)'; ctx.lineWidth = 1; ctx.setLineDash([2, 3]); ctx.stroke(); ctx.setLineDash([]);
      }
    }
    anchor(x, y, time) {
      const ctx = this.ctx, ay = y - 70;
      const gl = ctx.createRadialGradient(x, ay, 0, x, ay, 150);
      gl.addColorStop(0, `rgba(255,217,138,${0.35 + Math.sin(time * 2) * 0.1})`); gl.addColorStop(1, 'rgba(255,217,138,0)');
      ctx.fillStyle = gl; ctx.fillRect(x - 150, ay - 150, 300, 300);
      for (let i = 0; i < 6; i++) { const a = time * 0.4 + i; ctx.strokeStyle = 'rgba(255,217,138,0.16)'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(x, ay); ctx.lineTo(x + Math.cos(a) * 170, ay + Math.sin(a) * 170); ctx.stroke(); }
      const ring = { x, y: ay + 34 + Math.sin(time * 1.5) * 1.5 };
      ctx.fillStyle = this.pat.reef || '#b9a98a'; ctx.beginPath(); ctx.roundRect(x - 46, ay - 44, 92, 62, 18); ctx.fill();
      ctx.fillStyle = 'rgba(8,14,20,0.28)'; ctx.beginPath(); ctx.roundRect(x - 46, ay + 6, 92, 12, [0, 0, 18, 18]); ctx.fill();
      for (const bx of [x - 22, x + 22]) {
        ctx.fillStyle = '#7d878a'; ctx.beginPath(); ctx.arc(bx, ay - 10, 5, 0, 7); ctx.fill();
        ctx.strokeStyle = '#e4e9ea'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(bx, ay - 3, 6, 0, 7); ctx.stroke();
        ctx.strokeStyle = '#c9d1d4'; ctx.lineWidth = 2;
        for (let k = 0; k < 5; k++) { const t = (k + 0.5) / 5, lx = bx + (ring.x - bx) * t, ly = ay + 3 + (ring.y - ay - 3) * t; ctx.beginPath(); ctx.ellipse(lx, ly, k % 2 ? 2 : 3.5, k % 2 ? 3.5 : 2, Math.atan2(ring.y - ay, ring.x - bx), 0, 7); ctx.stroke(); }
      }
      ctx.strokeStyle = '#ffd98a'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(ring.x, ring.y + 6, 8, 0, 7); ctx.stroke();
      ctx.fillStyle = 'rgba(8,22,30,0.55)'; ctx.font = 'bold 11px Trebuchet MS'; ctx.textAlign = 'center'; ctx.fillText((this.L.name + ' \u00b7 ' + this.L.grade).toUpperCase(), x + 1, ay - 25);
      ctx.fillStyle = '#fbe7a6'; ctx.fillText((this.L.name + ' \u00b7 ' + this.L.grade).toUpperCase(), x, ay - 26);
    }
    fossil(x, y, time) {
      const ctx = this.ctx;
      const gl = ctx.createRadialGradient(x, y, 0, x, y, 22);
      gl.addColorStop(0, 'rgba(120,240,220,0.45)'); gl.addColorStop(1, 'rgba(120,240,220,0)');
      ctx.fillStyle = gl; ctx.fillRect(x - 22, y - 22, 44, 44);
      ctx.save(); ctx.translate(x, y); ctx.rotate(time * 0.6 + x);
      ctx.fillStyle = '#e9dcc0'; ctx.beginPath(); ctx.arc(0, 0, 11, 0, 7); ctx.fill();
      ctx.strokeStyle = '#a3865a'; ctx.lineWidth = 1.6; ctx.beginPath();
      for (let i = 0; i <= 60; i++) { const a = i / 60 * Math.PI * 5, rr = 1 + i / 60 * 9.5; i ? ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); }
      ctx.stroke();
      ctx.strokeStyle = 'rgba(163,134,90,0.7)'; ctx.lineWidth = 1;
      for (let i = 0; i < 14; i++) { const a = i / 14 * 6.28; ctx.beginPath(); ctx.moveTo(Math.cos(a) * 7, Math.sin(a) * 7); ctx.lineTo(Math.cos(a) * 10.5, Math.sin(a) * 10.5); ctx.stroke(); }
      ctx.restore();
      const tw = (Math.sin(time * 5 + x) + 1) / 2; ctx.fillStyle = `rgba(255,255,255,${tw})`; ctx.fillRect(x - 6, y - 8, 2, 2);
    }
    // ---------- Jade's route: jade gems, then the retro-atomic wasteland ----------
    gem(x, y, time) {
      const ctx = this.ctx, s = 1 + Math.sin(time * 3 + x) * 0.06;
      const gl = ctx.createRadialGradient(x, y, 0, x, y, 24); gl.addColorStop(0, 'rgba(90,230,150,0.5)'); gl.addColorStop(1, 'rgba(90,230,150,0)');
      ctx.fillStyle = gl; ctx.fillRect(x - 24, y - 24, 48, 48);
      ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
      ctx.fillStyle = '#1f9d63'; ctx.beginPath(); ctx.moveTo(0, -12); ctx.lineTo(10, -4); ctx.lineTo(6, 11); ctx.lineTo(-6, 11); ctx.lineTo(-10, -4); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#5fe0a0'; ctx.beginPath(); ctx.moveTo(0, -12); ctx.lineTo(10, -4); ctx.lineTo(0, 0); ctx.lineTo(-10, -4); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#137046'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(6, 11); ctx.lineTo(-6, 11); ctx.closePath(); ctx.fill();
      ctx.restore();
      const tw = (Math.sin(time * 5 + x) + 1) / 2; ctx.fillStyle = `rgba(255,255,255,${tw})`; ctx.fillRect(x - 4, y - 8, 2, 2);
    }
    girder(x, y, c, r) {
      const ctx = this.ctx, T = this.T;
      ctx.fillStyle = '#5a3a26'; ctx.fillRect(x, y, T + 0.5, 9);
      ctx.fillStyle = '#8a5a34'; ctx.fillRect(x, y, T + 0.5, 2.5); ctx.fillRect(x, y + 7, T + 0.5, 2);
      ctx.fillStyle = 'rgba(30,18,10,0.6)'; ctx.fillRect(x + 5, y + 3, T - 10, 3);
      ctx.fillStyle = '#c08a52'; for (const rx of [x + 4, x + T - 5]) { ctx.beginPath(); ctx.arc(rx, y + 4.5, 1.6, 0, 7); ctx.fill(); }
      if (hash(c, r) < 0.3) { ctx.fillStyle = 'rgba(157,255,138,0.25)'; ctx.fillRect(x + hash(r, c) * 20, y + 9, 3, 6 + hash(c, r * 3) * 8); }
    }
    scaffold(x, y, c, r, time) {
      const ctx = this.ctx, T = this.T, L = this.L, lft = L.rows[r][c - 1] !== 'H';
      ctx.strokeStyle = '#7a5134'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(x + (lft ? 5 : T - 5), y); ctx.lineTo(x + (lft ? 5 : T - 5), y + T); ctx.stroke();
      ctx.strokeStyle = '#a8784a'; ctx.lineWidth = 3;
      for (const yy of [y + 8, y + 24]) { ctx.beginPath(); ctx.moveTo(x, yy); ctx.lineTo(x + T, yy); ctx.stroke(); }
      const pulse = 0.12 + 0.1 * Math.sin(time * 3 + r * 0.7);
      ctx.fillStyle = `rgba(157,255,138,${pulse})`; ctx.fillRect(x, y, T, T);
    }
    cap(x, y, time) {
      const ctx = this.ctx;
      const gl = ctx.createRadialGradient(x, y, 0, x, y, 22); gl.addColorStop(0, 'rgba(255,217,138,0.4)'); gl.addColorStop(1, 'rgba(255,217,138,0)');
      ctx.fillStyle = gl; ctx.fillRect(x - 22, y - 22, 44, 44);
      ctx.save(); ctx.translate(x, y); ctx.scale(Math.cos(time * 2.2 + x), 1);
      ctx.fillStyle = '#b9c4c8'; ctx.beginPath();
      for (let i = 0; i < 24; i++) { const a = i / 24 * 6.283, rr = i % 2 ? 9 : 11; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#2f5fa8'; ctx.beginPath(); ctx.arc(0, 0, 7.5, 0, 7); ctx.fill();
      ctx.fillStyle = SUIT_Y; ctx.beginPath();
      for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i / 10 * 6.283, rr = i % 2 ? 2.4 : 5.5; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
      ctx.closePath(); ctx.fill();
      ctx.restore();
    }
    roach(x, y, time, c) {
      const ctx = this.ctx, w = Math.sin(time * 18 + c), f = Math.sin(time * 0.8 + c) > 0 ? 1 : -1, bx = x + Math.sin(time * 0.8 + c) * 6;
      const gl = ctx.createRadialGradient(bx, y, 0, bx, y, 30); gl.addColorStop(0, 'rgba(157,255,138,0.35)'); gl.addColorStop(1, 'rgba(157,255,138,0)');
      ctx.fillStyle = gl; ctx.fillRect(bx - 30, y - 30, 60, 60);
      ctx.save(); ctx.translate(bx, y); ctx.scale(f, 1);
      ctx.strokeStyle = '#3a2414'; ctx.lineWidth = 1.6;
      for (let i = -1; i <= 1; i++) { const k = (i % 2 ? w : -w) * 3; ctx.beginPath(); ctx.moveTo(i * 5, 2); ctx.lineTo(i * 6 + k, 8); ctx.moveTo(i * 5, 2); ctx.lineTo(i * 6 - k, -6 + 14); ctx.stroke(); }
      ctx.fillStyle = '#6b3f1e'; ctx.beginPath(); ctx.ellipse(0, 0, 13, 7, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#8e5a2c'; ctx.beginPath(); ctx.ellipse(-2, -2, 9, 4, 0, 0, 7); ctx.fill();
      ctx.strokeStyle = 'rgba(30,18,10,0.7)'; ctx.beginPath(); ctx.moveTo(-1, -6); ctx.lineTo(-1, 6); ctx.stroke();
      ctx.fillStyle = '#4a2a14'; ctx.beginPath(); ctx.arc(12, 1, 4, 0, 7); ctx.fill();
      ctx.fillStyle = '#9dff8a'; ctx.beginPath(); ctx.arc(14, 0, 1.4, 0, 7); ctx.fill();
      ctx.strokeStyle = '#3a2414'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(15, -1); ctx.quadraticCurveTo(24, -12 + w * 2, 28, -6); ctx.moveTo(15, -2); ctx.quadraticCurveTo(20, -16, 26, -14 - w * 2); ctx.stroke();
      ctx.restore();
    }
    terminal(x, y, on, time) {
      const ctx = this.ctx, tx = x - 16, ty = y - 50;
      if (on) { const gl = ctx.createRadialGradient(x, ty + 14, 0, x, ty + 14, 60); gl.addColorStop(0, 'rgba(157,255,138,0.35)'); gl.addColorStop(1, 'rgba(157,255,138,0)'); ctx.fillStyle = gl; ctx.fillRect(x - 60, ty - 46, 120, 120); }
      ctx.fillStyle = '#4a4f46'; ctx.fillRect(x - 3, ty + 30, 6, 20); ctx.fillRect(x - 10, y - 3, 20, 3);
      ctx.fillStyle = '#7d8270'; ctx.beginPath(); ctx.roundRect(tx, ty, 32, 32, 5); ctx.fill();
      ctx.fillStyle = '#5c604f'; ctx.fillRect(tx, ty + 26, 32, 6);
      ctx.fillStyle = on ? '#0f3a14' : '#14201a'; ctx.beginPath(); ctx.roundRect(tx + 4, ty + 4, 24, 19, 3); ctx.fill();
      ctx.fillStyle = on ? '#9dff8a' : 'rgba(157,255,138,0.45)'; ctx.font = 'bold 7px Courier New'; ctx.textAlign = 'left';
      ctx.fillText(on ? 'SAVED' : 'SYNC?', tx + 6, ty + 12);
      if (Math.floor(time * 2.5) % 2) ctx.fillRect(tx + 6, ty + 15, 5, 5);
      ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(tx + 4, ty + 4, 24, 4);
      ctx.fillStyle = on ? '#f2c94c' : '#a33'; ctx.beginPath(); ctx.arc(tx + 27, ty + 29, 1.6, 0, 7); ctx.fill();
    }
    vault(x, y, time) {
      const ctx = this.ctx, cy = y - 72, R = 64, open = this.wonT >= 0 ? Math.min(1, this.wonT / 2.2) : 0, e = open * open * (3 - 2 * open);
      // inner light from the vault
      const gl = ctx.createRadialGradient(x, cy, 0, x, cy, 190);
      gl.addColorStop(0, `rgba(255,230,150,${0.3 + e * 0.5 + Math.sin(time * 2) * 0.06})`); gl.addColorStop(1, 'rgba(255,230,150,0)');
      ctx.fillStyle = gl; ctx.fillRect(x - 190, cy - 190, 380, 380);
      for (let i = 0; i < 8; i++) { const a = time * 0.3 + i * 0.785; ctx.strokeStyle = `rgba(157,255,138,${0.08 + e * 0.1})`; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(x, cy); ctx.lineTo(x + Math.cos(a) * 230, cy + Math.sin(a) * 230); ctx.stroke(); }
      ctx.fillStyle = '#3d4142'; ctx.beginPath(); ctx.arc(x, cy, R + 12, 0, 7); ctx.fill();
      ctx.fillStyle = `rgba(255,240,190,${0.35 + e * 0.65})`; ctx.beginPath(); ctx.arc(x, cy, R + 2, 0, 7); ctx.fill();
      // the cog door rolls aside when Kessie arrives
      ctx.save(); ctx.translate(x + e * (R * 2 + 12), cy); ctx.rotate(e * 4 + Math.sin(time * 0.5) * 0.02);
      ctx.fillStyle = '#9a9f9c'; ctx.beginPath();
      for (let i = 0; i < 40; i++) { const a = i / 40 * 6.283, rr = (i >> 1) % 2 ? R : R - 7; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#c9a23a'; ctx.beginPath(); ctx.arc(0, 0, R - 12, 0, 7); ctx.fill();
      ctx.fillStyle = '#2f5fa8'; ctx.beginPath(); ctx.arc(0, 0, R - 20, 0, 7); ctx.fill();
      ctx.strokeStyle = '#1d3b6a'; ctx.lineWidth = 2; for (let i = 0; i < 6; i++) { const a = i * 1.047; ctx.beginPath(); ctx.moveTo(Math.cos(a) * 14, Math.sin(a) * 14); ctx.lineTo(Math.cos(a) * (R - 22), Math.sin(a) * (R - 22)); ctx.stroke(); }
      ctx.fillStyle = SUIT_Y; ctx.font = '900 34px Trebuchet MS'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(((this.L.vaultLabel || '42').match(/\d+/) || ['42'])[0], 0, 2);
      ctx.textBaseline = 'alphabetic'; ctx.restore();
      ctx.fillStyle = 'rgba(8,22,30,0.6)'; ctx.font = 'bold 12px Courier New'; ctx.textAlign = 'center'; const lbl = this.L.vaultLabel || 'VAULT 42 \u00b7 WELCOME HOME, JADE'; ctx.fillText(lbl, x + 1, cy - R - 21);
      ctx.fillStyle = '#9dff8a'; ctx.fillText(lbl, x, cy - R - 22); ctx.textAlign = 'left';
    }
    drawCRT(time) {
      const ctx = this.ctx, W = this.W, H = this.H, d = this.dpr || 1;
      ctx.fillStyle = 'rgba(0,0,0,0.13)';
      for (let y = (time * 30 * d) % (4 * d); y < H; y += 4 * d) ctx.fillRect(0, y, W, d);
      const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.9);
      vg.addColorStop(0, 'rgba(60,255,90,0)'); vg.addColorStop(1, 'rgba(30,120,40,0.28)');
      ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
      const roll = ((time * 0.15) % 1.3 - 0.15) * H;
      const rb = ctx.createLinearGradient(0, roll - 60, 0, roll + 60); rb.addColorStop(0, 'rgba(157,255,138,0)'); rb.addColorStop(0.5, 'rgba(157,255,138,0.05)'); rb.addColorStop(1, 'rgba(157,255,138,0)');
      ctx.fillStyle = rb; ctx.fillRect(0, roll - 60, W, 120);
    }
    drawMorph(time) {
      // the bombs fall: white-out, a blooming atomic glow, then glitching into the CRT wasteland
      const ctx = this.ctx, W = this.W, H = this.H, e = 3.4 - this.morphT;
      if (e < 2.2) for (let i = 0; i < 9; i++) {
        const y = Math.random() * H, h = 8 + Math.random() * 60, dx = (Math.random() - .5) * 120 * (1 - e / 2.2);
        ctx.drawImage(this.cv, 0, y, W, h, dx, y, W, h);
        if (i % 3 === 0) { ctx.fillStyle = `rgba(${i % 2 ? '157,255,138' : '255,80,200'},0.12)`; ctx.fillRect(0, y, W, h); }
      }
      const glow = Math.max(0, 1 - Math.abs(e - 0.9) / 1.4);
      if (glow > 0) {
        const g = ctx.createRadialGradient(W / 2, H * 0.95, 0, W / 2, H * 0.95, H * (0.4 + e * 0.5));
        g.addColorStop(0, `rgba(255,240,180,${0.9 * glow})`); g.addColorStop(0.4, `rgba(255,150,40,${0.55 * glow})`); g.addColorStop(1, `rgba(120,255,90,0)`);
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      }
      const white = e < 0.18 ? 1 : Math.max(0, 1 - (e - 0.18) / 0.6);
      if (white > 0) { ctx.fillStyle = `rgba(255,255,245,${white})`; ctx.fillRect(0, 0, W, H); }
    }
    drawPump(time) {
      const p = this.g.p, pm = p.pump || 0;
      if (pm < 0.04 || !this.L.zones[this.zoneOfRow(Math.floor((p.y - 20) / this.T))].pump) return;
      const ctx = this.ctx, x = p.x, y = p.y - 66, warn = pm > 0.7;
      ctx.lineWidth = 5; ctx.lineCap = 'round';
      ctx.strokeStyle = 'rgba(8,22,30,0.55)'; ctx.beginPath(); ctx.arc(x, y, 11, 0, 7); ctx.stroke();
      const rad = this.waste();
      ctx.strokeStyle = warn ? (Math.sin(time * 18) > 0 ? '#f2b24c' : '#ffd98a') : rad ? '#9dff8a' : '#4fd6c8';
      if (rad) { ctx.fillStyle = ctx.strokeStyle; ctx.font = 'bold 12px Courier New'; ctx.textAlign = 'center'; ctx.fillText('\u2622', x, y + 4); ctx.textAlign = 'left'; }
      ctx.beginPath(); ctx.arc(x, y, 11, -Math.PI / 2, -Math.PI / 2 + pm * Math.PI * 2); ctx.stroke();
      ctx.lineCap = 'butt';
    }
    drawWater(time) {
      const ctx = this.ctx, L = this.L, T = this.T, v = this.view;
      const r1 = Math.max(0, Math.floor(v.y1 / T)), r2 = Math.min(L.rows.length - 1, Math.ceil(v.y2 / T));
      for (let r = r1; r <= r2; r++) for (let c = 0; c < L.cols; c++) {
        if (L.rows[r][c] !== 'w') continue;
        const x = c * T, y = r * T, top = L.rows[r - 1][c] !== 'w', lake = L.zones[this.zoneOfRow(r)].lake;
        const gr = ctx.createLinearGradient(0, y, 0, y + T);
        const goo = L.zones[this.zoneOfRow(r)].waste;
        if (goo) { gr.addColorStop(0, top ? 'rgba(170,255,110,0.92)' : 'rgba(80,220,70,0.9)'); gr.addColorStop(1, 'rgba(20,110,40,0.95)'); }
        else if (lake) { gr.addColorStop(0, top ? 'rgba(92,232,214,0.85)' : 'rgba(30,170,170,0.9)'); gr.addColorStop(1, 'rgba(12,110,120,0.94)'); }
        else { gr.addColorStop(0, top ? 'rgba(79,179,191,0.8)' : 'rgba(30,90,110,0.88)'); gr.addColorStop(1, 'rgba(14,50,70,0.92)'); }
        ctx.fillStyle = gr;
        ctx.beginPath(); ctx.moveTo(x, y + T + 0.5);
        if (top) for (let i = 0; i <= 8; i++) ctx.lineTo(x + i * 4, y + 6 + Math.sin((x + i * 4) * 0.12 + time * 3) * 2.5);
        else { ctx.lineTo(x, y); ctx.lineTo(x + T, y); }
        ctx.lineTo(x + T + 0.5, y + T + 0.5); ctx.closePath(); ctx.fill();
        if (top && goo) { const b = (time * 0.7 + hash(c, r)) % 1; ctx.fillStyle = `rgba(220,255,180,${0.8 * (1 - b)})`; ctx.beginPath(); ctx.arc(x + 8 + hash(r, c) * 16, y + 8 - b * 14, 2 + b * 3, 0, 7); ctx.fill(); const gl = ctx.createRadialGradient(x + 16, y, 0, x + 16, y, 60); gl.addColorStop(0, 'rgba(120,255,90,0.18)'); gl.addColorStop(1, 'rgba(120,255,90,0)'); ctx.fillStyle = gl; ctx.fillRect(x - 44, y - 60, 120, 90); }
        else if (top) { ctx.fillStyle = 'rgba(232,240,235,0.6)'; ctx.fillRect(x + ((time * 30 + c * 7) % 28), y + 5, 4, 1.5); }
      }
    }
    drawWindHint(time) {
      const g = this.g, w = g.wind, ctx = this.ctx, v = this.view;
      if (!w.warn && !w.force) return;
      const x = w.dir > 0 ? v.x1 + 60 : v.x2 - 60, y = (v.y1 + v.y2) / 2;
      ctx.save(); ctx.globalAlpha = w.force ? 0.85 : 0.5 + 0.5 * Math.sin(time * 12);
      ctx.fillStyle = '#f2b24c';
      for (let i = 0; i < 3; i++) { const ox = x + w.dir * i * 26; ctx.beginPath(); ctx.moveTo(ox + w.dir * 18, y); ctx.lineTo(ox - w.dir * 6, y - 18); ctx.lineTo(ox - w.dir * 6, y + 18); ctx.closePath(); ctx.fill(); }
      ctx.restore();
    }
    drawParticles() {
      const ctx = this.ctx;
      for (const q of this.particles) {
        const a = 1 - q.t / q.life;
        if (q.k === 'dust') { ctx.fillStyle = `rgba(232,222,200,${0.45 * a})`; ctx.beginPath(); ctx.arc(q.x, q.y, q.r * (1.3 - a * 0.5), 0, 7); ctx.fill(); }
        else if (q.k === 'ring') { ctx.strokeStyle = q.c; ctx.globalAlpha = a; ctx.lineWidth = 4 * a + 1; ctx.beginPath(); ctx.arc(q.x, q.y, 10 + (1 - a) * 46, 0, 7); ctx.stroke(); ctx.globalAlpha = 1; }
        else if (q.k === 'spark' || q.k === 'star') { ctx.fillStyle = q.k === 'star' ? `rgba(255,217,138,${a})` : `rgba(255,245,210,${a})`; ctx.fillRect(q.x - q.r, q.y - q.r, q.r * 2, q.r * 2); }
        else if (q.k === 'rock') { ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(q.rot); ctx.fillStyle = `rgba(201,162,90,${a})`; ctx.fillRect(-q.r, -q.r, q.r * 2, q.r * 1.6); ctx.restore(); }
        else if (q.k === 'drop') { ctx.fillStyle = `rgba(160,225,230,${a})`; ctx.beginPath(); ctx.arc(q.x, q.y, q.r, 0, 7); ctx.fill(); }
        else if (q.k === 'streak') { ctx.strokeStyle = `rgba(240,230,215,${q.a * Math.min(1, a * 3)})`; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(q.x, q.y); ctx.lineTo(q.x - Math.sign(q.vx) * 60, q.y); ctx.stroke(); }
        else if (q.k === 'leaf') { ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(q.rot); ctx.scale(Math.cos(q.rot * 0.7), 1); ctx.globalAlpha = Math.min(1, a * 3); this.leafPath(q.r); ctx.fillStyle = q.c; ctx.fill(); ctx.restore(); ctx.globalAlpha = 1; }
        else if (q.k === 'chalk') { ctx.fillStyle = `rgba(250,250,245,${0.42 * a})`; ctx.beginPath(); ctx.arc(q.x, q.y, q.r * (1.6 - a * 0.6), 0, 7); ctx.fill(); }
        else if (q.k === 'mote') { ctx.fillStyle = `rgba(157,255,138,${0.7 * Math.min(1, a * 3)})`; ctx.beginPath(); ctx.arc(q.x, q.y, q.r, 0, 7); ctx.fill(); ctx.fillStyle = `rgba(157,255,138,${0.12 * a})`; ctx.beginPath(); ctx.arc(q.x, q.y, q.r * 4, 0, 7); ctx.fill(); }
        else if (q.k === 'snow' && q.ash) { ctx.fillStyle = `rgba(190,200,170,${0.7 * Math.min(1, a * 4)})`; ctx.fillRect(q.x, q.y, q.r * 1.6, q.r); }
        else if (q.k === 'snow') { ctx.fillStyle = `rgba(245,250,255,${0.75 * Math.min(1, a * 4)})`; ctx.beginPath(); ctx.arc(q.x, q.y, q.r, 0, 7); ctx.fill(); }
        else if (q.k === 'confetti') { ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(q.rot); ctx.globalAlpha = Math.min(1, a * 3); ctx.fillStyle = q.c; ctx.fillRect(-q.r, -q.r / 2, q.r * 2, q.r); ctx.restore(); ctx.globalAlpha = 1; }
      }
    }
    drawTexts() {
      const ctx = this.ctx;
      ctx.textAlign = 'center'; ctx.font = 'bold 16px Trebuchet MS';
      for (const t of this.texts) {
        const a = Math.min(1, (1.4 - t.t) * 2);
        ctx.fillStyle = `rgba(8,22,30,${0.6 * a})`; ctx.fillText(t.s, t.x + 1, t.y - t.t * 40 + 2);
        ctx.globalAlpha = a; ctx.fillStyle = t.c; ctx.fillText(t.s, t.x, t.y - t.t * 40); ctx.globalAlpha = 1;
      }
      ctx.textAlign = 'left';
    }

    // ---------- Kessie ----------
    pose(time) {
      const p = this.g.p, run = p.run * 0.075;
      const P = { fl: [-3, 0], fr: [4, 0], hl: [-4, -19], hr: [5, -19], lean: 0, rot: 0 };
      if (p.dance > 0) return this.dancePose(G.GRIP.K.DANCE - p.dance, p.danceMove, P);
      if (p.climbUp) {
        const e = p.climbUp.t;
        P.hl = [8, -14 + e * 6]; P.hr = [11, -15 + e * 6]; P.fl = [2, -8 + e * 6]; P.fr = [8, -12 + e * 10]; P.lean = 0.25;
      } else if (p.hang) {
        const sw = Math.sin(time * 3) * 2;
        P.hl = [9, -47]; P.hr = [9, -48]; P.fl = [3 + sw, 0]; P.fr = [-1 - sw, -2]; P.lean = 0.12;
      } else if (p.climb) {
        const s = Math.sin(run * 1.6);
        P.hl = [6, -40 + s * 6]; P.hr = [8, -40 - s * 6]; P.fl = [5, -2 - s * 4]; P.fr = [6, -2 + s * 4]; P.lean = 0.1;
      } else if (p.sliding) {
        P.hl = [9, -38]; P.hr = [10, -30]; P.fl = [6, -4]; P.fr = [-3, 0]; P.lean = -0.1;
      } else if (!p.ground) {
        if (p.vy < 0) { P.fl = [-4, -6]; P.fr = [6, -10]; P.hl = [-6, -40]; P.hr = [9, -44]; P.lean = 0.08; }
        else { const f = Math.sin(time * 14) * 3; P.fl = [-5, -2]; P.fr = [6, -5]; P.hl = [-12, -36 + f]; P.hr = [13, -38 - f]; P.lean = -0.05; }
      } else if (Math.abs(p.vx) > 20) {
        const s = Math.sin(run), c = Math.cos(run), k = Math.min(1, Math.abs(p.vx) / 255);
        P.fl = [s * 10 * k, -Math.max(0, c) * 7 * k]; P.fr = [-s * 10 * k, -Math.max(0, -c) * 7 * k];
        P.hl = [-s * 9 * k, -19 - Math.abs(s) * 3]; P.hr = [s * 9 * k, -19 - Math.abs(s) * 3]; P.lean = 0.15 * k;
      } else {
        const b = Math.sin(time * 2.2) * 0.8;
        P.hl[1] += b; P.hr[1] += b; P.breath = b;
      }
      return P;
    }
    dancePose(t, m, P) {
      const TAU = Math.PI * 2;
      P.fl = [-6, 0]; P.fr = [7, 0];
      if (m === 0) { // floss: hips one way, arms the other
        const s = Math.sin(t * TAU * 2.6), s2 = Math.sin(t * TAU * 5.2);
        P.hl = [-12 * s + (s2 > 0 ? 4 : -4), -21]; P.hr = [-12 * s + (s2 > 0 ? -4 : 4) + 6, -22]; P.hipx = 4 * s; P.lean = -0.12 * s;
      } else if (m === 1) { // turntable spin, then a big V
        if (t < 0.55) { P.hl = [-11, -30]; P.hr = [12, -30]; }
        else { const k = Math.min(1, (t - 0.55) / 0.15); P.hl = [-11 - 3 * k, -30 - 26 * k]; P.hr = [12 + 3 * k, -30 - 27 * k]; P.fl = [-8, 0]; P.fr = [9, 0]; }
      } else if (m === 2) { // fist pumps on the beat
        const b = (t * 3.4) % 1, up = b < 0.45;
        P.hr = up ? [7, -58] : [9, -38]; P.hl = [-7, -26]; P.fl = [-5, up ? -3 : 0]; P.fr = [6, 0];
      } else { // the dab, both sides, then hold
        const side = t < 0.4 ? 1 : t < 0.8 ? -1 : 1;
        P.hr = side > 0 ? [17, -50] : [3, -41]; P.hl = side > 0 ? [5, -41] : [-15, -50]; P.lean = side * 0.25; P.headDip = 3;
      }
      return P;
    }
    danceXf(p) {
      // extra body motion while dancing: hops and the turntable spin
      if (!(p.dance > 0)) return { dy: 0, turn: 1 };
      const t = G.GRIP.K.DANCE - p.dance, m = p.danceMove;
      if (m === 0) return { dy: -Math.abs(Math.sin(t * Math.PI * 5.2)) * 2, turn: 1 };
      if (m === 1) return { dy: t < 0.55 ? -Math.sin(t / 0.55 * Math.PI) * 26 : 0, turn: t < 0.55 ? Math.cos(t / 0.55 * Math.PI * 4) : 1 };
      if (m === 2) { const b = (t * 3.4) % 1; return { dy: b < 0.45 ? -Math.sin(b / 0.45 * Math.PI) * 10 : 0, turn: 1 }; }
      return { dy: t > 0.8 ? 0 : -Math.abs(Math.sin(t / 0.4 * Math.PI)) * 6, turn: 1 };
    }
    xf() {
      // body transform: feet origin, facing, squash/stretch, double-jump flip
      const p = this.g.p;
      let sy = 1 + this.sq * -1, sx = 1 + this.sq * 0.8;
      if (!p.ground && !p.hang && !p.climb) { const st = Math.min(0.1, Math.abs(p.vy) / 9000); sy += st; sx -= st * 0.6; }
      const f = p.sliding ? -p.sliding : p.face;
      const rot = this.spin ? f * Math.PI * 2 * (1 - Math.pow(1 - this.spin, 2)) : 0;
      const d = this.danceXf(p);
      return { x: p.x, y: p.y + d.dy, f, sx: sx * (Math.abs(d.turn) < 0.08 ? 0.08 * Math.sign(d.turn || 1) : d.turn), sy, rot };
    }
    local2world(lx, ly, X) {
      // matches the canvas transform in drawKessie
      let x = lx * X.f * X.sx, y = ly * X.sy;
      if (X.rot) { const py = -22 * X.sy; const yy = y - py, c = Math.cos(X.rot), s = Math.sin(X.rot); const nx = x * c - yy * s, ny = x * s + yy * c; x = nx; y = ny + py; }
      return { x: X.x + x, y: X.y + y };
    }
    updateHair(dt, wind) {
      const X = this.xf(), a = this.local2world(-5, -45, X);
      const N = 9, SEG = 5.2;
      if (!this.hair) { this.hair = []; for (let i = 0; i < N; i++) this.hair.push({ x: a.x - X.f * i * 2, y: a.y + i * SEG, px: a.x - X.f * i * 2, py: a.y + i * SEG }); }
      const H = this.hair;
      H[0].x = a.x; H[0].y = a.y; H[0].px = a.x; H[0].py = a.y;
      const d = Math.min(dt, 1 / 30);
      for (let i = 1; i < N; i++) {
        const n = H[i], vx = (n.x - n.px) * 0.94, vy = (n.y - n.py) * 0.94;
        n.px = n.x; n.py = n.y;
        n.x += vx + (wind * 900 - X.f * 120) * d * d; n.y += vy + 1100 * d * d;
      }
      for (let it = 0; it < 4; it++) for (let i = 1; i < N; i++) {
        const a0 = H[i - 1], b = H[i], dx = b.x - a0.x, dy = b.y - a0.y, l = Math.hypot(dx, dy) || 1, k = (l - SEG) / l;
        if (i === 1) { b.x -= dx * k; b.y -= dy * k; } else { a0.x += dx * k * 0.5; a0.y += dy * k * 0.5; b.x -= dx * k * 0.5; b.y -= dy * k * 0.5; }
      }
    }
    drawHair() {
      const ctx = this.ctx, H = this.hair;
      if (!H) return;
      const strand = (col, w0, off) => {
        ctx.strokeStyle = col; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        for (let i = 1; i < H.length; i++) {
          ctx.lineWidth = Math.max(1.5, w0 - i * 0.75);
          ctx.beginPath(); ctx.moveTo(H[i - 1].x + off, H[i - 1].y); ctx.lineTo(H[i].x + off, H[i].y); ctx.stroke();
        }
      };
      strand(HAIR_D, 10, 0); strand(HAIR, 7.5, 0.5); strand(HAIR_L, 3, 1);
    }
    ik(sx, sy, hx, hy, l1, l2, bend) {
      let dx = hx - sx, dy = hy - sy, d = Math.hypot(dx, dy) || 0.01;
      d = Math.min(d, l1 + l2 - 0.01);
      const a = Math.atan2(dy, dx), cos = (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d);
      const ang = a + bend * Math.acos(Math.max(-1, Math.min(1, cos)));
      return [sx + Math.cos(ang) * l1, sy + Math.sin(ang) * l1];
    }
    drawKessie(time) {
      const ctx = this.ctx, g = this.g, p = g.p, P = this.pose(time), X = this.xf();
      const blink = p.hurtT > 0 && Math.floor(time * 20) % 2;
      const vs = this.waste(), TOP = vs ? SUIT : TOP_C, TOP_D = vs ? SUIT_D : TOP_DC, SHORTS = vs ? SUIT_D : SHORTS_C, LEG = vs ? SUIT : SKIN, LEG_D = vs ? SUIT_D : SKIN_D;
      this.drawHair();
      ctx.save();
      ctx.translate(X.x, X.y);
      if (X.rot) { ctx.translate(0, -22 * X.sy); ctx.rotate(X.rot); ctx.translate(0, 22 * X.sy); }
      ctx.scale(X.f * X.sx, X.sy);
      if (blink) ctx.globalAlpha = 0.5;
      const hip = [P.hipx || 0, -19], sh = [Math.sin(P.lean) * 14, -33 + (P.breath || 0) * 0.3], head = [sh[0] + 2 + (P.headDip || 0), -43 + (P.breath || 0) * 0.3 + (P.headDip || 0)];
      const leg = (ft, col, w) => {
        const k = this.ik(hip[0], hip[1], ft[0], ft[1], 10, 10, -1);
        ctx.strokeStyle = col; ctx.lineCap = 'round'; ctx.lineWidth = w;
        ctx.beginPath(); ctx.moveTo(hip[0], hip[1]); ctx.lineTo(k[0], k[1]); ctx.lineTo(ft[0], ft[1]); ctx.stroke();
        ctx.strokeStyle = SHORTS; ctx.lineWidth = w + 3; ctx.beginPath(); ctx.moveTo(hip[0], hip[1]); ctx.lineTo(hip[0] + (k[0] - hip[0]) * 0.5, hip[1] + (k[1] - hip[1]) * 0.5); ctx.stroke();
        ctx.fillStyle = '#e8e1d3'; ctx.beginPath(); ctx.ellipse(ft[0] + 2.5, ft[1] - 1.5, 4.8, 2.8, 0, 0, 7); ctx.fill();
        ctx.fillStyle = '#f2b24c'; ctx.fillRect(ft[0] - 1.5, ft[1] - 1, 7, 1.5);
      };
      const arm = (hd, col, w) => {
        const e = this.ik(sh[0], sh[1], hd[0], hd[1], 9, 9, 1);
        ctx.strokeStyle = col; ctx.lineCap = 'round'; ctx.lineWidth = w;
        ctx.beginPath(); ctx.moveTo(sh[0], sh[1]); ctx.lineTo(e[0], e[1]); ctx.lineTo(hd[0], hd[1]); ctx.stroke();
        ctx.fillStyle = col; ctx.beginPath(); ctx.arc(hd[0], hd[1], 2.8, 0, 7); ctx.fill();
      };
      arm(P.hl, SKIN_D, 4.5);
      leg(P.fl, LEG_D, 5.5);
      // torso
      ctx.strokeStyle = TOP_D; ctx.lineCap = 'round'; ctx.lineWidth = 12; ctx.beginPath(); ctx.moveTo(sh[0], sh[1] + 2); ctx.lineTo(hip[0], hip[1] - 2); ctx.stroke();
      ctx.strokeStyle = TOP; ctx.lineWidth = 9; ctx.stroke();
      if (vs) { ctx.strokeStyle = SUIT_Y; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(sh[0] + 1, sh[1] + 2); ctx.lineTo(hip[0] + 1, hip[1] - 2); ctx.stroke(); }
      ctx.strokeStyle = SHORTS; ctx.lineWidth = 11; ctx.beginPath(); ctx.moveTo(hip[0], hip[1] - 2); ctx.lineTo(hip[0], hip[1] + 2); ctx.stroke();
      ctx.fillStyle = '#e9e4d8'; ctx.beginPath(); ctx.ellipse(-6, hip[1] - 1, 3, 4, 0, 0, 7); ctx.fill();
      // head
      ctx.strokeStyle = SKIN; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(sh[0], sh[1]); ctx.lineTo(head[0], head[1] + 4); ctx.stroke();
      ctx.fillStyle = SKIN; ctx.beginPath(); ctx.arc(head[0], head[1], 7.5, 0, 7); ctx.fill();
      ctx.fillStyle = HAIR; ctx.beginPath(); ctx.arc(head[0], head[1] - 0.5, 8.3, Math.PI * 0.62, Math.PI * 2.05); ctx.closePath(); ctx.fill();
      ctx.fillStyle = HAIR_L; ctx.globalAlpha *= 0.7; ctx.beginPath(); ctx.ellipse(head[0] - 1, head[1] - 5, 4.5, 2, -0.3, 0, 7); ctx.fill(); ctx.globalAlpha = blink ? 0.5 : 1;
      ctx.fillStyle = HAIR_D; ctx.beginPath(); ctx.arc(head[0] - 6, head[1] - 1, 3, 0, 7); ctx.fill();
      // face
      ctx.fillStyle = '#2a2320'; ctx.beginPath(); ctx.arc(head[0] + 4, head[1] + 0.5, 1.2, 0, 7); ctx.fill();
      ctx.fillStyle = 'rgba(232,120,110,0.35)'; ctx.beginPath(); ctx.arc(head[0] + 3, head[1] + 3.5, 1.8, 0, 7); ctx.fill();
      if (p.hurtT > 0) { ctx.strokeStyle = '#2a2320'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(head[0] + 4, head[1] + 4.5, 1.5, Math.PI, 0); ctx.stroke(); }
      leg(P.fr, LEG, 6);
      arm(P.hr, SKIN, 5);
      ctx.strokeStyle = TOP; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(sh[0], sh[1]); ctx.lineTo(sh[0] + (P.hr[0] - sh[0]) * 0.15, sh[1] + (P.hr[1] - sh[1]) * 0.15); ctx.stroke();
      ctx.restore();
      // landing shadow
      if (!p.ground) {
        const T = this.T; let r = Math.floor(p.y / T);
        for (let k = 0; k < 12 && !g.solid(Math.floor(p.x / T), r) && g.ch(Math.floor(p.x / T), r) !== '='; k++) r++;
        const d = r * T - p.y;
        if (d > 0 && d < 12 * T) { ctx.fillStyle = `rgba(0,0,0,${0.3 * (1 - d / (12 * T))})`; ctx.beginPath(); ctx.ellipse(p.x, r * T, 11, 3, 0, 0, 7); ctx.fill(); }
      }
    }
  }
  G.GRIP.Renderer = Renderer;
})(window);
