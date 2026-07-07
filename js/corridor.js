// Builds one era-styled corridor segment in wing-local coordinates.
// The corridor runs along -Z: a segment occupies z in [z0, z0 - length].
import * as THREE from "three";
import { signTexture, stainedGlass, rng } from "./textures.js";

export const HALL_W = 7;          // corridor width
export const SLOT_LEN = 5.5;      // artwork spacing along one wall
export const PAD_START = 3.2;     // dead space after each portal
export const PAD_END = 2.0;
export const END_ZONE_LEN = 4.8;  // landing at the end of a wing, with the loop door

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
// Returns { anchors, lights, colliders, zEnd, ceilH }
export function buildSegment(parent, style, opts) {
  const { count, z0, label, period } = opts;
  const len = segmentLength(count);
  const zEnd = z0 - len;
  const zc = z0 - len / 2;
  const H = style.ceilH;
  const W = HALL_W;
  const out = { anchors: [], lights: [], colliders: [], zEnd, ceilH: H };

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

  // Columns
  if (style.columns) buildColumns(parent, style, z0, len, W, out.colliders);

  // Stained-glass windows (gothic) between artwork positions
  if (style.windows === "stained") buildWindows(parent, z0, len, W, H, out.lights);

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

  // Artwork anchors, staggered left/right
  for (let i = 0; i < count; i++) {
    const side = i % 2 === 0 ? -1 : 1; // start left
    const k = Math.floor(i / 2);
    const z = z0 - PAD_START - (k + (side === 1 ? 0.62 : 0.22)) * SLOT_LEN - 1.2;
    out.anchors.push({
      x: side * (W / 2 - 0.09), y: 1.85, z,
      rotY: side === -1 ? Math.PI / 2 : -Math.PI / 2,
      frame: style.frame,
    });
  }
  return out;
}

export function buildPortal(parent, style, { z, H, W, label, period, doorH = 3.5, doorW = 3.4 }) {
  const mat = style.portal.mat;
  const t = 0.55; // depth
  const shoulderW = (W - doorW) / 2;
  // shoulders
  for (const side of [-1, 1]) {
    const s = new THREE.Mesh(box, style.wall);
    s.scale.set(shoulderW, H, t);
    s.position.set(side * (doorW / 2 + shoulderW / 2), H / 2, z - t / 2);
    parent.add(s);
  }
  // header
  const head = new THREE.Mesh(box, style.wall);
  head.scale.set(doorW + 0.02, H - doorH, t);
  head.position.set(0, doorH + (H - doorH) / 2, z - t / 2);
  parent.add(head);
  // frame: jambs + lintel proud of the wall
  for (const side of [-1, 1]) {
    const j = new THREE.Mesh(box, mat);
    j.scale.set(0.42, doorH + 0.4, t + 0.3);
    j.position.set(side * (doorW / 2 + 0.14), (doorH + 0.4) / 2, z - t / 2);
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

// Physical footprint of each column type: total keep-out radius incl. player.
const COLUMN_R = { doric: 0.70, papyrus: 0.70, persian: 0.62, red: 0.56, wood: 0.48 };

function buildColumns(parent, style, z0, len, W, colliders) {
  const { type, every, color, finish } = style.columns;
  const mat = finish
    ? new THREE.MeshPhongMaterial({ color, specular: 0x3a352c, shininess: finish === "polished" ? 70 : 25 })
    : new THREE.MeshLambertMaterial({ color });
  const H = style.ceilH;
  const n = Math.max(1, Math.floor(len / every));
  for (let i = 0; i <= n; i++) {
    const z = z0 - PAD_START * 0.6 - i * ((len - PAD_START) / n);
    for (const side of [-1, 1]) {
      const x = side * (W / 2 - 0.42);
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
      } else if (type === "red" || type === "wood") {
        g = new THREE.Mesh(new THREE.CylinderGeometry(type === "red" ? 0.2 : 0.13, type === "red" ? 0.22 : 0.14, H, 10), mat);
        g.position.y = H / 2;
      } else { // pilaster — flush with the wall, no collider needed
        g = new THREE.Mesh(box, mat);
        g.scale.set(0.5, H, 0.16);
        g.position.y = H / 2;
      }
      const holder = new THREE.Group();
      holder.add(g);
      holder.position.set(type === "pilaster" ? side * (W / 2 - 0.08) : x, 0, z);
      if (type === "pilaster") holder.rotation.y = -side * Math.PI / 2;
      parent.add(holder);
      if (type !== "pilaster") colliders.push({ x, z, r: COLUMN_R[type] || 0.6 });
    }
  }
}

function buildWindows(parent, z0, len, W, H, lights) {
  if (!glassTex) glassTex = stainedGlass(171);
  const mat = new THREE.MeshBasicMaterial({ map: glassTex });
  const n = Math.max(1, Math.floor(len / 11));
  for (let i = 0; i < n; i++) {
    const z = z0 - PAD_START - (i + 0.5) * ((len - PAD_START) / n) - SLOT_LEN * 0.5;
    for (const side of [-1, 1]) {
      const wdw = new THREE.Mesh(plane, mat);
      wdw.scale.set(1.15, 2.3, 1);
      wdw.position.set(side * (W / 2 - 0.05), 4.6, z);
      wdw.rotation.y = -side * Math.PI / 2;
      parent.add(wdw);
      const glow = new THREE.PointLight(0x9db8e8, 8, 8, 2);
      glow.position.set(side * (W / 2 - 0.8), 4.2, z);
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

// Landing at the far end of a wing: bench, farewell sign, and — on the right
// wall — the door that continues the loop into the next region's modern era.
// Returns { zFar, doorZ, signMat, lights, colliders }.
export function buildEndZone(parent, style, zStart, regionLabel) {
  const W = HALL_W, H = style.ceilH, LEN = END_ZONE_LEN;
  const zFar = zStart - LEN, zc = zStart - LEN / 2;
  const doorZ = zStart - 2.45;
  const DOOR_W = 2.0, DOOR_H = 3.05;

  // floor + ceiling
  const floor = new THREE.Mesh(scaledUVPlane(W, LEN, W / style.floorUV, LEN / style.floorUV), style.floor);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, 0, zc);
  parent.add(floor);
  const ceil = new THREE.Mesh(scaledUVPlane(W, LEN, W / (style.ceilUV || 6), LEN / (style.ceilUV || 6)), style.ceiling);
  ceil.rotation.x = Math.PI / 2;
  ceil.position.set(0, H, zc);
  parent.add(ceil);

  // left wall (solid)
  const lw = new THREE.Mesh(box, style.wall);
  lw.scale.set(0.25, H, LEN);
  lw.position.set(-(W / 2 + 0.12), H / 2, zc);
  parent.add(lw);

  // right wall with the loop-door opening
  const zA0 = zStart, zA1 = doorZ + DOOR_W / 2;   // piece near the hall
  const zB0 = doorZ - DOOR_W / 2, zB1 = zFar;     // piece near the end wall
  for (const [za, zb] of [[zA0, zA1], [zB0, zB1]]) {
    const seg = new THREE.Mesh(box, style.wall);
    seg.scale.set(0.25, H, za - zb);
    seg.position.set(W / 2 + 0.12, H / 2, (za + zb) / 2);
    parent.add(seg);
  }
  const header = new THREE.Mesh(box, style.wall);
  header.scale.set(0.25, H - DOOR_H, DOOR_W);
  header.position.set(W / 2 + 0.12, DOOR_H + (H - DOOR_H) / 2, doorZ);
  parent.add(header);

  // dark door frame
  const frameMat = new THREE.MeshPhongMaterial({ color: 0x26262c, specular: 0x36363e, shininess: 40 });
  for (const dz of [-1, 1]) {
    const j = new THREE.Mesh(box, frameMat);
    j.scale.set(0.34, DOOR_H + 0.3, 0.24);
    j.position.set(W / 2 - 0.03, (DOOR_H + 0.3) / 2, doorZ + dz * (DOOR_W / 2 + 0.1));
    parent.add(j);
  }
  const lintel = new THREE.Mesh(box, frameMat);
  lintel.scale.set(0.34, 0.4, DOOR_W + 0.9);
  lintel.position.set(W / 2 - 0.03, DOOR_H + 0.35, doorZ);
  parent.add(lintel);

  // the "beyond": a dark glowing void
  const voidMesh = new THREE.Mesh(plane, new THREE.MeshBasicMaterial({ map: voidTexture() }));
  voidMesh.scale.set(DOOR_W, DOOR_H, 1);
  voidMesh.position.set(W / 2 + 0.10, DOOR_H / 2, doorZ);
  voidMesh.rotation.y = -Math.PI / 2;
  parent.add(voidMesh);
  // warm rim glow strips inside the jambs
  const rimMat = new THREE.MeshBasicMaterial({ color: 0xd6b578 });
  for (const dz of [-1, 1]) {
    const rim = new THREE.Mesh(plane, rimMat);
    rim.scale.set(0.05, DOOR_H, 1);
    rim.position.set(W / 2 + 0.06, DOOR_H / 2, doorZ + dz * (DOOR_W / 2 - 0.02));
    rim.rotation.y = -Math.PI / 2;
    parent.add(rim);
  }

  // dynamic destination sign above the door (main.js keeps it updated)
  const signMat = new THREE.MeshBasicMaterial({ map: signTexture("Onward", "") });
  const sign = new THREE.Mesh(plane, signMat);
  sign.scale.set(2.5, 0.62, 1);
  sign.position.set(W / 2 - 0.08, DOOR_H + 0.98, doorZ);
  sign.rotation.y = -Math.PI / 2;
  parent.add(sign);

  // end wall + farewell sign + bench
  const wall = new THREE.Mesh(box, style.wall);
  wall.scale.set(W + 0.5, H, 0.5);
  wall.position.set(0, H / 2, zFar - 0.25);
  parent.add(wall);
  const fw = new THREE.Mesh(plane, new THREE.MeshBasicMaterial({
    map: signTexture("The story continues", `${regionLabel} · the door on the right leads onward`,
      { mainSize: 56, subSize: 30 }) }));
  fw.scale.set(3.4, 0.85, 1);
  fw.position.set(0, 2.3, zFar + 0.02);
  parent.add(fw);
  const bench = new THREE.Mesh(box, new THREE.MeshLambertMaterial({ color: 0x3a322a }));
  bench.scale.set(1.8, 0.45, 0.6);
  bench.position.set(-1.6, 0.225, zFar + 1.3);
  parent.add(bench);

  const doorLight = new THREE.PointLight(0xe8c893, 16, 9, 2);
  doorLight.position.set(W / 2 - 1.1, 3.1, doorZ);
  doorLight.visible = false;
  parent.add(doorLight);

  return {
    zFar, doorZ, signMat,
    lights: [doorLight],
    colliders: [{ x: -1.6, z: zFar + 1.3, r: 1.05 }],
  };
}

function voidTexture() {
  const c = document.createElement("canvas");
  c.width = 128; c.height = 192;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#060605";
  ctx.fillRect(0, 0, 128, 192);
  const g = ctx.createRadialGradient(64, 96, 8, 64, 96, 130);
  g.addColorStop(0, "rgba(214,181,120,0.30)");
  g.addColorStop(0.4, "rgba(120,95,60,0.10)");
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 192);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
