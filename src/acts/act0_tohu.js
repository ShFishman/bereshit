// Act 0 — תֹהוּ וָבֹהוּ. Before the first word there is only this.

import * as THREE from 'three';
import { clock, wait, ease, lerp } from '../core/utils.js';

export async function runTohu(ctx) {
  const { engine, ui, score, stage, SCRIPT } = ctx;
  const T = SCRIPT.tohu;

  engine.rig.snap([0, 0, 0], [0, .2, -12]);
  engine.rig.drift = 1.4;
  engine.rig.parallax = 1.6;
  engine.rig.fov = 68;
  engine.camera.fov = 68;
  engine.camera.updateProjectionMatrix();
  engine.bloom.strength = .5;
  engine.bloom.radius = 1.0;
  engine.bloom.threshold = .6;

  stage.void.chaos = 1;
  stage.void.light = 0;
  stage.void.spirit = 0;

  score.setBed('tohu', { fade: 6 });

  // out of black, into something worse than black
  engine.veil.fade = 1;
  await engine.fadeIn(6);

  // the deep turns over on itself while the camera drifts, finding nothing
  const slowTurn = engine.onFrame((dt) => {
    engine.rig.target.x = Math.sin(engine.elapsed * .07) * 14;
    engine.rig.target.y = .2 + Math.sin(engine.elapsed * .05) * 3;
  });

  await wait(3);
  await ui.title(SCRIPT.meta.title, { sub: SCRIPT.meta.subtitle?.he || '', dwell: 6500 });

  await ui.verses(T.verses, { dwell: 6200 });

  // "and the spirit of God was hovering upon the face of the waters"
  const spirit = { v: 0 };
  clock.to(9, e => {
    stage.void.spirit = e;
    score.setIntensity(e * .5);
  }, ease.inOutCubic);

  await ui.narrateAll(T.narration);

  slowTurn();
  await wait(1.2);

  // the whole piece waits here, on a held breath, for the player to decide
  ui.cue('chime');
  await ui.press(T.prompt?.he || SCRIPT.ui.begin.he, { hold: 0 });

  engine.rig.parallax = .5;
}
