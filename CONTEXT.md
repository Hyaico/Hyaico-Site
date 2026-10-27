# HYAICO Company Website — Design Direction

## Intent
HYAICO is a company of innovation; its first product is Just Cooked (justcooked.app). The site must say "innovative, thinks differently, built for the future" through how it looks and moves, not through copy. Almost no words. One continuous scroll-driven 3D story, with Just Cooked introduced naturally near the end (that is where its download links live) and HYAICO itself as the closing image.

Things explicitly rejected in earlier versions and not to return: paragraphs of explanatory copy, "AI company" framing, a bright 3D object behind the hero title, a small, washed-out or hazy phone (no bloom or tone mapping on its screen), a "process / steps" section, a scene with no purpose, a scene rail or scene labels, soft blurry "highlight" reveals in the loader (the laser scan is the one that works), a hard rectangle behind the loader logo (never combine a filter with a mask on one element), an invented contact email or roadmap teasers, a phone that lingers behind the ending, a product CTA as the final frame, the typed "Just Cooked" name instead of the logotype, a laggy or offset cursor.

## Visual system
- **Theme:** near-black (`#06060a`), film grain at very low opacity (no blend mode), soft violet/cyan glow; warm orange only around Just Cooked.
- **Type:** Geist (headlines, weight 500, tight tracking) with Instrument Serif italic for the accent words, Geist Mono for the few labels. Keep this pairing.
- **Accents:** violet `#7c5cff`, cyan `#45e3ff`, green for "live", Just Cooked orange `#e94b1f`.
- **Logos:** `HyaicoWhite.svg` everywhere for HYAICO; `JustCookedLogo.svg` (the rebranded logotype) for Just Cooked in the nav pill and the phone beat.

## Structure (single page)
1. **Loader** — real wordmark scanned in by a thin laser (tight feathered mask), glow pulse from a blurred copy, counter line; the veil lifts to the particle wordmark, a flash and burst hand over. Centred at every viewport.
2. **Pinned story** (900% scroll) — forms held in order: planet horizon ("Built for *what's next*.") → double helix ("Things that *should exist*.", helix right of the text on desktop) → spiral galaxy ("Ideas, *in motion*.") → HYAICO in particles → dust around the phone with the Just Cooked logotype, "Home cooking, *made easy*.", App Store, Google Play and justcooked.app. The phone is 74vh tall on desktop (50vh on phones), built to the Just Cooked site's spec with its screen-only crops, drawn in its own pass with no bloom or tone mapping on the screen; the screen cross-fades Home → Next Meal → Recipe in the last stretch. Only HUD: a bottom-centre scroll cue that hides on first scroll.
3. **Ending** — the phone drops away and the particles gather into a giant glowing HYAICO locked onto the wordmark at the foot of the page, under "Built for *what's next*."; a bar with © HYAICO, the trademark line and back to top.

## Motion
- Scroll scrubs everything (Lenis + ScrollTrigger): forms hold, then blend; camera moves between keyframes; text beats fade with a blur.
- Hero title appears with masked line reveals (pre-split before the hand-over so nothing heavy runs during the burst); labels decode with a scramble.
- Particles carry individual parallax depth under the pointer; the camera moves only slightly. The phone follows the pointer with the Just Cooked site's resting tilt.
- Cursor: dot pinned to the pointer, ring follows tightly, crosshair centred.
- Respects `prefers-reduced-motion` (loader skipped, forms still follow scroll).

## Performance
- Particles: 60k desktop / 28k phones, additive points in a custom shader; helix, galaxy and halo forms are built after the first frame. Bloom only on fine-pointer devices, only on the particle layer.
- Pixel ratio capped at 1.5. Rendering pauses when the tab is hidden.
- No build step; pinned CDN versions.

## Constraints
- Static files only, deployable to GitHub Pages; relative asset paths; serve over HTTP locally (ES modules).
