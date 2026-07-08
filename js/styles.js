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
    portal: { mat: flat(0xd9d2c2) },
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
    columns: { type: "pilaster", every: 5.6, color: 0xbfae8c },
    portal: { mat: flat(0xa8946e) },
    light: { color: 0xffdda8, intensity: 42, every: 9 },
    frame: "gold",
  };
  S.baroque = {
    ceilH: 5.4,
    wall: surf(F("baroque_wall", T.plaster("#5e1f1d", 49)), "satin"), wallUV: 5,
    floor: surf(T.woodFloor("#4c3a20", 50), "satin"), floorUV: 4,
    ceiling: surf(T.coffered("#43301b", "#2c2012", "#c9a256", 51), "satin"), ceilUV: 5.4,
    band: { mat: flatShiny(0xc9a256, "polished"), y: 4.3, h: 0.16, uvLen: 4 },
    columns: { type: "pilaster", every: 5.6, color: 0x6e2a26 },
    portal: { mat: flat(0x4a1d1a) },
    light: { color: 0xffd79a, intensity: 40, every: 9 },
    frame: "gold",
  };
  S.salon = {
    ceilH: 5.2,
    wall: surf(F("salon_wall", T.plaster("#5c6248", 52))), wallUV: 5,
    floor: surf(F("renaissance_floor", T.woodFloor("#6e5335", 53)), "satin"), floorUV: 4,
    ceiling: flat(0xd8d2c4),
    band: { mat: flatShiny(0xcabf9f, "satin"), y: 1.0, h: 0.1, uvLen: 4 },
    portal: { mat: flat(0x4e5340) },
    light: { color: 0xffe2b0, intensity: 44, every: 9 },
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
    ceilH: 5.2,
    wall: surf(T.plaster("#4e5a63", 54)), wallUV: 5,
    floor: surf(F("renaissance_floor", T.woodFloor("#7a6247", 55)), "satin"), floorUV: 4,
    ceiling: flat(0xd8d2c4),
    band: { mat: flatShiny(0xb8ab8d, "satin"), y: 1.0, h: 0.1, uvLen: 4 },
    portal: { mat: flat(0x434e56) },
    light: { color: 0xfff0cd, intensity: 48, every: 9 },
    frame: "gold",
  };
  S.modern = {
    ceilH: 4.8,
    wall: surf(F("modern_wall", T.plaster("#e8e6e1", 56))), wallUV: 6,
    floor: surf(F("modern_floor", T.concreteFloor(57)), "satin"), floorUV: 5,
    ceiling: flat(0xf0eeea),
    portal: { mat: flat(0xdddad4) },
    light: { color: 0xfff6e8, intensity: 60, every: 7, y: -0.25 },
    frame: "modern",
  };

  // ---- Americas ----
  S.meso = {
    ceilH: 5.2,
    wall: surf(F("meso_stone", T.stoneBlocks({ base: "#9b8a6d", mortar: "#5c5140", rows: 4, cols: 2, seed: 58 }))), wallUV: 4,
    floor: surf(T.stoneFloor("#8a7a5f", 59), "satin"), floorUV: 4,
    ceiling: flat(0x6e6250),
    band: { mat: surf(F("band_greca", T.grecaBand("#7d5b3f", "#2e2013", 60))), y: 4.2, h: 0.7, uvLen: 5 },
    portal: { mat: flat(0x84765c) },
    light: { color: 0xffc383, intensity: 34, every: 8 },
    frame: "stone",
  };
  S.inca = {
    ceilH: 4.8,
    wall: surf(F("inca_stone", T.stoneBlocks({ base: "#8d8a80", mortar: "#44423c", rows: 3, cols: 2, seed: 61, jitterCol: 10 })), "satin"), wallUV: 3.5,
    floor: surf(T.stoneFloor("#767268", 62), "satin"), floorUV: 4,
    ceiling: flat(0x5c584f),
    portal: { mat: flat(0x7b776d), trapezoid: true },
    light: { color: 0xffcf96, intensity: 34, every: 8 },
    frame: "stone",
  };
  S.adobe = {
    ceilH: 4.4,
    wall: surf(F("adobe_wall", T.earthenWall("#b98d5f", "#4d3524", 63))), wallUV: 5,
    floor: surf(T.dirtFloor(64)), floorUV: 5,
    ceiling: surf(T.woodFloor("#6e5335", 65)), ceilUV: 4,
    band: { mat: surf(T.grecaBand("#a5714a", "#3c2a1a", 66)), y: 3.7, h: 0.5, uvLen: 5 },
    portal: { mat: flat(0x9c7850) },
    light: { color: 0xffc98f, intensity: 36, every: 8 },
    frame: "darkwood",
  };

  // ---- Middle East ----
  S.neolithic = {
    ceilH: 4.2,
    wall: surf(T.earthenWall("#c2a075", "#4d3524", 67)), wallUV: 5,
    floor: surf(T.dirtFloor(68)), floorUV: 5,
    ceiling: flat(0x9c8560),
    band: { mat: surf(T.triangleBand("#b08a5c", "#7a2f1d", "#3c2a1a", 69)), y: 3.4, h: 0.5, uvLen: 4 },
    portal: { mat: flat(0xa98a5f) },
    light: { color: 0xffc98f, intensity: 34, every: 8 },
    frame: "sand",
  };
  S.mesopotamia = {
    ceilH: 5.4,
    wall: surf(F("mudbrick", T.mudbrick(70))), wallUV: 4,
    floor: surf(T.stoneFloor("#8d7150", 71), "satin"), floorUV: 4,
    ceiling: flat(0x77603f),
    band: { mat: surf(F("band_ishtar", T.glazedBand("#1c4d7c", "#e8c95f", 72)), "polished"), y: 4.1, h: 0.9, uvLen: 6 },
    portal: { mat: flatShiny(0x1c4d7c, "polished") },
    light: { color: 0xffcf96, intensity: 38, every: 8 },
    frame: "sand",
  };
  S.persia = {
    ceilH: 6.0,
    wall: surf(F("persia_stone", T.stoneBlocks({ base: "#b09a72", mortar: "#6b5b40", rows: 4, cols: 2, seed: 73 }))), wallUV: 4,
    floor: surf(T.stoneFloor("#9c8760", 74), "satin"), floorUV: 4,
    ceiling: flat(0x8a7550),
    band: { mat: surf(F("band_archers", T.glazedBand("#27516e", "#d8b44e", 75)), "polished"), y: 4.7, h: 0.8, uvLen: 6 },
    columns: { type: "persian", every: 6.5, color: 0xa5967a },
    portal: { mat: flat(0x9d8a64) },
    light: { color: 0xffd9a3, intensity: 42, every: 9 },
    frame: "sand",
  };
  S.islamic = {
    ceilH: 5.8,
    wall: surf(F("islamic_plaster", T.plaster("#e3d7bd", 76))), wallUV: 5,
    floor: surf(T.stoneFloor("#7d6f58", 77), "satin"), floorUV: 4,
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
    portal: { mat: flatShiny(0x7c1f2a, "polished"), pointed: true },
    light: { color: 0xffe6c0, intensity: 46, every: 9 },
    frame: "gold",
  };

  // ---- Asia ----
  S.indus = {
    ceilH: 4.6,
    wall: surf(F("mudbrick", T.mudbrick(82))), wallUV: 3.5,
    floor: surf(T.dirtFloor(83)), floorUV: 5,
    ceiling: flat(0x8a6f4c),
    portal: { mat: flat(0x91714b) },
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
    ceilH: 5.2,
    wall: surf(F("khmer_stone", T.stoneBlocks({ base: "#7e7a6a", mortar: "#4a473c", rows: 4, cols: 2, seed: 86 })), "satin"), wallUV: 4,
    floor: surf(T.stoneFloor("#6b675a", 87), "satin"), floorUV: 4,
    ceiling: flat(0x55524a),
    band: { mat: surf(T.grecaBand("#6b675a", "#2c2a22", 88)), y: 4.2, h: 0.5, uvLen: 4 },
    portal: { mat: flat(0x6b675a) },
    light: { color: 0xd9e8b8, intensity: 30, every: 8 },
    frame: "stone",
  };
  S.japan = {
    ceilH: 4.6,
    wall: surf(F("japan_shoji", T.shoji(89))), wallUV: 4.6,
    floor: surf(F("japan_floor", T.woodFloor("#9a7d58", 90)), "satin"), floorUV: 4,
    ceiling: surf(T.woodFloor("#5c452c", 91)), ceilUV: 4,
    columns: { type: "wood", every: 4.6, color: 0x4a3520, finish: "satin" },
    portal: { mat: flat(0x3c2c1a) },
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
    wall: surf(F("egypt_sandstone", T.stoneBlocks({ base: "#c2a06c", mortar: "#7a6440", rows: 3, cols: 2, seed: 95 }))), wallUV: 3.5,
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
    ceilH: 4.4,
    wall: surf(F("cave_rock", T.rock("#a06844", 106))), wallUV: 4.5,
    floor: surf(F("cave_dirt", T.dirtFloor(107))), floorUV: 5,
    ceiling: flat(0x6e4a32),
    band: { mat: surf(T.triangleBand("#9c6240", "#e8d5b0", "#4d2c18", 108)), y: 3.6, h: 0.45, uvLen: 4 },
    portal: { mat: flat(0x8d5b3c) },
    light: { color: 0xffc383, intensity: 34, every: 8 },
    frame: "sand",
  };
  S.oceanic = {
    ceilH: 4.6,
    wall: surf(T.weave("#b3915e", 109)), wallUV: 3.2,
    floor: surf(T.woodFloor("#a98a5e", 110), "satin"), floorUV: 4,
    ceiling: surf(T.weave("#8d6f45", 111)), ceilUV: 3.2,
    band: { mat: surf(F("band_mudcloth", T.triangleBand("#7c5a34", "#e8d5b0", "#2e1d10", 112))), y: 3.7, h: 0.5, uvLen: 4 },
    columns: { type: "wood", every: 5, color: 0x54371e, finish: "satin" },
    portal: { mat: flat(0x6e4f2c) },
    light: { color: 0xffe2ac, intensity: 40, every: 8 },
    frame: "darkwood",
  };

  return S;
}
