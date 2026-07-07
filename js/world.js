// Assembles the whole museum: entrance cave, rotunda hub, five era wings.
// Also owns collision and "where am I" lookup for the HUD and the loop doors.
//
// Collision model: the hub is a clamped disc; every hallway is a "hall" with
// a width PROFILE along its axis — full width in open gallery, smoothly
// narrowing (an hourglass) through every doorway and portal, so a visitor
// pressed against the curve is funneled through the opening instead of
// clipping into the door shoulders. Columns, jambs, benches and the campfire
// are circular colliders that push the visitor out.
import * as THREE from "three";
import { REGIONS, ERAS, PREHISTORIC } from "./data/artworks.js";
import { buildStyles, surf } from "./styles.js";
import { buildSegment, buildPortal, buildEndZone, HALL_W } from "./corridor.js";
import * as T from "./textures.js";
import { createFire } from "./fire.js";

export const HUB_R = 9;
const HUB_WALL_H = 6.2;
const DOOR_W = 3.4, DOOR_H = 3.5;
const CAVE_LEN = 26, CAVE_W = 6.4, CAVE_H = 3.7;
// Wings are 36° apart, so full-width corridors would overlap near the hub.
// Each wing therefore begins with a narrow vestibule "neck" and only widens
// to full hall width once the wings have diverged.
const NECK_LEN = 5.4, NECK_W = 4.3, NECK_H = 3.9;
const PLAYER_R = 0.32;

// walkable half-widths (player radius already subtracted)
const BASE_HALF = HALL_W / 2 - 0.42;   // 3.08 in open gallery
const DOOR_HALF = 1.31;                // through hub doorways
const NECK_HALF = 1.74;                // inside the vestibule
const PORTAL_HALF = 1.28;              // through era portals
const PORTAL_TW = 3.0;                 // funnel transition length

const box = new THREE.BoxGeometry(1, 1, 1);
const plane = new THREE.PlaneGeometry(1, 1);
const UP = new THREE.Vector3(0, 1, 0);

export function buildWorld(scene, artManager) {
  const styles = buildStyles();
  const world = {
    lights: [],
    fires: [],
    halls: [],           // walkable corridors with width profiles
    hubR: HUB_R - 0.42,
    colliders: [],       // {x, z, r} keep-out circles (r includes player radius)
    wingsInfo: [],       // for locate()
    wings: {},           // key → wing record incl. loop-door info
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

export function hallHalfW(h, s) {
  let w = h.base;
  for (const n of h.narrows) {
    const d = n.at !== undefined
      ? Math.abs(s - n.at)
      : s < n.from ? n.from - s : s > n.to ? s - n.to : 0;
    const t = d / n.tw;
    if (t < 1) w = Math.min(w, n.halfW + (h.base - n.halfW) * smooth(t));
  }
  return w;
}

function hallContains(h, x, z, eps) {
  const { s, lat } = hallCoords(h, x, z);
  if (s < -eps || s > h.len + eps) return false;
  return Math.abs(lat) <= hallHalfW(h, Math.max(0, Math.min(h.len, s))) + eps;
}

function hallProject(h, x, z) {
  let { s, lat } = hallCoords(h, x, z);
  s = Math.max(0.03, Math.min(h.len - 0.03, s));
  const w = hallHalfW(h, s);
  lat = Math.max(-w, Math.min(w, lat));
  return [h.ox + h.dx * s - h.dz * lat, h.oz + h.dz * s + h.dx * lat];
}

// ---------------- Hub rotunda ----------------

function buildHub(scene, world, styles) {
  const g = new THREE.Group();
  scene.add(g);

  const stoneMat = new THREE.MeshLambertMaterial({ map: T.stoneBlocks({ base: "#8a8175", mortar: "#4c463d", rows: 4, cols: 3, seed: 200 }) });
  const floorMat = surf(T.checkerFloor("#cfc4a9", "#4c463d", 201), "gloss");

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

  // door bearings (degrees from -Z / north): five wings + cave (180 = south)
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
  for (const d of doors) {
    const rad = THREE.MathUtils.degToRad(d.b);
    const dir = new THREE.Vector3(Math.sin(rad), 0, -Math.cos(rad));
    const frameG = new THREE.Group();
    frameG.position.copy(dir.clone().multiplyScalar(HUB_R));
    frameG.rotation.y = -rad;   // local -Z points away from hub
    g.add(frameG);
    const jambMat = new THREE.MeshLambertMaterial({ color: 0x9c8a68 });
    for (const side of [-1, 1]) {
      const j = new THREE.Mesh(box, jambMat);
      j.scale.set(0.45, DOOR_H + 0.45, 1.4);
      j.position.set(side * (DOOR_W / 2 + 0.16), (DOOR_H + 0.45) / 2, 0);
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

  const rockMat = new THREE.MeshLambertMaterial({ map: T.rock("#5d5248", 301) });
  const rockDark = new THREE.MeshLambertMaterial({ map: T.rock("#4a4038", 302) });
  const dirtMat = new THREE.MeshLambertMaterial({ map: T.dirtFloor(303) });

  const z0 = HUB_R - 1, z1 = HUB_R + CAVE_LEN; // 8 → 35
  const zc = (z0 + z1) / 2, len = z1 - z0;

  // floor
  const floorGeo = new THREE.PlaneGeometry(CAVE_W + 1.5, len, 10, 30);
  jitter(floorGeo, rand, 0, 0, 0.05);
  const floor = new THREE.Mesh(floorGeo, dirtMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, 0, zc);
  dirtMat.map.repeat.set(2, 8);
  g.add(floor);

  // walls: displaced outward
  for (const side of [-1, 1]) {
    const geo = new THREE.PlaneGeometry(len, CAVE_H + 0.8, 52, 9);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const u = pos.getX(i) / len + 0.5, v = pos.getY(i) / CAVE_H + 0.5;
      const n = Math.sin(u * 41 + side) * Math.sin(v * 13.7) * 0.5 + Math.sin(u * 97) * 0.25 + rand() * 0.22;
      pos.setZ(i, -Math.abs(n) * 0.85); // bulge away from the corridor
    }
    geo.computeVertexNormals();
    const wall = new THREE.Mesh(geo, rockMat);
    wall.position.set(side * CAVE_W / 2, (CAVE_H + 0.8) / 2 - 0.3, zc);
    wall.rotation.y = -side * Math.PI / 2;
    g.add(wall);
  }

  // ceiling
  const ceilGeo = new THREE.PlaneGeometry(CAVE_W + 1.6, len, 12, 30);
  const cpos = ceilGeo.attributes.position;
  for (let i = 0; i < cpos.count; i++) {
    const u = cpos.getX(i), v = cpos.getY(i);
    cpos.setZ(i, -(Math.abs(Math.sin(u * 2.1) * Math.sin(v * 0.7)) * 0.55 + rand() * 0.2));
  }
  ceilGeo.computeVertexNormals();
  const ceil = new THREE.Mesh(ceilGeo, rockDark);
  ceil.rotation.x = Math.PI / 2;
  ceil.position.set(0, CAVE_H, zc);
  g.add(ceil);

  // back wall (behind spawn)
  const back = new THREE.Mesh(box, rockDark);
  back.scale.set(CAVE_W + 2, CAVE_H + 1, 1.2);
  back.position.set(0, CAVE_H / 2, z1 + 0.55);
  g.add(back);

  // rough mouth into the hub: rock shoulders around the doorway
  for (const side of [-1, 1]) {
    const s = new THREE.Mesh(box, rockMat);
    s.scale.set((CAVE_W + 1.6) / 2 - DOOR_W / 2, CAVE_H + 0.8, 1.4);
    s.position.set(side * (DOOR_W / 2 + s.scale.x / 2), (CAVE_H + 0.8) / 2 - 0.3, z0 + 0.4);
    s.rotation.y = side * 0.06;
    g.add(s);
  }
  const head = new THREE.Mesh(box, rockMat);
  head.scale.set(DOOR_W + 0.6, CAVE_H - 2.9 + 0.9, 1.4);
  head.position.set(0, 2.9 + head.scale.y / 2 - 0.25, z0 + 0.4);
  g.add(head);

  // stalactites + stalagmites + boulders
  const coneG = new THREE.ConeGeometry(1, 1, 7);
  for (let i = 0; i < 18; i++) {
    const st = new THREE.Mesh(coneG, rockDark);
    const r = 0.09 + rand() * 0.16, h = 0.35 + rand() * 0.6;
    st.scale.set(r, h, r);
    st.rotation.x = Math.PI;
    st.position.set((rand() - 0.5) * (CAVE_W - 1), CAVE_H - 0.28 - h / 2 + 0.35, z0 + 2 + rand() * (len - 4));
    g.add(st);
  }
  const rockG = new THREE.DodecahedronGeometry(1, 0);
  for (let i = 0; i < 10; i++) {
    const b = new THREE.Mesh(rockG, rockMat);
    const s = 0.18 + rand() * 0.4;
    b.scale.set(s, s * (0.6 + rand() * 0.5), s);
    const side = rand() > 0.5 ? 1 : -1;
    b.position.set(side * (CAVE_W / 2 - 0.5 - rand() * 0.35), s * 0.4, z0 + 1.5 + rand() * (len - 3));
    b.rotation.y = rand() * Math.PI;
    g.add(b);
  }

  // campfire near the spawn point — with a keep-out circle
  const firePos = new THREE.Vector3(1.35, 0, HUB_R + 19.2);
  const fire = createFire(firePos);
  g.add(fire.group);
  world.fires.push(fire);
  world.colliders.push({ x: firePos.x, z: firePos.z, r: 1.05 });

  // cave paintings — frameless, vignetted onto the rock
  const n = PREHISTORIC.length;
  for (let i = 0; i < n; i++) {
    const art = PREHISTORIC[i];
    const side = i % 2 === 0 ? -1 : 1;
    const k = Math.floor(i / 2);
    const z = z1 - 3.6 - (k + (side === 1 ? 0.5 : 0)) * 4.15;
    artManager.place(art, {
      pos: new THREE.Vector3(side * (CAVE_W / 2 - 0.72), 1.8, z),
      rotY: side === -1 ? Math.PI / 2 : -Math.PI / 2,
      frame: "none", cave: true, maxW: 1.85, maxH: 1.35,
      region: "Prehistoric", eraKey: "prehistoric",
    });
  }

  // dim guide lights so the deeper paintings are findable
  for (let i = 0; i < 3; i++) {
    const l = new THREE.PointLight(0xff9c4a, 11, 10, 2);
    l.position.set(0, CAVE_H - 1.1, z0 + 5 + i * 7);
    l.visible = false;
    g.add(l);
    world.lights.push(l);
  }

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
  const localColliders = [];
  const portalS = [];

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
    localColliders.push(...res.colliders);
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

  // end landing with the loop door
  const lastStyle = styles[ERAS[segs[segs.length - 1].era].style];
  const zone = buildEndZone(g, lastStyle, z0, region.label);
  world.lights.push(...zone.lights);
  localColliders.push(...zone.colliders);
  info.zFar = zone.zFar;
  info.segCount = segs.length;
  world.wingsInfo.push(info);

  // transform wing-local colliders into world space
  for (const c of localColliders) {
    const p = new THREE.Vector3(c.x, 0, c.z).applyAxisAngle(UP, -rad);
    world.colliders.push({ x: p.x, z: p.z, r: c.r });
  }

  // walkable hall with funnel profile
  const dx = Math.sin(rad), dz = -Math.cos(rad);
  const hall = {
    key: region.key,
    ox: dx * (HUB_R - 2), oz: dz * (HUB_R - 2), dx, dz,
    len: -zone.zFar - (HUB_R - 2) - 0.6,
    base: BASE_HALF,
    narrows: [
      { from: -9, to: 3.4, halfW: DOOR_HALF, tw: 1.2 },      // hub doorway
      { from: 3.4, to: NECK_LEN + 2.0, halfW: NECK_HALF, tw: 1.5 }, // vestibule
      ...portalS.map(at => ({ at, halfW: PORTAL_HALF, tw: PORTAL_TW })), // era portals
    ],
  };
  world.halls.push(hall);

  world.wings[region.key] = {
    key: region.key, label: region.label, rad, hall,
    doorZ: zone.doorZ,
    sDoor: -zone.doorZ - (HUB_R - 2),
    signMat: zone.signMat,
    segCount: segs.length,
  };
}

// Vestibule between the hub doorway and the wing's first full-width segment.
function buildNeck(g, style) {
  const z0 = -(HUB_R - 0.6), len = NECK_LEN + 1.4, zc = z0 - len / 2;
  const floor = new THREE.Mesh(box, style.floor);
  floor.scale.set(NECK_W, 0.08, len);
  floor.position.set(0, -0.04, zc);
  g.add(floor);
  const ceil = new THREE.Mesh(box, style.ceiling);
  ceil.scale.set(NECK_W + 0.6, 0.25, len);
  ceil.position.set(0, NECK_H + 0.12, zc);
  g.add(ceil);
  for (const side of [-1, 1]) {
    const wall = new THREE.Mesh(box, style.wall);
    wall.scale.set(0.3, NECK_H + 0.3, len);
    wall.position.set(side * (NECK_W / 2 + 0.15), (NECK_H + 0.3) / 2, zc);
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
    // visitor along the funnel curves and through doorways
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

    // circular keep-outs (columns, jambs, fire, benches)
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

// ---------------- Locate (for HUD + loop doors) ----------------

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
      return { region: "The Grand Crossing", era: "Five paths through time", period: "choose a hall" };
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
