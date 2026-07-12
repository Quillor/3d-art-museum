# baroque — europe-baroque (Hallway 10)

> **ARCHIVED BASELINE — DO NOT USE AS CURRENT TASK INPUT.** Superseded by
> `review/final-audit/`, `concept-art/room-designs.json`, and the current runtime.

## Ratings (1-5, 5 = matches concept at a glance)
- texture_fidelity: 3 — the red damask wall panels have a genuine woven-fabric read (best material in the wing) and floor medallions reuse it well; parquet is flat toon fills, wainscot is a flat brown band, and ceiling beams are flat gold.
- palette_harmony: 4 — deep red / gilt / dark walnut / honey parquet is the strongest palette match of the four rooms; the bright white-gold ceiling and heavy bloom break the concept's dim theatrical salon mood.
- architecture_match: 3 — gilded picture-rail bays, walnut wainscot line, coffered ceiling grid, chandeliers, and sconces are all present; the concept's vaulted stucco ceiling with fresco cartouches and the gilded arched portal crest are absent.
- decor_props_match: 3 — chandeliers, wall sconces, gilt oval cartouches, and parquet inlay medallions punctuate the room as in the concept, but all are stylized simple geometry and the ovals hold blank panels.
- entrance_signage: 1 — no legible baroque title sign in any provided view, from either side of the entrance threshold.

## Defects
- [MAJOR] (texture-wrong) Entrance portal jambs/reveals (entrance_out and entrance_in near-frame; also renaissance/exit_out, exit_in) show the damask texture massively stretched into vertical streaks with noisy ghost motifs — reads as smeared red wood/ikat, a clear UV-scale failure on the threshold geometry.
- [MAJOR] (other) Most artwork panels render as black rectangles with caption text in exit_out (e.g., "Girl with a Pearl Earring" legible on an empty black panel), while wall_left/wall_right show the same rail fully loaded (Ecstasy of Saint Teresa, Las Meninas, The Night Watch, The Milkmaid) — images had not streamed in for that capture.
- [MAJOR] (texture-flat/cartoon) Ceiling beams are broad flat gold fields between plain cream coffers (ceiling.jpg, entrance_out); the README avoid-list explicitly names "oversized gold fields", and the available baroque_ceiling_fresco accent appears nowhere overhead.
- [POLISH] (texture-flat/cartoon) Parquet herringbone (floor.jpg) is flat honey-toned chevron fills with outline seams — no wood grain or wear; the red damask inlay medallions themselves read well.
- [POLISH] (texture-flat/cartoon) Walnut wainscot zone (wall_left, wall_right, exit_out) is a flat dark-brown band with a faint damask ghost — no carved paneling or wood grain as in the concept.
- [POLISH] (bare-surface) Gilt oval cartouches on the walls contain a blank white/cream rectangle (wall_right, entrance_out) — reads as an untextured mirror/plaque placeholder.
- [POLISH] (decor-missing) Chandeliers are stylized gold rings with stub candle arms (entrance_out, ceiling.jpg) — closer to a modern Sputnik fixture than the concept's tiered candle chandeliers.
- [POLISH] (lighting) Ceiling bloom washes out the coffer grid and chandelier detail (ceiling.jpg, entrance_out); the concept is markedly dimmer with warm pooled light.

Directional-texture check: the damask motif is bilaterally symmetric, so wall tiling shows natural butterfly repeats rather than objectionable mirror seams; no upside-down motifs on walls or floor medallions. The only damask failure is the stretched threshold jambs noted above. Ceiling coffers are plain — nothing to flip.

## Hero element
Yes — the continuous red damask walls with gilded picture rails over dark wainscot read instantly as a Baroque palace salon and match the concept's core "damask wall bay" language. The gilded arched portal with cartouche crest (concept panel 2) is the strongest unbuilt candidate to complete the threshold moment.

## Signage
Not visible. No baroque title sign appears in entrance_out (framed by the stretched red jambs) or entrance_in (looking back into renaissance); the exit_in view shows only a tiny illegible dark plaque above the next room's far doorway. No readable text to quote.
