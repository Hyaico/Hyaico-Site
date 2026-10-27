# HYAICO — Company Website

A single-page, almost wordless, scroll-driven 3D experience for HYAICO. Built with plain HTML, CSS and JavaScript so it deploys straight to GitHub Pages with no build step.

## The experience

1. **Loader** — a laser scans the HYAICO wordmark into existence, it pulses, then the dark veil lifts to show the same wordmark already formed from particles behind it. A flash and a particle burst hand over to the page.
2. **The story** — one particle system (60,000 points on desktop, 28,000 on phones) morphs between forms as you scroll, with real geometry riding along and camera moves scrubbed by the scroll position:
   - a planet horizon with a glowing limb line, beneath "Built for *what's next*."
   - a double helix with two light strands, beside "Things that *should exist*."
   - a spiral galaxy with a bright core, under "Ideas, *in motion*."
   - HYAICO in particles, through which a chrome HYAICO surfaces with a travelling light
   - the stage: the particles thin to distant dust, and the Just Cooked phone rises through a dark reflective floor with a holographic grid and a column of light behind it, beside the Just Cooked logotype, "For when *food feels hard*.", the App Store and Google Play buttons and justcooked.app. The screen cross-fades Home → Next Meal → Recipe as you keep scrolling.
3. **Ending** — the phone sinks back into the floor, the stage dims, and a big centred "Built for *what's next*." draws its underline above the giant masked HYAICO wordmark with a light sweep.

The phone is drawn in its own pass on top of the particle layer, so neither bloom nor tone mapping touches its screen: the app shows at its true contrast, exactly as on justcooked.app, inside a rounded screen that never pokes past the glass. Every particle has its own parallax depth under the pointer. One scroll cue sits bottom-centre and disappears once you move.

## Tech

| Concern | Tool |
| --- | --- |
| 3D | [Three.js](https://threejs.org) r170 via ES-module import map (jsDelivr): custom particle shader, SVGLoader (wordmark + chrome letters), MeshSurfaceSampler, TubeGeometry strands, Reflector floor, custom grid and floor shaders, RoomEnvironment, bloom on the particle layer only |
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
│   ├── scene.js           # Particle layer (forms, glowing geometry, chrome letters) + product layer (phone, floor, grid)
│   └── main.js            # Loader hand-over, smooth scroll, scroll story, ending, cursor
├── assets/
│   ├── HyaicoWhite.svg    # Wordmark — the UI, the loader, the particle and chrome source, the ending
│   ├── HyaicoBlack.svg    # Wordmark (dark on light)
│   ├── JustCookedLogo.svg # Just Cooked logotype (icon + name), from the Just Cooked site
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
- Where each form is held, when the chrome letters and the stage appear, and which screen the phone shows when, is in `BEATS` and `applyState()` in `js/scene.js`; brightness and tint per form are in `uBright` / `uTint`; camera keyframes in `CAM`.
- The phone geometry and lighting follow the Just Cooked site's `js/scene.js`; to update its screens, drop new screen-only crops into `assets/screens/` with the same names.

## Browser support

Latest Chrome, Edge, Firefox and Safari on desktop and mobile. Without WebGL the page shows the text beats over a static glow and a framed phone shot; without JavaScript it is readable with no animation.
