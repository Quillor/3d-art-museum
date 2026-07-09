# Prompt — Overnight 3D Quality Loop: Make Every Room Match Its Concept Art

Work in `3d-art-museum/`. Preview URL: `http://localhost:8471/3d-art-museum/`
(launch config `museum` / `static-server`). This prompt is **re-invoked repeatedly
in fresh sessions** — you have NO memory of prior iterations. **Resume from the
ledger and git history.** Do one room's worth of real improvement, commit, update
the ledger, and exit cleanly so the next invocation continues.

## The problem you are fixing

The geometry pass (`ARCHITECTURE_IMPROVEMENT_PROMPT.md`) is nominally "done," but the
**3D quality is poor — many built rooms do not resemble their concept art.** Your job
is to close that gap, room by room, until *every* room is a faithful, polished 3D
realization of its concept sheet. This pass covers **both geometry AND textures/
materials** (unlike the earlier pass, textures are now IN scope — bad materials are a
top cause of the "doesn't look like the concept" problem).

## First actions EVERY invocation (do these before anything else)

1. **Read the ledger** `QUALITY_LEDGER.md` (create it on first run — template below).
   It is the single source of truth for what's done and what's next.
2. **Read `memory/art-museum-project.md`, `memory/room-architecture-kits.md`, and
   `memory/admin-curator-console.md`** — they record hard-won constraints (door-block
   bug, tapered-facade backing slabs, GLB height contract, neck flare, `toon()`/`flat()`
   cel-shading, tall-facade neighbour-height rule, collision profile, preview-testing
   camera gotcha). Do NOT relearn these the hard way.
3. **Skim `ARCHITECTURE_IMPROVEMENT_PROMPT.md`** for the build pipeline and hard rules
   (still authoritative). Skim `TEXTURE_SPEC.md` for the texture wishlist.
4. **Start the preview** (`preview_start` → `museum`) and confirm it loads
   (`typeof window.__museum !== "undefined"`, console clean).

## The pipeline (match it, do not reinvent)

Each room's look comes from:
- `tools/build_<room>_assets.py` — headless **Blender** script → `assets/models/<room>.glb`
  with **named meshes** (name-prefix drives JS material assignment).
  Run: `/Applications/Blender.app/Contents/MacOS/Blender --background --python tools/build_<room>_assets.py`
- `js/styles.js` — `S.<key>` style object (`decor:"<key>"`, `portal.glb`, `columns.glb`,
  `band`, `light`, `portal.arch`, `ceilH`).
- `js/corridor.js` — `build<Room>Decor(...)`, `apply<Key>Mats` (by mesh-name prefix),
  procedural CANVAS textures, shared helpers (`midSpots`, `interiorMidZ`, `spawnPart`,
  `albedoTex`, `buildTrim`, `buildCoffers`, `buildWallPilasters`).
- Concept ground truth: `concept-art/subsections/<room>/Hallway-*.png` +
  `.../<room>/README.md`; wing sheets `concept-art/Hallway-*.png`; any
  `concept-art/subsections/<room>/textures/*` already generated.

Textures: prefer/upgrade the **procedural canvas** textures already in `corridor.js`;
only author image textures (into `assets/textures/` or the per-room `textures/` dir)
when a canvas can't carry the signature look. Keep it **no-build / static** (ES modules
+ importmap, no new runtime deps) and **mobile-safe** (lean GLBs, reasonable draw calls).

## THE LOOP (one room per invocation)

1. **Pick the target.** From the ledger, choose the room with the **lowest fidelity
   score** that is not yet `EXCELLENT` (ties → wing order: americas → asia → europe →
   middle-east → oceania → prehistoric). On the very first run, do a fast triage:
   screenshot each room and give every room a provisional 1–10 score in the ledger
   first, THEN start fixing the worst. Only ~one room gets deep work per invocation.

2. **Establish the acceptance target.** Open the room's concept sheet + README. Write
   3–6 bullet "intent" notes: silhouette, portal/arch type, support rhythm, ceiling
   system, signature ornament, **palette & material feel**, floor zoning.

3. **Diff concept vs. reality.** Navigate the camera into the room (use the
   preview-testing camera recipe from `memory/room-architecture-kits.md`: Enter, hide
   overlay, clear `museum.pos.v2`, disable controls, set pos/yaw/pitch, `applyTo`,
   render; confirm `world.locate(controls.pos).era`). Screenshot the visitor approach +
   mid-room. List every gap: wrong silhouette, wrong/absent arch, flat or wrong-colour
   materials, missing signature ornament, proportion errors, drab lighting.

4. **Fix it.** Make bold, era-defining moves through the pipeline (Blender GLB →
   styles.js → corridor.js decor + materials). Improve **both** the form AND the
   materials/palette/lighting so the screenshot reads like the concept. Rebuild the GLB
   with Blender when geometry changes.

5. **Verify in preview** (never ask the user to look):
   - `preview_console_logs` / `preview_logs` clean; app fully loaded.
   - Walk the room: no doorway block, no clipping / z-fighting, art unobstructed,
     collision channel walkable, portal reads correctly on approach.
   - After editing a cached module, `await fetch(url,{cache:'reload'})` before reload.
   - Screenshot approach + mid-room again.

6. **Score honestly, side-by-side.** Put your latest screenshot next to the concept
   sheet and rate **fidelity 1–10** (see rubric). Be your own harshest critic. If < 9,
   loop back to step 4 **within this same invocation** (budget a few refine cycles) —
   but don't spin forever on one room; if you hit diminishing returns, record the best
   score reached and move on so the next invocation can take a fresh crack.

7. **Commit + record.** `git add -A && git commit` with a message like
   `quality: <room> → <score>/10 (<what changed>)`. Update `QUALITY_LEDGER.md`:
   the room's new score, status, one-line summary of the change, and any texture the
   room still wants. Never leave the tree half-broken between commits.

8. **Exit** (the wrapper immediately re-invokes for the next room). If a check
   surfaces a regression in another room or the hub/cave, fix that first.

### Fidelity rubric (score 1–10; EXCELLENT = ≥9 and all of these hold)
- **Silhouette:** era identifiable from geometry alone; matches concept's dominant forms.
- **Concept fidelity:** portal, support rhythm, ceiling, signature ornament all present
  and read as in the sheet.
- **Material & palette:** colours, sheen, and surface feel match the concept — not flat
  grey/procedural-default. Lighting gives the intended mood.
- **Cleanliness:** no doorway block, no clipping/z-fighting, no collision traps, art
  never occluded, no console errors, loads fully.
- **Coherence & no regressions:** cel-shaded look consistent; fits the wing progression;
  hub, cave, and neighbouring rooms still build and walk correctly.

## Stopping condition

Keep going room by room across invocations until **every** room in the ledger is
`EXCELLENT (≥9)`. When all rooms clear the bar, don't stop — do a **polish pass**: raise
the bar to 10/10, sweep for cross-room coherence, and knock out the highest-value items
in `TEXTURE_SPEC.md`. If, and only if, everything is genuinely excellent and polished,
write a final line `ALL ROOMS EXCELLENT — <date>` at the top of the ledger and exit.

## `QUALITY_LEDGER.md` template (create on first run)

```markdown
# Quality Ledger — concept-art fidelity per room
# status: TODO | IN-PROGRESS | EXCELLENT   score: 1–10   (be honest)

| room | wing | score | status | last change | textures wanted |
|------|------|-------|--------|-------------|-----------------|
| prehistoric | prehistoric | ? | TODO | — | — |
| americas-andes | americas | ? | TODO | — | — |
| americas-mesoamerica | americas | ? | TODO | — | — |
| ... (one row per room in concept-art/subsections + prehistoric) | | | | | |
```

Populate every row from `concept-art/subsections/*` (plus `prehistoric`) on the first
run. 31 sections total.

## Guardrails

- **Do the work, don't just re-score.** Every invocation must leave at least one room
  materially better (or, on run 1, the full triage populated). No no-op commits.
- Don't touch `js/data/imageUrls.js` (generated) or the artwork resolver pipeline.
- Keep GLBs lean; watch draw calls (improved wings run ~84).
- One clean commit per improvement; the ledger must always reflect committed reality.
- Trust screenshots over the HUD chip. The Curator Console (`admin/`) is available for
  side-by-side QA if useful, but the preview screenshot vs. concept sheet is the
  authority.
