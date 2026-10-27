# HYAICO Company Website — Design Direction

## Intent
HYAICO is a company of innovation; its first product is Just Cooked (justcooked.app). The site must say "innovative, thinks differently, built for the future" through how it looks and moves, not through copy. Almost no words. One continuous scroll-driven 3D story that mixes particles with real geometry, with Just Cooked introduced naturally in the middle-late stretch (that is where its download links live) and HYAICO itself as the closing image.

Things explicitly rejected in earlier versions and not to return: paragraphs of explanatory copy, "AI company" framing, a bright 3D object behind the hero title, a plain sphere of particles as the hero (it is a solid globe with continents and atom orbits), a wireframe-only globe, a helix that forms in the centre and slides over (it forms where it lives), a helix drawn as flat additive ribbons wrapped in particle fuzz (it is glossy geometry: backbones, rungs, nodes), particle effects on or coming off the chrome HYAICO, a small, washed-out, hazy or pixelated phone (anti-aliasing on; no bloom or tone mapping on its screen; a screen image that pokes past the rounded glass), circles or rings of light and dust clouds around the phone, a starfield or light column behind the phone, a Tron-style grid floor, a horizon band or floor edge that reads as a horizontal split, copy hugging the far left of the phone beat, a small grey tagline and heavy white store buttons on the phone beat, particle-only scenes with nothing else in them, a scene with no purpose, a scene rail or scene labels, soft blurry "highlight" reveals in the loader (the laser scan is the one that works), a hard rectangle behind the loader logo (never combine a filter with a mask on one element), a loader counter whose width changes and shrinks the bar, any burst, flash or explosion on hand-over, anything of the next scene visible before the veil lifts, a Just Cooked button in the nav, a coloured-tile favicon, an invented contact email or roadmap teasers, a phone that lingers behind the ending, a product CTA as the final frame, a particle version of the wordmark as the ending (the faint masked wordmark with the light sweep is the one they like), a two-tone ending background with an ellipse glow (one continuous wash), the typed "Just Cooked" name instead of the logotype, the tagline "Home cooking, made easy" (it is "For when food feels hard."), a laggy or offset cursor.

## Visual system
- **Theme:** near-black (`#06060a`), film grain at very low opacity (no blend mode), soft violet/cyan glow; warm orange only in the Just Cooked beat (logotype, tagline accent, horizon).
- **Type:** Geist (headlines, weight 500, tight tracking) with Instrument Serif italic for the accent words, Geist Mono for the few labels. Keep this pairing.
- **Accents:** violet `#7c5cff`, cyan `#45e3ff`, green for "live", Just Cooked orange `#e94b1f`, warm `#ff8a5c`, cream `#fbf6ec` (from the Just Cooked site's tokens).
- **Logos:** `HyaicoWhite.svg` everywhere for HYAICO (nav, loader, particles, chrome, ending); `JustCookedLogo.svg` (the rebranded logotype) in the phone beat. Favicon: the white H from the wordmark on a transparent background.

## Structure (single page)
1. **Loader** — real wordmark scanned in by a thin laser (tight feathered mask), glow pulse from a blurred copy, counter line with a fixed-width counter; the logo lifts away and the veil clears while the globe rises into place behind it. Nothing bursts.
2. **Pinned story** (900% scroll) — forms held in order, each with geometry of its own, every change swirling into the next:
   - a solid globe (dark lit body, dot-grid continents from a land mask, atmosphere rim, latitude/longitude lines; everything on its far side hides behind the body) with three atom orbits whose electrons trail comet tails, under "Built for *what's next*." The planet sets below the frame as its particles leave.
   - DNA helix (two glossy backbones, colour-paired base rungs, nodes at the joints; grown with clipping planes from the bottom up as the particles arrive bottom-first, dissolved the same way) right of "Things that *should exist*." on desktop with a slight lean, below it and smaller on phones
   - spiral galaxy with a bright core under "Ideas, *in motion*."
   - the stage: dust far behind, a seamless night cyclorama (the floor's far edge takes the horizon's colour so wall and floor meet without a seam) with a warm horizon behind the phone, a dark mirror floor (Reflector) the phone rises through which also catches the horizon's reflection far back; beside it the Just Cooked logotype, "For when *food feels hard*." as a display line with warm serif italics, three bars that follow which screen the phone is showing, a cream App Store button, a glass Google Play button and justcooked.app, set in from the edge close to the phone and built up piece by piece. The phone is 72vh tall on desktop (47vh on phones), built to the Just Cooked site's spec with its screen-only crops on a rounded screen, drawn in its own anti-aliased pass with no bloom or tone mapping; the screen cross-fades Home → Next Meal → Recipe while it is up. The reflection lies on the floor in front of the phone, dimmed and short (shorter on phones so it never runs under the text).
   - HYAICO written in particles, then the bevelled chrome HYAICO takes over completely with a travelling light (that light exists for the metal only); the particles are gone while it is metal
   Only HUD: a bottom-centre scroll cue that hides on first scroll.
3. **Ending** — the chrome HYAICO glides down and becomes the faint masked wordmark (bottom fade, light sweep) as it fades in; centred in the space above it, a HYAICO eyebrow and a big "Built for *what's next*." that draws a violet-to-cyan underline; one continuous background that lifts very gently toward the foot; a bar with © HYAICO, the trademark line and back to top.

## Motion
- Scroll scrubs everything (Lenis + ScrollTrigger): forms hold, then blend with a swirl; camera moves between keyframes; titled beats rise out of line masks and leave upward; the Just Cooked block staggers in.
- Hero title appears with masked line reveals (pre-split before the hand-over); labels decode with a scramble.
- Particles carry individual parallax depth under the pointer; the camera moves only slightly and stops moving as the ending lands. The phone follows the pointer with the Just Cooked site's resting tilt.
- Cursor: dot pinned to the pointer, ring follows tightly, crosshair centred.
- Respects `prefers-reduced-motion` (loader skipped, forms still follow scroll).

## Performance
- Particles: 60k desktop / 28k phones, additive points in a custom shader; helix, galaxy and dust forms are built after the first frame. Bloom only on fine-pointer devices, only on the particle layer, through a 4× multisampled target. The mirror renders at 1024×512 (512×256 on phones). Phones get a coarser (1.5°) continent grid and a brighter self-lit helix in place of bloom.
- Renderer anti-aliasing on; pixel ratio capped at 1.5. Rendering pauses when the tab is hidden.
- No build step; pinned CDN versions.

## Constraints
- Static files only, deployable to GitHub Pages; relative asset paths; serve over HTTP locally (ES modules).
