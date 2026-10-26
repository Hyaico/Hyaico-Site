# HYAICO — Company Website

A single-page, cinematic site for HYAICO: dark, type-led, with a real-time 3D hero and scroll-driven motion. Built with plain HTML, CSS and JavaScript so it deploys straight to GitHub Pages with no build step.

## Highlights

- **3D hero** — a refractive glass orb holding a chrome "H" monogram (extruded from the wordmark), orbital rings, satellites, a particle field and bloom. Reacts to the pointer and to scroll; degrades to a CSS orb if WebGL is unavailable.
- **Motion system** — preloader with counter, masked line reveals (GSAP SplitText), scroll reveals, a scrub-to-brighten manifesto, a pinned horizontal "process" section on desktop, a looping product demo, magnetic buttons, spotlight cards and a custom cursor.
- **Smooth scroll** — Lenis, synced with GSAP ScrollTrigger. Native scrolling on touch devices.
- **Just Cooked showcase** — 3D-tilting phone mockup, "JC" watermark and direct links to [justcooked.app](https://justcooked.app).
- **Responsive** — stacked layouts, full-screen menu and a lighter 3D budget on phones. Respects `prefers-reduced-motion`.

## Tech

| Concern | Tool |
| --- | --- |
| 3D | [Three.js](https://threejs.org) r170 via ES-module import map (jsDelivr) |
| Animation | [GSAP](https://gsap.com) 3.13 + ScrollTrigger + SplitText (cdnjs) |
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
│   ├── scene.js           # Three.js hero scene (ES module)
│   └── main.js            # Preloader, smooth scroll, reveals, menus, cursor
├── assets/
│   ├── HyaicoBlack.svg    # Wordmark (dark on light)
│   ├── HyaicoWhite.svg    # Wordmark (light on dark) — used on the site
│   ├── Icon.svg           # Just Cooked app icon
│   ├── favicon.svg        # "H" monogram favicon
│   ├── og.png             # Social preview card (1200×630)
│   └── og-source.html     # Source for og.png — render at 1200×630 to regenerate
├── CONTEXT.md             # Design direction and requirements
└── README.md
```

## Editing content

- Copy lives in `index.html`; sections are marked with `<!-- ============ NAME ============ -->` comments.
- Colours, fonts, radii and spacing are CSS custom properties at the top of `styles.css`.
- The contact address (`hello@hyaico.com`) appears in the Contact section and footer of `index.html`.
- To add another app, duplicate the `.apps__next` card in the Apps section or extend the `.jc` block.

## Browser support

Latest Chrome, Edge, Firefox and Safari on desktop and mobile. Without WebGL the hero shows a static CSS glow; without JavaScript the page is fully readable with no animation.
