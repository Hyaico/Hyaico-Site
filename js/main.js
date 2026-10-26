/* ==========================================================================
   HYAICO — Interactions
   Smooth scroll (Lenis), preloader, hero intro, scroll reveals (GSAP),
   custom cursor, magnetic buttons, spotlight cards, menus, process pin.
   ========================================================================== */
(() => {
  'use strict';

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(pointer: fine)').matches;
  const hasGsap = typeof gsap !== 'undefined';
  const hasST = hasGsap && typeof ScrollTrigger !== 'undefined';
  const hasSplit = hasGsap && typeof SplitText !== 'undefined';
  const body = document.body;

  if (hasST) gsap.registerPlugin(ScrollTrigger);
  if (hasSplit) gsap.registerPlugin(SplitText);
  if (!hasST) document.documentElement.classList.add('no-anim');

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
     Navigation: appear, compact on scroll, hide on scroll down
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
     Footer year
  ------------------------------------------------------------------ */
  const year = document.getElementById('year');
  if (year) year.textContent = String(new Date().getFullYear());

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
    initScrollAnimations();
  } else {
    hero.classList.add('hero-intro');
    const countEl = loader.querySelector('[data-count]');
    const barEl = loader.querySelector('.loader__bar span');
    const state = { n: 0 };

    const countTl = gsap.to(state, {
      n: 100, duration: 1.5, ease: 'power3.inOut',
      onUpdate() {
        countEl.textContent = Math.round(state.n);
        barEl.style.transform = `scaleX(${state.n / 100})`;
      },
    });

    const loaded = new Promise((resolve) => {
      if (document.readyState === 'complete') resolve();
      else window.addEventListener('load', resolve, { once: true });
    });
    const fontsReady = document.fonts ? document.fonts.ready.catch(() => {}) : Promise.resolve();
    const timeout = new Promise((r) => setTimeout(r, 3600));

    Promise.all([countTl.then(), Promise.race([Promise.all([loaded, fontsReady]), timeout])]).then(revealPage);
  }

  function revealPage() {
    body.classList.remove('is-loading');
    nav.classList.add('is-visible');

    const tl = gsap.timeline({ defaults: { ease: 'power4.inOut' } });
    tl.to(loader.querySelector('.loader__inner'), { opacity: 0, y: -20, duration: 0.5, ease: 'power2.in' })
      .to(loader, { yPercent: -100, duration: 1.1 }, '-=0.1')
      .add(heroIntro(), '-=0.55')
      .call(() => {
        loader.remove();
        if (lenis) lenis.start();
        initScrollAnimations();
      }, null, '-=0.5');
  }

  function heroIntro() {
    const title = hero.querySelector('.hero__title');
    const tl = gsap.timeline({ defaults: { ease: 'power4.out' }, paused: false });

    if (hasSplit) {
      const split = new SplitText(title, { type: 'lines', mask: 'lines', linesClass: 'line' });
      tl.from(split.lines, { yPercent: 112, duration: 1.3, stagger: 0.13 }, 0);
    } else {
      tl.from(title, { opacity: 0, y: 40, duration: 1.2 }, 0);
    }
    tl.to('.hero__eyebrow', { opacity: 1, duration: 0.8 }, 0.1)
      .fromTo('.hero__sub', { y: 24 }, { opacity: 1, y: 0, duration: 1.1 }, 0.45)
      .fromTo('.hero__actions', { y: 20 }, { opacity: 1, y: 0, duration: 1 }, 0.6)
      .to('.hero__footer', { opacity: 1, duration: 1 }, 0.9)
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

    /* Single reveals */
    document.querySelectorAll('[data-reveal]').forEach((el) => {
      gsap.fromTo(el, { opacity: 0, y: 36 }, {
        opacity: 1, y: 0, duration: 1.1, ease: 'power3.out',
        scrollTrigger: { trigger: el, start: 'top 88%', once: true },
        onStart: () => el.classList.add('is-revealed'),
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

    /* Demo loop in the first bento card */
    const demo = document.querySelector('.demo');
    if (demo) {
      const chips = demo.querySelectorAll('.demo__chip');
      const thinking = demo.querySelector('.demo__thinking');
      const result = demo.querySelector('.demo__result');
      const loop = gsap.timeline({ repeat: -1, repeatDelay: 1.8, paused: true });
      loop.to(chips, { opacity: 1, y: 0, scale: 1, duration: 0.5, stagger: 0.28, ease: 'back.out(1.6)' })
        .to(thinking, { opacity: 1, duration: 0.3 }, '+=0.2')
        .to(thinking, { opacity: 0, duration: 0.3 }, '+=1.4')
        .to(result, { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' }, '-=0.1')
        .to({}, { duration: 3.2 })
        .to([result, thinking], { opacity: 0, duration: 0.4 })
        .to(chips, { opacity: 0, y: 8, scale: 0.96, duration: 0.3, stagger: 0.04 }, '-=0.2')
        .set(result, { y: 12 });
      ScrollTrigger.create({ trigger: demo, start: 'top 90%', end: 'bottom 10%', onToggle: (s) => (s.isActive ? loop.play() : loop.pause()) });
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

    /* CTA glow follows pointer */
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
     Phone tilt
  ------------------------------------------------------------------ */
  const stage = document.querySelector('.jc__stage');
  const phone = document.getElementById('phone');
  if (stage && phone && hasGsap) {
    if (finePointer && !reduced) {
      const rx = gsap.quickTo(phone, 'rotationX', { duration: 0.9, ease: 'power3.out' });
      const ry = gsap.quickTo(phone, 'rotationY', { duration: 0.9, ease: 'power3.out' });
      gsap.set(phone, { rotationY: -14, rotationX: 6, transformPerspective: 1400 });
      stage.addEventListener('pointermove', (e) => {
        const r = stage.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        ry(px * 28);
        rx(-py * 22);
      });
      stage.addEventListener('pointerleave', () => { ry(-14); rx(6); });
    } else if (!reduced) {
      gsap.set(phone, { rotationY: -12, rotationX: 5, transformPerspective: 1400 });
      gsap.to(phone, { rotationY: 12, rotationX: -4, y: -10, duration: 4.5, yoyo: true, repeat: -1, ease: 'sine.inOut' });
    }
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
