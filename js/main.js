/* ==========================================================================
   HYAICO — Interactions
   Loader → particle hand-over, smooth scroll, the pinned scroll story
   (text beats, scene rail, scene label), outro, cursor, nav.
   ========================================================================== */
(() => {
  'use strict';

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(pointer: fine)').matches;
  const hasGsap = typeof gsap !== 'undefined';
  const hasST = hasGsap && typeof ScrollTrigger !== 'undefined';
  const hasSplit = hasGsap && typeof SplitText !== 'undefined';
  const hasScramble = hasGsap && typeof ScrambleTextPlugin !== 'undefined';
  const body = document.body;
  const html = document.documentElement;
  const HY = (window.HY = window.HY || { progress: 0 });
  const CHARS = '01<>/\\|=+-_#*';

  if (hasST) gsap.registerPlugin(ScrollTrigger);
  if (hasSplit) gsap.registerPlugin(SplitText);
  if (hasScramble) gsap.registerPlugin(ScrambleTextPlugin);
  if (!hasST) html.classList.add('no-anim');

  function scramble(el, duration = 0.9, text) {
    if (!el || !hasScramble || reduced) { if (el && text) el.textContent = text; return null; }
    const final = text || el.dataset.text || el.textContent;
    el.dataset.text = final;
    return gsap.to(el, { duration, scrambleText: { text: final, chars: CHARS, speed: 0.5, revealDelay: duration * 0.2 } });
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

  /* ------------------------------------------------------------------
     Loader
  ------------------------------------------------------------------ */
  const loader = document.getElementById('loader');
  const heroText = document.getElementById('heroText');
  const scrollCue = document.getElementById('scrollCue');

  if (!hasGsap || reduced || !loader) {
    if (loader) loader.remove();
    body.classList.remove('is-loading');
    if (lenis) lenis.start();
    nav.classList.add('is-visible');
    window.dispatchEvent(new CustomEvent('scene:intro'));
    initStory();
  } else {
    body.classList.add('hero-intro');
    const mark = document.getElementById('loaderMark');
    const beam = loader.querySelector('.loader__beam');
    const line = loader.querySelector('.loader__line span');
    const count = loader.querySelector('[data-loader-count]');
    const state = { n: 0 };

    const boot = gsap.timeline();
    boot.fromTo(mark, { clipPath: 'inset(-20% 100% -20% 0)' }, { clipPath: 'inset(-20% 0% -20% 0)', duration: 1.4, ease: 'power3.inOut' }, 0.15)
      .fromTo(beam, { left: '0%', opacity: 1 }, { left: '100%', duration: 1.4, ease: 'power3.inOut' }, 0.15)
      .to(beam, { opacity: 0, duration: 0.25 }, 1.5)
      .fromTo(mark, { filter: 'drop-shadow(0 0 0px rgba(69,227,255,0))' }, { filter: 'drop-shadow(0 0 28px rgba(69,227,255,0.55))', duration: 1.0, ease: 'power2.out' }, 1.4)
      .to('.loader__meta', { opacity: 1, duration: 0.5 }, 0.3)
      .to(state, {
        n: 100, duration: 2.1, ease: 'power2.inOut',
        onUpdate() { count.textContent = String(Math.round(state.n)); line.style.transform = `scaleX(${state.n / 100})`; },
      }, 0.2);

    const loaded = new Promise((r) => (document.readyState === 'complete' ? r() : window.addEventListener('load', r, { once: true })));
    const fonts = document.fonts ? document.fonts.ready.catch(() => {}) : Promise.resolve();
    const wordmark = new Promise((r) => (html.classList.contains('no-webgl') ? r() : window.addEventListener('scene:wordmark', r, { once: true })));
    const timeout = new Promise((r) => setTimeout(r, 5000));
    Promise.all([boot.then(), Promise.race([Promise.all([loaded, fonts, wordmark]), timeout])]).then(handOver);
  }

  function handOver() {
    body.classList.remove('is-loading');
    const mark = document.getElementById('loaderMark');
    const tl = gsap.timeline();
    tl.to('.loader__meta', { opacity: 0, duration: 0.35, ease: 'power2.in' }, 0)
      .to(loader, { backgroundColor: 'rgba(6,6,10,0)', duration: 1.0, ease: 'power2.inOut' }, 0.1)
      .to(mark, { opacity: 0, filter: 'drop-shadow(0 0 0px rgba(69,227,255,0))', duration: 0.7, ease: 'power2.in' }, 0.55)
      .call(() => { window.dispatchEvent(new CustomEvent('scene:intro')); nav.classList.add('is-visible'); }, null, 1.05)
      .add(heroIntro(), 1.9)
      .call(() => { loader.remove(); if (lenis) lenis.start(); initStory(); }, null, 2.4);
  }

  function heroIntro() {
    const title = heroText.querySelector('.title');
    const tl = gsap.timeline({ defaults: { ease: 'power4.out' } });
    if (hasSplit) {
      const split = new SplitText(title, { type: 'lines', mask: 'lines', linesClass: 'line' });
      tl.from(split.lines, { yPercent: 115, duration: 1.4, stagger: 0.14 }, 0.1);
    } else tl.from(title, { opacity: 0, y: 40, duration: 1.2 }, 0.1);
    tl.to(heroText.querySelector('.eyebrow'), { opacity: 1, duration: 0.6 }, 0)
      .add(scramble(heroText.querySelector('[data-scramble]'), 1.0) || gsap.to({}, { duration: 0 }), 0)
      .to([scrollCue, '#rail', '.scene-label'], { opacity: 1, duration: 1, stagger: 0.1 }, 0.9)
      .call(() => body.classList.remove('hero-intro'));
    return tl;
  }

  /* ------------------------------------------------------------------
     The scroll story
  ------------------------------------------------------------------ */
  const LABELS = ['01 // ORIGIN', '02 // STRUCTURE', '03 // FLOW', '04 // HYAICO', '05 // JUST COOKED'];
  const rail = document.querySelectorAll('#rail i');
  const sceneLabel = document.getElementById('sceneLabel');
  let sceneIdx = 0;
  function updateHud(p) {
    const idx = Math.round(p * 4);
    if (idx !== sceneIdx) {
      sceneIdx = idx;
      rail.forEach((d, i) => d.classList.toggle('is-active', i === idx));
      scramble(sceneLabel, 0.7, LABELS[idx]);
    }
    if (scrollCue) scrollCue.style.opacity = p > 0.03 ? '0' : '';
  }
  rail.forEach((d, i) => { d.classList.toggle('is-active', i === 0); d.addEventListener('click', () => scrollToScene(i)); });
  function scrollToScene(i) {
    const story = document.getElementById('story');
    const st = ScrollTrigger.getById('story');
    if (!st) return;
    const y = st.start + (st.end - st.start) * (i / 4);
    if (lenis) lenis.scrollTo(y, { duration: 1.6 }); else window.scrollTo({ top: y, behavior: 'smooth' });
  }

  let storyInit = false;
  function initStory() {
    if (storyInit || !hasST) return;
    storyInit = true;

    const mid = document.getElementById('midText');
    const jc = document.getElementById('jcText');
    const blurIn = { opacity: 0, y: 48, filter: 'blur(12px)' };
    const clear = { opacity: 1, y: 0, filter: 'blur(0px)' };

    const tl = gsap.timeline({
      scrollTrigger: {
        id: 'story', trigger: '#story', start: 'top top', end: '+=720%', pin: true, scrub: 0.9, anticipatePin: 1,
        onUpdate: (self) => { HY.progress = self.progress; updateHud(self.progress); },
      },
    });
    tl.to(heroText, { opacity: 0, y: -70, filter: 'blur(12px)', duration: 0.08, ease: 'power2.in' }, 0.005)
      .fromTo(mid, blurIn, { ...clear, duration: 0.06, ease: 'power2.out' }, 0.15)
      .to(mid, { opacity: 0, y: -50, filter: 'blur(12px)', duration: 0.06, ease: 'power2.in' }, 0.27)
      .fromTo(jc, blurIn, { ...clear, duration: 0.07, ease: 'power2.out' }, 0.905)
      .to({}, { duration: 0.025 });

    /* Progress bar */
    const progress = document.querySelector('.progress span');
    ScrollTrigger.create({ start: 0, end: () => ScrollTrigger.maxScroll(window), onUpdate: (s) => { progress.style.transform = `scaleX(${s.progress})`; } });

    /* Outro */
    const wm = document.getElementById('footerWordmark');
    if (wm) gsap.fromTo(wm, { yPercent: 40, opacity: 0.4 }, { yPercent: 0, opacity: 1, ease: 'none', scrollTrigger: { trigger: '#outro', start: 'top bottom', end: 'bottom bottom', scrub: true } });
    document.querySelectorAll('[data-reveal]').forEach((el) => {
      gsap.fromTo(el, { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 1.2, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 85%', once: true }, onStart: () => el.classList.add('is-revealed') });
    });

    /* Scramble the "Introducing" label when it appears */
    ScrollTrigger.create({ trigger: '#story', start: 'top top', end: '+=720%', onUpdate: (s) => { if (s.progress > 0.9 && !jc.dataset.scrambled) { jc.dataset.scrambled = '1'; scramble(jc.querySelector('[data-scramble]'), 0.9); } } });

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
      const dx = gsap.quickTo(dot, 'x', { duration: 0.12, ease: 'power3.out' });
      const dy = gsap.quickTo(dot, 'y', { duration: 0.12, ease: 'power3.out' });
      const rx = gsap.quickTo(ring, 'x', { duration: 0.45, ease: 'power3.out' });
      const ry = gsap.quickTo(ring, 'y', { duration: 0.45, ease: 'power3.out' });
      cursor.classList.add('is-hidden');
      window.addEventListener('pointermove', (e) => {
        cursor.classList.remove('is-hidden');
        dx(e.clientX); dy(e.clientY); rx(e.clientX); ry(e.clientY);
        cursor.classList.toggle('is-link', !!e.target.closest('a, button, [data-cursor]'));
      }, { passive: true });
      document.addEventListener('pointerleave', () => cursor.classList.add('is-hidden'));
      document.addEventListener('pointerenter', () => cursor.classList.remove('is-hidden'));
    }
  }
})();
