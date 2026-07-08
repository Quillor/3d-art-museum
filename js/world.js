// Assembles the whole museum: entrance cave, rotunda hub, six era wings.
// Also owns collision and "where am I" lookup for the HUD and the end lights.
//
// Collision model: the hub is a clamped disc; every hallway is a "hall" with
// a width PROFILE along its axis — full width in open gallery, smoothly
// narrowing (an hourglass) through every doorway and portal, so a visitor
// pressed against the curve is funneled through the opening instead of
// clipping into the door shoulders. Columns narrow their own side of the
// profile the same way (no pockets to get stuck in between column and wall);
// only the campfire and the hub door jambs remain as circular keep-outs.
import * as THREE from "three";
import { REGIONS, ERAS, PREHISTORIC } from "./data/artworks.js";
import { buildStyles, surf } from "./styles.js";
import { buildSegment, buildEndLight, HALL_W } from "./corridor.js";
import * as T from "./textures.js";
import { toon } from "./shading.js";
import { createFire } from "./fire.js";

export const HUB_R = 9;
const HUB_WALL_H = 6.2;
const DOOR_W = 3.4, DOOR_H = 3.5;
const CAVE_LEN = 26, CAVE_W = 6.4, CAVE_H = 3.7;
// Six wings sit 30° apart, so full-width corridors would overlap near the
// hub. Each wing therefore begins with a narrow vestibule "neck" and only
// widens to full hall width once the wings have diverged.
const NECK_LEN = 6.6, NECK_W = 4.3, NECK_H = 3.9;
const PLAYER_R = 0.32;

// walkable half-widths (player radius already subtracted)
const BASE_HALF = HALL_W / 2 - 0.42;   // 3.08 in open gallery
const DOOR_HALF = 1.31;                // through hub doorways
const NECK_HALF = 1.74;                // inside the vestibule
const PORTAL_HALF = 1.28;              // through era portals
const PORTAL_TW = 3.0;                 // funnel transition length
const COLUMN_HALF = 2.22;              // passing a column (one side only)
const COLUMN_TW = 1.5;

const box = new THREE.BoxGeometry(1, 1, 1);
const plane = new THREE.PlaneGeometry(1, 1);
const UP = new THREE.Vector3(0, 1, 0);

export function buildWorld(scene, artManager) {
  const styles = buildStyles();
  const world = {
    lights: [],
    fires: [],
    flickers: [],        // small ambient flame flickers (cave guide lights)
    shimmers: [],        // end-light animation callbacks (t, playerPos)
    endLightCenters: [], // world positions of the six end lights
    halls: [],           // walkable corridors with width profiles
    hubR: HUB_R - 0.42,
    colliders: [],       // {x, z, r} keep-out circles (r includes player radius)
    wingsInfo: [],       // for locate()
    wings: {},           // key → { hall, rad, label, zFar }
    spawn: { pos: new THREE.Vector3(-0.7, 0, HUB_R + 21.5), yaw: 0 },
  };

  buildHub(scene, world, styles);
  buildCave(scene, world, artManager);

  for (const region of REGIONS) {
    buildWing(scene, world, styles, region, artManager);
  }

  world.clampMove = makeClamp(world);
  world.locate = makeLocate(world);
  return world;
}

export function hallCoords(h, x, z) {
  const vx = x - h.ox, vz = z - h.oz;
  return { s: vx * h.dx + vz * h.dz, lat: -vx * h.dz + vz * h.dx }; // lat > 0 = right side
}

const smooth = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));

// Walkable lateral bounds [lo, hi] at distance s along the hall. Symmetric
// narrows (doorways, portals) pinch both sides; column narrows pinch only
// their own side so the visitor is steered around the column, never stuck.
function hallBounds(h, s) {
  let lo = -h.base, hi = h.base;
  for (const n of h.narrows) {
    const d = n.at !== undefined
      ? Math.abs(s - n.at)
      : s < n.from ? n.from - s : s > n.to ? s - n.to : 0;
    const t = d / n.tw;
    if (t >= 1) continue;
    const w = n.halfW + (h.base - n.halfW) * smooth(t);
    if (!n.side) {
      if (-w > lo) lo = -w;
      if (w < hi) hi = w;
    } else if (n.side > 0) {
      if (w < hi) hi = w;
    } else if (-w > lo) lo = -w;
  }
  return [lo, hi];
}

function hallContains(h, x, z, eps) {
  const { s, lat } = hallCoords(h, x, z);
  if (s < -eps || s > h.len + eps) return false;
  const [lo, hi] = hallBounds(h, Math.max(0, Math.min(h.len, s)));
  return lat >= lo - eps && lat <= hi + eps;
}

function hallProject(h, x, z) {
  let { s, lat } = hallCoords(h, x, z);
  s = Math.max(0.03, Math.min(h.len - 0.03, s));
  const [lo, hi] = hallBounds(h, s);
  lat = Math.max(lo, Math.min(hi, lat));
  return [h.ox + h.dx * s - h.dz * lat, h.oz + h.dz * s + h.dx * lat];
}

// ---------------- Hub rotunda ----------------

function buildHub(scene, world, styles) {
  const g = new THREE.Group();
  scene.add(g);

  const stoneMat = toon({
    map: T.fileTex("hub_stone", T.stoneBlocks({ base: "#8a8175", mortar: "#4c463d", rows: 4, cols: 3, seed: 200 })) });
  const floorMat = surf(T.fileTex("hub_floor", T.checkerFloor("#cfc4a9", "#4c463d", 201)), "gloss");

  // floor
  const floor = new THREE.Mesh(new THREE.CircleGeometry(HUB_R + 0.5, 48), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.material.map.repeat.set(4, 4);
  g.add(floor);

  // central medallion
  const medTex = T.signTexture("Timeline of Art", "prehistory → the modern era", {
    w: 1024, h: 1024, bg: "#241e16", mainSize: 88, subSize: 40 });
  const med = new THREE.Mesh(new THREE.CircleGeometry(2.6, 40),
    new THREE.MeshBasicMaterial({ map: medTex }));
  med.rotation.x = -Math.PI / 2;
  med.position.y = 0.012;
  g.add(med);

  // door bearings (degrees from -Z / north): six wings + cave (180 = south)
  const doors = [...REGIONS.map(r => ({ b: r.angleDeg, label: r.label, key: r.key })),
                 { b: 180, label: "Prehistory", key: "cave" }];
  const doorHalfAng = (DOOR_W / HUB_R) * (180 / Math.PI) / 2;

  // wall arcs between doors
  const bearings = doors.map(d => d.b).sort((a, b) => a - b);
  for (let i = 0; i < bearings.length; i++) {
    const a1 = bearings[i] + doorHalfAng;
    const a2 = (i === bearings.length - 1 ? bearings[0] + 360 : bearings[i + 1]) - doorHalfAng;
    addHubArc(g, stoneMat, a1, a2, 0, DOOR_H + 0.6);
  }
  // continuous band above the doors up to the entablature
  addHubArc(g, stoneMat, 0, 360, DOOR_H + 0.6, HUB_WALL_H - (DOOR_H + 0.6));

  // entablature ring
  const ring = new THREE.Mesh(
    new THREE.CylinderGeometry(HUB_R + 0.25, HUB_R + 0.25, 0.5, 48, 1, true),
    toon({ color: 0xa89468, side: THREE.DoubleSide }));
  ring.position.y = HUB_WALL_H + 0.2;
  g.add(ring);

  // dome
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(HUB_R + 0.3, 40, 14, 0, Math.PI * 2, 0, Math.PI / 2),
    toon({ color: 0xcbb894, side: THREE.BackSide }));
  dome.scale.y = 0.62;
  dome.position.y = HUB_WALL_H + 0.3;
  g.add(dome);

  // oculus glow
  const oculus = new THREE.Mesh(new THREE.CircleGeometry(1.7, 32),
    new THREE.MeshBasicMaterial({ color: 0xfff2d8 }));
  oculus.rotation.x = Math.PI / 2;
  oculus.position.y = HUB_WALL_H + 0.3 + (HUB_R + 0.3) * 0.62 - 0.25;
  g.add(oculus);

  const domeLight = new THREE.PointLight(0xffe9c4, 140, 30, 2);
  domeLight.position.set(0, HUB_WALL_H + 2.2, 0);
  g.add(domeLight); // always on — the heart of the museum

  // door frames + region signs (facing hub centre)
  const thresholdMat = toon({ color: 0x4c463d });
  for (const d of doors) {
    const rad = THREE.MathUtils.degToRad(d.b);
    const dir = new THREE.Vector3(Math.sin(rad), 0, -Math.cos(rad));
    const frameG = new THREE.Group();
    frameG.position.copy(dir.clone().multiplyScalar(HUB_R));
    frameG.rotation.y = -rad;   // local -Z points away from hub
    g.add(frameG);
    const jambMat = toon({ color: 0x9c8a68 });
    for (const side of [-1, 1]) {
      const j = new THREE.Mesh(box, jambMat);
      j.scale.set(0.45, DOOR_H + 0.45, 1.4);
      j.position.set(side * (DOOR_W / 2 + 0.16), (DOOR_H + 0.45) / 2 - 0.012, 0);
      frameG.add(j);
      // keep-out circle at each jamb
      const jw = new THREE.Vector3(side * (DOOR_W / 2 + 0.16), 0, 0)
        .applyAxisAngle(UP, -rad).add(frameG.position);
      world.colliders.push({ x: jw.x, z: jw.z, r: 0.62 });
    }
    const lintel = new THREE.Mesh(box, jambMat);
    lintel.scale.set(DOOR_W + 1.25, 0.55, 1.4);
    lintel.position.set(0, DOOR_H + 0.68, 0);
    frameG.add(lintel);

    // threshold bar — covers the seam where hub floor meets the hallway floor
    const th = new THREE.Mesh(box, thresholdMat);
    th.scale.set(DOOR_W + 0.4, 0.045, 1.5);
    th.position.set(0, 0.0225, 0);
    frameG.add(th);

    const signTex = T.signTexture(d.label, "", { mainSize: 88 });
    const sign = new THREE.Mesh(plane, new THREE.MeshBasicMaterial({ map: signTex }));
    sign.scale.set(3.1, 0.78, 1);
    sign.position.set(0, DOOR_H + 0.70, 0.85); // faces +Z = toward hub centre
    frameG.add(sign);
  }
}

function addHubArc(g, mat, bearFrom, bearTo, y0, h) {
  // bearing b (deg from -Z) → cylinder theta = 180 - b (three.js: x=sinθ, z=cosθ)
  const t1 = THREE.MathUtils.degToRad(180 - bearTo);
  const len = THREE.MathUtils.degToRad(bearTo - bearFrom);
  const geo = new THREE.CylinderGeometry(HUB_R, HUB_R, h, Math.max(4, Math.ceil(len * 12)), 1, true, t1, len);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.material = mat.clone();
  mesh.material.side = THREE.BackSide;
  if (mesh.material.map) {
    mesh.material.map = mat.map;
  }
  mesh.position.y = y0 + h / 2;
  g.add(mesh);
}

// ---------------- Entrance cave ----------------

function buildCave(scene, world, artManager) {
  const g = new THREE.Group();
  scene.add(g);
  const rand = T.rng(300);

  // darker tints for mood — the fire is meant to be the main light source
  const rockMat = toon({ color: 0x8a7c6e, map: T.fileTex("cave_rock", T.rock("#5d5248", 301)) });
  const rockDark = toon({ color: 0x6e6156, map: T.rock("#4a4038", 302) });
  const dirtMat = toon({ color: 0x8f8172, map: T.fileTex("cave_dirt", T.dirtFloor(303)) });

  const zFront = HUB_R + 0.2, zBack = HUB_R + CAVE_LEN; // 9.2 → 35
  const len = zBack - zFront, zc = (zFront + zBack) / 2;
  const fw = 3.1, ch = 3.95;

  // ---- one blended low-poly cave tube: the walls curve smoothly up into the
  // ceiling (no 90° corners); the floor is a separate flat dirt plane filling
  // the open bottom. Gentle displacement keeps it stylized, not spiky. ----
  // fully closed cross-section (includes a rock bottom, hidden beneath the
  // dirt floor) so there is never a gap to see the lobby through
  const ring = [
    [fw * 0.92, 0.0], [fw * 1.02, 0.55], [fw * 0.98, 1.5], [fw * 0.86, 2.5],
    [fw * 0.55, 3.35], [0, ch],
    [-fw * 0.55, 3.35], [-fw * 0.86, 2.5], [-fw * 0.98, 1.5], [-fw * 1.02, 0.55], [-fw * 0.92, 0.0],
    [-fw * 0.5, -0.12], [fw * 0.5, -0.12],
  ];
  const N = ring.length;
  const segs = Math.max(8, Math.round(len / 2.4));
  const cyc = ch * 0.5, verts = [], idx = [];
  for (let s = 0; s <= segs; s++) {
    const z = zFront + (len * s) / segs;
    for (let i = 0; i < N; i++) {
      const [px, py] = ring[i];
      const nx = px, ny = py - cyc, nl = Math.hypot(nx, ny) || 1;
      const ff = py < 0.15 ? 0.12 : 1; // barely disturb the floor edge
      const amp = (0.16 * Math.sin(i * 1.3 + s * 0.7) + 0.10 * Math.sin(i * 2.7 - s * 1.1 + 2)) * ff;
      verts.push(px + (nx / nl) * amp, py + (ny / nl) * amp, z);
    }
  }
  for (let s = 0; s < segs; s++)
    for (let i = 0; i < N; i++) {
      const j = (i + 1) % N;
      const a = s * N + i, b = s * N + j, c = (s + 1) * N + j, d = (s + 1) * N + i;
      idx.push(a, b, c, a, c, d);
    }
  const tube = new THREE.BufferGeometry();
  tube.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3));
  tube.setIndex(idx);
  tube.computeVertexNormals();
  const shell = new THREE.Mesh(tube, rockMat);
  shell.material.side = THREE.DoubleSide;
  g.add(shell);

  // flat dirt floor sitting just above the tube's rock bottom
  const floorGeo = new THREE.PlaneGeometry(fw * 2.05, len, 6, segs);
  jitter(floorGeo, rand, 0, 0, 0.04);
  dirtMat.map.repeat.set(2, 8);
  const floor = new THREE.Mesh(floorGeo, dirtMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, 0.02, zc);
  g.add(floor);

  // solid rock caps seal both ends so the lobby is never visible through a gap
  const back = new THREE.Mesh(box, rockDark);
  back.scale.set(fw * 2.6, ch + 1.8, 1.4);
  back.position.set(0, ch * 0.5, zBack + 0.4);
  g.add(back);

  const capShape = new THREE.Shape();
  capShape.moveTo(-5.4, -0.8); capShape.lineTo(5.4, -0.8);
  capShape.lineTo(5.4, ch + 2.4); capShape.lineTo(-5.4, ch + 2.4); capShape.lineTo(-5.4, -0.8);
  const capHole = new THREE.Path();
  capHole.moveTo(-DOOR_W / 2, 0); capHole.lineTo(-DOOR_W / 2, DOOR_H);
  capHole.lineTo(DOOR_W / 2, DOOR_H); capHole.lineTo(DOOR_W / 2, 0);
  capShape.holes.push(capHole);
  const cap = new THREE.Mesh(new THREE.ExtrudeGeometry(capShape, { depth: 0.6, bevelEnabled: false }), rockDark);
  cap.position.set(0, 0, zFront - 0.6);
  g.add(cap);

  // ---- Stonehenge trilithon gateway at the cave mouth ----
  const sarsen = toon({ color: 0x928a7c });
  const trilithon = (px, z, gap, postH, rotY) => {
    const grp = new THREE.Group();
    for (const sd of [-1, 1]) {
      const up = new THREE.Mesh(box, sarsen);
      up.scale.set(0.74 + rand() * 0.12, postH, 0.56);
      up.position.set(sd * (gap / 2 + 0.38), postH / 2, 0);
      up.rotation.z = (rand() - 0.5) * 0.05;
      grp.add(up);
    }
    const lintel = new THREE.Mesh(box, sarsen);
    lintel.scale.set(gap + 1.6, 0.62, 0.66);
    lintel.position.set(0, postH + 0.22, 0);
    grp.add(lintel);
    grp.position.set(px, 0, z);
    grp.rotation.y = rotY;
    g.add(grp);
  };
  trilithon(0, zFront + 0.25, DOOR_W + 0.3, 3.85, 0);   // frames the doorway itself
  trilithon(3.0, 8.4, 1.0, 3.15, -0.5);                 // flanking stones on the hub side
  trilithon(-3.0, 8.4, 1.0, 3.15, 0.5);

  const rockG = new THREE.DodecahedronGeometry(1, 0);

  // a few low-poly stalactites down the centre line, and floor rocks tucked
  // against the walls (kept away from the ±2.5 artwork line)
  const coneG = new THREE.ConeGeometry(1, 1, 6);
  for (let i = 0; i < 10; i++) {
    const st = new THREE.Mesh(coneG, rockDark);
    const r = 0.1 + rand() * 0.16, h = 0.3 + rand() * 0.5;
    st.scale.set(r, h, r);
    st.rotation.x = Math.PI;
    st.position.set((rand() - 0.5) * 1.6, ch - 0.1 - h / 2, zFront + 3 + rand() * (len - 5));
    g.add(st);
  }
  for (let i = 0; i < 8; i++) {
    const b = new THREE.Mesh(rockG, rockMat);
    const s = 0.16 + rand() * 0.3;
    b.scale.set(s, s * (0.6 + rand() * 0.5), s);
    const side = rand() > 0.5 ? 1 : -1;
    b.position.set(side * (fw - 0.35 - rand() * 0.25), s * 0.35, zFront + 2 + rand() * (len - 4));
    b.rotation.y = rand() * Math.PI;
    g.add(b);
  }

  // campfire near the spawn point — with a keep-out circle
  const firePos = new THREE.Vector3(1.35, 0, HUB_R + 19.2);
  const fire = createFire(firePos);
  g.add(fire.group);
  world.fires.push(fire);
  world.colliders.push({ x: firePos.x, z: firePos.z, r: 1.05 });

  // cave paintings — each on a flat dark-rock backing slab so no bump ever
  // pokes across the image, frameless and vignetted onto the rock
  const slabMat = rockDark;
  const n = PREHISTORIC.length;
  for (let i = 0; i < n; i++) {
    const art = PREHISTORIC[i];
    const side = i % 2 === 0 ? -1 : 1;
    const k = Math.floor(i / 2);
    const z = zBack - 4.0 - (k + (side === 1 ? 0.5 : 0)) * 4.1;
    const rotY = side === -1 ? Math.PI / 2 : -Math.PI / 2;
    const slab = new THREE.Mesh(box, slabMat);
    slab.scale.set(2.5, 2.0, 0.14);
    slab.position.set(side * 2.63, 1.85, z);
    slab.rotation.y = rotY;
    g.add(slab);
    artManager.place(art, {
      pos: new THREE.Vector3(side * 2.5, 1.85, z),
      rotY,
      frame: "none", cave: true, maxW: 1.85, maxH: 1.35,
      region: "Prehistoric", eraKey: "prehistoric",
    });
  }

  // dim ember-orange guide lights, flickering like distant coals
  for (let i = 0; i < 3; i++) {
    const l = new THREE.PointLight(0xff7c2e, 7, 8.5, 2);
    l.position.set((i % 2 ? 0.8 : -0.8), ch - 1.4, zFront + 6 + i * 7);
    l.visible = false;
    g.add(l);
    world.lights.push(l);
    const phase = i * 2.3;
    world.flickers.push((t) => {
      l.intensity = 7 * (0.7 + 0.18 * Math.sin(t * 9.1 + phase) + 0.12 * Math.sin(t * 17.7 + phase * 3));
    });
  }

  // walkable hall — a generous safe channel that keeps the visitor well clear
  // of the rocky walls (they can no longer clip into the rock)
  world.halls.push({
    key: "cave",
    ox: 0, oz: HUB_R - 2, dx: 0, dz: 1,
    len: CAVE_LEN + 1.4,
    base: 1.9,
    narrows: [{ from: -9, to: 3.4, halfW: DOOR_HALF, tw: 2.2 }],
  });
}

function jitter(geo, rand, jx, jy, jz) {
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    if (jx) pos.setX(i, pos.getX(i) + (rand() - 0.5) * jx);
    if (jy) pos.setY(i, pos.getY(i) + (rand() - 0.5) * jy);
    if (jz) pos.setZ(i, pos.getZ(i) + (rand() - 0.5) * jz);
  }
  geo.computeVertexNormals();
}

// ---------------- Wings ----------------

function buildWing(scene, world, styles, region, artManager) {
  const rad = THREE.MathUtils.degToRad(region.angleDeg);
  const g = new THREE.Group();
  g.rotation.y = -rad;
  scene.add(g);

  // group artworks by era, preserving order
  const segs = [];
  for (const art of region.artworks) {
    const last = segs[segs.length - 1];
    if (last && last.era === art.era) last.items.push(art);
    else segs.push({ era: art.era, items: [art] });
  }

  const info = { key: region.key, label: region.label, rad, segments: [] };
  const firstStyle = styles[ERAS[segs[0].era].style];
  world.lights.push(buildNeck(g, firstStyle));
  let z0 = -(HUB_R + NECK_LEN);
  const portalS = [];
  const columnNarrows = [];

  segs.forEach((seg, i) => {
    const era = ERAS[seg.era];
    const style = styles[era.style];
    portalS.push(-z0 - (HUB_R - 2));
    const res = buildSegment(g, style, {
      count: seg.items.length,
      z0,
      label: era.label,
      period: era.period,
      doorH: DOOR_H,
      isFirst: i === 0,
    });
    world.lights.push(...res.lights);
    columnNarrows.push(...res.columnNarrows);
    info.segments.push({ eraKey: seg.era, z0, z1: res.zEnd });

    seg.items.forEach((art, j) => {
      const a = res.anchors[j];
      const local = new THREE.Vector3(a.x, a.y, a.z);
      const pos = local.applyAxisAngle(UP, -rad);
      artManager.place(art, {
        pos, rotY: a.rotY - rad,
        frame: a.frame,
        region: region.label, eraKey: seg.era,
      });
    });

    z0 = res.zEnd;
  });

  // the shimmering light at the end of the hall — brightens as you approach
  const lastStyle = styles[ERAS[segs[segs.length - 1].era].style];
  const zone = buildEndLight(g, lastStyle, z0, region.label);
  const lightCenter = zone.localCenter.clone().applyAxisAngle(UP, -rad);
  world.endLightCenters.push(lightCenter);
  world.shimmers.push((t, playerPos) =>
    zone.update(t, playerPos ? playerPos.distanceTo(lightCenter) : 40));
  info.zFar = zone.zFar;
  info.segCount = segs.length;
  world.wingsInfo.push(info);

  // walkable hall with funnel profile
  const dx = Math.sin(rad), dz = -Math.cos(rad);
  const hall = {
    key: region.key,
    ox: dx * (HUB_R - 2), oz: dz * (HUB_R - 2), dx, dz,
    len: -zone.zFar - (HUB_R - 2) - 0.35,
    base: BASE_HALF,
    narrows: [
      { from: -9, to: 3.4, halfW: DOOR_HALF, tw: 1.2 },              // hub doorway
      { from: 3.4, to: NECK_LEN + 2.0, halfW: NECK_HALF, tw: 1.5 },  // vestibule
      ...portalS.map(at => ({ at, halfW: PORTAL_HALF, tw: PORTAL_TW })), // era portals
      // columns pinch only their own side, steering the visitor around them
      ...columnNarrows.map(c => ({
        at: -c.z - (HUB_R - 2), side: c.side, halfW: COLUMN_HALF, tw: COLUMN_TW,
      })),
    ],
  };
  world.halls.push(hall);

  world.wings[region.key] = {
    key: region.key, label: region.label, rad, hall, zFar: zone.zFar,
  };
}

// Vestibule between the hub doorway and the wing's first full-width segment.
function buildNeck(g, style) {
  const z0 = -(HUB_R - 0.6), len = NECK_LEN + 1.4, zc = z0 - len / 2;
  const floor = new THREE.Mesh(box, style.floor);
  floor.scale.set(NECK_W, 0.08, len);
  floor.position.set(0, -0.032, zc); // top sits 8 mm above the hub disc — no z-fight
  g.add(floor);
  const ceil = new THREE.Mesh(box, style.ceiling);
  ceil.scale.set(NECK_W + 0.6, 0.25, len);
  ceil.position.set(0, NECK_H + 0.12, zc);
  g.add(ceil);
  for (const side of [-1, 1]) {
    const wall = new THREE.Mesh(box, style.wall);
    wall.scale.set(0.3, NECK_H + 0.3, len);
    wall.position.set(side * (NECK_W / 2 + 0.15), (NECK_H + 0.3) / 2 - 0.012, zc);
    g.add(wall);
  }
  const light = new THREE.PointLight(style.light.color, 16, 12, 2);
  light.position.set(0, NECK_H - 0.4, zc);
  light.visible = false;
  g.add(light);
  return light;
}

// ---------------- Collision ----------------

function makeClamp(world) {
  const R = world.hubR;
  const halls = world.halls;
  const colliders = world.colliders;

  const hubContains = (x, z, eps) => x * x + z * z <= (R + eps) * (R + eps);

  return function clampMove(cur, next) {
    // regions the visitor currently occupies (with a little slack)
    const occ = [];
    if (hubContains(cur.x, cur.z, 0.5)) occ.push("hub");
    for (const h of halls) if (hallContains(h, cur.x, cur.z, 0.5)) occ.push(h);
    if (!occ.length) { occ.push("hub", ...halls); } // failsafe (teleports)

    let bx = null, bz = null, bestD = Infinity;
    // accept the move outright if any occupied region fully contains it
    for (const r of occ) {
      const ok = r === "hub" ? hubContains(next.x, next.z, 0) : hallContains(r, next.x, next.z, 0);
      if (ok) { bx = next.x; bz = next.z; bestD = 0; break; }
    }
    // otherwise project into each occupied region and take the closest —
    // hall projection clamps against the width profile, which slides the
    // visitor along the funnel curves, through doorways, and around columns
    let bestRegion = null;
    if (bestD > 0) {
      for (const r of occ) {
        let p;
        if (r === "hub") {
          const d = Math.hypot(next.x, next.z) || 1e-5;
          const k = Math.min(1, R / d);
          p = [next.x * k, next.z * k];
        } else {
          p = hallProject(r, next.x, next.z);
        }
        const dd = (p[0] - next.x) ** 2 + (p[1] - next.z) ** 2;
        if (dd < bestD) { bestD = dd; bx = p[0]; bz = p[1]; bestRegion = r; }
      }
    }

    // circular keep-outs (campfire, hub door jambs)
    for (let pass = 0; pass < 2; pass++) {
      for (const c of colliders) {
        const dx = bx - c.x;
        if (dx > c.r || dx < -c.r) continue;
        const dz = bz - c.z;
        if (dz > c.r || dz < -c.r) continue;
        const d2 = dx * dx + dz * dz;
        if (d2 < c.r * c.r) {
          const d = Math.sqrt(d2) || 1e-4;
          bx = c.x + (dx / d) * c.r;
          bz = c.z + (dz / d) * c.r;
        }
      }
    }
    // a push-out may have nudged us into a wall — settle back into the region
    if (bestRegion && bestRegion !== "hub") {
      [bx, bz] = hallProject(bestRegion, bx, bz);
    } else if (!hubContains(bx, bz, 0)) {
      for (const h of halls) if (hallContains(h, bx, bz, 0.3)) { [bx, bz] = hallProject(h, bx, bz); break; }
    }

    return new THREE.Vector3(bx, next.y, bz);
  };
}

// ---------------- Locate (for HUD + end lights) ----------------

function makeLocate(world) {
  const v = new THREE.Vector3();
  return function locate(pos) {
    // cave?
    if (pos.z > HUB_R - 0.5 && Math.abs(pos.x) < CAVE_W) {
      const era = ERAS.prehistoric;
      return { region: "Prehistoric", era: era.label, period: era.period };
    }
    // hub?
    if (pos.x * pos.x + pos.z * pos.z < (HUB_R + 0.5) * (HUB_R + 0.5)) {
      return { region: "The Grand Crossing", era: "Six paths through time", period: "choose a hall" };
    }
    for (const w of world.wingsInfo) {
      v.copy(pos).applyAxisAngle(UP, w.rad);
      if (Math.abs(v.x) > HALL_W / 2 + 1) continue;
      if (v.z > -(HUB_R - 2) || v.z < w.zFar - 2) continue;
      let idx = -1;
      for (let i = 0; i < w.segments.length; i++) {
        const s = w.segments[i];
        if (v.z <= s.z0 + 0.6 && v.z >= s.z1) { idx = i; break; }
      }
      if (idx === -1) idx = v.z < w.segments[w.segments.length - 1].z1 ? w.segments.length - 1 : 0;
      const era = ERAS[w.segments[idx].eraKey];
      return { region: w.label, era: era.label, period: era.period,
               wingKey: w.key, segIndex: idx, segCount: w.segCount };
    }
    return null;
  };
}
