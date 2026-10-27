/* ==========================================================================
   HYAICO — Just Cooked phone (Three.js)
   A modelled handset: extruded titanium body with rounded corners, black
   bezel, glass screen textured with the real app UI cropped out of
   assets/MainHero.png, side buttons and a rear camera module. It turns to
   face the viewer as the section scrolls in, follows the pointer, and can
   be dragged to rotate. Initialises lazily when the section approaches.
   ========================================================================== */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const canvas = document.getElementById('phoneScene');
const stage = document.getElementById('phoneStage');
if (canvas && stage) {
  const start = () => init().catch(() => stage.classList.add('is-fallback'));
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) { io.disconnect(); start(); }
    }, { rootMargin: '900px 0px' });
    io.observe(stage);
  } else start();
}

/* Measured from the mockup image: screen rectangle inside the 1320x2868 frame. */
const IMG = { w: 1320, h: 2868, left: 68, right: 1253, top: 169, bottom: 2738, bodyL: 24, bodyR: 1297, bodyT: 120, bodyB: 2787, bodyRadius: 234 };

function roundedRect(w, h, r) {
  const s = new THREE.Shape();
  const x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.absarc(x + w - r, y + r, r, -Math.PI / 2, 0, false);
  s.lineTo(x + w, y + h - r);
  s.absarc(x + w - r, y + h - r, r, 0, Math.PI / 2, false);
  s.lineTo(x + r, y + h);
  s.absarc(x + r, y + h - r, r, Math.PI / 2, Math.PI, false);
  s.lineTo(x, y + r);
  s.absarc(x + r, y + r, r, Math.PI, Math.PI * 1.5, false);
  return s;
}

/* ShapeGeometry UVs are raw XY; remap them to a region of the texture. */
function mapUVs(geo, w, h, u0, u1, v0, v1) {
  const uv = geo.attributes.uv;
  for (let i = 0; i < uv.count; i++) {
    const x = uv.getX(i) / w + 0.5;
    const y = uv.getY(i) / h + 0.5;
    uv.setXY(i, u0 + x * (u1 - u0), v0 + y * (v1 - v0));
  }
  uv.needsUpdate = true;
}

async function init() {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const coarse = matchMedia('(pointer: coarse)').matches;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
  camera.position.set(0, 0.05, 6.4);

  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();

  scene.add(new THREE.AmbientLight(0xffffff, 0.25));
  const key = new THREE.DirectionalLight(0xffffff, 2.0);
  key.position.set(3, 5, 6);
  scene.add(key);
  const warm = new THREE.PointLight(0xff6a2a, 45, 20, 1.6);
  warm.position.set(-3, -2.5, 3);
  scene.add(warm);
  const rim = new THREE.PointLight(0xffd9c2, 30, 20, 1.6);
  rim.position.set(2.5, 2.5, -3);
  scene.add(rim);

  /* ---------- Texture: the app UI, cropped from the mockup ---------- */
  const tex = await new Promise((resolve, reject) => new THREE.TextureLoader().load('assets/MainHero.png', resolve, undefined, reject));
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;

  /* ---------- Dimensions (body width = 1 unit) ---------- */
  const bodyW = 1, bodyH = (IMG.bodyB - IMG.bodyT) / (IMG.bodyR - IMG.bodyL);
  const px = bodyW / (IMG.bodyR - IMG.bodyL);
  const bodyR = IMG.bodyRadius * px;
  const depth = 0.082;
  const screenW = (IMG.right - IMG.left) * px, screenH = (IMG.bottom - IMG.top) * px;
  const screenR = bodyR - (IMG.left - IMG.bodyL) * px;

  const phone = new THREE.Group();
  scene.add(phone);

  /* Body: titanium band with softly rounded edges */
  const bodyGeo = new THREE.ExtrudeGeometry(roundedRect(bodyW, bodyH, bodyR), {
    depth: depth - 0.024, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.012, bevelSegments: 5, curveSegments: 28,
  });
  bodyGeo.center();
  const bandMat = new THREE.MeshPhysicalMaterial({ color: 0x55555a, metalness: 1, roughness: 0.34, clearcoat: 0.35, clearcoatRoughness: 0.25, envMapIntensity: 1.3 });
  const body = new THREE.Mesh(bodyGeo, bandMat);
  phone.add(body);

  /* Front bezel (black) and back glass (dark, glossy) */
  const faceShape = roundedRect(bodyW - 0.01, bodyH - 0.01, bodyR - 0.005);
  const bezel = new THREE.Mesh(new THREE.ShapeGeometry(faceShape, 28), new THREE.MeshStandardMaterial({ color: 0x050506, roughness: 0.55, metalness: 0.1 }));
  bezel.position.z = depth / 2 + 0.0005;
  phone.add(bezel);
  const back = new THREE.Mesh(new THREE.ShapeGeometry(faceShape, 28), new THREE.MeshPhysicalMaterial({ color: 0x15151a, roughness: 0.28, metalness: 0.2, clearcoat: 1, clearcoatRoughness: 0.08, envMapIntensity: 1 }));
  back.rotation.y = Math.PI;
  back.position.z = -depth / 2 - 0.0005;
  phone.add(back);

  /* Screen: glass with the app UI, lit as a display */
  const screenGeo = new THREE.ShapeGeometry(roundedRect(screenW, screenH, screenR), 28);
  mapUVs(screenGeo, screenW, screenH, IMG.left / IMG.w, IMG.right / IMG.w, 1 - IMG.bottom / IMG.h, 1 - IMG.top / IMG.h);
  const screenMat = new THREE.MeshPhysicalMaterial({
    map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.62,
    roughness: 0.32, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.07, envMapIntensity: 0.75,
  });
  const screen = new THREE.Mesh(screenGeo, screenMat);
  screen.position.z = depth / 2 + 0.0012;
  phone.add(screen);

  /* Side buttons */
  const buttonMat = new THREE.MeshPhysicalMaterial({ color: 0x6a6a70, metalness: 1, roughness: 0.3, envMapIntensity: 1.3 });
  const addButton = (x, y, h) => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.014, h, depth * 0.5), buttonMat);
    b.position.set(x, y, 0);
    phone.add(b);
  };
  addButton(bodyW / 2 + 0.004, 0.34, 0.24);   // power
  addButton(-bodyW / 2 - 0.004, 0.62, 0.08);  // action
  addButton(-bodyW / 2 - 0.004, 0.42, 0.16);  // volume up
  addButton(-bodyW / 2 - 0.004, 0.22, 0.16);  // volume down

  /* Rear camera module */
  const camGroup = new THREE.Group();
  camGroup.position.set(0.25, 0.68, -depth / 2);
  camGroup.rotation.y = Math.PI;
  const plateau = new THREE.Mesh(new THREE.ExtrudeGeometry(roundedRect(0.4, 0.4, 0.1), { depth: 0.028, bevelEnabled: true, bevelThickness: 0.006, bevelSize: 0.006, bevelSegments: 3, curveSegments: 20 }), bandMat);
  camGroup.add(plateau);
  const lensMat = new THREE.MeshPhysicalMaterial({ color: 0x0a0a10, roughness: 0.1, metalness: 0.4, clearcoat: 1, clearcoatRoughness: 0.03 });
  const innerMat = new THREE.MeshPhysicalMaterial({ color: 0x1c2b4a, roughness: 0.05, metalness: 0.6, clearcoat: 1, iridescence: 0.6 });
  [[-0.1, 0.1], [-0.1, -0.1], [0.1, 0]].forEach(([x, y]) => {
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.03, 40), buttonMat);
    ring.rotation.x = Math.PI / 2; ring.position.set(x, y, 0.04);
    const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.012, 40), lensMat);
    lens.rotation.x = Math.PI / 2; lens.position.set(x, y, 0.056);
    const inner = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.006, 32), innerMat);
    inner.rotation.x = Math.PI / 2; inner.position.set(x, y, 0.064);
    camGroup.add(ring, lens, inner);
  });
  const flash = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.008, 24), new THREE.MeshStandardMaterial({ color: 0xfff1d6, emissive: 0xfff1d6, emissiveIntensity: 0.6 }));
  flash.rotation.x = Math.PI / 2; flash.position.set(0.1, 0.12, 0.034);
  camGroup.add(flash);
  phone.add(camGroup);

  /* Soft floating embers */
  const emberCount = 70;
  const ep = new Float32Array(emberCount * 3);
  for (let i = 0; i < emberCount; i++) {
    ep[i * 3] = (Math.random() - 0.5) * 4.5;
    ep[i * 3 + 1] = (Math.random() - 0.5) * 4.5;
    ep[i * 3 + 2] = (Math.random() - 0.5) * 2 - 0.5;
  }
  const emberGeo = new THREE.BufferGeometry();
  emberGeo.setAttribute('position', new THREE.BufferAttribute(ep, 3));
  const embers = new THREE.Points(emberGeo, new THREE.PointsMaterial({ color: 0xff8a4d, size: 0.028, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false }));
  scene.add(embers);

  /* ---------- Sizing ---------- */
  function resize() {
    const w = canvas.clientWidth || 1, h = canvas.clientHeight || 1;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, coarse ? 1.5 : 2));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    const fitH = 2 * Math.tan(THREE.MathUtils.degToRad(15)) * 6.4;
    const scale = Math.min((fitH * 0.82) / bodyH, (fitH * camera.aspect * 0.62) / bodyW);
    phone.scale.setScalar(scale);
  }
  if ('ResizeObserver' in window) new ResizeObserver(resize).observe(canvas);
  window.addEventListener('resize', resize);
  resize();

  /* ---------- Interaction: scroll turn-in, pointer tilt, drag to rotate ---------- */
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  stage.addEventListener('pointermove', (e) => {
    if (dragging) return;
    const r = stage.getBoundingClientRect();
    pointer.tx = ((e.clientX - r.left) / r.width - 0.5) * 2;
    pointer.ty = -((e.clientY - r.top) / r.height - 0.5) * 2;
  });
  stage.addEventListener('pointerleave', () => { pointer.tx = 0; pointer.ty = 0; });

  let dragging = false, dragX = 0, dragRot = 0, dragVel = 0, lastX = 0, lastT = 0;
  canvas.addEventListener('pointerdown', (e) => {
    dragging = true; dragX = e.clientX; lastX = e.clientX; lastT = performance.now(); dragVel = 0;
    canvas.setPointerCapture(e.pointerId);
    stage.classList.add('is-dragging');
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const now = performance.now();
    dragRot += (e.clientX - dragX) * 0.012;
    dragVel = (e.clientX - lastX) / Math.max(1, now - lastT) * 12;
    dragX = e.clientX; lastX = e.clientX; lastT = now;
  });
  const endDrag = () => { dragging = false; stage.classList.remove('is-dragging'); };
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);

  let inView = true;
  new IntersectionObserver((entries) => { inView = entries[0].isIntersecting; }, { threshold: 0 }).observe(canvas);
  let pageVisible = !document.hidden;
  document.addEventListener('visibilitychange', () => { pageVisible = !document.hidden; });

  const clock = new THREE.Clock();
  let elapsed = 0;
  function frame() {
    requestAnimationFrame(frame);
    const dt = Math.min(clock.getDelta(), 0.1);
    if (!inView || !pageVisible) return;
    elapsed += dt;

    const ease = 1 - Math.pow(0.001, dt);
    pointer.x += (pointer.tx - pointer.x) * ease * 0.5;
    pointer.y += (pointer.ty - pointer.y) * ease * 0.5;

    /* Scroll progress: 0 when the stage enters from below, 1 once it's centred */
    const r = canvas.getBoundingClientRect();
    const vh = window.innerHeight || 1;
    const t = THREE.MathUtils.clamp((vh - r.top) / (vh * 0.55 + r.height * 0.5), 0, 1);
    const turn = reduced ? 0 : (1 - Math.pow(1 - t, 3)) * -2.4 + 2.4; // 2.4 rad -> 0

    if (!dragging) {
      dragRot += dragVel * dt;
      dragVel *= Math.pow(0.08, dt);
      dragRot += (0 - dragRot) * (1 - Math.pow(0.35, dt)) * (Math.abs(dragVel) < 0.05 ? 1 : 0);
    }

    phone.rotation.y = -turn + pointer.x * 0.35 + dragRot + (reduced ? 0 : Math.sin(elapsed * 0.6) * 0.06);
    phone.rotation.x = pointer.y * -0.22 + (reduced ? 0 : Math.sin(elapsed * 0.8) * 0.03);
    phone.rotation.z = -0.03 + pointer.x * 0.03;
    phone.position.y = reduced ? 0 : Math.sin(elapsed * 0.9) * 0.05;
    embers.rotation.y = elapsed * 0.05;
    embers.position.y = Math.sin(elapsed * 0.3) * 0.2;

    renderer.render(scene, camera);
    if (!canvas.classList.contains('is-ready')) canvas.classList.add('is-ready');
  }
  frame();
}
