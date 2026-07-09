export const meta = {
  name: 'verify-refresh',
  description: 'Parallel read-only re-verify of rooms after the Codex texture regeneration — captures the new honest score + whether geometry is still needed. No file writes, so it parallelizes safely.',
  phases: [{ title: 'Verify', detail: 'independent adversarial re-score vs concept sheet, in parallel (read-only)' }],
}

const REPO = '/Users/timrosenberg/claude/Art Museum/3d-art-museum'
let rooms = []
if (Array.isArray(args)) rooms = args
else if (typeof args === 'string' && args.trim()) { try { rooms = JSON.parse(args) } catch (e) { rooms = [] } }
log('verifying ' + rooms.length + ' room(s) in parallel')

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['room', 'score', 'excellent', 'needsGeometry', 'topFix'],
  properties: {
    room: { type: 'string' },
    score: { type: 'integer', minimum: 1, maximum: 10 },
    excellent: { type: 'boolean' },
    needsGeometry: { type: 'boolean', description: 'true if the only thing between it and 9 needs NEW Blender geometry (not a JS/texture tweak)' },
    topFix: { type: 'string', description: 'the single highest-impact remaining fix, concrete' },
  },
}

function prompt(r) {
  return [
    'You are an INDEPENDENT VERIFIER for museum room "' + r.slug + '" (eraKey "' + r.eraKey + '"). Read-only: do NOT edit or commit anything.',
    'cd ' + REPO + ' and run all commands there.',
    '1. Shoot fresh: `node tools/shoot.mjs ' + r.eraKey + ' scratch_previews/' + r.slug + '_vr_approach.png approach` and again view `wall`. consoleErrors MUST be 0 (if not, score<=4, note it).',
    '2. READ both renders + the concept sheet concept-art/subsections/' + r.slug + '/Hallway-*.png.',
    'CALIBRATION: do NOT penalize the bright white far wall with a "STEP INTO THE LIGHT" placard (that is the intentional wing-end teleport wall) nor a neighbour room bleeding in down-corridor. Judge the ROOM\'S OWN walls/ceiling/floor/ornament/lighting, primarily from the `wall` view.',
    '3. Score fidelity 1-10 honestly vs the concept. EXCELLENT(>=9) needs: era clear from silhouette; signature ornament present+correct; palette+material+lighting match (not flat/muddy/dark/blown); no console errors; art unobstructed.',
    '4. Decide needsGeometry: true if reaching 9 requires NEW Blender geometry/ornament (carved reliefs, vaults, arches, screens, etc.) rather than a JS palette/texture tweak.',
    '5. Give the single highest-impact remaining fix (topFix), concrete.',
    'Return ONLY the structured result. Do not edit files.',
  ].join('\n')
}

const results = await parallel(rooms.map((r) => () =>
  agent(prompt(r), { label: 'verify:' + r.slug, phase: 'Verify', agentType: 'general-purpose', schema: SCHEMA })
    .then((v) => ({ slug: r.slug, ...(v || { score: null }) }))
))
for (const v of results.filter(Boolean)) log(v.slug + ': ' + v.score + (v.excellent ? ' EXCELLENT' : '') + (v.needsGeometry ? ' [geom]' : ''))
return results
