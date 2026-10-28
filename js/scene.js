/* ==========================================================================
   HYAICO — The stage (Three.js)
   Two layers on one fixed canvas:
     • the particle layer (multisampled, with bloom): deep space (a painted
       Milky Way and sharp stars) and points morphing between forms as the page
       scrolls, with real geometry riding along —
         the Earth (NASA Blue Marble by day, Black Marble city lights by night,
         Natural Earth country borders, drifting clouds, an atmosphere), its
         city lights made of the particles themselves, inside an atom of three
         orbits of light that wrap around it;
         a DNA helix of light — twisted ribbon backbones and tapered base pairs;
         a galaxy in deep space whose core's light becomes the setting sun;
         the stars that align to write HYAICO, and the chrome HYAICO
     • the product layer, drawn on top without bloom or tone mapping on its
       screen: the Just Cooked phone standing on a sea that runs to the true
       horizon, under a reddish sunset whose clouds drift by — until night falls
   Order: Earth → a dive into it, on into its DNA → the DNA spins into a galaxy
   → back home at sunset → night, the stars write HYAICO → the ending.
   ========================================================================== */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { SVGLoader } from 'three/addons/loaders/SVGLoader.js';
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

/* the far plane reaches the horizon: the sea is kilometres long */
const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 2400);
camera.position.set(0, 0, 10);
const VIS_H = 2 * Math.tan(THREE.MathUtils.degToRad(16)) * 10; // visible height at z = 0
const T16 = Math.tan(THREE.MathUtils.degToRad(16));

const fx = new THREE.Scene();      // particles + glowing geometry (bloomed)
const front = new THREE.Scene();   // the phone, the sea and the sky (drawn on top, no bloom)

/* A chrome studio: the letters' flat faces reflect only a narrow band of directions, so the whole look lives there —
   dark ground below, a hot glint on the horizon, a cool bright sky above */
function studioEnvironment() {
  const s = new THREE.Scene();
  s.add(new THREE.Mesh(new THREE.SphereGeometry(30, 48, 24), new THREE.ShaderMaterial({
    side: THREE.BackSide,
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `varying vec3 vP;
      void main(){
        float y = vP.y;
        vec3 ground = mix(vec3(0.02, 0.02, 0.03), vec3(0.18, 0.18, 0.22), smoothstep(-0.05, -0.004, y));
        vec3 skyC = mix(vec3(0.55, 0.6, 0.7), vec3(1.0, 1.02, 1.08), smoothstep(0.008, 0.09, y));
        vec3 col = mix(ground, skyC, smoothstep(-0.006, 0.006, y));
        col += vec3(2.2, 2.1, 1.9) * exp(-abs(y - 0.004) * 400.0);
        col += vec3(0.4, 0.45, 0.55) * exp(-pow((y - 0.05) / 0.012, 2.0));
        gl_FragColor = vec4(col, 1.0);
      }`,
  })));
  const panel = (w, h, hex, k, x, y, z) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(hex).multiplyScalar(k), side: THREE.DoubleSide }));
    m.position.set(x, y, z); m.lookAt(0, 0, 0); s.add(m);
  };
  panel(2.5, 26, 0xffffff, 1.6, -16, 2, 4);
  panel(2.5, 26, 0xffffff, 1.6, 16, 2, 4);
  return s;
}
const pmrem = new THREE.PMREMGenerator(renderer);
const envMap = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
const chromeEnv = pmrem.fromScene(studioEnvironment(), 0.02).texture;
pmrem.dispose();
front.environment = envMap;
front.environmentIntensity = 0.9;
fx.environment = chromeEnv;
const texLoader = new THREE.TextureLoader();
const maxAniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
const upload = (t) => { try { renderer.initTexture(t); } catch (err) { /* uploaded on first use instead */ } return t; };

/* ---------- Particles ---------- */
const COUNT = coarse ? 28000 : 60000;
const WORD_W = 5.6;
const PLANET_R = 2.6, PLANET_TILT = -0.5, SPIN0 = -2.15, SPIN_RATE = 0.03;   // Europe and Africa face us first
const PLANET = { y: -3.4, scale: 1 };   // where the Earth sits and how large it is, per layout
const EARTH_SUN = new THREE.Vector3(-0.75, 0.45, 0.48).normalize();   // the Earth is lit from the upper left; night on the right
const HELIX = { turns: 3.0, R: 0.95, H: 6.4, pairs: 30, ribbon: 0.15 };

const rand = new Float32Array(COUNT);
const colors = new Float32Array(COUNT * 3);
const palette = [[1, 1, 1], [0.72, 0.94, 1], [0.84, 0.78, 1], [1, 1, 1]];
for (let i = 0; i < COUNT; i++) {
  rand[i] = Math.random();
  const c = palette[(Math.random() * palette.length) | 0];
  colors[i * 3] = c[0]; colors[i * 3 + 1] = c[1]; colors[i * 3 + 2] = c[2];
}
const gauss = () => (Math.random() + Math.random() + Math.random() - 1.5) * 1.15;
const toXYZ = (lon, lat, r) => [Math.cos(lat) * Math.cos(lon) * r, Math.sin(lat) * r, -Math.cos(lat) * Math.sin(lon) * r];

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
/* an even shell, used until the night map arrives and the particles settle on the world's cities */
function planetPoints() {
  const a = new Float32Array(COUNT * 3);
  for (let i = 0; i < COUNT; i++) {
    const [x, y, z] = toXYZ(Math.random() * Math.PI * 2 - Math.PI, Math.asin(Math.random() * 2 - 1), PLANET_R + 0.012);
    a[i * 3] = x; a[i * 3 + 1] = y; a[i * 3 + 2] = z;
  }
  return a;
}
/* the particles are the world's city lights: placed where the Black Marble is bright */
function cityPoints(img) {
  const W = 1024, H = 512;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, W, H);
  const px = ctx.getImageData(0, 0, W, H).data;
  const cdf = new Float32Array(W * H);
  let sum = 0;
  for (let y = 0; y < H; y++) {
    const area = Math.cos(Math.PI / 2 - ((y + 0.5) / H) * Math.PI);
    for (let x = 0; x < W; x++) { sum += Math.pow(px[(y * W + x) * 4] / 255, 1.5) * area; cdf[y * W + x] = sum; }
  }
  if (sum <= 0) return null;
  const a = new Float32Array(COUNT * 3);
  for (let i = 0; i < COUNT; i++) {
    const r = Math.random() * sum;
    let lo = 0, hi = cdf.length - 1;
    while (lo < hi) { const mid = (lo + hi) >> 1; if (cdf[mid] < r) lo = mid + 1; else hi = mid; }
    const lon = (((lo % W) + Math.random()) / W) * Math.PI * 2 - Math.PI;
    const lat = Math.PI / 2 - ((Math.floor(lo / W) + Math.random()) / H) * Math.PI;
    const [x, y, z] = toXYZ(lon, lat, PLANET_R + 0.012 + Math.random() * 0.018);
    a[i * 3] = x; a[i * 3 + 1] = y; a[i * 3 + 2] = z;
  }
  return a;
}
/* the helix: a point on a backbone, and the direction across its ribbon */
const _hP = new THREE.Vector3(), _hT = new THREE.Vector3(), _hR = new THREE.Vector3(), _hW = new THREE.Vector3();
function helixFrame(k, phase) {
  const { turns, R, H } = HELIX, t = k * Math.PI * 2 * turns + phase, w = Math.PI * 2 * turns;
  _hP.set(Math.cos(t) * R, (k - 0.5) * H, Math.sin(t) * R);
  _hT.set(-Math.sin(t) * R * w, H, Math.cos(t) * R * w).normalize();
  _hR.set(Math.cos(t), 0, Math.sin(t));
  _hW.crossVectors(_hT, _hR).normalize();
}
/* the helix particles: a sheath along the ribbons, some along the base pairs, very few loose */
function helixPoints() {
  const a = new Float32Array(COUNT * 3);
  const { turns, R, H, pairs, ribbon } = HELIX;
  for (let i = 0; i < COUNT; i++) {
    let x, y, z;
    const m = i % 20;
    if (m < 3) {
      const j = (Math.random() * pairs) | 0, k = (j + 0.5) / pairs, t = k * Math.PI * 2 * turns, s = Math.random() * 2 - 1;
      x = Math.cos(t) * R * s + gauss() * 0.015; y = (k - 0.5) * H + gauss() * 0.015; z = Math.sin(t) * R * s + gauss() * 0.015;
    } else if (m < 19) {
      helixFrame(Math.random(), i % 2 ? Math.PI : 0);
      const s = (Math.random() * 2 - 1) * ribbon * 0.55, lift = gauss() * 0.02;
      x = _hP.x + _hW.x * s + _hR.x * lift; y = _hP.y + _hW.y * s; z = _hP.z + _hW.z * s + _hR.z * lift;
    } else {
      const k = Math.random(), t = k * Math.PI * 2 * turns + (i % 2 ? Math.PI : 0), r = R + 0.25 + Math.random() * 0.8;
      x = Math.cos(t) * r + gauss() * 0.2; y = (k - 0.5) * H + gauss() * 0.3; z = Math.sin(t) * r + gauss() * 0.2;
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
const geo = new THREE.BufferGeometry();
const planet = planetPoints();
const cloud = cloudPoints();
geo.setAttribute('position', new THREE.BufferAttribute(planet, 3));
geo.setAttribute('aP0', new THREE.BufferAttribute(cloud, 3)); // (unused: the stars write the word now)
geo.setAttribute('aP1', new THREE.BufferAttribute(planet, 3)); // the cities (set when the night map loads)
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
  uBright: { value: [0.0, 0.6, 0.42, 0.9, 0.1] },
  uTint: { value: [new THREE.Color(1, 1, 1), new THREE.Color(1, 0.8, 0.52), new THREE.Color(0.5, 0.78, 1), new THREE.Color(1, 0.86, 0.72), new THREE.Color(0.8, 0.86, 1)] },
  uWordScale: { value: 1 },
  uGalaxyScale: { value: 1 },
  uHelixOffset: { value: new THREE.Vector3(1.6, 0, 0) },
  uHelixScale: { value: 1 },
  uLean: { value: 0 },
  uSolid: { value: 1 },
  uYaw: { value: 0 },
  uPointer: { value: new THREE.Vector2(0, 0) },
  uGlobalAlpha: { value: 1 },
  uPlanetY: { value: PLANET.y - 3 },
  uPlanetScale: { value: 1 },
  uSpin: { value: SPIN0 },
  uEarthSun: { value: EARTH_SUN },
  uHeroOff: { value: new THREE.Vector3() },   // where the hero (the Earth and its camera) is placed: see the dive in layout()
};

const material = new THREE.ShaderMaterial({
  uniforms, transparent: true, depthWrite: false, depthTest: true, blending: THREE.AdditiveBlending,
  vertexShader: /* glsl */ `
    uniform float uTime, uPixelRatio, uSize, uMix, uWordScale, uGalaxyScale, uYaw, uGlobalAlpha, uPlanetY, uPlanetScale, uLean, uSolid, uHelixScale, uSpin;
    uniform int uFrom, uTo;
    uniform float uBright[5];
    uniform vec3 uTint[5];
    uniform vec3 uHelixOffset, uEarthSun, uHeroOff;
    uniform vec2 uPointer;
    attribute vec3 aP0; attribute vec3 aP1; attribute vec3 aP2; attribute vec3 aP3; attribute vec3 aP4;
    attribute float aRand; attribute vec3 aColor;
    varying float vAlpha; varying vec3 vColor;

    vec3 rotY(vec3 p, float a) { float c = cos(a), s = sin(a); return vec3(c * p.x + s * p.z, p.y, -s * p.x + c * p.z); }
    vec3 rotX(vec3 p, float a) { float c = cos(a), s = sin(a); return vec3(p.x, c * p.y - s * p.z, s * p.y + c * p.z); }
    vec3 rotZ(vec3 p, float a) { float c = cos(a), s = sin(a); return vec3(c * p.x - s * p.y, s * p.x + c * p.y, p.z); }

    /* the globe spins on its tilted axis, exactly like the Earth under the particles */
    vec3 onGlobe(vec3 q) { return rotX(rotY(q, uSpin), ${PLANET_TILT.toFixed(2)}); }

    vec3 form(int i) {
      if (i == 0) return rotY(aP0 * uWordScale, uYaw);
      if (i == 1) return onGlobe(aP1 * uPlanetScale) + vec3(0.0, uPlanetY, 0.0) + uHeroOff;
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
        /* the globe is solid: lights on its far side are hidden; they shine brightest on the night side */
        vec3 n = onGlobe(normalize(aP1));
        float facing = n.z * 0.9 + n.y * 0.43;
        float night = smoothstep(0.18, -0.2, dot(n, uEarthSun));
        return mix(1.0, smoothstep(-0.3, 0.05, facing), uSolid) * mix(0.2, 1.0, night);
      }
      return 1.0;
    }

    void main() {
      /* into the DNA, the lights stay on the Earth until the camera reaches it, then stream on ahead and weave the helix
         from the bottom up; the helix dissolves the same way; every other form arrives with a random stagger */
      bool earthHelix = (uFrom == 1 && uTo == 2) || (uFrom == 2 && uTo == 1);
      bool helixGalaxy = (uFrom == 2 && uTo == 3) || (uFrom == 3 && uTo == 2);
      float yN = clamp((aP2.y + ${(HELIX.H / 2).toFixed(2)}) / ${HELIX.H.toFixed(2)}, 0.0, 1.0);
      bool hx = (uTo == 2 && uFrom != 2) || (uFrom == 2 && uTo != 2);
      float delay = earthHelix ? 0.42 + yN * 0.3 + aRand * 0.08 : (hx ? yN * 0.6 + aRand * 0.06 : aRand * 0.3);
      float win = earthHelix ? 0.3 : (hx ? 0.4 : 0.7);
      float t = smoothstep(0.0, 1.0, clamp((uMix - delay) / win, 0.0, 1.0));
      vec3 a = form(uFrom), b = form(uTo);
      vec3 p = mix(a, b, t);
      float sw = 4.0 * t * (1.0 - t);
      if (helixGalaxy) {
        /* the helix spins up and unfurls into the galaxy. Every particle swings round the shared axis from its place on
           the helix to its place in an arm, always turning the way the galaxy turns, while the whole makes one full turn;
           the helix's height settles into the disc, its lean straightens and its axis glides to the galaxy's centre */
        vec3 h = aP2 * uHelixScale, g = aP3 * uGalaxyScale;
        float th2 = atan(h.z, h.x) - uTime * 0.3, th3 = atan(g.z, g.x) - uTime * 0.12;
        float k = uFrom == 2 ? t : 1.0 - t;
        float M = uFrom == 2 ? uMix : 1.0 - uMix;
        float spin = -6.2831853 * M * M * M * (M * (M * 6.0 - 15.0) + 10.0);
        float th = th2 - mod(th2 - th3, 6.2831853) * k + spin;
        float r = mix(length(h.xz), length(g.xz), k);
        p = rotZ(vec3(cos(th) * r, mix(h.y, g.y, k), sin(th) * r), uLean * (1.0 - k)) + uHelixOffset * (1.0 - k);
      } else if (!earthHelix) {
        p = rotY(p, sw * 0.5);   /* other changes of form swirl a little */
      }
      p += vec3(sin(p.y * 1.7 + uTime * 1.3 + aRand * 6.2831), cos(p.x * 1.3 + uTime * 0.9 + aRand * 3.1), sin(p.z * 1.9 + uTime * 1.1 + aRand * 2.0)) * sw * 0.3;
      p += vec3(sin(uTime * 0.6 + aRand * 9.0), cos(uTime * 0.45 + aRand * 7.0), sin(uTime * 0.5 + aRand * 5.0)) * 0.012;
      /* individual parallax — but the city lights stay on the ground */
      float onLand = mix(float(uFrom == 1), float(uTo == 1), t);
      p.xy += uPointer * (0.04 + 0.2 * aRand * aRand) * (1.0 + 0.6 * sin(aRand * 40.0)) * (1.0 - onLand);
      vec4 mv = modelViewMatrix * vec4(p, 1.0);
      gl_Position = projectionMatrix * mv;
      float dz = max(-mv.z, 0.001);
      /* lights the camera flies past stay small and fade, never swelling into blobs */
      gl_PointSize = min(uSize * uPixelRatio * (0.55 + aRand * 0.9) * (10.0 / dz) * mix(1.0, 0.8, onLand), 9.0 * uPixelRatio);
      float bright = mix(uBright[uFrom] * glow(uFrom, a), uBright[uTo] * glow(uTo, b), t);
      vec3 tint = mix(tintOf(uFrom, a), tintOf(uTo, b), t);
      float twinkle = 0.7 + 0.3 * sin(uTime * 2.2 + aRand * 40.0);
      vAlpha = uGlobalAlpha * bright * twinkle * (0.45 + 0.55 * aRand) * (1.0 + sw * 0.6) * smoothstep(0.25, 1.6, dz);
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

/* ---------- Helpers ---------- */
function glowTexture(inner, mid) {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  g.addColorStop(0, inner); g.addColorStop(0.3, mid); g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
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
/* a thin horizontal glint, like light catching a lens */
function glintTexture() {
  const c = document.createElement('canvas'); c.width = 256; c.height = 32;
  const ctx = c.getContext('2d');
  ctx.translate(128, 16); ctx.scale(1, 0.125);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 128);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.08, 'rgba(225,244,255,0.75)'); g.addColorStop(0.35, 'rgba(150,215,255,0.18)'); g.addColorStop(1, 'rgba(120,200,255,0)');
  ctx.fillStyle = g; ctx.fillRect(-128, -128, 256, 256);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const WORLD_VS = 'varying vec3 vWN; varying vec3 vWP; varying vec2 vUv; void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position, 1.0); vWP = w.xyz; vWN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * viewMatrix * w; }';

/* ---------- The Earth ----------
   NASA Blue Marble (day), NASA Black Marble (city lights), Natural Earth (borders between countries, and the coasts),
   NASA cloud cover — all public domain. Lit from the upper left; the terminator glows warm; the oceans catch the sun. */
const globe = new THREE.Group();
globe.rotation.order = 'XYZ';
fx.add(globe);
const EARTH_TEX = {
  day: coarse ? 'assets/earth/day-2k.webp' : 'assets/earth/day-4k.webp',
  night: 'assets/earth/night.webp',
  borders: 'assets/earth/borders.png',
  land: 'assets/earth/land.png',
  clouds: coarse ? 'assets/earth/clouds-1k.webp' : 'assets/earth/clouds.webp',
};
const bodyMat = new THREE.ShaderMaterial({
  uniforms: { uDay: { value: null }, uNight: { value: null }, uBorders: { value: null }, uLand: { value: null }, uSun: { value: EARTH_SUN }, uOpacity: { value: 1 } },
  transparent: true,   /* drawn first among the see-through things (renderOrder), writing depth, so it still hides the far side */
  vertexShader: WORLD_VS,
  fragmentShader: /* glsl */ `uniform sampler2D uDay, uNight, uBorders, uLand; uniform vec3 uSun; uniform float uOpacity; varying vec3 vWN; varying vec3 vWP; varying vec2 vUv;
    void main(){
      vec3 n = normalize(vWN), v = normalize(cameraPosition - vWP);
      float ndl = dot(n, uSun);
      float day = smoothstep(-0.1, 0.28, ndl);
      vec3 albedo = texture2D(uDay, vUv).rgb;
      float land = texture2D(uLand, vUv).r;
      vec2 b = texture2D(uBorders, vUv).rg;
      float lights = texture2D(uNight, vUv).r;
      vec3 col = albedo * (0.02 + 1.2 * max(ndl, 0.0));
      /* the band along the terminator burns warm, the way sunset does from orbit */
      float dusk = smoothstep(-0.12, 0.04, ndl) * (1.0 - smoothstep(0.04, 0.3, ndl));
      col = mix(col, col * vec3(1.35, 0.78, 0.55), dusk * 0.65);
      /* the oceans catch a broad, faint sheen of sunlight, the way they do from orbit */
      vec3 h = normalize(uSun + v);
      col += vec3(1.0, 0.93, 0.82) * pow(max(dot(n, h), 0.0), 110.0) * (1.0 - land) * day * 0.06;
      /* the cities light up the night side */
      col += vec3(1.0, 0.7, 0.36) * pow(lights, 1.15) * (1.0 - day) * 1.6;
      /* borders between countries, and the coastlines */
      col += vec3(0.82, 0.93, 1.0) * (b.r * 0.24 + b.g * 0.07) * (0.25 + 0.75 * day);
      col += vec3(1.0, 0.8, 0.5) * b.r * 0.1 * (1.0 - day);
      /* the atmosphere at the limb, bright where the sun reaches it */
      float fr = pow(1.0 - max(dot(n, v), 0.0), 2.6);
      col += vec3(0.32, 0.6, 1.0) * fr * (0.1 + 0.95 * smoothstep(-0.3, 0.5, ndl));
      gl_FragColor = vec4(col, uOpacity);
    }`,
});
const body = new THREE.Mesh(new THREE.SphereGeometry(PLANET_R - 0.02, 128, 96), bodyMat);
body.renderOrder = -1;
globe.add(body);
const cloudsMat = new THREE.ShaderMaterial({
  uniforms: { uClouds: { value: null }, uSun: { value: EARTH_SUN }, uOpacity: { value: 0 } },
  transparent: true, depthWrite: false,
  vertexShader: WORLD_VS,
  fragmentShader: `uniform sampler2D uClouds; uniform vec3 uSun; uniform float uOpacity; varying vec3 vWN; varying vec3 vWP; varying vec2 vUv;
    void main(){
      float ndl = dot(normalize(vWN), uSun);
      float c = smoothstep(0.2, 0.9, texture2D(uClouds, vUv).r);
      vec3 col = vec3(1.0) * (0.03 + 1.05 * max(ndl, 0.0));
      col = mix(col, col * vec3(1.3, 0.78, 0.58), smoothstep(-0.12, 0.04, ndl) * (1.0 - smoothstep(0.04, 0.3, ndl)) * 0.7);
      gl_FragColor = vec4(col, c * 0.42 * uOpacity);
    }`,
});
const cloudShell = new THREE.Mesh(new THREE.SphereGeometry(PLANET_R + 0.018, 96, 64), cloudsMat);
globe.add(cloudShell);
/* the atmosphere: a soft glow outside the limb, strongest on the sunlit side */
const haloMat = new THREE.ShaderMaterial({
  uniforms: { uOpacity: { value: 0 }, uSun: { value: EARTH_SUN } }, side: THREE.BackSide,
  transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  vertexShader: WORLD_VS,
  fragmentShader: `uniform float uOpacity; uniform vec3 uSun; varying vec3 vWN; varying vec3 vWP;
    void main(){
      vec3 n = normalize(vWN), v = normalize(cameraPosition - vWP);
      float k = clamp(-dot(n, v) / 0.5, 0.0, 1.0);
      float g = pow(k, 2.4) * smoothstep(-0.45, 0.6, dot(n, uSun));
      gl_FragColor = vec4(vec3(0.35, 0.66, 1.0) * g * 0.9, g * uOpacity);
    }`,
});
globe.add(new THREE.Mesh(new THREE.SphereGeometry(PLANET_R * 1.15, 72, 48), haloMat));
function earthTexture(url, srgb, cb) {
  texLoader.load(url, (t) => {
    t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    t.anisotropy = maxAniso; t.minFilter = THREE.LinearMipmapLinearFilter; t.wrapS = THREE.RepeatWrapping;
    cb(upload(t));
  }, undefined, () => {});
}
earthTexture(EARTH_TEX.day, true, (t) => { bodyMat.uniforms.uDay.value = t; });
earthTexture(EARTH_TEX.borders, false, (t) => { bodyMat.uniforms.uBorders.value = t; });
earthTexture(EARTH_TEX.land, false, (t) => { bodyMat.uniforms.uLand.value = t; });
earthTexture(EARTH_TEX.clouds, false, (t) => { cloudsMat.uniforms.uClouds.value = t; });
earthTexture(EARTH_TEX.night, false, (t) => {
  bodyMat.uniforms.uNight.value = t;
  const pts = cityPoints(t.image);
  if (pts) geo.setAttribute('aP1', new THREE.BufferAttribute(pts, 3));
});

/* ---------- The atom: three orbits around the Earth, 60° apart like the symbol ----------
   Each is tilted in depth so it passes in front of the globe on one side and behind it on the other. An orbit is a
   crisp line of light, its colour drifting between cyan and violet, brightening into a trail behind its electron. */
const ORBIT_K = 1.42;   // orbit radius / planet radius
const ORBIT_R = PLANET_R * ORBIT_K;
const orbits = new THREE.Group();
fx.add(orbits);
const electronTex = glowTexture('rgba(255,255,255,1)', 'rgba(170,232,255,0.55)');
const ringShared = { uCenter: { value: new THREE.Vector3() }, uToCam: { value: new THREE.Vector3(0, 0, 1) }, uRadius: { value: ORBIT_R } };
/* each orbit is a ribbon a few pixels wide that always faces the screen — a crisp hairline in a soft glow, with a
   light trail running behind its electron — so it reads as a sleek line of light, never a tube. Parts behind the globe
   are hidden by it; the far half is dimmer */
const ringRes = { value: new THREE.Vector2(1, 1) };   // the particle layer's drawing size in pixels
const RING_SEG = 480, RING_W = 12;                    // ribbon width in pixels: a ~1.5px line inside its glow
const ringGeo = new THREE.BufferGeometry();
{
  const ang = new Float32Array((RING_SEG + 1) * 2), side = new Float32Array((RING_SEG + 1) * 2), idx = [];
  for (let i = 0; i <= RING_SEG; i++) {
    const a = (i / RING_SEG) * Math.PI * 2;
    ang[i * 2] = a; ang[i * 2 + 1] = a; side[i * 2] = -1; side[i * 2 + 1] = 1;
    if (i < RING_SEG) { const k = i * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
  }
  ringGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array((RING_SEG + 1) * 6), 3));
  ringGeo.setAttribute('aAng', new THREE.BufferAttribute(ang, 1));
  ringGeo.setAttribute('aSide', new THREE.BufferAttribute(side, 1));
  ringGeo.setIndex(idx);
}
const RING_VS = `uniform vec3 uCenter, uToCam; uniform float uRadius, uR; uniform vec2 uRes; attribute float aAng, aSide;
  varying float vU, vX, vFront;
  void main(){
    vec3 p = vec3(cos(aAng) * uR, sin(aAng) * uR, 0.0), t = vec3(-sin(aAng), cos(aAng), 0.0);
    vec4 w = modelMatrix * vec4(p, 1.0);
    vec4 c0 = projectionMatrix * viewMatrix * w;
    vec4 c1 = projectionMatrix * viewMatrix * (modelMatrix * vec4(p + t * 0.02, 1.0));
    vec2 dir = normalize((c1.xy / c1.w - c0.xy / c0.w) * uRes);
    c0.xy += vec2(-dir.y, dir.x) * aSide * ${RING_W.toFixed(1)} / uRes * c0.w;
    gl_Position = c0;
    vU = aAng / 6.2831853; vX = aSide * ${(RING_W / 2).toFixed(1)};
    vFront = dot(w.xyz - uCenter, uToCam) / uRadius;
  }`;
const RING_FS = `uniform float uHead, uOpacity, uTime, uSeed; uniform vec3 uColor, uColor2; varying float vU, vX, vFront;
  void main(){
    float trail = exp(-fract(uHead - vU) * 4.6);
    float depth = mix(0.22, 1.0, smoothstep(-0.45, 0.45, vFront));
    float x = abs(vX);
    float line = 1.0 - smoothstep(0.45, 1.25, x);
    float glow = exp(-x * x / 7.0);
    vec3 col = mix(uColor, uColor2, 0.5 + 0.5 * sin(vU * 6.2831853 + uTime * 0.35 + uSeed));
    col = mix(col, vec3(1.0), trail * 0.55);
    gl_FragColor = vec4(col, (line * (0.2 + 0.95 * trail) + glow * (0.04 + 0.32 * trail)) * depth * uOpacity);
  }`;
const RING_SPECS = [
  { phi: 0, lean: 63, color: 0x7fe3ff, color2: 0xa996ff, speed: 0.62, phase: 0.6, seed: 0.0 },   // sweeps across the face
  { phi: 60, lean: -63, color: 0xa996ff, color2: 0x7fe3ff, speed: 0.74, phase: 2.6, seed: 2.1 },  // loops over the right shoulder
  { phi: 120, lean: 63, color: 0x7fe3ff, color2: 0xc4b6ff, speed: 0.68, phase: 4.4, seed: 4.2 },  // loops over the left shoulder
];
const glintTex = glintTexture();
const rings = RING_SPECS.map((spec) => {
  const ring = new THREE.Group();
  const shared = { uHead: { value: 0 }, uOpacity: { value: 0 }, uColor: { value: new THREE.Color(spec.color) }, uColor2: { value: new THREE.Color(spec.color2) }, uTime: uniforms.uTime, uSeed: { value: spec.seed }, ...ringShared };
  const line = new THREE.Mesh(ringGeo, new THREE.ShaderMaterial({
    uniforms: { ...shared, uR: { value: ORBIT_R }, uRes: ringRes }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    vertexShader: RING_VS, fragmentShader: RING_FS,
  }));
  line.frustumCulled = false;
  ring.add(line);
  /* the electron: a bright point in a tight halo, with a thin horizontal glint */
  const electron = new THREE.Sprite(new THREE.SpriteMaterial({ map: electronTex, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
  electron.scale.setScalar(0.3);
  const spark = new THREE.Sprite(new THREE.SpriteMaterial({ map: glintTex, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
  spark.scale.set(1.4, 0.12, 1);
  ring.add(electron, spark);
  orbits.add(ring);
  return { ring, spec, shared, electron, spark, speed: spec.speed, phase: spec.phase };
});
/* orient the orbits for the view the hero is seen from: the line where each orbit crosses from front to back lies in
   the picture plane at angle phi, and the orbit leans out of that plane by `lean` */
const _f = new THREE.Vector3(), _rt = new THREE.Vector3(), _up = new THREE.Vector3(), _tc = new THREE.Vector3();
const _a = new THREE.Vector3(), _w = new THREE.Vector3(), _b = new THREE.Vector3(), _n = new THREE.Vector3(), _m4 = new THREE.Matrix4();
const WORLD_UP = new THREE.Vector3(0, 1, 0);
function orientRings(eye, center) {
  _f.subVectors(center, eye).normalize();
  _rt.crossVectors(_f, WORLD_UP).normalize();
  _up.crossVectors(_rt, _f).normalize();
  _tc.copy(_f).negate();
  rings.forEach(({ ring, spec }) => {
    const phi = THREE.MathUtils.degToRad(spec.phi), lean = THREE.MathUtils.degToRad(spec.lean);
    _a.copy(_rt).multiplyScalar(Math.cos(phi)).addScaledVector(_up, Math.sin(phi));
    _w.copy(_rt).multiplyScalar(-Math.sin(phi)).addScaledVector(_up, Math.cos(phi));
    _b.copy(_w).multiplyScalar(Math.cos(lean)).addScaledVector(_tc, Math.sin(lean));
    _n.crossVectors(_a, _b);
    ring.quaternion.setFromRotationMatrix(_m4.makeBasis(_a, _b, _n));
  });
}
const _e = new THREE.Vector3();

/* ---------- The helix: two twisted ribbons of light and tapered base pairs, all in blues ----------
   It grows in from the bottom as the particles arrive, and dissolves the same way. The far side is dimmer. */
const clipTop = new THREE.Plane(new THREE.Vector3(0, -1, 0), 100);
const clipBottom = new THREE.Plane(new THREE.Vector3(0, 1, 0), 100);
const dnaRig = new THREE.Group();
fx.add(dnaRig);
const dna = new THREE.Group();
dnaRig.add(dna);
const dnaShared = { uOpacity: { value: 0 }, uTime: uniforms.uTime, uCenter: { value: new THREE.Vector3() }, uToCam: { value: new THREE.Vector3(0, 0, 1) }, uRadius: { value: HELIX.R } };
function neonMat(color, core, pulse, kind) {
  return new THREE.ShaderMaterial({
    uniforms: { ...dnaShared, uColor: { value: new THREE.Color(color) }, uCore: { value: new THREE.Color(core) }, uPulse: { value: pulse }, uKind: { value: kind } },
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, clipping: true, clippingPlanes: [clipTop, clipBottom],
    vertexShader: `#include <clipping_planes_pars_vertex>
      uniform vec3 uCenter, uToCam; uniform float uRadius;
      varying vec3 vN; varying vec3 vV; varying vec2 vUv; varying float vFront;
      void main(){
        vUv = uv;
        vec4 w = modelMatrix * vec4(position, 1.0);
        vFront = dot(w.xyz - uCenter, uToCam) / uRadius;
        vec4 mvPosition = viewMatrix * w;
        vN = normalize(normalMatrix * normal); vV = normalize(-mvPosition.xyz);
        gl_Position = projectionMatrix * mvPosition;
        #include <clipping_planes_vertex>
      }`,
    fragmentShader: `#include <clipping_planes_pars_fragment>
      uniform float uOpacity, uTime, uPulse, uKind; uniform vec3 uColor, uCore; varying vec3 vN; varying vec3 vV; varying vec2 vUv; varying float vFront;
      void main(){
        #include <clipping_planes_fragment>
        float nv = abs(dot(normalize(vN), normalize(vV)));
        float rim = pow(1.0 - nv, 1.4);
        float depth = mix(0.3, 1.0, smoothstep(-0.9, 0.9, vFront));
        float pulse = uPulse * exp(-fract(vUv.x * 2.0 - uTime * 0.22) * 9.0);
        vec3 col; float a;
        if (uKind < 0.5) {
          /* a ribbon: a bright line down its middle, bright edges, a translucent body */
          float across = abs(vUv.y - 0.5) * 2.0;
          float centre = exp(-pow(across / 0.2, 2.0));
          float edge = smoothstep(0.7, 0.97, across);
          col = uColor * (0.3 + edge * 0.9 + rim * 0.7 + pulse * 1.1) + uCore * (centre * 0.85 + pulse * 0.6);
          a = (0.14 + centre * 0.55 + edge * 0.5 + rim * 0.35 + pulse * 0.5) * (1.0 - smoothstep(0.97, 1.0, across));
        } else {
          col = uColor * (0.45 + rim * 1.2) + uCore * pow(nv, 2.0) * 0.6;
          a = 0.34 + rim * 0.6;
        }
        gl_FragColor = vec4(col * depth, a * depth * uOpacity);
      }`,
  });
}
function ribbonGeometry(phase, width, segments) {
  const pos = [], nrm = [], uv = [], idx = [];
  for (let i = 0; i <= segments; i++) {
    const k = i / segments;
    helixFrame(k, phase);
    for (const s of [-1, 1]) {
      pos.push(_hP.x + _hW.x * s * width / 2, _hP.y + _hW.y * s * width / 2, _hP.z + _hW.z * s * width / 2);
      nrm.push(_hR.x, _hR.y, _hR.z);
      uv.push(k, (s + 1) / 2);
    }
    if (i < segments) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  return g;
}
{
  const ribbon = neonMat(0x3f9dff, 0xdff4ff, 1, 0);
  const light = neonMat(0x63cfff, 0xd8f7ff, 0, 1);
  const deep = neonMat(0x3566ff, 0xc2d2ff, 0, 1);
  const { turns, R, H, pairs } = HELIX;
  [0, Math.PI].forEach((phase) => dna.add(new THREE.Mesh(ribbonGeometry(phase, HELIX.ribbon, 720), ribbon)));
  const up = new THREE.Vector3(0, 1, 0);
  const rungGeo = new THREE.CylinderGeometry(0.014, 0.03, 1, 12, 1);
  for (let j = 0; j < pairs; j++) {
    const k = (j + 0.5) / pairs, t = k * Math.PI * 2 * turns, y = (k - 0.5) * H;
    const A = new THREE.Vector3(Math.cos(t) * R, y, Math.sin(t) * R), B = new THREE.Vector3(-A.x, y, -A.z), M = new THREE.Vector3(0, y, 0);
    [[A, j % 2 ? deep : light], [B, j % 2 ? light : deep]].forEach(([p, mat]) => {
      /* each half runs from its backbone to just short of the middle, tapering, leaving a small gap where the pair meets */
      const q = p.clone().lerp(M, 0.93);
      const m = new THREE.Mesh(rungGeo, mat);
      m.position.copy(p).add(q).multiplyScalar(0.5);
      m.scale.y = p.distanceTo(q);
      m.quaternion.setFromUnitVectors(up, q.clone().sub(p).normalize());
      dna.add(m);
    });
  }
}

/* ---------- Space: the galaxy's core (later the setting sun), the stars, flare stars, nebulae ---------- */
const core = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture('rgba(255,255,255,1)', 'rgba(255,205,150,0.6)'), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
core.scale.setScalar(1.6);
fx.add(core);
const sunPos = new THREE.Vector3(1.5, -2, -20);
const sunLight = { on: false, k: 0 };
const _ndcA = new THREE.Vector3(), _ndcB = new THREE.Vector3(), _ndcP = new THREE.Vector3(), SUN_TINT = new THREE.Color(1, 0.55, 0.36);
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
/* ---------- Deep space behind everything: the Milky Way painted once (its glow, star clouds, dust lanes and a few
   rose and teal nebulae) into a texture, with crisp stars drawn over it every frame from a hash, sharp at any size ---------- */
const BAND = { th0: -0.78, th1: 0.78, ph0: -1.0, ph1: 0.52 };   // the patch of sky the painting covers (radians)
const bandA = new THREE.Vector3(-0.58, -0.34, -1).normalize();   // the band enters low on the left…
const bandB = new THREE.Vector3(0.62, 0.44, -1).normalize();     // …and climbs out at the upper right
const bandN = new THREE.Vector3().crossVectors(bandA, bandB).normalize();
const bandE2 = new THREE.Vector3().crossVectors(bandN, bandA).normalize();
const v3 = (v) => `vec3(${v.x.toFixed(4)}, ${v.y.toFixed(4)}, ${v.z.toFixed(4)})`;
const bandTarget = new THREE.WebGLRenderTarget(coarse ? 768 : 1280, coarse ? 768 : 1280, { depthBuffer: false, generateMipmaps: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter });
const NOISE2_GLSL = `float h2(vec2 p){ vec3 q = fract(vec3(p.xyx) * 0.1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }
  float vn2(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(h2(i), h2(i + vec2(1.0, 0.0)), u.x), mix(h2(i + vec2(0.0, 1.0)), h2(i + vec2(1.0, 1.0)), u.x), u.y); }
  float fbm2(vec2 p){ float v = 0.0, a = 0.5; for (int i = 0; i < 6; i++) { v += a * vn2(p); p = p * 2.02 + vec2(11.7, 5.3); a *= 0.5; } return v; }`;
const bandPaint = new THREE.ShaderMaterial({
  depthTest: false, depthWrite: false,
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
  fragmentShader: /* glsl */ `varying vec2 vUv;
    ${NOISE2_GLSL}
    void main(){
      float th = mix(${BAND.th0.toFixed(3)}, ${BAND.th1.toFixed(3)}, vUv.x), ph = mix(${BAND.ph0.toFixed(3)}, ${BAND.ph1.toFixed(3)}, vUv.y);
      vec3 d = vec3(sin(th) * cos(ph), sin(ph), -cos(th) * cos(ph));
      float b = asin(clamp(dot(d, ${v3(bandN)}), -1.0, 1.0));            /* across the band */
      float l = atan(dot(d, ${v3(bandE2)}), dot(d, ${v3(bandA)}));         /* along it, from lower left to upper right */
      vec2 g = vec2(l, b);
      float bb = b + (fbm2(g * 3.0 + 4.0) - 0.5) * 0.06;
      float core = exp(-bb * bb / 0.004), halo = exp(-bb * bb / 0.03);
      float bulge = exp(-pow((l - 0.92) / 0.42, 2.0));   /* the warm heart of the galaxy, up and to the right */
      float clouds = fbm2(g * vec2(14.0, 26.0) + 1.3);
      /* dust lies in fine dark filaments (ridges of warped noise) and one long rift down the middle */
      vec2 w = g * vec2(10.0, 22.0) + vec2(fbm2(g * 6.0), fbm2(g * 6.0 + 7.3)) * 1.6;
      float lanes = 1.0 - abs(2.0 * fbm2(w) - 1.0);
      float dust = smoothstep(0.62, 0.9, lanes) * exp(-bb * bb / 0.008);
      float rift = exp(-pow((bb - 0.002 - (fbm2(g * 7.0) - 0.5) * 0.02) / 0.008, 2.0)) * 0.55 * (0.6 + 0.4 * fbm2(g * 12.0));
      float glow = (core * (0.5 + 0.8 * clouds) + halo * 0.18) * (0.5 + 1.0 * bulge);
      glow *= 1.0 - clamp(dust * 0.7 + rift, 0.0, 0.88);
      vec3 col = mix(vec3(0.5, 0.62, 1.0), vec3(1.0, 0.78, 0.6), bulge * 0.75) * glow;
      col += vec3(0.8, 0.85, 1.0) * pow(vn2(g * 900.0), 18.0) * core * 0.6;   /* stars too faint to see one by one */
      col += vec3(1.0, 0.36, 0.56) * smoothstep(0.64, 0.9, fbm2(g * 5.0 + 21.0)) * halo * 0.3;
      col += vec3(0.25, 0.75, 0.95) * smoothstep(0.68, 0.92, fbm2(g * 4.0 + 41.0)) * halo * 0.16;
      gl_FragColor = vec4(sqrt(clamp(col, 0.0, 1.0)), 1.0);   /* stored as its square root, so the faint parts keep their precision */
    }`,
});
/* painted a strip per frame over the first frames, so no single frame carries the cost */
let bandDirty = true, bandStrip = 0;
const BAND_STRIPS = 4;
const bandScene = new THREE.Scene(), bandQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), bandPaint);
bandQuad.frustumCulled = false; bandScene.add(bandQuad);
function paintBand() {
  const h = bandTarget.height, y0 = Math.floor((h * bandStrip) / BAND_STRIPS), y1 = Math.floor((h * (bandStrip + 1)) / BAND_STRIPS);
  bandTarget.scissor.set(0, y0, bandTarget.width, y1 - y0);
  bandTarget.scissorTest = true;
  const prev = renderer.getRenderTarget();
  renderer.setRenderTarget(bandTarget);
  renderer.render(bandScene, cloudCam);
  renderer.setRenderTarget(prev);
  bandTarget.scissorTest = false;
  if (++bandStrip < BAND_STRIPS) return;
  bandQuad.geometry.dispose(); bandPaint.dispose();
  bandDirty = false;
}
const spaceMat = new THREE.ShaderMaterial({
  uniforms: { uBand: { value: bandTarget.texture }, uOpacity: { value: 1 }, uBandK: { value: 1 }, uTime: uniforms.uTime, uPx: { value: 0.001 } },
  /* it adds light but no coverage, so the scene backgrounds behind the canvas still show */
  transparent: true, depthTest: false, depthWrite: false,
  blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor, blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneFactor,
  vertexShader: `varying vec3 vRay;
    void main(){
      vec3 d = vec3((position.x + projectionMatrix[2][0]) / projectionMatrix[0][0], (position.y + projectionMatrix[2][1]) / projectionMatrix[1][1], -1.0);
      vRay = d * mat3(viewMatrix);
      gl_Position = vec4(position.xy, 1.0, 1.0);
    }`,
  fragmentShader: /* glsl */ `uniform sampler2D uBand; uniform float uOpacity, uBandK, uTime, uPx; varying vec3 vRay;
    float hs(vec2 p){ vec3 q = fract(vec3(p.xyx) * 0.1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }
    /* one star per cell at most, placed and sized from the cell's hash; cells are measured in screen pixels */
    vec3 stars(vec2 q, float cellPx, float prob, float bright, float rad){
      vec2 g = q / (cellPx * uPx), id = floor(g), f = fract(g);
      float h = hs(id);
      if (h > prob) return vec3(0.0);
      vec2 dp = (f - (vec2(hs(id + 3.1), hs(id + 7.7)) * 0.7 + 0.15)) * cellPx;
      float k = hs(id + 1.3);
      float st = exp(-dot(dp, dp) / (2.0 * rad * rad)) * bright * (0.25 + 0.75 * k * k);
      st *= 0.78 + 0.22 * sin(uTime * (0.7 + 2.3 * hs(id + 5.5)) + h * 60.0);
      return mix(vec3(0.72, 0.82, 1.0), vec3(1.0, 0.86, 0.72), hs(id + 9.1)) * st;
    }
    void main(){
      vec3 d = normalize(vRay);
      float th = atan(d.x, -d.z), ph = asin(clamp(d.y, -1.0, 1.0));
      vec2 uv = vec2((th - ${BAND.th0.toFixed(3)}) / ${(BAND.th1 - BAND.th0).toFixed(3)}, (ph - ${BAND.ph0.toFixed(3)}) / ${(BAND.ph1 - BAND.ph0).toFixed(3)});
      float edge = smoothstep(0.0, 0.08, uv.x) * smoothstep(1.0, 0.92, uv.x) * smoothstep(0.0, 0.08, uv.y) * smoothstep(1.0, 0.92, uv.y);
      vec3 band = texture2D(uBand, clamp(uv, 0.0, 1.0)).rgb;
      band *= band * edge;
      float lum = dot(band, vec3(0.3, 0.5, 0.2));
      vec3 col = band * 0.085 * uBandK;
      vec2 q = d.xy / max(-d.z, 0.2);
      col += stars(q, 5.0, 0.04 + lum * 0.6, 0.2, 0.55);        /* a dust of faint stars, thicker in the Milky Way */
      col += stars(q + 17.3, 17.0, 0.26, 0.55, 0.7);
      col += stars(q + 41.9, 64.0, 0.22, 1.1, 0.9);             /* a few bright ones */
      gl_FragColor = vec4(col * uOpacity, 0.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
});
const spaceBg = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), spaceMat);
spaceBg.frustumCulled = false;
spaceBg.renderOrder = -100;
fx.add(spaceBg);
function softTexture(rgb) {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  g.addColorStop(0, `rgba(${rgb},1)`); g.addColorStop(0.35, `rgba(${rgb},0.45)`); g.addColorStop(0.7, `rgba(${rgb},0.12)`); g.addColorStop(1, `rgba(${rgb},0)`);
  ctx.fillStyle = g; ctx.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
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
fx.add(new THREE.DirectionalLight(0xffffff, 1.4).translateX(2).translateY(4).translateZ(6));
const sweep = new THREE.PointLight(0xffffff, 20, 12, 1.8);
sweep.position.set(-6, 1.5, 2.5);
fx.add(sweep);
let chrome = null, chromeMat = null, needsWarm = true;

/* ---------- The wordmark (from the real logo): the chrome letters, and the outlines the stars align to ---------- */
const revealU = { value: 99 };   // world x up to which the chrome has turned to metal (soft edge to its left)
new SVGLoader().load('assets/HyaicoWhite.svg', (data) => {
  const s = WORD_W / 619;
  const contours = [];
  chrome = new THREE.Group();
  chromeMat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, metalness: 1, roughness: 0.03, clearcoat: 0.25, clearcoatRoughness: 0.03, envMapIntensity: 1.0, transparent: true, opacity: 0, depthWrite: false });
  /* the metal arrives from left to right behind a soft edge, following the stars that wrote the word */
  chromeMat.onBeforeCompile = (sh) => {
    sh.uniforms.uRevealX = revealU;
    sh.vertexShader = 'varying float vRevealX;\n' + sh.vertexShader.replace('#include <project_vertex>', '#include <project_vertex>\n  vRevealX = (modelMatrix * vec4(transformed, 1.0)).x;');
    sh.fragmentShader = 'uniform float uRevealX;\nvarying float vRevealX;\n' + sh.fragmentShader.replace('#include <dithering_fragment>', '#include <dithering_fragment>\n  gl_FragColor.a *= 1.0 - smoothstep(uRevealX - 0.45, uRevealX, vRevealX);');
  };
  data.paths.forEach((path) => {
    SVGLoader.createShapes(path).forEach((shape) => {
      const bevelled = new THREE.ExtrudeGeometry(shape, { depth: 16, bevelEnabled: true, bevelThickness: 2.2, bevelSize: 1.8, bevelSegments: 4, curveSegments: 12 });
      bevelled.translate(-309.5, -50.3, -8); bevelled.scale(s, s, s);
      const m = new THREE.Mesh(bevelled, chromeMat); m.rotation.x = Math.PI; chrome.add(m);
      const { shape: outer, holes } = shape.extractPoints(16);
      [outer, ...holes].forEach((pts) => contours.push(pts.map((q) => new THREE.Vector2((q.x - 309.5) * s, -(q.y - 50.3) * s))));
    });
  });
  chrome.visible = false;
  fx.add(chrome);
  buildConstellation(contours);
  needsWarm = true;   /* compile the metal and the stars now, not when they first appear */
  window.dispatchEvent(new CustomEvent('scene:wordmark'));
}, undefined, () => window.dispatchEvent(new CustomEvent('scene:wordmark')));

/* ---------- The constellation: stars of the night sky that drift in and align along the letters' outlines, left to right
   as if the word were being written; faint lines then draw between them, and the metal arrives behind them ---------- */
const STAR_PATH_GLSL = `
  uniform float uGather, uRevealX, uWordScale, uYaw, uTime;
  uniform vec2 uSpread, uPointer;
  vec3 rotYc(vec3 p, float a) { float c = cos(a), s = sin(a); return vec3(c * p.x + s * p.z, p.y, -s * p.x + c * p.z); }
  /* where a star is: in the sky (spread over the view, at its own depth), or on the word, or on its way between */
  vec3 starAt(vec3 sky, vec3 word, vec2 info, out float k) {
    vec3 S = vec3(sky.xy * uSpread * (10.0 - sky.z) / 10.0, sky.z);
    S.xy += vec2(sin(uTime * 0.05 + info.y * 30.0), cos(uTime * 0.04 + info.y * 20.0)) * 0.08;
    S.xy += uPointer * (0.05 + 0.25 * info.y) * (10.0 - sky.z) / 10.0;
    vec3 W = rotYc(word * uWordScale, uYaw);
    k = clamp((uGather - info.x * 0.45 - info.y * 0.08) / 0.47, 0.0, 1.0);
    k = k * k * (3.0 - 2.0 * k);
    vec3 M = mix(S, W, 0.5) + vec3(0.0, (info.y - 0.5) * 0.9, 0.8 + info.y);   /* a gentle arc, not a straight line */
    return mix(mix(S, M, k), mix(M, W, k), k);
  }
  /* as the metal arrives behind the edge, each star flares once and goes */
  float revealFlash(float x) { float d = uRevealX - x; return exp(-d * d / 0.04); }
  float revealGone(float x) { return smoothstep(0.05, 0.55, uRevealX - x); }
`;
const conU = {
  uGather: { value: 0 }, uDraw: { value: 0 }, uRevealX: revealU, uOpacity: { value: 0 }, uLines: { value: 0 },
  uWordScale: uniforms.uWordScale, uYaw: uniforms.uYaw, uTime: uniforms.uTime, uPixelRatio: uniforms.uPixelRatio,
  uSpread: { value: new THREE.Vector2(4, 2.5) }, uPointer: uniforms.uPointer,
};
let conStars = null, conLines = null;
const conX = { min: -2.8, max: 2.8 };
function buildConstellation(contours) {
  /* stars spaced evenly along every outline, about as many in all as a rich patch of night sky */
  const lens = contours.map((c) => c.reduce((a, q, i) => a + q.distanceTo(c[(i + 1) % c.length]), 0));
  const total = lens.reduce((a, b) => a + b, 0);
  const spacing = total / (coarse ? 210 : 300);
  const word = [], info = [], sky = [], segA = [], segB = [], segT = [];
  let minX = Infinity, maxX = -Infinity;
  contours.forEach((c) => c.forEach((q) => { minX = Math.min(minX, q.x); maxX = Math.max(maxX, q.x); }));
  conX.min = minX; conX.max = maxX;
  contours.forEach((c, ci) => {
    const n = Math.max(4, Math.round(lens[ci] / spacing));
    const first = word.length / 3;
    let cx = 0;
    c.forEach((q) => { cx += q.x; });
    cx = (cx / c.length - minX) / (maxX - minX);
    /* walk the outline, dropping a star every n-th of its length */
    let seg = 0, along = 0;
    for (let k = 0; k < n; k++) {
      const want = (k / n) * lens[ci];
      let a = c[seg], b = c[(seg + 1) % c.length], l = a.distanceTo(b);
      while (along + l < want && seg < c.length - 1) { along += l; seg++; a = c[seg]; b = c[(seg + 1) % c.length]; l = a.distanceTo(b); }
      const f = l > 0 ? (want - along) / l : 0;
      const x = a.x + (b.x - a.x) * f, y = a.y + (b.y - a.y) * f;
      word.push(x, y, 0.1);
      info.push((x - minX) / (maxX - minX), Math.random());
      sky.push(Math.random() * 2 - 1, Math.random() * 2 - 1, -Math.random() * 6);
      /* the line to the next star round the outline: drawn in order, letter by letter from the left */
      segA.push(first + k); segB.push(first + ((k + 1) % n)); segT.push(0.7 * cx + 0.3 * (k / n), 0.3 / n);
    }
  });
  const N = word.length / 3;
  const mag = new Float32Array(N);
  for (let i = 0; i < N; i++) mag[i] = Math.pow(Math.random(), 2.2);   /* a few bright stars, many faint ones */

  const sg = new THREE.BufferGeometry();
  sg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3), 3));
  sg.setAttribute('aSky', new THREE.BufferAttribute(new Float32Array(sky), 3));
  sg.setAttribute('aWord', new THREE.BufferAttribute(new Float32Array(word), 3));
  sg.setAttribute('aInfo', new THREE.BufferAttribute(new Float32Array(info), 2));
  sg.setAttribute('aMag', new THREE.BufferAttribute(mag, 1));
  conStars = new THREE.Points(sg, new THREE.ShaderMaterial({
    uniforms: conU, transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending,
    vertexShader: `${STAR_PATH_GLSL}
      uniform float uOpacity, uPixelRatio; attribute vec3 aSky, aWord; attribute vec2 aInfo; attribute float aMag;
      varying float vA, vSpike, vCoreR; varying vec3 vCol;
      void main(){
        float k;
        vec3 p = starAt(aSky, aWord, aInfo, k);
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        float spike = step(0.8, aMag);
        float size = (1.5 + aMag * 3.4) * (1.0 + 2.6 * spike) * uPixelRatio * clamp(10.0 / -mv.z, 0.6, 1.6);
        gl_PointSize = size;
        vSpike = spike; vCoreR = 0.17 / (1.0 + 2.6 * spike);
        float twinkle = mix(0.6 + 0.4 * sin(uTime * (1.3 + aInfo.y * 3.0) + aInfo.y * 40.0), 0.92 + 0.08 * sin(uTime * 2.0 + aInfo.y * 9.0), k);
        float x = p.x;
        vA = uOpacity * (0.4 + 0.6 * aMag) * twinkle * (1.0 + 2.0 * revealFlash(x)) * (1.0 - revealGone(x)) * (0.75 + 0.25 * k);
        vCol = mix(vec3(0.74, 0.85, 1.0), vec3(1.0, 0.93, 0.82), step(0.72, aInfo.y));
      }`,
    fragmentShader: `varying float vA, vSpike, vCoreR; varying vec3 vCol;
      void main(){
        vec2 c = gl_PointCoord - 0.5;
        float core = exp(-dot(c, c) / (vCoreR * vCoreR));
        float spikes = vSpike * (exp(-abs(c.x) * 70.0) * exp(-abs(c.y) * 6.5) + exp(-abs(c.y) * 70.0) * exp(-abs(c.x) * 6.5)) * 0.9;
        float a = min(core + spikes, 1.0) * vA;
        if (a < 0.003) discard;
        gl_FragColor = vec4(vCol, a);
      }`,
  }));
  conStars.frustumCulled = false;
  conStars.visible = false;
  fx.add(conStars);

  /* the lines between neighbouring stars: each grows from one star to the next, like a pen going round the letters */
  const M = segA.length;
  const lg = new THREE.BufferGeometry();
  const at = (src, idx, w) => { const out = new Float32Array(M * 2 * w); for (let i = 0; i < M; i++) for (let e = 0; e < 2; e++) for (let j = 0; j < w; j++) out[(i * 2 + e) * w + j] = src[idx[i] * w + j]; return out; };
  const skyA = new Float32Array(sky), wordA = new Float32Array(word), infoA = new Float32Array(info);
  lg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(M * 6), 3));
  lg.setAttribute('aSkyA', new THREE.BufferAttribute(at(skyA, segA, 3), 3));
  lg.setAttribute('aWordA', new THREE.BufferAttribute(at(wordA, segA, 3), 3));
  lg.setAttribute('aInfoA', new THREE.BufferAttribute(at(infoA, segA, 2), 2));
  lg.setAttribute('aSkyB', new THREE.BufferAttribute(at(skyA, segB, 3), 3));
  lg.setAttribute('aWordB', new THREE.BufferAttribute(at(wordA, segB, 3), 3));
  lg.setAttribute('aInfoB', new THREE.BufferAttribute(at(infoA, segB, 2), 2));
  const seg = new Float32Array(M * 2 * 3);
  for (let i = 0; i < M; i++) for (let e = 0; e < 2; e++) { seg[(i * 2 + e) * 3] = segT[i * 2]; seg[(i * 2 + e) * 3 + 1] = segT[i * 2 + 1]; seg[(i * 2 + e) * 3 + 2] = e; }
  lg.setAttribute('aSeg', new THREE.BufferAttribute(seg, 3));
  conLines = new THREE.LineSegments(lg, new THREE.ShaderMaterial({
    uniforms: conU, transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending,
    vertexShader: `${STAR_PATH_GLSL}
      uniform float uDraw, uLines; attribute vec3 aSkyA, aWordA, aSkyB, aWordB, aSeg; attribute vec2 aInfoA, aInfoB;
      varying float vA;
      void main(){
        float ka, kb;
        vec3 A = starAt(aSkyA, aWordA, aInfoA, ka), B = starAt(aSkyB, aWordB, aInfoB, kb);
        float g = clamp((uDraw - aSeg.x) / max(aSeg.y, 0.0001), 0.0, 1.0);
        vec3 p = aSeg.z < 0.5 ? A : mix(A, B, g);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
        float x = 0.5 * (A.x + B.x);
        vA = uLines * step(0.0001, g) * (1.0 + 1.5 * revealFlash(x)) * (1.0 - revealGone(x));
      }`,
    fragmentShader: `varying float vA; void main(){ if (vA < 0.003) discard; gl_FragColor = vec4(vec3(0.66, 0.84, 1.0), vA); }`,
  }));
  conLines.frustumCulled = false;
  conLines.visible = false;
  fx.add(conLines);
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
function loadScreen(k) {
  return new Promise((resolve) => texLoader.load(`assets/screens/${k}.webp`, (t) => {
    t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = maxAniso; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter;
    textures[k] = upload(t); resolve(t);
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

/* ---------- The stage: a reddish sunset over a sea that runs to the true horizon ----------
   The sky is shaded by view direction. Its clouds are painted once into a panorama that wraps seamlessly sideways, so
   they can drift for ever; each row moves in proportion to its height, which is how a cloud layer moves in
   perspective. As the beat ends, night falls: the sun sinks, the sky deepens, stars come out. */
const stage = new THREE.Group();
front.add(stage);
const SKY = { zenith: new THREE.Color(0x1b1b58), mid: new THREE.Color(0x3d3688), low: new THREE.Color(0xc4567f), warm: new THREE.Color(0xff7b5c), sun: new THREE.Color(0xff7d50) };
const NIGHT = { zenith: new THREE.Color(0x090f2c), mid: new THREE.Color(0x1b1f4e), low: new THREE.Color(0x40285a) };
const MIST = new THREE.Color(0x9468a8);   // the faint purple haze along the horizon (by day)
const mistLive = new THREE.Color().copy(MIST);   // the horizon's colour now (day or night)
const sunDir = new THREE.Vector3(0.35, 0.006, -1).normalize();
const sunBase = new THREE.Vector3().copy(sunDir);
const HASH_GLSL = 'float hash21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }';

const panoU = { uP: { value: 1.2 }, uEMax: { value: 0.32 } };
const cloudTarget = new THREE.WebGLRenderTarget(coarse ? 1024 : 2048, coarse ? 640 : 768, { depthBuffer: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, generateMipmaps: false, wrapS: THREE.RepeatWrapping });
const cloudPaint = new THREE.ShaderMaterial({
  uniforms: { uSunDir: { value: sunBase }, ...panoU },
  depthTest: false, depthWrite: false,
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
  fragmentShader: /* glsl */ `uniform vec3 uSunDir; uniform float uP, uEMax; varying vec2 vUv;
    float hash31(vec3 p){ p = fract(p * vec3(0.1031, 0.1030, 0.0973)); p += dot(p, p.yxz + 33.33); return fract((p.x + p.y) * p.z); }
    float vnoise(vec3 p){ vec3 i = floor(p), f = fract(p); vec3 u = f * f * (3.0 - 2.0 * f);
      return mix(mix(mix(hash31(i), hash31(i + vec3(1.0, 0.0, 0.0)), u.x), mix(hash31(i + vec3(0.0, 1.0, 0.0)), hash31(i + vec3(1.0, 1.0, 0.0)), u.x), u.y),
                 mix(mix(hash31(i + vec3(0.0, 0.0, 1.0)), hash31(i + vec3(1.0, 0.0, 1.0)), u.x), mix(hash31(i + vec3(0.0, 1.0, 1.0)), hash31(i + vec3(1.0, 1.0, 1.0)), u.x), u.y), u.z); }
    /* fbm that lets go of the octaves too fine for the texel, so clouds stay clean all the way down to the horizon */
    float fbm(vec3 p, float px){
      float v = 0.0, a = 0.5;
      for (int i = 0; i < 7; i++) { float keep = 1.0 - smoothstep(0.25, 0.65, px); v += a * mix(0.5, vnoise(p), keep); p = p * 2.03 + vec3(17.1, 9.2, 4.7); px *= 2.03; a *= 0.5; }
      return v;
    }
    float clouds(vec3 p, float px){ vec3 q = vec3(fbm(p, px), fbm(p + vec3(5.2, 1.3, 2.8), px), fbm(p + vec3(1.7, 9.2, 3.1), px)); return fbm(p + 1.5 * q, px * 2.5); }
    /* a row of the panorama is a line across the cloud layer at one distance; it is wrapped round a circle in noise space
       whose circumference is the row's width, so every row repeats seamlessly. Height runs on a logarithmic scale, so
       each cloud keeps its billowing shape (about two and a half times wider than tall) as it shrinks toward the horizon */
    vec3 layer(float theta, float Z, float sx, float sz){ float c = sx * uP * Z / 6.2831853; return vec3(c * cos(theta), c * sin(theta), -sz * log(Z)); }
    void main(){
      float e = max(vUv.y * uEMax, 0.012);
      float Z = 1.0 / e;
      float theta = vUv.x * 6.2831853;
      vec3 p = layer(theta, Z, 0.187, 0.47);
      float px = length(fwidth(p));
      vec2 L = normalize(vec2(uSunDir.x, -uSunDir.z));
      float c = 0.187 * uP * Z / 6.2831853;
      vec3 ps = layer(theta + 0.09 * L.x / max(c, 0.001), Z, 0.187, 0.47) + vec3(0.0, 0.0, -0.05);   /* toward the low sun */
      float c1 = clouds(p, px), c1s = clouds(ps, px);
      float lit = clamp(0.5 + (c1 - c1s) * 22.0, 0.0, 1.0);   /* the side that faces the low sun */
      /* a second, lower layer of larger, softer billows */
      vec3 p2 = layer(theta, Z, 0.118, 0.3) + vec3(19.0, 3.0, 7.0);
      float c2 = clouds(p2, length(fwidth(p2)));
      /* density is stored around its threshold so eight bits keep the edges smooth */
      gl_FragColor = vec4(clamp((c1 - 0.37) / 0.28, 0.0, 1.0), lit, clamp((c2 - 0.39) / 0.28, 0.0, 1.0), 1.0);
    }`,
});
const cloudScene = new THREE.Scene();
{ const q = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), cloudPaint); q.frustumCulled = false; cloudScene.add(q); }
const cloudCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
let cloudsDirty = true, cloudStrip = 0;
const CLOUD_STRIPS = 8;
const painted = { p: 0, sx: 9 };
function paintClouds() {
  const prev = renderer.getRenderTarget();
  const w = cloudTarget.width, h = cloudTarget.height;
  const y0 = Math.floor((h * cloudStrip) / CLOUD_STRIPS), y1 = Math.floor((h * (cloudStrip + 1)) / CLOUD_STRIPS);
  cloudTarget.scissor.set(0, y0, w, y1 - y0);
  cloudTarget.scissorTest = true;
  renderer.setRenderTarget(cloudTarget);
  renderer.render(cloudScene, cloudCam);
  renderer.setRenderTarget(prev);
  cloudTarget.scissorTest = false;
  if (++cloudStrip < CLOUD_STRIPS) return;
  cloudStrip = 0;
  cloudsDirty = false;
  painted.p = panoU.uP.value; painted.sx = sunBase.x;
}

/* The sky is drawn as one screen-filling quad that works out each pixel's view ray itself. Nothing can clip it — not
   the far plane, not the sea's reflection pass (whose camera sits under the water and cuts away everything below the
   surface) — so sky and sea always meet cleanly. It lies exactly on the far plane and is drawn after the sea and the
   phone, so it only fills what they leave empty: while the stage fades in or out, no sky shows through the sea. */
const skyMat = new THREE.ShaderMaterial({
  transparent: true, depthWrite: false, depthTest: true,
  uniforms: {
    uIn: { value: 0 }, uTime: uniforms.uTime, uSunDir: { value: sunDir }, uSunR: { value: 0.05 }, uSunDisc: { value: 1 }, uSunGlow: { value: 1 }, uNight: { value: 0 },
    uZenith: { value: SKY.zenith }, uMid: { value: SKY.mid }, uLow: { value: SKY.low }, uWarm: { value: SKY.warm }, uSun: { value: SKY.sun }, uMist: { value: mistLive },
    uZenithN: { value: NIGHT.zenith }, uMidN: { value: NIGHT.mid }, uLowN: { value: NIGHT.low },
    uClouds: { value: cloudTarget.texture }, uWind: { value: 0.032 }, ...panoU,
  },
  /* each corner's view ray comes from the projection's x, y and w rows only: the reflection pass replaces the depth row
     with an oblique clip plane (the sea's surface), and inverting that would flip some rays and garble the mirrored sky */
  vertexShader: `varying vec3 vRay;
    void main(){
      vec3 d = vec3((position.x + projectionMatrix[2][0]) / projectionMatrix[0][0], (position.y + projectionMatrix[2][1]) / projectionMatrix[1][1], -1.0);
      vRay = d * mat3(viewMatrix);
      gl_Position = vec4(position.xy, 1.0, 1.0);
    }`,
  fragmentShader: /* glsl */ `uniform float uIn, uTime, uSunR, uSunDisc, uSunGlow, uNight, uP, uEMax, uWind;
    uniform vec3 uSunDir, uZenith, uMid, uLow, uWarm, uSun, uMist, uZenithN, uMidN, uLowN; uniform sampler2D uClouds; varying vec3 vRay;
    ${HASH_GLSL}
    void main(){
      vec3 dir = normalize(vRay);
      float e = dir.y, eu = max(e, 0.0), day = 1.0 - uNight;
      float az = atan(dir.x, -dir.z) - atan(uSunDir.x, -uSunDir.z);
      float side = exp(-az * az / 0.55);   /* the sun's side of the sky */
      float ang = acos(clamp(dot(dir, uSunDir), -1.0, 1.0));
      float near = exp(-ang / 0.32);
      /* violet-blue overhead, violet, then magenta and pink low down, burning coral on the sun's side; deep blue at night */
      vec3 lo = mix(mix(uLow, uWarm, side * 0.75), uLowN, uNight);
      vec3 mi = mix(uMid, uMidN, uNight), ze = mix(uZenith, uZenithN, uNight);
      vec3 sky = mix(lo, mi, smoothstep(0.0, 0.16, eu));
      sky = mix(sky, ze, smoothstep(0.12, 0.45, eu));
      /* a faint purple haze along the horizon line — the far sea mirrors it, so sea and sky meet without a line */
      sky = mix(sky, uMist, exp(-eu / 0.02) * 0.6);
      /* the sun, low and red: a soft disc with a hot heart, its light spread wide across the sunset side */
      float disc = smoothstep(uSunR * 1.12, uSunR * 0.78, ang);
      float glow = exp(-ang / (uSunR * 2.4)) * 0.42 + exp(-ang / (uSunR * 7.0)) * 0.3 + exp(-ang / (uSunR * 20.0)) * 0.22;
      vec3 heart = mix(uSun, vec3(1.0, 0.8, 0.6), smoothstep(uSunR * 0.9, 0.0, ang) * 0.75);
      sky += uSun * glow * uSunGlow * (1.0 - 0.85 * uNight) + heart * disc * 1.05 * uSunDisc * day;
      vec3 col = sky;
      float fwd = -dir.z;
      if (eu > 0.004 && fwd > 0.2) {
        /* the painted clouds drift sideways, nearer (higher) clouds faster; the lower, larger layer a little faster still */
        float drift = uWind * uTime * eu;
        vec2 uv = vec2((dir.x / fwd - drift) / uP, eu / uEMax);
        vec3 cl = texture2D(uClouds, vec2(uv.x, clamp(uv.y, 0.0, 1.0))).rgb;
        float l2 = texture2D(uClouds, vec2((dir.x / fwd - drift * 1.35) / uP + 0.37, clamp(uv.y, 0.0, 1.0))).b;
        float inside = smoothstep(1.0, 0.94, uv.y);
        float rise = smoothstep(0.004, 0.05, eu);
        float d1 = smoothstep(0.15, 0.66, cl.r) * rise * inside;
        float d2 = smoothstep(0.25, 0.8, l2) * rise * inside;
        float thin = d1 * (1.0 - d1) * 4.0;
        /* billowing clouds: violet and plum in their own shade, lit coral, salmon and magenta on the side that faces the
           low sun, gold near it, with a bright lining where they thin out near it */
        vec3 shadeC = mix(vec3(0.28, 0.13, 0.33), vec3(0.22, 0.19, 0.5), smoothstep(0.04, 0.3, eu));
        vec3 litC = mix(vec3(1.0, 0.5, 0.44), vec3(0.94, 0.37, 0.6), smoothstep(0.04, 0.3, eu));
        litC = mix(litC, vec3(1.0, 0.7, 0.5), near * 0.65);
        shadeC = mix(shadeC, vec3(0.05, 0.06, 0.13), uNight);
        litC = mix(litC, vec3(0.2, 0.17, 0.33), uNight);
        vec3 cloudC = mix(shadeC, litC, smoothstep(0.25, 0.85, cl.g) * (0.55 + 0.45 * side)) + litC * thin * (0.12 + 0.55 * near) * day;
        cloudC *= mix(1.0, 0.8, smoothstep(0.55, 1.0, cl.r));   /* the thick hearts of the billows sit in their own shade */
        vec3 low2 = mix(mix(vec3(0.42, 0.2, 0.42), vec3(0.95, 0.5, 0.52), side * 0.8), vec3(0.06, 0.06, 0.14), uNight);
        col = mix(col, low2, d2 * 0.7);
        col = mix(col, cloudC, d1 * 0.92);
      }
      /* the first stars, as night falls */
      if (uNight > 0.001) {
        vec2 g = vec2(atan(dir.x, -dir.z), asin(clamp(dir.y, -1.0, 1.0))) * 260.0;
        vec2 cell = floor(g), f = fract(g) - 0.5;
        vec2 jit = vec2(hash21(cell + 3.1), hash21(cell + 7.7)) - 0.5;
        float star = step(0.986, hash21(cell)) * smoothstep(0.2, 0.0, length(f - jit * 0.6));
        col += vec3(0.9, 0.94, 1.0) * star * (0.4 + 0.6 * hash21(cell + 1.7)) * uNight * smoothstep(0.03, 0.14, eu);
      }
      col += (hash21(gl_FragCoord.xy) - 0.5) / 160.0;
      gl_FragColor = vec4(col, uIn);
      #include <colorspace_fragment>
    }`,
});
const skyDome = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), skyMat);
skyDome.renderOrder = -5;
skyDome.frustumCulled = false;
stage.add(skyDome);
const floor = new THREE.Group();
stage.add(floor);
const waterNormals = texLoader.load('assets/waternormals.jpg', (t) => upload(t));
waterNormals.wrapS = waterNormals.wrapT = THREE.RepeatWrapping;
const SUN_COLOR = new THREE.Color(0xff9470);
const water = new Water(new THREE.PlaneGeometry(3200, 3200), {
  textureWidth: coarse ? 384 : 1024, textureHeight: coarse ? 768 : 512, waterNormals, clipBias: 0.003,
  sunDirection: sunDir, sunColor: SUN_COLOR, waterColor: 0x1a1541, distortionScale: 0.3, fog: false,
});
water.rotation.x = -Math.PI / 2;
water.position.z = -1390;   // from just behind the camera to beyond the far plane: the sea meets the true horizon
water.renderOrder = -10;
water.material.transparent = true;
water.material.toneMapped = false;   /* the sky isn't tone-mapped either, so the far sea mirrors it to the exact same colour */
water.material.uniforms.size.value = 40;
water.material.fragmentShader = water.material.fragmentShader
  .replace('vec3( 0.1 ) + reflectionSample * 0.9', 'reflectionSample')   // no grey lift: the sea shows what it reflects
  .replace('sunLight( surfaceNormal, eyeDirection, 100.0, 2.0, 0.5, diffuseLight, specularLight );', 'sunLight( surfaceNormal, eyeDirection, 140.0, 1.3, 0.5, diffuseLight, specularLight );');

/* the sun's light in the air: a soft warm bloom round it, nothing more */
const glareMat = new THREE.ShaderMaterial({
  uniforms: { uSun: { value: new THREE.Vector2(0.6, -0.1) }, uAspect: { value: 1 }, uStrength: { value: 0 }, uTime: uniforms.uTime },
  transparent: true, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending,
  vertexShader: 'varying vec2 vP; void main(){ vP = position.xy; gl_Position = vec4(position.xy, 0.0, 1.0); }',
  fragmentShader: /* glsl */ `uniform vec2 uSun; uniform float uAspect, uStrength, uTime; varying vec2 vP;
    void main(){
      vec2 d = (vP - uSun) * vec2(uAspect, 1.0);
      float r = length(d);
      float bloom = exp(-r / 0.05) * 0.2 + exp(-r / 0.2) * 0.09 + exp(-r / 0.6) * 0.04;
      vec3 col = vec3(1.0, 0.62, 0.46) * bloom;
      gl_FragColor = vec4(col * uStrength, 1.0);
      #include <colorspace_fragment>
    }`,
});
const glare = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), glareMat);
glare.frustumCulled = false;
glare.renderOrder = 1000;
front.add(glare);
const _sunNdc = new THREE.Vector3();

/* the sea mirrors the whole sky (it is the sea that fades with the stage, so sky and sea always fade as one); the
   reflection's empty space is the horizon's colour, never black; the lens glare is not reflected */
const reflect = water.onBeforeRender;
water.onBeforeRender = function (r, s, c) {
  const g = glare.visible, k = skyMat.uniforms.uIn.value;
  glare.visible = false;
  skyMat.uniforms.uIn.value = 1;
  r.setClearColor(mistLive, 1);
  reflect.call(this, r, s, c);
  r.setClearColor(0x000000, 0);
  skyMat.uniforms.uIn.value = k;
  glare.visible = g;
};
floor.add(water);

/* tiny glowing motes drifting in the warm air over the sea, a few close enough to glow large */
const MOTE_N = coarse ? 110 : 240;
const moteGeo = new THREE.BufferGeometry();
{
  const mp = new Float32Array(MOTE_N * 3), mr = new Float32Array(MOTE_N);
  for (let i = 0; i < MOTE_N; i++) {
    const z = 8.4 - Math.pow(Math.random(), 0.8) * 18, d = 10 - z;
    mp[i * 3] = (Math.random() - 0.5) * 2 * (0.6 * d + 0.5); mp[i * 3 + 1] = 0.08 + Math.pow(Math.random(), 1.3) * (0.25 * d + 0.6); mp[i * 3 + 2] = z;
    mr[i] = Math.random();
  }
  moteGeo.setAttribute('position', new THREE.BufferAttribute(mp, 3));
  moteGeo.setAttribute('aR', new THREE.BufferAttribute(mr, 1));
}
const moteMat = new THREE.ShaderMaterial({
  uniforms: { uOpacity: { value: 0 }, uNight: { value: 0 }, uTime: uniforms.uTime, uPixelRatio: uniforms.uPixelRatio },
  transparent: true, depthWrite: false, depthTest: true, blending: THREE.AdditiveBlending,
  vertexShader: `uniform float uTime, uPixelRatio, uOpacity; attribute float aR; varying float vA; varying float vR;
    void main(){
      vec3 p = position;
      float t = uTime * (0.05 + aR * 0.06);
      p.x += sin(t * 3.1 + aR * 40.0) * 0.6 + uTime * (0.03 + aR * 0.03);
      p.y += sin(t * 2.3 + aR * 17.0) * 0.25;
      p.z += cos(t * 2.7 + aR * 23.0) * 0.4;
      float span = 1.2 * (10.0 - position.z) + 1.0;
      p.x = mod(p.x + span * 0.5, span) - span * 0.5;
      vec4 mv = modelViewMatrix * vec4(p, 1.0);
      gl_Position = projectionMatrix * mv;
      float depth = -mv.z;
      gl_PointSize = clamp((3.0 + aR * 5.0) * uPixelRatio * (7.0 / depth), 1.5, 24.0 * uPixelRatio);
      vA = uOpacity * (0.55 + 0.45 * sin(uTime * (1.2 + aR * 2.0) + aR * 50.0)) * smoothstep(0.6, 1.8, depth) * (1.0 - smoothstep(16.0, 24.0, depth));
      vR = aR;
    }`,
  fragmentShader: `uniform float uNight; varying float vA; varying float vR;
    void main(){ vec2 c = gl_PointCoord - 0.5; float d2 = dot(c, c); if (d2 > 0.25) discard;
      float a = exp(-d2 * 14.0) * 0.5 + exp(-d2 * 90.0) * 0.75;
      vec3 col = mix(mix(vec3(1.0, 0.66, 0.6), vec3(1.0, 0.86, 0.68), step(0.62, vR)), vec3(0.72, 0.8, 1.0), uNight);
      gl_FragColor = vec4(col, a * vA); }`,
});
const motes = new THREE.Points(moteGeo, moteMat);
motes.frustumCulled = false;
floor.add(motes);

/* Lights for the phone: a warm key, a cool fill, the sunset catching its edge from behind */
front.add(new THREE.HemisphereLight(0xffeef2, 0x1a1626, 0.5));
const key = new THREE.DirectionalLight(0xffeee8, 2.4); key.position.set(3, 5, 7); front.add(key);
const fill = new THREE.DirectionalLight(0xe4ecdc, 0.9); fill.position.set(-5, -2, 4); front.add(fill);
const rim = new THREE.PointLight(0xff7f6e, 26, 20, 1.6); rim.position.set(3, 2, -4); front.add(rim);

/* ---------- Post-processing (particle layer only; multisampled so lines and tubes stay smooth) ---------- */
let composer = null;
if (!coarse) {
  composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 }));
  composer.setPixelRatio(1);   /* the soft particle layer renders at 1×; the crisp product layer gets the full pixel ratio */
  composer.addPass(new RenderPass(fx, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.28, 0.5, 0.9);
  /* the glow adds light but no coverage (its blur is opaque, and blended as it ships it would leave the whole canvas
     70% black), so the canvas stays see-through and each scene's own background shows behind the particles */
  Object.assign(bloom.blendMaterial, {
    blending: THREE.CustomBlending, blendEquation: THREE.AddEquation,
    blendSrc: THREE.SrcAlphaFactor, blendDst: THREE.OneFactor, blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneFactor,
  });
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
}

/* ---------- Warm-up: every shader is compiled (for each target it will draw into) and every texture uploaded while
   the loader is still up, so nothing hitches the first time a scene appears ---------- */
const warmRT = new THREE.WebGLRenderTarget(4, 4);   // stands in for the sea's reflection target (same kind of target)
function warmUp() {
  needsWarm = false;
  [electronTex, core.material.map, flareTex, glintTex, ...nebulae.map((s) => s.material.map)].forEach(upload);
  const prev = renderer.getRenderTarget();
  const jobs = [];
  try {
    renderer.setRenderTarget(composer ? composer.readBuffer : null);
    jobs.push(renderer.compileAsync(fx, camera));
    renderer.setRenderTarget(null);
    jobs.push(renderer.compileAsync(front, camera));
    renderer.setRenderTarget(warmRT);
    jobs.push(renderer.compileAsync(front, camera));
  } catch (err) { /* a failed warm-up only costs a hitch later */ }
  renderer.setRenderTarget(prev);
  Promise.all(jobs).catch(() => {});
}

/* ---------- Camera keyframes per form ---------- */
const CAM = [
  { p: new THREE.Vector3(0, 0, 10), l: new THREE.Vector3(0, 0, 0) },         // chrome wordmark
  { p: new THREE.Vector3(0, 0.3, 10), l: new THREE.Vector3(0, -0.2, 0) },    // the Earth
  { p: new THREE.Vector3(0.4, 0.5, 10), l: new THREE.Vector3(0, 0, 0) },     // helix (it sits right of the text itself)
  { p: new THREE.Vector3(0, 4.4, 7.6), l: new THREE.Vector3(0, -0.7, 0) },   // galaxy (seen from above)
  { p: new THREE.Vector3(0, 0.34, 10), l: new THREE.Vector3(0, 0.05, 0) },   // the stage (a little above the sea, looking almost level)
];
/* the hero's own framing, before it is placed along the dive (layout) */
const CAM1 = { p: CAM[1].p.clone(), l: CAM[1].l.clone() };
const DIVE = { at: new THREE.Vector3(0, 0.8, 0.6).normalize(), u: new THREE.Vector3(0, 0, -1), s: 16 };
const heroOff = new THREE.Vector3();
/* Story beats: where each form is fully held (progress 0..1); blends in between */
const BEATS = [
  { f: 1, a: 0.0, b: 0.06 },
  { f: 2, a: 0.16, b: 0.27 },
  { f: 3, a: 0.37, b: 0.47 },
  { f: 4, a: 0.56, b: 0.7 },
  { f: 0, a: 0.8, b: 1.0 },
];

/* ---------- Layout ---------- */
let stacked = false, introStarted = false, introDone = false;
const phoneAt = new THREE.Vector3(1.5, 0, 0);
let phoneScale = 1;
const _c = new THREE.Vector3();
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
  dnaShared.uRadius.value = HELIX.R * uniforms.uHelixScale.value;

  /* the Earth and its atom: on phones smaller and a little higher, so the orbits fit the narrow screen */
  PLANET.y = stacked ? -2.3 : -3.4;
  PLANET.scale = stacked ? 0.5 : 1;
  uniforms.uPlanetScale.value = PLANET.scale;
  if (introDone) uniforms.uPlanetY.value = PLANET.y;
  else if (!introStarted) uniforms.uPlanetY.value = PLANET.y - 3;
  globe.scale.setScalar(PLANET.scale);
  orbits.scale.setScalar(PLANET.scale);
  ringShared.uRadius.value = ORBIT_R * PLANET.scale;

  /* the stage: the phone stands on the sea; the camera stands a little above it and looks almost level, so the
     water runs all the way out to the true horizon */
  phoneScale = (VIS_H * (stacked ? 0.45 : 0.72)) / PHONE.h;
  phoneAt.set(stacked ? 0 : vw * 0.2, stacked ? 0.95 : 0.05, 0);
  const floorY = phoneAt.y - (PHONE.h / 2) * phoneScale - 0.04;
  floor.position.set(0, floorY, 0);
  CAM[4].p.set(0, stacked ? 0.5 : 0.34, 10);
  CAM[4].l.set(0, stacked ? 0.38 : 0.05, 0);
  /* the sun: half set on the horizon, just beside the phone */
  sunBase.set((stacked ? 0.95 : 0.8) * T16 * camera.aspect, 0.008, -1).normalize();
  sunDir.copy(sunBase);
  skyMat.uniforms.uSunR.value = stacked ? 0.024 : 0.026;
  sunPos.copy(CAM[4].p).addScaledVector(sunBase, 30);
  /* the cloud panorama is one seamless period a little wider than the view; it is repainted only when the view needs
     a wider one, or the sun has moved (not on every resize — phones resize as their toolbars slide) */
  const need = 2 * (T16 * camera.aspect * 1.15 + 0.08);
  if (need > painted.p * 1.02 || need < painted.p * 0.6 || Math.abs(sunBase.x - painted.sx) > 0.02) { panoU.uP.value = need * 1.15; cloudsDirty = true; }

  uniforms.uSize.value = (coarse ? 2.0 : 1.7) * (stacked ? 0.9 : 1);
  CAM[2].p.x = stacked ? 0 : 0.4;
  CAM[2].l.y = stacked ? 0.9 : 0;
  CAM[3].l.y = stacked ? -0.55 : -0.7;

  /* the dive: the hero (the Earth, its atom and its camera) is placed so that one straight line runs from the hero's
     camera through the face of the Earth (a little below the middle of what we see of it), out through the far side
     and on to where the helix is framed — so going from one to the other is a single flight forward, into the Earth */
  const R = PLANET_R * PLANET.scale;
  _c.set(0, PLANET.y, 0);
  _hT.copy(_c).addScaledVector(DIVE.at, R);
  DIVE.u.subVectors(_hT, CAM1.p).normalize();
  _hR.subVectors(CAM1.p, _c);
  const bq = _hR.dot(DIVE.u), cq = _hR.lengthSq() - R * R;
  DIVE.s = -bq + Math.sqrt(Math.max(bq * bq - cq, 0)) + 3.5;   // out of the far side, and on a little further
  heroOff.copy(CAM[2].p).sub(CAM1.p).addScaledVector(DIVE.u, -DIVE.s);
  CAM[1].p.copy(CAM1.p).add(heroOff);
  CAM[1].l.copy(CAM1.l).add(heroOff);
  uniforms.uHeroOff.value.copy(heroOff);
  orientRings(CAM[1].p, _c.add(heroOff));
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
  glareMat.uniforms.uAspect.value = camera.aspect;
  const fxScale = composer ? 1 : dpr;   /* the particle layer renders at 1x with bloom, at the device ratio without */
  ringRes.value.set(w * fxScale, h * fxScale);
  spaceMat.uniforms.uPx.value = (2 * T16) / (h * fxScale);
  layout();
}
window.addEventListener('resize', resize);
resize();

/* ---------- Intro: the Earth rises into place as the loader lifts ---------- */
function startIntro() {
  introStarted = true;
  const g = window.gsap;
  if (reduced || !g) { uniforms.uPlanetY.value = PLANET.y; introDone = true; return; }
  g.to(uniforms.uPlanetY, { value: PLANET.y, duration: 2.6, ease: 'power3.out', onComplete: () => { introDone = true; } });
}
window.addEventListener('scene:intro', startIntro, { once: true });

/* ---------- The page behind the canvas: a background for each scene, cross-faded with the story ---------- */
const bgEls = {};
document.querySelectorAll('[data-bg]').forEach((el) => { bgEls[el.dataset.bg] = { el, v: -1 }; });
function setBg(name, v) {
  const b = bgEls[name];
  if (!b) return;
  v = Math.round(v * 250) / 250;
  if (v !== b.v) { b.v = v; b.el.style.opacity = String(v); }
}

/* ---------- Story state ---------- */
const camPos = new THREE.Vector3(), camLook = new THREE.Vector3(), _dA = new THREE.Vector3(), _dB = new THREE.Vector3();
const footer = document.getElementById('footerWordmark');
let smooth = 0, phoneIn = 0, globeW = 1, stageNow = 0, ringsIn = 0, dnaSpin = 0, sweepAt = null;
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
  /* Earth → DNA: one flight forward — into the Earth, through its lights, on until the helix is there. It speeds up
     toward the surface and slows as the helix arrives; the camera's gaze moves from the Earth onto the line of flight,
     then onto the helix. DNA → galaxy: it pulls far back. */
  const pair = (a, b) => (st.from === a && st.to === b) || (st.from === b && st.to === a);
  const arc = Math.sin(Math.PI * e);
  const dive = pair(1, 2);
  if (dive) {
    const m = st.mix, k = m < 0.5 ? 4 * m * m * m : 1 - Math.pow(-2 * m + 2, 3) / 2;
    camPos.copy(CAM[1].p).addScaledVector(DIVE.u, DIVE.s * k);
    _dA.subVectors(CAM[1].l, CAM[1].p).normalize();
    _dB.subVectors(CAM[2].l, CAM[2].p).normalize();
    _dA.lerp(DIVE.u, ss(m, 0, 0.3)).lerp(_dB, ss(m, 0.62, 1)).normalize();
    camLook.copy(camPos).addScaledVector(_dA, 10);
  }
  if (pair(2, 3)) { camPos.z += 3.0 * arc; camPos.y += 1.2 * arc; }

  const w0 = weightOf(st, 0), w1 = weightOf(st, 1), w2 = weightOf(st, 2), w3 = weightOf(st, 3), w4 = weightOf(st, 4);
  const end = ss(HY.outro, 0.15, 0.85);
  setBg('hero', w1);
  setBg('helix', w2);
  setBg('galaxy', w3);
  setBg('night', (w4 + w0) * (1 - end));
  setBg('end', end);

  /* the Earth and the atom: on the dive the orbits sweep past first, then the surface and the clouds melt away just
     before the camera reaches them, leaving only the Earth's lights around us */
  globeW = w1;
  const surface = dive ? 1 - ss(st.mix, 0.34, 0.5) : (w1 > 0.01 ? 1 : 0);
  globe.visible = surface > 0.002;
  uniforms.uSolid.value = surface;
  bodyMat.uniforms.uOpacity.value = surface;
  bodyMat.depthWrite = surface > 0.98;
  haloMat.uniforms.uOpacity.value = surface;
  cloudsMat.uniforms.uOpacity.value = surface;
  /* the orbits come up with the Earth as it rises out of the loader, never before */
  const risen = THREE.MathUtils.clamp(1 - (PLANET.y - uniforms.uPlanetY.value) / 3, 0, 1);
  ringsIn = w1 * risen * risen * (dive ? 1 - ss(st.mix, 0.04, 0.3) : 1);
  orbits.visible = ringsIn > 0.002;
  rings.forEach((r) => { r.shared.uOpacity.value = ringsIn; });

  /* the helix grows in from the bottom as the particles weave it. Into the galaxy it spins with them — one full turn —
     flattening into the disc as its axis glides to the centre, and fades */
  let grow = 1, dissolve = 0, dnaFade = 1;
  if (pair(2, 3)) {
    const m = st.mix;
    dnaSpin = Math.PI * 2 * m * m * m * (m * (m * 6 - 15) + 10);
    const gl = ss(m, 0, 1);
    dnaRig.position.copy(uniforms.uHelixOffset.value).multiplyScalar(1 - gl);
    dnaRig.rotation.z = uniforms.uLean.value * (1 - gl);
    dna.scale.y = 1 - 0.95 * ss(m, 0.05, 0.6);
    dnaFade = 1 - ss(m, 0.15, 0.55);
  } else {
    dnaSpin = 0;
    dnaRig.position.copy(uniforms.uHelixOffset.value);
    dnaRig.rotation.z = uniforms.uLean.value;
    dna.scale.y = 1;
  }
  if (st.to === 2 && st.from !== 2) grow = ss(st.mix, dive ? 0.6 : 0.22, dive ? 0.98 : 0.95);
  if (st.from === 2 && st.to !== 2 && st.to !== 3) dissolve = ss(st.mix, 0.05, 0.8);
  const hy = uniforms.uHelixOffset.value.y, hh = (HELIX.H / 2 + 0.4) * uniforms.uHelixScale.value;
  clipTop.constant = hy - hh + 2 * hh * grow;
  clipBottom.constant = -(hy - hh + 2 * hh * dissolve);
  dnaRig.visible = w2 > 0.01 && grow > 0.001 && dissolve < 0.999;
  dnaShared.uOpacity.value = ss(w2, 0, 0.2) * dnaFade;

  /* the galaxy's core lights up once the galaxy has gathered. On the way back to earth the galaxy dissolves into the
     night's stars while its light glides down a gentle arc on screen to the very spot on the horizon where the sun will
     sit, warming from white-gold to the sunset's red-orange; the sky's glow gathers round it, its disc takes over
     exactly where the light lands, and only then does the light let go (placed in the frame, once the camera is set) */
  let coreOpacity = ss(w3, 0.45, 1) * 0.9, sunDisc = 1, sunGlow = 1;
  sunLight.on = st.from === 3 && st.to === 4;
  if (sunLight.on) {
    sunLight.k = ss(st.mix, 0.06, 0.86);
    coreOpacity = (0.9 + 0.1 * ss(st.mix, 0, 0.3)) * (1 - ss(st.mix, 0.86, 1));
    sunGlow = ss(st.mix, 0.45, 0.9);
    sunDisc = ss(st.mix, 0.74, 1);
  } else {
    core.position.set(0, 0, 0);
    core.scale.setScalar(1.6);
    core.material.color.setRGB(1, 1, 1);
  }
  core.material.opacity = coreOpacity;
  core.visible = coreOpacity > 0.002;
  skyMat.uniforms.uSunDisc.value = sunDisc;
  skyMat.uniforms.uSunGlow.value = sunGlow;

  /* space: the stars are there behind the Earth, the DNA and the night; full in the galaxy, with its flares and nebulae.
     Anything fully transparent is not drawn at all (the nebulae are screen-sized). */
  const space = dive ? 0.4 * (1 - ss(st.mix, 0.18, 0.36)) + 0.3 * ss(st.mix, 0.62, 1) : 0.4 * w1 + 0.3 * w2 + w3 + 0.5 * (w4 + w0) * (1 - end);
  /* deep space: the stars and the Milky Way all round the Earth. Diving into the Earth they go before its surface does;
     round the DNA there are only faint stars; the galaxy and the night have both again */
  const nightSky = (w4 + w0) * (1 - end);
  const deep = dive ? 1 - ss(st.mix, 0.18, 0.36) + 0.45 * ss(st.mix, 0.62, 1) : w1 + 0.45 * w2 + 0.85 * w3 + 0.75 * nightSky;
  const bandK = dive ? 1 - ss(st.mix, 0.18, 0.36) : (w1 + 0.4 * w3 + 0.9 * nightSky) / Math.max(w1 + w2 + w3 + nightSky, 0.001);
  spaceMat.uniforms.uOpacity.value = deep;
  spaceMat.uniforms.uBandK.value = bandK;
  spaceBg.visible = deep > 0.002;
  starMat.uniforms.uOpacity.value = space;
  stars.visible = space > 0.002;
  flares.forEach((s) => { s.material.opacity = w3 * s.userData.max; s.material.rotation = s.userData.spin; s.visible = w3 > 0.002; });
  nebulae.forEach((s) => { s.material.opacity = s.userData.max * w3; s.visible = w3 > 0.002; });

  /* the particles have gone by the time night falls: the stars write the word */
  points.visible = !((st.from === 4 || st.from === 0) && (st.to === 4 || st.to === 0));

  /* night: the stars appear as the sea fades, drift in and align along the letters from the left; lines draw between
     them; then the metal arrives behind a soft edge from the left, each star flaring once as it passes. Nothing
     sparkles on the finished chrome. */
  const conIn = ss(smooth, 0.715, 0.78);
  const reveal = ss(smooth, 0.855, 0.915);
  const wx = uniforms.uWordScale.value;
  revealU.value = HY.outro > 0 || reveal >= 1 ? 99 : THREE.MathUtils.lerp(conX.min * wx - 0.6, conX.max * wx + 0.7, reveal);
  conU.uGather.value = ss(smooth, 0.75, 0.845);
  conU.uDraw.value = ss(smooth, 0.81, 0.865);
  conU.uOpacity.value = conIn;
  conU.uLines.value = 0.3 * conIn;
  conU.uSpread.value.set(visibleWidth() * 0.56, VIS_H * 0.56);
  const conOn = conIn > 0.002 && reveal < 1 && HY.outro === 0;
  if (conStars) { conStars.visible = conOn; conLines.visible = conOn && conU.uDraw.value > 0; }
  const chromeIn = ss(smooth, 0.85, 0.87);
  const chromeFade = 1 - ss(HY.outro, 0.72, 0.96);
  sweep.intensity = 20 * chromeIn;   /* the travelling light exists for the metal only */
  sweepAt = reveal > 0 && reveal < 1 ? revealU.value : null;   /* while the metal arrives, the light rides its edge */
  if (chrome) {
    const solid = chromeIn * chromeFade;
    chrome.visible = solid > 0.002;
    chromeMat.opacity = solid;
    chromeMat.depthWrite = solid > 0.98 && reveal >= 1;
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

  /* the stage: we come down out of space into a night over the sea; as the galaxy's light settles into the sun, the sun
     rises and the sky warms into the sunset; the phone rises out of the water. Then night falls again, the phone
     sinks back, and the night sky gives way to the stars that write HYAICO */
  const night = Math.max(1 - ss(smooth, 0.49, 0.585), ss(smooth, 0.665, 0.735));
  const stageIn = ss(smooth, 0.5, 0.57) * (1 - ss(smooth, 0.725, 0.785));
  const target = ss(smooth, 0.568, 0.635) * (1 - ss(smooth, 0.672, 0.732));
  phoneIn += (target - phoneIn) * (1 - Math.pow(0.001, dt));
  stage.visible = stageIn > 0.002;
  phone.visible = phoneIn > 0.002;
  stageNow = stageIn;
  skyMat.uniforms.uIn.value = stageIn;
  skyMat.uniforms.uNight.value = night;
  sunDir.copy(sunBase); sunDir.y -= 0.075 * night; sunDir.normalize();   /* the sun sinks below the sea */
  mistLive.copy(MIST).lerp(NIGHT.low, night);
  water.material.uniforms.alpha.value = stageIn;
  moteMat.uniforms.uOpacity.value = stageIn * (1 - 0.55 * night);
  moteMat.uniforms.uNight.value = night;
  water.material.uniforms.sunColor.value.copy(SUN_COLOR).multiplyScalar(1 - night);
  rim.intensity = 26 * (1 - 0.8 * night);
  const rise = 1 - ss(phoneIn, 0, 1);
  phone.scale.setScalar(phoneScale);
  phone.position.set(phoneAt.x, phoneAt.y - rise * PHONE.h * phoneScale * 1.15, 0);
  uniforms.uGlobalAlpha.value = 1 - 0.7 * ss(HY.outro, 0, 1);

  /* the app's screens change while the phone is up */
  setScreen(smooth < 0.635 ? 'home' : smooth < 0.675 ? 'next-meal' : 'recipe');
  return { pin: phoneIn, stageIn, night, sunDisc };
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
  /* the Earth turns slowly, wherever the hero is placed (see the dive in layout()) */
  const spin = SPIN0 + elapsed * SPIN_RATE;
  uniforms.uSpin.value = spin;
  const set = uniforms.uPlanetY.value;
  globe.position.set(heroOff.x, set + heroOff.y, heroOff.z);
  globe.rotation.set(PLANET_TILT, spin, 0);
  cloudShell.rotation.y = elapsed * 0.006;
  orbits.position.copy(globe.position);
  rings.forEach((r) => {
    const a = elapsed * r.speed + r.phase;
    r.shared.uHead.value = (a / (Math.PI * 2)) % 1;
    r.electron.position.set(Math.cos(a) * ORBIT_R, Math.sin(a) * ORBIT_R, 0);
    r.spark.position.copy(r.electron.position);
  });
  /* the clouds and the Milky Way are painted, and every shader compiled, on the first frames — while the loader is still up */
  if (bandDirty) paintBand();
  if (cloudsDirty) paintClouds();
  if (needsWarm && ready) warmUp();
  dna.rotation.y = elapsed * 0.3 + dnaSpin;
  sweep.position.x = sweepAt === null ? Math.sin(elapsed * 0.6) * 5 : sweepAt + 0.4;
  fx.environmentRotation.x = -0.012 + Math.sin(elapsed * 0.35) * 0.014;
  fx.environmentRotation.y = elapsed * 0.08;
  water.material.uniforms.time.value = elapsed * 0.7;
  const s = applyState(dt);

  const parallax = 1 - ss(HY.outro, 0, 0.6);
  camera.position.set(camPos.x + pointer.x * 0.12 * parallax, camPos.y + pointer.y * 0.08 * parallax, camPos.z);
  camera.lookAt(camLook);


  /* the orbits and the helix know which of their parts face the camera */
  ringShared.uCenter.value.copy(globe.position);
  ringShared.uToCam.value.subVectors(camera.position, ringShared.uCenter.value).normalize();
  dnaShared.uCenter.value.copy(dnaRig.position);
  dnaShared.uToCam.value.subVectors(camera.position, dnaRig.position).normalize();
  if (orbits.visible) {
    rings.forEach((r) => {
      r.electron.getWorldPosition(_e);
      const f = _e.sub(ringShared.uCenter.value).dot(ringShared.uToCam.value) / ringShared.uRadius.value;
      const o = ringsIn * (0.2 + 0.8 * ss(f, -0.4, 0.4));
      r.electron.material.opacity = o;
      r.spark.material.opacity = o * 0.7;
    });
  }

  /* the galaxy's light on its way to becoming the sun: a curve on screen from the galaxy's centre to the sun's place,
     drawn a fixed distance in front of the camera so its size on screen stays steady */
  if (sunLight.on) {
    const k = sunLight.k;
    _ndcA.set(0, 0, 0).project(camera);
    _ndcB.copy(camera.position).addScaledVector(sunDir, 500).project(camera);
    const cx = (_ndcA.x + _ndcB.x) / 2, cy = Math.max(_ndcA.y, _ndcB.y) + 0.22;   /* a gentle rise, then down to the horizon */
    const u = 1 - k;
    _ndcP.set(u * u * _ndcA.x + 2 * u * k * cx + k * k * _ndcB.x, u * u * _ndcA.y + 2 * u * k * cy + k * k * _ndcB.y, 0.5).unproject(camera);
    _ndcP.sub(camera.position).normalize();
    core.position.copy(camera.position).addScaledVector(_ndcP, 12);
    core.scale.setScalar(12 * 2 * Math.tan(THREE.MathUtils.lerp(0.09, 0.075, k)));
    core.material.color.setRGB(1, 1, 1).lerp(SUN_TINT, ss(k, 0.3, 1));
  }

  /* the sun's glare, wherever the sun is on screen */
  if (stage.visible) {
    _sunNdc.copy(camera.position).addScaledVector(sunDir, 500).project(camera);
    const on = _sunNdc.z < 1 ? 1 - ss(Math.max(Math.abs(_sunNdc.x), Math.abs(_sunNdc.y)), 1.05, 1.5) : 0;
    glareMat.uniforms.uSun.value.set(_sunNdc.x, _sunNdc.y);
    glareMat.uniforms.uStrength.value = s.stageIn * s.sunDisc * (1 - s.night) * on;
    glare.visible = glareMat.uniforms.uStrength.value > 0.003;
  }

  if (phone.visible) {
    const rest = stacked ? -0.22 : -0.42;
    phone.rotation.y = rest + (1 - s.pin) * -0.45 + pointer.x * 0.34 + Math.sin(elapsed * 0.6) * 0.03;   /* it rises facing us */
    phone.rotation.x = 0.06 - pointer.y * 0.22 + Math.sin(elapsed * 0.8) * 0.015;
    phone.rotation.z = Math.sin(elapsed * 0.6) * 0.012;
    phone.position.y += Math.sin(elapsed * 0.9) * 0.02 * s.pin;
    if (fading) {
      screenMat.uniforms.uMix.value = Math.min(1, screenMat.uniforms.uMix.value + dt / 0.5);
      if (screenMat.uniforms.uMix.value >= 1) { screenMat.uniforms.tA.value = screenMat.uniforms.tB.value; screenMat.uniforms.uMix.value = 0; fading = false; }
    }
  }

  renderer.clear();
  /* nothing behind the opaque sky, nor anything after the chrome has gone, needs drawing */
  const fxHidden = stageNow > 0.996 || HY.outro > 0.985;
  if (!fxHidden) { if (composer) composer.render(); else renderer.render(fx, camera); }
  if (stage.visible || phone.visible) { renderer.clearDepth(); renderer.render(front, camera); }

  if (!ready) {
    ready = true;
    html.classList.add('gl-ready');
    window.dispatchEvent(new CustomEvent('scene:ready'));
    setTimeout(buildLater, 60);
  }
}
frame();
