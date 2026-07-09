# Overnight 3D-Quality Loop — RUNBOOK (how a fresh thread continues this)

This is the live operational state of the overnight quality push. If you are a fresh
Claude thread picking this up: read this, then continue the loop. All state is on disk.

## What's running
- **Solo mode.** Codex (the texture worker) is PAUSED so it doesn't clobber shared JS
  (styles.js/corridor.js). Do NOT run Codex concurrently. The Codex texture want-list is a
  deliverable at `CODEX_TEXTURE_PROMPT.md` (for the user to run later / in isolation).
- **Driver:** a Workflow script at
  `<scratchpad>/overnight_rooms.wf.js` (scratchpad = this session's temp dir; if gone, the
  script is embedded in git history of this runbook's commits — or re-derive from below).
  It processes a batch of rooms **serially** (they edit shared JS, so never parallel):
  each room gets a **worker** subagent (agentType general-purpose) then an **independent
  verifier** subagent. Launch it with the Workflow tool:
  `Workflow({scriptPath, args: <JSON array of rooms>})` where each room is
  `{slug, eraKey, style, curScore}`.

## The loop (per batch)
1. Read `QUALITY_LEDGER.md`. Pick the next batch of ~6 rooms: **lowest verified score first**,
   ties in wing order (americas→asia→europe→middle-east→oceania→prehistoric).
   - **Skip `GEOM-BLOCKED` rooms** (they need a Blender GLB build a worker can't do in JS —
     handle those yourself in a dedicated pass, pausing the workflow).
   - The 4 `*-modern` rooms SHARE `modern.glb`+`S.modern`; don't stack more than one per batch
     (improving the kit lifts all four).
2. Launch the workflow for that batch (background). Wait for the completion notification.
3. On completion: read the returned results (verified scores + gaps + texturesWanted).
   Spot-check 1–2 renders yourself (`node tools/shoot.mjs <eraKey> scratch_previews/x.png approach`
   then Read it) to confirm the verifier's read. The verifier is honest but harsh; workers are
   net-positive but plateau below 9 and inflate self-scores (the verifier corrects the ledger).
4. Append any new `texturesWanted` to `CODEX_TEXTURE_PROMPT.md`.
5. Repeat until every room is EXCELLENT (≥9) or GEOM-BLOCKED. Rooms below 9 get re-selected on
   later passes and re-worked using their recorded gaps (multi-pass across batches).

## Hard-won lessons (baked into `tools/ROOM_WORKER_ADDENDUM.md`)
- **Brightness is the #1 defect.** Dark grey stone base colors render near-black no matter the
  light intensity — LIGHTEN the wall/ceiling base hex first. Never touch global ambient/hemi in
  main.js (breaks the cave + every room).
- **Don't over-brighten into blowout** (pure-white far ends are also a fail).
- **Some SHIPPED textures render too dark** and defeat lighting (e.g. `salon2_sage_damask`,
  `salon2_parquet`, dark `oceania_*`) — workers drop them for procedural; Codex must regenerate
  them lighter (see `CODEX_TEXTURE_PROMPT.md` "render TOO DARK" section).
- **A weak/blurry image texture is worse than good procedural** — prefer the procedural generators.
- Workers must attack biggest gaps in order: brightness → signature ornament → palette → floor →
  detail. Neighbour-room bleed down-corridor is expected; make the room's own surfaces dominate.

## Renderer + verify
- Static server must be up on :8471 serving the parent dir (URL `http://localhost:8471/3d-art-museum/`).
  Check: `curl -s -o /dev/null -w '%{http_code}' http://localhost:8471/3d-art-museum/index.html` → 200.
- `node tools/shoot.mjs <eraKey> <out.png> <approach|wall|ceiling>` — prints `consoleErrors: N`
  (must be 0). eraKey↔slug↔style map is in `tools/ROOM_WORKER_ADDENDUM.md`.
- Blender: `/Applications/Blender.app/Contents/MacOS/Blender --background --python tools/build_<glb>_assets.py`.

## Progress so far (see QUALITY_LEDGER.md for the live truth)
- EXCELLENT(9): americas-native-north, europe-romantic (pre-existing).
- Worked this run: middle-east-neolithic 5→8 (by hand, reference); andes 6, americas-modern 6,
  europe-impressionism 5, oceania-ancient 4 GEOM-BLOCKED (one worker+verifier pass each).
- ~24 rooms still 5–8 awaiting passes.

## Guardrails
- One clean commit per room (worker) + one per review (verifier). Never leave a dirty/broken tree.
- Don't edit the repo tree while a workflow batch is running (you'll clobber the active worker).
  Do your own edits / commits only in the clean window between batches.
- Never touch `js/data/imageUrls.js` or the artwork resolver.
