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
import { spawnPart } from "./models.js";
import { getSignTheme } from "./signThemes.js";
import { auditArchitecture } from "./architectureQa.js";
import { createSourceAuthoredMaterial } from "./materials.js";

// ---- Prehistoric cave rock (Blender: tools/build_prehistoric_assets.py,
// photoreal PBR set from concept-art/subsections/prehistoric) ----
const PRE_GLB = "assets/models/prehistoric.glb";
let caveMats = null;
function caveMaterials() {
  if (caveMats) return caveMats;
  const rock = createSourceAuthoredMaterial("rock_natural_grey_v1", {
    color: 0xb3a084,
    roughness: 1.0,
    normalScale: 0.22,
    side: THREE.DoubleSide,
    name: "H01 natural cave rock",
  });
  const dirt = createSourceAuthoredMaterial("earth_rocky_v1", {
    color: 0x8b765c,
    roughness: 1.0,
    normalScale: 0.18,
    name: "H01 compacted cave path",
  });
  caveMats = { rock, dirt };
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

  // ---- auto keep-outs for decor obstacles.
  // Kit decor (plinths, posts, props) streams in from GLBs after the halls'
  // width profiles are frozen, so anything standing inside the walk band was
  // walk-through (e.g. the china jar plinths, the oceania floor props). Scan
  // the scene once the loaders settle and drop a keep-out circle on every
  // waist-height obstacle inside BASE_HALF. Idempotent — re-running replaces
  // its own entries, so late GLBs just get picked up by the second pass.
  const autoColliders = [];
  const autoNarrows = [];   // [hall, narrow] pairs, removed on re-run
  const _bb = new THREE.Box3();
  world.decorGuards = [];   // {x, z, clear} debug list for the audit harness
  world.refreshDecorColliders = () => {
    for (const c of autoColliders) {
      const i = world.colliders.indexOf(c);
      if (i >= 0) world.colliders.splice(i, 1);
    }
    autoColliders.length = 0;
    for (const [h, n] of autoNarrows) {
      const i = h.narrows.indexOf(n);
      if (i >= 0) h.narrows.splice(i, 1);
    }
    autoNarrows.length = 0;
    world.decorGuards.length = 0;
    scene.updateMatrixWorld(true);
    // pass 1: collect candidates so classification below sees the pre-scan
    // width profile (pushing narrows mid-traverse would make coverage depend
    // on traversal order)
    const cands = [];
    scene.traverse((o) => {
      if (!o.isMesh || !o.geometry || o.visible === false) return;
      if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
      _bb.copy(o.geometry.boundingBox).applyMatrix4(o.matrixWorld);
      const sx = _bb.max.x - _bb.min.x, sz = _bb.max.z - _bb.min.z;
      if (_bb.max.y < 0.45 || _bb.min.y > 1.6) return;  // steppable / overhead
      if (Math.max(sx, sz) > 3.4) return;               // wall/floor/portal spans
      const cx = (_bb.min.x + _bb.max.x) / 2, cz = (_bb.min.z + _bb.max.z) / 2;
      for (const hall of world.halls) {
        const { s, lat } = hallCoords(hall, cx, cz);
        if (s < 2 || s > hall.len) continue;
        // AABB half-extents in the hall frame (halls are rotated, so project)
        const latHalf = (sx * Math.abs(hall.dz) + sz * Math.abs(hall.dx)) / 2;
        const sHalf = (sx * Math.abs(hall.dx) + sz * Math.abs(hall.dz)) / 2;
        cands.push({ cx, cz, sx, sz, hall, s, lat, latHalf, sHalf });
        break;
      }
    });
    // circles first, then narrows: a narrow must never pinch the band into an
    // existing keep-out circle (the circular push-out and the profile
    // settle-back would fight over that strip — e.g. a stalagmite pinch next
    // to the campfire let the visitor grind into the fire), so narrows check
    // containment against the final circle set.
    const narrowCands = [];
    for (const p of cands) {
      const [lo, hi] = hallBounds(p.hall, p.s);  // true local walk band (the
      const edge = p.lat >= 0 ? hi : -lo;        // cave is narrower than BASE_HALF)
      // entirely outside the walk band (incl. flat wall dressing, latHalf≈0):
      // the profile covers it, no guard needed
      if (Math.abs(p.lat) - p.latHalf > edge - 0.1) continue;
      const r = Math.min(1.1, Math.hypot(p.sx, p.sz) / 2 + 0.18);
      if (p.s - p.sHalf > 3.4 && Math.abs(p.lat) > p.latHalf && Math.abs(p.lat) + r > edge) {
        // wall-hugging prop whose circle would cross the walk-band edge — the
        // same push-out/settle-back fight lets the visitor grind through the
        // prop (cave stalagmites). Pinch the profile on this side instead,
        // like the column narrows. Only past the doorway span (s > 3.4):
        // closer to the hub the prop pokes into the rotunda, where hall
        // bounds don't apply and only a circle can guard the hub side.
        narrowCands.push(p);
      } else {
        const c = { x: p.cx, z: p.cz, r, auto: true };
        autoColliders.push(c);
        world.colliders.push(c);
        world.decorGuards.push({ x: p.cx, z: p.cz, clear: r - 0.15 });
      }
    }
    for (const p of narrowCands) {
      const side = p.lat >= 0 ? 1 : -1;
      const halfW = Math.max(0.6, Math.abs(p.lat) - p.latHalf - 0.18);
      const from = p.s - p.sHalf, to = p.s + p.sHalf;
      // skip if the pinch line (where the profile clamps visitors) would cut
      // through a keep-out circle: the clamp would park visitors inside the
      // circle and the two constraints fight — e.g. the rock piles behind the
      // campfire pinched the band to a line crossing the fire's keep-out,
      // letting the visitor grind onto the logs. The circle already guards
      // that strip, so the pinch is dropped.
      if (world.colliders.some((c) => {
        const cc = hallCoords(p.hall, c.x, c.z);
        return cc.s + c.r > from - 0.9 && cc.s - c.r < to + 0.9 &&
               Math.abs(cc.lat * side - halfW) < c.r;
      })) continue;
      const n = { from, to, tw: 0.9, halfW, side };
      p.hall.narrows.push(n);
      autoNarrows.push([p.hall, n]);
      world.decorGuards.push({
        x: p.cx, z: p.cz,
        clear: Math.max(0.1, Math.min(Math.abs(p.lat) - n.halfW, p.sHalf) - 0.05),
      });
    }
    return autoColliders.length + autoNarrows.length;
  };
  world.auditArchitecture = () => auditArchitecture(scene, artManager);
  setTimeout(world.refreshDecorColliders, 5000);
  setTimeout(world.refreshDecorColliders, 16000);

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
    arch.name = "Portal_prehistoric";
    arch.userData.archPortal = {
      eraKey: "prehistoric",
      clearWidth: 3.56,
      clearHeight: 3.08,
      kind: "natural-rock-porch",
      naturalArchitectureException: true,
    };
    g.add(arch);
  });

  // Dual-face room plaque at the cave mouth. It sits proud of the eroded
  // arch so the rock silhouette cannot bury the label from either approach.
  const caveTheme = getSignTheme("prehistoric");
  const caveTex = T.signTexture("Prehistoric Cave Art", "40,000 – 2,000 BCE", {
    ...caveTheme,
    anchor: caveTheme.anchor,
    mainSize: 50,
    subSize: 21,
    anchorSize: 13,
  });
  const addCaveSign = (face, z, rotY) => {
    const sign = new THREE.Mesh(
      plane,
      new THREE.MeshBasicMaterial({ map: caveTex, transparent: false }));
    sign.name = `EraSign${face === "front" ? "Front" : "Back"}_prehistoric`;
    sign.userData.archSign = { eraKey: "prehistoric", face, anchor: caveTheme.anchor };
    sign.scale.set(3.05, 0.56, 1);
    sign.position.set(0, 3.31, z);
    sign.rotation.y = rotY;
    g.add(sign);
  };
  addCaveSign("front", z0 - 1.15, Math.PI); // hub-facing, clear of the eroded arch edge
  addCaveSign("back", z0 + 1.74, 0);        // cave-facing, behind the arch mass

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

  // Concealed conservation lighting: no flame fixtures, soot, or invented
  // prehistoric hardware. Alternating wall-grazing pools reveal morphology and
  // art while leaving the central route clear.
  const caveLightCount = Math.ceil(len / 5.5);
  for (let i = 0; i < caveLightCount; i++) {
    const side = i % 2 ? 1 : -1;
    const light = new THREE.PointLight(0xffd5a5, 18, 13, 1.8);
    light.position.set(side * 2.35, 2.65, z0 + 2.8 + i * ((len - 5.6) / Math.max(1, caveLightCount - 1)));
    light.visible = false;
    g.add(light);
    world.lights.push(light);
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
      eraKey: seg.era,
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
// It stays narrow + low at the hub end (the six wings are close together
// there, so full-width corridors would overlap), then FLARES open — wider and
// taller — toward the wing end, so the era's portal facade (its sign and jamb
// carving) is revealed on approach instead of being boxed off by a constant-
// width tunnel. Collision keeps the visitor centred (NECK_HALF), so the extra
// width is purely visual headroom.
function buildNeck(g, style) {
  const zHub = -(HUB_R - 0.6), len = NECK_LEN + 1.4, zWing = zHub - len;
  const hwHub = NECK_W / 2, hHub = NECK_H;                 // narrow/low at the hub
  const hwWing = HALL_W / 2 - 0.12, hWing = style.ceilH - 0.05; // near-full at the wing
  const uv = 3.5, fy = 0.008;                              // floor just above the seams

  const wallMat = style.wall.clone(); wallMat.side = THREE.DoubleSide;
  const ceilMat = style.ceiling.clone(); ceilMat.side = THREE.DoubleSide;
  const floorMat = style.floor.clone(); floorMat.side = THREE.DoubleSide;

  // A ruled quad (two triangles) from 4 corners with explicit UVs.
  const quad = (c, uvs, mat) => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(
      [...c[0], ...c[1], ...c[2], ...c[0], ...c[2], ...c[3]], 3));
    geo.setAttribute("uv", new THREE.Float32BufferAttribute(
      [...uvs[0], ...uvs[1], ...uvs[2], ...uvs[0], ...uvs[2], ...uvs[3]], 2));
    geo.computeVertexNormals();
    g.add(new THREE.Mesh(geo, mat));
  };
  const trapUV = [[0, 0], [NECK_W / uv, 0], [HALL_W / uv, len / uv], [0, len / uv]];

  // floor + ramped ceiling (trapezoids widening toward the wing)
  quad([[-hwHub, fy, zHub], [hwHub, fy, zHub], [hwWing, fy, zWing], [-hwWing, fy, zWing]],
       trapUV, floorMat);
  quad([[-hwHub, hHub, zHub], [hwHub, hHub, zHub], [hwWing, hWing, zWing], [-hwWing, hWing, zWing]],
       trapUV, ceilMat);
  // side walls: flare out and up toward the wing
  for (const side of [-1, 1]) {
    quad([[side * hwHub, 0, zHub], [side * hwHub, hHub, zHub],
          [side * hwWing, hWing, zWing], [side * hwWing, 0, zWing]],
         [[0, 0], [0, hHub / uv], [len / uv, hWing / uv], [len / uv, 0]], wallMat);
  }
  const light = new THREE.PointLight(style.light.color, 18, 15, 2);
  light.position.set(0, hWing - 0.7, (zHub + zWing) / 2);
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
