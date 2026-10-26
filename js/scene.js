/* ==========================================================================
   HYAICO — Hero scene (Three.js)
   A refractive glass orb holding a chrome "H" monogram, orbital rings and
   a particle field. Reacts to pointer and scroll. Degrades gracefully.
   ========================================================================== */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
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
  renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: !coarse,
    alpha: true,
    powerPreference: 'high-performance',
  });
} catch (err) {
  html.classList.add('no-webgl');
  throw err;
}

renderer.setClearColor(0x000000, 0);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
camera.position.set(0, 0, 8.2);

/* ---------- Environment ---------- */
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
pmrem.dispose();

/* ---------- Lights (rim colour) ---------- */
scene.add(new THREE.AmbientLight(0xffffff, 0.15));
const sun = new THREE.DirectionalLight(0xffffff, 2.2);
sun.position.set(3, 4, 5);
scene.add(sun);
const violetLight = new THREE.PointLight(0x7c5cff, 60, 30, 1.6);
violetLight.position.set(-4.5, 2.5, 3.5);
scene.add(violetLight);
const cyanLight = new THREE.PointLight(0x45e3ff, 50, 30, 1.6);
cyanLight.position.set(4.5, -2.5, 3);
scene.add(cyanLight);

/* ---------- Root group (positioned per layout) ---------- */
const root = new THREE.Group();
scene.add(root);

/* ---------- "H" monogram, extruded from the wordmark path ---------- */
function buildMonogram() {
  const pts = [
    [0.8125, 1.3125], [20.625, 1.3125], [20.625, 26.8125], [81.375, 26.8125],
    [81.375, 1.3125], [101.25, 1.3125], [101.25, 99], [81.375, 99],
    [81.375, 43.75], [20.625, 43.75], [20.625, 99], [0.8125, 99],
  ];
  const cx = 51.03, cy = 50.16, s = 2.1 / 100;
  const shape = new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2((x - cx) * s, -(y - cy) * s)));
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.62,
    bevelEnabled: true,
    bevelThickness: 0.07,
    bevelSize: 0.06,
    bevelSegments: 6,
    curveSegments: 4,
  });
  geo.center();
  geo.computeVertexNormals();
  const mat = new THREE.MeshPhysicalMaterial({
    color: 0xe9e9f4,
    metalness: 1,
    roughness: 0.16,
    iridescence: 0.55,
    iridescenceIOR: 1.5,
    iridescenceThicknessRange: [120, 480],
    clearcoat: 0.8,
    clearcoatRoughness: 0.18,
    envMapIntensity: 1.6,
  });
  return new THREE.Mesh(geo, mat);
}
const monogram = buildMonogram();
root.add(monogram);

/* ---------- Glass orb ---------- */
const orbGeo = new THREE.SphereGeometry(1.92, isMobile ? 56 : 112, isMobile ? 40 : 80);
const orbMat = new THREE.MeshPhysicalMaterial({
  color: 0xffffff,
  transmission: 1,
  thickness: 1.6,
  roughness: 0.06,
  ior: 1.42,
  iridescence: 0.85,
  iridescenceIOR: 1.3,
  iridescenceThicknessRange: [100, 520],
  clearcoat: 1,
  clearcoatRoughness: 0.06,
  envMapIntensity: 1.3,
  specularIntensity: 1,
  attenuationColor: new THREE.Color(0xa18cff),
  attenuationDistance: 4,
});
const orb = new THREE.Mesh(orbGeo, orbMat);
root.add(orb);

/* ---------- Orbital rings ---------- */
const ringMat = new THREE.MeshPhysicalMaterial({
  color: 0xffffff, metalness: 1, roughness: 0.25, envMapIntensity: 1.2,
  emissive: 0x7c5cff, emissiveIntensity: 0.25,
});
const ringA = new THREE.Mesh(new THREE.TorusGeometry(2.55, 0.012, 12, 220), ringMat);
ringA.rotation.set(1.25, 0.35, 0);
const ringB = new THREE.Mesh(new THREE.TorusGeometry(2.95, 0.008, 12, 220), ringMat.clone());
ringB.material.emissive = new THREE.Color(0x45e3ff);
ringB.rotation.set(-1.05, 0.6, 0.4);
root.add(ringA, ringB);

/* Small glass satellites riding the rings */
const satGeo = new THREE.SphereGeometry(0.11, 32, 24);
const satellites = [];
for (let i = 0; i < 3; i++) {
  const m = new THREE.Mesh(satGeo, orbMat.clone());
  m.material.attenuationColor = new THREE.Color(i === 1 ? 0x45e3ff : 0xffffff);
  m.userData = {
    radius: i === 0 ? 2.55 : 2.95,
    speed: 0.25 + i * 0.07,
    phase: (i / 3) * Math.PI * 2,
    ring: i === 0 ? ringA : ringB,
  };
  root.add(m);
  satellites.push(m);
}

/* ---------- Particle field ---------- */
const particleCount = isMobile ? 500 : 1400;
const positions = new Float32Array(particleCount * 3);
const colors = new Float32Array(particleCount * 3);
const cA = new THREE.Color(0x7c5cff), cB = new THREE.Color(0x45e3ff), cW = new THREE.Color(0xffffff);
for (let i = 0; i < particleCount; i++) {
  const r = 3.4 + Math.random() * 4.6;
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(2 * Math.random() - 1);
  positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
  positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta) * 0.75;
  positions[i * 3 + 2] = r * Math.cos(phi) * 0.6 - 1;
  const t = Math.random();
  const c = t < 0.33 ? cA : t < 0.66 ? cB : cW;
  colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b;
}
const pGeo = new THREE.BufferGeometry();
pGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
pGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
const pMat = new THREE.PointsMaterial({
  size: 0.028, vertexColors: true, transparent: true, opacity: 0.85,
  blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true,
});
const particles = new THREE.Points(pGeo, pMat);
scene.add(particles);

/* ---------- Post-processing ---------- */
let composer = null;
function buildComposer() {
  const size = renderer.getSize(new THREE.Vector2());
  composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  composer.addPass(new UnrealBloomPass(size, 0.42, 0.7, 0.82));
  composer.addPass(new OutputPass());
}

/* ---------- Layout / resize ----------
   Side layout (landscape): orb sits right of the headline column.
   Stacked layout (phones / portrait): orb floats in the top third, copy below. */
function stacked() {
  return isMobile || camera.aspect < 1.05;
}
function baseScale() {
  if (stacked()) return isMobile ? 0.42 : 0.6;
  return camera.aspect > 1.4 ? 0.9 : 0.7;
}
function baseX() {
  if (stacked()) return 0;
  return Math.min(2.4, 1.03 * camera.aspect);
}
function baseY() {
  return stacked() ? 1.4 : 0.15;
}
function layout() {
  isMobile = mobileQuery.matches;
  root.position.set(baseX(), baseY(), 0);
  root.scale.setScalar(baseScale());
  if (stacked()) particles.position.set(0, 0.8, 0);
  else particles.position.set(1.0, 0, 0);
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
function readScroll() {
  const vh = window.innerHeight || 1;
  scrollP = Math.min(1, Math.max(0, window.scrollY / vh));
}
window.addEventListener('scroll', readScroll, { passive: true });
readScroll();

/* ---------- Visibility gating ---------- */
let inView = true;
if ('IntersectionObserver' in window) {
  new IntersectionObserver((entries) => { inView = entries[0].isIntersecting; }, { threshold: 0 }).observe(canvas);
}
let pageVisible = !document.hidden;
document.addEventListener('visibilitychange', () => { pageVisible = !document.hidden; });

/* ---------- Adaptive quality: drop bloom + DPR if the device struggles ---------- */
const frameTimes = [];
let qualityChecked = lowQuality;
function sampleFrame(dt) {
  if (qualityChecked) return;
  if (dt > 0 && dt < 0.5) frameTimes.push(dt);
  if (frameTimes.length >= 90) {
    const avg = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;
    qualityChecked = true;
    if (avg > 0.028) {
      lowQuality = true;
      composer = null;
      resize();
    }
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

  const spin = reduced ? 0.04 : 0.22;
  monogram.rotation.y = elapsed * spin + pointer.x * 0.35 + scrollP * Math.PI * 1.2;
  monogram.rotation.x = Math.sin(elapsed * 0.5) * 0.12 + pointer.y * -0.25 + scrollP * 0.6;
  monogram.position.y = Math.sin(elapsed * 0.9) * 0.06;

  orb.rotation.y = -elapsed * 0.08;
  orb.rotation.z = elapsed * 0.05;

  ringA.rotation.z += dt * 0.12;
  ringB.rotation.z -= dt * 0.09;
  ringA.rotation.x = 1.25 + pointer.y * 0.2;
  ringB.rotation.x = -1.05 + pointer.y * 0.15;

  satellites.forEach((m) => {
    const a = elapsed * m.userData.speed + m.userData.phase;
    satPos.set(Math.cos(a) * m.userData.radius, Math.sin(a) * m.userData.radius, 0);
    satPos.applyEuler(m.userData.ring.rotation);
    m.position.copy(satPos);
  });

  particles.rotation.y = elapsed * 0.03 + pointer.x * 0.08;
  particles.rotation.x = pointer.y * 0.05;

  root.rotation.y = pointer.x * 0.12;
  root.rotation.x = pointer.y * -0.08;

  /* Scroll: the orb drifts up and shrinks as the hero leaves */
  root.position.y = baseY() + scrollP * 2.2;
  root.scale.setScalar(baseScale() * (1 - scrollP * 0.25));
  camera.position.x = pointer.x * 0.25;
  camera.position.y = pointer.y * 0.18 - scrollP * 0.6;
  camera.lookAt(0, 0.1, 0);

  if (composer) composer.render(); else renderer.render(scene, camera);

  if (!ready) {
    ready = true;
    canvas.classList.add('is-ready');
    window.dispatchEvent(new CustomEvent('scene:ready'));
  }
}
frame();
