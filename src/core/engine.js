// Renderer, camera rig, post-processing stack and the master frame loop.

import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { clock, clamp, lerp, ease, dpr, isMobile, makeRng } from './utils.js';
import { makeMaterial, setU, tickMaterials, hasShader } from './materials.js';

const rng = makeRng(90210);

/* ───────────────────────── camera rig ───────────────────────── */

class Rig {
  constructor(camera) {
    this.cam = camera;
    this.pos = new THREE.Vector3(0, 1.7, 6);
    this.target = new THREE.Vector3(0, 1.4, 0);
    this.up = new THREE.Vector3(0, 1, 0);
    this.roll = 0;
    this.fov = 55;

    this.drift = 0.35;          // handheld amount
    this.shakeAmt = 0;
    this.shakeDecay = 1.6;
    this.parallax = 0.0;        // pointer-driven look offset
    this._ptr = new THREE.Vector2();
    this._ptrSmooth = new THREE.Vector2();
    this._t = 0;

    this._noiseSeed = rng.range(0, 1000);

    window.addEventListener('pointermove', e => {
      this._ptr.set((e.clientX / innerWidth) * 2 - 1, (e.clientY / innerHeight) * 2 - 1);
    }, { passive: true });
  }

  /** Cinematic move. Positions are plain arrays or Vector3s. */
  async moveTo(pos, target, dur = 3, easing = ease.inOutCubic) {
    const p0 = this.pos.clone(), t0 = this.target.clone();
    const p1 = Array.isArray(pos) ? new THREE.Vector3(...pos) : pos.clone();
    const t1 = Array.isArray(target) ? new THREE.Vector3(...target) : target.clone();
    await clock.to(dur, e => {
      this.pos.lerpVectors(p0, p1, e);
      this.target.lerpVectors(t0, t1, e);
    }, easing);
  }

  /** Arc the camera around its target — far more alive than a straight dolly. */
  async arcTo(pos, target, dur = 4, lift = 1.4, easing = ease.inOutCubic) {
    const p0 = this.pos.clone(), t0 = this.target.clone();
    const p1 = Array.isArray(pos) ? new THREE.Vector3(...pos) : pos.clone();
    const t1 = Array.isArray(target) ? new THREE.Vector3(...target) : target.clone();
    const mid = p0.clone().add(p1).multiplyScalar(.5);
    mid.y += lift;
    await clock.to(dur, e => {
      const a = p0.clone().lerp(mid, e), b = mid.clone().lerp(p1, e);
      this.pos.copy(a.lerp(b, e));
      this.target.lerpVectors(t0, t1, e);
    }, easing);
  }

  async zoom(fov, dur = 2, easing = ease.inOutCubic) {
    const f0 = this.fov;
    await clock.to(dur, e => { this.fov = lerp(f0, fov, e); }, easing);
  }

  async rollTo(r, dur = 2) {
    const r0 = this.roll;
    await clock.to(dur, e => { this.roll = lerp(r0, r, e); }, ease.inOutCubic);
  }

  snap(pos, target) {
    if (pos) this.pos.copy(Array.isArray(pos) ? new THREE.Vector3(...pos) : pos);
    if (target) this.target.copy(Array.isArray(target) ? new THREE.Vector3(...target) : target);
  }

  shake(amount = .4, decay = 1.6) { this.shakeAmt = Math.max(this.shakeAmt, amount); this.shakeDecay = decay; }

  update(dt) {
    this._t += dt;
    const t = this._t + this._noiseSeed;

    // handheld breathing — tiny, irregular, never periodic enough to notice
    const dx = (Math.sin(t * .37) * .6 + Math.sin(t * .91) * .25 + Math.sin(t * 1.73) * .12) * .05 * this.drift;
    const dy = (Math.cos(t * .29) * .6 + Math.sin(t * .83) * .22) * .045 * this.drift;
    const dz = Math.sin(t * .21) * .03 * this.drift;

    // pointer parallax
    this._ptrSmooth.lerp(this._ptr, 1 - Math.pow(.001, dt));
    const px = this._ptrSmooth.x * this.parallax;
    const py = -this._ptrSmooth.y * this.parallax * .6;

    // shake
    let sx = 0, sy = 0, sz = 0;
    if (this.shakeAmt > 0.0001) {
      const a = this.shakeAmt;
      sx = (rng() - .5) * a; sy = (rng() - .5) * a; sz = (rng() - .5) * a * .5;
      this.shakeAmt = Math.max(0, this.shakeAmt - this.shakeDecay * dt * this.shakeAmt + -0.0);
      this.shakeAmt *= Math.pow(.08, dt * this.shakeDecay);
    }

    this.cam.position.set(this.pos.x + dx + px + sx, this.pos.y + dy + py + sy, this.pos.z + dz + sz);
    this.cam.up.set(Math.sin(this.roll), Math.cos(this.roll), 0);
    this.cam.lookAt(this.target);
    if (Math.abs(this.cam.fov - this.fov) > .01) {
      this.cam.fov = lerp(this.cam.fov, this.fov, 1 - Math.pow(.02, dt));
      this.cam.updateProjectionMatrix();
    }
  }
}

/* ───────────────────────── engine ───────────────────────── */

export class Engine {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({
      canvas, antialias: !isMobile(), powerPreference: 'high-performance',
      stencil: false, alpha: false,
    });
    this.renderer.setPixelRatio(dpr());
    this.renderer.setSize(innerWidth, innerHeight);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.shadowMap.enabled = !isMobile();
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.autoClear = true;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x02030a);

    this.camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 4000);
    this.camera.position.set(0, 1.7, 6);
    this.rig = new Rig(this.camera);

    // post stack
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.45, 0.62, 0.82);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());

    // fullscreen veil (drawn after everything, in its own ortho scene)
    this.veilScene = new THREE.Scene();
    this.veilCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.veilMat = makeMaterial('VEIL', {
      transparent: true, depthWrite: false, depthTest: false, toneMapped: false,
      fallback: new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0, depthTest: false }),
    });
    this.hasVeilShader = hasShader('VEIL');
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.veilMat);
    quad.frustumCulled = false;
    this.veilScene.add(quad);
    this.veil = { fade: 0, ripple: 0, grain: 0.03, vignette: 0.35 };

    this.lights = {};
    this._setupBaseLights();

    this.elapsed = 0;
    this._raf = 0;
    this._last = performance.now();
    this._onFrame = [];
    this._running = false;
    this._quality = 1;
    this._frameAcc = 0; this._frameCount = 0;

    addEventListener('resize', () => this.resize(), { passive: true });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.pause(); else this.resume();
    });
  }

  _setupBaseLights() {
    const amb = new THREE.AmbientLight(0x404a66, 0.25);
    const hemi = new THREE.HemisphereLight(0x8fa5c8, 0x2b2318, 0.0);
    const key = new THREE.DirectionalLight(0xfff0d8, 0.0);
    key.position.set(12, 18, 8);
    key.castShadow = !isMobile();
    if (key.shadow) {
      key.shadow.mapSize.set(2048, 2048);
      key.shadow.camera.near = 1; key.shadow.camera.far = 90;
      key.shadow.camera.left = -34; key.shadow.camera.right = 34;
      key.shadow.camera.top = 34; key.shadow.camera.bottom = -34;
      key.shadow.bias = -0.0006; key.shadow.normalBias = 0.03;
    }
    const rim = new THREE.DirectionalLight(0x6f8cff, 0.0);
    rim.position.set(-10, 6, -12);
    this.scene.add(amb, hemi, key, rim, key.target);
    this.lights = { amb, hemi, key, rim };
  }

  resize() {
    const w = innerWidth, h = innerHeight;
    this.renderer.setPixelRatio(dpr() * this._quality);
    this.renderer.setSize(w, h);
    this.composer.setSize(w, h);
    this.bloom.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    setU(this.veilMat, 'uResolution', [w, h]);
  }

  onFrame(fn) { this._onFrame.push(fn); return () => { const i = this._onFrame.indexOf(fn); if (i >= 0) this._onFrame.splice(i, 1); }; }

  start() {
    if (this._running) return;
    this._running = true;
    this._last = performance.now();
    const loop = (now) => {
      this._raf = requestAnimationFrame(loop);
      let dt = (now - this._last) / 1000;
      this._last = now;
      if (dt > 0.1) dt = 0.1;                   // tab-switch guard
      this.elapsed += dt;

      clock.update(dt);
      this.rig.update(dt);
      tickMaterials(this.elapsed);
      for (const f of this._onFrame) f(dt, this.elapsed);

      setU(this.veilMat, 'uTime', this.elapsed);
      setU(this.veilMat, 'uFade', this.veil.fade);
      setU(this.veilMat, 'uRipple', this.veil.ripple);
      setU(this.veilMat, 'uGrain', this.veil.grain);
      setU(this.veilMat, 'uVignette', this.veil.vignette);
      if (!this.hasVeilShader && this.veilMat.opacity !== undefined) this.veilMat.opacity = this.veil.fade;

      this.composer.render();
      if (this.veil.fade > 0.001 || this.veil.ripple > 0.001 || this.hasVeilShader) {
        const ac = this.renderer.autoClear;
        this.renderer.autoClear = false;
        this.renderer.clearDepth();
        this.renderer.render(this.veilScene, this.veilCam);
        this.renderer.autoClear = ac;
      }

      this._adaptQuality(dt);
    };
    this._raf = requestAnimationFrame(loop);
  }

  // Gentle automatic resolution scaling so weaker machines stay cinematic.
  _adaptQuality(dt) {
    this._frameAcc += dt; this._frameCount++;
    if (this._frameAcc < 2) return;
    const avg = this._frameAcc / this._frameCount;
    this._frameAcc = 0; this._frameCount = 0;
    if (avg > 1 / 32 && this._quality > 0.6) { this._quality -= 0.12; this.resize(); }
    else if (avg < 1 / 55 && this._quality < 1) { this._quality = Math.min(1, this._quality + 0.08); this.resize(); }
  }

  pause() { if (this._raf) { cancelAnimationFrame(this._raf); this._raf = 0; this._running = false; } }
  resume() { if (!this._running) { this._last = performance.now(); this.start(); } }

  /* ── cinematic helpers ── */

  async fadeTo(v, dur = 1.5, easing = ease.inOutQuad) {
    const f0 = this.veil.fade;
    await clock.to(dur, e => { this.veil.fade = lerp(f0, v, e); }, easing);
  }
  async fadeOut(dur = 1.5) { return this.fadeTo(1, dur); }
  async fadeIn(dur = 2) { return this.fadeTo(0, dur); }

  async ripple(peak = 1, dur = 2.4) {
    await clock.to(dur, e => { this.veil.ripple = Math.sin(e * Math.PI) * peak; }, ease.linear);
    this.veil.ripple = 0;
  }

  setVeilColor(hex) { setU(this.veilMat, 'uColor', new THREE.Color(hex)); }

  flash(color = '#ffffff', dur = 0.9, peak = 1) {
    let el = document.querySelector('.flash');
    if (!el) { el = document.createElement('div'); el.className = 'flash'; document.body.appendChild(el); }
    el.style.background = color;
    el.style.transition = 'none';
    el.style.opacity = String(peak);
    requestAnimationFrame(() => {
      el.style.transition = `opacity ${dur}s cubic-bezier(.22,.61,.36,1)`;
      el.style.opacity = '0';
    });
  }

  async bloomTo(strength, radius, threshold, dur = 2) {
    const s0 = this.bloom.strength, r0 = this.bloom.radius, t0 = this.bloom.threshold;
    await clock.to(dur, e => {
      this.bloom.strength = lerp(s0, strength, e);
      if (radius != null) this.bloom.radius = lerp(r0, radius, e);
      if (threshold != null) this.bloom.threshold = lerp(t0, threshold, e);
    }, ease.inOutCubic);
  }

  async exposureTo(v, dur = 2) {
    const e0 = this.renderer.toneMappingExposure;
    await clock.to(dur, e => { this.renderer.toneMappingExposure = lerp(e0, v, e); }, ease.inOutCubic);
  }

  /** Remove everything an act added, freeing GPU memory. */
  clearScene(keepLights = true) {
    const keep = keepLights ? new Set(Object.values(this.lights)) : new Set();
    if (keepLights && this.lights.key) keep.add(this.lights.key.target);
    for (let i = this.scene.children.length - 1; i >= 0; i--) {
      const o = this.scene.children[i];
      if (keep.has(o)) continue;
      this.scene.remove(o);
      disposeTree(o);
    }
    this.scene.fog = null;
  }
}

export function disposeTree(root) {
  root.traverse?.(o => {
    if (o.geometry) o.geometry.dispose?.();
    const m = o.material;
    if (Array.isArray(m)) m.forEach(x => x?.dispose?.());
    else m?.dispose?.();
  });
}
