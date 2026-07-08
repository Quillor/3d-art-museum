// Builds one era-styled corridor segment in wing-local coordinates.
// The corridor runs along -Z: a segment occupies z in [z0, z0 - length].
import * as THREE from "three";
import { signTexture, stainedGlass, fileTex, rng, toTexture } from "./textures.js";
import { toon } from "./shading.js";
import { buildHallArchitecture, buildPortalArchitecture } from "./architecture.js";

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
const detailTextureCache = new Map();

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

  // Coffered / beamed ceiling — shallow toon boxes under the ceiling give the
  // flat plane real depth, like the concept galleries. Skipped for the plain
  // white-cube modern rooms and for low earthen ceilings.
  if (!style.plain && H >= 7.2) buildCoffers(parent, style, z0, len, W, H);

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

  // Architectural trim — a crown cornice and a floor baseboard run the length
  // of both walls in an era-accent tone. Cheap boxes, well outside the walkable
  // channel, that lift every wing from "flat box" toward the reference art.
  if (!style.plain) buildTrim(parent, style, z0, len, W, H);

  // Entry facade: wall with door opening + portal frame + era sign
  buildPortal(parent, style, { z: z0, H, W, label, period, doorH: opts.doorH ?? 3.5 });

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
  // Otherwise articulate the bare walls with shallow pilaster strips that tie
  // the baseboard up to the cornice (never protruding into the walkway, and
  // kept clear of the artwork line).
  else if (!style.plain) buildWallPilasters(parent, style, z0, len, W, H, sideAnchorZ);

  // Stained-glass windows (gothic) between artwork positions
  if (style.windows === "stained") buildWindows(parent, z0, len, W, H, out.lights);

  // Props (e.g. sahel timber rows)
  if (style.props === "timbers") buildTimbers(parent, z0, len, W, style);

  // Era-specific architectural details from the concept sheets. These are
  // deliberately shallow/repeated so the gallery remains walkable and the art
  // anchors stay clear.
  if (style.details) buildStyleDetails(parent, style, z0, len, W, H, sideAnchorZ, out.lights);
  buildHallArchitecture(parent, style, { z0, len, W, H, sideAnchorZ, lights: out.lights });

  // Ceiling lights — held at a human-scale height so the tall new halls still
  // light the floor and artwork; range and intensity scale up with height.
  const every = style.light.every;
  const n = Math.max(1, Math.round(len / every));
  const ly = Math.min(H - 0.55, 5.4) + (style.light.y || 0);
  const range = Math.max(17, H * 2.1);
  const intensity = style.light.intensity * (1 + Math.max(0, H - 6) * 0.05);
  for (let i = 0; i < n; i++) {
    const z = z0 - (i + 0.5) * (len / n);
    const light = new THREE.PointLight(style.light.color, intensity, range, 2);
    light.position.set(0, ly, z);
    light.visible = false;
    parent.add(light);
    out.lights.push(light);
  }

  return out;
}

// Entry facade: a full wall panel with an era-specific ARCH cut through it,
// framed with a matching moulding, plus a crown (pediment/cavetto) where the
// era calls for one. The opening reaches the floor so it stays walkable.
export function buildPortal(parent, style, { z, H, W, label, period, doorH = 3.5, doorW = 3.4 }) {
  const t = 0.55;
  const arch = style.portal.arch || (style.portal.pointed ? "pointed" : style.portal.trapezoid ? "trapezoid" : "lintel");
  const outline = archOutline(arch, doorW, doorH);

  // solid wall panel with the arch opening cut out
  const shape = new THREE.Shape();
  shape.moveTo(-W / 2, -0.4);
  shape.lineTo(W / 2, -0.4);
  shape.lineTo(W / 2, H);
  shape.lineTo(-W / 2, H);
  shape.lineTo(-W / 2, -0.4);
  const hole = new THREE.Path();
  hole.moveTo(outline[0][0], outline[0][1]);
  for (let i = 1; i < outline.length; i++) hole.lineTo(outline[i][0], outline[i][1]);
  shape.holes.push(hole);

  const geo = new THREE.ExtrudeGeometry(shape, { depth: t, bevelEnabled: false });
  geo.translate(0, 0, -t);
  const uv = geo.attributes.uv, sc = 1 / style.wallUV;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * sc, uv.getY(i) * sc);
  const facade = new THREE.Mesh(geo, style.wall);
  facade.position.set(0, 0, z);
  parent.add(facade);

  // moulding following the opening (jambs + arch), proud of the wall
  const fmat = style.portal.mat;
  for (let i = 0; i < outline.length - 1; i++) {
    const [ax, ay] = outline[i], [bx, by] = outline[i + 1];
    const dx = bx - ax, dy = by - ay, seg = Math.hypot(dx, dy);
    if (seg < 0.02) continue;
    const beam = new THREE.Mesh(box, fmat);
    beam.scale.set(seg + 0.24, 0.26, t + 0.34);
    beam.position.set((ax + bx) / 2, (ay + by) / 2, z - t / 2);
    beam.rotation.z = Math.atan2(dy, dx);
    parent.add(beam);
  }

  const apex = Math.max(...outline.map((p) => p[1]));
  if (style.portal.pediment) buildPediment(parent, fmat, doorW, apex, z, t);
  if (arch === "batter") buildCavetto(parent, fmat, doorW, apex, z, t);
  if (style.portal.ornament) buildPortalOrnament(parent, style, outline, { z, t, doorW, doorH, apex });
  buildPortalArchitecture(parent, style, { z, H, W, doorW, doorH, outline, apex, t });

  // era sign facing the approaching visitor (+Z side)
  if (label) {
    const tex = signTexture(label, period, { mainSize: 64, subSize: 30 });
    const sign = new THREE.Mesh(plane, new THREE.MeshBasicMaterial({ map: tex, transparent: false }));
    sign.scale.set(2.9, 0.72, 1);
    const signY = Math.min(H - 0.5, apex + (style.portal.pediment ? doorW * 0.4 : 0.75));
    sign.position.set(0, signY, z + 0.14);
    parent.add(sign);
  }
}

// Opening outline: points from bottom-left (−hw,0) up over the top and down to
// bottom-right (hw,0). The floor sill is implied by closing the path.
function archOutline(type, dw, dh) {
  const hw = dw / 2;
  const bez = (p0, p1, p2, m = 8) => {
    const out = [];
    for (let k = 1; k <= m; k++) {
      const u = k / m, iu = 1 - u;
      out.push([iu * iu * p0[0] + 2 * iu * u * p1[0] + u * u * p2[0],
                iu * iu * p0[1] + 2 * iu * u * p1[1] + u * u * p2[1]]);
    }
    return out;
  };
  if (type === "trapezoid") { const tw = dw * 0.34; return [[-hw, 0], [-tw, dh], [tw, dh], [hw, 0]]; }
  if (type === "batter")    { const tw = dw * 0.42; return [[-hw, 0], [-tw, dh], [tw, dh], [hw, 0]]; }
  if (type === "stepped")
    return [[-hw, 0], [-hw, dh * 0.34], [-hw * 0.76, dh * 0.34], [-hw * 0.76, dh * 0.58],
            [-hw * 0.52, dh * 0.58], [-hw * 0.52, dh], [hw * 0.52, dh],
            [hw * 0.52, dh * 0.58], [hw * 0.76, dh * 0.58], [hw * 0.76, dh * 0.34],
            [hw, dh * 0.34], [hw, 0]];
  if (type === "keel") {
    const sH = dh * 0.42, apex = dh * 1.45;
    const left = bez([-hw, sH], [-hw * 0.78, dh * 1.02], [0, apex], 10);
    const right = bez([0, apex], [hw * 0.78, dh * 1.02], [hw, sH], 10);
    return [[-hw, 0], [-hw, sH], ...left, ...right, [hw, sH], [hw, 0]];
  }
  if (type === "moon") {
    const cy = dh * 0.56, r = hw * 1.05, pts = [[-hw, 0]];
    for (let k = 0; k <= 20; k++) {
      const a = Math.PI * (1 - k / 20);
      pts.push([Math.cos(a) * r, cy + Math.sin(a) * r]);
    }
    pts.push([hw, 0]);
    return pts;
  }
  if (type === "rock") {
    return [[-hw * 1.05, 0], [-hw * 1.08, dh * 0.25], [-hw * 0.86, dh * 0.62],
            [-hw * 0.42, dh * 1.02], [0, dh * 1.18], [hw * 0.46, dh * 0.98],
            [hw * 0.84, dh * 0.58], [hw * 1.08, dh * 0.22], [hw * 1.05, 0]];
  }
  if (type === "corbel")
    return [[-hw, 0], [-hw, dh * 0.5], [-hw * 0.5, dh * 0.8], [0, dh * 1.04],
            [hw * 0.5, dh * 0.8], [hw, dh * 0.5], [hw, 0]];
  if (type === "round") {
    const sH = dh * 0.6, r = hw, pts = [[-hw, 0], [-hw, sH]];
    for (let k = 1; k < 12; k++) { const a = Math.PI * (1 - k / 12); pts.push([Math.cos(a) * r, sH + Math.sin(a) * r]); }
    pts.push([hw, sH], [hw, 0]); return pts;
  }
  if (type === "horseshoe") {
    const cy = dh * 0.5, r = hw, pts = [[-hw, 0]];
    for (let k = 0; k <= 16; k++) { const a = (Math.PI + 0.38) * (1 - k / 16) - 0.19; pts.push([Math.cos(a) * r, cy + Math.sin(a) * r]); }
    pts.push([hw, 0]); return pts;
  }
  if (type === "pointed" || type === "cusped") {
    const sH = dh * 0.48, apex = dh + dh * 0.5;
    const left = bez([-hw, sH], [-hw * 0.5, apex], [0, apex], 8);
    const right = bez([0, apex], [hw * 0.5, apex], [hw, sH], 8);
    let pts = [[-hw, 0], [-hw, sH], ...left, ...right, [hw, sH], [hw, 0]];
    if (type === "cusped") pts = pts.map(([x, y], i) => {
      const f = y > sH ? 1 : 0;
      return [x - Math.sign(x) * f * 0.09 * Math.abs(Math.sin(i * 1.7)), y];
    });
    return pts;
  }
  return [[-hw, 0], [-hw, dh], [hw, dh], [hw, 0]]; // lintel
}

function buildPediment(parent, mat, dw, baseY, z, t) {
  const hw = dw / 2 + 0.7, peak = baseY + dw * 0.42, ang = Math.atan2(peak - baseY, hw);
  for (const side of [-1, 1]) {
    const L = Math.hypot(hw, peak - baseY);
    const beam = new THREE.Mesh(box, mat);
    beam.scale.set(L, 0.26, t + 0.32);
    beam.position.set(side * hw / 2, (baseY + peak) / 2, z - t / 2);
    beam.rotation.z = side < 0 ? ang : -ang;
    parent.add(beam);
  }
  const cor = new THREE.Mesh(box, mat);
  cor.scale.set(dw + 1.8, 0.24, t + 0.32);
  cor.position.set(0, baseY + 0.02, z - t / 2);
  parent.add(cor);
}

function buildCavetto(parent, mat, dw, baseY, z, t) {
  const cor = new THREE.Mesh(box, mat);
  cor.scale.set(dw + 1.9, 0.6, t + 0.5);
  cor.position.set(0, baseY + 0.34, z - t / 2);
  parent.add(cor);
  const roll = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, dw + 1.9, 8), mat);
  roll.rotation.z = Math.PI / 2;
  roll.position.set(0, baseY + 0.02, z - t / 2 + 0.08);
  parent.add(roll);
}

function buildPortalOrnament(parent, style, outline, { z, t, doorW, doorH, apex }) {
  const kinds = Array.isArray(style.portal.ornament) ? style.portal.ornament : [style.portal.ornament];
  const mat = style.portal.mat;
  for (const kind of kinds) {
    if (kind === "steppedBlocks") {
      for (const side of [-1, 1]) {
        for (let i = 0; i < 3; i++) {
          const b = new THREE.Mesh(box, mat);
          b.scale.set(0.34 + i * 0.18, 0.28, t + 0.46);
          b.position.set(side * (doorW / 2 + 0.22 + i * 0.28), 0.62 + i * 0.48, z - t / 2 + 0.04);
          parent.add(b);
        }
      }
    } else if (kind === "serpentGlyph") {
      addFacadePlane(parent, "serpent", 2.7, 0.62, 0, apex + 0.42, z + 0.08);
    } else if (kind === "ishtarTile") {
      buildTileBorder(parent, doorW, doorH, apex, z, t, [0x1c4d7c, 0xe8c95f]);
      addFacadePlane(parent, "rosette", 2.4, 0.5, 0, apex + 0.42, z + 0.09);
    } else if (kind === "lamassuRelief") {
      for (const side of [-1, 1]) addFacadePlane(parent, "lamassu", 0.72, 1.45, side * (doorW / 2 + 0.62), 1.35, z + 0.08);
    } else if (kind === "geometricTile") {
      buildTileBorder(parent, doorW, doorH, apex, z, t, [0x2a5b78, 0xe4d9b8, 0x3f8ea6]);
    } else if (kind === "iznikTile") {
      buildTileBorder(parent, doorW, doorH, apex, z, t, [0x7c1f2a, 0xe8ddc2, 0x27516e]);
      addFacadePlane(parent, "rosette", 2.25, 0.56, 0, apex + 0.42, z + 0.1);
    } else if (kind === "puebloVigas") {
      buildPortalTorons(parent, 0x6e5335, doorW, doorH + 0.32, z, 5);
    } else if (kind === "moonGate") {
      buildTileBorder(parent, doorW, doorH, apex, z, t, [0x7c2418, 0x2c1c12]);
    } else if (kind === "carvedLintel") {
      addFacadePlane(parent, "khmer", 2.8, 0.54, 0, apex + 0.34, z + 0.08);
    } else if (kind === "shojiFrame") {
      buildShojiPortal(parent, doorW, doorH, z, t);
    } else if (kind === "jaliScreens") {
      for (const side of [-1, 1]) addFacadePlane(parent, "jali", 0.82, 2.0, side * (doorW / 2 + 0.72), 1.62, z + 0.08);
    } else if (kind === "hieroglyphs") {
      addFacadePlane(parent, "hieroglyph", 2.85, 0.56, 0, apex + 0.36, z + 0.08);
    } else if (kind === "toronBeams") {
      buildPortalTorons(parent, 0x54371e, doorW, doorH + 0.18, z, 7);
    } else if (kind === "rockArt") {
      addFacadePlane(parent, "xray", 2.35, 0.7, 0, apex + 0.3, z + 0.08);
    } else if (kind === "salonTrim") {
      buildTileBorder(parent, doorW, doorH, apex, z, t, [0xc9a256, 0x4e5340]);
    } else if (kind === "baroqueScroll") {
      addFacadePlane(parent, "scroll", 2.5, 0.58, 0, apex + 0.42, z + 0.08);
    }
  }
}

function buildTileBorder(parent, doorW, doorH, apex, z, t, colors) {
  const yTop = Math.min(apex + 0.16, doorH + 1.4);
  const countY = 7;
  for (const side of [-1, 1]) {
    for (let i = 0; i < countY; i++) {
      const sq = new THREE.Mesh(box, toon({ color: colors[i % colors.length] }));
      sq.scale.set(0.22, 0.22, t + 0.48);
      sq.position.set(side * (doorW / 2 + 0.32), 0.45 + i * ((yTop - 0.45) / (countY - 1)), z - t / 2 + 0.06);
      parent.add(sq);
    }
  }
  const countX = 9;
  for (let i = 0; i < countX; i++) {
    const sq = new THREE.Mesh(box, toon({ color: colors[(i + 1) % colors.length] }));
    sq.scale.set(0.22, 0.22, t + 0.48);
    sq.position.set(-doorW / 2 + i * (doorW / (countX - 1)), yTop, z - t / 2 + 0.06);
    parent.add(sq);
  }
}

function buildPortalTorons(parent, color, doorW, y, z, n) {
  const mat = toon({ color });
  const geo = new THREE.CylinderGeometry(0.065, 0.065, 1.0, 6);
  for (let i = 0; i < n; i++) {
    const beam = new THREE.Mesh(geo, mat);
    beam.rotation.x = Math.PI / 2;
    beam.position.set(-doorW / 2 + i * (doorW / Math.max(1, n - 1)), y + (i % 2) * 0.18, z + 0.38);
    parent.add(beam);
  }
}

function buildShojiPortal(parent, doorW, doorH, z, t) {
  const mat = toon({ color: 0x3c2c1a });
  for (const x of [-doorW / 2 - 0.2, doorW / 2 + 0.2]) {
    const post = new THREE.Mesh(box, mat);
    post.scale.set(0.08, doorH, t + 0.52);
    post.position.set(x, doorH / 2, z - t / 2 + 0.04);
    parent.add(post);
  }
  for (let i = 1; i <= 3; i++) {
    const rail = new THREE.Mesh(box, mat);
    rail.scale.set(doorW + 0.55, 0.055, t + 0.52);
    rail.position.set(0, i * (doorH / 4), z - t / 2 + 0.04);
    parent.add(rail);
  }
}

function addFacadePlane(parent, kind, w, h, x, y, z) {
  const mesh = new THREE.Mesh(plane, motifMaterial(kind));
  mesh.scale.set(w, h, 1);
  mesh.position.set(x, y, z);
  parent.add(mesh);
}

// ---- Shared architectural trim (all wings) ----

function mixHex(a, b, t) {
  const ca = new THREE.Color(a), cb = new THREE.Color(b);
  return ca.lerp(cb, t).getHex();
}

// Cache trim materials on the style object so repeated segments share them.
function trimMats(style) {
  if (!style._trim) {
    const accent = (style.portal && style.portal.mat && style.portal.mat.color)
      ? style.portal.mat.color.getHex() : 0x9c8a68;
    style._trim = {
      cornice: toon({ color: accent }),
      base: toon({ color: mixHex(accent, 0x000000, 0.22) }),
      beam: toon({ color: mixHex(accent, 0x000000, 0.12) }),
      pilaster: toon({ color: mixHex(accent, 0xffffff, 0.06) }),
    };
  }
  return style._trim;
}

// Crown cornice at the wall top + baseboard at the floor, both walls.
function buildTrim(parent, style, z0, len, W, H) {
  const m = trimMats(style);
  const zc = z0 - len / 2;
  const x = W / 2 - 0.09;
  for (const side of [-1, 1]) {
    // baseboard
    const base = new THREE.Mesh(box, m.base);
    base.scale.set(0.16, 0.42, len);
    base.position.set(side * (x + 0.02), 0.21 - FLOOR_EPS, zc);
    parent.add(base);
    // cornice (two-step: a fascia and a small crown roll)
    const fascia = new THREE.Mesh(box, m.cornice);
    fascia.scale.set(0.22, 0.34, len);
    fascia.position.set(side * (x + 0.01), H - 0.28, zc);
    parent.add(fascia);
    const crown = new THREE.Mesh(box, m.cornice);
    crown.scale.set(0.34, 0.14, len);
    crown.position.set(side * (x - 0.05), H - 0.5, zc);
    parent.add(crown);
  }
}

// Coffered grid under the ceiling: longitudinal beams + regular cross beams.
function buildCoffers(parent, style, z0, len, W, H) {
  const m = trimMats(style);
  const y = H - 0.18;
  const inset = 0.35;
  // longitudinal beams
  for (const bx of [-1, 0, 1]) {
    const beam = new THREE.Mesh(box, m.beam);
    beam.scale.set(0.28, 0.32, len - 0.2);
    beam.position.set(bx * (W / 2 - inset), y, z0 - len / 2);
    parent.add(beam);
  }
  // cross beams every ~2.6 m
  const n = Math.max(2, Math.round(len / 2.6));
  for (let i = 0; i <= n; i++) {
    const z = z0 - 0.1 - i * ((len - 0.2) / n);
    const beam = new THREE.Mesh(box, m.beam);
    beam.scale.set(W - 2 * inset + 0.2, 0.32, 0.26);
    beam.position.set(0, y, z);
    parent.add(beam);
  }
}

// Shallow pilaster strips on bare walls, aligned to a regular bay and kept at
// least ~1.4 m clear of any artwork so nothing is ever framed-over.
function buildWallPilasters(parent, style, z0, len, W, H, sideAnchorZ) {
  const m = trimMats(style);
  const x = W / 2 - 0.06;
  const bays = Math.max(2, Math.round(len / 3.2));
  const capH = 0.26;
  const shaftH = H - 0.62 - 0.42;         // between baseboard and cornice
  for (const side of [-1, 1]) {
    const arts = sideAnchorZ[String(side)] || [];
    for (let i = 0; i <= bays; i++) {
      const z = z0 - 0.3 - i * ((len - 0.6) / bays);
      if (arts.some((az) => Math.abs(az - z) < 1.4)) continue;
      const shaft = new THREE.Mesh(box, m.base);   // darker accent reads on pale walls
      shaft.scale.set(0.2, shaftH, 0.52);
      shaft.position.set(side * x, 0.42 + shaftH / 2, z);
      shaft.rotation.y = -side * Math.PI / 2;
      parent.add(shaft);
      const cap = new THREE.Mesh(box, m.cornice);
      cap.scale.set(0.14, capH, 0.66);
      cap.position.set(side * (x - 0.01), 0.42 + shaftH + capH / 2 - 0.02, z);
      cap.rotation.y = -side * Math.PI / 2;
      parent.add(cap);
    }
  }
}

function buildColumns(parent, style, z0, len, W, sideAnchorZ, columnNarrows) {
  const { type, color } = style.columns;
  if (type === "pilaster") {
    buildPilasters(parent, style, z0, len, W);
    return;
  }
  const mat = toon({ color });
  const H = style.ceilH;
  for (const side of [-1, 1]) {
    const arts = sideAnchorZ[String(side)];
    // midpoints between neighbouring artworks, plus one near each end
    const spots = [];
    if (arts.length === 0) {
      const n = Math.max(1, Math.floor(len / (style.columns.every || 5.6)));
      for (let i = 0; i <= n; i++) spots.push(z0 - PAD_START * 0.6 - i * ((len - PAD_START) / n));
    } else {
      const first = Math.min(z0 - 1.6, arts[0] + SLOT_LEN / 2);
      if (arts[0] - first >= 2.1) spots.push(first);
      for (let i = 0; i < arts.length - 1; i++) spots.push((arts[i] + arts[i + 1]) / 2);
      const last = Math.max(z0 - len + 1.4, arts[arts.length - 1] - SLOT_LEN / 2);
      if (arts[arts.length - 1] - last >= 2.1) spots.push(last);
    }
    for (const z of spots) {
      if (z > z0 - 0.9 || z < z0 - len + 0.9) continue;
      const x = side * (W / 2 - 0.42);
      const g = makeColumn(type, mat, H);
      const holder = new THREE.Group();
      holder.add(g);
      holder.position.set(x, -FLOOR_EPS, z);
      parent.add(holder);
      columnNarrows.push({ z, side });
    }
  }
}

function makeColumn(type, mat, H) {
  // thicken the shaft with height so tall halls don't get spindly columns
  const hf = Math.max(1, Math.min(1.9, H / 5.5));
  let g;
  if (type === "doric") {
    g = new THREE.Group();
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.24 * hf, 0.30 * hf, H - 0.7, 14), mat);
    shaft.position.y = (H - 0.7) / 2;
    const cap = new THREE.Mesh(box, mat);
    cap.scale.set(0.72 * hf, 0.18, 0.72 * hf);
    cap.position.y = H - 0.62;
    const abacus = new THREE.Mesh(new THREE.CylinderGeometry(0.42 * hf, 0.3 * hf, 0.22, 14), mat);
    abacus.position.y = H - 0.42;
    g.add(shaft, cap, abacus);
  } else if (type === "papyrus") {
    g = new THREE.Group();
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.22 * hf, 0.3 * hf, H - 1.0, 12), mat);
    shaft.position.y = (H - 1.0) / 2;
    const bud = new THREE.Mesh(new THREE.CylinderGeometry(0.5 * hf, 0.2 * hf, 0.75, 12), mat);
    bud.position.y = H - 0.85;
    g.add(shaft, bud);
  } else if (type === "persian") {
    g = new THREE.Group();
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.2 * hf, 0.26 * hf, H - 1.1, 14), mat);
    shaft.position.y = (H - 1.1) / 2;
    const capital = new THREE.Mesh(box, mat);
    capital.scale.set(0.85 * hf, 0.5, 0.4 * hf);
    capital.position.y = H - 0.75;
    const volute = new THREE.Mesh(new THREE.CylinderGeometry(0.17 * hf, 0.17 * hf, 1.0 * hf, 10), mat);
    volute.rotation.x = Math.PI / 2;
    volute.position.y = H - 0.4;
    g.add(shaft, capital, volute);
  } else { // red / wood post
    const r = (type === "red" ? 0.2 : 0.15) * hf;
    g = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.08, H, 12), mat);
    g.position.y = H / 2;
  }
  return g;
}

function buildPilasters(parent, style, z0, len, W) {
  const { every, color } = style.columns;
  const mat = toon({ color });
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

function buildWindows(parent, z0, len, W, H, lights) {
  if (!glassTex) {
    glassTex = fileTex("window_lancet", stainedGlass(171));
    glassTex.wrapS = glassTex.wrapT = THREE.ClampToEdgeWrapping;
  }
  const mat = new THREE.MeshBasicMaterial({ map: glassTex });
  const n = Math.max(1, Math.floor(len / 11));
  // tall lancets rising up the high cathedral walls, above the artwork line
  const wh = Math.min(H - 4.2, 5.2);
  const wy = 3.4 + wh / 2;
  for (let i = 0; i < n; i++) {
    const z = z0 - PAD_START - (i + 0.5) * ((len - PAD_START) / n) - SLOT_LEN * 0.5;
    for (const side of [-1, 1]) {
      const wdw = new THREE.Mesh(plane, mat);
      wdw.scale.set(wh * 0.5, wh, 1);
      wdw.position.set(side * (W / 2 - 0.05), wy, z);
      wdw.rotation.y = -side * Math.PI / 2;
      parent.add(wdw);
      const glow = new THREE.PointLight(0x9db8e8, 9, 9, 2);
      glow.position.set(side * (W / 2 - 0.8), wy, z);
      glow.visible = false;
      parent.add(glow);
      lights.push(glow);
    }
  }
}

function buildTimbers(parent, z0, len, W, style) {
  const rand = rng(701);
  const mat = toon({ color: 0x5c4227 });
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

function buildStyleDetails(parent, style, z0, len, W, H, sideAnchorZ, lights) {
  const d = style.details;
  if (d.wallMotif) buildWallMotifs(parent, d.wallMotif, z0, len, W, H, sideAnchorZ);
  if (d.vigas) buildVigaCeiling(parent, d.vigas, z0, len, W, H);
  if (d.shojiGrid) buildSideGrid(parent, z0, len, W, H, 0x3c2c1a);
  if (d.jaliScreens) buildWallScreens(parent, "jali", z0, len, W, H, lights);
  if (d.domedCeiling) buildDomedCeiling(parent, z0, len, W, H, d.domedCeiling);
  if (d.lacquerRails) buildSideGrid(parent, z0, len, W, H, 0x1f140e, 0.45);
}

function buildWallMotifs(parent, kind, z0, len, W, H, sideAnchorZ) {
  const mat = motifMaterial(kind);
  const n = Math.max(2, Math.round(len / 7.5));
  const y = Math.min(H - 1.0, Math.max(2.9, H * 0.58));
  const h = kind === "hieroglyph" ? 0.9 : 0.66;
  const w = kind === "serpent" ? 1.45 : 1.2;
  for (const side of [-1, 1]) {
    const arts = sideAnchorZ[String(side)] || [];
    for (let i = 0; i < n; i++) {
      const z = z0 - 1.4 - (i + 0.5) * ((len - 2.8) / n);
      if (arts.some((az) => Math.abs(az - z) < 0.85 && y < 3.4)) continue;
      const m = new THREE.Mesh(plane, mat);
      m.scale.set(w, h, 1);
      m.position.set(side * (W / 2 - 0.045), y + ((i % 2) - 0.5) * 0.22, z);
      m.rotation.y = -side * Math.PI / 2;
      parent.add(m);
    }
  }
}

function buildVigaCeiling(parent, color, z0, len, W, H) {
  const mat = toon({ color });
  const geo = new THREE.CylinderGeometry(0.095, 0.095, W + 0.48, 8);
  const n = Math.max(3, Math.floor(len / 1.8));
  for (let i = 0; i <= n; i++) {
    const beam = new THREE.Mesh(geo, mat);
    beam.rotation.z = Math.PI / 2;
    beam.position.set(0, H - 0.28, z0 - 0.45 - i * ((len - 0.9) / n));
    parent.add(beam);
  }
}

function buildSideGrid(parent, z0, len, W, H, color, spacing = 0.72) {
  const mat = toon({ color });
  const y0 = 0.55, y1 = H - 0.55;
  const n = Math.max(3, Math.floor(len / spacing));
  for (const side of [-1, 1]) {
    const x = side * (W / 2 - 0.035);
    for (let i = 0; i <= n; i++) {
      const bar = new THREE.Mesh(box, mat);
      bar.scale.set(0.055, y1 - y0, 0.035);
      bar.position.set(x, (y0 + y1) / 2, z0 - 0.4 - i * ((len - 0.8) / n));
      parent.add(bar);
    }
    for (let i = 0; i < 4; i++) {
      const rail = new THREE.Mesh(box, mat);
      rail.scale.set(0.055, 0.045, len - 0.8);
      rail.position.set(x, y0 + i * ((y1 - y0) / 3), z0 - len / 2);
      parent.add(rail);
    }
  }
}

function buildWallScreens(parent, kind, z0, len, W, H, lights) {
  const mat = motifMaterial(kind);
  const n = Math.max(1, Math.floor(len / 9));
  for (const side of [-1, 1]) {
    for (let i = 0; i < n; i++) {
      const z = z0 - 2.6 - i * ((len - 5.2) / Math.max(1, n));
      const screen = new THREE.Mesh(plane, mat);
      screen.scale.set(1.2, Math.min(2.2, H - 2.4), 1);
      screen.position.set(side * (W / 2 - 0.04), Math.min(H - 1.7, 2.7), z);
      screen.rotation.y = -side * Math.PI / 2;
      parent.add(screen);
      const glow = new THREE.PointLight(0xfff1d4, 5, 6, 2);
      glow.position.set(side * (W / 2 - 0.55), 2.7, z);
      glow.visible = false;
      parent.add(glow);
      lights.push(glow);
    }
  }
}

function buildDomedCeiling(parent, z0, len, W, H, color) {
  const mat = toon({ color, side: THREE.BackSide });
  const n = Math.max(1, Math.round(len / 8));
  for (let i = 0; i < n; i++) {
    const dome = new THREE.Mesh(new THREE.SphereGeometry(1.8, 24, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat);
    dome.scale.set(Math.min(1.25, W / 5), 0.46, 1.05);
    dome.position.set(0, H - 0.08, z0 - (i + 0.5) * (len / n));
    parent.add(dome);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.82, 0.045, 8, 32), toon({ color: mixHex(color, 0xffffff, 0.18) }));
    ring.rotation.x = Math.PI / 2;
    ring.scale.set(dome.scale.x, dome.scale.z, 1);
    ring.position.set(0, H - 0.08, dome.position.z);
    parent.add(ring);
  }
}

function motifMaterial(kind) {
  const tex = motifTexture(kind);
  return new THREE.MeshBasicMaterial({
    map: tex,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
}

function motifTexture(kind) {
  if (detailTextureCache.has(kind)) return detailTextureCache.get(kind);
  const c = document.createElement("canvas");
  c.width = 512; c.height = 256;
  const ctx = c.getContext("2d");
  ctx.clearRect(0, 0, c.width, c.height);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  if (kind === "serpent") drawSerpent(ctx);
  else if (kind === "jali") drawJali(ctx);
  else if (kind === "hieroglyph") drawHieroglyphs(ctx);
  else if (kind === "xray") drawXray(ctx);
  else if (kind === "lamassu") drawLamassu(ctx);
  else if (kind === "khmer") drawKhmerLintel(ctx);
  else if (kind === "rosette") drawRosettes(ctx);
  else if (kind === "scroll") drawScroll(ctx);
  else drawMarks(ctx);
  const tex = toTexture(c);
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  detailTextureCache.set(kind, tex);
  return tex;
}

function drawSerpent(ctx) {
  ctx.strokeStyle = "rgba(45,32,18,0.86)";
  ctx.lineWidth = 18;
  ctx.beginPath();
  for (let i = 0; i <= 12; i++) {
    const x = 34 + i * 37;
    const y = 124 + Math.sin(i * 1.2) * 42;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.fillStyle = "rgba(160,106,55,0.82)";
  for (let i = 0; i < 14; i++) ctx.fillRect(32 + i * 34, 104 + Math.sin(i * 1.2) * 42, 16, 16);
}

function drawJali(ctx) {
  ctx.strokeStyle = "rgba(70,55,38,0.82)";
  ctx.lineWidth = 8;
  for (let x = -64; x < 580; x += 56) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + 180, 256); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + 180, 0); ctx.lineTo(x, 256); ctx.stroke();
  }
  ctx.strokeStyle = "rgba(236,226,210,0.7)";
  ctx.lineWidth = 3;
  for (let x = 28; x < 512; x += 56) for (let y = 28; y < 256; y += 56) {
    ctx.beginPath(); ctx.arc(x, y, 14, 0, Math.PI * 2); ctx.stroke();
  }
}

function drawHieroglyphs(ctx) {
  ctx.strokeStyle = "rgba(58,44,24,0.9)";
  ctx.fillStyle = "rgba(58,44,24,0.72)";
  ctx.lineWidth = 6;
  for (let i = 0; i < 12; i++) {
    const x = 22 + i * 40;
    ctx.strokeRect(x, 48, 22, 64);
    ctx.beginPath(); ctx.arc(x + 12, 154, 13, 0, Math.PI * 2); ctx.stroke();
    ctx.fillRect(x + 8, 174, 8, 40);
  }
}

function drawXray(ctx) {
  ctx.strokeStyle = "rgba(240,205,155,0.88)";
  ctx.lineWidth = 7;
  for (let i = 0; i < 4; i++) {
    const x = 70 + i * 110, y = 126 + (i % 2) * 18;
    ctx.beginPath(); ctx.ellipse(x, y, 42, 20, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x - 28, y); ctx.lineTo(x + 28, y); ctx.moveTo(x, y - 18); ctx.lineTo(x, y + 18); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + 42, y); ctx.lineTo(x + 68, y - 18); ctx.moveTo(x + 42, y); ctx.lineTo(x + 68, y + 18); ctx.stroke();
  }
}

function drawLamassu(ctx) {
  ctx.fillStyle = "rgba(90,76,54,0.76)";
  ctx.fillRect(150, 72, 170, 84);
  ctx.beginPath(); ctx.arc(330, 82, 34, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "rgba(90,76,54,0.9)";
  ctx.lineWidth = 8;
  for (let i = 0; i < 5; i++) {
    ctx.beginPath(); ctx.moveTo(170 + i * 24, 156); ctx.lineTo(155 + i * 28, 220); ctx.stroke();
  }
  ctx.beginPath(); ctx.moveTo(160, 68); ctx.lineTo(84, 28); ctx.lineTo(130, 132); ctx.stroke();
}

function drawKhmerLintel(ctx) {
  ctx.strokeStyle = "rgba(48,44,34,0.8)";
  ctx.lineWidth = 8;
  ctx.strokeRect(36, 66, 440, 112);
  for (let i = 0; i < 9; i++) {
    ctx.beginPath();
    ctx.arc(76 + i * 45, 122, 18, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawRosettes(ctx) {
  ctx.strokeStyle = "rgba(232,221,194,0.9)";
  ctx.fillStyle = "rgba(39,81,110,0.76)";
  ctx.lineWidth = 5;
  for (let i = 0; i < 7; i++) {
    const x = 64 + i * 64;
    for (let p = 0; p < 8; p++) {
      ctx.beginPath();
      ctx.ellipse(x + Math.cos(p * Math.PI / 4) * 18, 128 + Math.sin(p * Math.PI / 4) * 18, 8, 18, p * Math.PI / 4, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
    }
  }
}

function drawScroll(ctx) {
  ctx.strokeStyle = "rgba(201,162,86,0.9)";
  ctx.lineWidth = 9;
  for (const ox of [130, 380]) {
    ctx.beginPath();
    for (let a = 0; a < Math.PI * 2.6; a += 0.18) {
      const r = 9 + a * 7;
      const x = ox + Math.cos(a) * r;
      const y = 128 + Math.sin(a) * r;
      if (a === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
}

function drawMarks(ctx) {
  ctx.fillStyle = "rgba(235,205,170,0.84)";
  for (let i = 0; i < 9; i++) {
    ctx.beginPath();
    ctx.ellipse(50 + i * 48, 128 + Math.sin(i) * 30, 10, 24, 0.4, 0, Math.PI * 2);
    ctx.fill();
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
  const backBase = new THREE.Color(0xfff2d4);
  const white = new THREE.Color(0xffffff);
  const back = new THREE.Mesh(plane, new THREE.MeshBasicMaterial({ color: backBase.clone() }));
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

  // volumetric-looking halo hanging in front of the wall
  const halo = new THREE.Mesh(plane, new THREE.MeshBasicMaterial({
    map: haloTexture(), transparent: true, opacity: 0.14,
    blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  halo.scale.set(11, 8.5, 1);
  halo.position.set(0, H / 2, zFar + 0.6);
  parent.add(halo);

  // soft glow spilling onto the landing floor
  const glow = new THREE.Mesh(plane, new THREE.MeshBasicMaterial({
    color: 0xffedc8, transparent: true, opacity: 0.16,
    blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  glow.rotation.x = -Math.PI / 2;
  glow.scale.set(W, 3.2, 1);
  glow.position.set(0, 0.015, zFar + 1.7);
  parent.add(glow);

  const light = new THREE.PointLight(0xffedc8, 60, 20, 2);
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
  // dist = how far away the visitor is; the light swells as they approach
  function update(t, dist = 40) {
    const near = Math.max(0, Math.min(1, (20 - dist) / 16));
    const k = near * near; // ease-in: gentle far away, blooming up close
    layers[0].material.map.offset.y = (t * 0.045) % 1;
    layers[0].material.opacity = (0.45 + 0.18 * Math.sin(t * 1.7 + phase)) * (1 + 0.5 * k);
    layers[1].material.map.offset.y = (-t * 0.03) % 1;
    layers[1].material.map.offset.x = (t * 0.012) % 1;
    layers[1].material.opacity = (0.38 + 0.16 * Math.sin(t * 2.3 + phase + 1.4)) * (1 + 0.5 * k);
    light.intensity = (60 + 360 * k) * (0.88 + 0.12 * Math.sin(t * 1.9 + phase));
    halo.material.opacity = 0.14 + 0.82 * k * (0.88 + 0.12 * Math.sin(t * 2.8 + phase));
    const pulse = 1 + 0.05 * k * Math.sin(t * 2.2 + phase);
    halo.scale.set(11 * pulse, 8.5 * pulse, 1);
    back.material.color.copy(backBase).lerp(white, k);
    glow.material.opacity = 0.16 + 0.4 * k;
  }

  return { zFar, update, localCenter: new THREE.Vector3(0, 1.6, zFar) };
}

function haloTexture() {
  const c = document.createElement("canvas");
  c.width = 256; c.height = 256;
  const ctx = c.getContext("2d");
  const g = ctx.createRadialGradient(128, 128, 8, 128, 128, 126);
  g.addColorStop(0, "rgba(255,246,224,0.95)");
  g.addColorStop(0.45, "rgba(255,238,200,0.42)");
  g.addColorStop(1, "rgba(255,238,200,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
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
