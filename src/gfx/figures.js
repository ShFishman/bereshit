// The people, the serpent, and the keruvim.
// The humans are deliberately not realistic — they are beings of lit clay.
// Abstraction keeps them out of the uncanny valley and lets light carry the acting.

import * as THREE from 'three';
import { makeRng, clamp, lerp, ease, clock, isMobile } from '../core/utils.js';

/* ═══════════════ material: lit clay ═══════════════ */

const FLESH_VERT = `
varying vec3 vNormal;
varying vec3 vView;
varying vec3 vLocal;
void main(){
  vLocal = position;
  vNormal = normalize(normalMatrix * normal);
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vView = -mv.xyz;
  gl_Position = projectionMatrix * mv;
}`;

const FLESH_FRAG = `
uniform vec3 uColor;
uniform vec3 uDeep;
uniform vec3 uRimColor;
uniform vec3 uLightDir;
uniform float uGlow;
uniform float uRim;
uniform float uDesaturate;
uniform float uOpacity;
uniform float uTime;
uniform float uLight;
varying vec3 vNormal;
varying vec3 vView;
varying vec3 vLocal;
void main(){
  vec3 n = normalize(vNormal);
  vec3 v = normalize(vView);
  vec3 l = normalize(uLightDir);

  // wrapped diffuse — clay catches light softly all the way round
  float wrap = dot(n, l) * 0.5 + 0.5;
  float diff = pow(clamp(wrap, 0.0, 1.0), 1.35);

  // fake subsurface: thin parts glow from behind
  float back = pow(clamp(dot(-n, l) * 0.5 + 0.5, 0.0, 1.0), 3.0);

  float fres = pow(1.0 - clamp(dot(n, v), 0.0, 1.0), 2.4);

  vec3 base = mix(uDeep, uColor, diff);
  base += uDeep * back * 0.55;
  base *= mix(vec3(0.17, 0.20, 0.32), vec3(1.0), clamp(uLight, 0.0, 1.0));
  base += uRimColor * fres * uRim;

  // an inner light that breathes
  float pulse = 0.82 + 0.18 * sin(uTime * 1.25 + vLocal.y * 1.6);
  base += uColor * uGlow * pulse;

  float g = dot(base, vec3(0.299, 0.587, 0.114));
  base = mix(base, vec3(g), uDesaturate);

  gl_FragColor = vec4(base, uOpacity);
}`;

export function fleshMaterial({
  color = 0xd9a271, deep = 0x5e2f22, rimColor = 0xffd9a0,
  glow = 0, rim = 0.75, lightDir = [.4, .9, .35],
} = {}) {
  return new THREE.ShaderMaterial({
    vertexShader: FLESH_VERT, fragmentShader: FLESH_FRAG,
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uDeep: { value: new THREE.Color(deep) },
      uRimColor: { value: new THREE.Color(rimColor) },
      uLightDir: { value: new THREE.Vector3(...lightDir).normalize() },
      uGlow: { value: glow }, uRim: { value: rim }, uLight: { value: 1 },
      uDesaturate: { value: 0 }, uOpacity: { value: 1 }, uTime: { value: 0 },
    },
    transparent: true,
  });
}

/* ═══════════════ the human figure ═══════════════ */

const cap = (r, len, seg = 8) => {
  const g = new THREE.CapsuleGeometry(r, Math.max(len, .001), 3, isMobile() ? 6 : seg);
  g.translate(0, -len / 2, 0);
  return g;
};

/**
 * Bone convention: every limb group sits at its joint and its mesh hangs
 * along −Y, so a rotation of zero is a figure standing at rest.
 */
export class Figure {
  constructor({
    scale = 1, female = false, seed = 1,
    color = 0xd9a271, deep = 0x5e2f22, rimColor = 0xffd9a0,
  } = {}) {
    const rng = makeRng(seed);
    this.material = fleshMaterial({ color, deep, rimColor });
    this.root = new THREE.Group();
    this.object = this.root;
    this.bones = {};
    this._t = rng() * 10;
    this._breath = 1;

    const M = this.material;
    const mesh = (geo, parent, pos = [0, 0, 0]) => {
      const m = new THREE.Mesh(geo, M);
      m.position.set(...pos);
      m.castShadow = true; m.receiveShadow = true;
      parent.add(m);
      return m;
    };
    const bone = (name, parent, pos) => {
      const g = new THREE.Group();
      g.position.set(...pos);
      parent.add(g);
      this.bones[name] = g;
      g.userData.rest = new THREE.Euler(0, 0, 0);
      return g;
    };

    const f = female ? 1 : 0;
    const shoulderW = lerp(.21, .17, f);
    const hipW = lerp(.115, .13, f);
    const chestR = lerp(.175, .155, f);

    // pelvis → spine
    const pelvis = bone('pelvis', this.root, [0, 1.0, 0]);
    mesh(new THREE.SphereGeometry(lerp(.145, .155, f), 12, 10).scale(1.25, .85, .9), pelvis);

    const spine = bone('spine', pelvis, [0, 0, 0]);
    const chest = bone('chest', spine, [0, .3, 0]);
    const torso = mesh(cap(chestR, .34), chest, [0, .3, 0]);
    torso.scale.set(1.3, 1, .82);

    const neck = bone('neck', chest, [0, .34, 0]);
    mesh(cap(.052, .09), neck, [0, .09, 0]);
    const head = bone('head', neck, [0, .1, 0]);
    const skull = mesh(new THREE.SphereGeometry(.125, 16, 14), head, [0, .12, 0]);
    skull.scale.set(.88, 1.08, .95);
    // no face — the light does the acting
    if (female) {
      const hair = mesh(new THREE.SphereGeometry(.142, 14, 12), head, [0, .14, -.02]);
      hair.scale.set(.92, 1.0, 1.0);
      hair.material = M;
    }

    // arms
    for (const s of [-1, 1]) {
      const side = s < 0 ? 'L' : 'R';
      const sh = bone('shoulder' + side, chest, [s * shoulderW, .3, 0]);
      mesh(new THREE.SphereGeometry(.062, 10, 8), sh);
      const up = bone('upperArm' + side, sh, [0, 0, 0]);
      mesh(cap(lerp(.054, .046, f), .26), up);
      const fore = bone('forearm' + side, up, [0, -.3, 0]);
      mesh(cap(lerp(.044, .038, f), .24), fore);
      const hand = bone('hand' + side, fore, [0, -.27, 0]);
      const h = mesh(new THREE.SphereGeometry(.052, 8, 8), hand, [0, -.03, 0]);
      h.scale.set(.75, 1.2, .5);
    }

    // legs
    for (const s of [-1, 1]) {
      const side = s < 0 ? 'L' : 'R';
      const hip = bone('hip' + side, pelvis, [s * hipW, -.08, 0]);
      const thigh = bone('thigh' + side, hip, [0, 0, 0]);
      mesh(cap(lerp(.078, .082, f), .36), thigh);
      const shin = bone('shin' + side, thigh, [0, -.42, 0]);
      mesh(cap(lerp(.058, .055, f), .34), shin);
      const foot = bone('foot' + side, shin, [0, -.4, 0]);
      const ft = mesh(new THREE.SphereGeometry(.07, 8, 6), foot, [0, -.02, .05]);
      ft.scale.set(.8, .5, 1.7);
    }

    this.root.scale.setScalar(scale);
    this._targets = {};
    this._current = {};
    for (const k in this.bones) {
      this._targets[k] = new THREE.Euler(0, 0, 0);
      this._current[k] = new THREE.Euler(0, 0, 0);
    }
    this.pose(POSES.rest, 0);
    this.idleAmount = 1;
    this.walkPhase = 0;
    this.walkSpeed = 0;
  }

  /* ── posing ── */

  /** Set a target pose; `blend` 0 snaps instantly, otherwise it eases over time. */
  pose(p, blend = 1) {
    for (const k in this._targets) {
      const v = p[k] || [0, 0, 0];
      this._targets[k].set(v[0], v[1], v[2]);
      if (blend === 0) {
        this._current[k].copy(this._targets[k]);
        this.bones[k].rotation.copy(this._targets[k]);
      }
    }
    this._blendRate = blend <= 0 ? 1 : blend;
  }

  async poseTo(p, dur = 1.2, easing = ease.inOutCubic) {
    const from = {};
    for (const k in this._current) from[k] = this._current[k].clone();
    const to = {};
    for (const k in this._current) { const v = p[k] || [0, 0, 0]; to[k] = new THREE.Euler(v[0], v[1], v[2]); }
    await clock.to(dur, e => {
      for (const k in this._current) {
        this._current[k].set(
          lerp(from[k].x, to[k].x, e),
          lerp(from[k].y, to[k].y, e),
          lerp(from[k].z, to[k].z, e));
        this._targets[k].copy(this._current[k]);
      }
    }, easing);
  }

  update(dt) {
    this._t += dt;
    this.material.uniforms.uTime.value = this._t;

    // ease toward the target pose
    const k = 1 - Math.pow(.015, dt);
    for (const name in this.bones) {
      const c = this._current[name], t = this._targets[name];
      c.x = lerp(c.x, t.x, k); c.y = lerp(c.y, t.y, k); c.z = lerp(c.z, t.z, k);
      this.bones[name].rotation.copy(c);
    }

    // breath and sway, layered on top of the pose
    const idle = this.idleAmount;
    if (idle > 0.001) {
      const b = Math.sin(this._t * 1.05);
      this._breath = 1 + b * .022 * idle;
      this.bones.chest.scale.set(this._breath, 1 + b * .012 * idle, this._breath);
      this.bones.spine.rotation.z += Math.sin(this._t * .47) * .022 * idle;
      this.bones.spine.rotation.x += Math.sin(this._t * .33) * .018 * idle;
      this.bones.head.rotation.y += Math.sin(this._t * .29) * .07 * idle;
      this.bones.head.rotation.x += Math.sin(this._t * .41) * .035 * idle;
    }

    // walking, when driven
    if (this.walkSpeed > .001) {
      this.walkPhase += dt * this.walkSpeed * 5.5;
      const w = this.walkPhase;
      const amp = clamp(this.walkSpeed, 0, 1);
      this.bones.thighL.rotation.x += Math.sin(w) * .55 * amp;
      this.bones.thighR.rotation.x += Math.sin(w + Math.PI) * .55 * amp;
      this.bones.shinL.rotation.x += Math.max(0, -Math.sin(w - .6)) * .7 * amp;
      this.bones.shinR.rotation.x += Math.max(0, -Math.sin(w + Math.PI - .6)) * .7 * amp;
      this.bones.upperArmL.rotation.x += Math.sin(w + Math.PI) * .38 * amp;
      this.bones.upperArmR.rotation.x += Math.sin(w) * .38 * amp;
      this.root.position.y = Math.abs(Math.sin(w)) * .03 * amp;
    }
  }

  /* ── expressive dials ── */
  set glow(v) { this.material.uniforms.uGlow.value = v; }
  get glow() { return this.material.uniforms.uGlow.value; }
  set rim(v) { this.material.uniforms.uRim.value = v; }
  set desaturate(v) { this.material.uniforms.uDesaturate.value = clamp(v); }
  set lightLevel(v) { this.material.uniforms.uLight.value = clamp(v); }
  set opacity(v) { this.material.uniforms.uOpacity.value = clamp(v); }
  get opacity() { return this.material.uniforms.uOpacity.value; }
  setLight(dir) { this.material.uniforms.uLightDir.value.copy(dir).normalize(); }
  set visible(v) { this.root.visible = v; }

  dispose() {
    this.root.traverse(o => o.geometry?.dispose?.());
    this.material.dispose();
  }
}

/* ═══════════════ poses ═══════════════ */

const R = Math.PI / 180;
export const POSES = {
  rest: {
    upperArmL: [0, 0, .13], upperArmR: [0, 0, -.13],
    forearmL: [-.12, 0, .06], forearmR: [-.12, 0, -.06],
  },
  // formed from dust, not yet alive — hanging, unweighted
  unformed: {
    spine: [.22, 0, 0], chest: [.1, 0, 0], neck: [.42, 0, 0], head: [.25, 0, 0],
    upperArmL: [.3, 0, .35], upperArmR: [.3, 0, -.35],
    forearmL: [-.6, 0, .2], forearmR: [-.6, 0, -.2],
    thighL: [-.1, 0, .06], thighR: [-.1, 0, -.06],
    shinL: [-.3, 0, 0], shinR: [-.3, 0, 0],
  },
  // the first breath
  awaken: {
    spine: [-.18, 0, 0], chest: [-.12, 0, 0], neck: [-.3, 0, 0], head: [-.35, 0, 0],
    upperArmL: [-.5, 0, .55], upperArmR: [-.5, 0, -.55],
    forearmL: [-.3, 0, .2], forearmR: [-.3, 0, -.2],
  },
  wonder: {
    spine: [-.08, 0, 0], neck: [-.22, 0, 0], head: [-.25, 0, 0],
    upperArmL: [-.9, 0, .5], upperArmR: [-.9, 0, -.5],
    forearmL: [-.5, 0, .25], forearmR: [-.5, 0, -.25],
  },
  reach: {
    spine: [-.05, 0, 0], chest: [0, .18, 0],
    upperArmR: [-1.9, .25, -.3], forearmR: [-.2, 0, 0],
    upperArmL: [.1, 0, .16], forearmL: [-.2, 0, .08],
    head: [-.18, .12, 0],
  },
  reachLeft: {
    spine: [-.05, 0, 0], chest: [0, -.18, 0],
    upperArmL: [-1.9, -.25, .3], forearmL: [-.2, 0, 0],
    upperArmR: [.1, 0, -.16], forearmR: [-.2, 0, -.08],
    head: [-.18, -.12, 0],
  },
  offer: {
    spine: [-.02, 0, 0],
    upperArmR: [-1.25, .3, -.22], forearmR: [-.35, 0, -.1],
    upperArmL: [-1.1, -.2, .3], forearmL: [-.45, 0, .12],
    head: [.06, .1, 0],
  },
  lonely: {
    spine: [.16, 0, 0], chest: [.1, 0, 0], neck: [.2, 0, 0], head: [.3, 0, 0],
    upperArmL: [.08, 0, .06], upperArmR: [.08, 0, -.06],
    forearmL: [-.3, 0, .1], forearmR: [-.3, 0, -.1],
  },
  // arms crossed over the body — the first shame
  cover: {
    spine: [.3, 0, 0], chest: [.22, 0, 0], neck: [.34, 0, 0], head: [.42, .1, 0],
    upperArmL: [-.5, .5, .9], forearmL: [-1.5, 0, -.5],
    upperArmR: [-.45, -.45, -.85], forearmR: [-1.6, 0, .5],
    thighL: [.08, 0, .1], thighR: [.08, 0, -.1],
  },
  hide: {
    pelvis: [.0, 0, 0], spine: [.75, 0, 0], chest: [.4, 0, 0], neck: [.3, 0, 0], head: [.4, 0, 0],
    thighL: [-1.5, 0, .2], thighR: [-1.5, 0, -.2],
    shinL: [-1.7, 0, 0], shinR: [-1.7, 0, 0],
    upperArmL: [-1.1, .3, .7], forearmL: [-1.9, 0, 0],
    upperArmR: [-1.1, -.3, -.7], forearmR: [-1.9, 0, 0],
  },
  kneel: {
    spine: [.35, 0, 0], chest: [.2, 0, 0], neck: [.25, 0, 0], head: [.35, 0, 0],
    thighL: [-1.75, 0, .12], thighR: [-1.75, 0, -.12],
    shinL: [-1.85, 0, 0], shinR: [-1.85, 0, 0],
    upperArmL: [.3, 0, .2], upperArmR: [.3, 0, -.2],
    forearmL: [-.7, 0, .1], forearmR: [-.7, 0, -.1],
  },
  judged: {
    spine: [.28, 0, 0], neck: [.5, 0, 0], head: [.55, 0, 0],
    upperArmL: [.25, 0, .1], upperArmR: [.25, 0, -.1],
    forearmL: [-.2, 0, .05], forearmR: [-.2, 0, -.05],
  },
  pointAway: {
    chest: [0, .3, 0], spine: [.1, 0, 0],
    upperArmR: [-1.4, .9, -.1], forearmR: [-.1, 0, 0],
    upperArmL: [.1, 0, .14], forearmL: [-.2, 0, .06],
    head: [.2, -.3, 0],
  },
  walkOut: {
    spine: [.12, 0, 0], chest: [.06, 0, 0], neck: [.16, 0, 0], head: [.22, 0, 0],
    upperArmL: [0, 0, .1], upperArmR: [0, 0, -.1],
    forearmL: [-.25, 0, .06], forearmR: [-.25, 0, -.06],
  },
};

/* ═══════════════ the serpent ═══════════════ */

const SNAKE_FRAG_EXTRA = `
  // iridescence: the sheen of something beautiful you should not trust
  float ir = sin(vLocal.y * 9.0 + uTime * 1.2) * 0.5 + 0.5;
  base += mix(vec3(0.1,0.35,0.2), vec3(0.45,0.15,0.4), ir) * fres * 0.9;
`;

export class Serpent {
  constructor({ length = 10, radius = .17, seed = 3 } = {}) {
    this.group = new THREE.Group();
    this.object = this.group;
    this._t = 0;
    this.coil = 1;        // 1 = wound round the tree, 0 = stretched toward you
    this.tension = 0;     // rises as it closes

    this.material = fleshMaterial({ color: 0x2f6b43, deep: 0x0d2417, rimColor: 0x8affcf, rim: 1.4 });
    this.material.fragmentShader = this.material.fragmentShader.replace(
      '  float g = dot(base', SNAKE_FRAG_EXTRA + '  float g = dot(base');
    this.material.needsUpdate = true;

    this.segments = 64;
    this.radius = radius;
    this.length = length;
    this.curve = new THREE.CatmullRomCurve3(this._controlPoints(1));
    this.geometry = new THREE.TubeGeometry(this.curve, this.segments, radius, isMobile() ? 6 : 10, false);
    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.castShadow = true;
    this.group.add(this.mesh);

    // head
    this.head = new THREE.Group();
    const skull = new THREE.Mesh(new THREE.SphereGeometry(radius * 1.5, 12, 10), this.material);
    skull.scale.set(.85, .7, 1.5);
    this.head.add(skull);
    const eyeGeo = new THREE.SphereGeometry(radius * .3, 8, 8);
    this.eyeMat = new THREE.MeshBasicMaterial({ color: 0xffc83c });
    for (const s of [-1, 1]) {
      const e = new THREE.Mesh(eyeGeo, this.eyeMat);
      e.position.set(s * radius * .55, radius * .35, radius * .9);
      this.head.add(e);
    }
    const tongue = new THREE.Mesh(new THREE.ConeGeometry(radius * .1, radius * 1.4, 4), new THREE.MeshBasicMaterial({ color: 0xff3b5c }));
    tongue.rotation.x = Math.PI / 2;
    tongue.position.set(0, 0, radius * 2.1);
    this.tongue = tongue;
    this.head.add(tongue);
    this.group.add(this.head);

    this._seed = makeRng(seed);
  }

  _controlPoints(coil) {
    // coil=1 wraps the trunk; coil=0 reaches out along +Z toward the listener
    const pts = [];
    const N = 9;
    for (let i = 0; i < N; i++) {
      const u = i / (N - 1);
      const wrapAngle = u * Math.PI * 3.1;
      const r = lerp(.95, .62, u);
      const coiled = new THREE.Vector3(
        Math.cos(wrapAngle) * r,
        lerp(.45, 3.1, u),
        Math.sin(wrapAngle) * r);
      const reaching = new THREE.Vector3(
        Math.sin(u * 3.4) * .55,
        lerp(.5, 2.35, Math.pow(u, .75)),
        lerp(.6, 2.9, u));
      pts.push(coiled.lerp(reaching, 1 - coil));
    }
    return pts;
  }

  update(dt) {
    this._t += dt;
    const pts = this._controlPoints(this.coil);
    // a slow living undulation along the body
    for (let i = 0; i < pts.length; i++) {
      const u = i / (pts.length - 1);
      const amp = .14 * (1 - this.coil * .6) + this.tension * .06;
      pts[i].x += Math.sin(this._t * 1.6 - u * 5.2) * amp * u;
      pts[i].y += Math.sin(this._t * 1.1 - u * 3.4) * amp * .4 * u;
      pts[i].z += Math.cos(this._t * 1.4 - u * 4.8) * amp * u * .7;
    }
    this.curve.points = pts;

    const old = this.geometry;
    this.geometry = new THREE.TubeGeometry(this.curve, this.segments, this.radius, isMobile() ? 6 : 10, false);
    this.mesh.geometry = this.geometry;
    old.dispose();

    const headPos = this.curve.getPointAt(1);
    const tan = this.curve.getTangentAt(1);
    this.head.position.copy(headPos);
    this.head.lookAt(headPos.clone().add(tan));

    // the tongue flickers, never on a beat you can predict
    const flick = Math.sin(this._t * 3.1) * Math.sin(this._t * 1.37) * Math.sin(this._t * 0.71);
    this.tongue.scale.z = .3 + Math.max(0, flick) * 2.4;
    this.eyeMat.color.setHSL(.12, 1, .55 + this.tension * .25);
  }

  set opacity(v) { this.material.uniforms.uOpacity.value = clamp(v); }
  dispose() { this.geometry.dispose(); this.material.dispose(); this.eyeMat.dispose(); }
}

/* ═══════════════ the keruvim and the turning sword ═══════════════ */

export class GateOfEden {
  constructor({ makeMaterialFn = null } = {}) {
    this.group = new THREE.Group();
    this.object = this.group;
    this._t = 0;
    this._int = 0;

    const stone = new THREE.MeshStandardMaterial({
      color: 0x14110f, roughness: .96, metalness: 0, flatShading: true,
      emissive: 0x3a1206, emissiveIntensity: 0,
    });
    this.stone = stone;

    /* ── a trilithon, so the shape reads as a gate from any distance ── */
    const PILL_H = 13, GAP = 5.2;
    for (const s of [-1, 1]) {
      const pillar = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 2.0, PILL_H, 7), stone);
      pillar.position.set(s * (GAP + 1.4), PILL_H / 2, 0);
      pillar.castShadow = true;
      this.group.add(pillar);
      const cap = new THREE.Mesh(new THREE.BoxGeometry(4.4, 1.0, 4.4), stone);
      cap.position.set(s * (GAP + 1.4), PILL_H + .4, 0);
      this.group.add(cap);
    }
    const lintel = new THREE.Mesh(new THREE.BoxGeometry(GAP * 2 + 9.2, 2.0, 4.0), stone);
    lintel.position.set(0, PILL_H + 1.8, 0);
    lintel.castShadow = true;
    this.group.add(lintel);

    /* ── the keruvim: dark forms, edges lit from the blade between them ── */
    const keruvMat = new THREE.MeshStandardMaterial({
      color: 0x0d0b0a, roughness: .7, metalness: .25, flatShading: true,
      emissive: 0xff7a28, emissiveIntensity: 0,
    });
    this.keruvMat = keruvMat;
    const wingMat = new THREE.MeshBasicMaterial({
      color: 0xffe0b0, transparent: true, opacity: 0, side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    this.wingMat = wingMat;

    this.wings = [];
    this.bodies = [];
    for (const s of [-1, 1]) {
      const k = new THREE.Group();
      const body = new THREE.Mesh(new THREE.OctahedronGeometry(1.0, 1), keruvMat);
      body.scale.set(.5, 3.6, .5);
      body.castShadow = true;
      k.add(body);
      const headK = new THREE.Mesh(new THREE.OctahedronGeometry(.44, 0), keruvMat);
      headK.position.y = 3.5;
      k.add(headK);

      // three pairs of wings — "with twain he covered his face, and with twain he did fly"
      for (let w = 0; w < 3; w++) {
        for (const ws of [-1, 1]) {
          const len = 6.8 - w * 1.3;
          const geo = new THREE.PlaneGeometry(len, .2, 6, 1);
          // taper each wing to a point
          const p = geo.attributes.position;
          for (let i = 0; i < p.count; i++) {
            const t = clamp((p.getX(i) / len) + .5);   // pow() of a -1e-17 base is NaN
            p.setY(i, p.getY(i) * (1 - Math.pow(t, 1.6)) * 2.2);
          }
          geo.computeVertexNormals();
          geo.translate(len / 2, 0, 0);
          const wing = new THREE.Mesh(geo, wingMat);
          wing.scale.x = ws;
          wing.position.set(0, 2.6 - w * 1.9, 0);
          wing.userData = { phase: w * 1.05 + (ws > 0 ? .6 : 0), side: ws, tier: w };
          k.add(wing);
          this.wings.push(wing);
        }
      }
      k.position.set(s * (GAP + .4), 3.8, 2.4);
      k.rotation.y = s * .42;
      this.group.add(k);
      this.bodies.push(k);
    }

    /* ── לַהַט הַחֶרֶב הַמִּתְהַפֶּכֶת ── */
    const swordGeo = new THREE.PlaneGeometry(2.4, 10.5, 1, 32);
    this.swordMat = makeMaterialFn
      ? makeMaterialFn()
      : new THREE.MeshBasicMaterial({
          color: 0xff8a3c, transparent: true, opacity: 0, side: THREE.DoubleSide,
          blending: THREE.AdditiveBlending, depthWrite: false,
        });
    this.sword = new THREE.Group();
    for (let i = 0; i < 4; i++) {
      const blade = new THREE.Mesh(swordGeo, this.swordMat);
      blade.rotation.y = (i / 4) * Math.PI;
      this.sword.add(blade);
    }
    this.sword.position.set(0, 6.4, 0);
    this.group.add(this.sword);

    this.light = new THREE.PointLight(0xff6a22, 0, 70, 2);
    this.light.position.set(0, 6.4, 0);
    this.group.add(this.light);
    this.fill = new THREE.PointLight(0xff4a12, 0, 36, 2);
    this.fill.position.set(0, 1.6, 2.5);
    this.group.add(this.fill);

    this.intensity = 0;
  }

  set intensity(v) {
    this._int = clamp(v);
    const i = this._int;
    if (this.swordMat.uniforms?.uIntensity) this.swordMat.uniforms.uIntensity.value = i * 2.6;
    else if ('opacity' in this.swordMat) this.swordMat.opacity = i * .9;
    this.keruvMat.emissiveIntensity = i * 1.8;
    this.stone.emissiveIntensity = i * .28;
    this.wingMat.opacity = i * .055;
  }
  get intensity() { return this._int; }

  update(dt) {
    this._t += dt;
    const t = this._t;
    this.sword.rotation.y += dt * 2.1;
    this.sword.rotation.z = Math.sin(t * .8) * .14;
    this.sword.position.y = 6.4 + Math.sin(t * .6) * .3;
    if (this.swordMat.uniforms?.uTime) this.swordMat.uniforms.uTime.value = t;

    const flicker = 1 + Math.sin(t * 7.3) * .14 + Math.sin(t * 17.1) * .07;
    this.light.intensity = this._int * 26 * flicker;
    this.fill.intensity = this._int * 10 * flicker;

    for (const w of this.wings) {
      const { phase, side, tier } = w.userData;
      const beat = Math.sin(t * (.9 + tier * .12) + phase);
      w.rotation.z = beat * .26 - .12 + tier * .05;
      w.rotation.y = side * (.3 + beat * .14);
      w.scale.y = 1 + beat * .07;
    }
    for (const b of this.bodies) b.position.y = 3.8 + Math.sin(t * .5 + b.position.x) * .14;
  }

  dispose() {
    this.group.traverse(o => { o.geometry?.dispose?.(); });
    [this.stone, this.keruvMat, this.wingMat, this.swordMat].forEach(m => m?.dispose?.());
  }
}
