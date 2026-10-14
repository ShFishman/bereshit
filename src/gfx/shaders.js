/**
 * shaders.js — the procedural visual identity of the Genesis game.
 *
 * Plain data only: every export is a string or a JSON-ish object. No imports,
 * no three.js. The engine turns `uniforms` arrays into Vector2/Vector3/Color
 * and the descriptor flags into ShaderMaterial options.
 *
 * Written for THREE.ShaderMaterial (NOT RawShaderMaterial):
 *   - three injects projectionMatrix / modelViewMatrix / modelMatrix /
 *     viewMatrix / normalMatrix / cameraPosition and the attributes
 *     position / normal / uv. None of them are redeclared here.
 *   - GLSL1 source (varying / gl_FragColor). three handles GLSL3 translation.
 *   - no #version, no precision statement, no layout qualifiers.
 *
 * Every fragment (and the two vertex stages that need it) has NOISE_CHUNK
 * concatenated in front of it, so each shader string compiles standalone.
 *
 * Descriptor shape:
 *   { vertexShader, fragmentShader, uniforms, side, transparent, depthWrite, blending? }
 * `blending` is advisory — the engine must pass it through as a material option
 * for the additive shaders (GLORY, FLAME_SWORD, DUST).
 */

/* ------------------------------------------------------------------ *
 * Shared procedural toolkit.
 * Cost notes: gnoise3 = 8 hash33, vnoise3 = 8 hash13. The fbm helpers
 * are fixed-octave so every loop bound is a compile-time constant.
 * ------------------------------------------------------------------ */
export const NOISE_CHUNK = `
/* guarded: three's injected chunks may already define these, and redefining
   a macro with a different body is a compile error */
#ifndef TAU
#define TAU 6.28318530718
#endif
#ifndef PI
#define PI 3.141592653589793
#endif

float hash11(float p){
  p = fract(p * 0.1031);
  p *= p + 33.33;
  p *= p + p;
  return fract(p);
}
float hash12(vec2 p){
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
float hash13(vec3 p){
  vec3 p3 = fract(p * 0.1031);
  p3 += dot(p3, p3.zyx + 31.32);
  return fract((p3.x + p3.y) * p3.z);
}
vec2 hash22(vec2 p){
  vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.xx + p3.yz) * p3.zy);
}
vec3 hash33(vec3 p){
  p = fract(p * vec3(0.1031, 0.1030, 0.0973));
  p += dot(p, p.yxz + 33.33);
  return fract((p.xxy + p.yxx) * p.zyx);
}

/* smootherstep weights */
vec3 quintic3(vec3 f){ return f * f * f * (f * (f * 6.0 - 15.0) + 10.0); }
vec2 quintic2(vec2 f){ return f * f * f * (f * (f * 6.0 - 15.0) + 10.0); }

/* --- value noise, 0..1 --- */
float vnoise3(vec3 p){
  vec3 i = floor(p);
  vec3 f = fract(p);
  vec3 w = quintic3(f);
  float n000 = hash13(i + vec3(0.0, 0.0, 0.0));
  float n100 = hash13(i + vec3(1.0, 0.0, 0.0));
  float n010 = hash13(i + vec3(0.0, 1.0, 0.0));
  float n110 = hash13(i + vec3(1.0, 1.0, 0.0));
  float n001 = hash13(i + vec3(0.0, 0.0, 1.0));
  float n101 = hash13(i + vec3(1.0, 0.0, 1.0));
  float n011 = hash13(i + vec3(0.0, 1.0, 1.0));
  float n111 = hash13(i + vec3(1.0, 1.0, 1.0));
  return mix(mix(mix(n000, n100, w.x), mix(n010, n110, w.x), w.y),
             mix(mix(n001, n101, w.x), mix(n011, n111, w.x), w.y), w.z);
}
float vnoise2(vec2 p){
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 w = quintic2(f);
  float a = hash12(i + vec2(0.0, 0.0));
  float b = hash12(i + vec2(1.0, 0.0));
  float c = hash12(i + vec2(0.0, 1.0));
  float d = hash12(i + vec2(1.0, 1.0));
  return mix(mix(a, b, w.x), mix(c, d, w.x), w.y);
}

/* --- gradient noise, roughly -1..1, simplex-ish in character --- */
float gdot3(vec3 i, vec3 f){
  vec3 g = normalize(hash33(i) * 2.0 - 1.0);
  return dot(g, f);
}
float gnoise3(vec3 p){
  vec3 i = floor(p);
  vec3 f = fract(p);
  vec3 w = quintic3(f);
  float n000 = gdot3(i + vec3(0.0, 0.0, 0.0), f - vec3(0.0, 0.0, 0.0));
  float n100 = gdot3(i + vec3(1.0, 0.0, 0.0), f - vec3(1.0, 0.0, 0.0));
  float n010 = gdot3(i + vec3(0.0, 1.0, 0.0), f - vec3(0.0, 1.0, 0.0));
  float n110 = gdot3(i + vec3(1.0, 1.0, 0.0), f - vec3(1.0, 1.0, 0.0));
  float n001 = gdot3(i + vec3(0.0, 0.0, 1.0), f - vec3(0.0, 0.0, 1.0));
  float n101 = gdot3(i + vec3(1.0, 0.0, 1.0), f - vec3(1.0, 0.0, 1.0));
  float n011 = gdot3(i + vec3(0.0, 1.0, 1.0), f - vec3(0.0, 1.0, 1.0));
  float n111 = gdot3(i + vec3(1.0, 1.0, 1.0), f - vec3(1.0, 1.0, 1.0));
  return mix(mix(mix(n000, n100, w.x), mix(n010, n110, w.x), w.y),
             mix(mix(n001, n101, w.x), mix(n011, n111, w.x), w.y), w.z) * 1.35;
}

/* --- fbm. value variants return 0..1, gradient variants return about -1..1 --- */
float vfbm3(vec3 p){
  float s = 0.0, a = 0.5, n = 0.0;
  for (int i = 0; i < 3; i++){
    s += a * vnoise3(p);
    n += a;
    p = p * 2.03 + vec3(7.3, 11.1, 3.7);
    a *= 0.5;
  }
  return s / max(n, 0.0001);
}
float vfbm4(vec3 p){
  float s = 0.0, a = 0.5, n = 0.0;
  for (int i = 0; i < 4; i++){
    s += a * vnoise3(p);
    n += a;
    p = p * 2.03 + vec3(7.3, 11.1, 3.7);
    a *= 0.5;
  }
  return s / max(n, 0.0001);
}
float fbm3(vec3 p){
  float s = 0.0, a = 0.5, n = 0.0;
  for (int i = 0; i < 3; i++){
    s += a * gnoise3(p);
    n += a;
    p = p * 2.07 + vec3(11.7, 3.1, 7.3);
    a *= 0.5;
  }
  return s / max(n, 0.0001);
}
float fbm4(vec3 p){
  float s = 0.0, a = 0.5, n = 0.0;
  for (int i = 0; i < 4; i++){
    s += a * gnoise3(p);
    n += a;
    p = p * 2.07 + vec3(11.7, 3.1, 7.3);
    a *= 0.5;
  }
  return s / max(n, 0.0001);
}
float fbm5(vec3 p){
  float s = 0.0, a = 0.5, n = 0.0;
  for (int i = 0; i < 5; i++){
    s += a * gnoise3(p);
    n += a;
    p = p * 2.07 + vec3(11.7, 3.1, 7.3);
    a *= 0.5;
  }
  return s / max(n, 0.0001);
}
float vfbm2(vec2 p){
  float s = 0.0, a = 0.5, n = 0.0;
  for (int i = 0; i < 4; i++){
    s += a * vnoise2(p);
    n += a;
    p = p * 2.11 + vec2(5.7, 9.3);
    a *= 0.5;
  }
  return s / max(n, 0.0001);
}

/* ridged multifractal, 0..1 — the vein / filament former */
float ridged3(vec3 p){
  float s = 0.0, a = 0.5, n = 0.0;
  for (int i = 0; i < 4; i++){
    float v = 1.0 - abs(gnoise3(p));
    v *= v;
    s += a * v;
    n += a;
    p = p * 2.13 + vec3(3.3, 1.7, 9.2);
    a *= 0.55;
  }
  return s / max(n, 0.0001);
}

/* domain warp: feed fbm back into its own coordinates */
vec3 warp3(vec3 p, float amt){
  vec3 q = vec3(
    vfbm3(p),
    vfbm3(p + vec3(5.2, 1.3, 4.7)),
    vfbm3(p + vec3(9.1, 7.7, 2.3))
  );
  return p + amt * (q * 2.0 - 1.0);
}

mat2 rot2(float a){ float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }
float luma(vec3 c){ return dot(c, vec3(0.2126, 0.7152, 0.0722)); }

/* ~1/255 of hash noise: kills 8-bit banding in big smooth gradients */
float ditherMask(vec2 fragXY){
  float h = hash12(fragXY + vec2(0.37, 0.71));
  return (h - 0.5) * 0.0039;
}
float saturate1(float x){ return clamp(x, 0.0, 1.0); }
vec3 saturate3(vec3 x){ return clamp(x, vec3(0.0), vec3(1.0)); }
`;

/* ================================================================== *
 * 1. TOHU — tohu va-vohu, the formless void, inside of a big sphere.
 * ================================================================== */

const TOHU_VERT = `
varying vec3 vWorldDir;
varying vec3 vLocalPos;
varying vec2 vUv;

void main(){
  vUv = uv;
  vLocalPos = position;
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorldDir = wp.xyz - cameraPosition;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const TOHU_FRAG = NOISE_CHUNK + `
uniform float uTime;
uniform float uChaos;
uniform float uLight;
uniform float uSpirit;

varying vec3 vWorldDir;
varying vec3 vLocalPos;
varying vec2 vUv;

void main(){
  vec3 dir = normalize(vWorldDir);
  float t = uTime * 0.035;

  /* flatten the sampling sphere a little so the currents read as horizontal
     strata of water rather than as a ball of cloud */
  vec3 p = dir * 2.3;
  p.y *= 0.72;

  /* two stages of domain warp. the second is driven by chaos so the void
     gets more knotted and restless as the number rises */
  vec3 q = warp3(p + vec3(0.0, t * 0.5, t * 0.23), 0.85 + 1.5 * uChaos);
  q = warp3(q * 1.07 - vec3(t * 0.35, 0.0, t * 0.11), 0.35 + 0.8 * uChaos);

  float deep    = fbm5(q * 1.55 + vec3(0.0, -t * 1.3, 0.0)) * 0.5 + 0.5;
  float churn   = fbm4(q * 3.4 - vec3(t * 2.1, t * 0.6, 0.0)) * 0.5 + 0.5;
  float current = vfbm4(p * 0.55 + vec3(t * 0.17, t * 0.04, -t * 0.12));

  /* huge slow bands, never closing into a surface */
  float strata = sin(dir.y * 7.0 - current * 9.0 + deep * 4.0);
  strata = 0.5 + 0.5 * strata;
  strata = pow(strata, 3.0);

  /* near-black indigo base. the void is lightless: everything is subtractive */
  vec3 abyss  = vec3(0.0035, 0.0040, 0.0125);
  vec3 indigo = vec3(0.0220, 0.0185, 0.0720);
  vec3 bruise = vec3(0.0450, 0.0190, 0.0560);
  vec3 drown  = vec3(0.0060, 0.0260, 0.0330);

  vec3 col = mix(abyss, indigo, smoothstep(0.30, 0.95, deep));
  col = mix(col, bruise, smoothstep(0.55, 1.0, churn) * (0.25 + 0.45 * uChaos));
  col = mix(col, drown, strata * 0.30 * (0.45 + 0.55 * current));

  /* the deep below is heavier than the deep above */
  col *= mix(0.45, 1.0, smoothstep(-0.9, 0.5, dir.y));

  /* chaos eats contrast at the fine scale and makes it boil */
  float boil = fbm3(q * 7.0 + vec3(0.0, -t * 5.0, t * 2.0)) * 0.5 + 0.5;
  col += (boil - 0.5) * 0.045 * (0.3 + uChaos);

  /* the hovering of the spirit: a soft, cloud-shaped luminance that drifts
     across the face of the waters and never sharpens into an object */
  vec3 hover = normalize(vec3(
    sin(uTime * 0.071) * 0.9,
    0.18 + 0.34 * sin(uTime * 0.049 + 1.3),
    cos(uTime * 0.093) * 0.9
  ));
  float toHover = max(dot(dir, hover), 0.0);
  float breath  = 0.55 + 0.45 * sin(uTime * 0.21);
  float veilN   = vfbm3(dir * 3.1 + vec3(0.0, uTime * 0.05, 0.0));
  float halo    = pow(toHover, 5.0) * (0.35 + 0.65 * veilN);
  halo += pow(toHover, 26.0) * 0.55 * breath;
  vec3 spiritCol = mix(vec3(0.34, 0.47, 0.66), vec3(0.82, 0.86, 0.95), halo);
  col += spiritCol * halo * uSpirit * (0.55 + 0.45 * breath);

  /* and God said, let there be light — a cold bleed that enters from above,
     structured by the same currents so it looks like it is coming through
     the water rather than being painted on top of it */
  float fromAbove = smoothstep(-0.25, 0.85, dir.y);
  float seam = smoothstep(0.42, 0.92, deep) * (0.4 + 0.6 * churn);
  vec3 firstLight = mix(vec3(0.16, 0.20, 0.34), vec3(1.0, 0.94, 0.80), uLight);
  col += firstLight * (fromAbove * 0.55 + seam * 0.55) * uLight * uLight;
  col += vec3(1.0, 0.97, 0.90) * pow(fromAbove, 6.0) * uLight * 0.35;

  /* keep it genuinely dark: soft knee instead of a clamp */
  col = col / (1.0 + col * 0.65);

  /* a faint grain so the enormous smooth gradients never band */
  col += ditherMask(gl_FragCoord.xy);
  col += (hash13(vec3(gl_FragCoord.xy, floor(uTime * 24.0))) - 0.5) * 0.004;

  gl_FragColor = vec4(max(col, vec3(0.0)), 1.0);
}
`;

/* ================================================================== *
 * 2. FIRMAMENT — the sky dome. Pre-dawn to day to dusk to night.
 * ================================================================== */

const FIRMAMENT_VERT = `
varying vec3 vWorldDir;
varying vec2 vUv;

void main(){
  vUv = uv;
  vec4 wp = modelMatrix * vec4(position, 1.0);
  /* world-space direction: stars are anchored to the world, so they do not
     swim when the camera turns */
  vWorldDir = wp.xyz - cameraPosition;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const FIRMAMENT_FRAG = NOISE_CHUNK + `
uniform float uTime;
uniform vec3  uSunDir;
uniform vec3  uMoonDir;
uniform float uDayNight;
uniform float uStars;
uniform float uHaze;
uniform vec3  uTopColor;
uniform vec3  uHorizonColor;
uniform vec3  uNightColor;

varying vec3 vWorldDir;
varying vec2 vUv;

/* stable cube-face parameterisation of a direction: gives the star field a
   seam-free 2D lattice with no poles and no 27-cell neighbourhood loop */
vec2 cubeDirUV(vec3 d, out float face){
  vec3 a = abs(d);
  if (a.x >= a.y && a.x >= a.z){
    face = d.x > 0.0 ? 0.0 : 1.0;
    return vec2(d.z, d.y) / max(a.x, 0.00001);
  }
  if (a.y >= a.z){
    face = d.y > 0.0 ? 2.0 : 3.0;
    return vec2(d.x, d.z) / max(a.y, 0.00001);
  }
  face = d.z > 0.0 ? 4.0 : 5.0;
  return vec2(d.x, d.y) / max(a.z, 0.00001);
}

/* one lattice of stars. jitter is kept inside the cell so no neighbour
   lookup is needed — cheap enough to stack three times */
vec3 starLayer(vec3 d, float density, float radius, float seed, float cutoff){
  float face;
  vec2 c = cubeDirUV(d, face);
  vec2 g = c * density;
  vec2 cell = floor(g);
  vec2 f = fract(g);

  vec2 key = cell + vec2(face * 37.0 + seed, face * 11.0 - seed);
  float pick = hash12(key);
  if (pick < cutoff) return vec3(0.0);

  vec2 jitter = hash22(key + 3.17);
  vec2 center = vec2(0.3) + 0.4 * jitter;
  float dist = length(f - center);

  float mag = hash12(key + 9.71);
  /* radius is in cell fractions. kept above roughly a pixel at 1080p so the
     discs do not shimmer, and the halo is clamped to the jitter margin so it
     can never clip against the cell border and read as a square */
  float r = radius * (0.45 + 0.85 * mag * mag);
  float core = smoothstep(r, 0.0, dist);
  float glow = smoothstep(min(r * 3.0, 0.29), 0.0, dist) * 0.16;

  /* twinkle: two detuned oscillators so it never reads as a sine */
  float ph = jitter.x * TAU;
  float tw = 0.62
           + 0.26 * sin(uTime * (1.1 + 2.6 * jitter.y) + ph)
           + 0.12 * sin(uTime * (3.7 + 1.9 * mag) + ph * 2.3);

  /* spectral class: cool blue-white through warm amber */
  vec3 tint = mix(vec3(0.72, 0.82, 1.0), vec3(1.0, 0.86, 0.66), jitter.y);
  return tint * (core * tw + glow) * (0.35 + 0.95 * mag);
}

void main(){
  vec3 dir = normalize(vWorldDir);
  vec3 sunN = normalize(uSunDir);
  vec3 moonN = normalize(uMoonDir);
  float up = clamp(dir.y, -1.0, 1.0);
  float day = clamp(uDayNight, 0.0, 1.0);

  /* ---- daylight gradient -------------------------------------- */
  float zen = pow(clamp(up * 0.5 + 0.5, 0.0, 1.0), 0.65);
  float hazeBand = exp(-max(up, 0.0) * mix(7.0, 2.4, clamp(uHaze, 0.0, 1.0)));
  vec3 daySky = mix(uTopColor, uHorizonColor, clamp(hazeBand, 0.0, 1.0));
  daySky = mix(daySky, uTopColor, zen * 0.35);

  /* ---- night gradient ----------------------------------------- */
  vec3 nightSky = mix(uNightColor * 1.5, uNightColor * 0.55, zen);
  nightSky = mix(nightSky, uNightColor * vec3(1.25, 1.1, 1.0), hazeBand * 0.5);

  /* ---- stars, milky band, both anchored to world direction ----- */
  float band = 1.0 - abs(dot(dir, normalize(vec3(0.33, 0.78, -0.53))));
  float milkyShape = smoothstep(0.78, 1.0, band);
  float milkyN = vfbm4(dir * 5.5 + 13.0) * 0.5 + 0.5 * vfbm3(dir * 14.0);
  vec3 milky = vec3(0.30, 0.33, 0.44) * milkyShape * milkyShape * (0.25 + 0.95 * milkyN) * 0.55;

  vec3 stars = vec3(0.0);
  stars += starLayer(dir, 120.0, 0.14, 0.0, 0.86);
  stars += starLayer(dir, 260.0, 0.16, 17.0, 0.90) * 0.75;
  stars += starLayer(dir, 520.0, 0.19, 53.0, 0.945) * 0.5;
  /* the galactic band is crowded with faint stars */
  stars += starLayer(dir, 700.0, 0.21, 91.0, 0.962) * milkyShape * 1.4;

  float horizonCull = smoothstep(-0.07, 0.12, up);
  float starVis = clamp(uStars, 0.0, 1.0) * horizonCull;
  nightSky += (stars * 1.35 + milky) * starVis;

  /* ---- moon: disc plus soft crescent terminator ---------------- */
  float moonAng = acos(clamp(dot(dir, moonN), -1.0, 1.0));
  float moonR = 0.045;
  vec3 mUpRef = abs(moonN.y) > 0.95 ? vec3(1.0, 0.0, 0.0) : vec3(0.0, 1.0, 0.0);
  vec3 mT = normalize(cross(mUpRef, moonN));
  vec3 mB = cross(moonN, mT);
  vec2 mLocal = vec2(dot(dir, mT), dot(dir, mB)) / moonR;
  float mr2 = dot(mLocal, mLocal);
  float onDisc = smoothstep(1.0, 0.90, sqrt(max(mr2, 0.0)));
  /* fake the sphere normal inside the disc so the terminator curves */
  vec3 mNrm = normalize(moonN * sqrt(max(1.0 - min(mr2, 1.0), 0.0)) + mT * mLocal.x + mB * mLocal.y);
  float phase = smoothstep(-0.14, 0.22, dot(mNrm, sunN));
  float maria = 0.78 + 0.22 * vfbm3(mNrm * 9.0);
  vec3 moonCol = vec3(0.92, 0.92, 0.86) * maria * phase;
  float moonHalo = exp(-moonAng * 16.0) * 0.16 + exp(-moonAng * 3.0) * 0.03;
  float moonVis = (1.0 - day * 0.88) * smoothstep(-0.08, 0.06, moonN.y);
  nightSky += (moonCol * onDisc * 1.6 + vec3(0.65, 0.70, 0.85) * moonHalo) * moonVis;

  /* ---- blend the two skies ------------------------------------- */
  vec3 col = mix(nightSky, daySky, smoothstep(0.0, 1.0, day));

  /* ---- sun: disc, bloom, and the low-angle wash ---------------- */
  float sunDot = dot(dir, sunN);
  float sunAng = acos(clamp(sunDot, -1.0, 1.0));
  float above = smoothstep(-0.13, 0.03, sunN.y);
  float lowSun = 1.0 - smoothstep(-0.05, 0.40, sunN.y);

  vec3 sunHot = mix(vec3(1.0, 0.56, 0.26), vec3(1.0, 0.98, 0.92), 1.0 - lowSun);
  float disc = smoothstep(0.0130, 0.0092, sunAng);
  float bloom = pow(max(sunDot, 0.0), 1400.0) * 0.8
              + pow(max(sunDot, 0.0), 180.0) * 0.30
              + pow(max(sunDot, 0.0), 14.0) * 0.16;
  /* dawn and dusk smear along the horizon, not around the disc */
  float wash = pow(max(sunDot, 0.0), 3.0) * hazeBand * lowSun;

  col += sunHot * (disc * 14.0 + bloom * 3.2) * above;
  col += mix(vec3(1.0, 0.42, 0.18), vec3(1.0, 0.72, 0.42), 0.35) * wash * 1.5 * above;
  /* residual pre-dawn glow while the sun is still under the edge */
  col += vec3(0.35, 0.22, 0.30) * hazeBand * pow(max(sunDot, 0.0), 2.0)
       * (1.0 - above) * smoothstep(-0.35, -0.05, sunN.y);

  /* mie-ish forward scatter tinting the whole dome near sunrise */
  col += uHorizonColor * 0.25 * pow(max(sunDot, 0.0), 6.0) * day;

  /* under the horizon line the dome darkens so the ground meets it cleanly */
  col *= mix(0.22, 1.0, smoothstep(-0.30, 0.0, up));

  /* soft shoulder, then dither */
  col = col / (1.0 + col * 0.22);
  col += ditherMask(gl_FragCoord.xy * 1.013);

  gl_FragColor = vec4(max(col, vec3(0.0)), 1.0);
}
`;

/* ================================================================== *
 * 3. WATER — summed Gerstner waves with analytic normals.
 * ================================================================== */

const WATER_VERT = `
#ifndef PI
#define PI 3.14159265359
#endif
#ifndef TAU
#define TAU 6.28318530718
#endif

uniform float uTime;
uniform float uAmplitude;
uniform float uChoppiness;

varying vec3 vWorldPos;
varying vec3 vWorldNrm;
varying float vCrest;
varying vec2 vUv;

/* One Gerstner wave. Accumulates the analytic normal terms so the fragment
   stage never has to finite-difference the surface. */
vec3 gerstner(vec2 d0, float wl, float amp, float steep, float spd,
              vec2 xz, float t, inout vec3 nAcc, inout float curv){
  vec2 d = normalize(d0);
  float k = TAU / max(wl, 0.0001);
  float c = sqrt(9.81 / k);
  float f = k * (dot(d, xz) - c * spd * t);
  float a = amp;
  float q = steep / max(k * a * 4.0, 0.0001);
  q = min(q, 1.0);

  float sf = sin(f);
  float cf = cos(f);

  nAcc.x += -d.x * a * k * cf;
  nAcc.z += -d.y * a * k * cf;
  curv += q * a * k * sf;

  return vec3(q * a * d.x * cf, a * sf, q * a * d.y * cf);
}

void main(){
  vUv = uv;
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vec2 xz = wp.xz;
  float t = uTime;

  float amp = max(uAmplitude, 0.0);
  float ch = clamp(uChoppiness, 0.0, 1.0);

  vec3 nAcc = vec3(0.0, 0.0, 0.0);
  float curv = 0.0;
  vec3 disp = vec3(0.0);

  disp += gerstner(vec2( 1.00,  0.18), 31.0, amp * 1.00, 0.85 * ch, 1.00, xz, t, nAcc, curv);
  disp += gerstner(vec2( 0.62, -0.78), 17.0, amp * 0.55, 0.75 * ch, 1.15, xz, t, nAcc, curv);
  disp += gerstner(vec2(-0.35,  0.94),  9.5, amp * 0.30, 0.65 * ch, 1.30, xz, t, nAcc, curv);
  disp += gerstner(vec2(-0.90, -0.44),  5.1, amp * 0.16, 0.55 * ch, 1.55, xz, t, nAcc, curv);
  disp += gerstner(vec2( 0.18,  0.98),  2.7, amp * 0.07, 0.40 * ch, 1.90, xz, t, nAcc, curv);

  wp.xyz += disp;

  vec3 nrm = normalize(vec3(nAcc.x, 1.0 - clamp(curv, 0.0, 0.98), nAcc.z));

  vWorldPos = wp.xyz;
  vWorldNrm = nrm;
  /* crest factor: pinched tops plus raw height, used for foam and sparkle */
  vCrest = clamp(curv * 1.1 + disp.y / max(amp * 1.6, 0.001) * 0.45, 0.0, 1.5);

  gl_Position = projectionMatrix * viewMatrix * wp;
}
`;

const WATER_FRAG = NOISE_CHUNK + `
uniform float uTime;
uniform vec3  uSunDir;
uniform vec3  uDeepColor;
uniform vec3  uShallowColor;
uniform float uAmplitude;
uniform float uChoppiness;
uniform float uGlitter;

varying vec3 vWorldPos;
varying vec3 vWorldNrm;
varying float vCrest;
varying vec2 vUv;

void main(){
  vec3 nrm = normalize(vWorldNrm);
  vec3 viewV = normalize(cameraPosition - vWorldPos);
  vec3 sunN = normalize(uSunDir);
  float t = uTime;

  /* fine capillary ripples: three value-noise taps as a finite-difference
     bump, cheaper than another pair of Gerstner waves */
  vec2 rp = vWorldPos.xz * 1.35 + vec2(t * 0.35, -t * 0.27);
  float e = 0.08;
  float r0 = vfbm2(rp);
  float rx = vfbm2(rp + vec2(e, 0.0));
  float rz = vfbm2(rp + vec2(0.0, e));
  float rippleAmp = 0.35 * (0.3 + 0.7 * clamp(uChoppiness, 0.0, 1.0));
  nrm = normalize(nrm + vec3(-(rx - r0) / e, 0.0, -(rz - r0) / e) * rippleAmp);

  float ndv = clamp(dot(nrm, viewV), 0.0, 1.0);

  /* schlick fresnel, floor raised so grazing water never goes flat black */
  float fres = 0.025 + 0.975 * pow(1.0 - ndv, 5.0);

  /* body colour: deep when looking down into it, shallow at the slopes */
  float facing = pow(ndv, 0.7);
  vec3 body = mix(uShallowColor, uDeepColor, facing);
  /* subsurface lift on the back of the waves that face the sun */
  float through = pow(clamp(dot(normalize(vec3(nrm.x, -abs(nrm.y), nrm.z)), -sunN), 0.0, 1.0), 2.0);
  body += uShallowColor * through * 0.35 * clamp(uAmplitude, 0.0, 2.0);

  /* reflection tint: a cheap analytic sky instead of a cubemap */
  vec3 refl = reflect(-viewV, nrm);
  float ry = clamp(refl.y, 0.0, 1.0);
  vec3 skyTint = mix(vec3(0.62, 0.70, 0.80), vec3(0.16, 0.32, 0.62), pow(ry, 0.6));
  skyTint = mix(skyTint, vec3(1.0, 0.86, 0.66), pow(max(dot(refl, sunN), 0.0), 8.0) * 0.5);

  vec3 col = mix(body, skyTint, fres);

  /* sun glint: tight blinn-phong plus a broad sheen */
  vec3 half1 = normalize(sunN + viewV);
  float ndh = max(dot(nrm, half1), 0.0);
  float spec = pow(ndh, 420.0) * 3.4 + pow(ndh, 48.0) * 0.26;
  col += vec3(1.0, 0.95, 0.84) * spec * (0.25 + 0.75 * fres);

  /* foam in the pinched crests, broken up by noise so it is not a contour */
  float foamN = vfbm2(vWorldPos.xz * 2.6 + vec2(-t * 0.6, t * 0.4));
  float foam = smoothstep(0.58, 1.02, vCrest * (0.55 + 0.75 * foamN));
  foam *= smoothstep(0.1, 0.5, foamN);
  col = mix(col, vec3(0.90, 0.94, 0.97), clamp(foam, 0.0, 0.85));

  /* glitter: sparse hash sparkle riding the crests, gated by fresnel */
  vec2 gid = floor(vWorldPos.xz * 26.0);
  float gseed = hash12(gid);
  float sparkle = pow(max(sin(t * (5.0 + 11.0 * gseed) + gseed * TAU), 0.0), 36.0);
  sparkle *= step(0.86, gseed) * smoothstep(0.25, 0.9, vCrest);
  sparkle *= smoothstep(0.1, 0.7, max(dot(nrm, sunN), 0.0));
  col += vec3(1.0, 0.97, 0.90) * sparkle * clamp(uGlitter, 0.0, 2.0) * 2.2 * (0.3 + 0.7 * fres);

  /* distance haze so the plane does not end in a hard line */
  float dist = length(cameraPosition.xz - vWorldPos.xz);
  float haze = 1.0 - exp(-dist * 0.0022);
  col = mix(col, skyTint * 0.9, clamp(haze, 0.0, 0.85));

  col = col / (1.0 + col * 0.18);
  gl_FragColor = vec4(max(col, vec3(0.0)), 1.0);
}
`;

/* ================================================================== *
 * 4. EDEN_GROUND — a garden floor with no textures at all.
 * ================================================================== */

const EDEN_VERT = `
varying vec3 vWorldPos;
varying vec3 vWorldNrm;
varying vec2 vUv;

void main(){
  vUv = uv;
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorldPos = wp.xyz;
  vWorldNrm = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`;

const EDEN_FRAG = NOISE_CHUNK + `
uniform float uTime;
uniform float uBloom;
uniform float uDesaturate;
uniform float uLightLevel;
uniform vec3  uGrassColor;
uniform vec3  uSoilColor;
uniform vec3  uLightDir;

varying vec3 vWorldPos;
varying vec3 vWorldNrm;
varying vec2 vUv;

/* one lattice of small flowers of light */
vec3 flowerField(vec2 p, float density, float seed, float cutoff, float tm){
  vec2 g = p * density;
  vec2 cell = floor(g);
  vec2 f = fract(g);
  vec2 key = cell + seed;
  float pick = hash12(key);
  if (pick < cutoff) return vec3(0.0);

  vec2 jit = hash22(key + 5.3);
  float d = length(f - (vec2(0.25) + 0.5 * jit));
  float r = 0.10 + 0.10 * jit.x;
  float petal = smoothstep(r, 0.0, d);
  float halo = smoothstep(r * 3.4, 0.0, d) * 0.3;

  /* each bloom breathes on its own clock */
  float br = 0.55 + 0.45 * sin(tm * (0.6 + 1.5 * jit.y) + jit.x * TAU);
  vec3 tint = mix(vec3(1.0, 0.96, 0.80), vec3(1.0, 0.72, 0.84), jit.y);
  tint = mix(tint, vec3(0.78, 0.92, 1.0), step(0.72, pick) * 0.8);
  return tint * (petal + halo) * br;
}

void main(){
  vec2 wp = vWorldPos.xz;
  float t = uTime;

  /* ---- layered structure: patches, clumps, blades --------------- */
  float patchN = vfbm2(wp * 0.055);
  float clump  = vfbm2(wp * 0.42 + patchN * 1.6);
  float blade  = vnoise2(wp * 7.3 + clump * 2.2);
  float fine   = vnoise2(wp * 23.0);
  float soilN  = vfbm2(wp * 0.9 + 31.0);

  /* a faint breeze shifting which clumps catch the light */
  float breeze = vnoise2(wp * 0.6 + vec2(t * 0.06, t * 0.04));

  /* ---- colour: cool moss through sun-warmed gold ---------------- */
  vec3 moss  = uGrassColor * vec3(0.72, 1.00, 0.78);
  vec3 gold  = uGrassColor * vec3(1.45, 1.22, 0.62);
  vec3 verd  = uGrassColor;

  float warm = clamp(patchN * 0.55 + clump * 0.5 + breeze * 0.25, 0.0, 1.0);
  vec3 col = mix(moss, verd, smoothstep(0.15, 0.6, warm));
  col = mix(col, gold, smoothstep(0.52, 0.95, warm));

  /* bare earth showing through the thin places */
  float bare = smoothstep(0.62, 0.90, soilN) * smoothstep(0.55, 0.15, clump);
  col = mix(col, uSoilColor * (0.75 + 0.5 * fine), bare * 0.85);

  /* blade-level contrast and a little self-shadow between clumps */
  col *= 0.74 + 0.40 * blade;
  col *= 0.86 + 0.26 * fine;
  col *= mix(0.68, 1.06, smoothstep(0.2, 0.8, clump));

  /* ---- lighting -------------------------------------------------- */
  vec3 nrm = normalize(vWorldNrm);
  /* perturb the flat plane normal with the clump field so it is not a slab */
  float e = 0.35;
  float h0 = vfbm2(wp * 0.42);
  float hx = vfbm2((wp + vec2(e, 0.0)) * 0.42);
  float hz = vfbm2((wp + vec2(0.0, e)) * 0.42);
  nrm = normalize(nrm + vec3(-(hx - h0), 0.0, -(hz - h0)) * 3.0);

  vec3 lightN = normalize(uLightDir);
  float lam = clamp(dot(nrm, lightN), 0.0, 1.0);
  float wrap = clamp((dot(nrm, lightN) + 0.45) / 1.45, 0.0, 1.0);
  vec3 ambient = vec3(0.26, 0.31, 0.34);
  col *= ambient + vec3(1.08, 1.04, 0.90) * (lam * 0.65 + wrap * 0.45);
  /* the ground has its own lighting model, so it needs telling what time it is */
  col *= mix(vec3(0.10, 0.13, 0.21), vec3(1.0), clamp(uLightLevel, 0.0, 1.0));

  /* translucent backlight through the grass tips */
  vec3 viewV = normalize(cameraPosition - vWorldPos);
  float back = pow(clamp(dot(-viewV, lightN), 0.0, 1.0), 3.0);
  col += uGrassColor * vec3(1.3, 1.5, 0.7) * back * 0.22 * blade;

  /* ---- flowers of light ------------------------------------------ */
  float bloom = clamp(uBloom, 0.0, 1.0);
  if (bloom > 0.001){
    vec3 fl = vec3(0.0);
    fl += flowerField(wp, 1.7, 0.0, 0.930, t);
    fl += flowerField(wp, 3.9, 21.0, 0.955, t * 1.3) * 0.7;
    /* they prefer the lush clumps over the bare earth */
    fl *= 0.35 + 0.95 * smoothstep(0.3, 0.8, clump);
    col += fl * bloom * 1.5;
  }

  /* ---- horizon vignette ------------------------------------------ */
  float dist = length(cameraPosition.xz - vWorldPos.xz);
  float far = 1.0 - exp(-dist * 0.016);
  vec3 hazeCol = mix(vec3(0.58, 0.64, 0.58), vec3(0.72, 0.76, 0.80), 0.5);
  hazeCol *= mix(vec3(0.11, 0.14, 0.24), vec3(1.0), clamp(uLightLevel, 0.0, 1.0));
  col = mix(col, hazeCol * 0.55, clamp(far, 0.0, 0.72) * 0.6);
  /* and a gentle darkening at the very edge of sight */
  col *= mix(1.0, 0.72, smoothstep(0.55, 1.0, far));

  /* ---- the joy draining out --------------------------------------- */
  float dz = clamp(uDesaturate, 0.0, 1.0);
  if (dz > 0.001){
    float g = luma(col);
    /* not a neutral grey: a dry, chalky bone tone, with the blacks lifted
       so the ground looks bleached and dead rather than merely grey */
    vec3 bone = mix(vec3(g), vec3(0.80, 0.78, 0.71) * (0.30 + 0.70 * g), 0.55);
    bone = mix(bone, bone * vec3(1.02, 1.00, 0.93) + 0.06, 0.6);
    /* crush the contrast: everything flattens toward the middle */
    bone = mix(bone, vec3(luma(bone)) * 0.5 + bone * 0.5, 0.5);
    col = mix(col, bone, dz);
    col = mix(col, col * (1.0 - 0.18 * vnoise2(wp * 1.1)), dz * 0.6);
  }

  col = col / (1.0 + col * 0.15);
  gl_FragColor = vec4(max(col, vec3(0.0)), 1.0);
}
`;

/* ================================================================== *
 * 5. TREE — the Tree of Knowledge. Bark with something awake inside.
 * ================================================================== */

const TREE_VERT = `
varying vec3 vWorldPos;
varying vec3 vWorldNrm;
varying vec3 vObjPos;
varying vec2 vUv;

void main(){
  vUv = uv;
  vObjPos = position;
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorldPos = wp.xyz;
  vWorldNrm = normalize(normalMatrix * normal);
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`;

const TREE_FRAG = NOISE_CHUNK + `
uniform float uTime;
uniform float uTemptation;
uniform vec3  uBarkColor;
uniform vec3  uVeinColor;

varying vec3 vWorldPos;
varying vec3 vWorldNrm;
varying vec3 vObjPos;
varying vec2 vUv;

void main(){
  vec3 p = vObjPos;
  float t = uTime;
  float tempt = clamp(uTemptation, 0.0, 1.0);

  /* ---- bark ------------------------------------------------------- */
  /* radial coordinate around the trunk, so the grain wraps instead of
     sliding across the silhouette */
  float ang = atan(p.z, p.x);
  float rad = length(p.xz);
  vec3 barkP = vec3(ang * 1.6, p.y, rad * 0.7);

  float drift = fbm4(barkP * vec3(2.2, 0.55, 2.2)) * 0.5 + 0.5;
  float fibre = abs(sin(p.y * 26.0 + drift * 16.0 + ang * 2.0));
  fibre = pow(fibre, 0.55);
  float crack = ridged3(barkP * vec3(3.4, 1.1, 3.4) + 7.0);
  crack = smoothstep(0.62, 0.96, crack);
  float knots = vfbm3(barkP * 0.9) ;

  vec3 bark = uBarkColor * (0.55 + 0.75 * fibre);
  bark *= 0.70 + 0.55 * drift;
  bark = mix(bark, uBarkColor * 0.28, crack * 0.85);
  bark = mix(bark, uBarkColor * vec3(1.25, 1.05, 0.85), smoothstep(0.62, 0.95, knots) * 0.35);

  /* ---- veins ------------------------------------------------------ */
  /* slow upward creep; the flow accelerates sharply with temptation */
  float flow = t * (0.06 + 0.46 * tempt);
  vec3 veinP = vec3(ang * 1.1, p.y * 0.85 - flow, rad * 0.55);
  float vein = ridged3(veinP * vec3(2.6, 1.5, 2.6));
  /* widen and sharpen the filaments as it notices you */
  float lo = 0.80 - 0.26 * tempt;
  float hi = 0.985 - 0.09 * tempt;
  float veinMask = smoothstep(lo, hi, vein);
  /* keep veins in the cracks of the bark: light from under the surface */
  veinMask *= 0.35 + 0.95 * crack;

  /* breathing: a travelling pulse up the trunk, plus a whole-tree heartbeat */
  float rate = 0.55 + 2.4 * tempt;
  float travel = sin(p.y * 2.6 - t * rate * 1.7 + ang * 0.8);
  float heart = sin(t * rate * 0.9) * 0.5 + 0.5;
  heart = pow(heart, mix(2.0, 0.8, tempt));
  float pulse = (0.42 + 0.58 * (travel * 0.5 + 0.5)) * (0.45 + 0.75 * heart);

  vec3 veinCol = mix(uVeinColor, vec3(1.0, 0.52, 0.16), tempt * 0.85);
  veinCol = mix(veinCol, vec3(1.0, 0.86, 0.55), pow(pulse, 3.0) * tempt);
  float veinGain = mix(0.55, 3.4, tempt) * pulse;

  /* ---- shading ----------------------------------------------------- */
  vec3 nrm = normalize(vWorldNrm);
  vec3 viewV = normalize(cameraPosition - vWorldPos);
  vec3 keyDir = normalize(vec3(0.45, 0.75, 0.35));
  float lam = clamp(dot(nrm, keyDir), 0.0, 1.0);
  float wrapL = clamp((dot(nrm, keyDir) + 0.5) / 1.5, 0.0, 1.0);
  vec3 col = bark * (vec3(0.16, 0.17, 0.20) + vec3(0.95, 0.88, 0.76) * (lam * 0.55 + wrapL * 0.40));

  /* rim so the silhouette separates from the night */
  float rim = pow(1.0 - clamp(dot(nrm, viewV), 0.0, 1.0), 3.0);
  col += mix(vec3(0.28, 0.33, 0.42), veinCol, tempt) * rim * (0.22 + 0.55 * tempt);

  /* the inner light itself */
  col += veinCol * veinMask * veinGain;
  /* and its bleed into the surrounding bark */
  col += veinCol * pow(veinMask, 0.35) * 0.09 * veinGain;

  col = col / (1.0 + col * 0.28);
  gl_FragColor = vec4(max(col, vec3(0.0)), 1.0);
}
`;

/* ================================================================== *
 * 6. FRUIT — delicious and wrong.
 * ================================================================== */

const FRUIT_VERT = `
varying vec3 vWorldPos;
varying vec3 vWorldNrm;
varying vec3 vObjPos;
varying vec2 vUv;

void main(){
  vUv = uv;
  vObjPos = position;
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorldPos = wp.xyz;
  vWorldNrm = normalize(normalMatrix * normal);
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`;

const FRUIT_FRAG = NOISE_CHUNK + `
uniform float uTime;
uniform float uRipeness;
uniform vec3  uColor;
uniform vec3  uGlowColor;

varying vec3 vWorldPos;
varying vec3 vWorldNrm;
varying vec3 vObjPos;
varying vec2 vUv;

void main(){
  vec3 nrm = normalize(vWorldNrm);
  vec3 viewV = normalize(cameraPosition - vWorldPos);
  float ripe = clamp(uRipeness, 0.0, 1.0);
  float t = uTime;

  float ndv = clamp(dot(nrm, viewV), 0.0, 1.0);

  /* ---- the glow inside ------------------------------------------- */
  /* sample a little way along the view ray so the interior appears to sit
     behind the skin instead of on it */
  vec3 inner = vObjPos - viewV * 0.35;
  float cells = vfbm4(inner * 5.5 + vec3(0.0, -t * 0.09, t * 0.05));
  float veins = ridged3(inner * 7.0 + vec3(t * 0.04, 0.0, 0.0));
  float pulse = 0.5 + 0.5 * sin(t * (0.7 + 1.5 * ripe) - length(vObjPos) * 3.0);
  pulse = pow(pulse, mix(2.2, 0.9, ripe));

  float core = pow(1.0 - ndv, 0.35);           /* brightest through the middle */
  float glowAmt = (0.30 + 0.70 * cells) * (0.45 + 0.85 * pulse);
  glowAmt *= mix(0.45, 1.65, ripe);

  /* ---- skin ------------------------------------------------------- */
  vec3 skin = uColor * (0.55 + 0.55 * cells);
  skin = mix(skin, uColor * vec3(1.35, 0.75, 0.55), smoothstep(0.55, 0.95, veins) * 0.5);
  float lam = clamp(dot(nrm, normalize(vec3(0.4, 0.8, 0.45))), 0.0, 1.0);
  vec3 col = skin * (vec3(0.14, 0.09, 0.10) + vec3(0.9, 0.7, 0.65) * (0.3 + 0.7 * lam));

  /* translucency: the deep red lights up where the fruit is thin */
  vec3 deepGlow = mix(uColor * vec3(1.8, 0.55, 0.35), uGlowColor, 0.45 + 0.4 * ripe);
  col += deepGlow * glowAmt * (0.35 + 0.95 * (1.0 - ndv) * core);

  /* a bright, slightly too-clean rim */
  float rim = pow(1.0 - ndv, 3.2);
  col += mix(uGlowColor, vec3(1.0, 0.94, 0.80), 0.35) * rim * (0.65 + 1.5 * ripe);

  /* wet specular highlight */
  vec3 half1 = normalize(normalize(vec3(0.4, 0.8, 0.45)) + viewV);
  col += vec3(1.0, 0.96, 0.90) * pow(max(dot(nrm, half1), 0.0), 90.0) * (0.5 + ripe);

  /* the wrongness: a thin cold line riding just inside the rim */
  float wrongBand = smoothstep(0.78, 0.96, rim) * smoothstep(1.0, 0.86, rim);
  col += vec3(0.35, 0.95, 0.62) * wrongBand * ripe * 0.35 * (0.4 + 0.6 * pulse);

  col = col / (1.0 + col * 0.20);
  float alpha = clamp(0.82 + 0.18 * (1.0 - ndv) + 0.1 * ripe, 0.0, 1.0);
  gl_FragColor = vec4(max(col, vec3(0.0)), alpha);
}
`;

/* ================================================================== *
 * 7. DUST — afar min ha-adamah. Points assembling into a figure.
 * ================================================================== */

const DUST_VERT = NOISE_CHUNK + `
attribute float aSeed;
attribute vec3 aTarget;

uniform float uTime;
uniform float uForm;
uniform float uBreath;
uniform float uSize;

varying float vSeed;
varying float vFormed;
varying float vGlow;

void main(){
  float t = uTime;
  vSeed = aSeed;

  /* ---- the scattered, swirling cloud ----------------------------- */
  float spin = t * (0.08 + 0.42 * aSeed);
  vec3 cloud = position;
  cloud.xz = rot2(spin) * cloud.xz;
  /* a slow turbulent drift so the loose motes never look keyframed */
  vec3 turb = vec3(
    vfbm3(cloud * 0.22 + vec3(t * 0.07, 0.0, aSeed * 13.0)),
    vfbm3(cloud * 0.22 + vec3(0.0, t * 0.05, aSeed * 7.0 + 31.0)),
    vfbm3(cloud * 0.22 + vec3(aSeed * 5.0, 0.0, t * 0.06 + 11.0))
  ) * 2.0 - 1.0;
  cloud += turb * (1.6 + 2.4 * aSeed);
  cloud.y += sin(t * (0.3 + aSeed) + aSeed * TAU) * 0.5;

  /* ---- ragged assembly ------------------------------------------- */
  /* each mote has its own start time and its own speed, so the figure
     knits together unevenly instead of snapping into place */
  float delay = aSeed * 0.55;
  float speed = 1.0 / mix(0.35, 1.0, hash11(aSeed * 91.7));
  float f = clamp((clamp(uForm, 0.0, 1.0) * 1.62 - delay) * speed, 0.0, 1.0);
  f = f * f * (3.0 - 2.0 * f);

  /* drag: mid-flight the mote lags behind its own lerp, so the stream bends
     instead of running dead straight, and the lag vanishes as it settles */
  float arc = sin(f * PI) * (1.0 - f) * 0.33;
  vec3 toward = aTarget - cloud;
  vec3 pos = mix(cloud, aTarget, f) - normalize(toward + 0.0001) * arc;

  /* once settled, a tiny shiver that stills as the breath arrives */
  float shiver = (1.0 - clamp(uBreath, 0.0, 1.0)) * 0.035 * f;
  pos += (hash33(aTarget * 7.0 + floor(t * 6.0)) * 2.0 - 1.0) * shiver;

  vFormed = f;
  /* motes still in flight glint; assembled motes take the breath instead */
  vGlow = mix(0.35 + 0.65 * (0.5 + 0.5 * sin(t * (2.0 + 6.0 * aSeed) + aSeed * TAU)),
              1.0, f * clamp(uBreath, 0.0, 1.0));

  vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
  float dist = max(-mvPos.z, 0.001);
  float sz = uSize * (0.55 + 0.85 * aSeed) * (1.0 - 0.25 * f);
  gl_PointSize = max(1.0, sz * 300.0 / dist);
  gl_Position = projectionMatrix * mvPos;
}
`;

const DUST_FRAG = NOISE_CHUNK + `
uniform float uTime;
uniform float uForm;
uniform float uBreath;
uniform vec3  uColor;
uniform vec3  uBreathColor;

varying float vSeed;
varying float vFormed;
varying float vGlow;

void main(){
  vec2 pc = gl_PointCoord - 0.5;
  float r = length(pc);
  if (r > 0.5) discard;

  /* soft round mote with a denser centre */
  float a = smoothstep(0.5, 0.06, r);
  a *= a;
  a += smoothstep(0.18, 0.0, r) * 0.45;

  /* warm earth, varied per mote */
  vec3 col = uColor * (0.68 + 0.62 * vSeed);
  col = mix(col, uColor * vec3(1.25, 1.05, 0.78), hash11(vSeed * 37.0));
  col *= 0.55 + 0.95 * vGlow;

  /* and the breath of life floods the assembled figure */
  float breath = clamp(uBreath, 0.0, 1.0) * vFormed;
  float wave = 0.5 + 0.5 * sin(uTime * 1.6 - vSeed * 4.0);
  col = mix(col, uBreathColor, breath * (0.55 + 0.45 * wave));
  col += uBreathColor * breath * 0.9 * (0.4 + 0.6 * wave);
  a = clamp(a * (0.55 + 0.55 * vGlow + 0.5 * breath), 0.0, 1.0);

  /* loose motes are fainter than settled ones */
  a *= mix(0.55, 1.0, vFormed);
  if (a < 0.004) discard;

  gl_FragColor = vec4(max(col, vec3(0.0)), a);
}
`;

/* ================================================================== *
 * 8. GLORY — presence. Additive cone or sphere.
 * ================================================================== */

const GLORY_VERT = `
varying vec3 vObjPos;
varying vec3 vWorldPos;
varying vec3 vWorldNrm;
varying vec2 vUv;

void main(){
  vUv = uv;
  vObjPos = position;
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorldPos = wp.xyz;
  vWorldNrm = normalize(normalMatrix * normal);
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`;

const GLORY_FRAG = NOISE_CHUNK + `
uniform float uTime;
uniform float uIntensity;
uniform vec3  uColor;
uniform float uRays;

varying vec3 vObjPos;
varying vec3 vWorldPos;
varying vec3 vWorldNrm;
varying vec2 vUv;

void main(){
  float t = uTime;
  /* scale-independent: everything is derived from the object-space direction,
     so the same material works on a cone, a sphere or anything else */
  vec3 d = normalize(vObjPos + vec3(0.00001));
  float axis = clamp(abs(d.y), 0.0, 1.0);
  float ang = atan(d.z, d.x);

  /* ---- god rays ---------------------------------------------------- */
  float spin = t * 0.09;
  float wob = fbm3(vec3(d.xz * 2.4, t * 0.13)) * 0.55;
  float phase = ang * max(uRays, 1.0) + spin * max(uRays, 1.0) * 0.35 + wob * 3.0;
  float rays = 0.5 + 0.5 * sin(phase);
  rays = pow(rays, 2.4);
  /* a slower counter-rotating set keeps the pattern from reading as a fan */
  float rays2 = 0.5 + 0.5 * sin(-ang * max(uRays * 0.5, 1.0) + t * 0.05 + wob * 2.0);
  rays = mix(rays, rays * (0.45 + 0.75 * pow(rays2, 2.0)), 0.6);
  /* rays converge on the axis */
  rays = mix(rays, 1.0, pow(axis, 2.0) * 0.85);

  /* ---- shell glow: brightest where the surface is edge-on ---------- */
  vec3 nrm = normalize(vWorldNrm);
  vec3 viewV = normalize(cameraPosition - vWorldPos);
  float ndv = clamp(abs(dot(nrm, viewV)), 0.0, 1.0);
  float volume = pow(1.0 - ndv, 1.6) * 0.75 + 0.25;

  /* ---- bright core along the axis ---------------------------------- */
  float core = pow(axis, 7.0) * 1.6 + pow(axis, 2.0) * 0.35;

  /* ---- no hard edges: fade the geometry boundary, but never to zero
          in the middle, so a sphere does not lose its poles -------- */
  float soft = smoothstep(0.0, 0.22, vUv.y) * smoothstep(1.0, 0.78, vUv.y);
  soft = 0.28 + 0.72 * soft;

  float flicker = 0.85 + 0.15 * vfbm3(vec3(d * 3.0 + t * 0.25));

  float glow = (0.22 + 0.95 * rays) * volume * soft * flicker;
  glow += core * 0.9 * flicker;
  glow *= max(uIntensity, 0.0);

  vec3 col = uColor * glow;
  /* the hottest parts bleach toward white */
  col = mix(col, vec3(1.0), clamp(glow - 1.1, 0.0, 1.0) * 0.6);

  float a = clamp(glow * 0.9, 0.0, 1.0);
  if (a < 0.002) discard;
  gl_FragColor = vec4(max(col, vec3(0.0)), a);
}
`;

/* ================================================================== *
 * 9. FLAME_SWORD — lahat ha-herev ha-mithapekhet.
 * ================================================================== */

const SWORD_VERT = `
varying vec2 vUv;
varying vec3 vObjPos;
varying vec3 vWorldPos;

void main(){
  vUv = uv;
  vObjPos = position;
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorldPos = wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`;

const SWORD_FRAG = NOISE_CHUNK + `
uniform float uTime;
uniform float uIntensity;
uniform float uTurn;
uniform vec3  uCoreColor;
uniform vec3  uEdgeColor;

varying vec2 vUv;
varying vec3 vObjPos;
varying vec3 vWorldPos;

void main(){
  float t = uTime;
  vec2 q = vUv;

  /* ---- the ever-turning distortion --------------------------------- */
  /* the blade twists about its own axis: the cross-section is sheared by a
     phase that travels up the length and rotates with time */
  float turnPh = q.y * 4.2 - t * max(uTurn, 0.0) * 1.7;
  float twist = sin(turnPh) * (0.10 + 0.14 * q.y);
  float twist2 = sin(turnPh * 0.47 + 1.7) * 0.06;
  q.x += twist + twist2;

  /* ---- blade silhouette -------------------------------------------- */
  float x = (q.x - 0.5) * 2.0;
  float taper = smoothstep(0.0, 0.14, q.y) * (1.0 - smoothstep(0.52, 1.0, q.y));
  taper = pow(clamp(taper, 0.0, 1.0), 0.75);
  float width = max(taper, 0.0015);
  float across = abs(x) / width;

  /* ---- vertical flow ------------------------------------------------ */
  float rise = t * 1.65;
  float n1 = vfbm3(vec3(q.x * 5.0, q.y * 2.6 - rise, t * 0.33));
  float n2 = vfbm3(vec3(q.x * 11.0 + 7.0, q.y * 5.4 - rise * 1.7, t * 0.55));
  float n3 = ridged3(vec3(q.x * 7.0, q.y * 3.1 - rise * 1.25, t * 0.21));
  float flow = n1 * 0.6 + n2 * 0.4;

  /* the licking edge: noise eats into the silhouette */
  float eaten = across + (flow - 0.5) * 1.15 + (1.0 - n3) * 0.35;
  float body = 1.0 - smoothstep(0.25, 1.05, eaten);
  body = clamp(body, 0.0, 1.0);

  /* tongues of fire breaking off past the tip */
  float tongues = (1.0 - smoothstep(0.0, 0.55, abs(x))) * smoothstep(0.55, 1.0, q.y)
                * smoothstep(0.45, 0.85, n2) * 0.7;
  body = max(body, tongues * (1.0 - smoothstep(0.88, 1.0, q.y)));

  /* ---- heat ramp: white core, orange body, dark ember fringe -------- */
  float heat = pow(clamp(1.0 - eaten * 0.85, 0.0, 1.0), 1.5);
  heat *= 0.55 + 0.75 * flow;
  heat += pow(clamp(1.0 - across * 1.6, 0.0, 1.0), 4.0) * 0.9;

  vec3 ember = uEdgeColor * 0.22;
  vec3 col = mix(ember, uEdgeColor, smoothstep(0.02, 0.42, heat));
  col = mix(col, mix(uEdgeColor, uCoreColor, 0.55), smoothstep(0.38, 0.78, heat));
  col = mix(col, uCoreColor, smoothstep(0.72, 1.15, heat));
  col = mix(col, vec3(1.0), clamp(heat - 1.05, 0.0, 1.0) * 0.75);

  /* ---- flicker ------------------------------------------------------ */
  float fl = 0.80
           + 0.14 * sin(t * 19.0 + q.y * 7.0)
           + 0.12 * (vnoise2(vec2(q.y * 3.0, t * 7.0)) - 0.5) * 2.0;
  fl = clamp(fl, 0.45, 1.3);

  float a = body * fl * clamp(uIntensity, 0.0, 4.0);
  /* a halo of heat around the blade so it never has a cut edge */
  float halo = (1.0 - smoothstep(0.0, 2.6, across)) * taper * 0.16 * flow;
  a = clamp(a + halo * clamp(uIntensity, 0.0, 4.0), 0.0, 1.0);
  col *= 0.6 + 1.1 * body * fl;

  if (a < 0.003) discard;
  gl_FragColor = vec4(max(col * clamp(uIntensity, 0.0, 4.0), vec3(0.0)), a);
}
`;

/* ================================================================== *
 * 10. VEIL — fullscreen overlay.
 * ================================================================== */

const VEIL_VERT = `
varying vec2 vUv;

void main(){
  vUv = uv;
  /* standard transform: works both for a quad under an identity camera and
     for a plane parented to an orthographic overlay scene */
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const VEIL_FRAG = NOISE_CHUNK + `
uniform float uTime;
uniform float uFade;
uniform vec3  uColor;
uniform float uVignette;
uniform float uGrain;
uniform float uRipple;
uniform vec2  uResolution;

varying vec2 vUv;

void main(){
  float t = uTime;
  vec2 res = max(uResolution, vec2(1.0));
  float aspect = res.x / res.y;

  vec2 p = vUv - 0.5;
  p.x *= aspect;
  float r = length(p);
  vec2 rdir = r > 0.0001 ? p / r : vec2(0.0);

  /* ---- revelation ripple ------------------------------------------- */
  float rp = clamp(uRipple, 0.0, 1.0);
  float ring = sin(r * 34.0 - t * 2.6) * exp(-r * 2.1);
  float ring2 = sin(r * 17.0 - t * 1.4 + 1.1) * exp(-r * 1.3);
  float wave = (ring * 0.7 + ring2 * 0.5) * rp;

  /* the displaced sampling point, used for everything that follows, so the
     whole overlay appears to bend */
  vec2 duv = vUv + rdir * wave * 0.045;

  /* chromatic separation along the ripple, which is what sells it as a
     distortion rather than as a drawn ring */
  float sep = wave * 0.012;
  float gR = vfbm2((duv + rdir * sep) * 3.0 + t * 0.05);
  float gG = vfbm2(duv * 3.0 + t * 0.05);
  float gB = vfbm2((duv - rdir * sep) * 3.0 + t * 0.05);
  vec3 bend = vec3(gR, gG, gB);

  float ringGlow = pow(clamp(abs(wave), 0.0, 1.0), 1.6) * rp;

  /* ---- vignette ------------------------------------------------------ */
  float vr = length((duv - 0.5) * vec2(aspect, 1.0));
  float vig = smoothstep(0.32, 0.86, vr);
  vig = pow(vig, 1.4);

  /* ---- grain --------------------------------------------------------- */
  vec2 gcoord = floor(duv * res / max(1.0, floor(res.y / 540.0) + 1.0));
  float gn = hash13(vec3(gcoord, floor(t * 24.0)));
  float grain = (gn - 0.5) * 2.0;

  /* ---- composite ----------------------------------------------------- */
  vec3 col = uColor;
  col = mix(col, col * (0.85 + 0.3 * bend), rp * 0.8);
  col = mix(col, vec3(1.0, 0.97, 0.90), clamp(ringGlow * 1.2, 0.0, 0.9));
  col += grain * clamp(uGrain, 0.0, 1.0) * 0.09;

  float a = clamp(uFade, 0.0, 1.0);
  a += vig * clamp(uVignette, 0.0, 1.0) * (1.0 - a * 0.55);
  a += ringGlow * 0.55;
  a += abs(grain) * clamp(uGrain, 0.0, 1.0) * 0.07 * (1.0 - a);
  a = clamp(a, 0.0, 1.0);

  col += ditherMask(gl_FragCoord.xy);
  gl_FragColor = vec4(saturate3(col), a);
}
`;

/* ================================================================== *
 * Descriptors.
 * ================================================================== */

export const SHADERS = {
  /* The void before the first day. Draw on the inside of a huge sphere. */
  TOHU: {
    vertexShader: TOHU_VERT,
    fragmentShader: TOHU_FRAG,
    uniforms: {
      uTime:   { value: 0 },                 // seconds, monotonic
      uChaos:  { value: 0.65 },              // 0..1 — calm deep to violent churn
      uLight:  { value: 0.0 },               // 0..1 — the first light bleeding in
      uSpirit: { value: 0.0 },               // 0..1 — the hovering luminance
    },
    side: 'back',
    transparent: false,
    depthWrite: false,
  },

  /* Sky dome. Draw on the inside of a large sphere, depth-write off. */
  FIRMAMENT: {
    vertexShader: FIRMAMENT_VERT,
    fragmentShader: FIRMAMENT_FRAG,
    uniforms: {
      uTime:         { value: 0 },                        // seconds
      uSunDir:       { value: [0.3, 0.6, -0.74] },        // normalized world direction to the sun
      uMoonDir:      { value: [-0.45, 0.42, 0.79] },      // normalized world direction to the moon
      uDayNight:     { value: 1.0 },                      // 0 = night, 1 = full day
      uStars:        { value: 0.0 },                      // 0..1 star field visibility
      uHaze:         { value: 0.45 },                     // 0..1 — thickness of the horizon haze band
      uTopColor:     { value: [0.16, 0.38, 0.78] },       // zenith colour by day, linear rgb
      uHorizonColor: { value: [0.72, 0.80, 0.90] },       // horizon colour by day, linear rgb
      uNightColor:   { value: [0.016, 0.026, 0.062] },    // base night sky colour, linear rgb
    },
    side: 'back',
    transparent: false,
    depthWrite: false,
  },

  /* Wide water plane. Needs a subdivided geometry — about 1 vertex per metre. */
  WATER: {
    vertexShader: WATER_VERT,
    fragmentShader: WATER_FRAG,
    uniforms: {
      uTime:         { value: 0 },                     // seconds
      uSunDir:       { value: [0.3, 0.6, -0.74] },     // normalized world direction to the sun
      uDeepColor:    { value: [0.012, 0.055, 0.085] }, // colour looking straight down into it
      uShallowColor: { value: [0.08, 0.30, 0.34] },    // colour at the wave slopes
      uAmplitude:    { value: 0.55 },                  // metres, height of the dominant wave
      uChoppiness:   { value: 0.6 },                   // 0..1 — round swell to pinched crests
      uGlitter:      { value: 0.8 },                   // 0..1+ — density of the sun sparkle
    },
    side: 'front',
    transparent: false,
    depthWrite: true,
  },

  /* Garden floor. Works on a large plane or a gently displaced mesh. */
  EDEN_GROUND: {
    vertexShader: EDEN_VERT,
    fragmentShader: EDEN_FRAG,
    uniforms: {
      uTime:        { value: 0 },                    // seconds
      uBloom:       { value: 0.0 },                  // 0..1 — flowers of light fading in
      uDesaturate:  { value: 0.0 },                  // 0..1 — Eden's joy draining out
      uGrassColor:  { value: [0.13, 0.34, 0.12] },   // base grass, linear rgb
      uSoilColor:   { value: [0.22, 0.15, 0.10] },   // bare earth showing through, linear rgb
      uLightDir:    { value: [0.35, 0.85, 0.40] },   // normalized world direction toward the key light
      uLightLevel:  { value: 1.0 },                  // 0..1 — night to full day
    },
    side: 'front',
    transparent: false,
    depthWrite: true,
  },

  /* Tree of Knowledge. Best on a trunk roughly centred on the object origin. */
  TREE: {
    vertexShader: TREE_VERT,
    fragmentShader: TREE_FRAG,
    uniforms: {
      uTime:       { value: 0 },                   // seconds
      uTemptation: { value: 0.0 },                 // 0..1 — veins pulse warmer, brighter, faster
      uBarkColor:  { value: [0.085, 0.065, 0.055] }, // dark bark base, linear rgb
      uVeinColor:  { value: [0.55, 0.30, 0.95] },  // resting vein light, linear rgb
    },
    side: 'front',
    transparent: false,
    depthWrite: true,
  },

  /* The fruit. A small sphere; pairs well with a bloom pass. */
  FRUIT: {
    vertexShader: FRUIT_VERT,
    fragmentShader: FRUIT_FRAG,
    uniforms: {
      uTime:      { value: 0 },                  // seconds
      uRipeness:  { value: 0.5 },                // 0..1 — intensifies glow, rim and pulse
      uColor:     { value: [0.42, 0.045, 0.06] },// deep skin red, linear rgb
      uGlowColor: { value: [1.0, 0.62, 0.22] },  // internal gold, linear rgb
    },
    side: 'front',
    transparent: true,
    depthWrite: true,
  },

  /* Dust forming Adam. Points geometry with aSeed (float) and aTarget (vec3).
     Engine should pass blending: THREE.AdditiveBlending. */
  DUST: {
    vertexShader: DUST_VERT,
    fragmentShader: DUST_FRAG,
    uniforms: {
      uTime:        { value: 0 },                 // seconds
      uForm:        { value: 0.0 },               // 0..1 — scattered cloud to assembled figure
      uBreath:      { value: 0.0 },               // 0..1 — the breath of life flooding the figure
      uSize:        { value: 0.06 },              // world-ish point size before distance attenuation
      uColor:       { value: [0.52, 0.34, 0.20] },// warm earth dust, linear rgb
      uBreathColor: { value: [1.0, 0.90, 0.68] }, // colour the breath floods it with, linear rgb
    },
    side: 'front',
    transparent: true,
    depthWrite: false,
    blending: 'additive',
  },

  /* Divine presence. Cone or sphere, additive, depth-write off.
     Engine should pass blending: THREE.AdditiveBlending. */
  GLORY: {
    vertexShader: GLORY_VERT,
    fragmentShader: GLORY_FRAG,
    uniforms: {
      uTime:      { value: 0 },                 // seconds
      uIntensity: { value: 1.0 },               // 0..3 — overall brightness of the presence
      uColor:     { value: [1.0, 0.93, 0.74] }, // light colour, linear rgb
      uRays:      { value: 14.0 },              // ray count, 4..40, as a float
    },
    side: 'double',
    transparent: true,
    depthWrite: false,
    blending: 'additive',
  },

  /* The flaming ever-turning sword. A tall plane or thin box with uv.y
     running 0 at the hilt to 1 past the tip. Additive, depth-write off. */
  FLAME_SWORD: {
    vertexShader: SWORD_VERT,
    fragmentShader: SWORD_FRAG,
    uniforms: {
      uTime:      { value: 0 },                 // seconds
      uIntensity: { value: 1.3 },               // 0..4 — brightness and alpha of the blade
      uTurn:      { value: 1.0 },               // turning speed of the twist, 0..4
      uCoreColor: { value: [1.0, 0.97, 0.86] }, // white-hot core, linear rgb
      uEdgeColor: { value: [1.0, 0.38, 0.06] }, // orange body fading to ember, linear rgb
    },
    side: 'double',
    transparent: true,
    depthWrite: false,
    blending: 'additive',
  },

  /* Fullscreen overlay quad drawn last, over everything. */
  VEIL: {
    vertexShader: VEIL_VERT,
    fragmentShader: VEIL_FRAG,
    uniforms: {
      uTime:       { value: 0 },             // seconds
      uFade:       { value: 0.0 },           // 0 = clear, 1 = fully opaque uColor
      uColor:      { value: [0.0, 0.0, 0.0] },// overlay colour, linear rgb
      uVignette:   { value: 0.35 },          // 0..1 — strength of the edge darkening
      uGrain:      { value: 0.25 },          // 0..1 — film grain amount
      uRipple:     { value: 0.0 },           // 0..1 — radial distortion at moments of revelation
      uResolution: { value: [1920, 1080] },  // drawing buffer size in pixels
    },
    side: 'front',
    transparent: true,
    depthWrite: false,
  },
};

export default SHADERS;
