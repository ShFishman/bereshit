// The one world. It is created during the seven days and then lived in,
// spoiled and lost across the acts that follow — never rebuilt, only changed.

import * as THREE from 'three';
import { Void, Sky, Ocean, Ground, Glory, makeRivers } from '../gfx/world.js';
import { Grove, GrassField, Flowers, TreeOfKnowledge, treeOfLife } from '../gfx/flora.js';
import { DustCloud, sampleSurface, Motes, StarField, Swarm, Embers } from '../gfx/particles.js';
import { Figure, Serpent, GateOfEden, POSES } from '../gfx/figures.js';
import { makeMaterial, hasShader } from './materials.js';
import { clamp, lerp, clock, ease, isMobile } from './utils.js';

export const PLACES = {
  tree: new THREE.Vector3(0, 0, 0),           // the Tree of Knowledge, centre of everything
  lifeTree: new THREE.Vector3(-16, 0, -11),
  meadow: new THREE.Vector3(2, 0, 13),        // where the animals are named
  rest: new THREE.Vector3(-4, 0, 9),          // where Adam sleeps
  gate: new THREE.Vector3(52, 0, 0),          // east of Eden
};

export class Stage {
  constructor(engine) {
    this.engine = engine;
    this.scene = engine.scene;
    this.built = false;
    this.animals = [];
    this._pairs = new Map();
    this._t = 0;
  }

  build() {
    if (this.built) return;
    const S = this.scene;

    /* ── sky and deep ── */
    this.void = new Void({ radius: 900 });
    this.void.chaos = 1; this.void.light = 0; this.void.spirit = 0;
    S.add(this.void.object);

    this.sky = new Sky({ radius: 1200 });
    this.sky.dayNight = 0; this.sky.stars = 0;
    this.sky.object.visible = false;
    S.add(this.sky.object);

    this.stars = new StarField({ count: isMobile() ? 1200 : 2800 });
    this.stars.reveal = 0;
    S.add(this.stars.object);

    /* ── waters and land ── */
    this.ocean = new Ocean({ size: 2400, segments: isMobile() ? 90 : 170 });
    this.ocean.object.position.y = -0.8;
    this.ocean.object.visible = false;
    S.add(this.ocean.object);

    this.ground = new Ground({ size: 320, segments: isMobile() ? 80 : 130 });
    this.ground.object.position.y = -9;      // drowned, until the third day
    this.ground.object.visible = false;      // and not there at all until the deep is parted
    S.add(this.ground.object);

    this.rivers = makeRivers({ count: 4, radius: 78 });
    this.rivers.visible = false;
    this.ground.object.add(this.rivers);

    /* ── vegetation ── */
    this.grass = new GrassField({
      count: isMobile() ? 14000 : 62000, radius: 40, seed: 12,
      base: 0x27421b, tip: 0x7cb045, height: 1.0,
    });
    this.grass.growth = 0;
    this.ground.object.add(this.grass.object);

    this.flowers = new Flowers({ count: isMobile() ? 420 : 1300, radius: 40, inner: 3, seed: 18 });
    this.flowers.object.visible = false;
    this.ground.object.add(this.flowers.object);

    this.grove = new Grove({
      count: isMobile() ? 24 : 54, radius: 78, inner: 11, seed: 24, species: 4,
      exclude: [
        { x: 0, z: 0, r: 13 },
        { x: PLACES.lifeTree.x, z: PLACES.lifeTree.z, r: 10 },
        { x: PLACES.meadow.x, z: PLACES.meadow.z, r: 9 },
        { x: PLACES.gate.x, z: 0, r: 17 },        // nothing grows in the gateway
        { x: PLACES.gate.x - 16, z: 0, r: 9 },    // nor on the road out
      ],
    });
    this.grove.object.scale.setScalar(0.001);
    this.ground.object.add(this.grove.object);

    this.treeOfKnowledge = new TreeOfKnowledge({ seed: 1312, height: 9.5, fruitCount: isMobile() ? 10 : 18 });
    this.treeOfKnowledge.object.position.copy(PLACES.tree);
    this.treeOfKnowledge.object.scale.setScalar(0.001);
    this.ground.object.add(this.treeOfKnowledge.object);

    this.treeOfLife = treeOfLife({ seed: 808, height: 13 });
    this.treeOfLife.position.copy(PLACES.lifeTree);
    this.treeOfLife.scale.setScalar(0.001);
    this.ground.object.add(this.treeOfLife);

    /* ── air and water life ── */
    this.motes = new Motes({ count: isMobile() ? 320 : 1000, radius: 55, height: 18 });
    this.motes.reveal = 0;
    S.add(this.motes.object);

    this.birds = new Swarm({
      count: isMobile() ? 60 : 170, kind: 'bird', center: [0, 26, -30],
      spread: 26, speed: 1.1, scale: 1.5, seed: 31,
      color: 0xd8e4ff, emissive: 0x5577bb,
    });
    this.birds.opacity = 0;
    S.add(this.birds.object);

    this.fish = new Swarm({
      count: isMobile() ? 70 : 200, kind: 'fish', center: [10, -3.2, -26],
      spread: 15, speed: .8, scale: 1.1, seed: 17,
      color: 0x8fd8ff, emissive: 0x2277aa,
    });
    this.fish.opacity = 0;
    S.add(this.fish.object);

    this.embers = new Embers({ count: isMobile() ? 180 : 450, radius: 34 });
    this.embers.reveal = 0;
    S.add(this.embers.object);

    /* ── the people ── */
    this.adam = new Figure({ scale: 1, female: false, seed: 2, color: 0xd09a68, deep: 0x5a2c1e });
    this.adam.object.position.set(1.2, 0, 11.5);
    this.adam.object.rotation.y = Math.PI;
    this.adam.object.visible = false;
    this.ground.object.add(this.adam.object);

    this.eve = new Figure({ scale: .955, female: true, seed: 9, color: 0xdca878, deep: 0x5e3326, rimColor: 0xffe2bb });
    this.eve.object.position.set(-.9, 0, 10.6);
    this.eve.object.rotation.y = Math.PI;
    this.eve.object.visible = false;
    this.ground.object.add(this.eve.object);

    // the dust that becomes a man
    this.adam.object.visible = true;
    this.adam.object.updateWorldMatrix(true, true);
    const targets = sampleSurface(this.adam.object, isMobile() ? 9000 : 26000, 5);
    this.adam.object.visible = false;
    // targets are in world space; the cloud is parented to the same ground
    this.dust = new DustCloud(targets, { size: isMobile() ? 3.4 : 2.9, spread: 8, seed: 13 });
    this.dust.form = 0; this.dust.breath = 0;
    this.dust.object.visible = false;
    this.ground.object.add(this.dust.object);

    /* ── the serpent ── */
    this.serpent = new Serpent({ radius: .19, seed: 3 });
    this.serpent.object.position.copy(PLACES.tree);
    this.serpent.object.visible = false;
    this.ground.object.add(this.serpent.object);

    /* ── the presence, and the gate ── */
    this.glory = new Glory({ height: 70, radius: 8 });
    this.glory.moveTo(0, 20);
    S.add(this.glory.object);

    this.gate = new GateOfEden({
      makeMaterialFn: hasShader('FLAME_SWORD')
        ? () => makeMaterial('FLAME_SWORD', {
            transparent: true, depthWrite: false, toneMapped: false,
            blending: THREE.AdditiveBlending, side: 'double',
          })
        : null,
    });
    this.gate.object.position.copy(PLACES.gate);
    this.gate.object.rotation.y = -Math.PI / 2;
    this.gate.intensity = 0;
    this.gate.object.visible = false;
    this.ground.object.add(this.gate.object);

    this.built = true;
    this._unsub = this.engine.onFrame((dt, t) => this.update(dt, t));
  }

  /* ═══════════ per-frame ═══════════ */

  update(dt, t) {
    this._t = t;
    this.motes.time = t;
    this.stars.time = t;
    this.dust.time = t;
    this.treeOfKnowledge.update(dt);
    if (this.birds.object.visible) this.birds.update(dt, t);
    if (this.fish.object.visible) this.fish.update(dt, t);
    if (this.embers.object.visible) this.embers.update(dt);
    if (this.adam.object.visible) this.adam.update(dt);
    if (this.eve.object.visible) this.eve.update(dt);
    if (this.serpent.object.visible) this.serpent.update(dt);
    if (this.gate.object.visible) this.gate.update(dt);
    for (const a of this.animals) a.update(dt);

    this.sky.applyToLights(this.engine.lights);
    this.ground.setLight(this.sky.sunDir);
    this.ocean.setSun(this.sky.sunDir);
    this.grove.setLight(this.sky.sunDir);
    this.adam.setLight(this.sky.sunDir);
    this.eve.setLight(this.sky.sunDir);

    // the hand-written shaders light themselves, so they need telling the hour
    const L = 0.2 + 0.8 * this.sky.dayNight;
    this.ground.lightLevel = L;
    this.grass.lightLevel = L;
    this.grove.lightLevel = L;
    this.treeOfKnowledge.leafMat.uniforms.uLight.value = L;
    this.adam.lightLevel = L;
    this.eve.lightLevel = L;
    this.serpent.material.uniforms.uLight.value = L;
  }

  /* ═══════════ the seven days ═══════════ */

  async firstLight(dur = 4) {
    await clock.to(dur, e => {
      this.void.light = e;
      this.void.chaos = 1 - e * .55;
      this.engine.renderer.toneMappingExposure = lerp(1, 1.5, Math.sin(e * Math.PI));
    }, ease.inOutQuad);
    this.engine.renderer.toneMappingExposure = 1;
  }

  async raiseFirmament(dur = 5) {
    this.sky.object.visible = true;
    this.ocean.object.visible = true;
    this.ocean.amplitude = 1.6;
    const o = this.ocean.object.position;
    await clock.to(dur, e => {
      this.void.light = 1 - e * .8;
      this.void.chaos = .45 * (1 - e);
      this.sky.dayNight = e * .55;
      this.sky.haze = lerp(1.4, .55, e);
      o.y = lerp(-18, -.8, ease.outCubic(e));
      this.ocean.amplitude = lerp(1.6, .65, e);
    }, ease.inOutCubic);
    this.void.object.visible = false;
  }

  async raiseLand(dur = 6) {
    this.ground.object.visible = true;
    const g = this.ground.object.position;
    await clock.to(dur, e => {
      g.y = lerp(-9, 0, ease.outQuart(e));
      this.ocean.amplitude = lerp(.65, .3, e);
    }, ease.linear);
    this.rivers.visible = true;
    this.rivers.traverse(o => { if (o.material) o.material.opacity = 0; });
  }

  async growVegetation(dur = 7) {
    this.flowers.object.visible = true;
    const fl = this.flowers.object;
    fl.scale.setScalar(.001);
    const groveParts = this.grove.object.children;
    await clock.to(dur, e => {
      this.grass.growth = clamp(e * 1.35);
      this.ground.bloom = clamp(e * .85);
      // trees come up in waves rather than all at once
      groveParts.forEach((m, i) => {
        const d = (i % 4) * .13;
        m.scale.setScalar(ease.outBack(clamp((e - d) / (1 - d))) || .001);
      });
      this.grove.object.scale.setScalar(1);
      this.treeOfKnowledge.object.scale.setScalar(Math.max(.001, ease.outCubic(clamp((e - .35) / .65))));
      this.treeOfLife.scale.setScalar(Math.max(.001, ease.outCubic(clamp((e - .5) / .5))));
      fl.scale.setScalar(Math.max(.001, ease.outBack(clamp((e - .45) / .55))));
      this.rivers.traverse(o => { if (o.material) o.material.opacity = clamp(e * .4); });
    }, ease.linear);
  }

  async hangTheLights(dur = 6) {
    this.stars.reveal = 0;
    await clock.to(dur, e => {
      // one full turn of the sky: dawn, noon, dusk, night, dawn again
      const a = lerp(-.25, Math.PI * 2.25, e);
      this.sky.setSunAngle(a);
      const d = clamp(Math.sin(a) * 1.6 + .25);
      this.sky.dayNight = d;
      this.sky.stars = clamp(1 - d * 2.2);
      this.stars.reveal = clamp(1 - d * 2.0);
      this.stars.opacity = clamp(1 - d * 1.6);
    }, ease.inOutCubic);
    this.sky.setSunAngle(1.05);
    this.sky.dayNight = 1;
  }

  async fillWaterAndAir(dur = 6) {
    this.fish.object.visible = true;
    this.birds.object.visible = true;
    await clock.to(dur, e => {
      this.fish.opacity = clamp(e * 1.4);
      this.birds.opacity = clamp((e - .25) / .75);
    }, ease.outCubic);
  }

  async formAdam({ dustDur = 7, breathDur = 3 } = {}) {
    this.dust.object.visible = true;
    this.dust.form = 0;
    await clock.to(dustDur, e => { this.dust.form = e; }, ease.inOutCubic);
    await clock.to(breathDur, e => {
      this.dust.breath = e;
      this.adam.glow = e * .35;
    }, ease.outCubic);
    // hand over from dust to flesh
    this.adam.object.visible = true;
    this.adam.pose(POSES.unformed, 0);
    this.adam.opacity = 0;
    this.adam.idleAmount = 0;
    await clock.to(1.6, e => {
      this.adam.opacity = e;
      this.dust.breath = 1 - e * .5;
    }, ease.inOutQuad);
    await clock.to(1.4, e => { this.dust.breath = (1 - e) * .5; });
    this.dust.object.visible = false;
    this.adam.idleAmount = 1;
  }

  async sabbath(dur = 6) {
    await clock.to(dur, e => {
      this.engine.bloom.strength = lerp(.45, .85, Math.sin(e * Math.PI));
      this.ground.bloom = lerp(.85, 1, e);
      this.engine.renderer.toneMappingExposure = lerp(1, 1.1, e);
      this.motes.reveal = e;
    }, ease.inOutQuad);
  }

  /* ═══════════ garden dials ═══════════ */

  /** The joy draining out of Eden — colour, wind, light, all at once. */
  setDecay(v) {
    v = clamp(v);
    this.ground.desaturate = v;
    this.grass.wither = v * .85;
    this.grove.wither = v * .8;
    this.grass.wind = lerp(.25, .95, v);
    this.grove.wind = lerp(.35, 1.1, v);
    this.adam.desaturate = v * .7;
    this.eve.desaturate = v * .7;
    this.motes.setColors(
      new THREE.Color(0xffe6a8).lerp(new THREE.Color(0x8a8a8a), v),
      new THREE.Color(0xaee2ff).lerp(new THREE.Color(0x6a6a72), v));
    for (const a of this.animals) a.setDesaturate(v * .8);
    this.engine.bloom.strength = lerp(.45, .2, v);
    this.sky.haze = lerp(.55, 1.3, v);
  }

  /* ═══════════ animals ═══════════ */

  addPair(key, pair) {
    this._pairs.set(key, pair);
    for (const a of pair) { this.animals.push(a); this.ground.object.add(a.object); }
    return pair;
  }
  getPair(key) { return this._pairs.get(key); }

  removeAnimal(a) {
    const i = this.animals.indexOf(a);
    if (i >= 0) this.animals.splice(i, 1);
    this.ground.object.remove(a.object);
    a.dispose();
  }

  clearAnimals() {
    for (const a of this.animals.slice()) this.removeAnimal(a);
    this._pairs.clear();
  }

  /* ═══════════ helpers for the camera ═══════════ */

  /** A world-space point, accounting for the ground's own transform. */
  at(x, y, z) {
    return new THREE.Vector3(x, y, z).add(this.ground.object.position);
  }

  dispose() {
    this._unsub?.();
    [this.void, this.sky, this.ocean, this.ground, this.grass, this.flowers, this.grove,
     this.treeOfKnowledge, this.motes, this.stars, this.birds, this.fish, this.embers,
     this.adam, this.eve, this.serpent, this.gate, this.glory, this.dust]
      .forEach(o => { try { o.dispose?.(); } catch {} });
    this.clearAnimals();
  }
}
