// Act 1 — the seven days.
// The player does not watch the world being made. They hold the button down
// and it happens, which is a different feeling entirely.

import * as THREE from 'three';
import { clock, wait, ease, lerp, clamp } from '../core/utils.js';
import { makePair, speciesKey } from '../gfx/fauna.js';
import { PLACES } from '../core/stage.js';

/** Show the day's utterance, then make the player hold the word until it sounds. */
async function utter(ctx, day) {
  const { ui, score, engine } = ctx;
  ui.showVerse({ ref: '', he: day.utterance.he, en: day.utterance.en });
  await wait(2.4);
  await ui.press(ctx.SCRIPT.ui.speak.he, { hold: 1.45 });

  score.cue('word', { day: day.n });
  engine.flash('#fff6e0', 1.6, day.n === 1 ? .95 : .45);
  engine.rig.shake(.08, 2.2);
  await wait(.5);
  ui.hideVerse(1.4);
}

/* ═════════════════════ the days ═════════════════════ */

async function day1(ctx) {
  const { engine, stage, score, ui } = ctx;
  score.setBed('day1', { fade: 5 });
  score.cue('light');

  engine.bloomTo(1.15, 0.95, .45, 2);
  engine.rig.moveTo([0, 0, 18], [0, 0, -4], 9, ease.inOutCubic);
  await stage.firstLight(5.5);

  // light and dark are divided: the camera turns from one to the other
  await engine.rig.moveTo([0, 2, 26], [0, 0, 30], 6, ease.inOutCubic);
  score.cue('separate');
  engine.bloomTo(.6, .72, .72, 4);
}

async function day2(ctx) {
  const { engine, stage, score } = ctx;
  score.setBed('day2', { fade: 5 });
  score.cue('separate');

  engine.rig.moveTo([0, 7, 34], [0, 14, -30], 10, ease.inOutCubic);
  await stage.raiseFirmament(8);
  stage.ocean.setColors(0x031824, 0x0d4a63);
  await engine.rig.moveTo([0, 5, 30], [0, 2, -40], 5);
}

async function day3(ctx) {
  const { engine, stage, score, ui } = ctx;
  score.setBed('day3', { fade: 4 });
  score.cue('land');

  engine.rig.moveTo([0, 9, 62], [0, 1, 0], 8, ease.inOutCubic);
  engine.rig.shake(.5, .9);
  await stage.raiseLand(8);

  await wait(.8);
  score.cue('growth');
  engine.rig.arcTo([26, 7, 44], [0, 4, 0], 12, 6);
  await stage.growVegetation(10);
  stage.grass.wind = .3;
  stage.grove.wind = .4;
}

async function day4(ctx) {
  const { engine, stage, score } = ctx;
  score.setBed('day4', { fade: 4 });
  score.cue('stars');

  engine.rig.moveTo([0, 4, 40], [0, 40, -10], 7, ease.inOutCubic);
  engine.rig.drift = .6;
  await stage.hangTheLights(14);
  await engine.rig.moveTo([0, 6, 38], [0, 8, 0], 5);
}

async function day5(ctx) {
  const { engine, stage, score } = ctx;
  score.setBed('day5', { fade: 4 });

  // down to the water for the shoals
  await engine.rig.moveTo([14, 1.2, 34], [12, -3, -8], 6, ease.inOutCubic);
  score.cue('swarm');
  stage.fillWaterAndAir(10);
  await wait(5);

  // and up, hard, for the birds
  score.cue('wings');
  await engine.rig.arcTo([-6, 22, 26], [0, 28, -26], 9, 10, ease.inOutCubic);
  await wait(2.5);
  await engine.rig.moveTo([0, 8, 34], [0, 6, 0], 6);
}

async function day6(ctx) {
  const { engine, stage, score, ui, SCRIPT } = ctx;
  score.setBed('day6', { fade: 4 });

  // the land fills with living things, seen from a distance
  const ambient = ['shor', 'tzvi', 'sus', 'zeev'];
  const spots = [[-26, 26], [30, 18], [-18, -28], [24, -22]];
  ambient.forEach((key, i) => {
    const pair = makePair(key, { seed: 40 + i * 13 });
    stage.addPair('ambient_' + key, pair);
    pair.forEach((a, j) => {
      a.placeAt(spots[i][0] + j * 2.2, spots[i][1] + j * 1.1, Math.random() * 6.28);
      a.object.scale.multiplyScalar(0.001);
    });
  });
  score.cue('growth');
  await clock.to(3.5, e => {
    stage.animals.forEach(a => a.object.scale.setScalar(ease.outBack(e) * (a.spec.scale || 1)));
  }, ease.linear);

  // let them wander
  stage.animals.forEach((a, i) => {
    const wander = () => {
      const x = (Math.random() - .5) * 70, z = (Math.random() - .5) * 70;
      a.moveTo(x, z, { speed: .5 + Math.random() * .5 }).then(() => setTimeout(wander, 2000 + Math.random() * 6000));
    };
    setTimeout(wander, i * 900);
  });

  await wait(2);

  // and then the ground itself is gathered up into a shape
  await engine.rig.moveTo([4.5, 2.4, 19], [1.2, 1.1, 11.5], 8, ease.inOutCubic);
  engine.rig.drift = .35;
  score.cue('breath');
  engine.bloomTo(.8, .85, .6, 4);

  await stage.formAdam({ dustDur: 9, breathDur: 3.6 });

  engine.flash('#ffeec8', 2.2, .55);
  await stage.adam.poseTo({ ...POSE_AWAKE }, 3.2, ease.outCubic);
  await wait(1);
  await stage.adam.poseTo({ ...POSE_WONDER }, 2.6);
  engine.bloomTo(.48, .65, .8, 3);
}

async function day7(ctx) {
  const { engine, stage, score, ui } = ctx;
  score.setBed('day7', { fade: 7 });
  score.cue('rest');

  // everything that was moving slows and settles
  stage.animals.forEach(a => a.stop());
  clock.to(8, e => {
    stage.grass.wind = lerp(.3, .12, e);
    stage.grove.wind = lerp(.4, .18, e);
    stage.birds.speed = lerp(1.1, .35, e);
    stage.fish.speed = lerp(.8, .25, e);
  }, ease.inOutCubic);

  engine.rig.drift = .18;
  engine.rig.arcTo([22, 14, 40], [0, 5, 0], 22, 8, ease.inOutCubic);
  await stage.sabbath(9);
  await wait(2);
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
  const { engine, ui, score, stage, SCRIPT, state } = ctx;
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

    // the record of what just happened
    await ui.verses(day.verses, { dwell: 5200 });
    await ui.narrateAll(day.narration);

    if (day.afterword) {
      await ui.narrate(day.afterword);
    }

    await ui.hideDay(1.4);
    await wait(.8);
    state.day = i + 1;
  }

  ui.setRail(7);
  await wait(1);
  ui.hideRail();
}
