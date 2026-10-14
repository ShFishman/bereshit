// Bootstrap: load, build the world, then run the six acts in order.

import * as THREE from 'three';
import { Engine } from './core/engine.js';
import { initShaders } from './core/materials.js';
import { Stage, PLACES } from './core/stage.js';
import ui from './core/ui.js';
import { clock, wait, ease, lerp, clamp } from './core/utils.js';
import { POSES } from './gfx/figures.js';

import { runTohu } from './acts/act0_tohu.js';
import { runCreation } from './acts/act1_creation.js';
import { runEden } from './acts/act2_eden.js';
import { runEve } from './acts/act3_eve.js';
import { runSerpent } from './acts/act4_serpent.js';
import { runExile } from './acts/act5_exile.js';

const $ = id => document.getElementById(id);

const boot = $('boot'), bootBar = boot.querySelector('.boot-bar i'), bootNote = $('boot-note');
const setBoot = (p, note) => {
  bootBar.style.width = `${Math.round(p * 100)}%`;
  if (note) bootNote.textContent = note;
};

const ACTS = [
  { key: 'tohu', run: runTohu },
  { key: 'creation', run: runCreation },
  { key: 'eden', run: runEden },
  { key: 'eve', run: runEve },
  { key: 'serpent', run: runSerpent },
  { key: 'exile', run: runExile },
];

const state = {
  act: 0, day: 0, loneliness: 0, sway: 0, swayNorm: 0,
  furthest: 0, skipToAct: null, fruit: null, running: false,
};

let engine, stage, score, SCRIPT;

/* ═══════════════ world presets, so chapters can be replayed ═══════════════ */

function applyWorldState(act) {
  const s = stage;
  clock.clear();
  ui.hideChoices();

  // reset the dials every preset then opt back in
  s.void.object.visible = act <= 1;
  s.void.chaos = 1; s.void.light = 0; s.void.spirit = 0;
  s.sky.object.visible = act > 1;
  s.ocean.object.visible = act > 1;
  s.gate.object.visible = false;
  s.gate.intensity = 0;
  s.serpent.object.visible = false;
  s.embers.object.visible = false;
  s.embers.reveal = 0;
  s.glory.intensity = 0;
  s.clearAnimals();
  s.treeOfKnowledge.temptation = 0;
  s.adam.walkSpeed = 0; s.eve.walkSpeed = 0;
  s.adam.idleAmount = 1; s.eve.idleAmount = 1;
  s.adam.opacity = 1; s.eve.opacity = 1;
  s.adam.glow = 0; s.eve.glow = 0;
  s.adam.object.rotation.set(0, Math.PI, 0);
  s.eve.object.rotation.set(0, Math.PI, 0);
  s.adam.object.position.set(1.2, 0, 11.5);
  s.eve.object.position.set(-1.5, 0, 10.2);
  s.dust.object.visible = false;
  state.fruit = null;
  engine.veil.fade = 0;
  engine.setVeilColor(0x000000);
  engine.renderer.toneMappingExposure = 1;
  engine.rig.drift = .4;
  engine.rig.parallax = .6;

  if (act <= 1) {
    // the deep, untouched
    s.ground.object.visible = false;
    s.ground.object.position.y = -9;
    s.ocean.object.position.y = -18;
    s.grass.growth = 0;
    s.grove.object.children.forEach(m => m.scale.setScalar(.001));
    s.treeOfKnowledge.object.scale.setScalar(.001);
    s.treeOfLife.scale.setScalar(.001);
    s.flowers.object.visible = false;
    s.rivers.visible = false;
    s.stars.reveal = 0;
    s.motes.reveal = 0;
    s.birds.opacity = 0; s.fish.opacity = 0;
    s.birds.object.visible = false; s.fish.object.visible = false;
    s.adam.object.visible = false;
    s.eve.object.visible = false;
    s.sky.dayNight = 0;
    engine.bloom.strength = .35;
    engine.bloom.radius = .8;
    engine.bloom.threshold = .7;
    return;
  }

  // a finished world
  s.ground.object.visible = true;
  s.ground.object.position.y = 0;
  s.ocean.object.position.y = -.8;
  s.grass.growth = 1;
  s.grove.object.children.forEach(m => m.scale.setScalar(1));
  s.grove.object.scale.setScalar(1);
  s.treeOfKnowledge.object.scale.setScalar(1);
  s.treeOfLife.scale.setScalar(1);
  s.flowers.object.visible = true;
  s.flowers.object.scale.setScalar(1);
  s.rivers.visible = true;
  s.rivers.traverse(o => { if (o.material) o.material.opacity = .4; });
  s.motes.reveal = 1;
  s.motes.opacity = 1;
  s.birds.object.visible = true; s.fish.object.visible = true;
  s.birds.opacity = 1; s.fish.opacity = 1;
  s.birds.speed = 1.1; s.fish.speed = .8;
  s.sky.setSunAngle(1.05);
  s.sky.dayNight = 1;
  s.sky.stars = 0;
  s.stars.reveal = 0;
  s.adam.object.visible = true;
  s.adam.pose(POSES.rest, 0);
  s.ground.bloom = 1;
  engine.bloom.strength = .62;

  const hasEve = act >= 4;
  s.eve.object.visible = hasEve;
  if (hasEve) s.eve.pose(POSES.rest, 0);

  s.setDecay(act === 3 ? .36 : 0);
  if (act === 3) { s.adam.pose(POSES.lonely, 0); s.adam.idleAmount = .55; }
  if (act === 5) { s.setDecay(0); }
}

/* ═══════════════ the run ═══════════════ */

async function runFrom(actIndex) {
  state.running = true;
  state.skipToAct = null;
  ui.cinema(true);

  for (let i = actIndex; i < ACTS.length; i++) {
    state.act = i;
    state.furthest = Math.max(state.furthest, i);
    saveProgress();
    buildChapters();

    try {
      await ACTS[i].run({ engine, ui, score, stage, SCRIPT, state });
    } catch (err) {
      console.error(`[act ${ACTS[i].key}]`, err);
      await ui.clearAll();
      await ui.narrate({ he: 'משהו נקרע בסיפור. אפשר להמשיך מכאן.', en: 'Something tore in the telling. You can go on from here.', dwell: 5200 });
    }

    if (state.skipToAct != null) {
      const next = state.skipToAct;
      state.skipToAct = null;
      ui.skipping = false;
      clock.scale = 1;
      await ui.clearAll();
      await engine.fadeTo(1, 1.2);
      applyWorldState(next);
      await engine.fadeTo(0, 1.8);
      i = next - 1;
      continue;
    }

    if (i < ACTS.length - 1) {
      await ui.clearAll();
      await wait(1);
    }
  }
  state.running = false;
  ui.cinema(false);
}

function jumpTo(actIndex) {
  if (actIndex === state.act && !state.running) return;
  state.skipToAct = actIndex;
  ui.skipping = true;    // text stops waiting to be read
  clock.scale = 24;      // and whatever is still animating drains fast
  clock.clear();         // settle tweens and timers
  ui.abortPending();     // and anything parked on a prompt or a choice
}

/* ═══════════════ progress ═══════════════ */

const SAVE_KEY = 'bereshit.progress.v1';
function saveProgress() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify({ furthest: state.furthest })); } catch {}
}
function loadProgress() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) state.furthest = clamp(JSON.parse(raw).furthest | 0, 0, ACTS.length - 1);
  } catch {}
}

/* ═══════════════ chrome ═══════════════ */

function buildChapters() {
  const list = $('chapters-list');
  if (!list) return;
  list.innerHTML = '';
  SCRIPT.ui.acts.forEach((a, i) => {
    const li = document.createElement('li');
    li.innerHTML = `${a.he}<small>${a.en}</small>`;
    if (i > state.furthest) li.classList.add('locked');
    li.addEventListener('click', () => {
      $('chapters').hidden = true;
      jumpTo(i);
    });
    list.appendChild(li);
  });
}

function wireChrome() {
  $('chrome').hidden = false;

  const bSound = $('btn-sound');
  bSound.addEventListener('click', () => {
    const m = !score.muted;
    score.setMuted(m);
    bSound.classList.toggle('off', m);
    bSound.textContent = m ? '✕' : '♪';
  });

  const bLang = $('btn-lang');
  bLang.addEventListener('click', () => {
    const on = ui.toggleLang();
    bLang.classList.toggle('off', !on);
  });

  $('btn-chapters').addEventListener('click', () => {
    buildChapters();
    $('chapters').hidden = false;
  });
  $('chapters-close').addEventListener('click', () => { $('chapters').hidden = true; });

  $('btn-full').addEventListener('click', () => {
    if (document.fullscreenElement) document.exitFullscreen?.();
    else document.documentElement.requestFullscreen?.();
  });

  addEventListener('keydown', e => {
    if (e.code === 'KeyM') bSound.click();
    else if (e.code === 'KeyL') bLang.click();
    else if (e.code === 'KeyF') $('btn-full').click();
    else if (e.code === 'Escape') $('chapters').hidden = !$('chapters').hidden;
  });
}

/* ═══════════════ boot ═══════════════ */

async function main() {
  try {
    setBoot(.08, 'מחבר את הרקיע…');
    const shaders = await initShaders();
    setBoot(.3, 'כותב את המילים…');

    const [{ SCRIPT: script }, { Score }] = await Promise.all([
      import('./content/script.js'),
      import('./audio/score.js'),
    ]);
    SCRIPT = script;
    setBoot(.5, 'מכוון את הקול…');

    score = new Score();
    ui.bind(score);

    engine = new Engine($('stage'));
    engine.resize();
    setBoot(.66, 'בורא את הגן…');

    stage = new Stage(engine);
    await new Promise(r => requestAnimationFrame(r));
    stage.build();
    setBoot(.92, 'ממתין לתוהו…');

    applyWorldState(0);
    engine.start();

    loadProgress();
    buildChapters();
    wireChrome();

    const missing = ['TOHU', 'FIRMAMENT', 'WATER', 'EDEN_GROUND', 'TREE', 'FRUIT', 'DUST', 'GLORY', 'FLAME_SWORD', 'VEIL']
      .filter(k => !shaders[k]);
    if (missing.length) console.warn('[bereshit] missing shaders, using fallbacks:', missing);

    // debug handle — also what the test harness drives
    window.__bereshit = {
      engine, stage, score, ui, state, clock, THREE,
      jumpTo, applyWorldState, ACTS, SCRIPT,
      get shaderErrors() { return engine.renderer.info; },
      speed(v = 1) { clock.scale = v; },
      skip() { clock.fastForward = true; },
    };

    setBoot(1, '');
    await wait(.4);
    boot.classList.add('gone');
    setTimeout(() => { boot.hidden = true; }, 1000);
  } catch (err) {
    console.error('[bereshit] boot failed', err);
    bootNote.textContent = 'הטעינה נכשלה — בדקו את החיבור לרשת. / Load failed — check your connection.';
    bootBar.style.background = '#8e2f2f';
    return;
  }

  // the gate waits for a real gesture, which is what the audio context needs anyway
  $('gate-begin').addEventListener('click', async () => {
    $('gate').classList.add('gone');
    setTimeout(() => { $('gate').hidden = true; }, 1600);
    try { await score.start(); } catch (e) { console.warn('[audio]', e); }

    const resume = state.furthest > 0 && confirmResume();
    await runFrom(resume ? state.furthest : 0);
  }, { once: true });
}

function confirmResume() {
  // only offer it if they got properly into the story
  if (state.furthest < 2) return false;
  const label = SCRIPT.ui.acts[state.furthest];
  return confirm(`${SCRIPT.ui.replay?.he || 'להמשיך מהפרק'}: ${label.he}?\n\n(Cancel = start from the beginning)`);
}

main();
