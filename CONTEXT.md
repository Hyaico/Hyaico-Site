# HYAICO Company Website — Design Direction

## Positioning
HYAICO is a company of innovation. It exists to create the things that should already exist, and to make them genuinely helpful to people. Its first product is Just Cooked (justcooked.app). The site should feel like a premium, future-facing technology company: calm, confident, cinematic, with scientific and robotic details in the finish. One page, no clutter, every element deliberate. HYAICO is not positioned as an AI company; do not frame it that way.

## Visual system
- **Theme:** Deep obsidian dark (`#06060a`) with soft violet/cyan light leaks, film grain at very low opacity, dot-grid backdrops on technical sections.
- **Accents:** Violet `#7c5cff` and cyan `#45e3ff` for HYAICO; green `#5dff9a` for "live" status. Warm orange→red (`#ff6500` → `#ff1500`) is reserved for Just Cooked, matching its icon.
- **Type:** Geist (display + body, tight tracking, weight 500 for headlines), Instrument Serif italic for accent words, Geist Mono for HUD labels, numbering and telemetry (`01 | Vision`, `SYS // ONLINE`).
- **HUD language:** corner brackets, `//` separators, scramble-in labels, live readouts (clock, renderer, FPS), scan lines, radar sweeps, blueprint grids.
- **Shape:** Large radii (28px cards, pill buttons), 1px hairline borders at 8–16% white, glass surfaces with backdrop blur.
- **Layout:** 1440px max container, fluid gutters, generous section spacing (96–200px). Headlines use `clamp()` for fluid sizing.

## Page structure (single page, in order)
1. **Preloader** — HYAICO wordmark drawn stroke by stroke, light-sweep fill, counter, scrambling status readouts, corner brackets and a scan line; exits through a seam of light and a top/bottom shutter split (skipped for reduced motion; fails open after 6s).
2. **Navigation** — floating pill: wordmark left, links centre, "Just Cooked" CTA right. Hides on scroll down, returns on scroll up. Hamburger + full-screen menu on mobile.
3. **Hero** — 3D scene: the chrome HYAICO wordmark assembling in front of a glass core, rings, satellites, wireframe shell, holographic grid floor, particles, travelling light. Headline "We create what should *already exist*." Two CTAs. Scroll cue and live telemetry.
4. **Marquee** — keyword ticker.
5. **Vision** — manifesto paragraph that brightens word by word on scroll; three principles: Innovate, Create, Help people.
6. **What we do** — bento grid: blueprint "gap → product" build loop, design-led engineering, built to help, shipped not slide-decked, modern tools ticker. HUD brackets appear on hover.
7. **Products** — Just Cooked: icon, kicker, tagline "Home cooking, *made easy*.", description, orange CTA; 3D handset stage with HUD labels, "JC" watermark and drag-to-rotate.
8. **Process** — four panels (Spot, Design, Build, Ship & refine), pinned horizontal scroll on desktop, stacked on mobile.
9. **What's next** — closing statement with radar sweep and pointer-following glow; Just Cooked and back-to-top buttons.
10. **Footer** — brand, link columns, giant masked wordmark with a light sweep rising on scroll, copyright. No contact email is published.

## Motion principles
- Reveal, don't bounce: masked line reveals and 30–40px fades with `power3/power4` easing; labels decode with a scramble.
- Scroll-linked effects are subtle and scrubbed (manifesto, hero parallax, process track, footer wordmark).
- Pointer effects (cursor, magnetic buttons, spotlight cards, phone tilt) are enabled only on fine-pointer devices; drag-to-rotate works on touch too.
- Everything respects `prefers-reduced-motion`.

## Performance rules
- Both 3D scenes render only while in view and while the tab is visible; the phone scene initialises lazily as the section approaches.
- Device pixel ratio is capped (2 on desktop, 1.25–1.5 on phones); hero bloom is disabled on touch devices and auto-disabled if frame times exceed ~28ms.
- No build step; all libraries load from CDNs with pinned versions.

## Technical constraints
- Static HTML/CSS/JS only, deployable to GitHub Pages as-is.
- Relative asset paths (the site may live under a sub-path).
- Scripts are ES modules: serve over HTTP for local development.
