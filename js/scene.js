/* ==========================================================================
   HYAICO — The stage (Three.js)
   Two layers on one fixed canvas:
     • the particle layer (with bloom): points morphing between forms as the
       page scrolls — wordmark, planet horizon, double helix, spiral galaxy,
       HYAICO, then distant dust — plus real geometry that rides along: a
       glowing horizon line, light strands through the helix, a bright
       galaxy core, and a chrome HYAICO that surfaces through the particles
     • the product layer, drawn on top without bloom or tone mapping on its
       screen: the Just Cooked phone rising through a dark reflective floor
       with a holographic grid, lit like a product shot
   The loader hands over to the particle wordmark with a burst, which then
   becomes the planet. Degrades gracefully.
   ========================================================================== */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { SVGLoader } from 'three/addons/loaders/SVGLoader.js';
import { MeshSurfaceSampler } from 'three/addons/math/MeshSurfaceSampler.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { Reflector } from 'three/addons/objects/Reflector.js';
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
HY.outro = 0;      // 0..1 as the ending arrives (main.js)
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
renderer.toneMappingExposure = 1.08;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.autoClear = false;

const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
camera.position.set(0, 0, 10);
const VIS_H = 2 * Math.tan(THREE.MathUtils.degToRad(16)) * 10; // visible height at z = 0

const fx = new THREE.Scene();      // particles + glowing geometry (bloomed)
const front = new THREE.Scene();   // the phone and its floor (drawn on top, no bloom)
const pmrem = new THREE.PMREMGenerator(renderer);
const envMap = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
pmrem.dispose();
front.environment = envMap;
front.environmentIntensity = 0.9;
fx.environment = envMap;

/* ---------- Particles ---------- */
const COUNT = coarse ? 28000 : 60000;
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
function dustPoints() {
  const a = new Float32Array(COUNT * 3);
  for (let i = 0; i < COUNT; i++) { a[i * 3] = (Math.random() - 0.5) * 22; a[i * 3 + 1] = (Math.random() - 0.5) * 12 + 1; a[i * 3 + 2] = -3 - Math.random() * 8; }
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
const HELIX = { turns: 3.2, R: 1.25, H: 6.2 };
function helixPoints() {
  const a = new Float32Array(COUNT * 3);
  const { turns, R, H } = HELIX, rungs = 30;
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
    if (i % 7 === 0) {
      const r = Math.pow(Math.random(), 1.5) * 0.7, th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1);
      x = r * Math.sin(ph) * Math.cos(th); y = r * Math.cos(ph) * 0.55; z = r * Math.sin(ph) * Math.sin(th);
    } else {
      const arm = i % arms, t = Math.pow(Math.random(), 0.65), r = 0.25 + t * R, spread = 0.08 + 0.22 * t;
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
const cloud = cloudPoints();
geo.setAttribute('position', new THREE.BufferAttribute(planet, 3));
geo.setAttribute('aP0', new THREE.BufferAttribute(cloud, 3)); // wordmark (set when the logo loads)
geo.setAttribute('aP1', new THREE.BufferAttribute(planet, 3));
geo.setAttribute('aP2', new THREE.BufferAttribute(cloud, 3)); // helix, galaxy and dust are built after the first frame
geo.setAttribute('aP3', new THREE.BufferAttribute(cloud, 3));
geo.setAttribute('aP4', new THREE.BufferAttribute(cloud, 3));
geo.setAttribute('aRand', new THREE.BufferAttribute(rand, 1));
geo.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
const later = [];
function buildLater() { const job = later.shift(); if (!job) return; job(); setTimeout(buildLater, 40); }
later.push(() => geo.setAttribute('aP2', new THREE.BufferAttribute(helixPoints(), 3)));
later.push(() => geo.setAttribute('aP3', new THREE.BufferAttribute(galaxyPoints(), 3)));
later.push(() => geo.setAttribute('aP4', new THREE.BufferAttribute(dustPoints(), 3)));

const uniforms = {
  uTime: { value: 0 },
  uPixelRatio: { value: 1 },
  uSize: { value: 1.7 },
  uFrom: { value: 0 },
  uTo: { value: 1 },
  uMix: { value: 0 },
  uBright: { value: [1.0, 0.5, 0.85, 0.9, 0.22] },
  uTint: { value: [new THREE.Color(1, 1, 1), new THREE.Color(0.8, 0.9, 1), new THREE.Color(0.6, 0.92, 1), new THREE.Color(1, 0.86, 0.72), new THREE.Color(0.75, 0.82, 1)] },
  uWordScale: { value: 1 },
  uGalaxyScale: { value: 1 },
  uYaw: { value: 0 },
  uPointer: { value: new THREE.Vector2(0, 0) },
  uBurst: { value: 0 },
  uGlobalAlpha: { value: 1 },
  uPlanetY: { value: PLANET_Y },
};

const material = new THREE.ShaderMaterial({
  uniforms, transparent: true, depthWrite: false, depthTest: true, blending: THREE.AdditiveBlending,
  vertexShader: /* glsl */ `
    uniform float uTime, uPixelRatio, uSize, uMix, uWordScale, uGalaxyScale, uYaw, uBurst, uGlobalAlpha, uPlanetY;
    uniform int uFrom, uTo;
    uniform float uBright[5];
    uniform vec3 uTint[5];
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
      return aP4 + vec3(sin(uTime * 0.2 + aRand * 6.0) * 0.3, cos(uTime * 0.15 + aRand * 4.0) * 0.2, 0.0);
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
      p.xy += uPointer * (0.06 + 0.3 * aRand * aRand) * (1.0 + 0.6 * sin(aRand * 40.0));
      p += normalize(p + vec3(0.001, 0.002, 0.003)) * uBurst * (0.5 + aRand * 1.1);
      vec4 mv = modelViewMatrix * vec4(p, 1.0);
      gl_Position = projectionMatrix * mv;
      gl_PointSize = uSize * uPixelRatio * (0.55 + aRand * 0.9) * (10.0 / -mv.z);
      float bright = mix(uBright[uFrom] * glow(uFrom, a), uBright[uTo] * glow(uTo, b), t);
      vec3 tint = mix(uTint[uFrom], uTint[uTo], t);
      float twinkle = 0.7 + 0.3 * sin(uTime * 2.2 + aRand * 40.0);
      vAlpha = uGlobalAlpha * bright * twinkle * (0.45 + 0.55 * aRand) * (1.0 + sw * 0.6 + uBurst * 0.6);
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
fx.add(points);

/* ---------- Glowing geometry that rides with the forms ---------- */
const glowMat = (color, opacity = 0) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false });
function glowTexture(inner, mid) {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  g.addColorStop(0, inner); g.addColorStop(0.3, mid); g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
// the planet's horizon: a thin line of light along the limb
const horizon = new THREE.Mesh(new THREE.TorusGeometry(PLANET_R + 0.03, 0.014, 8, 256), glowMat(0xbfe9ff));
horizon.position.y = PLANET_Y;
fx.add(horizon);
// the helix: two light strands the particles trace
const strands = new THREE.Group();
[0, Math.PI].forEach((phase) => {
  const pts = [];
  for (let i = 0; i <= 420; i++) { const k = i / 420, t = k * Math.PI * 2 * HELIX.turns + phase; pts.push(new THREE.Vector3(Math.cos(t) * HELIX.R, (k - 0.5) * HELIX.H, Math.sin(t) * HELIX.R)); }
  strands.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 420, 0.013, 6, false), glowMat(0x9be8ff)));
});
fx.add(strands);
// the galaxy's core
const core = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture('rgba(255,255,255,1)', 'rgba(255,220,180,0.55)'), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
core.scale.setScalar(1.6);
fx.add(core);
// lights for the chrome wordmark (built once the logo loads)
fx.add(new THREE.DirectionalLight(0xffffff, 1.2).translateX(2).translateY(4).translateZ(6));
const sweep = new THREE.PointLight(0xffffff, 60, 12, 1.8);
sweep.position.set(-6, 1.5, 2.5);
fx.add(sweep);
let chrome = null;

/* ---------- The wordmark form (from the real logo) + the chrome letters ---------- */
new SVGLoader().load('assets/HyaicoWhite.svg', (data) => {
  const s = WORD_W / 619;
  const fronts = [], solids = [];
  chrome = new THREE.Group();
  const chromeMat = new THREE.MeshPhysicalMaterial({ color: 0xf2f2fb, metalness: 1, roughness: 0.16, clearcoat: 1, clearcoatRoughness: 0.1, envMapIntensity: 1.7, transparent: true, opacity: 0, depthWrite: false });
  data.paths.forEach((path) => {
    SVGLoader.createShapes(path).forEach((shape) => {
      const flat = new THREE.ShapeGeometry(shape, 10);
      flat.translate(-309.5, -50.3, 0); flat.scale(s, -s, 1); flat.translate(0, 0, 0.05);
      fronts.push(new THREE.Mesh(flat));
      const ext = new THREE.ExtrudeGeometry(shape, { depth: 14, bevelEnabled: false, curveSegments: 10 });
      ext.translate(-309.5, -50.3, -7); ext.scale(s, -s, s);
      solids.push(new THREE.Mesh(ext));
      const bevelled = new THREE.ExtrudeGeometry(shape, { depth: 16, bevelEnabled: true, bevelThickness: 2.2, bevelSize: 1.8, bevelSegments: 4, curveSegments: 12 });
      bevelled.translate(-309.5, -50.3, -8); bevelled.scale(s, s, s);
      const m = new THREE.Mesh(bevelled, chromeMat); m.rotation.x = Math.PI; chrome.add(m);
    });
  });
  chrome.visible = false;
  fx.add(chrome);
  const pts = samplePoints([new THREE.Mesh(mergeMeshes(fronts)), new THREE.Mesh(mergeMeshes(solids))], [0.7, 0.3]);
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

/* ---------- The phone (to the Just Cooked site's spec) ---------- */
const PHONE = { w: 1, h: 2.07, d: 0.082, r: 0.15, bevel: 0.016 };
const SCREEN = { w: 0.925, h: 2.008, r: 0.105 };
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
/* ShapeGeometry UVs are raw XY; map them to 0..1 across the screen */
function mapUVs(g, w, h) {
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / w + 0.5, uv.getY(i) / h + 0.5);
  uv.needsUpdate = true;
}

/* the screen: pure texture, no lighting, no tone mapping — the UI at its true colours */
const screenMat = new THREE.ShaderMaterial({
  uniforms: { tA: { value: null }, tB: { value: null }, uMix: { value: 0 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `uniform sampler2D tA; uniform sampler2D tB; uniform float uMix; varying vec2 vUv;
    void main(){ vec4 a = texture2D(tA, vUv); vec4 b = texture2D(tB, vUv); gl_FragColor = vec4(mix(a, b, uMix).rgb, 1.0);
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
let screenTarget = 'home', fading = false;
loadScreen('home').then((t) => { if (t) { screenMat.uniforms.tA.value = t; screenMat.uniforms.tB.value = t; } SCREENS.slice(1).forEach(loadScreen); });
function setScreen(k) {
  if (k === screenTarget || !textures[k]) return;
  if (fading) { screenMat.uniforms.tA.value = screenMat.uniforms.tB.value; screenMat.uniforms.uMix.value = 0; }
  screenTarget = k; screenMat.uniforms.tB.value = textures[k]; screenMat.uniforms.uMix.value = 0; fading = true;
}

const phone = new THREE.Group();
front.add(phone);
{
  const b = PHONE.bevel;
  const metal = new THREE.MeshPhysicalMaterial({ color: 0x5c5c64, metalness: 0.92, roughness: 0.3, clearcoat: 0.6, clearcoatRoughness: 0.22 });
  const black = new THREE.MeshPhysicalMaterial({ color: 0x050505, metalness: 0.15, roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.06 });
  const bodyGeo = new THREE.ExtrudeGeometry(roundedRect(PHONE.w - 2 * b, PHONE.h - 2 * b, PHONE.r - b), {
    depth: PHONE.d - 2 * b, bevelEnabled: true, bevelThickness: b, bevelSize: b, bevelOffset: 0, bevelSegments: 4, curveSegments: 24,
  });
  bodyGeo.translate(0, 0, -(PHONE.d - 2 * b) / 2);
  phone.add(new THREE.Mesh(bodyGeo, metal));
  const glass = new THREE.Mesh(new THREE.ShapeGeometry(roundedRect(GLASS.w, GLASS.h, GLASS.r), 18), black);
  glass.position.z = PHONE.d / 2 + 0.0008;
  phone.add(glass);
  const screenGeo = new THREE.ShapeGeometry(roundedRect(SCREEN.w, SCREEN.h, SCREEN.r), 24); // rounded, so it never pokes past the glass
  mapUVs(screenGeo, SCREEN.w, SCREEN.h);
  const screen = new THREE.Mesh(screenGeo, screenMat);
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
}

/* The stage floor: a dark mirror the phone rises through, with a holographic grid */
const floor = new THREE.Group();
front.add(floor);
const mirror = new Reflector(new THREE.PlaneGeometry(22, 14), { color: 0x2c2c33, textureWidth: coarse ? 512 : 1024, textureHeight: coarse ? 256 : 512, clipBias: 0.003, multisample: 0 });
mirror.rotation.x = -Math.PI / 2;
mirror.position.z = -3;
floor.add(mirror);
const floorMat = new THREE.ShaderMaterial({
  transparent: true, depthWrite: false,
  uniforms: { uIn: { value: 0 }, uOpacity: { value: 1 }, uReach: { value: 4.5 }, uColor: { value: new THREE.Color(0x06060a) } },
  vertexShader: 'varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
  fragmentShader: `uniform float uIn, uOpacity, uReach; uniform vec3 uColor; varying vec3 vW;
    void main(){
      float z = vW.z;                                   // the phone stands at z = 0; its reflection lies on the floor in front of it
      float a = z < -0.2 ? 1.0 : pow(clamp(z / uReach, 0.0, 1.0), 0.7); // mirror shows in front of the phone, then fades to dark
      a = mix(1.0, a, uIn);
      gl_FragColor = vec4(uColor, a * uOpacity);
    }`,
});
const floorFade = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), floorMat);
floorFade.rotation.x = -Math.PI / 2;
floorFade.position.set(0, 0.002, -10);
floor.add(floorFade);
const gridMat = new THREE.ShaderMaterial({
  transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  uniforms: { uTime: { value: 0 }, uIn: { value: 0 }, uColorA: { value: new THREE.Color(0x45e3ff) }, uColorB: { value: new THREE.Color(0x7c5cff) } },
  vertexShader: 'varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
  fragmentShader: `uniform float uTime, uIn; uniform vec3 uColorA, uColorB; varying vec3 vW;
    float line(vec2 p, float w){ vec2 g = abs(fract(p - 0.5) - 0.5) / fwidth(p); return 1.0 - smoothstep(0.0, w, min(g.x, g.y)); }
    void main(){
      vec2 p = vW.xz * 1.4;
      float minor = line(p, 1.1) * 0.3, major = line(p * 0.25, 1.3) * 0.8;
      float d = length(vW.xz) / 9.0;
      float fade = smoothstep(1.0, 0.1, d);
      float breathe = 0.85 + 0.15 * sin(uTime * 0.7);
      vec3 col = mix(uColorA, uColorB, clamp(vW.x / 12.0 + 0.5, 0.0, 1.0));
      gl_FragColor = vec4(col, (minor + major) * 0.5 * breathe * fade * uIn);
    }`,
});
const grid = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), gridMat);
grid.rotation.x = -Math.PI / 2;
grid.position.set(0, 0.004, -4);
floor.add(grid);
// a soft column of light behind the phone (bloomed layer)
const shaft = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 11), new THREE.MeshBasicMaterial({ map: glowTexture('rgba(255,255,255,0.9)', 'rgba(170,200,255,0.35)'), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
shaft.scale.set(1, 1.6, 1);
fx.add(shaft);

/* Lights for the phone */
front.add(new THREE.HemisphereLight(0xfff6ec, 0x1a1a22, 0.5));
const key = new THREE.DirectionalLight(0xfff2e4, 2.4); key.position.set(3, 5, 7); front.add(key);
const fill = new THREE.DirectionalLight(0xe4ecdc, 0.9); fill.position.set(-5, -2, 4); front.add(fill);
const rim = new THREE.PointLight(0x9fd8ff, 20, 20, 1.6); rim.position.set(2.5, 3, -3); front.add(rim);

/* ---------- Post-processing (particle layer only) ---------- */
let composer = null;
if (!coarse) {
  composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(fx, camera));
  composer.addPass(new UnrealBloomPass(new THREE.Vector2(1, 1), 0.28, 0.5, 0.9));
  composer.addPass(new OutputPass());
}

/* ---------- Camera keyframes per form ---------- */
const CAM = [
  { p: new THREE.Vector3(0, 0, 10), l: new THREE.Vector3(0, 0, 0) },         // wordmark
  { p: new THREE.Vector3(0, 0.3, 10), l: new THREE.Vector3(0, -0.2, 0) },    // planet
  { p: new THREE.Vector3(2.4, 0.9, 9.0), l: new THREE.Vector3(-1.4, 0, 0) }, // helix (right of the text)
  { p: new THREE.Vector3(0, 4.4, 7.6), l: new THREE.Vector3(0, -0.7, 0) },   // galaxy (seen from above)
  { p: new THREE.Vector3(0, 1.3, 10), l: new THREE.Vector3(0, -0.25, 0) },   // the stage (slightly from above, so the floor reads)
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
const phoneAt = new THREE.Vector3(1.5, 0, 0);
let phoneScale = 1;
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
  phoneScale = (VIS_H * (stacked ? 0.5 : 0.72)) / PHONE.h;
  phoneAt.set(stacked ? 0 : vw * 0.17, stacked ? 0.72 : 0.05, 0);
  floor.position.set(phoneAt.x, phoneAt.y - (PHONE.h / 2) * phoneScale - 0.04, 0);
  floorMat.uniforms.uReach.value = stacked ? 2.0 : 4.5;
  shaft.position.set(phoneAt.x, phoneAt.y + 1.2, -1.4);
  uniforms.uSize.value = (coarse ? 2.0 : 1.7) * (stacked ? 0.9 : 1);
  CAM[2].l.x = stacked ? 0 : -1.4;
  CAM[2].l.y = stacked ? 0.9 : 0;
  CAM[3].l.y = stacked ? -1.4 : -0.7;
  CAM[4].l.y = stacked ? 0.35 : -0.25;
}
function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
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
    .to(uniforms.uBurst, { value: 1, duration: 0.45, ease: 'power2.out' }, 0)
    .to(uniforms.uBurst, { value: 0, duration: 1.7, ease: 'power3.inOut' }, 0.45)
    .to(intro, { mix: 1, duration: 2.3, ease: 'power3.inOut', onComplete() { HY.introDone = true; layout(); } }, 0.35);
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
const weightOf = (st, f) => (st.from === f ? 1 - st.mix : 0) + (st.to === f ? st.mix : 0);

function applyState(dt) {
  smooth += (HY.progress - smooth) * (1 - Math.pow(0.002, dt));
  const st = HY.introDone ? storyState(smooth) : { from: 0, to: 1, mix: intro.mix };
  uniforms.uFrom.value = st.from; uniforms.uTo.value = st.to; uniforms.uMix.value = st.mix;
  const e = THREE.MathUtils.smoothstep(st.mix, 0, 1);
  camPos.lerpVectors(CAM[st.from].p, CAM[st.to].p, e);
  camLook.lerpVectors(CAM[st.from].l, CAM[st.to].l, e);

  /* geometry riding with the forms */
  horizon.material.opacity = weightOf(st, 1) * 0.55;
  const wHelix = weightOf(st, 2);
  strands.visible = wHelix > 0.01;
  strands.children.forEach((m) => { m.material.opacity = wHelix * 0.28; });
  core.material.opacity = weightOf(st, 3) * 0.9;
  /* the chrome HYAICO surfaces through the particle letters, then dissolves with them */
  const chromeIn = HY.introDone ? THREE.MathUtils.smoothstep(smooth, 0.6, 0.645) * (1 - THREE.MathUtils.smoothstep(smooth, 0.685, 0.73)) : 0;
  if (chrome) {
    chrome.visible = chromeIn > 0.002;
    chrome.children.forEach((m) => { m.material.opacity = chromeIn; });
    chrome.scale.setScalar(uniforms.uWordScale.value);
    chrome.rotation.y = uniforms.uYaw.value;
  }
  uniforms.uBright.value[0] = 1 - 0.6 * chromeIn;

  /* the phone rises through the floor, then sinks back as the ending arrives */
  const target = THREE.MathUtils.smoothstep(smooth, 0.76, 0.86) * (1 - THREE.MathUtils.smoothstep(HY.outro, 0, 0.55));
  phoneIn += (target - phoneIn) * (1 - Math.pow(0.001, dt));
  const stageIn = THREE.MathUtils.smoothstep(smooth, 0.72, 0.8) * (1 - THREE.MathUtils.smoothstep(HY.outro, 0.3, 0.9));
  floor.visible = stageIn > 0.002;
  mirror.visible = phoneIn > 0.002;
  phone.visible = phoneIn > 0.002;
  floorMat.uniforms.uIn.value = phoneIn;
  floorMat.uniforms.uOpacity.value = stageIn;
  gridMat.uniforms.uIn.value = stageIn * 0.9;
  shaft.material.opacity = phoneIn * 0.14;
  const rise = 1 - THREE.MathUtils.smoothstep(phoneIn, 0, 1);
  phone.scale.setScalar(phoneScale);
  phone.position.set(phoneAt.x, phoneAt.y - rise * PHONE.h * phoneScale * 1.15, 0);
  uniforms.uGlobalAlpha.value = 1 - 0.6 * THREE.MathUtils.smoothstep(HY.outro, 0, 1);

  /* the app's screens change as the story ends */
  if (HY.introDone) setScreen(smooth < 0.9 ? 'home' : smooth < 0.955 ? 'next-meal' : 'recipe');
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
  gridMat.uniforms.uTime.value = elapsed;
  uniforms.uYaw.value = pointer.x * 0.22;
  uniforms.uPointer.value.set(pointer.x, pointer.y);
  strands.rotation.y = elapsed * 0.3;
  sweep.position.x = Math.sin(elapsed * 0.6) * 5;
  const pin = applyState(dt);

  camera.position.set(camPos.x + pointer.x * 0.12, camPos.y + pointer.y * 0.08, camPos.z);
  camera.lookAt(camLook);

  if (phone.visible) {
    const rest = stacked ? -0.22 : -0.42;
    phone.rotation.y = rest + (1 - pin) * -1.4 + pointer.x * 0.34 + Math.sin(elapsed * 0.6) * 0.03;
    phone.rotation.x = 0.06 - pointer.y * 0.22 + Math.sin(elapsed * 0.8) * 0.015;
    phone.rotation.z = Math.sin(elapsed * 0.6) * 0.012;
    phone.position.y += Math.sin(elapsed * 0.9) * 0.02 * pin;
    if (fading) {
      screenMat.uniforms.uMix.value = Math.min(1, screenMat.uniforms.uMix.value + dt / 0.5);
      if (screenMat.uniforms.uMix.value >= 1) { screenMat.uniforms.tA.value = screenMat.uniforms.tB.value; screenMat.uniforms.uMix.value = 0; fading = false; }
    }
  }

  renderer.clear();
  if (composer) composer.render(); else renderer.render(fx, camera);
  if (floor.visible || phone.visible) { renderer.clearDepth(); renderer.render(front, camera); }

  if (!ready) {
    ready = true;
    html.classList.add('gl-ready');
    window.dispatchEvent(new CustomEvent('scene:ready'));
    setTimeout(buildLater, 60);
  }
}
frame();
