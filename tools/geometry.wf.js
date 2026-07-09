export const meta = {
  name: 'geometry-pass',
  description: 'Add each room\'s missing SIGNATURE ORNAMENT via Blender (the last mile to 9). Per-room geometry-specialist worker rebuilds the GLB + wires it, then an independent verifier re-scores. Serial (shared JS + one Blender at a time).',
  phases: [
    { title: 'Build', detail: 'geometry worker edits build_<glb>.py, rebuilds the GLB, wires materials/decor, renders' },
    { title: 'Verify', detail: 'independent re-score vs the concept sheet' },
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
    'READ FIRST: tools/ROOM_WORKER_ADDENDUM.md (render command, eraKey map, discipline, gotchas), the concept sheet concept-art/subsections/' + r.slug + '/Hallway-*.png (READ the image), and memory/room-architecture-kits.md (the Blender HELPER inventory: extrude_poly, arch_band/pointed_band, muqarnas honeycomb, bull_column, lashed_post, colonnette, cartouche, crenel, cusped_pts — REUSE these).',
    '',
    'PROCEDURE:',
    '1. Baseline: git status clean. Shoot ' + r.eraKey + ' approach+wall, READ them, compare to the concept. Read tools/build_' + r.glb.replace('.glb', '') + '_assets.py to learn its part structure + which helpers it already has.',
    '2. Add the ornament in the Blender build script as NEW named-prefix mesh parts (JS assigns materials by o.name.startsWith — so a new part named e.g. "Muqarnas_..." / "Relief_..." / "Jali_..." needs a matching material case). KEEP ALL EXISTING MESH NAMES STABLE (do not break current wiring). Prefer reusing the existing helper functions.',
    '3. Rebuild: /Applications/Blender.app/Contents/MacOS/Blender --background --python tools/build_' + r.glb.replace('.glb', '') + '_assets.py  (must exit 0; watch for tracebacks).',
    '4. Wire it in js/corridor.js: add the material case for the new mesh-name prefix in ' + r.style + 'Materials/apply' + '<Style>Mats, and spawn/place the new part in build<Room>Decor (use midSpots/interiorMidZ; skip within ~1.2m of an art anchor; protrusion <0.42 needs no collider). If it is a ceiling/portal part, place per the existing pattern for that kit.',
    '5. Re-shoot approach+wall+ceiling. consoleErrors MUST be 0. READ them. Iterate until the ornament reads like the concept and nothing regressed (no clipping, art unobstructed, doorway not blocked, collision channel clear).',
    '6. Commit: git add -A && git commit -m "geometry: ' + r.slug + ' ' + r.curScore + '->N/10 (<ornament added>)". Update the QUALITY_LEDGER.md row (honest score + what changed). Leave tree CLEAN.',
    '7. If the build breaks or you cannot improve it: `git checkout -- . && git clean -fd assets/models scratch_previews` to fully restore, set reverted=true, record why in the ledger note, exit. NEVER leave a broken GLB or dirty tree.',
    '',
    'Gotchas: GLB parts are NOT height-scaled in JS — model at the kit\'s ceilH. Tapered facades need a full backing slab. Never put a full-width bar across the DOOR opening (3.4w x 3.5h). Keep it mobile-lean. Score honestly (a verifier re-checks). Return ONLY the structured result.',
  ].join('\n')
}

function verifierPrompt(r, w) {
  const claimed = w && typeof w.selfScore === 'number' ? w.selfScore : 'unknown'
  return [
    'INDEPENDENT VERIFIER for "' + r.slug + '" (eraKey "' + r.eraKey + '"). cd ' + REPO + '. You did NOT build it; be adversarial.',
    '1. Shoot fresh: node tools/shoot.mjs ' + r.eraKey + ' scratch_previews/' + r.slug + '_gv_approach.png approach ; and view wall ; and view ceiling. consoleErrors MUST be 0 (else score<=4).',
    '2. READ all three renders + the concept sheet concept-art/subsections/' + r.slug + '/Hallway-*.png.',
    'CALIBRATION: do NOT penalize the bright white "STEP INTO THE LIGHT" wing-end light wall or a neighbour room down-corridor. Judge the room\'s OWN surfaces (wall/ceiling views primary). The target ornament for this pass was: ' + r.task,
    '3. Score 1-10 honestly. EXCELLENT(>=9): era clear from silhouette; signature ornament present+correct; palette+material+lighting match; no console errors / clipping / doorway-block; art unobstructed.',
    '4. If your score differs from the ledger, Edit QUALITY_LEDGER.md to it + append concrete gaps, commit "review: ' + r.slug + ' geom N/10". Leave tree clean.',
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
