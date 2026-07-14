// Builds one era-styled corridor segment in wing-local coordinates.
// The corridor runs along -Z: a segment occupies z in [z0, z0 - length].
import * as THREE from "three";
import { GLTFLoader } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/loaders/GLTFLoader.js";
import { signTexture, stainedGlass, fileTex, rng, toTexture } from "./textures.js";
import { FINISH } from "./styles.js";

// ---------- GLB props (loaded once, cloned per placement) ----------
const _gltfLoader = new GLTFLoader();
const _modelCache = new Map(); // url -> Promise<THREE.Object3D>

function loadModel(url) {
  if (!_modelCache.has(url)) {
    _modelCache.set(url, new Promise((resolve, reject) => {
      _gltfLoader.load(url, g => resolve(g.scene), undefined, reject);
    }));
  }
  return _modelCache.get(url);
}

// Populate a holder group with a clone of a GLB model, sitting its base on
// the floor. opts:
//   fillH  — stretch the model VERTICALLY to this height (footprint unchanged,
//            so a column reaches the ceiling without fattening / clipping).
//   finish — re-material every mesh as MeshPhongMaterial with this room FINISH
//            (specular/shininess), keeping each material's own colour + map, so
//            the GLB is lit by the same model as the surrounding scenery instead
//            of its own PBR (MeshStandard) shading.
// Async — the collision profile is computed synchronously by the caller, so
// navigation is correct even before the mesh appears.
function placeModel(holder, url, { fillH, finish } = {}) {
  loadModel(url).then(proto => {
    const inst = proto.clone(true);
    if (finish) {
      const f = FINISH[finish];
      inst.traverse(o => {
        if (!o.isMesh || !o.material) return;
        const src = o.material;
        o.material = new THREE.MeshPhongMaterial({
          color: src.color ? src.color.clone() : 0xffffff,
          map: src.map || null,
          emissive: src.emissive ? src.emissive.clone() : 0x000000,
          vertexColors: src.vertexColors || false,
          transparent: src.transparent || false,
          opacity: src.opacity != null ? src.opacity : 1,
          side: src.side,
          specular: f.specular,
          shininess: f.shininess,
        });
        src.dispose();
      });
    }
    const bbox = new THREE.Box3().setFromObject(inst);
    const size = new THREE.Vector3();
    bbox.getSize(size);
    const sy = fillH ? fillH / size.y : 1; // vertical stretch to the ceiling
    inst.scale.set(1, sy, 1);
    inst.position.y = -bbox.min.y * sy; // base to floor
    holder.add(inst);
  }).catch(err => console.warn("model load failed:", url, err));
}

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

export function scaledUVPlane(w, h, ru, rv) {
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

export function buildPortal(parent, style, { z, H, W, label, period, doorH = 3.5, doorW = 3.4 }) {
  const mat = style.portal.mat;
  const t = 0.55; // depth
  const shoulderW = (W - doorW) / 2;
  // shoulders
  for (const side of [-1, 1]) {
    const s = new THREE.Mesh(box, style.wall);
    s.scale.set(shoulderW, H, t);
    s.position.set(side * (doorW / 2 + shoulderW / 2), H / 2 - FLOOR_EPS, z - t / 2);
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
    j.position.set(side * (doorW / 2 + 0.14), (doorH + 0.4) / 2 - FLOOR_EPS, z - t / 2);
    parent.add(j);
  }
  const lintel = new THREE.Mesh(box, mat);
  lintel.scale.set(doorW + 1.2, 0.55, t + 0.3);
  lintel.position.set(0, doorH + 0.55, z - t / 2);
  parent.add(lintel);
  // Optional glyph frieze wrapped onto the entrance facade (Mesoamerica): runs
  // the wall band across the two shoulders flanking the door so it greets the
  // visitor at the entrance. Kept off the centred door span so the era sign
  // stays clear; square UVs (uvLen) keep the glyphs undistorted like the wall.
  if (style.band && style.band.facade) {
    const b = style.band;
    for (const side of [-1, 1]) {
      const fb = new THREE.Mesh(
        scaledUVPlane(shoulderW, b.h, shoulderW / b.uvLen, b.h / b.uvLen), b.mat);
      fb.position.set(side * (doorW / 2 + shoulderW / 2), b.y, z + 0.03);
      parent.add(fb);
    }
  }
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

function buildColumns(parent, style, z0, len, W, sideAnchorZ, columnNarrows) {
  const { type, color, finish, map, normalMap } = style.columns;
  if (type === "pilaster") {
    buildPilasters(parent, style, z0, len, W);
    return;
  }
  // "model" columns carry their own materials from the GLB — no procedural mat.
  const mat = type === "model" ? null
    : finish
    ? new THREE.MeshPhongMaterial({ color, map, normalMap, specular: 0x3a352c, shininess: finish === "polished" ? 70 : 25 })
    : new THREE.MeshLambertMaterial({ color, map, normalMap });
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
      const holder = new THREE.Group();
      if (type === "model") placeModel(holder, style.columns.url, { fillH: H, finish: style.columns.finish });
      else holder.add(makeColumn(type, mat, H));
      holder.position.set(x, -FLOOR_EPS, z);
      parent.add(holder);
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

function buildWindows(parent, z0, len, W, H, lights) {
  if (!glassTex) {
    glassTex = fileTex("window_lancet", stainedGlass(171));
    glassTex.wrapS = glassTex.wrapT = THREE.ClampToEdgeWrapping;
  }
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
