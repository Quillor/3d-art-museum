// Architectural styles for each era — materials, colours, columns, bands,
// lighting. Consumed by corridor.js when building wing segments.
//
// Every surface declares a "finish" so light reads correctly off the
// material: matte (chalky plaster, mudbrick), satin (waxed wood, worn
// stone), gloss (polished marble), polished (glazed ceramic, lacquer, gilt).
// Surfaces with a photoreal file in assets/textures/ use it via T.fileTex,
// keeping the procedural texture as an instant fallback.
import * as THREE from "three";
import * as T from "./textures.js";
import { createSourceAuthoredMaterial } from "./materials.js";

const FINISH = {
  satin:    { specular: 0x25221c, shininess: 12 },
  gloss:    { specular: 0x4a453c, shininess: 42 },
  polished: { specular: 0x6e6a5e, shininess: 90 },
};

export function surf(map, finish = "matte", color = 0xffffff) {
  if (finish === "matte") return new THREE.MeshLambertMaterial({ map, color });
  const f = FINISH[finish];
  return new THREE.MeshPhongMaterial({ map, color, specular: f.specular, shininess: f.shininess });
}

const PBR_ROUGHNESS = Object.freeze({
  matte: 1.0,
  satin: 0.78,
  gloss: 0.42,
  polished: 0.24,
});

// Source-authored PBR response for compatible physical substrates. A custom
// color texture can carry room-specific pigment or pattern while normal and
// roughness remain independent authored channels. Geometry UVs control scale;
// shared texture transforms are never mutated per room.
function pbr(masterId, map = null, finish = "matte", color = 0xffffff, options = {}) {
  const material = createSourceAuthoredMaterial(masterId, {
    ...(map ? { albedoTexture: map } : {}),
    color,
    roughness: options.roughness ?? PBR_ROUGHNESS[finish] ?? 1.0,
    normalScale: options.normalScale,
    metalness: options.metalness ?? 0,
    side: options.side,
    name: options.name,
  });
  if (options.emissive !== undefined) material.emissive.set(options.emissive);
  if (options.emissiveIntensity !== undefined) material.emissiveIntensity = options.emissiveIntensity;
  return material;
}

const flat = (color) => new THREE.MeshLambertMaterial({ color });
const flatShiny = (color, finish = "polished") =>
  new THREE.MeshPhongMaterial({ color, specular: FINISH[finish].specular, shininess: FINISH[finish].shininess });

export const FRAME_MATS = {};

export function buildStyles() {
  FRAME_MATS.gold = new THREE.MeshPhongMaterial({ color: 0xb9924c, specular: 0x99742e, shininess: 55 });
  FRAME_MATS.darkwood = new THREE.MeshPhongMaterial({ color: 0x33251a, specular: 0x191410, shininess: 14 });
  FRAME_MATS.stone = new THREE.MeshLambertMaterial({ color: 0x87796a });
  FRAME_MATS.red = new THREE.MeshPhongMaterial({ color: 0x6e1f14, specular: 0x552211, shininess: 48 });
  FRAME_MATS.modern = new THREE.MeshPhongMaterial({ color: 0x17171a, specular: 0x222226, shininess: 30 });
  FRAME_MATS.sand = new THREE.MeshLambertMaterial({ color: 0xa8895e });
  FRAME_MATS.plaque = new THREE.MeshLambertMaterial({ color: 0x241e16 });
  // bright carved-gilt frame for the impressionist salon (heavy ornate gold in
  // the concept sheet, not the muted brown-gold of the shared `gold` frame)
  FRAME_MATS.salon2gilt = new THREE.MeshPhongMaterial({ color: 0xe6c163, specular: 0xfff3cc, shininess: 140, emissive: 0x7c5d22 });

  const F = T.fileTex;
  const S = {};

  // ---- Europe ----
  S.greek = {
    ceilH: 5.6,
    wall: pbr("stone_marble_white_v1", F("greek_marble", T.marble("#ece5d6", "rgba(150,120,96,0.20)", 41)), "gloss", 0xf3ead8), wallUV: 4,
    // Warm polished-marble slab floor (two close cream/tan tones) — the
    // concept's calm pale marble PAVING that flanks the central mosaic carpet,
    // low-contrast so the carpet reads as the star (not a busy 2-tone checker;
    // NOT the near-black greek_floor.jpg). Procedural forced for determinism.
    floor: pbr("stone_marble_white_v1", null, "gloss", 0xe8d7ba), floorUV: 3.2,
    ceiling: flat(0xd7cdb6),
    // Pompeian-red Greek-key frieze on the entablature (warm polychrome to
    // tie into the red coffers/dado — procedural, not the cool slate jpg).
    band: { mat: surf(T.meanderBand("#7c2f26", "#f0e2c4", 43), "satin"), y: 4.6, h: 0.5, uvLen: 3 },
    columns: { type: "doric", every: 5.6, color: 0xe6dfce, finish: "gloss" },
    // coffered polychrome ceiling + temple-front pediment portal + aedicula
    // niches + bronze wall lamps + red dado + mosaic border (Blender greek.glb)
    decor: "greek",
    portal: { mat: flat(0xd9d2c2), glb: "greek" },
    // Lamps dropped below the coffers (y:-0.9) so they wash walls + floor
    // warmly instead of scorching the ceiling into a white blowout.
    light: { color: 0xffe3b8, intensity: 26, every: 8, dist: 18, y: -0.9 },
    frame: "stone",
  };
  S.gothic = {
    // Mont-Saint-Michel Merveille cloister—not a generic cathedral. Grouped
    // colonnettes and pointed stone ribs replace stained glass and heraldry.
    ceilH: 6.2,
    wall: pbr("stone_limestone_dressed_v1", F("gothic_ashlar", T.stoneBlocks({ base: "#aa9d83", mortar: "#756d5d", rows: 5, cols: 3, seed: 44 })), "matte", 0xc9bfac, { normalScale: 0.13, emissive: 0x0d0b08, emissiveIntensity: 0.08 }), wallUV: 4,
    floor: pbr("paving_stone_grey_v1", F("gothic_floor", T.flagstone("#989184", 45)), "satin", 0xbcb4a7, { normalScale: 0.12, emissive: 0x090807, emissiveIntensity: 0.08 }), floorUV: 3.6,
    ceiling: pbr("plaster_lime_v1", null, "matte", 0xd8cfbd, { normalScale: 0.06 }), ceilUV: 4,
    band: null,
    decor: "reference",
    referenceKey: "mont",
    referenceStone: pbr("stone_limestone_dressed_v1", null, "matte", 0xc8beaa, { normalScale: 0.11 }),
    referenceWood: pbr("timber_parquet_dark_v1", null, "matte", 0x554332, { normalScale: 0.06 }),
    portal: { mat: pbr("stone_limestone_dressed_v1", null, "matte", 0xc8beaa), pointed: true },
    light: { color: 0xffead0, intensity: 42, every: 4.8, dist: 22, decay: 1.6, y: -0.45 },
    frame: "darkwood",
  };
  S.renaissance = {
    ceilH: 5.4,
    // warm lime-plaster walls (concept is cream/tan — nudged warm off the cool jpg)
    wall: pbr("plaster_lime_v1", F("renaissance_plaster", T.plaster("#cbb794", 46)), "matte", 0xefe6cf), wallUV: 5,
    // TERRACOTTA HERRINGBONE floor (concept signature) — bypasses the generic
    // wood-plank jpg; a grey pietra-serena border strip is added in buildRenDecor
    floor: surf(T.herringbone("#b5652f", 47), "satin"), floorUV: 5,
    // coffered TIMBER ceiling: the renaissance_ceiling.jpg is a rich warm-wood
    // coffer field, but it rendered near-black under the sparse point lights, so
    // a warm emissiveMap self-lifts it off black and keeps the gold coffer grid
    // legible between lamps (concept: warm-lit coffered ceiling).
    ceiling: (() => {
      const t = F("renaissance_ceiling", T.coffered("#7a5a34", "#4a3420", "#caa24e", 48));
      const m = surf(t, "satin");
      m.emissiveMap = t;
      m.emissive = new THREE.Color(0x60544a);
      return m;
    })(), ceilUV: 5.4,
    band: { mat: flatShiny(0x8a6f45, "satin"), y: 1.0, h: 0.12, uvLen: 4 },
    // pietra serena pilasters, fresco aediculae, ornament frieze, and a round-
    // arched pietra portal (Blender, renaissance.glb)
    decor: "renaissance",
    portal: { mat: flat(0xa8946e), glb: "renaissance" },
    light: { color: 0xffdda8, intensity: 34, every: 6, dist: 18 },
    frame: "gold",
  };
  S.baroque = {
    // Versailles Hall of Mirrors frame: cream plaster, marble datum, aged gilt,
    // mirror, and parquet. Ornament is kept out of artwork fields.
    ceilH: 5.8,
    wall: pbr("plaster_lime_v1", T.plaster("#d8c39c", 149), "matte", 0xffffff, { normalScale: 0.07, emissive: 0x151006, emissiveIntensity: 0.12 }), wallUV: 5,
    floor: pbr("timber_parquet_light_v1", T.herringbone("#9a7038", 50), "satin", 0xc49a60, { normalScale: 0.08 }), floorUV: 2.8,
    ceiling: pbr("plaster_lime_v1", T.plaster("#e2d1ae", 151), "matte", 0xffffff, { normalScale: 0.05, emissive: 0x171108, emissiveIntensity: 0.12 }), ceilUV: 5,
    band: null,
    decor: "reference",
    referenceKey: "versailles",
    referenceStone: pbr("stone_marble_white_v1", null, "satin", 0xe5d8c2, { normalScale: 0.035 }),
    referenceWood: pbr("timber_parquet_dark_v1", null, "satin", 0x604328, { normalScale: 0.06 }),
    referenceAccent: flatShiny(0xb49246, "satin"),
    portal: { mat: pbr("stone_marble_white_v1", null, "satin", 0xd9c7aa) },
    light: { color: 0xffecd2, intensity: 54, every: 4.5, dist: 23, decay: 1.5, y: -0.35 },
    frame: "gold",
  };
  S.salon = {
    // Sir John Soane's Picture Room: warm painted plaster, dark timber picture
    // planes, bronze rails, stone fragments, and filtered clerestory glazing.
    ceilH: 5.2,
    wall: pbr("plaster_lime_v1", T.plaster("#c9ad79", 52), "matte", 0xffffff, { normalScale: 0.07 }), wallUV: 5,
    floor: pbr("timber_parquet_dark_v1", F("salon_parquet", T.woodFloor("#5b3c25", 53)), "satin", 0x8c6748, { normalScale: 0.08 }), floorUV: 3,
    ceiling: pbr("plaster_lime_v1", T.plaster("#ddd2ba", 57), "matte", 0xffffff, { normalScale: 0.05 }), ceilUV: 4,
    band: null,
    decor: "reference",
    referenceKey: "soane",
    referenceStone: pbr("stone_limestone_dressed_v1", null, "matte", 0xb9ad96, { normalScale: 0.08 }),
    referenceWood: pbr("timber_parquet_dark_v1", null, "satin", 0x3e2c20, { normalScale: 0.06 }),
    referenceMetal: flatShiny(0x786545, "satin"),
    referenceGlass: new THREE.MeshPhongMaterial({ color: 0xd4d2c6, emissive: 0x4a493f, transparent: true, opacity: 0.72, specular: 0xffffff, shininess: 75, side: THREE.DoubleSide }),
    portal: { mat: pbr("timber_parquet_dark_v1", null, "satin", 0x3e2c20, { normalScale: 0.06 }) },
    light: { color: 0xffe5bd, intensity: 44, every: 5.2, dist: 19, decay: 1.55, y: -0.25 },
    frame: "gold",
  };
  S.amsalon = {
    // 19th-century American salon (concept: Hallway-05-americas-19th-century)
    // — damask walls over walnut wainscot, parquet floor, gilt picture-rail
    // band, gaslight sconces, carved wood + gilt portal (amsalon.glb)
    ceilH: 5.2,
    // Subdued wine woven wallcovering; no unsourced repeating motif is baked
    // into the production surface.
    wall: pbr("fabric_woven_neutral_v1", T.plaster("#71333a", 152), "matte", 0xffffff,
      { normalScale: 0.08, emissive: 0x100708, emissiveIntensity: 0.14 }), wallUV: 3.4,
    // varnished parquet: a faint warm emissive keeps the herringbone reading
    // warm even in the shadowed stretches between overhead lights
    floor: pbr("timber_parquet_dark_v1", T.herringbone("#7a5230", 153), "gloss", 0xffffff), floorUV: 3,
    // bright warm plaster ceiling — the calmest, brightest surface in the salon
    // (a warm emissive keeps it a lit cream between the sparse overhead lights)
    ceiling: new THREE.MeshLambertMaterial({ color: 0xeee6d0, emissive: 0x5a4a33 }),
    band: { mat: flatShiny(0x9c7a3e, "satin"), y: 4.55, h: 0.12, uvLen: 4 },
    decor: "amsalon",
    portal: { mat: flat(0x3a2418), glb: "amsalon" },
    light: { color: 0xffe0b0, intensity: 60, every: 5.6, dist: 18.5, y: -0.35 },
    frame: "gold",
  };
  S.salon2 = {
    // Gare d'Orsay station hall: Beaux-Arts limestone envelope with painted
    // steel ribs, controlled glass daylight, and parquet display zones.
    ceilH: 6.1,
    wall: pbr("stone_limestone_dressed_v1", null, "matte", 0xe0d7c5, { normalScale: 0.10 }), wallUV: 4.5,
    floor: pbr("timber_parquet_light_v1", F("salon2_parquet", T.herringbone("#a1783f", 55)), "satin", 0xb78955, { normalScale: 0.08 }), floorUV: 4,
    ceiling: pbr("plaster_lime_v1", null, "matte", 0xe8e5dc, { normalScale: 0.05 }), ceilUV: 5,
    band: null,
    decor: "reference",
    referenceKey: "orsay",
    referenceStone: pbr("stone_limestone_dressed_v1", null, "matte", 0xd4c9b5),
    referenceMetal: flatShiny(0x59636a, "satin"),
    referenceGlass: new THREE.MeshPhongMaterial({ color: 0xcfe1e3, emissive: 0x52686a, transparent: true, opacity: 0.76, specular: 0xffffff, shininess: 95, side: THREE.DoubleSide }),
    portal: { mat: pbr("stone_limestone_dressed_v1", null, "matte", 0xcfc3ae) },
    light: { color: 0xf4f3ed, intensity: 46, every: 5, dist: 25, decay: 1.3, y: -0.4 },
    frame: "modern",
  };
  S.modern = {
    // Frank Lloyd Wright's Unity Temple: compressed concrete threshold,
    // monolithic geometric massing, warm oak, and filtered clerestory light.
    ceilH: 5.0,
    wall: pbr("plaster_lime_v1", F("modern_wall", T.plaster("#c9c4b8", 56)), "matte", 0xc8c3b7, { normalScale: 0.08 }), wallUV: 5,
    floor: pbr("terrazzo_white_v1", null, "satin", 0xbdb6a8, { normalScale: 0.04 }), floorUV: 3,
    ceiling: pbr("plaster_lime_v1", null, "matte", 0xb7b2a7, { normalScale: 0.06 }), ceilUV: 4,
    band: null,
    decor: "reference",
    referenceKey: "unity",
    referenceStone: pbr("plaster_lime_v1", null, "matte", 0xaaa69c, { normalScale: 0.09 }),
    referenceWood: pbr("timber_parquet_light_v1", null, "satin", 0x9a7044, { normalScale: 0.07 }),
    referenceMetal: flatShiny(0x6e6250, "satin"),
    referenceGlass: new THREE.MeshPhongMaterial({ color: 0xd7d4bc, emissive: 0x4f4b37, transparent: true, opacity: 0.72, specular: 0xfaf4dc, shininess: 70, side: THREE.DoubleSide }),
    portal: { mat: pbr("plaster_lime_v1", null, "matte", 0xa6a298) },
    light: { color: 0xffead0, intensity: 44, every: 5.5, dist: 20, decay: 1.55, y: -0.35 },
    frame: "modern",
  };
  S.memodern = {
    // Nicolas Sursock Residence: Venetian-Ottoman triple-arch hierarchy,
    // limestone/plaster, walnut, brass, terrazzo, and filtered glazing.
    ceilH: 4.8,
    wall: pbr("plaster_lime_v1", null, "matte", 0xe8dcc2, { normalScale: 0.08 }), wallUV: 6,
    floor: pbr("terrazzo_white_v1", null, "satin", 0xd9cdb4), floorUV: 3,
    ceiling: pbr("timber_parquet_dark_v1", null, "satin", 0x6b4a31, { normalScale: 0.07 }), ceilUV: 3,
    band: null,
    decor: "reference",
    referenceKey: "sursock",
    referenceStone: pbr("stone_limestone_dressed_v1", null, "matte", 0xd6c8ac, { normalScale: 0.10 }),
    referenceWood: pbr("timber_parquet_dark_v1", null, "satin", 0x5b3824, { normalScale: 0.07 }),
    referenceMetal: flatShiny(0xa48445, "satin"),
    referenceGlass: new THREE.MeshPhongMaterial({ color: 0xb7cad0, emissive: 0x34464a, transparent: true, opacity: 0.70, specular: 0xf5ffff, shininess: 80, side: THREE.DoubleSide }),
    portal: { mat: pbr("stone_limestone_dressed_v1", null, "matte", 0xd1c3a9) },
    light: { color: 0xffead0, intensity: 44, every: 5.5, dist: 19, decay: 1.6, y: -0.25 },
    frame: "gold",
  };
  S.asiamodern = {
    // Former Prince Asaka Residence / Teien Art Museum: Japanese-French Art
    // Deco with fine plaster, terrazzo, black lacquer, brass, and art glass.
    ceilH: 4.8,
    wall: pbr("plaster_lime_v1", F("asiamodern_concrete", T.plaster("#ddd2bd", 156)), "matte", 0xe3dac8, { normalScale: 0.07 }), wallUV: 6,
    floor: pbr("terrazzo_white_v1", null, "satin", 0xb9aa8d), floorUV: 4.6,
    ceiling: pbr("plaster_lime_v1", null, "matte", 0xd9d0bf, { normalScale: 0.05 }), ceilUV: 4,
    band: null,
    decor: "reference",
    referenceKey: "asaka",
    referenceStone: pbr("stone_marble_white_v1", null, "satin", 0xd6c8b2, { normalScale: 0.03 }),
    referenceWood: pbr("timber_parquet_dark_v1", null, "satin", 0x28211d, { normalScale: 0.05 }),
    referenceMetal: flatShiny(0xa78345, "polished"),
    referenceGlass: new THREE.MeshPhongMaterial({ color: 0xd7d0c2, emissive: 0x51483a, transparent: true, opacity: 0.74, specular: 0xffffff, shininess: 100, side: THREE.DoubleSide }),
    portal: { mat: pbr("stone_marble_white_v1", null, "satin", 0xd0c2ac) },
    light: { color: 0xffe6c7, intensity: 38, every: 5.5, dist: 18, decay: 1.6, y: -0.2 },
    frame: "modern",
  };

  S.euromodern = {
    // Early-modern EUROPEAN gallery (concept: Hallway-13-europe-modern) — a
    // clean Bauhaus / International-Style corridor: cool, smooth matte white-
    // plaster wall planes, a warm terrazzo floor with a dark inlaid border, a
    // bright ribbon skylight framed by a fine blackened-steel muntin grid plus
    // track lighting, blackened-steel railings with PALE OAK handrails, and
    // simple oak benches / pale display plinths. Reuses modern.glb (rectilinear
    // portal) with a blackened-steel + oak re-material (the Art-Deco gold
    // sunburst is suppressed). Kept a SEPARATE style/decor so the shared white-
    // cube S.modern (americas + middle-east modern) keeps its warm Art-Deco
    // bronze look.
    ceilH: 4.8,
    // Cool, smooth matte white plaster — lighter & less grainy/warm than the
    // shared modern_wall so the planes read as crisp painted plaster.
    wall: pbr("plaster_lime_v1", T.plaster("#eaeae7", 62, { speckle: 620, alpha: 0.018, blotch: 6, blotchAlpha: 0.03 }), "matte", 0xffffff, { normalScale: 0.06 }), wallUV: 6,
    floor: pbr("terrazzo_white_v1", null, "satin", 0xded9cd), floorUV: 3,
    // Cool-neutral plaster ceiling (was a warm cream that muddied to brown in the
    // under-lit corners) so the planes flanking the skylight stay an even cool white.
    ceiling: flat(0xf0f1f0),
    decor: "euromodern",               // ribbon skylight + track + steel/oak rails + benches
    portal: { mat: flat(0xdedbd6), glb: "euromodern" },
    // Even, cool daylit wall-wash: a NEUTRAL near-white light colour (not the old
    // warm cream, which made under-lit plaster read muddy brown) and a gentle
    // decay 1.2 (vs the default steep inverse-square 2) so the full plaster wall
    // stays uniformly bright cool-white side-to-side like the concept, instead of
    // scalloping into a dark gradient between fixtures.
    light: { color: 0xf4f5f4, intensity: 50, every: 6, dist: 22, decay: 1.2, y: -0.25 },
    frame: "modern",
  };
  // Cool self-illumination FILL on the white plaster so both the ceiling planes
  // around the skylight AND the far reaches of the side walls never drop into a
  // muddy dark gradient — a soft uniform wall-wash matching the concept's evenly
  // lit plaster. This is the primary lever that keeps the wall uniformly bright
  // cool-white side-to-side rather than scalloping dark between the fixtures.
  S.euromodern.ceiling.emissive = new THREE.Color(0x2c2c33);
  S.euromodern.wall.emissive = new THREE.Color(0x2b2c31);

  // ---- Americas ----
  S.meso = {
    // Mesoamerican temple gallery (concept: Hallway-02-americas-mesoamerica)
    // — engaged limestone piers with red greca bands, carved step-fret
    // friezes, stone benches, deep ceiling beams, a stepped ceremonial portal
    // with a deity-mask lintel (Blender, meso.glb).
    ceilH: 5.2,
    wall: pbr("stone_limestone_dressed_v1", F("meso_stone", T.stoneBlocks({ base: "#9b8a6d", mortar: "#5c5140", rows: 4, cols: 2, seed: 58 })), "matte", 0xeee2c8, { normalScale: 0.13 }), wallUV: 4,
    floor: pbr("stone_limestone_dressed_v1", F("meso_limestone_floor", T.stoneFloor("#8a7a5f", 59)), "satin", 0xd1c1a3, { normalScale: 0.1 }), floorUV: 4,
    // Warm limestone ceiling, lifted off near-black so the overhead reads as lit
    // stone (concept: grazing linear light on a flat stone soffit) not a void.
    ceiling: flat(0x9d8e72),
    // Quiet lower walls and a geometry-led upper Puuc mosaic zone; the legacy
    // concept-derived greca/deity imagery is prohibited by the room bible.
    band: null,
    decor: "meso",                     // piers + benches + beams
    // Seat the reverse plaque on the interior fretwork face, not 150 mm
    // behind its lower title-band molding.
    portal: { mat: flat(0x84765c), glb: "meso", signBackZ: 1.25 },
    // Bright warm wash — the cream limestone textures only read as bright cream
    // when properly lit; the previous 34/every-8 left them muddy brown and the
    // ceiling black. Brighter, tighter, longer-range (concept is evenly golden).
    // decay 1.8 (gentler than physical 2) lifts the floor + mid-hall evenly —
    // the ceiling-height lights sit 4.6 m above the floor, so inverse-square
    // left the paving dark; the softer falloff fills it without near-wall blowout.
    light: { color: 0xffcf9a, intensity: 46, every: 5.0, dist: 20, decay: 1.8 },
    frame: "stone",
  };
  // Warm self-illumination on the limestone soffit so the ceiling reads as dim
  // lit stone between the deep beams, never a black void under the point lights.
  S.meso.ceiling.emissive = new THREE.Color(0x3c3120);
  S.inca = {
    // Inca/Tiwanaku ashlar corridor (concept: Hallway-03-americas-andes) —
    // dry-fit andesite, trapezoidal niches with ceramics/textiles under
    // concealed uplights, and a monumental trapezoidal doorway (Blender,
    // inca.glb). Stepped stone frieze near the ceiling.
    ceilH: 4.8,
    // Cool dry-fit andesite ashlar — tight seams, subtle per-block tonal
    // variation (the shipped inca_andesite/flagstone jpgs read too warm/brown
    // with modern-brick mortar, so we use the cool-grey procedural directly).
    // Base lightened (#9a9b98→#b6b5af) so the cool stone reads under warm point
    // light instead of going near-black on approach.
    // Generated cool andesite ashlar (see structured texture provenance) — the
    // audit read the lightened procedural as "flat bright cream", the exact
    // inverse of the concept's dark dry-fit stone. Procedural stays as fallback.
    wall: pbr("rock_natural_grey_v1", F("inca_andesite", T.stoneBlocks({ base: "#c0bfb7", mortar: "#3c3c37", rows: 3, cols: 2, seed: 61, jitterCol: 12 })), "matte", 0xc9c8c2, { normalScale: 0.13 }), wallUV: 3.5,
    // Irregular megalithic flagstone (concept), warm-grey so it catches the
    // concealed uplight pools rather than reading as regular slabs.
    floor: pbr("paving_stone_grey_v1", T.flagstone("#8f8c83", 62), "satin", 0xa5a29a, { normalScale: 0.13 }), floorUV: 2.4,
    ceiling: surf(T.plaster("#dcd4c0", 261)),   // warm lime-plaster ceiling
    band: null,
    decor: "inca",                     // trapezoidal niches + concealed uplights
    portal: { mat: flat(0x9d9a93), glb: "inca" },
    light: { color: 0xf6ead6, intensity: 50, every: 4.5, dist: 20, y: -0.05 },
    frame: "stone",
  };
  // Warm self-illumination on the lime-plaster ceiling so it never reads as a
  // black void on approach (point lights alone left the overhead near-black).
  S.inca.ceiling.emissive = new THREE.Color(0x2e281f);
  S.adobe = {
    // Pueblo / Ancestral Puebloan adobe passage (concept: Hallway-04-americas-
    // native-north) — earthen plaster, a timber viga (round-log) ceiling,
    // arched adobe niches with ceramics under uplights, painted geometric
    // mineral-pigment friezes (Blender, adobe.glb).
    ceilH: 4.4,
    wall: pbr("plaster_lime_v1", F("adobe_wall", T.earthenWall("#c39362", "#5a3a22", 63)), "matte", 0xe4c39f, { normalScale: 0.13 }), wallUV: 5,
    floor: pbr("earth_compacted_v1", null, "matte", 0x9a7351), floorUV: 4,
    ceiling: pbr("timber_parquet_dark_v1", T.woodFloor("#5a4227", 65), "matte", 0xffffff, { normalScale: 0.09 }), ceilUV: 4,
    // No generic intertribal motif band. Community-specific decoration remains
    // blocked pending affiliated-tribe review.
    band: null,
    decor: "adobe",                    // vigas + latillas + arched niches + textiles
    // The interior plaque lands on the room-side face of the first viga; the
    // default facade offset would leave that beam crossing the title line.
    portal: { mat: flat(0x9c7850), glb: "adobe", signBackZ: 1.25 },
    light: { color: 0xffca8a, intensity: 44, every: 7 },
    frame: "darkwood",
  };

  // ---- Middle East ----
  S.neolithic = {
    // Çatalhöyük: plastered mudbrick interiors, raised platforms, reed/timber
    // roof structure, and an explicit roof-entry/light-well interpretation.
    ceilH: 4.2,
    wall: pbr("plaster_lime_v1", null, "matte", 0xc5a47b, { normalScale: 0.14 }), wallUV: 4.5,
    floor: pbr("earth_compacted_v1", null, "matte", 0x8f6847), floorUV: 4,
    ceiling: pbr("tatami_yellow_v1", F("neolithic_reed", T.weave("#8a6f45", 168)), "matte", 0x9a7d50, { normalScale: 0.08 }), ceilUV: 3,
    band: null,
    decor: "reference",
    referenceKey: "catalhoyuk",
    referenceStone: pbr("plaster_lime_v1", null, "matte", 0xb59670, { normalScale: 0.13 }),
    referenceWood: pbr("timber_parquet_dark_v1", null, "matte", 0x5b4227, { normalScale: 0.08 }),
    referenceGlass: new THREE.MeshBasicMaterial({ color: 0xffe8bc, transparent: true, opacity: 0.68, side: THREE.DoubleSide }),
    // This is a clearly modern accessible transition, not an asserted ancient
    // ground-level front door; overhead light-well geometry carries the cue.
    portal: { mat: pbr("plaster_lime_v1", null, "matte", 0xa98a5f) },
    light: { color: 0xffca8a, intensity: 44, every: 7 },
    frame: "sand",
  };
  S.mesopotamia = {
    // Neo-Assyrian Northwest Palace at Nimrud: mudbrick massing, pale gypsum
    // orthostats, timber roof members, bronze, and restrained pigment traces.
    // The former blue Ishtar Gate vocabulary is intentionally absent.
    ceilH: 5.4,
    wall: pbr("stone_sandstone_warm_v1", T.mudbrickCoursed("#a67c4c", "#6a4c2c", 16, 6, 70), "matte", 0xb28a5d, { normalScale: 0.12 }), wallUV: 3.4,
    floor: pbr("masonry_fired_brick_v1", T.stoneFloor("#916a44", 71), "matte", 0x9b7350, { normalScale: 0.12 }), floorUV: 5,
    ceiling: pbr("timber_parquet_dark_v1", T.beamCeiling("#463424", "#221913", 74), "matte", 0x5b4634, { normalScale: 0.08 }), ceilUV: 3.5,
    band: null,
    decor: "reference",
    referenceKey: "nimrud",
    referenceStone: pbr("stone_limestone_dressed_v1", null, "matte", 0xd4c9b1, { normalScale: 0.08 }),
    referenceWood: pbr("timber_parquet_dark_v1", null, "matte", 0x4d3928, { normalScale: 0.07 }),
    referenceAccent: flatShiny(0x7d6842, "satin"),
    // Keep the plaque in front of the shallow timber/gypsum lintel instead of
    // letting that trim cross the title line on the visitor approach.
    portal: { mat: pbr("stone_limestone_dressed_v1", null, "matte", 0xcfc2aa), signZ: 0.70 },
    light: { color: 0xffdfb1, intensity: 38, every: 5, dist: 18, y: -0.65 },
    frame: "sand",
  };
  S.persia = {
    ceilH: 6.0,
    // Pale desaturated Achaemenid limestone ashlar — the shipped persia_stone.jpg
    // was a saturated cartoon-gold sandstone; the concept is a PALE grey-cream
    // limestone, so use clean procedural ashlar with a warm-cream tint instead.
    wall: pbr("stone_limestone_dressed_v1", T.stoneBlocks({ base: "#c7bda4", mortar: "#a89d84", rows: 4, cols: 2, seed: 73 }), "satin", 0xf3eddc, { normalScale: 0.12 }), wallUV: 4,
    // Large pale POLISHED limestone slabs (README: "Large pale limestone slabs...
    // avoid random block masonry"). Drops the muddy dark-brown persia_floor.jpg.
    floor: pbr("stone_limestone_dressed_v1", T.stoneFloor("#c2b99f", 74), "satin", 0xf1ead6, { normalScale: 0.08 }), floorUV: 3,
    // Lit lime-plaster soffit with a faint warm emissive so the coffered beam
    // ceiling reads as lit stone, not a black void overhead.
    ceiling: (() => { const m = flat(0x9c8c64); m.emissive.setHex(0x2c2412); return m; })(),
    band: null,
    // Achaemenid relief guards line the walls, blue+gold rosette friezes, and an
    // Apadana portal with fluted bull-protome columns + winged disk (persia.glb)
    decor: "persia",
    portal: { mat: flat(0x9d8a64), glb: "persia" },
    // Dropped lower + spread tighter (was 42/every9 = one hot central blob) for
    // even warm wall-grazing like the concept's discreet track lighting.
    light: { color: 0xffddad, intensity: 31, every: 5, dist: 19, y: -0.85 },
    frame: "sand",
  };
  S.islamic = {
    // Seljuq Masjed-e Jāme' of Isfahan: exposed baked-brick geometry, four-iwan
    // hierarchy, plaster, timber, and only restrained later glazed-tile accents.
    ceilH: 5.8,
    wall: pbr("masonry_fired_brick_v1", T.mudbrickCoursed("#ad8056", "#725035", 18, 7, 176), "matte", 0xffffff, { normalScale: 0.13 }), wallUV: 3.2,
    floor: pbr("masonry_fired_brick_v1", T.mudbrickCoursed("#916743", "#60452f", 18, 7, 177), "matte", 0xffffff, { normalScale: 0.11 }), floorUV: 4,
    ceiling: pbr("plaster_lime_v1", null, "matte", 0xd6c3a3, { normalScale: 0.07 }), ceilUV: 4,
    band: null,
    decor: "reference",
    referenceKey: "isfahan",
    referenceStone: pbr("masonry_fired_brick_v1", null, "matte", 0xa86f45, { normalScale: 0.14 }),
    referenceWood: pbr("timber_parquet_dark_v1", null, "matte", 0x55402c, { normalScale: 0.07 }),
    referenceAccent: pbr("ceramic_glazed_blue_v1", null, "polished", 0x3b6d78, { normalScale: 0.025 }),
    portal: { mat: pbr("masonry_fired_brick_v1", null, "matte", 0xa86f45), pointed: true },
    light: { color: 0xffe2b8, intensity: 40, every: 5, dist: 20, y: -0.65 },
    frame: "darkwood",
  };
  S.ottoman = {
    // Topkapı Palace frame: Gate of Felicity/Audience Hall sequence, lime
    // plaster, marble, selected documented Iznik ceramic zones, walnut, brass.
    ceilH: 5.8,
    wall: pbr("plaster_lime_v1", F("islamic_plaster", T.plaster("#efe9d8", 79)), "matte", 0xf2e8d5, { normalScale: 0.08 }), wallUV: 5,
    floor: pbr("stone_marble_white_v1", F("mughal_marble", T.marble("#efe9dc", "rgba(150,130,105,0.16)", 80)), "gloss", 0xf5ecdc), floorUV: 3,
    ceiling: pbr("plaster_lime_v1", null, "matte", 0xdcd4bf, { normalScale: 0.05 }), ceilUV: 4,
    band: null,
    decor: "reference",
    referenceKey: "topkapi",
    referenceStone: pbr("stone_marble_white_v1", null, "satin", 0xe1d6c4, { normalScale: 0.03 }),
    referenceWood: pbr("timber_parquet_dark_v1", null, "satin", 0x4b3021, { normalScale: 0.07 }),
    referenceAccent: new THREE.MeshPhongMaterial({ color: 0x4f8793, emissive: 0x071c20, specular: 0xa9d4dc, shininess: 72 }),
    referenceMetal: flatShiny(0xa8833e, "polished"),
    portal: { mat: pbr("stone_marble_white_v1", null, "satin", 0xd9cbb6) },
    light: { color: 0xffe6c0, intensity: 34, every: 5.5, dist: 18 },
    frame: "gold",
  };

  // ---- Asia ----
  S.indus = {
    // Mohenjo-daro / Great Bath frame: measured baked-brick courses, drainage,
    // orthogonal planning, lime-plaster traces, timber, and terracotta.
    ceilH: 4.6,
    wall: pbr("masonry_fired_brick_v1", F("indus_brick", T.mudbrick(82)), "matte", 0xd4a47d, { normalScale: 0.12 }), wallUV: 3.5,
    floor: pbr("masonry_fired_brick_v1", F("indus_floor", T.dirtFloor(83)), "matte", 0xa87958, { normalScale: 0.11 }), floorUV: 5,
    ceiling: pbr("timber_parquet_dark_v1", null, "matte", 0x5a402c, { normalScale: 0.07 }), ceilUV: 3.2,
    band: null,
    decor: "reference",
    referenceKey: "mohenjo",
    referenceStone: pbr("masonry_fired_brick_v1", null, "matte", 0xb77f59, { normalScale: 0.14 }),
    referenceWood: pbr("timber_parquet_dark_v1", null, "matte", 0x4f3828, { normalScale: 0.07 }),
    portal: { mat: pbr("masonry_fired_brick_v1", null, "matte", 0xa97450) },
    light: { color: 0xffce93, intensity: 30, every: 5.5, dist: 16, y: -0.65 },
    frame: "sand",
  };
  S.china = {
    // Ming Forbidden City frame: axial court sequence, stone platform, pale
    // wall fields, red painted structural timber, high brackets, and roof-tile
    // accents. Korean works remain separately identified as exhibits.
    ceilH: 5.4,
    wall: pbr("plaster_lime_v1", null, "matte", 0xd8cbb4, { normalScale: 0.07 }), wallUV: 5,
    floor: pbr("paving_stone_grey_v1", null, "satin", 0x9e978b, { normalScale: 0.12 }), floorUV: 3.5,
    ceiling: pbr("timber_parquet_dark_v1", null, "matte", 0x513621, { normalScale: 0.07 }), ceilUV: 4,
    band: null,
    decor: "reference",
    referenceKey: "ming",
    referenceStone: pbr("stone_limestone_dressed_v1", null, "matte", 0xb9b0a0, { normalScale: 0.09 }),
    referenceWood: new THREE.MeshPhongMaterial({ color: 0x8b2e22, specular: 0x4d1c16, shininess: 28 }),
    referenceAccent: flatShiny(0x836829, "satin"),
    portal: { mat: new THREE.MeshPhongMaterial({ color: 0x8b2e22, specular: 0x4d1c16, shininess: 28 }) },
    light: { color: 0xffd0a0, intensity: 40, every: 5.2, dist: 18, y: -0.45 },
    frame: "red",
  };
  S.khmer = {
    // Angkor Wat frame: warm sandstone, measured colonnette and corbel rhythm,
    // timber roof members, and grazing light. Figurative panels are withheld
    // unless monument-specific provenance is attached.
    ceilH: 5.2,
    wall: pbr("stone_sandstone_warm_v1", F("khmer_sandstone", T.stoneBlocks({ base: "#b69b70", mortar: "#756548", rows: 5, cols: 3, seed: 86 })), "matte", 0xcba76f, { normalScale: 0.09, emissive: 0x0d0804, emissiveIntensity: 0.08 }), wallUV: 5.2,
    floor: pbr("paving_stone_grey_v1", T.stoneFloor("#8a7450", 87), "satin", 0xb08d5f, { normalScale: 0.13 }), floorUV: 4,
    ceiling: pbr("stone_sandstone_warm_v1", T.stoneFloor("#8f7752", 89), "matte", 0xb08d5e, { normalScale: 0.07 }), ceilUV: 4,
    band: null,
    decor: "khmer",                    // colonnettes + relief panels + corbel
    portal: { mat: flat(0x9c855e), glb: "khmer" },
    light: { color: 0xffca8a, intensity: 52, every: 5, dist: 19 },
    frame: "stone",
  };
  S.japan = {
    // Shoin-style timber gallery (concept: Hallway-23-asia-japan) — dark timber
    // post-and-beam frame, backlit shoji clerestory, tokonoma display alcoves
    // with hanging scrolls, exposed beams, wall andon lanterns, and a refined
    // timber threshold portal (Blender, japan.glb).
    ceilH: 4.6,
    // warm cream plaster — faint warm emissive keeps it from reading cold-grey in shadow
    wall: pbr("paper_white_v1", F("japan_shoji_paper", T.plaster("#cbb693", 89)), "matte", 0xf0e3ca, { normalScale: 0.025, emissive: 0x0b0804, emissiveIntensity: 0.15 }), wallUV: 4.6,
    // dark polished timber circulation boards (tatami stays in the alcoves)
    floor: pbr("timber_parquet_dark_v1", F("japan_floor", T.woodFloor("#5a3d26", 90)), "gloss", 0xa4703e), floorUV: 4,
    // warm dark timber ceiling — faint emissive so exposed beams never read as a black void
    ceiling: pbr("timber_parquet_dark_v1", T.woodFloor("#6a4e30", 91), "satin", 0xffffff, { emissive: 0x0d0803, emissiveIntensity: 0.16 }), ceilUV: 4,
    decor: "japan",                    // timber frame + shoji + tokonoma + andon
    portal: { mat: flat(0x3c2c1a), glb: "japan" },
    light: { color: 0xffe9c6, intensity: 44, every: 6, dist: 18 },
    frame: "darkwood",
  };
  S.mughal = {
    // Akbar-period Fatehpur Sikri frame: predominantly red sandstone,
    // trabeate beam-and-post hierarchy, restrained relieving arches, deep
    // chhajjas, bracket capitals, and perforated stone jali. The broad South
    // Asian collection remains object-labeled; it is not architectural proof.
    ceilH: 5.8,
    wall: pbr("rock_natural_grey_v1", T.redSandstone(24), "matte", 0xc78262, { normalScale: 0.13 }), wallUV: 4,
    floor: pbr("paving_stone_grey_v1", T.stoneFloor("#a96849", 93), "satin", 0xffffff, { normalScale: 0.12 }), floorUV: 3.4,
    ceiling: pbr("rock_natural_grey_v1", T.plaster("#9b553b", 94), "matte", 0xa96448, { normalScale: 0.08 }), ceilUV: 4,
    decor: "mughal",                   // arcade + jali screens
    redstone: pbr("rock_natural_grey_v1", T.redSandstone(24), "matte", 0xc47b59, { normalScale: 0.12 }),
    // Legacy property retained for the runtime material contract; the rebuilt
    // PietraPanel root is now carved red sandstone, not white inlay.
    pietra: pbr("rock_natural_grey_v1", T.redSandstone(31), "matte", 0xa75d42, { normalScale: 0.10 }),
    portal: { mat: flat(0x9b563c), glb: "mughal" },
    light: { color: 0xffdfbd, intensity: 43, every: 5.5, dist: 18, y: -0.2 },
    frame: "darkwood",
  };

  // ---- Africa ----
  S.egypt = {
    // Hypostyle temple hall (concept: Hallway-26-africa-egypt) — battered
    // pylon portal, lotus columns, painted beams (Blender, egypt.glb).
    // Band = the real painted winged-sun frieze, moved up to the entablature
    // so the wall behind the art stays calm sandstone.
    ceilH: 5.8,
    // Plain sandstone blocks on the walls — hieroglyphs are confined to the
    // top ~25% strip (buildEgyptDecor) so the hall doesn't read as wall-to-
    // wall carving. The ceiling keeps the carved sandstone (overhead accent).
    wall: pbr("rock_natural_grey_v1", F("egypt_stone", T.stoneBlocks({ base: "#c2a06c", mortar: "#7a6440", rows: 3, cols: 2, seed: 95 })), "matte", 0xd2ad76, { normalScale: 0.14 }), wallUV: 3.5,
    floor: pbr("paving_stone_grey_v1", F("egypt_floor", T.stoneFloor("#a88c5e", 96)), "satin", 0xc1a070, { normalScale: 0.11 }), floorUV: 4.5,
    ceiling: pbr("rock_natural_grey_v1", F("egypt_sandstone", T.stoneBlocks({ base: "#8a7350", mortar: "#5a4a30", rows: 3, cols: 2, seed: 95 })), "matte", 0xaa8b60, { normalScale: 0.12 }), ceilUV: 3.5,
    band: null,
    columns: { type: "papyrus", every: 6, color: 0xbfa06a, glb: "egypt" },
    decor: "egypt",
    portal: { mat: flat(0xa8895a), glb: "egypt" },
    light: { color: 0xffc386, intensity: 48, every: 7, dist: 25 },
    frame: "sand",
  };
  S.sahel = {
    // Songhai Tomb of Askia frame: replastered earthen mass, pyramidal threshold
    // hierarchy, structural toron, compacted clay, and restrained dark pigment.
    ceilH: 4.8,
    wall: pbr("plaster_lime_v1", F("kingdoms_wall", T.earthenWall("#a5714a", "#4d3524", 98)), "matte", 0xd0a173, { normalScale: 0.14 }), wallUV: 3.5,
    floor: pbr("earth_compacted_v1", null, "matte", 0x8b6042), floorUV: 4,
    ceiling: pbr("plaster_lime_v1", null, "matte", 0x8f6848, { normalScale: 0.10 }), ceilUV: 3,
    band: null,
    decor: "reference",
    referenceKey: "askia",
    referenceStone: pbr("plaster_lime_v1", null, "matte", 0xa97450, { normalScale: 0.14 }),
    referenceWood: pbr("timber_parquet_dark_v1", null, "matte", 0x47301f, { normalScale: 0.08 }),
    portal: { mat: pbr("plaster_lime_v1", null, "matte", 0x9f6f4c) },
    light: { color: 0xffc98f, intensity: 46, every: 6, dist: 20 },
    frame: "darkwood",
  };
  S.earthen = {
    // Review-safe Asante frame: earthen plaster and plain structural timber.
    // Symbolic relief, copied trim, named figures, and pseudo-traditional
    // fixtures remain absent until the required community review is documented.
    ceilH: 4.6,
    // FLUX-generated banco earth plaster with subtle trowel relief
    // (see structured texture provenance) over the procedural fallback — the audit read
    // the bare procedural as "flat untextured amber paint".
    // Calm, light amber plaster (procedural earthenWall) — the shipped
    // traditions_wall.jpg was a dark, over-saturated terracotta with baked
    // vignette corners that tiled into muddy blotches; the concept wall is a
    // soft warm sand plaster that lets the dark timber + objects carry the eye.
    wall: pbr("plaster_earthen_asante_v1", null, "matte", 0xffffff), wallUV: 3.5,
    floor: pbr("earth_compacted_v1", null, "matte", 0x8b6241), floorUV: 3,
    ceiling: pbr("timber_parquet_dark_v1", F("traditions_wood", T.woodFloor("#4c3a26", 104)), "matte", 0xffffff, { normalScale: 0.08 }), ceilUV: 3,
    band: null,
    decor: "traditions",
    portal: { mat: pbr("timber_parquet_dark_v1", null, "matte", 0x5c3b24, { normalScale: 0.06 }) },
    light: { color: 0xffcf9b, intensity: 34, every: 6, dist: 17 },
    frame: "darkwood",
  };

  // ---- Oceania ----
  S.rockshelter = {
    // Kakadu natural-frame treatment. No generated x-ray figures, hand stencil
    // atlas, sacred narrative, or torch-lit "prehistoric" trope is present.
    ceilH: 4.4,
    // FLUX stratified Kakadu sandstone + packed-earth floor (regenerated —
    // the original oceania_*.jpg "featureless dark blobs" note is obsolete)
    wall: pbr("rock_natural_grey_v1", F("oceania_sandstone", T.sandstone("#c99a63", 106)), "matte", 0xd49d68, { normalScale: 0.17 }), wallUV: 4.2,
    floor: pbr("earth_compacted_v1", F("oceania_floor", T.packedEarth(107)), "matte", 0x9c6842), floorUV: 4,
    ceiling: pbr("rock_natural_grey_v1", F("oceania_sandstone", T.sandstone("#bd8d5a", 108)), "matte", 0xc69261, { normalScale: 0.16 }), ceilUV: 4.2,
    band: null,
    decor: "rockshelter",
    // stacked-slab shelter mouth (rockshelter.glb) — was the plain box fallback
    portal: { mat: flat(0xb27a4c), glb: "rockshelter" },
    light: { color: 0xffc078, intensity: 44, every: 6, dist: 18, y: -0.6 },
    frame: "sand",
  };
  S.oceanic = {
    // Mā‘ohi Taputapuātea frame: an abstracted paved court and seaward axis.
    // No invented pan-Pacific carved portal, navigation chart, or canoe-house
    // shell is used while the required community review remains open.
    ceilH: 4.6,
    wall: pbr("masonry_stone_irregular_v1", null, "matte", 0x6c6e69, { normalScale: 0.13, emissive: 0x0a1115, emissiveIntensity: 0.14 }), wallUV: 4.2,
    floor: pbr("paving_stone_grey_v1", null, "satin", 0x8d8578, { normalScale: 0.13 }), floorUV: 3.4,
    ceiling: new THREE.MeshLambertMaterial({ color: 0x536a78, emissive: 0x172833 }),
    band: null,
    decor: "oceanic",
    oceVariant: "voyage",
    portal: { mat: pbr("masonry_stone_irregular_v1", null, "matte", 0x6e6e68, { normalScale: 0.12 }), glb: "marae" },
    light: { color: 0xe7f2ff, intensity: 48, every: 4.8, dist: 24, decay: 1.35, y: -0.25 },
    frame: "stone",
  };
  S.oceanic2 = {
    // Māori/Aotearoa frame with the gabled structural grammar of Te Whare
    // Rūnanga. Named ancestors, carvings, kōwhaiwhai, tukutuku, and language
    // remain omitted until iwi approval; this is a neutral museum adaptation.
    ceilH: 4.6,
    wall: pbr("plaster_lime_v1", null, "matte", 0xc9b99c, { normalScale: 0.08 }), wallUV: 4.2,
    floor: pbr("timber_parquet_dark_v1", null, "satin", 0x8c6845, { normalScale: 0.08 }), floorUV: 3.2,
    ceiling: pbr("timber_parquet_dark_v1", null, "matte", 0x725236, { normalScale: 0.08 }), ceilUV: 3.2,
    band: null,
    decor: "oceanic",
    oceVariant: "living",
    // Set the interior plaque just past the deep gabled frame so its long room
    // title remains unobstructed from the central circulation line.
    portal: { mat: pbr("timber_parquet_dark_v1", null, "matte", 0x5a3c20, { normalScale: 0.06 }), signBackZ: 2.02 },
    light: { color: 0xffd699, intensity: 55, every: 4.8, dist: 21, decay: 1.55, y: -0.2 },
    frame: "darkwood",
  };
  S.oceanic2.ceiling.emissive = new THREE.Color(0x24170c);
  S.oceanic2.ceiling.emissiveIntensity = 0.32;

  return S;
}
