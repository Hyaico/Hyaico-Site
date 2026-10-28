/* ==========================================================================
   HYAICO — Interactions
   The loader (a laser-scanned chrome wordmark over the hero's deep space),
   the hand-over into the nav, smooth scroll, the pinned scroll story with
   typed titles, the ending, cursor, nav.
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
     Typewriter: a title's characters fade in one by one at a constant pace while the caret glides along with them;
     then it blinks softly — a few times, or for good on the closing line
  ------------------------------------------------------------------ */
  function makeTyper(el, opts = {}) {
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
    /* gradient words: a background clipped to the text paints every letter at once, whatever the letters' own opacity,
       so each letter takes its own colour from the gradient instead (sampled along the line) and fades by itself */
    const hosts = new Map();
    chars.forEach((c) => {
      const host = c.parentElement;
      if (host === el || hosts.has(host)) { if (hosts.has(host)) hosts.get(host).push(c); return; }
      const cs = getComputedStyle(host);
      if (/text/.test(cs.webkitBackgroundClip || cs.backgroundClip || '') && cs.backgroundImage.includes('gradient')) {
        hosts.set(host, [c]);
        host.dataset.gradient = cs.backgroundImage;
        host.style.background = 'none';
      }
    });
    let tinted = false;
    function tint() {
      hosts.forEach((list, host) => {
        const stops = [];
        const re = /rgba?\(([^)]+)\)\s*([\d.]+)%/g;
        let m;
        while ((m = re.exec(host.dataset.gradient))) stops.push({ c: m[1].split(',').map(Number), p: Number(m[2]) / 100 });
        if (stops.length < 2) return;
        const widths = list.map((c) => c.getBoundingClientRect().width);
        const total = widths.reduce((a, b) => a + b, 0) || 1;
        let acc = 0;
        list.forEach((c, i) => {
          const t = (acc + widths[i] / 2) / total;
          acc += widths[i];
          let j = 0;
          while (j < stops.length - 2 && t > stops[j + 1].p) j++;
          const a = stops[j], b = stops[j + 1], k = Math.min(1, Math.max(0, (t - a.p) / (b.p - a.p || 1)));
          c.style.color = `rgb(${[0, 1, 2].map((q) => Math.round(a.c[q] + (b.c[q] - a.c[q]) * k)).join(', ')})`;
        });
      });
    }
    tint();
    const caret = document.createElement('span');
    caret.className = 'caret'; caret.setAttribute('aria-hidden', 'true');
    el.appendChild(caret);
    let tween = null, later = null, spots = [];
    const hideAll = () => chars.forEach((c) => { c.style.opacity = '0'; });
    /* where every character sits, measured once per run, so the caret can glide between them without touching layout */
    function measure() {
      const t = el.getBoundingClientRect();
      spots = chars.map((c) => { const r = c.getBoundingClientRect(); return { l: r.left - t.left, r: r.right - t.left, top: r.top - t.top, h: r.height }; });
    }
    function caretAt(n) {
      if (!spots.length) return;
      const k = Math.floor(n), f = n - k;
      let x, s;
      if (k >= spots.length) { s = spots[spots.length - 1]; x = s.r; }
      else {
        s = spots[k];
        const prev = spots[k - 1];
        /* within a line the caret slides from the last character's edge to the next one's; on a new line it starts afresh */
        x = prev && Math.abs(s.top - prev.top) < s.h * 0.5 ? prev.r + (s.r - prev.r) * f : s.l + (s.r - s.l) * f;
      }
      caret.style.transform = `translate(${x.toFixed(1)}px, ${(s.top + s.h * 0.14).toFixed(1)}px)`;
      caret.style.height = `${(s.h * 0.74).toFixed(1)}px`;
    }
    hideAll();
    return {
      length: chars.length,
      play(delay = 0, onDone) {
        if (tween) tween.kill();
        if (later) later.kill();
        if (!tinted) { tinted = true; tint(); }
        hideAll(); measure(); caretAt(0);
        caret.className = 'caret is-on is-typing';
        const st = { n: 0 };
        let shown = 0;
        tween = gsap.to(st, {
          n: chars.length, duration: chars.length * TYPE_SPEED, delay, ease: 'none',
          onUpdate: () => {
            const k = Math.floor(st.n);
            for (; shown < Math.min(k, chars.length); shown++) chars[shown].style.opacity = '1';
            if (k < chars.length) chars[k].style.opacity = (st.n - k).toFixed(3);
            caretAt(st.n);
          },
          onComplete: () => {
            chars.forEach((c) => { c.style.opacity = '1'; });
            caretAt(chars.length);
            caret.className = 'caret is-on';
            /* two soft blinks, ending fully lit, then it fades away — unless it is meant to stay */
            if (!opts.keepCaret) later = gsap.delayedCall(2.2, () => { caret.className = 'caret is-gone'; });
            if (onDone) onDone();
          },
        });
        return tween;
      },
      reset() { if (tween) tween.kill(); if (later) later.kill(); tween = later = null; hideAll(); caret.className = 'caret'; },
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

    /* the loader shows the hero's own deep space: once the 3D scene has drawn its first frame, the veil lifts and the
       Milky Way comes up behind the wordmark */
    const veil = loader.querySelector('.loader__veil');
    const lift = () => gsap.to(veil, { opacity: 0, duration: 1.6, ease: 'power2.inOut' });
    if (html.classList.contains('gl-ready')) lift(); else window.addEventListener('scene:ready', lift, { once: true });

    /* one highlight only: the laser scans the chrome wordmark into existence */
    gsap.set(logo, { '--reveal': '-4%', '--white': 0 });
    const boot = gsap.timeline();
    boot.fromTo('.loader__inner', { opacity: 0, scale: 0.97 }, { opacity: 1, scale: 1, duration: 0.6, ease: 'power2.out' }, 0)
      .to(['.loader__beam', '.loader__flare'], { opacity: 1, duration: 0.25 }, 0.1)
      .to(logo, { '--reveal': '104%', duration: 1.6, ease: 'power2.inOut' }, 0.2)
      .to(['.loader__beam', '.loader__flare'], { opacity: 0, duration: 0.35 }, 1.7)
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

  /* Show the later text beats, too faint to see, for a couple of frames so the browser paints them now (the logotype,
     the large type, the buttons) instead of the first time they appear mid-scroll */
  function prepaint() {
    const els = ['jcText', 'helixText', 'galaxyText'].map((id) => document.getElementById(id)).filter(Boolean);
    const typed = [...document.querySelectorAll('#helixText .ch, #galaxyText .ch, #jcText .ch')];
    els.forEach((el) => { el.style.opacity = '0.004'; });
    typed.forEach((c) => { c.dataset.o = c.style.opacity; c.style.opacity = '1'; });
    requestAnimationFrame(() => requestAnimationFrame(() => {
      els.forEach((el) => { el.style.opacity = ''; });
      typed.forEach((c) => { c.style.opacity = c.dataset.o; });
    }));
  }

  /* The hand-over: the same space carries on — the wordmark glides up into its place in the nav, turning from chrome
     to white as it lands, while the Earth rises into view and the title types itself */
  function handOver() {
    body.classList.remove('is-loading');
    prepaint();
    const logo = loader.querySelector('.loader__logo');
    const navImg = nav.querySelector('.nav__logo img');
    nav.style.transition = 'none';
    nav.classList.add('is-visible');
    void nav.offsetWidth;
    nav.style.transition = '';
    gsap.set(navImg, { opacity: 0 });
    const a = logo.getBoundingClientRect(), b = navImg.getBoundingClientRect();
    const fly = { x: b.left + b.width / 2 - (a.left + a.width / 2), y: b.top + b.height / 2 - (a.top + a.height / 2), scale: b.width / a.width };
    const tl = gsap.timeline();
    tl.to('.loader__meta', { opacity: 0, duration: 0.35, ease: 'power2.in' }, 0)
      .to('.loader__veil', { opacity: 0, duration: 0.8, ease: 'power2.inOut' }, 0)
      .call(() => window.dispatchEvent(new CustomEvent('scene:intro')), null, 0.15)
      .to(logo, { ...fly, duration: 1.3, ease: 'power3.inOut' }, 0.2)
      .to(logo, { '--white': 1, duration: 0.7, ease: 'power1.in' }, 0.75)
      .add(heroIntro(), 0.95)
      .call(() => { gsap.set(navImg, { opacity: 1 }); loader.remove(); if (lenis) lenis.start(); initStory(); }, null, 1.52);
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
    const outroTyper = makeTyper(outroLine, { keepCaret: true });   /* the closing line's caret never goes */
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
