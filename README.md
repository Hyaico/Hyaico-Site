# HYAICO — Company Website

A single-page, almost wordless, scroll-driven 3D experience for HYAICO. Built with plain HTML, CSS and JavaScript so it deploys straight to GitHub Pages with no build step.

## The experience

1. **Loader** — a laser scans the HYAICO wordmark into existence, it pulses, then lifts away as the dark veil clears. No burst, no flash: the globe is already rising into place behind it.
2. **The story** — one particle system (60,000 points on desktop, 28,000 on phones) morphs between forms as you scroll, with real geometry riding along and camera moves scrubbed by the scroll position. Every form change swirls into the next:
   - a solid globe with its continents in a dot grid, an atmosphere rim, latitude and longitude lines, and three atom orbits with electrons trailing comet tails, beneath "Built for *what's next*." As its particles leave, the planet sets below the frame.
   - a DNA helix — two glossy backbones, colour-paired base rungs with nodes at the joints — beside "Things that *should exist*." (below it on phones). The particles weave it from the bottom up as it grows into place, and it dissolves the same way.
   - a spiral galaxy with a bright core, under "Ideas, *in motion*."
   - the stage: the particles thin to distant dust, and the Just Cooked phone rises through a dark mirror floor on a seamless night cyclorama with a warm horizon, beside the Just Cooked logotype, "For when *food feels hard*." set as a display line, three bars that follow which of the app's screens the phone is showing, the App Store and Google Play buttons and justcooked.app. The screen cross-fades Home → Next Meal → Recipe while the phone is up.
   - the particles write HYAICO, then a bevelled chrome HYAICO takes their place with a travelling light. No particles touch the metal.
3. **Ending** — the chrome HYAICO glides down and becomes the faint masked wordmark at the foot of the page (with its light sweep). Above it, centred in the closing screen, a HYAICO eyebrow and a big "Built for *what's next*." that draws its underline, over one continuous background.

The phone is drawn in its own anti-aliased pass on top of the particle layer, so neither bloom nor tone mapping touches its screen: the app shows at its true contrast, exactly as on justcooked.app. The particle layer renders through a multisampled target, so tubes, rings and lines stay smooth under the bloom. Every particle has its own parallax depth under the pointer. One scroll cue sits bottom-centre and disappears once you move. The nav is the wordmark alone.

## Tech

| Concern | Tool |
| --- | --- |
| 3D | [Three.js](https://threejs.org) r170 via ES-module import map (jsDelivr): custom particle shader, SVGLoader (wordmark + chrome letters), MeshSurfaceSampler, a land-mask dot grid for the continents, TubeGeometry backbones grown with clipping planes, Reflector floor, custom backdrop / floor shaders, RoomEnvironment, bloom on the particle layer only (multisampled) |
| Animation | [GSAP](https://gsap.com) 3.13 + ScrollTrigger (pinned story), SplitText (masked line reveals), ScrambleText (cdnjs) |
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
│   ├── scene.js           # Particle layer (forms, globe + atom, DNA, galaxy core, chrome letters) + product layer (phone, backdrop, floor)
│   └── main.js            # Loader hand-over, smooth scroll, scroll story, ending, cursor
├── assets/
│   ├── HyaicoWhite.svg    # Wordmark — the UI, the loader, the particle and chrome source, the ending
│   ├── HyaicoBlack.svg    # Wordmark (dark on light)
│   ├── JustCookedLogo.svg # Just Cooked logotype (icon + name), from the Just Cooked site
│   ├── Icon.svg           # Just Cooked app icon
│   ├── earth-land.png     # Land mask for the globe's continents (NASA Blue Marble, via the three.js examples)
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
- Where each form is held, when the stage and the chrome letters appear, and which screen the phone shows when, is in `BEATS` and `applyState()` in `js/scene.js`; brightness and tint per form are in `uBright` / `uTint`; camera keyframes in `CAM`; the stage's colours in `STAGE`.
- The phone geometry and lighting follow the Just Cooked site's `js/scene.js`; to update its screens, drop new screen-only crops into `assets/screens/` with the same names.

## Browser support

Latest Chrome, Edge, Firefox and Safari on desktop and mobile. Without WebGL the page shows the text beats over a static glow and a framed phone shot; without JavaScript it is readable with no animation.
