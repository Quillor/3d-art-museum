export const meta = {
  name: 'overnight-room-quality',
  description: 'Serially improve museum rooms against their authoritative historical registry and production gates, followed by an independent adversarial verifier.',
  phases: [
    { title: 'Improve', detail: 'one worker per room; evidence-led runtime/Blender changes and headless renders' },
    { title: 'Verify', detail: 'independent subagent checks history, cultural gates, materials, circulation, signs, and rendering' },
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
    'READ FIRST, in order:',
    '1. concept-art/PRODUCTION_STANDARD.md — required evidence, assets, materials, clearance, screenshots, and G0-G8 gates.',
    '2. concept-art/room-designs.json and concept-art/ROOM_DESIGN_BIBLES.md — exact room scope, anchor, palette adaptation, limits, and cultural-review state.',
    '3. The matching concept-art/subsections/' + r.slug + '/README.md. Any Hallway PNG is mood-only and never historical ground truth.',
    '',
    'THEN improve THIS ONE room so its render reads like the concept sheet:',
    '- Read the room registry entry first; its blockers and adaptation limits are the punch-list.',
    (r.task ? '- HIGHEST-IMPACT FIX (a fresh independent verifier flagged this as the #1 lever — do it FIRST, then re-shoot to confirm): ' + r.task : ''),
    '- Inspect git status without altering user changes. Shoot approach+wall+ceiling via `node tools/shoot.mjs ' + r.eraKey + ' scratch_previews/' + r.slug + '_<view>_before.png <view>` and read them. consoleErrors must be 0.',
    '- Fix the highest failed gate first: scope/anchor and cultural safety, then entrance/signage and artwork clearance, then coherent physical materials and lighting, then modeled detail and controlled variation. Never tune toward a legacy beauty render at the expense of evidence.',
    '- Re-shoot all 3 views after EACH change; consoleErrors: 0 required; iterate 3–5 cycles until the render genuinely reads like the concept. A number you changed but did not visually confirm in a re-shoot is NOT done.',
    '- Do not commit, stage, or touch unrelated files. Report the exact changed paths, validations, and remaining G0-G8 blockers.',
    '- If you break it or cannot improve it safely, stop and report the failure; never run destructive restore or clean commands.',
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
    '2. READ your two renders plus concept-art/room-designs.json and concept-art/PRODUCTION_STANDARD.md. A legacy concept sheet is mood-only.',
    'CALIBRATION — do NOT penalize these (they are by-design, not the room\'s fault): (a) a bright WHITE far wall with a "STEP INTO THE LIGHT / return to the Grand Crossing" placard down the approach corridor — that is the INTENTIONAL wing-end light wall (teleport back to the hub), NOT a blown-out/overexposed defect; (b) a different-era room bleeding in down-corridor (neighbour rooms are always visible through the far portal). Judge the ROOM\'S OWN walls, ceiling, floor, ornament and lighting PRIMARILY from the `wall` and `ceiling`/near-field, and only from the room\'s own near surfaces in `approach`. If the room reads correct in the wall view and only the far-corridor light-wall/neighbour looks "off", that is NOT a defect — score the room on its own merits.',
    '3. Score 1–10 against the production standard. EXCELLENT (>=9) requires: anchor identifiable from silhouette; sourced/permitted architecture; coherent source-authored PBR materials; legible dual-facing sign; no clipping, z-fighting, doorway block, console error, cultural-gate violation, or art obstruction.',
    '4. List concrete remaining GAPS (specific and actionable, e.g. "floor still too dark", "no visible <ornament> from the sheet", "portal arch is round but concept is pointed", "walls read grey not <colour>").',
    '5. Do not edit a task ledger and do not commit. Return concrete failed gates and gaps.',
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
