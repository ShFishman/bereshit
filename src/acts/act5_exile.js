// Act 5 — the eating, the opened eyes, the voice in the garden,
// the three curses, the coats of skin, and the gate.

import * as THREE from 'three';
import { clock, wait, ease, lerp, clamp, isMobile } from '../core/utils.js';
import { POSES } from '../gfx/figures.js';
import { PLACES } from '../core/stage.js';
import { faceTowards } from './act2_eden.js';

const ADAM = new THREE.Vector3(1.2, 0, 11.5);
const EVE = new THREE.Vector3(-1.5, 0, 10.2);
const HIDE_A = new THREE.Vector3(-13.5, 0, 17.5);
const HIDE_B = new THREE.Vector3(-15.6, 0, 16.2);

const NAME_VOICE = 'הַקּוֹל';
const NAME_ADAM = 'הָאָדָם';
const NAME_EVE = 'הָאִשָּׁה';

const SPEAKER_NAMES = { god: NAME_VOICE, adam: NAME_ADAM, eve: NAME_EVE, serpent: 'הַנָּחָשׁ' };

/* ───────── clothing: coats of skin ───────── */

function clothe(fig, color = 0x7a5336) {
  const mat = new THREE.MeshStandardMaterial({ color, roughness: .95, metalness: 0, flatShading: true });
  const tunic = new THREE.Mesh(new THREE.CylinderGeometry(.235, .31, .74, 10, 1, true), mat);
  tunic.position.y = .12;
  tunic.scale.set(1.18, 1, .95);
  tunic.castShadow = true;
  fig.bones.chest.add(tunic);
  const shoulder = new THREE.Mesh(new THREE.SphereGeometry(.2, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat);
  shoulder.position.y = .34;
  shoulder.scale.set(1.5, .9, 1.05);
  fig.bones.chest.add(shoulder);
  const parts = [tunic, shoulder];
  parts.forEach(p => { p.scale.multiplyScalar(.001); });
  return { parts, material: mat };
}

/* ───────── thorns and thistles ───────── */

function makeThorns(count = 260, radius = 46, seed = 61) {
  const geo = new THREE.ConeGeometry(.09, .95, 4);
  geo.translate(0, .475, 0);
  const mat = new THREE.MeshStandardMaterial({ color: 0x2b2318, roughness: 1, flatShading: true });
  const mesh = new THREE.InstancedMesh(geo, mat, count);
  const m = new THREE.Matrix4();
  let s = seed;
  const r = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  for (let i = 0; i < count; i++) {
    const a = r() * Math.PI * 2, d = 4 + Math.sqrt(r()) * radius;
    const sc = .6 + r() * 1.5;
    m.compose(
      new THREE.Vector3(Math.cos(a) * d, 0, Math.sin(a) * d),
      new THREE.Quaternion().setFromEuler(new THREE.Euler((r() - .5) * .7, r() * 6.28, (r() - .5) * .7)),
      new THREE.Vector3(sc, sc * (.6 + r()), sc));
    mesh.setMatrixAt(i, m);
  }
  mesh.instanceMatrix.needsUpdate = true;
  mesh.castShadow = true;
  mesh.scale.setScalar(.001);
  return mesh;
}

/* ═════════════════════ the act ═════════════════════ */

export async function runExile(ctx) {
  const { engine, ui, score, stage, SCRIPT, state } = ctx;
  const F = SCRIPT.fall;

  await ui.title(SCRIPT.ui.acts[5], { dwell: 3200 });

  /* ═══════════ and he ate ═══════════ */
  engine.rig.moveTo([1.8, 1.85, ADAM.z + 3.4], [(ADAM.x + EVE.x) / 2, 1.35, (ADAM.z + EVE.z) / 2], 6, ease.inOutCubic);

  stage.eve.poseTo(POSES.offer, 1.6, ease.outCubic);
  await wait(1.8);
  stage.adam.poseTo(POSES.reachLeft, 1.6, ease.outCubic);
  await wait(1.6);

  // the fruit changes hands
  const fruit = state.fruit;
  if (fruit && stage.adam.bones.handL) {
    stage.adam.bones.handL.add(fruit);
    fruit.position.set(0, -.08, 0);
  }
  score.cue('pluck');
  await wait(1.4);

  stage.adam.poseTo({ ...POSES.rest, upperArmL: [-1.5, -.4, .3], forearmL: [-1.4, 0, 0], head: [-.1, -.14, 0] }, 1.3, ease.outCubic);
  await wait(1.1);
  score.cue('bite');
  engine.rig.shake(.14, 2.2);
  await wait(1.4);

  await ui.verses(F.eating.verses, { dwell: 6000 });

  /* ═══════════ their eyes were opened ═══════════ */
  score.setBed('fall', { fade: 1.2 });
  score.cue('eyesOpen');

  engine.flash('#ffffff', 2.4, 1);
  engine.rig.shake(.7, 1.1);
  engine.ripple(1, 3.2);
  if (fruit) { fruit.parent?.remove(fruit); }

  stage.adam.poseTo(POSES.cover, 1.6, ease.outCubic);
  stage.eve.poseTo(POSES.cover, 1.7, ease.outCubic);

  // the garden does not die. it simply stops being for them.
  clock.to(11, e => {
    stage.setDecay(lerp(0, .78, e));
    stage.engine?.renderer && (engine.renderer.toneMappingExposure = lerp(1.18, .86, e));
    stage.motes.opacity = lerp(1, .35, e);
    stage.birds.speed = lerp(1.1, 2.4, e);
  }, ease.inOutCubic);
  engine.bloomTo(.22, .5, .88, 8);

  engine.rig.moveTo([7.5, 4.2, ADAM.z + 10], [(ADAM.x + EVE.x) / 2, 1.2, (ADAM.z + EVE.z) / 2], 13, ease.inOutCubic);
  engine.rig.drift = .7;

  await ui.verses(F.eyesOpen.verses, { dwell: 6800 });
  await ui.narrateAll(F.eyesOpen.narration);

  /* ═══════════ the voice walking in the garden ═══════════ */
  score.setBed('hiding', { fade: 5 });

  stage.glory.moveTo(0, -28);
  stage.glory.intensity = 0;
  clock.to(9, e => { stage.glory.intensity = e * .55; }, ease.inOutQuad);

  // footsteps that approach and never arrive
  for (let i = 0; i < 5; i++) {
    score.cue('footstep');
    clock.to(1.6, e => {
      const z = lerp(-28 + i * 5, -28 + (i + 1) * 5, e);
      stage.glory.moveTo(0, z);
    }, ease.inOutQuad);
    await wait(1.7);
  }

  await ui.verses(F.hiding.verses, { dwell: 6000 });

  // they run for the trees
  faceTowards(stage.adam.object, HIDE_A.x, HIDE_A.z);
  faceTowards(stage.eve.object, HIDE_B.x, HIDE_B.z);
  stage.adam.walkSpeed = 1.6; stage.eve.walkSpeed = 1.6;
  const a0 = stage.adam.object.position.clone(), e0 = stage.eve.object.position.clone();
  engine.rig.moveTo([-6, 3.2, 24], [-12, 1.2, 17], 7, ease.inOutCubic);
  await clock.to(5.5, e => {
    stage.adam.object.position.lerpVectors(a0, HIDE_A, e);
    stage.eve.object.position.lerpVectors(e0, HIDE_B, e);
  }, ease.inOutQuad);
  stage.adam.walkSpeed = 0; stage.eve.walkSpeed = 0;
  stage.adam.poseTo(POSES.hide, 1.8, ease.outCubic);
  stage.eve.poseTo(POSES.hide, 1.9, ease.outCubic);

  await ui.narrateAll(F.hiding.narration);

  /* ═══════════ אַיֶּכָּה ═══════════ */
  await wait(1.6);
  score.cue('ayeka');
  clock.to(3, e => { stage.glory.intensity = .55 + Math.sin(e * Math.PI) * .5; });
  engine.rig.shake(.1, 1.4);

  await ui.speak(NAME_VOICE, F.ayeka.call, null, { dwell: 6200, fadeOut: true });
  await wait(1.2);
  await ui.speak(NAME_ADAM, F.ayeka.answer, null, { dwell: 5600, fadeOut: true });
  await ui.narrateAll(F.ayeka.narration);

  /* ═══════════ the blaming ═══════════ */
  engine.rig.moveTo([-9.5, 2.2, 22], [-14.4, 1.0, 17], 9, ease.inOutCubic);

  for (const ex of (F.blame.exchanges || [])) {
    if (ex.speaker === 'god') {
      clock.to(2, e => { stage.glory.intensity = .55 + Math.sin(e * Math.PI) * .35; });
    }
    await ui.speak(SPEAKER_NAMES[ex.speaker] || '', ex, null, { dwell: 5200, fadeOut: false });
    await wait(.6);
  }
  await ui.hideSpeak();

  /* ═══════════ the three curses ═══════════ */
  score.setBed('judgment', { fade: 6 });
  stage.glory.moveTo(0, 6);
  clock.to(5, e => { stage.glory.intensity = lerp(.55, 1, e); });

  let thorns = null;
  for (let i = 0; i < (F.curses || []).length; i++) {
    const c = F.curses[i];
    score.cue('curse');
    engine.rig.shake(.3, 1.6);
    engine.flash('#1a0a06', 1.6, .4);

    if (c.who === 'serpent') {
      // driven down onto its belly, into the dust
      stage.serpent.object.visible = true;
      stage.serpent.opacity = 0;
      stage.serpent.coil = 0;
      clock.to(3, e => { stage.serpent.opacity = e * .9; });
      clock.to(7, e => {
        stage.serpent.object.position.y = lerp(0, -2.2, e);
        stage.serpent.tension = 1 - e;
      }, ease.inQuad).then(() => { stage.serpent.object.visible = false; });
      engine.rig.moveTo([-2, 1.4, 9], [0, .6, 1], 8, ease.inOutCubic);
    }
    if (c.who === 'woman') {
      engine.rig.moveTo([-12, 1.9, 21.5], [HIDE_B.x, 1.15, HIDE_B.z], 8, ease.inOutCubic);
      stage.eve.poseTo(POSES.judged, 2.4, ease.outCubic);
    }
    if (c.who === 'man') {
      engine.rig.moveTo([-10.5, 2.0, 21.5], [HIDE_A.x, 1.2, HIDE_A.z], 8, ease.inOutCubic);
      stage.adam.poseTo(POSES.judged, 2.4, ease.outCubic);
      // thorns and thistles, out of the ground he was taken from
      thorns = makeThorns(isMobile() ? 110 : 280, 50, 61);
      stage.ground.object.add(thorns);
      clock.to(9, e => thorns.scale.setScalar(Math.max(.001, ease.outCubic(e))), ease.linear);
      clock.to(9, e => stage.setDecay(lerp(.78, .95, e)));
    }

    if (c.title) await ui.narrate({ he: c.title.he, en: c.title.en, dwell: 3000 });
    await ui.verses(c.verses, { dwell: 7000 });
    await ui.narrateAll(c.narration);
    await wait(.8);
  }

  /* ═══════════ he called her name Chava ═══════════ */
  stage.adam.poseTo(POSES.rest, 2.2);
  stage.eve.poseTo(POSES.rest, 2.2);
  faceTowards(stage.adam.object, HIDE_B.x, HIDE_B.z);
  faceTowards(stage.eve.object, HIDE_A.x, HIDE_A.z);
  engine.rig.moveTo([-11.5, 1.85, 20.5], [-14.5, 1.25, 16.9], 8, ease.inOutCubic);
  score.cue('name');
  await ui.verses(F.naming.verses, { dwell: 6600 });

  /* ═══════════ and He clothed them ═══════════ */
  // the one who drives them out is the one who dresses them first
  score.setBed('exile', { fade: 7 });
  clock.to(4, e => { stage.glory.intensity = lerp(1, .42, e); });

  const cA = clothe(stage.adam, 0x7a5336);
  const cB = clothe(stage.eve, 0x6f4a31);
  score.cue('tear');
  await clock.to(4.5, e => {
    const s = ease.outCubic(e);
    cA.parts.forEach((p, i) => p.scale.setScalar(Math.max(.001, s * (i ? 1 : 1))));
    cB.parts.forEach(p => p.scale.setScalar(Math.max(.001, s)));
    cA.parts[0].scale.set(s * 1.18, s, s * .95);
    cB.parts[0].scale.set(s * 1.18, s, s * .95);
    cA.parts[1].scale.set(s * 1.5, s * .9, s * 1.05);
    cB.parts[1].scale.set(s * 1.5, s * .9, s * 1.05);
  }, ease.linear);

  await ui.verses(F.clothing.verses, { dwell: 7200 });
  await ui.narrateAll(F.clothing.narration);

  /* ═══════════ east of Eden ═══════════ */
  stage.gate.object.visible = true;
  stage.gate.intensity = 0;
  stage.embers.object.visible = true;
  stage.embers.object.position.set(PLACES.gate.x - 4, 0, 0);
  clock.to(10, e => { stage.embers.reveal = e * .7; });

  await ui.verses(F.exile.verses, { dwell: 6800 });

  // they walk, and the camera walks with them only part of the way
  const start = { a: stage.adam.object.position.clone(), e: stage.eve.object.position.clone() };
  const endA = new THREE.Vector3(PLACES.gate.x + 26, 0, 2.5);
  const endE = new THREE.Vector3(PLACES.gate.x + 24, 0, -1.5);

  faceTowards(stage.adam.object, endA.x, endA.z);
  faceTowards(stage.eve.object, endE.x, endE.z);
  stage.adam.poseTo(POSES.walkOut, 2.5);
  stage.eve.poseTo(POSES.walkOut, 2.5);
  stage.adam.walkSpeed = .75; stage.eve.walkSpeed = .75;

  score.cue('sword');
  clock.to(8, e => { stage.gate.intensity = e; }, ease.outCubic);

  // camera travels to the gate, then stops there for good
  engine.rig.moveTo([PLACES.gate.x - 13, 3.4, 11], [PLACES.gate.x + 2, 2.4, 0], 20, ease.inOutCubic);

  await clock.to(34, e => {
    const t = ease.inOutQuad(e);
    stage.adam.object.position.lerpVectors(start.a, endA, t);
    stage.eve.object.position.lerpVectors(start.e, endE, t);
  }, ease.linear);

  stage.adam.walkSpeed = .45; stage.eve.walkSpeed = .45;

  /* ═══════════ the gate ═══════════ */
  score.cue('gate');
  engine.rig.shake(.35, 2);
  await engine.rig.moveTo([PLACES.gate.x - 9, 3.0, 0], [PLACES.gate.x + 14, 2.0, 0], 14, ease.inOutCubic);
  engine.rig.drift = .12;
  engine.bloomTo(.7, .9, .55, 6);

  await ui.verses(F.final.verses, { dwell: 8200 });

  // they keep walking. they do not get smaller quickly. that is the point.
  clock.to(40, e => {
    stage.adam.object.position.x = lerp(endA.x, endA.x + 42, e);
    stage.eve.object.position.x = lerp(endE.x, endE.x + 42, e);
    stage.adam.opacity = 1 - e * .55;
    stage.eve.opacity = 1 - e * .55;
  }, ease.linear);

  await ui.narrateAll(F.final.narration);

  score.setBed('epilogue', { fade: 10 });
  await wait(4);

  engine.rig.moveTo([PLACES.gate.x - 16, 4.2, 0], [PLACES.gate.x + 3, 3.2, 0], 26, ease.inOutCubic);
  await engine.fadeTo(1, 16);
  await wait(3);

  /* ═══════════ after ═══════════ */
  ui.cinema(false);
  await ui.title(
    { he: SCRIPT.meta.title.he, en: SCRIPT.meta.title.en },
    { sub: SCRIPT.ui.epilogue?.he || '', dwell: 11000, fadeOut: false });
}
