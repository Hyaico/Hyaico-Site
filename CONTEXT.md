# HYAICO Company Website — Design Direction

## Intent
HYAICO is a company of innovation; its first product is Just Cooked (justcooked.app). The site must say "innovative, thinks differently, built for the future" through how it looks and moves, not through copy. Almost no words. One continuous scroll-driven 3D story, with Just Cooked introduced naturally near the end.

Things that were explicitly rejected in earlier versions and must not return: paragraphs of explanatory copy, "AI company" framing, a bright 3D object behind the hero title, a small phone, a "process / steps" section, an invented contact email or roadmap teasers, a loader that is not perfectly centred.

## Visual system
- **Theme:** near-black (`#06060a`), film grain at very low opacity, soft violet/cyan glow.
- **Type:** Geist (headlines, weight 500, tight tracking) with Instrument Serif italic for the accent words, Geist Mono for the few HUD labels. Keep this pairing.
- **Accents:** violet `#7c5cff`, cyan `#45e3ff`, green for "live". Orange→red only for Just Cooked.

## Structure (single page)
1. **Loader** — the real HYAICO wordmark (bold, filled) revealed by a light beam, centred, thin progress line + counter. Hands over to the particle wordmark.
2. **Pinned story** (720% scroll) — one particle system morphing: wordmark → planet horizon (hero: "Built for *what's next*.") → double helix ("Things that *should exist*.") → flowing field → HYAICO in particles → phone silhouette into which the modelled phone appears ("Introducing Just Cooked", "Home cooking, *made easy*.", button). Scene rail and label as the only HUD.
3. **Outro** — "Built for *what's next*." and the giant masked wordmark with a light sweep; a minimal bar (© year, Just Cooked, back to top).

## Motion
- Scroll scrubs everything (Lenis + ScrollTrigger): particle morphs hold then transition inside each segment, camera moves between keyframes, text beats fade with a blur.
- Hero title appears with masked line reveals after the loader; labels decode with a scramble.
- Pointer parallax on the camera; the phone tilts with the pointer.
- Respects `prefers-reduced-motion` (loader skipped, forms still follow scroll).

## Performance
- Particles: 90k desktop / 36k phones, additive points in a custom shader, bloom only on fine-pointer devices.
- Pixel ratio capped (2 desktop, 1.5 phones). Rendering pauses when the tab is hidden.
- No build step; pinned CDN versions.

## Constraints
- Static files only, deployable to GitHub Pages; relative asset paths; serve over HTTP locally (ES modules).
