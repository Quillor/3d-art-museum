# Timeline of Art — a 3D museum

A first-person walk through 40,000 years of art history, cel-shaded in the
style of *Breath of the Wild*. You start in a firelit Paleolithic cave (a
Stonehenge trilithon marks the exit), walk out into a domed rotunda, and
choose one of six halls — **The Americas, Europe, Africa, the Middle East,
Asia, Oceania**. Each hall moves forward in time as you walk, its ceilings
soaring and its architecture changing with the era — right down to the
doorway arches: a pointed Gothic arch for the Middle Ages, a round arch for
the Renaissance, a horseshoe arch for Islamic halls, battered jambs and a
cavetto cornice for Egypt, a trapezoid for the Inca, a Maya corbel, a Greek
pediment.

**172 works** hang on the walls — 10 prehistoric, 20 Americas, 40 Europe,
40 Middle East, 30 Asia, 20 Africa, 12 Oceania. Click or tap any of them to
read what it is and why it matters — then tap the image to open a fullscreen,
pinch-to-zoom view.

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

### Offline

All 172 images are stored locally in `assets/art/<id>.jpg`, so the museum runs
**fully offline** — no internet connection required. The loader uses the local
copy first and only falls back to Wikimedia if a file is missing (the zoom
viewer additionally tries a higher-resolution remote rendition when online).
To (re)fetch the local copies after editing the artwork list:

```bash
python3 tools/download_images.py   # re-runnable; skips files already present
```

## Feedback / annotation mode

Open the museum with **`?comment=1`** (e.g.
`http://localhost:8471/3d-art-museum/?comment=1`) to turn on a 3D annotation
tool for leaving design feedback on specific assets:

- Click/tap any surface — wall, painting, column, doorway — to drop a numbered
  pin and attach a note. The tool records the nearest artwork or the era you're
  standing in so each note is anchored to a real asset.
- The side panel lists every note; **◎** aims the camera at a pin, **×**
  deletes it.
- Notes persist in `localStorage` across reloads.
- **Copy all** exports every note as Markdown (with world coordinates) to the
  clipboard, ready to paste into a task list or hand back to the developer.

Leave the `?comment=1` off and the tool is completely inert — normal visitors
never see it.

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
- `js/world.js` — cave (a blended low-poly tube), rotunda, the six wings,
  collision (funnel width-profiles + safe channels), HUD location
- `js/shading.js` — the shared cel-shading gradient / toon material helper
- `js/art.js` — hangs artworks; lazy-loads images by proximity (local copy
  first, remote fallback), downscaled for the GPU, released when you walk away
- `js/annotate.js` — the `?comment=1` 3D feedback tool
- `js/controls.js` — eased keyboard walk, trackpad glide with momentum,
  touch swipe, drag-look, tap-to-inspect
- `tools/download_images.py` — fetches local offline copies into `assets/art/`
- `tools/contact-sheet.html` — QA grid of all resolved images
- `ERA_ACCURACY.md` — per-era references + ChatGPT prompts for art direction

All artworks are public-domain or photographed under free licenses; images
are served by Wikimedia Commons.
