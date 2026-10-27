# HYAICO Company Website — Design Direction

## Intent
HYAICO is a company of innovation; its first product is Just Cooked (justcooked.app). The site must say "innovative, thinks differently, built for the future" through how it looks and moves, not through copy. Almost no words. One continuous scroll-driven 3D story, with Just Cooked introduced naturally near the end and a real call to action at the close.

Things explicitly rejected in earlier versions and not to return: paragraphs of explanatory copy, "AI company" framing, a bright 3D object behind the hero title, a small or washed-out phone, a "process / steps" section, a scene with no purpose, a scene rail or scene labels, hard-edged ("boxy") loader highlights, an invented contact email or roadmap teasers, a phone that lingers behind the ending.

## Visual system
- **Theme:** near-black (`#06060a`), film grain at very low opacity, soft violet/cyan glow; warm orange only around Just Cooked.
- **Type:** Geist (headlines, weight 500, tight tracking) with Instrument Serif italic for the accent words, Geist Mono for the few labels. Keep this pairing.
- **Accents:** violet `#7c5cff`, cyan `#45e3ff`, green for "live", orange→red for Just Cooked.

## Structure (single page)
1. **Loader** — real wordmark (bold, filled) revealed by a soft light streak (feathered mask, no hard edge), glow pulse, counter line; the veil lifts to the particle wordmark, a flash and burst hand over. Centred at every viewport.
2. **Pinned story** (900% scroll) — forms held in order: planet horizon ("Built for *what's next*.") → double helix ("Things that *should exist*.", helix right of the text on desktop) → spiral galaxy ("Ideas, *in motion*.") → HYAICO in particles → particle halo around the phone ("Introducing Just Cooked", "Home cooking, *made easy*.", button). The phone is 74vh tall on desktop (50vh on phones), built to the Just Cooked site's spec with screen-only crops; its screen cross-fades Home → Next Meal → Recipe in the last stretch. Only HUD: a bottom-centre scroll cue that hides on first scroll.
3. **Ending** — "Start with *Just Cooked*." with App Store, Google Play and justcooked.app; giant masked wordmark with a light sweep; a bar with © HYAICO and the trademark line. The stage fades and the phone drops away as the ending arrives.

## Motion
- Scroll scrubs everything (Lenis + ScrollTrigger): forms hold, then blend; camera moves between keyframes; text beats fade with a blur.
- Hero title appears with masked line reveals after the loader; labels decode with a scramble.
- Particles carry individual parallax depth under the pointer; the camera moves only slightly. The phone follows the pointer with the Just Cooked site's resting tilt.
- Respects `prefers-reduced-motion` (loader skipped, forms still follow scroll).

## Performance
- Particles: 90k desktop / 36k phones, additive points in a custom shader, bloom only on fine-pointer devices.
- Pixel ratio capped (2 desktop, 1.5 phones). Rendering pauses when the tab is hidden.
- No build step; pinned CDN versions.

## Constraints
- Static files only, deployable to GitHub Pages; relative asset paths; serve over HTTP locally (ES modules).
