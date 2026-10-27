/* ==========================================================================
   HYAICO — The stage (Three.js)
   One particle system, tens of thousands of points, morphing between five
   forms as the page scrolls:
     0 wordmark  — the HYAICO logo, sampled from the real logo path
     1 planet    — a glowing horizon beneath the hero title
     2 helix     — a double helix
     3 field     — a flowing data landscape
     4 phone     — the silhouette of a handset, into which a modelled phone
                   running Just Cooked appears
   The loader hands over to the particle wordmark, which then becomes the
   planet. Camera moves and swirl are scrubbed by scroll. Degrades gracefully.
   ========================================================================== */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { SVGLoader } from 'three/addons/loaders/SVGLoader.js';
import { MeshSurfaceSampler } from 'three/addons/math/MeshSurfaceSampler.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const canvas = document.getElementById('gl');
const html = document.documentElement;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const coarse = matchMedia('(pointer: coarse)').matches;
const HY = (window.HY = window.HY || {});
HY.progress = 0; // 0..1, written by the scroll story in main.js

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

const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
pmrem.dispose();

/* ---------- Particles ---------- */
const COUNT = coarse ? 36000 : 90000;
const WORD_W = 5.6;                 // wordmark width in world units at scale 1
const PLANET_R = 3.6, PLANET_Y = -4.4;
const PHONE_H = 4.0;                // phone height in world units at uPhoneScale 1

const rand = new Float32Array(COUNT);
const colors = new Float32Array(COUNT * 3);
const palette = [[1, 1, 1], [0.72, 0.94, 1], [0.84, 0.78, 1], [1, 1, 1]];
for (let i = 0; i < COUNT; i++) {
  rand[i] = Math.random();
  const c = palette[(Math.random() * palette.length) | 0];
  colors[i * 3] = c[0]; colors[i * 3 + 1] = c[1]; colors[i * 3 + 2] = c[2];
}

function cloudPoints() {
  const a = new Float32Array(COUNT * 3);
  for (let i = 0; i < COUNT; i++) {
    a[i * 3] = (Math.random() - 0.5) * 12;
    a[i * 3 + 1] = (Math.random() - 0.5) * 7;
    a[i * 3 + 2] = (Math.random() - 0.5) * 6;
  }
  return a;
}
function planetPoints() {
  const a = new Float32Array(COUNT * 3);
  for (let i = 0; i < COUNT; i++) {
    const th = Math.random() * Math.PI * 2;
    const ph = Math.acos(2 * Math.random() - 1);
    const r = PLANET_R + (Math.random() < 0.8 ? 0 : (Math.random() - 0.5) * 0.6);
    a[i * 3] = r * Math.sin(ph) * Math.cos(th);
    a[i * 3 + 1] = r * Math.cos(ph);
    a[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th);
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
      const k = Math.random();
      const t = k * Math.PI * 2 * turns + (kind < 2 ? 0 : Math.PI);
      x = Math.cos(t) * R; y = (k - 0.5) * H; z = Math.sin(t) * R;
    } else {
      const j = (Math.random() * rungs) | 0;
      const k = (j + 0.5) / rungs;
      const t = k * Math.PI * 2 * turns;
      const s = Math.random() * 0.8 + 0.1;
      x = Math.cos(t) * R * (1 - 2 * s); y = (k - 0.5) * H; z = Math.sin(t) * R * (1 - 2 * s);
    }
    a[i * 3] = x + (Math.random() - 0.5) * 0.05;
    a[i * 3 + 1] = y + (Math.random() - 0.5) * 0.05;
    a[i * 3 + 2] = z + (Math.random() - 0.5) * 0.05;
  }
  return a;
}
function fieldPoints() {
  const a = new Float32Array(COUNT * 3);
  const cols = Math.ceil(Math.sqrt(COUNT * 1.6));
  const rows = Math.ceil(COUNT / cols);
  for (let i = 0; i < COUNT; i++) {
    const c = i % cols, r = (i / cols) | 0;
    const x = (c / cols - 0.5) * 14;
    const z = (r / rows - 0.5) * 10 - 1;
    const y = -1.1 + 0.45 * Math.sin(x * 0.75) * Math.cos(z * 0.9) + 0.18 * Math.sin(x * 1.9 + z * 1.4);
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
    for (let j = 0; j < n && i < COUNT; j++, i++) {
      s.sample(v);
      meshes[k].localToWorld(v);
      a[i * 3] = v.x; a[i * 3 + 1] = v.y; a[i * 3 + 2] = v.z;
    }
  });
  return a;
}

const geo = new THREE.BufferGeometry();
const planet = planetPoints();
geo.setAttribute('position', new THREE.BufferAttribute(planet, 3));
geo.setAttribute('aP0', new THREE.BufferAttribute(cloudPoints(), 3));   // wordmark (replaced when the logo loads)
geo.setAttribute('aP1', new THREE.BufferAttribute(planet, 3));
geo.setAttribute('aP2', new THREE.BufferAttribute(helixPoints(), 3));
geo.setAttribute('aP3', new THREE.BufferAttribute(fieldPoints(), 3));
geo.setAttribute('aP4', new THREE.BufferAttribute(cloudPoints(), 3));   // phone (replaced once the phone is built)
geo.setAttribute('aRand', new THREE.BufferAttribute(rand, 1));
geo.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));

const uniforms = {
  uTime: { value: 0 },
  uPixelRatio: { value: 1 },
  uSize: { value: coarse ? 2.1 : 1.55 },
  uFrom: { value: 0 },
  uTo: { value: 1 },
  uMix: { value: 0 },
  uBright: { value: [1.0, 0.5, 0.85, 0.95, 0.8] },
  uTint: { value: [new THREE.Color(1, 1, 1), new THREE.Color(0.8, 0.9, 1), new THREE.Color(0.6, 0.92, 1), new THREE.Color(0.62, 0.55, 1), new THREE.Color(1, 0.5, 0.24)] },
  uWordScale: { value: 1 },
  uPhoneScale: { value: 1 },
  uPhoneOffset: { value: new THREE.Vector3(1.75, 0, 0) },
  uYaw: { value: 0 },
  uGlobalAlpha: { value: 1 },
  uPlanetY: { value: PLANET_Y },
};

const material = new THREE.ShaderMaterial({
  uniforms, transparent: true, depthWrite: false, depthTest: true, blending: THREE.AdditiveBlending,
  vertexShader: /* glsl */ `
    uniform float uTime, uPixelRatio, uSize, uMix, uWordScale, uPhoneScale, uYaw, uGlobalAlpha, uPlanetY;
    uniform int uFrom, uTo;
    uniform float uBright[5];
    uniform vec3 uTint[5];
    uniform vec3 uPhoneOffset;
    attribute vec3 aP0; attribute vec3 aP1; attribute vec3 aP2; attribute vec3 aP3; attribute vec3 aP4;
    attribute float aRand; attribute vec3 aColor;
    varying float vAlpha; varying vec3 vColor;

    vec3 rotY(vec3 p, float a) { float c = cos(a), s = sin(a); return vec3(c * p.x + s * p.z, p.y, -s * p.x + c * p.z); }

    vec3 form(int i) {
      if (i == 0) return rotY(aP0 * uWordScale, uYaw);
      if (i == 1) return rotY(aP1, uTime * 0.04) + vec3(0.0, uPlanetY, 0.0);
      if (i == 2) return rotY(aP2, uTime * 0.3);
      if (i == 3) { vec3 p = aP3; p.y += sin(p.x * 1.1 + uTime * 1.4 + p.z * 0.7) * 0.2 + cos(p.z * 1.6 - uTime * 0.9) * 0.08; return p; }
      return aP4 * uPhoneScale + uPhoneOffset;
    }

    void main() {
      float t = smoothstep(0.0, 1.0, clamp((uMix - aRand * 0.3) / 0.7, 0.0, 1.0));
      vec3 p = mix(form(uFrom), form(uTo), t);
      float sw = 4.0 * t * (1.0 - t);
      p += vec3(sin(p.y * 1.7 + uTime * 1.3 + aRand * 6.2831), cos(p.x * 1.3 + uTime * 0.9 + aRand * 3.1), sin(p.z * 1.9 + uTime * 1.1 + aRand * 2.0)) * sw * 0.6;
      p += vec3(sin(uTime * 0.6 + aRand * 9.0), cos(uTime * 0.45 + aRand * 7.0), sin(uTime * 0.5 + aRand * 5.0)) * 0.012;
      vec4 mv = modelViewMatrix * vec4(p, 1.0);
      gl_Position = projectionMatrix * mv;
      gl_PointSize = uSize * uPixelRatio * (0.55 + aRand * 0.9) * (10.0 / -mv.z);
      float bright = mix(uBright[uFrom], uBright[uTo], t);
      vec3 tint = mix(uTint[uFrom], uTint[uTo], t);
      float twinkle = 0.7 + 0.3 * sin(uTime * 2.2 + aRand * 40.0);
      vAlpha = uGlobalAlpha * bright * twinkle * (0.45 + 0.55 * aRand) * (1.0 + sw * 0.6);
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
let wordReady = false;
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
  // sample fronts by area and the solid letters for depth
  const frontGeo = mergeMeshes(front), solidGeo = mergeMeshes(solid);
  const pts = samplePoints([new THREE.Mesh(frontGeo), new THREE.Mesh(solidGeo)], [0.7, 0.3]);
  geo.setAttribute('aP0', new THREE.BufferAttribute(pts, 3));
  wordReady = true;
  window.dispatchEvent(new CustomEvent('scene:wordmark'));
}, undefined, () => { wordReady = true; window.dispatchEvent(new CustomEvent('scene:wordmark')); });

function mergeMeshes(meshes) {
  // concatenate non-indexed position buffers
  const parts = meshes.map((m) => (m.geometry.index ? m.geometry.toNonIndexed() : m.geometry));
  const total = parts.reduce((s, g) => s + g.attributes.position.count, 0);
  const pos = new Float32Array(total * 3);
  let off = 0;
  parts.forEach((g) => { pos.set(g.attributes.position.array, off); off += g.attributes.position.array.length; });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  return g;
}

/* ---------- The phone ---------- */
const IMG = { w: 1320, h: 2868, left: 68, right: 1253, top: 169, bottom: 2738, bodyL: 24, bodyR: 1297, bodyT: 120, bodyB: 2787, bodyRadius: 234 };
function roundedRect(w, h, r) {
  const s = new THREE.Shape();
  const x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.absarc(x + w - r, y + r, r, -Math.PI / 2, 0, false);
  s.lineTo(x + w, y + h - r); s.absarc(x + w - r, y + h - r, r, 0, Math.PI / 2, false);
  s.lineTo(x + r, y + h); s.absarc(x + r, y + h - r, r, Math.PI / 2, Math.PI, false);
  s.lineTo(x, y + r); s.absarc(x + r, y + r, r, Math.PI, Math.PI * 1.5, false);
  return s;
}
function mapUVs(g, w, h, u0, u1, v0, v1) {
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) {
    const x = uv.getX(i) / w + 0.5, y = uv.getY(i) / h + 0.5;
    uv.setXY(i, u0 + x * (u1 - u0), v0 + y * (v1 - v0));
  }
  uv.needsUpdate = true;
}
const phone = new THREE.Group();
phone.visible = false;
scene.add(phone);
const px = 1 / (IMG.bodyR - IMG.bodyL);
const bodyW = 1, bodyH = (IMG.bodyB - IMG.bodyT) * px, bodyR = IMG.bodyRadius * px, depth = 0.082;
const screenW = (IMG.right - IMG.left) * px, screenH = (IMG.bottom - IMG.top) * px, screenR = bodyR - (IMG.left - IMG.bodyL) * px;
const PHONE_SCALE = PHONE_H / bodyH;
{
  const bandMat = new THREE.MeshPhysicalMaterial({ color: 0x55555a, metalness: 1, roughness: 0.34, clearcoat: 0.35, clearcoatRoughness: 0.25, envMapIntensity: 1.3 });
  const bodyGeo = new THREE.ExtrudeGeometry(roundedRect(bodyW, bodyH, bodyR), { depth: depth - 0.024, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.012, bevelSegments: 5, curveSegments: 28 });
  bodyGeo.center();
  const body = new THREE.Mesh(bodyGeo, bandMat);
  phone.add(body);
  const faceShape = roundedRect(bodyW - 0.01, bodyH - 0.01, bodyR - 0.005);
  const bezel = new THREE.Mesh(new THREE.ShapeGeometry(faceShape, 28), new THREE.MeshStandardMaterial({ color: 0x050506, roughness: 0.55, metalness: 0.1 }));
  bezel.position.z = depth / 2 + 0.0005;
  phone.add(bezel);
  const back = new THREE.Mesh(new THREE.ShapeGeometry(faceShape, 28), new THREE.MeshPhysicalMaterial({ color: 0x15151a, roughness: 0.28, metalness: 0.2, clearcoat: 1, clearcoatRoughness: 0.08 }));
  back.rotation.y = Math.PI; back.position.z = -depth / 2 - 0.0005;
  phone.add(back);
  const buttonMat = new THREE.MeshPhysicalMaterial({ color: 0x6a6a70, metalness: 1, roughness: 0.3, envMapIntensity: 1.3 });
  [[bodyW / 2 + 0.004, 0.34, 0.24], [-bodyW / 2 - 0.004, 0.62, 0.08], [-bodyW / 2 - 0.004, 0.42, 0.16], [-bodyW / 2 - 0.004, 0.22, 0.16]].forEach(([x, y, h]) => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.014, h, depth * 0.5), buttonMat);
    b.position.set(x, y, 0); phone.add(b);
  });
  const camGroup = new THREE.Group();
  camGroup.position.set(0.25, 0.68, -depth / 2); camGroup.rotation.y = Math.PI;
  camGroup.add(new THREE.Mesh(new THREE.ExtrudeGeometry(roundedRect(0.4, 0.4, 0.1), { depth: 0.028, bevelEnabled: true, bevelThickness: 0.006, bevelSize: 0.006, bevelSegments: 3, curveSegments: 20 }), bandMat));
  const lensMat = new THREE.MeshPhysicalMaterial({ color: 0x0a0a10, roughness: 0.1, metalness: 0.4, clearcoat: 1, clearcoatRoughness: 0.03 });
  const innerMat = new THREE.MeshPhysicalMaterial({ color: 0x1c2b4a, roughness: 0.05, metalness: 0.6, clearcoat: 1, iridescence: 0.6 });
  [[-0.1, 0.1], [-0.1, -0.1], [0.1, 0]].forEach(([x, y]) => {
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.03, 40), buttonMat); ring.rotation.x = Math.PI / 2; ring.position.set(x, y, 0.04);
    const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.012, 40), lensMat); lens.rotation.x = Math.PI / 2; lens.position.set(x, y, 0.056);
    const inner = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.006, 32), innerMat); inner.rotation.x = Math.PI / 2; inner.position.set(x, y, 0.064);
    camGroup.add(ring, lens, inner);
  });
  phone.add(camGroup);

  // particle form of the phone: its body surface, in the phone's scaled local space
  const sampleBody = new THREE.Mesh(bodyGeo);
  sampleBody.scale.setScalar(PHONE_SCALE);
  sampleBody.updateMatrixWorld();
  geo.setAttribute('aP4', new THREE.BufferAttribute(samplePoints([sampleBody], [1]), 3));

  // screen with the real app UI
  new THREE.TextureLoader().load('assets/MainHero.png', (tex) => {
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    const screenGeo = new THREE.ShapeGeometry(roundedRect(screenW, screenH, screenR), 28);
    mapUVs(screenGeo, screenW, screenH, IMG.left / IMG.w, IMG.right / IMG.w, 1 - IMG.bottom / IMG.h, 1 - IMG.top / IMG.h);
    // unlit so the UI keeps its true colours; a thin clearcoat layer on top gives the glass reflection
    const screen = new THREE.Mesh(screenGeo, new THREE.MeshBasicMaterial({ map: tex, color: 0xe6e6e6, toneMapped: false }));
    screen.position.z = depth / 2 + 0.0012;
    const glass = new THREE.Mesh(screenGeo.clone(), new THREE.MeshPhysicalMaterial({
      color: 0xffffff, transparent: true, opacity: 0.06, roughness: 0.08, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.06, envMapIntensity: 0.9, depthWrite: false,
    }));
    glass.position.z = depth / 2 + 0.0024;
    phone.add(screen, glass);
  });
}

/* ---------- Lights for the phone ---------- */
scene.add(new THREE.AmbientLight(0xffffff, 0.25));
const key = new THREE.DirectionalLight(0xffffff, 2.0); key.position.set(3, 5, 6); scene.add(key);
const warm = new THREE.PointLight(0xff6a2a, 50, 24, 1.6); warm.position.set(-1, -3, 4); scene.add(warm);
const rim = new THREE.PointLight(0xffd9c2, 30, 20, 1.6); rim.position.set(3, 3, -3); scene.add(rim);

/* ---------- Post-processing ---------- */
let composer = null;
if (!coarse) {
  composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  composer.addPass(new UnrealBloomPass(new THREE.Vector2(1, 1), 0.3, 0.6, 0.9));
  composer.addPass(new OutputPass());
}

/* ---------- Camera keyframes per form ---------- */
const SEQ = [[1, 2], [2, 3], [3, 0], [0, 4]];
const CAM = [
  { p: new THREE.Vector3(0, 0, 10), l: new THREE.Vector3(0, 0, 0) },        // wordmark
  { p: new THREE.Vector3(0, 0.3, 10), l: new THREE.Vector3(0, -0.2, 0) },   // planet
  { p: new THREE.Vector3(2.4, 0.9, 9.0), l: new THREE.Vector3(-1.4, 0, 0) }, // helix (sits right of the text)
  { p: new THREE.Vector3(0, 2.6, 8.4), l: new THREE.Vector3(0, -0.9, -1.5) }, // field
  { p: new THREE.Vector3(0, 0, 10), l: new THREE.Vector3(0, 0, 0) },        // phone
];

/* ---------- Layout ---------- */
let stacked = false;
function visibleWidth() { return 2 * Math.tan(THREE.MathUtils.degToRad(16)) * 10 * camera.aspect; }
function layout() {
  stacked = camera.aspect < 1.05;
  const vw = visibleWidth();
  CAM[2].l.x = stacked ? 0 : -1.4;
  const storyWordScale = Math.min(1, (vw * (stacked ? 0.88 : 0.66)) / WORD_W);
  HY.storyWordScale = storyWordScale;
  if (!HY.introDone) {
    // match the loader's DOM logo so the hand-over is seamless
    const mark = document.getElementById('loaderMark');
    const frac = mark ? mark.getBoundingClientRect().width / window.innerWidth : 0.46;
    uniforms.uWordScale.value = Math.max(0.2, (frac * vw) / WORD_W);
  } else uniforms.uWordScale.value = storyWordScale;
  uniforms.uPhoneScale.value = stacked ? 0.78 : (camera.aspect < 1.5 ? 0.92 : 1);
  uniforms.uPhoneOffset.value.set(stacked ? 0 : (camera.aspect < 1.5 ? 1.35 : 1.75), stacked ? 0.55 : -0.05, 0);
  uniforms.uSize.value = (coarse ? 2.1 : 1.55) * (stacked ? 0.9 : 1);
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

/* ---------- Intro hand-over: wordmark → planet ---------- */
const intro = { mix: 0 };
HY.introDone = false;
function startIntro() {
  const g = window.gsap;
  if (reduced || !g) { intro.mix = 1; HY.introDone = true; layout(); return; }
  g.to(intro, { mix: 1, duration: 2.2, ease: 'power3.inOut', onComplete() { HY.introDone = true; layout(); } });
}
window.addEventListener('scene:intro', startIntro, { once: true });

/* ---------- Story: which forms to blend ---------- */
const camPos = new THREE.Vector3(), camLook = new THREE.Vector3();
let smooth = 0;
let phoneIn = 0; // 0..1 once the phone appears

function applyState(dt) {
  smooth += (HY.progress - smooth) * (1 - Math.pow(0.002, dt));
  let from, to, mix;
  if (!HY.introDone) { from = 0; to = 1; mix = intro.mix; }
  else {
    const s = Math.min(3, Math.floor(smooth * 4));
    const f = smooth * 4 - s;
    from = SEQ[s][0]; to = SEQ[s][1];
    mix = THREE.MathUtils.smoothstep(f, 0, 0.62);
  }
  uniforms.uFrom.value = from; uniforms.uTo.value = to; uniforms.uMix.value = mix;
  const e = THREE.MathUtils.smoothstep(mix, 0, 1);
  camPos.lerpVectors(CAM[from].p, CAM[to].p, e);
  camLook.lerpVectors(CAM[from].l, CAM[to].l, e);

  // the phone materialises inside its particle silhouette near the end
  const target = THREE.MathUtils.smoothstep(smooth, 0.88, 0.97);
  phoneIn += (target - phoneIn) * (1 - Math.pow(0.001, dt));
  phone.visible = phoneIn > 0.002;
  const sc = PHONE_SCALE * uniforms.uPhoneScale.value * (0.72 + 0.28 * phoneIn);
  phone.scale.setScalar(sc);
  phone.position.copy(uniforms.uPhoneOffset.value);
  uniforms.uBright.value[4] = 0.8 - 0.55 * phoneIn;
  uniforms.uGlobalAlpha.value = 1;
  return { phoneIn };
}

/* ---------- Pointer ---------- */
const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
window.addEventListener('pointermove', (e) => {
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
  pointer.x += (pointer.tx - pointer.x) * ease * 0.6;
  pointer.y += (pointer.ty - pointer.y) * ease * 0.6;

  uniforms.uTime.value = elapsed;
  uniforms.uYaw.value = pointer.x * 0.22;
  const { phoneIn } = applyState(dt);

  camera.position.set(camPos.x + pointer.x * 0.35, camPos.y + pointer.y * 0.25, camPos.z);
  camera.lookAt(camLook);

  if (phone.visible) {
    phone.rotation.y = (1 - phoneIn) * -1.1 + pointer.x * 0.28 + Math.sin(elapsed * 0.6) * 0.05;
    phone.rotation.x = pointer.y * -0.18 + Math.sin(elapsed * 0.8) * 0.025;
    phone.rotation.z = -0.03 + pointer.x * 0.03;
    phone.position.y = uniforms.uPhoneOffset.value.y + Math.sin(elapsed * 0.9) * 0.05;
  }

  if (composer) composer.render(); else renderer.render(scene, camera);

  if (!ready) {
    ready = true;
    html.classList.add('gl-ready');
    window.dispatchEvent(new CustomEvent('scene:ready'));
  }
}
frame();
