// "And God created the great sea-creatures, and every living thing that creeps,
// with which the waters swarmed, after their kind." — the fifth day.
//
// Same hand as fauna.js: a plain-data table of proportions, tiny primitive
// helpers, flat-shaded materials, a creature class with update(dt)/dispose().
// What is different is that fish have no legs — the whole body is the engine.
// Every creature here is built as a CHAIN of nested segments along its length,
// and update() runs a sine down that chain with a per-link phase lag, so the
// head leads and the tail follows a beat later. That travelling wave is the
// only reason these read as alive.
//
// Conventions:
//   • every creature faces +X (like the land animals), lies along the X axis,
//     is roughly centred on its own origin, and swims by yawing about Y
//     (fish) or pitching about Z (whales — flukes go up and down).
//   • bodies are smooth-shaded with vertex colours (dark back → flank → pale
//     belly); fins are flat-shaded, sharp and a different colour. No textures.
//   • nodes are NAMED, and userData is built afterwards by bind(). That lets a
//     Shoal clone one template (sharing geometry and materials) and re-bind
//     each copy, which three's own userData cloning would otherwise mangle.

import * as THREE from 'three';
import { makeRng, clamp, lerp, ease, isMobile } from '../core/utils.js';

const TAU = Math.PI * 2;

/* ═══════════════ the table ═══════════════ */

export const SEA_SPECIES = {
  // ── a round reef fish: deep gold disc, big fanned tail
  amnun: {
    type: 'fish', axis: 'y', scale: 1,
    len: .70, girth: .075, deep: 2.6, segs: 7,
    profile: [.30, .72, .95, 1, .86, .55, .22],
    height:  [.55, 1.10, 1.45, 1.40, 1.00, .52, .18],
    color: 0xf2a63a, dark: 0x8e3c10, belly: 0xffeccb, fin: 0xe4621c, finAlpha: .95,
    caudal: 'fan', caudalSpan: 1.25, caudalLen: 1.0,
    dorsal: 'sail', dorsalAt: [.24, .66], dorsalH: 1.0,
    anal: 'low', analAt: [.60, .84], analH: .55,
    pectoral: 'round', pectAt: .27, pelvic: true, gills: true,
    amp: .16, rate: 5.0, lag: .50, pectRate: 3.4, pectAmp: .34,
  },

  // ── a long slender one: olive torpedo, a whole-body ripple
  buri: {
    type: 'fish', axis: 'y', scale: 1,
    len: 1.00, girth: .058, deep: 1.55, segs: 8,
    profile: [.34, .90, 1, .96, .82, .55, .22],
    height:  [.50, 1.05, 1.10, 1.05, .90, .60, .22],
    color: 0x86a38c, dark: 0x27443f, belly: 0xeaf4ee, fin: 0x4d7a72, finAlpha: .9,
    caudal: 'fork', caudalSpan: .95, caudalLen: .85,
    dorsal: 'ridge', dorsalAt: [.34, .64], dorsalH: .52,
    anal: 'low', analAt: [.62, .82], analH: .40,
    pectoral: 'blade', pectAt: .24, pelvic: true, gills: true,
    amp: .21, rate: 4.4, lag: .62, pectRate: 2.6, pectAmp: .22,
  },

  // ── angelfish: tall, paper-thin, barred, trailing filaments.
  //    Barely undulates — it sculls with its pectorals and drifts.
  keruv: {
    type: 'fish', axis: 'y', scale: 1,
    len: .52, girth: .034, deep: 5.4, segs: 6,
    profile: [.40, .90, 1, .92, .70, .46, .18],
    height:  [.58, 1.22, 1.45, 1.30, .95, .50, .16],
    color: 0xf7f1dd, dark: 0x2b3047, belly: 0xfffdf5, fin: 0xf0c24a, finAlpha: .72,
    caudal: 'lance', caudalSpan: 1.05, caudalLen: 1.15,
    dorsal: 'filament', dorsalAt: [.18, .72], dorsalH: 1.35,
    anal: 'filament', analAt: [.42, .86], analH: 1.15,
    pectoral: 'round', pectAt: .30, pelvic: 'long', gills: false,
    bands: [.22, .48, .74], bandColor: 0x2b3047,
    amp: .065, rate: 2.8, lag: .40, pectRate: 5.2, pectAmp: .52,
  },

  // ── a spotted bottom-dweller: broad, flat, sandy, slow
  nimron: {
    type: 'fish', axis: 'y', scale: 1,
    len: .82, girth: .105, deep: .92, segs: 7,
    profile: [.42, .95, 1, .90, .68, .42, .16],
    height:  [.55, .85, .90, .85, .70, .45, .16],
    color: 0xc9a877, dark: 0x6b5131, belly: 0xf2e7c9, fin: 0x8f7447, finAlpha: .88,
    caudal: 'round', caudalSpan: .80, caudalLen: .70,
    dorsal: 'ridge', dorsalAt: [.26, .70], dorsalH: .42,
    anal: 'low', analAt: [.64, .84], analH: .30,
    pectoral: 'wide', pectAt: .26, pelvic: true, gills: true,
    spots: 16, spotColor: 0x3b2c18, spotRing: 0x2f7f86,
    amp: .13, rate: 3.0, lag: .55, pectRate: 2.1, pectAmp: .30,
  },

  // ── the fast silver schooler: a lit blue line down each flank
  kasif: {
    type: 'fish', axis: 'y', scale: 1,
    len: .44, girth: .040, deep: 1.95, segs: 6,
    profile: [.30, .85, 1, .92, .66, .34, .12],
    height:  [.45, .95, 1.05, .95, .70, .36, .12],
    color: 0xd3dceb, dark: 0x44567a, belly: 0xffffff, fin: 0x9ab2cf, finAlpha: .8,
    metal: .45,
    caudal: 'crescent', caudalSpan: .90, caudalLen: .80,
    dorsal: 'low', dorsalAt: [.36, .58], dorsalH: .38,
    anal: 'low', analAt: [.62, .80], analH: .30,
    pectoral: 'blade', pectAt: .25, pelvic: false, gills: true,
    stripe: { from: .16, to: .86, color: 0x7fe6ff, glow: 2.0 },
    amp: .12, rate: 8.0, lag: .70, pectRate: 3.0, pectAmp: .18,
  },

  // ── the great sea-creature. Pitches instead of yawing; flukes lie flat.
  livyatan: {
    type: 'fish', axis: 'z', scale: 1, whale: true,
    len: 6.0, girth: .62, deep: 1.30, segs: 8,
    profile: [.32, .86, 1, .97, .84, .56, .20],
    height:  [.48, .95, 1.06, 1.00, .84, .54, .19],
    color: 0x4e6577, dark: 0x202c3a, belly: 0xc9d6dc, fin: 0x2b3b49, finAlpha: 1,
    caudal: 'fluke', caudalSpan: 1.9, caudalLen: 1.05, flukeFlat: true,
    dorsal: 'low', dorsalAt: [.56, .74], dorsalH: .30,
    anal: null, pectoral: 'flipper', pectAt: .25, pelvic: false, gills: false,
    pleats: 6, blow: true,
    // a stiff body: the wave is only a third of a wavelength long, so the
    // bend lives in the peduncle and the flukes, the way a whale's does
    amp: .105, rate: 1.05, lag: .30, pectRate: .8, pectAmp: .16,
  },

  // ── the ray: wings flapped by a wave running out along the span
  trisanit: {
    type: 'ray', axis: 'y', scale: 1,
    len: 1.15, girth: .22, deep: .38, segs: 5,
    profile: [.40, .95, 1, .80, .46, .20, .10],
    height:  [.55, .95, 1, .80, .50, .24, .10],
    color: 0x4a5a6b, dark: 0x1e2731, belly: 0xeae2d2, fin: 0x36424f, finAlpha: 1,
    ribs: 6, span: 1.35, sweep: .62, chord: [1, .96, .82, .60, .34, .14],
    tailLinks: 7, tailLen: 1.55, spots: 12, spotColor: 0xbfe9ff,
    amp: .40, rate: 1.5, lag: .70, pectRate: 1, pectAmp: 0,
  },

  // ── the jellyfish: a bell that pulses and a skirt that always lags
  meduza: {
    type: 'jelly', axis: 'y', scale: 1,
    bell: .34, bellH: .40, arms: 4, armLinks: 3, tentacles: 10, tentLinks: 4,
    tentLen: 1.5, armLen: .62,
    color: 0xdcb6ff, dark: 0x6b4ea8, belly: 0xfff0ff, fin: 0xffd9f4, finAlpha: .42,
    glow: 0x9f7bff, rate: 1.25, amp: .30, len: .7, girth: .3, deep: 1,
    profile: [1], height: [1], segs: 1, lag: .5, pectRate: 1, pectAmp: 0,
  },
};

/* ═══════════════ small helpers ═══════════════ */

const lowEnd = () => { try { return isMobile(); } catch { return false; } };
const detailOf = d => clamp(typeof d === 'number' ? d : (d === 'low' ? .6 : lowEnd() ? .6 : 1), .4, 1);

/** Sample a plain-data profile array at t ∈ [0,1]. */
function sample(arr, t) {
  const n = arr.length;
  if (n < 2) return arr[0] ?? 1;
  const x = clamp(t) * (n - 1);
  const i = Math.min(n - 2, Math.floor(x));
  return lerp(arr[i], arr[i + 1], x - i);
}

function mat(color, {
  emissive = 0x000000, ei = .2, rough = .5, metal = .06, flat = true,
  side = null, opacity = 1, depthWrite = true,
} = {}) {
  const m = new THREE.MeshStandardMaterial({
    color, emissive, emissiveIntensity: ei, roughness: rough, metalness: metal, flatShading: flat,
  });
  if (side) m.side = side;
  if (opacity < 1) { m.transparent = true; m.opacity = opacity; m.depthWrite = depthWrite; }
  m.userData.baseOpacity = opacity;
  m.userData.baseEmissive = ei;
  m.userData.baseDepthWrite = m.depthWrite;
  return m;
}

function box(w, h, d, m) { return new THREE.Mesh(new THREE.BoxGeometry(Math.max(1e-4, w), Math.max(1e-4, h), Math.max(1e-4, d)), m); }
function sph(r, m, seg = 8) { return new THREE.Mesh(new THREE.SphereGeometry(Math.max(1e-4, r), seg, Math.max(4, seg - 2)), m); }
function cone(r, h, m, seg = 6) { return new THREE.Mesh(new THREE.ConeGeometry(Math.max(1e-4, r), Math.max(1e-4, h), seg), m); }
function cyl(r0, r1, h, m, seg = 6) { return new THREE.Mesh(new THREE.CylinderGeometry(Math.max(1e-4, r0), Math.max(1e-4, r1), Math.max(1e-4, h), seg), m); }

/**
 * A flat fin. `pts` is a 2D outline in the XY plane whose first point is the
 * root; the rest wind around it, so a triangle fan fills it. Flat, sharp,
 * two-sided and cheap: six vertices make a tail.
 */
function blade(pts, m) {
  const n = pts.length;
  const pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { pos[i * 3] = pts[i][0]; pos[i * 3 + 1] = pts[i][1]; pos[i * 3 + 2] = 0; }
  const idx = [];
  for (let i = 1; i < n - 1; i++) idx.push(0, i, i + 1);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return new THREE.Mesh(g, m);
}

/** A little flat disc (spots, eye highlights), normal +Z. */
function disc(r, m, seg = 7) {
  const pts = [[0, 0]];
  for (let i = 0; i <= seg; i++) { const a = (i / seg) * TAU; pts.push([Math.cos(a) * r, Math.sin(a) * r]); }
  return blade(pts, m);
}

/**
 * A length of body. `stations` are rings along -X: {x, r (half-width),
 * h (half-height), v (0..1 along the whole body)}. Vertex colours run from the
 * dark back over the flank to a pale belly, which is where most of the beauty
 * lives when you have no textures at all.
 */
function tube(stations, radial, pal, capFront, capBack) {
  const pos = [], col = [], idx = [];
  const c = new THREE.Color(), back = new THREE.Color(pal.dark), mid = new THREE.Color(pal.color), bel = new THREE.Color(pal.belly);

  const push = (x, y, z, up) => {
    pos.push(x, y, z);
    const t = clamp(up * .5 + .5);
    if (t > .5) c.copy(mid).lerp(back, (t - .5) * 2); else c.copy(bel).lerp(mid, t * 2);
    col.push(c.r, c.g, c.b);
  };

  for (const st of stations) {
    for (let j = 0; j < radial; j++) {
      const a = (j / radial) * TAU;
      push(st.x, Math.cos(a) * st.h, Math.sin(a) * st.r, Math.cos(a));
    }
  }
  for (let s = 0; s < stations.length - 1; s++) {
    for (let j = 0; j < radial; j++) {
      const a = s * radial + j, b = s * radial + (j + 1) % radial;
      idx.push(a, a + radial, b + radial, a, b + radial, b);
    }
  }
  if (capFront) {
    const ci = pos.length / 3;
    push(stations[0].x, 0, 0, .35);
    for (let j = 0; j < radial; j++) idx.push(ci, j, (j + 1) % radial);
  }
  if (capBack) {
    const base = (stations.length - 1) * radial;
    const ci = pos.length / 3;
    push(stations[stations.length - 1].x, 0, 0, .1);
    for (let j = 0; j < radial; j++) idx.push(ci, base + (j + 1) % radial, base + j);
  }

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/* ═══════════════ fin outlines (plain data in, points out) ═══════════════ */

function caudalPts(kind, span, len) {
  switch (kind) {
    case 'fork':
      return [[0, 0], [-len, span], [-len * .42, span * .06], [-len, -span]];
    case 'crescent':
      return [[0, 0], [-len * .55, span * .78], [-len * 1.15, span * 1.25],
              [-len * .30, span * .05], [-len * 1.15, -span * 1.25], [-len * .55, -span * .78]];
    case 'lance':
      return [[0, 0], [-len * .45, span * .72], [-len * 1.2, span * .18],
              [-len * 1.2, -span * .18], [-len * .45, -span * .72]];
    case 'fluke':
      return [[0, 0], [-len * .35, span * .62], [-len * .95, span * 1.0],
              [-len * .42, span * .10], [-len * .55, 0], [-len * .42, -span * .10],
              [-len * .95, -span * 1.0], [-len * .35, -span * .62]];
    case 'round': {
      // a paddle: root first, then the rim swept from top tip to bottom tip
      const p = [[0, 0]];
      for (let i = 0; i <= 6; i++) {
        const a = (.5 - i / 6) * Math.PI;
        p.push([-len * Math.cos(a), span * Math.sin(a)]);
      }
      return p;
    }
    default: { // 'fan' — a wide scalloped sweep
      const p = [[0, 0]];
      for (let i = 0; i <= 7; i++) {
        const a = (.5 - i / 7) * Math.PI * 1.05;
        const scallop = 1 - ((i % 2) ? .12 : 0);
        p.push([-len * Math.cos(a) * scallop * 1.1, span * Math.sin(a) * scallop]);
      }
      return p;
    }
  }
}

function dorsalPts(kind, len, h) {
  switch (kind) {
    case 'sail':
      return [[0, 0], [-len * .10, h * .82], [-len * .46, h], [-len * .92, h * .44], [-len, 0]];
    case 'filament':
      return [[0, 0], [-len * .08, h * .80], [-len * .42, h * 1.0], [-len * 1.45, h * .92],
              [-len * .86, h * .26], [-len, 0]];
    case 'ridge':
      return [[0, 0], [-len * .28, h], [-len * .72, h * .86], [-len, 0]];
    default:
      return [[0, 0], [-len * .30, h], [-len * .86, h * .30], [-len, 0]];
  }
}

function pectoralPts(kind, len, span) {
  switch (kind) {
    case 'wide':
      return [[0, 0], [-len * .18, span * 1.15], [-len * .72, span * 1.05], [-len * 1.05, span * .35], [-len, 0]];
    case 'blade':
      return [[0, 0], [-len * .40, span * .70], [-len * 1.15, span * .22], [-len * .9, 0]];
    case 'flipper':
      return [[0, 0], [-len * .12, span * .55], [-len * .62, span * 1.0], [-len * 1.05, span * .78], [-len * .95, span * .1]];
    default: // 'round'
      return [[0, 0], [-len * .28, span], [-len * .80, span * .80], [-len, span * .15]];
  }
}

/* ═══════════════ the fish builder ═══════════════ */

/**
 * Builds the geometry only, naming every animatable node. No userData is set
 * here, so the result survives THREE's clone() intact; bind() wakes it up.
 */
function rawFish(key, S, seed, detail, deco) {
  const rng = makeRng(seed);
  const g = new THREE.Group();
  g.name = `fish:${key}`;

  const radial = Math.max(5, Math.round(12 * detail));
  const sub = detail > .85 ? 2 : 1;
  const segs = Math.max(3, Math.round(S.segs * detail));
  const L = S.len, segLen = L / segs, noseX = L * .45;

  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0xffffff, vertexColors: true, roughness: .40,
    metalness: S.metal ?? .14, flatShading: false,
    emissive: new THREE.Color(S.glow || 0x000000), emissiveIntensity: S.glow ? .3 : 0,
  });
  bodyMat.userData.baseOpacity = 1;
  bodyMat.userData.baseEmissive = bodyMat.emissiveIntensity;
  bodyMat.userData.baseDepthWrite = true;
  const finMat = mat(S.fin, { rough: .52, metal: .05, side: THREE.DoubleSide, opacity: S.finAlpha ?? 1 });
  // built on demand, so a low-detail fish never owns a material nothing uses
  let _dark = null;
  const darkMat = () => (_dark || (_dark = mat(S.dark, { rough: .6, side: THREE.DoubleSide })));
  const pal = { color: S.color, dark: S.dark, belly: S.belly };

  const halfW = t => Math.max(1e-3, S.girth * sample(S.profile, t));
  const halfH = t => Math.max(1e-3, S.girth * S.deep * sample(S.height, t));

  // where on which segment does a point at body-fraction t sit?
  const localAt = t => {
    const tc = clamp(t, 0, .999);
    const k = Math.min(segs - 1, Math.floor(tc * segs));
    return { k, x: -(tc * L - k * segLen), r: halfW(tc), h: halfH(tc) };
  };

  // ── the spine: nested segments, each hanging off the back of the last
  const segNodes = [];
  let parent = g;
  for (let i = 0; i < segs; i++) {
    const stations = [];
    for (let s = 0; s <= sub; s++) {
      const t = (i + s / sub) / segs;
      stations.push({ x: -(s / sub) * segLen, r: halfW(t), h: halfH(t) });
    }
    const m = new THREE.Mesh(tube(stations, radial, pal, i === 0, i === segs - 1), bodyMat);
    m.name = `seg:${i}`;
    m.position.x = i === 0 ? noseX : -segLen;
    parent.add(m);
    parent = m;
    segNodes.push(m);
  }
  const tailNode = segNodes[segs - 1];

  // ── caudal fin: the thing that actually pushes
  const caudal = new THREE.Group();
  caudal.name = 'fin:caudal';
  caudal.position.x = -segLen;
  const cSpan = S.girth * S.deep * (S.caudalSpan ?? 1), cLen = L * .26 * (S.caudalLen ?? 1);
  const cFin = blade(caudalPts(S.caudal, Math.max(1e-3, cSpan), Math.max(1e-3, cLen)), finMat);
  if (S.flukeFlat) cFin.rotation.x = Math.PI / 2;   // whale flukes lie flat
  caudal.add(cFin);
  tailNode.add(caudal);

  // ── dorsal + anal, each sliced per segment so they ripple with the body
  const addRidge = (name, kind, range, height, sign) => {
    if (!kind || !range) return;
    const [t0, t1] = range;
    const steps = Math.max(2, Math.round(4 * detail));
    for (let i = 0; i < steps; i++) {
      const t = lerp(t0, t1, i / steps);
      const tn = lerp(t0, t1, (i + 1) / steps);
      const a = localAt(t);
      const h = Math.max(1e-3, S.girth * S.deep * height * (.55 + .45 * Math.sin(Math.PI * clamp((i + .5) / steps))));
      const pivot = new THREE.Group();
      pivot.name = `${name}:${i}`;
      pivot.position.set(a.x, sign * a.h * .92, 0);
      const seg = blade(dorsalPts(kind, Math.max(1e-3, (tn - t) * L * 1.05), h * sign), finMat);
      pivot.add(seg);
      segNodes[a.k].add(pivot);
    }
  };
  addRidge('fin:dorsal', S.dorsal, S.dorsalAt, S.dorsalH ?? .5, 1);
  addRidge('fin:anal', S.anal, S.analAt, S.analH ?? .4, -1);

  // ── pectorals: pivots out at the flanks, sculling about X
  if (S.pectoral) {
    const a = localAt(S.pectAt ?? .26);
    const pl = L * .20, ps = S.girth * (S.pectoral === 'flipper' ? 3.4 : 2.1);
    for (const side of [1, -1]) {
      const pivot = new THREE.Group();
      pivot.name = side > 0 ? 'fin:pectR' : 'fin:pectL';
      pivot.position.set(a.x, -a.h * .22, side * a.r * .92);
      pivot.rotation.set(side * Math.PI * .5, 0, side * -.28);
      pivot.add(blade(pectoralPts(S.pectoral, Math.max(1e-3, pl), Math.max(1e-3, ps)), finMat));
      segNodes[a.k].add(pivot);
    }
  }

  // ── pelvics
  if (S.pelvic && deco) {
    const a = localAt(.40);
    const pl = L * (S.pelvic === 'long' ? .34 : .13);
    for (const side of [1, -1]) {
      const pivot = new THREE.Group();
      pivot.name = side > 0 ? 'fin:pelvR' : 'fin:pelvL';
      pivot.position.set(a.x, -a.h * .88, side * a.r * .35);
      pivot.rotation.set(side * .5, 0, -.9);
      pivot.add(blade(pectoralPts('blade', Math.max(1e-3, pl), Math.max(1e-3, S.girth * 1.1)), finMat));
      segNodes[a.k].add(pivot);
    }
  }

  // ── the face
  const eye = localAt(.085);
  const pupMat = mat(0x0b0d12, { emissive: 0x101826, ei: .5, rough: .12, flat: false });
  const eyeMat = deco ? mat(0xf7f3e4, { emissive: 0xfff3cc, ei: .35, rough: .18, metal: .1, flat: false }) : pupMat;
  for (const side of [1, -1]) {
    const e = sph(Math.max(1e-3, eye.h * .17), eyeMat, 7);
    e.position.set(eye.x, eye.h * .34, side * eye.r * .78);
    segNodes[eye.k].add(e);
    if (!deco) continue;
    const p = sph(Math.max(1e-3, eye.h * .095), pupMat, 6);
    p.position.set(eye.x + eye.h * .04, eye.h * .34, side * eye.r * .88);
    segNodes[eye.k].add(p);
  }
  if (deco) {
    // mouth — a dark wedge; gives the head somewhere to end
    const mouth = localAt(.022);
    const mm = box(L * .05, Math.max(1e-3, mouth.h * .22), Math.max(1e-3, mouth.r * 1.25), darkMat());
    mm.position.set(mouth.x - L * .012, -mouth.h * .30, 0);
    mm.rotation.z = -.18;
    segNodes[mouth.k].add(mm);
  }

  if (S.gills && deco) {
    const a = localAt(.20);
    for (const side of [1, -1]) {
      const gill = blade([[0, 0], [-L * .035, a.h * .42], [-L * .055, -a.h * .12], [0, -a.h * .34]], darkMat());
      gill.position.set(a.x, 0, side * a.r * 1.01);
      gill.rotation.y = side * Math.PI * .5;
      segNodes[a.k].add(gill);
    }
  }

  // ── markings
  if (S.bands) {
    const bandMat = mat(S.bandColor ?? S.dark, { rough: .55, side: THREE.DoubleSide });
    for (const t of S.bands) {
      const a = localAt(t);
      for (const side of [1, -1]) {
        const b = blade([[L * .035, a.h * .98], [-L * .035, a.h * .98], [-L * .030, -a.h * .98], [L * .030, -a.h * .98]], bandMat);
        b.position.set(a.x, 0, side * a.r * 1.02);
        b.rotation.y = side * Math.PI * .5;
        segNodes[a.k].add(b);
      }
    }
  }
  if (S.stripe) {
    const sm = mat(S.stripe.color, {
      emissive: S.stripe.color, ei: S.stripe.glow ?? 1.4, rough: .3, metal: .2, side: THREE.DoubleSide,
    });
    const steps = Math.max(3, Math.round(5 * detail));
    for (let i = 0; i < steps; i++) {
      const t = lerp(S.stripe.from, S.stripe.to, i / steps);
      const tn = lerp(S.stripe.from, S.stripe.to, (i + 1) / steps);
      const a = localAt(t), b = localAt(tn);
      const w = Math.max(1e-3, (tn - t) * L);
      for (const side of [1, -1]) {
        const s = blade([[0, a.h * .13], [-w, b.h * .11], [-w, -b.h * .11], [0, -a.h * .13]], sm);
        s.position.set(a.x, a.h * .06, side * a.r * 1.03);
        s.rotation.y = side * Math.PI * .5;
        segNodes[a.k].add(s);
      }
    }
  }
  if (S.spots && deco) {
    const spotMat = mat(S.spotColor ?? S.dark, { rough: .6, side: THREE.DoubleSide });
    const ringMat = S.spotRing ? mat(S.spotRing, { emissive: S.spotRing, ei: .45, rough: .4, side: THREE.DoubleSide }) : null;
    const n = Math.max(4, Math.round(S.spots * detail));
    for (let i = 0; i < n; i++) {
      const t = rng.range(.12, .82);
      const a = localAt(t);
      const ang = rng.range(-1.15, 1.15);              // upper flanks only
      const y = Math.cos(ang) * a.h, z = Math.sin(ang) * a.r * (rng() < .5 ? 1 : -1);
      const nrm = new THREE.Vector3(.12, y / Math.max(1e-3, a.h), z / Math.max(1e-3, a.r)).normalize();
      const r = Math.max(1e-3, S.girth * rng.range(.16, .34));
      if (ringMat) {
        const halo = disc(r * 1.5, ringMat, 7);
        halo.position.set(a.x, y * 1.01, z * 1.01);
        halo.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), nrm);
        segNodes[a.k].add(halo);
      }
      const d = disc(r, spotMat, 7);
      d.position.set(a.x, y * 1.02, z * 1.02);
      d.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), nrm);
      segNodes[a.k].add(d);
    }
  }

  // ── whale trimmings
  if (S.pleats) {
    const n = Math.max(3, Math.round(S.pleats * detail));
    for (let i = 0; i < n; i++) {
      const a = localAt(.12 + i * .035);
      const p = box(L * .22, Math.max(1e-3, a.h * .03), Math.max(1e-3, a.r * .07), darkMat());
      p.position.set(a.x, -a.h * .97, (i - (n - 1) / 2) * a.r * .22);
      segNodes[a.k].add(p);
    }
  }
  if (S.blow) {
    const a = localAt(.14);
    const b = cyl(Math.max(1e-3, a.r * .06), Math.max(1e-3, a.r * .08), Math.max(1e-3, a.h * .09), darkMat(), 6);
    b.position.set(a.x, a.h * .99, 0);
    segNodes[a.k].add(b);
  }

  g.userData = {};
  return g;
}

/* ═══════════════ the ray ═══════════════ */

function rawRay(key, S, seed, detail, deco = true) {
  const rng = makeRng(seed);
  const g = new THREE.Group();
  g.name = `ray:${key}`;

  const radial = Math.max(5, Math.round(10 * detail));
  const segs = Math.max(3, Math.round(S.segs * detail));
  const L = S.len, segLen = L / segs, noseX = L * .5;
  const pal = { color: S.color, dark: S.dark, belly: S.belly };
  const topMat = mat(S.color, { rough: .5, metal: .08, side: THREE.DoubleSide, flat: true });
  const botMat = mat(S.belly, { rough: .55, side: THREE.DoubleSide, flat: true });
  const darkMat = mat(S.dark, { rough: .6, side: THREE.DoubleSide });
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: .5, metalness: .05, flatShading: false });
  bodyMat.userData.baseOpacity = 1; bodyMat.userData.baseEmissive = 0; bodyMat.userData.baseDepthWrite = true;

  const halfW = t => Math.max(1e-3, S.girth * sample(S.profile, t));
  const halfH = t => Math.max(1e-3, S.girth * S.deep * sample(S.height, t));

  // central body — a flattened tube
  const segNodes = [];
  let parent = g;
  for (let i = 0; i < segs; i++) {
    const stations = [];
    for (let s = 0; s <= 1; s++) {
      const t = (i + s) / segs;
      stations.push({ x: -s * segLen, r: halfW(t), h: halfH(t) });
    }
    const m = new THREE.Mesh(tube(stations, radial, pal, i === 0, i === segs - 1), bodyMat);
    m.name = `seg:${i}`;
    m.position.x = i === 0 ? noseX : -segLen;
    parent.add(m);
    parent = m;
    segNodes.push(m);
  }

  // wings: ribs chained outboard, each carrying a top and a belly panel
  const ribs = Math.max(3, Math.round(S.ribs * detail));
  const w = S.span / ribs;
  const chordAt = u => Math.max(1e-3, sample(S.chord, clamp(u)));
  for (const side of [1, -1]) {
    let host = segNodes[0];
    let first = true;
    for (let j = 0; j < ribs; j++) {
      const u0 = j / ribs, u1 = (j + 1) / ribs;
      const node = new THREE.Group();
      node.name = `rib:${side > 0 ? 'R' : 'L'}:${j}`;
      node.position.set(first ? -segLen * .25 : 0, 0, first ? side * halfW(.2) * .9 : side * w);
      const front0 = L * .30 * chordAt(u0) - S.sweep * L * .34 * u0;
      const front1 = L * .30 * chordAt(u1) - S.sweep * L * .34 * u1;
      const back0 = -L * .34 * chordAt(u0) - S.sweep * L * .18 * u0;
      const back1 = -L * .34 * chordAt(u1) - S.sweep * L * .18 * u1;
      const pts = [[front0, 0], [front1, w], [back1, w], [back0, 0]];
      for (const [m, dy] of [[topMat, .004], [botMat, -.004]]) {
        const panel = blade(pts, m);
        panel.rotation.x = side > 0 ? Math.PI / 2 : -Math.PI / 2;
        panel.position.y = dy;
        node.add(panel);
      }
      host.add(node);
      host = node;
      first = false;
    }
  }

  // eyes ride on top of the head; spiracles behind them
  const eyeMat = mat(0x1a1410, { emissive: 0x3a2f1a, ei: .5, rough: .2, flat: false });
  for (const side of [1, -1]) {
    const e = sph(Math.max(1e-3, S.girth * .17), eyeMat, 7);
    e.position.set(noseX - L * .14, halfH(.18) * .85, side * halfW(.18) * .62);
    segNodes[0].add(e);
    const sp = disc(Math.max(1e-3, S.girth * .13), darkMat, 6);
    sp.position.set(noseX - L * .24, halfH(.26) * .97, side * halfW(.26) * .5);
    sp.rotation.x = -Math.PI / 2;
    segNodes[0].add(sp);
  }
  if (S.spots && deco) {
    const spotMat = mat(S.spotColor, { emissive: S.spotColor, ei: .35, rough: .45, side: THREE.DoubleSide });
    for (let i = 0; i < Math.max(4, Math.round(S.spots * detail)); i++) {
      const d = disc(Math.max(1e-3, S.girth * rng.range(.1, .2)), spotMat, 6);
      d.position.set(rng.range(-L * .3, L * .3), halfH(.4) * 1.02, rng.range(-S.girth, S.girth) * .9);
      d.rotation.x = -Math.PI / 2;
      segNodes[0].add(d);
    }
  }

  // the whip tail
  const links = Math.max(3, Math.round(S.tailLinks * detail));
  let host = segNodes[segs - 1];
  for (let i = 0; i < links; i++) {
    const node = new THREE.Group();
    node.name = `tail:${i}`;
    node.position.x = i === 0 ? -segLen : -S.tailLen / links;
    const r0 = Math.max(1e-3, S.girth * .22 * (1 - i / links) + 1e-3);
    const r1 = Math.max(1e-3, S.girth * .22 * (1 - (i + 1) / links) + 1e-3);
    const seg = cyl(r1, r0, Math.max(1e-3, S.tailLen / links), darkMat, 5);
    seg.rotation.z = Math.PI / 2;
    seg.position.x = -S.tailLen / links * .5;
    node.add(seg);
    if (i === 1) {
      const barb = cone(Math.max(1e-3, S.girth * .16), Math.max(1e-3, S.girth * .7), darkMat, 5);
      barb.rotation.z = Math.PI / 2;
      barb.position.x = -S.tailLen / links * .5;
      node.add(barb);
    }
    host.add(node);
    host = node;
  }

  g.userData = {};
  return g;
}

/* ═══════════════ the jellyfish ═══════════════ */

function rawJelly(key, S, seed, detail) {
  const rng = makeRng(seed);
  const g = new THREE.Group();
  g.name = `jelly:${key}`;

  const radial = Math.max(7, Math.round(16 * detail));
  const rings = Math.max(4, Math.round(8 * detail));

  const bellMat = mat(S.color, {
    emissive: S.glow, ei: .8, rough: .25, metal: .05, flat: false,
    side: THREE.DoubleSide, opacity: .46, depthWrite: false,
  });
  const innerMat = mat(S.dark, {
    emissive: S.glow, ei: 1.2, rough: .3, flat: false,
    side: THREE.DoubleSide, opacity: .55, depthWrite: false,
  });
  const armMat = mat(S.fin, {
    emissive: S.glow, ei: .55, rough: .35, flat: true,
    side: THREE.DoubleSide, opacity: S.finAlpha, depthWrite: false,
  });
  const tentMat = mat(S.belly, {
    emissive: S.glow, ei: .7, rough: .3, flat: false, opacity: .5, depthWrite: false,
  });

  // the bell: a dome, with a smaller, hotter dome inside it
  const bell = new THREE.Group();
  bell.name = 'bell';
  g.add(bell);
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(S.bell, radial, rings, 0, TAU, 0, Math.PI * .58), bellMat);
  dome.scale.y = S.bellH / S.bell;
  bell.add(dome);
  const inner = new THREE.Mesh(
    new THREE.SphereGeometry(S.bell * .64, Math.max(6, radial - 4), Math.max(3, rings - 3), 0, TAU, 0, Math.PI * .5), innerMat);
  inner.scale.y = (S.bellH * .72) / (S.bell * .64);
  inner.position.y = -S.bellH * .06;
  bell.add(inner);
  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(S.bell * .985, S.bell * .035, 4, radial), innerMat);
  rim.name = 'rim';
  rim.rotation.x = Math.PI / 2;
  bell.add(rim);

  // four oral arms: wide ribbons under the bell
  const armLinks = Math.max(2, Math.round(S.armLinks * detail));
  for (let a = 0; a < S.arms; a++) {
    const root = new THREE.Group();
    root.name = `armroot:${a}`;
    root.rotation.y = (a / S.arms) * TAU;
    root.position.y = -S.bellH * .25;
    g.add(root);
    let host = root;
    for (let i = 0; i < armLinks; i++) {
      const node = new THREE.Group();
      node.name = `arm:${a}:${i}`;
      node.position.y = i === 0 ? 0 : -S.armLen / armLinks;
      const wTop = S.bell * .30 * (1 - i / (armLinks + 1));
      const wBot = S.bell * .30 * (1 - (i + 1) / (armLinks + 1));
      const h = S.armLen / armLinks;
      const rib = blade([[wTop, 0], [wBot * .5, -h], [-wBot * .5, -h], [-wTop, 0]], armMat);
      rib.rotation.y = Math.PI / 2;    // ribbon faces outward from the axis
      node.add(rib);
      host.add(node);
      host = node;
    }
  }

  // trailing tentacles
  const tents = Math.max(4, Math.round(S.tentacles * detail));
  const tLinks = Math.max(2, Math.round(S.tentLinks * detail));
  for (let a = 0; a < tents; a++) {
    // each chain hangs from a point on the rim, turned so that its own +X
    // points outward — then a swing is just a rotation about Z.
    const ang = (a / tents) * TAU;
    const root = new THREE.Group();
    root.name = `tentroot:${a}`;
    root.position.set(Math.cos(ang) * S.bell * .94, -S.bellH * .12, Math.sin(ang) * S.bell * .94);
    root.rotation.y = -ang;
    g.add(root);
    let host = root;
    const linkLen = (S.tentLen * rng.range(.7, 1.15)) / tLinks;
    for (let i = 0; i < tLinks; i++) {
      const node = new THREE.Group();
      node.name = `tent:${a}:${i}`;
      node.position.y = i === 0 ? 0 : -linkLen;
      const r0 = Math.max(1e-3, S.bell * .022 * (1 - i / (tLinks + 1)));
      const r1 = Math.max(1e-3, S.bell * .022 * (1 - (i + 1) / (tLinks + 1)));
      const seg = cyl(r1, r0, Math.max(1e-3, linkLen), tentMat, 4);
      seg.position.y = -linkLen * .5;
      node.add(seg);
      host.add(node);
      host = node;
    }
  }

  g.userData = {};
  return g;
}

/* ═══════════════ binding: names → animation plan ═══════════════ */

function collect(g) {
  const materials = new Set(), geometries = new Set();
  g.traverse(o => {
    if (o.geometry) geometries.add(o.geometry);
    if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => materials.add(m));
  });
  return { materials: [...materials], geometries: [...geometries] };
}

const baseRot = n => ({ x: n.rotation.x, y: n.rotation.y, z: n.rotation.z });

function bind(g, key, seed) {
  const S = SEA_SPECIES[key] || SEA_SPECIES.amnun;
  const rng = makeRng(seed);
  const { materials, geometries } = collect(g);
  const ud = {
    kind: S.type, key, spec: S, materials, geometries,
    phase: rng() * TAU, swim: 1, owned: true,
    segments: [], ridges: [], pect: [], pelv: [], ribs: [], tail: [], links: [],
  };

  g.traverse(o => {
    const n = o.name;
    if (!n) return;
    const p = n.split(':');
    switch (p[0]) {
      case 'seg': ud.segments[+p[1]] = { node: o, i: +p[1] }; break;
      case 'fin':
        if (p[1] === 'caudal') ud.caudal = o;
        else if (p[1] === 'pectR' || p[1] === 'pectL') ud.pect.push({ node: o, base: baseRot(o), side: p[1] === 'pectR' ? 1 : -1 });
        else if (p[1] === 'pelvR' || p[1] === 'pelvL') ud.pelv.push({ node: o, base: baseRot(o), side: p[1] === 'pelvR' ? 1 : -1 });
        else ud.ridges.push({ node: o, base: baseRot(o), i: +p[2] || 0 });
        break;
      case 'rib': ud.ribs.push({ node: o, base: baseRot(o), j: +p[2], side: p[1] === 'R' ? 1 : -1 }); break;
      case 'tail': ud.tail.push({ node: o, base: baseRot(o), i: +p[1] }); break;
      case 'bell': ud.bell = o; break;
      case 'arm': ud.links.push({ node: o, base: baseRot(o), i: +p[2], chain: +p[1], arm: true }); break;
      case 'tent': ud.links.push({ node: o, base: baseRot(o), i: +p[2], chain: +p[1], arm: false }); break;
      default: break;
    }
  });

  ud.segments = ud.segments.filter(Boolean);
  const n = Math.max(1, ud.segments.length);
  ud.segments.forEach(s => { s.weight = Math.pow((s.i + 1) / n, 1.45); });
  ud.ribs.forEach(r => { r.weight = Math.pow((r.j + 1) / Math.max(1, S.ribs), 1.25); });

  const fn = S.type === 'jelly' ? animateJelly : S.type === 'ray' ? animateRay : animateFish;
  ud.update = (t, dt, drive = 1) => fn(g, ud, t, dt, drive);
  g.userData = ud;
  return g;
}

/* ═══════════════ the motion ═══════════════ */

function animateFish(g, ud, t, dt, drive) {
  const S = ud.spec;
  const d = clamp(drive, 0, 2);
  const w = t * S.rate * (.6 + .4 * d) + ud.phase;
  const amp = S.amp * (.4 + .6 * d);
  const yaw = S.axis !== 'z';

  // the wave: each link repeats what the one in front did, a moment later
  for (const s of ud.segments) {
    const a = Math.sin(w - s.i * S.lag) * amp * s.weight;
    if (yaw) s.node.rotation.y = a; else s.node.rotation.z = a;
  }
  if (ud.caudal) {
    const a = Math.sin(w - ud.segments.length * S.lag) * amp * 1.9;
    if (yaw) ud.caudal.rotation.y = a; else ud.caudal.rotation.z = a;
    ud.caudal.rotation.x = Math.sin(w - ud.segments.length * S.lag - .5) * .10;   // the flick
  }
  // dorsal and anal trail a beat behind whatever they are riding on
  for (const r of ud.ridges) {
    const a = Math.sin(w - (r.i + 2) * S.lag) * amp * .55;
    r.node.rotation.y = r.base.y + (yaw ? a : 0);
    r.node.rotation.z = r.base.z + (yaw ? 0 : a * .6);
  }
  // pectorals scull on their own clock — this is most of the "alive" read
  const p = Math.sin(t * S.pectRate + ud.phase);
  const p2 = Math.sin(t * S.pectRate * .5 + ud.phase + 1.1);
  for (const f of ud.pect) {
    f.node.rotation.x = f.base.x + f.side * p * S.pectAmp;
    f.node.rotation.z = f.base.z + p2 * S.pectAmp * .35;
  }
  for (const f of ud.pelv) {
    f.node.rotation.x = f.base.x + f.side * Math.sin(t * S.pectRate * .8 + ud.phase + .6) * S.pectAmp * .7;
  }
}

function animateRay(g, ud, t, dt, drive) {
  const S = ud.spec;
  const d = clamp(drive, 0, 2);
  const w = t * S.rate * (.6 + .4 * d) + ud.phase;
  const amp = S.amp * (.45 + .55 * d);

  // one slow wave running from shoulder to wingtip
  for (const r of ud.ribs) {
    r.node.rotation.x = r.base.x + r.side * Math.sin(w - r.j * S.lag) * amp * r.weight;
  }
  // the body itself barely moves; the tail streams behind
  for (const s of ud.segments) s.node.rotation.y = Math.sin(w - s.i * .4) * .035 * s.weight;
  for (const l of ud.tail) {
    l.node.rotation.y = l.base.y + Math.sin(w * 1.1 - l.i * .55) * .16;
    l.node.rotation.z = l.base.z + Math.sin(w * .7 - l.i * .4) * .07;
  }
}

function animateJelly(g, ud, t, dt, drive) {
  const S = ud.spec;
  const d = clamp(drive, 0, 2);
  const ph = t * S.rate * (.7 + .3 * d) + ud.phase;
  const s = Math.sin(ph);
  const pulse = Math.pow(Math.max(0, s), 1.7);       // snap shut, drift open

  if (ud.bell) {
    ud.bell.scale.set(1 + pulse * .16, 1 - pulse * .26, 1 + pulse * .16);
    ud.bell.position.y = pulse * S.bellH * .12;
  }
  // everything below the bell answers a moment late
  for (const l of ud.links) {
    const lag = (l.i + 1) * .85 + (l.arm ? .4 : .9);
    const a = Math.sin(ph - lag) * S.amp * (l.arm ? .5 : 1) * (1 + l.i * .35);
    l.node.rotation.z = l.base.z + a * .55;
    l.node.rotation.x = l.base.x + Math.sin(ph * .6 - lag + l.chain) * S.amp * .22;
  }
}

/* ═══════════════ public builders ═══════════════ */

/**
 * Build one creature. Returns a THREE.Group whose userData drives it.
 * `detail` (0.4–1, default: 0.6 on phones) sets segment counts; `deco` adds
 * the close-up trimmings — pupils, mouth, gills, spots, pelvic fins — which
 * cost a draw call each and are invisible from across a shoal.
 */
export function makeFish(key, { seed = 1, scale = 1, detail, deco } = {}) {
  const k = SEA_SPECIES[key] ? key : 'amnun';
  const S = SEA_SPECIES[k];
  const det = detailOf(detail);
  const trim = deco === undefined ? det >= .7 : !!deco;
  const raw = S.type === 'jelly' ? rawJelly(k, S, seed, det)
            : S.type === 'ray' ? rawRay(k, S, seed, det, trim)
            : rawFish(k, S, seed, det, trim);
  bind(raw, k, seed);
  raw.scale.setScalar((S.scale || 1) * scale);
  return raw;
}

export function makeJellyfish({ seed = 21, scale = 1, detail } = {}) { return makeFish('meduza', { seed, scale, detail }); }
export function makeWhale({ seed = 22, scale = 1, detail } = {}) { return makeFish('livyatan', { seed, scale, detail }); }
export function makeRay({ seed = 23, scale = 1, detail } = {}) { return makeFish('trisanit', { seed, scale, detail }); }

/** Dispose a group built here (skips groups whose parts are shared). */
function disposeBuilt(g) {
  const ud = g.userData || {};
  if (ud.owned === false) return;
  (ud.geometries || []).forEach(x => x.dispose?.());
  (ud.materials || []).forEach(m => m.dispose?.());
}

function setOpacity(materials, v) {
  const o = clamp(v);
  for (const m of materials) {
    const base = m.userData.baseOpacity ?? 1;
    m.opacity = base * o;
    const want = m.opacity < .999;
    if (m.transparent !== want) { m.transparent = want; m.needsUpdate = true; }
    // a half-faded solid must stop writing depth, or it punches invisible
    // holes in whatever is behind it while it fades
    const dw = (m.userData.baseDepthWrite ?? true) && !want;
    if (m.depthWrite !== dw) m.depthWrite = dw;
  }
}

function setEmissive(materials, v) {
  for (const m of materials) {
    const base = m.userData.baseEmissive ?? 0;
    if (m.emissiveIntensity !== undefined) m.emissiveIntensity = base + v * 2.0;
  }
}

/* ═══════════════ a single creature you can steer ═══════════════ */

export class SeaCreature {
  constructor(key, { seed = 1, scale = 1, detail, speed = 1, drift = 0 } = {}) {
    this.key = SEA_SPECIES[key] ? key : 'amnun';
    this.spec = SEA_SPECIES[this.key];
    this.object = makeFish(this.key, { seed, scale, detail });
    this.object.traverse(o => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; } });

    const rng = makeRng(seed * 17 + 3);
    this._t = rng() * 30;
    this._phase = rng() * TAU;
    this.speed = speed;
    this.drift = drift;                       // metres of lazy hover, 0 = still
    this.pos = new THREE.Vector3();
    this.heading = 0;
    this._wp = null;
    this._done = null;
    this._speedTarget = 0;
    this._glow = 0;
  }

  placeAt(x, y, z, heading = 0) {
    this.pos.set(x, y, z);
    this.heading = heading;
    this.object.position.copy(this.pos);
    this.object.rotation.y = heading;
    return this;
  }

  /** Swim to a point; resolves on arrival. */
  moveTo(x, y, z, { speed = 1.2 } = {}) {
    this._wp = new THREE.Vector3(x, y, z);
    this._speedTarget = speed;
    return new Promise(res => { this._done = res; });
  }

  stop() { this._wp = null; this._speedTarget = 0; if (this._done) { this._done(); this._done = null; } }

  update(dt) {
    this._t += dt * this.speed;
    let drive = 1;

    if (this._wp) {
      const d = this._wp.clone().sub(this.pos);
      const dist = d.length();
      if (dist < .2) {
        this._wp = null; this._speedTarget = 0;
        if (this._done) { this._done(); this._done = null; }
      } else {
        d.normalize();
        const want = Math.atan2(d.x, d.z) - Math.PI / 2;   // body lies along +X
        let diff = want - this.heading;
        while (diff > Math.PI) diff -= TAU;
        while (diff < -Math.PI) diff += TAU;
        this.heading += diff * Math.min(1, dt * 2.2);
        this.pos.addScaledVector(d, this._speedTarget * dt);
        this.object.rotation.z = lerp(this.object.rotation.z, clamp(-diff * .5, -.6, .6), 1 - Math.pow(.02, dt));
        drive = 1 + clamp(this._speedTarget / 3) * .6;
      }
      this.object.position.copy(this.pos);
      this.object.rotation.y = this.heading;
    } else if (this.drift > 0) {
      this.object.position.set(
        this.pos.x + Math.sin(this._t * .31 + this._phase) * this.drift,
        this.pos.y + Math.sin(this._t * .47 + this._phase * 1.7) * this.drift * .45,
        this.pos.z + Math.cos(this._t * .27 + this._phase) * this.drift,
      );
      this.object.rotation.y = this.heading + Math.sin(this._t * .23 + this._phase) * .35;
      drive = .8;
    }

    this.object.userData.update?.(this._t, dt, drive);
  }

  setGlow(v) { this._glow = clamp(v, 0, 2); setEmissive(this.object.userData.materials, this._glow); }
  set opacity(v) { setOpacity(this.object.userData.materials, v); }
  get opacity() { return this.object.userData.materials[0]?.opacity ?? 1; }
  dispose() { disposeBuilt(this.object); }
}

/* ═══════════════ a school ═══════════════ */

/**
 * Many of one species swimming together. One fish is built, the rest are
 * clones of it — three's clone() shares geometry and materials, so a school of
 * thirty costs one fish worth of memory — then each clone is re-bound with its
 * own phase so the tails are not in lockstep. Flocking is the same cheap
 * attractor trick Swarm uses: nobody queries their neighbours.
 */
export class Shoal {
  constructor(key, {
    count = lowEnd() ? 10 : 20, center = [0, 2, 0], spread = 6, speed = 1,
    scale = 1, seed = 5, detail, deco = false, jitter = .25,
  } = {}) {
    this.key = SEA_SPECIES[key] ? key : 'kasif';
    this.spec = SEA_SPECIES[this.key];
    const rng = makeRng(seed);
    // members are never the hero: fewer rings, no close-up trimmings. Each
    // mesh is a draw call and there are dozens of fish, so this matters.
    const det = detailOf(detail ?? (lowEnd() ? .45 : .68));

    this.count = Math.max(1, Math.round(count));
    this.center = new THREE.Vector3(...center);
    this.spread = spread;
    this.speed = speed;
    this._t = rng() * 50;
    this.object = new THREE.Group();

    const template = makeFish(this.key, { seed, scale, detail: det, deco });
    this.materials = template.userData.materials;
    this.geometries = template.userData.geometries;
    setOpacity(this.materials, 0);
    // three deep-copies userData through JSON on clone(), which a bound
    // creature (meshes, closures, cycles) will not survive — so strip it,
    // clone the bare hierarchy, and bind every copy afterwards by name.
    template.userData = {};

    const bodies = [template];
    for (let i = 1; i < this.count; i++) bodies.push(template.clone(true));

    this.members = [];
    for (let i = 0; i < this.count; i++) {
      const obj = bind(bodies[i], this.key, seed + i * 31 + 7);
      if (i > 0) obj.userData.owned = false;   // geometry and materials are shared
      const j = clamp(jitter, 0, .8);
      obj.scale.setScalar((this.spec.scale || 1) * scale * rng.range(1 - j, 1 + j));
      const m = {
        obj,
        pos: new THREE.Vector3(
          this.center.x + (rng() - .5) * spread * 2,
          this.center.y + (rng() - .5) * spread,
          this.center.z + (rng() - .5) * spread * 2),
        vel: new THREE.Vector3(rng() - .5, (rng() - .5) * .3, rng() - .5).normalize().multiplyScalar(1.6),
        off: new THREE.Vector3(rng() * 100, rng() * 100, rng() * 100),
        wobble: .6 + rng() * .8,
        rate: .85 + rng() * .5,
        t: rng() * 40,
      };
      obj.position.copy(m.pos);
      this.object.add(obj);
      this.members.push(m);
    }

    this._m = new THREE.Matrix4();
    this._q = new THREE.Quaternion();
    this._qr = new THREE.Quaternion();
    this._x = new THREE.Vector3();
    this._y = new THREE.Vector3();
    this._z = new THREE.Vector3();
    this._up = new THREE.Vector3(0, 1, 0);
    this._alt = new THREE.Vector3(0, 0, 1);
    this._tmp = new THREE.Vector3();
    this._dir = new THREE.Vector3();
    this._axis = new THREE.Vector3(1, 0, 0);
    this.object.visible = false;    // invisible until the act fades it in
  }

  set opacity(v) { setOpacity(this.materials, v); this.object.visible = clamp(v) > .001; }
  get opacity() { return this.materials[0]?.opacity ?? 1; }
  setGlow(v) { setEmissive(this.materials, clamp(v, 0, 2)); }

  update(dt) {
    this._t += dt * this.speed;
    const tt = this._t;
    const attract = this._tmp.set(
      this.center.x + Math.sin(tt * .17) * this.spread * 1.0,
      this.center.y + Math.sin(tt * .23) * this.spread * .30,
      this.center.z + Math.cos(tt * .13) * this.spread * 1.0,
    );
    const maxSpeed = 3.0 * this.speed;

    for (const m of this.members) {
      m.t += dt * this.speed * m.rate;
      const dir = this._dir.copy(attract).sub(m.pos);
      const dist = dir.length();
      if (dist > 1e-4) dir.multiplyScalar(1 / dist);

      dir.x += Math.sin(tt * .9 + m.off.x) * .5 * m.wobble;
      dir.y += Math.sin(tt * 1.3 + m.off.y) * .3 * m.wobble;
      dir.z += Math.cos(tt * 1.1 + m.off.z) * .5 * m.wobble;

      const pull = clamp(dist / (this.spread * 1.5)) * 2.4 + .4;
      m.vel.addScaledVector(dir, pull * dt * 2.6);
      const sp = m.vel.length();
      if (sp > maxSpeed) m.vel.multiplyScalar(maxSpeed / sp);
      else if (sp < maxSpeed * .35 && sp > 1e-4) m.vel.multiplyScalar(1.03);
      m.pos.addScaledVector(m.vel, dt);

      // orient +X along the velocity, with a little bank into the turn
      const v = m.vel.length();
      if (v > 1e-4) {
        this._x.copy(m.vel).multiplyScalar(1 / v);
        const up = Math.abs(this._x.y) > .96 ? this._alt : this._up;
        this._z.crossVectors(this._x, up).normalize();
        this._y.crossVectors(this._z, this._x).normalize();
        this._m.makeBasis(this._x, this._y, this._z);
        this._q.setFromRotationMatrix(this._m);
        this._qr.setFromAxisAngle(this._axis, Math.sin(m.t * 1.3 + m.off.x) * .16);
        this._q.multiply(this._qr);
        m.obj.quaternion.copy(this._q);
      }
      m.obj.position.copy(m.pos);
      m.obj.userData.update?.(m.t, dt, .8 + clamp(v / maxSpeed) * .7);
    }
  }

  dispose() {
    this.geometries.forEach(g => g.dispose?.());
    this.materials.forEach(m => m.dispose?.());
    this.object.clear?.();
  }
}

/* ═══════════════ the beauty shot ═══════════════ */

function makeMember(builder, seed, index) {
  let made = typeof builder === 'function' ? builder({ seed, index }) : builder;
  if (typeof made === 'string' || made == null) made = new SeaCreature(made || 'amnun', { seed, detail: 1 });
  if (made && made.isObject3D) {
    const obj = made;
    return {
      object: obj, t: seed % 17,
      update(dt) { this.t += dt; obj.userData.update?.(this.t, dt, 1); },
      dispose() { disposeBuilt(obj); },
      materials: obj.userData.materials || collect(obj).materials,
    };
  }
  // anything with .object/.update/.dispose (SeaCreature, Shoal, …)
  return {
    object: made.object, inner: made,
    update(dt) { made.update?.(dt); },
    dispose() { made.dispose?.(); },
    materials: made.object.userData.materials || made.materials || collect(made.object).materials,
  };
}

/**
 * Presents a creature (or a small ring of them) slowly turning in front of the
 * camera, lit by its own little studio so the world's time of day cannot spoil
 * it. Drive `reveal` 0→1 to assemble and fade in, and back down to fade out.
 */
export class Showcase {
  constructor({
    builder = 'amnun', count = 1, spread = 1.1, seed = 9,
    spin = .32, bob = .06, lights = true, tilt = .12,
  } = {}) {
    const rng = makeRng(seed);
    this.object = new THREE.Group();
    this.turntable = new THREE.Group();
    this.turntable.rotation.x = tilt;
    this.object.add(this.turntable);

    this.count = Math.max(1, Math.round(count));
    this.spread = spread;
    this.spin = spin;
    this.bob = bob;
    this._t = 0;
    this._reveal = 0;
    this.members = [];
    this.lights = [];

    const mats = new Set();
    for (let i = 0; i < this.count; i++) {
      const m = makeMember(builder, seed + i * 13 + 1, i);
      const a = this.count === 1 ? 0 : (i / this.count) * TAU;
      m.home = new THREE.Vector3(
        Math.cos(a) * spread * (this.count === 1 ? 0 : 1),
        (rng() - .5) * spread * .32,
        Math.sin(a) * spread * (this.count === 1 ? 0 : 1));
      m.yaw = this.count === 1 ? 0 : -a + Math.PI * .25;
      m.bobPhase = rng() * TAU;
      m.object.rotation.y = m.yaw;
      this.turntable.add(m.object);
      this.members.push(m);
      (m.materials || []).forEach(x => mats.add(x));
    }
    this.materials = [...mats];
    for (const x of this.materials) {
      if (x.userData.baseOpacity === undefined) x.userData.baseOpacity = x.opacity ?? 1;
      if (x.userData.baseEmissive === undefined) x.userData.baseEmissive = x.emissiveIntensity ?? 0;
    }

    if (lights) {
      // a key, a cool fill and a rim — enough to carve the silhouette out
      const key = new THREE.PointLight(0xfff0d8, 9, 24, 2);
      key.position.set(2.2, 2.6, 2.8);
      const fill = new THREE.PointLight(0x9fd8ff, 4.5, 24, 2);
      fill.position.set(-2.8, -.6, 1.6);
      const rim = new THREE.PointLight(0xcfe8ff, 6, 22, 2);
      rim.position.set(-1.2, 1.8, -3.0);
      const amb = new THREE.AmbientLight(0x5f7fa0, .5);
      this.lights = [key, fill, rim, amb];
      for (const l of this.lights) { l.userData.baseIntensity = l.intensity; l.intensity = 0; this.object.add(l); }
    }

    this.reveal = 0;
  }

  set reveal(v) {
    const r = clamp(v);
    this._reveal = r;
    const e = ease.outCubic(r);
    setOpacity(this.materials, e);
    for (const l of this.lights) l.intensity = (l.userData.baseIntensity || 0) * e;
    const s = lerp(.72, 1, ease.outBack(r));
    this.turntable.scale.setScalar(Math.max(1e-3, s));
    for (const m of this.members) {
      // members gather in from a wider ring as they appear
      const k = lerp(1.9, 1, e);
      m.object.position.set(m.home.x * k, m.home.y * k, m.home.z * k);
    }
    this.turntable.visible = r > .001;
  }
  get reveal() { return this._reveal; }

  setGlow(v) { setEmissive(this.materials, clamp(v, 0, 2)); }

  update(dt) {
    this._t += dt;
    this.turntable.rotation.y += dt * this.spin;
    for (const m of this.members) {
      m.update(dt);
      m.object.position.y = m.home.y * lerp(1.9, 1, ease.outCubic(this._reveal))
        + Math.sin(this._t * .9 + m.bobPhase) * this.bob;
      m.object.rotation.z = Math.sin(this._t * .6 + m.bobPhase) * .05;
    }
  }

  dispose() {
    for (const m of this.members) m.dispose?.();
    for (const l of this.lights) l.dispose?.();
    this.members.length = 0;
    this.lights.length = 0;
    this.object.clear?.();
  }
}

export { SEA_SPECIES as SPECIES };
