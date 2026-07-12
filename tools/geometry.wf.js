export const meta = {
  name: 'geometry-pass',
  description: 'Build historically evidenced room geometry, then independently verify it against the room registry and production gates. Serial because runtime integration uses shared JS and one Blender process.',
  phases: [
    { title: 'Build', detail: 'geometry worker edits build_<glb>.py, rebuilds the GLB, wires materials/decor, renders' },
    { title: 'Verify', detail: 'independent review against evidence, scope, clearance, and production gates' },
  ],
}

const REPO = '/Users/timrosenberg/claude/Art Museum/3d-art-museum'
let rooms = []
if (Array.isArray(args)) rooms = args
else if (typeof args === 'string' && args.trim()) { try { rooms = JSON.parse(args) } catch (e) { rooms = [] } }
log('geometry pass over ' + rooms.length + ' room(s)')

const WORKER_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['room', 'selfScore', 'glbRebuilt', 'consoleErrorsZero', 'committed', 'changes'],
  properties: {
    room: { type: 'string' }, selfScore: { type: 'integer', minimum: 1, maximum: 10 },
    glbRebuilt: { type: 'boolean' }, changes: { type: 'string' },
    consoleErrorsZero: { type: 'boolean' }, committed: { type: 'boolean' },
    reverted: { type: 'boolean', description: 'true if you had to restore because the build broke / no improvement' },
  },
}
const VERIFIER_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['room', 'verifiedScore', 'excellent', 'gaps'],
  properties: {
    room: { type: 'string' }, verifiedScore: { type: 'integer', minimum: 1, maximum: 10 },
    excellent: { type: 'boolean' }, gaps: { type: 'string' }, ledgerCorrected: { type: 'boolean' },
  },
}

function workerPrompt(r) {
  return [
    'You are a BLENDER GEOMETRY SPECIALIST improving museum room "' + r.slug + '" (eraKey "' + r.eraKey + '", style "' + r.style + '", GLB assets/models/' + r.glb + ', current ' + r.curScore + '/10).',
    'cd ' + REPO + ' and run ALL commands there. You have no prior memory — everything is on disk.',
    '',
    'YOUR SPECIFIC TASK (the signature ornament this room is missing, from the verifier punch-list):',
    '>>> ' + r.task,
    '',
    'READ FIRST: concept-art/PRODUCTION_STANDARD.md, concept-art/room-designs.json, concept-art/ROOM_DESIGN_BIBLES.md, and the relevant legacy subsection README. Legacy Hallway PNGs are mood-only and may not establish architecture, motifs, textures, measurements, or unseen geometry.',
    '',
    'PROCEDURE:',
    '1. Baseline: inspect git status without altering user changes. Shoot ' + r.eraKey + ' approach+wall, read them, and compare to the authoritative anchor/scope. Read tools/build_' + r.glb.replace('.glb', '') + '_assets.py to learn its part structure and runtime name contracts.',
    '2. Add only sourced, permitted geometry in the Blender build script as stable named parts. KEEP ALL EXISTING RUNTIME-REQUIRED MESH NAMES STABLE. Do not manufacture sacred, genealogical, funerary, or living-community motifs.',
    '3. Rebuild: /Applications/Blender.app/Contents/MacOS/Blender --background --python tools/build_' + r.glb.replace('.glb', '') + '_assets.py  (must exit 0; watch for tracebacks).',
    '4. Wire it in js/corridor.js only when requested: use the shared layout.js keep-out helpers, preserve at least the full frame+plaque envelope, and add collision for any circulation intrusion.',
    '5. Re-shoot approach+wall+ceiling. consoleErrors MUST be 0. Iterate until the asset passes historical scope, silhouette, material-boundary, artwork-clearance, doorway, collision, and repetition checks.',
    '6. Do not commit or alter unrelated files. Report changed paths, source/evidence assumptions, bounds, triangle counts, and remaining review gates.',
    '7. If the build breaks or cannot be improved safely, stop and report the exact failure; do not run destructive restore or clean commands.',
    '',
    'Gotchas: GLB parts are NOT height-scaled in JS — model at the kit\'s ceilH. Tapered facades need a full backing slab. Never put a full-width bar across the DOOR opening (3.4w x 3.5h). Keep it mobile-lean. Score honestly (a verifier re-checks). Return ONLY the structured result.',
  ].join('\n')
}

function verifierPrompt(r, w) {
  const claimed = w && typeof w.selfScore === 'number' ? w.selfScore : 'unknown'
  return [
    'INDEPENDENT VERIFIER for "' + r.slug + '" (eraKey "' + r.eraKey + '"). cd ' + REPO + '. You did NOT build it; be adversarial.',
    '1. Shoot fresh: node tools/shoot.mjs ' + r.eraKey + ' scratch_previews/' + r.slug + '_gv_approach.png approach ; and view wall ; and view ceiling. consoleErrors MUST be 0 (else score<=4).',
    '2. READ all three renders plus concept-art/room-designs.json and concept-art/PRODUCTION_STANDARD.md. Treat legacy concept PNGs as mood-only.',
    'CALIBRATION: do NOT penalize the bright white "STEP INTO THE LIGHT" wing-end light wall or a neighbour room down-corridor. Judge the room\'s OWN surfaces (wall/ceiling views primary). The target ornament for this pass was: ' + r.task,
    '3. Score 1-10 honestly. EXCELLENT(>=9): anchor clear from silhouette; every signature element is evidenced and permitted; palette/material/lighting coherent; no console errors, clipping, doorway block, art obstruction, or unsafe repetition.',
    '4. Do not edit a task ledger and do not commit. Return concrete gaps and any failed G0-G8 gate.',
    'Worker claimed ' + claimed + '. Judge independently. Return ONLY the structured result.',
  ].join('\n')
}

const results = []
for (let i = 0; i < rooms.length; i++) {
  const r = rooms[i]
  log('GEOM ' + (i + 1) + '/' + rooms.length + ': ' + r.slug + ' — ' + r.task.slice(0, 60))
  const w = await agent(workerPrompt(r), { label: 'geom:' + r.slug, phase: 'Build', agentType: 'general-purpose', schema: WORKER_SCHEMA })
  const v = await agent(verifierPrompt(r, w), { label: 'verify:' + r.slug, phase: 'Verify', agentType: 'general-purpose', schema: VERIFIER_SCHEMA })
  results.push({ slug: r.slug, startScore: r.curScore, selfScore: w ? w.selfScore : null, verifiedScore: v ? v.verifiedScore : null, excellent: !!(v && v.excellent), glbRebuilt: !!(w && w.glbRebuilt), reverted: !!(w && w.reverted), gaps: (v && v.gaps) || '' })
  log('  ' + r.slug + ': self ' + (w ? w.selfScore : '?') + ' / verified ' + (v ? v.verifiedScore : '?') + ((v && v.excellent) ? ' EXCELLENT' : ''))
}
return results
