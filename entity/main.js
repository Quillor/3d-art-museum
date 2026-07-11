// /entity — explorable 3D graph of the museum codebase.
// Data comes from entity/graph.js (regenerate: node tools/generate_entity_graph.mjs).
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GRAPH } from "./graph.js";

const CAT_COLORS = { module: 0xf0a24a, data: 0x5fc878, concept: 0x4cc3e8, art: 0xc987e8, asset: 0xa89f90 };
const CAT_LABELS = { module: "Engine modules", data: "Data files", concept: "Domain concepts", art: "Artworks", asset: "Assets & libraries" };
const EDGE_COLORS = { imports: 0x8a93a8, creates: 0xd07c33, contains: 0x3e6fd0, configures: 0x3fae8c, loads: 0xb05ab8 };
const EDGE_LABELS = { imports: "imports", creates: "creates / owns", contains: "contains", configures: "configures", loads: "loads" };
const BG = new THREE.Color(0x0d0f14);

const nodes = GRAPH.nodes, edges = GRAPH.edges, N = nodes.length;
const idx = new Map(nodes.map((n, i) => [n.id, i]));
for (const e of edges) { e.si = idx.get(e.s); e.ti = idx.get(e.t); }
const adj = nodes.map(() => []);
for (const e of edges) { adj[e.si].push({ e, other: e.ti, out: true }); adj[e.ti].push({ e, other: e.si, out: false }); }

// ---------------------------------------------------------------- layout ----
// Deterministic force layout: seeded start, N-body repulsion, springs per
// edge, gentle category anchors (data left, modules right, assets low).
function mulberry32(a) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20260710);
const jitter = (s) => (rand() - 0.5) * 2 * s;

const pos = new Float32Array(N * 3), vel = new Float32Array(N * 3), frc = new Float32Array(N * 3);
const repF = new Float32Array(N);
const containsParent = new Map();
for (const e of edges) if (e.type === "contains") containsParent.set(e.ti, e.si);

{
  let wingI = 0;
  const place = (i, x, y, z) => { pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z; };
  const fixed = { "concept:museum": [0, 14, 0], "concept:rotunda": [0, 20, 8], "concept:cave": [0, 8, 34] };
  nodes.forEach((n, i) => {
    repF[i] = n.cat === "art" ? 0.32 : 1;
    if (fixed[n.id]) return place(i, ...fixed[n.id]);
    if (n.id.startsWith("wing:")) {
      const a = (wingI++ / 6) * Math.PI * 2;
      return place(i, Math.cos(a) * 30, 8 + jitter(4), Math.sin(a) * 30);
    }
    if (n.cat === "module") return place(i, 72 + jitter(14), jitter(26), jitter(30));
    if (n.cat === "data") return place(i, -72 + jitter(12), jitter(22), jitter(26));
    if (n.cat === "asset") return place(i, jitter(34), -42 + jitter(8), jitter(34));
    place(i, jitter(20), 10 + jitter(10), jitter(20)); // concepts / arts, refined below
  });
  // start eras near their wing and artworks near their era so the hierarchy
  // untangles instead of pulling through the middle of the graph
  nodes.forEach((n, i) => {
    if (!n.id.startsWith("era:")) return;
    const p = containsParent.get(i);
    if (p != null) place(i, pos[p * 3] + jitter(9), pos[p * 3 + 1] + jitter(9), pos[p * 3 + 2] + jitter(9));
  });
  nodes.forEach((n, i) => {
    if (n.cat !== "art") return;
    const p = containsParent.get(i);
    if (p != null) place(i, pos[p * 3] + jitter(4), pos[p * 3 + 1] + jitter(4), pos[p * 3 + 2] + jitter(4));
  });
}

for (const e of edges) {
  const art = nodes[e.ti].cat === "art";
  e.rest = art ? 6.5 : { imports: 30, creates: 24, contains: 16, configures: 26, loads: 13 }[e.type];
  e.k = art ? 0.06 : { imports: 0.015, creates: 0.02, contains: 0.05, configures: 0.018, loads: 0.03 }[e.type];
}

let alpha = 1;
const K_REP = 1100;
function simStep() {
  frc.fill(0);
  for (let i = 0; i < N; i++) {
    const ix = i * 3;
    for (let j = i + 1; j < N; j++) {
      const jx = j * 3;
      const dx = pos[ix] - pos[jx], dy = pos[ix + 1] - pos[jx + 1], dz = pos[ix + 2] - pos[jx + 2];
      const d2 = dx * dx + dy * dy + dz * dz + 0.05;
      if (d2 > 3600) continue;
      const f = (K_REP * repF[i] * repF[j]) / d2 / Math.sqrt(d2);
      frc[ix] += dx * f; frc[ix + 1] += dy * f; frc[ix + 2] += dz * f;
      frc[jx] -= dx * f; frc[jx + 1] -= dy * f; frc[jx + 2] -= dz * f;
    }
  }
  for (const e of edges) {
    const a = e.si * 3, b = e.ti * 3;
    const dx = pos[b] - pos[a], dy = pos[b + 1] - pos[a + 1], dz = pos[b + 2] - pos[a + 2];
    const d = Math.sqrt(dx * dx + dy * dy + dz * dz) + 0.001;
    const f = e.k * (d - e.rest) / d;
    frc[a] += dx * f; frc[a + 1] += dy * f; frc[a + 2] += dz * f;
    frc[b] -= dx * f; frc[b + 1] -= dy * f; frc[b + 2] -= dz * f;
  }
  for (let i = 0; i < N; i++) {
    const ix = i * 3, cat = nodes[i].cat;
    if (cat === "module") frc[ix] += (72 - pos[ix]) * 0.015;
    else if (cat === "data") frc[ix] += (-72 - pos[ix]) * 0.015;
    else if (cat === "asset") frc[ix + 1] += (-42 - pos[ix + 1]) * 0.012;
    frc[ix] -= pos[ix] * 0.002; frc[ix + 1] -= pos[ix + 1] * 0.002; frc[ix + 2] -= pos[ix + 2] * 0.002;
    for (let c = 0; c < 3; c++) {
      let v = (vel[ix + c] + frc[ix + c] * alpha) * 0.86;
      vel[ix + c] = Math.max(-4, Math.min(4, v));
      pos[ix + c] += vel[ix + c];
    }
  }
  alpha *= 0.994;
}

// ------------------------------------------------------------- rendering ----
const canvas = document.getElementById("scene");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
const scene = new THREE.Scene();
scene.background = BG;
const camera = new THREE.PerspectiveCamera(58, innerWidth / innerHeight, 0.1, 2000);
const HOME = { pos: new THREE.Vector3(0, 70, 240), target: new THREE.Vector3(0, 2, 0) };
camera.position.copy(HOME.pos);

scene.add(new THREE.AmbientLight(0xffffff, 0.65));
const key = new THREE.DirectionalLight(0xffffff, 1.6); key.position.set(60, 90, 70); scene.add(key);
const rim = new THREE.DirectionalLight(0x8090c0, 0.5); rim.position.set(-50, -30, -60); scene.add(rim);

const controls = new OrbitControls(camera, canvas);
controls.target.copy(HOME.target);
controls.enableDamping = true;
controls.dampingFactor = 0.09;
controls.screenSpacePanning = true;
controls.mouseButtons = { LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN };
canvas.addEventListener("contextmenu", (e) => e.preventDefault());
addEventListener("keydown", (e) => { if (e.key === "Shift") controls.mouseButtons.LEFT = THREE.MOUSE.PAN; });
addEventListener("keyup", (e) => { if (e.key === "Shift") controls.mouseButtons.LEFT = THREE.MOUSE.ROTATE; });

// nodes — one instanced mesh, per-instance color + scale
const inst = new THREE.InstancedMesh(
  new THREE.SphereGeometry(1, 20, 14),
  new THREE.MeshLambertMaterial(),
  N
);
inst.frustumCulled = false;
inst.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
scene.add(inst);
const _m = new THREE.Matrix4(), _c = new THREE.Color();

// edges — one LineSegments per relationship type (imports dashed)
const edgeGroups = {};
for (const type of Object.keys(EDGE_COLORS)) {
  const list = edges.filter((e) => e.type === type);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(list.length * 6), 3));
  geo.setAttribute("color", new THREE.BufferAttribute(new Float32Array(list.length * 6), 3));
  const mat = type === "imports"
    ? new THREE.LineDashedMaterial({ vertexColors: true, transparent: true, opacity: 0.85, dashSize: 1.7, gapSize: 1.1 })
    : new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.85 });
  const obj = new THREE.LineSegments(geo, mat);
  obj.frustumCulled = false;
  scene.add(obj);
  edgeGroups[type] = { list, geo, obj, dashed: type === "imports" };
}

// labels — canvas sprites, faded by distance in the render loop
const labels = nodes.map((n) => {
  const cv = document.createElement("canvas");
  cv.width = 512; cv.height = 128;
  const ctx = cv.getContext("2d");
  let px = 44;
  ctx.font = `600 ${px}px system-ui, sans-serif`;
  while (ctx.measureText(n.label).width > 492 && px > 18) { px -= 2; ctx.font = `600 ${px}px system-ui, sans-serif`; }
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.lineWidth = 8; ctx.strokeStyle = "rgba(6,8,12,0.9)";
  ctx.strokeText(n.label, 256, 66);
  ctx.fillStyle = "#" + _c.set(CAT_COLORS[n.cat]).lerp(new THREE.Color(1, 1, 1), 0.45).getHexString();
  ctx.fillText(n.label, 256, 66);
  const tex = new THREE.CanvasTexture(cv);
  tex.anisotropy = 4;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
  const w = 3.2 + n.size * 1.9;
  sp.userData.w = w;
  sp.scale.set(w, w / 4, 1);
  scene.add(sp);
  return sp;
});

// ------------------------------------------------- state + visual updates ----
const catVisible = { module: true, data: true, concept: true, art: true, asset: true };
const typeVisible = { imports: true, creates: true, contains: true, configures: true, loads: true };
let selected = -1;
const neighbors = new Set();
const nodeHidden = (i) => !catVisible[nodes[i].cat];

function updateMatrices() {
  for (let i = 0; i < N; i++) {
    const s = nodeHidden(i) ? 0 : nodes[i].size;
    _m.makeScale(s, s, s).setPosition(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]);
    inst.setMatrixAt(i, _m);
  }
  inst.instanceMatrix.needsUpdate = true;
}

function updateEdgePositions() {
  for (const g of Object.values(edgeGroups)) {
    const p = g.geo.attributes.position.array;
    g.list.forEach((e, i) => {
      const hide = nodeHidden(e.si) || nodeHidden(e.ti);
      const o = i * 6;
      for (let c = 0; c < 3; c++) {
        p[o + c] = hide ? 0 : pos[e.si * 3 + c];
        p[o + 3 + c] = hide ? 0 : pos[e.ti * 3 + c];
      }
    });
    g.geo.attributes.position.needsUpdate = true;
    if (g.dashed) g.obj.computeLineDistances();
  }
}

const WHITE = new THREE.Color(1, 1, 1);
function nodeBaseColor(i, out) {
  out.set(CAT_COLORS[nodes[i].cat]);
  if (selected >= 0) {
    if (i === selected) out.lerp(WHITE, 0.55);
    else if (!neighbors.has(i)) out.lerp(BG, 0.85);
  }
  return out;
}
function edgeBaseColor(e, type, out) {
  out.set(EDGE_COLORS[type]);
  if (selected < 0) out.lerp(BG, 0.35);
  else if (e.si === selected || e.ti === selected) out.lerp(WHITE, 0.25);
  else out.lerp(BG, 0.9);
  return out;
}
function refreshColors() {
  for (let i = 0; i < N; i++) inst.setColorAt(i, nodeBaseColor(i, _c));
  inst.instanceColor.needsUpdate = true;
  for (const [type, g] of Object.entries(edgeGroups)) {
    const col = g.geo.attributes.color.array;
    g.list.forEach((e, i) => {
      edgeBaseColor(e, type, _c);
      const o = i * 6;
      col[o] = col[o + 3] = _c.r; col[o + 1] = col[o + 4] = _c.g; col[o + 2] = col[o + 5] = _c.b;
    });
    g.geo.attributes.color.needsUpdate = true;
  }
}

function updateLabelFades() {
  const cp = camera.position;
  for (let i = 0; i < N; i++) {
    const sp = labels[i];
    if (nodeHidden(i)) { sp.visible = false; continue; }
    const d = Math.hypot(cp.x - pos[i * 3], cp.y - pos[i * 3 + 1], cp.z - pos[i * 3 + 2]);
    // grow with distance (clamped) so labels stay a readable screen size
    const f = THREE.MathUtils.clamp(d / 60, 1, 7);
    const w = sp.userData.w * f;
    sp.scale.set(w, w / 4, 1);
    sp.position.set(pos[i * 3], pos[i * 3 + 1] + nodes[i].size + 0.6 + w / 8, pos[i * 3 + 2]);
    const [near, far] =
      selected >= 0 && (i === selected || neighbors.has(i)) ? [220, 320] :
      nodes[i].cat === "art" ? [16, 42] :
      nodes[i].deg > 10 || nodes[i].id.startsWith("wing:") || nodes[i].id === "concept:museum" ? [200, 460] :
      [60, 170];
    let op = THREE.MathUtils.clamp(1 - (d - near) / (far - near), 0, 1);
    if (selected >= 0 && i !== selected && !neighbors.has(i)) op *= 0.12;
    sp.material.opacity = op;
    sp.visible = op > 0.03;
  }
}

// ------------------------------------------------- live-mode effects ----
// Pulses, edge flashes and the "you are here" marker used by the hidden
// Live Mode (live.js). Inert until something calls the liveApi below.
const pulses = new Map();   // node index -> { t0, dur, color }
const flashes = [];         // { g, o, e, type, t0, dur } per flashed edge
let markerIdx = -1, markerSprite = null;

const edgeLookup = new Map(); // "srcId|dstId" (both directions) -> { g, o, e, type }
for (const [type, g] of Object.entries(edgeGroups)) {
  g.list.forEach((e, i) => {
    const ref = { g, o: i * 6, e, type };
    edgeLookup.set(`${e.s}|${e.t}`, ref);
    edgeLookup.set(`${e.t}|${e.s}`, ref);
  });
}

function makeMarker() {
  const cv = document.createElement("canvas");
  cv.width = cv.height = 256;
  const ctx = cv.getContext("2d");
  const g = ctx.createRadialGradient(128, 128, 70, 128, 128, 128);
  g.addColorStop(0, "rgba(76,195,232,0)");
  g.addColorStop(0.55, "rgba(76,195,232,0.9)");
  g.addColorStop(0.75, "rgba(140,225,255,0.35)");
  g.addColorStop(1, "rgba(76,195,232,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({
    map: new THREE.CanvasTexture(cv), transparent: true, depthWrite: false, depthTest: false,
  }));
  sp.renderOrder = 10;
  sp.visible = false;
  scene.add(sp);
  return sp;
}

function stepLiveFx(now) {
  if (pulses.size) {
    for (const [i, p] of pulses) {
      const k = (now - p.t0) / p.dur;
      const done = k >= 1;
      const throb = done ? 1 : 1 + 0.55 * Math.sin(Math.min(k, 1) * Math.PI);
      const s = (nodeHidden(i) ? 0 : nodes[i].size) * throb;
      _m.makeScale(s, s, s).setPosition(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]);
      inst.setMatrixAt(i, _m);
      inst.setColorAt(i, done ? nodeBaseColor(i, _c) : nodeBaseColor(i, _c).lerp(p.color, 1 - k));
      if (done) pulses.delete(i);
    }
    inst.instanceMatrix.needsUpdate = true;
    inst.instanceColor.needsUpdate = true;
  }
  if (flashes.length) {
    const touched = new Set();
    for (let f = flashes.length - 1; f >= 0; f--) {
      const fl = flashes[f];
      const k = (now - fl.t0) / fl.dur;
      edgeBaseColor(fl.e, fl.type, _c);
      if (k >= 1) flashes.splice(f, 1);
      else _c.lerp(WHITE, 0.85 * (1 - k));
      const col = fl.g.geo.attributes.color.array;
      col[fl.o] = col[fl.o + 3] = _c.r; col[fl.o + 1] = col[fl.o + 4] = _c.g; col[fl.o + 2] = col[fl.o + 5] = _c.b;
      touched.add(fl.g);
    }
    for (const g of touched) g.geo.attributes.color.needsUpdate = true;
  }
  if (markerIdx >= 0 && markerSprite) {
    const i = markerIdx;
    markerSprite.visible = !nodeHidden(i);
    markerSprite.position.set(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]);
    const s = nodes[i].size * (3.1 + 0.35 * Math.sin(now * 0.005));
    markerSprite.scale.set(s, s, 1);
  }
}

const liveApi = {
  hasNode: (id) => idx.has(id),
  label: (id) => nodes[idx.get(id)]?.label,
  pulse(id, color = 0xffffff, dur = 1000) {
    const i = idx.get(id);
    if (i != null) pulses.set(i, { t0: performance.now(), dur, color: new THREE.Color(color) });
  },
  flashEdge(a, b, dur = 1300) {
    const ref = edgeLookup.get(`${a}|${b}`);
    if (ref) flashes.push({ ...ref, t0: performance.now(), dur });
  },
  flashTouching(id, dur = 1300) {
    const i = idx.get(id);
    if (i == null) return;
    for (const a of adj[i]) liveApi.flashEdge(a.e.s, a.e.t, dur);
  },
  setMarker(id) {
    markerIdx = id != null && idx.has(id) ? idx.get(id) : -1;
    if (markerIdx >= 0 && !markerSprite) markerSprite = makeMarker();
    if (markerSprite) markerSprite.visible = markerIdx >= 0;
  },
  select(id) { const i = idx.get(id); if (i != null) select(i); },
  flyTo(id) { const i = idx.get(id); if (i != null) flyTo(i); },
  findArtByTitle: (title) => nodes.find((n) => n.cat === "art" && n.label === title)?.id ?? null,
};

// hidden: L toggles Live Mode (walk the real museum, watch the graph fire)
let liveModule = null;
addEventListener("keydown", (e) => {
  if (e.target instanceof HTMLInputElement) return;
  if (e.code === "KeyL") {
    (liveModule ??= import("./live.js")).then((m) => m.toggleLive(liveApi));
  }
});
if (new URLSearchParams(location.search).has("live"))
  (liveModule = import("./live.js")).then((m) => m.toggleLive(liveApi));
console.log("%centity: press L to walk the museum live and watch the graph fire (or ?live=1)", "color:#4cc3e8");

// ------------------------------------------------------------ interaction ----
const tip = document.getElementById("tip");
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
function pick(ev) {
  mouse.set((ev.clientX / innerWidth) * 2 - 1, -(ev.clientY / innerHeight) * 2 + 1);
  raycaster.setFromCamera(mouse, camera);
  const hit = raycaster.intersectObject(inst, false)[0];
  return hit && hit.instanceId != null && !nodeHidden(hit.instanceId) ? hit.instanceId : -1;
}

let hover = -1;
addEventListener("pointermove", (ev) => {
  if (ev.target !== canvas) { hover = -1; tip.style.display = "none"; return; }
  hover = pick(ev);
  canvas.style.cursor = hover >= 0 ? "pointer" : "";
  if (hover >= 0) {
    tip.innerHTML = `${esc(nodes[hover].label)} <span class="t-cat">· ${CAT_LABELS[nodes[hover].cat]}</span>`;
    tip.style.display = "block";
    tip.style.left = Math.min(ev.clientX + 14, innerWidth - 220) + "px";
    tip.style.top = ev.clientY + 12 + "px";
  } else tip.style.display = "none";
});

let downAt = null;
canvas.addEventListener("pointerdown", (ev) => { downAt = { x: ev.clientX, y: ev.clientY, t: Date.now() }; });
canvas.addEventListener("pointerup", (ev) => {
  if (!downAt || Math.hypot(ev.clientX - downAt.x, ev.clientY - downAt.y) > 5 || Date.now() - downAt.t > 500) return;
  const i = pick(ev);
  i >= 0 ? select(i) : clearSelection();
});
canvas.addEventListener("dblclick", (ev) => {
  const i = pick(ev);
  if (i >= 0) { select(i); flyTo(i); }
});

function select(i) {
  selected = i;
  neighbors.clear();
  for (const a of adj[i]) neighbors.add(a.other);
  refreshColors();
  fillInfo(i);
}
function clearSelection() {
  selected = -1;
  neighbors.clear();
  refreshColors();
  document.getElementById("info").classList.remove("open");
}

// camera fly-to animation
let flight = null;
function flyTo(i) {
  const to = new THREE.Vector3(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]);
  const dir = camera.position.clone().sub(controls.target).normalize();
  flight = {
    t0: performance.now(), dur: 700,
    camA: camera.position.clone(), camB: to.clone().add(dir.multiplyScalar(Math.max(26, nodes[i].size * 11))),
    tgtA: controls.target.clone(), tgtB: to,
  };
}
function stepFlight(now) {
  if (!flight) return;
  const k = Math.min(1, (now - flight.t0) / flight.dur);
  const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
  camera.position.lerpVectors(flight.camA, flight.camB, e);
  controls.target.lerpVectors(flight.tgtA, flight.tgtB, e);
  if (k >= 1) flight = null;
}

// info panel
const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
function fillInfo(i) {
  const n = nodes[i];
  document.getElementById("info").classList.add("open");
  document.getElementById("info-title").textContent = n.label;
  const chip = document.getElementById("info-cat");
  chip.textContent = CAT_LABELS[n.cat];
  chip.style.background = "#" + _c.set(CAT_COLORS[n.cat]).getHexString();
  document.getElementById("info-deg").textContent = `${n.deg} connections`;
  document.getElementById("info-path").textContent = n.path || "";
  document.getElementById("info-desc").textContent = n.desc || "";
  const rels = document.getElementById("info-rels");
  rels.innerHTML = "";
  for (const [title, dir] of [["Outgoing", true], ["Incoming", false]]) {
    const rows = adj[i].filter((a) => a.out === dir);
    if (!rows.length) continue;
    const h = document.createElement("h3");
    h.textContent = title;
    rels.appendChild(h);
    rows.sort((a, b) => a.e.type.localeCompare(b.e.type) || nodes[a.other].label.localeCompare(nodes[b.other].label));
    for (const a of rows) {
      const row = document.createElement("div");
      row.className = "rel";
      row.innerHTML =
        `<span class="rtype" style="color:#${_c.set(EDGE_COLORS[a.e.type]).getHexString()}">${a.e.type} ${dir ? "→" : "←"}</span>` +
        `<span class="rlabel">${esc(nodes[a.other].label)}</span>`;
      row.onclick = () => { select(a.other); flyTo(a.other); };
      rels.appendChild(row);
    }
  }
}
document.getElementById("info-close").onclick = clearSelection;

// search
const searchEl = document.getElementById("search");
const resultsEl = document.getElementById("search-results");
let results = [], active = -1;
function runSearch() {
  const q = searchEl.value.trim().toLowerCase();
  results = []; active = -1;
  resultsEl.innerHTML = "";
  if (!q) return;
  results = nodes
    .map((n, i) => ({ n, i, hit: n.label.toLowerCase().indexOf(q) }))
    .filter((r) => r.hit >= 0)
    .sort((a, b) => (a.hit === 0 ? -1 : 0) - (b.hit === 0 ? -1 : 0) || b.n.deg - a.n.deg)
    .slice(0, 14);
  results.forEach((r, k) => {
    const li = document.createElement("li");
    li.innerHTML = `<span class="dot" style="background:#${_c.set(CAT_COLORS[r.n.cat]).getHexString()}"></span>` +
      `${esc(r.n.label)}<span class="cat">${r.n.cat}</span>`;
    li.onclick = () => goToResult(k);
    resultsEl.appendChild(li);
  });
}
function goToResult(k) {
  if (!results[k]) return;
  select(results[k].i);
  flyTo(results[k].i);
  resultsEl.innerHTML = "";
  searchEl.value = "";
  searchEl.blur();
}
searchEl.addEventListener("input", runSearch);
searchEl.addEventListener("keydown", (e) => {
  if (e.key === "Enter") goToResult(Math.max(0, active));
  else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
    e.preventDefault();
    active = THREE.MathUtils.euclideanModulo(active + (e.key === "ArrowDown" ? 1 : -1), results.length || 1);
    [...resultsEl.children].forEach((li, k) => li.classList.toggle("active", k === active));
  } else if (e.key === "Escape") { searchEl.value = ""; runSearch(); searchEl.blur(); }
});
addEventListener("keydown", (e) => {
  if (e.key === "/" && document.activeElement !== searchEl) { e.preventDefault(); searchEl.focus(); }
});

// filters (double as the legend)
function buildFilters() {
  const cats = document.getElementById("filter-cats");
  for (const cat of Object.keys(CAT_COLORS)) {
    const count = nodes.filter((n) => n.cat === cat).length;
    cats.appendChild(filterRow(
      `<span class="dot" style="background:#${_c.set(CAT_COLORS[cat]).getHexString()}"></span>${CAT_LABELS[cat]}<span class="n">${count}</span>`,
      (on) => { catVisible[cat] = on; applyFilters(); }));
  }
  const ets = document.getElementById("filter-edges");
  for (const type of Object.keys(EDGE_COLORS)) {
    const count = edges.filter((e) => e.type === type).length;
    ets.appendChild(filterRow(
      `<span class="swatch" style="background:#${_c.set(EDGE_COLORS[type]).getHexString()}"></span>${EDGE_LABELS[type]}<span class="n">${count}</span>`,
      (on) => { typeVisible[type] = on; edgeGroups[type].obj.visible = on; }));
  }
}
function filterRow(html, onChange) {
  const label = document.createElement("label");
  const cb = document.createElement("input");
  cb.type = "checkbox"; cb.checked = true;
  cb.onchange = () => onChange(cb.checked);
  label.appendChild(cb);
  label.insertAdjacentHTML("beforeend", html);
  return label;
}
function applyFilters() {
  if (selected >= 0 && nodeHidden(selected)) clearSelection();
  updateMatrices();
  updateEdgePositions();
  refreshColors();
}
buildFilters();

// frame the whole (visible) graph; becomes the Reset view target once settled
function fitView(fly) {
  const c = new THREE.Vector3();
  let count = 0;
  for (let i = 0; i < N; i++) {
    if (nodeHidden(i)) continue;
    c.x += pos[i * 3]; c.y += pos[i * 3 + 1]; c.z += pos[i * 3 + 2];
    count++;
  }
  if (!count) return;
  c.divideScalar(count);
  let r = 0;
  for (let i = 0; i < N; i++) {
    if (nodeHidden(i)) continue;
    r = Math.max(r, Math.hypot(pos[i * 3] - c.x, pos[i * 3 + 1] - c.y, pos[i * 3 + 2] - c.z));
  }
  const dist = (r + 10) / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * 1.05;
  HOME.target.copy(c);
  HOME.pos.copy(c).add(new THREE.Vector3(0.25, 0.42, 1).normalize().multiplyScalar(dist));
  if (fly) flight = { t0: performance.now(), dur: 900, camA: camera.position.clone(), camB: HOME.pos.clone(), tgtA: controls.target.clone(), tgtB: HOME.target.clone() };
}

document.getElementById("reset-view").onclick = () => {
  flight = { t0: performance.now(), dur: 700, camA: camera.position.clone(), camB: HOME.pos.clone(), tgtA: controls.target.clone(), tgtB: HOME.target.clone() };
};

// WASD / QE flight
const keys = new Set();
addEventListener("keydown", (e) => {
  if (e.target instanceof HTMLInputElement) return;
  keys.add(e.code);
});
addEventListener("keyup", (e) => keys.delete(e.code));
addEventListener("blur", () => keys.clear());
const _fwd = new THREE.Vector3(), _right = new THREE.Vector3(), _move = new THREE.Vector3();
function stepFly(dt) {
  if (!keys.size) return;
  camera.getWorldDirection(_fwd);
  _right.crossVectors(_fwd, camera.up).normalize();
  _move.set(0, 0, 0)
    .addScaledVector(_fwd, (keys.has("KeyW") ? 1 : 0) - (keys.has("KeyS") ? 1 : 0))
    .addScaledVector(_right, (keys.has("KeyD") ? 1 : 0) - (keys.has("KeyA") ? 1 : 0))
    .addScaledVector(camera.up, (keys.has("KeyE") ? 1 : 0) - (keys.has("KeyQ") ? 1 : 0));
  if (_move.lengthSq() === 0) return;
  _move.normalize().multiplyScalar(dt * (keys.has("ShiftLeft") || keys.has("ShiftRight") ? 110 : 38));
  camera.position.add(_move);
  controls.target.add(_move);
}

// ------------------------------------------------------------------ loop ----
const statusEl = document.getElementById("status");
updateMatrices(); updateEdgePositions(); refreshColors();
let last = performance.now();
function tick(now) {
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;
  if (alpha > 0.035) {
    for (let s = 0; s < 3 && alpha > 0.035; s++) simStep();
    updateMatrices();
    updateEdgePositions();
    if (alpha <= 0.035) { statusEl.style.opacity = "0"; fitView(true); }
  }
  stepFly(dt);
  stepFlight(now);
  stepLiveFx(now);
  controls.update();
  updateLabelFades();
  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);

addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

// debug / testing hook (same convention as the museum's window.__museum)
window.__entity = {
  camera, controls, renderer, nodes, edges, pos, labels, HOME,
  select: (id) => { const i = idx.get(id); if (i != null) { select(i); flyTo(i); } },
  alpha: () => alpha,
  selected: () => (selected >= 0 ? nodes[selected].id : null),
};
