/* ==========================================================================
   HYAICO — The stage (Three.js)
   Two layers on one fixed canvas:
     • the particle layer (multisampled, with bloom): points morphing between
       forms as the page scrolls, with real geometry riding along — an Earth
       with blue oceans and green land whose continents are made of the
       particles themselves, glowing connection arcs, an atmosphere rim and
       atom orbits with comet-trail electrons; a neon DNA helix that grows into
       place as the particles arrive; a galaxy whose core travels down to
       become the setting sun; distant dust; and finally the particles that
       write HYAICO before a chrome HYAICO takes their place
     • the product layer, drawn on top without bloom or tone mapping on its
       screen: the Just Cooked phone standing on water under a sunset sky
       with drifting clouds
   Order: globe → helix → galaxy → the phone → chrome HYAICO → the ending,
   where the chrome glides down and becomes the footer wordmark.
   ========================================================================== */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { SVGLoader } from 'three/addons/loaders/SVGLoader.js';
import { MeshSurfaceSampler } from 'three/addons/math/MeshSurfaceSampler.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { Water } from 'three/addons/objects/Water.js';
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
HY.screen = 'home';

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
} catch (err) {
  html.classList.add('no-webgl');
  throw err;
}
renderer.setClearColor(0x000000, 0);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.autoClear = false;
renderer.localClippingEnabled = true;

const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
camera.position.set(0, 0, 10);
const VIS_H = 2 * Math.tan(THREE.MathUtils.degToRad(16)) * 10; // visible height at z = 0

const fx = new THREE.Scene();      // particles + glowing geometry (bloomed)
const front = new THREE.Scene();   // the phone, the water and the sky (drawn on top, no bloom)
const pmrem = new THREE.PMREMGenerator(renderer);
const envMap = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
pmrem.dispose();
front.environment = envMap;
front.environmentIntensity = 0.9;
fx.environment = envMap;
const texLoader = new THREE.TextureLoader();

/* ---------- Particles ---------- */
const COUNT = coarse ? 28000 : 60000;
const WORD_W = 5.6;
const PLANET_R = 3.6, PLANET_Y = -4.6, PLANET_TILT = -0.5;
const HELIX = { turns: 3.0, R: 0.95, H: 6.4, pairs: 30 };

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
/* an even shell, used until the land mask arrives and the particles settle on the continents */
function planetPoints() {
  const a = new Float32Array(COUNT * 3);
  for (let i = 0; i < COUNT; i++) {
    const th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1);
    const r = PLANET_R + 0.01;
    a[i * 3] = r * Math.sin(ph) * Math.cos(th); a[i * 3 + 1] = r * Math.cos(ph); a[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th);
  }
  return a;
}
/* the helix particles: a tight sheath on the backbones, some along the base pairs, a few loose sparks */
function helixPoints() {
  const a = new Float32Array(COUNT * 3);
  const { turns, R, H, pairs } = HELIX;
  for (let i = 0; i < COUNT; i++) {
    let x, y, z;
    const m = i % 10;
    if (m < 2) {
      const j = (Math.random() * pairs) | 0, k = (j + 0.5) / pairs, t = k * Math.PI * 2 * turns, s = Math.random() * 2 - 1;
      x = Math.cos(t) * R * s + gauss() * 0.02; y = (k - 0.5) * H + gauss() * 0.02; z = Math.sin(t) * R * s + gauss() * 0.02;
    } else if (m < 8) {
      const k = Math.random(), t = k * Math.PI * 2 * turns + (i % 2 ? Math.PI : 0), r = R + gauss() * 0.05;
      x = Math.cos(t) * r; y = (k - 0.5) * H + gauss() * 0.04; z = Math.sin(t) * r;
    } else {
      const k = Math.random(), t = k * Math.PI * 2 * turns + (i % 2 ? Math.PI : 0), r = R + 0.2 + Math.random() * 0.9;
      x = Math.cos(t) * r + gauss() * 0.25; y = (k - 0.5) * H + gauss() * 0.35; z = Math.sin(t) * r + gauss() * 0.25;
    }
    a[i * 3] = x; a[i * 3 + 1] = y; a[i * 3 + 2] = z;
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
geo.setAttribute('aP1', new THREE.BufferAttribute(planet, 3)); // the continents (set when the land mask loads)
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
  uFrom: { value: 1 },
  uTo: { value: 1 },
  uMix: { value: 0 },
  uBright: { value: [1.0, 0.55, 0.4, 0.9, 0.22] },
  uTint: { value: [new THREE.Color(1, 1, 1), new THREE.Color(0.78, 1, 0.84), new THREE.Color(0.5, 0.78, 1), new THREE.Color(1, 0.86, 0.72), new THREE.Color(0.75, 0.82, 1)] },
  uWordScale: { value: 1 },
  uGalaxyScale: { value: 1 },
  uHelixOffset: { value: new THREE.Vector3(1.6, 0, 0) },
  uHelixScale: { value: 1 },
  uLean: { value: 0 },
  uSolid: { value: 1 },
  uYaw: { value: 0 },
  uPointer: { value: new THREE.Vector2(0, 0) },
  uGlobalAlpha: { value: 1 },
  uPlanetY: { value: PLANET_Y - 3 },
};

const material = new THREE.ShaderMaterial({
  uniforms, transparent: true, depthWrite: false, depthTest: true, blending: THREE.AdditiveBlending,
  vertexShader: /* glsl */ `
    uniform float uTime, uPixelRatio, uSize, uMix, uWordScale, uGalaxyScale, uYaw, uGlobalAlpha, uPlanetY, uLean, uSolid, uHelixScale;
    uniform int uFrom, uTo;
    uniform float uBright[5];
    uniform vec3 uTint[5];
    uniform vec3 uHelixOffset;
    uniform vec2 uPointer;
    attribute vec3 aP0; attribute vec3 aP1; attribute vec3 aP2; attribute vec3 aP3; attribute vec3 aP4;
    attribute float aRand; attribute vec3 aColor;
    varying float vAlpha; varying vec3 vColor;

    vec3 rotY(vec3 p, float a) { float c = cos(a), s = sin(a); return vec3(c * p.x + s * p.z, p.y, -s * p.x + c * p.z); }
    vec3 rotX(vec3 p, float a) { float c = cos(a), s = sin(a); return vec3(p.x, c * p.y - s * p.z, s * p.y + c * p.z); }
    vec3 rotZ(vec3 p, float a) { float c = cos(a), s = sin(a); return vec3(c * p.x - s * p.y, s * p.x + c * p.y, p.z); }

    /* the globe spins on its tilted axis, exactly like the body under the particles */
    vec3 onGlobe(vec3 q) { return rotX(rotY(q, uTime * 0.05), ${PLANET_TILT.toFixed(2)}); }

    vec3 form(int i) {
      if (i == 0) return rotY(aP0 * uWordScale, uYaw);
      if (i == 1) return onGlobe(aP1) + vec3(0.0, uPlanetY, 0.0);
      if (i == 2) return rotZ(rotY(aP2 * uHelixScale, uTime * 0.3), uLean) + uHelixOffset;
      if (i == 3) return rotY(aP3 * uGalaxyScale, uTime * 0.12);
      return aP4 + vec3(sin(uTime * 0.2 + aRand * 6.0) * 0.3, cos(uTime * 0.15 + aRand * 4.0) * 0.2, 0.0);
    }
    /* the galaxy's colour runs from a warm core out to blue-white arms, with a few rose nebulae along them */
    vec3 tintOf(int i, vec3 p) {
      vec3 t = uTint[i];
      if (i == 3) {
        float r = length(p.xz) / uGalaxyScale;
        t = mix(vec3(1.0, 0.9, 0.72), vec3(0.62, 0.8, 1.0), smoothstep(0.5, 2.6, r));
        t = mix(t, vec3(1.0, 0.7, 0.85), step(0.93, aRand) * smoothstep(1.0, 2.0, r) * 0.85);
      }
      return t;
    }
    float glow(int i, vec3 p) {
      if (i == 3) return 1.0 + 1.6 * max(0.0, 1.0 - length(p.xz) / (3.2 * uGalaxyScale));
      if (i == 1) {
        /* the globe is solid: particles on its far side are hidden */
        vec3 n = onGlobe(normalize(aP1));
        float facing = n.z * 0.9 + n.y * 0.43;
        return mix(1.0, smoothstep(-0.3, 0.05, facing), uSolid);
      }
      return 1.0;
    }

    void main() {
      /* the helix forms and dissolves from the bottom up; every other form arrives with a random stagger */
      float yN = clamp((aP2.y + ${(HELIX.H / 2).toFixed(2)}) / ${HELIX.H.toFixed(2)}, 0.0, 1.0);
      bool hx = (uTo == 2 && uFrom != 2) || (uFrom == 2 && uTo != 2);
      float delay = hx ? yN * 0.6 + aRand * 0.06 : aRand * 0.3;
      float win = hx ? 0.4 : 0.7;
      float t = smoothstep(0.0, 1.0, clamp((uMix - delay) / win, 0.0, 1.0));
      vec3 a = form(uFrom), b = form(uTo);
      vec3 p = mix(a, b, t);
      float sw = 4.0 * t * (1.0 - t);
      p = rotY(p, sw * 0.5);   /* forms swirl into one another */
      p += vec3(sin(p.y * 1.7 + uTime * 1.3 + aRand * 6.2831), cos(p.x * 1.3 + uTime * 0.9 + aRand * 3.1), sin(p.z * 1.9 + uTime * 1.1 + aRand * 2.0)) * sw * 0.35;
      p += vec3(sin(uTime * 0.6 + aRand * 9.0), cos(uTime * 0.45 + aRand * 7.0), sin(uTime * 0.5 + aRand * 5.0)) * 0.012;
      /* individual parallax — but the continents hold their shape */
      float onLand = mix(float(uFrom == 1), float(uTo == 1), t);
      p.xy += uPointer * (0.04 + 0.2 * aRand * aRand) * (1.0 + 0.6 * sin(aRand * 40.0)) * mix(1.0, 0.15, onLand);
      vec4 mv = modelViewMatrix * vec4(p, 1.0);
      gl_Position = projectionMatrix * mv;
      gl_PointSize = uSize * uPixelRatio * (0.55 + aRand * 0.9) * (10.0 / -mv.z);
      float bright = mix(uBright[uFrom] * glow(uFrom, a), uBright[uTo] * glow(uTo, b), t);
      vec3 tint = mix(tintOf(uFrom, a), tintOf(uTo, b), t);
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
fx.add(points);

/* ---------- Glowing geometry that rides with the forms ---------- */
function glowTexture(inner, mid) {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  g.addColorStop(0, inner); g.addColorStop(0.3, mid); g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const SIMPLE_VS = 'varying vec3 vN; varying vec3 vV; varying vec2 vUv; void main(){ vUv = uv; vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }';

/* The Earth: a body with blue oceans and green land, lit from the upper left, with a blue rim; a dot grid on the land;
   latitude and longitude lines; connection arcs with light travelling along them. The far side hides behind the body. */
const globe = new THREE.Group();
globe.rotation.order = 'XYZ';
fx.add(globe);
const bodyMat = new THREE.ShaderMaterial({
  uniforms: { uLand: { value: null } },
  vertexShader: SIMPLE_VS,
  fragmentShader: `uniform sampler2D uLand; varying vec3 vN; varying vec3 vV; varying vec2 vUv;
    void main(){
      float land = texture2D(uLand, vUv).r;
      vec3 n = normalize(vN), v = normalize(vV);
      float l = max(dot(n, normalize(vec3(-0.45, 0.75, 0.6))), 0.0);
      float fr = pow(1.0 - max(dot(n, v), 0.0), 3.0);
      vec3 ocean = mix(vec3(0.003, 0.01, 0.03), vec3(0.014, 0.07, 0.19), l);
      vec3 green = mix(vec3(0.005, 0.016, 0.007), vec3(0.04, 0.17, 0.065), l);
      vec3 col = mix(ocean, green, land) + vec3(0.1, 0.32, 0.6) * fr * 0.4;
      gl_FragColor = vec4(col, 1.0);
    }`,
});
const body = new THREE.Mesh(new THREE.SphereGeometry(PLANET_R - 0.02, 96, 64), bodyMat);
body.renderOrder = -1;
globe.add(body);
const haloMat = new THREE.ShaderMaterial({
  uniforms: { uOpacity: { value: 0 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  vertexShader: SIMPLE_VS,
  fragmentShader: `uniform float uOpacity; varying vec3 vN; varying vec3 vV;
    void main(){ float fr = pow(1.0 - max(dot(normalize(vN), normalize(vV)), 0.0), 4.5); gl_FragColor = vec4(vec3(0.35, 0.7, 1.0) * fr * 0.55, fr * uOpacity); }`,
});
globe.add(new THREE.Mesh(new THREE.SphereGeometry(PLANET_R * 1.03, 72, 48), haloMat));

const FACING_VS = `uniform float uOpacity, uTime; attribute vec3 aN; attribute float aR; varying float vA;
  void main(){
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    float facing = dot(normalize(normalMatrix * aN), normalize(-mv.xyz));
    vA = uOpacity * smoothstep(-0.08, 0.4, facing) * (0.78 + 0.22 * sin(uTime * 1.6 + aR * 40.0));
    gl_Position = projectionMatrix * mv;
    gl_PointSize = 2.6 * PIXEL_RATIO * (10.0 / -mv.z);
  }`;
const landMat = new THREE.ShaderMaterial({
  uniforms: { uOpacity: { value: 0 }, uTime: uniforms.uTime, uPixelRatio: uniforms.uPixelRatio },
  transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  vertexShader: 'uniform float uPixelRatio;\n#define PIXEL_RATIO uPixelRatio\n' + FACING_VS,
  fragmentShader: `varying float vA; void main(){ vec2 c = gl_PointCoord - 0.5; float d = length(c); if (d > 0.5) discard; float a = smoothstep(0.5, 0.12, d); gl_FragColor = vec4(vec3(0.72, 1.0, 0.82) * 1.1, a * vA); }`,
});
const land = new THREE.Points(new THREE.BufferGeometry(), landMat);
land.frustumCulled = false;
globe.add(land);
const arcs = new THREE.Group();
globe.add(arcs);
const arcMats = [];
const arcFadeY = { value: -0.6 };   // world height above which the arcs fade, so they stay clear of the title
texLoader.load('assets/earth-land.png', (t) => {
  /* the land mask (NASA Blue Marble, via the three.js examples) colours the body… */
  t.colorSpace = THREE.NoColorSpace; t.wrapS = THREE.RepeatWrapping; t.minFilter = THREE.LinearMipmapLinearFilter; t.anisotropy = 4;
  bodyMat.uniforms.uLand.value = t;
  /* …and gives the continents their dot grid, their particles and their connections */
  const img = t.image, W = img.naturalWidth || img.width, H = img.naturalHeight || img.height;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0);
  const px = ctx.getImageData(0, 0, W, H).data;
  const isLand = (lon, lat) => {
    const x = Math.min(W - 1, Math.floor(((lon + Math.PI) / (Math.PI * 2)) * W)), y = Math.min(H - 1, Math.floor(((Math.PI / 2 - lat) / Math.PI) * H));
    return px[(y * W + x) * 4] > 128;
  };
  const toXYZ = (lon, lat, r) => [Math.cos(lat) * Math.cos(lon) * r, Math.sin(lat) * r, -Math.cos(lat) * Math.sin(lon) * r];

  const pos = [], nrm = [], rr = [], grid = [];
  const step = THREE.MathUtils.degToRad(coarse ? 1.6 : 1.15);
  let row = 0;
  for (let lat = -Math.PI / 2 + step / 2; lat < Math.PI / 2; lat += step, row++) {
    const n = Math.max(1, Math.round((Math.PI * 2 * Math.cos(lat)) / step));
    const off = (row % 2) * 0.5;
    for (let j = 0; j < n; j++) {
      const lon = ((j + off) / n) * Math.PI * 2 - Math.PI;
      if (!isLand(lon, lat)) continue;
      const [x, y, z] = toXYZ(lon, lat, 1);
      pos.push(x * (PLANET_R + 0.01), y * (PLANET_R + 0.01), z * (PLANET_R + 0.01)); nrm.push(x, y, z); rr.push(Math.random());
      grid.push([x, y, z]);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('aN', new THREE.Float32BufferAttribute(nrm, 3));
  g.setAttribute('aR', new THREE.Float32BufferAttribute(rr, 1));
  land.geometry.dispose();
  land.geometry = g;

  /* the particles settle on the continents: the land is what later leaves to become the helix */
  const a = new Float32Array(COUNT * 3);
  for (let i = 0; i < COUNT; i++) {
    let lon, lat, tries = 0;
    do { lon = Math.random() * Math.PI * 2 - Math.PI; lat = Math.asin(Math.random() * 2 - 1); } while (!isLand(lon, lat) && ++tries < 40);
    const [x, y, z] = toXYZ(lon, lat, PLANET_R + 0.012 + Math.random() * 0.03);
    a[i * 3] = x; a[i * 3 + 1] = y; a[i * 3 + 2] = z;
  }
  geo.setAttribute('aP1', new THREE.BufferAttribute(a, 3));

  /* connections: arcs between places on land, each with a pulse of light running along it */
  const A = new THREE.Vector3(), B = new THREE.Vector3(), P = new THREE.Vector3();
  let made = 0, guard = 0;
  while (made < 24 && guard++ < 6000) {
    const p = grid[(Math.random() * grid.length) | 0], q = grid[(Math.random() * grid.length) | 0];
    A.set(p[0], p[1], p[2]); B.set(q[0], q[1], q[2]);
    const ang = A.angleTo(B);
    if (ang < 0.35 || ang > 1.5) continue;
    const pts = [];
    for (let i = 0; i <= 48; i++) {
      const k = i / 48;
      P.copy(A).lerp(B, k).normalize().multiplyScalar(PLANET_R + 0.02 + Math.sin(k * Math.PI) * (0.14 + ang * 0.22));
      pts.push(P.clone());
    }
    const mat = new THREE.ShaderMaterial({
      uniforms: { uOpacity: { value: 0 }, uTime: uniforms.uTime, uSeed: { value: Math.random() }, uSpeed: { value: 0.12 + Math.random() * 0.1 }, uFadeY: arcFadeY },
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: 'varying vec2 vUv; varying vec3 vW; void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
      fragmentShader: `uniform float uOpacity, uTime, uSeed, uSpeed, uFadeY; varying vec2 vUv; varying vec3 vW;
        void main(){ float d = fract(uSeed + uTime * uSpeed - vUv.x); float pulse = exp(-d * 9.0); float ends = smoothstep(0.0, 0.08, vUv.x) * smoothstep(1.0, 0.92, vUv.x);
          float below = 1.0 - smoothstep(uFadeY - 0.45, uFadeY, vW.y);   /* nothing rises into the title */
          gl_FragColor = vec4(vec3(0.62, 0.92, 1.0) * (0.5 + pulse * 1.4), (0.28 + pulse * 1.2) * ends * below * uOpacity); }`,
    });
    arcMats.push(mat);
    arcs.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 48, 0.021, 6, false), mat));
    made++;
  }
  HY.arcs = made; HY.landPoints = grid.length;
}, undefined, () => {});
const lineMat = new THREE.ShaderMaterial({
  uniforms: { uOpacity: { value: 0 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  vertexShader: `uniform float uOpacity; attribute vec3 aN; varying float vA;
    void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); float facing = dot(normalize(normalMatrix * aN), normalize(-mv.xyz)); vA = uOpacity * smoothstep(-0.1, 0.4, facing); gl_Position = projectionMatrix * mv; }`,
  fragmentShader: 'varying float vA; void main(){ gl_FragColor = vec4(vec3(0.5, 0.83, 1.0), vA); }',
});
{
  const pos = [], nrm = [];
  const R = PLANET_R + 0.015;
  const seg = (ax, ay, az, bx, by, bz) => { pos.push(ax * R, ay * R, az * R, bx * R, by * R, bz * R); nrm.push(ax, ay, az, bx, by, bz); };
  for (let m = 0; m < 9; m++) { // meridians, every 20°
    const a = (m / 9) * Math.PI;
    for (let i = 0; i < 120; i++) {
      const t0 = (i / 120) * Math.PI * 2, t1 = ((i + 1) / 120) * Math.PI * 2;
      seg(Math.cos(t0) * Math.cos(a), Math.sin(t0), Math.cos(t0) * Math.sin(a), Math.cos(t1) * Math.cos(a), Math.sin(t1), Math.cos(t1) * Math.sin(a));
    }
  }
  for (let p = 1; p < 9; p++) { // parallels, every 20°
    const lat = -Math.PI / 2 + (p / 9) * Math.PI, r = Math.cos(lat), y = Math.sin(lat);
    for (let i = 0; i < 120; i++) {
      const t0 = (i / 120) * Math.PI * 2, t1 = ((i + 1) / 120) * Math.PI * 2;
      seg(Math.cos(t0) * r, y, Math.sin(t0) * r, Math.cos(t1) * r, y, Math.sin(t1) * r);
    }
  }
  const lg = new THREE.BufferGeometry();
  lg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  lg.setAttribute('aN', new THREE.Float32BufferAttribute(nrm, 3));
  globe.add(new THREE.LineSegments(lg, lineMat));
}

/* The atom: three orbits around the globe at steep, crossing angles, each a crisp ring with a soft halo
   and an electron trailing a comet tail */
const ORBIT_R = 4.2;
const orbits = new THREE.Group();
fx.add(orbits);
const electronTex = glowTexture('rgba(255,255,255,1)', 'rgba(170,232,255,0.55)');
const RING_FS = `uniform float uHead, uOpacity, uHalo; uniform vec3 uColor; varying vec2 vUv;
  void main(){ float d = fract(uHead - vUv.x); float trail = exp(-d * 6.5); gl_FragColor = vec4(uColor * (0.6 + trail * 1.4), (0.3 + trail * 1.0) * uOpacity * uHalo); }`;
const RING_VS = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }';
const rings = [[0.62, 0.0, 0x9be8ff, 0.5, 0.4], [1.0, 0.75, 0xd2c4ff, 0.62, 2.5], [1.0, -0.75, 0x9be8ff, 0.74, 4.4]].map(([tilt, roll, color, speed, phase]) => {
  const ring = new THREE.Group();
  ring.rotation.order = 'ZYX';
  ring.rotation.set(tilt, 0, roll);
  const shared = { uHead: { value: 0 }, uOpacity: { value: 0 }, uColor: { value: new THREE.Color(color) } };
  const mat = new THREE.ShaderMaterial({ uniforms: { ...shared, uHalo: { value: 1 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, vertexShader: RING_VS, fragmentShader: RING_FS });
  const haloMat = new THREE.ShaderMaterial({ uniforms: { ...shared, uHalo: { value: 0.11 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, vertexShader: RING_VS, fragmentShader: RING_FS });
  ring.add(new THREE.Mesh(new THREE.TorusGeometry(ORBIT_R, 0.02, 8, 360), mat));
  ring.add(new THREE.Mesh(new THREE.TorusGeometry(ORBIT_R, 0.085, 8, 360), haloMat));
  const electron = new THREE.Sprite(new THREE.SpriteMaterial({ map: electronTex, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
  electron.scale.setScalar(0.8);
  ring.add(electron);
  orbits.add(ring);
  return { shared, electron, speed, phase };
});

/* The helix: two backbones, colour-paired base rungs and nodes at the joints, drawn as light rather than plastic —
   a hologram shader with bright rims and pulses running up the strands. It grows in from the bottom as the particles
   arrive, and dissolves the same way. */
const clipTop = new THREE.Plane(new THREE.Vector3(0, -1, 0), 100);
const clipBottom = new THREE.Plane(new THREE.Vector3(0, 1, 0), 100);
const dnaRig = new THREE.Group();
fx.add(dnaRig);
const dna = new THREE.Group();
dnaRig.add(dna);
const dnaOpacity = { value: 0 };
function neonMat(color, core, pulse) {
  return new THREE.ShaderMaterial({
    uniforms: { uOpacity: dnaOpacity, uTime: uniforms.uTime, uColor: { value: new THREE.Color(color) }, uCore: { value: new THREE.Color(core) }, uPulse: { value: pulse } },
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, clipping: true, clippingPlanes: [clipTop, clipBottom],
    vertexShader: `#include <clipping_planes_pars_vertex>
      varying vec3 vN; varying vec3 vV; varying vec2 vUv;
      void main(){ vUv = uv; vec4 mvPosition = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mvPosition.xyz); gl_Position = projectionMatrix * mvPosition;
        #include <clipping_planes_vertex>
      }`,
    fragmentShader: `#include <clipping_planes_pars_fragment>
      uniform float uOpacity, uTime, uPulse; uniform vec3 uColor, uCore; varying vec3 vN; varying vec3 vV; varying vec2 vUv;
      void main(){
        #include <clipping_planes_fragment>
        float nv = max(dot(normalize(vN), normalize(vV)), 0.0);
        float rim = pow(1.0 - nv, 1.6);
        float core = pow(nv, 2.5);
        float pulse = uPulse * exp(-fract(vUv.x * 2.0 - uTime * 0.3) * 8.0);
        vec3 col = uColor * (0.4 + rim * 1.3 + pulse * 0.9) + uCore * core * (0.5 + pulse * 0.8);
        gl_FragColor = vec4(col, (0.32 + rim * 0.75 + pulse * 0.4) * uOpacity);
      }`,
  });
}
{
  /* all shades of blue: two continuous backbones, rungs in a light and a deep blue */
  const strand = neonMat(0x3d9bff, 0xcfe8ff, 1);
  const light = neonMat(0x5cc8ff, 0xd0f4ff, 0);
  const deep = neonMat(0x2457ff, 0xb3c8ff, 0);
  const { turns, R, H, pairs } = HELIX;
  [0, Math.PI].forEach((phase) => {
    const pts = [];
    for (let i = 0; i <= 600; i++) { const k = i / 600, t = k * Math.PI * 2 * turns + phase; pts.push(new THREE.Vector3(Math.cos(t) * R, (k - 0.5) * H, Math.sin(t) * R)); }
    dna.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 600, 0.06, 12, false), strand));
  });
  const up = new THREE.Vector3(0, 1, 0);
  const rungGeo = new THREE.CylinderGeometry(0.03, 0.03, 1, 10);
  for (let j = 0; j < pairs; j++) {
    const k = (j + 0.5) / pairs, t = k * Math.PI * 2 * turns, y = (k - 0.5) * H;
    const A = new THREE.Vector3(Math.cos(t) * R, y, Math.sin(t) * R), B = new THREE.Vector3(-A.x, y, -A.z), M = new THREE.Vector3(0, y, 0);
    [[A, M, light], [M, B, deep]].forEach(([p, q, mat]) => {
      const m = new THREE.Mesh(rungGeo, mat);
      m.position.copy(p).add(q).multiplyScalar(0.5);
      m.scale.y = p.distanceTo(q) * 0.94;
      m.quaternion.setFromUnitVectors(up, q.clone().sub(p).normalize());
      dna.add(m);
    });
  }
}

/* the galaxy's core — which later travels down to the horizon and becomes the setting sun */
const core = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture('rgba(255,255,255,1)', 'rgba(255,205,150,0.6)'), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
core.scale.setScalar(1.6);
fx.add(core);
const sunPos = new THREE.Vector3(1.5, -2, -10.8);
const ORIGIN = new THREE.Vector3();

/* deep space around the galaxy: thousands of distant stars and a soft nebula haze */
const STAR_COUNT = coarse ? 1600 : 3600;
const starGeo = new THREE.BufferGeometry();
{
  const p = new Float32Array(STAR_COUNT * 3), r = new Float32Array(STAR_COUNT);
  for (let i = 0; i < STAR_COUNT; i++) {
    const th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1), rad = 28 + Math.random() * 30;
    p[i * 3] = rad * Math.sin(ph) * Math.cos(th); p[i * 3 + 1] = rad * Math.cos(ph); p[i * 3 + 2] = rad * Math.sin(ph) * Math.sin(th);
    r[i] = Math.random();
  }
  starGeo.setAttribute('position', new THREE.BufferAttribute(p, 3));
  starGeo.setAttribute('aR', new THREE.BufferAttribute(r, 1));
}
const starMat = new THREE.ShaderMaterial({
  uniforms: { uOpacity: { value: 0 }, uTime: uniforms.uTime, uPixelRatio: uniforms.uPixelRatio },
  transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  vertexShader: `uniform float uOpacity, uTime, uPixelRatio; attribute float aR; varying float vA; varying float vR;
    void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv; gl_PointSize = (1.3 + aR * 2.2) * uPixelRatio; vR = aR;
      vA = uOpacity * (0.35 + 0.65 * aR) * (0.7 + 0.3 * sin(uTime * (0.8 + aR * 2.5) + aR * 60.0)); }`,
  fragmentShader: `varying float vA; varying float vR; void main(){ vec2 c = gl_PointCoord - 0.5; float d = length(c); if (d > 0.5) discard; float a = smoothstep(0.5, 0.08, d);
    vec3 col = mix(vec3(0.75, 0.85, 1.0), vec3(1.0, 0.92, 0.8), step(0.8, vR)); gl_FragColor = vec4(col, a * vA); }`,
});
const stars = new THREE.Points(starGeo, starMat);
stars.frustumCulled = false;
fx.add(stars);
function softTexture(rgb) {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  g.addColorStop(0, `rgba(${rgb},1)`); g.addColorStop(0.35, `rgba(${rgb},0.45)`); g.addColorStop(0.7, `rgba(${rgb},0.12)`); g.addColorStop(1, `rgba(${rgb},0)`);
  ctx.fillStyle = g; ctx.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
/* a handful of brighter stars with four-point flares */
function flareTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.12, 'rgba(255,255,255,0.7)'); g.addColorStop(0.4, 'rgba(200,225,255,0.08)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 128, 128);
  [[0, 64, 128, 64], [64, 0, 64, 128]].forEach(([x0, y0, x1, y1]) => {
    const lg = ctx.createLinearGradient(x0, y0, x1, y1);
    lg.addColorStop(0, 'rgba(255,255,255,0)'); lg.addColorStop(0.5, 'rgba(255,255,255,0.75)'); lg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.strokeStyle = lg; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
  });
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const flareTex = flareTexture();
const flares = Array.from({ length: 14 }, (_, i) => {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: flareTex, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
  const th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1) * 0.5, rad = 24 + Math.random() * 14;
  s.position.set(rad * Math.sin(ph) * Math.cos(th), rad * Math.cos(ph) * 0.6 + 4, rad * Math.sin(ph) * Math.sin(th) - 8);
  s.scale.setScalar(1.2 + Math.random() * 2.2);
  s.userData = { max: 0.45 + Math.random() * 0.5, spin: Math.random() * Math.PI, i };
  fx.add(s);
  return s;
});
const nebulae = [['120,90,255', 11, 0.07, 1.4, -1.6], ['255,160,110', 5.5, 0.1, -0.4, 0.2], ['60,140,255', 8, 0.06, -2.6, 1.4], ['255,110,170', 6, 0.05, 2.8, 1.2]].map(([rgb, scale, opacity, x, z]) => {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: softTexture(rgb), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
  s.scale.setScalar(scale);
  s.position.set(x, -0.2, z);
  s.userData.max = opacity;
  fx.add(s);
  return s;
});

/* lights for the chrome wordmark */
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
  HY.screen = k;
  window.dispatchEvent(new CustomEvent('scene:screen', { detail: k }));
}

const phone = new THREE.Group();
front.add(phone);
{
  const b = PHONE.bevel;
  const metal = new THREE.MeshPhysicalMaterial({ color: 0x5c5c64, metalness: 0.92, roughness: 0.3, clearcoat: 0.6, clearcoatRoughness: 0.22 });
  const black = new THREE.MeshPhysicalMaterial({ color: 0x050505, metalness: 0.15, roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.06 });
  const bodyGeo = new THREE.ExtrudeGeometry(roundedRect(PHONE.w - 2 * b, PHONE.h - 2 * b, PHONE.r - b), {
    depth: PHONE.d - 2 * b, bevelEnabled: true, bevelThickness: b, bevelSize: b, bevelOffset: 0, bevelSegments: 5, curveSegments: 32,
  });
  bodyGeo.translate(0, 0, -(PHONE.d - 2 * b) / 2);
  phone.add(new THREE.Mesh(bodyGeo, metal));
  const glass = new THREE.Mesh(new THREE.ShapeGeometry(roundedRect(GLASS.w, GLASS.h, GLASS.r), 24), black);
  glass.position.z = PHONE.d / 2 + 0.0008;
  phone.add(glass);
  const screenGeo = new THREE.ShapeGeometry(roundedRect(SCREEN.w, SCREEN.h, SCREEN.r), 24);
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

/* The stage: a sunset sky with a half-set sun and drifting clouds, and water the phone stands on, reflecting both */
const stage = new THREE.Group();
front.add(stage);
const SKY = { zenith: new THREE.Color(0x0f1133), mid: new THREE.Color(0x56244f), low: new THREE.Color(0x8c3f1d), sun: new THREE.Color(0xffa058) };
const skyMat = new THREE.ShaderMaterial({
  transparent: true, depthWrite: false,
  uniforms: { uIn: { value: 0 }, uHorizon: { value: -2 }, uSunX: { value: 1.5 }, uSunR: { value: 1.1 }, uShadeX: { value: -3 }, uTime: uniforms.uTime, uZenith: { value: SKY.zenith }, uMid: { value: SKY.mid }, uLow: { value: SKY.low }, uSun: { value: SKY.sun } },
  vertexShader: 'varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
  fragmentShader: `uniform float uIn, uHorizon, uSunX, uSunR, uShadeX, uTime; uniform vec3 uZenith, uMid, uLow, uSun; varying vec3 vW;
    float hash21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
    float vnoise(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
      return mix(mix(hash21(i), hash21(i + vec2(1.0, 0.0)), u.x), mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), u.x), u.y); }
    float fbm(vec2 p){ float v = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { v += a * vnoise(p); p = p * 2.03 + vec2(17.1, 9.2); a *= 0.5; } return v; }
    /* wispy, domain-warped cloud density */
    float clouds(vec2 p){ vec2 q = vec2(fbm(p), fbm(p + vec2(5.2, 1.3))); return fbm(p + 1.4 * q); }
    void main(){
      float up = max(vW.y - uHorizon, 0.0);
      float h = clamp(up / 11.0, 0.0, 1.0);
      vec3 sky = mix(uLow, uMid, smoothstep(0.0, 0.3, h));
      sky = mix(sky, uZenith, smoothstep(0.22, 1.0, h));
      /* the sun, half set, with a wide soft corona */
      vec2 sv = vec2((vW.x - uSunX) * 0.95, vW.y - (uHorizon + 0.1));
      float d = length(sv);
      float disc = smoothstep(uSunR * 1.08, uSunR * 0.84, d);
      float glow = exp(-d / 2.2) * 0.55 + exp(-d / 5.0) * 0.4 + exp(-d / 12.0) * 0.22;
      float near = exp(-d / 7.0);
      float warmX = exp(-pow((vW.x - uSunX) / 10.0, 2.0));
      /* haze: a pale, luminous mist lying on the horizon */
      vec3 mist = mix(uSun * 0.7, uMid * 1.5, 0.4);
      sky = mix(sky, mist, exp(-up / 2.2) * (0.2 + 0.3 * warmX));
      sky += uSun * (disc * 1.15 + glow);
      /* low clouds: long banks with real shape, dark mauve in their own shadow, lit rose and gold along their
         undersides and on the side that faces the sun */
      vec2 p1 = vec2(vW.x * 0.085 + uTime * 0.005, up * 0.3);
      float c1 = clouds(p1);
      float band1 = smoothstep(0.6, 2.2, up) * (1.0 - smoothstep(5.0, 9.5, up));
      float d1 = smoothstep(0.46, 0.6, c1) * band1;
      vec2 toSun = normalize(vec2(uSunX - vW.x, (uHorizon + 0.1) - vW.y) + vec2(0.0001));
      vec2 lightDir = normalize(toSun * vec2(0.085, 0.3) + vec2(0.0, -0.08));
      float lit1 = clamp(0.5 + (c1 - clouds(p1 + lightDir * 0.1)) * 14.0, 0.0, 1.0);
      float edge1 = smoothstep(0.0, 0.5, d1) * (1.0 - smoothstep(0.5, 1.0, d1));
      vec3 shade1 = uMid * 0.72 + uZenith * 0.35;
      vec3 lit1c = mix(vec3(0.98, 0.6, 0.66), uSun * 1.12, near * 0.75);
      vec3 cloud1 = mix(shade1, lit1c, lit1 * (0.5 + 0.5 * near)) + lit1c * edge1 * lit1 * 0.35;
      /* high cirrus: thin pale-rose wisps, stretched, drifting slower */
      vec2 p2 = vec2(vW.x * 0.05 + uTime * 0.0025 + 19.0, up * 0.5 + 3.0);
      float w = 1.0 - abs(2.0 * fbm(p2) - 1.0);
      float band2 = smoothstep(4.0, 7.0, up) * (1.0 - smoothstep(10.5, 15.0, up));
      float d2 = smoothstep(0.74, 0.97, w) * band2;
      vec3 cloud2 = mix(vec3(0.8, 0.56, 0.72), vec3(1.0, 0.82, 0.72), near * 0.7 + 0.1);
      vec3 col = mix(sky, cloud2, d2 * 0.55);
      col = mix(col, cloud1, d1 * 0.92);
      /* a little shade where the copy sits */
      col *= 1.0 - 0.35 * exp(-pow((vW.x - uShadeX) / 7.0, 2.0)) * (1.0 - smoothstep(4.0, 8.0, up));
      col += (hash21(gl_FragCoord.xy) - 0.5) / 160.0;
      /* below the horizon the water takes over */
      gl_FragColor = vec4(col, uIn * (1.0 - step(vW.y, uHorizon - 0.001)));
      #include <colorspace_fragment>
    }`,
});
const sky = new THREE.Mesh(new THREE.PlaneGeometry(90, 50), skyMat);
sky.position.set(0, 4, -11);
stage.add(sky);
const floor = new THREE.Group();
stage.add(floor);
const waterNormals = texLoader.load('assets/waternormals.jpg');
waterNormals.wrapS = waterNormals.wrapT = THREE.RepeatWrapping;
const water = new Water(new THREE.PlaneGeometry(60, 22), {
  textureWidth: coarse ? 512 : 1024, textureHeight: coarse ? 256 : 512, waterNormals, clipBias: 0.003,
  sunDirection: new THREE.Vector3(0.32, 0.12, -1).normalize(), sunColor: 0xffb070, waterColor: 0x0a1626, distortionScale: 0.22, fog: false,
});
water.rotation.x = -Math.PI / 2;
water.material.transparent = true;
water.material.uniforms.size.value = 55;   // ripple scale for a scene a few units across
water.material.fragmentShader = water.material.fragmentShader
  .replace('vec3( 0.1 ) + reflectionSample * 0.9', 'reflectionSample')   // no grey lift: dusk water stays dark
  .replace('uniform vec3 waterColor;', 'uniform vec3 waterColor; uniform vec2 uFadeNear;')
  .replace('vec3 outgoingLight = albedo;', 'vec3 outgoingLight = albedo * smoothstep(uFadeNear.x, uFadeNear.y, distance);');   // on phones the water darkens toward the viewer, so the copy sits on black, not on the reflection
water.material.uniforms.uFadeNear = { value: new THREE.Vector2(0, 0.01) };
floor.add(water);

/* Lights for the phone: a warm key, a cool fill, the sunset catching its edge from behind */
front.add(new THREE.HemisphereLight(0xfff6ec, 0x1a1a22, 0.5));
const key = new THREE.DirectionalLight(0xfff2e4, 2.4); key.position.set(3, 5, 7); front.add(key);
const fill = new THREE.DirectionalLight(0xe4ecdc, 0.9); fill.position.set(-5, -2, 4); front.add(fill);
const rim = new THREE.PointLight(0xffa060, 26, 20, 1.6); rim.position.set(3, 2, -4); front.add(rim);

/* ---------- Post-processing (particle layer only; multisampled so lines and tubes stay smooth) ---------- */
let composer = null;
if (!coarse) {
  composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 }));
  composer.addPass(new RenderPass(fx, camera));
  composer.addPass(new UnrealBloomPass(new THREE.Vector2(1, 1), 0.28, 0.5, 0.9));
  composer.addPass(new OutputPass());
}

/* ---------- Camera keyframes per form ---------- */
const CAM = [
  { p: new THREE.Vector3(0, 0, 10), l: new THREE.Vector3(0, 0, 0) },         // chrome wordmark
  { p: new THREE.Vector3(0, 0.3, 10), l: new THREE.Vector3(0, -0.2, 0) },    // globe
  { p: new THREE.Vector3(0.4, 0.5, 10), l: new THREE.Vector3(0, 0, 0) },     // helix (it sits right of the text itself)
  { p: new THREE.Vector3(0, 4.4, 7.6), l: new THREE.Vector3(0, -0.7, 0) },   // galaxy (seen from above)
  { p: new THREE.Vector3(0, 1.3, 10), l: new THREE.Vector3(0, -0.25, 0) },   // the stage (slightly from above, so the water reads)
];
/* Story beats: where each form is fully held (progress 0..1); blends in between */
const BEATS = [
  { f: 1, a: 0.0, b: 0.06 },
  { f: 2, a: 0.16, b: 0.27 },
  { f: 3, a: 0.37, b: 0.47 },
  { f: 4, a: 0.56, b: 0.7 },
  { f: 0, a: 0.8, b: 1.0 },
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
  uniforms.uWordScale.value = HY.storyWordScale;
  uniforms.uGalaxyScale.value = stacked ? 0.7 : Math.min(1, vw / 9.2);
  uniforms.uHelixOffset.value.set(stacked ? 0 : 1.75, stacked ? -1.75 : 0, 0); // on phones the helix hangs below the title
  uniforms.uLean.value = stacked ? 0 : -0.14;
  uniforms.uHelixScale.value = stacked ? 0.72 : 1;
  dnaRig.position.copy(uniforms.uHelixOffset.value);
  dnaRig.rotation.z = uniforms.uLean.value;
  dnaRig.scale.setScalar(uniforms.uHelixScale.value);
  phoneScale = (VIS_H * (stacked ? 0.45 : 0.72)) / PHONE.h;
  phoneAt.set(stacked ? 0 : vw * 0.2, stacked ? 0.95 : 0.05, 0);
  const floorY = phoneAt.y - (PHONE.h / 2) * phoneScale - 0.04;
  floor.position.set(0, floorY, 0);
  skyMat.uniforms.uHorizon.value = floorY;
  /* the sky stands 21 units from the camera, the phone 10: place the sun so it shows beside the phone on screen */
  skyMat.uniforms.uSunX.value = (phoneAt.x + (stacked ? 1.55 : 1.85)) * 2.1;
  skyMat.uniforms.uSunR.value = stacked ? 0.8 : 1.1;
  skyMat.uniforms.uShadeX.value = stacked ? -12 : -3.2;
  sunPos.set(skyMat.uniforms.uSunX.value, floorY + 0.1, -10.8);
  water.material.uniforms.uFadeNear.value.set(stacked ? 7.4 : 0, stacked ? 9.2 : 0.01);
  uniforms.uSize.value = (coarse ? 2.0 : 1.7) * (stacked ? 0.9 : 1);
  arcFadeY.value = stacked ? -0.8 : -0.65;
  CAM[2].p.x = stacked ? 0 : 0.4;
  CAM[2].l.y = stacked ? 0.9 : 0;
  CAM[3].l.y = stacked ? -0.55 : -0.7;
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

/* ---------- Intro: the globe rises into place as the loader lifts ---------- */
function startIntro() {
  const g = window.gsap;
  if (reduced || !g) { uniforms.uPlanetY.value = PLANET_Y; return; }
  g.to(uniforms.uPlanetY, { value: PLANET_Y, duration: 2.6, ease: 'power3.out' });
}
window.addEventListener('scene:intro', startIntro, { once: true });

/* ---------- Story state ---------- */
const camPos = new THREE.Vector3(), camLook = new THREE.Vector3();
const footer = document.getElementById('footerWordmark');
let smooth = 0, phoneIn = 0, globeW = 1;
function storyState(p) {
  for (let k = 0; k < BEATS.length; k++) {
    const cur = BEATS[k];
    if (p < cur.a && k > 0) {
      const prev = BEATS[k - 1];
      return { from: prev.f, to: cur.f, mix: THREE.MathUtils.smoothstep(p, prev.b, cur.a) };
    }
    if (p <= cur.b) return { from: cur.f, to: cur.f, mix: 0 };
  }
  return { from: 0, to: 0, mix: 0 };
}
const weightOf = (st, f) => (st.from === f ? 1 - st.mix : 0) + (st.to === f ? st.mix : 0);
const ss = THREE.MathUtils.smoothstep;

function applyState(dt) {
  smooth += (HY.progress - smooth) * (1 - Math.pow(0.002, dt));
  const st = storyState(smooth);
  uniforms.uFrom.value = st.from; uniforms.uTo.value = st.to; uniforms.uMix.value = st.mix;
  const e = ss(st.mix, 0, 1);
  camPos.lerpVectors(CAM[st.from].p, CAM[st.to].p, e);
  camLook.lerpVectors(CAM[st.from].l, CAM[st.to].l, e);

  /* the Earth and the atom */
  const wGlobe = weightOf(st, 1);
  globeW = wGlobe;
  globe.visible = wGlobe > 0.01; orbits.visible = globe.visible;
  uniforms.uSolid.value = wGlobe;
  landMat.uniforms.uOpacity.value = wGlobe * 0.7;
  lineMat.uniforms.uOpacity.value = wGlobe * 0.18;
  haloMat.uniforms.uOpacity.value = wGlobe;
  arcMats.forEach((m) => { m.uniforms.uOpacity.value = wGlobe; });
  rings.forEach((r) => { r.shared.uOpacity.value = wGlobe; r.electron.material.opacity = wGlobe; });

  /* the helix grows in from the bottom as the particles weave it, and dissolves the same way */
  const wHelix = weightOf(st, 2);
  let grow = 1, dissolve = 0;
  if (st.to === 2 && st.from !== 2) grow = ss(st.mix, 0.22, 0.95);
  if (st.from === 2 && st.to !== 2) dissolve = ss(st.mix, 0.05, 0.8);
  const hy = uniforms.uHelixOffset.value.y, hh = (HELIX.H / 2 + 0.4) * uniforms.uHelixScale.value;
  clipTop.constant = hy - hh + 2 * hh * grow;
  clipBottom.constant = -(hy - hh + 2 * hh * dissolve);
  dnaRig.visible = wHelix > 0.01 && grow > 0.001 && dissolve < 0.999;
  dnaOpacity.value = ss(wHelix, 0, 0.2);

  /* the galaxy's core lights up once the galaxy has gathered; on the way to the stage it sinks to the horizon and becomes the sun */
  const wGal = weightOf(st, 3);
  let coreOpacity = ss(wGal, 0.45, 1) * 0.9;
  if (st.from === 3 && st.to === 4) {
    const k = ss(st.mix, 0, 1);
    core.position.lerpVectors(ORIGIN, sunPos, k);
    core.scale.setScalar(THREE.MathUtils.lerp(1.6, 7, k));
    coreOpacity = 0.9 * (1 - ss(st.mix, 0.82, 1));
  } else {
    core.position.set(0, 0, 0);
    core.scale.setScalar(1.6);
  }
  core.material.opacity = coreOpacity;
  /* space stays until the sunset sky has covered it — that is the way back to earth */
  const toStage = st.from === 3 && st.to === 4 ? st.mix : 0;
  const space = Math.max(wGal, toStage) * (1 - ss(smooth, 0.5, 0.57));
  starMat.uniforms.uOpacity.value = space;
  flares.forEach((s) => { s.material.opacity = space * s.userData.max; s.material.rotation = s.userData.spin; });
  nebulae.forEach((s) => { s.material.opacity = s.userData.max * wGal; });

  /* the chrome HYAICO takes over from the particle letters; nothing sparkles on it */
  const chromeIn = ss(smooth, 0.84, 0.9);
  const chromeFade = 1 - ss(HY.outro, 0.72, 0.96);
  uniforms.uBright.value[0] = 1 - chromeIn;
  sweep.intensity = 60 * chromeIn;   /* the travelling light exists for the metal only */
  if (chrome) {
    chrome.visible = chromeIn * chromeFade > 0.002;
    chrome.children.forEach((m) => { m.material.opacity = chromeIn * chromeFade; });
    if (HY.outro > 0 && footer) {
      /* the ending: the chrome glides down and becomes the footer wordmark */
      const r = footer.getBoundingClientRect();
      const wpp = VIS_H / window.innerHeight;
      const k = ss(HY.outro, 0, 0.8);
      const tx = (r.left + r.width / 2 - window.innerWidth / 2) * wpp, ty = -(r.top + r.height / 2 - window.innerHeight / 2) * wpp;
      chrome.position.set(tx * k, ty * k, 0);
      chrome.scale.setScalar(THREE.MathUtils.lerp(uniforms.uWordScale.value, (r.width * wpp) / WORD_W, k));
      chrome.rotation.y = uniforms.uYaw.value * (1 - k);
    } else {
      chrome.position.set(0, 0, 0);
      chrome.scale.setScalar(uniforms.uWordScale.value);
      chrome.rotation.y = uniforms.uYaw.value;
    }
  }

  /* the stage: sky and water fade in, the phone rises out of the water, then sinks back */
  const stageIn = ss(smooth, 0.5, 0.57) * (1 - ss(smooth, 0.7, 0.77));
  const target = ss(smooth, 0.568, 0.635) * (1 - ss(smooth, 0.68, 0.74));   /* the phone rises once the water is fully there */
  phoneIn += (target - phoneIn) * (1 - Math.pow(0.001, dt));
  stage.visible = stageIn > 0.002;
  phone.visible = phoneIn > 0.002;
  skyMat.uniforms.uIn.value = stageIn;
  water.material.uniforms.alpha.value = stageIn;
  const rise = 1 - ss(phoneIn, 0, 1);
  phone.scale.setScalar(phoneScale);
  phone.position.set(phoneAt.x, phoneAt.y - rise * PHONE.h * phoneScale * 1.15, 0);
  uniforms.uGlobalAlpha.value = 1 - 0.7 * ss(HY.outro, 0, 1);

  /* the app's screens change while the phone is up */
  setScreen(smooth < 0.635 ? 'home' : smooth < 0.675 ? 'next-meal' : 'recipe');
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
  /* as the particles leave for the helix, the planet sets below the frame (and rises again on the way back) */
  const set = uniforms.uPlanetY.value - (1 - ss(globeW, 0, 1)) * 4;
  globe.position.y = set;
  globe.rotation.set(PLANET_TILT, elapsed * 0.05, 0);
  orbits.position.y = set;
  orbits.rotation.y = elapsed * 0.06;
  rings.forEach((r) => {
    const a = elapsed * r.speed + r.phase;
    r.shared.uHead.value = (a / (Math.PI * 2)) % 1;
    r.electron.position.set(Math.cos(a) * ORBIT_R, Math.sin(a) * ORBIT_R, 0);
  });
  dna.rotation.y = elapsed * 0.3;
  sweep.position.x = Math.sin(elapsed * 0.6) * 5;
  water.material.uniforms.time.value = elapsed * 0.7;
  const pin = applyState(dt);

  const parallax = 1 - ss(HY.outro, 0, 0.6);
  camera.position.set(camPos.x + pointer.x * 0.12 * parallax, camPos.y + pointer.y * 0.08 * parallax, camPos.z);
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
  if (stage.visible || phone.visible) { renderer.clearDepth(); renderer.render(front, camera); }

  if (!ready) {
    ready = true;
    html.classList.add('gl-ready');
    window.dispatchEvent(new CustomEvent('scene:ready'));
    setTimeout(buildLater, 60);
  }
}
frame();
