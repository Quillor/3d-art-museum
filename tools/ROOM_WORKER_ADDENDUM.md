# Room Worker Addendum — overnight 3D-quality loop (subagent edition)

You are a **fresh subagent with NO memory** of prior rooms. Everything you need is
on disk. This supplements `OVERNIGHT_QUALITY_PROMPT.md` (read that too). Your job:
take **ONE room** from a ~5–7/10 to a faithful, polished 3D realization of its
concept sheet, verified with your own eyes via headless renders.

Repo root (cd here first): `/Users/timrosenberg/claude/Art Museum/3d-art-museum`

## First actions (every time)
1. `git status` — the tree MUST be clean. If not, STOP and report (don't build on a dirty tree).
2. Read your room's concept: `concept-art/subsections/<slug>/Hallway-*.png` **and** `.../<slug>/README.md`.
3. Read the memory files for hard-won gotchas:
   `/Users/timrosenberg/.claude/projects/-Users-timrosenberg-claude-Art-Museum/memory/art-museum-project.md`,
   `.../room-architecture-kits.md`.
4. Skim `QUALITY_LEDGER.md` for your room's current row + "textures wanted".

## The render command — THIS is how you SEE the room (headless, deterministic)
A static server is already running on :8471. From repo root:
```
node tools/shoot.mjs <eraKey> scratch_previews/<slug>_<view>_<tag>.png <view> [segOffset]
```
- `<view>`: `approach` (down the hall — primary), `wall` (angled at a side wall), `ceiling` (look up).
- It prints `... | consoleErrors: N`. **N must be 0.** Non-zero = you broke the JS; fix before continuing.
- **Read** the PNG(s) to see them. Always shoot `approach`+`wall`+`ceiling` BEFORE and AFTER.
- `scratch_previews/` is gitignored — shoot freely, it won't pollute commits.
- Each shot launches its own fresh Chrome (no stale cache between runs).

## eraKey ↔ slug ↔ style/glb map (shoot uses eraKey; files use slug/style)
| slug | eraKey | style key | glb kit |
|------|--------|-----------|---------|
| prehistoric | prehistoric | cave | prehistoric.glb (buildCave in world.js, not corridor) |
| americas-mesoamerica | mesoamerica | meso | meso.glb |
| americas-andes | andes | inca | inca.glb |
| americas-native-north | nativenorth | adobe | adobe.glb (EXCELLENT — reference for earthen rooms) |
| americas-19th-century | americas19 | amsalon | amsalon.glb |
| americas-modern | americasmodern | modern | modern.glb *(shared by 4 modern rooms)* |
| europe-classical | classical | greek | greek.glb |
| europe-medieval | medieval | gothic | gothic.glb |
| europe-renaissance | renaissance | renaissance | renaissance.glb |
| europe-baroque | baroque | baroque | baroque.glb |
| europe-romantic | romantic | salon | salon.glb (EXCELLENT — reference for ornate rooms) |
| europe-impressionism | impressionism | salon2 | salon.glb (salon2 palette) |
| europe-modern | euromodern | modern | modern.glb *(shared)* |
| middle-east-neolithic | neolithic | neolithic | adobe.glb (neolithic palette — reference commit bb7f0b4) |
| middle-east-mesopotamia | mesopotamia | mesopotamia | mesopotamia.glb |
| middle-east-persia | persia | persia | persia.glb |
| middle-east-islamic | islamic | islamic | islamic.glb |
| middle-east-ottoman | ottoman | ottoman | islamic.glb (Iznik palette) |
| middle-east-modern | memodern | modern | modern.glb *(shared)* |
| asia-indus | indus | indus | indus.glb |
| asia-china | china | china | china.glb |
| asia-southeast | seasia | khmer | khmer.glb |
| asia-japan | japan | japan | japan.glb |
| asia-mughal | southasia | mughal | mughal.glb |
| asia-modern | asiamodern | modern | modern.glb *(shared)* |
| africa-egypt | egypt | egypt | egypt.glb |
| africa-kingdoms | kingdoms | sahel | kingdoms.glb |
| africa-traditions | traditions | earthen | traditions.glb |
| oceania-ancient | oceancient | rockshelter | (decor-only, reuses prehistoric atlas) |
| oceania-voyagers | ocevoyage | oceanic | oceanic.glb |
| oceania-living | oceliving | oceanic | oceanic.glb |

## The improvement recipe (proven on neolithic — git show bb7f0b4)
1. **Intent** — from the concept sheet, write 3–6 bullets: silhouette, portal/arch, support
   rhythm, ceiling system, signature ornament, **palette & material feel**, floor zoning.
2. **Diff** — shoot current (approach+wall+ceiling), Read them, list every gap vs concept.
3. **Diagnose** — is it MATERIAL/PALETTE/LIGHTING/DECOR (JS-only, fast, low-risk) or
   SILHOUETTE/GEOMETRY (needs Blender)? **Most "plain/generic/pale/dark/flat" rooms are JS-only.**
   Identify the **2–3 worst offenders** (usually: wrong floor material, palette temperature,
   too-dark lighting, one missing signature element) — fixing those moves the score most.
4. **Fix** through the pipeline:
   - Palette/material/light: `js/styles.js` → `S.<styleKey>` (wall/floor/ceiling/band/light/ceilH).
     Warm/cool the hex, brighten `light.intensity` / tighten `every`, swap the procedural
     generator, fix `wallUV`/`floorUV` tiling scale.
   - Decor + material assignment: `js/corridor.js` → `<styleKey>Materials(...)` (assigns by
     mesh-name PREFIX via `o.name.startsWith`) + `build<Room>Decor(...)` (placement via
     `midSpots`/`interiorMidZ`, skip within ~1.2 m of an art anchor).
   - Geometry (ONLY if the silhouette is wrong): edit `tools/build_<glb>_assets.py`, then rebuild:
     `/Applications/Blender.app/Contents/MacOS/Blender --background --python tools/build_<glb>_assets.py`
     Keep mesh **names** stable (the name-prefix is the JS material contract).
5. **Re-shoot** (approach+wall+ceiling). `consoleErrors: 0` required. Read them. **Iterate 1–3×**
   until the screenshot reads like the concept. Don't spin forever — record best score reached.
6. **Commit + ledger**: `git add -A && git commit -m "quality: <slug> <old>-><new>/10 (<what>)"`.
   Update the `QUALITY_LEDGER.md` row: honest new score, one-line change, textures still wanted.
   **Leave the tree clean.**

## Worked example — neolithic (commit bb7f0b4), score 5→8, JS-only
Problem: muddy dark floor (`T.dirtFloor`), near-black beams (`0x241809`), dim light (34).
Fix: `S.neolithic.floor` → `surf(T.packedEarth(68),"satin")`; `neoMats.wood` → `0x4a3620`;
`light` → intensity 44/every 7. Also deleted a **weak blurry** `neolithic_floor.jpg` — a bad
image texture is WORSE than good procedural. No Blender rebuild needed.

## Texture helper inventory (`js/textures.js` — seeded, deterministic, no downloads)
`packedEarth` (warm light adobe floor ✅), `dirtFloor` (dark — usually AVOID), `earthenWall`,
`stoneFloor`, `checkerFloor`, `marble`, `woodFloor`, `weave` (reed/basket), `mudbrick`,
`stoneBlocks({base,mortar,rows,cols,seed})`, `triangleBand`/`meanderBand`/`grecaBand`/`glazedBand`
(friezes), `rock`. To wire a real image: `F("name", proceduralFallback)` — but ONLY if the file
exists in `assets/textures/` AND `"name"` is in `TEXTURE_FILES`. **A blurry/dark image is worse
than good procedural** — if the only available texture is weak, use procedural and add the room to
"textures wanted" instead.

## HARD rules / gotchas (do NOT relearn these)
- **GLB height contract**: most kits are NOT height-scaled in JS — a column is modeled at exactly
  `ceilH`. Read the build script's header comments before changing `ceilH`.
- **Name-prefix materials**: Blender uniquifies duplicate names, so JS uses `startsWith`, not `===`.
- **Tapered facades** need a full-size backing slab behind them or you see through the gap.
- **Never** put a full-width bar across a portal opening (DOOR_W 3.4 × DOOR_H 3.5) — it blocks the
  door. Split into left/right shoulder segments, or add trim on the corridor body in JS instead.
- **Tall-facade neighbour**: a portal facade must blank the TALLER adjacent era's opening
  (`FACADE_H` ≥ tallest neighbour). Don't shrink a facade below its neighbour's ceilH.
- **Cel look**: keep the shared toon/flat material feel consistent with neighbours; emissive stays
  MeshBasic.
- **Do NOT touch** `js/data/imageUrls.js` (generated) or the artwork resolver pipeline.
- Keep GLBs lean (mobile). Draw calls stay ~84 with culling.
- **The 4 `modern` rooms share `modern.glb` + `S.modern`.** Improving the modern kit lifts all four.
  If you're improving a modern room, do the holistic kit lift (Art-Deco portal, skylight laylight,
  bronze rails, terrazzo) once; per-room differences come from the concept sheet's art/mood, not
  the shell.

## Discipline (non-negotiable)
- `consoleErrors: 0` before every commit. A room that renders errors is NOT done.
- If you break it or can't improve it: `git checkout -- . && git clean -fd assets/models scratch_previews`
  to restore, record the attempt honestly in the ledger note, and exit. **Never leave a broken or
  dirty tree.**
- ONE room. Commit. Update ledger. Done. Your final message is structured data (the harness reads
  it) — return your result, not prose.
