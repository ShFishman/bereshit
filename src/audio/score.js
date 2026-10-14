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
 *
 * ---------------------------------------------------------------------------
 * REVISION — comfort pass ("make the sounds cleaner and less annoying")
 *
 * The architecture, the public API, every bed name and every cue name are
 * unchanged. Only the sound changed. If you edit this file, please keep to the
 * constraints below; each one exists because the previous version broke it.
 *
 *  1. ROUGHNESS. Detune is kept small enough that the resulting beat rate
 *     stays under ~0.5 Hz, which for a voice at frequency f means roughly
 *     f * (2^(cents/1200) - 1) < 0.5. High voices therefore get *less* detune
 *     than low ones, not the same amount. Where width is wanted it comes from
 *     panning or from a genuinely wider interval (octave, fifth), never from a
 *     2-20 Hz beat. See `beatSafeDetune()`.
 *  2. TOP END. A fixed -6 dB shelf above 3.2 kHz sits on the master, every
 *     bed's `colorRange` ceiling was pulled down to 2.0-7.0 kHz, and the
 *     high/sibilant layers (tohu air, Eden birds, serpent sibilance) are
 *     intermittent and band-limited instead of parked and continuous.
 *  3. PERIODICITY. LFO rates are spaced by the golden ratio and jittered per
 *     voice (`slowRate()`), so no two layers share a period. The two metric
 *     pulses (day6, tardemah) are humanised and take rests, so neither reads
 *     as a metronome.
 *  4. CUE FATIGUE. Every cue softens its attack, drops its level, and jitters
 *     pitch/timbre/timing per firing (`vary()`, `jitter()`), so the twentieth
 *     firing is not the first one again. The frequently-fired cues (click,
 *     hover, footstep, heartbeat) got the deepest cuts.
 *  5. HEADROOM. The bed bus sits at 0.52 and cues at 0.8, so the bed stays
 *     well under narration. `duck()` is deeper (0.12) and ramps smoothly.
 *     Compression is slower and gentler; the limiter no longer snaps.
 *  6. THE FLAT SECOND. Ahava Rabbah's b2 is now melodic only. No bed sustains
 *     degree 1 against degree 0; it appears as a passing or leaning tone that
 *     resolves (fall, serpent, eyesOpen, hiss).
 *  7. NOISE. Broadband beds are gone. Noise layers are narrow, low, moving and
 *     quiet; anything above ~2 kHz is an event, not a layer.
 *
 * The dramatic arc is untouched: tohu is unpitched and vast, the seven days
 * move from noise into harmony, `eve` is the first real consonance, `exile` is
 * Eden through a wall, `epilogue` is one tone decaying.
 * ---------------------------------------------------------------------------
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

/** Golden ratio — used to space periodic things so they never re-align. */
const PHI = 1.6180339887;

/**
 * The largest detune, in cents, that keeps the beat against an undetuned voice
 * at `freq` below `maxBeat` Hz. Roughness lives between about 2 and 20 Hz, so
 * we aim an order of magnitude below it: the result is a slow swell, not a
 * wobble. High voices get proportionally less detune than low ones.
 */
function beatSafeDetune(freq, maxBeat = 0.35) {
  const f = Math.max(8, freq);
  const cents = 1200 * Math.log2(1 + maxBeat / f);
  return clamp(cents, 0.3, 14);
}

/** A random detune that is guaranteed not to beat audibly at `freq`. */
const softDetune = (freq, maxBeat) => {
  const c = beatSafeDetune(freq, maxBeat);
  return rnd(-c, c);
};

/**
 * LFO rate for layer `i` of a stack. Successive indices are spaced by the
 * golden ratio and jittered, so the layers share no common period and the
 * stack never cycles on a clock the ear can lock onto. Everything returned is
 * far below the roughness zone — periods of roughly 40 s to 6 min.
 */
function slowRate(i, base = 0.009) {
  return base * (1 + i * PHI * 0.47) * rnd(0.86, 1.17);
}

/** Small per-firing pitch variation, in cents, so a cue is never identical. */
const vary = (v, cents = 40) => v * Math.pow(2, rnd(-cents, cents) / 1200);

/** Small per-firing scalar variation around 1 (timing, duration, level). */
const jitter = (amount = 0.12) => 1 + rnd(-amount, amount);

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

/**
 * Plucked-string-ish voice: a soft transient settling into a body tone.
 * The old version had a 4 ms attack and a bright noise click at 4x the
 * fundamental; both have been pulled back so a hundred plucks in a row do not
 * accumulate into a rattle. The click is now band-limited and barely present.
 */
function pluckVoice(score, dest, t, o = {}) {
  const freq = Math.max(20, num(o.freq, 330));
  const dur = num(o.dur, 1.6) * jitter(0.1);
  const peak = num(o.peak, 0.09);
  tone(score, dest, t, {
    freq: vary(freq, 6), type: o.type || 'triangle', dur, peak,
    attack: rnd(0.014, 0.026), pan: o.pan, detune: num(o.detune, 0),
    filter: {
      type: 'lowpass', freq: clamp(freq * num(o.open, 5), 120, 5200), Q: num(o.Q, 0.8),
      sweepTo: clamp(freq * 1.3, 80, 2600), sweepTime: dur * 0.55
    }
  });
  // a breath of attack noise, well below the sibilance range
  noise(score, dest, t, {
    color: 'pink', dur: 0.07, peak: peak * 0.16, attack: 0.008, pan: o.pan,
    filter: { type: 'bandpass', freq: clamp(freq * 2.2, 120, 1600), Q: 0.9 }
  });
}

/** Low body thump — used for heartbeats, footsteps, gates and the land. */
function thump(score, dest, t, o = {}) {
  const f = num(o.freq, 64) * jitter(0.05);
  const dur = num(o.dur, 0.5);
  const peak = num(o.peak, 0.34);
  tone(score, dest, t, {
    freq: f, type: 'sine', dur, peak,
    attack: num(o.attack, rnd(0.012, 0.022)),
    glideTo: f * num(o.drop, 0.55), glideTime: dur * 0.5,
    pan: o.pan
  });
  if (o.grit !== false) {
    noise(score, dest, t, {
      color: 'brown', dur: dur * 0.4, peak: peak * 0.18,
      attack: 0.012, pan: o.pan,
      filter: { type: 'lowpass', freq: 300, Q: 0.6, sweepTo: 110, sweepTime: 0.22 }
    });
  }
}

/**
 * Inharmonic struck metal / bell.
 *
 * Two changes from the first version. The partial amplitudes now fall away
 * much faster (and anything above the fifth partial is also short), so a bell
 * struck at 900 Hz no longer leaves 6 kHz ringing. And the per-partial detune
 * is beat-safe: at 4 kHz the old +/-5 cents produced a 13 Hz tremble, which is
 * exactly the frequency the ear finds most abrasive.
 */
function bell(score, dest, t, o = {}) {
  const f = Math.max(40, num(o.freq, 660));
  const dur = num(o.dur, 3.2) * jitter(0.12);
  const base = o.ratios || [1, 2.01, 2.99, 4.21, 5.43, 6.79];
  // jitter the ratios a touch per strike so repeated chimes are never twins
  const ratios = base.map((r, i) => (i === 0 ? r : r * (1 + rnd(-0.006, 0.006))));
  const peak = num(o.peak, 0.055);
  ratios.forEach((r, i) => {
    const pf = f * r;
    if (pf > 7000) return; // nothing up there earns its fatigue
    const hiCut = pf > 2200 ? 0.45 : 1;
    tone(score, dest, t, {
      freq: pf, type: 'sine', dur: dur * Math.pow(0.78, i),
      peak: (peak / (1 + i * 1.9)) * hiCut, attack: 0.012 + i * 0.006,
      detune: softDetune(pf), pan: o.pan == null ? rnd(-0.45, 0.45) : o.pan
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
    // a dark room. A bright tail on a 25-minute bed is the single most
    // fatiguing thing a reverb can do.
    this.preHigh.frequency.setValueAtTime(3400, ctx.currentTime);

    this.a = ctx.createConvolver();
    this.b = ctx.createConvolver();
    this.a.normalize = true;
    this.b.normalize = true;
    this.a.buffer = impulseResponse(ctx, decay, { spread: 0.35, tilt: 0.7 });
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
    try { next.buffer = impulseResponse(ctx, d, { spread: 0.3 + Math.min(0.4, d * 0.04), tilt: 0.7 }); }
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
    this.preHigh.frequency.linearRampToValueAtTime(clamp(hz, 400, 5000), t + 3);
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
    this.driftCents = 2;
    this.density = 1;
    this.colorRange = [700, 5200];
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

    // Very slow detune drift, deepened a little by loneliness.
    //
    // The first version re-aimed every voice every 4-9 s by up to
    // driftCents * 6 (which reached 130 cents on the `fall` bed) with a 2.5 s
    // time constant. That is a pitch wobble, not a drift. It is now a third of
    // a minute between moves, a 12 s glide, and a per-voice ceiling that keeps
    // the beat against the rest of the stack under half a hertz.
    this.every(() => rnd(26, 53), (when) => {
      const lone = 1 + this.score.loneliness * 1.3;
      for (const d of this._drifters) {
        if (!d || !d.p) continue;
        const cap = Math.min(this.driftCents * lone, beatSafeDetune(d.f, 0.4 * lone));
        try { d.p.setTargetAtTime(rnd(-cap, cap), when, 12); } catch (e) { /* ignore */ }
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
    if (o.drift !== false) this._drifters.push({ p: osc.detune, f: Math.max(8, num(o.freq, 110)) });
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
    // Intensity opens the bed's lowpass, but never past 7 kHz: the ceiling is
    // a comfort limit, not a musical one.
    const bright = lo + (hi - lo) * Math.pow(clamp(state.intensity, 0, 1), 0.8);
    this.color.frequency.setValueAtTime(this.color.frequency.value, t);
    this.color.frequency.linearRampToValueAtTime(clamp(bright, 60, 7000), t + 2.5);

    const cut = -(2 + this.hollowDepth * 13) * clamp(state.loneliness, 0, 1);
    this.hollow.gain.setValueAtTime(this.hollow.gain.value, t);
    this.hollow.gain.linearRampToValueAtTime(cut, t + 3);

    const w = clamp(this.baseWet == null ? this.wet.gain.value : this.baseWet, 0, 1);
    const target = clamp(w + state.loneliness * 0.28, 0, 1);
    this.wet.gain.setValueAtTime(this.wet.gain.value, t);
    this.wet.gain.linearRampToValueAtTime(target, t + 3);

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
  b.colorRange = [200, 2000];
  b.baseWet = 0.8;
  b.wet.gain.setValueAtTime(0.8, b.ctx.currentTime);
  b.hollowDepth = 0.4;

  const rumble = b.noiseLayer({ color: 'brown', gain: 0.4, attack: 8, filter: { type: 'lowpass', freq: 62, Q: 0.6 } });
  const mid = b.noiseLayer({ color: 'pink', gain: 0.07, attack: 11, pan: -0.3, filter: { type: 'bandpass', freq: 240, Q: 1.8 } });
  // The old 'air' layer was white noise parked at 1.8 kHz for the whole scene,
  // which is the textbook definition of hiss. It is now narrow, an octave
  // lower, and its LFO depth equals its gain so it vanishes completely for
  // minutes at a time — present, but never a constant.
  const air = b.noiseLayer({ color: 'pink', gain: 0.014, attack: 14, pan: 0.35, filter: { type: 'bandpass', freq: 820, Q: 3.4 } });

  // Unpitched and enormous. These used to sit 4.8, 10.6 and 15.5 Hz apart,
  // which is exactly the roughness band — the vastness arrived as a wobble.
  // Spacing them by rough fifths keeps them pitchless (they belong to no
  // scale) while putting every difference tone below the beat range.
  const subs = [23.0, 34.3, 51.0, 76.4].map((f, i) =>
    b.drone({
      freq: f, type: 'sine', gain: 0.095 - i * 0.019, attack: 10 + i * 3,
      pan: i % 2 ? 0.55 : -0.55, detune: softDetune(f, 0.08)
    })
  );

  if (mid) b.lfo(mid.filter.frequency, { rate: slowRate(0, 0.0105), depth: 110 });
  if (air) b.lfo(air.gain.gain, { rate: slowRate(2, 0.0062), depth: 0.016, type: 'triangle' });
  subs.forEach((s, i) => s && b.lfo(s.gain.gain, { rate: slowRate(i, 0.0075), depth: 0.035, type: 'triangle' }));

  // slow random re-aiming: the void never settles, and never on a clock
  b.every(() => rnd(17, 44), (t) => {
    if (mid) mid.filter.frequency.setTargetAtTime(rnd(120, 480), t, 12);
    if (rumble) rumble.gain.gain.setTargetAtTime(rnd(0.28, 0.46), t, 14);
    if (air) air.filter.frequency.setTargetAtTime(rnd(560, 1500), t, 16);
  });

  // distant tectonic groans
  b.every(() => rnd(14, 37), (t) => {
    noise(b.score, b.mix, t, {
      color: 'brown', dur: rnd(6, 11), peak: 0.085, attack: 3.5, pan: rnd(-0.8, 0.8),
      filter: { type: 'lowpass', freq: rnd(80, 190), Q: 1.6, sweepTo: rnd(40, 70), sweepTime: 6 }
    });
  });
}

/* --- the seven days ------------------------------------------------------ */

/** Shared substrate: the primordial noise, thinning as the days proceed. */
function substrate(b, amount) {
  if (amount <= 0) return;
  b.noiseLayer({ color: 'brown', gain: 0.28 * amount, attack: 7, filter: { type: 'lowpass', freq: 62, Q: 0.6 } });
  if (amount > 0.3) {
    b.noiseLayer({ color: 'pink', gain: 0.04 * amount, attack: 9, pan: 0.25, filter: { type: 'bandpass', freq: 340, Q: 1.6 } });
  }
}

function bedDay1(b) {
  b.colorRange = [380, 2600];
  b.baseWet = 0.68;
  b.wet.gain.setValueAtTime(0.68, b.ctx.currentTime);
  substrate(b, 1);

  // One pitch, pulled out of the noise. The companion voice used to sit a
  // beating 7 cents away from the fundamental; it is now a clean octave above
  // it and panned off to one side, which is the same width with none of the
  // wobble.
  const f = degree(0, 1); // D3
  const a = b.drone({ freq: f, type: 'sine', gain: 0.14, attack: 14 });
  const c = b.drone({ freq: f * 2, type: 'triangle', gain: 0.028, attack: 20, detune: softDetune(f * 2), pan: 0.4 });
  const sub = b.drone({ freq: f / 4, type: 'sine', gain: 0.13, attack: 15 });
  if (a) b.lfo(a.gain.gain, { rate: slowRate(0, 0.0088), depth: 0.04 });
  if (c) b.lfo(c.gain.gain, { rate: slowRate(2, 0.0071), depth: 0.026, type: 'triangle' });

  // the pitch flickers into being now and then
  b.every(() => rnd(19, 41), (t) => {
    tone(b.score, b.mix, t, {
      freq: vary(f * 2, 5), type: 'sine', dur: rnd(7, 13), peak: 0.035,
      attack: 4, pan: rnd(-0.5, 0.5)
    });
  });
  b.onUpdate = (s, t) => { if (sub) sub.gain.gain.setTargetAtTime(0.09 + s.intensity * 0.08, t, 4); };
}

function bedDay2(b) {
  b.colorRange = [450, 3000];
  b.baseWet = 0.6;
  b.wet.gain.setValueAtTime(0.6, b.ctx.currentTime);
  b.hollowDepth = 0.5;
  substrate(b, 0.7);

  // waters below
  b.drone({ freq: degree(0, -1), type: 'sine', gain: 0.18, attack: 10 });
  b.drone({ freq: degree(0, 0), type: 'triangle', gain: 0.07, attack: 13, pan: -0.45, detune: softDetune(degree(0, 0)) });
  // the firmament: a scooped middle
  const gap = b.ctx.createBiquadFilter();
  gap.type = 'peaking';
  gap.frequency.setValueAtTime(700, b.ctx.currentTime);
  gap.Q.setValueAtTime(1.1, b.ctx.currentTime);
  gap.gain.setValueAtTime(-9, b.ctx.currentTime);
  gap.connect(b.mix);
  b._nodes.push(gap);
  // waters above — the fifth, high and thin. The upper octave is gated by an
  // LFO as deep as its own gain, so it comes and goes rather than hanging.
  const hi = b.drone({ freq: degree(4, 2), type: 'sine', gain: 0.05, attack: 16, pan: 0.5, dest: gap });
  const hi2 = b.drone({ freq: degree(4, 3), type: 'sine', gain: 0.018, attack: 22, pan: -0.5, dest: gap, detune: softDetune(degree(4, 3)) });
  if (hi) b.lfo(hi.gain.gain, { rate: slowRate(1, 0.0082), depth: 0.022 });
  if (hi2) b.lfo(hi2.gain.gain, { rate: slowRate(3, 0.0059), depth: 0.018, type: 'triangle' });

  b.every(() => rnd(13, 31), (t) => {
    noise(b.score, b.mix, t, {
      color: 'pink', dur: rnd(4, 8), peak: 0.026, attack: 2.2, pan: rnd(-0.9, 0.9),
      filter: { type: 'bandpass', freq: rnd(1100, 2400), Q: 2.2, sweepTo: rnd(600, 1100), sweepTime: 4 }
    });
  });
}

function bedDay3(b) {
  b.colorRange = [500, 3400];
  b.baseWet = 0.5;
  b.wet.gain.setValueAtTime(0.5, b.ctx.currentTime);
  substrate(b, 0.4);

  b.drone({ freq: degree(0, -1), type: 'sine', gain: 0.2, attack: 8 });
  b.drone({ freq: degree(4, -1), type: 'sine', gain: 0.095, attack: 11, pan: 0.3 });
  b.drone({ freq: degree(0, 0), type: 'triangle', gain: 0.05, attack: 13, pan: -0.4, detune: softDetune(degree(0, 0)) });

  // Things growing: plucked motion, organic and irregular. Thinned out — at
  // one pluck a second this read as a texture to get away from rather than a
  // garden filling in.
  const degs = [0, 2, 3, 4, 6, 7];
  b.every(() => rnd(1.6, 4.4) / b.density, (t) => {
    const d = pick(degs);
    pluckVoice(b.score, b.mix, t, {
      freq: degree(d, rint(1, 2)), dur: rnd(1.8, 3.6), peak: rnd(0.035, 0.07),
      pan: rnd(-0.7, 0.7), open: rnd(3, 6)
    });
    if (Math.random() < 0.28) {
      pluckVoice(b.score, b.mix, t + rnd(0.18, 0.5), {
        freq: degree(d + 2, 2), dur: rnd(1.4, 2.6), peak: 0.03, pan: rnd(-0.7, 0.7), open: rnd(3, 5)
      });
    }
  });
  b.onUpdate = (s) => { b.density = 0.6 + s.intensity * 1.1; };
}

function bedDay4(b) {
  b.colorRange = [600, 4200];
  b.baseWet = 0.55;
  b.wet.gain.setValueAtTime(0.55, b.ctx.currentTime);
  substrate(b, 0.25);

  b.drone({ freq: degree(0, -1), type: 'sine', gain: 0.18, attack: 7 });
  b.drone({ freq: degree(4, -1), type: 'sine', gain: 0.085, attack: 9, pan: -0.25 });
  b.drone({ freq: degree(0, 0), type: 'triangle', gain: 0.04, attack: 11, pan: 0.35, detune: softDetune(degree(0, 0)) });

  // The lights: high partials in slow, independent rotation. Two changes —
  // the top two partials are gone (they were the sustained sparkle that wore
  // thin), and each remaining one is gated by an LFO whose depth equals its
  // gain, so at any moment only some of them are sounding. Rates are
  // golden-ratio spaced, so the constellation never repeats its pattern.
  const partials = [4, 6, 7, 9];
  partials.forEach((p, i) => {
    const f = degree(0, -1) * p;
    const g = 0.009 + 0.006 * Math.random();
    const v = b.drone({
      freq: f, type: 'sine', gain: g,
      attack: 14 + i * 4, pan: Math.sin(i * 1.9), detune: softDetune(f)
    });
    if (v) {
      b.lfo(v.gain.gain, { rate: slowRate(i, 0.0068), depth: g * 0.95, type: 'sine', phase: i * 0.7 });
      if (v.pan) b.lfo(v.pan.pan, { rate: slowRate(i + 1, 0.0051), depth: 0.5 });
    }
  });

  b.every(() => rnd(2.6, 6.5) / b.density, (t) => {
    pluckVoice(b.score, b.mix, t, {
      freq: degree(pick([0, 2, 4, 6]), 1), dur: rnd(2, 3.6), peak: 0.045,
      pan: rnd(-0.6, 0.6), open: rnd(3, 6)
    });
  });
  b.every(() => rnd(9, 23), (t) => {
    bell(b.score, b.mix, t, { freq: degree(pick([0, 4, 7, 9]), 2), dur: rnd(4, 8), peak: 0.026 });
  });
  b.onUpdate = (s) => { b.density = 0.7 + s.intensity * 1.1; };
}

function bedDay5(b) {
  b.colorRange = [600, 4000];
  b.baseWet = 0.45;
  b.wet.gain.setValueAtTime(0.45, b.ctx.currentTime);

  b.drone({ freq: degree(0, -1), type: 'sine', gain: 0.17, attack: 6 });
  b.drone({ freq: degree(4, -1), type: 'sine', gain: 0.08, attack: 8, pan: 0.2 });
  b.drone({ freq: degree(2, 0), type: 'triangle', gain: 0.035, attack: 10, pan: -0.35 });
  [4, 6, 9].forEach((p, i) => {
    const f = degree(0, -1) * p;
    const v = b.drone({ freq: f, type: 'sine', gain: 0.008, attack: 13, pan: Math.sin(i * 2.1), detune: softDetune(f) });
    if (v) b.lfo(v.gain.gain, { rate: slowRate(i, 0.0074), depth: 0.008, type: 'triangle' });
  });

  // Swarms: randomised flutters in bursts, now sparser, softer-edged and a
  // long way below the old 4 kHz bandpass ceiling.
  b.every(() => rnd(2.1, 6) / b.density, (t) => {
    const n = rint(3, 6);
    const pan = rnd(-0.85, 0.85);
    const base = pick([0, 2, 3, 4, 6]);
    for (let i = 0; i < n; i++) {
      tone(b.score, b.mix, t + i * rnd(0.06, 0.16), {
        freq: vary(degree(base + rint(0, 4), rint(1, 2)), 12), type: 'triangle',
        dur: rnd(0.22, 0.5), peak: rnd(0.012, 0.028), attack: rnd(0.02, 0.05),
        pan: clamp(pan + rnd(-0.15, 0.15), -1, 1),
        filter: { type: 'bandpass', freq: rnd(700, 2000), Q: 1.6 }
      });
    }
  });
  // something large moving in deep water — the b2 appears here, in passing,
  // as a swell that leans and then is gone
  b.every(() => rnd(13, 29), (t) => {
    tone(b.score, b.mix, t, {
      freq: degree(0, -2), type: 'sine', dur: rnd(5, 9), peak: 0.14, attack: 2.2,
      glideTo: degree(1, -2), glideTime: 5, pan: rnd(-0.5, 0.5)
    });
  });
  b.onUpdate = (s) => { b.density = 0.6 + s.intensity * 1.5; };
}

function bedDay6(b) {
  b.colorRange = [550, 3600];
  b.baseWet = 0.42;
  b.wet.gain.setValueAtTime(0.42, b.ctx.currentTime);

  // the fullest harmony of the creation: 1 ♭3→3 5 ♭7 stacked warm
  [[0, -1, 0.18, 'sine'], [0, 0, 0.08, 'triangle'], [2, 0, 0.055, 'triangle'],
   [4, 0, 0.055, 'triangle'], [6, 0, 0.032, 'sine'], [0, 1, 0.026, 'sine']]
    .forEach(([d, o, g, type], i) => {
      const f = degree(d, o);
      const v = b.drone({ freq: f, type, gain: g, attack: 6 + i * 1.5, pan: Math.sin(i * 1.7) * 0.5, detune: softDetune(f) });
      if (v) b.lfo(v.gain.gain, { rate: slowRate(i, 0.0081), depth: g * 0.32 });
    });

  // The first pulse of animal life. It used to be a dead-accurate 62 bpm
  // forever, which the ear locks onto within a minute and then cannot ignore.
  // It now breathes (+/-7% per beat) and stops to rest every ten beats or so,
  // which is what makes it read as a body rather than a click track.
  let bpm = 56;
  let beats = 0;
  let restIn = rint(8, 15);
  b.every(() => {
    beats++;
    if (beats >= restIn) { beats = 0; restIn = rint(8, 15); return (60 / bpm) * rnd(2.6, 5.5); }
    return (60 / bpm) * rnd(0.93, 1.08);
  }, (t) => {
    thump(b.score, b.mix, t, { freq: 56, dur: 0.46, peak: rnd(0.15, 0.2), drop: 0.55 });
    thump(b.score, b.mix, t + rnd(0.24, 0.3), { freq: 50, dur: 0.38, peak: rnd(0.08, 0.12), drop: 0.6 });
  });

  b.every(() => rnd(3.5, 8) / b.density, (t) => {
    pluckVoice(b.score, b.mix, t, {
      freq: degree(pick([0, 2, 4, 6, 7]), rint(1, 2)), dur: rnd(2.4, 4.5),
      peak: 0.04, pan: rnd(-0.7, 0.7), open: rnd(3, 6)
    });
  });
  b.onUpdate = (s) => { b.density = 0.6 + s.intensity * 1.2; bpm = 50 + s.intensity * 18; };
}

function bedDay7(b) {
  b.colorRange = [700, 2800];
  b.baseWet = 0.62;
  b.wet.gain.setValueAtTime(0.62, b.ctx.currentTime);

  // everything stripped away: one golden chord over a very deep silence
  [[0, -2, 0.12, 'sine'], [0, 0, 0.065, 'sine'], [4, 0, 0.045, 'sine'],
   [2, 1, 0.025, 'sine'], [0, 2, 0.011, 'sine']]
    .forEach(([d, o, g, type], i) => {
      const f = degree(d, o);
      const v = b.drone({ freq: f, type, gain: g, attack: 12 + i * 4, pan: Math.sin(i * 2.3) * 0.45, detune: softDetune(f) });
      if (v) b.lfo(v.gain.gain, { rate: slowRate(i, 0.0055), depth: g * 0.42 });
    });
  b.driftCents = 1.2;

  // one long exhale every half-minute or so, and nothing else
  b.every(() => rnd(26, 52), (t) => {
    noise(b.score, b.mix, t, {
      color: 'pink', dur: rnd(8, 13), peak: 0.024, attack: 4.5, pan: rnd(-0.4, 0.4),
      filter: { type: 'lowpass', freq: 700, Q: 0.6, sweepTo: 260, sweepTime: 8 }
    });
    bell(b.score, b.mix, t + rnd(1, 5), { freq: degree(0, 1), dur: rnd(11, 17), peak: 0.022 });
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

  b.colorRange = muffle ? [280, 780] : [700, 4400];
  b.baseWet = 0.38 + muffle * 0.28;
  b.wet.gain.setValueAtTime(b.baseWet, b.ctx.currentTime);

  [[0, -1, 0.17, 'sine'], [4, -1, 0.085, 'sine'], [0, 0, 0.06, 'triangle'],
   [2, 0, 0.045, 'triangle'], [4, 0, 0.032, 'sine'], [6, 0, 0.018, 'sine']]
    .forEach(([d, o, g, type], i) => {
      const fr = f(d, o);
      const v = b.drone({
        freq: fr, type, gain: g, attack: 6 + i * 2.5,
        pan: Math.sin(i * 1.6) * 0.5, detune: softDetune(fr)
      });
      if (v) b.lfo(v.gain.gain, { rate: slowRate(i, 0.0077), depth: g * 0.34, phase: i * 0.5 });
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
  b.every(() => rnd(3.4, 8) * sparse / b.density, (t) => {
    const d = pick([0, 1, 2, 4, 5]);
    pluckVoice(b.score, b.mix, t, {
      freq: f(d, rint(1, 2)), dur: rnd(2.8, 5.5), peak: rnd(0.035, 0.065),
      pan: rnd(-0.6, 0.6), open: rnd(3, 6)
    });
    if (Math.random() < 0.4) {
      pluckVoice(b.score, b.mix, t + rnd(0.35, 1.1), {
        freq: f(d + 2, 2), dur: rnd(2.4, 4), peak: 0.028, pan: rnd(-0.6, 0.6), open: rnd(3, 5)
      });
    }
  });

  // Birdlike high flickers. These were the brightest sustained-ish material
  // in the garden: 2.6-6 kHz bandpasses at Q 4 every few seconds. They are now
  // an octave lower, blunter (Q 2), quieter, and come round two to three times
  // less often — an occasional bird rather than an aviary.
  if (birds > 0) {
    b.every(() => rnd(8, 21) / birds, (t) => {
      const base = f(pick([4, 6, 7]), 2);
      const n = rint(2, 3);
      for (let i = 0; i < n; i++) {
        tone(b.score, b.mix, t + i * rnd(0.1, 0.24), {
          freq: base * rnd(0.95, 1.4), type: 'sine', dur: rnd(0.14, 0.3),
          peak: rnd(0.01, 0.022), attack: 0.02, pan: rnd(-0.9, 0.9),
          glideTo: base * rnd(1.05, 1.5), glideTime: 0.18,
          filter: { type: 'bandpass', freq: rnd(1300, 2600), Q: 2 }
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
  b.driftCents = 3;
  b.baseWet = 0.55;
  b.wet.gain.setValueAtTime(0.55, b.ctx.currentTime);

  // a single voice calling into the empty middle register
  b.every(() => rnd(17, 38), (t) => {
    tone(b.score, b.mix, t, {
      freq: vary(degree(0, 1, EDENIC), 8), type: 'sine', dur: rnd(6, 10), peak: 0.04, attack: 3,
      pan: rnd(-0.3, 0.3)
    });
  });

  const base = b.onUpdate;
  b.onUpdate = (s, t) => {
    if (base) base(s, t);
    b.score.reverb.setTone(3400 - s.loneliness * 1700, t);
  };
}

function bedTardemah(b) {
  b.colorRange = [200, 1100];
  b.baseWet = 0.6;
  b.wet.gain.setValueAtTime(0.6, b.ctx.currentTime);
  // 14 cents of random re-aiming every few seconds was a seasick wobble, not
  // a dream. The dreaminess now lives in the pitch bends below instead.
  b.driftCents = 3.5;

  const voices = [];
  [[0, -1, 0.18], [4, -1, 0.085], [0, 0, 0.05], [2, 0, 0.035]].forEach(([d, o, g], i) => {
    const v = b.drone({ freq: degree(d, o, EDENIC), type: 'sine', gain: g, attack: 7 + i * 3, pan: Math.sin(i * 2) * 0.5 });
    if (v) { voices.push(v); b.lfo(v.gain.gain, { rate: slowRate(i, 0.0064), depth: g * 0.4 }); }
  });

  b.noiseLayer({ color: 'brown', gain: 0.1, attack: 8, filter: { type: 'lowpass', freq: 140, Q: 0.7 } });

  // Dreamlike pitch bends. Each voice is bent independently and by a
  // different amount, so the stack smears rather than beating against itself.
  b.every(() => rnd(11, 26), (t) => {
    for (const v of voices) {
      if (Math.random() < 0.4) continue;
      const f = v.osc.frequency;
      const cur = Math.max(8, f.value);
      f.cancelScheduledValues(t);
      f.setValueAtTime(cur, t);
      f.exponentialRampToValueAtTime(Math.max(8, cur * rnd(0.975, 1.03)), t + rnd(6, 13));
    }
  });

  // A slowed heartbeat, heard through water — humanised and resting, like the
  // day6 pulse, so it never becomes a metronome under the sleeping body.
  let bpm = 38;
  let beats = 0;
  let restIn = rint(6, 12);
  b.every(() => {
    beats++;
    if (beats >= restIn) { beats = 0; restIn = rint(6, 12); return (60 / bpm) * rnd(2.2, 4.5); }
    return (60 / bpm) * rnd(0.9, 1.12);
  }, (t) => {
    thump(b.score, b.mix, t, { freq: 46, dur: 0.8, peak: rnd(0.16, 0.22), drop: 0.5, attack: 0.03 });
    thump(b.score, b.mix, t + rnd(0.33, 0.42), { freq: 42, dur: 0.65, peak: rnd(0.08, 0.12), drop: 0.55, attack: 0.03 });
  });
  b.onUpdate = (s) => { bpm = 34 + s.intensity * 10; };
}

function bedEve(b) {
  // Still the first real consonance in the piece, and still the warmest thing
  // in it — but the warmth now comes from the voicing rather than from a
  // 15 kHz ceiling. Nothing here is detuned enough to shimmer.
  b.colorRange = [900, 5200];
  b.baseWet = 0.42;
  b.wet.gain.setValueAtTime(0.42, b.ctx.currentTime);
  b.driftCents = 1.2;

  const r = ROOT;
  [[0, -1, 0.17, 'sine', 4], [0, 0, 0.085, 'sine', 5], [4, 0, 0.07, 'sine', 6],
   [2, 0, 0.06, 'triangle', 8], [0, 1, 0.034, 'sine', 10], [4, 1, 0.02, 'sine', 13],
   [2, 2, 0.009, 'sine', 16]]
    .forEach(([d, o, g, type, at], i) => {
      const f = degree(d, o, EDENIC, r);
      const v = b.drone({ freq: f, type, gain: g, attack: at, pan: Math.sin(i * 1.4) * 0.55, detune: softDetune(f, 0.2) });
      if (v) b.lfo(v.gain.gain, { rate: slowRate(i, 0.0066), depth: g * 0.3 });
    });

  // a rising figure that keeps opening upward
  b.every(() => rnd(6, 13), (t) => {
    const start = pick([0, 2, 4]);
    for (let i = 0; i < 4; i++) {
      pluckVoice(b.score, b.mix, t + i * rnd(0.26, 0.48), {
        freq: degree(start + i * 2, 1, EDENIC, r), dur: rnd(3, 5.5),
        peak: 0.05 - i * 0.007, pan: rnd(-0.5, 0.5), open: rnd(4, 6)
      });
    }
  });
  b.every(() => rnd(13, 27), (t) => {
    bell(b.score, b.mix, t, { freq: degree(pick([0, 4, 7]), 2, EDENIC, r), dur: rnd(6, 11), peak: 0.03 });
  });
}

/* --- the serpent and the fall ------------------------------------------- */

function serpentCore(b, { creep = 0 } = {}) {
  b.colorRange = [700, 3800];
  b.baseWet = 0.16; // close and dry: he is standing right next to you
  b.wet.gain.setValueAtTime(0.16, b.ctx.currentTime);
  b.driftCents = 2.5;

  // sweet surface
  const surface = [];
  [[0, 0, 0.06, 'sine'], [2, 0, 0.045, 'sine'], [4, 0, 0.032, 'triangle']].forEach(([d, o, g, type], i) => {
    const v = b.drone({ freq: degree(d, o, EDENIC), type, gain: g, attack: 4 + i * 2, pan: Math.sin(i * 1.8) * 0.4 });
    if (v) { surface.push(v); b.lfo(v.gain.gain, { rate: slowRate(i, 0.0092), depth: g * 0.3 }); }
  });

  // underneath: a low voice creeping chromatically, never quite still
  const low = b.drone({ freq: degree(0, -1), type: 'sawtooth', gain: 0.075, attack: 5, filter: { type: 'lowpass', freq: 150, Q: 0.9 } });
  let step = 0;
  b.every(() => rnd(9, 19), (t) => {
    if (!low) return;
    step = (step + (Math.random() < 0.7 ? 1 : -1));
    step = clamp(step, -3, 3);
    const f = low.osc.frequency;
    f.cancelScheduledValues(t);
    f.setValueAtTime(Math.max(8, f.value), t);
    f.exponentialRampToValueAtTime(Math.max(8, semi(degree(0, -1), step)), t + rnd(7, 13));
  });

  // Sibilance, barely there. It used to reach 7.2 kHz, which over a long
  // temptation scene was the sharpest recurring thing in the piece. Now it
  // lives between 2 and 4 kHz, fades in over a third of a second, and is
  // roughly half as loud and half as frequent.
  b.every(() => rnd(9, 24), (t) => {
    noise(b.score, b.mix, t, {
      color: 'pink', dur: rnd(0.8, 1.9), peak: 0.013, attack: 0.4, pan: rnd(-0.8, 0.8),
      filter: { type: 'bandpass', freq: rnd(2000, 3600), Q: 1.4, sweepTo: rnd(1100, 1900), sweepTime: 1.3 }
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
    // the b2 as a lean, not a drone: it always moves on to the third
    b.every(() => rnd(21, 44), (t) => {
      tone(b.score, b.mix, t, {
        freq: degree(1, 1), type: 'sine', dur: rnd(5, 9), peak: 0.026, attack: 2.6,
        pan: rnd(-0.6, 0.6), glideTo: degree(2, 1), glideTime: 5
      });
    });
  }
}

function bedSerpent(b) { serpentCore(b, {}); }
function bedTemptation(b) { serpentCore(b, { creep: 1 }); }

function bedFall(b) {
  b.colorRange = [260, 2400];
  b.baseWet = 0.55;
  b.wet.gain.setValueAtTime(0.55, b.ctx.currentTime);
  b.hollowDepth = 0.8;
  b.driftCents = 4;

  // The centre still drops a semitone, and the stack still comes apart — but
  // the coming-apart is now a slow sinking, not a 5 Hz tremble. Two changes:
  // the sustained b2 is gone (degree 3, the fourth, is just as unresolved and
  // far less sour over minutes), and the detune spread tops out at 18 cents
  // instead of 56, with the sawtooths filtered much lower so their upper
  // harmonics cannot beat.
  const r = semi(ROOT, -1);
  const t0 = b.ctx.currentTime;
  [[0, -1, 0.2, 'sine'], [0, 0, 0.075, 'sawtooth'], [3, 0, 0.05, 'triangle'],
   [4, 0, 0.045, 'triangle'], [0, 1, 0.022, 'triangle']]
    .forEach(([d, o, g, type], i) => {
      const v = b.drone({
        freq: degree(d, o, AHAVA, r), type, gain: g, attack: 1.2 + i * 0.6,
        pan: Math.sin(i * 1.5) * 0.6, detune: 0,
        filter: { type: 'lowpass', freq: 900 - i * 90, Q: 0.8 }
      });
      if (v) {
        const amt = (i % 2 ? 1 : -1) * (5 + i * 3.2);
        v.osc.detune.setValueAtTime(0, t0);
        v.osc.detune.linearRampToValueAtTime(amt, t0 + rnd(14, 30));
      }
    });

  b.noiseLayer({ color: 'brown', gain: 0.2, attack: 3, filter: { type: 'lowpass', freq: 120, Q: 0.8 } });

  b.every(() => rnd(8, 19), (t) => {
    noise(b.score, b.mix, t, {
      color: 'brown', dur: rnd(4, 8), peak: 0.095, attack: 1.4, pan: rnd(-0.7, 0.7),
      filter: { type: 'lowpass', freq: rnd(300, 650), Q: 1.4, sweepTo: 85, sweepTime: 5 }
    });
  });
  // the b2 survives the fall as a melodic sag: the tonic leans down to it
  b.every(() => rnd(14, 29), (t) => {
    const f0 = degree(0, 0, AHAVA, r);
    tone(b.score, b.mix, t, {
      freq: f0, type: 'triangle', dur: rnd(6, 11), peak: 0.04, attack: 2.4,
      glideTo: f0 * 0.944, glideTime: 8, pan: rnd(-0.5, 0.5),
      filter: { type: 'lowpass', freq: 800, Q: 1, sweepTo: 240, sweepTime: 7 }
    });
  });
}

/* --- after ---------------------------------------------------------------- */

function bedHiding(b) {
  b.colorRange = [200, 1600];
  b.baseWet = 0.3;
  b.wet.gain.setValueAtTime(0.3, b.ctx.currentTime);

  // room tone and almost nothing else
  b.noiseLayer({ color: 'brown', gain: 0.09, attack: 6, filter: { type: 'lowpass', freq: 100, Q: 0.6 } });
  b.noiseLayer({ color: 'pink', gain: 0.012, attack: 9, pan: -0.2, filter: { type: 'bandpass', freq: 430, Q: 1.6 } });
  const v = b.drone({ freq: degree(0, -2), type: 'sine', gain: 0.08, attack: 11 });
  if (v) b.lfo(v.gain.gain, { rate: slowRate(0, 0.0086), depth: 0.026 });

  // held breath
  b.every(() => rnd(5, 12), (t) => {
    noise(b.score, b.mix, t, {
      color: 'pink', dur: rnd(1.1, 2.1), peak: rnd(0.014, 0.026), attack: 0.5, pan: rnd(-0.25, 0.25),
      filter: { type: 'bandpass', freq: rnd(400, 850), Q: 1.4, sweepTo: rnd(260, 520), sweepTime: 1.4 }
    });
  });

  // A distant tread, coming closer and not arriving. The gap between steps is
  // now wide and uneven — a regular footfall every four seconds for minutes on
  // end is a drum machine, however quiet it is.
  b.every(() => rnd(4, 13), (t) => {
    const near = rnd(0.2, 0.7);
    thump(b.score, b.mix, t, { freq: rnd(42, 56), dur: 0.8, peak: 0.075 * near, drop: 0.5, pan: rnd(-0.7, 0.7), attack: 0.03 });
    if (Math.random() < 0.35) {
      thump(b.score, b.mix, t + rnd(0.55, 0.95), { freq: rnd(42, 56), dur: 0.8, peak: 0.06 * near, drop: 0.5, pan: rnd(-0.7, 0.7), attack: 0.03 });
    }
  });
}

function bedJudgment(b) {
  b.colorRange = [280, 3000];
  b.baseWet = 0.5;
  b.wet.gain.setValueAtTime(0.5, b.ctx.currentTime);
  b.driftCents = 2;

  // Low brass-like saw stacks: slow, immense, unhurried. A sawtooth at 18 Hz
  // with 8 cents of detune beats at 2.5 Hz by its thirtieth harmonic, which is
  // where the old version's grind came from — the detune is now beat-safe for
  // each voice's own register, and only the bottom two are sawtooths.
  const stack = [[0, -2, 0.18], [0, -1, 0.12], [4, -1, 0.085], [0, 0, 0.055], [3, 0, 0.035], [6, 0, 0.022]];
  const voices = [];
  stack.forEach(([d, o, g], i) => {
    const f = degree(d, o);
    const v = b.drone({
      freq: f, type: i < 2 ? 'sawtooth' : 'triangle', gain: g, attack: 8 + i * 3,
      pan: Math.sin(i * 1.3) * 0.5, detune: softDetune(f * (i < 2 ? 8 : 2), 0.4),
      filter: { type: 'lowpass', freq: 380 + i * 90, Q: 0.8 }
    });
    if (v) voices.push(v);
  });

  // immense swells that take half a minute to arrive, and never the same two
  b.every(() => rnd(24, 48), (t) => {
    for (const v of voices) {
      if (!v.filter) continue;
      const f = v.filter.frequency;
      f.cancelScheduledValues(t);
      f.setValueAtTime(Math.max(20, f.value), t);
      f.linearRampToValueAtTime(rnd(900, 1800), t + rnd(9, 16));
      f.linearRampToValueAtTime(rnd(280, 520), t + rnd(20, 32));
    }
    thump(b.score, b.mix, t + rnd(2, 8), { freq: 38, dur: 2.8, peak: 0.2, drop: 0.7, attack: 0.08 });
  });

  b.onUpdate = (s, t) => {
    for (const v of voices) {
      if (v.gain) v.gain.gain.setTargetAtTime(clamp(0.045 + s.intensity * 0.09, 0.015, 0.16), t, 5);
    }
  };
}

function bedExile(b) {
  // Eden itself, a fourth down and heard through a wall you cannot re-enter.
  edenCore(b, { transpose: -5, muffle: 1, sparse: 1.8, birds: 0.25 });
  b.baseWet = 0.62;
  b.wet.gain.setValueAtTime(0.62, b.ctx.currentTime);
  b.hollowDepth = 0.7;
  b.driftCents = 2.5;

  // wind outside the gate — narrower and lower, so it reads as weather rather
  // than as the hiss of the system it is playing on
  b.noiseLayer({ color: 'pink', gain: 0.055, attack: 10, filter: { type: 'bandpass', freq: 300, Q: 1.3 } });
  b.every(() => rnd(12, 27), (t) => {
    noise(b.score, b.mix, t, {
      color: 'pink', dur: rnd(6, 13), peak: 0.045, attack: 3.5, pan: rnd(-0.9, 0.9),
      filter: { type: 'bandpass', freq: rnd(220, 520), Q: 1.4, sweepTo: rnd(130, 280), sweepTime: 7 }
    });
  });
}

function bedEpilogue(b) {
  // Still one tone decaying. Slightly darker, slightly quieter, and the gap
  // between strikes is wide enough that you never quite anticipate the next.
  b.colorRange = [700, 3200];
  b.baseWet = 0.72;
  b.wet.gain.setValueAtTime(0.72, b.ctx.currentTime);
  b.driftCents = 0.8;

  const strike = (t) => {
    bell(b.score, b.mix, t, {
      freq: vary(degree(0, 1), 4), dur: rnd(18, 27), peak: 0.055,
      ratios: [1, 2, 3.01, 4.02]
    });
    tone(b.score, b.mix, t, { freq: degree(0, -1), type: 'sine', dur: rnd(15, 22), peak: 0.07, attack: 1.4 });
  };
  b.every(() => rnd(30, 54), strike, { immediate: true });
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
 * of sweeping formant bandpasses, with a breathed onset and a tail that blooms
 * into the reverb after the voice itself has gone.
 *
 * This cue has been retired from gameplay (the player no longer holds a button
 * to speak each day) and the API only has to keep working, so it has been
 * softened hard rather than preserved. It was the harshest thing in the score:
 * resonant formants at Q 5.5 and 7.5 ringing on the 'ee' vowel's 2.29 kHz
 * upper formant, a 14 ms onset, a 160 ms-peak noise consonant, and nine
 * partials reaching past 3 kHz. It is now: Q 2.4 and 3.0, partials capped at
 * six and lowpassed as a group, a consonant a quarter as loud with a 25 ms
 * fade, and an onset that takes a tenth of a second. It still sounds like a
 * voice; it no longer sounds like a voice through a resonant filter bank.
 */
function cueWord(s, o = {}) {
  const ctx = s.ctx;
  const t = ctx.currentTime + 0.02;
  const day = clamp(Math.round(num(o.day, 1)), 1, 8);
  const spec = WORD_DAYS[day - 1];
  const scale = day >= 7 ? EDENIC : AHAVA;
  const f0 = vary(degree(spec.deg, spec.oct, scale), 12) * (o.octave ? Math.pow(2, o.octave) : 1);
  const dur = spec.len * num(o.length, 1) * jitter(0.06);
  const gain = clamp(num(o.gain, 1), 0, 2) * 0.62;

  const ttl = dur * 2 + 3;
  const bus = s._cueBus(0.55, 0.14, ttl);
  const body = ctx.createGain();
  body.gain.setValueAtTime(FLOOR, t);

  // a group lowpass in front of the formants: nothing in this voice needs to
  // live above about 2.4 kHz
  const roof = ctx.createBiquadFilter();
  roof.type = 'lowpass';
  roof.frequency.setValueAtTime(2400, t);
  roof.Q.setValueAtTime(0.6, t);
  roof.connect(bus);

  // two formants in parallel, swept through the vowel path
  const formants = spec.path.map((v) => VOWELS[v] || VOWELS.aa);
  const fNodes = [roof];
  for (let k = 0; k < 2; k++) {
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.Q.setValueAtTime(k === 0 ? 2.4 : 3, t);
    f.frequency.setValueAtTime(formants[0][k], t);
    const seg = dur * 0.45 / (formants.length - 1 || 1);
    formants.forEach((fm, i) => {
      if (i === 0) return;
      f.frequency.linearRampToValueAtTime(fm[k] * rnd(0.94, 1.06), t + 0.12 + seg * i);
    });
    f.frequency.linearRampToValueAtTime(formants[formants.length - 1][k] * 0.8, t + dur * 0.8);
    const fg = ctx.createGain();
    fg.gain.setValueAtTime(k === 0 ? 0.85 : 0.32, t);
    body.connect(f); f.connect(fg); fg.connect(roof);
    fNodes.push(f, fg);
  }
  // a darkened direct path keeps the fundamental present
  const direct = ctx.createBiquadFilter();
  direct.type = 'lowpass';
  direct.frequency.setValueAtTime(clamp(f0 * 4, 80, 1400), t);
  direct.Q.setValueAtTime(0.6, t);
  const directG = ctx.createGain();
  directG.gain.setValueAtTime(0.55, t);
  body.connect(direct); direct.connect(directG); directG.connect(bus);

  // the harmonic stack
  const srcs = [];
  const nodes = [body, direct, directG, bus].concat(fNodes);
  const partials = [1, 2, 3, 4, 5, 6];
  partials.forEach((n, i) => {
    const osc = ctx.createOscillator();
    osc.type = n === 1 ? 'triangle' : 'sine';
    osc.frequency.setValueAtTime(f0 * n, t);
    osc.detune.setValueAtTime(softDetune(f0 * n, 0.3), t);
    // the voice settles slightly flat as it speaks
    osc.frequency.exponentialRampToValueAtTime(Math.max(8, f0 * n * 0.991), t + dur);
    const g = ctx.createGain();
    const amp = (0.45 / (1 + i * 1.25)) * gain;
    g.gain.setValueAtTime(FLOOR, t);
    g.gain.linearRampToValueAtTime(amp, t + 0.07 + i * 0.02);
    g.gain.exponentialRampToValueAtTime(Math.max(FLOOR, amp * 0.3), t + dur * 0.4);
    g.gain.exponentialRampToValueAtTime(FLOOR, t + dur);
    osc.connect(g); g.connect(body);
    osc.start(t);
    srcs.push(osc); nodes.push(g);
  });

  // slow vibrato: alive, not mechanical
  const vib = ctx.createOscillator();
  const vibG = ctx.createGain();
  vib.frequency.setValueAtTime(rnd(3.4, 4.3), t);
  vibG.gain.setValueAtTime(0, t);
  vibG.gain.linearRampToValueAtTime(rnd(2, 4.5), t + dur * 0.45);
  vib.connect(vibG);
  try { vibG.connect(srcs[0].detune); } catch (e) { /* ignore */ }
  vib.start(t); srcs.push(vib); nodes.push(vibG);

  // body envelope: breathed onset, long bloom
  body.gain.setValueAtTime(FLOOR, t);
  body.gain.linearRampToValueAtTime(0.5 * gain, t + 0.1);
  body.gain.exponentialRampToValueAtTime(Math.max(FLOOR, 0.3 * gain), t + 0.6);
  body.gain.exponentialRampToValueAtTime(FLOOR, t + dur * 1.02);

  life(s, srcs, nodes, t + dur + 0.2);

  // consonantal onset — a breath now, not a click
  noise(s, s._cueBus(0.3, 0, 2), t, {
    color: 'pink', dur: 0.22, peak: 0.04 * gain, attack: 0.025,
    filter: { type: 'bandpass', freq: clamp(formants[0][1] * 0.7, 200, 1800), Q: 1.1, sweepTo: formants[0][0], sweepTime: 0.18 }
  });
  // sub-weight under the utterance
  tone(s, s._cueBus(0.25, 0, ttl), t, {
    freq: f0 / 2, type: 'sine', dur: dur * 0.75, peak: 0.18 * gain, attack: 0.09
  });
  // the tail blooms into the room after the voice stops
  const bloom = s._cueBus(1, 0.08, ttl);
  bloom.gain.setValueAtTime(FLOOR, t);
  bloom.gain.linearRampToValueAtTime(0.16 * gain, t + dur * 0.55);
  bloom.gain.exponentialRampToValueAtTime(FLOOR, t + dur * 1.6);
  tone(s, bloom, t + dur * 0.2, {
    freq: f0 * 2, type: 'sine', dur: dur * 1.3, peak: 0.26, attack: dur * 0.3,
    filter: { type: 'lowpass', freq: clamp(f0 * 6, 200, 2600), Q: 0.6, sweepTo: clamp(f0 * 2, 100, 1200), sweepTime: dur }
  });
}

const CUES = {
  word: cueWord,

  light: (s) => {
    const t = s.ctx.currentTime + 0.01;
    const d = s._cueBus(0.6, 0.1);
    // the bloom used to sweep to 7.2 kHz; it opens to 2.6 kHz now and the
    // opening is what carries it, not the brightness it arrives at
    noise(s, d, t, {
      color: 'pink', dur: 3, peak: 0.1, attack: 1.3,
      filter: { type: 'bandpass', freq: 200, Q: 1.1, sweepTo: 2600, sweepTime: 2 }
    });
    [0, 4, 7, 11].forEach((deg, i) => {
      tone(s, d, t + 0.35 + i * rnd(0.05, 0.12), {
        freq: vary(degree(deg, 0, EDENIC), 6), type: 'sine', dur: 5 - i * 0.4,
        peak: 0.085 / (1 + i * 0.6), attack: 0.8, pan: Math.sin(i * 2) * 0.6
      });
    });
    tone(s, d, t, { freq: degree(0, -1), type: 'sine', dur: 3.6, peak: 0.16, attack: 0.55 });
  },

  separate: (s) => {
    const t = s.ctx.currentTime + 0.01;
    const d = s._cueBus(0.45, 0);
    const f = vary(degree(0, 0), 8);
    tone(s, d, t, { freq: f, type: 'triangle', dur: 3.2, peak: 0.09, attack: 0.25, pan: -0.35, glideTo: f / 2, glideTime: 2.2 });
    tone(s, d, t, { freq: f, type: 'sine', dur: 3.2, peak: 0.075, attack: 0.25, pan: 0.35, glideTo: f * 3, glideTime: 2.2 });
    noise(s, d, t, { color: 'pink', dur: 1.8, peak: 0.04, attack: 0.5, filter: { type: 'bandpass', freq: 700, Q: 1.2, sweepTo: 1700, sweepTime: 1.5 } });
  },

  land: (s) => {
    const t = s.ctx.currentTime + 0.01;
    const d = s._cueBus(0.4, 0);
    thump(s, d, t, { freq: 52, dur: 2, peak: 0.36, drop: 0.45, attack: 0.03 });
    noise(s, d, t + 0.02, {
      color: 'brown', dur: 1.8, peak: 0.11, attack: 0.05,
      filter: { type: 'lowpass', freq: 500, Q: 0.9, sweepTo: 120, sweepTime: 1.5 }
    });
    tone(s, d, t + 0.05, { freq: degree(0, -1), type: 'triangle', dur: 3.8, peak: 0.1, attack: 0.3 });
  },

  growth: (s) => {
    const t = s.ctx.currentTime + 0.01;
    const d = s._cueBus(0.5, 0.12);
    for (let i = 0; i < 5; i++) {
      pluckVoice(s, d, t + i * rnd(0.14, 0.26), {
        freq: degree(i * 2, 1), dur: rnd(2, 3.4), peak: 0.055 - i * 0.006,
        pan: rnd(-0.6, 0.6), open: rnd(3, 5)
      });
    }
    noise(s, d, t, { color: 'pink', dur: 2.2, peak: 0.035, attack: 0.8, filter: { type: 'bandpass', freq: 500, Q: 1.2, sweepTo: 1600, sweepTime: 1.8 } });
  },

  stars: (s) => {
    const t = s.ctx.currentTime + 0.01;
    const d = s._cueBus(0.8, 0.2);
    // fewer, lower, more spread out in time — a sky, not a glockenspiel
    for (let i = 0; i < 6; i++) {
      bell(s, d, t + rnd(0, 2.8), {
        freq: degree(pick([0, 2, 4, 6, 7, 9]), rint(1, 2)), dur: rnd(3, 6.5),
        peak: rnd(0.014, 0.028), pan: rnd(-0.9, 0.9)
      });
    }
  },

  swarm: (s) => {
    const t = s.ctx.currentTime + 0.01;
    const d = s._cueBus(0.35, 0.1);
    noise(s, d, t, { color: 'pink', dur: 1.6, peak: 0.045, attack: 0.3, filter: { type: 'bandpass', freq: 1300, Q: 2.4, sweepTo: 700, sweepTime: 1.3 } });
    for (let i = 0; i < 9; i++) {
      tone(s, d, t + i * rnd(0.05, 0.14), {
        freq: vary(degree(rint(0, 8), rint(1, 2)), 15), type: 'triangle', dur: rnd(0.18, 0.4),
        peak: rnd(0.012, 0.028), attack: rnd(0.018, 0.04), pan: rnd(-0.9, 0.9),
        filter: { type: 'bandpass', freq: rnd(800, 2200), Q: 1.8 }
      });
    }
  },

  wings: (s) => {
    const t = s.ctx.currentTime + 0.01;
    const d = s._cueBus(0.4, 0);
    const ctx = s.ctx;
    const dur = 1.5 * jitter(0.1);
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer(ctx, 'pink', 3);
    src.loop = true;
    const flt = ctx.createBiquadFilter();
    flt.type = 'bandpass';
    flt.frequency.setValueAtTime(rnd(420, 560), t);
    flt.Q.setValueAtTime(1.1, t);
    flt.frequency.linearRampToValueAtTime(rnd(950, 1250), t + dur);
    const g = ctx.createGain();
    const p = panner(ctx, -0.7);
    const nodes = [flt, g, d];
    src.connect(flt); flt.connect(g);
    if (p) { g.connect(p); p.connect(d); nodes.push(p); p.pan.linearRampToValueAtTime(0.7, t + dur); }
    else g.connect(d);
    // wing-beat amplitude, slightly uneven so it reads as an animal
    g.gain.setValueAtTime(FLOOR, t);
    const beats = rint(8, 11);
    for (let i = 0; i < beats; i++) {
      const bt = t + 0.03 + i * (dur / beats);
      g.gain.linearRampToValueAtTime(0.07 * (1 - i / beats * 0.6) * jitter(0.12), bt);
      g.gain.linearRampToValueAtTime(0.009, bt + dur / beats * 0.55);
    }
    g.gain.exponentialRampToValueAtTime(FLOOR, t + dur + 0.25);
    src.start(t, Math.random());
    life(s, src, nodes, t + dur + 0.35);
  },

  breath: (s) => {
    const t = s.ctx.currentTime + 0.01;
    const d = s._cueBus(0.45, 0);
    noise(s, d, t, {
      color: 'pink', dur: 1.7, peak: 0.075, attack: 0.9,
      filter: { type: 'bandpass', freq: 380, Q: 1.1, sweepTo: 950, sweepTime: 1.5, hp: 160 }
    });
    noise(s, d, t + 1.6, {
      color: 'pink', dur: 2.8, peak: 0.06, attack: 0.45,
      filter: { type: 'bandpass', freq: 900, Q: 1.3, sweepTo: 300, sweepTime: 2.4, hp: 140 }
    });
    tone(s, d, t + 1.55, { freq: degree(0, 0), type: 'sine', dur: 5, peak: 0.065, attack: 1.5 });
    tone(s, d, t + 1.55, { freq: degree(4, 0), type: 'sine', dur: 4.4, peak: 0.04, attack: 1.8, pan: 0.35 });
  },

  rest: (s) => {
    const t = s.ctx.currentTime + 0.01;
    const d = s._cueBus(0.8, 0.1);
    [[0, -1, 0.12], [0, 0, 0.065], [4, 0, 0.045], [2, 1, 0.022]].forEach(([deg, o, g], i) => {
      tone(s, d, t + i * rnd(0.05, 0.14), {
        freq: degree(deg, o, EDENIC), type: 'sine', dur: 7.5 - i * 0.5, peak: g,
        attack: 1 + i * 0.3, pan: Math.sin(i * 2) * 0.4
      });
    });
  },

  name: (s, o = {}) => {
    const t = s.ctx.currentTime + 0.01;
    const d = s._cueBus(0.4, 0.08, 5);
    const a = rint(0, 5);
    const b = a + pick([1, 2, 2, 3, -2]);
    pluckVoice(s, d, t, { freq: degree(a, 1, EDENIC), dur: 2.2, peak: 0.05, pan: -0.25, open: rnd(3, 5) });
    pluckVoice(s, d, t + rnd(0.22, 0.42), { freq: degree(b, 1, EDENIC), dur: 2.8, peak: 0.042, pan: 0.25, open: rnd(3, 5) });
    tone(s, d, t, { freq: degree(a, -1, EDENIC), type: 'sine', dur: 3, peak: num(o.gain, 0.055), attack: 0.6 });
  },

  // Fires on a loop for minutes at a time in the tardemah scenes, so it has
  // the softest onset and the widest per-firing variation of anything here.
  heartbeat: (s, o = {}) => {
    const t = s.ctx.currentTime + 0.01;
    const d = s._cueBus(0.22, 0, 2);
    const g = clamp(num(o.gain, 1), 0, 2);
    thump(s, d, t, { freq: rnd(54, 60), dur: 0.5, peak: rnd(0.16, 0.21) * g, drop: 0.55, attack: 0.028 });
    thump(s, d, t + rnd(0.24, 0.31), { freq: rnd(47, 52), dur: 0.4, peak: rnd(0.09, 0.13) * g, drop: 0.6, attack: 0.028 });
  },

  rib: (s) => {
    const t = s.ctx.currentTime + 0.01;
    const d = s._cueBus(0.55, 0);
    // the snap was a 1.2 ms transient at 2.3 kHz — a wince every time. It is
    // now a soft give, and the drawing-out carries the moment instead.
    noise(s, d, t, { color: 'pink', dur: 0.14, peak: 0.07, attack: 0.012, filter: { type: 'bandpass', freq: 1100, Q: 0.9, sweepTo: 500, sweepTime: 0.12 } });
    thump(s, d, t, { freq: 88, dur: 0.36, peak: 0.14, drop: 0.5, grit: false, attack: 0.02 });
    tone(s, d, t + 0.05, {
      freq: degree(0, 0), type: 'triangle', dur: 3.8, peak: 0.085, attack: 0.15,
      glideTo: degree(4, 1), glideTime: 2.8,
      filter: { type: 'bandpass', freq: 600, Q: 1.4, sweepTo: 1700, sweepTime: 2.8 }
    });
    bell(s, d, t + 0.5, { freq: degree(4, 1, EDENIC), dur: 4, peak: 0.026 });
  },

  awake: (s) => {
    const t = s.ctx.currentTime + 0.01;
    const d = s._cueBus(0.6, 0.12);
    noise(s, d, t, { color: 'pink', dur: 2.8, peak: 0.05, attack: 1.6, filter: { type: 'lowpass', freq: 260, Q: 0.8, sweepTo: 2200, sweepTime: 2.4 } });
    [[0, -1, 0.12], [0, 0, 0.075], [2, 0, 0.06], [4, 0, 0.045], [0, 1, 0.022]].forEach(([deg, o, g], i) => {
      tone(s, d, t + i * rnd(0.09, 0.2), {
        freq: degree(deg, o, EDENIC), type: i ? 'sine' : 'triangle', dur: 6.5 - i * 0.4,
        peak: g, attack: 1.3 + i * 0.3, pan: Math.sin(i * 1.7) * 0.5,
        filter: { type: 'lowpass', freq: 350, Q: 0.7, sweepTo: 2800, sweepTime: 2.6 }
      });
    });
  },

  hiss: (s) => {
    const t = s.ctx.currentTime + 0.01;
    const d = s._cueBus(0.1, 0); // dry: right at your ear
    // down two octaves from the old 5-7 kHz band, and a third as loud: it
    // should feel close, which is about proximity, not about treble
    noise(s, d, t, {
      color: 'pink', dur: rnd(1.3, 2.1), peak: 0.045, attack: 0.35, pan: rnd(-0.75, -0.3),
      filter: { type: 'bandpass', freq: rnd(1700, 2600), Q: 1.6, sweepTo: rnd(900, 1500), sweepTime: 1.5 }
    });
    // the b2 leaning down onto the tonic — melodic, and it resolves
    tone(s, d, t + 0.15, {
      freq: degree(1, 0), type: 'sine', dur: 1.9, peak: 0.028, attack: 0.45,
      glideTo: degree(0, 0), glideTime: 1.4, pan: -0.4
    });
  },

  pluck: (s) => {
    const t = s.ctx.currentTime + 0.01;
    const d = s._cueBus(0.3, 0, 3);
    noise(s, d, t, { color: 'pink', dur: 0.12, peak: 0.045, attack: 0.012, filter: { type: 'bandpass', freq: rnd(700, 1100), Q: 1, sweepTo: 400, sweepTime: 0.11 } });
    tone(s, d, t + 0.01, {
      freq: vary(degree(2, 1), 18), type: 'triangle', dur: 1.7, peak: 0.065, attack: 0.018,
      glideTo: degree(1, 1), glideTime: 1.1,
      filter: { type: 'lowpass', freq: 1500, Q: 0.9, sweepTo: 420, sweepTime: 1.2 }
    });
    thump(s, d, t + 0.06, { freq: 110, dur: 0.4, peak: 0.07, drop: 0.5, grit: false, attack: 0.02 });
  },

  bite: (s) => {
    const t = s.ctx.currentTime + 0.01;
    const d = s._cueBus(0.25, 0);
    noise(s, d, t, { color: 'pink', dur: 0.22, peak: 0.1, attack: 0.014, filter: { type: 'bandpass', freq: 1400, Q: 0.8, sweepTo: 380, sweepTime: 0.2 } });
    noise(s, d, t + 0.06, { color: 'brown', dur: 0.5, peak: 0.09, attack: 0.02, filter: { type: 'lowpass', freq: 900, Q: 1.2, sweepTo: 180, sweepTime: 0.45 } });
    thump(s, d, t, { freq: 76, dur: 0.7, peak: 0.2, drop: 0.4, attack: 0.025 });
    // the world flinches — the semitone sag that the whole second half inherits
    tone(s, d, t + 0.04, {
      freq: degree(0, 0), type: 'triangle', dur: 2.6, peak: 0.055, attack: 0.12,
      glideTo: semi(degree(0, 0), -1), glideTime: 2,
      filter: { type: 'lowpass', freq: 1100, Q: 1.2, sweepTo: 230, sweepTime: 2.2 }
    });
  },

  eyesOpen: (s) => {
    const t = s.ctx.currentTime + 0.01;
    const d = s._cueBus(0.7, 0.15);
    noise(s, d, t, { color: 'pink', dur: 2.2, peak: 0.055, attack: 0.25, filter: { type: 'bandpass', freq: 900, Q: 0.7, sweepTo: 2600, sweepTime: 1.8 } });
    // Still bright and still wrong, but the wrongness is now a short leaning
    // b2 over a stable fifth rather than a four-second sustained cluster, and
    // the detune is beat-safe instead of a random 32-cent spread.
    [[0, 0, 0.07, 4.6], [4, 0, 0.05, 4.2], [0, 1, 0.03, 3.6]].forEach(([deg, o, g, dur], i) => {
      const f = degree(deg, o);
      tone(s, d, t + i * rnd(0.02, 0.06), {
        freq: f, type: 'sine', dur, peak: g, attack: 0.09,
        pan: Math.sin(i * 2.4) * 0.7, detune: softDetune(f, 0.25)
      });
    });
    // the b2, brief and resolving upward out of the way
    tone(s, d, t + 0.05, {
      freq: degree(1, 0), type: 'sine', dur: 1.5, peak: 0.045, attack: 0.07, pan: 0.4,
      glideTo: degree(2, 0), glideTime: 1.1
    });
  },

  // Fires on every step. It has to disappear into the floor, so: no transient
  // above 700 Hz, a 20 ms onset, and pitch, level and timbre all re-rolled
  // each time.
  footstep: (s, o = {}) => {
    const t = s.ctx.currentTime + 0.01;
    const d = s._cueBus(0.25, 0, 2);
    const g = clamp(num(o.gain, 1), 0, 2);
    const pan = num(o.pan, rnd(-0.4, 0.4));
    thump(s, d, t, { freq: rnd(54, 72), dur: rnd(0.24, 0.32), peak: rnd(0.07, 0.1) * g, drop: 0.5, pan, grit: false, attack: rnd(0.016, 0.026) });
    noise(s, d, t + rnd(0, 0.012), {
      color: 'brown', dur: 0.24, peak: rnd(0.025, 0.04) * g, attack: 0.014, pan,
      filter: { type: 'bandpass', freq: rnd(320, 680), Q: 0.9, sweepTo: 220, sweepTime: 0.2 }
    });
  },

  ayeka: (s) => {
    // the question: the same voice, softer, and it rises at the end
    cueWord(s, { day: 7, gain: 0.6, length: 1.3 });
    const t = s.ctx.currentTime + 0.9;
    const d = s._cueBus(0.9, 0.2);
    tone(s, d, t, {
      freq: degree(0, 0), type: 'sine', dur: 5, peak: 0.055, attack: 1.6,
      glideTo: degree(1, 0), glideTime: 3.8, pan: 0.15
    });
    tone(s, d, t + rnd(0.2, 0.45), {
      freq: degree(4, 0), type: 'sine', dur: 4.4, peak: 0.035, attack: 1.8,
      glideTo: degree(5, 0), glideTime: 3.2, pan: -0.15
    });
  },

  curse: (s) => {
    const t = s.ctx.currentTime + 0.01;
    const d = s._cueBus(0.55, 0);
    const base = degree(0, -1);
    // four detuned sawtooths spread over 33 cents was a snarl of beating
    // upper harmonics. Triangles, a beat-safe spread, and a much lower filter
    // ceiling keep the weight and lose the grind.
    for (let i = 0; i < 4; i++) {
      const f = base * (1 + i * 0.5);
      tone(s, d, t + i * rnd(0.06, 0.14), {
        freq: f, type: i === 0 ? 'sawtooth' : 'triangle', dur: 6 - i * 0.5,
        peak: 0.075 / (1 + i * 0.8), attack: 0.5,
        detune: softDetune(f * 3, 0.4), pan: Math.sin(i * 1.9) * 0.6,
        glideTo: f * 0.89, glideTime: 5,
        filter: { type: 'lowpass', freq: 800, Q: 1.1, sweepTo: 190, sweepTime: 4.6 }
      });
    }
    noise(s, d, t, { color: 'brown', dur: 5.5, peak: 0.1, attack: 0.9, filter: { type: 'lowpass', freq: 380, Q: 1.2, sweepTo: 85, sweepTime: 4.5 } });
    thump(s, d, t, { freq: 40, dur: 2.8, peak: 0.24, drop: 0.7, attack: 0.07 });
  },

  tear: (s) => {
    const t = s.ctx.currentTime + 0.01;
    const d = s._cueBus(0.35, 0);
    noise(s, d, t, { color: 'pink', dur: 1.1, peak: 0.085, attack: 0.025, filter: { type: 'bandpass', freq: rnd(1800, 2400), Q: 0.9, sweepTo: 300, sweepTime: 1 } });
    noise(s, d, t + 0.05, { color: 'brown', dur: 1.3, peak: 0.06, attack: 0.03, pan: 0.3, filter: { type: 'lowpass', freq: 1400, Q: 0.8, sweepTo: 320, sweepTime: 1.2 } });
    tone(s, d, t, {
      freq: degree(3, 0), type: 'triangle', dur: 1.7, peak: 0.04, attack: 0.04,
      glideTo: degree(0, -1), glideTime: 1.3,
      filter: { type: 'lowpass', freq: 1300, Q: 1.2, sweepTo: 260, sweepTime: 1.4 }
    });
  },

  gate: (s) => {
    const t = s.ctx.currentTime + 0.01;
    const d = s._cueBus(0.9, 0.1);
    thump(s, d, t, { freq: 34, dur: 5, peak: 0.38, drop: 0.75, attack: 0.05 });
    noise(s, d, t, { color: 'brown', dur: 3.4, peak: 0.14, attack: 0.035, filter: { type: 'lowpass', freq: 600, Q: 1.2, sweepTo: 80, sweepTime: 3 } });
    // still a clangorous inharmonic set, but the top two partials are gone and
    // bell() now rolls the rest off hard
    bell(s, d, t + 0.05, {
      freq: degree(0, 0), dur: 8, peak: 0.055,
      ratios: [1, 1.73, 2.41, 3.19, 4.57]
    });
    tone(s, d, t + 0.6, { freq: degree(1, -1), type: 'triangle', dur: 6.5, peak: 0.05, attack: 1.8, filter: { type: 'lowpass', freq: 320, Q: 1.1 } });
  },

  sword: (s) => {
    const t = s.ctx.currentTime + 0.01;
    const d = s._cueBus(0.65, 0.18);
    noise(s, d, t, { color: 'pink', dur: 0.9, peak: 0.08, attack: 0.3, pan: -0.5, filter: { type: 'bandpass', freq: 700, Q: 1, sweepTo: 2800, sweepTime: 0.75 } });
    bell(s, d, t + 0.12, {
      freq: degree(4, 1), dur: 5, peak: 0.045,
      ratios: [1, 1.41, 2.13, 3.07, 4.63]
    });
    for (let i = 0; i < 3; i++) {
      const f = degree(1, 2) * rnd(0.97, 1.06);
      tone(s, d, t + 0.15 + i * rnd(0.07, 0.16), {
        freq: f, type: 'sine', dur: rnd(2, 3.4),
        peak: 0.02, attack: 0.035, pan: rnd(-0.8, 0.8),
        glideTo: f * rnd(1.05, 1.2), glideTime: 1.5
      });
    }
    thump(s, d, t, { freq: 70, dur: 0.9, peak: 0.15, drop: 0.5, attack: 0.025 });
  },

  // click and hover fire more often than anything else in the game — hundreds
  // of times per session. They are now quiet, blunt-edged, low, and never the
  // same pitch twice, which is the difference between a UI that responds and
  // a UI that nags.
  click: (s) => {
    const t = s.ctx.currentTime + 0.005;
    const d = s._cueBus(0.14, 0, 1);
    noise(s, d, t, {
      color: 'pink', dur: 0.06, peak: 0.022, attack: 0.008,
      filter: { type: 'bandpass', freq: rnd(900, 1500), Q: 1.1 }
    });
    tone(s, d, t, {
      freq: vary(degree(pick([0, 2, 4]), 1, EDENIC), 20), type: 'sine',
      dur: rnd(0.13, 0.19), peak: 0.026, attack: 0.012
    });
  },

  hover: (s) => {
    const t = s.ctx.currentTime + 0.005;
    const d = s._cueBus(0.22, 0, 1);
    const deg = pick([4, 6, 7]);
    tone(s, d, t, {
      freq: vary(degree(deg, 1, EDENIC), 25), type: 'sine',
      dur: rnd(0.26, 0.38), peak: 0.014, attack: 0.03, pan: rnd(-0.2, 0.2)
    });
  },

  chime: (s, o = {}) => {
    const t = s.ctx.currentTime + 0.01;
    const d = s._cueBus(0.6, 0.12);
    const deg = Number.isFinite(o.degree) ? o.degree : pick([0, 2, 4, 6, 7]);
    bell(s, d, t, {
      freq: vary(degree(deg, 1, EDENIC), 6), dur: num(o.dur, 4) * jitter(0.15),
      peak: num(o.gain, 0.04)
    });
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
      this.reverb = new Reverb(this, { decay: 3.4, wet: 0.78 });
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

    // Master tilt. A fixed shelf taking about 6 dB off everything above
    // 3.2 kHz, plus a hard ceiling at 11 kHz. Nothing in this score has any
    // business up there, and over twenty-five minutes the top octave is the
    // first thing that turns "atmosphere" into "please turn that off".
    this.air = ctx.createBiquadFilter();
    this.air.type = 'highshelf';
    this.air.frequency.setValueAtTime(3200, t);
    this.air.gain.setValueAtTime(-6, t);

    this.ceiling = ctx.createBiquadFilter();
    this.ceiling.type = 'lowpass';
    this.ceiling.frequency.setValueAtTime(11000, t);
    this.ceiling.Q.setValueAtTime(0.5, t);

    this.sat = ctx.createWaveShaper();
    this.sat.curve = saturationCurve(1.15);
    if ('oversample' in this.sat) this.sat.oversample = '2x';

    // Slower and gentler than before: a 6 ms attack at 3.5:1 was audibly
    // grabbing every thump and breathing back up under the beds.
    this.comp = ctx.createDynamicsCompressor();
    this.comp.threshold.setValueAtTime(-20, t);
    this.comp.knee.setValueAtTime(22, t);
    this.comp.ratio.setValueAtTime(2.4, t);
    this.comp.attack.setValueAtTime(0.025, t);
    this.comp.release.setValueAtTime(0.5, t);

    this.limiter = ctx.createDynamicsCompressor();
    this.limiter.threshold.setValueAtTime(-3.5, t);
    this.limiter.knee.setValueAtTime(3, t);
    this.limiter.ratio.setValueAtTime(14, t);
    this.limiter.attack.setValueAtTime(0.004, t);
    this.limiter.release.setValueAtTime(0.2, t);

    this.master = ctx.createGain();
    this.master.gain.setValueAtTime(this._muted ? FLOOR : this._volume, t);

    this.bus.connect(this.air);
    this.air.connect(this.ceiling);
    this.ceiling.connect(this.sat);
    this.sat.connect(this.comp);
    this.comp.connect(this.limiter);
    this.limiter.connect(this.master);
    this.master.connect(ctx.destination);

    // Beds pass through a duck stage so narration can cut through. The bed
    // now sits roughly 5 dB below where it used to, which both widens the gap
    // to the cues and leaves room for text to sit on top of it comfortably.
    this.duckGain = ctx.createGain();
    this.duckGain.gain.setValueAtTime(1, t);
    this.duckGain.connect(this.bus);
    this.bedBus = ctx.createGain();
    this.bedBus.gain.setValueAtTime(0.52, t);
    this.bedBus.connect(this.duckGain);

    this.cueBus = ctx.createGain();
    this.cueBus.gain.setValueAtTime(0.8, t);
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
      fb.gain.setValueAtTime(0.28, t);
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(1600, t); // repeats get darker fast
      const p = panner(ctx, pan);
      this.delayIn.connect(d);
      d.connect(lp); lp.connect(fb); fb.connect(d);
      if (p) { lp.connect(p); p.connect(this.delayOut); } else { lp.connect(this.delayOut); }
      return [d, fb, lp, p];
    };

    this.delayOut = ctx.createGain();
    this.delayOut.gain.setValueAtTime(0.34, t);
    this.delayOut.connect(this.bus);
    // delay times in a golden ratio: the two taps never land together, so the
    // repeats never settle into a pulse
    this._delayNodes = [].concat(mk(0.383, -0.6), mk(0.619, 0.6)).filter(Boolean);
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

    // Cheap retrigger guard so held keys cannot flood the graph. The gaps are
    // wider than they were: a cue firing twice inside 40 ms is not heard as
    // two cues, only as one louder and harsher one.
    const now = this.ctx.currentTime;
    const min = name === 'click' || name === 'hover' ? 0.06 : 0.1;
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
    this.reverb.output.gain.linearRampToValueAtTime(0.75 + this.loneliness * 0.4, t + 3);
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

  /**
   * Pull the bed down under narration. Deeper than it was (0.12 rather than
   * 0.3, roughly 18 dB) and smoother at both ends: an exponential fall over
   * 0.6 s and a two-and-a-half second return, so neither edge draws attention
   * to itself. Cues are unaffected — they do not pass through this stage.
   */
  duck(seconds = 2) {
    if (!this.ready) { this._defer('duck', [seconds]); return; }
    const hold = clamp(num(seconds, 2), 0.1, 120);
    const t = this.ctx.currentTime;
    const g = this.duckGain.gain;
    g.cancelScheduledValues(t);
    g.setValueAtTime(Math.max(FLOOR, g.value), t);
    g.exponentialRampToValueAtTime(0.12, t + 0.6);
    g.setValueAtTime(0.12, t + 0.6 + hold);
    g.exponentialRampToValueAtTime(1, t + 0.6 + hold + 2.5);
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
      this.bus, this.air, this.ceiling, this.sat, this.comp, this.limiter, this.master]
      .concat(this._delayNodes || []);
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
