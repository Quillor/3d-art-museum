// Builds one era-styled corridor segment in wing-local coordinates.
// The corridor runs along -Z: a segment occupies z in [z0, z0 - length].
import * as THREE from "three";
import { signTexture, stainedGlass, fileTex, rng, toTexture, grecaBand, triangleBand, weave, meanderBand, glazedBand, starTile, puebloTextile, steppedBand, shoji } from "./textures.js";
import { spawnPart } from "./models.js";
import { createFlame } from "./fire.js";

export const HALL_W = 7;          // corridor width
export const SLOT_LEN = 5.5;      // artwork spacing along one wall
export const PAD_START = 3.2;     // dead space after each portal
export const PAD_END = 2.0;
export const END_ZONE_LEN = 4.2;  // landing at the end of a wing, before the light

// Anything that touches the floor is sunk by this much so no face is
// coplanar with a floor plane (kills z-fighting shimmer).
const FLOOR_EPS = 0.012;

const plane = new THREE.PlaneGeometry(1, 1);
const box = new THREE.BoxGeometry(1, 1, 1);
let glassTex = null;

// ---- Blender-authored gothic architecture (tools/build_gothic_assets.py) ----
const GOTHIC_GLB = "assets/models/gothic.glb";
const GOTHIC_BAY = 5.5; // native bay length of the modeled vault
let gothicMats = null;

function gothicMaterials(style) {
  if (!gothicMats) {
    // vault webs are open surfaces seen from below — render both sides
    const web = style.wall.clone();
    web.side = THREE.DoubleSide;
    gothicMats = {
      web,
      trim: new THREE.MeshPhongMaterial({ color: 0x99907f, specular: 0x2a2620, shininess: 16 }),
      gilt: new THREE.MeshPhongMaterial({ color: 0xc9a256, specular: 0x99742e, shininess: 60 }),
    };
  }
  return gothicMats;
}

function applyGothicMats(root, style) {
  const m = gothicMaterials(style);
  root.traverse((o) => {
    if (!o.isMesh) return;
    if (o.name === "Web" || o.name === "Slab") o.material = m.web;
    else if (o.name === "Boss") o.material = m.gilt;
    else o.material = m.trim;
  });
}

// ---- Blender-authored China architecture (tools/build_china_assets.py) ----
const CHINA_GLB = "assets/models/china.glb";
let chinaMats = null;
let latticeTex = null;

function chinaMaterials(style) {
  if (!chinaMats) {
    chinaMats = {
      wall: style.wall, // red lacquer texture, shared with the walls
      red: new THREE.MeshPhongMaterial({ color: 0x8f2b1e, specular: 0x552211, shininess: 55 }),
      dark: new THREE.MeshPhongMaterial({ color: 0x1d130b, specular: 0x171310, shininess: 22, side: THREE.DoubleSide }),
      stone: new THREE.MeshLambertMaterial({ color: 0x8f8a80 }),
    };
  }
  return chinaMats;
}

function applyChinaMats(root, style) {
  const m = chinaMaterials(style);
  root.traverse((o) => {
    if (!o.isMesh) return;
    if (o.name === "Slab") o.material = m.wall;
    else if (o.name.startsWith("Base")) o.material = m.stone;
    else if (o.name === "Shaft") o.material = m.red;
    else o.material = m.dark;
  });
}

// Golden backlit window lattice (concept: dense square grille over a warm
// glow). Tileable; panels clone it and set repeat to keep squares square.
function chinaLattice() {
  if (latticeTex) return latticeTex;
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const g = c.getContext("2d");
  const grad = g.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, "#eccf8e");
  grad.addColorStop(0.5, "#d9a952");
  grad.addColorStop(1, "#c08a3a");
  g.fillStyle = grad;
  g.fillRect(0, 0, 256, 256);
  g.strokeStyle = "#221607";
  g.lineWidth = 9;
  for (let i = 0; i <= 4; i++) {
    const p = i * 64;
    g.beginPath(); g.moveTo(p, 0); g.lineTo(p, 256); g.stroke();
    g.beginPath(); g.moveTo(0, p); g.lineTo(256, p); g.stroke();
  }
  g.lineWidth = 3.5;
  for (let i = 0; i < 8; i++) {
    const p = i * 32 + 16;
    g.beginPath(); g.moveTo(p, 0); g.lineTo(p, 256); g.stroke();
    g.beginPath(); g.moveTo(0, p); g.lineTo(256, p); g.stroke();
  }
  latticeTex = toTexture(c);
  latticeTex.wrapS = latticeTex.wrapT = THREE.RepeatWrapping;
  return latticeTex;
}

function latticePanel(w, h) {
  const tex = chinaLattice().clone();
  tex.needsUpdate = true;
  tex.repeat.set(Math.max(1, Math.round(w / h)), Math.max(1, Math.round(h / w)));
  const p = new THREE.Mesh(plane, new THREE.MeshBasicMaterial({ map: tex }));
  p.scale.set(w, h, 1);
  return p;
}

// Timber grid over the red walls, glowing lattice clerestory between the
// posts, and a beamed ceiling — the Tang/Song gallery treatment.
function buildChinaDecor(parent, style, z0, len, W, H, sideAnchorZ) {
  const m = chinaMaterials(style);
  for (const side of [-1, 1]) {
    const wallX = side * (W / 2 - 0.07);
    // posts aligned with the freestanding columns, plus the segment corners
    const spots = midSpots(sideAnchorZ[String(side)], z0, len, style.columns?.every || 5.8);
    const posts = [z0 - 0.45, ...spots, z0 - len + 0.45].sort((a, b) => b - a);
    for (const z of posts) {
      const p = new THREE.Mesh(box, m.dark);
      p.scale.set(0.09, H, 0.18);
      p.position.set(wallX, H / 2 - FLOOR_EPS, z);
      parent.add(p);
    }
    // rails: clerestory sill + head, and a baseboard
    for (const [y, h] of [[3.45, 0.14], [H - 0.32, 0.14], [0.18, 0.36]]) {
      const r = new THREE.Mesh(box, m.dark);
      r.scale.set(0.07, h, len);
      r.position.set(wallX, y, z0 - len / 2);
      parent.add(r);
    }
    // lattice panels between consecutive posts
    for (let i = 0; i < posts.length - 1; i++) {
      const gap = posts[i] - posts[i + 1];
      if (gap < 1.6) continue;
      const yBot = 3.52, yTop = H - 0.39;
      const panel = latticePanel(gap - 0.55, yTop - yBot);
      panel.position.set(side * (W / 2 - 0.04), (yBot + yTop) / 2, (posts[i] + posts[i + 1]) / 2);
      panel.rotation.y = -side * Math.PI / 2;
      parent.add(panel);
    }
  }
  // beamed ceiling: transverse beams + a longitudinal beam along each wall
  const nb = Math.max(2, Math.round(len / 2.4));
  for (let i = 0; i <= nb; i++) {
    const z = Math.min(z0 - 0.3, Math.max(z0 - len + 0.3, z0 - i * (len / nb)));
    const b = new THREE.Mesh(box, m.dark);
    b.scale.set(W, 0.2, 0.22);
    b.position.set(0, H - 0.1, z);
    parent.add(b);
  }
  for (const side of [-1, 1]) {
    const b = new THREE.Mesh(box, m.dark);
    b.scale.set(0.18, 0.2, len);
    b.position.set(side * (W / 2 - 0.5), H - 0.1, z0 - len / 2);
    parent.add(b);
  }
}

// ---- Blender-authored Mughal architecture (tools/build_mughal_assets.py) ----
const MUGHAL_GLB = "assets/models/mughal.glb";
let mughalMats = null;

function mughalMaterials(style) {
  if (!mughalMats) {
    mughalMats = {
      wall: style.wall, // veined marble texture, shared with the walls
      trim: new THREE.MeshPhongMaterial({ color: 0xe7ddc8, specular: 0x4a453c, shininess: 35 }),
      glow: new THREE.MeshBasicMaterial({ color: 0xffd089, side: THREE.DoubleSide }),
    };
  }
  return mughalMats;
}

function applyMughalMats(root, style) {
  const m = mughalMaterials(style);
  root.traverse((o) => {
    if (!o.isMesh) return;
    if (o.name === "Slab") o.material = m.wall;
    else if (o.name === "Glow") o.material = m.glow; // arch-shaped backlight
    else o.material = m.trim;
  });
}

// Marble arcade: a blind cusped arch behind every artwork, and a glowing
// jali screen between them — the concept's Mughal gallery treatment.
// Jalis go on BOTH walls, only at interior midpoints between that wall's
// artworks, and never within 2.2 m of a segment corner.
function buildMughalDecor(parent, style, z0, len, W, H, sideAnchorZ) {
  for (const side of [-1, 1]) {
    const arts = sideAnchorZ[String(side)];
    for (const z of arts) {
      spawnPart(MUGHAL_GLB, "ArcadeBay", (b) => {
        applyMughalMats(b, style);
        b.position.set(side * (W / 2 - 0.01), 0, z);
        b.rotation.y = -side * Math.PI / 2;
        parent.add(b);
      });
    }
    const spots = [];
    for (let i = 0; i < arts.length - 1; i++) spots.push((arts[i] + arts[i + 1]) / 2);
    for (const z of spots.filter((z) => z <= z0 - 2.2 && z >= z0 - len + 2.2)) {
      spawnPart(MUGHAL_GLB, "Jali", (j) => {
        applyMughalMats(j, style);
        // 0.045 off the wall so the recessed glow plate (0.02 behind the
        // bars) stays in FRONT of the wall plane instead of inside it
        j.position.set(side * (W / 2 - 0.045), 0.85, z);
        j.rotation.y = -side * Math.PI / 2;
        parent.add(j);
      });
    }
  }
}

// ---- Blender-authored Egypt architecture (tools/build_egypt_assets.py) ----
const EGYPT_GLB = "assets/models/egypt.glb";
let egyptMats = null;

function egyptMaterials(style) {
  if (!egyptMats) {
    // painted winged-sun frieze band (concept-art PBR kit albedo)
    const frieze = new THREE.TextureLoader().load("assets/textures/egypt_frieze.jpg");
    frieze.wrapS = frieze.wrapT = THREE.RepeatWrapping;
    frieze.colorSpace = THREE.SRGBColorSpace;
    frieze.anisotropy = 8;
    egyptMats = {
      wall: style.wall, // sandstone blocks, shared with the walls
      band: new THREE.MeshLambertMaterial({ map: frieze }),
      trim: style.wall, // pylon body/cornice — same sandstone as the walls
      capital: new THREE.MeshLambertMaterial({ color: 0x97a07c }),
      metal: new THREE.MeshPhongMaterial({ color: 0x2a2014, specular: 0x6b4c26, shininess: 42 }),
      ember: new THREE.MeshBasicMaterial({ color: 0xffa03a }),
      border: new THREE.MeshLambertMaterial({ color: 0x35291c }),
      // painted deity figures + vertical hieroglyph bands for the pylon
      // (cropped from the concept sheet; regenerate via TEXTURE_PROMPTS)
      deityL: new THREE.MeshLambertMaterial({ map: albedoTex("egypt_deity_l.jpg") }),
      deityR: new THREE.MeshLambertMaterial({ map: albedoTex("egypt_deity_r.jpg") }),
      jamb: new THREE.MeshLambertMaterial({ map: albedoTex("egypt_jamb.jpg") }),
      // carved-hieroglyph sandstone, used only for the top-25% wall strip
      glyph: new THREE.MeshLambertMaterial({ map: albedoTex("egypt_sandstone.jpg") }),
      glow: new THREE.MeshBasicMaterial({
        color: 0xffb968, transparent: true, opacity: 0.32,
        blending: THREE.AdditiveBlending, depthWrite: false,
      }),
    };
  }
  return egyptMats;
}

function applyEgyptMats(root, style) {
  const m = egyptMaterials(style);
  root.traverse((o) => {
    if (!o.isMesh) return;
    if (o.name.startsWith("Slab")) o.material = m.wall;
    else if (o.name.startsWith("Band")) o.material = m.band;
    else if (o.name.startsWith("Capital")) o.material = m.capital;
    else if (o.name.startsWith("Metal")) o.material = m.metal;
    else if (o.name.startsWith("Ember")) o.material = m.ember;
    else if (o.name.startsWith("DeityL")) o.material = m.deityL;
    else if (o.name.startsWith("DeityR")) o.material = m.deityR;
    else if (o.name.startsWith("Jamb")) o.material = m.jamb;
    else o.material = m.trim;
  });
}

// Hypostyle treatment: painted beams overhead on a steady rhythm, and dark
// painted border strips flanking the processional path (concept: Hallway-26).
function buildEgyptDecor(parent, style, z0, len, W, H, sideAnchorZ, out) {
  const m = egyptMaterials(style);
  const n = Math.max(1, Math.round((len - PAD_START) / 5.5));
  for (let i = 0; i < n; i++) {
    const z = z0 - PAD_START - (i + 0.5) * ((len - PAD_START - 1.2) / n);
    spawnPart(EGYPT_GLB, "Beam", (b) => {
      applyEgyptMats(b, style);
      b.position.set(0, 0, z);
      parent.add(b);
    });
  }
  for (const side of [-1, 1]) {
    const strip = new THREE.Mesh(box, m.border);
    strip.scale.set(0.16, 0.05, len - 0.4);
    strip.position.set(side * 2.05, 0.013, z0 - len / 2);
    parent.add(strip);
  }
  // hieroglyphs only in the top ~25% of the wall (plain sandstone below).
  // Sits just proud of the plain wall (3.49) but behind the winged-sun frieze
  // band (3.48), so no surfaces are coplanar.
  const gH = H * 0.26, gy = H - gH / 2;
  const glyphGeo = scaledUVPlane(len, gH, len / 3.0, gH / 3.0);
  for (const side of [-1, 1]) {
    const g = new THREE.Mesh(glyphGeo, m.glyph);
    g.position.set(side * (W / 2 - 0.01), gy, z0 - len / 2);
    g.rotation.y = -side * Math.PI / 2;
    parent.add(g);
  }
  // ceremonial braziers flanking both doorways, just inside the hall —
  // in the pinch of the portal funnels, so no extra colliders are needed.
  // Each carries the same animated, flickering flame as the prehistoric
  // campfire (fire.js), scaled down to sit in the bronze coal bowl (~y 1.26).
  const braziers = [[z0 - 1.6, -1], [z0 - 1.6, 1],
                    [z0 - len + 1.4, -1], [z0 - len + 1.4, 1]];
  braziers.forEach(([zb, side], i) => {
    spawnPart(EGYPT_GLB, "Brazier", (b) => {
      applyEgyptMats(b, style);
      b.position.set(side * 2.6, 0, zb);
      parent.add(b);
    });
    // flame is independent of the (async-loaded) brazier mesh, so build it
    // synchronously — otherwise out.fires/out.lights miss it
    const flame = createFlame({ scale: 0.72, intensity: 13, dist: 7.5, seed: i + 1 });
    flame.group.position.set(side * 2.6, 1.2, zb);
    flame.light.visible = false; // culled with the other segment lights
    parent.add(flame.group);
    out.fires.push(flame); // world.fires entries are objects with .update(t)
    out.lights.push(flame.light);
  });
}

// ---- Blender-authored Mesoamerica architecture (build_meso_assets.py) ----
const MESO_GLB = "assets/models/meso.glb";
let mesoMats = null;
let mesoFretTex = null;

function mesoGreca() {
  if (!mesoFretTex) {
    mesoFretTex = fileTex("meso_greca_carved", grecaBand("#8a5a34", "#2a1a10", 260));
    mesoFretTex.wrapS = mesoFretTex.wrapT = THREE.RepeatWrapping;
  }
  return mesoFretTex;
}

function mesoMaterials(style) {
  if (!mesoMats) {
    // greca (step-fret) canvas texture, tinted red-ochre — the signature
    // Mitla-style fretwork, used on pier strips, jambs and lintel band
    const fret = mesoGreca();
    mesoMats = {
      lime: style.wall,   // limestone ashlar, shared with the walls
      red: new THREE.MeshPhongMaterial({ color: 0x86392a, specular: 0x2a1109, shininess: 10 }),
      dark: new THREE.MeshLambertMaterial({ color: 0x4a3a28 }),
      mask: new THREE.MeshLambertMaterial({ map: fileTex("meso_deity_mask.png", grecaBand("#4a3a28", "#2a1a10", 360)) }),
      fret: new THREE.MeshLambertMaterial({ map: fret }),
      glow: new THREE.MeshBasicMaterial({
        color: 0xffb968, transparent: true, opacity: 0.34,
        blending: THREE.AdditiveBlending, depthWrite: false,
      }),
    };
  }
  return mesoMats;
}

function applyMesoMats(root, style) {
  const m = mesoMaterials(style);
  root.traverse((o) => {
    if (!o.isMesh) return;
    if (o.name.startsWith("Fret")) {
      // clone so each strip can tile its own greca count without cross-talk
      const mat = m.fret.clone();
      mat.map = m.fret.map.clone();
      mat.map.needsUpdate = true;
      mat.map.wrapS = mat.map.wrapT = THREE.RepeatWrapping;
      o.material = mat;
    } else if (o.name.startsWith("Dark_mask")) o.material = m.mask;
    else if (o.name.startsWith("Red")) o.material = m.red;
    else if (o.name.startsWith("Dark")) o.material = m.dark;
    else if (o.name.startsWith("Glow")) o.material = m.glow;
    else o.material = m.lime;
  });
}

// Temple gallery treatment: engaged limestone piers (with a red greca strip)
// dividing the bays, low stone benches beneath the reliefs, and deep stone
// beams overhead — the processional rhythm of the concept (Hallway-02).
function buildMesoDecor(parent, style, z0, len, W, H, sideAnchorZ) {
  for (const side of [-1, 1]) {
    // engaged piers at the bay divisions between artworks
    for (const z of midSpots(sideAnchorZ[String(side)], z0, len, 4.6)) {
      spawnPart(MESO_GLB, "Pier", (p) => {
        applyMesoMats(p, style);
        p.position.set(side * (W / 2 - 0.02), 0, z);
        p.rotation.y = -side * Math.PI / 2;
        parent.add(p);
      });
    }
    // a low stone bench beneath each artwork
    for (const z of sideAnchorZ[String(side)]) {
      spawnPart(MESO_GLB, "Bench", (b) => {
        applyMesoMats(b, style);
        b.position.set(side * (W / 2 - 0.02), 0, z);
        b.rotation.y = -side * Math.PI / 2;
        parent.add(b);
      });
    }
  }
  // deep transverse stone ceiling beams on a steady rhythm
  const nb = Math.max(2, Math.round(len / 2.7));
  for (let i = 0; i <= nb; i++) {
    const z = Math.min(z0 - 0.4, Math.max(z0 - len + 0.4, z0 - i * (len / nb)));
    spawnPart(MESO_GLB, "Beam", (b) => {
      applyMesoMats(b, style);
      b.position.set(0, 0, z);
      parent.add(b);
    });
  }
}

// ---- Blender-authored Andes/Inca architecture (build_inca_assets.py) ----
const INCA_GLB = "assets/models/inca.glb";
let incaMats = null;

// Soft warm radial pool for the concealed-uplight floor wash (concept:
// Hallway-03 — round pools of warm light at the wall base on cool grey stone).
let incaPoolTex = null;
function incaPool() {
  if (incaPoolTex) return incaPoolTex;
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const ctx = c.getContext("2d");
  const g = ctx.createRadialGradient(64, 64, 3, 64, 64, 64);
  g.addColorStop(0, "rgba(255,206,140,0.95)");
  g.addColorStop(0.4, "rgba(255,181,108,0.55)");
  g.addColorStop(1, "rgba(255,150,80,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  incaPoolTex = toTexture(c);
  return incaPoolTex;
}

function incaMaterials(style) {
  if (!incaMats) {
    // Vivid woven-textile accent (concept: red/ochre/tan Andean geometric weave
    // hung in each niche). Lit AND self-illuminated via emissiveMap so the
    // colour reads bright inside the dark recess instead of going muddy.
    const textileTex = fileTex("inca_textile", weave("#9a4f32", 361));
    incaMats = {
      stone: style.wall,   // andesite ashlar, shared with the walls
      dark: new THREE.MeshLambertMaterial({ color: 0x2a2420 }),
      terra: new THREE.MeshLambertMaterial({ color: 0xb06a38 }),
      textile: new THREE.MeshLambertMaterial({
        map: textileTex, emissive: 0xffffff, emissiveMap: textileTex, emissiveIntensity: 0.85,
      }),
      glow: new THREE.MeshBasicMaterial({ color: 0xffcb84 }),
    };
  }
  return incaMats;
}

function applyIncaMats(root, style) {
  const m = incaMaterials(style);
  root.traverse((o) => {
    if (!o.isMesh) return;
    if (o.name.startsWith("Dark")) o.material = m.dark;
    else if (o.name.startsWith("Terra")) o.material = m.terra;
    else if (o.name.startsWith("Textile")) o.material = m.textile;
    else if (o.name.startsWith("Glow")) o.material = m.glow;
    else o.material = m.stone;
  });
}

// Ashlar gallery treatment: trapezoidal niches (ceramics + textiles) at the
// wall midpoints between artworks, each with a concealed warm uplight and a
// pool of light on the floor in front (concept: Hallway-03).
function buildIncaDecor(parent, style, z0, len, W, H, sideAnchorZ, out) {
  const m = incaMaterials(style);
  const poolMat = new THREE.MeshBasicMaterial({
    map: incaPool(), transparent: true, depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const addPool = (x, z, sx, sz) => {
    const disc = new THREE.Mesh(plane, poolMat);
    disc.rotation.x = -Math.PI / 2;
    disc.scale.set(sx, sz, 1);
    disc.position.set(x, 0.02, z);
    parent.add(disc);
  };
  for (const side of [-1, 1]) {
    for (const z of interiorMidZ(sideAnchorZ[String(side)], z0, len)) {
      spawnPart(INCA_GLB, "Niche", (n) => {
        applyIncaMats(n, style);
        // A big vivid woven textile hung across the niche mouth (concept: each
        // niche is dominated by a bright Andean weave with a ceramic in front).
        // The Blender runner is small + deeply recessed, so we mount a larger
        // self-lit panel just inside the opening where it reads from any angle.
        const cloth = new THREE.Mesh(plane, m.textile);
        cloth.position.set(0, 1.35, 0.04);   // upright at the niche mouth, facing +Z (corridor)
        cloth.scale.set(0.74, 1.25, 1);
        n.add(cloth);
        n.position.set(side * (W / 2 - 0.01), 0, z);
        n.rotation.y = -side * Math.PI / 2;
        parent.add(n);
      });
      // concealed LED uplight washing warm up the cool ashlar + a bright pool
      // on the floor beneath the niche (the concept's signature uplighting)
      const up = new THREE.PointLight(0xffc078, 26, 6.5, 2);
      up.position.set(side * (W / 2 - 0.5), 0.3, z);
      up.visible = false;
      parent.add(up);
      out.lights.push(up);
      addPool(side * (W / 2 - 0.85), z, 2.2, 2.7);
    }
    // Corridor-long rhythm of concealed-uplight floor pools between the niches
    // (concept left panel: a continuous run of warm pools down both wall bases).
    const step = 2.5, x = side * (W / 2 - 0.8);
    for (let z = z0 - step * 0.75; z > z0 - len + 0.6; z -= step) {
      addPool(x, z, 1.7, 2.1);
    }
  }
  // Recessed ceiling downlights (concept: little warm LED dots in the lime
  // plaster) — emissive fixture discs down the centreline, also lifting the
  // ceiling read off pure black.
  const dl = new THREE.MeshBasicMaterial({ color: 0xffe0ad });
  const cn = Math.max(1, Math.round(len / 2.6));
  for (let i = 0; i < cn; i++) {
    const z = z0 - (i + 0.5) * (len / cn);
    const d = new THREE.Mesh(plane, dl);
    d.rotation.x = Math.PI / 2;
    d.scale.set(0.34, 0.34, 1);
    d.position.set(0, H - 0.03, z);
    parent.add(d);
  }
}

// ---- Blender-authored Pueblo/adobe architecture (build_adobe_assets.py) ----
const ADOBE_GLB = "assets/models/adobe.glb";
let adobeMats = null;
let adobeBasketTex = null;

function adobeMaterials(style) {
  if (!adobeMats) {
    const paint = fileTex("adobe_painted_frieze", triangleBand("#7c3a22", "#e0c27d", "#2e1d10", 264));
    paint.wrapS = paint.wrapT = THREE.RepeatWrapping;
    adobeMats = {
      adobe: style.wall,   // earthen plaster, shared with the walls
      wood: new THREE.MeshLambertMaterial({ color: 0x4a3320 }),
      terra: new THREE.MeshLambertMaterial({ color: 0x9c5a30 }),
      paint: new THREE.MeshLambertMaterial({ map: paint }),
      glow: new THREE.MeshBasicMaterial({ color: 0xffcb84 }),
    };
  }
  return adobeMats;
}

function applyAdobeMats(root, style) {
  const m = adobeMaterials(style);
  root.traverse((o) => {
    if (!o.isMesh) return;
    if (o.name.startsWith("Wood")) o.material = m.wood;
    else if (o.name.startsWith("Terra")) o.material = m.terra;
    else if (o.name.startsWith("Paint")) o.material = m.paint;
    else if (o.name.startsWith("Glow")) o.material = m.glow;
    else o.material = m.adobe;
  });
}

// Woven textile hanging — a large geometric Pueblo/Navajo blanket mounted
// flat on the adobe wall (concept: Hallway-04 side panels).
let adobeTextileTex = null;
function adobeTextile() {
  if (!adobeTextileTex) adobeTextileTex = puebloTextile(265);
  const grp = new THREE.Group();
  const cloth = new THREE.Mesh(scaledUVPlane(1.35, 2.05, 1, 1),
    new THREE.MeshLambertMaterial({ map: adobeTextileTex }));
  grp.add(cloth);
  // slim peeled-pole hanging rod above the blanket
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 1.55, 8),
    new THREE.MeshLambertMaterial({ color: 0x4a3320 }));
  rod.rotation.z = Math.PI / 2;
  rod.position.set(0, 1.12, 0.02);
  grp.add(rod);
  return grp;
}

function adobeBasket() {
  if (!adobeBasketTex) adobeBasketTex = fileTex("adobe_basket.png", weave("#b08a56", 366));
  return new THREE.Mesh(new THREE.PlaneGeometry(0.72, 0.72),
    new THREE.MeshLambertMaterial({ map: adobeBasketTex, transparent: true, alphaTest: 0.08 }));
}

// Adobe gallery treatment: a viga-and-latilla timber ceiling, arched adobe
// niches with ceramics + uplights, woven textile hangings, and a painted
// terraced frieze along the wall top (concept: Hallway-04).
function buildAdobeDecor(parent, style, z0, len, W, H, sideAnchorZ, out) {
  // painted terraced frieze band running the wall top on both sides
  const friezeTex = steppedBand("#c79a63", 266);
  friezeTex.wrapS = friezeTex.wrapT = THREE.RepeatWrapping;
  for (const side of [-1, 1]) {
    const fr = new THREE.Mesh(scaledUVPlane(len, 0.5, len / 2.6, 1),
      new THREE.MeshLambertMaterial({ map: friezeTex }));
    fr.position.set(side * (W / 2 - 0.02), H - 0.62, z0 - len / 2);
    fr.rotation.y = -side * Math.PI / 2;
    parent.add(fr);

    const arts = sideAnchorZ[String(side)];
    const clear = (z, m = 1.35) => !arts.some((a) => Math.abs(a - z) < m);
    // arched niches with ceramics + uplights on the artwork-gap rhythm
    const placed = [];
    midSpots(arts, z0, len, 3.2).forEach((z) => {
      if (!clear(z)) return;
      placed.push(z);
      spawnPart(ADOBE_GLB, "Niche", (n) => {
        applyAdobeMats(n, style);
        n.position.set(side * (W / 2 - 0.01), 0, z);
        n.rotation.y = -side * Math.PI / 2;
        parent.add(n);
      });
      const up = new THREE.PointLight(0xffcb84, 5.5, 5.5, 2);
      up.position.set(side * (W / 2 - 0.5), 0.7, z);
      up.visible = false;
      parent.add(up);
      out.lights.push(up);
    });
    // woven textile hangings at fixed fractions, skipping art anchors and any
    // niche just placed — guarantees the long walls read as a Pueblo passage
    for (const f of [0.24, 0.5, 0.76]) {
      const z = z0 - f * len;
      if (!clear(z, 1.5)) continue;
      if (placed.some((p) => Math.abs(p - z) < 1.6)) continue;
      const tx = adobeTextile();
      tx.position.set(side * (W / 2 - 0.04), 1.95, z);
      tx.rotation.y = -side * Math.PI / 2;
      parent.add(tx);
      const basket = adobeBasket();
      basket.position.set(side * (W / 2 - 0.045), 3.25, z + 0.82);
      basket.rotation.y = -side * Math.PI / 2;
      parent.add(basket);
    }
  }
  // viga-and-latilla ceiling: fat round logs cross the hall on a tight rhythm,
  // a tileable deck of slim saplings laid over them just under the plaster.
  const nv = Math.max(3, Math.round(len / 1.35));
  for (let i = 0; i <= nv; i++) {
    const z = Math.min(z0 - 0.3, Math.max(z0 - len + 0.3, z0 - i * (len / nv)));
    spawnPart(ADOBE_GLB, "Viga", (v) => {
      applyAdobeMats(v, style);
      v.position.set(0, 0, z);
      parent.add(v);
    });
  }
  const LAT = 2.0;
  const nl = Math.max(1, Math.round(len / LAT));
  for (let i = 0; i < nl; i++) {
    const z = z0 - 0.15 - (i + 0.5) * (len / nl);
    spawnPart(ADOBE_GLB, "Latilla", (l) => {
      applyAdobeMats(l, style);
      l.position.set(0, 0, z);
      l.scale.z = (len / nl) / LAT;   // stretch deck to tile the hall exactly
      parent.add(l);
    });
  }
}

// ---- Blender-authored early-Modern gallery (build_modern_assets.py) ----
const MODERN_GLB = "assets/models/modern.glb";
let modernMats = null;

function modernMaterials(style) {
  if (!modernMats) {
    modernMats = {
      wall: style.wall,   // painted plaster, shared with the walls
      dark: new THREE.MeshPhongMaterial({ color: 0x14140f, specular: 0x333333, shininess: 60 }),
      steel: new THREE.MeshPhongMaterial({ color: 0x24242a, specular: 0x55555e, shininess: 80 }),  // blackened-steel skylight muntins
      border: new THREE.MeshPhongMaterial({ color: 0x2e2922, specular: 0x1a1712, shininess: 20 }), // dark terrazzo inlay band
      bronze: new THREE.MeshPhongMaterial({ color: 0x8a6a2e, specular: 0xd9b866, shininess: 90 }),
      deco: new THREE.MeshPhongMaterial({ color: 0xcaa348, specular: 0xfff1c4, shininess: 120 }),
      glass: new THREE.MeshBasicMaterial({ map: fileTex("modern_laylight", weave("#f3efe4", 456)) }),  // lit tube / laylight
    };
  }
  return modernMats;
}

function applyModernMats(root, style) {
  const m = modernMaterials(style);
  root.traverse((o) => {
    if (!o.isMesh) return;
    if (o.name.startsWith("Dark")) o.material = m.dark;
    else if (o.name.startsWith("Bronze")) o.material = m.bronze;
    else if (o.name.startsWith("Deco")) o.material = m.deco;
    else if (o.name.startsWith("Glass")) o.material = m.glass;
    else o.material = m.wall;
  });
}

// Modern gallery treatment: a glowing central laylight (skylight) with a mullion
// grid + soft fill, dark track-lighting rails, a picture rail on the walls,
// low bronze deco railings, and a dark terrazzo inlay border on the floor.
function buildModernDecor(parent, style, z0, len, W, H, sideAnchorZ, out) {
  const m = modernMaterials(style);
  const zc = z0 - len / 2;
  // central laylight panel (frosted glow) just under the ceiling
  const lay = new THREE.Mesh(scaledUVPlane(2.0, len - 0.6, 1, 1), m.glass);
  lay.rotation.x = Math.PI / 2;
  lay.position.set(0, H - 0.05, zc);
  parent.add(lay);
  // fine blackened-steel muntin grid across the laylight (many small panes,
  // as in the concept skylight) — thinner transverse bars every ~0.7 m and
  // five slender longitudinal rails
  const nm = Math.max(2, Math.round(len / 0.7));
  for (let i = 0; i <= nm; i++) {
    const bar = new THREE.Mesh(box, m.steel);
    bar.scale.set(2.06, 0.05, 0.028);
    bar.position.set(0, H - 0.045, z0 - i * (len / nm));
    parent.add(bar);
  }
  for (const x of [-1.0, -0.5, 0, 0.5, 1.0]) {
    const rl = new THREE.Mesh(box, m.steel);
    rl.scale.set(0.032, 0.05, len - 0.6);
    rl.position.set(x, H - 0.045, zc);
    parent.add(rl);
  }
  // dark steel kerb framing the laylight opening
  for (const x of [-1.03, 1.03]) {
    const kerb = new THREE.Mesh(box, m.steel);
    kerb.scale.set(0.06, 0.11, len - 0.5);
    kerb.position.set(x, H - 0.06, zc);
    parent.add(kerb);
  }
  // soft daylight from the laylight
  const day = new THREE.PointLight(0xfff4e2, 22, 20, 2);
  day.position.set(0, H - 0.8, zc);
  day.visible = false;
  parent.add(day);
  out.lights.push(day);
  // track-lighting rails with small spot fixtures
  for (const x of [-1.7, 1.7]) {
    const rail = new THREE.Mesh(box, m.dark);
    rail.scale.set(0.07, 0.07, len - 0.6);
    rail.position.set(x, H - 0.18, zc);
    parent.add(rail);
    const ns = Math.max(2, Math.round(len / 2.4));
    for (let i = 0; i < ns; i++) {
      const z = z0 - (i + 0.5) * (len / ns);
      const spot = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 0.18, 8), m.dark);
      spot.position.set(x, H - 0.32, z);
      parent.add(spot);
    }
  }
  for (const side of [-1, 1]) {
    // picture rail molding
    const pr = new THREE.Mesh(box, m.dark);
    pr.scale.set(0.06, 0.05, len);
    pr.position.set(side * (W / 2 - 0.03), 2.95, zc);
    parent.add(pr);
    // dark terrazzo inlay border band on the floor (charcoal, not void-black)
    const strip = new THREE.Mesh(box, m.border);
    strip.scale.set(0.22, 0.03, len - 0.4);
    strip.position.set(side * 2.55, 0.014, zc);
    parent.add(strip);
    // thin bronze pin-line just inboard of the border (deco terrazzo detail)
    const pin = new THREE.Mesh(box, m.bronze);
    pin.scale.set(0.03, 0.028, len - 0.4);
    pin.position.set(side * 2.4, 0.015, zc);
    parent.add(pin);
    // low bronze deco railings along the wall
    for (const z of midSpots(sideAnchorZ[String(side)], z0, len, 3.2)) {
      spawnPart(MODERN_GLB, "Rail", (r) => {
        applyModernMats(r, style);
        // tight to the wall so a wall-hugging visitor never clips the rail
        r.position.set(side * (W / 2 - 0.2), 0, z);
        r.rotation.y = -side * Math.PI / 2;
        parent.add(r);
      });
    }
  }
}

// ---- Asia Modern gallery (concept: Hallway-25-asia-modern) ----
// Reuses modern.glb (rectilinear portal) but with a WARM material language:
// warm wood-plank ceiling, backlit wood-lattice (shoji) wall screens, a frosted
// skylight strip, terrazzo inlaid borders, a rice-paper transom, and slim black
// rails. Isolated from applyModernMats/modernMaterials so the three western
// modern rooms keep their cool white-cube palette.
let asiaModernMats = null;
function asiaModernMaterials(style) {
  if (!asiaModernMats) {
    asiaModernMats = {
      wall: style.wall,   // warm plaster, shared with the walls
      wood: new THREE.MeshPhongMaterial({ color: 0x936637, specular: 0x3a2c1c, shininess: 24 }),   // honey lattice/beams/frames
      darkwood: new THREE.MeshPhongMaterial({ color: 0x2c1d10, specular: 0x191009, shininess: 16 }),
      steel: new THREE.MeshPhongMaterial({ color: 0x1b1712, specular: 0x37342a, shininess: 70 }),   // slim black rails/track/muntins
      border: new THREE.MeshPhongMaterial({ color: 0x2e2922, specular: 0x1a1712, shininess: 20 }),  // dark terrazzo inlay
      paper: new THREE.MeshBasicMaterial({ color: 0xdcc49a, map: shoji(158) }),   // warm backlit rice-paper lattice (tint knocks the glow amber, avoids a white lightbox)
      glass: new THREE.MeshBasicMaterial({ map: fileTex("modern_laylight", weave("#f6ecd6", 456)) }),   // warm frosted skylight
    };
  }
  return asiaModernMats;
}

function applyAsiaModernMats(root, style) {
  const m = asiaModernMaterials(style);
  root.traverse((o) => {
    if (!o.isMesh) return;
    if (o.name.startsWith("Dark")) o.material = m.steel;
    else if (o.name.startsWith("Bronze")) o.material = m.steel;    // slim black rails, not bronze
    else if (o.name.startsWith("Deco")) o.material = m.darkwood;    // plain dark portal frame, not deco gold
    else if (o.name.startsWith("Glass")) o.material = m.glass;
    else o.material = m.wall;
  });
}

function buildAsiaModernDecor(parent, style, z0, len, W, H, sideAnchorZ, out) {
  const m = asiaModernMaterials(style);
  const zc = z0 - len / 2;

  // --- warm wood-plank ceiling: transverse beams flanking the central skylight ---
  const nb = Math.max(2, Math.round(len / 2.2));
  for (let i = 0; i <= nb; i++) {
    const z = Math.min(z0 - 0.2, Math.max(z0 - len + 0.2, z0 - i * (len / nb)));
    for (const [cx, w] of [[-2.35, 2.3], [2.35, 2.3]]) {
      const beam = new THREE.Mesh(box, m.wood);
      beam.scale.set(w, 0.14, 0.16);
      beam.position.set(cx, H - 0.08, z);
      parent.add(beam);
    }
  }

  // --- central recessed frosted skylight strip (warm glow, wood kerb) ---
  const lay = new THREE.Mesh(scaledUVPlane(1.9, len - 0.8, 1, 1), m.glass);
  lay.rotation.x = Math.PI / 2;
  lay.position.set(0, H - 0.06, zc);
  parent.add(lay);
  const nm = Math.max(2, Math.round(len / 0.8));
  for (let i = 0; i <= nm; i++) {
    const bar = new THREE.Mesh(box, m.steel);
    bar.scale.set(1.96, 0.05, 0.026);
    bar.position.set(0, H - 0.05, z0 - i * (len / nm));
    parent.add(bar);
  }
  for (const x of [-0.63, 0, 0.63]) {
    const rl = new THREE.Mesh(box, m.steel);
    rl.scale.set(0.03, 0.05, len - 0.8);
    rl.position.set(x, H - 0.05, zc);
    parent.add(rl);
  }
  for (const x of [-0.98, 0.98]) {
    const kerb = new THREE.Mesh(box, m.wood);   // warm wood kerb framing the skylight
    kerb.scale.set(0.09, 0.16, len - 0.7);
    kerb.position.set(x, H - 0.09, zc);
    parent.add(kerb);
  }
  const day = new THREE.PointLight(0xfff0d8, 20, 20, 2);
  day.position.set(0, H - 0.8, zc);
  day.visible = false;
  parent.add(day); out.lights.push(day);

  // --- track lighting rails + spot fixtures ---
  for (const x of [-1.75, 1.75]) {
    const rail = new THREE.Mesh(box, m.steel);
    rail.scale.set(0.06, 0.06, len - 0.6);
    rail.position.set(x, H - 0.2, zc);
    parent.add(rail);
    const ns = Math.max(2, Math.round(len / 2.4));
    for (let i = 0; i < ns; i++) {
      const z = z0 - (i + 0.5) * (len / ns);
      const spot = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 0.18, 8), m.steel);
      spot.position.set(x, H - 0.34, z);
      parent.add(spot);
    }
  }

  // --- per-wall: backlit wood-lattice (shoji) screen band + concrete base ---
  const yBot = 0.52, yTop = 2.9;
  for (const side of [-1, 1]) {
    const arts = sideAnchorZ[String(side)];
    // continuous backlit rice-paper band (just off the wall, behind the art)
    const paper = new THREE.Mesh(
      scaledUVPlane(len - 0.3, yTop - yBot, (len - 0.3) / 1.2, 1), m.paper);
    paper.position.set(side * (W / 2 - 0.03), (yBot + yTop) / 2, zc);
    paper.rotation.y = -side * Math.PI / 2;
    parent.add(paper);
    // honey-wood lattice frame over it: top/bottom/mid rails + vertical mullions
    for (const [y, h] of [[yBot, 0.1], [yTop, 0.1], [1.72, 0.07]]) {
      const rail = new THREE.Mesh(box, m.wood);
      rail.scale.set(0.06, h, len - 0.2);
      rail.position.set(side * (W / 2 - 0.08), y, zc);
      parent.add(rail);
    }
    const nmul = Math.max(3, Math.round(len / 0.85));
    for (let i = 0; i <= nmul; i++) {
      const mul = new THREE.Mesh(box, m.wood);
      mul.scale.set(0.05, yTop - yBot, 0.05);
      mul.position.set(side * (W / 2 - 0.08), (yBot + yTop) / 2, z0 - i * (len / nmul));
      parent.add(mul);
    }
    // concrete baseboard + honey picture rail
    const base = new THREE.Mesh(box, m.steel);
    base.scale.set(0.08, 0.5, len);
    base.position.set(side * (W / 2 - 0.02), 0.25, zc);
    parent.add(base);
    const prail = new THREE.Mesh(box, m.wood);
    prail.scale.set(0.09, 0.12, len);
    prail.position.set(side * (W / 2 - 0.04), 2.98, zc);
    parent.add(prail);
    // warm glow behind the screens so the paper reads as backlit and spills
    for (const z of midSpots(arts, z0, len, 3.0)) {
      const gl = new THREE.PointLight(0xffdca0, 5, 5, 2);
      gl.position.set(side * (W / 2 - 0.5), 1.5, z);
      gl.visible = false; parent.add(gl); out.lights.push(gl);
    }
    // dark terrazzo inlay border + slim pin-line on the floor
    const strip = new THREE.Mesh(box, m.border);
    strip.scale.set(0.22, 0.03, len - 0.4);
    strip.position.set(side * 2.55, 0.014, zc);
    parent.add(strip);
    const pin = new THREE.Mesh(box, m.steel);
    pin.scale.set(0.03, 0.028, len - 0.4);
    pin.position.set(side * 2.4, 0.015, zc);
    parent.add(pin);
    // slim black rails (modern.glb Rail, re-materialled black)
    for (const z of midSpots(arts, z0, len, 3.2)) {
      spawnPart(MODERN_GLB, "Rail", (r) => {
        applyAsiaModernMats(r, style);
        r.position.set(side * (W / 2 - 0.2), 0, z);
        r.rotation.y = -side * Math.PI / 2;
        parent.add(r);
      });
    }
  }

  // --- rice-paper transom over the entrance door (concept portal signature) ---
  const tW = 3.2, tY0 = 3.56, tY1 = 4.3;
  const trans = new THREE.Mesh(scaledUVPlane(tW, tY1 - tY0, tW / 1.2, 1), m.paper);
  trans.position.set(0, (tY0 + tY1) / 2, z0 - 0.05);
  parent.add(trans);
  const ntm = 7;
  for (let i = 0; i <= ntm; i++) {
    const mul = new THREE.Mesh(box, m.wood);
    mul.scale.set(0.045, tY1 - tY0, 0.05);
    mul.position.set(-tW / 2 + i * (tW / ntm), (tY0 + tY1) / 2, z0 - 0.04);
    parent.add(mul);
  }
  for (const y of [tY0 - 0.03, tY1 + 0.03]) {
    const fr = new THREE.Mesh(box, m.wood);
    fr.scale.set(tW + 0.24, 0.1, 0.08);
    fr.position.set(0, y, z0 - 0.03);
    parent.add(fr);
  }
}

// ---- Blender-authored Indus Valley architecture (build_indus_assets.py) ----
const INDUS_GLB = "assets/models/indus.glb";
let indusMats = null;
let indusPlaqueTex = null;

// A stylised Indus-seal terracotta plaque motif (concentric frames + diamond),
// drawn on canvas so no image asset is needed.
function indusPlaque() {
  if (indusPlaqueTex) return indusPlaqueTex;
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const g = c.getContext("2d");
  g.fillStyle = "#9c5c33"; g.fillRect(0, 0, 256, 256);
  g.strokeStyle = "#3a2213"; g.lineWidth = 10;
  for (const inset of [24, 54]) g.strokeRect(inset, inset, 256 - 2 * inset, 256 - 2 * inset);
  g.save(); g.translate(128, 128); g.rotate(Math.PI / 4);
  g.strokeRect(-46, -46, 92, 92);
  g.restore();
  g.fillStyle = "#3a2213";
  g.beginPath(); g.arc(128, 128, 20, 0, Math.PI * 2); g.fill();
  indusPlaqueTex = fileTex("indus_seal.png", toTexture(c));
  return indusPlaqueTex;
}

function indusMaterials(style) {
  if (!indusMats) {
    indusMats = {
      brick: style.wall,   // fired brick, shared with the walls
      wood: new THREE.MeshLambertMaterial({ color: 0x3f2a17 }),
      terra: new THREE.MeshLambertMaterial({ color: 0x9c5a30 }),
      plaque: new THREE.MeshLambertMaterial({ map: indusPlaque() }),
      glow: new THREE.MeshBasicMaterial({ color: 0xdce8ff }),   // cool-white accent
    };
  }
  return indusMats;
}

function applyIndusMats(root, style) {
  const m = indusMaterials(style);
  root.traverse((o) => {
    if (!o.isMesh) return;
    if (o.name.startsWith("Wood")) o.material = m.wood;
    else if (o.name.startsWith("Terra")) o.material = m.terra;
    else if (o.name.startsWith("Plaque")) o.material = m.plaque;
    else if (o.name.startsWith("Glow")) o.material = m.glow;
    else o.material = m.brick;
  });
}

// Baked-brick gallery treatment: engaged brick piers dividing the bays, recessed
// niches (cool-white uplit) alternating with terracotta motif plaques between
// the artworks, timber ceiling beams, and dark floor drainage channels.
function buildIndusDecor(parent, style, z0, len, W, H, sideAnchorZ, out) {
  const m = indusMaterials(style);
  for (const side of [-1, 1]) {
    const arts = sideAnchorZ[String(side)];
    // piers / uplit niches / terracotta plaques distributed along a steady
    // rhythm (index % 3), skipping spots that sit in front of an artwork.
    midSpots(arts, z0, len, 3.0).forEach((z, i) => {
      if (arts.some((a) => Math.abs(a - z) < 1.3)) return;
      const kind = i % 3;
      if (kind === 0) {
        spawnPart(INDUS_GLB, "Pier", (p) => {
          applyIndusMats(p, style);
          p.position.set(side * (W / 2 - 0.01), 0, z);
          p.rotation.y = -side * Math.PI / 2;
          parent.add(p);
        });
      } else if (kind === 1) {
        spawnPart(INDUS_GLB, "Niche", (n) => {
          applyIndusMats(n, style);
          n.position.set(side * (W / 2 - 0.01), 0, z);
          n.rotation.y = -side * Math.PI / 2;
          parent.add(n);
        });
        const up = new THREE.PointLight(0xdce8ff, 5, 5, 2);
        up.position.set(side * (W / 2 - 0.5), 1.2, z);
        up.visible = false;
        parent.add(up);
        out.lights.push(up);
      } else {
        spawnPart(INDUS_GLB, "Plaque", (p) => {
          applyIndusMats(p, style);
          p.position.set(side * (W / 2 - 0.02), 2.2, z);
          p.rotation.y = -side * Math.PI / 2;
          parent.add(p);
        });
      }
    });
    // dark floor drainage channel along each edge (concept detail)
    const ch = new THREE.Mesh(box, m.wood);
    ch.scale.set(0.14, 0.04, len - 0.4);
    ch.position.set(side * (W / 2 - 0.35), 0.014, z0 - len / 2);
    parent.add(ch);
  }
  // timber ceiling beams
  const nb = Math.max(2, Math.round(len / 2.6));
  for (let i = 0; i <= nb; i++) {
    const z = Math.min(z0 - 0.4, Math.max(z0 - len + 0.4, z0 - i * (len / nb)));
    spawnPart(INDUS_GLB, "Beam", (b) => {
      applyIndusMats(b, style);
      b.position.set(0, 0, z);
      parent.add(b);
    });
  }
}

// ---- Blender-authored Khmer/Angkor architecture (build_khmer_assets.py) ----
const KHMER_GLB = "assets/models/khmer.glb";
let khmerMats = null;
let khmerReliefTex = null;

// A weathered carved-sandstone relief: a central standing figure (apsara)
// silhouette in a foliate frame, drawn low-contrast so it reads as worn carving.
function khmerRelief() {
  if (khmerReliefTex) return khmerReliefTex;
  const c = document.createElement("canvas");
  c.width = 256; c.height = 512;
  const g = c.getContext("2d");
  g.fillStyle = "#7c786a"; g.fillRect(0, 0, 256, 512);
  g.strokeStyle = "#565247"; g.lineWidth = 6;
  g.strokeRect(14, 14, 228, 484);
  // foliate scrolls down the sides
  g.lineWidth = 3;
  for (let s of [30, 226]) for (let y = 40; y < 480; y += 44) {
    g.beginPath(); g.arc(s, y, 12, 0, Math.PI * 1.5); g.stroke();
  }
  // standing figure: head, shoulders, tapered body, simple headdress
  g.fillStyle = "#57534733"; g.strokeStyle = "#4c4840"; g.lineWidth = 4;
  g.beginPath(); g.moveTo(128, 70);
  g.lineTo(150, 120); g.lineTo(150, 300); g.lineTo(138, 420);
  g.lineTo(118, 420); g.lineTo(106, 300); g.lineTo(106, 120); g.closePath();
  g.fill(); g.stroke();
  g.beginPath(); g.arc(128, 84, 22, 0, Math.PI * 2); g.fill(); g.stroke();
  // conical headdress
  g.beginPath(); g.moveTo(110, 66); g.lineTo(128, 30); g.lineTo(146, 66); g.stroke();
  khmerReliefTex = fileTex("khmer_apsara.png", toTexture(c));
  return khmerReliefTex;
}

function khmerMaterials(style) {
  if (!khmerMats) {
    const lintel = fileTex("khmer_lintel_relief", grecaBand("#6b675a", "#2c2a22", 388));
    lintel.wrapS = lintel.wrapT = THREE.RepeatWrapping;
    khmerMats = {
      sand: style.wall,   // sandstone, shared with the walls
      wood: new THREE.MeshLambertMaterial({ color: 0x2c1d10 }),
      relief: new THREE.MeshLambertMaterial({ map: khmerRelief() }),
      lintel: new THREE.MeshLambertMaterial({ map: lintel }),
      glow: new THREE.MeshBasicMaterial({
        color: 0xffcf8a, transparent: true, opacity: 0.4,
        blending: THREE.AdditiveBlending, depthWrite: false,
      }),
    };
  }
  return khmerMats;
}

function applyKhmerMats(root, style) {
  const m = khmerMaterials(style);
  root.traverse((o) => {
    if (!o.isMesh) return;
    if (o.name.startsWith("Wood")) o.material = m.wood;
    else if (o.name.startsWith("Deity")) o.material = m.lintel;
    else if (o.name.startsWith("Relief")) o.material = m.relief;
    else if (o.name.startsWith("Glow")) o.material = m.glow;
    else o.material = m.sand;
  });
}

// Khmer gallery treatment: colonnette pilasters and carved apsara relief panels
// alternate between the artworks (each panel grazed by an uplight), timber
// ceiling beams, and a stepped corbel cornice along the wall tops.
function buildKhmerDecor(parent, style, z0, len, W, H, sideAnchorZ, out) {
  const m = khmerMaterials(style);
  for (const side of [-1, 1]) {
    const arts = sideAnchorZ[String(side)];
    midSpots(arts, z0, len, 3.0).forEach((z, i) => {
      if (arts.some((a) => Math.abs(a - z) < 1.3)) return;
      if (i % 2 === 0) {
        spawnPart(KHMER_GLB, "Pilaster", (p) => {
          applyKhmerMats(p, style);
          p.position.set(side * (W / 2 - 0.01), 0, z);
          p.rotation.y = -side * Math.PI / 2;
          parent.add(p);
        });
      } else {
        spawnPart(KHMER_GLB, "Relief", (r) => {
          applyKhmerMats(r, style);
          r.position.set(side * (W / 2 - 0.01), 0, z);
          r.rotation.y = -side * Math.PI / 2;
          parent.add(r);
        });
        // grazing uplight + floor glow disc
        const up = new THREE.PointLight(0xffcf8a, 5, 5.5, 2);
        up.position.set(side * (W / 2 - 0.5), 0.6, z);
        up.visible = false;
        parent.add(up);
        out.lights.push(up);
        const disc = new THREE.Mesh(plane, m.glow);
        disc.rotation.x = -Math.PI / 2;
        disc.scale.set(1.0, 1.0, 1);
        disc.position.set(side * (W / 2 - 0.5), 0.02, z);
        parent.add(disc);
      }
    });
    // stepped corbel cornice along the wall top (two receding courses)
    for (const [y, inset] of [[H - 0.28, 0.0], [H - 0.14, 0.14]]) {
      const c = new THREE.Mesh(box, m.sand);
      c.scale.set(0.24 - inset, 0.14, len);
      c.position.set(side * (W / 2 - 0.12 - inset / 2), y, z0 - len / 2);
      parent.add(c);
    }
  }
  // timber ceiling beams
  const nb = Math.max(2, Math.round(len / 2.6));
  for (let i = 0; i <= nb; i++) {
    const z = Math.min(z0 - 0.4, Math.max(z0 - len + 0.4, z0 - i * (len / nb)));
    spawnPart(KHMER_GLB, "Beam", (b) => {
      applyKhmerMats(b, style);
      b.position.set(0, 0, z);
      parent.add(b);
    });
  }
}

// ---- Blender-authored Japan shoin architecture (build_japan_assets.py) ----
const JAPAN_GLB = "assets/models/japan.glb";
let japanMats = null;
let japanScrollTex = null;

// A simple ink-wash landscape for the tokonoma hanging scroll (no image asset).
function japanScroll() {
  if (japanScrollTex) return japanScrollTex;
  const c = document.createElement("canvas");
  c.width = 128; c.height = 320;
  const g = c.getContext("2d");
  g.fillStyle = "#efe7d4"; g.fillRect(0, 0, 128, 320);
  g.strokeStyle = "#7a746a"; g.fillStyle = "#8a857b";
  // distant mountains
  g.beginPath(); g.moveTo(10, 150);
  g.lineTo(45, 90); g.lineTo(70, 130); g.lineTo(95, 80); g.lineTo(120, 140);
  g.lineTo(120, 175); g.lineTo(10, 175); g.closePath(); g.fill();
  // a few pine strokes + a low wash
  g.strokeStyle = "#5c574d"; g.lineWidth = 2;
  for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(30 + i * 30, 230); g.lineTo(30 + i * 30, 200); g.stroke(); }
  g.fillStyle = "#c9bfa8"; g.fillRect(8, 250, 112, 30);
  // red seal
  g.fillStyle = "#9c3324"; g.fillRect(96, 288, 18, 18);
  return (japanScrollTex = fileTex("japan_scroll.png", toTexture(c)));
}

function japanMaterials(style) {
  if (!japanMats) {
    japanMats = {
      wood: new THREE.MeshLambertMaterial({ color: 0x231710 }),
      shoji: new THREE.MeshBasicMaterial({ map: fileTex("japan_shoji_paper", weave("#f1dfb2", 389)) }),   // backlit paper
      tatami: new THREE.MeshLambertMaterial({ map: fileTex("japan_tatami", weave("#9c9058", 390)) }),
      scroll: new THREE.MeshLambertMaterial({ map: japanScroll() }),
      stone: new THREE.MeshLambertMaterial({ color: 0x6b6862 }),
      glow: new THREE.MeshBasicMaterial({ color: 0xffe6b0 }),
      wall: style.wall,
    };
  }
  return japanMats;
}

function applyJapanMats(root, style) {
  const m = japanMaterials(style);
  root.traverse((o) => {
    if (!o.isMesh) return;
    if (o.name.startsWith("Shoji")) o.material = m.shoji;
    else if (o.name.startsWith("Tatami")) o.material = m.tatami;
    else if (o.name.startsWith("Scroll")) o.material = m.scroll;
    else if (o.name.startsWith("Stone")) o.material = m.stone;
    else if (o.name.startsWith("Glow")) o.material = m.glow;
    else o.material = m.wood;
  });
}

// Shoin gallery treatment: a dark timber post rhythm with a backlit shoji
// clerestory + rails above the art, a low timber wainscot below, tokonoma
// display alcoves and wall andon lanterns between the artworks, exposed beams.
function buildJapanDecor(parent, style, z0, len, W, H, sideAnchorZ, out) {
  const m = japanMaterials(style);
  const zc = z0 - len / 2;
  for (const side of [-1, 1]) {
    const wallX = side * (W / 2 - 0.06);
    const arts = sideAnchorZ[String(side)];
    // tokonoma alcoves on every other between-art gap; lanterns on the rest
    const gaps = interiorMidZ(arts, z0, len);
    const tokoZ = gaps.filter((_, i) => i % 2 === 0);
    const lampZ = gaps.filter((_, i) => i % 2 === 1);
    // posts on a steady rhythm, skipping tokonoma positions
    const posts = midSpots(arts, z0, len, 2.8).filter((z) => !tokoZ.some((t) => Math.abs(t - z) < 1.0));
    for (const z of posts) {
      spawnPart(JAPAN_GLB, "Post", (p) => {
        applyJapanMats(p, style);
        p.position.set(wallX, 0, z);
        p.rotation.y = -side * Math.PI / 2;
        parent.add(p);
      });
    }
    // backlit shoji clerestory above the art + framing rails
    const yBot = 2.75, yTop = H - 0.28;
    const shoji = new THREE.Mesh(scaledUVPlane(len - 0.4, yTop - yBot, 1, 1), m.shoji);
    shoji.position.set(side * (W / 2 - 0.04), (yBot + yTop) / 2, zc);
    shoji.rotation.y = -side * Math.PI / 2;
    parent.add(shoji);
    for (const [y, h] of [[yBot - 0.06, 0.1], [yTop + 0.06, 0.1]]) {
      const rail = new THREE.Mesh(box, m.wood);
      rail.scale.set(0.07, h, len);
      rail.position.set(side * (W / 2 - 0.03), y, zc);
      parent.add(rail);
    }
    // vertical shoji mullions
    const nmul = Math.max(3, Math.round(len / 1.1));
    for (let i = 0; i <= nmul; i++) {
      const mul = new THREE.Mesh(box, m.wood);
      mul.scale.set(0.05, yTop - yBot, 0.05);
      mul.position.set(side * (W / 2 - 0.03), (yBot + yTop) / 2, z0 - i * (len / nmul));
      parent.add(mul);
    }
    // low timber wainscot + baseboard
    for (const [y, h] of [[0.09, 0.18], [0.62, 0.1]]) {
      const w = new THREE.Mesh(box, m.wood);
      w.scale.set(0.06, h, len);
      w.position.set(side * (W / 2 - 0.03), y, zc);
      parent.add(w);
    }
    // tokonoma alcoves
    for (const z of tokoZ) {
      spawnPart(JAPAN_GLB, "Tokonoma", (t) => {
        applyJapanMats(t, style);
        t.position.set(side * (W / 2 - 0.01), 0, z);
        t.rotation.y = -side * Math.PI / 2;
        parent.add(t);
      });
      const gl = new THREE.PointLight(0xffe0a8, 4, 4.5, 2);
      gl.position.set(side * (W / 2 - 0.6), 1.6, z);
      gl.visible = false; parent.add(gl); out.lights.push(gl);
    }
    // wall andon lanterns
    for (const z of lampZ) {
      spawnPart(JAPAN_GLB, "Lantern", (l) => {
        applyJapanMats(l, style);
        l.position.set(side * (W / 2 - 0.04), 1.7, z);
        l.rotation.y = -side * Math.PI / 2;
        parent.add(l);
      });
      const gl = new THREE.PointLight(0xffdca0, 4.5, 4.5, 2);
      gl.position.set(side * (W / 2 - 0.4), 1.7, z);
      gl.visible = false; parent.add(gl); out.lights.push(gl);
    }
  }
  // exposed timber ceiling beams
  const nb = Math.max(2, Math.round(len / 2.2));
  for (let i = 0; i <= nb; i++) {
    const z = Math.min(z0 - 0.3, Math.max(z0 - len + 0.3, z0 - i * (len / nb)));
    spawnPart(JAPAN_GLB, "Beam", (b) => {
      applyJapanMats(b, style);
      b.position.set(0, 0, z);
      parent.add(b);
    });
  }
}

// ---- Blender-authored Classical (Greek/Roman) architecture (build_greek_assets.py) ----
const GREEK_GLB = "assets/models/greek.glb";
let greekMats = null;

function greekMaterials(style) {
  if (!greekMats) {
    greekMats = {
      marble: style.wall,   // marble, shared with the walls
      stone: new THREE.MeshPhongMaterial({ color: 0xd9d0bd, specular: 0x4a453c, shininess: 30 }),
      poly: new THREE.MeshLambertMaterial({ color: 0x8a2a22 }),        // painted red frieze
      gold: new THREE.MeshPhongMaterial({ color: 0xc9a256, specular: 0x99742e, shininess: 60 }),
      bronze: new THREE.MeshPhongMaterial({ color: 0x6e5228, specular: 0xb08a44, shininess: 70 }),
      dark: new THREE.MeshLambertMaterial({ color: 0x2a2620 }),
      coffer: new THREE.MeshLambertMaterial({ map: fileTex("greek_coffer", meanderBand("#3a5570", "#d9cfb8", 343)) }),      // painted blue coffer field
    };
  }
  return greekMats;
}

function applyGreekMats(root, style) {
  const m = greekMaterials(style);
  root.traverse((o) => {
    if (!o.isMesh) return;
    if (o.name.startsWith("Stone")) o.material = m.stone;
    else if (o.name.startsWith("Poly")) o.material = m.poly;
    else if (o.name.startsWith("Gold")) o.material = m.gold;
    else if (o.name.startsWith("Bronze")) o.material = m.bronze;
    else if (o.name.startsWith("Dark")) o.material = m.dark;
    else o.material = m.marble;
  });
}

// Classical gallery treatment: a coffered polychrome ceiling, pedimented
// aedicula niches between the artworks, bronze wall lamps with live flames, a
// red marble dado, and a Greek-key mosaic floor border (concept: Hallway-07).
function buildGreekDecor(parent, style, z0, len, W, H, sideAnchorZ, out) {
  const m = greekMaterials(style);
  const zc = z0 - len / 2;
  // ---- coffered ceiling: painted field + a cream rib grid + gilt rosettes ----
  const field = new THREE.Mesh(scaledUVPlane(W - 0.2, len - 0.2, 1, 1), m.coffer);
  field.rotation.x = Math.PI / 2;
  field.position.set(0, H - 0.02, zc);
  parent.add(field);
  const ribX = [-2.33, 0, 2.33];
  for (const x of [-W / 2 + 0.1, ...ribX, W / 2 - 0.1]) {
    const r = new THREE.Mesh(box, m.stone);
    r.scale.set(0.18, 0.16, len - 0.2);
    r.position.set(x, H - 0.09, zc);
    parent.add(r);
  }
  const nrib = Math.max(2, Math.round(len / 1.75));
  const rosX = [-3.5 + (7 / 8), -3.5 + 3 * (7 / 8), -3.5 + 5 * (7 / 8), -3.5 + 7 * (7 / 8)];
  for (let i = 0; i <= nrib; i++) {
    const z = z0 - i * (len / nrib);
    const r = new THREE.Mesh(box, m.stone);
    r.scale.set(W - 0.2, 0.16, 0.18);
    r.position.set(0, H - 0.09, z);
    parent.add(r);
    if (i < nrib) for (const x of rosX) {
      const ro = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.06, 10), m.gold);
      ro.position.set(x, H - 0.11, z - len / nrib / 2);
      parent.add(ro);
    }
  }
  // ---- walls: red dado band + mosaic (meander) floor border ----
  const meander = fileTex("band_meander_floor", meanderBand("#2a2e38", "#d9cfb8", 43));
  meander.wrapS = meander.wrapT = THREE.RepeatWrapping;
  for (const side of [-1, 1]) {
    const dado = new THREE.Mesh(box, m.poly);
    dado.scale.set(0.05, 0.5, len);
    dado.position.set(side * (W / 2 - 0.03), 1.0, zc);
    parent.add(dado);
    // mosaic border strip on the floor
    const strip = new THREE.Mesh(scaledUVPlane(0.5, len - 0.4, 1, (len - 0.4) / 1.5),
      new THREE.MeshLambertMaterial({ map: meander.clone() }));
    strip.material.map.wrapS = strip.material.map.wrapT = THREE.RepeatWrapping;
    strip.rotation.x = -Math.PI / 2;
    strip.position.set(side * 2.6, 0.016, zc);
    parent.add(strip);
    // aedicula niches + bronze wall lamps alternate between the artworks
    interiorMidZ(sideAnchorZ[String(side)], z0, len).forEach((z, i) => {
      if (i % 2 === 0) {
        spawnPart(GREEK_GLB, "Aedicula", (a) => {
          applyGreekMats(a, style);
          a.position.set(side * (W / 2 - 0.01), 0, z);
          a.rotation.y = -side * Math.PI / 2;
          parent.add(a);
        });
      } else {
        spawnPart(GREEK_GLB, "Sconce", (s) => {
          applyGreekMats(s, style);
          s.position.set(side * (W / 2 - 0.02), 2.6, z);
          s.rotation.y = -side * Math.PI / 2;
          parent.add(s);
        });
        const flame = createFlame({ scale: 0.4, intensity: 7, dist: 5, seed: i + 3 });
        flame.group.position.set(side * (W / 2 - 0.33), 2.52, z);
        flame.light.visible = false;
        parent.add(flame.group);
        out.fires.push(flame);
        out.lights.push(flame.light);
      }
    });
  }
}

// ---- Blender-authored Renaissance architecture (build_renaissance_assets.py) ----
const REN_GLB = "assets/models/renaissance.glb";
let renMats = null;
let renFrescoTex = null;

// A cream "grotesque" fresco panel (symmetric candelabra scrollwork + medallion).
function renFresco() {
  if (renFrescoTex) return renFrescoTex;
  const c = document.createElement("canvas");
  c.width = 160; c.height = 320;
  const g = c.getContext("2d");
  g.fillStyle = "#d8cdb0"; g.fillRect(0, 0, 160, 320);
  g.strokeStyle = "#8a5a3a"; g.lineWidth = 3;
  g.strokeRect(8, 8, 144, 304);
  // central candelabra stem
  g.beginPath(); g.moveTo(80, 40); g.lineTo(80, 288); g.stroke();
  // symmetric scrolls
  g.lineWidth = 2.4;
  for (let y = 70; y < 280; y += 46) {
    for (const s of [-1, 1]) {
      g.beginPath(); g.moveTo(80, y); g.quadraticCurveTo(80 + s * 44, y - 14, 80 + s * 30, y + 20); g.stroke();
    }
  }
  // medallion
  g.strokeStyle = "#7a3a2a"; g.lineWidth = 3;
  g.beginPath(); g.arc(80, 160, 30, 0, Math.PI * 2); g.stroke();
  g.fillStyle = "#9c5236"; g.beginPath(); g.arc(80, 160, 10, 0, Math.PI * 2); g.fill();
  return (renFrescoTex = fileTex("renaissance_fresco.png", toTexture(c)));
}

function renMaterials(style) {
  if (!renMats) {
    renMats = {
      plaster: style.wall,   // cream fresco plaster, shared with the walls
      pietra: new THREE.MeshPhongMaterial({ map: fileTex("pietra_serena", grecaBand("#767468", "#5b5a52", 376)), specular: 0x3a382f, shininess: 18 }),
      fresco: new THREE.MeshLambertMaterial({ map: renFresco() }),
      marble: new THREE.MeshPhongMaterial({ color: 0x8a7f6a, specular: 0x4a453c, shininess: 40 }),
      gold: new THREE.MeshLambertMaterial({ map: renFresco() }),
    };
  }
  return renMats;
}

function applyRenMats(root, style) {
  const m = renMaterials(style);
  root.traverse((o) => {
    if (!o.isMesh) return;
    if (o.name.startsWith("Pietra")) o.material = m.pietra;
    else if (o.name.startsWith("Fresco")) o.material = m.fresco;
    else if (o.name.startsWith("Marble")) o.material = m.marble;
    else if (o.name.startsWith("Gold")) o.material = m.fresco;
    else o.material = m.plaster;
  });
}

// Palazzo gallery treatment: pietra serena pilasters and fresco aediculae
// alternate between the artworks, an ornament frieze runs high on the walls,
// and a pietra serena border edges the floor (concept: Hallway-09).
function buildRenDecor(parent, style, z0, len, W, H, sideAnchorZ) {
  const m = renMaterials(style);
  const zc = z0 - len / 2;
  for (const side of [-1, 1]) {
    const arts = sideAnchorZ[String(side)];
    midSpots(arts, z0, len, 3.0).forEach((z, i) => {
      if (arts.some((a) => Math.abs(a - z) < 1.3)) return;
      if (i % 2 === 0) {
        spawnPart(REN_GLB, "Pilaster", (p) => {
          applyRenMats(p, style);
          p.position.set(side * (W / 2 - 0.01), 0, z);
          p.rotation.y = -side * Math.PI / 2;
          parent.add(p);
        });
      } else {
        spawnPart(REN_GLB, "Aedicula", (a) => {
          applyRenMats(a, style);
          a.position.set(side * (W / 2 - 0.01), 0, z);
          a.rotation.y = -side * Math.PI / 2;
          parent.add(a);
        });
      }
    });
    // ornament frieze high on the wall
    const fr = new THREE.Mesh(scaledUVPlane(len, 0.34, len / 1.4, 1),
      new THREE.MeshLambertMaterial({ map: renFresco().clone() }));
    fr.material.map.wrapS = THREE.RepeatWrapping;
    fr.position.set(side * (W / 2 - 0.03), H - 0.45, zc);
    fr.rotation.y = -side * Math.PI / 2;
    parent.add(fr);
    // pietra serena floor border
    const strip = new THREE.Mesh(box, m.pietra);
    strip.scale.set(0.2, 0.04, len - 0.4);
    strip.position.set(side * 2.7, 0.016, zc);
    parent.add(strip);
  }
}

// ---- Blender-authored Baroque architecture (build_baroque_assets.py) ----
const BAROQUE_GLB = "assets/models/baroque.glb";
let baroqueMats = null;

function baroqueMaterials(style) {
  if (!baroqueMats) {
    const ceiling = fileTex("baroque_ceiling_fresco", meanderBand("#43301b", "#c9a256", 451));
    ceiling.wrapS = ceiling.wrapT = THREE.RepeatWrapping;
    baroqueMats = {
      marble: new THREE.MeshPhongMaterial({ color: 0xd6cdba, specular: 0x6a6558, shininess: 60 }),
      ceiling: new THREE.MeshPhongMaterial({ map: ceiling, specular: 0x6a6558, shininess: 42 }),
      gilt: new THREE.MeshPhongMaterial({ color: 0xc9a24e, specular: 0xfff1c4, shininess: 120 }),
      damask: style.wall,   // red damask, shared with the walls
      walnut: new THREE.MeshPhongMaterial({ color: 0x2a1a10, specular: 0x1a120a, shininess: 24 }),
      ember: new THREE.MeshBasicMaterial({ color: 0xffd089 }),
      dark: new THREE.MeshLambertMaterial({ color: 0x1a120c }),
    };
  }
  return baroqueMats;
}

function applyBaroqueMats(root, style) {
  const m = baroqueMaterials(style);
  root.traverse((o) => {
    if (!o.isMesh) return;
    if (o.name.startsWith("Gilt")) o.material = m.gilt;
    else if (o.name.startsWith("Walnut")) o.material = m.walnut;
    else if (o.name.startsWith("Damask")) o.material = m.damask;
    else if (o.name.startsWith("Ember")) o.material = m.ember;
    else if (o.name.startsWith("Dark")) o.material = m.dark;
    else if (o.name.startsWith("Cove") || o.name.startsWith("Ceil")) o.material = m.ceiling;
    else o.material = m.marble;
  });
}

// Baroque palace treatment: a gilt-edged cove at the wall-ceiling junction
// (reads as a vault springing) with gilt cartouche frames on the ceiling,
// bronze chandeliers down the centre, gilt cartouches + candelabra sconces on
// the walls, carved walnut wainscot, and floor medallions (concept: Hallway-10).
function buildBaroqueDecor(parent, style, z0, len, W, H, sideAnchorZ, out) {
  const m = baroqueMaterials(style);
  const zc = z0 - len / 2;
  // gilt cornice molding at the wall-ceiling junction (frames the coffered ceiling)
  for (const side of [-1, 1]) {
    const cornice = new THREE.Mesh(box, m.gilt);
    cornice.scale.set(0.14, 0.16, len);
    cornice.position.set(side * (W / 2 - 0.08), H - 0.12, zc);
    parent.add(cornice);
  }
  // chandeliers + warm light down the centre
  const nc = Math.max(1, Math.round(len / 5.5));
  for (let i = 0; i < nc; i++) {
    const z = z0 - (i + 0.5) * (len / nc);
    spawnPart(BAROQUE_GLB, "Chandelier", (c) => {
      applyBaroqueMats(c, style);
      c.position.set(0, H - 1.0, z);
      parent.add(c);
    });
    const gl = new THREE.PointLight(0xffdca0, 14, 12, 2);
    gl.position.set(0, H - 1.2, z);
    gl.visible = false; parent.add(gl); out.lights.push(gl);
  }
  for (const side of [-1, 1]) {
    const arts = sideAnchorZ[String(side)];
    // gilt cartouches high on the wall between the artworks
    interiorMidZ(arts, z0, len).forEach((z, i) => {
      if (i % 2 === 0) {
        spawnPart(BAROQUE_GLB, "Cartouche", (c) => {
          applyBaroqueMats(c, style);
          c.position.set(side * (W / 2 - 0.04), 3.7, z);
          c.rotation.y = -side * Math.PI / 2;
          parent.add(c);
        });
      } else {
        spawnPart(BAROQUE_GLB, "Sconce", (s) => {
          applyBaroqueMats(s, style);
          s.position.set(side * (W / 2 - 0.04), 2.5, z);
          s.rotation.y = -side * Math.PI / 2;
          parent.add(s);
        });
        const gl = new THREE.PointLight(0xffcf8a, 5, 5, 2);
        gl.position.set(side * (W / 2 - 0.4), 2.6, z);
        gl.visible = false; parent.add(gl); out.lights.push(gl);
      }
    });
    // carved walnut wainscot: baseboard + panel + gilt dado rail
    const base = new THREE.Mesh(box, m.walnut);
    base.scale.set(0.1, 0.22, len); base.position.set(side * (W / 2 - 0.05), 0.11, zc); parent.add(base);
    const panel = new THREE.Mesh(box, m.walnut);
    panel.scale.set(0.06, 0.7, len); panel.position.set(side * (W / 2 - 0.03), 0.62, zc); parent.add(panel);
    const rail = new THREE.Mesh(box, m.gilt);
    rail.scale.set(0.08, 0.06, len); rail.position.set(side * (W / 2 - 0.04), 1.0, zc); parent.add(rail);
  }
  // floor medallions (flat gilt/marble inlay discs) down the centre
  const nm2 = Math.max(1, Math.round(len / 6));
  for (let i = 0; i < nm2; i++) {
    const z = z0 - (i + 0.5) * (len / nm2);
    const med = new THREE.Mesh(new THREE.CircleGeometry(1.0, 32), m.gilt);
    med.rotation.x = -Math.PI / 2; med.position.set(0, 0.015, z); parent.add(med);
    const inner = new THREE.Mesh(new THREE.CircleGeometry(0.6, 32), m.damask);
    inner.rotation.x = -Math.PI / 2; inner.position.set(0, 0.017, z); parent.add(inner);
  }
}

// ---- Blender-authored Romantic salon architecture (build_salon_assets.py) ----
const SALON_GLB = "assets/models/salon.glb";
let salonDMats = null;

function salonDMaterials(style) {
  if (!salonDMats) {
    salonDMats = {
      wood: new THREE.MeshPhongMaterial({ color: 0x3a2415, specular: 0x241610, shininess: 34 }),
      gilt: new THREE.MeshPhongMaterial({ color: 0xc9a24e, specular: 0xfff1c4, shininess: 120 }),
      velvet: new THREE.MeshLambertMaterial({ color: 0x5a1820 }),
      plaster: new THREE.MeshLambertMaterial({ color: 0xe2dac8 }),
      brass: new THREE.MeshPhongMaterial({ color: 0x9c7a34, specular: 0xe6c878, shininess: 90 }),
      globe: new THREE.MeshBasicMaterial({ color: 0xfff2d4 }),
      marble: new THREE.MeshPhongMaterial({ color: 0x2a2a2e, specular: 0x6a6a70, shininess: 60 }),
    };
  }
  return salonDMats;
}

function applySalonMats(root, style) {
  const m = salonDMaterials(style);
  root.traverse((o) => {
    if (!o.isMesh) return;
    if (o.name.startsWith("Gilt")) o.material = m.gilt;
    else if (o.name.startsWith("Velvet")) o.material = m.velvet;
    else if (o.name.startsWith("Plaster")) o.material = m.plaster;
    else if (o.name.startsWith("Brass")) o.material = m.brass;
    else if (o.name.startsWith("Globe")) o.material = m.globe;
    else if (o.name.startsWith("Marble")) o.material = m.marble;
    else o.material = m.wood;
  });
}

// Salon treatment: carved walnut wainscot + gilt picture rail, brass candelabra
// sconces and heavy velvet drapery between the artworks, and plaster ceiling
// medallions down the centre (concept: Hallway-11).
function buildSalonDecor(parent, style, z0, len, W, H, sideAnchorZ, out) {
  const m = salonDMaterials(style);
  const zc = z0 - len / 2;
  for (const side of [-1, 1]) {
    const arts = sideAnchorZ[String(side)];
    const wx = side * (W / 2 - 0.05);
    // carved walnut wainscot: skirting + recessed panel field + paneling stiles
    const base = new THREE.Mesh(box, m.wood);
    base.scale.set(0.12, 0.30, len); base.position.set(wx, 0.15, zc); parent.add(base);
    const panel = new THREE.Mesh(box, m.wood);
    panel.scale.set(0.05, 0.80, len); panel.position.set(side * (W / 2 - 0.03), 0.70, zc); parent.add(panel);
    // vertical stiles break the wainscot into raised panels
    const nst = Math.max(2, Math.round(len / 1.6));
    for (let i = 0; i <= nst; i++) {
      const z = z0 - 0.2 - i * ((len - 0.4) / nst);
      const st = new THREE.Mesh(box, m.wood);
      st.scale.set(0.10, 0.78, 0.10); st.position.set(side * (W / 2 - 0.02), 0.70, z); parent.add(st);
    }
    // gilt dado rail (wainscot cap) + gilt picture rail
    const dado = new THREE.Mesh(box, m.gilt);
    dado.scale.set(0.10, 0.07, len); dado.position.set(side * (W / 2 - 0.02), 1.14, zc); parent.add(dado);
    const prail = new THREE.Mesh(box, m.gilt);
    prail.scale.set(0.07, 0.06, len); prail.position.set(side * (W / 2 - 0.02), 3.2, zc); parent.add(prail);
    // crown cornice: deep plaster cove + gilt bead just under the ceiling
    const cove = new THREE.Mesh(box, m.plaster);
    cove.scale.set(0.22, 0.26, len); cove.position.set(side * (W / 2 - 0.11), H - 0.35, zc); parent.add(cove);
    const bead = new THREE.Mesh(box, m.gilt);
    bead.scale.set(0.16, 0.05, len); bead.position.set(side * (W / 2 - 0.08), H - 0.55, zc); parent.add(bead);
    // sconces + drapery alternate between the artworks
    interiorMidZ(arts, z0, len).forEach((z, i) => {
      if (i % 2 === 0) {
        spawnPart(SALON_GLB, "Sconce", (s) => {
          applySalonMats(s, style);
          s.position.set(side * (W / 2 - 0.03), 2.4, z);
          s.rotation.y = -side * Math.PI / 2;
          parent.add(s);
        });
        const gl = new THREE.PointLight(0xffe0aa, 5, 5, 2);
        gl.position.set(side * (W / 2 - 0.4), 2.5, z);
        gl.visible = false; parent.add(gl); out.lights.push(gl);
      } else {
        spawnPart(SALON_GLB, "Drape", (d) => {
          applySalonMats(d, style);
          d.position.set(side * (W / 2 - 0.02), 0, z);
          d.rotation.y = -side * Math.PI / 2;
          parent.add(d);
        });
      }
    });
  }
  // plaster ceiling: ornate medallions down the centre, each ringed by a
  // shallow raised plaster panel frame (concept: medallions + cornices)
  const nm2 = Math.max(1, Math.round(len / 4.2));
  for (let i = 0; i < nm2; i++) {
    const z = z0 - (i + 0.5) * (len / nm2);
    spawnPart(SALON_GLB, "Medallion", (md) => {
      // a ceiling rosette is all plaster — force it (unprefixed meshes would
      // otherwise fall through to the dark walnut material)
      md.traverse((o) => { if (o.isMesh) o.material = m.plaster; });
      md.position.set(0, H - 0.12, z);
      md.rotation.x = Math.PI; // face down
      md.scale.set(1.5, 1.5, 1.3);
      parent.add(md);
    });
    // shallow raised plaster panel-frame (square outline) around the rosette
    const R = 1.35, TH = 0.12;
    const bars = [
      [0, z - R, 2 * R + TH, TH], [0, z + R, 2 * R + TH, TH],
      [-R, z, TH, 2 * R], [R, z, TH, 2 * R],
    ];
    for (const [bx, bz, lx, lz] of bars) {
      const bar = new THREE.Mesh(box, m.plaster);
      bar.scale.set(lx, 0.07, lz);
      bar.position.set(bx, H - 0.05, bz);
      parent.add(bar);
    }
  }
}

// ---- Impressionist salon (reuses salon.glb portal, cream palette) ----
let salon2Mats = null;

// pale daylit sky behind the skylight glazing: a soft blue-white gradient with
// a faint warm horizon, so the laylight reads as glazed sky, not a flat panel.
function salon2SkyTex() {
  const c = document.createElement("canvas");
  c.width = 128; c.height = 128;
  const g = c.getContext("2d");
  const grad = g.createLinearGradient(0, 0, 0, 128);
  grad.addColorStop(0, "#aecbe0");   // soft blue sky
  grad.addColorStop(0.6, "#cfe0ec");
  grad.addColorStop(1, "#eef2ee");   // pale near the eaves
  g.fillStyle = grad; g.fillRect(0, 0, 128, 128);
  // a couple of faint clouds
  for (const [cx, cy, r] of [[40, 44, 26], [92, 78, 22], [70, 30, 16]]) {
    const rg = g.createRadialGradient(cx, cy, 0, cx, cy, r);
    rg.addColorStop(0, "rgba(255,255,255,0.55)");
    rg.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = rg; g.fillRect(cx - r, cy - r, r * 2, r * 2);
  }
  // white glazing bars (pane grid) so it reads as a glass roof, not a panel
  g.strokeStyle = "rgba(244,240,230,0.9)"; g.lineWidth = 6;
  for (let i = 0; i <= 128; i += 32) {
    g.beginPath(); g.moveTo(0, i); g.lineTo(128, i); g.stroke();
    g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 128); g.stroke();
  }
  const t = toTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(1, 5);
  return t;
}

function salon2Materials(style) {
  if (!salon2Mats) {
    salon2Mats = {
      cream: new THREE.MeshLambertMaterial({ color: 0xf4f0e2, emissive: 0x565243 }),
      // bright warm gilt for rails, picture-light bodies and frame moldings
      gilt: new THREE.MeshPhongMaterial({ color: 0xd6b055, specular: 0xfff1c4, shininess: 130, emissive: 0x2e2409 }),
      sage: style.wall,
      // pale veined marble for the plinth / threshold
      marble: new THREE.MeshPhongMaterial({ color: 0xe4dfd2, specular: 0x9a958a, shininess: 60, emissive: 0x28261f }),
      brass: new THREE.MeshPhongMaterial({ color: 0xb08a3c, specular: 0xf0d488, shininess: 110, emissive: 0x1c1405 }),
      glass: new THREE.MeshBasicMaterial({ color: 0xf6f2e6 }),   // picture-light lit tube
      sky: new THREE.MeshBasicMaterial({ map: salon2SkyTex() }), // skylight glazing
    };
  }
  return salon2Mats;
}

// salon.glb portal re-materialled in a cream/gilt palette for the light salon
function applySalon2Mats(root, style) {
  const m = salon2Materials(style);
  root.traverse((o) => {
    if (!o.isMesh) return;
    if (o.name.startsWith("Gilt")) o.material = m.gilt;
    else if (o.name.startsWith("Marble")) o.material = m.marble;
    else if (o.name.startsWith("Velvet")) o.material = m.gilt;
    else o.material = m.cream;   // Wood/Plaster → cream
  });
}

// Impressionist treatment: a glowing glass skylight down the centre, cream
// paneled wainscot + gilt picture rails, and a brass picture light over every
// artwork (concept: Hallway-12).
function buildSalon2Decor(parent, style, z0, len, W, H, sideAnchorZ, out) {
  const m = salon2Materials(style);
  const zc = z0 - len / 2;

  // --- Pitched glazed skylight down the centre ---------------------------
  // Two sloped sky-glass planes rising from lower eaves (x=±1.15) to a bright
  // central ridge just under the ceiling, so looking up reads as a gable
  // skylight (not a flat blown laylight). Framed in refined white molding.
  const RIDGE_Y = H - 0.06, EAVE_Y = H - 0.44, EAVE_X = 1.15;
  const slopeW = Math.hypot(EAVE_X, RIDGE_Y - EAVE_Y);
  const theta = Math.atan2(RIDGE_Y - EAVE_Y, EAVE_X);
  for (const side of [-1, 1]) {
    // thin glazed slab tilted only about Z: length stays along the corridor,
    // the across-direction tips so the outer (eave) edge drops below the ridge.
    const glass = new THREE.Mesh(box, m.sky);
    glass.scale.set(slopeW, 0.04, len - 0.5);
    glass.rotation.z = -side * theta;
    glass.position.set(side * EAVE_X / 2, (RIDGE_Y + EAVE_Y) / 2, zc);
    parent.add(glass);
    // eave fascia: white curb closing the gap up to the flat ceiling
    const fascia = new THREE.Mesh(box, m.cream);
    fascia.scale.set(0.09, H - EAVE_Y + 0.02, len - 0.4);
    fascia.position.set(side * (EAVE_X + 0.05), (H + EAVE_Y) / 2, zc); parent.add(fascia);
  }
  // cream ridge beam + classical cross-ties (mullion rhythm)
  const ridge = new THREE.Mesh(box, m.cream);
  ridge.scale.set(0.12, 0.1, len - 0.5); ridge.position.set(0, RIDGE_Y + 0.01, zc); parent.add(ridge);
  const nm = Math.max(2, Math.round(len / 1.5));
  for (let i = 0; i <= nm; i++) {
    const tie = new THREE.Mesh(box, m.cream);
    tie.scale.set(2 * EAVE_X + 0.2, 0.07, 0.08);
    tie.position.set(0, RIDGE_Y - 0.02, z0 - 0.25 - i * ((len - 0.5) / nm)); parent.add(tie);
  }
  const day = new THREE.PointLight(0xfff6e8, 36, 24, 2);
  day.position.set(0, H - 0.9, zc); day.visible = false; parent.add(day); out.lights.push(day);

  for (const side of [-1, 1]) {
    // cream wainscot with a marble plinth, gilt panel lines + picture rail
    const base = new THREE.Mesh(box, m.cream);
    base.scale.set(0.1, 1.18, len); base.position.set(side * (W / 2 - 0.04), 0.62, zc); parent.add(base);
    // veined marble skirting / base along the wall foot (concept: marble base)
    const plinth = new THREE.Mesh(box, m.marble);
    plinth.scale.set(0.15, 0.3, len); plinth.position.set(side * (W / 2 - 0.02), 0.15, zc); parent.add(plinth);
    for (const [y, h] of [[0.32, 0.05], [1.18, 0.07], [3.1, 0.06], [H - 0.12, 0.14]]) {
      const rail = new THREE.Mesh(box, m.gilt);
      rail.scale.set(0.06, h, len); rail.position.set(side * (W / 2 - 0.03), y, zc); parent.add(rail);
    }
    // heavy carved-gilt frame molding + brass picture light over each artwork
    for (const z of sideAnchorZ[String(side)]) {
      const fx = side * (W / 2 - 0.14), cy = 1.85, HW = 1.32, HH = 1.02, t = 0.14, d = 0.13;
      for (const gy of [cy + HH, cy - HH]) {
        const b = new THREE.Mesh(box, m.gilt);
        b.scale.set(d, t, HW * 2 + t); b.position.set(fx, gy, z); parent.add(b);
      }
      for (const gz of [z - HW, z + HW]) {
        const b = new THREE.Mesh(box, m.gilt);
        b.scale.set(d, HH * 2, t); b.position.set(fx, cy, gz); parent.add(b);
      }
      const arm = new THREE.Mesh(box, m.brass);
      arm.scale.set(0.5, 0.06, 0.16); arm.position.set(side * (W / 2 - 0.18), 3.05, z); parent.add(arm);
      const tube = new THREE.Mesh(box, m.glass);
      tube.scale.set(0.42, 0.06, 0.06); tube.position.set(side * (W / 2 - 0.3), 2.98, z); parent.add(tube);
      const gl = new THREE.PointLight(0xfff2d6, 4, 4.5, 2);
      gl.position.set(side * (W / 2 - 0.5), 2.8, z); gl.visible = false; parent.add(gl); out.lights.push(gl);
    }
  }
}

// ---- Neolithic village (reuses adobe.glb parts, mudbrick palette) ----
let neoMats = null;

function neoMaterials(style) {
  if (!neoMats) {
    const paint = fileTex("neolithic_ochre_figures.png", triangleBand("#b08a5c", "#7a2f1d", "#3c2a1a", 269));
    paint.wrapS = paint.wrapT = THREE.RepeatWrapping;
    neoMats = {
      adobe: style.wall,   // lime-plastered mudbrick, shared with the walls
      wood: new THREE.MeshLambertMaterial({ color: 0x4a3620 }),   // warm smoke-darkened timber (not pure black)
      terra: new THREE.MeshLambertMaterial({ color: 0x9c5a30 }),
      paint: new THREE.MeshLambertMaterial({ map: paint }),
      glow: new THREE.MeshBasicMaterial({ color: 0xffc078 }),
    };
  }
  return neoMats;
}

function applyNeoMats(root, style) {
  const m = neoMaterials(style);
  root.traverse((o) => {
    if (!o.isMesh) return;
    if (o.name.startsWith("Wood")) o.material = m.wood;
    else if (o.name.startsWith("Terra")) o.material = m.terra;
    else if (o.name.startsWith("Paint")) o.material = m.paint;
    else if (o.name.startsWith("Glow")) o.material = m.glow;
    else o.material = m.adobe;
  });
}

// Neolithic treatment: a reed-and-timber ceiling (vigas), rounded niches with
// vessels + uplights, and a continuous low mud bench along the wall base
// (concept: Hallway-14). Reuses the adobe.glb Viga + Niche parts.
function buildNeolithicDecor(parent, style, z0, len, W, H, sideAnchorZ, out) {
  const m = neoMaterials(style);
  const zc = z0 - len / 2;
  for (const side of [-1, 1]) {
    const arts = sideAnchorZ[String(side)];
    // continuous low mud bench / storage ledge along the wall base
    const bench = new THREE.Mesh(box, m.adobe);
    bench.scale.set(0.34, 0.4, len - 0.4);
    bench.position.set(side * (W / 2 - 0.17), 0.2, zc);
    parent.add(bench);
    // rounded niches with vessels + concealed uplights, above the bench
    for (const z of midSpots(arts, z0, len, 3.2)) {
      if (arts.some((a) => Math.abs(a - z) < 1.3)) continue;
      spawnPart(ADOBE_GLB, "Niche", (n) => {
        applyNeoMats(n, style);
        n.position.set(side * (W / 2 - 0.01), 0.45, z);   // sit on the bench
        n.rotation.y = -side * Math.PI / 2;
        parent.add(n);
      });
      const up = new THREE.PointLight(0xffc078, 5, 5, 2);
      up.position.set(side * (W / 2 - 0.5), 0.9, z);
      up.visible = false; parent.add(up); out.lights.push(up);
      const disc = new THREE.Mesh(plane, m.glow.clone());
      disc.material.transparent = true; disc.material.opacity = 0.45;
      disc.rotation.x = -Math.PI / 2; disc.scale.set(0.9, 0.9, 1);
      disc.position.set(side * (W / 2 - 0.55), 0.02, z); parent.add(disc);
    }
  }
  // reed-and-timber ceiling: round timber beams on a tight rhythm
  const nv = Math.max(3, Math.round(len / 1.5));
  for (let i = 0; i <= nv; i++) {
    const z = Math.min(z0 - 0.3, Math.max(z0 - len + 0.3, z0 - i * (len / nv)));
    spawnPart(ADOBE_GLB, "Viga", (v) => {
      applyNeoMats(v, style);
      v.position.set(0, -0.2, z);   // adobe viga sits at 4.4; drop to neolithic 4.2
      parent.add(v);
    });
  }
}

// ---- Blender-authored Mesopotamia architecture (build_mesopotamia_assets.py) ----
const MESOPT_GLB = "assets/models/mesopotamia.glb";
let mesoptMats = null;
let mesoptReliefTex = null;
let mesoptLamassuTex = null;
let mesoptBandTex = null;

// A shallow Assyrian guardian relief (bearded winged figure) on ochre brick.
function mesoptRelief() {
  if (mesoptReliefTex) return mesoptReliefTex;
  const c = document.createElement("canvas");
  c.width = 200; c.height = 256;
  const g = c.getContext("2d");
  g.fillStyle = "#9c7442"; g.fillRect(0, 0, 200, 256);
  g.strokeStyle = "#5c421f"; g.lineWidth = 4;
  // body
  g.fillStyle = "#8a6636";
  g.beginPath(); g.moveTo(70, 60); g.lineTo(120, 60); g.lineTo(128, 230); g.lineTo(62, 230); g.closePath(); g.fill(); g.stroke();
  // head + beard
  g.beginPath(); g.arc(95, 52, 22, 0, Math.PI * 2); g.fill(); g.stroke();
  g.beginPath(); g.moveTo(78, 62); g.lineTo(112, 62); g.lineTo(104, 110); g.lineTo(86, 110); g.closePath(); g.fill(); g.stroke();
  // wing (radiating lines)
  g.lineWidth = 3;
  for (let i = 0; i < 6; i++) { g.beginPath(); g.moveTo(120, 90); g.lineTo(185, 80 + i * 20); g.stroke(); }
  mesoptReliefTex = fileTex("mesopotamia_procession.png", toTexture(c));
  return mesoptReliefTex;
}

function mesoptLamassu() {
  if (mesoptLamassuTex) return mesoptLamassuTex;
  const c = document.createElement("canvas");
  c.width = 200; c.height = 300;
  const g = c.getContext("2d");
  g.fillStyle = "#1c4d7c"; g.fillRect(0, 0, 200, 300);
  g.strokeStyle = "#e8c95f"; g.lineWidth = 5;
  g.strokeRect(10, 10, 180, 280);
  g.fillStyle = "#c8a048"; g.strokeStyle = "#5c421f"; g.lineWidth = 4;
  g.beginPath(); g.moveTo(40, 190); g.lineTo(136, 190); g.lineTo(154, 230); g.lineTo(34, 230); g.closePath(); g.fill(); g.stroke();
  g.beginPath(); g.arc(112, 92, 28, 0, Math.PI * 2); g.fill(); g.stroke();
  for (let i = 0; i < 6; i++) { g.beginPath(); g.moveTo(74, 126); g.lineTo(34, 82 + i * 24); g.stroke(); }
  return (mesoptLamassuTex = fileTex("mesopotamia_lamassu.png", toTexture(c)));
}

function mesoptMaterials(style) {
  if (!mesoptMats) {
    mesoptBandTex = fileTex("glazed_brick", glazedBand("#1c4d7c", "#e8c95f", 272));
    mesoptBandTex.wrapS = mesoptBandTex.wrapT = THREE.RepeatWrapping;
    mesoptMats = {
      brick: style.wall,   // mudbrick, shared with the walls
      glaze: new THREE.MeshPhongMaterial({ map: fileTex("glazed_brick", glazedBand("#1c4d7c", "#e8c95f", 372)), specular: 0x6e8ab0, shininess: 90 }),
      gold: new THREE.MeshPhongMaterial({ color: 0xc9a24e, specular: 0xe6c878, shininess: 80 }),
      relief: new THREE.MeshLambertMaterial({ map: mesoptRelief() }),
      lamassu: new THREE.MeshLambertMaterial({ map: mesoptLamassu() }),
      band: new THREE.MeshLambertMaterial({ map: mesoptBandTex }),
    };
  }
  return mesoptMats;
}

function applyMesoptMats(root, style) {
  const m = mesoptMaterials(style);
  root.traverse((o) => {
    if (!o.isMesh) return;
    if (o.name.startsWith("Glaze")) o.material = m.glaze;
    else if (o.name.startsWith("Gold")) o.material = m.gold;
    else if (o.name.startsWith("Relief_lamassu")) o.material = m.lamassu;
    else if (o.name.startsWith("Relief")) o.material = m.relief;
    else if (o.name.startsWith("Band")) { const b = m.band.clone(); b.map = m.band.map.clone(); b.map.wrapS = THREE.RepeatWrapping; b.map.repeat.set(6, 1); b.map.needsUpdate = true; o.material = b; }
    else o.material = m.brick;
  });
}

// Ishtar-gate treatment: crenellated glazed merlons along the wall tops,
// procession/guardian relief panels between the artworks, a glazed dado, and
// concealed floor uplights washing the walls (concept: Hallway-15).
function buildMesoptDecor(parent, style, z0, len, W, H, sideAnchorZ, out) {
  const m = mesoptMaterials(style);
  const zc = z0 - len / 2;
  for (const side of [-1, 1]) {
    const arts = sideAnchorZ[String(side)];
    // glazed dado band low on the wall
    const dado = new THREE.Mesh(box, m.glaze);
    dado.scale.set(0.05, 0.6, len); dado.position.set(side * (W / 2 - 0.03), 0.55, zc); parent.add(dado);
    // crenellated merlons along the wall top
    const ncr = Math.max(3, Math.round(len / 1.3));
    for (let i = 0; i < ncr; i++) {
      const z = z0 - 0.5 - i * ((len - 1.0) / (ncr - 1));
      spawnPart(MESOPT_GLB, "Merlon", (mm) => {
        applyMesoptMats(mm, style);
        // decorative crenellated cornice below the ceiling (merlon rises ~0.5)
        mm.position.set(side * (W / 2 - 0.2), H - 1.05, z);
        parent.add(mm);
      });
    }
    // procession relief panels + floor uplights between the artworks
    midSpots(arts, z0, len, 3.0).forEach((z, i) => {
      if (arts.some((a) => Math.abs(a - z) < 1.3)) return;
      if (i % 2 === 0) {
        spawnPart(MESOPT_GLB, "Relief", (r) => {
          applyMesoptMats(r, style);
          r.position.set(side * (W / 2 - 0.01), 1.6, z);
          r.rotation.y = -side * Math.PI / 2;
          parent.add(r);
        });
      }
      // concealed floor uplight washing the wall
      const up = new THREE.PointLight(0xffcf8a, 4.5, 5.5, 2);
      up.position.set(side * (W / 2 - 0.55), 0.3, z);
      up.visible = false; parent.add(up); out.lights.push(up);
      const disc = new THREE.Mesh(new THREE.CircleGeometry(0.28, 16),
        new THREE.MeshBasicMaterial({ color: 0xffdca0 }));
      disc.rotation.x = -Math.PI / 2; disc.position.set(side * (W / 2 - 0.55), 0.016, z); parent.add(disc);
    });
  }
}

// ---- Blender-authored Persia architecture (build_persia_assets.py) ----
const PERSIA_GLB = "assets/models/persia.glb";
let persiaMats = null;
let persiaReliefTex = null;

// A shallow Achaemenid guard/tribute-bearer relief (robed, bearded, with spear).
function persiaRelief() {
  if (persiaReliefTex) return persiaReliefTex;
  const c = document.createElement("canvas");
  c.width = 150; c.height = 340;
  const g = c.getContext("2d");
  g.fillStyle = "#a99a7e"; g.fillRect(0, 0, 150, 340);
  g.strokeStyle = "#6a5e46"; g.lineWidth = 3; g.fillStyle = "#988a6e";
  // robed body
  g.beginPath(); g.moveTo(55, 80); g.lineTo(95, 80); g.lineTo(104, 320); g.lineTo(46, 320); g.closePath(); g.fill(); g.stroke();
  // pleats
  g.lineWidth = 1.5; for (let x = 54; x < 100; x += 8) { g.beginPath(); g.moveTo(x, 130); g.lineTo(x + 2, 318); g.stroke(); }
  // head + beard
  g.lineWidth = 3; g.beginPath(); g.arc(75, 62, 20, 0, Math.PI * 2); g.fill(); g.stroke();
  g.beginPath(); g.moveTo(60, 72); g.lineTo(90, 72); g.lineTo(83, 118); g.lineTo(67, 118); g.closePath(); g.fill(); g.stroke();
  // spear
  g.strokeStyle = "#5c503a"; g.lineWidth = 4; g.beginPath(); g.moveTo(110, 40); g.lineTo(110, 320); g.stroke();
  persiaReliefTex = fileTex("persia_guard.png", toTexture(c));
  return persiaReliefTex;
}

function persiaMaterials(style) {
  if (!persiaMats) {
    const band = glazedBand("#27516e", "#d8b44e", 275);
    band.wrapS = band.wrapT = THREE.RepeatWrapping;
    const wing = fileTex("persia_wingdisk", glazedBand("#8d7442", "#d8b44e", 375));
    persiaMats = {
      stone: style.wall,   // limestone, shared with the walls
      glaze: new THREE.MeshPhongMaterial({ color: 0x27516e, specular: 0x6e8ab0, shininess: 80 }),
      gold: new THREE.MeshPhongMaterial({ color: 0xd8b44e, specular: 0xe6c878, shininess: 80 }),
      relief: new THREE.MeshLambertMaterial({ map: persiaRelief() }),
      band: new THREE.MeshLambertMaterial({ map: band }),
      wing: new THREE.MeshLambertMaterial({ map: wing }),
    };
  }
  return persiaMats;
}

function applyPersiaMats(root, style) {
  const m = persiaMaterials(style);
  root.traverse((o) => {
    if (!o.isMesh) return;
    if (o.name.startsWith("Glaze")) o.material = m.glaze;
    else if (o.name.startsWith("Gold_wing")) o.material = m.wing;
    else if (o.name.startsWith("Gold")) o.material = m.gold;
    else if (o.name.startsWith("Relief")) o.material = m.relief;
    else if (o.name.startsWith("Band")) { const b = m.band.clone(); b.map = m.band.map.clone(); b.map.wrapS = THREE.RepeatWrapping; b.map.repeat.set(6, 1); b.map.needsUpdate = true; o.material = b; }
    else o.material = m.stone;
  });
}

// Persepolitan treatment: tall Achaemenid guard reliefs line the walls between
// the artworks, a blue+gold rosette dado, concealed floor uplights, and linear
// ceiling beams (concept: Hallway-16).
function buildPersiaDecor(parent, style, z0, len, W, H, sideAnchorZ, out) {
  const m = persiaMaterials(style);
  const zc = z0 - len / 2;
  for (const side of [-1, 1]) {
    const arts = sideAnchorZ[String(side)];
    // blue+gold rosette dado low on the wall
    const dado = new THREE.Mesh(scaledUVPlane(len, 0.55, len / 1.2, 1),
      new THREE.MeshLambertMaterial({ map: m.band.map.clone() }));
    dado.material.map.wrapS = dado.material.map.wrapT = THREE.RepeatWrapping;
    dado.position.set(side * (W / 2 - 0.03), 0.5, zc);
    dado.rotation.y = -side * Math.PI / 2;
    parent.add(dado);
    // tall guard reliefs between the artworks + floor uplights
    midSpots(arts, z0, len, 2.8).forEach((z, i) => {
      if (arts.some((a) => Math.abs(a - z) < 1.2)) return;
      spawnPart(PERSIA_GLB, "Relief", (r) => {
        applyPersiaMats(r, style);
        r.position.set(side * (W / 2 - 0.01), 0.9, z);
        r.rotation.y = -side * Math.PI / 2;
        parent.add(r);
      });
      const up = new THREE.PointLight(0xffe0aa, 4.5, 6, 2);
      up.position.set(side * (W / 2 - 0.55), 0.3, z);
      up.visible = false; parent.add(up); out.lights.push(up);
      const disc = new THREE.Mesh(new THREE.CircleGeometry(0.28, 16),
        new THREE.MeshBasicMaterial({ color: 0xffe0aa }));
      disc.rotation.x = -Math.PI / 2; disc.position.set(side * (W / 2 - 0.55), 0.016, z); parent.add(disc);
    });
  }
  // linear ceiling beams
  const nb = Math.max(2, Math.round(len / 2.4));
  for (let i = 0; i <= nb; i++) {
    const z = Math.min(z0 - 0.4, Math.max(z0 - len + 0.4, z0 - i * (len / nb)));
    spawnPart(PERSIA_GLB, "Beam", (b) => {
      applyPersiaMats(b, style);
      b.position.set(0, 0, z);
      parent.add(b);
    });
  }
}

// ---- Blender-authored Islamic (Moorish) architecture (build_islamic_assets.py) ----
const ISLAMIC_GLB = "assets/models/islamic.glb";
let islamicMats = null;

function islamicMaterials(style) {
  if (!islamicMats) {
    const zellij = fileTex("islamic_zellij", starTile("#1d4e6b", "#e4d9b8", "#3f8ea6", 278));
    zellij.wrapS = zellij.wrapT = THREE.RepeatWrapping;
    const arab = fileTex("islamic_arabesque.png", starTile("#e6ddc8", "#c9a24e", "#b8a888", 279));
    arab.wrapS = arab.wrapT = THREE.RepeatWrapping;
    const muqarnas = fileTex("islamic_muqarnas", starTile("#e6ddc8", "#c9a24e", "#b8a888", 379));
    muqarnas.wrapS = muqarnas.wrapT = THREE.RepeatWrapping;
    islamicMats = {
      stucco: style.wall,   // carved cream stucco, shared with the walls
      zellij: new THREE.MeshLambertMaterial({ map: zellij }),
      arabesque: new THREE.MeshLambertMaterial({ map: arab }),
      muqarnas: new THREE.MeshLambertMaterial({ map: muqarnas }),
      brass: new THREE.MeshPhongMaterial({ color: 0x9c7a34, specular: 0xe6c878, shininess: 90 }),
      glow: new THREE.MeshBasicMaterial({ color: 0xffdca0 }),
      wood: new THREE.MeshLambertMaterial({ color: 0x2a1c10 }),
    };
  }
  return islamicMats;
}

function applyIslamicMats(root, style) {
  const m = islamicMaterials(style);
  root.traverse((o) => {
    if (!o.isMesh) return;
    if (o.name.startsWith("Zellij")) o.material = m.zellij;
    else if (o.name.startsWith("Arabesque")) o.material = m.arabesque;
    else if (o.name.startsWith("Muqarnas")) o.material = m.muqarnas;
    else if (o.name.startsWith("Brass")) o.material = m.brass;
    else if (o.name.startsWith("Glow")) o.material = m.glow;
    else if (o.name.startsWith("Wood")) o.material = m.wood;
    else o.material = m.stucco;
  });
}

// Moorish treatment: a muqarnas honeycomb cornice, carved arabesque panels over
// a zellij tile dado, glowing mashrabiya screens and brass lanterns between the
// artworks, and a star medallion on the floor (concept: Hallway-17).
function buildIslamicDecor(parent, style, z0, len, W, H, sideAnchorZ, out) {
  const m = islamicMaterials(style);
  const zc = z0 - len / 2;
  for (const side of [-1, 1]) {
    const arts = sideAnchorZ[String(side)];
    // zellij tile dado
    const dado = new THREE.Mesh(scaledUVPlane(len, 1.0, len / 1.4, 1),
      new THREE.MeshLambertMaterial({ map: m.zellij.map.clone() }));
    dado.material.map.wrapS = dado.material.map.wrapT = THREE.RepeatWrapping;
    dado.position.set(side * (W / 2 - 0.03), 0.62, zc);
    dado.rotation.y = -side * Math.PI / 2;
    parent.add(dado);
    // muqarnas honeycomb cornice along the wall top
    const ncr = Math.max(3, Math.round(len / 0.9));
    for (let i = 0; i < ncr; i++) {
      const z = z0 - 0.5 - i * ((len - 1.0) / (ncr - 1));
      spawnPart(ISLAMIC_GLB, "Muqarnas", (mq) => {
        applyIslamicMats(mq, style);
        mq.position.set(side * (W / 2 - 0.02), H - 0.85, z);
        mq.rotation.y = -side * Math.PI / 2;
        parent.add(mq);
      });
    }
    // arabesque panels / mashrabiya screens / lanterns between the artworks
    midSpots(arts, z0, len, 2.8).forEach((z, i) => {
      if (arts.some((a) => Math.abs(a - z) < 1.2)) return;
      const kind = i % 3;
      if (kind === 0) {
        const panel = new THREE.Mesh(scaledUVPlane(1.3, 2.2, 1, 1),
          new THREE.MeshLambertMaterial({ map: m.arabesque.map.clone() }));
        panel.material.map.wrapS = panel.material.map.wrapT = THREE.RepeatWrapping;
        panel.position.set(side * (W / 2 - 0.03), 2.6, z);
        panel.rotation.y = -side * Math.PI / 2;
        parent.add(panel);
      } else if (kind === 1) {
        spawnPart(ISLAMIC_GLB, "Mashrabiya", (ms) => {
          applyIslamicMats(ms, style);
          ms.position.set(side * (W / 2 - 0.02), 0.9, z);
          ms.rotation.y = -side * Math.PI / 2;
          parent.add(ms);
        });
      } else {
        spawnPart(ISLAMIC_GLB, "Lantern", (l) => {
          applyIslamicMats(l, style);
          l.position.set(side * (W / 2 - 0.7), 3.0, z);
          parent.add(l);
        });
        const gl = new THREE.PointLight(0xffdca0, 5, 5, 2);
        gl.position.set(side * (W / 2 - 0.7), 2.7, z);
        gl.visible = false; parent.add(gl); out.lights.push(gl);
      }
    });
  }
  // star medallion on the floor centre
  const nm2 = Math.max(1, Math.round(len / 6));
  for (let i = 0; i < nm2; i++) {
    const z = z0 - (i + 0.5) * (len / nm2);
    const med = new THREE.Mesh(scaledUVPlane(2.0, 2.0, 1, 1),
      new THREE.MeshLambertMaterial({ map: m.zellij.map.clone() }));
    med.material.map.wrapS = med.material.map.wrapT = THREE.RepeatWrapping;
    med.rotation.x = -Math.PI / 2; med.position.set(0, 0.016, z); parent.add(med);
  }
}

// ---- Ottoman/Safavid (reuses islamic.glb parts, Iznik palette) ----
let ottomanMats = null;

function ottomanMaterials(style) {
  if (!ottomanMats) {
    const iznik = fileTex("ottoman_iznik", starTile("#eef0ea", "#7c1f2a", "#27516e", 281));
    iznik.wrapS = iznik.wrapT = THREE.RepeatWrapping;
    const floral = fileTex("ottoman_iznik", starTile("#e8eef2", "#1c6e8c", "#7c1f2a", 282));
    floral.wrapS = floral.wrapT = THREE.RepeatWrapping;
    ottomanMats = {
      stucco: style.wall,
      zellij: new THREE.MeshLambertMaterial({ map: iznik }),
      arabesque: new THREE.MeshLambertMaterial({ map: floral }),
      brass: new THREE.MeshPhongMaterial({ color: 0x9c7a34, specular: 0xe6c878, shininess: 90 }),
      glow: new THREE.MeshBasicMaterial({ color: 0xffdca0 }),
      wood: new THREE.MeshLambertMaterial({ color: 0x2a1c10 }),
      marble: new THREE.MeshPhongMaterial({ color: 0xd8d2c4, specular: 0x8a8578, shininess: 50 }),
      carpet: new THREE.MeshLambertMaterial({ color: 0x8a2420 }),
    };
  }
  return ottomanMats;
}

function applyOttomanMats(root, style) {
  const m = ottomanMaterials(style);
  root.traverse((o) => {
    if (!o.isMesh) return;
    if (o.name.startsWith("Zellij")) o.material = m.zellij;
    else if (o.name.startsWith("Arabesque")) o.material = m.arabesque;
    else if (o.name.startsWith("Brass")) o.material = m.brass;
    else if (o.name.startsWith("Glow")) o.material = m.glow;
    else if (o.name.startsWith("Wood")) o.material = m.wood;
    else o.material = m.stucco;
  });
}

// Ottoman treatment: tall Iznik tile dado + arabesque tile panels, a muqarnas
// cornice, brass hanging lamps down the centre, a red carpet runner, and marble
// wainscot (concept: Hallway-18). Reuses the islamic.glb parts.
function buildOttomanDecor(parent, style, z0, len, W, H, sideAnchorZ, out) {
  const m = ottomanMaterials(style);
  const zc = z0 - len / 2;
  // red carpet runner + marble border on the floor
  const runner = new THREE.Mesh(box, m.carpet);
  runner.scale.set(2.0, 0.02, len - 0.6); runner.position.set(0, 0.02, zc); parent.add(runner);
  for (const side of [-1, 1]) {
    const arts = sideAnchorZ[String(side)];
    // tall Iznik tile dado + marble wainscot base
    const dado = new THREE.Mesh(scaledUVPlane(len, 2.6, len / 1.2, 2),
      new THREE.MeshLambertMaterial({ map: m.zellij.map.clone() }));
    dado.material.map.wrapS = dado.material.map.wrapT = THREE.RepeatWrapping;
    dado.position.set(side * (W / 2 - 0.03), 1.7, zc);
    dado.rotation.y = -side * Math.PI / 2;
    parent.add(dado);
    const wains = new THREE.Mesh(box, m.marble);
    wains.scale.set(0.06, 0.5, len); wains.position.set(side * (W / 2 - 0.02), 0.25, zc); parent.add(wains);
    // muqarnas cornice
    const ncr = Math.max(3, Math.round(len / 0.9));
    for (let i = 0; i < ncr; i++) {
      const z = z0 - 0.5 - i * ((len - 1.0) / (ncr - 1));
      spawnPart(ISLAMIC_GLB, "Muqarnas", (mq) => {
        applyOttomanMats(mq, style);
        mq.position.set(side * (W / 2 - 0.02), H - 0.85, z);
        mq.rotation.y = -side * Math.PI / 2;
        parent.add(mq);
      });
    }
    // arabesque tile panels + mashrabiya between the artworks
    midSpots(arts, z0, len, 3.0).forEach((z, i) => {
      if (arts.some((a) => Math.abs(a - z) < 1.2)) return;
      if (i % 2 === 0) {
        const panel = new THREE.Mesh(scaledUVPlane(1.2, 1.6, 1, 1),
          new THREE.MeshLambertMaterial({ map: m.arabesque.map.clone() }));
        panel.material.map.wrapS = panel.material.map.wrapT = THREE.RepeatWrapping;
        panel.position.set(side * (W / 2 - 0.03), 3.4, z);
        panel.rotation.y = -side * Math.PI / 2;
        parent.add(panel);
      } else {
        spawnPart(ISLAMIC_GLB, "Mashrabiya", (ms) => {
          applyOttomanMats(ms, style);
          ms.position.set(side * (W / 2 - 0.02), 0.9, z);
          ms.rotation.y = -side * Math.PI / 2;
          parent.add(ms);
        });
      }
    });
  }
  // brass hanging lamps down the centre
  const nl = Math.max(1, Math.round(len / 3.5));
  for (let i = 0; i < nl; i++) {
    const z = z0 - (i + 0.5) * (len / nl);
    spawnPart(ISLAMIC_GLB, "Lantern", (l) => {
      applyOttomanMats(l, style);
      l.position.set(0, H - 0.9, z);
      parent.add(l);
    });
    const gl = new THREE.PointLight(0xffdca0, 8, 8, 2);
    gl.position.set(0, H - 1.3, z);
    gl.visible = false; parent.add(gl); out.lights.push(gl);
  }
}

// ---- Ancient Oceania rock-shelter (rock art + torches, reuses ochre atlas) ----
let rockMats = null;
let rockAnimalTex = null;
let ochreHandTex = null;

// ochre x-ray animal rock-art (kangaroo-ish), on transparent ground (alphaTest)
function rockAnimal() {
  if (rockAnimalTex) return rockAnimalTex;
  const c = document.createElement("canvas");
  c.width = 200; c.height = 160;
  const g = c.getContext("2d");
  g.clearRect(0, 0, 200, 160);
  g.fillStyle = "#8a3a1e"; g.strokeStyle = "#5c2410"; g.lineWidth = 3;
  // body
  g.beginPath(); g.ellipse(100, 90, 55, 30, 0, 0, Math.PI * 2); g.fill();
  // head + neck
  g.beginPath(); g.moveTo(150, 80); g.quadraticCurveTo(180, 60, 178, 30); g.lineTo(168, 30); g.quadraticCurveTo(168, 62, 140, 78); g.closePath(); g.fill();
  // legs + tail
  g.lineWidth = 8; g.lineCap = "round";
  g.beginPath(); g.moveTo(80, 110); g.lineTo(70, 150); g.stroke();
  g.beginPath(); g.moveTo(110, 112); g.lineTo(120, 150); g.stroke();
  g.beginPath(); g.moveTo(50, 95); g.quadraticCurveTo(15, 110, 10, 150); g.stroke();
  // x-ray ribs
  g.strokeStyle = "#e8d5b0"; g.lineWidth = 2;
  for (let i = 0; i < 5; i++) { g.beginPath(); g.moveTo(80 + i * 12, 68); g.lineTo(80 + i * 12, 112); g.stroke(); }
  rockAnimalTex = toTexture(c);
  return rockAnimalTex;
}

function ochreHands() {
  if (!ochreHandTex) {
    ochreHandTex = new THREE.TextureLoader().load("assets/textures/prehistoric/ochre_atlas.png");
    ochreHandTex.colorSpace = THREE.SRGBColorSpace;
  }
  return ochreHandTex;
}

function rockMaterials(style) {
  if (!rockMats) {
    rockMats = {
      rock: style.wall,
      // scattered floor stones: warm mid rock, darker than the lit wall so they
      // read as stones, not glowing orange blobs
      stone: new THREE.MeshLambertMaterial({ color: 0x8a6c47 }),
      dark: new THREE.MeshLambertMaterial({ color: 0x2a1c12 }),
      hands: new THREE.MeshBasicMaterial({ map: ochreHands(), transparent: true, alphaTest: 0.4, depthWrite: false }),
      animal: new THREE.MeshBasicMaterial({ map: rockAnimal(), transparent: true, alphaTest: 0.4, depthWrite: false }),
      glow: new THREE.MeshBasicMaterial({ color: 0xffb060 }),
    };
  }
  return rockMats;
}

// Rock-shelter treatment: ochre hand-stencil + x-ray animal rock-art on the
// walls, flaming wall torches, rock-ledge niches with artifacts, scattered
// boulders, and concealed floor uplights (concept: Hallway-29).
function buildRockshelterDecor(parent, style, z0, len, W, H, sideAnchorZ, out) {
  const m = rockMaterials(style);
  const rand = rng(920);
  const rockGeo = new THREE.DodecahedronGeometry(1, 0);
  for (const side of [-1, 1]) {
    const arts = sideAnchorZ[String(side)];
    // The walls are the hero: densely painted rock-art with frequent warm
    // torches. Fill every open spot — hand stencils (low) alternate with x-ray
    // animals (mid); a flaming torch sits above the hand-stencil spots so the
    // gallery glows warmly like the concept.
    midSpots(arts, z0, len, 2.6).forEach((z, i) => {
      if (arts.some((a) => Math.abs(a - z) < 1.2)) return;
      const wx = side * (W / 2 - 0.05);
      if (i % 2 === 0) {
        // ochre hand stencils, clustered low on the rock face
        const hands = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.6), m.hands);
        hands.position.set(wx, 1.75, z);
        hands.rotation.y = -side * Math.PI / 2;
        parent.add(hands);
        // flaming wall torch above them (the signature warm light)
        const bracket = new THREE.Mesh(box, m.dark);
        bracket.scale.set(0.12, 0.12, 0.4);
        bracket.position.set(side * (W / 2 - 0.12), 2.55, z);
        parent.add(bracket);
        const flame = createFlame({ scale: 0.46, intensity: 12, dist: 6.5, seed: i + 5 });
        flame.group.position.set(side * (W / 2 - 0.34), 2.75, z);
        flame.light.visible = false;
        parent.add(flame.group);
        out.fires.push(flame); out.lights.push(flame.light);
      } else {
        // x-ray animal rock-art at eye level
        const an = new THREE.Mesh(new THREE.PlaneGeometry(1.75, 1.4), m.animal);
        an.position.set(wx, 2.15, z);
        an.rotation.y = -side * Math.PI / 2;
        parent.add(an);
        // a smaller hand cluster beside it, lower down
        const h2 = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 1.0), m.hands);
        h2.position.set(wx, 1.2, z);
        h2.rotation.y = -side * Math.PI / 2;
        parent.add(h2);
      }
    });
    // rock-ledge niches with an artifact + uplight between artworks
    for (const z of interiorMidZ(arts, z0, len)) {
      const ledge = new THREE.Mesh(box, m.rock);
      ledge.scale.set(0.5, 0.3, 1.0);
      ledge.position.set(side * (W / 2 - 0.25), 0.85, z);
      parent.add(ledge);
      const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.16, 0.3, 12), m.dark);
      pot.position.set(side * (W / 2 - 0.25), 1.15, z);
      parent.add(pot);
      const up = new THREE.PointLight(0xffb060, 4, 5, 2);
      up.position.set(side * (W / 2 - 0.55), 0.6, z);
      up.visible = false; parent.add(up); out.lights.push(up);
      const disc = new THREE.Mesh(new THREE.CircleGeometry(0.26, 14), m.glow);
      disc.rotation.x = -Math.PI / 2; disc.position.set(side * (W / 2 - 0.55), 0.016, z); parent.add(disc);
    }
    // scattered small stones hugging the wall base (concept: a low line of
    // rubble along each wall) — smaller and darker than the lit wall so they
    // read as stones, not glowing blobs
    const nb = Math.max(7, Math.round(len));
    for (let i = 0; i < nb; i++) {
      const b = new THREE.Mesh(rockGeo, m.stone);
      const s = 0.09 + rand() * 0.17;
      b.scale.set(s, s * (0.55 + rand() * 0.4), s);
      b.position.set(side * (W / 2 - 0.18 - rand() * 0.5), s * 0.35, z0 - 0.8 - rand() * (len - 1.6));
      b.rotation.set(rand() * 0.5, rand() * Math.PI, rand() * 0.5);
      parent.add(b);
    }
  }
}

// ---- Blender-authored Oceania architecture (build_oceanic_assets.py) ----
const OCEANIC_GLB = "assets/models/oceanic.glb";
let oceanicMats = null;
let navStarTex = null;

// A navigation-star chart screen: compass rose + gold stars on ocean blue.
function navStar() {
  if (navStarTex) return navStarTex;
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const g = c.getContext("2d");
  const grad = g.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, "#12314e"); grad.addColorStop(1, "#0a1f33");
  g.fillStyle = grad; g.fillRect(0, 0, 256, 256);
  const rand = rng(930);
  // scattered stars
  g.fillStyle = "#e8d59a";
  for (let i = 0; i < 60; i++) { g.beginPath(); g.arc(rand() * 256, rand() * 256, 1 + rand() * 1.8, 0, Math.PI * 2); g.fill(); }
  // compass rose
  g.save(); g.translate(128, 128);
  g.strokeStyle = "#e8d59a"; g.lineWidth = 2;
  for (let k = 0; k < 8; k++) {
    const a = k * Math.PI / 4, r = k % 2 ? 40 : 78;
    g.beginPath(); g.moveTo(0, 0); g.lineTo(r * Math.cos(a), r * Math.sin(a)); g.stroke();
  }
  g.fillStyle = "#f0dca0"; g.beginPath();
  for (let k = 0; k < 16; k++) { const a = k * Math.PI / 8, r = k % 2 ? 14 : 42; const x = r * Math.cos(a), y = r * Math.sin(a); k ? g.lineTo(x, y) : g.moveTo(x, y); }
  g.closePath(); g.fill(); g.restore();
  navStarTex = toTexture(c);
  return navStarTex;
}

function oceanicMaterials(style) {
  if (!oceanicMats) {
    oceanicMats = {
      timber: new THREE.MeshLambertMaterial({ color: 0x2a1a0e }),
      weave: style.wall,
      shell: new THREE.MeshPhongMaterial({ color: 0xd8d2c2, specular: 0xb0c0c8, shininess: 60 }),
      star: new THREE.MeshBasicMaterial({ map: navStar() }),
      rope: new THREE.MeshLambertMaterial({ color: 0x9c7a44 }),
      glow: new THREE.MeshBasicMaterial({ color: 0xffdca0 }),
    };
  }
  return oceanicMats;
}

function applyOceanicMats(root, style) {
  const m = oceanicMaterials(style);
  root.traverse((o) => {
    if (!o.isMesh) return;
    if (o.name.startsWith("Weave")) o.material = m.weave;
    else if (o.name.startsWith("Shell")) o.material = m.shell;
    else if (o.name.startsWith("Star")) o.material = m.star;
    else if (o.name.startsWith("Rope")) o.material = m.rope;
    else if (o.name.startsWith("Glow")) o.material = m.glow;
    else o.material = m.timber;
  });
}

// Pacific treatment: a canoe-rib timber ceiling, lashed carved posts, glowing
// navigation-star screens and woven lantern sconces between the artworks, and a
// shell-inlay frieze (concept: Hallway-30/31).
function buildOceanicDecor(parent, style, z0, len, W, H, sideAnchorZ, out) {
  const m = oceanicMaterials(style);
  const zc = z0 - len / 2;
  // canoe-rib ceiling: squashed timber arches spanning the hall
  const ribGeo = new THREE.TorusGeometry(3.5, 0.06, 6, 20, Math.PI);
  const nr = Math.max(4, Math.round(len / 0.95));
  for (let i = 0; i <= nr; i++) {
    const z = Math.min(z0 - 0.3, Math.max(z0 - len + 0.3, z0 - i * (len / nr)));
    const rib = new THREE.Mesh(ribGeo, m.timber);
    rib.scale.set(1, 0.52, 1);
    rib.position.set(0, 2.6, z);
    parent.add(rib);
  }
  // ridge beam along the crown
  const ridge = new THREE.Mesh(box, m.timber);
  ridge.scale.set(0.16, 0.16, len); ridge.position.set(0, H - 0.12, zc); parent.add(ridge);
  for (const side of [-1, 1]) {
    const arts = sideAnchorZ[String(side)];
    // shell-inlay frieze high on the wall
    const frieze = new THREE.Mesh(box, m.shell);
    frieze.scale.set(0.05, 0.16, len); frieze.position.set(side * (W / 2 - 0.03), 3.3, zc); parent.add(frieze);
    // lashed posts at the bay divisions
    for (const z of midSpots(arts, z0, len, 3.0)) {
      if (arts.some((a) => Math.abs(a - z) < 1.2)) continue;
      spawnPart(OCEANIC_GLB, "Post", (p) => {
        applyOceanicMats(p, style);
        p.position.set(side * (W / 2 - 0.02), 0, z);
        p.rotation.y = -side * Math.PI / 2;
        parent.add(p);
      });
    }
    // nav-star screens + woven sconces alternate between the artworks
    interiorMidZ(arts, z0, len).forEach((z, i) => {
      if (i % 2 === 0) {
        const scr = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 2.0), m.star);
        scr.position.set(side * (W / 2 - 0.04), 2.0, z);
        scr.rotation.y = -side * Math.PI / 2;
        parent.add(scr);
        const gl = new THREE.PointLight(0x9db8e8, 3, 5, 2);
        gl.position.set(side * (W / 2 - 0.5), 2.0, z);
        gl.visible = false; parent.add(gl); out.lights.push(gl);
      } else {
        spawnPart(OCEANIC_GLB, "Sconce", (s) => {
          applyOceanicMats(s, style);
          s.position.set(side * (W / 2 - 0.03), 2.4, z);
          s.rotation.y = -side * Math.PI / 2;
          parent.add(s);
        });
        const gl = new THREE.PointLight(0xffdca0, 4.5, 5, 2);
        gl.position.set(side * (W / 2 - 0.4), 2.4, z);
        gl.visible = false; parent.add(gl); out.lights.push(gl);
      }
    });
  }
}

// Shared loader for the concept-art band/wood albedo strips
function albedoTex(file) {
  const t = new THREE.TextureLoader().load("assets/textures/" + file);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

// Interior midpoints between same-side artworks, kept clear of the corners —
// shared placement rule for wall niches, jalis, and sconces.
function interiorMidZ(arts, z0, len) {
  const spots = [];
  for (let i = 0; i < arts.length - 1; i++) spots.push((arts[i] + arts[i + 1]) / 2);
  return spots.filter((z) => z <= z0 - 2.2 && z >= z0 - len + 2.2);
}

// ---- Blender-authored Kingdoms/Sahel architecture (build_kingdoms_assets.py) ----
const KINGDOMS_GLB = "assets/models/kingdoms.glb";
let kingdomsMats = null;

function kingdomsMaterials(style) {
  if (!kingdomsMats) {
    kingdomsMats = {
      wall: style.wall, // banco plaster, shared with the walls
      band: new THREE.MeshLambertMaterial({ map: albedoTex("kingdoms_band.jpg") }),
      timber: new THREE.MeshLambertMaterial({ color: 0x3a2817 }),
      terra: new THREE.MeshLambertMaterial({ color: 0x8a4a2a }),
      glow: new THREE.MeshBasicMaterial({ color: 0xffc98a }),
    };
  }
  return kingdomsMats;
}

function applyKingdomsMats(root, style) {
  const m = kingdomsMaterials(style);
  root.traverse((o) => {
    if (!o.isMesh) return;
    if (o.name.startsWith("Band")) o.material = m.band;
    else if (o.name.startsWith("Timber")) o.material = m.timber;
    else if (o.name.startsWith("Terra")) o.material = m.terra;
    else if (o.name.startsWith("Glow")) o.material = m.glow;
    else o.material = m.wall;
  });
}

// Banco gallery: sculpted artifact niches between the artworks (uplit from
// within), and a dense toron timber ceiling (concept: Hallway-27).
function buildKingdomsDecor(parent, style, z0, len, W, H, sideAnchorZ) {
  for (const side of [-1, 1]) {
    for (const z of interiorMidZ(sideAnchorZ[String(side)], z0, len)) {
      spawnPart(KINGDOMS_GLB, "Niche", (n) => {
        applyKingdomsMats(n, style);
        n.position.set(side * (W / 2 - 0.01), 0, z);
        n.rotation.y = -side * Math.PI / 2;
        parent.add(n);
      });
    }
  }
  const nb = Math.max(2, Math.round(len / 1.05));
  for (let i = 0; i < nb; i++) {
    spawnPart(KINGDOMS_GLB, "Beam", (b) => {
      applyKingdomsMats(b, style);
      b.position.set(0, 0, z0 - 0.6 - i * ((len - 1.2) / (nb - 1)));
      parent.add(b);
    });
  }
}

// ---- Blender-authored Traditions architecture (build_traditions_assets.py) ----
const TRADITIONS_GLB = "assets/models/traditions.glb";
let traditionsMats = null;

function traditionsMaterials(style) {
  if (!traditionsMats) {
    traditionsMats = {
      wall: style.wall, // earthen plaster, shared with the walls
      wood: new THREE.MeshLambertMaterial({ map: albedoTex("traditions_wood.jpg") }),
      glow: new THREE.MeshBasicMaterial({ color: 0xffc177 }),
      terra: new THREE.MeshLambertMaterial({ color: 0x6b4426 }),
    };
  }
  return traditionsMats;
}

function applyTraditionsMats(root, style) {
  const m = traditionsMaterials(style);
  root.traverse((o) => {
    if (!o.isMesh) return;
    if (o.name.startsWith("Wood")) o.material = m.wood;
    else if (o.name.startsWith("Glow")) o.material = m.glow;
    else if (o.name.startsWith("Terra")) o.material = m.terra;
    else o.material = m.wall;
  });
}

// Timber-and-plaster gallery: display niches and woven lantern sconces
// alternate at the wall midpoints (concept: Hallway-28).
function buildTraditionsDecor(parent, style, z0, len, W, H, sideAnchorZ) {
  const every = style.columns?.every || 5.6;
  for (const side of [-1, 1]) {
    // Same spot list as buildColumns: posts take the EVEN spots, so the wall
    // niches/sconces take the ODD ones — they never share a z with a post.
    midSpots(sideAnchorZ[String(side)], z0, len, every).forEach((z, si) => {
      if (si % 2 === 0) return;
      const decorIdx = (si - 1) / 2;
      if (decorIdx % 2 === 0) {
        spawnPart(TRADITIONS_GLB, "Niche", (n) => {
          applyTraditionsMats(n, style);
          n.position.set(side * (W / 2 - 0.01), 0, z);
          n.rotation.y = -side * Math.PI / 2;
          parent.add(n);
        });
      } else {
        spawnPart(TRADITIONS_GLB, "Sconce", (s) => {
          applyTraditionsMats(s, style);
          s.position.set(side * (W / 2 - 0.04), 2.5, z);
          s.rotation.y = -side * Math.PI / 2;
          parent.add(s);
        });
      }
    });
  }
}

// ---- Blender-authored 19th-c salon architecture (build_amsalon_assets.py) ----
const AMSALON_GLB = "assets/models/amsalon.glb";
let amsalonMats = null;

function amsalonMaterials(style) {
  if (!amsalonMats) {
    amsalonMats = {
      paper: style.wall, // damask wallpaper, shared with the walls
      wood: new THREE.MeshPhongMaterial({ color: 0x3a2214, specular: 0x2a1c10, shininess: 30 }),
      // polished/mirror-bright gilt: high shininess + a near-white specular
      // so the highlight reads as buffed metal, not matte brass
      gilt: new THREE.MeshPhongMaterial({ color: 0xcaa348, specular: 0xfff1c4, shininess: 130 }),
      // the ornate gilt trim BAND texture — the exact material the corridor
      // walls use for their crown molding, so the doorway line matches
      band: style.band.mat,
      globe: new THREE.MeshBasicMaterial({ color: 0xfff2d4 }),
    };
  }
  return amsalonMats;
}

function applyAmsalonMats(root, style) {
  const m = amsalonMaterials(style);
  root.traverse((o) => {
    if (!o.isMesh) return;
    if (o.name.startsWith("Paper")) o.material = m.paper;
    else if (o.name.startsWith("Band")) o.material = m.band;   // textured crown
    else if (o.name.startsWith("Gilt")) o.material = m.gilt;
    else if (o.name.startsWith("Globe")) o.material = m.globe;
    else o.material = m.wood;
  });
}

// Salon gallery: board-and-batten wainscot below the damask (INTERIOR walls
// only — the portal facade carries no wainscot of its own, so it never
// crosses the doorway), a gilt ceiling band that bridges every wall-to-wall
// junction including across the entrance, gaslight sconces with real bulb
// light between the paintings (concept: Hallway-05-americas-19th-century).
function buildAmsalonDecor(parent, style, z0, len, W, H, sideAnchorZ, lights) {
  const m = amsalonMaterials(style);
  const zc = z0 - len / 2;
  for (const side of [-1, 1]) {
    // wainscot: baseboard + panel field + gilt dado rail — kept BELOW the
    // frame bottoms (gold frames reach down to ~0.93, so rail tops at 0.87)
    const base = new THREE.Mesh(box, m.wood);
    base.scale.set(len, 0.2, 0.09);
    base.position.set(side * (W / 2 - 0.045), 0.088, zc);
    base.rotation.y = -side * Math.PI / 2;
    parent.add(base);
    const panel = new THREE.Mesh(box, m.wood);
    panel.scale.set(len, 0.62, 0.05);
    panel.position.set(side * (W / 2 - 0.025), 0.49, zc);
    panel.rotation.y = -side * Math.PI / 2;
    parent.add(panel);
    // board-and-batten: vertical strips proud of the panel field, evenly
    // spaced along the whole interior wall run
    const nBatten = Math.max(2, Math.round(len / 0.62));
    for (let i = 0; i <= nBatten; i++) {
      const bz = z0 - i * (len / nBatten);
      const batten = new THREE.Mesh(box, m.wood);
      batten.scale.set(0.07, 0.60, 0.018);
      batten.position.set(side * (W / 2 - 0.012), 0.49, bz);
      batten.rotation.y = -side * Math.PI / 2;
      parent.add(batten);
    }
    const rail = new THREE.Mesh(box, m.gilt);
    rail.scale.set(len, 0.055, 0.08);
    rail.position.set(side * (W / 2 - 0.04), 0.845, zc);
    rail.rotation.y = -side * Math.PI / 2;
    parent.add(rail);
    // gaslight sconces between the paintings, with a real warm point light
    for (const z of interiorMidZ(sideAnchorZ[String(side)], z0, len)) {
      spawnPart(AMSALON_GLB, "Sconce", (s) => {
        applyAmsalonMats(s, style);
        s.position.set(side * (W / 2 - 0.03), 2.5, z);
        s.rotation.y = -side * Math.PI / 2;
        parent.add(s);
      });
      const bulb = new THREE.PointLight(0xffdca0, 5.5, 6, 2.2);
      bulb.position.set(side * (W / 2 - 0.32), 2.24, z);
      bulb.visible = false;
      parent.add(bulb);
      lights.push(bulb);
    }
  }
  // The ceiling crown now connects to the doorway via a matching gilt strip
  // baked onto the portal's own shoulders (Gilt_shoulderband in
  // build_amsalon_assets.py) — no JS crossbar here, since a flat bar across
  // the white portal facade read as a floating, disconnected slab rather
  // than a continuation of the room's cornice.
}

// Tile rib-vault bays down the segment, plus one extra transverse arch at
// the far boundary (each bay only carries the arch on its near edge).
function buildGothicVault(parent, style, z0, len) {
  const n = Math.max(1, Math.round(len / GOTHIC_BAY));
  const bayLen = len / n;
  for (let k = 0; k < n; k++) {
    spawnPart(GOTHIC_GLB, "Vault", (bay) => {
      applyGothicMats(bay, style);
      bay.position.set(0, 0, z0 - k * bayLen);
      bay.scale.set(1, 1, bayLen / GOTHIC_BAY);
      parent.add(bay);
    });
  }
  spawnPart(GOTHIC_GLB, "EndArch", (arch) => {
    applyGothicMats(arch, style);
    arch.position.set(0, 0, z0 - len + 0.07);
    parent.add(arch);
  });
  return { n, bayLen };
}

export function segmentLength(nArtworks) {
  return PAD_START + Math.ceil(nArtworks / 2) * SLOT_LEN + PAD_END;
}

function scaledUVPlane(w, h, ru, rv) {
  const g = new THREE.PlaneGeometry(w, h);
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * ru, uv.getY(i) * rv);
  return g;
}

// One corridor segment. opts: { era, label, period, count, z0, doorH, isFirst }
// Returns { anchors, lights, columnNarrows, zEnd, ceilH }
export function buildSegment(parent, style, opts) {
  const { count, z0, label, period } = opts;
  const len = segmentLength(count);
  const zEnd = z0 - len;
  const zc = z0 - len / 2;
  const H = style.ceilH;
  const W = HALL_W;
  const out = { anchors: [], lights: [], fires: [], columnNarrows: [], zEnd, ceilH: H };

  // Floor + ceiling
  const floor = new THREE.Mesh(scaledUVPlane(W, len, W / style.floorUV, len / style.floorUV), style.floor);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, 0, zc);
  parent.add(floor);

  const ceil = new THREE.Mesh(
    scaledUVPlane(W, len, W / (style.ceilUV || 6), len / (style.ceilUV || 6)), style.ceiling);
  ceil.rotation.x = Math.PI / 2;
  ceil.position.set(0, H, zc);
  parent.add(ceil);

  // Walls
  for (const side of [-1, 1]) {
    const wall = new THREE.Mesh(
      scaledUVPlane(len, H, len / style.wallUV, H / style.wallUV), style.wall);
    wall.position.set(side * W / 2, H / 2, zc);
    wall.rotation.y = -side * Math.PI / 2;
    parent.add(wall);

    if (style.band) {
      const b = style.band;
      const band = new THREE.Mesh(
        scaledUVPlane(len, b.h, len / b.uvLen, 1), b.mat);
      band.position.set(side * (W / 2 - 0.02), b.y, zc);
      band.rotation.y = -side * Math.PI / 2;
      parent.add(band);
    }
  }

  // Gothic rib-vault bays (Blender asset) hung under the flat ceiling
  const vaultBays = style.vault === "gothic"
    ? buildGothicVault(parent, style, z0, len) : null;

  // Entry facade: wall with door opening + portal frame + era sign
  buildPortal(parent, style, {
    z: z0, H, W, label, period,
    doorH: opts.doorH ?? 3.5,
    facadeH: opts.prevCeilH, // cover a taller previous era's opening
  });

  // Artwork anchors first (staggered left/right) — columns are then placed
  // BETWEEN the artworks on each wall so nothing is ever hidden behind one.
  const sideAnchorZ = { "-1": [], "1": [] };
  for (let i = 0; i < count; i++) {
    const side = i % 2 === 0 ? -1 : 1; // start left
    const k = Math.floor(i / 2);
    const z = z0 - PAD_START - (k + (side === 1 ? 0.62 : 0.22)) * SLOT_LEN - 1.2;
    sideAnchorZ[String(side)].push(z);
    out.anchors.push({
      x: side * (W / 2 - 0.09), y: 1.85, z,
      rotY: side === -1 ? Math.PI / 2 : -Math.PI / 2,
      frame: style.frame,
    });
  }

  // Columns between the artworks
  if (style.columns) buildColumns(parent, style, z0, len, W, sideAnchorZ, out.columnNarrows);

  // Era-specific gallery treatments
  if (style.decor === "meso") buildMesoDecor(parent, style, z0, len, W, H, sideAnchorZ);
  else if (style.decor === "inca") buildIncaDecor(parent, style, z0, len, W, H, sideAnchorZ, out);
  else if (style.decor === "adobe") buildAdobeDecor(parent, style, z0, len, W, H, sideAnchorZ, out);
  else if (style.decor === "modern") buildModernDecor(parent, style, z0, len, W, H, sideAnchorZ, out);
  else if (style.decor === "asiamodern") buildAsiaModernDecor(parent, style, z0, len, W, H, sideAnchorZ, out);
  else if (style.decor === "indus") buildIndusDecor(parent, style, z0, len, W, H, sideAnchorZ, out);
  else if (style.decor === "khmer") buildKhmerDecor(parent, style, z0, len, W, H, sideAnchorZ, out);
  else if (style.decor === "japan") buildJapanDecor(parent, style, z0, len, W, H, sideAnchorZ, out);
  else if (style.decor === "greek") buildGreekDecor(parent, style, z0, len, W, H, sideAnchorZ, out);
  else if (style.decor === "renaissance") buildRenDecor(parent, style, z0, len, W, H, sideAnchorZ);
  else if (style.decor === "baroque") buildBaroqueDecor(parent, style, z0, len, W, H, sideAnchorZ, out);
  else if (style.decor === "salon") buildSalonDecor(parent, style, z0, len, W, H, sideAnchorZ, out);
  else if (style.decor === "salon2") buildSalon2Decor(parent, style, z0, len, W, H, sideAnchorZ, out);
  else if (style.decor === "neolithic") buildNeolithicDecor(parent, style, z0, len, W, H, sideAnchorZ, out);
  else if (style.decor === "mesopotamia") buildMesoptDecor(parent, style, z0, len, W, H, sideAnchorZ, out);
  else if (style.decor === "persia") buildPersiaDecor(parent, style, z0, len, W, H, sideAnchorZ, out);
  else if (style.decor === "islamic") buildIslamicDecor(parent, style, z0, len, W, H, sideAnchorZ, out);
  else if (style.decor === "ottoman") buildOttomanDecor(parent, style, z0, len, W, H, sideAnchorZ, out);
  else if (style.decor === "rockshelter") buildRockshelterDecor(parent, style, z0, len, W, H, sideAnchorZ, out);
  else if (style.decor === "oceanic") buildOceanicDecor(parent, style, z0, len, W, H, sideAnchorZ, out);
  else if (style.decor === "china") buildChinaDecor(parent, style, z0, len, W, H, sideAnchorZ);
  else if (style.decor === "mughal") buildMughalDecor(parent, style, z0, len, W, H, sideAnchorZ);
  else if (style.decor === "egypt") buildEgyptDecor(parent, style, z0, len, W, H, sideAnchorZ, out);
  else if (style.decor === "kingdoms") buildKingdomsDecor(parent, style, z0, len, W, H, sideAnchorZ);
  else if (style.decor === "traditions") buildTraditionsDecor(parent, style, z0, len, W, H, sideAnchorZ);
  else if (style.decor === "amsalon") buildAmsalonDecor(parent, style, z0, len, W, H, sideAnchorZ, out.lights);

  // Stained-glass windows (gothic) between artwork positions
  if (style.windows === "stained") buildWindows(parent, z0, len, W, H, out.lights, vaultBays);

  // Props (e.g. sahel timber rows)
  if (style.props === "timbers") buildTimbers(parent, z0, len, W, style);

  // Ceiling lights
  const every = style.light.every;
  const n = Math.max(1, Math.round(len / every));
  for (let i = 0; i < n; i++) {
    const z = z0 - (i + 0.5) * (len / n);
    const light = new THREE.PointLight(style.light.color, style.light.intensity, style.light.dist || 17, style.light.decay ?? 2);
    light.position.set(0, H - 0.55 + (style.light.y || 0), z);
    light.visible = false;
    parent.add(light);
    out.lights.push(light);
  }

  return out;
}

export function buildPortal(parent, style, { z, H, W, label, period, doorH = 3.5, doorW = 3.4, facadeH }) {
  // The facade must blank off the full height of BOTH neighbouring eras.
  const FH = Math.max(H, facadeH || 0);

  if (style.portal.glb === "gothic") {
    // Blender facade: pointed-arch opening, archivolts, capitals, hood.
    spawnPart(GOTHIC_GLB, "Portal", (p) => {
      applyGothicMats(p, style);
      p.position.set(0, 0, z);
      parent.add(p);
    });
    if (label) {
      const tex = signTexture(label, period, { mainSize: 64, subSize: 30 });
      const sign = new THREE.Mesh(plane, new THREE.MeshBasicMaterial({ map: tex, transparent: false }));
      sign.scale.set(2.9, 0.72, 1);
      sign.position.set(0, 6.05, z + 0.14); // above the hood molding
      parent.add(sign);
    }
    return;
  }

  if (style.portal.glb === "china") {
    // Blender facade: moon-gate opening, ring frames, eave + brackets.
    spawnPart(CHINA_GLB, "Portal", (p) => {
      applyChinaMats(p, style);
      p.position.set(0, 0, z);
      parent.add(p);
    });
    const m = chinaMaterials(style);
    // flanking lattice windows on the approach face (concept: entrance row).
    // Narrow portrait panels, kept outboard of the gate ring (which bulges
    // to |x| ≈ 2.14 near the windows' lower edge).
    for (const side of [-1, 1]) {
      const frame = new THREE.Mesh(box, m.dark);
      frame.scale.set(1.05, 2.0, 0.10);
      frame.position.set(side * 2.9, 2.55, z + 0.03);
      parent.add(frame);
      const panel = latticePanel(0.85, 1.8);
      panel.position.set(side * 2.9, 2.55, z + 0.09);
      parent.add(panel);
    }
    if (label) {
      // framed plaque above the gate, like the concept's carved frieze
      const frame = new THREE.Mesh(box, m.dark);
      frame.scale.set(3.15, 0.92, 0.10);
      frame.position.set(0, 4.32, z + 0.02);
      parent.add(frame);
      const tex = signTexture(label, period, { mainSize: 64, subSize: 30 });
      const sign = new THREE.Mesh(plane, new THREE.MeshBasicMaterial({ map: tex, transparent: false }));
      sign.scale.set(2.9, 0.72, 1);
      sign.position.set(0, 4.32, z + 0.09);
      parent.add(sign);
    }
    return;
  }

  if (style.portal.glb === "mughal") {
    // Blender facade: cusped-arch opening in a pishtaq frame.
    spawnPart(MUGHAL_GLB, "Portal", (p) => {
      applyMughalMats(p, style);
      p.position.set(0, 0, z);
      parent.add(p);
    });
    // flanking jali windows on the approach face, glowing from within
    for (const side of [-1, 1]) {
      spawnPart(MUGHAL_GLB, "Jali", (j) => {
        applyMughalMats(j, style);
        j.position.set(side * 2.95, 1.0, z + 0.04);
        parent.add(j);
      });
    }
    if (label) {
      // sign sits on the pishtaq's top band, like a calligraphy panel
      const tex = signTexture(label, period, { mainSize: 64, subSize: 30 });
      const sign = new THREE.Mesh(plane, new THREE.MeshBasicMaterial({ map: tex, transparent: false }));
      sign.scale.set(2.9, 0.72, 1);
      sign.position.set(0, 5.05, z + 0.16);
      parent.add(sign);
    }
    return;
  }

  // Blender facades sharing one placement pattern: spawn, re-material, sign.
  const GLB_PORTALS = {
    meso: { glb: MESO_GLB, apply: applyMesoMats, signY: 4.02 },
    inca: { glb: INCA_GLB, apply: applyIncaMats, signY: 4.9 },
    adobe: { glb: ADOBE_GLB, apply: applyAdobeMats, signY: 4.72 },
    modern: { glb: MODERN_GLB, apply: applyModernMats, signY: 4.9 },
    asiamodern: { glb: MODERN_GLB, apply: applyAsiaModernMats, signY: 4.9 },
    indus: { glb: INDUS_GLB, apply: applyIndusMats, signY: 3.98 },
    khmer: { glb: KHMER_GLB, apply: applyKhmerMats, signY: 5.55 },
    japan: { glb: JAPAN_GLB, apply: applyJapanMats, signY: 4.72 },
    greek: { glb: GREEK_GLB, apply: applyGreekMats, signY: 5.55 },
    renaissance: { glb: REN_GLB, apply: applyRenMats, signY: 5.95 },
    baroque: { glb: BAROQUE_GLB, apply: applyBaroqueMats, signY: 5.5 },
    salon: { glb: SALON_GLB, apply: applySalonMats, signY: 5.5 },
    salon2: { glb: SALON_GLB, apply: applySalon2Mats, signY: 5.5 },
    neolithic: { glb: ADOBE_GLB, apply: applyNeoMats, signY: 4.0 },
    mesopotamia: { glb: MESOPT_GLB, apply: applyMesoptMats, signY: 5.6 },
    persia: { glb: PERSIA_GLB, apply: applyPersiaMats, signY: 5.95 },
    islamic: { glb: ISLAMIC_GLB, apply: applyIslamicMats, signY: 5.95 },
    ottoman: { glb: ISLAMIC_GLB, apply: applyOttomanMats, signY: 5.95 },
    oceanic: { glb: OCEANIC_GLB, apply: applyOceanicMats, signY: 4.9 },
    kingdoms: { glb: KINGDOMS_GLB, apply: applyKingdomsMats, signY: 4.5 },
    traditions: { glb: TRADITIONS_GLB, apply: applyTraditionsMats, signY: 4.35 },
    amsalon: { glb: AMSALON_GLB, apply: applyAmsalonMats, signY: 5.05 },
  };
  const gp = GLB_PORTALS[style.portal.glb];
  if (gp) {
    spawnPart(gp.glb, "Portal", (p) => {
      gp.apply(p, style);
      p.position.set(0, 0, z);
      parent.add(p);
    });
    if (label) {
      const tex = signTexture(label, period, { mainSize: 64, subSize: 30 });
      const sign = new THREE.Mesh(plane, new THREE.MeshBasicMaterial({ map: tex, transparent: false }));
      sign.scale.set(2.9, 0.72, 1);
      sign.position.set(0, gp.signY, z + 0.16);
      parent.add(sign);
    }
    return;
  }

  if (style.portal.glb === "egypt") {
    // Blender facade: battered pylon, cavetto cornice, winged-sun frieze.
    spawnPart(EGYPT_GLB, "Portal", (p) => {
      applyEgyptMats(p, style);
      p.position.set(0, 0, z);
      parent.add(p);
    });
    if (label) {
      // on the lintel, low enough to stay visible through the neck doorway
      const tex = signTexture(label, period, { mainSize: 64, subSize: 30 });
      const sign = new THREE.Mesh(plane, new THREE.MeshBasicMaterial({ map: tex, transparent: false }));
      sign.scale.set(2.9, 0.72, 1);
      sign.position.set(0, 4.12, z + 0.16);
      parent.add(sign);
    }
    return;
  }

  const mat = style.portal.mat;
  const t = 0.55; // depth
  const shoulderW = (W - doorW) / 2;
  // shoulders
  for (const side of [-1, 1]) {
    const s = new THREE.Mesh(box, style.wall);
    s.scale.set(shoulderW, FH, t);
    s.position.set(side * (doorW / 2 + shoulderW / 2), FH / 2 - FLOOR_EPS, z - t / 2);
    parent.add(s);
  }
  // header
  const head = new THREE.Mesh(box, style.wall);
  head.scale.set(doorW + 0.02, FH - doorH, t);
  head.position.set(0, doorH + (FH - doorH) / 2, z - t / 2);
  parent.add(head);
  // frame: jambs + lintel proud of the wall
  for (const side of [-1, 1]) {
    const j = new THREE.Mesh(box, mat);
    j.scale.set(0.42, doorH + 0.4, t + 0.3);
    j.position.set(side * (doorW / 2 + 0.14), (doorH + 0.4) / 2 - FLOOR_EPS, z - t / 2);
    parent.add(j);
  }
  const lintel = new THREE.Mesh(box, mat);
  lintel.scale.set(doorW + 1.2, 0.55, t + 0.3);
  lintel.position.set(0, doorH + 0.55, z - t / 2);
  parent.add(lintel);
  if (style.portal.pointed) {
    // simple gable over the lintel suggesting a pointed arch
    for (const side of [-1, 1]) {
      const g = new THREE.Mesh(box, mat);
      g.scale.set(doorW * 0.62, 0.3, t + 0.2);
      g.position.set(side * doorW * 0.23, doorH + 1.05, z - t / 2);
      g.rotation.z = -side * 0.5;
      parent.add(g);
    }
  }
  // era sign facing the approaching visitor (+Z side)
  if (label) {
    const tex = signTexture(label, period, { mainSize: 64, subSize: 30 });
    const sign = new THREE.Mesh(plane, new THREE.MeshBasicMaterial({ map: tex, transparent: false }));
    sign.scale.set(2.9, 0.72, 1);
    sign.position.set(0, doorH + 0.56, z + 0.14);
    parent.add(sign);
  }
}

// Midpoints between neighbouring same-side artworks, plus one near each
// end — shared by columns and by the china wall-post grid so they align.
function midSpots(arts, z0, len, every = 5.6) {
  const spots = [];
  if (arts.length === 0) {
    const n = Math.max(1, Math.floor(len / every));
    for (let i = 0; i <= n; i++) spots.push(z0 - PAD_START * 0.6 - i * ((len - PAD_START) / n));
  } else {
    const first = Math.min(z0 - 1.6, arts[0] + SLOT_LEN / 2);
    if (arts[0] - first >= 2.1) spots.push(first);
    for (let i = 0; i < arts.length - 1; i++) spots.push((arts[i] + arts[i + 1]) / 2);
    const last = Math.max(z0 - len + 1.4, arts[arts.length - 1] - SLOT_LEN / 2);
    if (arts[arts.length - 1] - last >= 2.1) spots.push(last);
  }
  return spots.filter((z) => z <= z0 - 0.9 && z >= z0 - len + 0.9);
}

function buildColumns(parent, style, z0, len, W, sideAnchorZ, columnNarrows) {
  const { type, color, finish, glb } = style.columns;
  if (type === "pilaster") {
    buildPilasters(parent, style, z0, len, W);
    return;
  }
  const mat = glb ? null : finish
    ? new THREE.MeshPhongMaterial({ color, specular: 0x3a352c, shininess: finish === "polished" ? 70 : 25 })
    : new THREE.MeshLambertMaterial({ color });
  const H = style.ceilH;
  for (const side of [-1, 1]) {
    const spots = midSpots(sideAnchorZ[String(side)], z0, len, style.columns.every || 5.6);
    spots.forEach((z, si) => {
      // Traditions posts and the wall niches/sconces both want the between-
      // artwork spots; split them by parity (posts on even spots, decor on
      // odd — see buildTraditionsDecor) so a post never stands in front of a
      // niche.
      if (glb === "traditions" && si % 2 !== 0) return;
      const x = side * (W / 2 - 0.42);
      if (glb === "china") {
        spawnPart(CHINA_GLB, "Column", (c) => {
          applyChinaMats(c, style);
          c.position.set(x, -FLOOR_EPS, z);
          parent.add(c);
        });
      } else if (glb === "traditions") {
        spawnPart(TRADITIONS_GLB, "Post", (c) => {
          applyTraditionsMats(c, style);
          c.position.set(x, -FLOOR_EPS, z);
          parent.add(c);
        });
      } else if (glb === "egypt") {
        spawnPart(EGYPT_GLB, "Column", (c) => {
          applyEgyptMats(c, style);
          c.position.set(x, -FLOOR_EPS, z);
          parent.add(c);
        });
        // warm uplight pool at the column base (fake concealed uplight)
        const disc = new THREE.Mesh(plane, egyptMaterials(style).glow);
        disc.rotation.x = -Math.PI / 2;
        disc.scale.set(1.7, 1.7, 1);
        disc.position.set(x, 0.02, z);
        parent.add(disc);
      } else {
        const g = makeColumn(type, mat, H);
        const holder = new THREE.Group();
        holder.add(g);
        holder.position.set(x, -FLOOR_EPS, z);
        parent.add(holder);
      }
      columnNarrows.push({ z, side });
    });
  }
}

function makeColumn(type, mat, H) {
  let g;
  if (type === "doric") {
    g = new THREE.Group();
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.30, H - 0.7, 12), mat);
    shaft.position.y = (H - 0.7) / 2;
    const cap = new THREE.Mesh(box, mat);
    cap.scale.set(0.72, 0.18, 0.72);
    cap.position.y = H - 0.62;
    const abacus = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.3, 0.22, 12), mat);
    abacus.position.y = H - 0.42;
    g.add(shaft, cap, abacus);
  } else if (type === "papyrus") {
    g = new THREE.Group();
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.3, H - 1.0, 10), mat);
    shaft.position.y = (H - 1.0) / 2;
    const bud = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.2, 0.75, 10), mat);
    bud.position.y = H - 0.85;
    g.add(shaft, bud);
  } else if (type === "persian") {
    g = new THREE.Group();
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.26, H - 1.1, 12), mat);
    shaft.position.y = (H - 1.1) / 2;
    const capital = new THREE.Mesh(box, mat);
    capital.scale.set(0.85, 0.5, 0.4);
    capital.position.y = H - 0.75;
    const volute = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 1.0, 10), mat);
    volute.rotation.x = Math.PI / 2;
    volute.position.y = H - 0.4;
    g.add(shaft, capital, volute);
  } else { // red / wood post
    g = new THREE.Mesh(new THREE.CylinderGeometry(type === "red" ? 0.2 : 0.13, type === "red" ? 0.22 : 0.14, H, 10), mat);
    g.position.y = H / 2;
  }
  return g;
}

function buildPilasters(parent, style, z0, len, W) {
  const { every, color } = style.columns;
  const mat = new THREE.MeshLambertMaterial({ color });
  const H = style.ceilH;
  const n = Math.max(1, Math.floor(len / every));
  for (let i = 0; i <= n; i++) {
    const z = z0 - PAD_START * 0.6 - i * ((len - PAD_START) / n);
    for (const side of [-1, 1]) {
      const g = new THREE.Mesh(box, mat);
      g.scale.set(0.5, H, 0.16);
      g.position.y = H / 2 - FLOOR_EPS;
      const holder = new THREE.Group();
      holder.add(g);
      holder.position.set(side * (W / 2 - 0.08), 0, z);
      holder.rotation.y = -side * Math.PI / 2;
      parent.add(holder);
    }
  }
}

function buildWindows(parent, z0, len, W, H, lights, bays) {
  if (!glassTex) {
    glassTex = fileTex("window_lancet", stainedGlass(171));
    glassTex.wrapS = glassTex.wrapT = THREE.ClampToEdgeWrapping;
  }
  const mat = new THREE.MeshBasicMaterial({ map: glassTex });

  // With a rib vault, windows sit mid-bay (under the wall rib's high point)
  // in every other bay; otherwise the old evenly-spaced layout.
  const spots = [];
  if (bays) {
    for (let k = 1; k < bays.n; k += 2) spots.push(z0 - (k + 0.5) * bays.bayLen);
    if (!spots.length) spots.push(z0 - len / 2);
  } else {
    const n = Math.max(1, Math.floor(len / 11));
    for (let i = 0; i < n; i++)
      spots.push(z0 - PAD_START - (i + 0.5) * ((len - PAD_START) / n) - SLOT_LEN * 0.5);
  }
  const [ww, wh, wy] = bays ? [1.35, 3.1, 4.55] : [1.15, 2.3, 4.6];

  for (const z of spots) {
    for (const side of [-1, 1]) {
      const wdw = new THREE.Mesh(plane, mat);
      wdw.scale.set(ww, wh, 1);
      wdw.position.set(side * (W / 2 - 0.05), wy, z);
      wdw.rotation.y = -side * Math.PI / 2;
      parent.add(wdw);
      const glow = new THREE.PointLight(0x9db8e8, 8, 8, 2);
      glow.position.set(side * (W / 2 - 0.8), wy - 0.3, z);
      glow.visible = false;
      parent.add(glow);
      lights.push(glow);
    }
  }
}

function buildTimbers(parent, z0, len, W, style) {
  const rand = rng(701);
  const mat = new THREE.MeshLambertMaterial({ color: 0x5c4227 });
  const g = new THREE.CylinderGeometry(0.055, 0.055, 0.6, 6);
  const n = Math.floor(len / 1.3);
  for (let i = 0; i < n; i++) {
    const z = z0 - 0.8 - i * 1.3;
    for (const side of [-1, 1]) {
      const m = new THREE.Mesh(g, mat);
      m.rotation.z = Math.PI / 2;
      m.rotation.y = (rand() - 0.5) * 0.15;
      m.position.set(side * (W / 2 - 0.18), style.ceilH - 0.75 + (rand() - 0.5) * 0.2, z);
      parent.add(m);
    }
  }
}

// The far end of a wing: a short landing, then the whole end wall is a
// shimmering curtain of light. Stepping into it returns the visitor to the
// Grand Crossing. Returns { zFar, update }.
export function buildEndLight(parent, style, zStart, regionLabel) {
  const W = HALL_W, H = style.ceilH, LEN = END_ZONE_LEN;
  const zFar = zStart - LEN, zc = zStart - LEN / 2;

  // floor + ceiling + side walls continue the last era's style
  const floor = new THREE.Mesh(scaledUVPlane(W, LEN, W / style.floorUV, LEN / style.floorUV), style.floor);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, 0, zc);
  parent.add(floor);
  const ceil = new THREE.Mesh(scaledUVPlane(W, LEN, W / (style.ceilUV || 6), LEN / (style.ceilUV || 6)), style.ceiling);
  ceil.rotation.x = Math.PI / 2;
  ceil.position.set(0, H, zc);
  parent.add(ceil);
  for (const side of [-1, 1]) {
    const wall = new THREE.Mesh(box, style.wall);
    wall.scale.set(0.25, H, LEN);
    wall.position.set(side * (W / 2 + 0.12), H / 2 - FLOOR_EPS, zc);
    parent.add(wall);
  }

  // the light itself: a bright wall + two drifting shimmer layers
  const back = new THREE.Mesh(plane, new THREE.MeshBasicMaterial({ color: 0xfff4dc }));
  back.scale.set(W + 0.2, H + 0.2, 1);
  back.position.set(0, H / 2, zFar);
  parent.add(back);

  const layers = [];
  for (let i = 0; i < 2; i++) {
    const m = new THREE.Mesh(plane, new THREE.MeshBasicMaterial({
      map: shimmerTexture(i), transparent: true, opacity: 0.55,
      blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    m.scale.set(W + 0.2, H + 0.2, 1);
    m.position.set(0, H / 2, zFar + 0.10 + i * 0.14);
    parent.add(m);
    layers.push(m);
  }

  // soft glow spilling onto the landing floor
  const glow = new THREE.Mesh(plane, new THREE.MeshBasicMaterial({
    color: 0xffedc8, transparent: true, opacity: 0.16,
    blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  glow.rotation.x = -Math.PI / 2;
  glow.scale.set(W, 3.2, 1);
  glow.position.set(0, 0.015, zFar + 1.7);
  parent.add(glow);

  const light = new THREE.PointLight(0xffedc8, 70, 16, 2);
  light.position.set(0, H * 0.55, zFar + 1.2);
  parent.add(light); // always on — the beacon at the end of every hall

  // invitation sign
  const sign = new THREE.Mesh(plane, new THREE.MeshBasicMaterial({
    map: signTexture("Step into the light", `${regionLabel} · return to the Grand Crossing`,
      { mainSize: 54, subSize: 30 }), transparent: true }));
  sign.scale.set(3.2, 0.8, 1);
  sign.position.set(0, H - 0.9, zFar + 0.35);
  parent.add(sign);

  const phase = Math.random() * Math.PI * 2;
  function update(t) {
    layers[0].material.map.offset.y = (t * 0.045) % 1;
    layers[0].material.opacity = 0.45 + 0.18 * Math.sin(t * 1.7 + phase);
    layers[1].material.map.offset.y = (-t * 0.03) % 1;
    layers[1].material.map.offset.x = (t * 0.012) % 1;
    layers[1].material.opacity = 0.38 + 0.16 * Math.sin(t * 2.3 + phase + 1.4);
    light.intensity = 70 * (0.86 + 0.14 * Math.sin(t * 1.9 + phase));
  }

  return { zFar, update };
}

function shimmerTexture(seed) {
  const c = document.createElement("canvas");
  c.width = 256; c.height = 256;
  const ctx = c.getContext("2d");
  const rand = rng(881 + seed * 97);
  ctx.clearRect(0, 0, 256, 256);
  // soft vertical streaks of warm light
  for (let i = 0; i < 46; i++) {
    const x = rand() * 256, w = 3 + rand() * 16, a = 0.05 + rand() * 0.16;
    const g = ctx.createLinearGradient(x - w, 0, x + w, 0);
    const warm = rand() > 0.5 ? "255,238,200" : "255,250,235";
    g.addColorStop(0, `rgba(${warm},0)`);
    g.addColorStop(0.5, `rgba(${warm},${a})`);
    g.addColorStop(1, `rgba(${warm},0)`);
    ctx.fillStyle = g;
    ctx.fillRect(x - w, 0, w * 2, 256);
  }
  const t = toTexture(c);
  return t;
}
