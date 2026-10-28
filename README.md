# HYAICO — Company Website

A single-page, almost wordless, scroll-driven 3D experience for HYAICO. Built with plain HTML, CSS and JavaScript so it deploys straight to GitHub Pages with no build step.

## The experience

1. **Loader** — the hero's own deep space (the Milky Way, its dust lanes and its stars) behind the HYAICO wordmark in polished chrome, scanned in by a white laser with an anamorphic flare. At the hand-over the same space carries on: the wordmark glides up into its place in the nav, turning white as it lands, while the Earth rises into view and the first title types itself.
2. **The story** — one particle system (60,000 points on desktop, 28,000 on phones) morphs between forms as you scroll, with real geometry riding along. Each scene has its own background behind the canvas, cross-faded with the story, and every change makes sense of the last:
   - **The Earth**, beneath "Building *what's next*." — NASA's Blue Marble by day, its Black Marble city lights on the night side, Natural Earth's country borders, drifting clouds, a warm terminator, a faint sheen of sunlight on the oceans and an atmosphere glowing at the limb, in deep space with the Milky Way behind it. The particles are the world's cities. Around it, an atom: three orbits 60° apart that pass in front of the Earth on one side and behind it on the other, each a crisp line of light in a soft glow that brightens into a trail behind its electron, a bright point with a thin lens glint.
   - **Into its DNA** — one flight forward: the camera dives into the Earth, the orbits sweep past, the surface melts away just before we reach it, and we carry on through its city lights until they weave a helix of light beside "Stretching *what can be done*." (below it on phones): two twisted ribbons with a bright core line and edges, tapered base pairs in two blues, pulses running up the strands. It grows in from the bottom as the lights arrive.
   - **Out to a galaxy** — the helix spins up, one full turn the way the galaxy turns, and unfurls into its spiral arms as the camera pulls far back, under "And if it's done, *it can be better*.": a warm core, blue-white arms, rose nebulae, thousands of stars and flares.
   - **Back home at sunset** — the galaxy dissolves into the night's stars while its light glides down a gentle arc to the horizon, reddening as it goes, and becomes the sun. The sky warms from night into a reddish sunset: violet-blue overhead, magenta and pink low down, coral on the sun's side, a faint purple haze on the horizon, and two layers of billowing clouds lit coral and salmon on the side that faces the sun, drifting by in perspective. Tiny glowing motes drift in the warm air. The Just Cooked phone rises out of the water and stands on it, the navy-purple sea running to the true horizon and mirroring everything. Beside it, on a pane of dark glass: the Just Cooked logotype, "For when *food feels hard*." typed out, the App Store and Google Play buttons and justcooked.app. The screen cross-fades Home → Next Meal → Recipe.
   - **Night falls** — the sun sinks, the sky deepens, the first stars come out and the phone sinks back into the water. Then the stars drift in and align along the letters of HYAICO from the left, as if writing it; faint lines draw between them like a constellation; and the metal arrives behind them, each star flaring once as it passes, until the word is chrome.
3. **Ending** — the chrome HYAICO glides down and becomes the faint masked wordmark at the foot of the page; above it "Building *what's next*." types itself out and draws its underline over a soft violet light, its caret blinking on.

Every title types itself out at a constant pace, whatever the scroll is doing: each character fades in while the caret glides along with it, then the caret blinks softly a few times and goes (on the closing line it stays). A title leaves upward as you scroll on, and types again if you come back. The phone is drawn in its own anti-aliased pass, so neither bloom nor tone mapping touches its screen. The nav is the wordmark alone; one scroll cue sits bottom-centre and disappears once you move.

## Performance

- **No first-time hitches.** Every shader is compiled for each target it will draw into, and every texture uploaded, on the first frames while the loader is up; the later text is painted once, too faint to see, during the hand-over.
- **Painted once, a strip per frame.** The Milky Way and the cloud panorama (which wraps seamlessly sideways) are painted into textures over the first frames; afterwards the sky and space only look them up, so drifting the clouds costs nothing. The stars in front of the Milky Way are computed per pixel, so they stay sharp at any size.
- **The sky is one screen-filling quad** that computes each pixel's view ray, so no clipping (the far plane, or the sea's reflection pass) can ever cut it. It lies on the far plane and is drawn after the sea, so while the stage fades the sea and sky fade as one.
- **Nothing hidden is drawn**: the space layer is skipped while the sky covers it and after the chrome has gone; the particles are not drawn from the sunset on (about 300 stars write the word, so nothing is sampled from the logo at load); transparent sprites, stars and the Earth's surface are culled when they are not seen.
- **The backgrounds are CSS layers whose opacity alone changes**, so cross-fading them is free. The bloom and deep space add light but never coverage, so the canvas stays see-through and the backgrounds show on every device.
- The bloomed particle layer renders at 1×; the crisp phone layer at the full pixel ratio (capped at 1.5). Scroll-scrubbed motion uses only opacity and transforms. Minified three.js with module preloads, trimmed fonts.

## Tech

| Concern | Tool |
| --- | --- |
| 3D | [Three.js](https://threejs.org) r170 via ES-module import map (jsDelivr): custom particle shader, SVGLoader (chrome letters and the outlines the stars align to), an Earth shader (day, night, borders, land mask, clouds, atmosphere), screen-space orbit lines, ribbon geometry for the DNA with clipping-plane growth, a painted Milky Way with per-pixel stars, the `Water` addon, a procedural sky with a periodic cloud panorama render target, a soft sun bloom, a procedural chrome studio and RoomEnvironment through PMREM, bloom on the particle layer only (multisampled), `compileAsync` warm-up |
| Animation | [GSAP](https://gsap.com) 3.13 + ScrollTrigger (pinned story, typed titles, hand-over) |
| Smooth scroll | [Lenis](https://lenis.darkroom.engineering) 1.3 (jsDelivr) |
| Type | Geist, Geist Mono, Instrument Serif (Google Fonts) |
| Hosting | GitHub Pages (`.github/workflows/static.yml`) |

Everything is loaded from CDNs; there is no `package.json` and nothing to install. The stylesheet and scripts are referenced with a `?v=` query: bump it when you change them so browsers fetch the new files.

## Imagery and data

All public domain: the Earth's day map is NASA's Blue Marble Next Generation (July, with topography and bathymetry), its night lights NASA's Black Marble 2016, its clouds NASA's Blue Marble cloud composite, and its borders and coastlines Natural Earth 1:50m (via the `world-atlas` package), all re-encoded for the web in `assets/earth/`. The sea's normal map is from the three.js examples. The Milky Way, the clouds and the stars are generated.

## Local development

The scripts are ES modules, so the page must be served over HTTP (opening `index.html` directly will block them).

```bash
python -m http.server 8765
# then open http://127.0.0.1:8765/
```

## File structure

```
├── index.html             # The single page: loader, scene backgrounds, nav, pinned story, ending
├── styles.css             # Design tokens, components, responsive rules
├── js/
│   ├── scene.js           # Particle layer (forms, deep space, Earth + atom, DNA, galaxy, constellation, chrome letters) + product layer (phone, sky, sea, sun)
│   └── main.js            # Loader and hand-over, smooth scroll, typed titles, scroll story, ending, cursor
├── assets/
│   ├── HyaicoWhite.svg    # Wordmark — the UI, the loader, the constellation and chrome source, the ending
│   ├── HyaicoBlack.svg    # Wordmark (dark on light)
│   ├── JustCookedLogo.svg # Just Cooked logotype (icon + name), from the Just Cooked site
│   ├── Icon.svg           # Just Cooked app icon
│   ├── earth/             # day-4k / day-2k, night, clouds / clouds-1k, borders (R: countries, G: coasts), land mask
│   ├── waternormals.jpg   # Normal map for the sea (from the three.js examples)
│   ├── screens/           # Screen-only crops shown on the 3D phone (from the Just Cooked site)
│   ├── shots/home-980.webp # Framed phone shot used when WebGL is unavailable
│   ├── MainHero.png       # Just Cooked mockup (source material)
│   ├── favicon.svg        # The white H from the wordmark (+ favicon-32.png, apple-touch-icon.png, icon-512.png)
│   ├── og.png             # Social preview card (1200×630), the site's last frame
│   └── og-source.html     # Source for og.png — render at 1200×630 to regenerate
├── CONTEXT.md             # Design direction
└── README.md
```

## Editing

- The text beats live in `index.html` inside `#story`; when each appears and leaves is in `initStory()` in `js/main.js` (positions are fractions of the pinned scroll, which is `STORY_LEN` long); the typing pace is `TYPE_SPEED`.
- Where each form is held, the dive into the Earth, the spin into the galaxy, the light that becomes the sun, the stage and nightfall, the constellation, the chrome and the phone's screens are in `BEATS` and `applyState()` in `js/scene.js`; camera keyframes in `CAM` (the hero's is placed along the dive by `layout()`, see `DIVE`); the sky's day and night colours in `SKY` / `NIGHT`; the Earth's lighting in `EARTH_SUN` and its starting longitude in `SPIN0`; the atom in `RING_SPECS`; the Milky Way's course in `BAND`; sizes, the sun and the stage camera in `layout()`.
- The scene backgrounds are the `.scene-bg` layers in `styles.css`.
- The phone geometry and lighting follow the Just Cooked site's `js/scene.js`; to update its screens, drop new screen-only crops into `assets/screens/` with the same names.

## Browser support

Latest Chrome, Edge, Firefox and Safari on desktop and mobile. Without WebGL the page shows the text beats over the scene backgrounds and a framed phone shot; without JavaScript it is readable with no animation.
