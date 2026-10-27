# HYAICO — Company Website

A single-page, cinematic site for HYAICO, a company of innovation: dark, type-led, with real-time 3D, HUD-style technical details and scroll-driven motion. Built with plain HTML, CSS and JavaScript so it deploys straight to GitHub Pages with no build step.

## Highlights

- **3D hero** — the HYAICO wordmark extruded from the real logo path in polished chrome, assembling letter by letter, in front of a glass core with orbital rings, a wireframe shell, a holographic grid floor and a particle field. A light sweep travels across the chrome; everything reacts to the pointer and to scroll.
- **3D product showcase** — a modelled handset (titanium body, bezel, glass screen, buttons, camera module) whose screen is the real Just Cooked UI cropped from `assets/MainHero.png`. It turns to face you as the section scrolls in and can be dragged to rotate.
- **Preloader** — the wordmark drawn stroke by stroke, a light-sweep fill, scrambling system readouts, a counter, then a seam of light and a shutter split into the hero.
- **Motion system** — masked line reveals (GSAP SplitText), scramble-in labels (ScrambleText), scroll reveals, a scrub-to-brighten manifesto, a pinned horizontal "process" section on desktop, a blueprint build loop (DrawSVG), magnetic buttons, spotlight cards with HUD brackets, a crosshair cursor and live telemetry (clock, renderer, FPS).
- **Smooth scroll** — Lenis, synced with GSAP ScrollTrigger. Native scrolling on touch devices.
- **Responsive** — stacked layouts, full-screen menu and a lighter 3D budget on phones. Respects `prefers-reduced-motion`.

## Tech

| Concern | Tool |
| --- | --- |
| 3D | [Three.js](https://threejs.org) r170 via ES-module import map (jsDelivr): SVGLoader, RoomEnvironment, bloom post-processing |
| Animation | [GSAP](https://gsap.com) 3.13 + ScrollTrigger, SplitText, DrawSVG, ScrambleText, CustomEase (cdnjs) |
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

Any static server works (`npx serve`, VS Code Live Server, etc.).

## File structure

```
├── index.html             # The single page
├── styles.css             # Design tokens, components, responsive rules
├── js/
│   ├── scene.js           # Three.js hero: chrome wordmark, glass core, grid, particles
│   ├── phone.js           # Three.js handset showing the Just Cooked screen
│   └── main.js            # Preloader, smooth scroll, reveals, telemetry, menus, cursor
├── assets/
│   ├── HyaicoBlack.svg    # Wordmark (dark on light)
│   ├── HyaicoWhite.svg    # Wordmark (light on dark) — used on the site and as the 3D source
│   ├── Icon.svg           # Just Cooked app icon
│   ├── MainHero.png       # Just Cooked mockup; the screen area is cropped onto the 3D phone
│   ├── favicon.svg        # "H" monogram favicon
│   ├── og.png             # Social preview card (1200×630)
│   └── og-source.html     # Source for og.png — render at 1200×630 to regenerate
├── CONTEXT.md             # Design direction and requirements
└── README.md
```

## Editing content

- Copy lives in `index.html`; sections are marked with `<!-- ============ NAME ============ -->` comments.
- Colours, fonts, radii and spacing are CSS custom properties at the top of `styles.css`.
- To update the phone's screen, replace `assets/MainHero.png` with a mockup of the same layout, or adjust the `IMG` crop values at the top of `js/phone.js` for a different image.
- To add another product, duplicate the `.jc` block in the Products section.

## Browser support

Latest Chrome, Edge, Firefox and Safari on desktop and mobile. Without WebGL the hero shows the wordmark over a static glow and the product section shows the mockup image; without JavaScript the page is fully readable with no animation.
