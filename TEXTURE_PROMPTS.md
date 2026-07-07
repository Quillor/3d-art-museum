# Realistic texture prompts — for ChatGPT Images 2.0

The museum currently paints every wall, floor and frieze procedurally in
`js/textures.js`. To upgrade to photoreal materials, generate one image per
material below, then (future step) swap them in as texture maps.

## The master prompt

Copy this, replacing `{MATERIAL}` with a description from the list:

> **Seamless tileable texture of {MATERIAL}, viewed perfectly flat and
> straight-on (orthographic top-down), filling the entire frame edge to
> edge. Photorealistic PBR albedo map: perfectly even, diffuse studio
> lighting, no directional shadows, no specular highlights, no vignette, no
> depth of field, no perspective distortion. The pattern must wrap
> seamlessly — the left edge continues the right edge and the top edge
> continues the bottom edge with no visible seam. Uniform real-world scale
> across the image. No text, no watermark, no borders, no objects, no
> people. Square, 1:1, high detail.**

For the horizontal **frieze/band strips** (marked *band*), add:

> **This is a long horizontal decorative border strip in 4:1 aspect ratio;
> it only needs to tile seamlessly left-to-right.**

## The materials

Walls & floors (square, tileable both axes):

| # | File name suggestion | {MATERIAL} |
|---|---|---|
| 1 | `cave_rock.jpg` | rough limestone cave rock, ochre and umber stains, subtle charcoal smudges, Paleolithic cave wall |
| 2 | `cave_dirt.jpg` | packed prehistoric cave floor, dry trodden earth with embedded pebbles and ash traces |
| 3 | `hub_stone.jpg` | aged sand-colored limestone ashlar blocks, fine mortar joints, neoclassical museum rotunda wall |
| 4 | `hub_floor.jpg` | polished cream-and-charcoal marble checkerboard floor, 2×2 tiles visible, classical museum |
| 5 | `greek_marble.jpg` | polished white Pentelic marble with faint grey veining, ancient Greek temple wall |
| 6 | `greek_floor.jpg` | worn ivory and slate-black marble checkerboard, ancient Greek temple floor |
| 7 | `gothic_stone.jpg` | dark weathered grey ashlar masonry, deep mortar shadows, medieval cathedral wall |
| 8 | `gothic_floor.jpg` | worn medieval flagstone floor, uneven grey-brown slabs polished by centuries of feet |
| 9 | `renaissance_plaster.jpg` | warm cream Venetian lime plaster with subtle trowel texture, Florentine palazzo wall |
| 10 | `renaissance_floor.jpg` | oiled oak plank floor, straight planks, warm honey tone, Renaissance palazzo |
| 11 | `renaissance_ceiling.jpg` | gilded coffered wooden ceiling, recessed dark walnut squares with gold-leaf rosettes and moldings |
| 12 | `baroque_wall.jpg` | oxblood-red silk damask wallpaper with subtle tone-on-tone baroque scroll pattern |
| 13 | `salon_wall.jpg` | muted olive-green painted plaster, 19th-century Paris salon wall, very subtle aging |
| 14 | `modern_wall.jpg` | pristine matte white gallery drywall, extremely subtle roller texture, contemporary art museum |
| 15 | `modern_floor.jpg` | light grey polished concrete floor with faint trowel marks and mottling, contemporary gallery |
| 16 | `meso_stone.jpg` | pale khaki cut-limestone blocks, tight joints, Maya temple masonry with slight erosion |
| 17 | `inca_stone.jpg` | grey polygonal Inca ashlar masonry, irregular interlocking stones with knife-tight joints |
| 18 | `adobe_wall.jpg` | smoothed tan adobe mud plaster with hairline cracks and hand-trowel undulation, Puebloan |
| 19 | `mudbrick.jpg` | sun-dried Mesopotamian mudbrick wall, rows of tan-brown bricks with pale clay mortar |
| 20 | `persia_stone.jpg` | dressed golden-tan sandstone blocks, Achaemenid Persepolis palace masonry |
| 21 | `islamic_plaster.jpg` | ivory lime plaster with extremely subtle horizontal banding, medieval Islamic architecture |
| 22 | `china_lacquer.jpg` | deep cinnabar-red lacquered wooden wall panels, subtle sheen variation, imperial Chinese palace |
| 23 | `china_floor.jpg` | dark espresso-stained wide wooden plank floor, imperial Chinese hall |
| 24 | `japan_shoji.jpg` | shoji screen of warm white washi paper in a dark hinoki wood lattice grid, soft light glowing through the paper |
| 25 | `japan_floor.jpg` | pale honey-colored hinoki cypress plank floor, fine straight grain, Japanese temple |
| 26 | `khmer_stone.jpg` | grey-green weathered sandstone blocks with faint moss in the joints, Angkor temple masonry |
| 27 | `mughal_marble.jpg` | white Makrana marble with very subtle warm veining, Taj Mahal wall |
| 28 | `egypt_stone.jpg` | large golden-tan limestone blocks, ancient Egyptian temple masonry, light surface erosion |
| 29 | `sahel_banco.jpg` | hand-smoothed reddish-brown banco mud plaster, Djenné mosque wall, subtle vertical rain streaks |

Frieze bands (4:1 strips, tile left-to-right only):

| # | File name suggestion | {MATERIAL} |
|---|---|---|
| 30 | `band_meander.jpg` | Greek key meander border, cream pattern on deep slate blue, painted fresco band |
| 31 | `band_greca.jpg` | Mesoamerican stepped-fret greca border carved in low relief limestone with red ochre paint traces |
| 32 | `band_ishtar.jpg` | glazed lapis-blue brick frieze with golden eight-petal rosettes, Ishtar Gate of Babylon, glossy ceramic |
| 33 | `band_archers.jpg` | Achaemenid glazed brick frieze, ochre and turquoise on deep blue, Persian palace of Susa |
| 34 | `band_zellige.jpg` | Islamic zellige mosaic of eight-pointed stars, cobalt, turquoise and ivory glazed ceramic tesserae |
| 35 | `band_iznik.jpg` | Iznik ceramic tile border with tulips and carnations, cobalt blue, turquoise and coral red on white |
| 36 | `band_hieroglyphs.jpg` | ancient Egyptian sunk-relief hieroglyph columns on golden limestone with faded mineral paint |
| 37 | `band_mudcloth.jpg` | West African bogolan mud-cloth geometric border, cream triangles and lines on dark brown |

One-offs (not tileable — single image):

| # | File name suggestion | {MATERIAL} |
|---|---|---|
| 38 | `window_lancet.jpg` | Gothic stained-glass lancet window, pointed arch, deep cobalt and ruby panes in black lead cames, glowing as if backlit *(portrait 1:2, full window in frame)* |

## Tips

- Generate at the largest square size offered, then downscale to 1024×1024
  (bands: 2048×512) — downscaling hides AI noise.
- Test tiling by offsetting the image 50% in any editor (or ask ChatGPT to
  "show this texture tiled 2×2") and regenerate if a seam shows.
- Keep one consistent warm-neutral lighting feel across all 38 so the halls
  feel like one building.
- For integration later, the plan is: drop files into `assets/textures/` with
  the names above and swap `js/textures.js` generators for `TextureLoader`
  calls with the same repeat settings — the style definitions in
  `js/styles.js` won't need to change.
