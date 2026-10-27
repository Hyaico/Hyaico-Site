/* ==========================================================================
   HYAICO — Hero scene (Three.js)
   The HYAICO wordmark, extruded from the real logo path in polished chrome,
   floating in front of a glass core with orbital rings, a wireframe shell,
   a holographic grid floor and a particle field. Letters assemble on intro,
   a light sweep travels across the chrome, and everything reacts to the
   pointer and to scroll. Degrades gracefully.
   ========================================================================== */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { SVGLoader } from 'three/addons/loaders/SVGLoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const canvas = document.getElementById('scene');
const html = document.documentElement;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const mobileQuery = matchMedia('(max-width: 860px)');
const coarse = matchMedia('(pointer: coarse)').matches;

let isMobile = mobileQuery.matches;
let lowQuality = coarse;

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: !coarse, alpha: true, powerPreference: 'high-performance' });
} catch (err) {
  html.classList.add('no-webgl');
  throw err;
}

renderer.setClearColor(0x000000, 0);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.95;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
camera.position.set(0, 0, 8.2);

/* ---------- Environment ---------- */
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
pmrem.dispose();

/* ---------- Lights ---------- */
scene.add(new THREE.AmbientLight(0xffffff, 0.12));
const sun = new THREE.DirectionalLight(0xffffff, 1.6);
sun.position.set(2, 5, 6);
scene.add(sun);
const violetLight = new THREE.PointLight(0x7c5cff, 70, 30, 1.6);
violetLight.position.set(-5, 2.5, 3);
scene.add(violetLight);
const cyanLight = new THREE.PointLight(0x45e3ff, 60, 30, 1.6);
cyanLight.position.set(5, -1.5, 3);
scene.add(cyanLight);
const sweep = new THREE.PointLight(0xffffff, 32, 10, 1.8); // travels across the chrome
sweep.position.set(-6, 2, 2.2);
scene.add(sweep);

/* ---------- Root group (positioned per layout) ---------- */
const root = new THREE.Group();
scene.add(root);

/* ---------- Glass core, rings, satellites, shell ---------- */
const core = new THREE.Group();
core.position.set(0, 0, -1.15);
root.add(core);

const glassMat = new THREE.MeshPhysicalMaterial({
  color: 0xf4f2ff, transmission: 1, thickness: 1.2, roughness: 0.08, ior: 1.45,
  iridescence: 0.55, iridescenceIOR: 1.3, iridescenceThicknessRange: [100, 520],
  clearcoat: 1, clearcoatRoughness: 0.08, envMapIntensity: 0.5, specularIntensity: 0.55,
  attenuationColor: new THREE.Color(0x6a5cff), attenuationDistance: 1.5,
});
const orb = new THREE.Mesh(new THREE.SphereGeometry(1.15, isMobile ? 48 : 96, isMobile ? 32 : 64), glassMat);
core.add(orb);

const shell = new THREE.LineSegments(
  new THREE.WireframeGeometry(new THREE.IcosahedronGeometry(1.78, 2)),
  new THREE.LineBasicMaterial({ color: 0x45e3ff, transparent: true, opacity: 0.1, blending: THREE.AdditiveBlending, depthWrite: false })
);
core.add(shell);

const ringMat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, metalness: 1, roughness: 0.25, envMapIntensity: 1.2, emissive: 0x7c5cff, emissiveIntensity: 0.3 });
const ringA = new THREE.Mesh(new THREE.TorusGeometry(2.25, 0.011, 12, 240), ringMat);
ringA.rotation.set(1.3, 0.3, 0);
const ringB = new THREE.Mesh(new THREE.TorusGeometry(2.65, 0.008, 12, 240), ringMat.clone());
ringB.material.emissive = new THREE.Color(0x45e3ff);
ringB.rotation.set(-1.1, 0.55, 0.35);
core.add(ringA, ringB);

const satGeo = new THREE.SphereGeometry(0.1, 32, 24);
const satellites = [];
for (let i = 0; i < 3; i++) {
  const m = new THREE.Mesh(satGeo, glassMat.clone());
  m.material.attenuationColor = new THREE.Color(i === 1 ? 0x45e3ff : 0xffffff);
  m.userData = { radius: i === 0 ? 2.25 : 2.65, speed: 0.22 + i * 0.07, phase: (i / 3) * Math.PI * 2, ring: i === 0 ? ringA : ringB };
  core.add(m);
  satellites.push(m);
}

/* ---------- Holographic grid floor (custom shader) ---------- */
const gridMat = new THREE.ShaderMaterial({
  transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  uniforms: { uTime: { value: 0 }, uColorA: { value: new THREE.Color(0x45e3ff) }, uColorB: { value: new THREE.Color(0x7c5cff) } },
  vertexShader: `
    varying vec2 vUv; varying vec3 vPos;
    void main(){ vUv = uv; vPos = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `
    uniform float uTime; uniform vec3 uColorA; uniform vec3 uColorB;
    varying vec2 vUv; varying vec3 vPos;
    float gridLine(vec2 p, float w){ vec2 g = abs(fract(p - 0.5) - 0.5) / fwidth(p); float l = min(g.x, g.y); return 1.0 - smoothstep(0.0, w, l); }
    void main(){
      vec2 p = vPos.xy * 1.6;
      float minor = gridLine(p, 1.2) * 0.35;
      float major = gridLine(p * 0.25, 1.4) * 0.9;
      float d = length(vPos.xy) / 7.0;
      float fade = smoothstep(1.0, 0.15, d);
      float pulse = smoothstep(0.08, 0.0, abs(fract(uTime * 0.09) * 1.25 - d)) * 0.9;
      vec3 col = mix(uColorA, uColorB, clamp(vPos.x / 10.0 + 0.5, 0.0, 1.0));
      float a = (minor + major) * fade * 0.55 + pulse * fade * 0.5;
      gl_FragColor = vec4(col, a);
    }`,
});
const grid = new THREE.Mesh(new THREE.PlaneGeometry(26, 26, 1, 1), gridMat);
grid.rotation.x = -Math.PI / 2;
grid.position.set(0, -1.05, -1.5);
root.add(grid);

/* ---------- Particle field ---------- */
const particleCount = isMobile ? 450 : 1300;
const positions = new Float32Array(particleCount * 3);
const colors = new Float32Array(particleCount * 3);
const cA = new THREE.Color(0x7c5cff), cB = new THREE.Color(0x45e3ff), cW = new THREE.Color(0xffffff);
for (let i = 0; i < particleCount; i++) {
  const r = 3.2 + Math.random() * 5;
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(2 * Math.random() - 1);
  positions[i * 3] = r * Math.sin(phi) * Math.cos(theta) * 1.3;
  positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta) * 0.7;
  positions[i * 3 + 2] = r * Math.cos(phi) * 0.6 - 1.5;
  const t = Math.random();
  const c = t < 0.33 ? cA : t < 0.66 ? cB : cW;
  colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b;
}
const pGeo = new THREE.BufferGeometry();
pGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
pGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
const particles = new THREE.Points(pGeo, new THREE.PointsMaterial({
  size: 0.026, vertexColors: true, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true,
}));
scene.add(particles);

/* ---------- The wordmark: HYAICO extruded from the logo path ---------- */
const word = new THREE.Group();
root.add(word);
const letters = [];
const WORD_W = 5.6; // world units
const chromeMat = new THREE.MeshPhysicalMaterial({
  color: 0xf1f1fb, metalness: 1, roughness: 0.14,
  iridescence: 0.3, iridescenceIOR: 1.4, iridescenceThicknessRange: [120, 500],
  clearcoat: 1, clearcoatRoughness: 0.1, envMapIntensity: 1.9,
});
let introRequested = reduced;
let lettersReady = false;

new SVGLoader().load('assets/HyaicoWhite.svg', (data) => {
  const s = WORD_W / 619;
  const depth = 20; // svg units, before scaling
  data.paths.forEach((path) => {
    SVGLoader.createShapes(path).forEach((shape) => {
      const geo = new THREE.ExtrudeGeometry(shape, {
        depth, bevelEnabled: true, bevelThickness: 2.4, bevelSize: 2, bevelSegments: 5, curveSegments: 14,
      });
      geo.translate(-309.5, -50.3, -depth / 2);
      geo.scale(s, s, s);
      geo.computeBoundingBox();
      const cx = (geo.boundingBox.min.x + geo.boundingBox.max.x) / 2;
      geo.translate(-cx, 0, 0);
      const mesh = new THREE.Mesh(geo, chromeMat);
      mesh.rotation.x = Math.PI; // the SVG y axis points down
      mesh.userData.home = new THREE.Vector3(cx, 0, 0);
      mesh.position.copy(mesh.userData.home);
      word.add(mesh);
      letters.push(mesh);
    });
  });
  letters.sort((a, b) => a.userData.home.x - b.userData.home.x);
  lettersReady = true;
  if (introRequested) runIntro(); else scatter();
}, undefined, () => { /* without the logo the scene still shows the core */ });

function scatter() {
  letters.forEach((m, i) => {
    m.position.set(m.userData.home.x + (i % 2 ? 1 : -1) * (0.6 + i * 0.25), -2.2 - i * 0.3, 2.5 + i * 0.4);
    m.rotation.set(Math.PI + 1.2, -0.8 + i * 0.3, 0.4);
    m.scale.setScalar(0.6);
  });
}

function runIntro() {
  if (!lettersReady) return;
  const g = window.gsap;
  if (reduced || !g) {
    letters.forEach((m) => { m.position.copy(m.userData.home); m.rotation.set(Math.PI, 0, 0); m.scale.setScalar(1); });
    return;
  }
  scatter();
  letters.forEach((m, i) => {
    g.to(m.position, { x: m.userData.home.x, y: 0, z: 0, duration: 1.7, delay: 0.1 + i * 0.09, ease: 'expo.out' });
    g.to(m.rotation, { x: Math.PI, y: 0, z: 0, duration: 1.7, delay: 0.1 + i * 0.09, ease: 'expo.out' });
    g.to(m.scale, { x: 1, y: 1, z: 1, duration: 1.4, delay: 0.1 + i * 0.09, ease: 'expo.out' });
  });
}
window.addEventListener('scene:intro', () => { introRequested = true; runIntro(); }, { once: true });

/* ---------- Post-processing ---------- */
let composer = null;
function buildComposer() {
  const size = renderer.getSize(new THREE.Vector2());
  composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  composer.addPass(new UnrealBloomPass(size, 0.32, 0.55, 0.92));
  composer.addPass(new OutputPass());
}

/* ---------- Layout / resize ----------
   Landscape: wordmark across the upper area above the headline.
   Portrait / phones: smaller system in the top third, copy below. */
function stacked() { return isMobile || camera.aspect < 1.05; }
function visibleWidth() { return 2 * Math.tan(THREE.MathUtils.degToRad(16)) * 8.2 * camera.aspect; }
function baseScale() {
  const fit = (visibleWidth() * (stacked() ? 0.9 : 0.78)) / WORD_W;
  return Math.min(stacked() ? 0.5 : 1, fit);
}
function baseY() { return stacked() ? 1.45 : 1.22; }
function layout() {
  isMobile = mobileQuery.matches;
  root.position.set(0, baseY(), 0);
  root.scale.setScalar(baseScale());
  particles.position.set(0, stacked() ? 0.9 : 0.4, 0);
}

function resize() {
  const w = canvas.clientWidth || window.innerWidth;
  const h = canvas.clientHeight || window.innerHeight;
  const dpr = Math.min(window.devicePixelRatio || 1, lowQuality ? 1.25 : 2);
  renderer.setPixelRatio(dpr);
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  if (composer) composer.setSize(w, h);
  layout();
}
window.addEventListener('resize', resize);
resize();
if (!lowQuality) buildComposer();

/* ---------- Interaction state ---------- */
const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
window.addEventListener('pointermove', (e) => {
  pointer.tx = (e.clientX / window.innerWidth) * 2 - 1;
  pointer.ty = -((e.clientY / window.innerHeight) * 2 - 1);
}, { passive: true });

let scrollP = 0;
function readScroll() { scrollP = Math.min(1, Math.max(0, window.scrollY / (window.innerHeight || 1))); }
window.addEventListener('scroll', readScroll, { passive: true });
readScroll();

/* ---------- Visibility gating ---------- */
let inView = true;
if ('IntersectionObserver' in window) {
  new IntersectionObserver((entries) => { inView = entries[0].isIntersecting; }, { threshold: 0 }).observe(canvas);
}
let pageVisible = !document.hidden;
document.addEventListener('visibilitychange', () => { pageVisible = !document.hidden; });

/* ---------- Adaptive quality + FPS telemetry ---------- */
const frameTimes = [];
let qualityChecked = lowQuality;
let fpsAccum = 0, fpsFrames = 0;
function sampleFrame(dt) {
  fpsAccum += dt; fpsFrames++;
  if (fpsAccum >= 0.5) {
    window.dispatchEvent(new CustomEvent('scene:stats', { detail: { fps: Math.round(fpsFrames / fpsAccum) } }));
    fpsAccum = 0; fpsFrames = 0;
  }
  if (qualityChecked) return;
  if (dt > 0 && dt < 0.5) frameTimes.push(dt);
  if (frameTimes.length >= 90) {
    const avg = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;
    qualityChecked = true;
    if (avg > 0.028) { lowQuality = true; composer = null; resize(); }
  }
}

/* ---------- Render loop ---------- */
const clock = new THREE.Clock();
const satPos = new THREE.Vector3();
let ready = false;
let elapsed = 0;

function frame() {
  requestAnimationFrame(frame);
  const dt = Math.min(clock.getDelta(), 0.1);
  if (!pageVisible || !inView) return;
  elapsed += dt;
  sampleFrame(dt);

  const ease = 1 - Math.pow(0.001, dt);
  pointer.x += (pointer.tx - pointer.x) * ease * 0.6;
  pointer.y += (pointer.ty - pointer.y) * ease * 0.6;

  /* Wordmark: gentle tilt, pointer parallax, scroll tip-away */
  word.rotation.y = pointer.x * 0.28 + Math.sin(elapsed * 0.35) * 0.05;
  word.rotation.x = -0.1 + pointer.y * -0.16 - scrollP * 0.9;
  word.position.y = Math.sin(elapsed * 0.8) * 0.04;
  letters.forEach((m, i) => { if (introRequested && lettersReady) m.position.y = m.position.y * 0.0 + Math.sin(elapsed * 1.1 + i * 0.7) * 0.025 + (m.userData.settleY || 0); });

  /* Light sweep travelling along the chrome */
  sweep.position.x = Math.sin(elapsed * 0.45) * 4.2;
  sweep.position.y = 1.4 + Math.cos(elapsed * 0.3) * 0.5;

  /* Core system */
  orb.rotation.y = -elapsed * 0.08;
  shell.rotation.y = elapsed * 0.06;
  shell.rotation.x = Math.sin(elapsed * 0.2) * 0.3;
  ringA.rotation.z += dt * 0.12;
  ringB.rotation.z -= dt * 0.09;
  ringA.rotation.x = 1.3 + pointer.y * 0.2;
  ringB.rotation.x = -1.1 + pointer.y * 0.15;
  satellites.forEach((m) => {
    const a = elapsed * m.userData.speed + m.userData.phase;
    satPos.set(Math.cos(a) * m.userData.radius, Math.sin(a) * m.userData.radius, 0);
    satPos.applyEuler(m.userData.ring.rotation);
    m.position.copy(satPos);
  });
  gridMat.uniforms.uTime.value = elapsed;
  particles.rotation.y = elapsed * 0.025 + pointer.x * 0.06;
  particles.rotation.x = pointer.y * 0.04;

  root.rotation.y = pointer.x * 0.06;
  root.rotation.x = pointer.y * -0.04;
  root.position.y = baseY() + scrollP * 2.4;
  root.scale.setScalar(baseScale() * (1 - scrollP * 0.25));
  camera.position.x = pointer.x * 0.2;
  camera.position.y = pointer.y * 0.14 - scrollP * 0.6;
  camera.lookAt(0, 0.1, 0);

  if (composer) composer.render(); else renderer.render(scene, camera);

  if (!ready) {
    ready = true;
    canvas.classList.add('is-ready');
    window.dispatchEvent(new CustomEvent('scene:ready'));
  }
}
frame();
