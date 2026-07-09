# Overnight texture loop — Codex (worker) + Claude (supervisor)

Two memoryless agents, one shared truth on disk, one driver that gives each a
**fresh process every cycle**. A fresh process is a fresh context window / new
"thread" — so the window never fills, and the run survives indefinitely.

```
QUEUED ──Codex──▶ WIP ──Codex──▶ NEEDS-REVIEW ──Claude──▶ APPROVED   (done)
                                        │
                                        └──Claude──▶ REJECTED ──▶ (back to Codex)
                                        └──Claude──▶ BLOCKED (3 rejects → human)
```

- **Codex** (`TEXTURE_WORKER_PROMPT.md`): generates/wires ≤3 textures → `NEEDS-REVIEW`.
- **Claude** (`TEXTURE_SUPERVISOR_PROMPT.md`): independently screenshots each vs the
  concept sheet → `APPROVED` / `REJECTED` / `BLOCKED`. **Only Claude marks done.**
- Shared state: `TEXTURE_LEDGER.md` (status board), `REVIEW_LOG.md` (verdicts +
  evidence), `review/*.png` (screenshots), git history. **Nothing lives in chat.**

## Why this beats "Codex said it's done"
Codex structurally *cannot* self-certify — its best status is `NEEDS-REVIEW`, which
forces an independent Claude review that must produce a real in-app screenshot next
to the concept art before anything is `APPROVED`. "Done" is now defined by pixels
the supervisor captured, not by the worker's say-so.

## How context windows are handled (the important part)
1. **Fresh process per cycle.** The driver calls `codex exec …` and `claude -p …`
   as new processes each iteration → each starts at ~0% context. This is the
   primary mechanism; you don't have to trust an agent to notice it's full.
2. **Bounded work unit.** Worker ≤3 textures, supervisor ≤6 reviews per session, so
   a single session can't blow its window even before the process recycles.
3. **In-session self-check (belt & suspenders).** Both prompts say: if context gets
   heavy mid-batch, finish the current item, commit, print `RESUME:…`, and exit —
   the next process picks up from the ledger.
4. **Resume is trivial** because step-0 of every session is "read the ledger + git";
   there is no state to reconstruct from memory.

## Prerequisites (once, before launching)
- **Preview server up:** `python3 -m http.server 8471` from the repo's *parent*
  (so the URL is `http://localhost:8471/3d-art-museum/`), or the `museum` launch
  config. Keep it running all night.
- **Screenshot capability for the supervisor.** Interactive Claude has the
  `preview_*` screenshot MCP. For a *fully unattended* `claude -p` run, provide a
  headless shooter the agents can call and confirm it works first, e.g.
  `node tools/shoot.mjs <room> review/<slug>.png` (puppeteer: load the URL, run the
  memory teleport recipe for `<room>`, write a PNG). If you can't screenshot
  headlessly, run the **supervisor interactively** and let only Codex be headless.
- **Blender** on PATH (only if a rejected texture needs a normal map baked or a UV
  change in a `build_*` script).
- `git` clean-ish working tree; the loop commits after every cycle.
- Seed `TEXTURE_LEDGER.md` once (or let the first supervisor run seed it from the
  `TEXTURE_SPEC.md` checklist).

## The driver — `run_overnight.sh`
Serial (worker then supervisor) to avoid two agents fighting over git. Stops at the
sentinel or a max-cycle cap. Adjust the two invocation lines to your actual CLIs.

```bash
#!/usr/bin/env bash
set -uo pipefail
cd "$(dirname "$0")"                         # → 3d-art-museum/
LOG="overnight.$(date +%Y%m%d_%H%M%S).log"
MAX=${1:-40}                                 # safety cap on cycles

for ((i=1; i<=MAX; i++)); do
  if grep -q "ALL TEXTURES APPROVED" TEXTURE_LEDGER.md 2>/dev/null; then
    echo "[$(date)] SENTINEL hit — every texture APPROVED/BLOCKED. Stopping." | tee -a "$LOG"; break
  fi
  echo "[$(date)] cycle $i — WORKER (Codex)"    | tee -a "$LOG"
  codex exec  "$(cat TEXTURE_WORKER_PROMPT.md)"      >>"$LOG" 2>&1 || echo "worker exited nonzero" | tee -a "$LOG"

  echo "[$(date)] cycle $i — SUPERVISOR (Claude)" | tee -a "$LOG"
  claude -p   "$(cat TEXTURE_SUPERVISOR_PROMPT.md)" --permission-mode acceptEdits >>"$LOG" 2>&1 || echo "supervisor exited nonzero" | tee -a "$LOG"

  sleep 15
done
echo "[$(date)] loop done after $i cycles." | tee -a "$LOG"
```
Run it: `chmod +x run_overnight.sh && ./run_overnight.sh 40 &`  · watch: `tail -f overnight.*.log`.

Notes:
- **Serial, not parallel** — prevents git/file races between the two agents. Each
  cycle = Codex advances a few textures, then Claude reviews the new `NEEDS-REVIEW`.
- Replace `codex exec …` / `claude -p …` with your real headless invocations and
  the flags your setup needs (e.g. `--dangerously-skip-permissions` /
  `--allowedTools` for Claude if unattended). Keep them **fresh (non-resumed)**
  each call so context stays clean.
- If you'd rather self-pace one agent instead of a shell loop, Claude can run the
  supervisor on `/loop` and Codex on its own harness — but the shell driver is the
  most robust for true overnight.

## In the morning (2-minute review)
1. `head -1 TEXTURE_LEDGER.md` — did it hit `ALL TEXTURES APPROVED`?
2. `TEXTURE_LEDGER.md` — scan for `BLOCKED` rows (need you) and any low scores.
3. `REVIEW_LOG.md` + `review/*.png` — the audit trail: what the supervisor saw and
   why it approved/rejected each. `git log --oneline` — one commit per cycle.
4. Spot-check a couple of `APPROVED` rooms yourself in the preview to confirm the
   supervisor's bar matches yours; if it's too lenient, tighten the rubric
   thresholds in `TEXTURE_SUPERVISOR_PROMPT.md` (raise the APPROVED floor to 9,
   add specific failure modes you saw) and re-run.

## Files
- `TEXTURE_SUPERVISOR_PROMPT.md` — Claude, the QA gate (the review loop).
- `TEXTURE_WORKER_PROMPT.md` — Codex, generate + wire → NEEDS-REVIEW.
- `TEXTURE_LEDGER.md` — status board (single source of truth).
- `REVIEW_LOG.md` — supervisor verdicts + screenshot evidence (append-only).
- `TEXTURE_SPEC.md` — what each texture must be + the quality gate rubric.
