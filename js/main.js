/* ==========================================================================
   HYAICO — Interactions
   Loader → clean hand-over, smooth scroll, the pinned scroll story
   (text beats), the ending, cursor, nav.
   ========================================================================== */
(() => {
  'use strict';

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(pointer: fine)').matches;
  const hasGsap = typeof gsap !== 'undefined';
  const hasST = hasGsap && typeof ScrollTrigger !== 'undefined';
  const hasSplit = hasGsap && typeof SplitText !== 'undefined';
  const body = document.body;
  const html = document.documentElement;
  const HY = (window.HY = window.HY || { progress: 0, outro: 0 });
  const STORY_LEN = '+=900%';

  if (hasST) gsap.registerPlugin(ScrollTrigger);
  if (hasSplit) gsap.registerPlugin(SplitText);
  if (!hasST) html.classList.add('no-anim');

  function splitLines(title) {
    if (!title || !hasSplit || reduced) return null;
    try { return new SplitText(title, { type: 'lines', mask: 'lines', linesClass: 'line' }).lines; } catch (err) { return null; }
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
     Hero headline: split once fonts are in, before anything heavy runs
  ------------------------------------------------------------------ */
  const heroText = document.getElementById('heroText');
  const scrollCue = document.getElementById('scrollCue');
  let heroLines = null;
  function prepareHero() {
    if (heroLines) return;
    heroLines = splitLines(heroText.querySelector('.title'));
    if (heroLines) gsap.set(heroLines, { yPercent: 115 });
  }

  /* ------------------------------------------------------------------
     Loader
  ------------------------------------------------------------------ */
  const loader = document.getElementById('loader');

  if (!hasGsap || reduced || !loader) {
    if (loader) loader.remove();
    body.classList.remove('is-loading');
    if (lenis) lenis.start();
    nav.classList.add('is-visible');
    window.dispatchEvent(new CustomEvent('scene:intro'));
    initStory();
  } else {
    body.classList.add('hero-intro');
    const logo = loader.querySelector('.loader__logo');
    const line = loader.querySelector('.loader__line span');
    const head = loader.querySelector('.loader__line i');
    const count = loader.querySelector('[data-loader-count]');
    const state = { n: 0 };

    gsap.set(logo, { '--reveal': '-4%' });
    const boot = gsap.timeline();
    boot.to('.loader__beam', { opacity: 1, duration: 0.25 }, 0.1)
      .to(logo, { '--reveal': '104%', duration: 1.6, ease: 'power2.inOut' }, 0.2)
      .to('.loader__beam', { opacity: 0, duration: 0.3 }, 1.7)
      .fromTo('.loader__glow', { opacity: 0 }, { opacity: 0.8, duration: 0.8, ease: 'sine.inOut', yoyo: true, repeat: 1 }, 1.7)
      .to('.loader__meta', { opacity: 1, duration: 0.5 }, 0.35)
      .to(state, {
        n: 100, duration: 2.5, ease: 'power2.inOut',
        onUpdate() { count.textContent = String(Math.round(state.n)); line.style.transform = `scaleX(${state.n / 100})`; head.style.left = `${state.n}%`; },
      }, 0.25);

    const loaded = new Promise((r) => (document.readyState === 'complete' ? r() : window.addEventListener('load', r, { once: true })));
    const fonts = (document.fonts ? document.fonts.ready.catch(() => {}) : Promise.resolve()).then(prepareHero);
    const timeout = new Promise((r) => setTimeout(r, 5000));
    Promise.all([boot.then(), Promise.race([Promise.all([loaded, fonts]), timeout])]).then(handOver);
  }

  /* The hand-over: the logo lifts away, the veil clears, the globe is already rising behind it */
  /* While the veil still covers everything, show the later text beats for a couple of frames so the browser paints
     them now (the logotype, the large type, the buttons) instead of the first time they appear mid-scroll */
  function prepaint() {
    const els = ['jcText', 'helixText', 'galaxyText'].map((id) => document.getElementById(id)).filter(Boolean);
    els.forEach((el) => { el.style.opacity = '1'; });
    requestAnimationFrame(() => requestAnimationFrame(() => els.forEach((el) => { el.style.opacity = ''; })));
  }

  function handOver() {
    body.classList.remove('is-loading');
    prepareHero();
    prepaint();
    const mark = document.getElementById('loaderMark');
    const tl = gsap.timeline();
    tl.to('.loader__meta', { opacity: 0, duration: 0.3, ease: 'power2.in' }, 0)
      .to('.loader__glow', { opacity: 0.9, duration: 0.5, ease: 'power2.in' }, 0.1)
      .call(() => { window.dispatchEvent(new CustomEvent('scene:intro')); nav.classList.add('is-visible'); }, null, 0.5)
      .to([mark, '.loader__glow'], { scale: 1.12, opacity: 0, duration: 0.9, ease: 'power3.in' }, 0.5)
      .to('.loader__veil', { opacity: 0, duration: 1.1, ease: 'power2.inOut' }, 0.7)
      .add(heroIntro(), 1.3)
      .call(() => { loader.remove(); if (lenis) lenis.start(); initStory(); }, null, 2.3);
  }

  function heroIntro() {
    const tl = gsap.timeline({ defaults: { ease: 'power4.out' } });
    if (heroLines) tl.to(heroLines, { yPercent: 0, duration: 1.4, stagger: 0.14 }, 0.1);
    else tl.from(heroText.querySelector('.title'), { opacity: 0, y: 40, duration: 1.2 }, 0.1);
    tl.to(scrollCue, { opacity: 1, duration: 1 }, 1.0)
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
    /* scroll-scrubbed motion uses only opacity and movement — the two things the compositor animates for free */
    const hidden = { opacity: 0, y: 48 };
    const shown = { opacity: 1, y: 0 };
    const gone = { opacity: 0, y: -50 };

    const tl = gsap.timeline({
      scrollTrigger: {
        id: 'story', trigger: '#story', start: 'top top', end: STORY_LEN, pin: true, scrub: 0.9, anticipatePin: 1,
        onUpdate: (self) => {
          HY.progress = self.progress;
          if (scrollCue) scrollCue.style.opacity = self.progress > 0.02 ? '0' : '';
        },
      },
    });
    /* positions and durations are fractions of the pinned scroll */
    tl.to(heroText.querySelector('.title'), { ...gone, duration: 0.07, ease: 'power2.in' }, 0.004);

    /* a titled beat: its lines rise out of their masks, hold, then leave upward */
    function beat(el, enter, leave) {
      const lines = splitLines(el.querySelector('.title'));
      if (lines) {
        tl.fromTo(el, { opacity: 0 }, { opacity: 1, duration: 0.012, ease: 'none' }, enter)
          .fromTo(lines, { yPercent: 115 }, { yPercent: 0, duration: 0.05, stagger: 0.014, ease: 'power3.out' }, enter)
          .to(lines, { yPercent: -115, duration: 0.04, stagger: 0.01, ease: 'power2.in' }, leave)
          .to(el, { opacity: 0, duration: 0.012, ease: 'none' }, leave + 0.04);
      } else {
        const title = el.querySelector('.title');
        tl.set(el, { opacity: 1 }, enter)
          .fromTo(title, hidden, { ...shown, duration: 0.05, ease: 'power2.out' }, enter)
          .to(title, { ...gone, duration: 0.05, ease: 'power2.in' }, leave)
          .set(el, { opacity: 0 }, leave + 0.05);
      }
    }
    beat(helix, 0.13, 0.27);
    beat(galaxy, 0.34, 0.47);

    /* Just Cooked: the block builds up piece by piece beside the phone */
    const jcKids = jc.querySelectorAll('.jc > *');
    tl.fromTo(jc, { opacity: 0 }, { opacity: 1, duration: 0.008, ease: 'none' }, 0.55)
      .fromTo(jcKids, { opacity: 0, y: 36 }, { opacity: 1, y: 0, duration: 0.035, stagger: 0.006, ease: 'power3.out' }, 0.555)
      .to(jc.querySelector('.jc'), { y: -50, duration: 0.05, ease: 'power2.in' }, 0.7)
      .to(jc, { opacity: 0, duration: 0.05, ease: 'power2.in' }, 0.7)
      .to({}, { duration: 0.25 });

    /* Progress bar */
    const progress = document.querySelector('.progress span');
    ScrollTrigger.create({ start: 0, end: () => ScrollTrigger.maxScroll(window), onUpdate: (s) => { progress.style.transform = `scaleX(${s.progress})`; } });

    /* Ending: the chrome HYAICO glides down into the footer wordmark, which brightens as it lands */
    ScrollTrigger.create({ trigger: '#outro', start: 'top bottom', end: 'top 20%', scrub: true, onUpdate: (s) => { HY.outro = s.progress; } });
    const wm = document.getElementById('footerWordmark');
    if (wm) gsap.fromTo(wm, { opacity: 0 }, { opacity: 1, ease: 'none', scrollTrigger: { trigger: '#outro', start: 'top 45%', end: 'top 18%', scrub: true } });
    document.querySelectorAll('[data-reveal]').forEach((el, i) => {
      gsap.fromTo(el, { opacity: 0, y: 40 }, {
        opacity: 1, y: 0, duration: 1.2, ease: 'power3.out', delay: i * 0.12,
        scrollTrigger: { trigger: '#outro', start: 'top 55%', once: true },
        onStart: () => { el.classList.add('is-revealed'); },
      });
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
