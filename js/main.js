/* ==========================================================================
   HYAICO — Interactions
   The loader (a laser-scanned chrome wordmark over a drifting starfield),
   the hand-over, smooth scroll, the pinned scroll story with typed titles,
   the ending, cursor, nav.
   ========================================================================== */
(() => {
  'use strict';

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(pointer: fine)').matches;
  const hasGsap = typeof gsap !== 'undefined';
  const hasST = hasGsap && typeof ScrollTrigger !== 'undefined';
  const body = document.body;
  const html = document.documentElement;
  const HY = (window.HY = window.HY || { progress: 0, outro: 0 });
  const STORY_LEN = '+=900%';
  const TYPE_SPEED = 0.045;   // seconds per character: typing always runs at this pace, whatever the scroll does

  if (hasST) gsap.registerPlugin(ScrollTrigger);
  if (!hasST) html.classList.add('no-anim');

  /* ------------------------------------------------------------------
     Typewriter: a title's characters appear one by one behind a caret
  ------------------------------------------------------------------ */
  function makeTyper(el) {
    if (!el || !hasGsap || reduced) return null;
    el.setAttribute('aria-label', el.textContent.replace(/\s+/g, ' ').trim());
    const chars = [];
    (function wrap(node) {
      [...node.childNodes].forEach((n) => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          let prevSpace = false;
          for (const ch of n.textContent) {
            const space = /\s/.test(ch);
            if (space && prevSpace) continue;
            prevSpace = space;
            const s = document.createElement('span');
            s.className = 'ch'; s.textContent = space ? ' ' : ch; s.setAttribute('aria-hidden', 'true');
            frag.appendChild(s); chars.push(s);
          }
          n.replaceWith(frag);
        } else if (n.nodeType === 1) wrap(n);
      });
    })(el);
    const caret = document.createElement('span');
    caret.className = 'caret'; caret.setAttribute('aria-hidden', 'true');
    el.appendChild(caret);
    let shown = chars.length, tween = null;
    function setShown(n) {
      for (let i = Math.min(n, shown); i < Math.max(n, shown); i++) chars[i].style.visibility = i < n ? 'visible' : 'hidden';
      shown = n;
    }
    function place(n) {
      const ref = chars[Math.max(0, n - 1)];
      if (!ref) return;
      const r = ref.getBoundingClientRect(), t = el.getBoundingClientRect();
      const x = (n > 0 ? r.right : r.left) - t.left;
      caret.style.transform = `translate(${x}px, ${r.top - t.top + r.height * 0.14}px)`;
      caret.style.height = `${r.height * 0.74}px`;
    }
    setShown(0);
    return {
      length: chars.length,
      play(delay = 0, onDone) {
        if (tween) tween.kill();
        setShown(0); place(0);
        caret.className = 'caret is-on is-typing';
        const st = { n: 0 };
        tween = gsap.to(st, {
          n: chars.length, duration: chars.length * TYPE_SPEED, delay, ease: 'none',
          onUpdate: () => { const n = Math.floor(st.n); if (n !== shown) { setShown(n); place(n); } },
          onComplete: () => {
            setShown(chars.length); place(chars.length);
            caret.className = 'caret is-on';
            tween = gsap.delayedCall(2.2, () => { caret.className = 'caret'; });
            if (onDone) onDone();
          },
        });
        return tween;
      },
      reset() { if (tween) tween.kill(); tween = null; setShown(0); caret.className = 'caret'; },
    };
  }

  /* ------------------------------------------------------------------
     Smooth scroll
  ------------------------------------------------------------------ */
  let lenis = null;
  if (!reduced && hasST && typeof Lenis !== 'undefined') {
    lenis = new Lenis({ lerp: 0.08, smoothWheel: true, wheelMultiplier: 0.9 });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    lenis.stop();
  }
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const el = document.querySelector(a.getAttribute('href'));
      if (!el) return;
      e.preventDefault();
      if (lenis) lenis.scrollTo(el, { duration: 1.6, easing: (t) => 1 - Math.pow(1 - t, 4) });
      else el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
    });
  });

  /* ------------------------------------------------------------------
     Nav
  ------------------------------------------------------------------ */
  const nav = document.getElementById('nav');
  let lastY = 0;
  function onScrollNav(y) {
    nav.classList.toggle('is-scrolled', y > 24);
    if (y > 400 && y > lastY + 4) nav.classList.add('is-hidden');
    else if (y < lastY - 4 || y < 400) nav.classList.remove('is-hidden');
    lastY = y;
  }
  if (lenis) lenis.on('scroll', (e) => onScrollNav(e.scroll));
  else window.addEventListener('scroll', () => onScrollNav(window.scrollY), { passive: true });

  const year = document.getElementById('year');
  if (year) year.textContent = String(new Date().getFullYear());

  const heroText = document.getElementById('heroText');
  const scrollCue = document.getElementById('scrollCue');
  const heroTyper = makeTyper(heroText.querySelector('.title'));

  /* ------------------------------------------------------------------
     The loader's sky: a deep nebula that breathes slowly, and a field of stars drifting toward us. At the hand-over
     the stars rush past — we arrive at the Earth.
  ------------------------------------------------------------------ */
  function loaderSky(canvas) {
    if (!canvas || !canvas.getContext) return null;
    const ctx = canvas.getContext('2d', { alpha: false });
    const N = innerWidth < 700 ? 240 : 480;
    const rnd = (a, b) => a + Math.random() * (b - a);
    let w = 0, h = 0, dpr = 1, neb = null, speed = 1, raf = 0, last = performance.now(), t = 0;
    const stars = Array.from({ length: N }, () => ({ x: rnd(-1, 1), y: rnd(-1, 1), z: rnd(0.08, 1), tw: rnd(0, 6.28), s: Math.random() }));
    function nebula() {
      const c = document.createElement('canvas'); c.width = Math.ceil(w * dpr); c.height = Math.ceil(h * dpr);
      const x = c.getContext('2d'); x.scale(dpr, dpr);
      const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#03040b'); g.addColorStop(1, '#070a1c');
      x.fillStyle = g; x.fillRect(0, 0, w, h);
      const m = Math.max(w, h);
      const blob = (cx, cy, r, rgb, a) => {
        const rg = x.createRadialGradient(cx, cy, 0, cx, cy, r);
        rg.addColorStop(0, `rgba(${rgb},${a})`); rg.addColorStop(0.45, `rgba(${rgb},${a * 0.38})`); rg.addColorStop(1, `rgba(${rgb},0)`);
        x.fillStyle = rg; x.fillRect(0, 0, w, h);
      };
      blob(w * 0.18, h * 0.82, m * 0.62, '45,107,255', 0.2);
      blob(w * 0.84, h * 0.16, m * 0.56, '124,92,255', 0.18);
      blob(w * 0.52, h * 0.5, m * 0.3, '110,200,255', 0.06);
      blob(w * 0.95, h * 0.95, m * 0.42, '190,80,160', 0.07);
      const v = x.createRadialGradient(w / 2, h / 2, m * 0.22, w / 2, h / 2, m * 0.78);
      v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.6)');
      x.fillStyle = v; x.fillRect(0, 0, w, h);
      return c;
    }
    function size() {
      dpr = Math.min(devicePixelRatio || 1, 1.5); w = innerWidth; h = innerHeight;
      canvas.width = Math.ceil(w * dpr); canvas.height = Math.ceil(h * dpr);
      neb = nebula();
    }
    function draw(now) {
      raf = requestAnimationFrame(draw);
      const dt = Math.min(0.05, (now - last) / 1000); last = now; t += dt;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalCompositeOperation = 'source-over';
      const k = 1.05 + Math.sin(t * 0.18) * 0.02, ox = Math.sin(t * 0.11) * 14 * dpr, oy = Math.cos(t * 0.09) * 9 * dpr;
      ctx.drawImage(neb, -canvas.width * (k - 1) / 2 + ox, -canvas.height * (k - 1) / 2 + oy, canvas.width * k, canvas.height * k);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.globalCompositeOperation = 'lighter';
      const f = Math.max(w, h) * 0.5, cx = w / 2, cy = h / 2;
      for (const st of stars) {
        const pz = st.z;
        st.z -= dt * 0.04 * speed;
        const x = cx + (st.x / st.z) * f, y = cy + (st.y / st.z) * f;
        if (st.z <= 0.04 || x < -30 || x > w + 30 || y < -30 || y > h + 30) { st.x = rnd(-1, 1); st.y = rnd(-1, 1); st.z = 1; continue; }
        const near = 1 - st.z;
        const a = Math.min(1, near * 1.5) * (0.55 + 0.45 * Math.sin(t * 2 + st.tw));
        const r = 0.3 + near * 1.4 * (0.6 + st.s * 0.6);
        if (speed > 2.2) {
          ctx.strokeStyle = `rgba(222,236,255,${a})`; ctx.lineWidth = r * 1.2;
          ctx.beginPath(); ctx.moveTo(cx + (st.x / pz) * f, cy + (st.y / pz) * f); ctx.lineTo(x, y); ctx.stroke();
        } else {
          ctx.fillStyle = `rgba(226,238,255,${a})`;
          ctx.beginPath(); ctx.arc(x, y, r, 0, 6.2832); ctx.fill();
        }
      }
    }
    size();
    addEventListener('resize', size);
    raf = requestAnimationFrame(draw);
    return {
      get speed() { return speed; }, set speed(v) { speed = v; },
      stop() { cancelAnimationFrame(raf); removeEventListener('resize', size); },
    };
  }

  /* ------------------------------------------------------------------
     Loader
  ------------------------------------------------------------------ */
  const loader = document.getElementById('loader');
  let sky = null;

  if (!hasGsap || reduced || !loader) {
    if (loader) loader.remove();
    body.classList.remove('is-loading');
    if (lenis) lenis.start();
    nav.classList.add('is-visible');
    window.dispatchEvent(new CustomEvent('scene:intro'));
    initStory();
  } else {
    body.classList.add('hero-intro');
    sky = loaderSky(document.getElementById('loaderSky'));
    const logo = loader.querySelector('.loader__logo');
    const line = loader.querySelector('.loader__line span');
    const head = loader.querySelector('.loader__line i');
    const count = loader.querySelector('[data-loader-count]');
    const state = { n: 0 };

    gsap.set(logo, { '--reveal': '-4%', '--shine': '140%' });
    const boot = gsap.timeline();
    boot.fromTo('.loader__inner', { opacity: 0, scale: 0.97 }, { opacity: 1, scale: 1, duration: 0.6, ease: 'power2.out' }, 0)
      .to(['.loader__beam', '.loader__flare'], { opacity: 1, duration: 0.25 }, 0.1)
      .to(logo, { '--reveal': '104%', duration: 1.6, ease: 'power2.inOut' }, 0.2)
      .to(['.loader__beam', '.loader__flare'], { opacity: 0, duration: 0.35 }, 1.7)
      .fromTo('.loader__glow', { opacity: 0 }, { opacity: 0.7, duration: 0.8, ease: 'sine.inOut', yoyo: true, repeat: 1 }, 1.7)
      .to(logo, { '--shine': '-40%', duration: 1.2, ease: 'power2.inOut' }, 1.8)
      .to('.loader__meta', { opacity: 1, duration: 0.5 }, 0.35)
      .to(state, {
        n: 100, duration: 2.5, ease: 'power2.inOut',
        onUpdate() { count.textContent = String(Math.round(state.n)); line.style.transform = `scaleX(${state.n / 100})`; head.style.left = `${state.n}%`; },
      }, 0.25);

    const loaded = new Promise((r) => (document.readyState === 'complete' ? r() : window.addEventListener('load', r, { once: true })));
    const fonts = document.fonts ? document.fonts.ready.catch(() => {}) : Promise.resolve();
    const timeout = new Promise((r) => setTimeout(r, 5000));
    Promise.all([boot.then(), Promise.race([Promise.all([loaded, fonts]), timeout])]).then(handOver);
  }

  /* While the veil still covers everything, show the later text beats for a couple of frames so the browser paints
     them now (the logotype, the large type, the buttons) instead of the first time they appear mid-scroll */
  function prepaint() {
    const els = ['jcText', 'helixText', 'galaxyText'].map((id) => document.getElementById(id)).filter(Boolean);
    const typed = [...document.querySelectorAll('.story__text .ch')];
    els.forEach((el) => { el.style.opacity = '1'; });
    typed.forEach((c) => { c.dataset.v = c.style.visibility; c.style.visibility = 'visible'; });
    requestAnimationFrame(() => requestAnimationFrame(() => {
      els.forEach((el) => { el.style.opacity = ''; });
      typed.forEach((c) => { c.style.visibility = c.dataset.v; });
    }));
  }

  /* The hand-over: the stars rush past, the logo lifts away, the veil clears — and the Earth is already rising */
  function handOver() {
    body.classList.remove('is-loading');
    prepaint();
    const mark = document.getElementById('loaderMark');
    const tl = gsap.timeline();
    tl.to('.loader__meta', { opacity: 0, duration: 0.3, ease: 'power2.in' }, 0)
      .to('.loader__glow', { opacity: 0.85, duration: 0.5, ease: 'power2.in' }, 0.1)
      .call(() => { window.dispatchEvent(new CustomEvent('scene:intro')); nav.classList.add('is-visible'); }, null, 0.5)
      .to([mark, '.loader__glow'], { scale: 1.12, opacity: 0, duration: 0.9, ease: 'power3.in' }, 0.5)
      .to(sky || {}, { speed: 7, duration: 1.2, ease: 'power2.in' }, 0.4)
      .to(['.loader__sky', '.loader__veil'], { opacity: 0, duration: 1.1, ease: 'power2.inOut' }, 0.75)
      .add(heroIntro(), 1.3)
      .call(() => { if (sky) sky.stop(); loader.remove(); if (lenis) lenis.start(); initStory(); }, null, 2.3);
  }

  function heroIntro() {
    const tl = gsap.timeline();
    if (heroTyper) tl.call(() => heroTyper.play(), null, 0.15);
    else tl.from(heroText.querySelector('.title'), { opacity: 0, y: 40, duration: 1.2, ease: 'power4.out' }, 0.1);
    tl.to(scrollCue, { opacity: 1, duration: 1 }, 1.2)
      .call(() => body.classList.remove('hero-intro'));
    return tl;
  }

  /* ------------------------------------------------------------------
     The scroll story
  ------------------------------------------------------------------ */
  let storyInit = false;
  function initStory() {
    if (storyInit || !hasST) return;
    storyInit = true;

    const helix = document.getElementById('helixText');
    const galaxy = document.getElementById('galaxyText');
    const jc = document.getElementById('jcText');
    const gone = { opacity: 0, y: -50 };

    /* Just Cooked arrives on its own clock once the beat is reached: the panel, the logotype, the tagline typed out,
       then the store buttons */
    const panel = jc.querySelector('.jc');
    const jcLogo = jc.querySelector('.jc__logo');
    const jcTyper = makeTyper(jc.querySelector('.jc__lead'));
    const jcRest = [jc.querySelector('.stores'), jc.querySelector('.jc__link')];
    gsap.set([panel, jcLogo, ...jcRest], { opacity: 0 });
    const jcIntro = {
      play() {
        gsap.killTweensOf([panel, jcLogo, ...jcRest]);
        gsap.fromTo(panel, { opacity: 0, y: 30, scale: 0.98 }, { opacity: 1, y: 0, scale: 1, duration: 0.8, ease: 'power3.out' });
        gsap.fromTo(jcLogo, { opacity: 0, y: 22 }, { opacity: 1, y: 0, duration: 0.7, delay: 0.15, ease: 'power3.out' });
        const typeAt = 0.45;
        if (jcTyper) jcTyper.play(typeAt);
        const after = typeAt + (jcTyper ? jcTyper.length * TYPE_SPEED : 0);
        gsap.fromTo(jcRest, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.6, stagger: 0.1, delay: after, ease: 'power3.out' });
      },
      reset() { gsap.killTweensOf([panel, jcLogo, ...jcRest]); gsap.set([panel, jcLogo, ...jcRest], { opacity: 0 }); if (jcTyper) jcTyper.reset(); },
    };

    /* each titled beat types itself out when it is reached, and leaves upward with the scroll */
    const beats = [
      { from: 0.13, to: 0.27, typer: makeTyper(helix.querySelector('.title')) },
      { from: 0.34, to: 0.47, typer: makeTyper(galaxy.querySelector('.title')) },
      { from: 0.555, to: 0.7, intro: jcIntro },
    ];
    function syncBeats(p) {
      beats.forEach((b) => {
        const inside = p >= b.from && p <= b.to + 0.055;
        if (inside && !b.on) { b.on = true; if (b.typer) b.typer.play(); if (b.intro) b.intro.play(); }
        else if (!inside && b.on) { b.on = false; if (b.typer) b.typer.reset(); if (b.intro) b.intro.reset(); }
      });
    }

    const tl = gsap.timeline({
      onUpdate: () => syncBeats(tl.time()),
      scrollTrigger: {
        id: 'story', trigger: '#story', start: 'top top', end: STORY_LEN, pin: true, scrub: 0.9, anticipatePin: 1,
        onUpdate: (self) => {
          HY.progress = self.progress;
          if (scrollCue) scrollCue.style.opacity = self.progress > 0.02 ? '0' : '';
        },
      },
    });
    /* positions and durations are fractions of the pinned scroll (the timeline is 1 long) */
    tl.to(heroText.querySelector('.title'), { ...gone, duration: 0.07, ease: 'power2.in' }, 0.004);
    [[helix, 0.13, 0.27], [galaxy, 0.34, 0.47]].forEach(([el, enter, leave]) => {
      const title = el.querySelector('.title');
      tl.set(el, { opacity: 1 }, enter)
        .fromTo(title, { y: 30 }, { y: 0, duration: 0.05, ease: 'power2.out' }, enter)
        .to(title, { ...gone, duration: 0.05, ease: 'power2.in' }, leave)
        .set(el, { opacity: 0 }, leave + 0.05);
    });
    tl.set(jc, { opacity: 1 }, 0.55)
      .to(jc, { ...gone, duration: 0.05, ease: 'power2.in' }, 0.7)
      .to({}, { duration: 0.25 });

    /* Progress bar */
    const progress = document.querySelector('.progress span');
    ScrollTrigger.create({ start: 0, end: () => ScrollTrigger.maxScroll(window), onUpdate: (s) => { progress.style.transform = `scaleX(${s.progress})`; } });

    /* Ending: the chrome HYAICO glides down into the footer wordmark, which brightens as it lands; the closing line
       types itself out, then draws its underline */
    ScrollTrigger.create({ trigger: '#outro', start: 'top bottom', end: 'top 20%', scrub: true, onUpdate: (s) => { HY.outro = s.progress; } });
    const wm = document.getElementById('footerWordmark');
    if (wm) gsap.fromTo(wm, { opacity: 0 }, { opacity: 1, ease: 'none', scrollTrigger: { trigger: '#outro', start: 'top 45%', end: 'top 18%', scrub: true } });
    const outroLine = document.querySelector('.outro__line');
    const outroTyper = makeTyper(outroLine);
    gsap.set(outroLine, { opacity: 1 });
    ScrollTrigger.create({
      trigger: '#outro', start: 'top 55%', once: true,
      onEnter: () => {
        if (!outroTyper) { outroLine.classList.add('is-revealed'); return; }
        outroTyper.play(0, () => outroLine.classList.add('is-revealed'));
      },
    });

    ScrollTrigger.refresh();
  }
  window.addEventListener('scene:ready', () => { if (hasST) ScrollTrigger.refresh(); }, { once: true });

  /* ------------------------------------------------------------------
     Magnetic buttons + custom cursor (pointer devices only)
  ------------------------------------------------------------------ */
  if (finePointer && hasGsap && !reduced) {
    document.querySelectorAll('[data-magnetic]').forEach((el) => {
      const xTo = gsap.quickTo(el, 'x', { duration: 0.6, ease: 'power3.out' });
      const yTo = gsap.quickTo(el, 'y', { duration: 0.6, ease: 'power3.out' });
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        xTo((e.clientX - (r.left + r.width / 2)) * 0.28);
        yTo((e.clientY - (r.top + r.height / 2)) * 0.28);
      });
      el.addEventListener('pointerleave', () => { xTo(0); yTo(0); });
    });

    const cursor = document.querySelector('.cursor');
    if (cursor) {
      body.classList.add('has-cursor');
      const dot = cursor.querySelector('.cursor__dot');
      const ring = cursor.querySelector('.cursor__ring');
      let px = -100, py = -100, rx = -100, ry = -100, seen = false;
      cursor.classList.add('is-hidden');
      window.addEventListener('pointermove', (e) => {
        if (e.pointerType && e.pointerType !== 'mouse') return;
        px = e.clientX; py = e.clientY;
        if (!seen) { seen = true; rx = px; ry = py; cursor.classList.remove('is-hidden'); }
        dot.style.transform = `translate3d(${px}px, ${py}px, 0)`;
        cursor.classList.toggle('is-link', !!e.target.closest('a, button, [data-cursor]'));
      }, { passive: true });
      (function follow() {
        rx += (px - rx) * 0.42; ry += (py - ry) * 0.42;
        ring.style.transform = `translate3d(${rx}px, ${ry}px, 0)`;
        requestAnimationFrame(follow);
      })();
      document.addEventListener('pointerleave', () => cursor.classList.add('is-hidden'));
      document.addEventListener('pointerenter', () => { if (seen) cursor.classList.remove('is-hidden'); });
    }
  }
})();
