# Museum Quality-Improvement Pass — Phased Plan

Goal: every room reads as historically/culturally accurate to its era at a glance, matching the
target renders in `concept-art/hallway-review.html` (source sheets in
`concept-art/subsections/<era>/Hallway-NN-<era>.png`, plus per-era `README.md` art-direction
briefs and `textures/` reference sets — **use those READMEs as the per-room spec; they already
define material language and texture manifests**).

Hard constraints (apply to every phase):
1. **FLUX only** for image generation, via the `review/generate_ai_textures.py` pattern.
   CC0/Wikimedia may inform prompts or feed the photo pipeline, never be the generator.
2. **Seamlessness** via the existing FLUX Fill wrap-seam inpaint. No blur fixes (explicitly rejected).
3. **Palette discipline**: harmonize with the room palette, subtle value contrast, photoreal
   material read. No bare/untextured surfaces anywhere.
4. **Reuse shared materials** (plaster, generic stone) at small resolution; hero resolution only
   for signature surfaces.
5. **Distinctiveness**: 29 rooms must stay individually legible as their eras.
6. **Subtle dimension**: no baked high-contrast shadows on flat geometry; rich, low-shadow
   micro-relief instead. Bake this phrase into every FLUX prompt (the existing prompts' "flat
   orthographic texture map, edge-to-edge uniform lighting, no drop shadow" language is the model).

---

## Room matrix (best-effort — Phase 0 confirms and freezes this)

| Hallway | Concept dir | Style/portal key | Kit script | GLB |
|---|---|---|---|---|
| 01 | prehistoric | prehistoric (cave; no GLB portal entry) | build_prehistoric_assets.py | prehistoric.glb |
| 02 | americas-mesoamerica | meso | build_meso_assets.py | meso.glb |
| 03 | americas-andes | inca | build_inca_assets.py | inca.glb |
| 04 | americas-native-north | adobe | build_adobe_assets.py | adobe.glb |
| 05 | americas-19th-century | amsalon | build_amsalon_assets.py | amsalon.glb |
| 06 | americas-modern | modern | build_modern_assets.py | modern.glb |
| 07 | europe-classical | greek | build_greek_assets.py | greek.glb |
| 08 | europe-medieval | gothic | build_gothic_assets.py | gothic.glb |
| 09 | europe-renaissance | renaissance | build_renaissance_assets.py | renaissance.glb |
| 10 | europe-baroque | baroque | build_baroque_assets.py | baroque.glb |
| 11 | europe-romantic | salon | build_salon_assets.py | salon.glb |
| 12 | europe-impressionism | salon2 (shares salon.glb) | build_salon_assets.py | salon.glb |
| 13 | europe-modern | euromodern (shares modern.glb) | build_modern_assets.py | modern.glb |
| 14 | middle-east-neolithic | neolithic (shares adobe.glb) | build_adobe_assets.py | adobe.glb |
| 15 | middle-east-mesopotamia | mesopotamia | build_mesopotamia_assets.py | mesopotamia.glb |
| 16 | middle-east-persia | persia | build_persia_assets.py | persia.glb |
| 17 | middle-east-islamic | islamic | build_islamic_assets.py | islamic.glb |
| 18 | middle-east-ottoman | ottoman (shares islamic.glb) | build_islamic_assets.py | islamic.glb |
| 19 | middle-east-modern | (shares modern.glb — confirm key) | build_modern_assets.py | modern.glb |
| 20 | asia-indus | indus | build_indus_assets.py | indus.glb |
| 21 | asia-china | china | build_china_assets.py | china.glb |
| 22 | asia-southeast | khmer | build_khmer_assets.py | khmer.glb |
| 23 | asia-japan | japan | build_japan_assets.py | japan.glb |
| 24 | asia-mughal | mughal | build_mughal_assets.py | mughal.glb |
| 25 | asia-modern | asiamodern (shares modern.glb) | build_modern_assets.py | modern.glb |
| 26 | africa-egypt | egypt | build_egypt_assets.py | egypt.glb |
| 27 | africa-kingdoms | kingdoms | build_kingdoms_assets.py | kingdoms.glb |
| 28 | africa-traditions | traditions | build_traditions_assets.py | traditions.glb |
| 29 | oceania-ancient | oceanic | build_oceanic_assets.py | oceanic.glb |
| 30 | oceania-voyagers | (confirm — `traditions`/`china`/`egypt` portal keys each appear 2× in styles.js) | ? | ? |
| 31 | oceania-living | (confirm) | ? | ? |

⚠ Discrepancy to resolve in Phase 0: the brief says 29 subsections; `concept-art/subsections/`
contains **31** hallway dirs (oceania has three: 29 ancient / 30 voyagers / 31 living). Determine
whether 30–31 are wired (the duplicated `glb:` keys in styles.js suggest shared kits) or missing
rooms — if missing, that's the single biggest concept-art mismatch and goes to Phase 2.

---

## Phase 0 — Audit & inventory (blocks everything else)

**Rooms:** all 29–31. **Duration driver:** screenshot harness + ledger cross-check, one pass.

### 0.1 Freeze the room matrix
Emit `review/room_matrix.json` (hallway → concept dir → style key → portal key → GLB → kit
script → hallway wing). Source of truth for every later phase and for admin-console indexing.
Resolve the oceania-voyagers/living and middle-east-modern wiring questions here.

### 0.2 Standardized screenshot sweep (net-new, built on existing harness)
Extend `tools/shoot.mjs` (Puppeteer already vendored; `tools/overnight_rooms.wf.js` /
`verify_only.wf.js` show the batch pattern) to capture per room, at fixed camera presets:
entrance portal head-on (from hall), threshold looking in, left wall, right wall, ceiling, floor,
one 3/4 interior. Output `review/audit/<era>/<shot>.jpg`. These are the "current state" halves of
every before/after and the baseline for Phase 4.

### 0.3 Visual audit through the admin console (`admin/`)
For each room, load current-state shots beside `concept-art/subsections/<era>/Hallway-NN-*.png`
in the section inspector. Rate on five axes (1–5): texture fidelity, palette harmony,
architecture match, decor/props match, entrance & signage. Pin-annotate every concrete defect.
Export the Claude-ready report per room → these exports ARE the work orders for Phases 1–3.
If the console lacks a side-by-side concept overlay, add one small feature to `admin/app.js`
(image pair viewer keyed off `room_matrix.json`) rather than a new tool.

### 0.4 Scripted defect sweeps (net-new scripts in `tools/`)
- **Flipped/upside-down textures** — `tools/audit_texture_orientation.mjs`. Root-cause hypothesis
  to test first: `THREE.TextureLoader` defaults `flipY=true` while GLB-embedded textures use
  `flipY=false`; any texture file shared between a styles.js `surf(...)` load and a GLB material
  apply (`applyXxxMats` in corridor.js) renders inverted in one path. Grep every texture load in
  `js/styles.js` + `js/corridor.js`, list files used in both paths, then visually confirm on the
  orientation-sensitive set (figurative friezes: `egypt_deity_l/r`, `band_archers`,
  `mesopotamia_procession`, `japan_scroll`, `khmer_apsara`, `persia_guard`, `band_hieroglyphs`,
  `band_ishtar`). Fix is a code fix (Phase 1), not regeneration.
- **Z-fighting** — static sweep of `js/corridor.js` + `js/world.js` for coplanar placements:
  planes at wall/floor offsets < 0.01, decor at y=0, band planes at wall x=±HALL_W/2. Prior art:
  corridor.js line 15 (floor-coplanar fix) and the timber-threshold comment at corridor.js:3766.
  Emit list; standardize the fix (consistent +0.01 offsets or `polygonOffset`) in Phase 2.
- **Bare surfaces** — add a debug flag (`?auditMats=1`) that walks the scene per segment and logs
  any visible mesh whose material has no `map` (excluding intentional emissives/glows, i.e. the
  `AdditiveBlending, depthWrite:false` pool/glow materials). Output per-room list.
- **Wall clipping** — `BASE_HALF = HALL_W/2 - 0.42` (js/world.js:68) is a single global margin.
  Script: for each segment, compute decor/kit bounding boxes (columns `every: 5.6`, portal jambs,
  wing-neck geometry) that intrude past `BASE_HALF`; emit per-room worst-case intrusion. Feeds
  the per-style collision override in Phase 2.
- **SKIP reconciliation** — `grep SKIP review/TEXTURE_LEDGER.md` (19 rows, verified below) →
  seed the Phase 1 queue.

### 0.5 Output
`review/QUALITY_BACKLOG.md`: one section per room; each defect has severity (blocker / major /
polish), phase assignment, and the admin-console pin ID. Every later phase checks items off here.

---

## Phase 1 — Texture pass (FLUX via `generate_ai_textures.py`)

**Extends:** `review/generate_ai_textures.py` (add spec entries; it already handles the three
tiling modes and FLUX Fill seam inpainting and writes `review/AI_TEXTURE_LEDGER.md` — currently
only 3 entries). **Net-new:** a small palette-extraction helper that samples dominant hues from
the era's concept sheet and `textures/` refs and injects hex anchors into the prompt (keeps
constraint 3 mechanical instead of judgment-based).

**Prompt discipline (every entry):** reuse the proven prompt scaffold already in
`AI_TEXTURE_LEDGER.md` ("photorealistic 4k texture scan, seamless repeating pattern, flat
orthographic texture map, edge-to-edge uniform lighting, no vignette, no drop shadow, PBR
material scan") and add the constraint-6 clause: *"low-contrast, soft ambient shadow only, rich
shallow relief detail, no strong cast shadows."*

### Tranche A — the 19 documented SKIPs (13 rooms), with tiling modes

| File | Room | Mode | Notes |
|---|---|---|---|
| band_greca.jpg | meso | band-tile | stepped-fret frieze; `band_meso_glyph.jpg` already proves the recipe |
| meso_greca_carved.jpg | meso | band-tile | carved variant, match wall limestone per concept README |
| meso_deity_mask.png | meso | single (no tile) | hero relief decal, alpha PNG |
| band_meander.jpg | greek | band-tile | red/cream meander per styles.js palette (#7c2f26/#f0e2c4) |
| adobe_painted_frieze.jpg | adobe | band-tile | painted pueblo frieze, not mudcloth |
| band_mudcloth.jpg | traditions | band-tile | bogolanfini geometry |
| kingdoms_band.jpg | kingdoms | band-tile | distinct from traditions' mudcloth — Benin/Ashanti motif |
| islamic_arabesque.png | islamic | all (square seamless) | biomorphic scroll, alpha overlay |
| islamic_muqarnas.jpg | islamic | band-tile | cornice module |
| japan_scroll.png | japan | single | hanging kakemono, one-off |
| khmer_apsara.png | khmer | band-tile | apsara procession frieze |
| khmer_lintel_relief.jpg | khmer | single | one lintel, mirrored placement OK |
| mesopotamia_lamassu.png | mesopotamia | single | paired L/R (generate one, mirror in placement) |
| mesopotamia_procession.png | mesopotamia | band-tile | tribute-bearer frieze |
| neolithic_ochre_figures.png | neolithic | band-tile | Çatalhöyük-style ochre figures |
| persia_guard.png | persia | band-tile | Susa glazed-brick archer (repeats historically) |
| persia_wingdisk.jpg | persia | single | faravahar lintel emblem |
| renaissance_fresco.png | renaissance | single | lunette/panel fresco |
| window_lancet.jpg | gothic | single | stained-glass lancet; emissive-friendly values |

### Tranche B — "wrong" textures from the Phase 0 audit
Placeholder for rooms whose textures exist but don't resemble the concept (per pinned exports).
Same pipeline; each regeneration cites its admin pin ID in the ledger row. The concept
`textures/` folders and READMEs (e.g. mesoamerica's "one limestone family, frieze reads as
carved stone modules not painted wallpaper") define the acceptance language per room.

### Tranche C — shared/common materials + weight pass
Identify cross-room commodity surfaces (plain plaster, packed earth, generic ashlar — e.g.
`hub_stone`, `cave_dirt`, plaster variants) and consolidate: one small (≤1024px) seamless texture
reused via the styles.js registry, freeing hero budget (2048px) for signature surfaces only
(portal friezes, ceiling frescos, glazed-brick bands).

### Also in Phase 1 (code, not generation)
- Fix the flipped-texture root cause found in 0.4 (single `flipY`/UV convention at the load site
  in styles.js / corridor.js `applyXxxMats`).
- Update `review/TEXTURE_LEDGER.md`: flip each SKIP row to `AI-GEN — see AI_TEXTURE_LEDGER.md`.

**Verification:** edge-delta metric per generated file (already emitted by the script; keep the
existing acceptance bar), regenerate `review/runtime_texture_contact_sheet.jpg` via
`tools/contact-sheet.html` + `tools/shoot.mjs`, and re-rate texture-fidelity/palette axes in the
admin console for the 13+ touched rooms.

---

## Phase 2 — Model / architecture fixes + hero assets

**Extends:** per-room `tools/build_<room>_assets.py` (rebuild GLB), decor handlers + `GLB_PORTALS`
map in `js/corridor.js` (dispatch at corridor.js:4256; the separate gothic/china/mughal/egypt
portal paths at corridor.js:4179–4300). Respect the known gotchas: `BLANK_H`/`FACADE_H` blanking
for tall facades next to shorter neighbors; ≥1.2 m decor keep-out around artwork anchors;
worktree-style isolation if agents build multiple kits in parallel.

### 2.1 Kit-vs-concept corrections
Driven entirely by the Phase 0 per-room exports — every room whose architecture axis rated ≤3.
Known-before-audit candidates (evidence in repo):
- **islamic** — styles.js:445 comment: mashrabiya screens/brass lanterns "was never wired."
  Verify the fix actually landed; if not, wire it.
- **oceania-voyagers / oceania-living** — if 0.1 finds them unwired, build kits
  (`tools/build_oceanic2/3_assets.py` or variants in `build_oceanic_assets.py`) + styles entries.
- **salon2, neolithic, ottoman, asiamodern, euromodern, middle-east-modern** — all share another
  era's GLB with only material swaps; audit whether the shared shell reads as the right era
  (highest samey-museum risk under constraint 5). Cheapest distinctiveness lever: unique hero
  asset + unique frieze rather than a new shell.

### 2.2 Hero assets — one instantly-recognizable, concept-rooted element per room
Proposals below are era-canonical; validate/adjust each against `Hallway-NN-*.png` + README
during Phase 0 and mark the confirmed pick in the backlog. Build in the room's kit script;
place clear of artwork anchors and portal thresholds.

| Room | Proposed hero asset |
|---|---|
| prehistoric | fire-circle with ochre hand-stencil panel cluster (extends existing ochreHands decals into a focal alcove) |
| meso | chacmool altar OR feathered-serpent balustrade heads flanking the stepped portal |
| inca | trapezoidal double-jamb niche wall with gold sun-disk (Coricancha reference) |
| adobe | kiva ladder through a roof opening + horno oven with pottery cluster |
| amsalon | monumental Hudson-River-School hero frame on an easel dais |
| modern | Deco sunburst grille over the portal + stepped-skyscraper vitrine model |
| greek | pedimented aedicula with amphora on plinth; optional caryatid pair |
| gothic | backlit rose window on the end wall (pairs with new `window_lancet` glass) |
| renaissance | coffered barrel-vault entry bay + contrapposto figure on plinth |
| baroque | gilded cartouche with putti crowning the portal; oval ceiling-fresco frame |
| salon | tufted circular banquette under a bronze candelabra |
| salon2 | glazed lay-light (skylight grid) washing the hang — the impressionist "bright salon" read |
| euromodern | tubular-steel furniture vignette (Bauhaus) on a low plinth |
| neolithic | bucranium (bull-skull) wall mounts + ochre wall figures (Çatalhöyük) |
| mesopotamia | paired lamassu flanking the portal (uses Tranche-A lamassu texture on sculpted relief blocks) |
| persia | apadana bull-protome column pair already exists — add glazed archer frieze panel + winged-disk lintel as the showcase wall |
| islamic | muqarnas half-dome portal hood + hanging brass lantern cluster |
| ottoman | Iznik-tiled mihrab-style niche + calligraphy roundels |
| middle-east-modern | mashrabiya-patterned light screen reinterpreted in steel (distinctness from euromodern/asiamodern) |
| indus | Great-Bath brick step-well corner + oversized unicorn-seal relief |
| china | bronze ding tripod on axis + moon-gate portal frame |
| khmer | naga balustrade rails leading to the portal + apsara lintel |
| japan | tokonoma alcove: hanging scroll (Tranche-A `japan_scroll`) + ikebana on a raised sill |
| mughal | pietra-dura inlay panel wall + marble chhatri canopy |
| asiamodern | shoji-grid light wall (warm) distinguishing it from euromodern's cool white |
| egypt | obelisk pair or seated-pharaoh pair before the pylon portal (hypostyle papyrus columns exist at corridor.js:4411) |
| kingdoms | Benin bronze plaque wall + leopard pair flanking the threshold |
| traditions | carved mask wall (staggered relief mounts) + mudcloth banner pair |
| oceanic (ancient) | rock-shelter overhang with x-ray-style painted panel (per README) |
| oceania-voyagers | suspended outrigger canoe + stick-chart wall piece |
| oceania-living | woven-fiber installation + contemporary mural wall |

### 2.3 Z-fighting fixes
Apply the standardized offset/`polygonOffset` fix to every instance from the 0.4 sweep. Keep the
existing conventions (corridor.js:15 pattern for floor-coplanar planes).

### 2.4 Collision / wall-clipping
Replace the single `BASE_HALF` with a per-style override: add optional `collisionHalf` to styles
entries, default `HALL_W/2 - 0.42`, tightened where the 0.4 sweep found intrusions (column rooms:
greek/baroque `every: 5.6` colonnades; portal jamb zones; wing necks — extend the existing neck
handling in world.js:626–643 rather than replacing it). Verify with a scripted wall-hug walk
(extend `tools/geometry.wf.js`).

**Asset-weight guardrail:** report per-GLB size before/after each rebuild; hero assets share
textures with the room where possible (constraint 4).

---

## Phase 3 — Entrances & signage

**Rooms:** all. **Files:** `js/corridor.js` only (plus `signY` tuning in `GLB_PORTALS`).

- **Sign coverage audit:** the generic path (corridor.js:4281–4297) renders a 2.9×0.72 label
  plane at `gp.signY`. The bespoke portal paths — gothic (4179), china (4196), mughal (4231),
  egypt (4300) — and the prehistoric cave mouth must be verified to render an equivalent label;
  add where missing.
- **Legibility:** verify sign contrast against each portal's texture at final lighting
  (screenshot sweep from 0.2 covers the head-on angle); adjust `signY`, sign scale, or add a
  backing plaque material per room where it fails. Tall-facade rooms: confirm the sign isn't
  swallowed by `BLANK_H`/`FACADE_H` blanking of the neighbor opening.
- **Threshold keep-out:** extend the 1.2 m artwork-anchor decor margin to a portal-threshold
  keep-out zone (no decor within the approach cone) so every entrance — especially new Phase 2
  hero assets flanking portals — showcases rather than obscures.

Sequenced after Phase 2 because portal geometry/hero flanking pieces change sightlines.

---

## Phase 4 — QA pass (admin console)

- Re-run the 0.2 screenshot sweep → `review/audit-after/<era>/`.
- Admin console: before/after per room against the concept sheet; re-rate all five axes.
  **Exit bar: every room ≥4/5 on every axis; all Phase 0 pins resolved or explicitly waived.**
- Re-run scripted sweeps from 0.4 (orientation, z-fight, bare-material, collision) as regression.
- Ledger hygiene: `TEXTURE_LEDGER.md` has zero SKIP rows (or documented waivers);
  `AI_TEXTURE_LEDGER.md` complete with edge-delta values; regenerate both contact sheets.
- Distinctiveness check (constraint 5): one composite contact sheet of all 29+ entrance shots —
  a reviewer must be able to name each era from its thumbnail. Any two rooms that read alike go
  back to Phase 2.2 for hero-asset differentiation.
- Final export: per-room Claude-ready reports archived beside `QUALITY_BACKLOG.md`.

---

## Sequencing & tracking

```
Phase 0 (audit) ──► Phase 1 (textures) ──┬──► Phase 3 (entrances/signage) ──► Phase 4 (QA)
                └──► Phase 2 (models)  ──┘
```
- Phase 1 and 2 run largely in parallel per room; where a kit rebuild consumes a new texture
  (lamassu, apsara lintel, window_lancet, japan_scroll), the texture lands first.
- Phase 3 waits on Phase 2 for any room whose portal/flanking geometry changed; signage audit
  for untouched rooms can start earlier.
- Tracking: `review/QUALITY_BACKLOG.md` checkboxes (per-room, per-defect) + ledger rows +
  admin-console ratings/pins. A room is "done" only when Phase 4's exit bar is met.
