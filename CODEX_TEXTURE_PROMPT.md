# Codex Texture Prompt — generate the image textures the 3D-quality loop still wants

Paste this to **Codex** (fresh session, no memory — resume from disk). It produces the
handful of **image textures** that a good procedural canvas can't carry, so the museum
rooms reach 9–10/10 fidelity to their concept art. Work in `3d-art-museum/`.

## Coordination (read first — avoids clobbering)
The **3D-quality loop (Claude)** edits `js/styles.js`, `js/corridor.js`, `js/textures.js`
and the Blender `tools/build_*` scripts. To avoid two writers on the same files, run this
texture job in **one of**:
- **After** the quality loop pauses for the night (check `QUALITY_LEDGER.md`: no row is
  `IN-PROGRESS`), **or**
- an **isolated git worktree/branch** you merge later.
Only touch: files under `assets/textures/`, the `TEXTURE_FILES` set in `js/textures.js`, and
the single `F("<name>", …)` wiring line for each texture. Nothing else. Commit per texture.

## The quality bar (this is why the loop asked for real images)
A **weak, blurry, or too-dark** image is **worse than the good procedural fallback** — the
loop has already deleted such placeholders (e.g. a mushy `neolithic_floor.jpg`). Every file
you ship MUST be:
- **Seamless** (verify by tiling 3×3 — no visible repeat seam or hotspot).
- **Detailed & photoreal-leaning** for the cel-shaded look — crisp material grain, not an
  AI smear, not a flat wash, not cartoon.
- **Era- and motif-correct** to the concept sheet (`concept-art/subsections/<room>/Hallway-*.png`).
- **Palette-harmonized** with the room's wall/floor/light hues and its wing.
- Clean **alpha** for `.png` panels; correct **aspect** (bands are 4:1).
Self-gate every file against this before handing off. If you can't beat the procedural, say so
in the ledger and skip it — don't ship a downgrade.

## Sizes / paths
- Surfaces (wall/floor/ceiling): **1024×1024** `.jpg`, seamless.
- Frieze/dado **bands**: **2048×512** `.jpg` (4:1).
- Figural/relief/atlas **panels**: `.png` with alpha, ~1024 on long edge.
- Export to the exact flat path `assets/textures/<name>.<ext>` (a wrong name silently falls
  back to procedural). Add `<name>` (or `<name>.png`) to the `TEXTURE_FILES` set in
  `js/textures.js`, and wire it as `F("<name>", <existingProceduralFallback>)` at the one
  surface/material line that needs it. Keep the procedural call as the fallback arg.

## Wanted textures (current — reconcile against `QUALITY_LEDGER.md` "textures wanted" column,
## which the quality loop keeps updating; do the highest-fidelity-impact first)

| name | room / slug | kind | motif / spec |
|------|-------------|------|--------------|
| inca_ashlar_megalithic | americas-andes | wall 1024² | Sacsayhuamán polygonal megalithic ashlar — tight irregular fitted stones, deep shadow joints, warm grey andesite |
| inca_textile | americas-andes | panel png | Andean tocapu geometric weaving band, saturated natural-dye reds/ochres/black |
| oceania_rockart_atlas | oceania-ancient | panel png (atlas) | ochre/charcoal rock-art figures + hand stencils on stone, transparent bg, several motifs in a grid |
| khmer_lintel_relief | asia-southeast | panel png | Angkor sandstone lintel — Kala/apsara relief, weathered warm sandstone, deep carving shadow |
| khmer_apsara | asia-southeast | panel png | standing apsara bas-relief, sandstone (upgrade if current reads flat) |
| greek_frieze | europe-classical | band 2048×512 | Parthenon-style procession/meander frieze, marble relief with cast shadow |
| baroque_ceiling_fresco | europe-baroque | ceiling 1024² | illusionistic sky/quadratura fresco, gilt coffer edges, warm |
| baroque_marble_floor | europe-baroque | floor 1024² | polished inlaid marble (giallo/rosso/bianco) geometric pattern, seamless |
| renaissance_herringbone | europe-renaissance | floor 1024² | warm terracotta OR walnut herringbone parquet, seamless |
| ottoman_marble_floor | middle-east-ottoman | floor 1024² | seamless polished white/grey veined marble (current floor rejected for seams) |
| adobe_basket | americas-native-north | panel png | coiled basketry weave, natural fiber, for niche props |
| persia_wingdisk | middle-east-persia | panel png | Achaemenid winged-disk (faravahar) relief, carved limestone (upgrade if flat) |
| neolithic_floor_reeded | middle-east-neolithic | floor 1024² | warm light packed clay with subtle pressed-reed impressions (must be LIGHTER/warmer than dirt — beats current procedural only if crisp) |

> This list is a starting point. Before each batch, re-read `QUALITY_LEDGER.md` — the quality
> loop appends the exact texture each room still wants (and removes ones now satisfied). Trust
> that column over this table when they disagree.

## ⚠ Shipped textures that render TOO DARK — REGENERATE lighter (highest priority)
The 3D-quality loop found these existing files render near-black in-app and actively hurt rooms
(they defeat the lighting). Regenerate each **lighter / higher-value**, keep the same name:
| name | room | fix |
|------|------|-----|
| salon2_sage_damask | europe-impressionism | pale, luminous sage tone-on-tone damask (current near-black; room must read airy) |
| salon2_parquet | europe-impressionism | light warm herringbone parquet (current too dark) |
| modern_terrazzo | *-modern (×4) | warm marble/granite aggregate chips on a light ground (current flat grey) |
| modern_wall | *-modern (×4) | smooth matte painted plaster (current reads stucco) |
| inca_andesite | americas-andes | match the concept sheet's andesite — verifier reads it as **warm brown**, not cool grey |

## More wanted (batch 2026-07-09, from verifier punch-lists)
| name | room | kind | motif / spec |
|------|------|------|--------------|
| inca_flagstone_megalithic | americas-andes | floor 1024² | irregular polygonal megalithic flagstone, warm stone that reflects warm uplight |
| oceania_rockart_atlas | oceania-ancient | panel png | **bold RED-ochre hand stencils + x-ray animals** on transparent (current atlas too faint) |
| oceania_sandstone_strata | oceania-ancient | wall/ceiling 1024² | rough natural **stratified sandstone** (current procedural reads like wood planks) |
| modern_deco_sunburst | *-modern | panel png | Art-Deco stylized sunburst/fan for over the portal (the modern signature ornament) |

## Process (≤3 textures per fresh session — generation is heavy)
1. `git log --oneline -15`; read `QUALITY_LEDGER.md` (textures-wanted column) + this file.
2. Generate ≤3 at the target size/aspect. Regenerate in a fresh model session if output goes
   flat/desaturated/off-brief — never push a tired context.
3. Self-gate (seamless tiled 3×3, detailed, era/motif-correct, palette-matched, clean alpha).
4. Export to the exact `assets/textures/<name>.<ext>`; add to `TEXTURE_FILES`; wire the one
   `F("<name>", …)` line.
5. Verify in-app: the static server on :8471, `node tools/shoot.mjs <eraKey> /tmp/t.png approach`
   → `consoleErrors: 0` and the image visibly appears (not the procedural fallback). eraKey map
   is in `tools/ROOM_WORKER_ADDENDUM.md`.
6. `git add -A && git commit -m "texture: <name> (<what>)"`. Note it in `QUALITY_LEDGER.md`'s row.

## Guardrails
- Never touch `js/data/imageUrls.js` or the artwork resolver. Keep it no-build / static / mobile-lean.
- A blurry/dark/off-era texture is a regression — skip rather than ship it.
- One texture = one commit. Leave the tree clean and loading with zero console errors.
