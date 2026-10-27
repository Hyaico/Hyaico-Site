# HYAICO — Company Website

A single-page, almost wordless, scroll-driven 3D experience for HYAICO. Built with plain HTML, CSS and JavaScript so it deploys straight to GitHub Pages with no build step.

## The experience

1. **Loader** — the HYAICO wordmark is revealed by a passing light, pulses, then the dark veil lifts to show the same wordmark already formed from particles behind it. A flash and a particle burst hand over to the page.
2. **The story** — one particle system (90,000 points on desktop, 36,000 on phones) morphs between forms as you scroll, with camera moves and swirl scrubbed by the scroll position:
   - a glowing planet horizon beneath "Built for *what's next*."
   - a double helix beside "Things that *should exist*."
   - a spiral galaxy under "Ideas, *in motion*."
   - HYAICO itself, in particles
   - a halo of light around a modelled 3D phone running Just Cooked ("Introducing Just Cooked"), whose screen cross-fades through the app's Home, Next Meal and Recipe screens as you keep scrolling
3. **Ending** — the phone slips away and the stage dims into a call to action: "Start with *Just Cooked*." with App Store, Google Play and justcooked.app links, then the giant masked HYAICO wordmark with a light sweep.

Every particle has its own parallax depth, so the field never moves as one block under the pointer. A single scroll cue sits bottom-centre and disappears once you move.

## Tech

| Concern | Tool |
| --- | --- |
| 3D | [Three.js](https://threejs.org) r170 via ES-module import map (jsDelivr): custom particle shader, SVGLoader (wordmark), MeshSurfaceSampler, RoomEnvironment, bloom |
| Animation | [GSAP](https://gsap.com) 3.13 + ScrollTrigger (pinned story), SplitText, ScrambleText (cdnjs) |
| Smooth scroll | [Lenis](https://lenis.darkroom.engineering) 1.3 (jsDelivr) |
| Type | Geist, Geist Mono, Instrument Serif (Google Fonts) |
| Hosting | GitHub Pages (`.github/workflows/static.yml`) |

Everything is loaded from CDNs; there is no `package.json` and nothing to install.

## Local development

The scripts are ES modules, so the page must be served over HTTP (opening `index.html` directly will block them).

```bash
python -m http.server 8765
# then open http://127.0.0.1:8765/
```

## File structure

```
├── index.html             # The single page: loader, nav, pinned story, ending
├── styles.css             # Design tokens, components, responsive rules
├── js/
│   ├── scene.js           # Particle system, the five forms, the phone + screens, camera keyframes
│   └── main.js            # Loader hand-over, smooth scroll, scroll story, ending, cursor
├── assets/
│   ├── HyaicoWhite.svg    # Wordmark — used in the UI, the loader and as the particle source
│   ├── HyaicoBlack.svg    # Wordmark (dark on light)
│   ├── Icon.svg           # Just Cooked app icon
│   ├── screens/           # Screen-only crops shown on the 3D phone (from the Just Cooked site)
│   ├── shots/home-980.webp # Framed phone shot used when WebGL is unavailable
│   ├── MainHero.png       # Just Cooked mockup (source material)
│   ├── favicon.svg        # "H" monogram favicon
│   ├── og.png             # Social preview card (1200×630)
│   └── og-source.html     # Source for og.png — render at 1200×630 to regenerate
├── CONTEXT.md             # Design direction
└── README.md
```

## Editing

- The text beats live in `index.html` inside `#story`; their timing is in `initStory()` in `js/main.js` (positions are fractions of the pinned scroll, which is `STORY_LEN` long).
- Where each form is held, and which screen the phone shows when, is in `BEATS` and `applyState()` in `js/scene.js`; brightness and tint per form are in `uBright` / `uTint`; camera keyframes in `CAM`.
- The phone geometry follows the Just Cooked site's `js/scene.js`; to update its screens, drop new screen-only crops into `assets/screens/` with the same names.

## Browser support

Latest Chrome, Edge, Firefox and Safari on desktop and mobile. Without WebGL the page shows the text beats over a static glow and a framed phone shot; without JavaScript it is readable with no animation.
