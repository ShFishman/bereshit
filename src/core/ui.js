// The narrative overlay: verses, narration, dialogue, choices, prompts.
// Acts talk to this with awaits, so an act file reads like a screenplay.

import { clock, wait, clamp, deferred, ease } from './utils.js';

const $ = id => document.getElementById(id);

/** Word-by-word reveal — safe with Hebrew nikud, which per-character typing mangles. */
function revealWords(el, text, { stagger = 55, dur = 620 } = {}) {
  el.textContent = '';
  if (!text) return;
  const words = String(text).split(/(\s+)/);
  const frag = document.createDocumentFragment();
  let i = 0;
  for (const w of words) {
    if (/^\s+$/.test(w)) { frag.appendChild(document.createTextNode(w)); continue; }
    const s = document.createElement('span');
    s.textContent = w;
    s.style.cssText = `display:inline-block;opacity:0;filter:blur(6px);transform:translateY(.28em);transition:opacity ${dur}ms cubic-bezier(.22,.61,.36,1) ${i * stagger}ms,filter ${dur}ms ease ${i * stagger}ms,transform ${dur}ms cubic-bezier(.22,.61,.36,1) ${i * stagger}ms`;
    frag.appendChild(s);
    i++;
  }
  el.appendChild(frag);
  requestAnimationFrame(() => {
    el.querySelectorAll('span').forEach(s => { s.style.opacity = '1'; s.style.filter = 'none'; s.style.transform = 'none'; });
  });
  return i * stagger + dur;
}

class UI {
  constructor() {
    this.el = {
      overlay: $('overlay'),
      rail: $('rail'),
      verseWrap: $('verse-wrap'), verseRef: $('verse-ref'), verseHe: $('verse-he'), verseEn: $('verse-en'),
      narrWrap: $('narr-wrap'), narrHe: $('narr-he'), narrEn: $('narr-en'),
      titleWrap: $('title-wrap'), titleHe: $('title-he'), titleEn: $('title-en'), titleSub: $('title-sub'),
      dayStamp: $('day-stamp'),
      choices: $('choices'),
      speaker: $('speaker'), speakerName: $('speaker-name'), speakerHe: $('speaker-he'), speakerEn: $('speaker-en'), speakerGloss: $('speaker-gloss'),
      prompt: $('prompt'), promptText: $('prompt-text'), promptFill: document.querySelector('#prompt .fill'),
      lonely: $('lonely-meter'), lonelyFill: $('lonely-fill'),
    };
    this.score = null;
    this.showEn = true;
    this.skipRequested = false;
    this._pending = new Set();
    document.body.classList.add('show-en');
  }

  /**
   * Settle anything the story is currently waiting on. Jumping chapters must
   * never leave an act parked forever on a prompt that will not come.
   */
  abortPending() {
    const list = [...this._pending];
    this._pending.clear();
    for (const t of list) { try { t.abort(); } catch {} }
  }
  _track(abort) {
    const token = { abort };
    this._pending.add(token);
    return () => this._pending.delete(token);
  }

  bind(score) { this.score = score; }
  cue(n, o) { try { this.score?.cue(n, o); } catch {} }
  duck(s = 2) { try { this.score?.duck(s); } catch {} }

  toggleLang() {
    this.showEn = !this.showEn;
    document.body.classList.toggle('show-en', this.showEn);
    return this.showEn;
  }

  /* ── waiting ── */

  /** Wait `sec`, but a click/space cuts it short. */
  waitOrClick(sec) {
    if (this.skipping) return Promise.resolve();
    const d = deferred();
    let done = false;
    let untrack = () => {};
    const finish = () => {
      if (done) return; done = true;
      untrack();
      window.removeEventListener('pointerdown', onPtr);
      window.removeEventListener('keydown', onKey);
      d.resolve();
    };
    untrack = this._track(finish);
    const onPtr = (e) => {
      const t = e.target;
      if (t && typeof t.closest === 'function' && t.closest('.choice, .cbtn, .chapters, button')) return;
      finish();
    };
    const onKey = (e) => { if (e.code === 'Space' || e.code === 'Enter' || e.code === 'ArrowRight') finish(); };
    window.addEventListener('pointerdown', onPtr);
    window.addEventListener('keydown', onKey);
    wait(sec).then(finish);
    return d.promise;
  }

  /* ── verse (centre screen, scripture) ── */

  async verse(v, { dwell = 4200, fadeOut = true, cue = true } = {}) {
    if (!v) return;
    const e = this.el;
    e.verseWrap.hidden = false;
    e.verseRef.textContent = v.ref || '';
    e.verseEn.textContent = v.en || '';
    const readTime = revealWords(e.verseHe, v.he, { stagger: 90, dur: 900 }) || 0;
    requestAnimationFrame(() => e.verseWrap.classList.add('in'));
    if (cue) this.duck(3);
    await this.waitOrClick(Math.max(dwell, readTime + 900) / 1000);
    if (fadeOut) await this.hideVerse();
  }

  /** Put a verse on screen and return immediately — the act controls the timing. */
  showVerse(v) {
    const e = this.el;
    e.verseWrap.hidden = false;
    e.verseRef.textContent = v?.ref || '';
    e.verseEn.textContent = v?.en || '';
    revealWords(e.verseHe, v?.he, { stagger: 90, dur: 900 });
    requestAnimationFrame(() => e.verseWrap.classList.add('in'));
    this.duck(3);
  }

  showNarr(line) {
    const e = this.el;
    e.narrWrap.hidden = false;
    e.narrEn.textContent = line?.en || '';
    revealWords(e.narrHe, line?.he, { stagger: 48, dur: 620 });
    requestAnimationFrame(() => e.narrWrap.classList.add('in'));
  }

  async hideVerse(dur = 1.1) {
    this.el.verseWrap.classList.remove('in');
    await wait(dur);
    this.el.verseWrap.hidden = true;
  }

  async verses(list, opts = {}) {
    for (const v of (list || [])) await this.verse(v, opts);
  }

  /* ── narration (lower third, the game's own voice) ── */

  async narrate(line, { fadeOut = true } = {}) {
    if (!line) return;
    const e = this.el;
    e.narrWrap.hidden = false;
    e.narrEn.textContent = line.en || '';
    const readTime = revealWords(e.narrHe, line.he, { stagger: 48, dur: 620 }) || 0;
    requestAnimationFrame(() => e.narrWrap.classList.add('in'));
    this.duck(2);
    const dwell = line.dwell || 3400;
    await this.waitOrClick(Math.max(dwell, readTime + 700) / 1000);
    if (fadeOut) await this.hideNarr();
  }

  async hideNarr(dur = 0.8) {
    this.el.narrWrap.classList.remove('in');
    await wait(dur);
    this.el.narrWrap.hidden = true;
  }

  /** Run a list of narration lines back to back, keeping the block on screen between them. */
  async narrateAll(lines, { gap = 0.25 } = {}) {
    const arr = lines || [];
    for (let i = 0; i < arr.length; i++) {
      await this.narrate(arr[i], { fadeOut: i === arr.length - 1 });
      if (i < arr.length - 1) await wait(gap);
    }
  }

  /* ── titles ── */

  async title(t, { sub = '', dwell = 4000, fadeOut = true } = {}) {
    const e = this.el;
    e.titleWrap.hidden = false;
    e.titleHe.textContent = t?.he || '';
    e.titleEn.textContent = t?.en || '';
    e.titleSub.textContent = sub || '';
    requestAnimationFrame(() => e.titleWrap.classList.add('in'));
    await this.waitOrClick(dwell / 1000);
    if (fadeOut) { e.titleWrap.classList.remove('in'); await wait(1.6); e.titleWrap.hidden = true; }
  }

  async hideTitle(dur = 1.6) {
    this.el.titleWrap.classList.remove('in');
    await wait(dur);
    this.el.titleWrap.hidden = true;
  }

  /* ── day stamp (corner, persists through a day's animation) ── */

  showDay(name, epithet) {
    const e = this.el;
    e.dayStamp.hidden = false;
    e.dayStamp.querySelector('.day-he').textContent = name?.he || '';
    e.dayStamp.querySelector('.day-ep').textContent = epithet?.he || '';
    requestAnimationFrame(() => e.dayStamp.classList.add('in'));
  }
  async hideDay(dur = 1.2) {
    this.el.dayStamp.classList.remove('in');
    await wait(dur);
    this.el.dayStamp.hidden = true;
  }

  /* ── dialogue ── */

  async speak(name, text, gloss, { dwell = 4200, fadeOut = false } = {}) {
    const e = this.el;
    e.speaker.hidden = false;
    e.speakerName.textContent = name || '';
    e.speakerEn.textContent = text?.en || '';
    e.speakerGloss.textContent = gloss?.he || '';
    const readTime = revealWords(e.speakerHe, text?.he, { stagger: 60, dur: 700 }) || 0;
    requestAnimationFrame(() => e.speaker.classList.add('in'));
    this.duck(2.5);
    await this.waitOrClick(Math.max(dwell, readTime + 800) / 1000);
    if (fadeOut) await this.hideSpeak();
  }

  async hideSpeak(dur = .7) {
    this.el.speaker.classList.remove('in');
    await wait(dur);
    this.el.speaker.hidden = true;
  }

  /** Present replies. Resolves with the chosen index. */
  async choose(replies) {
    const e = this.el;
    e.choices.innerHTML = '';
    e.choices.hidden = false;
    const d = deferred();
    const untrack = this._track(() => {
      e.choices.hidden = true; e.choices.innerHTML = '';
      d.resolve(0);
    });

    (replies || []).forEach((r, i) => {
      const b = document.createElement('button');
      b.className = 'choice';
      b.type = 'button';
      const he = document.createElement('span');
      he.textContent = r.he || '';
      const en = document.createElement('span');
      en.className = 'ch-en';
      en.textContent = r.en || '';
      b.append(he, en);
      b.addEventListener('mouseenter', () => this.cue('hover'));
      b.addEventListener('click', async () => {
        if (b.classList.contains('faded')) return;
        this.cue('click');
        [...e.choices.children].forEach(c => { if (c !== b) c.classList.add('faded'); });
        b.classList.add('chosen');
        await wait(.75);
        untrack();
        e.choices.hidden = true;
        e.choices.innerHTML = '';
        d.resolve(i);
      });
      e.choices.appendChild(b);
    });

    return d.promise;
  }

  hideChoices() { this.el.choices.hidden = true; this.el.choices.innerHTML = ''; }

  /* ── the press / hold prompt ── */

  /**
   * Show the gold ring. With hold>0 the player must press and hold to fill it —
   * used for the divine utterance, so creating a day takes actual will.
   */
  async press(text = '', { hold = 0 } = {}) {
    const e = this.el;
    e.prompt.hidden = false;
    e.promptText.textContent = text;
    requestAnimationFrame(() => e.prompt.classList.add('in'));
    const fill = e.promptFill;
    const CIRC = 289;
    if (fill) fill.style.strokeDashoffset = String(CIRC);

    const d = deferred();
    let holding = false, progress = 0, raf = 0, last = performance.now();
    let done = false;

    const tick = (now) => {
      const dt = (now - last) / 1000; last = now;
      progress = clamp(progress + (holding ? dt / hold : -dt / (hold * .7)));
      if (fill) fill.style.strokeDashoffset = String(CIRC * (1 - progress));
      if (progress >= 1 && !done) { finish(); return; }
      raf = requestAnimationFrame(tick);
    };

    let untrack = () => {};
    const finish = () => {
      if (done) return; done = true;
      untrack();
      cancelAnimationFrame(raf);
      cleanup();
      e.prompt.classList.remove('in');
      wait(.6).then(() => { e.prompt.hidden = true; });
      d.resolve();
    };
    untrack = this._track(finish);

    const down = (ev) => {
      if (ev.target && ev.target.closest && ev.target.closest('.cbtn, .chapters')) return;
      if (hold <= 0) { finish(); return; }
      holding = true;
      this.cue('hover');
    };
    const up = () => { holding = false; };
    const key = (ev) => {
      if (ev.code !== 'Space' && ev.code !== 'Enter') return;
      ev.preventDefault();
      if (hold <= 0) { finish(); return; }
      holding = true;
    };
    const keyUp = (ev) => { if (ev.code === 'Space' || ev.code === 'Enter') holding = false; };

    const cleanup = () => {
      window.removeEventListener('pointerdown', down);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      window.removeEventListener('keydown', key);
      window.removeEventListener('keyup', keyUp);
    };

    window.addEventListener('pointerdown', down);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    window.addEventListener('keydown', key);
    window.addEventListener('keyup', keyUp);

    if (hold > 0) raf = requestAnimationFrame(tick);
    return d.promise;
  }

  /* ── loneliness meter ── */

  showLonely() { this.el.lonely.hidden = false; requestAnimationFrame(() => this.el.lonely.classList.add('in')); }
  setLonely(v) { this.el.lonelyFill.style.width = `${clamp(v) * 100}%`; }
  async hideLonely() { this.el.lonely.classList.remove('in'); await wait(1.4); this.el.lonely.hidden = true; }

  /* ── progress rail ── */

  buildRail(n) {
    const r = this.el.rail;
    r.hidden = false;
    r.innerHTML = '';
    for (let i = 0; i < n; i++) r.appendChild(document.createElement('i'));
  }
  setRail(current) {
    [...this.el.rail.children].forEach((c, i) => {
      c.classList.toggle('on', i < current);
      c.classList.toggle('cur', i === current);
    });
  }
  hideRail() { this.el.rail.hidden = true; }

  /* ── teardown between acts ── */

  async clearAll() {
    const e = this.el;
    e.verseWrap.classList.remove('in');
    e.narrWrap.classList.remove('in');
    e.titleWrap.classList.remove('in');
    e.speaker.classList.remove('in');
    e.dayStamp.classList.remove('in');
    e.lonely.classList.remove('in');
    e.prompt.classList.remove('in');
    this.hideChoices();
    await wait(.9);
    e.verseWrap.hidden = true; e.narrWrap.hidden = true; e.titleWrap.hidden = true;
    e.speaker.hidden = true; e.dayStamp.hidden = true; e.lonely.hidden = true; e.prompt.hidden = true;
  }

  cinema(on) { document.body.classList.toggle('cinema', !!on); }
}

export const ui = new UI();
export default ui;
