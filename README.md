# HYAICO — Company Website

A single-page, almost wordless, scroll-driven 3D experience for HYAICO. Built with plain HTML, CSS and JavaScript so it deploys straight to GitHub Pages with no build step.

## The experience

1. **Loader** — the HYAICO wordmark is revealed by a passing beam of light, with a thin progress line. It dissolves into a particle version of the same wordmark already formed behind it.
2. **The story** — one particle system (90,000 points on desktop, 36,000 on phones) morphs between forms as you scroll, with camera moves and swirl scrubbed by the scroll position:
   - a glowing planet horizon beneath "Built for *what's next*."
   - a double helix beside "Things that *should exist*."
   - a flowing data field
   - HYAICO itself, in particles
   - the silhouette of a handset, into which a modelled 3D phone running Just Cooked appears ("Introducing Just Cooked", with a link to justcooked.app)
3. **Outro** — the giant masked HYAICO wordmark with a light sweep, and a minimal bar.

A scene rail (right) and scene label (bottom) track the five forms; the rail is clickable.

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
├── index.html             # The single page: loader, nav, pinned story, outro
├── styles.css             # Design tokens, components, responsive rules
├── js/
│   ├── scene.js           # The particle system, the five forms, the phone, camera keyframes
│   └── main.js            # Loader hand-over, smooth scroll, scroll story, HUD, cursor
├── assets/
│   ├── HyaicoWhite.svg    # Wordmark — used in the UI, the loader and as the particle source
│   ├── HyaicoBlack.svg    # Wordmark (dark on light)
│   ├── Icon.svg           # Just Cooked app icon
│   ├── MainHero.png       # Just Cooked mockup; the screen area is cropped onto the 3D phone
│   ├── favicon.svg        # "H" monogram favicon
│   ├── og.png             # Social preview card (1200×630)
│   └── og-source.html     # Source for og.png — render at 1200×630 to regenerate
├── CONTEXT.md             # Design direction
└── README.md
```

## Editing

- The three text beats live in `index.html` inside `#story`; their timing is in `initStory()` in `js/main.js` (positions are fractions of the pinned scroll).
- The forms, their brightness and tints are at the top of `js/scene.js` (`uBright`, `uTint`); camera keyframes are in `CAM`.
- To update the phone's screen, replace `assets/MainHero.png` with a mockup of the same layout, or adjust the `IMG` crop values in `js/scene.js`.

## Browser support

Latest Chrome, Edge, Firefox and Safari on desktop and mobile. Without WebGL the page shows the text beats over a static glow; without JavaScript it is readable with no animation.
