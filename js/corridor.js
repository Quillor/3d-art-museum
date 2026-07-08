// Builds one era-styled corridor segment in wing-local coordinates.
// The corridor runs along -Z: a segment occupies z in [z0, z0 - length].
import * as THREE from "three";
import { signTexture, stainedGlass, fileTex, rng, toTexture } from "./textures.js";
import { toon } from "./shading.js";

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

  // Stained-glass windows (gothic) between artwork positions
  if (style.windows === "stained") buildWindows(parent, z0, len, W, H, out.lights);

  // Props (e.g. sahel timber rows)
  if (style.props === "timbers") buildTimbers(parent, z0, len, W, style);

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
