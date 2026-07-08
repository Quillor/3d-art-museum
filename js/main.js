import * as THREE from "three";
import { buildWorld, hallCoords } from "./world.js";
import { ArtManager } from "./art.js";
import { Controls } from "./controls.js";
import * as UI from "./ui.js";
import * as Audio from "./audio.js";
import { QUALITY } from "./device.js";
import { loadSaved, savePos } from "./persist.js";

const canvas = document.getElementById("scene");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(devicePixelRatio, QUALITY.pixelRatioCap));
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

// ---- resume: restore a validated saved position, else default spawn ----
function restoreSaved() {
  const saved = loadSaved();
  if (!saved) return false;
  const p = new THREE.Vector3(saved.x, 1.62, saved.z);
  // must be inside a known region, and collision must agree it's walkable
  if (!world.locate(p)) return false;
  const clamped = world.clampMove(p, p);
  if (clamped.distanceToSquared(p) > 0.36) return false;
  controls.pos.copy(clamped.setY(1.62));
  controls.yaw = saved.yaw;
  controls.pitch = saved.pitch;
  return true;
}
const resumed = restoreSaved();

function onTap(nx, ny) {
  if (UI.isPanelOpen()) { UI.closePanel(); return; }
  const item = artManager.hitTest(new THREE.Vector2(nx, ny), camera);
  if (item) UI.openPanel(item);
}

UI.initUI({
  onEnter: () => { controls.enabled = true; Audio.unlock(); },
  resume: resumed,
});

// ---- music mute toggle (HUD) ----
const muteBtn = document.getElementById("mute-btn");
function syncMuteBtn() {
  const m = Audio.isMuted();
  muteBtn.classList.toggle("muted", m);
  muteBtn.setAttribute("aria-label", m ? "Unmute music" : "Mute music");
}
syncMuteBtn();
muteBtn.addEventListener("click", () => { Audio.toggleMute(); syncMuteBtn(); });

// ---- persist position: throttled while moving + on tab hide/unload ----
function persistNow() {
  if (!controls.enabled) return;
  savePos(controls.pos, controls.yaw, controls.pitch);
}
addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") persistNow(); });
addEventListener("pagehide", persistNow);

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
  controls.touchVel = 0;
  controls.touchYawVel = 0;
  controls.touchHold = null;
  flash();
  UI.showHint(`The light carries you out of ${fromLabel} — back at the Grand Crossing`);
  artManager.update(controls.pos);
  cullLights();
  persistNow();
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
let acc = 0.35, hudAcc = 0, endAcc = 0, saveAcc = 0;

function tick() {
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;

  controls.update(dt);
  controls.applyTo(camera);

  for (const f of world.fires) f.update(t);
  for (const s of world.shimmers) s(t);

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
    const loc = world.locate(controls.pos);
    UI.setEra(loc);
    Audio.setRoom(loc);
  }
  saveAcc += dt;
  if (saveAcc > 2) {
    saveAcc = 0;
    persistNow();
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
window.__museum = { scene, camera, controls, world, artManager, renderer, Audio,
  endLightLogic: () => endLightLogic(world.locate(controls.pos)),
  teleport(x, z, yaw = 0) { controls.pos.set(x, 1.62, z); controls.yaw = yaw; } };
