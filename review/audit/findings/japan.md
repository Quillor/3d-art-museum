# japan — asia-japan (Hallway 23)

> **ARCHIVED BASELINE — DO NOT USE AS CURRENT TASK INPUT.** Superseded by
> `review/final-audit/`, `concept-art/room-designs.json`, and the current runtime.

## Ratings (1-5, 5 = matches concept at a glance)
- texture_fidelity: 2 — floor wood grain is passable, but timber framing, beams, and shoji panels are flat untextured color fills, and the new hanging-scroll texture renders blown out to near-blank white.
- palette_harmony: 4 — cream shoji + dark timber + warm reddish wood floor lands squarely in the concept palette, though the room runs brighter/higher-key than the concept's dim shoin mood.
- architecture_match: 3 — exposed beam-and-plank ceiling, shoji-grid upper walls, tokonoma niches, and a stone threshold step are all present; missing tatami side platforms and wooden transoms, and the exit wall wears the neighbor era's facade.
- decor_props_match: 3 — strong era-correct artwork (Great Wave, Wind God & Thunder God, Pine Trees, Irises, Great Buddha photo) plus niche vases, but the kakemono scrolls are illegible and concept props (plants, lantern, floor uplights) are absent.
- entrance_signage: 2 — no room-title sign is visible or legible at Japan's threshold in either entrance view.

## Defects
- [MAJOR] (bare-surface) Hanging scroll (kakemono) in both tokonoma niches (wall_left.jpg, wall_right.jpg): the newly shipped FLUX scroll texture is washed out to a near-blank glowing panel. The right-wall niche shows only a ghost of faint horizontal lines; the left-wall niche shows a faint beige blocky patch that does not read as a landscape scroll. Likely overbright niche emissive/bloom crushing the texture, or the texture failing to bind. Because almost no image content renders, scroll orientation could not be verified — no upside-down placement and no horizontal mirror seam are visible, but neither can be confirmed until the scroll actually displays.
- [MAJOR] (other) Neighbor-era facade bleed on Japan's exit wall (entrance_out.jpg): the exit portal inside Japan is dressed with the next room's red-orange cusped ogee-arch trim and two gold jali lattice panels instead of the concept's timber/shoji threshold treatment (the known tall-facade neighbor gotcha).
- [MAJOR] (texture-flat/cartoon) Timber posts, rails, lintels, and ceiling beams (ceiling.jpg, wall_left.jpg, wall_right.jpg) are uniform flat dark-brown fills with no grain or roughness, and the shoji panels are plain cream with no paper texture or translucency — below the "photoreal materials, not flat cartoon shading" bar. Ceiling plank grain is painterly streaks.
- [MAJOR] (signage) No Japan title sign at the entrance threshold (entrance_out.jpg, entrance_in.jpg — bare timber lintel, no plaque); the plaque above the far exit portal (entrance_out.jpg) has gold text that is illegible at corridor distance.
- [POLISH] (lighting) Uniform bright-white gap strips run between the top of the shoji walls and the ceiling slab on both sides (ceiling.jpg, wall_left.jpg, exit_out.jpg) — reads as a light leak / unmodeled seam rather than the concept's wooden ranma transoms.
- [POLISH] (decor-missing) No tatami display zones or raised side platforms along the walkway (floor.jpg); only the niche bases carry tatami texture. Concept threshold props — wall lantern, plants/ikebana, floor uplights — are also absent from all views.

Directional/figurative texture check (no flips found): The Great Wave off Kanagawa (wall_left.jpg, exit_out.jpg) is upright and unmirrored — title cartouche correctly at top-left, wave curling left-to-right. Wind God and Thunder God (wall_right.jpg) has correct panel order — pale Raijin with black ribbons on the left panel, green Fūjin with pale wind-bag arc on the right — and is upright. Pine Trees (wall_left.jpg) is upright. No upside-down textures and no horizontal mirror seams observed anywhere in the room.

## Hero element
Partially. The concept's signature element — a tokonoma alcove displaying a hanging mountain-landscape scroll (kakemono) — is architecturally present as dark-timber framed niches with tatami bases and vases on both walls, but each currently reads as an empty glowing lightbox because the scroll texture is blown out to blank. Until the scroll renders, the room's de facto signature is the shoji-grid timber corridor plus the Great Wave print. Fixing the kakemono display restores the intended hero from the concept sheet.

## Signage
No. Neither entrance_out.jpg nor entrance_in.jpg shows any room-title sign at Japan's threshold — the entrance portal is bare dark timber. The plaque over the far exit portal inside the room (entrance_out.jpg) carries gold text too small/blurred to read. The only legible sign in any capture is "INTO THE MODERN ERA" (exit_in.jpg), which hangs at the far end of the NEXT room, not at Japan's threshold. No readable Japan title text can be quoted.
