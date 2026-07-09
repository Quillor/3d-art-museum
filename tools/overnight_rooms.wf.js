export const meta = {
  name: 'overnight-room-quality',
  description: 'Serially improve museum rooms to match their concept art; each room gets a worker subagent then an independent adversarial verifier. Serial because rooms edit shared JS (corridor.js/styles.js).',
  phases: [
    { title: 'Improve', detail: 'one worker subagent per room (serial — shared JS files); edits styles/corridor/Blender, renders headlessly, commits, updates ledger' },
    { title: 'Verify', detail: 'independent subagent re-shoots + re-scores vs the concept sheet; corrects the ledger if inflated' },
  ],
}

const REPO = '/Users/timrosenberg/claude/Art Museum/3d-art-museum'
let rooms = []
if (Array.isArray(args)) rooms = args
else if (typeof args === 'string' && args.trim()) { try { rooms = JSON.parse(args) } catch (e) { rooms = [] } }
else if (args && typeof args === 'object' && Array.isArray(args.rooms)) rooms = args.rooms
log('parsed ' + rooms.length + ' room(s) to process')

const WORKER_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['room', 'selfScore', 'consoleErrorsZero', 'committed', 'changes'],
  properties: {
    room: { type: 'string' },
    selfScore: { type: 'integer', minimum: 1, maximum: 10 },
    rebuiltGlb: { type: 'boolean' },
    changes: { type: 'string', description: 'one-line summary of what changed' },
    texturesWanted: { type: 'string', description: 'any image texture that would push this room higher than procedural can, else empty' },
    consoleErrorsZero: { type: 'boolean' },
    committed: { type: 'boolean' },
  },
}

const VERIFIER_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['room', 'verifiedScore', 'excellent', 'gaps'],
  properties: {
    room: { type: 'string' },
    verifiedScore: { type: 'integer', minimum: 1, maximum: 10 },
    excellent: { type: 'boolean', description: 'true only if verifiedScore >= 9 and all rubric points hold' },
    gaps: { type: 'string', description: 'concrete gaps still separating render from concept' },
    ledgerCorrected: { type: 'boolean' },
  },
}

function workerPrompt(r) {
  return [
    'You are the ROOM WORKER for the museum room "' + r.slug + '" (eraKey "' + r.eraKey + '", style key "' + r.style + '", current ledger score ' + r.curScore + '/10).',
    'Work ENTIRELY in ' + REPO + ' — cd there first and run ALL commands (node, blender, git) from there.',
    '',
    'READ FIRST, in order (these contain everything; you have no prior memory):',
    '1. tools/ROOM_WORKER_ADDENDUM.md — your full playbook: the exact render command, the proven recipe, hard gotchas, the texture-helper inventory, and discipline rules. FOLLOW IT EXACTLY.',
    '2. OVERNIGHT_QUALITY_PROMPT.md — the mission and the 1–10 fidelity rubric.',
    '3. The concept ground truth: concept-art/subsections/' + r.slug + '/Hallway-*.png (READ the PNG — you can see images) and concept-art/subsections/' + r.slug + '/README.md.',
    '4. The two memory files named in the addendum (art-museum-project.md, room-architecture-kits.md).',
    '',
    'THEN improve THIS ONE room so its render reads like the concept sheet:',
    '- Read your room QUALITY_LEDGER.md row FIRST — if a verifier already listed gaps, THAT is your punch-list; fix those specifically.',
    '- Baseline: git status must be clean. Shoot approach+wall+ceiling via `node tools/shoot.mjs ' + r.eraKey + ' scratch_previews/' + r.slug + '_<view>_before.png <view>` and READ them. consoleErrors must be 0.',
    '- Follow the addendum section "WHAT ACTUALLY MOVES THE SCORE" and attack gaps in that order. BRIGHTNESS is usually #1: if the approach render looks dark/murky/black-ceilinged, LIGHTEN the wall+ceiling BASE HEX in S.' + r.style + ' (dark grey renders near-black — a bigger win than any intensity tweak), then raise light intensity/every/dist, and RE-SHOOT until it is visibly, evenly lit like the concept. Next make the SIGNATURE ornament legible; then palette; then floor. Prefer JS-only fixes (js/styles.js S.' + r.style + ', js/corridor.js ' + r.style + 'Materials / build*Decor); rebuild the Blender GLB only if the silhouette is wrong. NEVER touch the global ambient/hemisphere in js/main.js.',
    '- Re-shoot all 3 views after EACH change; consoleErrors: 0 required; iterate 3–5 cycles until the render genuinely reads like the concept. A number you changed but did not visually confirm in a re-shoot is NOT done.',
    '- Commit: git add -A && git commit -m "quality: ' + r.slug + ' ' + r.curScore + '->N/10 (what changed)". Update the QUALITY_LEDGER.md row for ' + r.slug + ' (honest new score, one-line change, textures still wanted); commit it. Leave the tree CLEAN.',
    '- If you break it or cannot improve it: `git checkout -- . && git clean -fd assets/models scratch_previews`, record the attempt honestly in the ledger note, exit.',
    '',
    'Be HONEST about selfScore — an independent verifier re-shoots and re-scores this room right after you, so inflation is caught and wastes a cycle. Return ONLY the structured result.',
  ].join('\n')
}

function verifierPrompt(r, w) {
  const claimed = w && typeof w.selfScore === 'number' ? w.selfScore : 'unknown'
  return [
    'You are the INDEPENDENT VERIFIER for museum room "' + r.slug + '" (eraKey "' + r.eraKey + '"). You did NOT build it. Be adversarial and harsh — your job is to catch a room that does NOT actually match its concept.',
    'Work in ' + REPO + ' — cd there; run all commands there.',
    '',
    '1. Shoot the room yourself, fresh: `node tools/shoot.mjs ' + r.eraKey + ' scratch_previews/' + r.slug + '_verify_approach.png approach` and again with view `wall`. consoleErrors MUST be 0 — if it is not, the room FAILS: cap the score at 4 and record the error text.',
    '2. READ your two renders AND the concept sheet concept-art/subsections/' + r.slug + '/Hallway-*.png. Compare them directly.',
    '3. Score fidelity 1–10 per the rubric in OVERNIGHT_QUALITY_PROMPT.md. EXCELLENT (>=9) requires ALL of: era identifiable from silhouette; portal/support/ceiling/signature ornament present and correct; palette+material+lighting match the concept (NOT flat, procedural-default, muddy, or too dark); no clipping / z-fighting / doorway-block; no console errors; art unobstructed.',
    '4. List concrete remaining GAPS (specific and actionable, e.g. "floor still too dark", "no visible <ornament> from the sheet", "portal arch is round but concept is pointed", "walls read grey not <colour>").',
    '5. If your verified score differs from the current ledger score for ' + r.slug + ', Edit QUALITY_LEDGER.md to your verified score and append your top gaps to that row, then commit: git commit -am "review: ' + r.slug + ' verified N/10". Leave the tree clean.',
    '',
    'The worker claimed ' + claimed + '/10 — judge INDEPENDENTLY, do not echo it. Return ONLY the structured result.',
  ].join('\n')
}

const results = []
for (let i = 0; i < rooms.length; i++) {
  const r = rooms[i]
  log('ROOM ' + (i + 1) + '/' + rooms.length + ': ' + r.slug + ' (eraKey ' + r.eraKey + ', start ' + r.curScore + '/10)')
  const w = await agent(workerPrompt(r), { label: 'work:' + r.slug, phase: 'Improve', agentType: 'general-purpose', schema: WORKER_SCHEMA })
  const v = await agent(verifierPrompt(r, w), { label: 'verify:' + r.slug, phase: 'Verify', agentType: 'general-purpose', schema: VERIFIER_SCHEMA })
  results.push({
    slug: r.slug,
    eraKey: r.eraKey,
    startScore: r.curScore,
    selfScore: w ? w.selfScore : null,
    verifiedScore: v ? v.verifiedScore : null,
    excellent: !!(v && v.excellent),
    rebuiltGlb: !!(w && w.rebuiltGlb),
    texturesWanted: (w && w.texturesWanted) || '',
    gaps: (v && v.gaps) || '',
  })
  log('  done ' + r.slug + ': self ' + (w ? w.selfScore : 'null') + ' / verified ' + (v ? v.verifiedScore : 'null') + ((v && v.excellent) ? ' — EXCELLENT' : ''))
}
return results
