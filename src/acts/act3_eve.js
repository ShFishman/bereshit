// Act 3 — the deep sleep, and the one who is made out of him.
// The making is not shown as surgery. It is shown as light being divided,
// which is what the first day looked like too.

import * as THREE from 'three';
import { clock, wait, ease, lerp, clamp, isMobile } from '../core/utils.js';
import { POSES } from '../gfx/figures.js';
import { DustCloud, sampleSurface } from '../gfx/particles.js';
import { faceTowards } from './act2_eden.js';
import { runExchange } from './dialogue.js';

const ADAM = new THREE.Vector3(1.2, 0, 11.5);
const EVE = new THREE.Vector3(-1.5, 0, 10.2);

export async function runEve(ctx) {
  const { engine, ui, score, stage, SCRIPT, state } = ctx;
  const E = SCRIPT.eve;

  /* ═══════════ the tardemah ═══════════ */
  score.setBed('tardemah', { fade: 6 });
  await ui.title(SCRIPT.ui.acts[3], { dwell: 3400 });

  engine.rig.moveTo([ADAM.x + 4.2, 2.0, ADAM.z + 5.4], [ADAM.x, .9, ADAM.z], 7, ease.inOutCubic);
  await ui.verses(E.sleep.verses, { dwell: 5600 });

  // he goes down
  score.cue('heartbeat');
  stage.adam.idleAmount = .35;
  await stage.adam.poseTo(POSES.kneel, 3.2, ease.inOutCubic);
  await clock.to(3.4, e => {
    stage.adam.object.rotation.x = -e * 1.42;
    stage.adam.object.position.y = -e * .62;
  }, ease.inOutCubic);
  stage.adam.idleAmount = .22;
  await stage.adam.poseTo(POSES.rest, 2);

  await ui.narrateAll(E.sleep.narration);

  /* ═══════════ the world dissolves ═══════════ */
  engine.setVeilColor(0xfff2dc);
  engine.rig.moveTo([ADAM.x + 2.0, 1.2, ADAM.z + 3.0], [ADAM.x, .5, ADAM.z], 14, ease.inOutCubic);
  engine.bloomTo(1.25, 1.05, .4, 5);
  engine.ripple(.8, 6);
  await engine.fadeTo(.82, 5);

  /* ═══════════ the taking of the side ═══════════ */
  score.cue('rib');

  // build the dust that will become her, drawn out of his side as a seam of light
  stage.eve.object.position.copy(EVE);
  faceTowards(stage.eve.object, ADAM.x, ADAM.z);
  stage.eve.object.visible = true;
  stage.eve.object.updateWorldMatrix(true, true);
  const targets = sampleSurface(stage.eve.object, isMobile() ? 8000 : 22000, 23);
  stage.eve.object.visible = false;

  const spark = new DustCloud(targets, {
    color: 0xffd9e4, breathColor: 0xffffff, size: isMobile() ? 3.6 : 3.0,
    spread: 1.9, seed: 29, start: 'line',
    origin: [ADAM.x, .35, ADAM.z - .1],
  });
  spark.form = 0; spark.breath = 0;
  stage.ground.object.add(spark.object);
  const tickSpark = engine.onFrame((dt, t) => { spark.time = t; });

  await engine.fadeTo(.45, 3.5);
  await ui.narrateAll(E.making.narration);

  await clock.to(8, e => {
    spark.form = e;
    engine.veil.fade = lerp(.45, .12, e);
  }, ease.inOutCubic);

  score.cue('breath');
  await clock.to(3, e => { spark.breath = e; }, ease.outCubic);

  // hand over from light to person
  stage.eve.object.visible = true;
  stage.eve.pose(POSES.unformed, 0);
  stage.eve.opacity = 0;
  stage.eve.idleAmount = 0;
  stage.eve.glow = .5;
  await clock.to(2.2, e => {
    stage.eve.opacity = e;
    spark.breath = 1 - e * .6;
  }, ease.inOutQuad);
  await clock.to(1.8, e => { spark.breath = (1 - e) * .4; });
  tickSpark();
  stage.ground.object.remove(spark.object);
  spark.dispose();

  stage.eve.idleAmount = 1;
  await stage.eve.poseTo(POSES.awaken, 3, ease.outCubic);
  score.setBed('eve', { fade: 5 });
  await stage.eve.poseTo(POSES.rest, 2.5);
  clock.to(6, e => { stage.eve.glow = lerp(.5, .06, e); });

  await engine.fadeTo(0, 4);
  engine.setVeilColor(0x000000);

  /* ═══════════ he wakes ═══════════ */
  stage.adam.idleAmount = .9;
  await clock.to(3.2, e => {
    stage.adam.object.rotation.x = -(1 - e) * 1.42;
    stage.adam.object.position.y = -(1 - e) * .62;
  }, ease.inOutCubic);
  stage.adam.poseTo(POSES.awaken, 2.2, ease.outCubic);
  stage.adam.idleAmount = 1;
  faceTowards(stage.adam.object, EVE.x, EVE.z);

  engine.rig.arcTo([ADAM.x + 3.4, 1.9, ADAM.z + 3.4], [(ADAM.x + EVE.x) / 2, 1.25, (ADAM.z + EVE.z) / 2], 8, 1.6);

  // the colour that the loneliness drained comes back, all at once
  score.cue('awake');
  clock.to(7, e => {
    stage.setDecay(lerp(.36, 0, e));
    stage.ground.bloom = lerp(.8, 1, e);
  }, ease.outCubic);
  engine.bloomTo(.5, .66, .8, 6);
  score.setLoneliness(0);
  state.loneliness = 0;

  await wait(1.5);
  await stage.adam.poseTo(POSES.wonder, 2.4, ease.outCubic);

  await ui.verses(E.waking.verses, { dwell: 7000 });

  if (E.waking.adamFirstWords) {
    await ui.speak('אָדָם', E.waking.adamFirstWords, null, { dwell: 5200, fadeOut: true });
  }
  await ui.narrateAll(E.waking.narration);

  /* ═══════════ the first conversation ═══════════ */
  // The only interactive scene in the piece with nothing at stake. It is here
  // so that the player has something to lose later.
  if (SCRIPT.exchanges?.firstWords) {
    faceTowards(stage.eve.object, ADAM.x, ADAM.z);
    faceTowards(stage.adam.object, EVE.x, EVE.z);
    const mid = [(ADAM.x + EVE.x) / 2, 1.3, (ADAM.z + EVE.z) / 2];

    const warmth = await runExchange(ctx, SCRIPT.exchanges.firstWords, {
      speaker: 'חַוָּה', player: 'אָדָם',
      dwellVoice: 4600, dwellReply: 3800, dwellRetort: 4200,
      onNode: (_n, i, t) => {
        // they drift fractionally closer as they talk
        engine.rig.moveTo(
          [lerp(3.2, 2.1, t), lerp(2.0, 1.85, t), lerp(ADAM.z + 4.2, ADAM.z + 3.0, t)],
          mid, 6, ease.inOutCubic);
        stage.eve.poseTo(i % 2 ? POSES.wonder : POSES.rest, 1.6);
      },
      onReply: (r) => {
        if ((r?.sway ?? 0) >= 2) {
          stage.adam.poseTo(POSES.wonder, 1.4, ease.outCubic);
          score.cue('chime');
        }
      },
    });
    state.warmth = warmth;
    stage.adam.poseTo(POSES.rest, 1.8);
    stage.eve.poseTo(POSES.rest, 1.8);
  }

  /* ═══════════ and they were both naked, and were not ashamed ═══════════ */
  stage.adam.poseTo(POSES.rest, 2);
  stage.eve.poseTo(POSES.rest, 2);
  await engine.rig.moveTo([2.4, 2.4, ADAM.z + 8], [(ADAM.x + EVE.x) / 2, 1.2, (ADAM.z + EVE.z) / 2], 9, ease.inOutCubic);

  await ui.verses(E.naked.verses, { dwell: 6400 });
  await wait(1.6);
}
