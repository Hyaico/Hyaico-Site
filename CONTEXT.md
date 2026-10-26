# HYAICO Company Website — Design Direction

## Positioning
HYAICO is an applied-AI studio that builds AI-native consumer products. The site should feel like a premium, well-funded technology company: calm, confident, cinematic. One page, no clutter, every element deliberate.

## Visual system
- **Theme:** Deep obsidian dark (`#06060a`) with soft violet/cyan light leaks. Film grain overlay at very low opacity.
- **Accents:** Violet `#7c5cff` and cyan `#45e3ff` for HYAICO. Warm orange→red (`#ff6500` → `#ff1500`) is reserved for Just Cooked, matching its app icon.
- **Type:** Geist (display + body, tight tracking, weight 500 for headlines), Instrument Serif italic for accent words, Geist Mono for small uppercase labels and numbering (`01 | Vision`).
- **Shape:** Large radii (28px cards, pill buttons), 1px hairline borders at 8–16% white, glass surfaces with backdrop blur.
- **Layout:** 1440px max container, fluid gutters, generous section spacing (96–200px). Headlines use `clamp()` for fluid sizing.

## Page structure (single page, in order)
1. **Preloader** — monogram draw, 0→100 counter, curtain wipe (skipped for reduced motion; fails open after 5s).
2. **Navigation** — floating pill: wordmark left, links centre, "Just Cooked" CTA right. Hides on scroll down, returns on scroll up. Hamburger + full-screen menu on mobile.
3. **Hero** — 3D scene (glass orb containing the chrome "H" monogram, rings, satellites, particles, bloom). Headline "Intelligence, *made everyday*." Two CTAs. Scroll cue and "Now shipping" status.
4. **Marquee** — keyword ticker.
5. **Vision** — manifesto paragraph that brightens word by word on scroll; three principles.
6. **What we do** — bento grid: looping "ingredients → recipe" demo, design-led engineering, private by design, shipped not slide-decked, model stack ticker.
7. **Apps** — Just Cooked feature with 3D tilting phone mockup, "JC" watermark/monogram, feature list, orange CTA to justcooked.app. "App 02" teaser card.
8. **Process** — four panels (Observe, Model, Ship, Repeat), pinned horizontal scroll on desktop, stacked on mobile.
9. **Contact** — large CTA with pointer-following glow; email and Just Cooked buttons.
10. **Footer** — brand, link columns, giant faded wordmark, copyright.

## Motion principles
- Reveal, don't bounce: masked line reveals and 30–40px fades with `power3/power4` easing.
- Scroll-linked effects are subtle and scrubbed (manifesto, hero parallax, process track).
- Pointer effects (cursor, magnetic buttons, spotlight cards, phone tilt) are enabled only on fine-pointer devices.
- Everything respects `prefers-reduced-motion`.

## Performance rules
- 3D renders only while the hero is in view and the tab is visible.
- Device pixel ratio is capped (2 on desktop, 1.25 on phones); bloom is disabled on touch devices and auto-disabled if frame times exceed ~28ms.
- No build step; all libraries load from CDNs with pinned versions.

## Technical constraints
- Static HTML/CSS/JS only, deployable to GitHub Pages as-is.
- Relative asset paths (the site may live under a sub-path).
- Scripts are ES modules: serve over HTTP for local development.
