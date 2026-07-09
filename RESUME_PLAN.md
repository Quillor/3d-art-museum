# RESUME PLAN — post-texture push to 9 (place in repo root during a clean window)

State: Codex texture regeneration DONE + committed. All state in QUALITY_LEDGER.md + git.
Server on :8471 (check `curl -s -o /dev/null -w '%{http_code}' http://localhost:8471/3d-art-museum/index.html` → 200).
Never touch the repo tree while a workflow batch is running (clobbers the active worker).

## Two tracks (from parallel verify wf_d70d7099, results in
## /private/tmp/.../tasks/wp330quo6.output — has a `topFix` per room)
Each room needs EITHER a JS tweak OR new Blender geometry. Pass the room's `topFix` as `task`.

### Tools
- `tools/overnight_rooms.wf.js` — JS worker+verifier. Args: `{slug,eraKey,style,curScore,task}`. Use for needsGeometry=FALSE rooms.
- `tools/geometry.wf.js` — Blender geometry worker+verifier. Args: `{slug,eraKey,style,glb,curScore,task}`. Use for needsGeometry=TRUE rooms.
- `tools/verify_only.wf.js` — parallel read-only re-score. Args: `[{slug,eraKey}]`. Run after any batch to refresh scores.

### JS-ONLY track (needsGeometry=false, <9) — do these first (fast, high ROI)
IN FLIGHT (wf_05d18760): europe-medieval, asia-modern, europe-classical, europe-modern, middle-east-mesopotamia, europe-impressionism.
REMAINING JS: americas-19th-century(americas19,amsalon,6), americas-andes(andes,inca,6),
americas-modern(americasmodern,modern,7), asia-japan(japan,japan,7), middle-east-ottoman(ottoman,ottoman,5),
middle-east-neolithic(neolithic,neolithic,6), africa-traditions(traditions,earthen,6),
oceania-voyagers(ocevoyage,oceanic,7), prehistoric(prehistoric,cave,6), middle-east-modern(memodern,modern,5).
Pull each topFix from the verify output json (key `result`, match `slug`).

### GEOMETRY track (needsGeometry=true) — via geometry.wf.js, glb per ROOM_WORKER_ADDENDUM map
- asia-mughal (southasia, mughal, mughal.glb, 6): jali screens + pietra-dura floral inlay panels + multifoil cusped-arch surround (kit has cusped_pts + Jali part already).
- middle-east-islamic (islamic, islamic, islamic.glb, 6): true muqarnas honeycomb ceiling vault (kit has muqarnas helper) + carved arabesque relief + mashrabiya.
- middle-east-persia (persia, persia, persia.glb, 7): Apadana portal (winged disk + fluted columns + bull-protome capitals — bull_column helper) + dense procession reliefs.
- europe-medieval already JS; europe-renaissance (renaissance, renaissance.glb, 6): coffered timber ceiling (recessed square coffers + cross-beams).
- europe-baroque (baroque, baroque.glb, 6): coved/barrel vault ceiling + gilded cartouches + central fresco (baroque_ceiling_fresco.jpg exists).
- asia-southeast (seasia, khmer, khmer.glb, 6): continuous apsara bas-relief wall panels + swap Greek-key band → Khmer lotus band.
- asia-china (china, china, china.glb, 8): carved lattice window-screen panels + paneled wainscot + recessed niches on the blank red wall.
- asia-indus (indus, indus.glb, 5): terracotta motif plaques + fired-brick lattice screens + recessed pot niches.
- americas-mesoamerica (mesoamerica, meso, meso.glb, 7): carved narrative relief panels + denser greca step-fret carving.
- africa-egypt (egypt, egypt.glb, 7): carved processional/deity reliefs on the long walls.
- africa-kingdoms (kingdoms, sahel, kingdoms.glb, 7): engaged banco pilaster masses dividing bays + deeper sculpted niches.
- oceania-living + oceania-voyagers (oceanic.glb): A-frame gable rafter roof (vs canoe-rib barrel) + singular carved poupou per post.
- oceania-ancient (rockshelter, 4, GEOM-BLOCKED): NEW rockshelter.glb — eroded rock-arch portal + rough stratified-rock walls/ceiling. Biggest build.

### Loop
Launch a batch (≤6, serial) → wait for completion notification → the per-room verifier updates the ledger →
run verify_only on anything ambiguous → next batch. Repeat until all rooms ≥9 or geometry-blocked.
Stop condition: every room EXCELLENT (≥9) except documented GEOM-BLOCKED; then write `ALL ROOMS EXCELLENT — <date>` atop the ledger.
