# Quality backlog — Phase 0 audit (round 2, valid shots)

Generated from `review/audit/findings/*.md` (31 rooms, 8 views each vs `concept-art/subsections/`),
`review/audit/scene_audit.json`, and `review/room_matrix.json`. Ratings are 1–5 per axis
(texture / palette / architecture / decor / signage). Items marked **FIXED** were addressed in
this pass and must be re-verified in the Phase 4 re-shoot before closing.

## Scoreboard

| H | room | tex | pal | arch | decor | sign | blockers |
|---|---|---|---|---|---|---|---|
| 01 | prehistoric | 3 | 2 | 4 | 3 | 1 | 1 |
| 02 | mesoamerica | 3 | 3 | 4 | 3 | 2 | 0 |
| 03 | andes | 1 | 2 | 3 | 3 | 2 | 1 |
| 04 | nativenorth | 2 | 4 | 3 | 4 | 4 | 0 |
| 05 | americas19 | 3 | 4 | 3 | 3 | 1 | 0 |
| 06 | americasmodern | 3 | 4 | 4 | 2 | 4 | 0 |
| 07 | classical | 2 | 4 | 4 | 3 | 2 | 0 |
| 08 | medieval | 3 | 3 | 4 | 3 | 2 | 0 |
| 09 | renaissance | 2 | 3 | 3 | 3 | 4 | 0 |
| 10 | baroque | 3 | 4 | 3 | 3 | 1 | 0 |
| 11 | romantic | 2 | 4 | 3 | 2 | 1 | 0 |
| 12 | impressionism | 2 | 3 | 4 | 3 | 1 | 0 |
| 13 | euromodern | 3 | 4 | 4 | 3 | 2 | 0 |
| 14 | neolithic | 2 | 4 | 4 | 3 | 2 | 0 |
| 15 | mesopotamia | 2 | 4 | 4 | 3 | 1 | 2 |
| 16 | persia | 2 | 3 | 3 | 2 | 1 | 1 |
| 17 | islamic | 2 | 3 | 2 | 2 | 1 | 1 |
| 18 | ottoman | 2 | 2 | 2 | 3 | 1 | 2 |
| 19 | memodern | 2 | 3 | 2 | 1 | 2 | 1 |
| 20 | indus | 3 | 4 | 3 | 2 | 1 | 0 |
| 21 | china | 3 | 4 | 3 | 2 | 1 | 0 |
| 22 | seasia | 2 | 3 | 3 | 2 | 1 | 2 |
| 23 | japan | 2 | 4 | 3 | 3 | 2 | 0 |
| 24 | southasia | 2 | 4 | 4 | 2 | 1 | 0 |
| 25 | asiamodern | 3 | 3 | 4 | 4 | 1 | 0 |
| 26 | egypt | 3 | 4 | 4 | 3 | 2 | 1 |
| 27 | kingdoms | 3 | 4 | 3 | 3 | 3 | 0 |
| 28 | traditions | 2 | 4 | 3 | 2 | 3 | 0 |
| 29 | oceancient | 2 | 4 | 2 | 3 | 1 | 0 |
| 30 | ocevoyage | 3 | 2 | 4 | 3 | 1 | 0 |
| 31 | oceliving | 2 | 2 | 2 | 2 | 1 | 1 |

## Cross-cutting (all rooms)

- [x] **FIXED:** flipY convention for GLB-kit textures (albedoTex + 10 fileTex sites, corridor.js) — glTF v-down UVs vs three.js flipY=true default rendered figurative textures upside-down.
- [x] **FIXED:** 19 TEXTURE_LEDGER SKIP rows generated via FLUX (16 files) or documented dead (3); ledgers updated; `band-tile-v` vertical tiling mode added to generate_ai_textures.py.
- [x] **FIXED:** auto decor keep-out colliders (world.js refreshDecorColliders) — waist-height kit props inside BASE_HALF were walk-through.
- [ ] Signs face only the approach (+Z); from inside a room its own title is never visible — add mirrored interior-facing sign in buildPortal (all paths). (Phase 3)
- [ ] Sign legibility at distance: 2.9×0.72 plane w/ 64px type washes out — consider larger plane or higher-contrast plaque. Note: threshold shots crop signs out (camera FOV); judge from the new 'approach' view. (Phase 3)
- [ ] impressionism/euromodern: skylight end-fans physically occlude era-title plaques at both thresholds — move plaque or trim fan. (Phase 3)
- [ ] z-fight candidate pairs (scene_audit.json): medieval×4, ocevoyage×3, indus×3, china×3, southasia×3, japan×2, persia×2, renaissance×2, mesoamerica×1, hub/neck×27 — coplanar y-axis pairs at gap 0–0.003; next sweep carries positions (audit_shots.mjs now logs `at`). (Phase 2.3)
- [ ] 'Loading image' artwork placeholders in shots — Wikimedia rate-limiting at capture time, not a room defect; re-shoot picks fresh set. (known infra)
- [ ] Uplight pools render as hard sprite ellipses in several rooms (mesopotamia, persia, china) — soften gradient/opacity. (Phase 2 polish)
- [ ] Hero-asset build-out per room (Blender kits): see QUALITY_PASS_PLAN.md §2.2 table — biggest remaining gaps: oceancient rock-shelter kit (no kit at all), meso deity-mask panel UV fix, china ceremonial portal plaque + bronze niches, medieval stone-grain walls, baroque damask UV stretch on portal jambs, prehistoric cave exit lighting. (Phase 2, open)


## H01 prehistoric (prehistoric)

- [ ] [MAJOR] (other) Multiple artworks show "- loading image -" placeholder panels: "Hall of the Bulls, Lascaux" (wall_left, legible placeholder text) and "Venus o…" plus a second panel (floor view, both sides) — the room's flagship Lascaux image is missing at capture while others (Venus of Willendorf, carved heads) loaded fine.
- [ ] [MAJOR] (texture-wrong) Rock albedo across all surfaces (walls, ceiling, floor, arch — every view): saturated dark red/maroon; concept is tan/buff sandstone; the room reads "hellish red cavern" instead of torch-lit limestone shelter.
- [ ] [MAJOR] (lighting) Between torch pools the walls and artwork zones fall to near-black (wall_left right half, floor view mid-corridor); the concept keeps the whole corridor legibly torch-lit. Rock art and labels are only readable within a torch's radius.
- [ ] [MAJOR] (decor-missing) No ochre hand stencils or painted animal motifs on the rock walls in any view — the concept covers both walls with them; the era's signature imagery exists only as framed artwork (and its key image failed to load).
- [ ] [MAJOR] (signage) No room title sign at the threshold in either entrance view.
- [ ] [POLISH] (bare-surface) Pale untextured strips are visible through the entrance arch flanking the interior (entrance_out, both inner edges) and a flat grey band shows below the threshold — unclad neck geometry peeking through the rock portal.

## H02 mesoamerica (americas-mesoamerica)

- [x] **FIXED THIS PASS:** band_greca → REGENERATED as true stepped fret; deity-mask panel → GENERATED (audit: header panels still mirror-split by KIT GEOMETRY — needs build_meso_assets.py UV fix, still open)
- [ ] [MAJOR] (texture-mirror-seam) Deity-mask header panels above the stepped entrance portal (entrance_out, top center): the two panels are exact left-right mirror copies meeting at a center seam — the right panel is a horizontal flip of the left. Figurative carved relief should not be mirrored.
- [ ] [MAJOR] (texture-wrong) Same deity-mask panels (entrance_out): the texture is an off-center crop of a larger carving — a frame-corner molding is baked into the panel mid-surface and the relief motif is cut off at the panel edge; it does not read as the concept's centered deity mask in a cartouche. Not upside-down, but not a composed mask either.
- [ ] [MAJOR] (texture-flat/cartoon) Pier accent strips (entrance_out, floor, wall_left, wall_right): the vertical red/black/cream strips are the greca/carved texture tiled at miniature scale (~6 vertical repeats with visible horizontal seam bands); at this scale it reads as woven textile ribbon or wallpaper, not carved stone.
- [ ] [MAJOR] (other: palette) Ceiling beams (ceiling, entrance_out, exit_out) are flat, crisp, glossy red — reads as fresh paint sitting on top of stone, which the concept and README explicitly rule out; concept shows a dark ceiling with restrained linear lighting, not bright cream with red beams.
- [ ] [MAJOR] (lighting) Ceiling view is heavily blown out — the cream ceiling plane and floor light pools wash to near-white; the concept is a dim, grazed-light corridor, so the render is notably brighter than concept and the dim-by-design exemption does not apply.
- [ ] [POLISH] (texture-flat/cartoon) Upper greca fret band (wall_left, wall_right): recognizable Mitla-style stepped frets and scrolls with recess shadows, but color is high-saturation salmon/orange and edges are crisp-vector-graphic vs the concept's carved-stone frieze with faint pigment traces. No upside-down motifs or horizontal (top-bottom) mirror seams found in the band itself.
- [ ] [POLISH] (bare-surface) Inner face of the entrance portal (entrance_in): plain flat beige box surround with no stepped profile, frieze, or carving; the entrance vestibule walls are bare limestone with none of the concept's portal ornament on the room side.
- [ ] [POLISH] (other) Two artworks show "loading image" placeholder cards (wall_left "El Castillo, Chichén Itzá"; wall_right "Double-Headed Serpent") — artwork feed issue, not architecture.

## H03 andes (americas-andes)

- [x] **FIXED THIS PASS:** flat cream walls → FIXED: wall wired to new FLUX cool andesite ashlar; inca_textile kaleidoscope → REGENERATED; verify in Phase 4
- [ ] [BLOCKER] (bare-surface) Corridor walls in every interior view (entrance_out, exit_out, floor, wall_left, wall_right): flat solid cream panels with drawn olive grout lines — the andesite ashlar material (`inca_andesite.jpg`) is not visible anywhere; a max zoom on wall_right shows no stone grain at all.
- [ ] [MAJOR] (texture-mirror-seam) Niche textile hanging (wall_left center, wall_right center): the pattern is kaleidoscope-mirrored left-right about its centerline and is split by a horizontal white seam band mid-panel with the motif reflecting at the seam — a clear mid-panel mirror artifact on a patterned/figurative textile.
- [ ] [MAJOR] (texture-wrong) Same niche textile: reads as orange/cream confetti noise rather than the concept's red/black woven Andean runner with legible geometric motifs.
- [ ] [MAJOR] (texture-flat/cartoon) Floor in all interior views (floor, entrance_out, exit_out): crazy-paving is flat beige polygons with uniform tan grout — the layout matches irregular flagstone, but there is no flagstone material, roughness, or bevel.
- [ ] [MAJOR] (texture-wrong: palette) Whole-room color (all views): warm cream where the concept and README specify cool grey andesite; README explicitly warns against warm adobe-toned walls, and this room currently blends into its warm neighbors instead of contrasting.
- [ ] [MAJOR] (lighting) Ceiling view is blown out to near-white with small square downlights; concept specifies a dim lime-plaster ceiling with concealed uplighting doing the work. Render is far brighter than the concept.
- [ ] [POLISH] (texture-flat/cartoon) Stepped-fret band at the wall top (wall_left, wall_right, ceiling): a thin brown line-drawn meander, not a carved or inlaid band; reads as a pen stroke.
- [ ] [POLISH] (decor-missing) Niche vessel (wall_left, wall_right): smooth untextured orange gradient cone — no ceramic surface; the concept shows painted Chimu/Moche-style vessels.

## H04 nativenorth (americas-native-north)

- [x] **FIXED THIS PASS:** speckled cork walls → adobe_wall REGENERATED as troweled plaster; verify in Phase 4
- [ ] [MAJOR] (texture-wrong) Adobe walls in every interior view (wall_left, wall_right, entrance_out, exit_out; close-up confirms): the surface is a dense dark-speckle aggregate that reads as cork board or chipboard, not the concept's smooth hand-troweled adobe plaster.
- [ ] [MAJOR] (texture-flat/cartoon) Floor (floor view, entrance_out): near-featureless airbrushed orange with soft blotches and a visible large square tile-seam grid; no packed-earth grain, wear paths, or woven-mat threshold inserts.
- [ ] [MAJOR] (texture-flat/cartoon) Painted decoration — top stepped-pyramid/sun-circle frieze, dado arrow band, and the textile hangings (wall_left, wall_right, ceiling) — is uniformly crisp, bright, flat vector paint; README explicitly warns against bright clean paint. Motif orientation is consistent (all stepped pyramids upright); no upside-down or horizontally mirror-seamed figures found anywhere in the room.
- [ ] [POLISH] (decor-missing) Niche vessel (wall_left): a smooth untextured terracotta cone with visible polygonal faceting at the rim — no ceramic or painted-pottery surface; concept shows richly painted Pueblo ollas.
- [ ] [POLISH] (other) Niche back wall (wall_left): the dado arrow band tiles straight through the inside of the niche behind the pot, and the raised arch trim strips taper off and float without landing on the jambs.
- [ ] [POLISH] (decor-missing) wall_right: the two textile hangings are identical duplicates side by side, and both hangings end in a large blank cream region on the lower quarter (texture looks cropped/unfinished).
- [ ] [POLISH] (lighting) Ceiling near the entrance (entrance_out): vigas fall to near-black silhouettes, losing the wood read; mid-room latilla lighting (ceiling view) is good.

## H05 americas19 (americas-19th-century)

- [ ] [MAJOR] (signage) Entrance portal (seen from nativenorth/entrance_out and this room's entrance_in): the lintel face is bare dark wood — no "19TH CENTURY"/room-title sign exists at this threshold, while every neighboring room's portal carries one. Visitors approaching see only "THE MODERN ERA" two rooms ahead.
- [ ] [MAJOR] (bare-surface) Wainscot on both long walls (wall_left, wall_right, entrance_out, exit_out; close-up confirms): a completely flat, untextured dark-brown slab with a single gold strip on top — no panel moldings, stiles, or wood grain; concept shows paneled dark-wood wainscoting.
- [ ] [MAJOR] (texture-wrong) Floor (floor, wall_left, wall_right): straight strip-plank flooring in honey oak; the concept and README specify varnished herringbone parquet with an inlaid border and aged varnish sheen. Grain is decent but it reads as a modern laminate floor, not a 19th-century salon parquet.
- [ ] [POLISH] (architecture-missing) Doorway surrounds (entrance_out, exit_out): plain flat dark pilasters and lintel — no carved wood surround, gilded entablature, or marble threshold from the concept's Salon Entrance Portal panel.
- [ ] [POLISH] (decor-missing) No settee, bust on pedestal, or any furniture piece from the concept corridor; the room is walls-and-art only.
- [ ] [POLISH] (texture-flat/cartoon) Ceiling (ceiling view): flat white coffer grid with pasted-on flat gold discs as lights (one disc clipped by a coffer beam at the panel edge); concept shows ornamented plaster with discreet downlights.
- [ ] [POLISH] (lighting) Overall brightness is well above the concept's dim gaslight mood, and the sconce on wall_left blooms into a blown white hotspot on the wallpaper.

## H06 americasmodern (americas-modern)

- [ ] [MAJOR] (texture-flat/cartoon) Terrazzo floor (floor, wall_left, wall_right, exit_in): chips are fist-sized flat vector polygons in a matte field — no fine grain, no polish or reflections; the concept shows small-chip polished terrazzo with sheen. Reads as confetti wrapping paper up close.
- [ ] [MAJOR] (decor-missing) No sculptures or display plinths anywhere in the room (all views); the concept's corridor panel is defined by dark bronze figures on plinths behind bronze rails, and the plinth bays are the room's hero rhythm. The brass railings currently guard empty wall.
- [ ] [POLISH] (architecture-missing) Entrance portal (entrance_out from americas19, entrance_in): clean black jambs with gold trim bands but none of the concept's blackened-steel transom grille or stepped Art Deco chevron cartouche above the opening.
- [ ] [POLISH] (lighting) Exit bay (exit_in): the floor-to-ceiling light-curtain wall blows out to pure white and washes the last bay into a void; legibility of the sign survives but nearby wall/floor detail is lost. Skylight also shows a thin glowing seam cross at its center (ceiling view).
- [ ] [POLISH] (other) Bronze railings (wall_left, wall_right, floor): isolated free-floating segments placed mid-floor in front of paintings rather than continuous rails guarding recesses or plinths as in the concept.

## H07 classical (europe-classical)

- [x] **FIXED THIS PASS:** meander floor border pink-hatch scale → FIXED: 90° texture rotation — VERIFIED legible greek-key border (audit-after/classical floor)
- [ ] [MAJOR] (texture-flat/cartoon) Central mosaic carpet (floor.jpg, entrance_out, wall_left, wall_right) reads as a pastel gingham/quilt print — flat cross-and-star tiles in baby blue/salmon/butter with no tesserae grain; concept shows a dense red/tan Roman mosaic with geometric borders.
- [ ] [MAJOR] (texture-wrong) New band_meander_floor mosaic border: the strips flanking the central carpet (floor.jpg, both edges; also visible in wall shots) render as blurry pink/cream hatch stripes — the meander motif is completely illegible, likely tiled at the wrong scale or stretched along one axis. No flip or mirror-seam call possible because no motif is readable.
- [ ] [MAJOR] (texture-flat/cartoon) Red dado band and red Greek-key frieze (wall_left, wall_right) are flat solid fills with crisp vector edges; concept shows painted plaster and marble revetment with material depth.
- [ ] [MAJOR] (other) Artwork canvases render as black rectangles with only caption text in entrance_out and exit_out, while the same walls show loaded images (Discobolus, Parthenon, Winged Victory, Venus de Milo) in floor/wall shots — images likely had not streamed in when the threshold shots were captured.
- [ ] [POLISH] (texture-flat/cartoon) Coffer panels (ceiling.jpg) are flat salmon squares with a simple daisy rosette and visible blotch artifacts; concept coffers are deep, polychrome, and painted. Rosettes are rotationally symmetric — no upside-down or mirrored coffers detected.
- [ ] [POLISH] (architecture-missing) No entablature: columns stop at plain square blocks below the frieze (entrance_out, wall_left, wall_right); concept shows a continuous entablature over the colonnade.
- [ ] [POLISH] (bare-surface) Wall aediculae (wall_left, wall_right) are untextured solid tan geometry with a dark unfinished recess behind the pediment and nothing displayed inside.
- [ ] [POLISH] (bare-surface) Entrance neck corridor (entrance_in) is plain marble with no dado/frieze continuation — reads as an undressed service hallway before the themed room begins.
- [ ] [POLISH] (texture-wrong) Outer floor field is a generic pale checkerboard tile grid (entrance_out, floor.jpg); the README explicitly says to avoid generic square pavers in favor of marble slab or mosaic.
- [ ] [POLISH] (lighting) Strong central bloom hotspot washes out the middle ceiling coffers (ceiling.jpg, entrance_out, exit_out).

## H08 medieval (europe-medieval)

- [x] **FIXED THIS PASS:** window_lancet stained glass → GENERATED (upright saint confirmed in round-2 audit)
- [ ] [MAJOR] (texture-flat/cartoon) Ashlar block walls (wall_left, wall_right, entrance_out, exit_out) are flat beige tiles with soft bevels and zero stone grain or weathering — they read as padded plastic, not the concept's rough limestone.
- [ ] [MAJOR] (texture-flat/cartoon) Rib-vault webs (ceiling.jpg) use the same flat cream block fill; ribs are smooth untextured tubes. Vault reads clean-cartoon instead of carved stone; heavy bloom at the crown washes out the crossing.
- [ ] [POLISH] (other) White rectangular artifact overlaps the upper-left of the tall stained-glass lancet on wall_left — looks like an untextured glow quad or misplaced lamp plane sitting in front of the glass.
- [ ] [POLISH] (decor-missing) No benches, tapestry hanging, or niche carvings anywhere in the corridor (all interior views); the concept's cloister dressing is limited to lanterns and lancets.
- [ ] [POLISH] (lighting) Room is much brighter and warmer than the concept's dim chapel mood; lanterns show no visible flame or emissive source (wall_left, ceiling.jpg) so light appears sourceless.
- [ ] [POLISH] (texture-flat/cartoon) Encaustic runner (floor.jpg) is crisp and era-correct in pattern and color but is a flat vector print with no glaze wear or grout relief.

## H09 renaissance (europe-renaissance)

- [x] **FIXED THIS PASS:** renaissance_fresco → GENERATED full-bleed; VERIFIED upright after flip (audit-after/renaissance)
- [ ] [MAJOR] (architecture-missing) Coffered timber ceiling absent: the ceiling is flat wood planking with specular hotspots (ceiling.jpg, entrance_out, exit_out); the concept's coffered beams with concealed track lighting are the corridor's defining overhead element.
- [ ] [MAJOR] (texture-flat/cartoon) Terracotta herringbone floor (floor.jpg, entrance_out, wall shots) is flat solid-orange chevrons with dark outline seams and faint striations — cartoon shading, far more saturated than the concept's worn muted terracotta; a visible brightness band splits the floor mid-corridor (floor.jpg).
- [ ] [MAJOR] (bare-surface) Pietra serena aediculae/door surrounds on both walls (wall_left, wall_right, exit_out) frame nothing — bare plaster inside the pedimented frames; in the concept these surrounds hold doors or fresco panels.
- [ ] [POLISH] (texture-wrong) Pietra serena pilasters and the entrance portal surround show sparse dark squiggly veining that reads as scratches/cracks rather than sandstone (entrance_out framing columns, wall_left pilaster).
- [ ] [POLISH] (texture-flat/cartoon) Ceiling wood, while a real grain texture, reads as glossy hardwood flooring nailed overhead, with three blown-out light hotspots (ceiling.jpg).
- [ ] [POLISH] (other) One artwork panel renders black with caption text only ("Self-Portrait at Twenty-Eight", exit_out right wall) while all others are loaded.
- [ ] [POLISH] (lighting) Downlight hotspots bloom hard on the ceiling planks and upper walls (entrance_out, ceiling.jpg), brighter than the concept's even warm daylight.

## H10 baroque (europe-baroque)

- [ ] [MAJOR] (texture-wrong) Entrance portal jambs/reveals (entrance_out and entrance_in near-frame; also renaissance/exit_out, exit_in) show the damask texture massively stretched into vertical streaks with noisy ghost motifs — reads as smeared red wood/ikat, a clear UV-scale failure on the threshold geometry.
- [ ] [MAJOR] (other) Most artwork panels render as black rectangles with caption text in exit_out (e.g., "Girl with a Pearl Earring" legible on an empty black panel), while wall_left/wall_right show the same rail fully loaded (Ecstasy of Saint Teresa, Las Meninas, The Night Watch, The Milkmaid) — images had not streamed in for that capture.
- [ ] [MAJOR] (texture-flat/cartoon) Ceiling beams are broad flat gold fields between plain cream coffers (ceiling.jpg, entrance_out); the README avoid-list explicitly names "oversized gold fields", and the available baroque_ceiling_fresco accent appears nowhere overhead.
- [ ] [POLISH] (texture-flat/cartoon) Parquet herringbone (floor.jpg) is flat honey-toned chevron fills with outline seams — no wood grain or wear; the red damask inlay medallions themselves read well.
- [ ] [POLISH] (texture-flat/cartoon) Walnut wainscot zone (wall_left, wall_right, exit_out) is a flat dark-brown band with a faint damask ghost — no carved paneling or wood grain as in the concept.
- [ ] [POLISH] (bare-surface) Gilt oval cartouches on the walls contain a blank white/cream rectangle (wall_right, entrance_out) — reads as an untextured mirror/plaque placeholder.
- [ ] [POLISH] (decor-missing) Chandeliers are stylized gold rings with stub candle arms (entrance_out, ceiling.jpg) — closer to a modern Sputnik fixture than the concept's tiered candle chandeliers.
- [ ] [POLISH] (lighting) Ceiling bloom washes out the coffer grid and chandelier detail (ceiling.jpg, entrance_out); the concept is markedly dimmer with warm pooled light.

## H11 romantic (europe-romantic)

- [ ] [MAJOR] (texture-flat/cartoon) Wallpaper on all walls (wall_left, wall_right, entrance_out) is a solid red field with large, sparse flat two-tone stencil motifs — no flocked-fabric detail, sheen, or relief; reads vector-cartoon vs the concept's dense flocked damask.
- [ ] [MAJOR] (texture-wrong) Floor is straight strip-plank wood throughout (floor view, entrance_out, exit_out); concept specifies herringbone parquet with marble/stone thresholds. The neighboring rooms' floors visible through both portals ARE chevron/parquet, making the mismatch obvious at the thresholds.
- [ ] [MAJOR] (decor-missing) Wall sconces render as flat white backplates with bare white spheres and no brass material (wall_right center, top-right of floor view, lit sconce in wall_left) — they read as unfinished placeholder geometry, not the concept's brass candelabra sconces.
- [ ] [MAJOR] (architecture-missing) Entrance portal (entrance_out) is a plain smooth dark-brown arch: no carved wood surround, no gilded crest, and the threshold is a flat dark platform instead of black marble with brass inlay.
- [ ] [MAJOR] (decor-missing) Ceiling fixtures (ceiling view, entrance_out) are stacked chrome/metallic discs set in recessed white panels — they read Art-Deco/modern, not the concept's plaster medallions with cornices and discreet track lighting.
- [ ] [POLISH] (bare-surface) Wainscot below the gold rail is a near-black featureless band; carved panel relief barely reads even in direct wall views (wall_left, wall_right).
- [ ] [POLISH] (other) The top cornice/frieze strip renders as a glossy white-to-gold gradient bar that reads chrome-like rather than gilded plaster (top of wall_left/wall_right).
- [ ] [POLISH] (decor-missing) No red-velvet settee/bench anywhere in the corridor; the concept foregrounds one as key salon set-dressing (the drapery, at least, is present by the exit door in wall_left).
- [ ] [POLISH] (other) Fragonard's "The Swing" (1767, Rococo) hangs in the 1800–1850 run (wall_left, leftmost); Friedrich, Goya, Géricault, and Delacroix are all era-correct.
- [ ] [POLISH] (other) In exit_in, the next room's canvases render as black placeholder panels with title text — artwork lazy-loading at capture/neighbor distance, not a wall defect of this room (they load fine in impressionism's own shots).

## H12 impressionism (europe-impressionism)

- [ ] [MAJOR] (signage) The skylight's sloped end-fan geometry protrudes over the end-wall title plaques at BOTH thresholds: in romantic/entrance_out the impressionism title above the entrance door is ~90% occluded (only black plaque ends visible, zero readable text), and in entrance_out the far "…MODERN…" plaque over the steel portal is center-occluded the same way. Geometry/signage clash, reproducible from the main approach views.
- [ ] [MAJOR] (texture-wrong) Walls (wall_left, wall_right, entrance_out) read as plain white with a barely-visible ghost motif; concept specifies pale sage damask — the room loses its color identity at a glance and verges on bare-surface.
- [ ] [MAJOR] (texture-flat/cartoon) Chevron parquet (floor view, entrance_out, exit_out) is uniform pastel fills with dark outline strokes — no grain, sheen, or warm patina; reads as vector flooring rather than the concept's honey parquet.
- [ ] [POLISH] (texture-wrong) Picture frames are flat pale-cream bands (all wall views); concept shows ornate gilded frames as a defining salon element.
- [ ] [POLISH] (other) A faint horizontal tiling/module seam crosses the parquet mid-room where the pattern brightness shifts (floor view).
- [ ] [POLISH] (architecture-missing) No marble base band or marble thresholds; the parquet meets the romantic plank floor as an abrupt texture change at the doorway (floor view, entrance_in).
- [ ] [POLISH] (architecture-missing) The skylight cove has no cornice/plaster ornament framing it (ceiling view); concept shows a decorated cornice band around the skylight well.
- [ ] [POLISH] (decor-missing) No tufted bench/ottoman terminating the axis; concept shows a green upholstered bench mid-corridor.
- [ ] [POLISH] (bare-surface) Wainscot panels and rails are painted-on flat outlines with minimal relief (wall_left, wall_right).

## H13 euromodern (europe-modern)

- [ ] [MAJOR] (signage) The era-title plaque above the entrance portal is center-occluded by the impressionism skylight's end-fan when approached (impressionism/entrance_out): only fragments around "…MODERN…" plus an unreadable subtitle line show. The one place the era name appears is unreadable at the threshold.
- [ ] [MAJOR] (decor-missing) No oak benches and no display plinths/sculptures anywhere in the corridor (wall_left, wall_right, exit_out); the concept features both as core set-dressing. Railings are the only furniture.
- [ ] [POLISH] (texture-flat/cartoon) Terrazzo chips (floor view, exit_out) are oversized flat polygons with no polish, sheen, or reflection — reads confetti-paper rather than ground stone.
- [ ] [POLISH] (decor-missing) Portal sconces (entrance_out flanks) render as unlit ribbed chrome cylinders; concept calls for opal-glass sconces providing warm accent light.
- [ ] [POLISH] (lighting) The exit end-wall is a blown-out white lightbox (exit_in, and far end of entrance_out) — deliberate "Step into the Light" moment, but it erases the wall/floor junction and reads unfinished at the threshold.
- [ ] [POLISH] (bare-surface) Large empty white frieze above the steel picture-rail line on both walls (wall_left, wall_right); with only three canvases the hang feels sparse vs the concept's rhythm of paintings and niches.
- [ ] [POLISH] (signage) Signage styling is gilt-serif-on-black salon style ("STEP INTO THE LIGHT"); a sans-serif steel/plaster treatment would fit the Bauhaus room better.
- [ ] [POLISH] (other) Viewed from impressionism/exit_in, this room's canvases render as black placeholder panels with title text (e.g., "The Scream") — lazy-loading at capture/neighbor distance; they load correctly in this room's own shots.

## H14 neolithic (middle-east-neolithic)

- [x] **FIXED THIS PASS:** missing neolithic_floor.jpg (404) → GENERATED; ochre figures band → GENERATED; verify in Phase 4
- [ ] [MAJOR] (texture-wrong) Walls, all views (wall_left, wall_right, entrance_out, exit_out): lime-plaster mudbrick walls render as a busy uniform speckle with dark pebble inclusions and greenish-yellow flecks — reads as terrazzo/cork/conglomerate stone rather than smooth creamy lime plaster over mudbrick as in the concept sheet.
- [ ] [MAJOR] (texture-flat/cartoon) Floor (floor.jpg, exit_out): packed-clay floor reads smooth and airbrushed — the crack/impression detail of `neolithic_floor.jpg` is washed out at eye height, leaving soft blotches on a saturated orange plane; no reed-impression or packed-earth grain reads.
- [ ] [MAJOR] (other) Floor tiling grid (floor.jpg, exit_out): straight seam lines form a visible grid across the floor. The source `assets/textures/neolithic_floor.jpg` is itself a 3x3 collage with hard internal edges, so every tile repeat prints a grid of seams in-scene. (These are repeat/collage edges, not mirror reflections.)
- [ ] [MAJOR] (signage) Entrance threshold (entrance_out, entrance_in): no legible room title at the door; only small black plaques whose text is unreadable at threshold distance, and no era name anywhere on the portal.
- [ ] [POLISH] (texture-flat/cartoon) Niche vessels (wall_left, wall_right): every niche holds the same flat-shaded, unpatterned orange pot that reads low-poly and slightly glowing; concept shows painted geometric ceramics and baskets.
- [ ] [POLISH] (texture-flat/cartoon) Ceiling log beams (ceiling.jpg, exit_out): beams are featureless near-black cylinders with no wood grain or smoke-stain variation; they read as flat black plastic tubes.
- [ ] [POLISH] (architecture-missing) Raised side platforms with concealed floor uplighting from the concept corridor panel are absent (wall_left, floor.jpg); light instead comes from a large glowing ceiling disk (entrance_out, exit_out, ceiling.jpg) that reads as a flat glow decal.
- [ ] [POLISH] (texture-wrong) Wall-base trim/bench rail (floor.jpg, wall_left, wall_right): reads as streaky light wood plank rather than a plastered mud bench sharing the wall's plaster family per the concept/README.
- [ ] [POLISH] (other) Ochre band vertical framing (wall_left, wall_right): the band's UV window crops the texture's bottom register — the large antlered stag heads — down to tiny antler tips, so the texture's most striking motif barely reads. Not a flip; the visible tips are upright.

## H15 mesopotamia (middle-east-mesopotamia)

- [x] **FIXED THIS PASS:** procession/lamassu reliefs upside-down → FIXED: flipY=false + new FLUX Assyrian reliefs — VERIFIED upright, lamassu jambs + procession walls (audit-after/mesopotamia)
- [ ] [BLOCKER] texture-flipped — procession-bearer relief panels on BOTH long walls are rendered upside-down: bearded curled-hair head at the bottom of the panel, pleated kilt mid-panel, striding legs and bare feet at the top. Rotating the crop 180° resolves to a perfect upright striding bearer, so it is a clean 180° inversion (no mirror seam). Seen on wall_left.jpg (center panel between Victory Stele of Naram-Sin and Code of Hammurabi), wall_right.jpg (panel left of the Statue of Gudea frame), and both lit panels in exit_out.jpg.
- [ ] [BLOCKER] texture-flipped — lamassu glazed-brick guardian panels on BOTH entrance portal jambs are upside-down: winged bull's hooves and haunches at the top, horned head and downward-fanning wing at the bottom, with the gold meander border band reading at the top instead of the base. Rotating 180° resolves to an upright winged bull. Seen on the left and right jamb faces in entrance_out.jpg. No left-right mirror seam within a panel; the two jambs are mirrored copies of each other, which is acceptable heraldic gate symmetry.
- [ ] [MAJOR] bare-surface — entrance portal inner jambs, lintel, and lower dado band are flat solid navy (and flat orange above the door) with no glazed-brick, rosette, or brick-bond detail, in contrast to the concept's fully glazed rosette-studded gate; entrance_out.jpg.
- [ ] [MAJOR] texture-flat/cartoon — floor pavers are uniform flat orange with painted-on grout lines and no baked-brick grain, tonal variation, or roughness; floor.jpg, also prominent in exit_out.jpg. Concept floor is photoreal varied baked brick.
- [ ] [MAJOR] texture-flat/cartoon — wall brick field is flat cel-shaded orange with uniform dark mortar lines rather than the concept's photoreal varied mudbrick; wall_left.jpg, wall_right.jpg, entrance_out.jpg.
- [ ] [MAJOR] decor-missing — the concept's glazed striding-lion mural on the corridor end wall (featured in both concept panels) is not present; the far end walls in entrance_out.jpg and exit_out.jpg show a plain distant doorway instead.
- [ ] [MAJOR] signage — no era/room title sign at the entrance threshold; nothing readable above or beside the gate in entrance_out.jpg or entrance_in.jpg.
- [ ] [POLISH] other — two artworks are stuck on "loading image" placeholders: "Statue of Gudea" (wall_right.jpg) and "The Ishtar Gate" (exit_out.jpg, right wall). Possibly transient capture timing, but both were unloaded at screenshot time.
- [ ] [POLISH] lighting — ceiling coffers are pitch black with no in-coffer light sources (ceiling.jpg); the concept's dark beamed ceiling carries rows of small downlights. Floor uplight pools per the concept are present and working.

## H16 persia (middle-east-persia)

- [x] **FIXED THIS PASS:** guard panels upside-down → FIXED: persiaReliefTex.flipY=false + new guard + archers band — VERIFIED upright (audit-after/islamic approach view)
- [ ] [BLOCKER] texture-flipped — Persian guard relief panels are upside-down on EVERY instance: pleated robe and feet at the top, bearded head with hair curls at the bottom, and the spear's leaf-shaped head pointing DOWN at the floor with the butt-finial at the top. Visible on both tall wall panels in wall_left.jpg, both in wall_right.jpg, and on the exterior flanking panels of the entrance portal in entrance_out.jpg (left and right edges).
- [ ] [MAJOR] texture-mirror-seam — the carved-stone frieze band running along the top of both long walls is mirror-tiled left-right, producing obvious Rorschach "butterfly" figures at each seam center (clearest mid-frieze in wall_left.jpg and wall_right.jpg); figures merge into anatomically impossible shapes at the seams.
- [ ] [MAJOR] texture-wrong — that same upper frieze shows Assyrian-style archers/hunt imagery rather than the concept's blue-and-gold Persepolitan rosette frieze (wall_left.jpg, wall_right.jpg).
- [ ] [MAJOR] decor-missing — no faravahar/winged-disk motif is visible anywhere: the entablature above the entrance portal is a bare flat tan lintel (entrance_out.jpg top), and no gold winged disk appears over either portal despite persia_wingdisk.jpg shipping and the concept crowning the portal with it.
- [ ] [MAJOR] architecture-missing — entrance portal columns are smooth, flat-shaded cylinders with no fluting and no bull-protome capitals (entrance_out.jpg), versus the concept's fluted columns with elaborate gold capitals.
- [ ] [MAJOR] texture-flat/cartoon — wall ashlar blocks, floor slabs, ceiling field, and beams are untextured flat color fills with beveled seams and no stone grain or roughness response (floor.jpg, ceiling.jpg, entrance_out.jpg); concept calls for photoreal limestone throughout.
- [ ] [MAJOR] signage — no era/room title sign at the threshold in entrance_out.jpg or entrance_in.jpg; the only text near the entrance is artwork placards.
- [ ] [POLISH] other — many artwork frames were black "loading image" placeholders at capture time (most frames in entrance_out.jpg and exit_out.jpg; "Palmyrene Funerary Relief — loading image" and "The Great Isaiah Scroll — loading image" legible in wall_right.jpg/exit_out.jpg). Likely transient Wikimedia rate-limiting; re-verify with a slower capture pass.
- [ ] [POLISH] lighting — no visible ceiling track-light fixtures per the concept; ceiling illumination is an unmotivated glow between beams (ceiling.jpg). Wall-base up-lighting pools do match the concept nicely (floor.jpg).

## H17 islamic (middle-east-islamic)

- [x] **FIXED THIS PASS:** portal never wired to islamic.glb → FIXED: styles.js portal glb:"islamic" — VERIFIED: zellij-jamb pointed-arch kit portal renders (audit-after/islamic approach). NOTE: title sign may sit behind the arch crown (signY 5.95) — check/lower if needed
- [ ] [BLOCKER] (architecture-missing) Portal is still a plain fallback: the entrance is a flat rectangular teal frame with a flat dark lintel — no pointed, horseshoe, or muqarnas arch (entrance_out, entrance_in); the exit portal is likewise rectangular with stepped blocks on top (exit_in). The concept's signature "Pointed Arch Entrance Portal" is absent.
- [ ] [MAJOR] (texture-wrong) Dado and floor runners/medallions use a plain teal square-grid tile with gold grout — reads as bathroom/pool tile, not the zellij star-and-polygon mosaic called for by the concept (wall_left, wall_right, floor).
- [ ] [MAJOR] (bare-surface) Ceiling is a completely blank cream surface washed out by a yellow light gradient — no muqarnas cells, no texture at all (ceiling, also visible in entrance_out/exit_out).
- [ ] [MAJOR] (texture-wrong) Exit portal jamb faces show severely stretched/smeared vertical streaks (edge-pixel clamping artifact) instead of a readable arabesque pattern (exit_in, both jambs).
- [ ] [MAJOR] (signage) No era title sign at the threshold — nothing readable above or beside the entrance in entrance_out/entrance_in; the only legible sign anywhere ("INTO THE MODERN ERA") belongs to the next hallway, seen through the exit in exit_in.
- [ ] [MAJOR] (other) Artwork "The Elephant Clock of al-Jazari" is stuck on its "· loading image ·" placeholder frame (wall_left).
- [ ] [POLISH] (texture-flat/cartoon) Dark brown wall panels (apparently intended as wooden mashrabiya screens/doors) render as flat near-black slabs with barely visible grid lines and no lattice openwork (wall_left, wall_right, entrance_out).
- [ ] [POLISH] (texture-flat/cartoon) Cornice "muqarnas" reads as rows of disconnected floating white cubes rather than stacked honeycomb cells (wall_left, wall_right, ceiling).
- [ ] [POLISH] (decor-missing) No brass bowls/vessels on pedestals as shown in the concept corridor; props are limited to a single hanging gold lamp (wall_left).
- [ ] [POLISH] (lighting) Ceiling wash blows out to a flat yellow gradient that flattens the cornice blocks and bleaches the top edge of the frieze (ceiling, entrance_out, exit_out); concept lighting is warm but directional with visible ceiling relief.

## H18 ottoman (middle-east-ottoman)

- [x] **FIXED THIS PASS:** band_iznik mirror-tile → REGENERATED (blue-white-red Iznik band-tile); verify in Phase 4
- [ ] [BLOCKER] (texture-wrong) Both long walls (wall_left.jpg, wall_right.jpg; also visible in entrance_out.jpg, exit_out.jpg) are covered edge-to-edge in a pale green/beige photographic texture of arched niches used as all-over wallpaper. This is not the concept's blue-white-red Iznik floral tile, and it violates the README placement rule ("use Iznik motifs on dado panels and framed wall fields, not as all-over wallpaper... the blue-white-red pattern owns the room").
- [ ] [BLOCKER] (texture-mirror-seam) The main wall field shows blatant kaleidoscope tiling: every repeat is mirrored left-right against its neighbor, and each cell also reflects around a horizontal axis, producing symmetrical "butterfly" blobs (clearest in wall_left.jpg and wall_right.jpg). It reads as a mirror-tiled photo, not a designed tile pattern. The upper frieze band shows the same left-right mirroring between its tall arch panels.
- [ ] [MAJOR] (architecture-missing) No domed or vaulted ceiling with painted arabesques/medallions — the ceiling is a flat beige plane (ceiling.jpg), where the concept shows painted vaults and a dome.
- [ ] [MAJOR] (lighting) The ceiling is heavily overbloomed to a white-out glow (ceiling.jpg; also the upper third of entrance_in.jpg), destroying any material read up high. The concept is warm but controlled and dimmer; this room is over-bright at the top.
- [ ] [MAJOR] (texture-flat/cartoon) The red carpet runner is a solid flat red with a plain gold edge strip (floor.jpg, exit_out.jpg) — the concept's runner is a richly patterned Ottoman carpet with medallions and borders.
- [ ] [MAJOR] (decor-missing) Brass hanging lamps are plain untextured gold bell shapes (ceiling.jpg, entrance_out.jpg) — the concept shows ornate pierced brass mosque lamps on chains.
- [ ] [MAJOR] (signage) No room title sign at the entrance threshold (entrance_out.jpg, entrance_in.jpg). The only sign visible inside the room is a distant black-and-gold banner at the far end reading approximately "INTO THE MODERN ERA" (entrance_out.jpg), which is transition signage for the next area, not this room's title.
- [ ] [POLISH] (texture-flat/cartoon) The carved-wood lattice window panels render as flat beige rectangles with plain dark grid strips (wall_left.jpg, wall_right.jpg, exit_out.jpg) — no carving depth, wood grain, or mashrabiya detail.
- [ ] [POLISH] (texture-flat/cartoon) The stepped crenellation blocks along the cornice are plain untextured cream cubes (ceiling.jpg, entrance_in.jpg) — they read as toy blocks rather than muqarnas or carved stone.

## H19 memodern (middle-east-modern)

- [x] **FIXED THIS PASS:** zero Middle-East cues → FIXED: new S.memodern style (warm sand plaster, brass) + backlit mashrabiya screens in buildModernDecor; verify in Phase 4
- [ ] [BLOCKER] decor-missing — Geometric mashrabiya / perforated wood screens are entirely absent from both long walls (wall_left.jpg, wall_right.jpg, exit_out.jpg). They are the concept sheet's defining element (screens filtering daylight, casting patterned shadows); without them the room has no regional identity.
- [ ] [MAJOR] architecture-missing — Entrance portal (entrance_out.jpg) is a flat black frame with gold vertical bands, not the concept's plastered rectilinear arch with geometric tile dado and perforated wood screen surrounds; recessed display niches and the dark concrete/grey wall base band are also missing on all wall views.
- [ ] [MAJOR] bare-surface — Both long walls are large empty white planes carrying a single artwork each (wall_left.jpg, wall_right.jpg); the concept fills wall bays with carved wood panels, tile panels and niche displays.
- [ ] [MAJOR] decor-missing — No brass pendant fixtures on the corridor centerline (ceiling.jpg shows only black track spots and skylight) and no perforated brass lantern sconces at the portal; the exterior sconces flanking the entrance are plain white cylinders (entrance_out.jpg).
- [ ] [MAJOR] signage — No room-title sign visible at the threshold in entrance_out.jpg or entrance_in.jpg; a visitor entering cannot tell this is the Middle East Modern gallery.
- [ ] [POLISH] texture-flat/cartoon — Terrazzo chips are uniform flat vector-like polygons with no grain, gloss or size variation (floor.jpg); reads clean but cartoonish up close.
- [ ] [POLISH] texture-wrong — Floor border strips are plain black bands with brass edge trim (floor.jpg, exit_out.jpg) instead of the concept's geometric mosaic tile border, which was the floor's one regional cue.
- [ ] [POLISH] lighting — Room reads cool bright white throughout (exit_out.jpg, entrance_out.jpg) versus the concept's warm golden filtered daylight; brighter is acceptable for a modern gallery, but the brass/wood warmth of the concept is missing entirely.

## H20 indus (asia-indus)

- [ ] [MAJOR] (decor-missing) Recessed plastered display niches with warm-lit terracotta pottery — the concept's dominant repeated element on both walls — are absent from all wall surfaces (wall_left.jpg, wall_right.jpg, entrance_out.jpg).
- [ ] [MAJOR] (signage) No readable room title sign at the entrance threshold; nothing legible above or beside the portal in entrance_out.jpg or entrance_in.jpg. The small dark sign deep in the corridor above the far moon gate (entrance_out.jpg) is the next room's and is unreadable from the threshold.
- [ ] [MAJOR] (bare-surface) Floor edge drainage channels render as flat, untextured pure-black strips instead of channels cut into the brick paving (floor.jpg, entrance_out.jpg, wall_left.jpg).
- [ ] [POLISH] (texture-flat/cartoon) Wall and ceiling brick is bright, clean, and uniformly repeated compared with the concept's weathered dark terracotta; reads slightly game-y up close (wall_left.jpg, wall_right.jpg, ceiling.jpg).
- [ ] [POLISH] (architecture-missing) Entrance portal is a plain beige/tan frame rather than the concept's monumental brick portal with dark worn timber lintel, and the threshold step is light wood, not worn brick (entrance_in.jpg, entrance_out.jpg).
- [ ] [POLISH] (decor-missing) Terracotta seal/relief plaques (manifest assets/textures/indus_seal.png; bull and geometric motifs in the concept) are not clearly visible between artworks on either wall (wall_left.jpg, wall_right.jpg).
- [ ] [POLISH] (texture-wrong) Pilaster surfaces read as pale wood/plaster planking that clashes with the surrounding brick bays; the concept shows brick pilasters (wall_left.jpg, wall_right.jpg).
- [ ] [POLISH] (lighting) Corridor is lit brighter and more evenly than the concept's dim, pooled floor-uplight scheme, and no recessed uplight pools are visible on the walls (entrance_out.jpg, wall_left.jpg); the concept is clearly darker than the render.
- [ ] [POLISH] (other) Visible texture tile seam in the floor paving — a straight vertical repeat boundary in the left third of floor.jpg; a plain repeat, not a mirror.

## H21 china (asia-china)

- [x] **FIXED THIS PASS:** walk-through jar plinths at 1.34m → covered by auto decor keep-outs (world.js refreshDecorColliders); verify in Phase 4
- [ ] [MAJOR] (signage) No room title sign or inscribed plaque at the entrance threshold — the red wall above the moon gate is bare in entrance_out and entrance_in, while the concept shows a gold-on-black inscribed plaque over the portal (the next room's "JAPAN" plaque, legible in exit_in, confirms the sign system exists).
- [ ] [MAJOR] (architecture-missing) The concept's hero Ceremonial Timber Portal (painted dougong, red-lacquer doors with bronze ring hardware, inscribed plaque, carved threshold) is replaced by a plain smooth dark-brown torus moon gate with no carving, trim, or plaque (entrance_out, entrance_in).
- [ ] [MAJOR] (decor-missing) No recessed lit display niches or bronze vessels anywhere in the corridor — both walls carry only flat framed paintings and black info plaques (wall_left, wall_right, exit_out), while the concept's corridor panel is lined with artifact niches holding bronze ding/vessels.
- [ ] [MAJOR] (texture-flat/cartoon) Dougong bracket sets atop the red columns are solid flat-green stepped voxel blocks with no polychrome painting, carving, or shading detail (ceiling, exit_out, wall_left); the concept shows fully painted carved bracket sets.
- [ ] [MAJOR] (other) Several artworks near the exit end render as black panels with white title text instead of images — exit_out shows a large black right-wall panel titled roughly "Investigating the Sun, Moon, and ..." plus multiple dark frames on the left wall; near-entrance artworks (wall_left, wall_right, floor) load correctly.
- [ ] [MAJOR] (texture-flat/cartoon) The entrance facade's red wall shows stretched vertical streaking that reads as smeared fabric/curtain rather than lacquer panelling (entrance_out framing wall, also visible around the arch in entrance_in).
- [ ] [POLISH] (decor-missing) Pendant fixtures are plain cream-over-black boxes with a single red glyph, only loosely reading as the concept's timber-framed lanterns with tassels (ceiling, entrance_out).
- [ ] [POLISH] (other) Column bases are beige torus rings with a small peg protruding from the uplight, reading as a misplaced prop rather than the concept's carved stone bases (floor, wall_left).
- [ ] [POLISH] (texture-wrong) Floor is mid-tone generic hardwood plank with no inlaid borders (floor, exit_out); README permits dark timber, but the current planks are neither dark nor bordered like the concept's stone slabs.
- [ ] [POLISH] (texture-flat/cartoon) Lattice clerestory is a flat plaid/tartan grid rather than the concept's carved Chinese ice-ray/fretwork lattice (wall_left, wall_right).

## H22 seasia (asia-southeast)

- [x] **FIXED THIS PASS:** apsara/devata panels upside-down → FIXED: khmerReliefTex.flipY=false + new FLUX devata panel — VERIFIED upright (audit-after/seasia)
- [ ] [BLOCKER] (texture-flipped) The khmer apsara/devata panel texture is upside-down on every vertical relief panel: bare feet at the top of the panel, pleated sampot flowing downward, crowned head/face at the bottom, pedestal ornament rendered at the panel top. Confirmed at close range in wall_left.jpg and wall_right.jpg, and on both portal-flanking pillar panels in entrance_out.jpg; the distant uplit panels in exit_out.jpg and floor.jpg carry the same texture. It is a consistent full vertical flip — no horizontal mirror seam mid-panel (figures do not reflect at the middle; they are simply inverted whole).
- [ ] [BLOCKER] (texture-flat/cartoon) Wall surfaces are flat solid beige blocks with drawn outline joints — no sandstone grain, roughness, or patina (wall_left.jpg, wall_right.jpg, entrance_out.jpg, exit_out.jpg). This is the README's explicit "avoid" case; the khmer_sandstone material read is not present.
- [ ] [MAJOR] (texture-flat/cartoon) Floor is flat pale-beige tiles with painted grout lines and slight gloss, not the worn dark stone slab with patina from the concept (floor.jpg, exit_out.jpg); floor and walls are nearly the same tone, flattening the whole read.
- [ ] [MAJOR] (decor-missing) The lintel relief (khmer_lintel_relief) is not visible on any doorway/pediment field in any view — entrance and exit portal headers are plain dark beams (entrance_out.jpg, exit_out.jpg; the entrance portal top is partly cropped in frame, but the visible header field is bare). Consequently no lintel flip/mirror could be assessed — the texture simply does not appear.
- [ ] [MAJOR] (signage) No room title sign at the seasia threshold; entrance_out.jpg shows only the next room's "JAPAN" sign at the far end, and entrance_in.jpg (looking back into the red/green neighboring hall) shows none.
- [ ] [MAJOR] (lighting) Room reads bright and evenly lit — the opposite of the concept's dim gallery with grazing uplight on carvings; uplight pools under the relief panels blow out to white (wall_left.jpg, floor.jpg lower-right, ceiling.jpg hotspots).
- [ ] [POLISH] (texture-wrong) The frieze band below the beams is a Greek-key/stepped meander line drawing, not the apsara/floral bas-relief band of the concept (wall_left.jpg, wall_right.jpg, ceiling.jpg) — it pulls slightly toward the wrong culture at a glance.
- [ ] [POLISH] (bare-surface) Ceiling plane is a flat dark brown field with no plank or corbel texture between the beams (ceiling.jpg); concept shows timber planking over corbelled stone.

## H23 japan (asia-japan)

- [x] **FIXED THIS PASS:** japan_scroll → GENERATED + flipY fix; scroll blow-out FIXED: MeshBasic toned material (corridor.js japanMaterials) — verify in final sweep
- [ ] [MAJOR] (bare-surface) Hanging scroll (kakemono) in both tokonoma niches (wall_left.jpg, wall_right.jpg): the newly shipped FLUX scroll texture is washed out to a near-blank glowing panel. The right-wall niche shows only a ghost of faint horizontal lines; the left-wall niche shows a faint beige blocky patch that does not read as a landscape scroll. Likely overbright niche emissive/bloom crushing the texture, or the texture failing to bind. Because almost no image content renders, scroll orientation could not be verified — no upside-down placement and no horizontal mirror seam are visible, but neither can be confirmed until the scroll actually displays.
- [ ] [MAJOR] (other) Neighbor-era facade bleed on Japan's exit wall (entrance_out.jpg): the exit portal inside Japan is dressed with the next room's red-orange cusped ogee-arch trim and two gold jali lattice panels instead of the concept's timber/shoji threshold treatment (the known tall-facade neighbor gotcha).
- [ ] [MAJOR] (texture-flat/cartoon) Timber posts, rails, lintels, and ceiling beams (ceiling.jpg, wall_left.jpg, wall_right.jpg) are uniform flat dark-brown fills with no grain or roughness, and the shoji panels are plain cream with no paper texture or translucency — below the "photoreal materials, not flat cartoon shading" bar. Ceiling plank grain is painterly streaks.
- [ ] [MAJOR] (signage) No Japan title sign at the entrance threshold (entrance_out.jpg, entrance_in.jpg — bare timber lintel, no plaque); the plaque above the far exit portal (entrance_out.jpg) has gold text that is illegible at corridor distance.
- [ ] [POLISH] (lighting) Uniform bright-white gap strips run between the top of the shoji walls and the ceiling slab on both sides (ceiling.jpg, wall_left.jpg, exit_out.jpg) — reads as a light leak / unmodeled seam rather than the concept's wooden ranma transoms.
- [ ] [POLISH] (decor-missing) No tatami display zones or raised side platforms along the walkway (floor.jpg); only the niche bases carry tatami texture. Concept threshold props — wall lantern, plants/ikebana, floor uplights — are also absent from all views.

## H24 southasia (asia-mughal)

- [ ] [MAJOR] (texture-flat/cartoon) Jali screens — flanking panels in entrance_out and freestanding steeple-topped screens in wall_left/wall_right — read as an opaque flat yellow/orange print: no perforation depth, no light passing through, no cast shadow patterns, versus the concept's perforated sandstone jali filtering daylight.
- [ ] [MAJOR] (bare-surface) The cusped entrance arch's inner soffit renders as untextured grey stepped gradient bands (clearly visible framing entrance_out and entrance_in), breaking the red sandstone read of the hero portal.
- [ ] [MAJOR] (decor-missing) No brass lanterns, vases, ornamented chest, console table, or marble pedestals from the concept sheet appear in any view (entrance_out, floor, exit_out); the corridor contains only flat wall art.
- [ ] [MAJOR] (signage) No room title sign at the entrance threshold: nothing above or beside the portal in entrance_out, and nothing looking back in entrance_in; only the distant exit sign is legible.
- [ ] [POLISH] (texture-flat/cartoon) Ceiling floral medallions are flat clip-art daisies on cream panels (ceiling.jpg) versus the concept's intricate gilded arabesque medallions; coffers have painted trim lines and stray gold "C"-arc corner marks but no relief.
- [ ] [POLISH] (texture-flat/cartoon) Floor inlay borders and 8-point star medallions are flat vector shapes with little gloss or reflection (floor.jpg) versus the concept's polished marble with stone inlay, though the lengthwise double-band border does echo the water-channel motif.
- [ ] [POLISH] (bare-surface) Long stretches of bare cream wall between arches — wall_right shows no inlay panels at all; the concept fills wall bays with cusped-arch niches and framed pietra dura floral panels, of which only one appears (wall_left).
- [ ] [POLISH] (lighting) No jali-filtered light shadows on the floor and no visible track lighting or floor uplights (entrance_out, floor.jpg, ceiling.jpg); illumination is a uniform diffuse glow with ceiling hotspots, losing the concept's signature geometric shadow play.
- [ ] [POLISH] (other) Visible polygon faceting on the cusped arches and jali frames (wall_left, wall_right, entrance_out); edges read low-poly rather than carved stone.

## H25 asiamodern (asia-modern)

- [ ] [MAJOR] [signage] No room-title sign at the entrance threshold: entrance_out shows only sconces flanking the portal and entrance_in shows a bare transom — nothing identifies the room as Asia Modern from either side (entrance_out.jpg, entrance_in.jpg).
- [ ] [MAJOR] [texture-flat/cartoon] Terrazzo floor chips are oversized, hard-edged, solid-color polygons on a matte beige field with no gloss or fine aggregate — reads as vector confetti, not the concept's polished fine-chip terrazzo; the concept's dark inlaid border lines within the field are also missing (floor.jpg, entrance_out.jpg, exit_out.jpg).
- [ ] [MAJOR] [texture-wrong] Upper walls are flat cream plaster with no mottle; the concept's defining grey concrete/plaster material language is essentially absent from the room (all interior views).
- [ ] [MAJOR] [lighting] Room is uniformly bright and high-key; the concept corridor is dimmer with pooled museum track lighting and contrast between lit art and shadowed surfaces (entrance_out.jpg, exit_out.jpg, wall_left.jpg).
- [ ] [POLISH] [texture-flat/cartoon] Shoji rice-paper cells are one flat tan tone with no paper grain or translucent backlight variation, losing the "screens filter daylight" effect central to the concept (wall_left.jpg, wall_right.jpg).
- [ ] [POLISH] [architecture-missing] Lattice screens run full-length on BOTH walls with paintings hung directly on the grid; the concept alternates screens with calm concrete wall zones and recessed niches for art and artifacts (wall_left.jpg, wall_right.jpg, exit_out.jpg).
- [ ] [POLISH] [decor-missing] The concept's tall black-framed frosted rice-paper box sconces flanking the portal are replaced by plain beige half-cylinder wall lights; the disc-shaped artifact on a plinth and the console-table-with-scroll centerpiece are also absent (entrance_out.jpg, exit_out.jpg).

## H26 egypt (africa-egypt)

- [x] **FIXED THIS PASS:** jamb/deity mirror-tiled source files → REGENERATED via FLUX (deity_l/r singles, jamb band-tile-v, frieze band-tile) + albedoTex flipY=false — VERIFIED upright deities/jambs/frieze (audit-after/egypt)
- [ ] [BLOCKER] (texture-mirror-seam) Both entrance-portal jamb relief panels mirror top-to-bottom at mid-height: the wide ram/deity panel and the narrow figured gold strip each show upright figures in the upper half and the same figures reflected upside-down in the lower half, with a visible seam band at the fold. Confirmed on both left and right jambs in entrance_out (zoomed crops show inverted ram heads and standing deities with legs pointing up). This is the first thing a visitor sees at the threshold.
- [ ] [MAJOR] (texture-mirror-seam) The pylon frieze band above the entrance portal mirrors left-to-right at the portal centerline — limbs/hands reflect into each other at a visible vertical seam (entrance_out, top edge). Figures do not appear upside-down here; the fault is the centerline reflection.
- [ ] [MAJOR] (texture-flat/cartoon) Lotus/papyrus capitals are solid flat green geometry with no petal texture, paint wear, or carved layering (all interior views); concept shows painted, layered petal capitals.
- [ ] [MAJOR] (texture-wrong) Ceiling is the same generic masonry block texture as the walls (ceiling view); concept shows painted/coffered decorative bands between beams.
- [ ] [MAJOR] (bare-surface) Entrance neck (entrance_in) is plain block masonry with a completely flat, untextured tan portal frame — no reliefs, frieze, or any Egypt-specific detail on the inside face of the entrance.
- [ ] [MAJOR] (decor-missing) No winged-sun motif over the portal and no statues/plinths/offering tables anywhere in the hall (entrance_out, wall views); both are signature elements of the concept sheet.
- [ ] [POLISH] (texture-flat/cartoon) Column hieroglyphs are sparse, thin outline doodles (small circles/squares/zigzags) that read screen-printed rather than carved registers with figure panels (wall_left, wall_right, floor views). No hieroglyph/animal figures on the columns or wall frieze are upside-down — the interior entablature frieze figures are upright and consistently oriented; the only inverted figures in the room are the jamb panels' lower halves noted above.
- [ ] [POLISH] (other) The dark border strips flanking the processional path render as near-black untextured channels rather than painted border bands (floor view).
- [ ] [POLISH] (other) Several artwork frames show "Loading image" placeholders in entrance_out/exit_out (likely Wikimedia rate-limit during capture, not a room defect; wall_left/wall_right show artworks loaded).

## H27 kingdoms (africa-kingdoms)

- [x] **FIXED THIS PASS:** kingdoms_band → GENERATED; VERIFIED still upright after albedoTex flip (audit-after/kingdoms)
- [ ] [MAJOR] (texture-flat/cartoon) Ceiling beam slats are smooth, dark, glossy planes with hot specular streaks — they read as plastic/metal louvers rather than toron timber; no wood grain visible even in the dedicated ceiling view (ceiling, entrance_out, exit_out).
- [ ] [MAJOR] (architecture-missing) Walls are flat vertical planes: none of the concept's hand-shaped banco massing, rounded corners, toron beam projections, or deep sculpted niche reveals (wall_left, wall_right, entrance_out).
- [ ] [MAJOR] (texture-wrong) Floor is fired red brick paving; the concept specifies compacted clay with straw flecks (floor view). It still reads African-earthen (Great Zimbabwe-adjacent) but changes the banco character of the room.
- [ ] [MAJOR] (bare-surface) Exit portal jambs and soffit are flat untextured beige/brown slabs with no material detail (exit_out foreground, entrance_out top slab).
- [ ] [POLISH] (texture-wrong) Wall texture reads as coarse speckled laterite/terrazzo noise rather than smooth hand-troweled banco plaster (all wall views).
- [ ] [POLISH] (texture-flat/cartoon) Niche pots are flat-shaded cones with visible faceting and no terracotta texture; niche backs are plain pale rectangles that read stickered-on (wall_left center niche, wall_right piers).
- [ ] [POLISH] (texture-wrong) The new carved band is tone-on-tone terracotta relief; the concept's trim is high-contrast painted red/black/cream geometry. Orientation check passed: triangle rows and diamond register are upright, the repeat is regular, and there is no horizontal or vertical mirror seam (wall_left, wall_right, ceiling edges).
- [ ] [POLISH] (other) "Great Zimbabwe" and adjacent frames show "Loading image" placeholders in exit_out (capture-time rate limit; wall views show artworks loaded).

## H28 traditions (africa-traditions)

- [x] **FIXED THIS PASS:** ceiling loaded traditions_floor (cork speckle) → FIXED: now traditions_wood; wall wired to new FLUX banco plaster; verify in Phase 4
- [ ] [MAJOR] (bare-surface) Main walls read as flat untextured amber paint — no earthen plaster grain, normal detail, or roughness variation visible in any view; faint rectangular light-patch seams (lightmap/AO artifacts) show on the upper walls (wall_left, wall_right, entrance_out, exit_out).
- [ ] [MAJOR] (texture-wrong) Ceiling panels use a cork/particleboard speckle from the same family as the floor instead of the concept's woven raffia/reed slat rhythm (ceiling view).
- [ ] [MAJOR] (texture-wrong) Floor reads as bare compacted dirt/cork with scattered green moss-like flecks; the concept calls for woven raffia mat panels between the timber thresholds — no weave is visible even in the close floor view (floor, exit_out foreground). The timber divider strips themselves are a good match.
- [ ] [MAJOR] (architecture-missing) No carved hardwood portal: entrance and exit posts are plain banded cylinders with no carving, and there is no carved lintel — the concept sheet's signature element (entrance_out, exit_out).
- [ ] [MAJOR] (decor-missing) The concept's recessed niches with standing figures and vessels are absent; the one display niche present is a flat white untextured box that clashes with the earthen palette (wall_left, right edge of exit_out).
- [ ] [POLISH] (texture-flat/cartoon) The mudcloth band reads as a flat printed border with no fabric relief or fiber texture at close range — placement and orientation are correct. Flip check passed: the band's plant/bud motifs sit upright on the top register, the bottom register is a deliberate symmetric counterpart, the horizontal repeat is regular, and no mirror seam or upside-down tiling is visible on either wall (wall_left, wall_right, exit_out close-up).
- [ ] [POLISH] (lighting) Illumination is brighter and flatter than the concept's intimate niche-lit mood; the glowing white exit veil (intentional, per the "STEP INTO THE LIGHT" sign) overexposes the final bay and washes out the last wall segments (exit_in, entrance_out far end).

## H29 oceancient (oceania-ancient)

- [ ] [MAJOR] (texture-flat/cartoon) Walls in every view (wall_left, wall_right, entrance_out, exit_out): sandstone strata rendered as smooth painted horizontal bands with soft edges — no rock grain, bump, or photoreal response; reads as cartoon shading.
- [ ] [MAJOR] (texture-flat/cartoon) Floor (floor, entrance_out): uniform smooth orange wash with faint blotch spots and visible large square tile seams; no packed-earth grain or pebble detail called for in the concept and README.
- [ ] [MAJOR] (architecture-missing) Entrance portal (entrance_in): plain flat orange box jambs and lintel instead of the concept's natural rock-shelter archway; the portal is the "flat brown slab" the README explicitly warns against.
- [ ] [MAJOR] (decor-missing) Ochre hand stencils and x-ray animal motifs — the concept's core painted narrative — are absent from all wall views; only one tiny pink animal decal is visible near the entrance (entrance_out, left wall).
- [ ] [MAJOR] (other) The two artworks nearest the entrance render as black canvases with faint centered placeholder text (entrance_out, both walls) — same "- loading image -" placeholder style seen legibly in prehistoric; artworks elsewhere in the room loaded fine (exit_out, wall_left, wall_right).
- [ ] [MAJOR] (signage) No room title sign at the entrance threshold in either entrance view.
- [ ] [POLISH] (texture-flat/cartoon) Ceiling (ceiling): flat painted stripe bands with a large bloom hotspot that washes out any strata read.
- [ ] [POLISH] (texture-wrong) Triangle pennant frieze along the wall tops (wall_left, wall_right, ceiling): cream/rust triangles read generic "Southwest" rather than anything in the Oceania-ancient concept sheet.
- [ ] [POLISH] (other) Floor stones are untextured faceted low-poly lumps in flat tan (floor, wall_left, wall_right); concept shows weathered rounded rock.

## H30 ocevoyage (oceania-voyagers)

- [x] **FIXED THIS PASS:** band switched to tapa triangle (kōwhaiwhai moved to oceliving) for distinctiveness; verify in Phase 4
- [ ] [MAJOR] (texture-wrong) Whole kit palette — walls, vault, ribs, floor in all interior views (entrance_out, exit_out, exit_in): pale bleached gold instead of the concept's dark stained timber and shadowed woven surfaces; at a glance the room reads "bright basket" rather than "dark voyaging hall".
- [ ] [MAJOR] (decor-missing) No recessed display niches with navigational tools, canoe models, or cultural objects — the concept corridor's defining content; the room offers only flat framed artworks on the woven walls (entrance_out, exit_out).
- [ ] [MAJOR] (signage) No room title sign at the entrance threshold; the far-end banner visible down the corridor in entrance_out is too small to read and belongs to the exit transition.
- [ ] [POLISH] (texture-flat/cartoon) Red kōwhaiwhai portal posts and wall friezes (entrance_out, exit_in, exit_out): patterns are flat unshaded vector wraps on box geometry; concept shows carved, dimensional painted timber.
- [ ] [POLISH] (lighting) Far end of the corridor washes to pure blown-out white (entrance_out, exit_in), erasing floor and wall detail for the last few meters; the light-wall transition beyond the exit bleeds far into the room.
- [ ] [POLISH] (other) Portal dressing (red kōwhaiwhai jambs + star panels + toggles) is reused identically on this room's entrance and exit and again on oceliving's portals, diluting what should be this room's signature entrance.

## H31 oceliving (oceania-living)

- [x] **FIXED THIS PASS:** identical to ocevoyage → FIXED: new S.oceanic2 style (dark timber, kōwhaiwhai band, red-ochre posts) + gabled wharenui rafters + tukutuku panels replace star screens (oceVariant gating); walk-through prop covered by auto decor keep-outs; gabled red rafters VERIFIED (audit-after/oceliving exit_in)
- [ ] [BLOCKER] (architecture-missing) The entire room is the ocevoyage arch kit re-dressed — same woven walls, same canoe-rib vault, same red kōwhaiwhai posts/friezes, near-identical portal dressing (compare oceliving entrance_out with ocevoyage exit_in: same camera, same kit). A visitor cannot tell Hallway 31 from Hallway 30; the meeting-house identity that defines this concept is missing.
- [ ] [MAJOR] (architecture-missing) Carved meeting-house entrance portal (concept's right panel — carved posts, spiral-painted lintel, shell inlay) absent; the entrance is the same flat red-pattern jambs as the voyagers portal (entrance_out).
- [ ] [MAJOR] (texture-wrong) Bright gold woven surfaces on all walls/ceiling in every interior view; concept calls for dark carved wood and woven reed in shadow.
- [ ] [MAJOR] (decor-missing) No display niches, benches, carved ancestor figures, or everyday objects (bowls, tapa, paddles) anywhere in the corridor (entrance_in, exit_out); the concept corridor is lined with them.
- [ ] [MAJOR] (signage) No room title sign at the entrance threshold in either entrance view.
- [ ] [POLISH] (lighting) The blown-out white light wall at the exit floods the last third of the corridor floor and washes out the mat pattern (entrance_out, exit_in); the pure-white doorway itself appears intentional ("STEP INTO THE LIGHT").
- [ ] [POLISH] (texture-flat/cartoon) Kōwhaiwhai posts and frieze bands are flat vector wraps without carved relief (entrance_in, exit_out).
- [ ] Asset weight: six FLUX hero panels ship as 1-2MB PNGs with no alpha (renaissance_fresco, mesopotamia_lamassu, persia_guard, meso_deity_mask, khmer_apsara, mesopotamia_procession) — convert to q90 JPEG + update fileTex/TEXTURE_FILES names in one pass (~70% savings). (Phase 2 polish)

## Backlog round (2026-07-09, second pass) — fixed & verified in audit-after/

- [x] oceancient rock-shelter kit: NEW tools/build_rockshelter_assets.py → rockshelter.glb (stacked-slab shelter mouth + Ledge/Boulder), wired via GLB_PORTALS `rockshelter` (signZ 0.75) + S.rockshelter portal glb; FLUX stratified oceania_sandstone walls/ceiling + oceania_floor packed earth. VERIFIED: approach shows slab portal + legible ANCIENT OCEANIA plaque.
- [x] meso deity-mask panel: panel_uv() in build_meso_assets.py (box_uv wrapped a seam at panel centre); meso.glb rebuilt. VERIFIED: one upright mask.
- [x] medieval stone grain: FLUX gothic_ashlar.jpg wired into S.gothic wall (doubles as emissiveMap). VERIFIED.
- [x] romantic flocked damask: FLUX salon_damask.jpg wired into S.salon wall (was procedural-only). VERIFIED (gold-on-red; original was red-on-red — accepted as period-truer).
- [x] kingdoms toron ceiling: timber material now carries traditions_wood grain (was flat colour = "glossy plastic louvers").
- [x] baroque portal jambs: dedicated damask instance with repeat (2,8) — was the wall material smeared across 0..1 jamb UVs.
- [x] japan tokonoma scroll: MeshBasic toned material — no longer blows out white. VERIFIED (content faint; consider brighter ink in a later texture rev).
- [x] signage occlusion: salon2 signY 5.5→4.62, euromodern 4.9→4.45, islamic/ottoman 5.95→5.3, china plaque 4.32→3.95. VERIFIED: "IMPRESSIONISM & AFTER" + "THE MODERN ERA" legible on approach.
- [x] prehistoric: cave torches dist 9→13 / intensity 15→19; harness exit_out camera no longer inside the spawn wall (admin/harness.js).
- [x] memodern mashrabiya: fallback spots for short segments (interiorMidZ empty → midSpots grid). VERIFIED: screens render.
- [x] PNG→JPG weight pass: 9 hero panels 12.3MB → 2.8MB; all references updated (TEXTURE_FILES, fileTex, specs, ledger).
- [x] z-fight audit closure: the large coplanar "pairs" are AABB false positives from rotated adjacent floors; the real candidates are 2mm-separated 2×2m planes in japan/southasia never visually flagged — reclassified POLISH, positions logged in scene_audit.json.

Still open (polish tier): china bronze-artifact niches, salon sconce fixture geometry (glow halo w/o lamp), oceania_floor relief slightly strong, japan scroll ink faintness, remaining per-room [POLISH] items above.

## Wave 2 (2026-07-09, triage-driven fix packages) — landed & verified in audit-after/

Triage first re-verified all 256 open checkboxes against current renders (7 wing agents): a large
share were already FIXED by earlier waves; the remainder were concretized and dispatched as six
file-disjoint packages. Everything below is verified in the post-wave sweep (panels 30-49 in
scratch_previews/fable-improvements/):

**Textures (procedural, js/textures.js):** grain/wear/tonal-jitter added to herringbone (incl.
the module-seam root cause), flagstone, triangleBand, grecaBand, encaustic, checkerFloor(marble
veins), woodFloor, dirtFloor(straw), packedEarth, terrazzo(finer chips), plaster(subtle mottle).

**Textures (FLUX, 13 shipped with QA-loop retries):** renaissance_ceiling coffers+rosettes,
neolithic_wall smooth plaster, khmer_sandstone (warm amber) + khmer_band, japan_scroll v2 (bold
ink), kingdoms_band v2 (high contrast), salon_parquet + salon2_parquet, mesopotamia_lion,
egypt_wingsun, ottoman_runner, asiamodern_concrete, prehistoric wall_soft (rust→tan/buff, normal
map untouched). mesopotamia wall/floor correctly skipped (code forces procedural by design).

**Blender kits (10 rebuilt):** greek amphora-in-niche + darkened recesses; baroque cartouche
inset + tiered candelabra chandelier; persia fluted bull-protome columns + winged-disk panel;
islamic tiered muqarnas + jamb UVs + pierced mashrabiya; mughal FACADE_H 6.4 (japan seam) +
red-sandstone soffit collar; meso fret rescale + detailed inner portal; china gate bosses/crest +
3rd dougong tier + stepped plinths; indus distinct lintel + threshold; kingdoms taper + timber
toron pegs; traditions carved posts.

**corridor.js (46/49 items):** greek carpet/coffer/dado/entablature; gothic benches + heraldic
tapestries; renaissance pietra veins; baroque walnut grain + chandelier light; meso matte beams;
amsalon wood grain + settee + softer sconces; modern plinth+bronze rhythm; euromodern bench-cull
root cause fixed + opal sconces; shared end-light blowout toned down; mesopotamia lion panels;
persia downlight strips; islamic brass bowls; memodern pendants; china niches+vessels + ice-ray
lattice + tapered lanterns; indus niche spacing + carved groove + (pier already correct); khmer/
indus/mughal sign fixes; japan ranma + tatami platform + toro; salon settee + lighter wainscot;
salon2 threshold + beads + ottoman bench; egypt painted capitals + glyph density + winged-sun +
inner reveal mapping; kingdoms terracotta pots; traditions niche figures; rockshelter decal
visibility; oceanic Star→tukutuku for living + display niches. Skips: mesopt coffer lights (no
coffers exist), kingdoms nicheBack (no distinct prefix).

**styles/world/main (coordinator):** 11 lighting blow-out tunes; khmer/asiamodern/salon2/
amsalon/traditions/neolithic/ocevoyage palette+texture wiring; mesopotamia/persia/oceanic sign
occlusion fixes; softened uplight pools; cave title plaque (first ever); ochre stencil emissive
lift; cave-aware light budget (MAX_LIVE 9→14 in the cave).

**Still open (subjective/polish tier):** mashrabiya lattice density could be finer; jali light
shadows (needs shadow-casting lights — engine tradeoff); southasia ceiling medallion relief;
'loading image' placeholders are Wikimedia rate-limiting at capture (infra, not room defects);
any remaining items are individual [POLISH] judgments best driven by the admin console ratings.

## Wave 3 (2026-07-09, final remaining items) — landed & verified

- [x] ARTWORK LOCALIZATION: all 172 Wikimedia images downloaded to assets/art/ (87.9 MB, 0 failures) by NEW tools/download_artworks.py (polite UA, spaced requests, backoff, magic-byte verification, re-runnable); js/data/imageLocal.js LOCAL_ART map generated; art.js + ui.js resolve local-first with the remote URL as fallback. The recurring "loading image" placeholder INFRA items across all rooms are permanently resolved (verified: southasia/baroque previously-flaky panels all render).
- [x] islamic mashrabiya lattice density: 8 → 13 strips per direction (build_islamic_assets.py), islamic.glb rebuilt.
- [x] southasia ceiling medallions: mughalCeiling() petals now carry painted gradients, outlines, mid-veins + gold buds and a shaded hub (was flat "clip-art daisy" ellipses).
- [x] jali filtered light: faked with additive star-lattice floor pools raked in front of each Jali screen (buildMughalDecor; real shadow-casting lights remain out of budget by design).

## Wave 4 (2026-07-09, gameplay collision verification) — landed & verified

The one gap the wave-3 handoff flagged: decor auto-keepouts had only been checked by static
analysis, never against the live collision resolver. NEW tools/verify_walkthrough.mjs closes it —
it loads the real site, waits past both refreshDecorColliders passes, then drives the actual
world.clampMove code path: (A) presses toward every guarded prop frame-by-frame (0.12 m steps,
matching Controls) from 4 sides and asserts the trajectory's min distance to the prop honors its
guard clearance, (B) simulates the full player journey (cave spawn → hub, hub → far end of every
wing and back, 15 legs) with steering, (C) asserts the collider scan is idempotent.

Findings (real, would ship-break immersion) and fixes, all in js/world.js refreshDecorColliders:

- [x] CAVE WALL PROPS GRIND-THROUGH: the wall-hugger skip used corridor BASE_HALF (3.08) but the
  cave's walk band is 2.45, so wall stalagmites got keep-out circles crossing the band edge; the
  circular push-out and the width-profile settle-back fight over that strip and the profile wins
  — visitors could grind to 0.02 m from stalagmite centers. Fix: classification now measures the
  TRUE local walk band via hallBounds(hall, s), and wall-hugging props whose circle would cross
  the edge get a one-sided profile narrow instead (the existing column-narrow mechanism), which
  composes with clampMove with no fight. Bonus: flat wall dressing (zero-thickness torch plates /
  wall art) no longer gets nonsense 0.85 m keep-out discs blocking the walkway in front of it.
- [x] CAMPFIRE PINCH FIGHT (regression caught mid-wave): narrows from the rock piles behind the
  campfire pinched the band to a line INSIDE the fire's manual keep-out circle, parking visitors
  0.24 m from the fire center (on the logs). Fix: a narrow is dropped when its pinch line would
  cut through any keep-out circle (checked in hall coords over the narrow's s-span) — the circle
  already guards that strip.
- Scan is now two-pass (collect candidates, then classify) so coverage no longer depends on scene
  traversal order; auto circles are tagged {auto:true}; world.decorGuards exposes per-prop
  expected clearances for the harness.

Final run: 204 auto guards + 13 manual colliders, 0 penetrations, 0 failed traversal legs,
idempotent, 0 console errors. Gameplay walkthrough verification is no longer an open gap.
