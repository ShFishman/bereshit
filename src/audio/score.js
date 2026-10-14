/**
 * score.js — procedural Web Audio score for a Genesis 1–3 game.
 *
 * Everything is synthesised at runtime: no binary assets, no dependencies.
 * The dramatic arc is encoded in the harmony itself — the void is pure noise
 * and inharmonic rumble, each creation day adds one layer and one degree of
 * tonal clarity, Eden is warm and consonant, and the Fall drops the tonal
 * centre a semitone and never fully recovers it.
 *
 * Public API: see class Score at the bottom.
 */

/* ============================================================================
 * 1. Constants, modes, small utilities
 * ========================================================================== */

/** Ahava Rabbah / Phrygian dominant: 1 ♭2 3 4 5 ♭6 ♭7 */
const AHAVA = [0, 1, 4, 5, 7, 8, 10];
/** A warmer, major-leaning colouring used for Eden and Eve. */
const EDENIC = [0, 2, 4, 7, 9, 11, 14];

const ROOT = 73.4162; // D2 — the tonal centre of the world

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const rnd = (a, b) => a + Math.random() * (b - a);
const rint = (a, b) => Math.floor(rnd(a, b + 1));
const pick = (arr) => arr[(Math.random() * arr.length) | 0];
const semi = (f, n) => f * Math.pow(2, n / 12);
const num = (v, d) => (typeof v === 'number' && isFinite(v) ? v : d);

/** Scale degree -> frequency. `i` may be any integer; it wraps across octaves. */
function degree(i, oct = 0, scale = AHAVA, root = ROOT) {
  const len = scale.length;
  const o = Math.floor(i / len);
  const d = ((i % len) + len) % len;
  return root * Math.pow(2, oct + o + scale[d] / 12);
}

/* ============================================================================
 * 2. Buffers: noise and procedural impulse responses
 * ========================================================================== */

const _noiseCache = new WeakMap();

function noiseBuffer(ctx, type = 'white', seconds = 3) {
  let perCtx = _noiseCache.get(ctx);
  if (!perCtx) { perCtx = new Map(); _noiseCache.set(ctx, perCtx); }
  const key = type + ':' + seconds;
  if (perCtx.has(key)) return perCtx.get(key);

  const sr = ctx.sampleRate || 44100;
  const len = Math.max(1, Math.floor(sr * seconds));
  const buf = ctx.createBuffer(2, len, sr);

  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    if (type === 'brown') {
      let last = 0;
      for (let i = 0; i < len; i++) {
        const w = Math.random() * 2 - 1;
        last = (last + 0.021 * w) / 1.021;
        d[i] = last * 3.6;
      }
    } else if (type === 'pink') {
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < len; i++) {
        const w = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + w * 0.0555179;
        b1 = 0.99332 * b1 + w * 0.0750759;
        b2 = 0.969 * b2 + w * 0.153852;
        b3 = 0.8665 * b3 + w * 0.3104856;
        b4 = 0.55 * b4 + w * 0.5329522;
        b5 = -0.7616 * b5 - w * 0.016898;
        d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
        b6 = w * 0.115926;
      }
    } else {
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    }
  }
  perCtx.set(key, buf);
  return buf;
}

/**
 * Procedural impulse response: decorrelated noise shaped by an exponential
 * decay, with a short diffuse build-up so it reads as a room rather than a
 * noise burst. `spread` widens the stereo image by delaying/reshaping R.
 */
function impulseResponse(ctx, decay = 3, { preDelay = 0.012, spread = 0.35, tilt = 1 } = {}) {
  const sr = ctx.sampleRate || 44100;
  const len = Math.max(64, Math.floor(sr * Math.max(0.1, decay)));
  const pre = Math.floor(sr * preDelay);
  const buf = ctx.createBuffer(2, len, sr);

  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    const skew = ch === 1 ? 1 + spread * 0.25 : 1;
    const offset = ch === 1 ? Math.floor(pre * (1 + spread)) : pre;
    let lp = 0;
    for (let i = 0; i < len; i++) {
      if (i < offset) { d[i] = 0; continue; }
      const x = (i - offset) / (len - offset);
      // exponential decay, with a brief 25 ms diffuse ramp at the head
      const build = Math.min(1, (i - offset) / (sr * 0.025));
      const env = Math.pow(1 - x, 2.2 * skew) * Math.exp(-x * 4.5) * build;
      const w = Math.random() * 2 - 1;
      // one-pole lowpass darkens the tail (tilt < 1 = darker)
      lp += (w - lp) * clamp(0.25 * tilt + 0.5 * (1 - x) * tilt, 0.02, 0.95);
      d[i] = (ch === 1 ? lp * 0.82 + w * 0.18 : lp) * env;
    }
  }
  return buf;
}

/** tanh-ish soft clip curve for gentle analogue-flavoured saturation. */
function saturationCurve(amount = 1.6, n = 2048) {
  const c = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1;
    c[i] = Math.tanh(x * amount) / Math.tanh(amount);
  }
  return c;
}

/* ============================================================================
 * 3. Node lifecycle
 *
 * Every scheduled source is stopped at a known time and every node in its
 * chain is disconnected exactly once, via onended plus a timer safety net.
 * ========================================================================== */

function life(score, sources, nodes, stopTime) {
  const srcs = Array.isArray(sources) ? sources : [sources];
  let done = false;
  let timerId = null;

  const kill = () => {
    if (done) return;
    done = true;
    score._voices = Math.max(0, score._voices - 1);
    if (timerId !== null) { clearTimeout(timerId); score._timers.delete(timerId); }
    for (const s of srcs) { try { s.disconnect(); } catch (e) { /* already gone */ } }
    for (const n of nodes) { if (n) { try { n.disconnect(); } catch (e) { /* already gone */ } } }
  };

  score._voices++;
  if (srcs[0]) srcs[0].onended = kill;
  for (const s of srcs) { try { s.stop(stopTime); } catch (e) { /* already stopped */ } }

  const ms = Math.max(0, (stopTime - score.ctx.currentTime) * 1000) + 600;
  timerId = setTimeout(kill, ms);
  score._timers.add(timerId);
  return kill;
}

/* ============================================================================
 * 4. Envelope and voice primitives
 * ========================================================================== */

const FLOOR = 0.0001;

function env(param, t, { peak = 0.2, attack = 0.01, hold = 0, dur = 1 } = {}) {
  const a = Math.max(0.001, attack);
  const end = t + Math.max(a + hold + 0.03, dur);
  param.cancelScheduledValues(t);
  param.setValueAtTime(FLOOR, t);
  param.linearRampToValueAtTime(Math.max(FLOOR, peak), t + a);
  if (hold > 0) param.setValueAtTime(Math.max(FLOOR, peak), t + a + hold);
  param.exponentialRampToValueAtTime(FLOOR, end);
  return end;
}

function panner(ctx, pan) {
  if (!ctx.createStereoPanner || pan == null) return null;
  const p = ctx.createStereoPanner();
  p.pan.setValueAtTime(clamp(pan, -1, 1), ctx.currentTime);
  return p;
}

/**
 * One pitched voice with optional filter, glide, FM and panning.
 * Returns { osc, gain, filter, end }.
 */
function tone(score, dest, t, o = {}) {
  const ctx = score.ctx;
  if (score._voices > 56) return null;

  const freq = Math.max(8, num(o.freq, 220));
  const dur = num(o.dur, 1.2);
  const osc = ctx.createOscillator();
  osc.type = o.type || 'sine';
  osc.frequency.setValueAtTime(freq, t);
  osc.detune.setValueAtTime(num(o.detune, 0), t);

  if (o.glideTo) {
    const gt = Math.max(0.02, num(o.glideTime, dur * 0.8));
    osc.frequency.exponentialRampToValueAtTime(Math.max(8, o.glideTo), t + gt);
  }

  const g = ctx.createGain();
  const nodes = [g];
  let head = osc;

  let flt = null;
  if (o.filter) {
    flt = ctx.createBiquadFilter();
    flt.type = o.filter.type || 'lowpass';
    flt.frequency.setValueAtTime(Math.max(20, num(o.filter.freq, 1200)), t);
    flt.Q.setValueAtTime(num(o.filter.Q, 1), t);
    if (o.filter.sweepTo) {
      flt.frequency.exponentialRampToValueAtTime(
        Math.max(20, o.filter.sweepTo), t + Math.max(0.02, num(o.filter.sweepTime, dur * 0.7)));
    }
    head.connect(flt); head = flt; nodes.push(flt);
  }
  head.connect(g);

  let tail = g;
  const p = panner(ctx, o.pan);
  if (p) { g.connect(p); tail = p; nodes.push(p); }
  tail.connect(dest);

  const srcs = [osc];
  if (o.fm) {
    const m = ctx.createOscillator();
    const ma = ctx.createGain();
    m.type = o.fm.type || 'sine';
    m.frequency.setValueAtTime(Math.max(0.01, freq * num(o.fm.ratio, 2)), t);
    ma.gain.setValueAtTime(freq * num(o.fm.index, 1), t);
    ma.gain.exponentialRampToValueAtTime(Math.max(FLOOR, freq * num(o.fm.index, 1) * 0.02), t + dur * 0.6);
    m.connect(ma); ma.connect(osc.frequency);
    m.start(t); srcs.push(m); nodes.push(ma);
  }

  const end = env(g.gain, t, {
    peak: num(o.peak, 0.12), attack: num(o.attack, 0.01),
    hold: num(o.hold, 0), dur
  });

  osc.start(t);
  life(score, srcs, nodes, end + 0.05);
  return { osc, gain: g, filter: flt, end };
}

/** One noise voice: filtered, enveloped, optionally swept and panned. */
function noise(score, dest, t, o = {}) {
  const ctx = score.ctx;
  if (score._voices > 56) return null;

  const dur = num(o.dur, 0.6);
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(ctx, o.color || 'white', 3);
  src.loop = true;
  if (src.playbackRate) src.playbackRate.setValueAtTime(num(o.rate, 1), t);

  const g = ctx.createGain();
  const nodes = [g];
  let head = src;

  if (o.filter !== null) {
    const f = o.filter || {};
    const flt = ctx.createBiquadFilter();
    flt.type = f.type || 'bandpass';
    flt.frequency.setValueAtTime(Math.max(20, num(f.freq, 1000)), t);
    flt.Q.setValueAtTime(num(f.Q, 1), t);
    if (f.sweepTo) {
      flt.frequency.exponentialRampToValueAtTime(
        Math.max(20, f.sweepTo), t + Math.max(0.02, num(f.sweepTime, dur * 0.8)));
    }
    head.connect(flt); head = flt; nodes.push(flt);
    if (f.hp) {
      const hp = ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.setValueAtTime(f.hp, t);
      head.connect(hp); head = hp; nodes.push(hp);
    }
  }
  head.connect(g);

  let tail = g;
  const p = panner(ctx, o.pan);
  if (p) { g.connect(p); tail = p; nodes.push(p); }
  tail.connect(dest);

  const end = env(g.gain, t, {
    peak: num(o.peak, 0.1), attack: num(o.attack, 0.005),
    hold: num(o.hold, 0), dur
  });

  src.start(t, Math.random() * 2);
  life(score, src, nodes, end + 0.05);
  return { src, gain: g, end };
}

/** Plucked-string-ish voice: a bright transient collapsing into a body tone. */
function pluckVoice(score, dest, t, o = {}) {
  const freq = Math.max(20, num(o.freq, 330));
  const dur = num(o.dur, 1.6);
  tone(score, dest, t, {
    freq, type: o.type || 'triangle', dur, peak: num(o.peak, 0.1),
    attack: 0.004, pan: o.pan, detune: num(o.detune, 0),
    filter: { type: 'lowpass', freq: freq * num(o.open, 7), Q: num(o.Q, 1.2), sweepTo: freq * 1.4, sweepTime: dur * 0.6 }
  });
  noise(score, dest, t, {
    dur: 0.05, peak: num(o.peak, 0.1) * 0.5, attack: 0.001, pan: o.pan,
    filter: { type: 'bandpass', freq: freq * 4, Q: 2 }
  });
}

/** Low body thump — used for heartbeats, footsteps, gates and the land. */
function thump(score, dest, t, o = {}) {
  const f = num(o.freq, 64);
  tone(score, dest, t, {
    freq: f, type: 'sine', dur: num(o.dur, 0.5), peak: num(o.peak, 0.4),
    attack: 0.004, glideTo: f * num(o.drop, 0.55), glideTime: num(o.dur, 0.5) * 0.5,
    pan: o.pan
  });
  if (o.grit !== false) {
    noise(score, dest, t, {
      color: 'brown', dur: num(o.dur, 0.5) * 0.45, peak: num(o.peak, 0.4) * 0.3,
      attack: 0.002, pan: o.pan,
      filter: { type: 'lowpass', freq: 420, Q: 0.8, sweepTo: 120, sweepTime: 0.2 }
    });
  }
}

/** Inharmonic struck metal / bell. */
function bell(score, dest, t, o = {}) {
  const f = Math.max(40, num(o.freq, 660));
  const dur = num(o.dur, 3.2);
  const ratios = o.ratios || [1, 2.01, 2.99, 4.21, 5.43, 6.79];
  const peak = num(o.peak, 0.07);
  ratios.forEach((r, i) => {
    tone(score, dest, t, {
      freq: f * r, type: 'sine', dur: dur * (1 - i * 0.11),
      peak: peak / (1 + i * 1.15), attack: 0.002 + i * 0.001,
      detune: rnd(-5, 5), pan: o.pan == null ? rnd(-0.4, 0.4) : o.pan
    });
  });
}

/* ============================================================================
 * 5. Reverb
 * ========================================================================== */

class Reverb {
  constructor(score, { decay = 3.2, wet = 0.9 } = {}) {
    const ctx = score.ctx;
    this.score = score;
    this.ctx = ctx;
    this.decay = decay;

    this.input = ctx.createGain();
    this.preLow = ctx.createBiquadFilter();
    this.preLow.type = 'highpass';
    this.preLow.frequency.setValueAtTime(90, ctx.currentTime);
    this.preHigh = ctx.createBiquadFilter();
    this.preHigh.type = 'lowpass';
    this.preHigh.frequency.setValueAtTime(7200, ctx.currentTime);

    this.a = ctx.createConvolver();
    this.b = ctx.createConvolver();
    this.a.normalize = true;
    this.b.normalize = true;
    this.a.buffer = impulseResponse(ctx, decay, { spread: 0.35 });
    this.b.buffer = this.a.buffer;

    this.aGain = ctx.createGain();
    this.bGain = ctx.createGain();
    this.aGain.gain.setValueAtTime(1, ctx.currentTime);
    this.bGain.gain.setValueAtTime(0, ctx.currentTime);

    this.output = ctx.createGain();
    this.output.gain.setValueAtTime(wet, ctx.currentTime);

    this.input.connect(this.preLow);
    this.preLow.connect(this.preHigh);
    this.preHigh.connect(this.a);
    this.preHigh.connect(this.b);
    this.a.connect(this.aGain);
    this.b.connect(this.bGain);
    this.aGain.connect(this.output);
    this.bGain.connect(this.output);

    this._active = 'a';
    this._pending = null;
    this._target = decay;
  }

  /** Crossfades to a freshly generated IR. Debounced; cheap when unchanged. */
  setDecay(seconds, fade = 2.5) {
    const d = clamp(seconds, 0.3, 11);
    this._target = d;
    if (Math.abs(d - this.decay) < 0.45) return;
    if (this._pending !== null) return;
    const id = setTimeout(() => {
      this._pending = null;
      this.score._timers.delete(id);
      this._swap(this._target, fade);
    }, 420);
    this._pending = id;
    this.score._timers.add(id);
  }

  _swap(d, fade) {
    if (this.score._disposed || Math.abs(d - this.decay) < 0.3) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const next = this._active === 'a' ? this.b : this.a;
    const nextG = this._active === 'a' ? this.bGain : this.aGain;
    const prevG = this._active === 'a' ? this.aGain : this.bGain;
    try { next.buffer = impulseResponse(ctx, d, { spread: 0.3 + Math.min(0.4, d * 0.04) }); }
    catch (e) { return; }
    nextG.gain.setValueAtTime(nextG.gain.value, t);
    nextG.gain.linearRampToValueAtTime(1, t + fade);
    prevG.gain.setValueAtTime(prevG.gain.value, t);
    prevG.gain.linearRampToValueAtTime(0, t + fade);
    this._active = this._active === 'a' ? 'b' : 'a';
    this.decay = d;
  }

  setTone(hz, t) {
    this.preHigh.frequency.setValueAtTime(this.preHigh.frequency.value, t);
    this.preHigh.frequency.linearRampToValueAtTime(clamp(hz, 400, 16000), t + 1.5);
  }

  dispose() {
    if (this._pending !== null) { clearTimeout(this._pending); this.score._timers.delete(this._pending); }
    for (const n of [this.input, this.preLow, this.preHigh, this.a, this.b, this.aGain, this.bGain, this.output]) {
      try { n.disconnect(); } catch (e) { /* ignore */ }
    }
  }
}

/* ============================================================================
 * 6. Bed — a sustaining musical layer with its own lifecycle
 * ========================================================================== */

class Bed {
  constructor(score, name) {
    const ctx = score.ctx;
    this.score = score;
    this.ctx = ctx;
    this.name = name;
    this._dead = false;
    this._sources = [];
    this._nodes = [];
    this._timers = new Set();
    this._drifters = [];
    this.driftCents = 4;
    this.density = 1;
    this.colorRange = [900, 12000];
    this.hollowDepth = 0;
    this.onUpdate = null;

    const t = ctx.currentTime;

    this.mix = ctx.createGain();
    this.mix.gain.setValueAtTime(1, t);

    this.hollow = ctx.createBiquadFilter();
    this.hollow.type = 'peaking';
    this.hollow.frequency.setValueAtTime(560, t);
    this.hollow.Q.setValueAtTime(0.9, t);
    this.hollow.gain.setValueAtTime(0, t);

    this.color = ctx.createBiquadFilter();
    this.color.type = 'lowpass';
    this.color.frequency.setValueAtTime(this.colorRange[1], t);
    this.color.Q.setValueAtTime(0.4, t);

    this.out = ctx.createGain();
    this.out.gain.setValueAtTime(FLOOR, t);

    this.dry = ctx.createGain();
    this.dry.gain.setValueAtTime(1, t);
    this.wet = ctx.createGain();
    this.wet.gain.setValueAtTime(0.3, t);

    this.mix.connect(this.hollow);
    this.hollow.connect(this.color);
    this.color.connect(this.out);
    this.out.connect(this.dry);
    this.out.connect(this.wet);
    this.dry.connect(score.bedBus);
    this.wet.connect(score.reverb.input);

    this._nodes.push(this.mix, this.hollow, this.color, this.out, this.dry, this.wet);

    // slow detune drift, deepened by loneliness
    this.every(() => rnd(4, 9), (when) => {
      for (const p of this._drifters) {
        const amt = this.driftCents * (1 + this.score.loneliness * 5);
        try { p.setTargetAtTime(rnd(-amt, amt), when, 2.5); } catch (e) { /* ignore */ }
      }
    });
  }

  /* --- construction helpers used by the recipes ------------------------- */

  /** A sustaining oscillator. Returns { osc, gain, filter, pan }. */
  drone(o = {}) {
    if (this._dead) return null;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = o.type || 'sine';
    osc.frequency.setValueAtTime(Math.max(8, num(o.freq, 110)), t);
    osc.detune.setValueAtTime(num(o.detune, 0), t);

    const g = ctx.createGain();
    g.gain.setValueAtTime(FLOOR, t);
    g.gain.linearRampToValueAtTime(Math.max(FLOOR, num(o.gain, 0.08)), t + Math.max(0.05, num(o.attack, 3)));

    let head = osc;
    let flt = null;
    if (o.filter) {
      flt = ctx.createBiquadFilter();
      flt.type = o.filter.type || 'lowpass';
      flt.frequency.setValueAtTime(Math.max(20, num(o.filter.freq, 1200)), t);
      flt.Q.setValueAtTime(num(o.filter.Q, 1), t);
      head.connect(flt); head = flt; this._nodes.push(flt);
    }
    head.connect(g);

    let tail = g;
    const p = panner(ctx, o.pan);
    if (p) { g.connect(p); tail = p; this._nodes.push(p); }
    tail.connect(o.dest || this.mix);

    osc.start(t);
    this._sources.push(osc);
    this._nodes.push(g);
    if (o.drift !== false) this._drifters.push(osc.detune);
    return { osc, gain: g, filter: flt, pan: p };
  }

  /** A sustaining looped noise layer. Returns { src, gain, filter }. */
  noiseLayer(o = {}) {
    if (this._dead) return null;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer(ctx, o.color || 'white', 3);
    src.loop = true;
    if (src.playbackRate) src.playbackRate.setValueAtTime(num(o.rate, 1), t);

    const g = ctx.createGain();
    g.gain.setValueAtTime(FLOOR, t);
    g.gain.linearRampToValueAtTime(Math.max(FLOOR, num(o.gain, 0.05)), t + Math.max(0.05, num(o.attack, 4)));

    let head = src;
    let flt = null;
    if (o.filter !== null) {
      const f = o.filter || {};
      flt = ctx.createBiquadFilter();
      flt.type = f.type || 'lowpass';
      flt.frequency.setValueAtTime(Math.max(20, num(f.freq, 800)), t);
      flt.Q.setValueAtTime(num(f.Q, 0.7), t);
      head.connect(flt); head = flt; this._nodes.push(flt);
      if (f.hp) {
        const hp = ctx.createBiquadFilter();
        hp.type = 'highpass';
        hp.frequency.setValueAtTime(f.hp, t);
        head.connect(hp); head = hp; this._nodes.push(hp);
      }
    }
    head.connect(g);

    let tail = g;
    const p = panner(ctx, o.pan);
    if (p) { g.connect(p); tail = p; this._nodes.push(p); }
    tail.connect(o.dest || this.mix);

    src.start(t, Math.random() * 2);
    this._sources.push(src);
    this._nodes.push(g);
    return { src, gain: g, filter: flt };
  }

  /** A low-frequency modulator wired into an AudioParam. */
  lfo(param, { rate = 0.1, depth = 1, type = 'sine', phase = 0 } = {}) {
    if (this._dead || !param) return null;
    const ctx = this.ctx;
    const t = ctx.currentTime + phase;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(0.005, rate), ctx.currentTime);
    const g = ctx.createGain();
    g.gain.setValueAtTime(depth, ctx.currentTime);
    osc.connect(g);
    try { g.connect(param); } catch (e) { /* param not connectable in stub */ }
    osc.start(t);
    this._sources.push(osc);
    this._nodes.push(g);
    return { osc, gain: g };
  }

  /**
   * Repeating scheduled event. `interval` may be a number or a function.
   * Exactly one timer is live at a time and its id is released when it fires,
   * so a long session does not accumulate handles.
   */
  every(interval, cb, { immediate = false } = {}) {
    let id = null;
    const next = () => (typeof interval === 'function' ? interval() : interval) || 1;
    const arm = (ms) => {
      id = setTimeout(run, ms);
      this._timers.add(id);
      this.score._timers.add(id);
    };
    const run = () => {
      this._timers.delete(id);
      this.score._timers.delete(id);
      if (this._dead || this.score._disposed) return;
      if (!this.score._sleeping) {
        const when = this.ctx.currentTime + 0.06;
        try { cb(when); } catch (e) { /* a single bad event must not kill the bed */ }
      }
      arm(Math.max(30, next() * 1000));
    };
    arm(immediate ? 30 : Math.max(30, next() * 1000));
  }

  /** Shorthand for a pluck/blip routed into this bed. */
  hit(fn, when) { if (!this._dead) fn(this.score, this.mix, when); }

  /* --- lifecycle --------------------------------------------------------- */

  fadeIn(t, dur, level = 1) {
    this.out.gain.cancelScheduledValues(t);
    this.out.gain.setValueAtTime(Math.max(FLOOR, this.out.gain.value), t);
    this.out.gain.linearRampToValueAtTime(level, t + Math.max(0.02, dur));
  }

  fadeOutAndDispose(t, dur) {
    if (this._dead) return;
    this.out.gain.cancelScheduledValues(t);
    this.out.gain.setValueAtTime(Math.max(FLOOR, this.out.gain.value), t);
    this.out.gain.linearRampToValueAtTime(FLOOR, t + Math.max(0.02, dur));
    const id = setTimeout(() => this.dispose(), Math.max(50, dur * 1000 + 250));
    this._timers.add(id);
    this.score._timers.add(id);
  }

  update(state) {
    if (this._dead) return;
    const t = this.ctx.currentTime;
    const [lo, hi] = this.colorRange;
    const bright = lo + (hi - lo) * Math.pow(clamp(state.intensity, 0, 1), 0.75);
    this.color.frequency.setValueAtTime(this.color.frequency.value, t);
    this.color.frequency.linearRampToValueAtTime(clamp(bright, 60, 18000), t + 0.9);

    const cut = -(2 + this.hollowDepth * 16) * clamp(state.loneliness, 0, 1);
    this.hollow.gain.setValueAtTime(this.hollow.gain.value, t);
    this.hollow.gain.linearRampToValueAtTime(cut, t + 1.2);

    const w = clamp(this.baseWet == null ? this.wet.gain.value : this.baseWet, 0, 1);
    const target = clamp(w + state.loneliness * 0.35, 0, 1);
    this.wet.gain.setValueAtTime(this.wet.gain.value, t);
    this.wet.gain.linearRampToValueAtTime(target, t + 1.2);

    if (this.onUpdate) { try { this.onUpdate(state, t); } catch (e) { /* ignore */ } }
  }

  dispose() {
    if (this._dead) return;
    this._dead = true;
    for (const id of this._timers) { clearTimeout(id); this.score._timers.delete(id); }
    this._timers.clear();
    const t = this.ctx.currentTime;
    for (const s of this._sources) {
      try { s.stop(t + 0.02); } catch (e) { /* ignore */ }
      try { s.disconnect(); } catch (e) { /* ignore */ }
    }
    for (const n of this._nodes) { try { n.disconnect(); } catch (e) { /* ignore */ } }
    this._sources.length = 0;
    this._nodes.length = 0;
    this._drifters.length = 0;
  }
}

/* ============================================================================
 * 7. Bed recipes
 *
 * The arc: noise (tohu) -> one pitch (day1) -> intervals -> full harmony
 * (day6) -> rest (day7) -> warmth (eden) -> collapse (fall) -> loss (exile).
 * ========================================================================== */

/* --- the void ----------------------------------------------------------- */

function bedTohu(b) {
  b.colorRange = [240, 3200];
  b.baseWet = 0.85;
  b.wet.gain.setValueAtTime(0.85, b.ctx.currentTime);
  b.hollowDepth = 0.4;

  const rumble = b.noiseLayer({ color: 'brown', gain: 0.5, attack: 6, filter: { type: 'lowpass', freq: 70, Q: 0.6 } });
  const mid = b.noiseLayer({ color: 'pink', gain: 0.1, attack: 8, pan: -0.3, filter: { type: 'bandpass', freq: 260, Q: 1.4 } });
  const air = b.noiseLayer({ color: 'white', gain: 0.03, attack: 10, pan: 0.35, filter: { type: 'bandpass', freq: 1800, Q: 0.8 } });

  // inharmonic subs: beating, pitchless, enormous
  const subs = [26.3, 31.1, 41.7, 57.2].map((f, i) =>
    b.drone({ freq: f, type: 'sine', gain: 0.1 - i * 0.015, attack: 9, pan: i % 2 ? 0.4 : -0.4, detune: rnd(-18, 18) })
  );

  if (mid) b.lfo(mid.filter.frequency, { rate: 0.031, depth: 170 });
  if (air) b.lfo(air.gain.gain, { rate: 0.017, depth: 0.025 });
  subs.forEach((s, i) => s && b.lfo(s.gain.gain, { rate: 0.013 + i * 0.007, depth: 0.05, type: 'triangle' }));

  // slow random re-aiming: the void never settles
  b.every(() => rnd(5, 13), (t) => {
    if (mid) mid.filter.frequency.setTargetAtTime(rnd(120, 620), t, 4);
    if (rumble) rumble.gain.gain.setTargetAtTime(rnd(0.34, 0.6), t, 5);
    if (air) air.filter.frequency.setTargetAtTime(rnd(900, 4200), t, 6);
  });

  // distant tectonic groans
  b.every(() => rnd(11, 26), (t) => {
    noise(b.score, b.mix, t, {
      color: 'brown', dur: rnd(5, 9), peak: 0.1, attack: 2.5, pan: rnd(-0.8, 0.8),
      filter: { type: 'lowpass', freq: rnd(90, 220), Q: 2.5, sweepTo: rnd(40, 70), sweepTime: 5 }
    });
  });
}

/* --- the seven days ------------------------------------------------------ */

/** Shared substrate: the primordial noise, thinning as the days proceed. */
function substrate(b, amount) {
  if (amount <= 0) return;
  b.noiseLayer({ color: 'brown', gain: 0.32 * amount, attack: 5, filter: { type: 'lowpass', freq: 68, Q: 0.6 } });
  if (amount > 0.3) {
    b.noiseLayer({ color: 'pink', gain: 0.06 * amount, attack: 7, pan: 0.25, filter: { type: 'bandpass', freq: 400, Q: 1.1 } });
  }
}

function bedDay1(b) {
  b.colorRange = [500, 5200];
  b.baseWet = 0.7;
  b.wet.gain.setValueAtTime(0.7, b.ctx.currentTime);
  substrate(b, 1);

  // one pitch, pulled out of the noise
  const f = degree(0, 1); // D3
  const a = b.drone({ freq: f, type: 'sine', gain: 0.16, attack: 11 });
  const c = b.drone({ freq: f, type: 'triangle', gain: 0.05, attack: 14, detune: 7, pan: 0.3 });
  const sub = b.drone({ freq: f / 4, type: 'sine', gain: 0.14, attack: 12 });
  if (a) b.lfo(a.gain.gain, { rate: 0.038, depth: 0.05 });
  if (c) b.lfo(c.osc.detune, { rate: 0.021, depth: 9 });

  // the pitch flickers into being now and then
  b.every(() => rnd(14, 24), (t) => {
    tone(b.score, b.mix, t, { freq: f * 2, type: 'sine', dur: rnd(6, 10), peak: 0.05, attack: 3, pan: rnd(-0.5, 0.5) });
  });
  b.onUpdate = (s, t) => { if (sub) sub.gain.gain.setTargetAtTime(0.1 + s.intensity * 0.1, t, 2); };
}

function bedDay2(b) {
  b.colorRange = [600, 7000];
  b.baseWet = 0.62;
  b.wet.gain.setValueAtTime(0.62, b.ctx.currentTime);
  b.hollowDepth = 0.5;
  substrate(b, 0.7);

  // waters below
  b.drone({ freq: degree(0, -1), type: 'sine', gain: 0.2, attack: 8 });
  b.drone({ freq: degree(0, 0), type: 'triangle', gain: 0.09, attack: 10, pan: -0.45, detune: -6 });
  // the firmament: a scooped middle
  const gap = b.ctx.createBiquadFilter();
  gap.type = 'peaking';
  gap.frequency.setValueAtTime(700, b.ctx.currentTime);
  gap.Q.setValueAtTime(1.1, b.ctx.currentTime);
  gap.gain.setValueAtTime(-9, b.ctx.currentTime);
  gap.connect(b.mix);
  b._nodes.push(gap);
  // waters above — the fifth, high and thin
  const hi = b.drone({ freq: degree(4, 2), type: 'sine', gain: 0.07, attack: 13, pan: 0.5, dest: gap });
  const hi2 = b.drone({ freq: degree(4, 3), type: 'sine', gain: 0.03, attack: 16, pan: -0.5, dest: gap, detune: 11 });
  if (hi) b.lfo(hi.gain.gain, { rate: 0.027, depth: 0.03 });
  if (hi2) b.lfo(hi2.gain.gain, { rate: 0.019, depth: 0.018 });

  b.every(() => rnd(9, 18), (t) => {
    noise(b.score, b.mix, t, {
      color: 'white', dur: rnd(3, 6), peak: 0.035, attack: 1.6, pan: rnd(-0.9, 0.9),
      filter: { type: 'bandpass', freq: rnd(2200, 5200), Q: 1.4, sweepTo: rnd(900, 1800), sweepTime: 3 }
    });
  });
}

function bedDay3(b) {
  b.colorRange = [700, 8200];
  b.baseWet = 0.5;
  b.wet.gain.setValueAtTime(0.5, b.ctx.currentTime);
  substrate(b, 0.4);

  b.drone({ freq: degree(0, -1), type: 'sine', gain: 0.22, attack: 6 });
  b.drone({ freq: degree(4, -1), type: 'sine', gain: 0.11, attack: 9, pan: 0.3 });
  b.drone({ freq: degree(0, 0), type: 'triangle', gain: 0.07, attack: 10, pan: -0.35, detune: 5 });

  // things growing: plucked motion, organic and irregular
  const degs = [0, 2, 3, 4, 6, 7];
  b.every(() => rnd(0.9, 2.6) / b.density, (t) => {
    const d = pick(degs);
    pluckVoice(b.score, b.mix, t, {
      freq: degree(d, rint(1, 2)), dur: rnd(1.4, 3), peak: rnd(0.05, 0.1),
      pan: rnd(-0.7, 0.7), open: rnd(4, 9)
    });
    if (Math.random() < 0.3) {
      pluckVoice(b.score, b.mix, t + rnd(0.12, 0.3), {
        freq: degree(d + 2, 2), dur: rnd(1, 2), peak: 0.045, pan: rnd(-0.7, 0.7)
      });
    }
  });
  b.onUpdate = (s) => { b.density = 0.6 + s.intensity * 1.2; };
}

function bedDay4(b) {
  b.colorRange = [900, 13000];
  b.baseWet = 0.55;
  b.wet.gain.setValueAtTime(0.55, b.ctx.currentTime);
  substrate(b, 0.25);

  b.drone({ freq: degree(0, -1), type: 'sine', gain: 0.2, attack: 5 });
  b.drone({ freq: degree(4, -1), type: 'sine', gain: 0.1, attack: 7, pan: -0.25 });
  b.drone({ freq: degree(0, 0), type: 'triangle', gain: 0.06, attack: 8, pan: 0.3, detune: -5 });

  // the lights: high partials in slow, independent rotation
  const partials = [4, 6, 7, 9, 11, 13];
  partials.forEach((p, i) => {
    const v = b.drone({
      freq: degree(0, -1) * p, type: 'sine', gain: 0.012 + 0.01 * Math.random(),
      attack: 10 + i * 2, pan: Math.sin(i * 1.9), detune: rnd(-9, 9)
    });
    if (v) {
      b.lfo(v.gain.gain, { rate: 0.013 + i * 0.011, depth: 0.014, type: 'sine', phase: i * 0.4 });
      if (v.pan) b.lfo(v.pan.pan, { rate: 0.008 + i * 0.005, depth: 0.55 });
    }
  });

  b.every(() => rnd(1.6, 4) / b.density, (t) => {
    pluckVoice(b.score, b.mix, t, { freq: degree(pick([0, 2, 4, 6]), 1), dur: rnd(1.6, 3), peak: 0.06, pan: rnd(-0.6, 0.6) });
  });
  b.every(() => rnd(5, 11), (t) => {
    bell(b.score, b.mix, t, { freq: degree(pick([0, 4, 7, 9]), 3), dur: rnd(3, 6), peak: 0.03 });
  });
  b.onUpdate = (s) => { b.density = 0.7 + s.intensity * 1.1; };
}

function bedDay5(b) {
  b.colorRange = [1000, 14000];
  b.baseWet = 0.45;
  b.wet.gain.setValueAtTime(0.45, b.ctx.currentTime);

  b.drone({ freq: degree(0, -1), type: 'sine', gain: 0.18, attack: 4 });
  b.drone({ freq: degree(4, -1), type: 'sine', gain: 0.09, attack: 6, pan: 0.2 });
  b.drone({ freq: degree(2, 0), type: 'triangle', gain: 0.05, attack: 7, pan: -0.3 });
  [4, 6, 9, 11].forEach((p, i) => {
    const v = b.drone({ freq: degree(0, -1) * p, type: 'sine', gain: 0.01, attack: 9, pan: Math.sin(i * 2.1) });
    if (v) b.lfo(v.gain.gain, { rate: 0.017 + i * 0.013, depth: 0.012 });
  });

  // swarms: fast randomised flutters in bursts
  b.every(() => rnd(1.1, 3.2) / b.density, (t) => {
    const n = rint(3, 7);
    const pan = rnd(-0.85, 0.85);
    const base = pick([0, 2, 3, 4, 6]);
    for (let i = 0; i < n; i++) {
      tone(b.score, b.mix, t + i * rnd(0.045, 0.11), {
        freq: degree(base + rint(0, 4), rint(2, 3)), type: 'triangle',
        dur: rnd(0.12, 0.3), peak: rnd(0.025, 0.05), attack: 0.006,
        pan: clamp(pan + rnd(-0.15, 0.15), -1, 1),
        filter: { type: 'bandpass', freq: rnd(1400, 4200), Q: 3 }
      });
    }
  });
  // something large moving in deep water
  b.every(() => rnd(9, 20), (t) => {
    tone(b.score, b.mix, t, {
      freq: degree(0, -2), type: 'sine', dur: rnd(4, 7), peak: 0.16, attack: 1.4,
      glideTo: degree(1, -2), glideTime: 4, pan: rnd(-0.5, 0.5)
    });
  });
  b.onUpdate = (s) => { b.density = 0.6 + s.intensity * 1.6; };
}

function bedDay6(b) {
  b.colorRange = [900, 12500];
  b.baseWet = 0.4;
  b.wet.gain.setValueAtTime(0.4, b.ctx.currentTime);

  // the fullest harmony of the creation: 1 ♭3→3 5 ♭7 stacked warm
  [[0, -1, 0.2, 'sine'], [0, 0, 0.1, 'triangle'], [2, 0, 0.075, 'triangle'],
   [4, 0, 0.07, 'triangle'], [6, 0, 0.045, 'sine'], [0, 1, 0.04, 'sine']]
    .forEach(([d, o, g, type], i) => {
      const v = b.drone({ freq: degree(d, o), type, gain: g, attack: 4 + i, pan: Math.sin(i * 1.7) * 0.5, detune: rnd(-7, 7) });
      if (v) b.lfo(v.gain.gain, { rate: 0.019 + i * 0.009, depth: g * 0.3 });
    });

  // the first pulse of animal life — roughly 62 bpm, two beats
  let bpm = 62;
  b.every(() => 60 / bpm, (t) => {
    thump(b.score, b.mix, t, { freq: 58, dur: 0.42, peak: 0.26, drop: 0.55 });
    thump(b.score, b.mix, t + 0.26, { freq: 52, dur: 0.34, peak: 0.16, drop: 0.6 });
  });

  b.every(() => rnd(2.5, 6) / b.density, (t) => {
    pluckVoice(b.score, b.mix, t, { freq: degree(pick([0, 2, 4, 6, 7]), rint(1, 2)), dur: rnd(2, 4), peak: 0.055, pan: rnd(-0.7, 0.7) });
  });
  b.onUpdate = (s) => { b.density = 0.6 + s.intensity * 1.3; bpm = 54 + s.intensity * 22; };
}

function bedDay7(b) {
  b.colorRange = [1200, 9000];
  b.baseWet = 0.62;
  b.wet.gain.setValueAtTime(0.62, b.ctx.currentTime);

  // everything stripped away: one golden chord over a very deep silence
  [[0, -2, 0.13, 'sine'], [0, 0, 0.075, 'sine'], [4, 0, 0.055, 'sine'],
   [2, 1, 0.035, 'sine'], [0, 2, 0.018, 'sine']]
    .forEach(([d, o, g, type], i) => {
      const v = b.drone({ freq: degree(d, o), type, gain: g, attack: 9 + i * 2.5, pan: Math.sin(i * 2.3) * 0.45, detune: rnd(-4, 4) });
      if (v) b.lfo(v.gain.gain, { rate: 0.008 + i * 0.005, depth: g * 0.45 });
    });
  b.driftCents = 2;

  // one long exhale every half-minute or so, and nothing else
  b.every(() => rnd(22, 38), (t) => {
    noise(b.score, b.mix, t, {
      color: 'pink', dur: rnd(7, 11), peak: 0.03, attack: 3.5, pan: rnd(-0.4, 0.4),
      filter: { type: 'lowpass', freq: 900, Q: 0.7, sweepTo: 300, sweepTime: 7 }
    });
    bell(b.score, b.mix, t + rnd(1, 4), { freq: degree(0, 2), dur: rnd(9, 14), peak: 0.024 });
  });
}

/* --- the garden ---------------------------------------------------------- */

/**
 * Shared Eden material. `loneliness` hollows the middle; `transpose` and
 * `muffle` turn it into the exile version heard from outside the wall.
 */
function edenCore(b, { transpose = 0, muffle = 0, sparse = 1, birds = 1 } = {}) {
  const root = semi(ROOT, transpose);
  const f = (d, o) => degree(d, o, EDENIC, root);

  b.colorRange = muffle ? [320, 900] : [1100, 14000];
  b.baseWet = 0.38 + muffle * 0.3;
  b.wet.gain.setValueAtTime(b.baseWet, b.ctx.currentTime);

  [[0, -1, 0.19, 'sine'], [4, -1, 0.1, 'sine'], [0, 0, 0.08, 'triangle'],
   [2, 0, 0.06, 'triangle'], [4, 0, 0.045, 'sine'], [6, 0, 0.03, 'sine']]
    .forEach(([d, o, g, type], i) => {
      const v = b.drone({
        freq: f(d, o), type, gain: g, attack: 4 + i * 1.5,
        pan: Math.sin(i * 1.6) * 0.5, detune: rnd(-6, 6)
      });
      if (v) b.lfo(v.gain.gain, { rate: 0.014 + i * 0.008, depth: g * 0.35, phase: i * 0.3 });
    });

  if (muffle) {
    const wall = b.ctx.createBiquadFilter();
    wall.type = 'highpass';
    wall.frequency.setValueAtTime(190, b.ctx.currentTime);
    b.color.disconnect();
    b.color.connect(wall);
    wall.connect(b.out);
    b._nodes.push(wall);
  }

  // gentle melodic motion through the garden
  b.every(() => rnd(2.4, 5.5) * sparse / b.density, (t) => {
    const d = pick([0, 1, 2, 4, 5]);
    pluckVoice(b.score, b.mix, t, {
      freq: f(d, rint(1, 2)), dur: rnd(2.4, 4.5), peak: rnd(0.045, 0.085),
      pan: rnd(-0.6, 0.6), open: rnd(5, 10)
    });
    if (Math.random() < 0.45) {
      pluckVoice(b.score, b.mix, t + rnd(0.25, 0.7), { freq: f(d + 2, 2), dur: rnd(2, 3.5), peak: 0.04, pan: rnd(-0.6, 0.6) });
    }
  });

  // birdlike high flickers
  if (birds > 0) {
    b.every(() => rnd(3, 9) / birds, (t) => {
      const base = f(pick([4, 6, 7, 9]), 3);
      const n = rint(2, 4);
      for (let i = 0; i < n; i++) {
        tone(b.score, b.mix, t + i * rnd(0.06, 0.14), {
          freq: base * rnd(0.95, 1.5), type: 'sine', dur: rnd(0.08, 0.18),
          peak: rnd(0.02, 0.04), attack: 0.005, pan: rnd(-0.9, 0.9),
          glideTo: base * rnd(1.1, 1.9), glideTime: 0.1,
          filter: { type: 'bandpass', freq: rnd(2600, 6000), Q: 4 }
        });
      }
    });
  }
  b.onUpdate = (s) => { b.density = 0.6 + s.intensity * 1.2; };
}

function bedEden(b) { edenCore(b, {}); }

function bedLoneliness(b) {
  edenCore(b, { sparse: 2.1, birds: 0.35 });
  b.hollowDepth = 1;
  b.hollow.frequency.setValueAtTime(620, b.ctx.currentTime);
  b.hollow.Q.setValueAtTime(0.75, b.ctx.currentTime);
  b.hollow.gain.setValueAtTime(-7, b.ctx.currentTime);
  b.driftCents = 9;
  b.baseWet = 0.55;
  b.wet.gain.setValueAtTime(0.55, b.ctx.currentTime);

  // a single voice calling into the empty middle register
  b.every(() => rnd(13, 26), (t) => {
    tone(b.score, b.mix, t, {
      freq: degree(0, 1, EDENIC), type: 'sine', dur: rnd(5, 8), peak: 0.05, attack: 2.2,
      pan: rnd(-0.3, 0.3), detune: rnd(-14, 14)
    });
  });

  const base = b.onUpdate;
  b.onUpdate = (s, t) => {
    if (base) base(s, t);
    b.score.reverb.setTone(7200 - s.loneliness * 4200, t);
  };
}

function bedTardemah(b) {
  b.colorRange = [220, 1400];
  b.baseWet = 0.6;
  b.wet.gain.setValueAtTime(0.6, b.ctx.currentTime);
  b.driftCents = 14;

  const voices = [];
  [[0, -1, 0.2], [4, -1, 0.1], [0, 0, 0.07], [2, 0, 0.05]].forEach(([d, o, g], i) => {
    const v = b.drone({ freq: degree(d, o, EDENIC), type: 'sine', gain: g, attack: 5 + i * 2, pan: Math.sin(i * 2) * 0.5 });
    if (v) { voices.push(v); b.lfo(v.gain.gain, { rate: 0.01 + i * 0.006, depth: g * 0.4 }); }
  });

  b.noiseLayer({ color: 'brown', gain: 0.12, attack: 6, filter: { type: 'lowpass', freq: 160, Q: 0.7 } });

  // dreamlike pitch bends
  b.every(() => rnd(6, 13), (t) => {
    for (const v of voices) {
      const f = v.osc.frequency;
      const cur = Math.max(8, f.value);
      f.cancelScheduledValues(t);
      f.setValueAtTime(cur, t);
      f.exponentialRampToValueAtTime(Math.max(8, cur * rnd(0.96, 1.05)), t + rnd(3, 7));
    }
  });

  // a slowed heartbeat, heard through water
  let bpm = 41;
  b.every(() => 60 / bpm, (t) => {
    thump(b.score, b.mix, t, { freq: 46, dur: 0.75, peak: 0.3, drop: 0.5 });
    thump(b.score, b.mix, t + 0.36, { freq: 42, dur: 0.6, peak: 0.17, drop: 0.55 });
  });
  b.onUpdate = (s) => { bpm = 36 + s.intensity * 12; };
}

function bedEve(b) {
  b.colorRange = [1400, 15000];
  b.baseWet = 0.42;
  b.wet.gain.setValueAtTime(0.42, b.ctx.currentTime);
  b.driftCents = 2;

  // the first unambiguous consonance in the whole score — let it bloom
  const r = ROOT;
  [[0, -1, 0.18, 'sine', 3], [0, 0, 0.1, 'sine', 4], [4, 0, 0.085, 'sine', 5],
   [2, 0, 0.08, 'triangle', 6], [0, 1, 0.05, 'sine', 7], [4, 1, 0.035, 'sine', 9],
   [2, 2, 0.02, 'sine', 11]]
    .forEach(([d, o, g, type, at], i) => {
      const v = b.drone({ freq: degree(d, o, EDENIC, r), type, gain: g, attack: at, pan: Math.sin(i * 1.4) * 0.55, detune: rnd(-3, 3) });
      if (v) b.lfo(v.gain.gain, { rate: 0.012 + i * 0.007, depth: g * 0.3 });
    });

  // a rising figure that keeps opening upward
  b.every(() => rnd(4, 8), (t) => {
    const start = pick([0, 2, 4]);
    for (let i = 0; i < 4; i++) {
      pluckVoice(b.score, b.mix, t + i * rnd(0.2, 0.33), {
        freq: degree(start + i * 2, 2, EDENIC, r), dur: rnd(2.5, 4.5),
        peak: 0.07 - i * 0.008, pan: rnd(-0.5, 0.5), open: 9
      });
    }
  });
  b.every(() => rnd(9, 16), (t) => {
    bell(b.score, b.mix, t, { freq: degree(pick([0, 4, 7]), 3, EDENIC, r), dur: rnd(5, 9), peak: 0.035 });
  });
}

/* --- the serpent and the fall ------------------------------------------- */

function serpentCore(b, { creep = 0 } = {}) {
  b.colorRange = [1100, 9000];
  b.baseWet = 0.14; // close and dry: he is standing right next to you
  b.wet.gain.setValueAtTime(0.14, b.ctx.currentTime);
  b.driftCents = 6;

  // sweet surface
  const surface = [];
  [[0, 0, 0.075, 'sine'], [2, 0, 0.06, 'sine'], [4, 0, 0.045, 'triangle']].forEach(([d, o, g, type], i) => {
    const v = b.drone({ freq: degree(d, o, EDENIC), type, gain: g, attack: 3 + i, pan: Math.sin(i * 1.8) * 0.4 });
    if (v) { surface.push(v); b.lfo(v.gain.gain, { rate: 0.03 + i * 0.011, depth: g * 0.3 }); }
  });

  // underneath: a low voice creeping chromatically, never quite still
  const low = b.drone({ freq: degree(0, -1), type: 'sawtooth', gain: 0.085, attack: 4, filter: { type: 'lowpass', freq: 180, Q: 1.2 } });
  let step = 0;
  b.every(() => rnd(7, 13), (t) => {
    if (!low) return;
    step = (step + (Math.random() < 0.7 ? 1 : -1));
    step = clamp(step, -3, 3);
    const f = low.osc.frequency;
    f.cancelScheduledValues(t);
    f.setValueAtTime(Math.max(8, f.value), t);
    f.exponentialRampToValueAtTime(Math.max(8, semi(degree(0, -1), step)), t + rnd(5, 9));
  });

  // sibilance, barely there
  b.every(() => rnd(5, 12), (t) => {
    noise(b.score, b.mix, t, {
      color: 'white', dur: rnd(0.5, 1.4), peak: 0.022, attack: 0.25, pan: rnd(-0.8, 0.8),
      filter: { type: 'bandpass', freq: rnd(3800, 7200), Q: 2.2, sweepTo: rnd(2200, 4000), sweepTime: 0.9 }
    });
  });

  if (creep) {
    // the floor rises by two semitones over ~2.5 minutes; you are not meant to notice
    const t0 = b.ctx.currentTime;
    const span = 150;
    for (const v of surface.concat(low ? [low] : [])) {
      v.osc.detune.cancelScheduledValues(t0);
      v.osc.detune.setValueAtTime(v.osc.detune.value, t0);
      v.osc.detune.linearRampToValueAtTime(200, t0 + span);
    }
    b._drifters.length = 0; // let the creep own the detune
    b.every(() => rnd(16, 28), (t) => {
      tone(b.score, b.mix, t, {
        freq: degree(1, 1), type: 'sine', dur: rnd(4, 7), peak: 0.035, attack: 2,
        pan: rnd(-0.6, 0.6), glideTo: degree(2, 1), glideTime: 5
      });
    });
  }
}

function bedSerpent(b) { serpentCore(b, {}); }
function bedTemptation(b) { serpentCore(b, { creep: 1 }); }

function bedFall(b) {
  b.colorRange = [300, 4200];
  b.baseWet = 0.55;
  b.wet.gain.setValueAtTime(0.55, b.ctx.currentTime);
  b.hollowDepth = 0.8;
  b.driftCents = 22;

  // the centre drops a semitone and the stack detunes against itself
  const r = semi(ROOT, -1);
  const t0 = b.ctx.currentTime;
  [[0, -1, 0.22, 'sine'], [0, 0, 0.1, 'sawtooth'], [1, 0, 0.07, 'triangle'],
   [4, 0, 0.06, 'sawtooth'], [0, 1, 0.035, 'triangle']]
    .forEach(([d, o, g, type], i) => {
      const v = b.drone({
        freq: degree(d, o, AHAVA, r), type, gain: g, attack: 0.6 + i * 0.3,
        pan: Math.sin(i * 1.5) * 0.6, detune: 0,
        filter: { type: 'lowpass', freq: 2200 - i * 180, Q: 1.1 }
      });
      if (v) {
        const amt = (i % 2 ? 1 : -1) * (12 + i * 11);
        v.osc.detune.setValueAtTime(0, t0);
        v.osc.detune.linearRampToValueAtTime(amt, t0 + rnd(6, 14));
      }
    });

  b.noiseLayer({ color: 'brown', gain: 0.22, attack: 2, filter: { type: 'lowpass', freq: 130, Q: 1 } });

  b.every(() => rnd(6, 14), (t) => {
    noise(b.score, b.mix, t, {
      color: 'brown', dur: rnd(3, 6), peak: 0.12, attack: 0.8, pan: rnd(-0.7, 0.7),
      filter: { type: 'lowpass', freq: rnd(400, 900), Q: 3, sweepTo: 90, sweepTime: 4 }
    });
  });
  b.every(() => rnd(10, 20), (t) => {
    tone(b.score, b.mix, t, {
      freq: degree(0, 0, AHAVA, r), type: 'sawtooth', dur: rnd(5, 9), peak: 0.05, attack: 1.5,
      glideTo: degree(0, 0, AHAVA, r) * 0.94, glideTime: 7, pan: rnd(-0.5, 0.5),
      filter: { type: 'lowpass', freq: 1400, Q: 2, sweepTo: 300, sweepTime: 6 }
    });
  });
}

/* --- after ---------------------------------------------------------------- */

function bedHiding(b) {
  b.colorRange = [220, 2600];
  b.baseWet = 0.3;
  b.wet.gain.setValueAtTime(0.3, b.ctx.currentTime);

  // room tone and almost nothing else
  b.noiseLayer({ color: 'brown', gain: 0.1, attack: 4, filter: { type: 'lowpass', freq: 110, Q: 0.6 } });
  b.noiseLayer({ color: 'pink', gain: 0.018, attack: 6, pan: -0.2, filter: { type: 'bandpass', freq: 520, Q: 0.8 } });
  const v = b.drone({ freq: degree(0, -2), type: 'sine', gain: 0.09, attack: 8 });
  if (v) b.lfo(v.gain.gain, { rate: 0.023, depth: 0.03 });

  // held breath
  b.every(() => rnd(3.5, 7), (t) => {
    noise(b.score, b.mix, t, {
      color: 'white', dur: rnd(0.8, 1.5), peak: rnd(0.02, 0.04), attack: 0.35, pan: rnd(-0.25, 0.25),
      filter: { type: 'bandpass', freq: rnd(500, 1100), Q: 1.4, sweepTo: rnd(300, 700), sweepTime: 1 }
    });
  });

  // a distant tread, coming closer and not arriving
  b.every(() => rnd(3.2, 5.5), (t) => {
    const near = rnd(0.25, 0.75);
    thump(b.score, b.mix, t, { freq: rnd(44, 58), dur: 0.7, peak: 0.1 * near, drop: 0.5, pan: rnd(-0.7, 0.7) });
  });
}

function bedJudgment(b) {
  b.colorRange = [320, 5200];
  b.baseWet = 0.5;
  b.wet.gain.setValueAtTime(0.5, b.ctx.currentTime);
  b.driftCents = 3;

  // low brass-like saw stacks: slow, immense, unhurried
  const stack = [[0, -2, 0.2], [0, -1, 0.14], [4, -1, 0.1], [0, 0, 0.07], [3, 0, 0.05], [6, 0, 0.035]];
  const voices = [];
  stack.forEach(([d, o, g], i) => {
    const v = b.drone({
      freq: degree(d, o), type: i < 4 ? 'sawtooth' : 'triangle', gain: g, attack: 6 + i * 2,
      pan: Math.sin(i * 1.3) * 0.5, detune: rnd(-8, 8),
      filter: { type: 'lowpass', freq: 500 + i * 120, Q: 1.3 }
    });
    if (v) voices.push(v);
  });

  // immense swells that take half a minute to arrive
  b.every(() => rnd(18, 30), (t) => {
    for (const v of voices) {
      if (!v.filter) continue;
      const f = v.filter.frequency;
      f.cancelScheduledValues(t);
      f.setValueAtTime(Math.max(20, f.value), t);
      f.linearRampToValueAtTime(rnd(1400, 3000), t + rnd(7, 12));
      f.linearRampToValueAtTime(rnd(320, 620), t + rnd(16, 24));
    }
    thump(b.score, b.mix, t + rnd(2, 6), { freq: 38, dur: 2.4, peak: 0.3, drop: 0.7 });
  });

  b.onUpdate = (s, t) => {
    for (const v of voices) {
      if (v.gain) v.gain.gain.setTargetAtTime(clamp(0.06 + s.intensity * 0.12, 0.02, 0.22), t, 3);
    }
  };
}

function bedExile(b) {
  // Eden itself, a fourth down and heard through a wall you cannot re-enter.
  edenCore(b, { transpose: -5, muffle: 1, sparse: 1.8, birds: 0.25 });
  b.baseWet = 0.62;
  b.wet.gain.setValueAtTime(0.62, b.ctx.currentTime);
  b.hollowDepth = 0.7;
  b.driftCents = 7;

  // wind outside the gate
  b.noiseLayer({ color: 'pink', gain: 0.07, attack: 7, filter: { type: 'bandpass', freq: 380, Q: 0.6 } });
  b.every(() => rnd(8, 18), (t) => {
    noise(b.score, b.mix, t, {
      color: 'pink', dur: rnd(5, 10), peak: 0.06, attack: 2.5, pan: rnd(-0.9, 0.9),
      filter: { type: 'bandpass', freq: rnd(260, 700), Q: 1.1, sweepTo: rnd(140, 320), sweepTime: 6 }
    });
  });
}

function bedEpilogue(b) {
  b.colorRange = [900, 7000];
  b.baseWet = 0.72;
  b.wet.gain.setValueAtTime(0.72, b.ctx.currentTime);
  b.driftCents = 1;

  const strike = (t) => {
    bell(b.score, b.mix, t, {
      freq: degree(0, 1), dur: rnd(16, 24), peak: 0.07,
      ratios: [1, 2, 3.01, 4.02, 5.98]
    });
    tone(b.score, b.mix, t, { freq: degree(0, -1), type: 'sine', dur: rnd(14, 20), peak: 0.08, attack: 0.8 });
  };
  b.every(() => rnd(26, 40), strike, { immediate: true });
}

const BED_RECIPES = {
  silence: () => {},
  tohu: bedTohu,
  day1: bedDay1, day2: bedDay2, day3: bedDay3, day4: bedDay4,
  day5: bedDay5, day6: bedDay6, day7: bedDay7,
  eden: bedEden,
  loneliness: bedLoneliness,
  tardemah: bedTardemah,
  eve: bedEve,
  serpent: bedSerpent,
  temptation: bedTemptation,
  fall: bedFall,
  hiding: bedHiding,
  judgment: bedJudgment,
  exile: bedExile,
  epilogue: bedEpilogue
};

/* ============================================================================
 * 8. Cues
 *
 * Each cue builds its own short-lived graph into a per-cue routing node, and
 * every node it creates is torn down when the last source ends.
 * ========================================================================== */

/** Vowel-ish formant pairs — the raw material of the divine voice. */
const VOWELS = {
  aa: [730, 1090], eh: [530, 1840], ee: [270, 2290],
  oh: [570, 840], oo: [300, 870], uh: [640, 1190], ah: [700, 1220]
};

/** Per-day utterance: same voice, different word. */
const WORD_DAYS = [
  { deg: 0, oct: -1, path: ['oo', 'oh', 'aa'], len: 4.6 },
  { deg: 0, oct: -1, path: ['oh', 'aa', 'ee'], len: 4.2 },
  { deg: 4, oct: -1, path: ['aa', 'uh', 'oh'], len: 4.4 },
  { deg: 2, oct: -1, path: ['eh', 'ee', 'aa'], len: 4.0 },
  { deg: 6, oct: -1, path: ['oh', 'ee', 'eh'], len: 4.3 },
  { deg: 3, oct: -1, path: ['aa', 'eh', 'ee'], len: 4.5 },
  { deg: 5, oct: -1, path: ['uh', 'oh', 'aa'], len: 5.2 },
  { deg: 0, oct: -2, path: ['oo', 'uh', 'oh'], len: 7.0 }
];

/**
 * 'word' — speech that is not speech. A harmonic stack driven through a pair
 * of sweeping formant bandpasses, with a consonantal onset and a tail that
 * blooms into the reverb after the voice itself has gone.
 */
function cueWord(s, o = {}) {
  const ctx = s.ctx;
  const t = ctx.currentTime + 0.02;
  const day = clamp(Math.round(num(o.day, 1)), 1, 8);
  const spec = WORD_DAYS[day - 1];
  const scale = day >= 7 ? EDENIC : AHAVA;
  const f0 = degree(spec.deg, spec.oct, scale) * (o.octave ? Math.pow(2, o.octave) : 1);
  const dur = spec.len * num(o.length, 1);
  const gain = clamp(num(o.gain, 1), 0, 2);

  const ttl = dur * 2 + 3;
  const bus = s._cueBus(0.5, 0.18, ttl);
  const body = ctx.createGain();
  body.gain.setValueAtTime(FLOOR, t);

  // two formants in parallel, swept through the vowel path
  const formants = spec.path.map((v, i) => VOWELS[v] || VOWELS.aa);
  const fNodes = [];
  for (let k = 0; k < 2; k++) {
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.Q.setValueAtTime(k === 0 ? 5.5 : 7.5, t);
    f.frequency.setValueAtTime(formants[0][k], t);
    const seg = dur * 0.45 / (formants.length - 1 || 1);
    formants.forEach((fm, i) => {
      if (i === 0) return;
      f.frequency.linearRampToValueAtTime(fm[k] * rnd(0.94, 1.06), t + 0.08 + seg * i);
    });
    f.frequency.linearRampToValueAtTime(formants[formants.length - 1][k] * 0.8, t + dur * 0.8);
    const fg = ctx.createGain();
    fg.gain.setValueAtTime(k === 0 ? 1 : 0.6, t);
    body.connect(f); f.connect(fg); fg.connect(bus);
    fNodes.push(f, fg);
  }
  // a darkened direct path keeps the fundamental present
  const direct = ctx.createBiquadFilter();
  direct.type = 'lowpass';
  direct.frequency.setValueAtTime(f0 * 6, t);
  direct.Q.setValueAtTime(0.7, t);
  const directG = ctx.createGain();
  directG.gain.setValueAtTime(0.45, t);
  body.connect(direct); direct.connect(directG); directG.connect(bus);

  // the harmonic stack
  const srcs = [];
  const nodes = [body, direct, directG, bus].concat(fNodes);
  const partials = [1, 2, 3, 4, 5, 6, 7, 9];
  partials.forEach((n, i) => {
    const osc = ctx.createOscillator();
    osc.type = n === 1 ? 'triangle' : 'sine';
    osc.frequency.setValueAtTime(f0 * n, t);
    osc.detune.setValueAtTime(rnd(-7, 7) * (1 + i * 0.1), t);
    // the voice settles slightly flat as it speaks
    osc.frequency.exponentialRampToValueAtTime(Math.max(8, f0 * n * 0.988), t + dur);
    const g = ctx.createGain();
    const amp = (0.5 / (1 + i * 0.85)) * gain;
    g.gain.setValueAtTime(FLOOR, t);
    g.gain.linearRampToValueAtTime(amp, t + 0.012 + i * 0.004);
    g.gain.exponentialRampToValueAtTime(Math.max(FLOOR, amp * 0.3), t + dur * 0.35);
    g.gain.exponentialRampToValueAtTime(FLOOR, t + dur);
    osc.connect(g); g.connect(body);
    osc.start(t);
    srcs.push(osc); nodes.push(g);
  });

  // slow vibrato: alive, not mechanical
  const vib = ctx.createOscillator();
  const vibG = ctx.createGain();
  vib.frequency.setValueAtTime(rnd(4.1, 5.4), t);
  vibG.gain.setValueAtTime(0, t);
  vibG.gain.linearRampToValueAtTime(rnd(3, 7), t + dur * 0.4);
  vib.connect(vibG);
  try { vibG.connect(srcs[0].detune); } catch (e) { /* ignore */ }
  vib.start(t); srcs.push(vib); nodes.push(vibG);

  // body envelope: sharp onset, long bloom
  body.gain.setValueAtTime(FLOOR, t);
  body.gain.linearRampToValueAtTime(0.55 * gain, t + 0.014);
  body.gain.exponentialRampToValueAtTime(Math.max(FLOOR, 0.3 * gain), t + 0.5);
  body.gain.exponentialRampToValueAtTime(FLOOR, t + dur * 1.02);

  life(s, srcs, nodes, t + dur + 0.2);

  // consonantal onset
  noise(s, s._cueBus(0.3, 0, 2), t, {
    dur: 0.09, peak: 0.16 * gain, attack: 0.001,
    filter: { type: 'bandpass', freq: formants[0][1] * 1.4, Q: 1.6, sweepTo: formants[0][0], sweepTime: 0.08 }
  });
  // sub-weight under the utterance
  tone(s, s._cueBus(0.25, 0, ttl), t, {
    freq: f0 / 2, type: 'sine', dur: dur * 0.75, peak: 0.22 * gain, attack: 0.02
  });
  // the tail blooms into the room after the voice stops
  const bloom = s._cueBus(1, 0.1, ttl);
  bloom.gain.setValueAtTime(FLOOR, t);
  bloom.gain.linearRampToValueAtTime(0.22 * gain, t + dur * 0.55);
  bloom.gain.exponentialRampToValueAtTime(FLOOR, t + dur * 1.6);
  tone(s, bloom, t + dur * 0.2, {
    freq: f0 * 2, type: 'sine', dur: dur * 1.3, peak: 0.3, attack: dur * 0.3,
    filter: { type: 'lowpass', freq: f0 * 12, Q: 0.7, sweepTo: f0 * 3, sweepTime: dur }
  });
}

const CUES = {
  word: cueWord,

  light: (s) => {
    const t = s.ctx.currentTime + 0.01;
    const d = s._cueBus(0.6, 0.1);
    noise(s, d, t, {
      color: 'white', dur: 2.6, peak: 0.16, attack: 0.9,
      filter: { type: 'bandpass', freq: 220, Q: 1.1, sweepTo: 7200, sweepTime: 1.5 }
    });
    [0, 4, 7, 11].forEach((deg, i) => {
      tone(s, d, t + 0.35 + i * 0.05, {
        freq: degree(deg, 1, EDENIC), type: 'sine', dur: 4.5 - i * 0.4,
        peak: 0.12 / (1 + i * 0.5), attack: 0.5, pan: Math.sin(i * 2) * 0.6
      });
    });
    tone(s, d, t, { freq: degree(0, -1), type: 'sine', dur: 3.2, peak: 0.2, attack: 0.3 });
  },

  separate: (s) => {
    const t = s.ctx.currentTime + 0.01;
    const d = s._cueBus(0.45, 0);
    const f = degree(0, 0);
    tone(s, d, t, { freq: f, type: 'triangle', dur: 2.8, peak: 0.12, attack: 0.08, pan: -0.1, glideTo: f / 2, glideTime: 1.8 });
    tone(s, d, t, { freq: f, type: 'triangle', dur: 2.8, peak: 0.12, attack: 0.08, pan: 0.1, glideTo: f * 3, glideTime: 1.8 });
    noise(s, d, t, { dur: 1.4, peak: 0.06, attack: 0.3, filter: { type: 'bandpass', freq: 900, Q: 0.9, sweepTo: 2600, sweepTime: 1.2 } });
  },

  land: (s) => {
    const t = s.ctx.currentTime + 0.01;
    const d = s._cueBus(0.4, 0);
    thump(s, d, t, { freq: 52, dur: 1.8, peak: 0.5, drop: 0.45 });
    noise(s, d, t + 0.02, {
      color: 'brown', dur: 1.6, peak: 0.16, attack: 0.01,
      filter: { type: 'lowpass', freq: 900, Q: 1.6, sweepTo: 140, sweepTime: 1.2 }
    });
    tone(s, d, t + 0.05, { freq: degree(0, -1), type: 'triangle', dur: 3.4, peak: 0.13, attack: 0.1 });
  },

  growth: (s) => {
    const t = s.ctx.currentTime + 0.01;
    const d = s._cueBus(0.5, 0.12);
    for (let i = 0; i < 6; i++) {
      pluckVoice(s, d, t + i * rnd(0.1, 0.17), {
        freq: degree(i * 2, 1), dur: rnd(1.6, 2.8), peak: 0.085 - i * 0.008,
        pan: rnd(-0.6, 0.6), open: 5 + i
      });
    }
    noise(s, d, t, { color: 'pink', dur: 1.8, peak: 0.05, attack: 0.5, filter: { type: 'bandpass', freq: 600, Q: 1, sweepTo: 3200, sweepTime: 1.4 } });
  },

  stars: (s) => {
    const t = s.ctx.currentTime + 0.01;
    const d = s._cueBus(0.8, 0.2);
    for (let i = 0; i < 9; i++) {
      bell(s, d, t + rnd(0, 1.9), {
        freq: degree(pick([0, 2, 4, 6, 7, 9]), rint(2, 3)), dur: rnd(2, 5),
        peak: rnd(0.018, 0.038), pan: rnd(-0.9, 0.9)
      });
    }
  },

  swarm: (s) => {
    const t = s.ctx.currentTime + 0.01;
    const d = s._cueBus(0.35, 0.1);
    noise(s, d, t, { dur: 1.3, peak: 0.07, attack: 0.15, filter: { type: 'bandpass', freq: 2400, Q: 6, sweepTo: 1100, sweepTime: 1 } });
    for (let i = 0; i < 14; i++) {
      tone(s, d, t + i * rnd(0.03, 0.09), {
        freq: degree(rint(0, 8), rint(2, 3)), type: 'triangle', dur: rnd(0.1, 0.24),
        peak: rnd(0.02, 0.045), attack: 0.005, pan: rnd(-0.9, 0.9),
        filter: { type: 'bandpass', freq: rnd(1600, 5000), Q: 4 }
      });
    }
  },

  wings: (s) => {
    const t = s.ctx.currentTime + 0.01;
    const d = s._cueBus(0.4, 0);
    const ctx = s.ctx;
    const dur = 1.5;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer(ctx, 'pink', 3);
    src.loop = true;
    const flt = ctx.createBiquadFilter();
    flt.type = 'bandpass';
    flt.frequency.setValueAtTime(700, t);
    flt.Q.setValueAtTime(1.4, t);
    flt.frequency.linearRampToValueAtTime(1500, t + dur);
    const g = ctx.createGain();
    const p = panner(ctx, -0.7);
    const nodes = [flt, g, d];
    src.connect(flt); flt.connect(g);
    if (p) { g.connect(p); p.connect(d); nodes.push(p); p.pan.linearRampToValueAtTime(0.7, t + dur); }
    else g.connect(d);
    // wing-beat amplitude
    g.gain.setValueAtTime(FLOOR, t);
    const beats = 11;
    for (let i = 0; i < beats; i++) {
      const bt = t + 0.02 + i * (dur / beats);
      g.gain.linearRampToValueAtTime(0.11 * (1 - i / beats * 0.6), bt);
      g.gain.linearRampToValueAtTime(0.012, bt + dur / beats * 0.55);
    }
    g.gain.exponentialRampToValueAtTime(FLOOR, t + dur + 0.2);
    src.start(t, Math.random());
    life(s, src, nodes, t + dur + 0.3);
  },

  breath: (s) => {
    const t = s.ctx.currentTime + 0.01;
    const d = s._cueBus(0.45, 0);
    noise(s, d, t, {
      color: 'white', dur: 1.5, peak: 0.1, attack: 0.7,
      filter: { type: 'bandpass', freq: 420, Q: 1.1, sweepTo: 1400, sweepTime: 1.3, hp: 180 }
    });
    noise(s, d, t + 1.5, {
      color: 'white', dur: 2.6, peak: 0.085, attack: 0.25,
      filter: { type: 'bandpass', freq: 1300, Q: 1.3, sweepTo: 330, sweepTime: 2.2, hp: 150 }
    });
    tone(s, d, t + 1.45, { freq: degree(0, 0), type: 'sine', dur: 4.5, peak: 0.08, attack: 1.1 });
    tone(s, d, t + 1.45, { freq: degree(4, 0), type: 'sine', dur: 4, peak: 0.05, attack: 1.4, pan: 0.3 });
  },

  rest: (s) => {
    const t = s.ctx.currentTime + 0.01;
    const d = s._cueBus(0.8, 0.1);
    [[0, -1, 0.14], [0, 0, 0.08], [4, 0, 0.06], [2, 1, 0.035]].forEach(([deg, o, g], i) => {
      tone(s, d, t + i * 0.04, { freq: degree(deg, o, EDENIC), type: 'sine', dur: 7 - i * 0.5, peak: g, attack: 0.6, pan: Math.sin(i * 2) * 0.4 });
    });
  },

  name: (s, o = {}) => {
    const t = s.ctx.currentTime + 0.01;
    const d = s._cueBus(0.4, 0.08, 4);
    const a = rint(0, 5);
    const b = a + pick([1, 2, 2, 3, -2]);
    pluckVoice(s, d, t, { freq: degree(a, 1, EDENIC), dur: 1.9, peak: 0.08, pan: -0.15, open: 8 });
    pluckVoice(s, d, t + rnd(0.18, 0.3), { freq: degree(b, 1, EDENIC), dur: 2.4, peak: 0.07, pan: 0.15, open: 9 });
    tone(s, d, t, { freq: degree(a, -1, EDENIC), type: 'sine', dur: 2.6, peak: num(o.gain, 0.07), attack: 0.3 });
  },

  heartbeat: (s, o = {}) => {
    const t = s.ctx.currentTime + 0.01;
    const d = s._cueBus(0.2, 0, 2);
    const g = clamp(num(o.gain, 1), 0, 2);
    thump(s, d, t, { freq: 58, dur: 0.45, peak: 0.34 * g, drop: 0.55 });
    thump(s, d, t + 0.27, { freq: 50, dur: 0.38, peak: 0.21 * g, drop: 0.6 });
  },

  rib: (s) => {
    const t = s.ctx.currentTime + 0.01;
    const d = s._cueBus(0.55, 0);
    // a dry snap, then something drawn out of the body
    noise(s, d, t, { dur: 0.07, peak: 0.22, attack: 0.0012, filter: { type: 'bandpass', freq: 2300, Q: 1.1, sweepTo: 700, sweepTime: 0.06 } });
    thump(s, d, t, { freq: 90, dur: 0.3, peak: 0.2, drop: 0.5, grit: false });
    tone(s, d, t + 0.03, {
      freq: degree(0, 0), type: 'triangle', dur: 3.4, peak: 0.12, attack: 0.03,
      glideTo: degree(4, 1), glideTime: 2.4,
      filter: { type: 'bandpass', freq: 700, Q: 3.5, sweepTo: 2600, sweepTime: 2.4 }
    });
    bell(s, d, t + 0.4, { freq: degree(4, 2, EDENIC), dur: 3.6, peak: 0.03 });
  },

  awake: (s) => {
    const t = s.ctx.currentTime + 0.01;
    const d = s._cueBus(0.6, 0.12);
    noise(s, d, t, { color: 'pink', dur: 2.4, peak: 0.07, attack: 1.3, filter: { type: 'lowpass', freq: 300, Q: 1, sweepTo: 6000, sweepTime: 2 } });
    [[0, -1, 0.14], [0, 0, 0.09], [2, 0, 0.075], [4, 0, 0.06], [0, 1, 0.035]].forEach(([deg, o, g], i) => {
      tone(s, d, t + i * 0.09, {
        freq: degree(deg, o, EDENIC), type: i ? 'sine' : 'triangle', dur: 6 - i * 0.4,
        peak: g, attack: 1 + i * 0.25, pan: Math.sin(i * 1.7) * 0.5,
        filter: { type: 'lowpass', freq: 400, Q: 0.8, sweepTo: 7000, sweepTime: 2.2 }
      });
    });
  },

  hiss: (s) => {
    const t = s.ctx.currentTime + 0.01;
    const d = s._cueBus(0.08, 0); // dry: right at your ear
    noise(s, d, t, {
      color: 'white', dur: rnd(1.1, 1.8), peak: 0.1, attack: 0.18, pan: rnd(-0.75, -0.3),
      filter: { type: 'bandpass', freq: rnd(5200, 7400), Q: 2.4, sweepTo: rnd(2800, 4200), sweepTime: 1.2 }
    });
    tone(s, d, t + 0.1, {
      freq: degree(1, 0), type: 'sine', dur: 1.6, peak: 0.035, attack: 0.3,
      glideTo: degree(0, 0), glideTime: 1.2, pan: -0.4
    });
  },

  pluck: (s) => {
    const t = s.ctx.currentTime + 0.01;
    const d = s._cueBus(0.3, 0, 3);
    noise(s, d, t, { dur: 0.1, peak: 0.13, attack: 0.002, filter: { type: 'bandpass', freq: 1700, Q: 1.3, sweepTo: 500, sweepTime: 0.09 } });
    tone(s, d, t + 0.01, {
      freq: degree(2, 1), type: 'triangle', dur: 1.4, peak: 0.1, attack: 0.004,
      glideTo: degree(1, 1), glideTime: 0.9,
      filter: { type: 'lowpass', freq: 3000, Q: 1.4, sweepTo: 500, sweepTime: 1 }
    });
    thump(s, d, t + 0.06, { freq: 110, dur: 0.35, peak: 0.1, drop: 0.5, grit: false });
  },

  bite: (s) => {
    const t = s.ctx.currentTime + 0.01;
    const d = s._cueBus(0.25, 0);
    noise(s, d, t, { dur: 0.16, peak: 0.26, attack: 0.001, filter: { type: 'bandpass', freq: 2800, Q: 0.9, sweepTo: 420, sweepTime: 0.14 } });
    noise(s, d, t + 0.05, { color: 'brown', dur: 0.4, peak: 0.14, attack: 0.004, filter: { type: 'lowpass', freq: 1400, Q: 2.5, sweepTo: 200, sweepTime: 0.35 } });
    thump(s, d, t, { freq: 76, dur: 0.6, peak: 0.3, drop: 0.4 });
    // the world flinches
    tone(s, d, t + 0.02, {
      freq: degree(0, 0), type: 'sawtooth', dur: 2.2, peak: 0.07, attack: 0.01,
      glideTo: semi(degree(0, 0), -1), glideTime: 1.6,
      filter: { type: 'lowpass', freq: 2000, Q: 2, sweepTo: 260, sweepTime: 1.8 }
    });
  },

  eyesOpen: (s) => {
    const t = s.ctx.currentTime + 0.01;
    const d = s._cueBus(0.7, 0.15);
    noise(s, d, t, { dur: 1.8, peak: 0.1, attack: 0.012, filter: { type: 'highpass', freq: 1800, Q: 0.8, sweepTo: 9000, sweepTime: 1.4 } });
    // bright, and wrong: a semitone cluster above a stable fifth
    [[0, 0, 0.08], [1, 0, 0.06], [4, 0, 0.05], [1, 1, 0.04], [0, 2, 0.025]].forEach(([deg, o, g], i) => {
      tone(s, d, t + i * 0.012, {
        freq: degree(deg, o) * (i === 3 ? 1.012 : 1), type: 'sine', dur: 4.2 - i * 0.3,
        peak: g, attack: 0.02, pan: Math.sin(i * 2.4) * 0.7, detune: rnd(-16, 16)
      });
    });
  },

  footstep: (s, o = {}) => {
    const t = s.ctx.currentTime + 0.01;
    const d = s._cueBus(0.25, 0, 2);
    const g = clamp(num(o.gain, 1), 0, 2);
    const pan = num(o.pan, rnd(-0.4, 0.4));
    thump(s, d, t, { freq: rnd(58, 74), dur: 0.26, peak: 0.16 * g, drop: 0.5, pan, grit: false });
    noise(s, d, t, { color: 'brown', dur: 0.2, peak: 0.07 * g, attack: 0.002, pan, filter: { type: 'bandpass', freq: rnd(700, 1400), Q: 1.1, sweepTo: 300, sweepTime: 0.16 } });
  },

  ayeka: (s) => {
    // the question: the same voice, softer, and it rises at the end
    cueWord(s, { day: 7, gain: 0.65, length: 1.3 });
    const t = s.ctx.currentTime + 0.9;
    const d = s._cueBus(0.9, 0.2);
    tone(s, d, t, {
      freq: degree(0, 0), type: 'sine', dur: 4.5, peak: 0.07, attack: 1.2,
      glideTo: degree(1, 0), glideTime: 3.4, pan: 0.1
    });
    tone(s, d, t + 0.2, {
      freq: degree(4, 0), type: 'sine', dur: 4, peak: 0.045, attack: 1.4,
      glideTo: degree(5, 0), glideTime: 3, pan: -0.1
    });
  },

  curse: (s) => {
    const t = s.ctx.currentTime + 0.01;
    const d = s._cueBus(0.55, 0);
    const base = degree(0, -1);
    for (let i = 0; i < 4; i++) {
      tone(s, d, t + i * 0.06, {
        freq: base * (1 + i * 0.5), type: 'sawtooth', dur: 5.5 - i * 0.5, peak: 0.1 / (1 + i * 0.7),
        attack: 0.25, detune: (i % 2 ? 1 : -1) * (9 + i * 8), pan: Math.sin(i * 1.9) * 0.6,
        glideTo: base * (1 + i * 0.5) * 0.89, glideTime: 4.5,
        filter: { type: 'lowpass', freq: 1800, Q: 2.4, sweepTo: 220, sweepTime: 4.2 }
      });
    }
    noise(s, d, t, { color: 'brown', dur: 5, peak: 0.13, attack: 0.5, filter: { type: 'lowpass', freq: 500, Q: 2, sweepTo: 90, sweepTime: 4 } });
    thump(s, d, t, { freq: 40, dur: 2.6, peak: 0.34, drop: 0.7 });
  },

  tear: (s) => {
    const t = s.ctx.currentTime + 0.01;
    const d = s._cueBus(0.35, 0);
    noise(s, d, t, { dur: 0.9, peak: 0.2, attack: 0.004, filter: { type: 'bandpass', freq: 5200, Q: 1.1, sweepTo: 320, sweepTime: 0.85 } });
    noise(s, d, t + 0.04, { color: 'brown', dur: 1.1, peak: 0.1, attack: 0.01, pan: 0.3, filter: { type: 'highpass', freq: 2400, Q: 0.9, sweepTo: 400, sweepTime: 1 } });
    tone(s, d, t, { freq: degree(3, 0), type: 'sawtooth', dur: 1.4, peak: 0.05, attack: 0.01, glideTo: degree(0, -1), glideTime: 1.1, filter: { type: 'lowpass', freq: 2600, Q: 3, sweepTo: 300, sweepTime: 1.2 } });
  },

  gate: (s) => {
    const t = s.ctx.currentTime + 0.01;
    const d = s._cueBus(0.9, 0.1);
    thump(s, d, t, { freq: 34, dur: 4.5, peak: 0.55, drop: 0.75 });
    noise(s, d, t, { color: 'brown', dur: 3, peak: 0.2, attack: 0.006, filter: { type: 'lowpass', freq: 1100, Q: 2.4, sweepTo: 90, sweepTime: 2.6 } });
    bell(s, d, t + 0.02, {
      freq: degree(0, 0), dur: 7, peak: 0.075,
      ratios: [1, 1.73, 2.41, 3.19, 4.57, 6.11, 7.83]
    });
    tone(s, d, t + 0.5, { freq: degree(1, -1), type: 'sawtooth', dur: 6, peak: 0.06, attack: 1.2, filter: { type: 'lowpass', freq: 400, Q: 1.6 } });
  },

  sword: (s) => {
    const t = s.ctx.currentTime + 0.01;
    const d = s._cueBus(0.65, 0.18);
    noise(s, d, t, { dur: 0.8, peak: 0.14, attack: 0.18, pan: -0.5, filter: { type: 'bandpass', freq: 900, Q: 1.2, sweepTo: 6400, sweepTime: 0.6 } });
    bell(s, d, t + 0.1, {
      freq: degree(4, 2), dur: 4.5, peak: 0.055,
      ratios: [1, 1.41, 2.13, 3.07, 4.63, 6.29, 8.11]
    });
    for (let i = 0; i < 3; i++) {
      tone(s, d, t + 0.12 + i * 0.07, {
        freq: degree(1, 3) * rnd(0.97, 1.06), type: 'sine', dur: rnd(1.6, 3),
        peak: 0.03, attack: 0.004, pan: rnd(-0.8, 0.8),
        glideTo: degree(1, 3) * rnd(1.05, 1.2), glideTime: 1.2
      });
    }
    thump(s, d, t, { freq: 70, dur: 0.8, peak: 0.2, drop: 0.5 });
  },

  click: (s) => {
    const t = s.ctx.currentTime + 0.005;
    const d = s._cueBus(0.12, 0, 1);
    noise(s, d, t, { dur: 0.035, peak: 0.07, attack: 0.001, filter: { type: 'bandpass', freq: 3200, Q: 2.2 } });
    tone(s, d, t, { freq: degree(4, 2), type: 'sine', dur: 0.09, peak: 0.05, attack: 0.002 });
  },

  hover: (s) => {
    const t = s.ctx.currentTime + 0.005;
    const d = s._cueBus(0.2, 0, 1);
    tone(s, d, t, { freq: degree(4, 2, EDENIC), type: 'sine', dur: 0.22, peak: 0.035, attack: 0.004 });
    tone(s, d, t + 0.01, { freq: degree(6, 2, EDENIC), type: 'sine', dur: 0.16, peak: 0.018, attack: 0.004, pan: 0.2 });
  },

  chime: (s, o = {}) => {
    const t = s.ctx.currentTime + 0.01;
    const d = s._cueBus(0.6, 0.12);
    const deg = Number.isFinite(o.degree) ? o.degree : pick([0, 2, 4, 6, 7]);
    bell(s, d, t, { freq: degree(deg, 2, EDENIC), dur: num(o.dur, 3.4), peak: num(o.gain, 0.05) });
  }
};

/* ============================================================================
 * 9. Score — the public engine
 * ========================================================================== */

export class Score {
  constructor() {
    this.ctx = null;
    this._ready = false;
    this._starting = false;
    this._disposed = false;
    this._sleeping = false;
    this._muted = false;
    this._volume = 0.85;
    this.intensity = 0.5;
    this.loneliness = 0;
    this.bedName = null;
    this._bed = null;
    this._queue = [];
    this._timers = new Set();
    this._voices = 0;
    this._onVisibility = null;
    this._lastCue = new Map();
  }

  /* --- lifecycle --------------------------------------------------------- */

  get ready() { return this._ready && !this._disposed; }
  get muted() { return this._muted; }
  get context() { return this.ctx; }
  get bed() { return this.bedName; }

  async start() {
    if (this._disposed || this._ready || this._starting) {
      if (this.ctx && this.ctx.state === 'suspended') { try { await this.ctx.resume(); } catch (e) { /* ignore */ } }
      return this.ready;
    }
    this._starting = true;
    try {
      const AC = (typeof globalThis !== 'undefined') &&
        (globalThis.AudioContext || globalThis.webkitAudioContext);
      if (!AC) { this._starting = false; return false; }

      const ctx = new AC({ latencyHint: 'interactive' });
      this.ctx = ctx;
      if (ctx.state === 'suspended') { try { await ctx.resume(); } catch (e) { /* gesture may still be pending */ } }

      this._buildMaster();
      this.reverb = new Reverb(this, { decay: 3.4, wet: 0.95 });
      this.reverb.output.connect(this.bus);

      this._buildDelay();

      this._ready = true;
      this._starting = false;
      this._installVisibility();
      this._flushQueue();
      return true;
    } catch (e) {
      this._starting = false;
      this._ready = false;
      return false;
    }
  }

  _buildMaster() {
    const ctx = this.ctx;
    const t = ctx.currentTime;

    this.bus = ctx.createGain();
    this.bus.gain.setValueAtTime(1, t);

    this.sat = ctx.createWaveShaper();
    this.sat.curve = saturationCurve(1.5);
    if ('oversample' in this.sat) this.sat.oversample = '2x';

    this.comp = ctx.createDynamicsCompressor();
    this.comp.threshold.setValueAtTime(-16, t);
    this.comp.knee.setValueAtTime(14, t);
    this.comp.ratio.setValueAtTime(3.5, t);
    this.comp.attack.setValueAtTime(0.006, t);
    this.comp.release.setValueAtTime(0.28, t);

    this.limiter = ctx.createDynamicsCompressor();
    this.limiter.threshold.setValueAtTime(-2.5, t);
    this.limiter.knee.setValueAtTime(0, t);
    this.limiter.ratio.setValueAtTime(20, t);
    this.limiter.attack.setValueAtTime(0.001, t);
    this.limiter.release.setValueAtTime(0.09, t);

    this.master = ctx.createGain();
    this.master.gain.setValueAtTime(this._muted ? FLOOR : this._volume, t);

    this.bus.connect(this.sat);
    this.sat.connect(this.comp);
    this.comp.connect(this.limiter);
    this.limiter.connect(this.master);
    this.master.connect(ctx.destination);

    // beds pass through a duck stage so narration can cut through
    this.duckGain = ctx.createGain();
    this.duckGain.gain.setValueAtTime(1, t);
    this.duckGain.connect(this.bus);
    this.bedBus = ctx.createGain();
    this.bedBus.gain.setValueAtTime(1, t);
    this.bedBus.connect(this.duckGain);

    this.cueBus = ctx.createGain();
    this.cueBus.gain.setValueAtTime(1, t);
    this.cueBus.connect(this.bus);
  }

  _buildDelay() {
    const ctx = this.ctx;
    const t = ctx.currentTime;
    this.delayIn = ctx.createGain();
    this.delayIn.gain.setValueAtTime(1, t);

    const mk = (time, pan) => {
      const d = ctx.createDelay(2);
      d.delayTime.setValueAtTime(time, t);
      const fb = ctx.createGain();
      fb.gain.setValueAtTime(0.34, t);
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(2600, t);
      const p = panner(ctx, pan);
      this.delayIn.connect(d);
      d.connect(lp); lp.connect(fb); fb.connect(d);
      if (p) { lp.connect(p); p.connect(this.delayOut); } else { lp.connect(this.delayOut); }
      return [d, fb, lp, p];
    };

    this.delayOut = ctx.createGain();
    this.delayOut.gain.setValueAtTime(0.5, t);
    this.delayOut.connect(this.bus);
    this._delayNodes = [].concat(mk(0.37, -0.6), mk(0.55, 0.6)).filter(Boolean);
    // a slice of the delay returns to the room
    this.delayOut.connect(this.reverb.input);
  }

  /**
   * Routing node for one cue: dry + reverb send + delay send. The node and
   * its sends tear themselves down after `ttl` seconds, which must outlast
   * the longest voice routed through them.
   */
  _cueBus(wet = 0.3, dly = 0, ttl = 8) {
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const g = ctx.createGain();
    g.gain.setValueAtTime(1, t);
    g.connect(this.cueBus);
    const owned = [g];
    if (wet > 0) {
      const w = ctx.createGain();
      w.gain.setValueAtTime(wet, t);
      g.connect(w); w.connect(this.reverb.input);
      owned.push(w);
    }
    if (dly > 0) {
      const dn = ctx.createGain();
      dn.gain.setValueAtTime(dly, t);
      g.connect(dn); dn.connect(this.delayIn);
      owned.push(dn);
    }
    const id = setTimeout(() => {
      this._timers.delete(id);
      for (const n of owned) { try { n.disconnect(); } catch (e) { /* ignore */ } }
    }, Math.max(250, clamp(num(ttl, 8), 0.25, 60) * 1000));
    this._timers.add(id);
    return g;
  }

  _installVisibility() {
    if (typeof document === 'undefined' || !document.addEventListener) return;
    this._onVisibility = () => {
      if (!this.ctx || this._disposed) return;
      if (document.hidden) {
        this._sleeping = true;
        const id = setTimeout(() => {
          this._timers.delete(id);
          if (this._sleeping && this.ctx && this.ctx.state === 'running') {
            try { this.ctx.suspend(); } catch (e) { /* ignore */ }
          }
        }, 400);
        this._timers.add(id);
      } else {
        this._sleeping = false;
        if (this.ctx.state === 'suspended') { try { this.ctx.resume(); } catch (e) { /* ignore */ } }
      }
    };
    document.addEventListener('visibilitychange', this._onVisibility);
  }

  _flushQueue() {
    const q = this._queue;
    this._queue = [];
    for (const [fn, args] of q) {
      try { this[fn].apply(this, args); } catch (e) { /* a queued call must never break start */ }
    }
  }

  _defer(fn, args) {
    if (this._disposed) return;
    if (this._queue.length > 48) this._queue.shift();
    this._queue.push([fn, args]);
  }

  /* --- beds -------------------------------------------------------------- */

  setBed(name, { fade = 2.5 } = {}) {
    if (this._disposed) return;
    if (!BED_RECIPES[name]) return;
    if (!this.ready) { this._defer('setBed', [name, { fade }]); this.bedName = name; return; }
    if (this.bedName === name && this._bed) return;

    const t = this.ctx.currentTime;
    const f = clamp(num(fade, 2.5), 0.02, 20);
    const old = this._bed;
    this.bedName = name;

    const bed = new Bed(this, name);
    try { BED_RECIPES[name](bed); } catch (e) { /* a broken recipe must not break playback */ }
    bed.update({ intensity: this.intensity, loneliness: this.loneliness });
    bed.fadeIn(t, f, name === 'silence' ? FLOOR : 1);
    this._bed = bed;

    if (old) old.fadeOutAndDispose(t, f);
  }

  /* --- cues -------------------------------------------------------------- */

  cue(name, opts = {}) {
    if (this._disposed) return;
    const fn = CUES[name];
    if (!fn) return;
    if (!this.ready) { this._defer('cue', [name, opts]); return; }
    if (this._sleeping || this._muted) return;

    // cheap retrigger guard so held keys cannot flood the graph
    const now = this.ctx.currentTime;
    const min = name === 'click' || name === 'hover' ? 0.03 : 0.06;
    if ((this._lastCue.get(name) || -1) > now - min) return;
    this._lastCue.set(name, now);
    if (this._voices > 54) return;

    try { fn(this, opts || {}); } catch (e) { /* never let a cue throw into gameplay */ }
  }

  /* --- parameters -------------------------------------------------------- */

  setIntensity(v) {
    this.intensity = clamp(num(v, 0.5), 0, 1);
    if (!this.ready) return;
    if (this._bed) this._bed.update({ intensity: this.intensity, loneliness: this.loneliness });
  }

  setLoneliness(v) {
    this.loneliness = clamp(num(v, 0), 0, 1);
    if (!this.ready) return;
    if (this._bed) this._bed.update({ intensity: this.intensity, loneliness: this.loneliness });
    this.reverb.setDecay(3.2 + this.loneliness * 6.5);
    const t = this.ctx.currentTime;
    this.reverb.output.gain.setValueAtTime(this.reverb.output.gain.value, t);
    this.reverb.output.gain.linearRampToValueAtTime(0.9 + this.loneliness * 0.5, t + 1.5);
  }

  setMuted(on) {
    this._muted = !!on;
    if (!this.ready) return;
    const t = this.ctx.currentTime;
    const g = this.master.gain;
    g.cancelScheduledValues(t);
    g.setValueAtTime(Math.max(FLOOR, g.value), t);
    g.linearRampToValueAtTime(this._muted ? FLOOR : this._volume, t + 0.12);
  }

  setMasterVolume(v) {
    this._volume = clamp(num(v, 0.85), 0, 1);
    if (!this.ready || this._muted) return;
    const t = this.ctx.currentTime;
    const g = this.master.gain;
    g.cancelScheduledValues(t);
    g.setValueAtTime(Math.max(FLOOR, g.value), t);
    g.linearRampToValueAtTime(Math.max(FLOOR, this._volume), t + 0.1);
  }

  duck(seconds = 2) {
    if (!this.ready) { this._defer('duck', [seconds]); return; }
    const hold = clamp(num(seconds, 2), 0.1, 120);
    const t = this.ctx.currentTime;
    const g = this.duckGain.gain;
    g.cancelScheduledValues(t);
    g.setValueAtTime(Math.max(FLOOR, g.value), t);
    g.linearRampToValueAtTime(0.3, t + 0.3);
    g.setValueAtTime(0.3, t + 0.3 + hold);
    g.linearRampToValueAtTime(1, t + 0.3 + hold + 1.1);
  }

  /** Optional convenience for scripted sequences; harmless before start(). */
  async resume() {
    if (!this.ctx) return this.start();
    if (this.ctx.state === 'suspended') { try { await this.ctx.resume(); } catch (e) { /* ignore */ } }
    this._sleeping = false;
    return this.ready;
  }

  dispose() {
    if (this._disposed) return;
    this._disposed = true;
    this._ready = false;
    this._queue.length = 0;

    if (this._onVisibility && typeof document !== 'undefined' && document.removeEventListener) {
      document.removeEventListener('visibilitychange', this._onVisibility);
      this._onVisibility = null;
    }
    for (const id of this._timers) clearTimeout(id);
    this._timers.clear();

    if (this._bed) { this._bed.dispose(); this._bed = null; }
    if (this.reverb) { this.reverb.dispose(); }

    const all = [this.bedBus, this.cueBus, this.duckGain, this.delayIn, this.delayOut,
      this.bus, this.sat, this.comp, this.limiter, this.master].concat(this._delayNodes || []);
    for (const n of all) { if (n) { try { n.disconnect(); } catch (e) { /* ignore */ } } }

    if (this.ctx && this.ctx.close) {
      try { const p = this.ctx.close(); if (p && p.catch) p.catch(() => {}); } catch (e) { /* ignore */ }
    }
    this.ctx = null;
  }
}

export default Score;

/** Names exported for editor tooling / debug menus. */
export const BED_NAMES = Object.keys(BED_RECIPES);
export const CUE_NAMES = Object.keys(CUES);
