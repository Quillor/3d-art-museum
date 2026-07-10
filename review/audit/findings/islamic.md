# islamic — middle-east-islamic (Hallway 17)

## Ratings (1-5, 5 = matches concept at a glance)
- texture_fidelity: 2 — the upper star-pattern frieze reads as genuine arabesque, but dado/floor are generic square-grid "pool tile" instead of zellij star-and-polygon, and the ceiling is a blank glow.
- palette_harmony: 3 — cream + teal + gold family broadly matches the concept, but the tile is a single flat saturated teal (close to the "saturated synthetic blue" the README forbids) versus the concept's multi-tone teal/blue/ochre zellij.
- architecture_match: 2 — no pointed/horseshoe arch anywhere, no muqarnas ceiling pockets, no mashrabiya screens; only the stepped white cornice cubes gesture at muqarnas.
- decor_props_match: 2 — one brass lamp visible (wall_left); no brass vessels on pedestals, and the dark wall panels intended as wooden screens read as flat near-black slabs.
- entrance_signage: 1 — no room title sign visible at either threshold in any view.

## Defects
- [BLOCKER] (architecture-missing) Portal is still a plain fallback: the entrance is a flat rectangular teal frame with a flat dark lintel — no pointed, horseshoe, or muqarnas arch (entrance_out, entrance_in); the exit portal is likewise rectangular with stepped blocks on top (exit_in). The concept's signature "Pointed Arch Entrance Portal" is absent.
- [MAJOR] (texture-wrong) Dado and floor runners/medallions use a plain teal square-grid tile with gold grout — reads as bathroom/pool tile, not the zellij star-and-polygon mosaic called for by the concept (wall_left, wall_right, floor).
- [MAJOR] (bare-surface) Ceiling is a completely blank cream surface washed out by a yellow light gradient — no muqarnas cells, no texture at all (ceiling, also visible in entrance_out/exit_out).
- [MAJOR] (texture-wrong) Exit portal jamb faces show severely stretched/smeared vertical streaks (edge-pixel clamping artifact) instead of a readable arabesque pattern (exit_in, both jambs).
- [MAJOR] (signage) No era title sign at the threshold — nothing readable above or beside the entrance in entrance_out/entrance_in; the only legible sign anywhere ("INTO THE MODERN ERA") belongs to the next hallway, seen through the exit in exit_in.
- [MAJOR] (other) Artwork "The Elephant Clock of al-Jazari" is stuck on its "· loading image ·" placeholder frame (wall_left).
- [POLISH] (texture-flat/cartoon) Dark brown wall panels (apparently intended as wooden mashrabiya screens/doors) render as flat near-black slabs with barely visible grid lines and no lattice openwork (wall_left, wall_right, entrance_out).
- [POLISH] (texture-flat/cartoon) Cornice "muqarnas" reads as rows of disconnected floating white cubes rather than stacked honeycomb cells (wall_left, wall_right, ceiling).
- [POLISH] (decor-missing) No brass bowls/vessels on pedestals as shown in the concept corridor; props are limited to a single hanging gold lamp (wall_left).
- [POLISH] (lighting) Ceiling wash blows out to a flat yellow gradient that flattens the cornice blocks and bleaches the top edge of the frieze (ceiling, entrance_out, exit_out); concept lighting is warm but directional with visible ceiling relief.

## Hero element
No. The concept's instantly-recognizable signature — the pointed arch entrance portal with muqarnas spandrels framed by zellij star panels (right panel of the concept sheet) — does not exist in the room; both portals are plain rectangles. The runtime's best current feature, the green/teal arabesque star frieze, is supporting ornament, not a hero. Building the pointed-arch portal remains the single highest-impact fix.

## Signage
Not visible. entrance_out shows a bare teal rectangular frame with no title sign; entrance_in likewise shows no signage on the inner face of the portal. No readable room-title text exists in any of the 8 views.

## Special checks (FLUX texture ship)
- (a) Portal form: still a plain fallback arch — in fact a plain rectangle. Flat-teal jambs + flat dark lintel at the entrance (entrance_out/entrance_in); rectangular jambs with stepped block tops at the exit (exit_in). No horseshoe/pointed/muqarnas form shipped in any view.
- (b) Mirror seams / flipped calligraphy: no clear horizontal mirror seam detected. The star frieze shows vertically-symmetric "Rorschach"-style motifs consistent with mirrored tiling, but that symmetry is also plausible for an 8-point star band, so it is not called as a defect. No calligraphy appears in the generated textures themselves; the Arabic script visible is inside loaded artworks and appears normally oriented. The real new-texture defect is the smeared/stretched jamb panels in exit_in (flagged above), not a seam.
