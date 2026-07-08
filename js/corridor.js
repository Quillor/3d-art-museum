// Builds one era-styled corridor segment in wing-local coordinates.
// The corridor runs along -Z: a segment occupies z in [z0, z0 - length].
import * as THREE from "three";
import { signTexture, stainedGlass, fileTex, rng, toTexture } from "./textures.js";
import { spawnPart } from "./models.js";

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
  const out = { anchors: [], lights: [], columnNarrows: [], zEnd, ceilH: H };

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
  if (style.decor === "china") buildChinaDecor(parent, style, z0, len, W, H, sideAnchorZ);
  else if (style.decor === "mughal") buildMughalDecor(parent, style, z0, len, W, H, sideAnchorZ);

  // Stained-glass windows (gothic) between artwork positions
  if (style.windows === "stained") buildWindows(parent, z0, len, W, H, out.lights, vaultBays);

  // Props (e.g. sahel timber rows)
  if (style.props === "timbers") buildTimbers(parent, z0, len, W, style);

  // Ceiling lights
  const every = style.light.every;
  const n = Math.max(1, Math.round(len / every));
  for (let i = 0; i < n; i++) {
    const z = z0 - (i + 0.5) * (len / n);
    const light = new THREE.PointLight(style.light.color, style.light.intensity, 17, 2);
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
    for (const z of spots) {
      const x = side * (W / 2 - 0.42);
      if (glb === "china") {
        spawnPart(CHINA_GLB, "Column", (c) => {
          applyChinaMats(c, style);
          c.position.set(x, -FLOOR_EPS, z);
          parent.add(c);
        });
      } else {
        const g = makeColumn(type, mat, H);
        const holder = new THREE.Group();
        holder.add(g);
        holder.position.set(x, -FLOOR_EPS, z);
        parent.add(holder);
      }
      columnNarrows.push({ z, side });
    }
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
