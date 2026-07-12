# Timeline of Art — 3D museum

A first-person museum spanning 31 galleries across prehistory, the Americas,
Europe, Africa, the Middle East, Asia, and Oceania. Each gallery uses a distinct,
source-led architectural frame, coordinated room palette, source-authored PBR
substrates, clear artwork zones, and a labeled threshold visible from both sides.

The collection contains 172 works. Artwork images stream from Wikimedia Commons
and fall back to labeled placeholders when a remote image is unavailable.

## Run locally

Serve the parent `Art Museum` directory so project-relative asset paths resolve:

```bash
cd ..
python3 -m http.server 8471
```

Open `http://localhost:8471/3d-art-museum/`.

## Controls

| Action | Desktop | Mobile |
|---|---|---|
| Move | Arrow keys or `W` / `S` | Swipe up / down |
| Turn | Arrow keys or `A` / `D` | Swipe left / right |
| Look | Mouse drag | Drag |
| Artwork information | Click a work | Tap a work |
| Close information | `Esc`, ×, or empty space | Tap empty space |

## Design authority

The PNGs under `concept-art/` are historical mood references only. They are not
production approval and may contain inaccurate, conflated, or invented details.
Current production decisions come from:

- `concept-art/room-designs.json` — machine-readable registry for all 31 rooms
- `concept-art/ROOM_DESIGN_BIBLES.md` — human-readable historical room bibles
- `concept-art/PRODUCTION_STANDARD.md` — quality gates, orthographic requirements,
  material rules, cultural review gates, and final evidence requirements

For living or sacred cultural contexts, missing community review is never treated
as approval. The runtime therefore uses a neutral architectural adaptation and
omits copied motifs, named ancestors, sacred narratives, and pseudo-traditional
decoration until the documented review gate is satisfied.

## Architecture and materials

- `js/styles.js` defines one coordinated material, palette, light, and structural
  system per room.
- `js/corridor.js` builds room geometry while honoring the shared frame-and-plaque
  keep-out in `js/layout.js`.
- `js/signThemes.js` defines historically coordinated, dual-face room signs.
- `js/architectureQa.js` checks sign coverage, portal clearance contracts, and
  artwork/decor intersections.
- `js/materials.js` loads mobile and desktop tiers from the versioned PBR masters
  in `assets/materials/masters/`.
- `assets/materials/masters/manifest.json` records source, license, channels,
  hashes, dimensions, edge continuity, and provider classification.

The runtime shares physical substrate masters where appropriate, while room color,
finish, UV scale, and culturally specific albedo remain independent. Decorative
color is never used to derive surface depth.

## Verification

The canonical museum audit captures nine views of every room and records browser,
scene, architecture, and evidence manifests:

```bash
node tools/audit_shots.mjs review/final-audit
python3 tools/build_room_evidence.py review/final-audit review/final-evidence
```

Blender packages can be inspected as six-view orthographic/three-quarter plates:

```bash
/Applications/Blender.app/Contents/MacOS/Blender --background \
  --python tools/render_asset_plates.py -- \
  assets/models review/asset-plates/raw review/asset-plates/manifest.json
python3 tools/build_asset_plate_index.py \
  review/asset-plates/manifest.json review/asset-plates/sheets
```

The checked outputs are `review/final-audit/evidence_manifest.json`,
`review/final-audit/sign_visibility_qa.json`,
`review/final-evidence/manifest.json`, and `review/asset-plates/index.html`.

The final release bar is: 31/31 rooms present; the full title band of both sign
faces in every room is crop-safe, front-facing, unobstructed, and legible at the
evidence resolution; zero artwork/decor overlaps; no portal-clearance violations;
no central-path intrusions; no actionable coplanar-surface candidates; and zero
browser errors.
