# Museum Room Production Standard

Version: 1.0  
Applies to: all 31 museum rooms, their entrances, signs, architecture kits, props, textures, Blender files, and validation renders.

## Authority and intent

The authority order is:

1. room-designs.json for room identity, scope, anchor, palette adaptation, and release status.
2. ROOM_DESIGN_BIBLES.md for the human-readable anchor registry and rollout decisions.
3. This standard for production deliverables and release gates.
4. A completed room README Bible, sources register, plates, and approved manifests.
5. Legacy Hallway PNGs and old per-room notes, which are mood-only and never evidence.

Historical and cultural evidence outranks concept art. A beauty render may suggest mood or composition, but it may not establish a material, motif, measurement, unseen face, construction method, or exact color.

## Required package per room

Each concept-art/subsections/ROOM folder must eventually contain:

- README.md — the human-facing Room Design Bible.
- room.yaml — structured room metadata and approval status.
- sources.md — claims, authoritative sources, provenance, licensing, and permissions.
- palette.json — approved design-adaptation swatches and lighting context.
- textures/manifest.json — material, channel, scale, source, and Blender assignments.
- plates/room/ — dimensioned plan, four wall elevations, reflected ceiling plan, and two room sections.
- plates/assets/ASSET_ID/ — complete orthographic and construction sheets for each hero and module.
- concepts/ — approved production concept views, each labeled mood, measured, or inferred.
- qa/ — historical, cultural, visual, technical, accessibility, and integrated-room review records.
- qa/renders/ — the standardized three-image room evidence set and any material close-ups.

Do not create a separate repetitive task Markdown file per room. The room README is the durable human Bible; structured state belongs in room.yaml and the manifests.

## Room metadata schema

room.yaml must contain every field below.

| Field | Requirement |
|---|---|
| schema_version | museum-room-bible/1.0 |
| room_id | Stable H01-H31 ID |
| eraKey | Existing runtime era key; never silently changed |
| conceptDir | Existing concept folder key |
| display_title | Approved public title |
| short_title | Approved compact sign title |
| region | Specific region used by the collection |
| culture_or_community | Named culture or community; never a continent if one culture is depicted |
| polity_or_tradition | Dynasty, polity, movement, or tradition where applicable |
| date_start_year and date_end_year | Signed astronomical integers, BCE negative |
| date_display | Curator-approved human label |
| collection_scope | Objects the room may contain |
| architecture_scope | Exact culture, place, and phase shaping the shell |
| status | research, historical_review, cultural_review, concept, production, integrated, or approved |
| superseded_concept | Legacy Hallway PNG path |
| superseded_concept_use | Always mood_only |
| primary_anchor.name | Named structure or documented natural-architecture exception |
| primary_anchor.component | Exact hall, gate, room, court, porch, or facade used |
| primary_anchor.place | City/site and present-day country |
| primary_anchor.construction_date | Date or phase |
| primary_anchor.evidence_ids | Source IDs supporting the anchor |
| primary_anchor.confidence | high, medium, or low |
| primary_anchor.adaptation_statement | What changes for access, display, and museum safety |
| primary_anchor.forbidden_inferences | What production must not invent |
| historical_review | Reviewer, credentials, status, date, and notes |
| cultural_review | Whether required, authority/community, reviewer, status, permissions, and notes |
| production_owner | Responsible artist or team |
| last_updated | ISO date |

No room moves to concept status while its architecture and collection scopes are conflated.

## Required Room Design Bible sections

The room README must use this order.

### 1. Status and approvals

List current G0-G8 state, historical review, required cultural review, blockers, production owner, and last update.

### 2. One-sentence target read

Name the culture, phase, anchor, and dominant material in one sentence. Mood words alone are insufficient.

### 3. Collection scope and architecture scope

State them separately. Include:

- Exact places, cultures, and dates.
- What the architecture represents.
- What the architecture does not represent.
- At least five explicit exclusions: neighboring cultures, incompatible periods, later restorations, unsupported materials, or forbidden motifs.
- How broader collection objects will be labeled without being treated as architectural evidence.

### 4. Primary architectural anchor

Record the named structure and exact component, construction phase, location, surviving evidence, reconstruction history, selection rationale, and museum adaptation.

If the frame is a cave or rock shelter, identify it as a documented natural-architecture exception. Do not invent built prehistoric or Indigenous architecture.

### 5. Source and evidence register

Use this exact table:

| ID | Authority or creator | Source type | Claim supported | Direct URL or catalog number | Accessed | License or permission | Confidence |
|---|---|---|---|---|---|---|---|

Minimum evidence before historical approval:

- One official archaeology, conservation, heritage-authority, or site-management source.
- One measured plan, elevation, section, survey, photogrammetric model, or conservation drawing.
- One authoritative material, construction, pigment, or finish source.
- One museum catalog or cultural-authority source for any motif or object type.

Generic era timelines, search-result pages, travel blogs, AI images, and the old concept render do not satisfy the evidence gate.

### 6. Anchor translation matrix

Use this exact table:

| Source element | Evidence ID | Known measurement or material | Museum component | Exact, adapted, or omitted | Deviation and rationale |
|---|---|---|---|---|---|

This matrix must account for the entrance, principal wall bay, floor, ceiling, supports, thresholds, ornament, and signs. Unseen geometry stays unknown until a plan, section, comparable, or approved reconstruction supports it.

### 7. Historical uncertainty and cultural protocol

Record:

- Contested dates or reconstructions.
- Which portions are original, restored, rebuilt, or interpretive.
- Colonial or obsolete labels that must not appear.
- Sacred, restricted, funerary, active-religious, genealogical, or community-owned references.
- Required cultural authority and exact permission status.
- Claims and wording that the room must never make.

Historical review does not substitute for Indigenous or community approval.

### 8. Spatial program

Record:

- Room length, width, and height in meters.
- Entrance clear opening, reveal depth, and approach distance.
- Intended eye height and camera field of view.
- Primary approach and artwork sightline axes.
- Accessible circulation route and minimum clear width.
- Artwork bounding boxes and explicit keep-out margins.
- Calm-wall percentage.
- Floor level changes, thresholds, ramps, and trip-hazard controls.
- Column, pier, and support purpose.

Reject any support or ornament that lacks a sourced architectural, structural, or compositional purpose. No geometry may enter an artwork keep-out volume.

### 9. Architecture kit

List entrance, wall bays, corners, floor modules, ceiling modules, transitions, supports, display-safe ornament, and approved props. Each row must include:

| Asset ID | Class | Evidence IDs | Real dimensions | Parts and joinery | Material IDs | Variants | Clearance rule | Plate path | Status |
|---|---|---|---|---|---|---|---|---|---|

Required classes are hero, module, support, prop, and sign.

### 10. Entrance and signage

The entrance must map to a specific anchor component, create a recognizable silhouette, remain clear of art and circulation, and reveal the room title before entry.

Every room sign must include:

- Public display title.
- Region or culture.
- Collection date range.
- The phrase Architectural frame followed by the named culture, structure, and phase when the collection is broader than the shell.
- A licensed typeface or custom lettering plan.
- A modern readable fallback; pseudo-historic scripts are prohibited for body text.
- Background and foreground colors from palette.json.
- A contrast target of at least 4.5:1 in the final rendered view.
- Exterior-facing, threshold, and interior-reverse visibility.

If one sign cannot be read from both directions, use a second interior-facing sign. Typographic influence may come from documented proportion, carving, inscription layout, or material; it may not counterfeit a living or ancient script.

### 11. Palette

palette.json must declare:

- claim: design_adaptation_not_archaeological_color_claim
- source material or pigment family for every swatch.
- sRGB hex.
- linear or ACES working value.
- role: wall, floor, ceiling, structure, accent, metal, timber, sign background, or sign text.
- target coverage percentage and allowed range.
- lighting CCT under which the color was approved.
- contrast role.

Use this table in the README:

| Role | Evidence or material basis | sRGB hex | Linear or ACES value | Coverage | Allowed range | Review CCT | Contrast purpose |
|---|---|---|---|---|---|---|---|

Picking colors from a beauty render is prohibited. An exact hex is a design control under a stated light, not an archaeological pigment result.

### 12. Material system

Build a shared master only when the physical substance is genuinely compatible. Limestone may share a calibrated stone master; an Ottoman tile, Roman mosaic, Mughal inlay, and Renaissance floor may not share an ornamental image merely because each is geometric.

Room variants may change mineral or fiber composition, pigment, aggregate scale, finish, roughness, wear, mortar, oxidation, or dirt. A hue shift alone cannot turn one substance into another.

### 13. Motif grammar

For every motif family record:

| Motif ID | Name and meaning | Culture and date | Evidence IDs | Permitted locations | Scale range | Orientation | Authorized variants | Max repeat | Forbidden uses | Permission |
|---|---|---|---|---|---|---|---|---|---|---|

Use three to six authorized variants where repetition is appropriate. Variation is controlled, not random. Sacred text, named ancestors, funerary imagery, crests, deity figures, genealogical designs, and living-community patterns remain blocked until permission is documented.

### 14. Blender and asset specification

Record real units, project axes, transforms, pivots, origins, module snaps, collision, material assignments, UV orientation, texel density, bevels, subdivision, displacement, and export names.

### 15. Lighting

Separate ambient, artwork, entrance, and architectural accent layers. Record:

- Color temperature.
- CRI target.
- Artwork lux target.
- Ambient and accent ratios.
- Exposure reference.
- Grazing-light intent.
- Reflection and glare controls.
- Which practical lights are historic, adapted, or concealed museum equipment.

Light and ambient occlusion may not be baked into base color.

### 16. Concept package

Required approved concept views:

- Entrance approach with readable title.
- Axial interior.
- Reverse interior with the interior-facing title.
- Left and right artwork-wall elevations.
- Floor plan.
- Reflected ceiling plan.
- Material and palette board.
- Neutral-light material study.
- Human scale and accessibility overlay.

Label each image mood, measured, or inferred. A perspective beauty view never substitutes for a production plate.

### 17. Validation evidence

Link all gate results and the three standardized final screenshots:

1. 01_approach_label — entrance silhouette, full room name, culture/region, and date visible.
2. 02_interior_materials_art_clearance — representative wall, floor, ceiling, artwork, and unobstructed circulation.
3. 03_reverse_label_transition — interior-facing name, reverse threshold, and adjacent-room transition.

Render at the production camera and exposure. Also export a phone-readable copy with a minimum 1440-pixel long edge; verify text at actual mobile display size.

### 18. Change log

Every source, scope, anchor, palette, motif, geometry, and material change must list the affected assets and required regeneration.

## Texture manifest schema

textures/manifest.json contains one object per material with these required fields:

| Field | Requirement |
|---|---|
| material_id | MAT_ROOM_SUBSTANCE_VARIANT |
| shared_master_id | Shared physical material master, or null |
| room_variant | Physical reason this version differs |
| substance | Actual stone, plaster, wood, fiber, metal, paint, ceramic, or mixed surface |
| evidence_ids | Supporting evidence |
| source_provenance | scan, photograph, procedural support, generated, or rebuilt |
| license_or_permission | Rights record |
| physical_sample_scale_m | Width and height represented |
| uv_class | tile, trim, unique, hero, or decal |
| tile_repeat_m | Real repeat in meters |
| channels | base_color, normal, roughness, height, AO, metallic, opacity as applicable |
| resolution_px | Pixel dimensions |
| color_space | sRGB for base color; Non-Color for data maps |
| roughness_range | Approved physical range |
| metallic | 0 or 1 except documented mixed masks |
| ior | Approved dielectric index |
| normal_depth_mm | Physical depth represented in the normal map |
| max_displacement_mm | Maximum displacement |
| mesh_depth_threshold_mm | Detail deeper than this must be geometry |
| target_texel_density_px_per_m | Approved class target |
| blender_material_name | Exact material name |
| asset_ids | Authorized consumers |
| qa | Border error, 3-by-3 repeat, perspective removal, channel coherence, and approval |

Texture rules:

- Base color contains no directional light, contact shadow, AO, or specular highlight.
- The final approved base and height sources generate the supporting maps.
- A grayscale conversion of an arbitrary albedo is not automatically a valid height map.
- Tiling albedo borders must agree numerically and pass a 3-by-3 visual repeat test.
- Hero panels must be rebuilt into orthographic texture space. A raw crop, screenshot, perspective slice, or lightly graded concept image is rejected.
- Decals support a believable base; they never substitute for one.
- Rough stone, earth, aged paint, charred wood, and dry fiber remain high-roughness unless evidence shows polish.
- Wear gathers at touch points, edges, bases, drainage paths, and traffic lanes rather than uniformly.
- Deep relief, broken profiles, joints, and silhouette changes are modeled.

## Orthographic and construction plates

Every hero asset and architectural module requires:

- Front.
- Rear.
- Left.
- Right.
- Top.
- Bottom when materially or structurally relevant.
- Plan.
- Longitudinal section.
- Transverse section.
- Three-quarter reference.
- Exploded parts and joinery.
- Detail enlargements.
- Human-scale figure.

Plates must show meter dimensions, wall and material thickness, bevel radius, edge profile, joints, fasteners, symmetry or intentional asymmetry, part names, material boundaries, UV direction, pivot, origin, snap points, wear zones, collision, and artwork keep-out relationship.

Hero assets use a 1:10 primary plate with 1:2 or 1:5 details. Modules use a 1:20 primary plate with profile details. Scale may change only when the printed or pixel dimensions remain explicit.

## Blender acceptance checklist

- Metric units and real scale.
- Project axis convention recorded.
- Location, rotation, and scale applied where the pipeline requires.
- Stable asset, part, mesh, collection, and material names.
- Clean manifold geometry unless an approved open-shell construction requires otherwise.
- No self-intersection or hidden duplicate faces.
- Bevel and subdivision strategy preserves the historical profile.
- Normal and displacement depth agree with the modeled form.
- UV islands have correct orientation, padding, and project texel density.
- No mirrored unique motif or text.
- Pivot, origin, connection, and snap behavior verified.
- Visitor collision and artwork keep-out proxies included.
- High-detail source mesh approved before optional derived performance meshes.

Historical silhouette, joinery, carving profile, or construction detail may not be deleted to meet an arbitrary low-poly target.

## Artwork, circulation, and repetition rules

- Artwork gets an explicit three-dimensional keep-out volume, not a verbal note.
- No column, pier, niche lip, lamp, prop, sign, or strong shadow may enter that volume.
- Maintain the approved accessible route and turning clearances through every entrance and threshold.
- Keep busy architecture above, below, or between artwork zones.
- Every repeated architectural or prop family needs three to six controlled variants unless exact repetition is historically essential.
- Vary wear, pigment survival, inserts, damage, and spacing interruptions; never scatter random cultural motifs.
- Entrance, sign, and major artwork remain the hierarchy. Repeated decoration stays subordinate.

## G0-G8 release gates

Every gate is binary. A conditional pass is a fail until its conditions are closed.

### G0 — Taxonomy

Pass only when collection scope and architecture scope are separated; culture, place, and dates are honest; required splits or renames are complete.

### G1 — Evidence

Pass only when the official heritage source, measured source, material source, motif source, provenance, and licensing records are complete.

### G2 — Historical and cultural approval

Pass only when the historian approves and every required community, Indigenous, sacred, or active-religious approval is documented.

### G3 — Design Bible

Pass only when the anchor translation, spatial program, palette, signage, architecture kit, motif grammar, and material manifest are approved.

### G4 — Concept

Pass only when all required views agree, no incompatible culture or era is mixed, the title is visible, and artwork calm zones and circulation are shown.

### G5 — Texture

Pass only when each substance reads physically, provenance and rights are recorded, seams and repeat pass, perspective is removed, maps agree, and scale and depth are correct.

### G6 — Asset

Pass only when orthographics, dimensions, construction, silhouette, materials, UVs, variants, collision, and keep-out behavior pass.

### G7 — Integrated room

Pass only when wall, floor, ceiling, entrance, signs, props, and lighting form one evidence-based material language; no artwork or route is obstructed; title visibility passes in all three directions.

### G8 — Final evidence

Pass only when the three standardized screenshots, mobile legibility check, historical signoff, cultural signoff where required, visual review, and technical review are archived.

## Automatic rejection conditions

Reject without further balancing if any condition is true:

- A continent or pan-region title is visually represented as one unnamed culture.
- One shell mixes incompatible cultures, dynasties, or centuries without a documented transitional design.
- A living, sacred, funerary, genealogical, or active-religious motif lacks approval.
- A concept render, screenshot, or perspective crop is used as a final texture.
- Deep relief exists only in base color or normal.
- One decorative image is reused across unrelated materials or cultures.
- A source has no provenance or permission record.
- An asset lacks the required orthographic or construction plate.
- A column, portal, prop, sign, or shadow blocks art or circulation.
- The full room name, culture or region, or date is unreadable from a required view.
- Wall, floor, ceiling, and props look like separate material worlds.
- The final surface reads as generic procedural noise, synthetic paint, or a flat digital graphic.
