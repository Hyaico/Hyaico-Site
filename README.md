# HYAICO — Company Website

A single-page, almost wordless, scroll-driven 3D experience for HYAICO. Built with plain HTML, CSS and JavaScript so it deploys straight to GitHub Pages with no build step.

## The experience

1. **Loader** — a laser scans the HYAICO wordmark into existence, it pulses, then lifts away as the dark veil clears. No burst, no flash: the globe is already rising into place behind it.
2. **The story** — one particle system (60,000 points on desktop, 28,000 on phones) morphs between forms as you scroll, with real geometry riding along and camera moves scrubbed by the scroll position:
   - a globe with latitude and longitude lines and three atom orbits with circling electrons, beneath "Built for *what's next*."
   - a DNA helix — two thick glowing backbones with colour-paired base rungs — beside "Things that *should exist*." (below it on phones)
   - a spiral galaxy with a bright core, under "Ideas, *in motion*."
   - the stage: the particles thin to distant dust, and the Just Cooked phone rises through a dark mirror floor in a studio backdrop with a soft horizon glow and a holographic grid, beside the Just Cooked logotype, "For when *food feels hard*.", the App Store and Google Play buttons and justcooked.app. The screen cross-fades Home → Next Meal → Recipe while the phone is up.
   - the particles write HYAICO, then a bevelled chrome HYAICO takes their place with a travelling light. No particles touch the metal.
3. **Ending** — the chrome HYAICO glides down and becomes the faint masked wordmark at the foot of the page (with its light sweep), under a big centred "Built for *what's next*." that draws its underline.

The phone is drawn in its own anti-aliased pass on top of the particle layer, so neither bloom nor tone mapping touches its screen: the app shows at its true contrast, exactly as on justcooked.app. Every particle has its own parallax depth under the pointer. One scroll cue sits bottom-centre and disappears once you move. The nav is the wordmark alone.

## Tech

| Concern | Tool |
| --- | --- |
| 3D | [Three.js](https://threejs.org) r170 via ES-module import map (jsDelivr): custom particle shader, SVGLoader (wordmark + chrome letters), MeshSurfaceSampler, LineSegments globe, TubeGeometry backbones, Reflector floor, custom backdrop / floor / grid shaders, RoomEnvironment, bloom on the particle layer only |
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
│   ├── scene.js           # Particle layer (forms, globe, DNA, galaxy core, chrome letters) + product layer (phone, backdrop, floor, grid)
│   └── main.js            # Loader hand-over, smooth scroll, scroll story, ending, cursor
├── assets/
│   ├── HyaicoWhite.svg    # Wordmark — the UI, the loader, the particle and chrome source, the ending
│   ├── HyaicoBlack.svg    # Wordmark (dark on light)
│   ├── JustCookedLogo.svg # Just Cooked logotype (icon + name), from the Just Cooked site
│   ├── Icon.svg           # Just Cooked app icon
│   ├── screens/           # Screen-only crops shown on the 3D phone (from the Just Cooked site)
│   ├── shots/home-980.webp # Framed phone shot used when WebGL is unavailable
│   ├── MainHero.png       # Just Cooked mockup (source material)
│   ├── favicon.svg        # The white H from the wordmark
│   ├── og.png             # Social preview card (1200×630)
│   └── og-source.html     # Source for og.png — render at 1200×630 to regenerate
├── CONTEXT.md             # Design direction
└── README.md
```

## Editing

- The text beats live in `index.html` inside `#story`; their timing is in `initStory()` in `js/main.js` (positions are fractions of the pinned scroll, which is `STORY_LEN` long).
- Where each form is held, when the stage and the chrome letters appear, and which screen the phone shows when, is in `BEATS` and `applyState()` in `js/scene.js`; brightness and tint per form are in `uBright` / `uTint`; camera keyframes in `CAM`.
- The phone geometry and lighting follow the Just Cooked site's `js/scene.js`; to update its screens, drop new screen-only crops into `assets/screens/` with the same names.

## Browser support

Latest Chrome, Edge, Firefox and Safari on desktop and mobile. Without WebGL the page shows the text beats over a static glow and a framed phone shot; without JavaScript it is readable with no animation.
