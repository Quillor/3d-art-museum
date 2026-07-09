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
  // bright carved-gilt frame for the impressionist salon (heavy ornate gold in
  // the concept sheet, not the muted brown-gold of the shared `gold` frame)
  FRAME_MATS.salon2gilt = new THREE.MeshPhongMaterial({ color: 0xd9b45e, specular: 0xfff0c2, shininess: 130, emissive: 0x2c2209 });

  const F = T.fileTex;
  const S = {};

  // ---- Europe ----
  S.greek = {
    ceilH: 5.6,
    wall: surf(F("greek_marble", T.marble("#ece5d6", "rgba(150,120,96,0.20)", 41)), "gloss"), wallUV: 4,
    // Warm polished-marble slab floor (two close cream/tan tones) — the
    // concept's calm pale marble PAVING that flanks the central mosaic carpet,
    // low-contrast so the carpet reads as the star (not a busy 2-tone checker;
    // NOT the near-black greek_floor.jpg). Procedural forced for determinism.
    floor: surf(T.checkerFloor("#ece3ce", "#dccbaa", 42), "gloss"), floorUV: 4,
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
    light: { color: 0xffe3b8, intensity: 31, every: 8, dist: 16, y: -0.9 },
    frame: "stone",
  };
  S.gothic = {
    // Tall enough for a pointed rib vault: the transverse arch spans the
    // full 7 m hall, and a pointed profile needs rise > half-span.
    ceilH: 8.2,
    // WARM PALE LIMESTONE ashlar. The shipped gothic_stone.jpg is a near-black
    // dark-brown brick that rendered the whole cloister (and, via the cloned
    // vault webs) near-black; the concept walls are light warm limestone. Drop
    // the dark image for a lighter procedural ashlar + warm tint so the walls
    // AND the rib vault read as lit stone.
    // Faint warm emissiveMap self-lifts the ashlar so the tall upper walls +
    // vault springing never crush to black between the low point lights — the
    // concept is an evenly, warmly lit limestone cloister, not a moody crypt.
    wall: (() => {
      const ashlar = T.stoneBlocks({ base: "#c8bc9e", mortar: "#a1977f", rows: 5, cols: 3, seed: 44 });
      const w = surf(ashlar, "satin", 0xf8f1e2);
      w.emissive = new THREE.Color(0x342f22); w.emissiveMap = ashlar;
      return w;
    })(), wallUV: 4,
    // worn warm flagstone for the aisle borders (an encaustic tile runner is
    // laid down the centre in buildGothicDecor); lightened + warmed off the dim jpg.
    floor: surf(F("gothic_floor", T.flagstone("#b3a894", 45)), "satin", 0xf2ebda), floorUV: 4,
    // warm lit soffit behind/above the vault webs (was near-black 0x37322b, then
    // 0x8c8272 which still crushed dark up at the 8 m crown — lift toward a lit
    // pale limestone so the vault reads warm & evenly lit like the concept).
    ceiling: flat(0xaea48d),
    windows: "stained",
    vault: "gothic",                    // Blender rib-vault bays (models.js)
    decor: "gothic",                    // iron hanging lanterns + encaustic runner
    portal: { mat: flat(0x9a9080), glb: "gothic" },
    light: { color: 0xffd6a6, intensity: 56, every: 5, dist: 20, y: -1.0 },
    frame: "darkwood",
  };
  S.renaissance = {
    ceilH: 5.4,
    // warm lime-plaster walls (concept is cream/tan — nudged warm off the cool jpg)
    wall: surf(F("renaissance_plaster", T.plaster("#cbb794", 46)), "matte", 0xefe6cf), wallUV: 5,
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
    light: { color: 0xffdda8, intensity: 46, every: 6, dist: 18 },
    frame: "gold",
  };
  S.baroque = {
    ceilH: 5.4,
    // Deep crimson damask (baroque_damask.jpg) at a finer repeat so the ogee
    // motif reads at palace scale rather than as huge sparse ovals. A faint warm
    // emissive lifts the deep base out of pure black so the walls always read as
    // rich crimson (the raw jpg base rendered near-black under point light).
    wall: Object.assign(surf(F("baroque_damask", T.plaster("#5e1f1d", 49)), "satin"),
      { emissive: new THREE.Color(0x401713) }), wallUV: 2.6,
    // Warm honey herringbone parquet (the concept's signature floor) instead of
    // the near-black basketweave jpg — much brighter, catches the warm light.
    floor: surf(T.herringbone("#9a7038", 50), "satin"), floorUV: 2.6,
    // Bright cream stucco vault: cream fills the large recessed panels (the
    // dominant area) with gold-brown coffer beams + bright gilt molding, so the
    // ceiling reads as a lit painted vault, not a near-black void.
    ceiling: surf(T.coffered("#a07f42", "#d8c8a0", "#e8ca6c", 51), "satin"), ceilUV: 5.4,
    band: { mat: flatShiny(0xd0a94e, "polished"), y: 4.3, h: 0.16, uvLen: 4 },
    // warm gilt-stone pilasters frame the damask bays (was dark red, invisible)
    columns: { type: "pilaster", every: 5.6, color: 0xbaa06a },
    // coved vault + gilt cartouches + chandeliers + candelabra sconces + carved
    // walnut wainscot + arched marble portal with gilt crest (Blender baroque.glb)
    decor: "baroque",
    portal: { mat: flat(0x5a2420), glb: "baroque" },
    // Warm, bright light dropped off the ceiling (y:-0.5) so it washes the
    // damask walls + paintings, not just the vault.
    light: { color: 0xffe6bc, intensity: 54, every: 5, dist: 20, y: -0.5 },
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
    // wine damask: floor the crushed blacks with a faint warm emissive so the
    // pattern reads in shadow instead of collapsing to pure black under ACES
    wall: (() => { const m = surf(F("amsalon_wall", T.plaster("#6a2c30", 152))); m.emissive.setHex(0x1c0f10); return m; })(), wallUV: 1.4,
    // varnished parquet: a faint warm emissive keeps the herringbone reading
    // warm even in the shadowed stretches between overhead lights
    floor: (() => { const m = surf(F("amsalon_floor", T.woodFloor("#6e4a2c", 153)), "gloss"); m.emissive.setHex(0x241609); return m; })(), floorUV: 3,
    // bright warm plaster ceiling — the calmest, brightest surface in the salon
    // (a warm emissive keeps it a lit cream between the sparse overhead lights)
    ceiling: new THREE.MeshLambertMaterial({ color: 0xeee6d0, emissive: 0x5a4a33 }),
    band: { mat: surf(F("amsalon_band", T.triangleBand("#8a6a24", "#c8a84e", "#3a2c14", 154))), y: 4.55, h: 0.42, uvLen: 1.7 },
    decor: "amsalon",
    portal: { mat: flat(0x3a2418), glb: "amsalon" },
    light: { color: 0xffe0b0, intensity: 84, every: 5.6, dist: 18.5, y: -0.35 },
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
    // pale sage tone-on-tone damask; a slightly deeper motif + gilt thread so
    // the ogee pattern actually reads, and a lighter/warmer emissive so the
    // walls sit at the concept's luminous pale sage rather than flat olive.
    wall: new THREE.MeshLambertMaterial({ map: T.damask("#dde3cf", "#ccd3b9", "#c8a95c", 54), emissive: 0x767c67 }), wallUV: 3,
    // signature herringbone/chevron parquet with a warm honey patina (the
    // shipped salon2_parquet.jpg is a dark basketweave that renders near-black;
    // the procedural herringbone reads far brighter and is the concept surface)
    floor: new THREE.MeshPhongMaterial({ map: T.herringbone("#a1783f", 55), specular: 0x5a5248, shininess: 46, emissive: 0x3a2b18 }), floorUV: 4.4,
    ceiling: new THREE.MeshLambertMaterial({ color: 0xf6f1e7, emissive: 0x77715c }),
    band: { mat: flatShiny(0xc9bd9a, "satin"), y: 1.0, h: 0.1, uvLen: 4 },
    decor: "salon2",
    portal: { mat: flat(0xeae3d0), glb: "salon2" },
    // low decay spreads the point-light fill for a bright, even daylit gallery
    // (steep default decay=2 leaves broad walls/floor at the dim global ambient)
    light: { color: 0xfff5e6, intensity: 40, every: 5, dist: 26, decay: 1.25 },
    frame: "salon2gilt",
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
  S.asiamodern = {
    // Early-modern ASIAN gallery (concept: Hallway-25-asia-modern) — warm
    // concrete/plaster walls, a warm WOOD-PLANK ceiling with a recessed frosted
    // skylight strip, terrazzo floor with dark inlaid borders, backlit wood-
    // lattice (shoji) wall screens with rice-paper glow, a rice-paper transom,
    // and slim black rails. Reuses modern.glb (rectilinear portal) with a warm
    // re-material; kept a SEPARATE style/decor so the 3 western modern rooms
    // (americas/europe/middle-east) stay their cool white-cube selves.
    ceilH: 4.8,
    wall: surf(T.plaster("#ddd2bd", 156)), wallUV: 6,   // warm concrete/plaster
    // Deeper, warmer POLISHED terrazzo with FINER aggregate (higher floorUV tiles
    // the chips smaller so they stop reading cartoonishly large; darker base so the
    // floor reads as the concept's warm polished terrazzo, not a pale speckle).
    floor: surf(T.terrazzo("#a89c82", 57), "satin"), floorUV: 4.6,
    ceiling: surf(T.woodFloor("#b07d47", 471), "satin"), ceilUV: 2.6,   // warm honey wood planks
    decor: "asiamodern",
    portal: { mat: flat(0xcabb9c), glb: "asiamodern" },
    // Gentle warm BASE fill only — the room's character now comes from the warm
    // directional TRACK-LIGHT pools added in buildAsiaModernDecor (not a flat flood).
    light: { color: 0xffe4bc, intensity: 30, every: 6, dist: 15, y: -0.2 },
    frame: "modern",
  };
  // Warm self-illumination on the wood ceiling so it reads as lit honey planks
  // (as in the concept), never a dark void overhead under the point lights.
  S.asiamodern.ceiling.emissive = new THREE.Color(0x2a1c0e);

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
    wall: surf(T.plaster("#eaeae7", 62, { speckle: 620, alpha: 0.018, blotch: 6, blotchAlpha: 0.03 })), wallUV: 6,
    floor: surf(T.terrazzo("#dcd6c8", 57), "satin"), floorUV: 3,
    ceiling: flat(0xf3f2ee),
    decor: "euromodern",               // ribbon skylight + track + steel/oak rails + benches
    portal: { mat: flat(0xdedbd6), glb: "euromodern" },
    light: { color: 0xfdf8f1, intensity: 54, every: 6, dist: 19, y: -0.25 },
    frame: "modern",
  };
  // Faint self-illumination on the white plaster ceiling so the planes around
  // the skylight read as an evenly-lit surface, never a dark void border.
  S.euromodern.ceiling.emissive = new THREE.Color(0x15151a);

  // ---- Americas ----
  S.meso = {
    // Mesoamerican temple gallery (concept: Hallway-02-americas-mesoamerica)
    // — engaged limestone piers with red greca bands, carved step-fret
    // friezes, stone benches, deep ceiling beams, a stepped ceremonial portal
    // with a deity-mask lintel (Blender, meso.glb).
    ceilH: 5.2,
    wall: surf(F("meso_stone", T.stoneBlocks({ base: "#9b8a6d", mortar: "#5c5140", rows: 4, cols: 2, seed: 58 }))), wallUV: 4,
    floor: surf(F("meso_limestone_floor", T.stoneFloor("#8a7a5f", 59)), "satin"), floorUV: 4,
    // Warm limestone ceiling, lifted off near-black so the overhead reads as lit
    // stone (concept: grazing linear light on a flat stone soffit) not a void.
    ceiling: flat(0x9d8e72),
    band: { mat: surf(F("band_greca", T.grecaBand("#7d5b3f", "#2e2013", 60))), y: 4.2, h: 0.7, uvLen: 5 },
    decor: "meso",                     // piers + benches + beams
    portal: { mat: flat(0x84765c), glb: "meso" },
    // Bright warm wash — the cream limestone textures only read as bright cream
    // when properly lit; the previous 34/every-8 left them muddy brown and the
    // ceiling black. Brighter, tighter, longer-range (concept is evenly golden).
    // decay 1.8 (gentler than physical 2) lifts the floor + mid-hall evenly —
    // the ceiling-height lights sit 4.6 m above the floor, so inverse-square
    // left the paving dark; the softer falloff fills it without near-wall blowout.
    light: { color: 0xffcf9a, intensity: 64, every: 5.0, dist: 20, decay: 1.8 },
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
    // warm baked-brick pavers (terracotta) — the concept's baked-brick floor,
    // not the old cool grey stone; finer tiling reads as brick coursing.
    floor: surf(T.stoneFloor("#98693f", 71), "satin"), floorUV: 5,
    // lit warm timber-brown ceiling (reads brown under the dropped lamps, not
    // a black void — dark timber coffered ceiling in the concept).
    ceiling: flat(0x735e3b),
    // Ishtar-Gate signature: gold flower-rosettes on lapis-blue glazed brick
    // (procedural rosettes — the old glazed_brick.jpg was crude spiky stars).
    band: { mat: surf(T.rosetteBand("#1b4a78", "#cca63e", "#ecdfbd", 72), "polished"), y: 4.16, h: 0.56, uvLen: 2.3 },
    // crenellated Ishtar-gate portal facade + glazed rosette dado + procession
    // reliefs + concealed floor uplights (mesopotamia.glb / buildMesoptDecor).
    decor: "mesopotamia",
    portal: { mat: flatShiny(0x1c4d7c, "polished"), glb: "mesopotamia" },
    // lamps dropped 0.8 m below the ceiling (like greek) + tighter spacing so
    // the hall reads evenly warm without a hot central blob on the ceiling.
    light: { color: 0xffcf96, intensity: 31, every: 5, dist: 16, y: -0.8 },
    frame: "sand",
  };
  S.persia = {
    ceilH: 6.0,
    // Pale desaturated Achaemenid limestone ashlar — the shipped persia_stone.jpg
    // was a saturated cartoon-gold sandstone; the concept is a PALE grey-cream
    // limestone, so use clean procedural ashlar with a warm-cream tint instead.
    wall: surf(T.stoneBlocks({ base: "#c7bda4", mortar: "#a89d84", rows: 4, cols: 2, seed: 73 }), "satin", 0xf3eddc), wallUV: 4,
    // Large pale POLISHED limestone slabs (README: "Large pale limestone slabs...
    // avoid random block masonry"). Drops the muddy dark-brown persia_floor.jpg.
    floor: surf(T.stoneFloor("#c2b99f", 74), "satin", 0xf1ead6), floorUV: 3,
    // Lit lime-plaster soffit with a faint warm emissive so the coffered beam
    // ceiling reads as lit stone, not a black void overhead.
    ceiling: (() => { const m = flat(0x9c8c64); m.emissive.setHex(0x2c2412); return m; })(),
    band: { mat: surf(F("band_archers", T.glazedBand("#27516e", "#d8b44e", 75)), "polished"), y: 4.7, h: 0.8, uvLen: 6 },
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
    ceilH: 5.8,
    wall: surf(F("islamic_plaster", T.plaster("#efe6d2", 76))), wallUV: 5,
    // Pale marble slab floor (forced procedural — the islamic_floor.jpg was a
    // dark taupe "stars at every scale" carpet, the exact anti-pattern the
    // concept README warns against; concept wants cream marble w/ inlaid borders).
    floor: surf(T.marble("#e7ddc8", "rgba(150,132,102,0.18)", 77), "gloss"), floorUV: 3,
    // Warm honey muqarnas ceiling — was near-black slate-blue, the #1 gap. The
    // point-lights sit just below it but don't pool on it, so a warm emissive
    // gives the "discreet integrated lighting" glow the concept muqarnas has.
    ceiling: new THREE.MeshLambertMaterial({ color: 0xcdb488, emissive: 0x6b5227 }),
    band: { mat: surf(F("band_zellige", T.starTile("#1d4e6b", "#e4d9b8", "#3f8ea6", 78)), "polished"), y: 3.9, h: 1.15, uvLen: 2.3 },
    // muqarnas honeycomb cornice, carved arabesque panels over a zellij dado,
    // glowing mashrabiya screens + brass lanterns, inlaid marble floor borders
    // and rosette medallions (concept: Hallway-17). Was never wired — the room
    // had been rendering as a bare shell.
    decor: "islamic",
    portal: { mat: flatShiny(0x2a5b78, "polished"), pointed: true },
    // Lamps dropped to upper-wall height so they graze the carved plaster warmly
    // (the emissive ceiling carries its own glow, so we needn't scorch it).
    light: { color: 0xffe3bc, intensity: 50, every: 5, dist: 20, y: -0.9 },
    frame: "darkwood",
  };
  S.ottoman = {
    ceilH: 5.8,
    wall: surf(F("islamic_plaster", T.plaster("#efe9d8", 79))), wallUV: 5,
    // Pale veined-marble slab paving with a geometric border (concept: marble
    // slabs, NOT a European checker). mughal_marble.jpg is a warm cream marble.
    floor: surf(F("mughal_marble", T.marble("#efe9dc", "rgba(150,130,105,0.16)", 80)), "gloss"), floorUV: 3,
    // Painted-plaster vault: pale warm cream lifted off black by a GENTLE amber
    // emissive (a strong one blows out to mustard); the lamps below graze it warm.
    ceiling: new THREE.MeshLambertMaterial({ color: 0xdcd4bf, emissive: 0x39301c }),
    band: { mat: surf(F("band_iznik", T.starTile("#7c1f2a", "#e8ddc2", "#27516e", 81)), "polished"), y: 3.9, h: 1.0, uvLen: 2 },
    // Iznik-tiled corridor, muqarnas cornice, brass hanging lamps, red runner
    // (reuses islamic.glb parts with an Iznik palette)
    decor: "ottoman",
    portal: { mat: flatShiny(0x7c1f2a, "polished"), glb: "ottoman" },
    // Warm ceremonial lamps, closely spaced (was every:9 → long dark gaps).
    light: { color: 0xffe6c0, intensity: 46, every: 5.5, dist: 18 },
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
    // Fired-brick soffit (concept shows a brick ceiling crossed by timber
    // beams), tinted a touch darker so the point lights read it as warm brick
    // instead of scorching the low 4.6 m ceiling into a white hotspot.
    ceiling: surf(F("indus_brick", T.mudbrick(70)), "matte", 0xbaa284), ceilUV: 3.2,
    decor: "indus",                    // brick piers + niches + plaques + beams
    portal: { mat: flat(0x91714b), glb: "indus" },
    // Warm wash dropped ~1.2 m below the soffit (light.y) so it lights the
    // walls + brick floor evenly rather than blowing out the ceiling; tighter
    // spacing keeps the corridor continuously lit like the concept.
    light: { color: 0xffce93, intensity: 30, every: 5.5, dist: 16, y: -0.65 },
    frame: "sand",
  };
  S.china = {
    // Tang/Song timber hall (concept: Hallway-21-asia-china) — deep red
    // lacquer panels in a warm timber grid, glowing lattice clerestory,
    // POLYCHROME painted dougong + beams + entablature frieze (green/blue/gold
    // hexi caihua), a warmly-lit timber ceiling, floor uplights and hanging
    // lanterns, moon-gate portal (Blender, china.glb).
    ceilH: 5.4,
    // deep red lacquer — a faint warm emissive keeps the oxblood reading as a
    // lit lacquer glow the whole length of the corridor instead of crushing to
    // black between the sparse lanterns
    wall: (() => { const m = surf(F("china_lacquer", T.plaster("#8f2b1e", 84)), "satin"); m.emissive.setHex(0x1c0805); return m; })(), wallUV: 5,
    // dark stone/timber floor — faint warm emissive floors the crushed blacks
    // so the slab catches the lantern light like the concept sheet
    floor: (() => { const m = surf(F("china_floor", T.woodFloor("#4a3220", 85)), "satin"); m.emissive.setHex(0x150d06); return m; })(), floorUV: 4,
    // warm timber ceiling, lifted well off the near-black void it used to be
    // (#2a1a0e read as a dead black hole overhead); the emissive keeps the
    // beamed ceiling legible between the sparse overhead lanterns
    ceiling: (() => { const m = surf(T.woodFloor("#5a3d24", 118), "satin"); m.emissive.setHex(0x241708); return m; })(), ceilUV: 4,
    decor: "china",                    // timber grid + lattice + polychrome beams
    columns: { glb: "china", every: 5.8 },
    portal: { mat: flatShiny(0x7c2418, "polished"), glb: "china" },
    // warm lantern light: brighter + tighter + dropped below the soffit so it
    // washes the red walls and floor evenly instead of leaving them black
    light: { color: 0xffbe80, intensity: 50, every: 5.4, dist: 18, y: -0.5 },
    frame: "red",
  };
  S.khmer = {
    // Khmer/Angkor sandstone gallery (concept: Hallway-22-asia-southeast) —
    // carved bas-relief panels (apsaras/floral) framed by colonnette pilasters,
    // a carved doorway with lintel + pediment relief, a corbelled timber
    // ceiling and grazing uplights (Blender, khmer.glb).
    // WARM golden-sandstone procedural forced (the khmer_sandstone/floor.jpg
    // files render as cool grey blocks — the sheet is warm amber Angkor stone).
    ceilH: 5.2,
    // faint warm emissive floor keeps the sandstone reading as lit amber stone
    // (not near-black brown) between the grazing lights, like the concept sheet
    wall: (() => { const m = surf(T.stoneBlocks({ base: "#bda274", mortar: "#6f5c40", rows: 4, cols: 2, seed: 86 }), "satin"); m.emissive.setHex(0x2c2112); return m; })(), wallUV: 4,
    floor: (() => { const m = surf(T.stoneFloor("#a38d64", 87), "satin"); m.emissive.setHex(0x201a0e); return m; })(), floorUV: 4,
    // warm timber-toned corbel ceiling, lifted well off pure black by emissive
    ceiling: (() => { const m = flat(0x66502f); m.emissive.setHex(0x352a12); return m; })(),
    band: { mat: surf(T.grecaBand("#c7ac78", "#5a4830", 88), "satin"), y: 4.2, h: 0.5, uvLen: 4 },
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
    wall: (() => { const m = surf(F("japan_shoji_paper", T.plaster("#cbb693", 89))); m.emissive.setHex(0x171009); return m; })(), wallUV: 4.6,
    // dark polished timber circulation boards (tatami stays in the alcoves)
    floor: surf(F("japan_floor", T.woodFloor("#5a3d26", 90)), "gloss", 0xa4703e), floorUV: 4,
    // warm dark timber ceiling — faint emissive so exposed beams never read as a black void
    ceiling: (() => { const m = surf(T.woodFloor("#6a4e30", 91), "satin"); m.emissive.setHex(0x1c1409); return m; })(), ceilUV: 4,
    decor: "japan",                    // timber frame + shoji + tokonoma + andon
    portal: { mat: flat(0x3c2c1a), glb: "japan" },
    light: { color: 0xffe9c6, intensity: 44, every: 6, dist: 18 },
    frame: "darkwood",
  };
  S.mughal = {
    // White-marble Mughal hall (concept: Hallway-5-Asia row 5) — blind
    // cusped arcade behind the art, glowing jali screens between, cusped
    // pishtaq portal (Blender, mughal.glb). Band dropped for the pale look.
    ceilH: 5.8,
    // luminous cream marble — faint warm emissive keeps it glowing, never grey
    wall: (() => { const m = surf(F("mughal_marble", T.marble("#f0e7d4", "rgba(150,130,110,0.2)", 92)), "gloss"); m.emissive.setHex(0x201810); return m; })(), wallUV: 4,
    // polished cream marble paving w/ inlaid red-sandstone borders + medallions
    floor: surf(T.mughalFloor(93), "gloss"), floorUV: 4,
    // painted coffered ceiling (gold-bordered panels + floral rosettes) with a
    // lifted emissive so it reads as a luminous painted ceiling, never the
    // near-black void it was before
    ceiling: (() => { const m = surf(T.mughalCeiling(7), "satin"); m.emissive.setHex(0x342710); return m; })(), ceilUV: 4,
    decor: "mughal",                   // arcade + jali screens
    // red sandstone for the arcade pilasters, arch rings, jali & pishtaq frames
    // (the concept frames its white-marble panels in warm Agra red sandstone)
    redstone: (() => { const m = surf(T.redSandstone(24), "satin"); m.emissive.setHex(0x1e0d05); return m; })(),
    portal: { mat: flat(0xc9b8a0), glb: "mughal" },
    light: { color: 0xffe8c4, intensity: 52, every: 6, dist: 18, y: 0.15 },
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
    ceiling: flat(0x6e5236),
    band: { mat: surf(F("kingdoms_band", T.triangleBand("#96653f", "#e0c27d", "#2e1d10", 101))), y: 3.55, h: 0.62, uvLen: 2.5 },
    decor: "kingdoms",
    portal: { mat: flat(0x8d5f3c), glb: "kingdoms" },
    light: { color: 0xffc98f, intensity: 46, every: 6, dist: 20 },
    frame: "darkwood",
  };
  S.earthen = {
    // Timber-and-plaster ritual gallery (concept: Hallway-28-africa-traditions)
    // — carved hardwood posts + portal, woven raffia floor/ceiling, lantern
    // sconces and display niches (traditions.glb)
    ceilH: 4.6,
    // Calm, light amber plaster (procedural earthenWall) — the shipped
    // traditions_wall.jpg was a dark, over-saturated terracotta with baked
    // vignette corners that tiled into muddy blotches; the concept wall is a
    // soft warm sand plaster that lets the dark timber + objects carry the eye.
    wall: surf(T.earthenWall("#c79a63", "#6a4a2e", 102)), wallUV: 3.5,
    floor: surf(F("traditions_floor", T.dirtFloor(103))), floorUV: 3,
    ceiling: surf(F("traditions_floor", T.woodFloor("#4c3a26", 104))), ceilUV: 3,
    band: { mat: surf(F("band_mudcloth", T.triangleBand("#7c4a2a", "#e0c27d", "#2e1d10", 105))), y: 2.75, h: 0.45, uvLen: 4 },
    columns: { type: "wood", every: 5.5, color: 0x2c1c10, glb: "traditions" },
    decor: "traditions",
    portal: { mat: flat(0x744627), glb: "traditions" },
    light: { color: 0xffcf9b, intensity: 34, every: 6, dist: 17 },
    frame: "darkwood",
  };

  // ---- Oceania ----
  S.rockshelter = {
    // Ancient Oceania rock-shelter gallery (concept: Hallway-29-oceania-ancient)
    // — warm stratified sandstone walls with ochre hand stencils + x-ray animal
    // rock-art, wall torches, floor uplights, rock-ledge niches, scattered stones.
    // Walls/ceiling use a bright procedural sandstone (the shipped oceania_*.jpg
    // images were featureless dark blobs — dropped); floor is warm packed earth.
    ceilH: 4.4,
    wall: surf(T.sandstone("#c99a63", 106)), wallUV: 4.2,
    floor: surf(T.packedEarth(107), "satin"), floorUV: 4,
    ceiling: surf(T.sandstone("#bd8d5a", 108)), ceilUV: 4.2,
    band: { mat: surf(T.triangleBand("#a86a3e", "#ecd8b2", "#4d2c18", 118)), y: 3.62, h: 0.42, uvLen: 4 },
    decor: "rockshelter",
    portal: { mat: flat(0xb27a4c) },
    light: { color: 0xffc078, intensity: 52, every: 6, dist: 18 },
    frame: "sand",
  };
  S.oceanic = {
    // Pacific voyagers/living gallery (concept: Hallway-30/31-oceania) — timber
    // and woven: lashed carved timber posts, a canoe-rib ceiling, woven pandanus
    // panels, glowing navigation-star screens, woven lantern sconces (oceanic.glb)
    ceilH: 4.6,
    wall: surf(T.weave("#c19c64", 109)), wallUV: 3.2,
    // woven pandanus mat with a dark diamond lattice (concept floor), NOT wood
    // planks — the README explicitly rules out generic wood boards
    floor: surf(T.pandanusMat("#bd9a60", 110), "satin"), floorUV: 3.2,
    ceiling: surf(T.weave("#bd9a63", 111)), ceilUV: 3.2,
    // painted red/black/white kōwhaiwhai koru band (concept's "painted trim
    // band in natural pigments"); the shipped oceanic_tapa.jpg was a featureless
    // brown wood-grain strip carrying no motif and no red — dropped for this
    band: { mat: surf(T.kowhaiwhai("#8f3320", 112)), y: 3.62, h: 0.56, uvLen: 3 },
    decor: "oceanic",
    portal: { mat: flat(0x6e4f2c), glb: "oceanic" },
    light: { color: 0xffe2ac, intensity: 52, every: 5.5, dist: 18 },
    frame: "darkwood",
  };
  // faint warm self-lift so the canoe-rib vault apex reads as dim glowing
  // timber instead of a near-black void between the sparse ceiling lights
  S.oceanic.ceiling.emissive = new THREE.Color(0x241a0c);

  return S;
}
