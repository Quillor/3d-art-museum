import * as THREE from "three";
import { buildWorld, hallCoords } from "./world.js";
import { HALL_W } from "./corridor.js";
import { ArtManager } from "./art.js";
import { Controls } from "./controls.js";
import { signTexture } from "./textures.js";
import * as UI from "./ui.js";

const canvas = document.getElementById("scene");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.12;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b0a09);
scene.fog = new THREE.FogExp2(0x0b0a09, 0.009);

const camera = new THREE.PerspectiveCamera(68, innerWidth / innerHeight, 0.08, 240);

// base lighting — segment point lights are culled by distance each frame
scene.add(new THREE.AmbientLight(0x8a8378, 0.42));
const hemi = new THREE.HemisphereLight(0x9a8f7c, 0x2a241c, 0.5);
scene.add(hemi);

const artManager = new ArtManager(scene);
const world = buildWorld(scene, artManager);
UI.worldReady();

const controls = new Controls(canvas, world.spawn, world.clampMove, onTap);

function onTap(nx, ny) {
  if (UI.isPanelOpen()) { UI.closePanel(); return; }
  const item = artManager.hitTest(new THREE.Vector2(nx, ny), camera);
  if (item) UI.openPanel(item);
}

UI.initUI({
  onEnter: () => { controls.enabled = true; },
});

// ---- the discovery loop: modern-era doors chaining the wings together ----
const CYCLE = ["americas", "europe", "africa", "middleeast", "asia"];
const doorState = Object.fromEntries(CYCLE.map(k => [k, { back: null, armed: true }]));
const UP = new THREE.Vector3(0, 1, 0);
const nextOf = (k) => CYCLE[(CYCLE.indexOf(k) + 1) % CYCLE.length];

function updateDoorSign(key) {
  const w = world.wings[key];
  const st = doorState[key];
  const targetKey = st.back || nextOf(key);
  const main = st.back ? `Return · ${world.wings[targetKey].label}` : `Onward · ${world.wings[targetKey].label}`;
  const sub = st.back ? "back the way you came" : "the journey continues";
  const tex = signTexture(main, sub, { mainSize: 56, subSize: 30 });
  if (w.signMat.map) w.signMat.map.dispose();
  w.signMat.map = tex;
  w.signMat.needsUpdate = true;
}
CYCLE.forEach(updateDoorSign);

function travelThrough(srcKey) {
  const st = doorState[srcKey];
  const dstKey = st.back || nextOf(srcKey);
  const dst = world.wings[dstKey];

  // arrive just inside the destination wing's own loop door
  const local = new THREE.Vector3(HALL_W / 2 - 1.7, 0, dst.doorZ);
  const p = local.applyAxisAngle(UP, -dst.rad);
  controls.pos.set(p.x, 1.62, p.z);
  // face across the landing and back up the hall, toward the earlier eras
  const dir = new THREE.Vector3(-0.72, 0, 0.7).normalize().applyAxisAngle(UP, -dst.rad);
  controls.yaw = Math.atan2(-dir.x, -dir.z);
  controls.pitch = 0;
  controls.glideVel = 0;
  controls.keyVel = 0;

  doorState[dstKey].back = srcKey;
  doorState[dstKey].armed = false;
  st.armed = false;
  updateDoorSign(dstKey);

  flash();
  UI.showHint(`You cross into ${dst.label} — walk the hall to travel back in time`);
  artManager.update(controls.pos);
  cullLights();
}

const flashEl = document.getElementById("flash");
function flash() {
  flashEl.style.transition = "opacity 0.09s";
  flashEl.style.opacity = "0.9";
  setTimeout(() => {
    flashEl.style.transition = "opacity 0.6s";
    flashEl.style.opacity = "0";
  }, 110);
}

function doorLogic(loc) {
  if (!loc || !loc.wingKey) return;
  const key = loc.wingKey;
  const w = world.wings[key];
  const st = doorState[key];
  // once the visitor has walked two eras deep, the door points onward again
  if (st.back && loc.segIndex <= loc.segCount - 3) {
    st.back = null;
    updateDoorSign(key);
  }
  const { s, lat } = hallCoords(w.hall, controls.pos.x, controls.pos.z);
  const inZone = Math.abs(s - w.sDoor) < 1.0 && lat > 2.45;
  if (inZone && st.armed) travelThrough(key);
  else if (!inZone && !st.armed) st.armed = true;
}

// ---- light management: only the nearest segment lights are live ----
const MAX_LIVE = 9, LIGHT_RANGE = 26;
function cullLights() {
  const p = controls.pos;
  const scored = [];
  for (const l of world.lights) {
    l.getWorldPosition(_lv);
    const d = _lv.distanceTo(p);
    if (d < LIGHT_RANGE) scored.push([d, l]);
    else l.visible = false;
  }
  scored.sort((a, b) => a[0] - b[0]);
  scored.forEach(([, l], i) => (l.visible = i < MAX_LIVE));
}
const _lv = new THREE.Vector3();

// ---- main loop ----
const clock = new THREE.Clock();
let acc = 0.35, hudAcc = 0, doorAcc = 0;

function tick() {
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;

  controls.update(dt);
  controls.applyTo(camera);

  for (const f of world.fires) f.update(t);

  acc += dt;
  if (acc > 0.4) {
    acc = 0;
    artManager.update(controls.pos);
    cullLights();
  }
  doorAcc += dt;
  if (doorAcc > 0.12) {
    doorAcc = 0;
    doorLogic(world.locate(controls.pos));
  }
  hudAcc += dt;
  if (hudAcc > 0.5) {
    hudAcc = 0;
    UI.setEra(world.locate(controls.pos));
  }

  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}
tick();

addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

// debug / testing hook
window.__museum = { scene, camera, controls, world, artManager, renderer, doorState,
  doorLogic: () => doorLogic(world.locate(controls.pos)),
  teleport(x, z, yaw = 0) { controls.pos.set(x, 1.62, z); controls.yaw = yaw; } };
