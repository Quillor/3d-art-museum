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
import { createFire } from "./fire.js";
import { spawnPart } from "./models.js";

// ---- Prehistoric cave rock (Blender: tools/build_prehistoric_assets.py,
// photoreal PBR set from concept-art/subsections/prehistoric) ----
const PRE_GLB = "assets/models/prehistoric.glb";
let caveMats = null;
function caveMaterials() {
  if (caveMats) return caveMats;
  const loader = new THREE.TextureLoader();
  const base = "assets/textures/prehistoric/";
  const load = (f, srgb = true) => {
    const t = loader.load(base + f);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    t.anisotropy = 8;
    return t;
  };
  // softer seamless plaster albedo, gentle relief, darkened for a dim cave
  const rock = new THREE.MeshStandardMaterial({
    map: load("wall_soft.jpg"),
    normalMap: load("wall_normal.jpg", false),
    roughness: 1.0, metalness: 0.0,
    color: 0x746c64,                     // dim the rock (darker, moodier)
    side: THREE.DoubleSide,              // ceiling bays are seen from below
  });
  rock.normalScale.set(0.4, 0.4);        // soften the fine relief
  // floor matches the wall family (soft packed earth)
  const dirt = new THREE.MeshStandardMaterial({
    map: load("floor_soft.jpg"),
    roughness: 1.0, metalness: 0.0,
    color: 0x6e665d,
  });
  caveMats = { rock, dirt, load };
  return caveMats;
}
function applyCaveRock(root) {
  const m = caveMaterials();
  root.traverse((o) => { if (o.isMesh) o.material = m.rock; });
}

export const HUB_R = 9;
const HUB_WALL_H = 6.2;
const DOOR_W = 3.4, DOOR_H = 3.5;
const CAVE_LEN = 48, CAVE_W = 6.4, CAVE_H = 3.7;
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
    shimmers: [],        // end-light animation callbacks
    halls: [],           // walkable corridors with width profiles
    hubR: HUB_R - 0.42,
    colliders: [],       // {x, z, r} keep-out circles (r includes player radius)
    wingsInfo: [],       // for locate()
    wings: {},           // key → { hall, rad, label, zFar }
    spawn: { pos: new THREE.Vector3(-0.7, 0, HUB_R + CAVE_LEN - 4.5), yaw: 0 },
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

  const stoneMat = new THREE.MeshLambertMaterial({
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
    new THREE.MeshLambertMaterial({ color: 0xa89468, side: THREE.DoubleSide }));
  ring.position.y = HUB_WALL_H + 0.2;
  g.add(ring);

  // dome
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(HUB_R + 0.3, 40, 14, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshLambertMaterial({ color: 0xcbb894, side: THREE.BackSide }));
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
  const thresholdMat = new THREE.MeshLambertMaterial({ color: 0x4c463d });
  for (const d of doors) {
    const rad = THREE.MathUtils.degToRad(d.b);
    const dir = new THREE.Vector3(Math.sin(rad), 0, -Math.cos(rad));
    const frameG = new THREE.Group();
    frameG.position.copy(dir.clone().multiplyScalar(HUB_R));
    frameG.rotation.y = -rad;   // local -Z points away from hub
    g.add(frameG);
    // the cave's own eroded rock archway frames its doorway — skip the stone
    // jambs + lintel (and their keep-out circles) there
    if (d.key !== "cave") {
      const jambMat = new THREE.MeshLambertMaterial({ color: 0x9c8a68 });
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
    }

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

  const z0 = HUB_R - 1, z1 = HUB_R + CAVE_LEN; // 8 → 35
  const zc = (z0 + z1) / 2, len = z1 - z0;

  // all cave stone shares one soft PBR rock material; floor matches its family
  const cm = caveMaterials();
  const rockMat = cm.rock, rockDark = cm.rock;
  cm.dirt.map.repeat.set(2, 8);
  const floorGeo = new THREE.PlaneGeometry(CAVE_W + 1.5, len, 10, 30);
  jitter(floorGeo, rand, 0, 0, 0.05);
  const floor = new THREE.Mesh(floorGeo, cm.dirt);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, 0.012, zc);
  g.add(floor);

  // walls + ceiling: Blender-authored displaced rock bays (real height-map
  // relief), tiled along the corridor. WallBays alternate A/B for variety;
  // each keeps a flat central zone so the paintings read cleanly.
  const BAY = 4.5;
  const nBays = Math.ceil(len / BAY);
  for (let k = 0; k <= nBays; k++) {
    const z = z0 + (k + 0.5) * BAY;
    for (const side of [-1, 1]) {
      const part = (k + (side < 0 ? 0 : 1)) % 2 ? "WallBayB" : "WallBayA";
      spawnPart(PRE_GLB, part, (bay) => {
        applyCaveRock(bay);
        bay.rotation.y = -side * Math.PI / 2;
        bay.position.set(side * CAVE_W / 2, 0, z);
        g.add(bay);
      });
    }
    // ceiling panel covers [z0+k*BAY, z0+(k+1)*BAY] (extends -Z from origin)
    spawnPart(PRE_GLB, "CeilingBay", (c) => {
      applyCaveRock(c);
      c.position.set(0, CAVE_H, z0 + (k + 1) * BAY);
      g.add(c);
    });
  }

  // rock backstops just outside the bays so displacement seams (between
  // panels, and the recessed rock framing each painting) never reveal the
  // void behind — a cap above the ceiling and a wall behind each side.
  const cap = new THREE.Mesh(new THREE.PlaneGeometry(CAVE_W + 2, len + 2), cm.rock);
  cap.rotation.x = Math.PI / 2;
  cap.position.set(0, CAVE_H + 0.78, zc);
  g.add(cap);
  for (const side of [-1, 1]) {
    const bs = new THREE.Mesh(new THREE.PlaneGeometry(len + 2, CAVE_H + 1.4), cm.rock);
    bs.position.set(side * (CAVE_W / 2 + 1.0), (CAVE_H + 1.4) / 2 - 0.3, zc);
    bs.rotation.y = -side * Math.PI / 2;
    g.add(bs);
  }

  // back wall (behind spawn)
  const back = new THREE.Mesh(box, cm.rock);
  back.scale.set(CAVE_W + 2, CAVE_H + 1, 1.2);
  back.position.set(0, CAVE_H / 2, z1 + 0.55);
  g.add(back);

  // eroded natural rock archway at the cave mouth (Blender Archway part)
  spawnPart(PRE_GLB, "Archway", (arch) => {
    applyCaveRock(arch);
    arch.position.set(0, 0, z0 + 0.75);
    g.add(arch);
  });

  // ochre wall motifs from the concept PBR set: a wavy pigment band low on
  // each wall, and a few absorbed hand-stencil panels (never over the art).
  buildOchreDecor(g, z0, z1, len);

  // stalactites (scaled to the longer cave)
  const coneG = new THREE.ConeGeometry(1, 1, 7);
  for (let i = 0; i < Math.round(len * 0.7); i++) {
    const st = new THREE.Mesh(coneG, rockDark);
    const r = 0.09 + rand() * 0.16, h = 0.35 + rand() * 0.6;
    st.scale.set(r, h, r);
    st.rotation.x = Math.PI;
    st.position.set((rand() - 0.5) * (CAVE_W - 1), CAVE_H - 0.28 - h / 2 + 0.35, z0 + 2 + rand() * (len - 4));
    g.add(st);
  }
  // boulders lining both walls — dense scatter with the occasional cluster,
  // biased tight to the wall edge so the walking lane stays clear
  const rockG = new THREE.DodecahedronGeometry(1, 0);
  const nRocks = Math.round(len * 1.1);
  for (let i = 0; i < nRocks; i++) {
    const side = rand() > 0.5 ? 1 : -1;
    const cz = z0 + 1.2 + rand() * (len - 2.4);
    const clump = 1 + (rand() < 0.4 ? Math.floor(rand() * 3) : 0); // some clusters
    for (let c = 0; c < clump; c++) {
      const b = new THREE.Mesh(rockG, rockMat);
      const s = 0.16 + rand() * 0.5;
      b.scale.set(s, s * (0.55 + rand() * 0.6), s);
      b.position.set(
        side * (CAVE_W / 2 - 0.35 - rand() * 0.55),
        s * 0.4,
        cz + (c ? (rand() - 0.5) * 1.1 : 0));
      b.rotation.set(rand() * 0.4, rand() * Math.PI, rand() * 0.4);
      g.add(b);
    }
  }

  // campfire near the spawn point (deep end) — with a keep-out circle
  const firePos = new THREE.Vector3(1.35, 0, HUB_R + CAVE_LEN - 6.8);
  const fire = createFire(firePos);
  g.add(fire.group);
  world.fires.push(fire);
  world.colliders.push({ x: firePos.x, z: firePos.z, r: 1.05 });

  // cave paintings — frameless, vignetted onto the rock. Spread evenly down
  // the whole length, alternating walls, but only AFTER an initial empty
  // stretch past the spawn/fire so the walk opens in suspenseful darkness.
  const n = PREHISTORIC.length;
  const spawnZ = HUB_R + CAVE_LEN - 4.5;
  const SUSPENSE = 10;             // empty cave after spawn before the first art
  const LOBBY_PAD = 5;             // clear approach before the lobby arch
  const zFirst = spawnZ - SUSPENSE;
  const zLast = z0 + LOBBY_PAD;
  const step = (zFirst - zLast) / Math.max(1, n - 1);
  for (let i = 0; i < n; i++) {
    const art = PREHISTORIC[i];
    const side = i % 2 === 0 ? -1 : 1;   // alternate walls in walk order
    const z = zFirst - i * step;
    artManager.place(art, {
      pos: new THREE.Vector3(side * (CAVE_W / 2 - 0.72), 1.8, z),
      rotY: side === -1 ? Math.PI / 2 : -Math.PI / 2,
      frame: "none", cave: true, maxW: 1.85, maxH: 1.35,
      region: "Prehistoric", eraKey: "prehistoric",
    });
  }

  // faint guide lights so the deeper paintings stay findable in the long,
  // dark cave — spaced along its length, each dim and short-range
  const nGuide = Math.max(3, Math.round(len / 8));
  for (let i = 0; i < nGuide; i++) {
    const l = new THREE.PointLight(0xff9440, 3.6, 7, 2.4);
    l.position.set(0, CAVE_H - 1.1, z0 + 6 + i * ((len - 9) / (nGuide - 1)));
    l.visible = false;
    g.add(l);
    world.lights.push(l);
  }

  // glow spilling from the lobby into the long cave — a warm beacon just
  // inside the archway (always on, so the far mouth reads as a lit exit)
  const lobbyGlow = new THREE.PointLight(0xffb968, 34, 26, 2);
  lobbyGlow.position.set(0, 2.1, z0 + 2.2);
  g.add(lobbyGlow);
  // soft emissive haze across the opening to sell the glow at distance
  const haze = new THREE.Mesh(
    new THREE.PlaneGeometry(DOOR_W + 1.4, DOOR_H + 1.2),
    new THREE.MeshBasicMaterial({
      color: 0xffca86, transparent: true, opacity: 0.14,
      blending: THREE.AdditiveBlending, depthWrite: false,
    }));
  haze.position.set(0, DOOR_H / 2 + 0.3, z0 + 0.5);
  g.add(haze);

  // walkable hall: hub doorway narrows, then the cave body
  world.halls.push({
    key: "cave",
    ox: 0, oz: HUB_R - 2, dx: 0, dz: 1,
    len: CAVE_LEN + 1.4,
    base: CAVE_W / 2 - 0.75,
    narrows: [{ from: -9, to: 3.4, halfW: DOOR_HALF, tw: 2.2 }],
  });
}

// Ochre wall motifs (concept PBR set): a wavy pigment band low on each wall
// plus scattered hand-stencil clusters at shoulder/head height. Kept off the
// art band (y≈1.8) so paintings stay clear.
function buildOchreDecor(g, z0, z1, len) {
  const cm = caveMaterials();
  const atlas = cm.load("ochre_atlas.png");
  const handMat = new THREE.MeshStandardMaterial({
    map: atlas, transparent: true, alphaTest: 0.35, roughness: 1, depthWrite: false,
  });
  for (const side of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      const hz = z0 + 4 + i * (len / 3) + (side < 0 ? 1.6 : 0);
      const hands = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.5), handMat);
      hands.position.set(side * (CAVE_W / 2 - 0.14), 2.55, hz);
      hands.rotation.y = -side * Math.PI / 2;
      g.add(hands);
    }
  }
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

  let prevCeilH = null; // so each portal facade covers a taller neighbour
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
      prevCeilH,
    });
    prevCeilH = style.ceilH;
    world.lights.push(...res.lights);
    if (res.fires) world.fires.push(...res.fires);
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

  // the shimmering light at the end of the hall
  const lastStyle = styles[ERAS[segs[segs.length - 1].era].style];
  const zone = buildEndLight(g, lastStyle, z0, region.label);
  world.shimmers.push(zone.update);
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
      return { region: "Prehistoric", era: era.label, period: era.period, eraKey: "prehistoric" };
    }
    // hub?
    if (pos.x * pos.x + pos.z * pos.z < (HUB_R + 0.5) * (HUB_R + 0.5)) {
      return { region: "The Grand Crossing", era: "Six paths through time", period: "choose a hall", eraKey: "hub" };
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
      return { region: w.label, era: era.label, period: era.period, eraKey: w.segments[idx].eraKey,
               wingKey: w.key, segIndex: idx, segCount: w.segCount };
    }
    return null;
  };
}
