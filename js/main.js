import * as THREE from "three";
import { buildWorld, hallCoords } from "./world.js";
import { ArtManager } from "./art.js";
import { Controls } from "./controls.js";
import * as UI from "./ui.js";

const canvas = document.getElementById("scene");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.25;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b0a09);
scene.fog = new THREE.FogExp2(0x0b0a09, 0.009);

const camera = new THREE.PerspectiveCamera(68, innerWidth / innerHeight, 0.08, 240);

// base lighting — segment point lights are culled by distance each frame.
// A touch brighter than photoreal tuning: toon bands need a readable
// shadow tier rather than true darkness.
scene.add(new THREE.AmbientLight(0x8a8378, 0.55));
const hemi = new THREE.HemisphereLight(0x9a8f7c, 0x33291f, 0.55);
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

// ---- the end of every hall is a curtain of light back to the lobby ----
function endLightLogic(loc) {
  if (!loc || !loc.wingKey) return;
  const w = world.wings[loc.wingKey];
  const { s } = hallCoords(w.hall, controls.pos.x, controls.pos.z);
  if (s > w.hall.len - 1.0) returnToLobby(w.label);
}

function returnToLobby(fromLabel) {
  // emerge in the Grand Crossing, just in front of the cave mouth
  controls.pos.set(0, 1.62, 6.4);
  controls.yaw = 0;               // facing the six halls
  controls.pitch = 0;
  controls.glideVel = 0;
  controls.keyVel = 0;
  flash();
  UI.showHint(`The light carries you out of ${fromLabel} — back at the Grand Crossing`);
  artManager.update(controls.pos);
  cullLights();
}

// a soft white veil washes over the screen as the visitor nears an end light
const veilEl = document.getElementById("lightveil");
let lastVeil = -1;
function updateVeil() {
  let dMin = Infinity;
  for (const c of world.endLightCenters) {
    const d = controls.pos.distanceTo(c);
    if (d < dMin) dMin = d;
  }
  const near = Math.max(0, Math.min(1, (11 - dMin) / 10));
  const v = Math.round(near * near * 88) / 100;
  if (v !== lastVeil) {
    lastVeil = v;
    veilEl.style.opacity = v;
  }
}

const flashEl = document.getElementById("flash");
function flash() {
  flashEl.style.transition = "opacity 0.09s";
  flashEl.style.opacity = "1";
  setTimeout(() => {
    flashEl.style.transition = "opacity 0.7s";
    flashEl.style.opacity = "0";
  }, 130);
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
let acc = 0.35, hudAcc = 0, endAcc = 0;

function tick() {
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;

  controls.update(dt);
  controls.applyTo(camera);

  for (const f of world.fires) f.update(t);
  for (const f of world.flickers) f(t);
  for (const s of world.shimmers) s(t, controls.pos);
  updateVeil();

  acc += dt;
  if (acc > 0.4) {
    acc = 0;
    artManager.update(controls.pos);
    cullLights();
  }
  endAcc += dt;
  if (endAcc > 0.12) {
    endAcc = 0;
    endLightLogic(world.locate(controls.pos));
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
window.__museum = { scene, camera, controls, world, artManager, renderer,
  endLightLogic: () => endLightLogic(world.locate(controls.pos)),
  teleport(x, z, yaw = 0) { controls.pos.set(x, 1.62, z); controls.yaw = yaw; } };
