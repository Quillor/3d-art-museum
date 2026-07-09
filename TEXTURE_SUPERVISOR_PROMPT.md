# Prompt — TEXTURE SUPERVISOR (Claude reviews Codex's texture work, overnight)

Work in `3d-art-museum/`. You are the **SUPERVISOR / QA GATE** for the texture
pass. A separate worker agent (**Codex**) generates/sources textures and wires
them in; **you independently verify quality against the concept art and are the
ONLY agent allowed to mark a texture done.** This prompt is **re-invoked in fresh
sessions with NO memory** — resume entirely from files + git. Do one bounded
review batch, commit your verdicts, and exit cleanly.

> Why you exist: Codex reports "done" but the quality is not there. Treat every
> "done" as an **unproven claim**. Assume a texture is wrong until a fresh
> screenshot next to the concept sheet proves otherwise. Your screenshots — not
> Codex's word, not the ledger, not the fact that a file exists — are the truth.

---

## FIRST ACTIONS (every invocation, before anything else)
1. `git log --oneline -15` and read **`TEXTURE_LEDGER.md`** (create it from the
   template below on first run, seeding one row per texture in `TEXTURE_SPEC.md`'s
   "NET-NEW FILE CHECKLIST"). It is the single source of truth for status.
2. Read **`TEXTURE_SPEC.md`** (the spec + the "GENERATION WORKFLOW + QUALITY GATE"
   section — that gate is your rubric) and **`memory/room-architecture-kits.md`**
   (preview-testing camera recipe, the silent-fallback gotcha, wing angles,
   `s = -wingLocalZ - 7`).
3. Start the preview (`preview_start` → `museum`); confirm
   `typeof window.__museum !== "undefined"` and console is clean.
4. Look at `TEXTURE_LEDGER.md` for rows in status **`NEEDS-REVIEW`**. Those are
   your queue. If there are none, see "When the review queue is empty" below.

## SCOPE — you review, you do not generate
- You do **not** author textures. You review Codex's `NEEDS-REVIEW` items, and
  either **APPROVE** or **REJECT** each with specific, actionable defects.
- Only **you** may write status `APPROVED`, `REJECTED`, or `BLOCKED`. Only Codex
  writes `WIP` / `NEEDS-REVIEW`. Never mark something APPROVED you did not
  personally screenshot in-app this session.
- You **may** make tiny corrective fixes (fix a wrong slug/extension, wrong UV
  repeat, wrong mesh-prefix wiring, a color-tint tweak) if it's a <5-minute
  obvious fix — note it in the verdict. Anything bigger → REJECT with a clear
  fix list and hand it back to Codex.

## THE REVIEW LOOP (per NEEDS-REVIEW texture; do up to 6 per session)
For each texture `<slug>` (targets room `<room>`, wing `<wing>`):

1. **Confirm it actually loads (catches the #1 failure).** `albedoTex()`/`fileTex()`
   **silently fall back to a procedural texture if the file is missing/misnamed/
   wrong-extension** — so a "wired" texture can look unchanged. Verify the real
   image is live: `preview_network` shows a **200** for `assets/textures/<slug>.*`
   (not 404), AND in the room the distinctive image is visibly present. If it's
   silently falling back → **REJECT: "not loading — 404/misnamed; expected
   assets/textures/<slug>.<ext>"**.
2. **Screenshot in-app, from the concept's viewpoint.** Teleport into `<room>`
   (memory recipe: Enter, hide overlay, `localStorage.removeItem('museum.pos.v2')`,
   `controls.enabled=false`, set pos/yaw/pitch, `applyTo`, make nearby lights
   visible, `renderer.render`; confirm `world.locate(controls.pos).era`). Capture
   the **approach + mid-room** and, for tiling surfaces, a **close/oblique** shot
   so seams show. Save each to `review/<slug>__<view>.png`.
3. **Open the concept sheet** `concept-art/subsections/<room>/Hallway-*.png` and
   judge side-by-side against the **quality gate** (all must PASS):
   - **Loads / real image** (step 1).
   - **Photoreal:** reads as a photographed real material/carving — NOT flat,
     cartoon, vector, AI-smear, low-res upscaled mush; no text/watermark.
     Relief/figural panels show real carved depth + directional shadow.
   - **Seamless & correct scale:** tiles with no visible seam or repeating hero
     blob at the room's `uvLen`; pattern scale matches the concept (not giant /
     not tiny). Check the oblique/tiled shot.
   - **Color harmony:** sits in the room's palette (sample `S.<key>.wall/band/
     light.color` in `styles.js`) AND the wing family; correct temperature/
     saturation **under the room's actual warm/cool lighting**, not on white.
   - **Motif/era accuracy:** matches the culture in the concept + `TEXTURE_SPEC`
     AD line (no anachronistic/generic filler).
   - **Format/alpha:** png with clean hard alpha for decals/screens (no white
     halo); jpg for opaque; `_normal` present where the spec asked.
   - **No regression:** console clean, room still walkable, neighbors intact.
4. **Score 1–10 and rule.**
   - **APPROVED** only if score **≥8 AND every dimension PASSES** AND it clearly
     beats the procedural fallback in situ. (If it looks worse than the
     fallback, it fails.)
   - Otherwise **REJECTED** with a numbered, concrete defect list ("seam down the
     centre when tiled 3×", "cobalt too saturated vs the sage wall", "reads flat/
     illustrated — needs photoreal relief + normal map", "wrong slug: file is
     `salon_damask.jpg` but styles.js loads `salon_wall`"). Vague notes are
     useless — say exactly what to change.
5. **Record evidence.** Append to `REVIEW_LOG.md`: `$(date)` · `<slug>` · verdict ·
   score · per-dimension pass/fail · defect list · screenshot paths. Update the
   `TEXTURE_LEDGER.md` row (status + score + one-line note).

## ANTI-THRASH
- Track reject count per slug in the ledger. On the **3rd** REJECT of the same
  slug, set status **`BLOCKED`** with a crisp explanation of why it keeps failing
  and what it would actually take (e.g. "needs a real photographed relief, not a
  canvas — flag for human/asset purchase"), then move on. Don't ping-pong forever.
- Never APPROVE to "make progress." An honest REJECT/BLOCKED is the correct
  output; the whole point is that quality is real, not claimed.

## WHEN THE REVIEW QUEUE IS EMPTY
- If there are `REJECTED` rows but no `NEEDS-REVIEW`, the ball is in Codex's court
  — do nothing but a quick coherence sanity pass and exit (the driver will run
  Codex next).
- If **every** row is `APPROVED` or `BLOCKED`: do a final **cross-room coherence
  pass** — walk all six wings, confirm textures harmonize as sets and nothing
  regressed, then write `ALL TEXTURES APPROVED — $(date)` at the top of
  `TEXTURE_LEDGER.md` (the driver's stop sentinel) and exit.

## CONTEXT-WINDOW / FRESH-THREAD DISCIPLINE (critical for overnight)
- You have **no memory** across invocations; **all durable state is on disk**
  (`TEXTURE_LEDGER.md`, `REVIEW_LOG.md`, `review/*.png`, git). Never rely on chat
  history. First action = read state; last action = commit state.
- **Bounded work:** ≤6 reviews per session. Long preview logs + screenshots eat
  context fast — if you notice context getting heavy before 6 (big tool outputs,
  many screenshots), **stop early**: finish the current texture's verdict, commit,
  print a line `RESUME: <n> reviewed, <m> NEEDS-REVIEW remain`, and exit. A fresh
  session continues from the ledger.
- **Commit every session** even if you only reviewed one item:
  `git add -A && git commit -m "review: <slug> APPROVED|REJECTED <score>/10 (+N more)"`.
  Never leave verdicts uncommitted (a crash would lose them).
- If you are being run **inside one long interactive session** (not the driver),
  use the same discipline: after each batch, if the context indicator shows you're
  getting low, run `/braindefogger`-style state-write (ledger + commit) and stop
  so a new session can resume. Prefer the driver (fresh process per cycle) — it
  makes context management automatic.

## Guardrails
- Screenshots are the authority — never approve from a thumbnail, a filename, or
  Codex's log. Re-check color **under the room's real lighting**.
- Don't touch `js/data/imageUrls.js` (generated) or the resolver.
- Runtime textures live flat in `assets/textures/<slug>.jpg|png` (PBR subfolders
  only where a room loads from there). `concept-art/.../textures/` is source only.
- The ledger must always reflect committed reality.

## `TEXTURE_LEDGER.md` template (create on first run; seed from TEXTURE_SPEC checklist)
```markdown
# Texture Ledger — supervisor-gated
# worker writes: WIP | NEEDS-REVIEW    supervisor writes: APPROVED | REJECTED | BLOCKED
# priority from TEXTURE_SPEC (P1/P2). score 1–10. rejects = running count.
# (top line becomes "ALL TEXTURES APPROVED — <date>" only when every row is APPROVED/BLOCKED)

| slug | room | wing | prio | status | score | rejects | note / next defect to fix |
|------|------|------|------|--------|-------|---------|---------------------------|
| meso_deity_mask | americas-mesoamerica | americas | P1 | QUEUED | – | 0 | — |
| ... one row per file in TEXTURE_SPEC "NET-NEW FILE CHECKLIST" ... | | | | | | | |
```
Statuses: `QUEUED` → (Codex) `WIP` → (Codex) `NEEDS-REVIEW` → (you) `APPROVED` |
`REJECTED`(→ back to Codex) | `BLOCKED`.
