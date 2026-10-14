// Act 4 — the serpent.
// Scene A: it works on her, and the player chooses how much ground she gives.
// Scene B: the player, having just been worked on, now does the working.

import * as THREE from 'three';
import { clock, wait, ease, lerp, clamp } from '../core/utils.js';
import { POSES } from '../gfx/figures.js';
import { faceTowards } from './act2_eden.js';

const ADAM = new THREE.Vector3(1.2, 0, 11.5);
const EVE = new THREE.Vector3(-1.5, 0, 10.2);
const AT_TREE = new THREE.Vector3(-1.0, 0, 3.4);

const NAME_SERPENT = 'הַנָּחָשׁ';
const NAME_EVE = 'הָאִשָּׁה';
const NAME_ADAM = 'הָאָדָם';

/** Walk a figure along the ground, driving its legs, over `dur` seconds. */
async function walkFigure(fig, to, dur = 4) {
  const from = fig.object.position.clone();
  const target = new THREE.Vector3(to.x, from.y, to.z);
  faceTowards(fig.object, target.x, target.z);
  fig.walkSpeed = .9;
  await clock.to(dur, e => {
    fig.object.position.lerpVectors(from, target, e);
  }, ease.inOutQuad);
  fig.walkSpeed = 0;
}

export async function runSerpent(ctx) {
  const { engine, ui, score, stage, SCRIPT, state } = ctx;
  const S = SCRIPT.serpent;
  state.sway = 0;

  await ui.title(SCRIPT.ui.acts[4], { dwell: 3400 });

  /* ═══════════ it is already there ═══════════ */
  score.setBed('serpent', { fade: 7 });
  stage.serpent.object.visible = true;
  stage.serpent.coil = 1;
  stage.serpent.tension = 0;
  stage.serpent.opacity = 0;

  engine.rig.moveTo([5.5, 3.0, 11.5], [0, 3.2, 0], 10, ease.inOutCubic);
  engine.rig.drift = .3;
  await clock.to(5, e => { stage.serpent.opacity = e; }, ease.outCubic);
  score.cue('hiss');

  await ui.verses(S.intro.verses, { dwell: 5400 });
  await ui.narrateAll(S.intro.narration);

  // she walks to the tree. nobody makes her.
  await walkFigure(stage.eve, AT_TREE, 6);
  faceTowards(stage.eve.object, 0, 0);
  engine.rig.moveTo([-3.6, 2.1, 7.4], [-.2, 2.6, 1.2], 6, ease.inOutCubic);

  /* ═══════════ scene A — the serpent and the woman ═══════════ */
  const nodesA = S.toEve.nodes;
  for (let i = 0; i < nodesA.length; i++) {
    if (state.skipToAct != null) return;
    const node = nodesA[i];
    const t = i / Math.max(1, nodesA.length - 1);

    // it comes down off the tree, a little further every time it speaks
    clock.to(5, e => {
      stage.serpent.coil = lerp(1 - t * .55, 1 - (t + .2) * .55, e);
      stage.serpent.tension = lerp(t * .7, (t + .2) * .7, e);
    }, ease.inOutCubic);

    stage.treeOfKnowledge.temptation = clamp(state.sway / 15 * .75 + t * .2);
    score.setIntensity(.35 + t * .5);
    if (i === 2) score.setBed('temptation', { fade: 9 });

    // the camera closes in, so slowly that it is never a cut
    engine.rig.moveTo(
      [lerp(-3.6, -2.2, t), lerp(2.1, 1.95, t), lerp(7.4, 5.4, t)],
      [lerp(-.2, .1, t), lerp(2.6, 2.1, t), lerp(1.2, 1.6, t)],
      9, ease.inOutCubic);

    score.cue('hiss', { soft: true });
    await ui.speak(NAME_SERPENT, node.serpent, node.gloss, { dwell: 5400 });

    const choice = await ui.choose(node.replies);
    const reply = node.replies[choice];
    state.sway += reply?.sway ?? 0;

    await ui.speak(NAME_EVE, reply, null, { dwell: 4000 });

    if (reply?.retort) {
      await ui.speak(NAME_SERPENT, reply.retort, null, { dwell: 4800 });
    }
    await ui.hideSpeak();
    await wait(.5);
  }

  /* ═══════════ she sees that the tree is good ═══════════ */
  const swayN = clamp(state.sway / 15);
  state.swayNorm = swayN;
  stage.treeOfKnowledge.temptation = .55 + swayN * .45;
  score.setIntensity(.9);

  stage.serpent.coil = .25;
  stage.serpent.tension = 1;

  await engine.rig.moveTo([-2.4, 2.4, 5.2], [1.1, 2.9, 1.0], 7, ease.inOutCubic);
  await ui.verses(S.toEve.close.verses, { dwell: 6800 });
  await ui.narrateAll(S.toEve.close.narration);

  /* ═══════════ the taking ═══════════ */
  const fruit = stage.treeOfKnowledge.pluck();
  if (fruit) {
    stage.ground.object.add(fruit);
    fruit.position.copy(stage.treeOfKnowledge.object.position).add(fruit.userData.base);
    stage.eve.poseTo(POSES.reach, 1.6, ease.outCubic);
    await wait(1.2);
    score.cue('pluck');
    engine.rig.shake(.12, 2);

    const from = fruit.position.clone();
    const handPos = new THREE.Vector3();
    await clock.to(1.6, e => {
      stage.eve.bones.handR.getWorldPosition(handPos);
      stage.ground.object.worldToLocal(handPos);
      fruit.position.lerpVectors(from, handPos, ease.outCubic(e));
    }, ease.linear);

    // from here it travels with her
    stage.eve.bones.handR.add(fruit);
    fruit.position.set(0, -.08, 0);
    fruit.scale.setScalar(1.1);
    state.fruit = fruit;
  }

  stage.eve.poseTo(POSES.rest, 1.6);
  await wait(1.2);

  // she eats. the world does not change yet — that is the cruelty of it.
  score.cue('bite');
  stage.eve.poseTo({ ...POSES.rest, upperArmR: [-1.5, .4, -.3], forearmR: [-1.4, 0, 0], head: [-.12, .15, 0] }, 1.2, ease.outCubic);
  engine.flash('#2a0606', 1.0, .28);
  await wait(2.2);
  stage.eve.poseTo(POSES.rest, 1.4);
  await wait(1.8);

  /* ═══════════ scene B — the woman and the man ═══════════ */
  score.setBed('fall', { fade: 6 });
  await ui.narrateAll(S.toAdam.intro.narration);

  stage.serpent.opacity = 1;
  clock.to(6, e => { stage.serpent.opacity = 1 - e; }).then(() => { stage.serpent.object.visible = false; });

  await walkFigure(stage.eve, { x: EVE.x, z: EVE.z }, 6);
  faceTowards(stage.eve.object, ADAM.x, ADAM.z);
  faceTowards(stage.adam.object, EVE.x, EVE.z);

  engine.rig.moveTo([2.2, 1.95, ADAM.z + 4.4], [(ADAM.x + EVE.x) / 2, 1.3, (ADAM.z + EVE.z) / 2], 7, ease.inOutCubic);

  const nodesB = S.toAdam.nodes;
  for (let i = 0; i < nodesB.length; i++) {
    if (state.skipToAct != null) return;
    const node = nodesB[i];
    const t = i / Math.max(1, nodesB.length - 1);

    await ui.speak(NAME_ADAM, node.adam, node.gloss, { dwell: 5000 });

    const choice = await ui.choose(node.replies);
    const reply = node.replies[choice];
    state.sway += reply?.sway ?? 0;

    stage.eve.poseTo(i === nodesB.length - 1 ? POSES.offer : POSES.rest, 1.4, ease.outCubic);
    await ui.speak(NAME_EVE, reply, null, { dwell: 4200 });
    if (reply?.retort) await ui.speak(NAME_ADAM, reply.retort, null, { dwell: 4400 });
    await ui.hideSpeak();

    engine.rig.moveTo(
      [lerp(2.2, 1.4, t), 1.9, lerp(ADAM.z + 4.4, ADAM.z + 3.2, t)],
      [(ADAM.x + EVE.x) / 2, 1.3, (ADAM.z + EVE.z) / 2], 7, ease.inOutCubic);
    await wait(.5);
  }

  state.swayTotal = state.sway;
  await ui.narrateAll(S.toAdam.close.narration);
  await wait(1.2);
}
