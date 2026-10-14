// Act 1 — the seven days.
// Each day: the word, the world changing, and then a few seconds held on what
// was actually made. Kept deliberately brisk — the weight is in acts 2 and 5.

import * as THREE from 'three';
import { clock, wait, ease, lerp, clamp, isMobile } from '../core/utils.js';
import { makePair } from '../gfx/fauna.js';

// Sea life is a large optional module; the day still works without it.
let SEA = null;
async function loadSea() {
  if (SEA !== null) return SEA;
  try { SEA = await import('../gfx/sealife.js'); }
  catch (err) { console.warn('[creation] sealife unavailable', err); SEA = false; }
  return SEA;
}

/** Prefer the trimmed text; fall back to the full version if it isn't there. */
const briefVerses = d => (d.briefVerses?.length ? d.briefVerses : (d.verses || []).slice(0, 1));
const briefNarr = d => (d.briefNarration?.length ? d.briefNarration : (d.narration || []).slice(0, 1));

/** The divine utterance. No button — it simply happens, and the world answers. */
async function utter(ctx, day) {
  const { ui, score, engine } = ctx;
  ui.showVerse({ ref: '', he: day.utterance.he, en: day.utterance.en });
  await ui.waitOrClick(2.9);
  score.cue('word', { day: day.n });
  engine.flash('#fff6e0', 1.5, day.n === 1 ? .9 : .4);
  engine.rig.shake(.06, 2);
  await wait(.45);
  ui.hideVerse(1.1);
}

/* ═════════════════════ the days ═════════════════════ */

async function day1(ctx) {
  const { engine, stage, score } = ctx;
  score.setBed('day1', { fade: 4 });
  score.cue('light');

  engine.bloomTo(1.15, .95, .45, 2);
  engine.rig.moveTo([0, 0, 16], [0, 0, -4], 6, ease.inOutCubic);
  await stage.firstLight(3.6);

  // light divided from darkness: the camera turns from the one to the other
  await engine.rig.moveTo([0, 2, 22], [0, 0, 26], 3.6, ease.inOutCubic);
  score.cue('separate');
  engine.bloomTo(.6, .72, .72, 3);
  await wait(1.2);
}

async function day2(ctx) {
  const { engine, stage, score } = ctx;
  score.setBed('day2', { fade: 4 });
  score.cue('separate');

  engine.rig.moveTo([0, 7, 30], [0, 14, -26], 6.5, ease.inOutCubic);
  await stage.raiseFirmament(5);
  stage.ocean.setColors(0x031824, 0x0d4a63);

  // the waters above, and the waters below
  await engine.rig.moveTo([0, 5, 24], [0, 26, -18], 3, ease.inOutCubic);
  await wait(1.1);
  await engine.rig.moveTo([0, 4, 22], [0, -4, -14], 3, ease.inOutCubic);
  await wait(1.1);
}

async function day3(ctx) {
  const { engine, stage, score } = ctx;
  score.setBed('day3', { fade: 3.5 });
  score.cue('land');

  engine.rig.moveTo([0, 9, 54], [0, 1, 0], 5, ease.inOutCubic);
  engine.rig.shake(.4, .9);
  await stage.raiseLand(5);

  score.cue('growth');
  engine.rig.arcTo([22, 6, 38], [0, 4, 0], 8, 5);
  await stage.growVegetation(6);
  stage.grass.wind = .3;
  stage.grove.wind = .4;

  // down among it, so the grass and the flowers are actually seen
  await engine.rig.moveTo([7, 1.1, 15], [0, .7, 4], 3.4, ease.inOutCubic);
  await wait(2.2);
}

async function day4(ctx) {
  const { engine, stage, score } = ctx;
  score.setBed('day4', { fade: 3.5 });
  score.cue('stars');

  engine.rig.moveTo([0, 4, 34], [0, 36, -8], 4.5, ease.inOutCubic);
  engine.rig.drift = .6;
  await stage.hangTheLights(9);

  // hold on the night sky before the sun comes back
  stage.sky.setSunAngle(-.3);
  stage.sky.dayNight = .06;
  stage.sky.stars = 1;
  stage.stars.reveal = 1;
  await engine.rig.moveTo([6, 5, 24], [0, 30, -6], 4, ease.inOutCubic);
  await wait(3.2);

  await clock.to(4, e => {
    stage.sky.setSunAngle(lerp(-.3, 1.05, e));
    stage.sky.dayNight = lerp(.06, 1, e);
    stage.sky.stars = 1 - e;
    stage.stars.reveal = 1 - e;
  }, ease.inOutCubic);
  engine.rig.drift = .4;
}

async function day5(ctx) {
  const { engine, stage, score } = ctx;
  score.setBed('day5', { fade: 3.5 });

  score.cue('swarm');
  stage.fillWaterAndAir(6);
  await engine.rig.moveTo([14, 1.2, 28], [12, -3, -8], 4.5, ease.inOutCubic);
  await wait(1.6);

  // ── the showcase: fish, close enough to actually look at ──
  const sea = await loadSea();
  if (sea && sea.Showcase) {
    // Held in front of the camera rather than placed in the world, so the
    // creatures are lit for display and nothing swims out of frame.
    const present = async (opts, { dist = 5.2, hold = 3.0, lift = 0 } = {}) => {
      const fwd = new THREE.Vector3();
      engine.camera.getWorldDirection(fwd);
      const spot = engine.camera.position.clone().addScaledVector(fwd, dist);
      spot.y += lift;

      const show = new sea.Showcase(opts);
      show.object.position.copy(spot);
      engine.scene.add(show.object);
      const tick = engine.onFrame(dt => show.update(dt));

      await clock.to(1.3, e => { show.reveal = e; }, ease.outCubic);
      await wait(hold);
      await clock.to(1.1, e => { show.reveal = 1 - e; }, ease.inQuad);

      tick();
      engine.scene.remove(show.object);
      show.dispose();
    };

    // a school of small bright ones
    await present({ builder: 'kasif', count: isMobile() ? 7 : 14, spread: 1.9, seed: 404 },
      { dist: 5.0, hold: 2.8 });
    // one of the strange ones, alone
    await present({ builder: 'keruv', count: 1, spread: 0, seed: 77, spin: .5 },
      { dist: 3.2, hold: 2.6 });
    // and something enormous going past
    await present({ builder: 'livyatan', count: 1, spread: 0, seed: 12, spin: .18 },
      { dist: 13, hold: 3.2, lift: -1.2 });
  } else {
    await wait(2.6);
  }

  // and up, hard, for the birds
  score.cue('wings');
  await engine.rig.arcTo([-6, 20, 22], [0, 26, -22], 6, 9, ease.inOutCubic);
  await wait(2.4);
  await engine.rig.moveTo([0, 8, 30], [0, 6, 0], 4);
}

async function day6(ctx) {
  const { engine, stage, score } = ctx;
  score.setBed('day6', { fade: 3.5 });

  // the land fills with living things
  const kinds = ['shor', 'tzvi', 'sus', 'zeev', 'aryeh'];
  const spots = [[-9, 14], [8, 16], [-14, 6], [13, 7], [-2, 19]];
  kinds.forEach((key, i) => {
    const pair = makePair(key, { seed: 40 + i * 13 });
    stage.addPair('ambient_' + key, pair);
    pair.forEach((a, j) => {
      a.placeAt(spots[i][0] + j * 2.2, spots[i][1] + j * 1.2, Math.PI + (i - 2) * .3);
      a.object.scale.multiplyScalar(0.001);
    });
  });

  score.cue('growth');
  await engine.rig.moveTo([0, 2.6, 30], [0, 1.2, 12], 4, ease.inOutCubic);
  await clock.to(2.6, e => {
    const s = ease.outBack(e);
    stage.animals.forEach(a => a.object.scale.setScalar(Math.max(.001, s * (a.spec.scale || 1))));
  }, ease.linear);

  // a slow pass across them so each one is actually seen
  stage.animals.forEach((a, i) => {
    a.moveTo(a.pos.x + (i % 2 ? 3 : -3), a.pos.z - 1.5, { speed: .5 });
    a.lookAt(0, 30);
  });
  await engine.rig.moveTo([-12, 2.2, 22], [2, 1.2, 13], 6, ease.inOutCubic);
  await wait(1.4);
  await engine.rig.moveTo([12, 2.2, 22], [-2, 1.2, 13], 6, ease.inOutCubic);
  stage.animals.forEach(a => a.stop());

  // and then the ground itself is gathered into a shape
  await engine.rig.moveTo([4.2, 2.3, 18], [1.2, 1.1, 11.5], 5, ease.inOutCubic);
  engine.rig.drift = .35;
  score.cue('breath');
  engine.bloomTo(.8, .85, .6, 3);

  await stage.formAdam({ dustDur: 5.5, breathDur: 2.6 });

  engine.flash('#ffeec8', 2, .5);
  await stage.adam.poseTo(POSE_AWAKE, 2.4, ease.outCubic);
  await wait(.8);
  await stage.adam.poseTo(POSE_WONDER, 2);
  engine.bloomTo(.48, .65, .8, 3);
  await wait(1.4);
}

async function day7(ctx) {
  const { engine, stage, score } = ctx;
  score.setBed('day7', { fade: 6 });
  score.cue('rest');

  stage.animals.forEach(a => a.stop());
  clock.to(6, e => {
    stage.grass.wind = lerp(.3, .12, e);
    stage.grove.wind = lerp(.4, .18, e);
    stage.birds.speed = lerp(1.1, .35, e);
    stage.fish.speed = lerp(.8, .25, e);
  }, ease.inOutCubic);

  engine.rig.drift = .18;
  engine.rig.arcTo([20, 12, 34], [0, 5, 0], 14, 7, ease.inOutCubic);
  await stage.sabbath(6);
  await wait(1.6);
}

const POSE_AWAKE = {
  spine: [-.18, 0, 0], chest: [-.12, 0, 0], neck: [-.3, 0, 0], head: [-.35, 0, 0],
  upperArmL: [-.5, 0, .55], upperArmR: [-.5, 0, -.55],
  forearmL: [-.3, 0, .2], forearmR: [-.3, 0, -.2],
};
const POSE_WONDER = {
  spine: [-.08, 0, 0], neck: [-.22, 0, 0], head: [-.25, 0, 0],
  upperArmL: [-.9, 0, .5], upperArmR: [-.9, 0, -.5],
  forearmL: [-.5, 0, .25], forearmR: [-.5, 0, -.25],
};

const DAY_FNS = [day1, day2, day3, day4, day5, day6, day7];

/* ═════════════════════ the act ═════════════════════ */

export async function runCreation(ctx) {
  const { ui, SCRIPT, state } = ctx;
  const days = SCRIPT.creation.days;

  ui.buildRail(7);
  ui.setRail(0);

  for (let i = 0; i < days.length; i++) {
    const day = days[i];
    if (state.skipToAct != null) return;

    ui.setRail(i);
    ui.showDay(day.name, day.epithet);

    await utter(ctx, day);
    await DAY_FNS[i](ctx);

    await ui.verses(briefVerses(day), { dwell: 4200 });
    await ui.narrateAll(briefNarr(day));

    await ui.hideDay(1.1);
    await wait(.5);
    state.day = i + 1;
  }

  ui.setRail(7);
  await wait(.8);
  ui.hideRail();
}
