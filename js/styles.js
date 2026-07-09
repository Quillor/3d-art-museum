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

  const F = T.fileTex;
  const S = {};

  // ---- Europe ----
  S.greek = {
    ceilH: 5.6,
    wall: surf(F("greek_marble", T.marble("#e6dfd0", "rgba(125,118,105,0.22)", 41)), "gloss"), wallUV: 4,
    floor: surf(F("greek_floor", T.checkerFloor("#d8cdb4", "#4a443c", 42)), "gloss"), floorUV: 4,
    ceiling: flat(0xcfc7b6),
    band: { mat: surf(F("band_meander", T.meanderBand("#2a2e38", "#d9cfb8", 43)), "satin"), y: 4.6, h: 0.55, uvLen: 4 },
    columns: { type: "doric", every: 5.6, color: 0xe3dccc, finish: "gloss" },
    // coffered polychrome ceiling + temple-front pediment portal + aedicula
    // niches + bronze wall lamps + red dado + mosaic border (Blender greek.glb)
    decor: "greek",
    portal: { mat: flat(0xd9d2c2), glb: "greek" },
    light: { color: 0xffe3b8, intensity: 46, every: 9 },
    frame: "stone",
  };
  S.gothic = {
    // Tall enough for a pointed rib vault: the transverse arch spans the
    // full 7 m hall, and a pointed profile needs rise > half-span.
    ceilH: 8.2,
    wall: surf(F("gothic_stone", T.stoneBlocks({ base: "#6a6258", mortar: "#3c372f", rows: 5, cols: 3, seed: 44 })), "satin"), wallUV: 4,
    floor: surf(F("gothic_floor", T.stoneFloor("#5d564b", 45)), "satin"), floorUV: 4,
    ceiling: flat(0x37322b),
    windows: "stained",
    vault: "gothic",                    // Blender rib-vault bays (models.js)
    portal: { mat: flat(0x555046), glb: "gothic" },
    light: { color: 0xffc98a, intensity: 34, every: 8, y: -1.6 },
    frame: "darkwood",
  };
  S.renaissance = {
    ceilH: 5.4,
    wall: surf(F("renaissance_plaster", T.plaster("#cbb794", 46))), wallUV: 5,
    floor: surf(F("renaissance_floor", T.woodFloor("#6e5335", 47)), "satin"), floorUV: 4,
    ceiling: surf(F("renaissance_ceiling", T.coffered("#5d4526", "#3a2c1a", "#c9a256", 48)), "satin"), ceilUV: 5.4,
    band: { mat: flatShiny(0x8a6f45, "satin"), y: 1.0, h: 0.12, uvLen: 4 },
    // pietra serena pilasters, fresco aediculae, ornament frieze, and a round-
    // arched pietra portal (Blender, renaissance.glb)
    decor: "renaissance",
    portal: { mat: flat(0xa8946e), glb: "renaissance" },
    light: { color: 0xffdda8, intensity: 42, every: 9 },
    frame: "gold",
  };
  S.baroque = {
    ceilH: 5.4,
    wall: surf(F("baroque_damask", T.plaster("#5e1f1d", 49)), "satin"), wallUV: 5,
    floor: surf(F("baroque_parquet", T.woodFloor("#4c3a20", 50)), "satin"), floorUV: 4,
    ceiling: surf(T.coffered("#43301b", "#2c2012", "#c9a256", 51), "satin"), ceilUV: 5.4,
    band: { mat: flatShiny(0xc9a256, "polished"), y: 4.3, h: 0.16, uvLen: 4 },
    columns: { type: "pilaster", every: 5.6, color: 0x6e2a26 },
    // coved vault + gilt cartouches + chandeliers + candelabra sconces + carved
    // walnut wainscot + arched marble portal with gilt crest (Blender baroque.glb)
    decor: "baroque",
    portal: { mat: flat(0x4a1d1a), glb: "baroque" },
    light: { color: 0xffd79a, intensity: 40, every: 9 },
    frame: "gold",
  };
  S.salon = {
    // 19th-c Romantic salon gallery (concept: Hallway-11-europe-romantic) —
    // deep-red flocked walls, gilded picture rails + carved walnut wainscot,
    // plaster ceiling medallions, brass candelabra sconces, heavy velvet
    // drapery, and an arched carved-wood portal with a gilt crest (salon.glb).
    ceilH: 5.2,
    // deep-red flocked damask (procedural — the shipped salon_damask.jpg was a
    // pale cream that fought the concept, so it is intentionally not loaded)
    wall: surf(T.damask("#5c2128", "#743036", "#8a6a34", 52)), wallUV: 2,
    floor: surf(F("salon_parquet", T.woodFloor("#6b4526", 53)), "gloss"), floorUV: 3,
    ceiling: surf(T.plaster("#d8ccae", 57)),
    band: { mat: flatShiny(0xcabf9f, "satin"), y: 1.0, h: 0.1, uvLen: 4 },
    decor: "salon",
    portal: { mat: flat(0x3a2418), glb: "salon" },
    light: { color: 0xffd9a0, intensity: 40, every: 8 },
    frame: "gold",
  };
  S.amsalon = {
    // 19th-century American salon (concept: Hallway-05-americas-19th-century)
    // — damask walls over walnut wainscot, parquet floor, gilt picture-rail
    // band, gaslight sconces, carved wood + gilt portal (amsalon.glb)
    ceilH: 5.2,
    wall: surf(F("amsalon_wall", T.plaster("#6a2c30", 152))), wallUV: 1.4,
    floor: surf(F("amsalon_floor", T.woodFloor("#6e4a2c", 153)), "gloss"), floorUV: 3,
    ceiling: flat(0xe2dbc8),
    band: { mat: surf(F("amsalon_band", T.triangleBand("#8a6a24", "#c8a84e", "#3a2c14", 154))), y: 4.55, h: 0.42, uvLen: 1.7 },
    decor: "amsalon",
    portal: { mat: flat(0x3a2418), glb: "amsalon" },
    light: { color: 0xffdca8, intensity: 44, every: 9 },
    frame: "gold",
  };
  S.salon2 = {
    // Impressionist salon (concept: Hallway-12-europe-impressionism) — a bright,
    // airy gallery with a glass skylight, pale sage damask walls, cream paneled
    // wainscot + gilded picture rails, and brass picture lights over each frame
    // (reuses salon.glb portal with a cream palette).
    ceilH: 5.2,
    // pale sage tone-on-tone damask (the shipped salon2_sage_damask.jpg is a
    // DARK slate-blue that renders near-black and fights the airy concept, so it
    // is intentionally not loaded — a light procedural damask reads far closer).
    // A gentle sage emissive self-lifts the walls to the concept's even daylight
    // (this non-wing-end segment gets little from the point lights; global
    // ambient must not be touched, so emissive is the reliable brightness lever)
    wall: new THREE.MeshLambertMaterial({ map: T.damask("#dfe3d2", "#d4d9c5", "#cbb06e", 54), emissive: 0x474b3b }), wallUV: 3,
    // the shipped salon2_parquet.jpg is a dark basketweave that renders
    // near-black; a lighter honey plank floor keeps the warm parquet patina
    // and reads far brighter (see "textures wanted": pale herringbone parquet)
    floor: new THREE.MeshPhongMaterial({ map: T.woodFloor("#9c7844", 55), specular: 0x4a453c, shininess: 42, emissive: 0x2c2012 }), floorUV: 4,
    ceiling: new THREE.MeshLambertMaterial({ color: 0xf3eee2, emissive: 0x403d33 }),
    band: { mat: flatShiny(0xc9bd9a, "satin"), y: 1.0, h: 0.1, uvLen: 4 },
    decor: "salon2",
    portal: { mat: flat(0xeae3d0), glb: "salon2" },
    // low decay spreads the point-light fill for a bright, even daylit gallery
    // (steep default decay=2 leaves broad walls/floor at the dim global ambient)
    light: { color: 0xfff5e6, intensity: 40, every: 5, dist: 26, decay: 1.25 },
    frame: "gold",
  };
  S.modern = {
    // Early-modern gallery, Art Deco 1890-1930 (concept: Hallway-06/13/19/25
    // *-modern) — painted plaster with a picture rail, terrazzo floor + inlaid
    // border, a skylit laylight ceiling with track lighting, bronze deco
    // railings, and a geometric Art Deco portal (Blender, modern.glb).
    ceilH: 4.8,
    wall: surf(F("modern_wall", T.plaster("#e9e6df", 56))), wallUV: 6,
    // Pale warm terrazzo with aggregate chips (shipped modern_terrazzo.jpg is a
    // flat grey blob that reads muddy — the procedural is brighter & on-concept).
    floor: surf(T.terrazzo("#dcd6c8", 57), "satin"), floorUV: 3,
    ceiling: flat(0xf0eeea),
    decor: "modern",                   // laylight + track + rails + picture rail
    portal: { mat: flat(0xdddad4), glb: "modern" },
    light: { color: 0xfff6e8, intensity: 60, every: 7, y: -0.25 },
    frame: "modern",
  };

  // ---- Americas ----
  S.meso = {
    // Mesoamerican temple gallery (concept: Hallway-02-americas-mesoamerica)
    // — engaged limestone piers with red greca bands, carved step-fret
    // friezes, stone benches, deep ceiling beams, a stepped ceremonial portal
    // with a deity-mask lintel (Blender, meso.glb).
    ceilH: 5.2,
    wall: surf(F("meso_stone", T.stoneBlocks({ base: "#9b8a6d", mortar: "#5c5140", rows: 4, cols: 2, seed: 58 }))), wallUV: 4,
    floor: surf(F("meso_limestone_floor", T.stoneFloor("#8a7a5f", 59)), "satin"), floorUV: 4,
    ceiling: flat(0x6e6250),
    band: { mat: surf(F("band_greca", T.grecaBand("#7d5b3f", "#2e2013", 60))), y: 4.2, h: 0.7, uvLen: 5 },
    decor: "meso",                     // piers + benches + beams
    portal: { mat: flat(0x84765c), glb: "meso" },
    light: { color: 0xffc383, intensity: 34, every: 8 },
    frame: "stone",
  };
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
    wall: surf(T.stoneBlocks({ base: "#c0bfb7", mortar: "#3c3c37", rows: 3, cols: 2, seed: 61, jitterCol: 12 }), "satin"), wallUV: 3.5,
    // Irregular megalithic flagstone (concept), warm-grey so it catches the
    // concealed uplight pools rather than reading as regular slabs.
    floor: surf(T.flagstone("#8f8c83", 62), "satin"), floorUV: 2.4,
    ceiling: surf(T.plaster("#dcd4c0", 261)),   // warm lime-plaster ceiling
    band: { mat: surf(T.grecaBand("#b3afa3", "#2c2a26", 261), "satin"), y: 4.3, h: 0.4, uvLen: 4.5 },
    decor: "inca",                     // trapezoidal niches + concealed uplights
    portal: { mat: flat(0x9d9a93), glb: "inca" },
    light: { color: 0xffd6a2, intensity: 72, every: 4.5, dist: 20, y: -0.05 },
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
    wall: surf(F("adobe_wall", T.earthenWall("#c39362", "#5a3a22", 63))), wallUV: 5,
    floor: surf(T.packedEarth(64)), floorUV: 4,
    ceiling: surf(T.woodFloor("#5a4227", 65)), ceilUV: 4,
    band: { mat: surf(F("adobe_painted_frieze", T.triangleBand("#7c3a22", "#e0c27d", "#2e1d10", 66))), y: 0.85, h: 0.4, uvLen: 4 },
    decor: "adobe",                    // vigas + latillas + arched niches + textiles
    portal: { mat: flat(0x9c7850), glb: "adobe" },
    light: { color: 0xffca8a, intensity: 44, every: 7 },
    frame: "darkwood",
  };

  // ---- Middle East ----
  S.neolithic = {
    // Neolithic village corridor (concept: Hallway-14-middle-east-neolithic) —
    // lime-plastered mudbrick, rounded niches with vessels under uplights, a
    // reed-and-timber ceiling, red-ochre zigzag friezes, and a mud bench along
    // the wall base (reuses adobe.glb parts with a Neolithic palette).
    ceilH: 4.2,
    wall: surf(F("neolithic_wall", T.earthenWall("#c2a075", "#7a2f1d", 67))), wallUV: 5,
    floor: surf(T.packedEarth(68), "satin"), floorUV: 4,   // warm packed clay (catches uplights; concept Hallway-14)
    ceiling: surf(F("neolithic_reed", T.weave("#8a6f45", 168))), ceilUV: 3,
    band: { mat: surf(F("neolithic_ochre_figures.png", T.triangleBand("#b08a5c", "#7a2f1d", "#3c2a1a", 69))), y: 3.4, h: 0.5, uvLen: 4 },
    decor: "neolithic",
    portal: { mat: flat(0xa98a5f), glb: "neolithic" },
    light: { color: 0xffca8a, intensity: 44, every: 7 },
    frame: "sand",
  };
  S.mesopotamia = {
    ceilH: 5.4,
    wall: surf(F("mudbrick", T.mudbrick(70))), wallUV: 4,
    floor: surf(T.stoneFloor("#8d7150", 71), "satin"), floorUV: 4,
    ceiling: flat(0x77603f),
    band: { mat: surf(F("glazed_brick", T.glazedBand("#1c4d7c", "#e8c95f", 72)), "polished"), y: 4.1, h: 0.9, uvLen: 6 },
    portal: { mat: flatShiny(0x1c4d7c, "polished") },
    light: { color: 0xffcf96, intensity: 38, every: 8 },
    frame: "sand",
  };
  S.persia = {
    ceilH: 6.0,
    wall: surf(F("persia_stone", T.stoneBlocks({ base: "#b09a72", mortar: "#6b5b40", rows: 4, cols: 2, seed: 73 }))), wallUV: 4,
    floor: surf(F("persia_floor", T.stoneFloor("#9c8760", 74)), "satin"), floorUV: 4,
    ceiling: flat(0x8a7550),
    band: { mat: surf(F("band_archers", T.glazedBand("#27516e", "#d8b44e", 75)), "polished"), y: 4.7, h: 0.8, uvLen: 6 },
    // Achaemenid relief guards line the walls, blue+gold rosette friezes, and an
    // Apadana portal with fluted bull-protome columns + winged disk (persia.glb)
    decor: "persia",
    portal: { mat: flat(0x9d8a64), glb: "persia" },
    light: { color: 0xffd9a3, intensity: 42, every: 9 },
    frame: "sand",
  };
  S.islamic = {
    ceilH: 5.8,
    wall: surf(F("islamic_plaster", T.plaster("#e3d7bd", 76))), wallUV: 5,
    floor: surf(F("islamic_floor", T.stoneFloor("#7d6f58", 77)), "satin"), floorUV: 4,
    ceiling: flat(0x39546b),
    band: { mat: surf(F("band_zellige", T.starTile("#1d4e6b", "#e4d9b8", "#3f8ea6", 78)), "polished"), y: 3.9, h: 1.15, uvLen: 2.3 },
    portal: { mat: flatShiny(0x2a5b78, "polished"), pointed: true },
    light: { color: 0xffe0b3, intensity: 44, every: 9 },
    frame: "darkwood",
  };
  S.ottoman = {
    ceilH: 5.8,
    wall: surf(F("islamic_plaster", T.plaster("#ece5d2", 79))), wallUV: 5,
    floor: surf(F("hub_floor", T.checkerFloor("#c9bda2", "#5c4f42", 80)), "gloss"), floorUV: 4,
    ceiling: flat(0x7c3b3b),
    band: { mat: surf(F("band_iznik", T.starTile("#7c1f2a", "#e8ddc2", "#27516e", 81)), "polished"), y: 3.9, h: 1.0, uvLen: 2 },
    // Iznik-tiled corridor, muqarnas cornice, brass hanging lamps, red runner
    // (reuses islamic.glb parts with an Iznik palette)
    decor: "ottoman",
    portal: { mat: flatShiny(0x7c1f2a, "polished"), glb: "ottoman" },
    light: { color: 0xffe6c0, intensity: 46, every: 9 },
    frame: "gold",
  };

  // ---- Asia ----
  S.indus = {
    // Harappan baked-brick gallery (concept: Hallway-20-asia-indus) — fired
    // brick with lime-plaster reveals, engaged brick piers, recessed niches
    // with pots under cool-white light, square terracotta motif plaques, and a
    // monumental brick portal with a heavy timber lintel (Blender, indus.glb).
    ceilH: 4.6,
    wall: surf(F("indus_brick", T.mudbrick(82))), wallUV: 3.5,
    floor: surf(F("indus_floor", T.dirtFloor(83))), floorUV: 5,
    ceiling: flat(0x8a6f4c),
    decor: "indus",                    // brick piers + niches + plaques + beams
    portal: { mat: flat(0x91714b), glb: "indus" },
    light: { color: 0xffcf96, intensity: 34, every: 8 },
    frame: "sand",
  };
  S.china = {
    // Tang/Song timber hall (concept: Hallway-5-Asia row 2) — red lacquer
    // panels in a dark timber grid, glowing lattice clerestory, beamed
    // ceiling, dougong columns, moon-gate portal (Blender, china.glb).
    ceilH: 5.4,
    wall: surf(F("china_lacquer", T.plaster("#8f2b1e", 84)), "satin"), wallUV: 5,
    floor: surf(F("china_floor", T.woodFloor("#4a3220", 85)), "satin"), floorUV: 4,
    ceiling: surf(T.woodFloor("#2a1a0e", 118), "satin"), ceilUV: 4,
    decor: "china",                    // timber grid + lattice + beams
    columns: { glb: "china", every: 5.8 },
    portal: { mat: flatShiny(0x7c2418, "polished"), glb: "china" },
    light: { color: 0xffb46e, intensity: 44, every: 8 },
    frame: "red",
  };
  S.khmer = {
    // Khmer/Angkor sandstone gallery (concept: Hallway-22-asia-southeast) —
    // carved bas-relief panels (apsaras/floral) framed by colonnette pilasters,
    // a carved doorway with lintel + pediment relief, a corbelled timber
    // ceiling and grazing uplights (Blender, khmer.glb).
    ceilH: 5.2,
    wall: surf(F("khmer_sandstone", T.stoneBlocks({ base: "#7e7a6a", mortar: "#4a473c", rows: 4, cols: 2, seed: 86 })), "satin"), wallUV: 4,
    floor: surf(F("khmer_floor", T.stoneFloor("#6b675a", 87)), "satin"), floorUV: 4,
    ceiling: flat(0x55524a),
    band: { mat: surf(T.grecaBand("#6b675a", "#2c2a22", 88)), y: 4.2, h: 0.5, uvLen: 4 },
    decor: "khmer",                    // colonnettes + relief panels + corbel
    portal: { mat: flat(0x6b675a), glb: "khmer" },
    light: { color: 0xe7edc8, intensity: 42, every: 8 },
    frame: "stone",
  };
  S.japan = {
    // Shoin-style timber gallery (concept: Hallway-23-asia-japan) — dark timber
    // post-and-beam frame, backlit shoji clerestory, tokonoma display alcoves
    // with hanging scrolls, exposed beams, wall andon lanterns, and a refined
    // timber threshold portal (Blender, japan.glb).
    ceilH: 4.6,
    wall: surf(F("japan_shoji_paper", T.shoji(89))), wallUV: 4.6,
    floor: surf(F("japan_tatami", T.woodFloor("#9a7d58", 90)), "satin"), floorUV: 4,
    ceiling: surf(T.woodFloor("#5c452c", 91)), ceilUV: 4,
    decor: "japan",                    // timber frame + shoji + tokonoma + andon
    portal: { mat: flat(0x3c2c1a), glb: "japan" },
    light: { color: 0xfff1d4, intensity: 40, every: 8 },
    frame: "darkwood",
  };
  S.mughal = {
    // White-marble Mughal hall (concept: Hallway-5-Asia row 5) — blind
    // cusped arcade behind the art, glowing jali screens between, cusped
    // pishtaq portal (Blender, mughal.glb). Band dropped for the pale look.
    ceilH: 5.8,
    wall: surf(F("mughal_marble", T.marble("#ece2d2", "rgba(150,130,110,0.2)", 92)), "gloss"), wallUV: 4,
    floor: surf(T.tajFloor(93), "gloss"), floorUV: 4,
    ceiling: flat(0xd8cbb4),
    decor: "mughal",                   // arcade + jali screens
    portal: { mat: flat(0xc9b8a0), glb: "mughal" },
    light: { color: 0xffe8c4, intensity: 46, every: 9 },
    frame: "gold",
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
    wall: surf(F("egypt_stone", T.stoneBlocks({ base: "#c2a06c", mortar: "#7a6440", rows: 3, cols: 2, seed: 95 }))), wallUV: 3.5,
    floor: surf(F("egypt_floor", T.stoneFloor("#a88c5e", 96)), "satin"), floorUV: 4.5,
    ceiling: surf(F("egypt_sandstone", T.stoneBlocks({ base: "#8a7350", mortar: "#5a4a30", rows: 3, cols: 2, seed: 95 }))), ceilUV: 3.5,
    band: { mat: surf(F("egypt_frieze", T.hieroglyphBand("#c8a86a", "#3a2c18", 97))), y: 4.85, h: 0.78, uvLen: 3.1 },
    columns: { type: "papyrus", every: 6, color: 0xbfa06a, glb: "egypt" },
    decor: "egypt",
    portal: { mat: flat(0xa8895a), glb: "egypt" },
    light: { color: 0xffc386, intensity: 48, every: 7, dist: 25 },
    frame: "sand",
  };
  S.sahel = {
    // Sahelian banco palace (concept: Hallway-27-africa-kingdoms) — sculpted
    // artifact niches, toron timber ceiling, monumental mud gate (kingdoms.glb)
    ceilH: 4.8,
    wall: surf(F("kingdoms_wall", T.earthenWall("#a5714a", "#4d3524", 98))), wallUV: 3.5,
    floor: surf(F("kingdoms_floor", T.dirtFloor(99))), floorUV: 4,
    ceiling: flat(0x3e2e1e),
    band: { mat: surf(F("kingdoms_band", T.triangleBand("#96653f", "#e0c27d", "#2e1d10", 101))), y: 3.55, h: 0.62, uvLen: 2.5 },
    decor: "kingdoms",
    portal: { mat: flat(0x8d5f3c), glb: "kingdoms" },
    light: { color: 0xffc98f, intensity: 34, every: 8 },
    frame: "darkwood",
  };
  S.earthen = {
    // Timber-and-plaster ritual gallery (concept: Hallway-28-africa-traditions)
    // — carved hardwood posts + portal, woven raffia floor/ceiling, lantern
    // sconces and display niches (traditions.glb)
    ceilH: 4.6,
    wall: surf(F("traditions_wall", T.earthenWall("#8d5a3a", "#3c2a1a", 102))), wallUV: 3.5,
    floor: surf(F("traditions_floor", T.dirtFloor(103))), floorUV: 3,
    ceiling: surf(F("traditions_floor", T.woodFloor("#4c3a26", 104))), ceilUV: 3,
    band: { mat: surf(F("band_mudcloth", T.triangleBand("#7c4a2a", "#e0c27d", "#2e1d10", 105))), y: 2.75, h: 0.45, uvLen: 4 },
    columns: { type: "wood", every: 5.5, color: 0x2c1c10, glb: "traditions" },
    decor: "traditions",
    portal: { mat: flat(0x744627), glb: "traditions" },
    light: { color: 0xffcf9b, intensity: 34, every: 8 },
    frame: "darkwood",
  };

  // ---- Oceania ----
  S.rockshelter = {
    // Ancient Oceania rock-shelter gallery (concept: Hallway-29-oceania-ancient)
    // — sandstone rock walls with ochre hand stencils + x-ray animal rock-art,
    // wall torches, floor uplights, rock-ledge niches and scattered boulders.
    ceilH: 4.4,
    wall: surf(F("oceania_sandstone", T.rock("#a06844", 106))), wallUV: 4.5,
    floor: surf(F("oceania_floor", T.dirtFloor(107))), floorUV: 5,
    ceiling: surf(F("oceania_sandstone", T.rock("#7a5236", 108))), ceilUV: 4.5,
    band: { mat: surf(T.triangleBand("#9c6240", "#e8d5b0", "#4d2c18", 118)), y: 3.6, h: 0.45, uvLen: 4 },
    decor: "rockshelter",
    portal: { mat: flat(0x8d5b3c) },
    light: { color: 0xffc383, intensity: 38, every: 8 },
    frame: "sand",
  };
  S.oceanic = {
    // Pacific voyagers/living gallery (concept: Hallway-30/31-oceania) — timber
    // and woven: lashed carved timber posts, a canoe-rib ceiling, woven pandanus
    // panels, glowing navigation-star screens, woven lantern sconces (oceanic.glb)
    ceilH: 4.6,
    wall: surf(T.weave("#b3915e", 109)), wallUV: 3.2,
    floor: surf(T.woodFloor("#a98a5e", 110), "satin"), floorUV: 4,
    ceiling: surf(T.weave("#8d6f45", 111)), ceilUV: 3.2,
    band: { mat: surf(F("oceanic_tapa", T.triangleBand("#7c5a34", "#e8d5b0", "#2e1d10", 112))), y: 3.7, h: 0.5, uvLen: 4 },
    decor: "oceanic",
    portal: { mat: flat(0x6e4f2c), glb: "oceanic" },
    light: { color: 0xffe2ac, intensity: 40, every: 8 },
    frame: "darkwood",
  };

  return S;
}
