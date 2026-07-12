# mesopotamia — middle-east-mesopotamia (Hallway 15)

> **ARCHIVED BASELINE — DO NOT USE AS CURRENT TASK INPUT.** Superseded by
> `review/final-audit/`, `concept-art/room-designs.json`, and the current runtime.

## Ratings (1-5, 5 = matches concept at a glance)
- texture_fidelity: 2 — the FLUX relief textures themselves are photoreal and gorgeous, but both signature sets (procession-bearer, lamassu) are mounted upside-down, and the brick walls/floor read as flat cel-shading rather than photoreal baked brick.
- palette_harmony: 4 — lapis-blue bands, ochre/orange brick, and gold rosettes track the concept sheet closely; the orange field is a touch more saturated/uniform than the concept's earthy mudbrick.
- architecture_match: 4 — crenellated blue parapet, double rosette frieze bands, blue dado, dark coffered ceiling, and gate-like portal massing all echo the concept; loses a point for flat untextured portal jamb/lintel surfaces.
- decor_props_match: 3 — rosette friezes, relief panels, and gold ring sconces are present per concept, but both relief sets are inverted and the concept's striding-lion end-wall mural is absent.
- entrance_signage: 1 — no room title sign visible at either threshold; only small artwork placards exist inside the room.

## Defects
- [BLOCKER] texture-flipped — procession-bearer relief panels on BOTH long walls are rendered upside-down: bearded curled-hair head at the bottom of the panel, pleated kilt mid-panel, striding legs and bare feet at the top. Rotating the crop 180° resolves to a perfect upright striding bearer, so it is a clean 180° inversion (no mirror seam). Seen on wall_left.jpg (center panel between Victory Stele of Naram-Sin and Code of Hammurabi), wall_right.jpg (panel left of the Statue of Gudea frame), and both lit panels in exit_out.jpg.
- [BLOCKER] texture-flipped — lamassu glazed-brick guardian panels on BOTH entrance portal jambs are upside-down: winged bull's hooves and haunches at the top, horned head and downward-fanning wing at the bottom, with the gold meander border band reading at the top instead of the base. Rotating 180° resolves to an upright winged bull. Seen on the left and right jamb faces in entrance_out.jpg. No left-right mirror seam within a panel; the two jambs are mirrored copies of each other, which is acceptable heraldic gate symmetry.
- [MAJOR] bare-surface — entrance portal inner jambs, lintel, and lower dado band are flat solid navy (and flat orange above the door) with no glazed-brick, rosette, or brick-bond detail, in contrast to the concept's fully glazed rosette-studded gate; entrance_out.jpg.
- [MAJOR] texture-flat/cartoon — floor pavers are uniform flat orange with painted-on grout lines and no baked-brick grain, tonal variation, or roughness; floor.jpg, also prominent in exit_out.jpg. Concept floor is photoreal varied baked brick.
- [MAJOR] texture-flat/cartoon — wall brick field is flat cel-shaded orange with uniform dark mortar lines rather than the concept's photoreal varied mudbrick; wall_left.jpg, wall_right.jpg, entrance_out.jpg.
- [MAJOR] decor-missing — the concept's glazed striding-lion mural on the corridor end wall (featured in both concept panels) is not present; the far end walls in entrance_out.jpg and exit_out.jpg show a plain distant doorway instead.
- [MAJOR] signage — no era/room title sign at the entrance threshold; nothing readable above or beside the gate in entrance_out.jpg or entrance_in.jpg.
- [POLISH] other — two artworks are stuck on "loading image" placeholders: "Statue of Gudea" (wall_right.jpg) and "The Ishtar Gate" (exit_out.jpg, right wall). Possibly transient capture timing, but both were unloaded at screenshot time.
- [POLISH] lighting — ceiling coffers are pitch black with no in-coffer light sources (ceiling.jpg); the concept's dark beamed ceiling carries rows of small downlights. Floor uplight pools per the concept are present and working.

## Hero element
Partially. The monumental gate portal with glazed lamassu guardian panels and gold ring sconces (entrance_out) is the room's intended signature element and matches the concept's "Monumental Gate Portal" panel — but both lamassu panels being upside-down breaks the read at a glance. Once flipped right-side-up it would be a genuine hero. The concept's other candidate, the striding-lion end-wall mural, is missing entirely and would be the strongest addition.

## Signage
No. There is no room title sign visible at the threshold in entrance_out.jpg or entrance_in.jpg — the lintel above the gate is blank flat orange and the jambs carry only the (inverted) lamassu panels. Inside the room, small artwork placards are present and legible up close (e.g. "Victory Stele of Naram-Sin / Akkadian Empire" on wall_left; "Statue of Gudea" on wall_right), but no era identification exists at either doorway.
