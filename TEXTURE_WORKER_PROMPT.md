# Prompt — TEXTURE WORKER (Codex) — generate + wire, hand to the supervisor

Work in `3d-art-museum/`. You **generate/source the textures** in `TEXTURE_SPEC.md`
and wire them into the app. You are re-invoked in **fresh sessions with NO memory**
— resume from `TEXTURE_LEDGER.md` + git. Do a small batch, hand it to review, exit.

> You do NOT decide when a texture is done. A separate SUPERVISOR (Claude)
> independently verifies every texture in-app against the concept art and is the
> only one who marks it `APPROVED`. Your job ends at `NEEDS-REVIEW`. Do not write
> `APPROVED`. Do not mark the whole task complete. "Looks fine to me" is not a
> status — `NEEDS-REVIEW` is.

## FIRST ACTIONS (every invocation)
1. `git log --oneline -15`; read `TEXTURE_LEDGER.md`, `TEXTURE_SPEC.md` (esp. the
   **GENERATION WORKFLOW + QUALITY GATE**), and `REVIEW_LOG.md` (the supervisor's
   defect lists — your rejected items and exactly why).
2. Read `memory/room-architecture-kits.md` for wiring conventions (materials by
   mesh-name PREFIX; `albedoTex()`/`fileTex()` load `assets/textures/<slug>`;
   silent fallback if misnamed) and the preview camera recipe.
3. Start the preview (`preview_start` → `museum`).

## PICK YOUR BATCH (≤3 textures per session — generation is heavy)
Priority order:
1. Any row in status **`REJECTED`** — fix exactly the defects the supervisor
   listed in `REVIEW_LOG.md`, then re-submit. (Rejected work comes first.)
2. Then the highest-priority **`QUEUED`** rows (P1 before P2), wing order for ties.
Set each to `WIP` in the ledger as you start it.

## DO THE WORK (per texture — follow the TEXTURE_SPEC quality gate)
- Generate/source at the target resolution/aspect from the spec. **Generate in a
  fresh model session when your image output degrades** (flat/desaturated/off-brief)
  — do not push a tired context; small batches only.
- Self-gate before submitting: seamless (inspect tiled 3×3), photorealistic (not
  flat/cartoon/AI-smear), color-harmonized with the room palette + wing, correct
  motif/era, clean alpha for pngs, `_normal` where the spec asks.
- **Export to the exact path** `assets/textures/<slug>.<ext>` (flat folder, exact
  slug — a wrong name/extension silently falls back and the supervisor will REJECT
  it). Keep runtime copies lean (1024²; bands 2048×512).
- **Wire it** and confirm it actually loads in-app (`preview_network` 200 for the
  file; the image visibly appears in the room — not the procedural fallback).
- Reload edited modules with `await fetch(url,{cache:'reload'})` before page reload.

## HAND OFF (do NOT self-certify)
- Set each finished texture's ledger row to **`NEEDS-REVIEW`** (never `APPROVED`).
- `git add -A && git commit -m "texture: <slug> → NEEDS-REVIEW (<what you did>)"`.
- Exit. The supervisor runs next and will APPROVE or REJECT with specifics.

## CONTEXT / FRESH-THREAD DISCIPLINE
- No memory across runs; **all state on disk** (ledger, git, REVIEW_LOG). First
  action = read state, last action = commit state.
- ≤3 textures per session. If context gets heavy sooner, finish the current file,
  set it `NEEDS-REVIEW`, commit, print `RESUME: <n> submitted`, and exit.
- Never leave the tree half-broken; every commit must load cleanly.

## Guardrails
- Don't write `APPROVED`/`REJECTED`/`BLOCKED` (supervisor-only). Don't declare the
  task finished — the supervisor writes the final `ALL TEXTURES APPROVED` line.
- Don't touch `js/data/imageUrls.js` or the resolver. Keep it no-build/static.
