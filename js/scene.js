/* ==========================================================================
   HYAICO — The stage (Three.js)
   One particle system, tens of thousands of points, morphing between forms
   as the page scrolls:
     0 wordmark  — the HYAICO logo, sampled from the real logo path
     1 planet    — a glowing horizon beneath the hero title
     2 helix     — a double helix
     3 galaxy    — a spiral galaxy
     4 halo      — a ring of light around a modelled phone running Just Cooked
   The loader hands over to the particle wordmark with a burst, which then
   becomes the planet. Camera moves and swirl are scrubbed by scroll. The
   phone shows the app's screens cross-fading as the story ends, then slips
   away before the outro. Degrades gracefully.
   ========================================================================== */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { SVGLoader } from 'three/addons/loaders/SVGLoader.js';
import { MeshSurfaceSampler } from 'three/addons/math/MeshSurfaceSampler.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const canvas = document.getElementById('gl');
const html = document.documentElement;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const coarse = matchMedia('(pointer: coarse)').matches;
const HY = (window.HY = window.HY || {});
HY.progress = 0;   // 0..1 through the pinned story (main.js)
HY.outro = 0;      // 0..1 as the outro arrives (main.js)
HY.introDone = false;

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true, powerPreference: 'high-performance' });
} catch (err) {
  html.classList.add('no-webgl');
  throw err;
}
renderer.setClearColor(0x000000, 0);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
camera.position.set(0, 0, 10);
const VIS_H = 2 * Math.tan(THREE.MathUtils.degToRad(16)) * 10; // visible height at z = 0

const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
pmrem.dispose();

/* ---------- Particles ---------- */
const COUNT = coarse ? 36000 : 90000;
const WORD_W = 5.6;
const PLANET_R = 3.6, PLANET_Y = -4.4;

const rand = new Float32Array(COUNT);
const colors = new Float32Array(COUNT * 3);
const palette = [[1, 1, 1], [0.72, 0.94, 1], [0.84, 0.78, 1], [1, 1, 1]];
for (let i = 0; i < COUNT; i++) {
  rand[i] = Math.random();
  const c = palette[(Math.random() * palette.length) | 0];
  colors[i * 3] = c[0]; colors[i * 3 + 1] = c[1]; colors[i * 3 + 2] = c[2];
}
const gauss = () => (Math.random() + Math.random() + Math.random() - 1.5) * 1.15;

function cloudPoints() {
  const a = new Float32Array(COUNT * 3);
  for (let i = 0; i < COUNT; i++) { a[i * 3] = (Math.random() - 0.5) * 12; a[i * 3 + 1] = (Math.random() - 0.5) * 7; a[i * 3 + 2] = (Math.random() - 0.5) * 6; }
  return a;
}
function planetPoints() {
  const a = new Float32Array(COUNT * 3);
  for (let i = 0; i < COUNT; i++) {
    const th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1);
    const r = PLANET_R + (Math.random() < 0.8 ? 0 : (Math.random() - 0.5) * 0.6);
    a[i * 3] = r * Math.sin(ph) * Math.cos(th); a[i * 3 + 1] = r * Math.cos(ph); a[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th);
  }
  return a;
}
function helixPoints() {
  const a = new Float32Array(COUNT * 3);
  const turns = 3.2, R = 1.25, H = 6.2, rungs = 30;
  for (let i = 0; i < COUNT; i++) {
    const kind = i % 5;
    let x, y, z;
    if (kind < 4) {
      const k = Math.random(), t = k * Math.PI * 2 * turns + (kind < 2 ? 0 : Math.PI);
      x = Math.cos(t) * R; y = (k - 0.5) * H; z = Math.sin(t) * R;
    } else {
      const j = (Math.random() * rungs) | 0, k = (j + 0.5) / rungs, t = k * Math.PI * 2 * turns, s = Math.random() * 0.8 + 0.1;
      x = Math.cos(t) * R * (1 - 2 * s); y = (k - 0.5) * H; z = Math.sin(t) * R * (1 - 2 * s);
    }
    a[i * 3] = x + (Math.random() - 0.5) * 0.05; a[i * 3 + 1] = y + (Math.random() - 0.5) * 0.05; a[i * 3 + 2] = z + (Math.random() - 0.5) * 0.05;
  }
  return a;
}
function galaxyPoints() {
  const a = new Float32Array(COUNT * 3);
  const arms = 3, R = 3.6;
  for (let i = 0; i < COUNT; i++) {
    let x, y, z;
    if (i % 7 === 0) { // bulge
      const r = Math.pow(Math.random(), 1.5) * 0.7, th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1);
      x = r * Math.sin(ph) * Math.cos(th); y = r * Math.cos(ph) * 0.55; z = r * Math.sin(ph) * Math.sin(th);
    } else {
      const arm = i % arms, t = Math.pow(Math.random(), 0.65), r = 0.25 + t * R;
      const spread = 0.08 + 0.22 * t;
      const ang = arm * (Math.PI * 2 / arms) + r * 1.15 + gauss() * 0.22 * (1 - t * 0.4);
      x = Math.cos(ang) * r + gauss() * spread; z = Math.sin(ang) * r + gauss() * spread; y = gauss() * (0.05 + 0.1 * (1 - t));
    }
    a[i * 3] = x; a[i * 3 + 1] = y; a[i * 3 + 2] = z;
  }
  return a;
}
function samplePoints(meshes, weights) {
  const a = new Float32Array(COUNT * 3);
  const v = new THREE.Vector3();
  const samplers = meshes.map((m) => new MeshSurfaceSampler(m).build());
  const total = weights.reduce((s, w) => s + w, 0);
  let i = 0;
  samplers.forEach((s, k) => {
    const n = k === samplers.length - 1 ? COUNT - i : Math.round((weights[k] / total) * COUNT);
    for (let j = 0; j < n && i < COUNT; j++, i++) { s.sample(v); meshes[k].localToWorld(v); a[i * 3] = v.x; a[i * 3 + 1] = v.y; a[i * 3 + 2] = v.z; }
  });
  return a;
}

const geo = new THREE.BufferGeometry();
const planet = planetPoints();
geo.setAttribute('position', new THREE.BufferAttribute(planet, 3));
geo.setAttribute('aP0', new THREE.BufferAttribute(cloudPoints(), 3)); // wordmark (set when the logo loads)
geo.setAttribute('aP1', new THREE.BufferAttribute(planet, 3));
geo.setAttribute('aP2', new THREE.BufferAttribute(helixPoints(), 3));
geo.setAttribute('aP3', new THREE.BufferAttribute(galaxyPoints(), 3));
geo.setAttribute('aP4', new THREE.BufferAttribute(cloudPoints(), 3)); // phone halo (set below)
geo.setAttribute('aRand', new THREE.BufferAttribute(rand, 1));
geo.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));

const uniforms = {
  uTime: { value: 0 },
  uPixelRatio: { value: 1 },
  uSize: { value: coarse ? 2.1 : 1.55 },
  uFrom: { value: 0 },
  uTo: { value: 1 },
  uMix: { value: 0 },
  uBright: { value: [1.0, 0.5, 0.85, 0.9, 0.55] },
  uTint: { value: [new THREE.Color(1, 1, 1), new THREE.Color(0.8, 0.9, 1), new THREE.Color(0.6, 0.92, 1), new THREE.Color(1, 0.86, 0.72), new THREE.Color(1, 0.52, 0.26)] },
  uWordScale: { value: 1 },
  uGalaxyScale: { value: 1 },
  uPhoneScale: { value: 1 },
  uPhoneOffset: { value: new THREE.Vector3(1.5, 0, 0) },
  uYaw: { value: 0 },
  uPointer: { value: new THREE.Vector2(0, 0) },
  uBurst: { value: 0 },
  uGlobalAlpha: { value: 1 },
  uPlanetY: { value: PLANET_Y },
};

const material = new THREE.ShaderMaterial({
  uniforms, transparent: true, depthWrite: false, depthTest: true, blending: THREE.AdditiveBlending,
  vertexShader: /* glsl */ `
    uniform float uTime, uPixelRatio, uSize, uMix, uWordScale, uGalaxyScale, uPhoneScale, uYaw, uBurst, uGlobalAlpha, uPlanetY;
    uniform int uFrom, uTo;
    uniform float uBright[5];
    uniform vec3 uTint[5];
    uniform vec3 uPhoneOffset;
    uniform vec2 uPointer;
    attribute vec3 aP0; attribute vec3 aP1; attribute vec3 aP2; attribute vec3 aP3; attribute vec3 aP4;
    attribute float aRand; attribute vec3 aColor;
    varying float vAlpha; varying vec3 vColor;

    vec3 rotY(vec3 p, float a) { float c = cos(a), s = sin(a); return vec3(c * p.x + s * p.z, p.y, -s * p.x + c * p.z); }

    vec3 form(int i) {
      if (i == 0) return rotY(aP0 * uWordScale, uYaw);
      if (i == 1) return rotY(aP1, uTime * 0.04) + vec3(0.0, uPlanetY, 0.0);
      if (i == 2) return rotY(aP2, uTime * 0.3);
      if (i == 3) return rotY(aP3 * uGalaxyScale, uTime * 0.12);
      return aP4 * uPhoneScale + uPhoneOffset;
    }
    float glow(int i, vec3 p) {
      if (i == 3) return 1.0 + 1.6 * max(0.0, 1.0 - length(p.xz) / (3.2 * uGalaxyScale));
      return 1.0;
    }

    void main() {
      float t = smoothstep(0.0, 1.0, clamp((uMix - aRand * 0.3) / 0.7, 0.0, 1.0));
      vec3 a = form(uFrom), b = form(uTo);
      vec3 p = mix(a, b, t);
      float sw = 4.0 * t * (1.0 - t);
      p += vec3(sin(p.y * 1.7 + uTime * 1.3 + aRand * 6.2831), cos(p.x * 1.3 + uTime * 0.9 + aRand * 3.1), sin(p.z * 1.9 + uTime * 1.1 + aRand * 2.0)) * sw * 0.6;
      p += vec3(sin(uTime * 0.6 + aRand * 9.0), cos(uTime * 0.45 + aRand * 7.0), sin(uTime * 0.5 + aRand * 5.0)) * 0.012;
      // every particle has its own parallax depth, so the field never moves as one block
      p.xy += uPointer * (0.06 + 0.3 * aRand * aRand) * (1.0 + 0.6 * sin(aRand * 40.0));
      // the hand-over burst
      p += normalize(p + vec3(0.001, 0.002, 0.003)) * uBurst * (0.6 + aRand * 1.6);
      vec4 mv = modelViewMatrix * vec4(p, 1.0);
      gl_Position = projectionMatrix * mv;
      gl_PointSize = uSize * uPixelRatio * (0.55 + aRand * 0.9) * (10.0 / -mv.z);
      float bright = mix(uBright[uFrom] * glow(uFrom, a), uBright[uTo] * glow(uTo, b), t);
      vec3 tint = mix(uTint[uFrom], uTint[uTo], t);
      float twinkle = 0.7 + 0.3 * sin(uTime * 2.2 + aRand * 40.0);
      vAlpha = uGlobalAlpha * bright * twinkle * (0.45 + 0.55 * aRand) * (1.0 + sw * 0.6 + uBurst * 0.8);
      vColor = aColor * tint;
    }`,
  fragmentShader: /* glsl */ `
    precision highp float;
    varying float vAlpha; varying vec3 vColor;
    void main() {
      vec2 c = gl_PointCoord - 0.5;
      float d = length(c);
      if (d > 0.5) discard;
      float a = smoothstep(0.5, 0.05, d);
      float core = smoothstep(0.22, 0.0, d) * 0.7;
      gl_FragColor = vec4(vColor * (1.0 + core), a * vAlpha);
    }`,
});
const points = new THREE.Points(geo, material);
points.frustumCulled = false;
scene.add(points);

/* ---------- The wordmark form (from the real logo) ---------- */
new SVGLoader().load('assets/HyaicoWhite.svg', (data) => {
  const s = WORD_W / 619;
  const front = [], solid = [];
  data.paths.forEach((path) => {
    SVGLoader.createShapes(path).forEach((shape) => {
      const flat = new THREE.ShapeGeometry(shape, 10);
      flat.translate(-309.5, -50.3, 0); flat.scale(s, -s, 1); flat.translate(0, 0, 0.05);
      front.push(new THREE.Mesh(flat));
      const ext = new THREE.ExtrudeGeometry(shape, { depth: 14, bevelEnabled: false, curveSegments: 10 });
      ext.translate(-309.5, -50.3, -7); ext.scale(s, -s, s);
      solid.push(new THREE.Mesh(ext));
    });
  });
  const pts = samplePoints([new THREE.Mesh(mergeMeshes(front)), new THREE.Mesh(mergeMeshes(solid))], [0.7, 0.3]);
  geo.setAttribute('aP0', new THREE.BufferAttribute(pts, 3));
  window.dispatchEvent(new CustomEvent('scene:wordmark'));
}, undefined, () => window.dispatchEvent(new CustomEvent('scene:wordmark')));

function mergeMeshes(meshes) {
  const parts = meshes.map((m) => (m.geometry.index ? m.geometry.toNonIndexed() : m.geometry));
  const total = parts.reduce((s, g) => s + g.attributes.position.count, 0);
  const pos = new Float32Array(total * 3);
  let off = 0;
  parts.forEach((g) => { pos.set(g.attributes.position.array, off); off += g.attributes.position.array.length; });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  return g;
}

/* ---------- The phone (built to the Just Cooked site's spec) ---------- */
const PHONE = { w: 1, h: 2.07, d: 0.082, r: 0.15, bevel: 0.016 };
const SCREEN = { w: 0.925, h: 2.008 };
const GLASS = { w: 0.962, h: 2.036, r: 0.128 };
const SCREENS = ['home', 'next-meal', 'recipe'];

function roundedRect(w, h, r) {
  const s = new THREE.Shape();
  const x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.absarc(x + w - r, y + r, r, -Math.PI / 2, 0, false);
  s.lineTo(x + w, y + h - r); s.absarc(x + w - r, y + h - r, r, 0, Math.PI / 2, false);
  s.lineTo(x + r, y + h); s.absarc(x + r, y + h - r, r, Math.PI / 2, Math.PI, false);
  s.lineTo(x, y + r); s.absarc(x + r, y + r, r, Math.PI, Math.PI * 1.5, false);
  return s;
}

const screenMat = new THREE.ShaderMaterial({
  uniforms: { tA: { value: null }, tB: { value: null }, uMix: { value: 0 }, uGain: { value: 1 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `uniform sampler2D tA; uniform sampler2D tB; uniform float uMix, uGain; varying vec2 vUv;
    void main(){ vec4 a = texture2D(tA, vUv); vec4 b = texture2D(tB, vUv); gl_FragColor = vec4(mix(a, b, uMix).rgb * uGain, 1.0);
    #include <colorspace_fragment>
    }`,
});
const textures = {};
const texLoader = new THREE.TextureLoader();
const maxAniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
function loadScreen(k) {
  return new Promise((resolve) => texLoader.load(`assets/screens/${k}.webp`, (t) => {
    t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = maxAniso; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter;
    textures[k] = t; resolve(t);
  }, undefined, () => resolve(null)));
}
let screenCurrent = 'home', screenTarget = 'home', fading = false;
loadScreen('home').then((t) => { if (t) { screenMat.uniforms.tA.value = t; screenMat.uniforms.tB.value = t; } SCREENS.slice(1).forEach(loadScreen); });
function setScreen(k) {
  if (k === screenTarget || !textures[k]) return;
  if (fading) { screenMat.uniforms.tA.value = screenMat.uniforms.tB.value; screenMat.uniforms.uMix.value = 0; screenCurrent = screenTarget; }
  screenTarget = k; screenMat.uniforms.tB.value = textures[k]; screenMat.uniforms.uMix.value = 0; fading = true;
}

const phone = new THREE.Group();
phone.visible = false;
scene.add(phone);
{
  const b = PHONE.bevel;
  const metal = new THREE.MeshPhysicalMaterial({ color: 0x6e6e76, metalness: 1, roughness: 0.3, clearcoat: 0.6, clearcoatRoughness: 0.2, envMapIntensity: 1.4 });
  const black = new THREE.MeshPhysicalMaterial({ color: 0x050505, metalness: 0.15, roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.06 });
  const bodyGeo = new THREE.ExtrudeGeometry(roundedRect(PHONE.w - 2 * b, PHONE.h - 2 * b, PHONE.r - b), {
    depth: PHONE.d - 2 * b, bevelEnabled: true, bevelThickness: b, bevelSize: b, bevelOffset: 0, bevelSegments: 4, curveSegments: 24,
  });
  bodyGeo.translate(0, 0, -(PHONE.d - 2 * b) / 2);
  phone.add(new THREE.Mesh(bodyGeo, metal));
  const glass = new THREE.Mesh(new THREE.ShapeGeometry(roundedRect(GLASS.w, GLASS.h, GLASS.r), 18), black);
  glass.position.z = PHONE.d / 2 + 0.0008;
  phone.add(glass);
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(SCREEN.w, SCREEN.h), screenMat);
  screen.position.z = PHONE.d / 2 + 0.0018;
  phone.add(screen);
  const btn = (len, x, y) => { const m = new THREE.Mesh(new RoundedBoxGeometry(0.022, len, 0.036, 2, 0.008), metal); m.position.set(x, y, 0); phone.add(m); };
  const edge = PHONE.w / 2 + 0.006;
  btn(0.09, -edge, 0.64); btn(0.17, -edge, 0.42); btn(0.17, -edge, 0.21); btn(0.26, edge, 0.44);
  const island = new THREE.Mesh(new THREE.ExtrudeGeometry(roundedRect(0.37, 0.37, 0.1), { depth: 0.012, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.004, bevelSegments: 2, curveSegments: 12 }), metal);
  island.rotation.y = Math.PI; island.position.set(-0.235, 0.76, -PHONE.d / 2);
  phone.add(island);
  const lensGeo = new THREE.CylinderGeometry(0.062, 0.062, 0.02, 24), lensInner = new THREE.CylinderGeometry(0.036, 0.036, 0.022, 24);
  const lensMat = new THREE.MeshPhysicalMaterial({ color: 0x0b0e18, metalness: 0.6, roughness: 0.15, clearcoat: 1 });
  [[-0.075, 0.08], [-0.075, -0.08], [0.085, 0]].forEach(([lx, ly]) => {
    const l = new THREE.Mesh(lensGeo, black); l.rotation.x = Math.PI / 2; l.position.set(-0.235 + lx, 0.76 + ly, -PHONE.d / 2 - 0.022); phone.add(l);
    const li = new THREE.Mesh(lensInner, lensMat); li.rotation.x = Math.PI / 2; li.position.set(-0.235 + lx, 0.76 + ly, -PHONE.d / 2 - 0.03); phone.add(li);
  });

  // the particle halo: a band of light just outside the phone's edge, plus a soft cloud behind it (phone-local units)
  const halo = new Float32Array(COUNT * 3);
  const bx = PHONE.w / 2, by = PHONE.h / 2, rr = PHONE.r;
  const sd = (x, y) => { const qx = Math.abs(x) - bx + rr, qy = Math.abs(y) - by + rr; return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - rr; };
  for (let i = 0; i < COUNT; i++) {
    let x, y, z;
    if (i % 4 === 0) { x = (Math.random() - 0.5) * 3.4; y = (Math.random() - 0.5) * 3.6; z = -0.35 - Math.random() * 0.9; }
    else {
      // dust that is densest at the edge and thins with distance, never over the screen
      let d;
      do { x = (Math.random() - 0.5) * 2.2; y = (Math.random() - 0.5) * 3.3; d = sd(x, y); } while (d < 0.02 || Math.random() > Math.exp(-(d - 0.02) / 0.14));
      z = (Math.random() - 0.5) * 0.6;
    }
    halo[i * 3] = x; halo[i * 3 + 1] = y; halo[i * 3 + 2] = z;
  }
  geo.setAttribute('aP4', new THREE.BufferAttribute(halo, 3));
}

/* Aura behind the phone */
function auraTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  g.addColorStop(0, 'rgba(255,120,60,0.85)'); g.addColorStop(0.35, 'rgba(255,80,20,0.35)'); g.addColorStop(1, 'rgba(255,60,0,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const aura = new THREE.Sprite(new THREE.SpriteMaterial({ map: auraTexture(), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
aura.visible = false;
scene.add(aura);

/* ---------- Lights (for the phone) ---------- */
scene.add(new THREE.HemisphereLight(0xfff6ec, 0x0a0a14, 0.5));
const key = new THREE.DirectionalLight(0xfff2e4, 2.2); key.position.set(3, 5, 7); scene.add(key);
const fill = new THREE.DirectionalLight(0xdfe6ff, 0.9); fill.position.set(-5, -2, 4); scene.add(fill);
const warm = new THREE.PointLight(0xff6a2a, 40, 24, 1.6); warm.position.set(-1.5, -3, 3.5); scene.add(warm);

/* ---------- Post-processing ---------- */
let composer = null;
if (!coarse) {
  composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  composer.addPass(new UnrealBloomPass(new THREE.Vector2(1, 1), 0.3, 0.6, 0.9));
  composer.addPass(new OutputPass());
  screenMat.uniforms.uGain.value = 1.18; // compensate the output tone mapping so the screen stays bright
}

/* ---------- Camera keyframes per form ---------- */
const CAM = [
  { p: new THREE.Vector3(0, 0, 10), l: new THREE.Vector3(0, 0, 0) },         // wordmark
  { p: new THREE.Vector3(0, 0.3, 10), l: new THREE.Vector3(0, -0.2, 0) },    // planet
  { p: new THREE.Vector3(2.4, 0.9, 9.0), l: new THREE.Vector3(-1.4, 0, 0) }, // helix (right of the text)
  { p: new THREE.Vector3(0, 4.4, 7.6), l: new THREE.Vector3(0, -0.7, 0) },   // galaxy (seen from above)
  { p: new THREE.Vector3(0, 0, 10), l: new THREE.Vector3(0, 0, 0) },         // phone
];
/* Story beats: where each form is fully held (progress 0..1); blends in between */
const BEATS = [
  { f: 1, a: 0.0, b: 0.06 },
  { f: 2, a: 0.16, b: 0.27 },
  { f: 3, a: 0.37, b: 0.48 },
  { f: 0, a: 0.58, b: 0.68 },
  { f: 4, a: 0.78, b: 1.0 },
];

/* ---------- Layout ---------- */
let stacked = false;
function visibleWidth() { return VIS_H * camera.aspect; }
function layout() {
  stacked = camera.aspect < 1.05;
  const vw = visibleWidth();
  HY.storyWordScale = Math.min(1, (vw * (stacked ? 0.88 : 0.66)) / WORD_W);
  if (!HY.introDone) {
    const mark = document.getElementById('loaderMark');
    const frac = mark ? mark.getBoundingClientRect().width / window.innerWidth : 0.46;
    uniforms.uWordScale.value = Math.max(0.2, (frac * vw) / WORD_W);
  } else uniforms.uWordScale.value = HY.storyWordScale;
  uniforms.uGalaxyScale.value = stacked ? 0.62 : Math.min(1, vw / 9.2);
  const phoneH = VIS_H * (stacked ? 0.5 : 0.74);
  uniforms.uPhoneScale.value = phoneH / PHONE.h;
  uniforms.uPhoneOffset.value.set(stacked ? 0 : vw * 0.17, stacked ? 0.62 : 0, 0);
  uniforms.uSize.value = (coarse ? 2.1 : 1.55) * (stacked ? 0.9 : 1);
  CAM[2].l.x = stacked ? 0 : -1.4;
  CAM[2].l.y = stacked ? 0.9 : 0;
  CAM[3].l.y = stacked ? -1.4 : -0.7;
}
function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  const dpr = Math.min(window.devicePixelRatio || 1, coarse ? 1.5 : 2);
  renderer.setPixelRatio(dpr);
  renderer.setSize(w, h, false);
  uniforms.uPixelRatio.value = dpr;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  if (composer) composer.setSize(w, h);
  layout();
}
window.addEventListener('resize', resize);
resize();

/* ---------- Intro hand-over: burst, then wordmark → planet ---------- */
const intro = { mix: 0 };
function startIntro() {
  const g = window.gsap;
  if (reduced || !g) { intro.mix = 1; HY.introDone = true; layout(); return; }
  g.timeline()
    .to(uniforms.uBurst, { value: 1, duration: 0.3, ease: 'power2.out' }, 0)
    .to(uniforms.uBurst, { value: 0, duration: 1.4, ease: 'power3.out' }, 0.3)
    .to(intro, { mix: 1, duration: 2.2, ease: 'power3.inOut', onComplete() { HY.introDone = true; layout(); } }, 0.25);
}
window.addEventListener('scene:intro', startIntro, { once: true });

/* ---------- Story state ---------- */
const camPos = new THREE.Vector3(), camLook = new THREE.Vector3();
let smooth = 0, phoneIn = 0;
function storyState(p) {
  for (let k = 0; k < BEATS.length; k++) {
    const cur = BEATS[k];
    if (p < cur.a && k > 0) {
      const prev = BEATS[k - 1];
      return { from: prev.f, to: cur.f, mix: THREE.MathUtils.smoothstep(p, prev.b, cur.a) };
    }
    if (p <= cur.b) return { from: cur.f, to: cur.f, mix: 0 };
  }
  return { from: 4, to: 4, mix: 0 };
}

function applyState(dt) {
  smooth += (HY.progress - smooth) * (1 - Math.pow(0.002, dt));
  let st;
  if (!HY.introDone) st = { from: 0, to: 1, mix: intro.mix };
  else st = storyState(smooth);
  uniforms.uFrom.value = st.from; uniforms.uTo.value = st.to; uniforms.uMix.value = st.mix;
  const e = THREE.MathUtils.smoothstep(st.mix, 0, 1);
  camPos.lerpVectors(CAM[st.from].p, CAM[st.to].p, e);
  camLook.lerpVectors(CAM[st.from].l, CAM[st.to].l, e);

  /* the phone materialises inside its halo, then slips away as the outro arrives */
  const target = THREE.MathUtils.smoothstep(smooth, 0.74, 0.82) * (1 - HY.outro);
  phoneIn += (target - phoneIn) * (1 - Math.pow(0.001, dt));
  phone.visible = phoneIn > 0.002;
  aura.visible = phone.visible;
  const sc = uniforms.uPhoneScale.value * (0.7 + 0.3 * THREE.MathUtils.smoothstep(phoneIn, 0, 1));
  phone.scale.setScalar(sc);
  phone.position.set(uniforms.uPhoneOffset.value.x, uniforms.uPhoneOffset.value.y - HY.outro * 2.5, 0);
  aura.position.set(phone.position.x, phone.position.y, -0.6);
  aura.scale.setScalar(uniforms.uPhoneScale.value * 3.2);
  aura.material.opacity = 0.75 * phoneIn;
  uniforms.uBright.value[4] = 0.55 * (1 - 0.3 * phoneIn);
  uniforms.uGlobalAlpha.value = 1 - HY.outro;

  /* the app's screens change as the story ends */
  if (HY.introDone) setScreen(smooth < 0.88 ? 'home' : smooth < 0.95 ? 'next-meal' : 'recipe');
  return phoneIn;
}

/* ---------- Pointer ---------- */
const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
window.addEventListener('pointermove', (e) => {
  if (e.pointerType && e.pointerType !== 'mouse') return;
  pointer.tx = (e.clientX / window.innerWidth) * 2 - 1;
  pointer.ty = -((e.clientY / window.innerHeight) * 2 - 1);
}, { passive: true });

/* ---------- Visibility gating ---------- */
let pageVisible = !document.hidden;
document.addEventListener('visibilitychange', () => { pageVisible = !document.hidden; });

/* ---------- Render loop ---------- */
const clock = new THREE.Clock();
let elapsed = 0, ready = false;
function frame() {
  requestAnimationFrame(frame);
  const dt = Math.min(clock.getDelta(), 0.1);
  if (!pageVisible) return;
  elapsed += dt;
  const ease = 1 - Math.pow(0.001, dt);
  pointer.x += (pointer.tx - pointer.x) * ease * 0.5;
  pointer.y += (pointer.ty - pointer.y) * ease * 0.5;

  uniforms.uTime.value = elapsed;
  uniforms.uYaw.value = pointer.x * 0.22;
  uniforms.uPointer.value.set(pointer.x, pointer.y);
  const pin = applyState(dt);

  camera.position.set(camPos.x + pointer.x * 0.12, camPos.y + pointer.y * 0.08, camPos.z);
  camera.lookAt(camLook);

  if (phone.visible) {
    const rest = stacked ? -0.22 : -0.42;
    phone.rotation.y = rest + (1 - pin) * -1.2 + pointer.x * 0.34 + Math.sin(elapsed * 0.6) * 0.03;
    phone.rotation.x = 0.06 - pointer.y * 0.22 + Math.sin(elapsed * 0.8) * 0.015;
    phone.rotation.z = Math.sin(elapsed * 0.6) * 0.012;
    phone.position.y += Math.sin(elapsed * 0.9) * 0.02;
    if (fading) {
      screenMat.uniforms.uMix.value = Math.min(1, screenMat.uniforms.uMix.value + dt / 0.5);
      if (screenMat.uniforms.uMix.value >= 1) { screenMat.uniforms.tA.value = screenMat.uniforms.tB.value; screenMat.uniforms.uMix.value = 0; screenCurrent = screenTarget; fading = false; }
    }
  }

  if (composer) composer.render(); else renderer.render(scene, camera);

  if (!ready) {
    ready = true;
    html.classList.add('gl-ready');
    window.dispatchEvent(new CustomEvent('scene:ready'));
  }
}
frame();
