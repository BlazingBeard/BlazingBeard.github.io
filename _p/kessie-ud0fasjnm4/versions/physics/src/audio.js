// GRIP audio — fully procedural WebAudio. No files.
(function (G) {
  class Audio {
    constructor() { this.ctx = null; this.enabled = true; }
    init() {
      if (this.ctx) { this.ctx.resume(); return; }
      const A = window.AudioContext || window.webkitAudioContext;
      if (!A) return;
      const c = this.ctx = new A();
      this.master = c.createGain(); this.master.gain.value = this.enabled ? 0.8 : 0; this.master.connect(c.destination);
      const len = c.sampleRate * 2, buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
      let last = 0;
      for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; last = (last + 0.02 * w) / 1.02; d[i] = w * 0.5 + last * 3; }
      this.noise = buf;
      // waves
      const ws = this.loopNoise();
      const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 420;
      this.waveGain = c.createGain(); this.waveGain.gain.value = 0;
      const lfo = c.createOscillator(), lfoG = c.createGain(); lfo.frequency.value = 0.11; lfoG.gain.value = 0.18;
      const waveAmp = c.createGain(); waveAmp.gain.value = 0.22;
      lfo.connect(lfoG); lfoG.connect(waveAmp.gain); lfo.start();
      ws.connect(lp); lp.connect(waveAmp); waveAmp.connect(this.waveGain); this.waveGain.connect(this.master);
      // wind
      const wn = this.loopNoise();
      this.windBp = c.createBiquadFilter(); this.windBp.type = 'bandpass'; this.windBp.frequency.value = 600; this.windBp.Q.value = 0.7;
      this.windGain = c.createGain(); this.windGain.gain.value = 0;
      wn.connect(this.windBp); this.windBp.connect(this.windGain); this.windGain.connect(this.master);
    }
    loopNoise() { const s = this.ctx.createBufferSource(); s.buffer = this.noise; s.loop = true; s.start(); return s; }
    setEnabled(on) { this.enabled = on; if (this.master) this.master.gain.value = on ? 0.8 : 0; }

    ambience(heightM, wind, warn) {
      if (!this.ctx) return;
      const t = this.ctx.currentTime, h = Math.min(1, heightM / 85);
      this.waveGain.gain.setTargetAtTime(Math.max(0.12, 1 - h * 0.9), t, 0.5);
      const w = 0.03 + h * 0.18 + Math.abs(wind) / 650 * 0.5 + warn * 0.05;
      this.windGain.gain.setTargetAtTime(w, t, 0.25);
      this.windBp.frequency.setTargetAtTime(500 + h * 400 + Math.abs(wind) * 0.8, t, 0.3);
    }

    burst(dur, freq, q, vol, when = 0) {
      const c = this.ctx, t = c.currentTime + when;
      const s = c.createBufferSource(); s.buffer = this.noise;
      const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q;
      const g = c.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      s.connect(f); f.connect(g); g.connect(this.master);
      s.start(t, Math.random()); s.stop(t + dur + 0.02);
    }
    ping(freq, dur, vol, type = 'sine', when = 0) {
      const c = this.ctx, t = c.currentTime + when;
      const o = c.createOscillator(); o.type = type; o.frequency.value = freq;
      const g = c.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      o.connect(g); g.connect(this.master); o.start(t); o.stop(t + dur + 0.02);
    }

    grip(surf) {
      if (!this.ctx) return;
      this.burst(0.06, 2400, 0.8, 0.5);
      if (surf === 'metal') { this.ping(880, 0.35, 0.08, 'triangle'); this.ping(1320, 0.2, 0.04, 'triangle'); }
      if (surf === 'rope') { this.ping(1500, 0.12, 0.06, 'square'); this.ping(1800, 0.1, 0.04, 'square', 0.05); }
      if (surf === 'wet') this.burst(0.12, 900, 2, 0.25);
    }
    slip() { if (!this.ctx) return; this.burst(0.25, 1400, 0.6, 0.3); this.burst(0.2, 700, 0.6, 0.2, 0.08); }
    crumble() { if (!this.ctx) return; for (let i = 0; i < 7; i++) this.burst(0.05 + Math.random() * 0.06, 300 + Math.random() * 900, 1.2, 0.45, i * 0.04 + Math.random() * 0.03); }
    land(m) {
      if (!this.ctx) return;
      const c = this.ctx, t = c.currentTime, o = c.createOscillator(), g = c.createGain();
      o.frequency.setValueAtTime(110, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.25);
      g.gain.setValueAtTime(Math.min(0.9, 0.3 + m * 0.04), t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
      o.connect(g); g.connect(this.master); o.start(t); o.stop(t + 0.32);
      this.burst(0.15, 300, 0.7, 0.4);
      if (m > 6) this.grunt(0.9, 0.08);
    }
    grunt(effort = 0.6, when = 0) {
      if (!this.ctx) return;
      const c = this.ctx, t = c.currentTime + when, dur = 0.16 + effort * 0.14;
      const o = c.createOscillator(); o.type = 'sawtooth';
      const f0 = 300 + Math.random() * 40;
      o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f0 * 0.78, t + dur);
      const mix = c.createGain(); mix.gain.value = 1;
      const out = c.createGain(); out.gain.setValueAtTime(0.0001, t); out.gain.exponentialRampToValueAtTime(0.09 * effort, t + 0.03); out.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      for (const [fq, qv, gv] of [[750, 6, 1], [1250, 8, 0.6], [2700, 10, 0.25]]) {
        const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = fq; bp.Q.value = qv;
        const g = c.createGain(); g.gain.value = gv; o.connect(bp); bp.connect(g); g.connect(out);
      }
      out.connect(this.master); o.start(t); o.stop(t + dur + 0.05);
      this.burst(dur * 0.8, 1800, 0.5, 0.05 * effort, when);
    }
    tide() { if (!this.ctx) return; for (let i = 0; i < 4; i++) this.burst(0.6, 500, 0.4, 0.35, i * 0.15); }
    summit() {
      if (!this.ctx) return;
      [[261.6, 329.6, 392], [293.7, 370, 440], [329.6, 392, 493.9, 659.3]].forEach((ch, i) => ch.forEach(f => this.ping(f, 2.6, 0.05, 'triangle', i * 0.9)));
    }
  }
  G.GRIP.Audio = Audio;
})(window);
