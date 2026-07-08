import * as THREE from "three";
import { toon } from "./shading.js";

const box = new THREE.BoxGeometry(1, 1, 1);
const plane = new THREE.PlaneGeometry(1, 1);
const matCache = new Map();

function mat(color) {
  if (!matCache.has(color)) matCache.set(color, toon({ color }));
  return matCache.get(color);
}

function addBox(parent, material, x, y, z, sx, sy, sz, rot = {}) {
  const m = new THREE.Mesh(box, material);
  m.scale.set(sx, sy, sz);
  m.position.set(x, y, z);
  if (rot.x) m.rotation.x = rot.x;
  if (rot.y) m.rotation.y = rot.y;
  if (rot.z) m.rotation.z = rot.z;
  parent.add(m);
  return m;
}

function addCylinder(parent, material, x, y, z, radius, height, axis = "y", radial = 16) {
  const g = new THREE.CylinderGeometry(radius, radius, height, radial);
  const m = new THREE.Mesh(g, material);
  m.position.set(x, y, z);
  if (axis === "x") m.rotation.z = Math.PI / 2;
  if (axis === "z") m.rotation.x = Math.PI / 2;
  parent.add(m);
  return m;
}

function addColumn(parent, material, x, z, h, opts = {}) {
  const r = opts.r || 0.18;
  addCylinder(parent, material, x, h / 2, z, r, h, "y", opts.radial || 18);
  addBox(parent, material, x, 0.08, z, r * 3.0, 0.16, r * 3.0);
  addBox(parent, material, x, h - 0.18, z, r * 3.2, 0.22, r * 3.2);
  if (opts.capital) addBox(parent, material, x, h - 0.48, z, r * 4.0, 0.34, r * 2.2);
}

function tintFromStyle(style, fallback = 0x8c7a62) {
  return style.portal?.mat?.color?.getHex?.() || fallback;
}

export function buildHallArchitecture(parent, style, ctx) {
  const arch = style.architecture;
  if (!arch?.hall) return;
  const kits = Array.isArray(arch.hall) ? arch.hall : [arch.hall];
  for (const kit of kits) {
    if (kit === "ashlar") buildMasonryCourses(parent, ctx, { color: 0x8d8a80, blockLen: 1.2, rowH: 0.42, depth: 0.07, stagger: true });
    else if (kit === "limestoneTemple") buildMasonryCourses(parent, ctx, { color: 0x9b8a6d, blockLen: 1.0, rowH: 0.46, depth: 0.09, stagger: true, upperOnly: false });
    else if (kit === "mudbrick") buildMasonryCourses(parent, ctx, { color: 0xa3805a, blockLen: 0.82, rowH: 0.34, depth: 0.08, stagger: true });
    else if (kit === "stoneTemple") buildMasonryCourses(parent, ctx, { color: 0x7e7a6a, blockLen: 0.95, rowH: 0.42, depth: 0.08, stagger: true });
    else if (kit === "marblePanels") buildPanelBays(parent, ctx, { color: 0xd9d2c2, trim: 0xb9ad95, formal: true });
    else if (kit === "salonPanels") buildPanelBays(parent, ctx, { color: tintFromStyle(style, 0x8a7652), trim: 0xc59d55, formal: false });
    else if (kit === "baroquePanels") buildPanelBays(parent, ctx, { color: 0x5e1f1d, trim: 0xc9a256, formal: true, heavy: true });
    else if (kit === "modernReveals") buildModernReveals(parent, ctx);
    else if (kit === "gothicRibs") buildGothicHall(parent, ctx);
    else if (kit === "vigas") buildCeilingBeams(parent, ctx, { color: 0x6e5335, radius: 0.12, every: 1.6 });
    else if (kit === "postBeam") buildPostBeamHall(parent, ctx, { color: 0x2c1c12, accent: 0x8f2b1e });
    else if (kit === "shoji") buildShojiHall(parent, ctx);
    else if (kit === "jali") buildJaliHall(parent, ctx);
    else if (kit === "dome") buildHalfDomes(parent, ctx, { color: 0x7c3b3b });
    else if (kit === "banco") buildBancoHall(parent, ctx);
    else if (kit === "woven") buildWovenHall(parent, ctx);
    else if (kit === "rock") buildRockRelief(parent, ctx, { color: 0xa06844 });
    else if (kit === "egyptRelief") buildEgyptianReliefHall(parent, ctx);
    else if (kit === "floorSlabs") buildFloorSlabs(parent, ctx, { color: tintFromStyle(style, 0x6d6256) });
    else if (kit === "woodPlanks") buildWoodPlankRelief(parent, ctx);
  }
}

export function buildPortalArchitecture(parent, style, ctx) {
  const kit = style.architecture?.portal;
  if (!kit) return;
  if (kit === "meso") buildSteppedMesoamericanPortal(parent, style, ctx);
  else if (kit === "inca") buildTrapezoidIncaPortal(parent, style, ctx);
  else if (kit === "adobe") buildAdobeRoundedPortal(parent, style, ctx);
  else if (kit === "classical") buildDoricPortal(parent, style, ctx);
  else if (kit === "gothic") buildGothicPointedArch(parent, style, ctx);
  else if (kit === "renaissance") buildRenaissanceRoundArch(parent, style, ctx);
  else if (kit === "baroque") buildBaroqueOrnatePortal(parent, style, ctx);
  else if (kit === "salon") buildSalonPortal(parent, style, ctx);
  else if (kit === "modern") buildModernPortal(parent, style, ctx);
  else if (kit === "mudbrick") buildMudbrickPortal(parent, style, ctx);
  else if (kit === "ishtar") buildIshtarGatePortal(parent, style, ctx);
  else if (kit === "persepolis") buildPersepolisPortal(parent, style, ctx);
  else if (kit === "islamic") buildKeelArchPortal(parent, style, ctx);
  else if (kit === "ottoman") buildIznikDomedPortal(parent, style, ctx);
  else if (kit === "china") buildMoonGatePortal(parent, style, ctx);
  else if (kit === "japan") buildShojiPortal(parent, style, ctx);
  else if (kit === "khmer") buildKhmerLintelPortal(parent, style, ctx);
  else if (kit === "mughal") buildMughalCuspedArch(parent, style, ctx);
  else if (kit === "egypt") buildEgyptianPylon(parent, style, ctx);
  else if (kit === "sahel") buildDjenneBancoPortal(parent, style, ctx);
  else if (kit === "earthen") buildEarthenPortal(parent, style, ctx);
  else if (kit === "rock") buildIrregularRockPortal(parent, style, ctx);
  else if (kit === "oceanic") buildOceanicCarvedWoodPortal(parent, style, ctx);
  else if (kit === "woven") buildPandanusWovenPortal(parent, style, ctx);
}

function frontZ(ctx, offset = 0.18) {
  return ctx.z + offset;
}

function buildMasonryCourses(parent, ctx, opts) {
  const material = mat(opts.color);
  const rows = Math.max(3, Math.floor((ctx.H - 1.1) / opts.rowH));
  const blocks = Math.max(4, Math.floor(ctx.len / opts.blockLen));
  for (const side of [-1, 1]) {
    const x = side * (ctx.W / 2 - 0.03);
    for (let r = 0; r < rows; r++) {
      const y = 0.45 + r * opts.rowH;
      if (opts.upperOnly && y < 3.0) continue;
      for (let i = 0; i < blocks; i++) {
        const shift = opts.stagger && r % 2 ? opts.blockLen * 0.5 : 0;
        const z = ctx.z0 - 0.7 - shift - i * opts.blockLen;
        if (z < ctx.z0 - ctx.len + 0.45) continue;
        addBox(parent, material, x, y, z, opts.depth, opts.rowH * 0.78, opts.blockLen * 0.86);
      }
    }
  }
}

function buildFloorSlabs(parent, ctx, opts) {
  const material = mat(opts.color);
  const cols = 4;
  const rows = Math.max(4, Math.floor(ctx.len / 1.7));
  for (let i = 1; i < cols; i++) {
    const x = -ctx.W / 2 + (ctx.W * i) / cols;
    addBox(parent, material, x, 0.035, ctx.z0 - ctx.len / 2, 0.035, 0.035, ctx.len);
  }
  for (let i = 0; i <= rows; i++) {
    const z = ctx.z0 - (ctx.len * i) / rows;
    addBox(parent, material, 0, 0.038, z, ctx.W, 0.03, 0.035);
  }
}

function buildWoodPlankRelief(parent, ctx) {
  const material = mat(0x2f2419);
  for (let i = 1; i < 8; i++) {
    const x = -ctx.W / 2 + (ctx.W * i) / 8;
    addBox(parent, material, x, 0.04, ctx.z0 - ctx.len / 2, 0.025, 0.035, ctx.len);
  }
}

function buildPanelBays(parent, ctx, opts) {
  const trim = mat(opts.trim);
  const bays = Math.max(2, Math.round(ctx.len / 4.6));
  const bayLen = (ctx.len - 1.2) / bays;
  const yMid = Math.min(ctx.H - 2.4, 2.8);
  const panelH = opts.heavy ? 3.2 : 2.35;
  for (const side of [-1, 1]) {
    const x = side * (ctx.W / 2 - 0.08);
    for (let i = 0; i < bays; i++) {
      const z = ctx.z0 - 0.8 - (i + 0.5) * bayLen;
      if (nearArt(ctx.sideAnchorZ, side, z, 0.95)) continue;
      addBox(parent, trim, x, yMid, z - bayLen * 0.38, 0.07, panelH, 0.055);
      addBox(parent, trim, x, yMid, z + bayLen * 0.38, 0.07, panelH, 0.055);
      addBox(parent, trim, x, yMid + panelH / 2, z, 0.07, 0.07, bayLen * 0.74);
      addBox(parent, trim, x, yMid - panelH / 2, z, 0.07, 0.07, bayLen * 0.74);
      if (opts.formal) {
        addBox(parent, trim, x, yMid, z, 0.05, panelH * 0.72, 0.04);
      }
    }
  }
}

function buildModernReveals(parent, ctx) {
  const reveal = mat(0x4f4f4f);
  buildFloorSlabs(parent, ctx, { color: 0x7c7c78 });
  const n = Math.max(2, Math.floor(ctx.len / 5));
  for (let i = 0; i < n; i++) {
    const z = ctx.z0 - 1.8 - i * ((ctx.len - 3.6) / Math.max(1, n - 1));
    addBox(parent, reveal, 0, ctx.H - 0.18, z, ctx.W - 1.4, 0.035, 0.85);
    addBox(parent, mat(0xf7f3e9), 0, ctx.H - 0.16, z, ctx.W - 1.8, 0.04, 0.55);
  }
  for (const side of [-1, 1]) {
    const x = side * (ctx.W / 2 - 0.08);
    addBox(parent, reveal, x, 0.42, ctx.z0 - ctx.len / 2, 0.08, 0.12, ctx.len);
  }
}

function buildCeilingBeams(parent, ctx, opts) {
  const material = mat(opts.color);
  const n = Math.max(3, Math.floor(ctx.len / opts.every));
  for (let i = 0; i <= n; i++) {
    const z = ctx.z0 - 0.35 - i * ((ctx.len - 0.7) / n);
    addCylinder(parent, material, 0, ctx.H - 0.24, z, opts.radius || 0.09, ctx.W + 0.36, "x", 8);
  }
}

function buildPostBeamHall(parent, ctx, opts) {
  const post = mat(opts.accent || opts.color);
  const beam = mat(opts.color);
  const bays = Math.max(3, Math.floor(ctx.len / 3.0));
  for (const side of [-1, 1]) {
    const x = side * (ctx.W / 2 - 0.24);
    for (let i = 0; i <= bays; i++) {
      const z = ctx.z0 - 0.5 - i * ((ctx.len - 1.0) / bays);
      addCylinder(parent, post, x, ctx.H / 2, z, 0.11, ctx.H - 0.25, "y", 12);
    }
    addBox(parent, beam, x, ctx.H - 0.45, ctx.z0 - ctx.len / 2, 0.22, 0.26, ctx.len - 0.7);
  }
}

function buildShojiHall(parent, ctx) {
  buildPostBeamHall(parent, ctx, { color: 0x3c2c1a, accent: 0x4a3520 });
  const rail = mat(0x4a3520);
  for (const side of [-1, 1]) {
    const x = side * (ctx.W / 2 - 0.05);
    for (let i = 0; i < 5; i++) addBox(parent, rail, x, 0.8 + i * 0.58, ctx.z0 - ctx.len / 2, 0.045, 0.035, ctx.len - 0.7);
  }
}

function buildJaliHall(parent, ctx) {
  const lattice = mat(0xd9cbb6);
  const panels = Math.max(2, Math.floor(ctx.len / 5));
  for (const side of [-1, 1]) {
    const x = side * (ctx.W / 2 - 0.09);
    for (let p = 0; p < panels; p++) {
      const z = ctx.z0 - 2.0 - p * ((ctx.len - 4) / Math.max(1, panels - 1));
      addLattice(parent, lattice, x, 2.55, z, 0.06, 1.8, 1.4, "wall", side);
    }
  }
}

function buildGothicHall(parent, ctx) {
  const stone = mat(0x6a6258);
  buildMasonryCourses(parent, ctx, { color: 0x625a50, blockLen: 1.15, rowH: 0.45, depth: 0.07, stagger: true });
  const ribs = Math.max(2, Math.floor(ctx.len / 4.5));
  for (let i = 0; i <= ribs; i++) {
    const z = ctx.z0 - 0.7 - i * ((ctx.len - 1.4) / ribs);
    addCylinder(parent, stone, -ctx.W / 2 + 0.45, ctx.H / 2, z, 0.08, ctx.H - 0.6, "y", 10);
    addCylinder(parent, stone, ctx.W / 2 - 0.45, ctx.H / 2, z, 0.08, ctx.H - 0.6, "y", 10);
    addBox(parent, stone, 0, ctx.H - 0.55, z, ctx.W - 0.9, 0.16, 0.12);
  }
}

function buildHalfDomes(parent, ctx, opts) {
  const material = mat(opts.color);
  const count = Math.max(1, Math.round(ctx.len / 7.0));
  for (let i = 0; i < count; i++) {
    const domeMat = material.clone();
    domeMat.side = THREE.BackSide;
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(ctx.W * 0.34, 24, 10, 0, Math.PI * 2, 0, Math.PI / 2),
      domeMat
    );
    dome.scale.y = 0.42;
    dome.position.set(0, ctx.H - 0.15, ctx.z0 - (i + 0.5) * (ctx.len / count));
    parent.add(dome);
  }
}

function buildBancoHall(parent, ctx) {
  const earth = mat(0xa5714a);
  buildCeilingBeams(parent, ctx, { color: 0x4a2d18, radius: 0.11, every: 1.35 });
  for (const side of [-1, 1]) {
    const x = side * (ctx.W / 2 - 0.15);
    const n = Math.max(3, Math.floor(ctx.len / 3.0));
    for (let i = 0; i <= n; i++) {
      const z = ctx.z0 - 0.7 - i * ((ctx.len - 1.4) / n);
      addBox(parent, earth, x, ctx.H / 2 - 0.1, z, 0.38, ctx.H - 0.4, 0.42);
      addCylinder(parent, mat(0x4b2f1b), side * (ctx.W / 2 - 0.48), ctx.H - 0.85, z, 0.055, 0.8, "x", 6);
    }
  }
}

function buildWovenHall(parent, ctx) {
  buildPostBeamHall(parent, ctx, { color: 0x54371e, accent: 0x6e4f2c });
  const stripA = mat(0x8a6735);
  const stripB = mat(0xc2a36b);
  for (const side of [-1, 1]) {
    const x = side * (ctx.W / 2 - 0.055);
    const n = Math.max(8, Math.floor(ctx.len / 0.8));
    for (let i = 0; i < n; i++) {
      const z = ctx.z0 - 0.5 - i * ((ctx.len - 1) / n);
      addBox(parent, i % 2 ? stripA : stripB, x, 2.25, z, 0.045, 2.6, 0.035);
    }
    for (let j = 0; j < 6; j++) {
      addBox(parent, j % 2 ? stripB : stripA, x, 1.0 + j * 0.45, ctx.z0 - ctx.len / 2, 0.045, 0.035, ctx.len - 0.8);
    }
  }
}

function buildRockRelief(parent, ctx, opts) {
  const material = mat(opts.color);
  const rock = new THREE.DodecahedronGeometry(1, 0);
  const n = Math.max(8, Math.floor(ctx.len / 1.5));
  for (const side of [-1, 1]) {
    for (let i = 0; i < n; i++) {
      const m = new THREE.Mesh(rock, material);
      const s = 0.22 + (i % 4) * 0.04;
      m.scale.set(0.16 + s * 0.3, s * 1.8, 0.22 + s);
      m.position.set(side * (ctx.W / 2 - 0.18), 0.55 + (i % 5) * 0.58, ctx.z0 - 0.5 - i * ((ctx.len - 1) / n));
      m.rotation.set((i * 0.7) % Math.PI, (i * 1.1) % Math.PI, (i * 0.43) % Math.PI);
      parent.add(m);
    }
  }
}

function buildEgyptianReliefHall(parent, ctx) {
  buildMasonryCourses(parent, ctx, { color: 0xc2a06c, blockLen: 1.4, rowH: 0.5, depth: 0.08, stagger: true });
  const relief = mat(0x7a5a2d);
  for (const side of [-1, 1]) {
    const x = side * (ctx.W / 2 - 0.08);
    for (let i = 0; i < 8; i++) {
      const z = ctx.z0 - 1.2 - i * ((ctx.len - 2.4) / 8);
      addBox(parent, relief, x, 2.25, z, 0.05, 1.25, 0.08);
      addCylinder(parent, relief, x, 3.05, z, 0.045, 0.55, "z", 8);
    }
  }
}

function nearArt(sideAnchorZ, side, z, distance) {
  return (sideAnchorZ?.[String(side)] || []).some((az) => Math.abs(az - z) < distance);
}

function addVoussoirs(parent, material, ctx, opts = {}) {
  const pts = ctx.outline;
  const minY = opts.minY ?? ctx.doorH * 0.42;
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, ay] = pts[i], [bx, by] = pts[i + 1];
    if ((ay + by) / 2 < minY) continue;
    const dx = bx - ax, dy = by - ay;
    const seg = Math.hypot(dx, dy);
    const pieces = Math.max(1, Math.floor(seg / 0.32));
    for (let p = 0; p < pieces; p++) {
      const t = (p + 0.5) / pieces;
      const x = ax + dx * t;
      const y = ay + dy * t;
      addBox(parent, material, x, y, frontZ(ctx, opts.zOffset || 0.18), opts.w || 0.34, opts.h || 0.22, opts.d || 0.42, { z: Math.atan2(dy, dx) });
    }
  }
}

function buildLayeredRectPortal(parent, material, ctx, opts = {}) {
  const z = frontZ(ctx, opts.zOffset || 0.16);
  const outerW = ctx.doorW + (opts.padW || 1.2);
  const outerH = ctx.doorH + (opts.padH || 0.8);
  const thick = opts.thick || 0.34;
  addBox(parent, material, -(ctx.doorW / 2 + thick / 2), outerH / 2, z, thick, outerH, opts.depth || 0.65);
  addBox(parent, material, ctx.doorW / 2 + thick / 2, outerH / 2, z, thick, outerH, opts.depth || 0.65);
  addBox(parent, material, 0, outerH - thick / 2, z, outerW, thick, opts.depth || 0.65);
  addBox(parent, material, 0, 0.08, z, outerW, 0.16, opts.depth || 0.65);
}

function buildSteppedMesoamericanPortal(parent, style, ctx) {
  const stone = mat(0x9b8a6d);
  for (let i = 0; i < 4; i++) {
    const inset = i * 0.22;
    buildLayeredRectPortal(parent, stone, ctx, { padW: 1.8 - inset, padH: 1.2 - inset * 0.2, thick: 0.32, depth: 0.75 - i * 0.08, zOffset: 0.16 + i * 0.08 });
  }
  addBox(parent, mat(0x7d5b3f), 0, ctx.doorH + 0.72, frontZ(ctx, 0.5), ctx.doorW + 2.1, 0.34, 0.35);
  addVoussoirs(parent, stone, ctx, { minY: ctx.doorH * 0.45, w: 0.32, h: 0.24, d: 0.55 });
}

function buildTrapezoidIncaPortal(parent, style, ctx) {
  const stone = mat(0x8d8a80);
  addVoussoirs(parent, stone, ctx, { minY: 0.1, w: 0.42, h: 0.28, d: 0.72 });
  for (let r = 0; r < 5; r++) {
    for (const side of [-1, 1]) {
      addBox(parent, stone, side * (ctx.doorW / 2 + 0.58), 0.45 + r * 0.48, frontZ(ctx, 0.28), 0.52, 0.34, 0.56, { z: -side * 0.14 });
    }
  }
  addBox(parent, stone, 0, 0.06, frontZ(ctx, 0.22), ctx.doorW + 1.55, 0.12, 0.85);
}

function buildAdobeRoundedPortal(parent, style, ctx) {
  const adobe = mat(0xb98d5f);
  buildLayeredRectPortal(parent, adobe, ctx, { padW: 1.6, padH: 0.9, thick: 0.5, depth: 0.9 });
  addVoussoirs(parent, adobe, ctx, { minY: ctx.doorH * 0.42, w: 0.42, h: 0.28, d: 0.72 });
  for (let i = 0; i < 5; i++) addCylinder(parent, mat(0x6e5335), -ctx.doorW / 2 + i * (ctx.doorW / 4), ctx.doorH + 0.35, frontZ(ctx, 0.62), 0.07, 1.1, "z", 8);
}

function buildDoricPortal(parent, style, ctx) {
  const marble = mat(0xe6dfd0);
  for (const x of [-ctx.doorW / 2 - 0.9, ctx.doorW / 2 + 0.9]) addColumn(parent, marble, x, frontZ(ctx, 0.35), ctx.doorH + 0.85, { r: 0.18, capital: true, radial: 20 });
  addBox(parent, marble, 0, ctx.doorH + 0.62, frontZ(ctx, 0.36), ctx.doorW + 2.8, 0.32, 0.72);
  addBox(parent, mat(0xcfc7b6), 0, ctx.doorH + 0.95, frontZ(ctx, 0.36), ctx.doorW + 3.1, 0.28, 0.74);
  addBox(parent, marble, 0, 0.06, frontZ(ctx, 0.24), ctx.doorW + 2.4, 0.12, 0.9);
}

function buildGothicPointedArch(parent, style, ctx) {
  const stone = mat(0x6a6258);
  addVoussoirs(parent, stone, ctx, { minY: ctx.doorH * 0.28, w: 0.30, h: 0.24, d: 0.62 });
  for (const x of [-ctx.doorW / 2 - 0.55, ctx.doorW / 2 + 0.55]) {
    addColumn(parent, stone, x, frontZ(ctx, 0.28), ctx.doorH + 1.0, { r: 0.11, radial: 12 });
    addColumn(parent, stone, x + Math.sign(x) * 0.24, frontZ(ctx, 0.24), ctx.doorH + 0.7, { r: 0.08, radial: 10 });
  }
  addLancetPair(parent, stone, ctx);
}

function buildRenaissanceRoundArch(parent, style, ctx) {
  const plaster = mat(0xcbb794);
  const trim = mat(0xa8946e);
  buildLayeredRectPortal(parent, trim, ctx, { padW: 1.5, padH: 1.0, thick: 0.28, depth: 0.72 });
  addVoussoirs(parent, plaster, ctx, { minY: ctx.doorH * 0.5, w: 0.28, h: 0.22, d: 0.48 });
  for (const x of [-ctx.doorW / 2 - 0.72, ctx.doorW / 2 + 0.72]) addColumn(parent, trim, x, frontZ(ctx, 0.26), ctx.doorH + 0.5, { r: 0.12, capital: true });
}

function buildBaroqueOrnatePortal(parent, style, ctx) {
  const red = mat(0x5e1f1d), gold = mat(0xc9a256), stone = mat(0xb9a276);
  buildLayeredRectPortal(parent, red, ctx, { padW: 2.1, padH: 1.25, thick: 0.36, depth: 0.86 });
  for (const x of [-ctx.doorW / 2 - 0.82, ctx.doorW / 2 + 0.82]) addColumn(parent, stone, x, frontZ(ctx, 0.35), ctx.doorH + 0.75, { r: 0.16, capital: true });
  addBox(parent, gold, 0, ctx.doorH + 0.55, frontZ(ctx, 0.5), ctx.doorW + 2.7, 0.12, 0.24);
  for (const x of [-0.52, 0.52]) {
    const tor = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.035, 8, 20), gold);
    tor.position.set(x, ctx.doorH + 0.95, frontZ(ctx, 0.56));
    parent.add(tor);
  }
}

function buildSalonPortal(parent, style, ctx) {
  const trim = mat(0xc9b38e);
  buildLayeredRectPortal(parent, trim, ctx, { padW: 1.5, padH: 0.92, thick: 0.24, depth: 0.55 });
  addBox(parent, trim, 0, ctx.doorH + 0.62, frontZ(ctx, 0.3), ctx.doorW + 2.0, 0.18, 0.42);
  addBox(parent, mat(0xc59d55), 0, ctx.doorH + 0.86, frontZ(ctx, 0.33), ctx.doorW + 1.3, 0.06, 0.22);
}

function buildModernPortal(parent, style, ctx) {
  const shadow = mat(0x2d2d2d);
  const white = mat(0xe8e6e1);
  buildLayeredRectPortal(parent, shadow, ctx, { padW: 1.2, padH: 0.8, thick: 0.16, depth: 0.9, zOffset: 0.12 });
  buildLayeredRectPortal(parent, white, ctx, { padW: 0.72, padH: 0.46, thick: 0.22, depth: 0.52, zOffset: 0.32 });
  addBox(parent, mat(0x6e6e6a), 0, 0.06, frontZ(ctx, 0.32), ctx.doorW + 1.2, 0.06, 1.0);
}

function buildMudbrickPortal(parent, style, ctx) {
  const brick = mat(0xa3805a);
  buildLayeredRectPortal(parent, brick, ctx, { padW: 1.4, padH: 0.75, thick: 0.38, depth: 0.75 });
  for (let r = 0; r < 6; r++) {
    for (const side of [-1, 1]) addBox(parent, brick, side * (ctx.doorW / 2 + 0.48), 0.35 + r * 0.42, frontZ(ctx, 0.48), 0.4, 0.25, 0.32);
  }
}

function buildIshtarGatePortal(parent, style, ctx) {
  const blue = mat(0x1c4d7c), gold = mat(0xe8c95f);
  buildLayeredRectPortal(parent, blue, ctx, { padW: 1.8, padH: 1.15, thick: 0.34, depth: 0.8 });
  addVoussoirs(parent, blue, ctx, { minY: ctx.doorH * 0.45, w: 0.32, h: 0.24, d: 0.62 });
  for (let i = 0; i < 13; i++) addBox(parent, i % 2 ? gold : blue, -ctx.doorW / 2 - 0.78 + i * 0.13, ctx.doorH + 0.5, frontZ(ctx, 0.55), 0.1, 0.18, 0.18);
  for (const x of [-ctx.doorW / 2 - 0.95, ctx.doorW / 2 + 0.95]) addBox(parent, gold, x, 1.45, frontZ(ctx, 0.58), 0.13, 1.45, 0.18);
}

function buildPersepolisPortal(parent, style, ctx) {
  const stone = mat(0xb09a72);
  buildLayeredRectPortal(parent, stone, ctx, { padW: 1.6, padH: 0.9, thick: 0.3, depth: 0.75 });
  for (const x of [-ctx.doorW / 2 - 0.9, ctx.doorW / 2 + 0.9]) addColumn(parent, stone, x, frontZ(ctx, 0.34), ctx.doorH + 1.2, { r: 0.16, capital: true });
  for (const x of [-ctx.doorW / 2 - 1.38, ctx.doorW / 2 + 1.38]) buildLamassu(parent, stone, x, frontZ(ctx, 0.42));
}

function buildKeelArchPortal(parent, style, ctx) {
  const cream = mat(0xe3d7bd), teal = mat(0x2a5b78);
  addVoussoirs(parent, teal, ctx, { minY: ctx.doorH * 0.3, w: 0.24, h: 0.22, d: 0.56 });
  buildLayeredRectPortal(parent, cream, ctx, { padW: 1.9, padH: 1.4, thick: 0.22, depth: 0.52 });
  buildMuqarnas(parent, teal, ctx);
}

function buildIznikDomedPortal(parent, style, ctx) {
  const tile = mat(0x27516e), red = mat(0x7c3b3b), cream = mat(0xece5d2);
  buildLayeredRectPortal(parent, cream, ctx, { padW: 1.7, padH: 1.0, thick: 0.28, depth: 0.65 });
  addVoussoirs(parent, tile, ctx, { minY: ctx.doorH * 0.35, w: 0.24, h: 0.2, d: 0.5 });
  const domeMat = red.clone();
  domeMat.side = THREE.BackSide;
  const dome = new THREE.Mesh(new THREE.SphereGeometry(ctx.doorW * 0.55, 24, 8, 0, Math.PI * 2, 0, Math.PI / 2), domeMat);
  dome.scale.y = 0.45;
  dome.position.set(0, ctx.doorH + 0.45, frontZ(ctx, 0.46));
  parent.add(dome);
}

function buildMoonGatePortal(parent, style, ctx) {
  const red = mat(0x8f2b1e), black = mat(0x1f140e);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(ctx.doorW * 0.55, 0.16, 14, 48), red);
  ring.position.set(0, ctx.doorH * 0.58, frontZ(ctx, 0.5));
  parent.add(ring);
  for (const x of [-ctx.doorW / 2 - 1.05, ctx.doorW / 2 + 1.05]) addColumn(parent, red, x, frontZ(ctx, 0.35), ctx.doorH + 1.0, { r: 0.16, radial: 16 });
  addBox(parent, black, 0, ctx.doorH + 0.82, frontZ(ctx, 0.38), ctx.doorW + 2.8, 0.24, 0.44);
  addLattice(parent, mat(0xd9c089), -ctx.doorW / 2 - 1.6, 1.9, frontZ(ctx, 0.45), 1.0, 1.4, 0.05, "front");
  addLattice(parent, mat(0xd9c089), ctx.doorW / 2 + 1.6, 1.9, frontZ(ctx, 0.45), 1.0, 1.4, 0.05, "front");
}

function buildShojiPortal(parent, style, ctx) {
  const wood = mat(0x3c2c1a), paper = mat(0xe8dfc8);
  buildLayeredRectPortal(parent, wood, ctx, { padW: 1.2, padH: 0.4, thick: 0.2, depth: 0.46 });
  for (const x of [-ctx.doorW / 2 - 1.0, ctx.doorW / 2 + 1.0]) {
    addBox(parent, paper, x, 1.8, frontZ(ctx, 0.32), 0.86, 2.5, 0.035);
    addLattice(parent, wood, x, 1.8, frontZ(ctx, 0.38), 0.86, 2.5, 0.05, "front");
  }
}

function buildKhmerLintelPortal(parent, style, ctx) {
  const stone = mat(0x7e7a6a);
  buildLayeredRectPortal(parent, stone, ctx, { padW: 1.8, padH: 1.0, thick: 0.34, depth: 0.72 });
  addBox(parent, stone, 0, ctx.doorH + 0.55, frontZ(ctx, 0.52), ctx.doorW + 2.2, 0.42, 0.64);
  for (let i = 0; i < 8; i++) addBox(parent, mat(0x4a473c), -ctx.doorW / 2 - 0.7 + i * 0.38, ctx.doorH + 0.56, frontZ(ctx, 0.88), 0.12, 0.18, 0.08);
}

function buildMughalCuspedArch(parent, style, ctx) {
  const marble = mat(0xece2d2);
  addVoussoirs(parent, marble, ctx, { minY: ctx.doorH * 0.22, w: 0.24, h: 0.2, d: 0.52 });
  buildLayeredRectPortal(parent, marble, ctx, { padW: 2.1, padH: 1.2, thick: 0.25, depth: 0.58 });
  const screen = mat(0xd8cbb4);
  addLattice(parent, screen, -ctx.doorW / 2 - 1.15, 1.85, frontZ(ctx, 0.45), 0.9, 2.2, 0.05, "front");
  addLattice(parent, screen, ctx.doorW / 2 + 1.15, 1.85, frontZ(ctx, 0.45), 0.9, 2.2, 0.05, "front");
}

function buildEgyptianPylon(parent, style, ctx) {
  const sand = mat(0xc2a06c);
  for (const side of [-1, 1]) {
    addBox(parent, sand, side * (ctx.doorW / 2 + 0.7), 1.9, frontZ(ctx, 0.28), 0.72, 3.8, 0.82, { z: -side * 0.11 });
    addBox(parent, mat(0x7a5a2d), side * (ctx.doorW / 2 + 0.7), 2.1, frontZ(ctx, 0.72), 0.06, 2.4, 0.08);
  }
  addBox(parent, sand, 0, ctx.doorH + 0.48, frontZ(ctx, 0.36), ctx.doorW + 2.8, 0.36, 0.78);
  addBox(parent, mat(0x7a5a2d), 0, ctx.doorH + 0.78, frontZ(ctx, 0.78), ctx.doorW + 2.2, 0.08, 0.08);
}

function buildDjenneBancoPortal(parent, style, ctx) {
  const earth = mat(0xa5714a);
  for (const side of [-1, 1]) {
    addBox(parent, earth, side * (ctx.doorW / 2 + 0.55), 1.9, frontZ(ctx, 0.24), 0.7, 3.7, 0.82, { z: -side * 0.06 });
    addColumn(parent, earth, side * (ctx.doorW / 2 + 1.15), frontZ(ctx, 0.26), ctx.doorH + 0.35, { r: 0.22, radial: 8 });
  }
  addBox(parent, earth, 0, ctx.doorH + 0.36, frontZ(ctx, 0.26), ctx.doorW + 2.2, 0.42, 0.76);
  for (let i = 0; i < 9; i++) addCylinder(parent, mat(0x4a2d18), -ctx.doorW / 2 - 0.7 + i * 0.44, ctx.doorH + 0.5, frontZ(ctx, 0.72), 0.055, 0.82, "z", 6);
}

function buildEarthenPortal(parent, style, ctx) {
  const earth = mat(0x8d5a3a);
  buildLayeredRectPortal(parent, earth, ctx, { padW: 1.4, padH: 0.7, thick: 0.5, depth: 0.82 });
  for (let i = 0; i < 7; i++) addCylinder(parent, mat(0x4c3a26), -ctx.doorW / 2 - 0.25 + i * 0.52, ctx.doorH + 0.25, frontZ(ctx, 0.64), 0.055, 0.8, "z", 6);
}

function buildIrregularRockPortal(parent, style, ctx) {
  const rockMat = mat(0xa06844);
  const rock = new THREE.DodecahedronGeometry(1, 0);
  for (let i = 0; i < 18; i++) {
    const top = i >= 8 && i <= 12;
    const side = i % 2 ? -1 : 1;
    const m = new THREE.Mesh(rock, rockMat);
    const s = 0.32 + (i % 5) * 0.055;
    m.scale.set(s * 1.1, s * 1.55, s * 0.95);
    m.position.set(top ? -1.6 + (i - 8) * 0.8 : side * (ctx.doorW / 2 + 0.45), top ? ctx.doorH + 0.35 : 0.45 + (i % 8) * 0.48, frontZ(ctx, 0.34 + (i % 3) * 0.08));
    m.rotation.set(i * 0.31, i * 0.57, i * 0.19);
    parent.add(m);
  }
}

function buildOceanicCarvedWoodPortal(parent, style, ctx) {
  const wood = mat(0x54371e);
  for (const x of [-ctx.doorW / 2 - 0.65, ctx.doorW / 2 + 0.65]) {
    addColumn(parent, wood, x, frontZ(ctx, 0.28), ctx.doorH + 0.75, { r: 0.18, radial: 10 });
    for (let i = 0; i < 6; i++) addBox(parent, mat(0x9d6a32), x, 0.65 + i * 0.48, frontZ(ctx, 0.55), 0.08, 0.08, 0.12);
  }
  addBox(parent, wood, 0, ctx.doorH + 0.55, frontZ(ctx, 0.34), ctx.doorW + 2.1, 0.35, 0.62);
  addBox(parent, mat(0x9d6a32), 0, ctx.doorH + 0.58, frontZ(ctx, 0.68), ctx.doorW + 1.7, 0.08, 0.12);
}

function buildPandanusWovenPortal(parent, style, ctx) {
  const reed = mat(0xb3915e);
  buildLayeredRectPortal(parent, reed, ctx, { padW: 1.6, padH: 0.65, thick: 0.26, depth: 0.54 });
  for (const x of [-ctx.doorW / 2 - 1.0, ctx.doorW / 2 + 1.0]) addLattice(parent, mat(0x6e4f2c), x, 1.8, frontZ(ctx, 0.45), 0.85, 2.35, 0.05, "front");
  for (let i = 0; i < 8; i++) addCylinder(parent, mat(0x54371e), -ctx.doorW / 2 - 0.5 + i * 0.45, ctx.doorH + 0.35, frontZ(ctx, 0.62), 0.045, 0.78, "z", 6);
}

function addLancetPair(parent, material, ctx) {
  for (const x of [-ctx.doorW / 2 - 1.22, ctx.doorW / 2 + 1.22]) {
    addBox(parent, material, x, 1.55, frontZ(ctx, 0.22), 0.18, 1.65, 0.32);
    addCylinder(parent, material, x, 2.48, frontZ(ctx, 0.22), 0.24, 0.3, "z", 12);
  }
}

function addLattice(parent, material, x, y, z, w, h, d, planeKind = "front", side = 1) {
  const bars = 4;
  for (let i = 0; i <= bars; i++) {
    const px = x - w / 2 + (w * i) / bars;
    if (planeKind === "front") addBox(parent, material, px, y, z, d, h, d);
    else addBox(parent, material, x, y, z - w / 2 + (w * i) / bars, d, h, d);
  }
  for (let j = 0; j <= bars; j++) {
    const py = y - h / 2 + (h * j) / bars;
    if (planeKind === "front") addBox(parent, material, x, py, z, w, d, d);
    else addBox(parent, material, x, py, z, d, d, w);
  }
}

function buildLamassu(parent, material, x, z) {
  addBox(parent, material, x, 0.68, z, 0.52, 0.58, 0.22);
  addBox(parent, material, x + Math.sign(x) * 0.16, 1.08, z, 0.26, 0.32, 0.22);
  for (let i = 0; i < 4; i++) addBox(parent, material, x - 0.18 + i * 0.12, 0.22, z, 0.055, 0.38, 0.16);
}

function buildMuqarnas(parent, material, ctx) {
  for (let row = 0; row < 3; row++) {
    const count = 5 + row * 2;
    const y = ctx.doorH + 0.05 + row * 0.18;
    const width = ctx.doorW - row * 0.35;
    for (let i = 0; i < count; i++) {
      addBox(parent, material, -width / 2 + (width * i) / Math.max(1, count - 1), y, frontZ(ctx, 0.62), 0.16, 0.16, 0.18);
    }
  }
}
