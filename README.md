# Timeline of Art — a 3D museum

A first-person walk through 40,000 years of art history. You start in a
firelit Paleolithic cave, walk out into a domed rotunda, and choose one of
six halls — **The Americas, Europe, Africa, the Middle East, Asia**. Each
hall moves forward in time as you walk, and the architecture changes with the
era: Doric marble for classical Greece, stained glass for the Middle Ages,
gilded coffers for the Renaissance, shoji screens for Edo Japan, glazed-brick
friezes for Babylon, a white cube for the modern era.

**172 works** hang on the walls — 10 prehistoric, 20 Americas, 40 Europe,
40 Middle East, 30 Asia, 20 Africa, 12 Oceania. Click or tap any of them to read what it
is and why it matters.

There is no dead end: the far wall of every hall is a shimmering curtain
of light. Step into it and you emerge back in the Grand Crossing, ready to
choose another of the six halls.

## Run it

Any static file server works. From this directory:

```bash
python3 -m http.server 8471
# then open http://localhost:8471
```

(Or `npx serve`, or the bundled `.claude/launch.json` preview config.)
An internet connection is needed the first time each artwork comes into
view — images stream from Wikimedia Commons and are all public-domain works.
If an image can't load you'll see a labeled placeholder instead.

## Controls

| | Desktop | Mobile |
|---|---|---|
| Move | `↑`/`↓` (or `W`/`S`) — hold to speed up | swipe up / down |
| Turn | `←`/`→` (or `A`/`D`) | swipe left / right |
| Glide | two-finger trackpad swipe (momentum) | — |
| Look | mouse drag | — |
| Artwork info | click a piece | tap a piece |
| Close panel | `Esc`, ×, or click empty space | tap empty space |

## How it's built

Plain ES modules + [Three.js](https://threejs.org) from a CDN — no build
step, no npm. Rendering is cel-shaded (stepped toon lighting, Breath of the
Wild style) via a shared gradient in `js/shading.js`. Architectural surfaces load photoreal tiles from
`assets/textures/` (generated from `TEXTURE_PROMPTS.md`), each backed by a
procedurally generated canvas fallback in `js/textures.js`.

- `js/data/*.js` — the 160 artworks: title, artist, date, description, and a
  Wikimedia Commons filename per piece
- `js/data/imageUrls.js` — **generated**: direct, build-time-verified image
  URLs (`python3 tools/resolve_images.py` regenerates it; it re-resolves only
  entries that are missing/null)
- `js/styles.js` — one architectural style definition per era
- `js/corridor.js` — builds an era-styled corridor segment (walls, bands,
  columns, portals, signage, artwork anchors)
- `js/world.js` — cave, rotunda, the five wings, collision, HUD location
- `js/art.js` — hangs artworks; lazy-loads images by proximity (4 at a time,
  downscaled for the GPU, released again when you walk away)
- `js/controls.js` — eased keyboard walk, trackpad glide with momentum,
  touch swipe, drag-look, tap-to-inspect
- `tools/contact-sheet.html` — QA grid of all resolved images
- `ERA_ACCURACY.md` — per-era references + ChatGPT prompts for art direction

All artworks are public-domain or photographed under free licenses; images
are served by Wikimedia Commons.
