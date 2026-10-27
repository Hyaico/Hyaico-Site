/* ==========================================================================
   HYAICO — Interactions
   Preloader (DrawSVG wordmark, scramble readouts, shutter exit), smooth
   scroll (Lenis), hero intro, scroll reveals (GSAP), scramble labels,
   telemetry, blueprint loop, custom cursor, magnetic buttons, menus.
   ========================================================================== */
(() => {
  'use strict';

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(pointer: fine)').matches;
  const hasGsap = typeof gsap !== 'undefined';
  const hasST = hasGsap && typeof ScrollTrigger !== 'undefined';
  const hasSplit = hasGsap && typeof SplitText !== 'undefined';
  const hasDraw = hasGsap && typeof DrawSVGPlugin !== 'undefined';
  const hasScramble = hasGsap && typeof ScrambleTextPlugin !== 'undefined';
  const body = document.body;
  const html = document.documentElement;
  const SCRAMBLE_CHARS = '01<>/\\|=+-_#*';

  if (hasST) gsap.registerPlugin(ScrollTrigger);
  if (hasSplit) gsap.registerPlugin(SplitText);
  if (hasDraw) gsap.registerPlugin(DrawSVGPlugin);
  if (hasScramble) gsap.registerPlugin(ScrambleTextPlugin);
  if (hasGsap && typeof CustomEase !== 'undefined') {
    gsap.registerPlugin(CustomEase);
    CustomEase.create('shutter', 'M0,0 C0.7,0 0.15,1 1,1');
  }
  if (!hasST) html.classList.add('no-anim');

  /* Scramble helper: decodes an element's own text in place */
  function scramble(target, duration = 0.9, delay = 0) {
    const els = typeof target === 'string' ? document.querySelectorAll(target) : [target];
    const tl = hasGsap ? gsap.timeline() : null;
    els.forEach((el, i) => {
      if (!hasScramble || reduced) return;
      const text = el.dataset.text || el.textContent;
      el.dataset.text = text;
      tl.to(el, { duration, scrambleText: { text, chars: SCRAMBLE_CHARS, speed: 0.5, revealDelay: duration * 0.25 } }, delay + i * 0.08);
    });
    return tl;
  }

  /* ------------------------------------------------------------------
     Smooth scroll
  ------------------------------------------------------------------ */
  let lenis = null;
  if (!reduced && hasST && typeof Lenis !== 'undefined') {
    lenis = new Lenis({ lerp: 0.085, smoothWheel: true, wheelMultiplier: 0.95 });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    lenis.stop();
  }

  function scrollTo(el) {
    if (!el) return;
    if (lenis) lenis.scrollTo(el, { offset: 0, duration: 1.5, easing: (t) => 1 - Math.pow(1 - t, 4) });
    else el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
  }

  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      if (!id || id.length < 2) return;
      const el = document.querySelector(id);
      if (!el) return;
      e.preventDefault();
      closeMenu();
      scrollTo(el);
    });
  });

  /* ------------------------------------------------------------------
     Navigation
  ------------------------------------------------------------------ */
  const nav = document.getElementById('nav');
  let lastY = 0;
  function onScrollNav(y) {
    nav.classList.toggle('is-scrolled', y > 24);
    if (y > 320 && y > lastY + 4 && !body.classList.contains('menu-open')) nav.classList.add('is-hidden');
    else if (y < lastY - 4 || y < 320) nav.classList.remove('is-hidden');
    lastY = y;
  }
  if (lenis) lenis.on('scroll', (e) => onScrollNav(e.scroll));
  else window.addEventListener('scroll', () => onScrollNav(window.scrollY), { passive: true });

  /* ------------------------------------------------------------------
     Mobile menu
  ------------------------------------------------------------------ */
  const toggle = document.getElementById('menuToggle');
  const menu = document.getElementById('menu');
  const menuLinks = menu ? menu.querySelectorAll('.menu__links a') : [];
  function openMenu() {
    body.classList.add('menu-open');
    toggle.setAttribute('aria-expanded', 'true');
    toggle.setAttribute('aria-label', 'Close menu');
    menu.setAttribute('aria-hidden', 'false');
    nav.classList.remove('is-hidden');
    if (lenis) lenis.stop(); else body.style.overflow = 'hidden';
    if (hasGsap) gsap.to(menuLinks, { opacity: 1, y: 0, duration: 0.8, stagger: 0.06, ease: 'power4.out', delay: 0.1, overwrite: true });
    else menuLinks.forEach((l) => { l.style.opacity = 1; l.style.transform = 'none'; });
  }
  function closeMenu() {
    if (!body.classList.contains('menu-open')) return;
    body.classList.remove('menu-open');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Open menu');
    menu.setAttribute('aria-hidden', 'true');
    if (lenis) lenis.start(); else body.style.overflow = '';
    if (hasGsap) gsap.to(menuLinks, { opacity: 0, y: 30, duration: 0.4, ease: 'power2.in', overwrite: true });
  }
  if (toggle) toggle.addEventListener('click', () => (body.classList.contains('menu-open') ? closeMenu() : openMenu()));
  document.addEventListener('keydown', (e) => { if (e.code === 'Escape') closeMenu(); });

  /* ------------------------------------------------------------------
     Telemetry (real values: local clock, renderer, FPS)
  ------------------------------------------------------------------ */
  const hudTime = document.getElementById('hudTime');
  const hudFps = document.getElementById('hudFps');
  const hudRender = document.getElementById('hudRender');
  const year = document.getElementById('year');
  if (year) year.textContent = String(new Date().getFullYear());
  if (hudTime) {
    const tick = () => { hudTime.textContent = new Date().toTimeString().slice(0, 8); };
    tick(); setInterval(tick, 1000);
  }
  window.addEventListener('scene:stats', (e) => { if (hudFps) hudFps.textContent = String(e.detail.fps); });
  if (hudRender && html.classList.contains('no-webgl')) hudRender.textContent = 'CSS';
  setTimeout(() => { if (hudRender && html.classList.contains('no-webgl')) { hudRender.textContent = 'CSS'; if (hudFps) hudFps.textContent = '60'; } }, 3000);

  /* ------------------------------------------------------------------
     Preloader → hero intro
  ------------------------------------------------------------------ */
  const loader = document.getElementById('loader');
  const hero = document.getElementById('hero');

  if (!hasGsap || reduced || !loader) {
    if (loader) loader.remove();
    body.classList.remove('is-loading');
    if (lenis) lenis.start();
    nav.classList.add('is-visible');
    window.dispatchEvent(new CustomEvent('scene:intro'));
    initScrollAnimations();
  } else {
    hero.classList.add('hero-intro');
    const counts = loader.querySelectorAll('[data-loader-count]');
    const barEl = loader.querySelector('.loader__bar span');
    const barHead = loader.querySelector('.loader__bar i');
    const status = loader.querySelector('[data-loader-status]');
    const state = { n: 0 };
    const setStatus = (text) => {
      if (hasScramble) gsap.to(status, { duration: 0.55, scrambleText: { text, chars: SCRAMBLE_CHARS, speed: 0.6 } });
      else status.textContent = text;
    };

    const boot = gsap.timeline();
    boot.to('.loader__corner', { opacity: 1, duration: 0.6, stagger: 0.05, ease: 'power2.out' }, 0)
      .to('.loader__hud-item', { opacity: 1, y: 0, duration: 0.7, stagger: 0.08, ease: 'power3.out' }, 0.1)
      .to('.loader__grid', { opacity: 1, duration: 1.2 }, 0)
      .to('.loader__scan', { opacity: 1, duration: 0.4 }, 0.3)
      .to(state, {
        n: 100, duration: 2.5, ease: 'power2.inOut',
        onUpdate() {
          const v = Math.round(state.n);
          counts.forEach((c) => { c.textContent = c.closest('.loader__hud-item') ? String(v).padStart(3, '0') : String(v); });
          barEl.style.transform = `scaleX(${state.n / 100})`;
          barHead.style.left = `${state.n}%`;
        },
      }, 0.15)
      .call(() => setStatus('LOADING ASSETS'), null, 0.35)
      .call(() => setStatus('BUILDING GEOMETRY'), null, 1.05)
      .call(() => setStatus('COMPILING SHADERS'), null, 1.7)
      .call(() => setStatus('CALIBRATING'), null, 2.25)
      .call(() => setStatus('READY'), null, 2.7);

    if (hasDraw) boot.fromTo('.loader__stroke', { drawSVG: '0%' }, { drawSVG: '100%', duration: 1.9, ease: 'power2.inOut' }, 0.2);
    else boot.to('.loader__stroke', { opacity: 1, duration: 1 }, 0.2);
    boot.to('.loader__fill', { opacity: 1, duration: 0.9, ease: 'power2.out' }, 1.65)
      .fromTo('#loader-sweep', { attr: { x1: -700, x2: -200 } }, { attr: { x1: 700, x2: 1200 }, duration: 1.4, ease: 'power2.inOut' }, 1.7)
      .to('.loader__bar', { opacity: 1, duration: 0.5 }, 0.2)
      .to('.loader__count', { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out' }, 0.3);

    const loaded = new Promise((resolve) => {
      if (document.readyState === 'complete') resolve();
      else window.addEventListener('load', resolve, { once: true });
    });
    const fontsReady = document.fonts ? document.fonts.ready.catch(() => {}) : Promise.resolve();
    const timeout = new Promise((r) => setTimeout(r, 4200));

    Promise.all([boot.then(), Promise.race([Promise.all([loaded, fontsReady]), timeout])]).then(revealPage);
  }

  function revealPage() {
    body.classList.remove('is-loading');
    const tl = gsap.timeline();
    tl.to('.loader__inner, .loader__hud, .loader__corner, .loader__grid, .loader__scan', { opacity: 0, duration: 0.45, ease: 'power2.in', stagger: 0.02 })
      .to('.loader__inner', { scale: 1.06, filter: 'blur(6px)', duration: 0.5, ease: 'power2.in' }, '<')
      .fromTo('.loader__seam', { scaleX: 0, opacity: 1 }, { scaleX: 1, duration: 0.55, ease: 'power3.inOut' }, '-=0.15')
      .call(() => { nav.classList.add('is-visible'); window.dispatchEvent(new CustomEvent('scene:intro')); })
      .to('.loader__panel--top', { yPercent: -100, duration: 1.1, ease: typeof CustomEase !== 'undefined' ? 'shutter' : 'power4.inOut' }, '+=0.05')
      .to('.loader__panel--bottom', { yPercent: 100, duration: 1.1, ease: typeof CustomEase !== 'undefined' ? 'shutter' : 'power4.inOut' }, '<')
      .to('.loader__seam', { opacity: 0, scaleY: 3, duration: 0.5 }, '<')
      .add(heroIntro(), '<+0.2')
      .call(() => {
        loader.remove();
        if (lenis) lenis.start();
        initScrollAnimations();
      }, null, '-=0.6');
  }

  function heroIntro() {
    const title = hero.querySelector('.hero__title');
    const tl = gsap.timeline({ defaults: { ease: 'power4.out' } });
    if (hasSplit) {
      const split = new SplitText(title, { type: 'lines', mask: 'lines', linesClass: 'line' });
      tl.from(split.lines, { yPercent: 112, duration: 1.3, stagger: 0.13 }, 0.1);
    } else {
      tl.from(title, { opacity: 0, y: 40, duration: 1.2 }, 0.1);
    }
    tl.to('.hero__eyebrow', { opacity: 1, duration: 0.6 }, 0)
      .add(scramble('.hero__eyebrow [data-scramble]', 1), 0)
      .fromTo('.hero__sub', { y: 24 }, { opacity: 1, y: 0, duration: 1.1 }, 0.55)
      .fromTo('.hero__actions', { y: 20 }, { opacity: 1, y: 0, duration: 1 }, 0.7)
      .to('.hero__footer', { opacity: 1, duration: 1 }, 0.9)
      .add(scramble('.hero__hud [data-scramble]', 0.9), 1.0)
      .call(() => hero.classList.remove('hero-intro'));
    return tl;
  }

  /* ------------------------------------------------------------------
     Scroll animations
  ------------------------------------------------------------------ */
  let scrollInit = false;
  function initScrollAnimations() {
    if (scrollInit || !hasST) return;
    scrollInit = true;

    /* Progress bar */
    const progress = document.querySelector('.progress span');
    if (progress) {
      ScrollTrigger.create({
        start: 0, end: () => ScrollTrigger.maxScroll(window),
        onUpdate: (self) => { progress.style.transform = `scaleX(${self.progress})`; },
      });
    }

    /* Single reveals (+ scramble any labels inside) */
    document.querySelectorAll('[data-reveal]').forEach((el) => {
      gsap.fromTo(el, { opacity: 0, y: 36 }, {
        opacity: 1, y: 0, duration: 1.1, ease: 'power3.out',
        scrollTrigger: { trigger: el, start: 'top 88%', once: true },
        onStart: () => { el.classList.add('is-revealed'); el.querySelectorAll('[data-scramble]').forEach((s) => scramble(s, 0.9)); },
      });
    });

    /* Grouped reveals */
    document.querySelectorAll('[data-reveal-group]').forEach((group) => {
      const items = Array.from(group.children);
      gsap.fromTo(items, { opacity: 0, y: 36 }, {
        opacity: 1, y: 0, duration: 1.1, stagger: 0.1, ease: 'power3.out',
        scrollTrigger: { trigger: group, start: 'top 86%', once: true },
        onStart: () => items.forEach((i) => i.classList.add('is-revealed')),
      });
    });

    /* Split-line headline reveals */
    const runSplits = () => {
      document.querySelectorAll('[data-split]').forEach((el) => {
        if (!hasSplit) {
          gsap.from(el, { opacity: 0, y: 30, duration: 1, scrollTrigger: { trigger: el, start: 'top 85%', once: true } });
          return;
        }
        const split = new SplitText(el, { type: 'lines', mask: 'lines', linesClass: 'line' });
        gsap.from(split.lines, {
          yPercent: 110, duration: 1.2, stagger: 0.1, ease: 'power4.out',
          scrollTrigger: { trigger: el, start: 'top 85%', once: true },
        });
      });
      ScrollTrigger.refresh();
    };
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(runSplits, runSplits);
    else runSplits();

    /* Manifesto: words brighten as you scroll */
    document.querySelectorAll('[data-scrub-words]').forEach((p) => {
      const words = p.textContent.trim().split(/\s+/);
      p.innerHTML = words.map((w) => `<span class="w">${w}</span>`).join(' ');
      gsap.to(p.querySelectorAll('.w'), {
        opacity: 1, stagger: 0.08, ease: 'none',
        scrollTrigger: { trigger: p, start: 'top 78%', end: 'bottom 45%', scrub: 0.6 },
      });
    });

    /* Blueprint build sequence (first bento card) */
    const bp = document.querySelector('.blueprint');
    if (bp) {
      const lines = bp.querySelectorAll('.bp-line');
      const fills = bp.querySelectorAll('.blueprint__fills rect');
      const labels = bp.querySelectorAll('.blueprint__labels text');
      const logs = bp.querySelectorAll('.log__line');
      const states = bp.querySelectorAll('.log__state');
      const loop = gsap.timeline({ repeat: -1, repeatDelay: 2.2, paused: true });
      if (hasDraw) loop.fromTo(lines, { drawSVG: '0%' }, { drawSVG: '100%', duration: 1.1, stagger: 0.14, ease: 'power2.inOut' });
      else loop.fromTo(lines, { opacity: 0 }, { opacity: 1, duration: 0.6, stagger: 0.12 });
      loop.to(labels, { opacity: 1, duration: 0.4, stagger: 0.1 }, '-=0.6')
        .to(fills, { opacity: 1, duration: 0.7, stagger: 0.1, ease: 'power2.out' }, '-=0.2');
      logs.forEach((line, i) => {
        loop.to(line, { opacity: 1, x: 0, duration: 0.4, ease: 'power2.out' }, 0.5 + i * 0.75);
        if (hasScramble) loop.to(line.querySelector('.log__text'), { duration: 0.6, scrambleText: { text: line.querySelector('.log__text').textContent, chars: SCRAMBLE_CHARS, speed: 0.6 } }, 0.5 + i * 0.75);
        loop.to(states[i], { opacity: 1, duration: 0.25 }, 0.95 + i * 0.75);
      });
      loop.to({}, { duration: 2.6 })
        .to([lines, fills, labels, logs], { opacity: 0, duration: 0.5 })
        .set(logs, { x: -8 }).set(states, { opacity: 0 }).set(lines, { opacity: 1 });
      ScrollTrigger.create({ trigger: bp, start: 'top 90%', end: 'bottom 10%', onToggle: (s) => (s.isActive ? loop.play() : loop.pause()) });
    }

    /* Hero content drifts away as you leave */
    gsap.to('.hero__content', {
      yPercent: -14, opacity: 0.1, ease: 'none',
      scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true },
    });

    /* Process: pinned horizontal scroll on desktop, vertical stack on mobile */
    const track = document.getElementById('processTrack');
    const process = document.getElementById('process');
    if (track && process) {
      const mm = gsap.matchMedia();
      mm.add('(min-width: 861px)', () => {
        const getDistance = () => Math.max(0, track.scrollWidth - window.innerWidth + 48);
        const tween = gsap.to(track, {
          x: () => -getDistance(), ease: 'none',
          scrollTrigger: {
            trigger: process, start: 'top top', end: () => `+=${getDistance() + window.innerHeight * 0.3}`,
            pin: process.querySelector('.process__pin'), scrub: 0.8, invalidateOnRefresh: true, anticipatePin: 1,
          },
        });
        gsap.from(track.querySelectorAll('.panel'), {
          opacity: 0, y: 40, stagger: 0.12, duration: 1, ease: 'power3.out',
          scrollTrigger: { trigger: process, start: 'top 70%', once: true },
        });
        return () => tween.kill();
      });
      mm.add('(max-width: 860px)', () => {
        gsap.from(track.querySelectorAll('.panel'), {
          opacity: 0, y: 40, stagger: 0.12, duration: 1, ease: 'power3.out',
          scrollTrigger: { trigger: track, start: 'top 85%', once: true },
        });
      });
    }

    /* Footer wordmark: rises into place and catches a light sweep */
    const wordmark = document.getElementById('footerWordmark');
    if (wordmark) {
      gsap.fromTo(wordmark, { yPercent: 35 }, {
        yPercent: 0, ease: 'none',
        scrollTrigger: { trigger: wordmark, start: 'top bottom', end: 'bottom bottom', scrub: true },
      });
    }

    /* Glow follows pointer in the closing section */
    const cta = document.querySelector('.cta');
    if (cta && finePointer) {
      cta.addEventListener('pointermove', (e) => {
        const r = cta.getBoundingClientRect();
        cta.style.setProperty('--gx', `${((e.clientX - r.left) / r.width) * 100}%`);
        cta.style.setProperty('--gy', `${((e.clientY - r.top) / r.height) * 100}%`);
      });
    }

    ScrollTrigger.refresh();
  }

  /* ------------------------------------------------------------------
     Spotlight cards
  ------------------------------------------------------------------ */
  document.querySelectorAll('.card').forEach((card) => {
    card.addEventListener('pointermove', (e) => {
      const r = card.getBoundingClientRect();
      card.style.setProperty('--mx', `${e.clientX - r.left}px`);
      card.style.setProperty('--my', `${e.clientY - r.top}px`);
    });
  });

  /* ------------------------------------------------------------------
     Magnetic buttons (pointer devices only)
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
  }

  /* ------------------------------------------------------------------
     Custom cursor
  ------------------------------------------------------------------ */
  const cursor = document.querySelector('.cursor');
  if (cursor && finePointer && hasGsap && !reduced) {
    body.classList.add('has-cursor');
    const dot = cursor.querySelector('.cursor__dot');
    const ring = cursor.querySelector('.cursor__ring');
    const label = cursor.querySelector('.cursor__label');
    const dx = gsap.quickTo(dot, 'x', { duration: 0.12, ease: 'power3.out' });
    const dy = gsap.quickTo(dot, 'y', { duration: 0.12, ease: 'power3.out' });
    const rx = gsap.quickTo(ring, 'x', { duration: 0.45, ease: 'power3.out' });
    const ry = gsap.quickTo(ring, 'y', { duration: 0.45, ease: 'power3.out' });
    cursor.classList.add('is-hidden');

    window.addEventListener('pointermove', (e) => {
      cursor.classList.remove('is-hidden');
      dx(e.clientX); dy(e.clientY); rx(e.clientX); ry(e.clientY);
      const t = e.target.closest('[data-cursor-text]');
      const l = e.target.closest('a, button, [data-cursor]');
      if (t) { label.textContent = t.getAttribute('data-cursor-text'); cursor.classList.add('is-text'); cursor.classList.remove('is-link'); }
      else if (l) { cursor.classList.add('is-link'); cursor.classList.remove('is-text'); }
      else cursor.classList.remove('is-link', 'is-text');
    }, { passive: true });
    document.addEventListener('pointerleave', () => cursor.classList.add('is-hidden'));
    document.addEventListener('pointerenter', () => cursor.classList.remove('is-hidden'));
  }

  /* ------------------------------------------------------------------
     Ticks stagger index for CSS
  ------------------------------------------------------------------ */
  document.querySelectorAll('.ticks__row i').forEach((el, i) => el.style.setProperty('--i', i));

  /* ------------------------------------------------------------------
     Refresh ScrollTrigger once the 3D scene is up (layout is stable)
  ------------------------------------------------------------------ */
  window.addEventListener('scene:ready', () => { if (hasST) ScrollTrigger.refresh(); }, { once: true });
})();
