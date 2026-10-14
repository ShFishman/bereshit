// Act 2 — the garden, and the thing the garden cannot fix.
// Ten creatures are named — by the player, in whatever words they like.
// Every one of them arrives as a pair and leaves as a pair. Nobody says what
// is wrong until the very end, and by then it does not need saying.

import * as THREE from 'three';
import { clock, wait, ease, lerp, clamp } from '../core/utils.js';
import { makePair, speciesKey } from '../gfx/fauna.js';
import { POSES } from '../gfx/figures.js';
import { runExchange } from './dialogue.js';

const ADAM = new THREE.Vector3(1.2, 0, 11.5);

const NAME_GOD = 'הַקּוֹל';
const NAME_ADAM = 'הָאָדָם';

/** Figures are modelled facing +Z, so Object3D.lookAt would turn their backs. */
export function faceTowards(obj, x, z) {
  obj.rotation.y = Math.atan2(x - obj.position.x, z - obj.position.z);
}

const fill = (s, name) => String(s || '').replace(/\{name\}/g, name);

/** Where a pair enters from — spread around the far side of the meadow. */
function entryFor(i, total) {
  const a = -Math.PI * .85 + (i / Math.max(1, total - 1)) * Math.PI * 1.7;
  return { x: ADAM.x + Math.sin(a) * 34, z: ADAM.z - 10 + Math.cos(a) * 30 };
}

async function nameOne(ctx, animal, index, total) {
  const { engine, ui, score, stage, SCRIPT } = ctx;
  const N = SCRIPT.naming;
  const key = speciesKey(animal.translit);
  const pair = makePair(key, { seed: 100 + index * 17 });
  stage.addPair('named_' + key + index, pair);

  const isBird = pair[0].spec.type === 'bird';
  const entry = entryFor(index, total);
  const standX = ADAM.x + (index % 2 ? 2.4 : -2.6);
  const standZ = ADAM.z - 5.2 - (index % 3) * .6;

  pair.forEach((a, j) => {
    a.placeAt(entry.x + j * 2.4, entry.z + j * 1.6);
    if (isBird) { a.flying = true; a.flyHeight = 7 + j * 1.4; a.object.position.y = 7 + j * 1.4; }
  });

  const walkIn = pair.map((a, j) => a.moveTo(
    standX + (j ? 1.5 : -1.5), standZ + (j ? .7 : -.4),
    { speed: isBird ? 5.5 : 1.9, fly: isBird, height: isBird ? 6.5 : 0 }));

  engine.rig.moveTo(
    [ADAM.x + 5.6, 2.3, ADAM.z + 5.4],
    [(standX + ADAM.x) / 2, 1.1, (standZ + ADAM.z) / 2],
    4, ease.inOutCubic);

  // never let a creature that cannot reach its mark stall the whole story
  await Promise.race([Promise.all(walkIn), wait(isBird ? 8 : 12)]);
  pair.forEach(a => a.stop());

  if (isBird) {
    score.cue('wings');
    await clock.to(1.5, e => { pair.forEach(a => { a.flyHeight = lerp(6.5, .05, e); }); }, ease.outCubic);
    pair.forEach(a => { a.flying = false; });
  }

  pair.forEach(a => a.lookAt(ADAM.x, ADAM.z));
  stage.adam.pose({ ...POSES.rest, head: [0, index % 2 ? .22 : -.22, 0], chest: [0, index % 2 ? .12 : -.12, 0] }, 1);
  await wait(.7);

  /* ── the player decides what it is called ── */
  stage.adam.poseTo(POSES.reach, 1.1, ease.outCubic);
  pair.forEach(a => a.setGlow(.8));

  const typed = await ui.askName({
    prompt: N.prompt.he,
    placeholder: N.placeholder.he,
    skip: N.skip.he,
  });
  const given = (typed || '').trim() || animal.he;
  const isOwn = !!(typed && typed.trim());

  score.cue('name');
  clock.to(1.6, e => pair.forEach(a => a.setGlow(.8 * (1 - e))), ease.outCubic);

  await ui.showGiven(given, isOwn ? animal.he : null, {
    givenLabel: isOwn ? N.given.he : '',
    tradLabel: N.traditional.he,
    dwell: 3200,
  });

  stage.adam.poseTo(POSES.rest, 1.1);

  // Adam, delighted with his own power to name
  const react = N.reactions[index % N.reactions.length];
  await ui.narrate({ he: fill(react.he, given), en: fill(react.en, given), dwell: 3400 });

  /* ── and they go, together ── */
  const exit = entryFor((index + 5) % total, total);
  const walkOut = pair.map((a, j) => a.moveTo(
    exit.x * 1.5 + j * 3, exit.z * 1.5 + j * 2,
    { speed: isBird ? 6.5 : 1.6, fly: isBird, height: isBird ? 9 : 0 }));
  if (isBird) { pair.forEach((a, j) => { a.flying = true; a.flyHeight = 9 + j; }); score.cue('wings'); }

  // the camera does not follow them. it stays on him.
  engine.rig.moveTo(
    [ADAM.x + 3.8, 1.9, ADAM.z + 4.6], [ADAM.x, 1.25, ADAM.z], 3.6, ease.inOutCubic);

  const after = N.afterPair[index % N.afterPair.length];
  if (after && index >= 2) await ui.narrate({ ...after, dwell: 3200 });

  await Promise.race([Promise.all(walkOut), wait(5)]);
  pair.forEach(a => stage.removeAnimal(a));
}

export async function runEden(ctx) {
  const { engine, ui, score, stage, SCRIPT, state } = ctx;
  const E = SCRIPT.eden;

  score.setBed('eden', { fade: 6 });
  engine.rig.drift = .4;
  engine.rig.parallax = .7;
  engine.bloomTo(.45, .62, .82, 3);

  await ui.title(SCRIPT.ui.acts[2], { dwell: 3400 });

  /* ── arrival ── */
  stage.adam.object.position.copy(ADAM);
  stage.adam.object.rotation.y = Math.PI;
  stage.adam.pose(POSES.rest, 1);
  engine.rig.snap([ADAM.x + 9, 7, ADAM.z + 16], [ADAM.x, 1.4, ADAM.z]);
  engine.rig.moveTo([ADAM.x + 4.5, 2.2, ADAM.z + 6], [ADAM.x, 1.2, ADAM.z], 9, ease.inOutCubic);

  await ui.verses(E.arrival.verses, { dwell: 4800 });
  await ui.narrateAll(E.arrival.narration);

  /* ── the command about the tree, which Adam answers ── */
  score.setIntensity(.5);
  stage.treeOfKnowledge.temptation = .08;
  await engine.rig.arcTo([5.5, 3.2, 13], [0, 4.5, 0], 7, 4, ease.inOutCubic);
  faceTowards(stage.adam.object, 0, 0);
  await ui.verses(E.command.verses, { dwell: 5400 });

  if (SCRIPT.exchanges?.command) {
    stage.glory.moveTo(0, -8);
    clock.to(3, e => { stage.glory.intensity = e * .4; });
    await runExchange(ctx, SCRIPT.exchanges.command, {
      speaker: NAME_GOD, player: NAME_ADAM,
      onNode: (_n, i) => {
        stage.treeOfKnowledge.temptation = .08 + i * .06;
        engine.rig.moveTo([4.4 - i * .6, 2.9, 11 - i], [0, 4.2, 0], 7, ease.inOutCubic);
      },
    });
    clock.to(4, e => { stage.glory.intensity = .4 * (1 - e); });
  }
  await ui.narrateAll(E.command.narration);
  stage.treeOfKnowledge.temptation = 0;

  /* ── the naming ── */
  await engine.rig.moveTo([ADAM.x + 5, 2.3, ADAM.z + 6], [ADAM.x, 1.2, ADAM.z - 2], 5);
  stage.adam.object.rotation.y = Math.PI;
  await ui.narrate({ he: E.naming.intro.he, en: E.naming.intro.en, dwell: 4000 });

  ui.showLonely();
  const animals = E.naming.animals;
  const lonelyLines = E.loneliness.lines;
  const lineAt = { 1: 0, 3: 1, 5: 2, 7: 3, 8: 4, 9: 5 };
  state.namesGiven = [];

  for (let i = 0; i < animals.length; i++) {
    if (state.skipToAct != null) return;
    await nameOne(ctx, animals[i], i, animals.length);

    const lonely = (i + 1) / animals.length;
    state.loneliness = lonely;
    ui.setLonely(lonely);
    score.setLoneliness(lonely);
    stage.setDecay(lonely * .22);

    if (lineAt[i] != null && lonelyLines[lineAt[i]]) {
      if (lonely > .55) score.cue('heartbeat');
      await wait(.4);
      await ui.narrate(lonelyLines[lineAt[i]]);
    }
    await wait(.3);
  }

  /* ── and there was none ── */
  score.setBed('loneliness', { fade: 7 });
  score.setLoneliness(1);
  await ui.hideLonely();

  stage.adam.poseTo(POSES.lonely, 3.2, ease.inOutCubic);
  stage.adam.idleAmount = .55;

  // the camera retreats until he is small, and keeps retreating
  engine.rig.drift = .22;
  engine.rig.moveTo([ADAM.x + 16, 9, ADAM.z + 26], [ADAM.x, 1.1, ADAM.z], 18, ease.inOutCubic);
  engine.bloomTo(.33, .55, .86, 8);
  clock.to(12, e => stage.setDecay(.22 + e * .14), ease.inOutQuad);

  await ui.verses(E.naming.outro.verses, { dwell: 6200 });
  await ui.narrateAll(E.naming.outro.narration);

  await wait(2);
}
