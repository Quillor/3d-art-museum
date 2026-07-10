# neolithic — middle-east-neolithic (Hallway 14)

## Ratings (1-5, 5 = matches concept at a glance)
- texture_fidelity: 2 — ochre band and reed ceiling are strong, but the dominant wall surface reads as speckled aggregate/cork (not lime plaster) and the floor is washed-out and smooth with visible tile seams.
- palette_harmony: 4 — cohesive warm ochre/tan/red family matching the concept, marred only by an over-saturated orange floor and off-palette green-yellow flecks in the wall texture.
- architecture_match: 4 — log beams, reed ceiling plane, stepped parapet trim, arched niches, and mudbrick-toned thresholds all echo the concept; missing the raised side platforms and rounded/battered portal profiles.
- decor_props_match: 3 — lit niches with vessels and era-appropriate artworks/labels are present, but each niche holds the same flat-shaded plain pot; no painted pottery clusters or baskets from the sheet.
- entrance_signage: 2 — small black plaques flank the threshold but are illegible at the door; no readable room-title sign in entrance_out or entrance_in.

## Defects
- [MAJOR] (texture-wrong) Walls, all views (wall_left, wall_right, entrance_out, exit_out): lime-plaster mudbrick walls render as a busy uniform speckle with dark pebble inclusions and greenish-yellow flecks — reads as terrazzo/cork/conglomerate stone rather than smooth creamy lime plaster over mudbrick as in the concept sheet.
- [MAJOR] (texture-flat/cartoon) Floor (floor.jpg, exit_out): packed-clay floor reads smooth and airbrushed — the crack/impression detail of `neolithic_floor.jpg` is washed out at eye height, leaving soft blotches on a saturated orange plane; no reed-impression or packed-earth grain reads.
- [MAJOR] (other) Floor tiling grid (floor.jpg, exit_out): straight seam lines form a visible grid across the floor. The source `assets/textures/neolithic_floor.jpg` is itself a 3x3 collage with hard internal edges, so every tile repeat prints a grid of seams in-scene. (These are repeat/collage edges, not mirror reflections.)
- [MAJOR] (signage) Entrance threshold (entrance_out, entrance_in): no legible room title at the door; only small black plaques whose text is unreadable at threshold distance, and no era name anywhere on the portal.
- [POLISH] (texture-flat/cartoon) Niche vessels (wall_left, wall_right): every niche holds the same flat-shaded, unpatterned orange pot that reads low-poly and slightly glowing; concept shows painted geometric ceramics and baskets.
- [POLISH] (texture-flat/cartoon) Ceiling log beams (ceiling.jpg, exit_out): beams are featureless near-black cylinders with no wood grain or smoke-stain variation; they read as flat black plastic tubes.
- [POLISH] (architecture-missing) Raised side platforms with concealed floor uplighting from the concept corridor panel are absent (wall_left, floor.jpg); light instead comes from a large glowing ceiling disk (entrance_out, exit_out, ceiling.jpg) that reads as a flat glow decal.
- [POLISH] (texture-wrong) Wall-base trim/bench rail (floor.jpg, wall_left, wall_right): reads as streaky light wood plank rather than a plastered mud bench sharing the wall's plaster family per the concept/README.
- [POLISH] (other) Ochre band vertical framing (wall_left, wall_right): the band's UV window crops the texture's bottom register — the large antlered stag heads — down to tiny antler tips, so the texture's most striking motif barely reads. Not a flip; the visible tips are upright.

## Hero element
Yes — the new red-ochre animal-procession band (deer and cattle registers) running high around the entire room just below the smoke-dark beams is instantly recognizable and matches the concept's ochre-band placement; the warm lit arched niches with vessels reinforce it. It would be even stronger if the clipped stag-head register were framed into view.

## Signage
Not legible. entrance_out shows only small dark plaques at the jambs plus exhibit labels inside (the large info board's heading appears to read "Göbekli Tepe" but is barely resolvable, and it is an artwork label, not a room sign). entrance_in shows no title sign at all — the only readable text through the doorway is the distant lobby floor medallion ("MUSEUM OF ART", seen reversed from this side). No room-title text is quotable at the threshold.

## FLUX texture flip check (special attention)
- Ochre-figures band: all three registers are upright and match the source `assets/textures/neolithic_ochre_figures.png` orientation — top deer walk right, middle cattle walk right, bottom stag antler tips point up. Procession direction is consistent along each wall with no facing-pair (left-right mirror) seams and no horizontal mirror seam mid-panel.
- Floor: no figurative or directional content; nothing flipped or mirrored (only the collage/tiling grid seams noted above).
