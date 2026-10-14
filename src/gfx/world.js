// Environment wrappers: the void, the sky, the waters, the ground of Eden,
// and the presence that walks in the garden at the breeze of the day.

import * as THREE from 'three';
import { makeMaterial, setU, getU, animate, hasShader } from '../core/materials.js';
import { clamp, lerp } from '../core/utils.js';

/* ═══════════════ the deep, before anything ═══════════════ */

export class Void {
  constructor({ radius = 900 } = {}) {
    this.material = makeMaterial('TOHU', {
      side: 'back', depthWrite: false, toneMapped: false,
      fallback: new THREE.MeshBasicMaterial({ color: 0x05060f, side: THREE.BackSide, depthWrite: false }),
    });
    animate(this.material);
    this.mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 48, 32), this.material);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = -100;
    this.object = this.mesh;
  }
  set chaos(v) { setU(this.material, 'uChaos', v); }
  set light(v) { setU(this.material, 'uLight', v); }
  set spirit(v) { setU(this.material, 'uSpirit', v); }
  dispose() { this.mesh.geometry.dispose(); this.material.dispose(); }
}

/* ═══════════════ the firmament ═══════════════ */

export class Sky {
  constructor({ radius = 1200 } = {}) {
    this.sunDir = new THREE.Vector3(.4, .55, .3).normalize();
    this.moonDir = new THREE.Vector3(-.4, .4, -.5).normalize();
    this.material = makeMaterial('FIRMAMENT', {
      side: 'back', depthWrite: false, toneMapped: false,
      uniforms: { uSunDir: this.sunDir.toArray(), uMoonDir: this.moonDir.toArray() },
      fallback: new THREE.MeshBasicMaterial({ color: 0x1b2a4a, side: THREE.BackSide, depthWrite: false }),
    });
    animate(this.material);
    this.mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 48, 32), this.material);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = -90;
    this.object = this.mesh;
    this._dayNight = 1;
  }

  /** 0 = deep night, 1 = full day. Also swings the sun around the sky. */
  set dayNight(v) {
    this._dayNight = clamp(v);
    setU(this.material, 'uDayNight', this._dayNight);
  }
  get dayNight() { return this._dayNight; }

  set stars(v) { setU(this.material, 'uStars', clamp(v)); }
  set haze(v) { setU(this.material, 'uHaze', v); }

  /** Drive the sun by an angle: 0 = horizon east, PI/2 = noon, PI = horizon west. */
  setSunAngle(a, tilt = .28) {
    this.sunDir.set(Math.cos(a), Math.sin(a), Math.sin(tilt) * .8).normalize();
    this.moonDir.copy(this.sunDir).negate();
    setU(this.material, 'uSunDir', this.sunDir);
    setU(this.material, 'uMoonDir', this.moonDir);
  }

  setColors({ top, horizon, night }) {
    if (top) setU(this.material, 'uTopColor', new THREE.Color(top));
    if (horizon) setU(this.material, 'uHorizonColor', new THREE.Color(horizon));
    if (night) setU(this.material, 'uNightColor', new THREE.Color(night));
  }

  /** Point the scene's key/hemisphere lights to agree with the sky. */
  applyToLights(lights, { keyIntensity = 2.2, ambient = .3 } = {}) {
    const d = this._dayNight;
    lights.key.position.copy(this.sunDir).multiplyScalar(60);
    lights.key.intensity = keyIntensity * d;
    lights.key.color.setHSL(lerp(.08, .12, d), lerp(.6, .25, d), lerp(.55, .96, d));
    lights.hemi.intensity = lerp(.12, ambient + .35, d);
    lights.hemi.color.setHex(d > .4 ? 0x9fc0ec : 0x2a3a66);
    lights.hemi.groundColor.setHex(0x3a2d1d);
    lights.amb.intensity = lerp(.16, .3, d);
    lights.rim.intensity = lerp(.55, .18, d);
  }

  dispose() { this.mesh.geometry.dispose(); this.material.dispose(); }
}

/* ═══════════════ the waters ═══════════════ */

export class Ocean {
  constructor({ size = 2000, segments = 160 } = {}) {
    const geo = new THREE.PlaneGeometry(size, size, segments, segments);
    geo.rotateX(-Math.PI / 2);
    this.material = makeMaterial('WATER', {
      uniforms: { uAmplitude: 0.5, uChoppiness: 1.0, uGlitter: 1.0 },
      fallback: new THREE.MeshStandardMaterial({ color: 0x0a2236, roughness: .15, metalness: .5 }),
    });
    animate(this.material);
    this.mesh = new THREE.Mesh(geo, this.material);
    this.mesh.frustumCulled = false;
    this.object = this.mesh;
  }
  set amplitude(v) { setU(this.material, 'uAmplitude', v); }
  set choppiness(v) { setU(this.material, 'uChoppiness', v); }
  set glitter(v) { setU(this.material, 'uGlitter', v); }
  setSun(dir) { setU(this.material, 'uSunDir', dir); }
  setColors(deep, shallow) {
    setU(this.material, 'uDeepColor', new THREE.Color(deep));
    setU(this.material, 'uShallowColor', new THREE.Color(shallow));
  }
  dispose() { this.mesh.geometry.dispose(); this.material.dispose(); }
}

/* ═══════════════ the ground of Eden ═══════════════ */

/** Everything inside this radius is perfectly flat, and the story stays inside it. */
export const FLAT_RADIUS = 86;

export class Ground {
  constructor({ size = 300, segments = 120 } = {}) {
    const geo = new THREE.PlaneGeometry(size, size, segments, segments);
    geo.rotateX(-Math.PI / 2);
    // A gentle swell far out, so the horizon never reads as a tabletop — but the
    // whole garden stays dead flat at y=0. Everything placed on it (grass, trees,
    // animals, people) sits at y=0, so any slope inside the play area would bury
    // them. The roll only starts well beyond where the story happens.
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i);
      const d = Math.hypot(x, z);
      const roll = Math.sin(x * .045) * Math.cos(z * .038) * 1.15
                 + Math.sin(x * .013 + 1.7) * Math.cos(z * .017) * 2.4;
      const dip = -Math.pow(clamp((d - 60) / 90), 2) * 7.0;
      p.setY(i, (roll + dip) * clamp((d - FLAT_RADIUS) / 38));
    }
    geo.computeVertexNormals();

    this.material = makeMaterial('EDEN_GROUND', {
      uniforms: { uBloom: 0, uDesaturate: 0 },
      fallback: new THREE.MeshStandardMaterial({ color: 0x3f5a28, roughness: .95 }),
    });
    animate(this.material);
    this.mesh = new THREE.Mesh(geo, this.material);
    this.mesh.receiveShadow = true;
    this.object = this.mesh;
  }
  set bloom(v) { setU(this.material, 'uBloom', clamp(v)); }
  set desaturate(v) { setU(this.material, 'uDesaturate', clamp(v)); }
  set lightLevel(v) { setU(this.material, 'uLightLevel', clamp(v)); }
  setLight(dir) { setU(this.material, 'uLightDir', dir); }
  setColors(grass, soil) {
    setU(this.material, 'uGrassColor', new THREE.Color(grass));
    setU(this.material, 'uSoilColor', new THREE.Color(soil));
  }
  dispose() { this.mesh.geometry.dispose(); this.material.dispose(); }
}

/* ═══════════════ the presence ═══════════════ */

/**
 * Never a figure. A column of light, a direction, a weight in the air.
 * Rendering God as a body would be both a theological and an artistic mistake.
 */
export class Glory {
  constructor({ height = 60, radius = 7, color = 0xfff0cf } = {}) {
    this.group = new THREE.Group();
    this.object = this.group;

    this.material = makeMaterial('GLORY', {
      transparent: true, depthWrite: false, toneMapped: false,
      blending: THREE.AdditiveBlending, side: 'double',
      uniforms: { uColor: new THREE.Color(color), uRays: 9 },
      fallback: new THREE.MeshBasicMaterial({
        color, transparent: true, opacity: .12,
        blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
      }),
    });
    animate(this.material);

    const geo = new THREE.CylinderGeometry(radius * .25, radius, height, 32, 8, true);
    geo.translate(0, height * .5 - 2, 0);
    this.column = new THREE.Mesh(geo, this.material);
    this.column.frustumCulled = false;
    this.group.add(this.column);

    this.light = new THREE.PointLight(color, 0, 90, 2);
    this.light.position.y = 6;
    this.group.add(this.light);

    this._intensity = 0;
    this.intensity = 0;
  }

  set intensity(v) {
    this._intensity = clamp(v);
    setU(this.material, 'uIntensity', this._intensity);
    if ('opacity' in this.material) this.material.opacity = this._intensity * .2;
    this.light.intensity = this._intensity * 26;
    this.group.visible = this._intensity > 0.001;
  }
  get intensity() { return this._intensity; }

  moveTo(x, z) { this.group.position.set(x, 0, z); }
  dispose() { this.column.geometry.dispose(); this.material.dispose(); }
}

/* ═══════════════ rivers ═══════════════ */

/** The four rivers of Eden, as simple glowing ribbons on the ground. */
export function makeRivers({ count = 4, radius = 90, color = 0x6fd4e8 } = {}) {
  const g = new THREE.Group();
  const mat = new THREE.MeshBasicMaterial({
    color, transparent: true, opacity: .13, blending: THREE.AdditiveBlending, depthWrite: false,
  });
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2 + .4;
    const pts = [];
    for (let s = 0; s <= 24; s++) {
      const t = s / 24;
      const r = lerp(5, radius, t);
      const wobble = Math.sin(t * 7 + i * 2.3) * lerp(0, 9, t);
      pts.push(new THREE.Vector3(
        Math.cos(a) * r - Math.sin(a) * wobble,
        .06 + t * .02,
        Math.sin(a) * r + Math.cos(a) * wobble));
    }
    const curve = new THREE.CatmullRomCurve3(pts);
    const geo = new THREE.TubeGeometry(curve, 48, .85, 5, false);
    // flatten the tube into a ribbon lying on the ground
    const p = geo.attributes.position;
    for (let v = 0; v < p.count; v++) p.setY(v, Math.max(.05, p.getY(v) * .12));
    geo.computeVertexNormals();
    g.add(new THREE.Mesh(geo, mat));
  }
  g.userData.material = mat;
  return g;
}
