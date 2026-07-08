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
import { toon } from "./shading.js";

// Cel-shaded: the old "finish" argument is kept for call-site compatibility
// but every lit surface now renders with stepped toon bands.
export function surf(map, finish = "matte", color = 0xffffff) {
  return toon({ map, color });
}

const flat = (color) => toon({ color });
const flatShiny = (color) => toon({ color });

export const FRAME_MATS = {};

export function buildStyles() {
  FRAME_MATS.gold = toon({ color: 0xc59d55 });
  FRAME_MATS.darkwood = toon({ color: 0x33251a });
  FRAME_MATS.stone = toon({ color: 0x87796a });
  FRAME_MATS.red = toon({ color: 0x7a2418 });
  FRAME_MATS.modern = toon({ color: 0x17171a });
  FRAME_MATS.sand = toon({ color: 0xa8895e });
  FRAME_MATS.plaque = toon({ color: 0x241e16 });

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
    ceilH: 6.4,
    wall: surf(F("gothic_stone", T.stoneBlocks({ base: "#6a6258", mortar: "#3c372f", rows: 5, cols: 3, seed: 44 })), "satin"), wallUV: 4,
    floor: surf(F("gothic_floor", T.stoneFloor("#5d564b", 45)), "satin"), floorUV: 4,
    ceiling: flat(0x37322b),
    windows: "stained",
    portal: { mat: flat(0x555046) },
    light: { color: 0xffc98a, intensity: 30, every: 8 },
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
    ceilH: 5.4,
    wall: surf(F("china_lacquer", T.plaster("#8f2b1e", 84)), "satin"), wallUV: 5,
    floor: surf(F("china_floor", T.woodFloor("#4a3220", 85)), "satin"), floorUV: 4,
    ceiling: flat(0x2c1c12),
    band: { mat: flatShiny(0x1f4536, "polished"), y: 4.4, h: 0.25, uvLen: 4 },
    columns: { type: "red", every: 5.8, color: 0x8f2b1e, finish: "polished" },
    portal: { mat: flatShiny(0x7c2418, "polished") },
    light: { color: 0xffb46e, intensity: 40, every: 8 },
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
    ceilH: 5.8,
    wall: surf(F("mughal_marble", T.marble("#ece2d2", "rgba(150,130,110,0.2)", 92)), "gloss"), wallUV: 4,
    floor: surf(T.checkerFloor("#e0d5c0", "#8d4a3c", 93), "gloss"), floorUV: 4,
    ceiling: flat(0xd8cbb4),
    band: { mat: surf(T.starTile("#8d4a3c", "#ecdfc8", "#3f6b8e", 94), "polished"), y: 4.4, h: 0.8, uvLen: 1.6 },
    portal: { mat: flat(0xc9b8a0), pointed: true },
    light: { color: 0xffe8c4, intensity: 46, every: 9 },
    frame: "gold",
  };

  // ---- Africa ----
  S.egypt = {
    ceilH: 5.8,
    wall: surf(F("egypt_stone", T.stoneBlocks({ base: "#c2a06c", mortar: "#7a6440", rows: 3, cols: 2, seed: 95 }))), wallUV: 4,
    floor: surf(T.stoneFloor("#a88c5e", 96), "satin"), floorUV: 4,
    ceiling: flat(0x8a7040),
    band: { mat: surf(F("band_hieroglyphs", T.hieroglyphBand("#c8a86a", "#3a2c18", 97))), y: 2.9, h: 1.5, uvLen: 6, behindArt: true },
    columns: { type: "papyrus", every: 6, color: 0xbfa06a },
    portal: { mat: flat(0xa8895a) },
    light: { color: 0xffd18f, intensity: 40, every: 9 },
    frame: "sand",
  };
  S.sahel = {
    ceilH: 4.8,
    wall: surf(F("sahel_banco", T.earthenWall("#a5714a", "#4d3524", 98))), wallUV: 5,
    floor: surf(T.dirtFloor(99)), floorUV: 5,
    ceiling: surf(T.woodFloor("#5c452c", 100)), ceilUV: 4,
    band: { mat: surf(F("band_mudcloth", T.triangleBand("#96653f", "#e0c27d", "#2e1d10", 101))), y: 3.9, h: 0.55, uvLen: 4 },
    portal: { mat: flat(0x8d5f3c) },
    light: { color: 0xffc98f, intensity: 36, every: 8 },
    props: "timbers",
    frame: "darkwood",
  };
  S.earthen = {
    ceilH: 4.6,
    wall: surf(T.earthenWall("#8d5a3a", "#3c2a1a", 102)), wallUV: 5,
    floor: surf(T.dirtFloor(103)), floorUV: 5,
    ceiling: surf(T.woodFloor("#4c3a26", 104)), ceilUV: 4,
    band: { mat: surf(F("band_mudcloth", T.triangleBand("#7c4a2a", "#e0c27d", "#2e1d10", 105))), y: 1.0, h: 0.4, uvLen: 4 },
    portal: { mat: flat(0x744627) },
    light: { color: 0xffcf9b, intensity: 36, every: 8 },
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
