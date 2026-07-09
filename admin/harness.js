// Admin render harness.
//
// Builds the museum world ONCE (same modules the real site uses) and drives a
// single WebGLRenderer to shoot fixed camera "views" of any section — the
// entrance/exit/floor/ceiling/walls the product tool needs. No controls, no
// audio: this is a headless inspector, so there is exactly ONE renderer and
// ZERO music sources (see the audio note in app.js).
import * as THREE from "three";
import { buildWorld } from "../js/world.js";
import { ArtManager } from "../js/art.js";
import { buildStyles } from "../js/styles.js";
import { HALL_W } from "../js/corridor.js";
import { ERAS, REGIONS } from "../js/data/artworks.js";

const UP = new THREE.Vector3(0, 1, 0);
const EYE_H = 1.62;

// Cave geometry (mirrors js/world.js constants — kept in sync by hand).
const HUB_R = 9, CAVE_LEN = 48, CAVE_W = 6.4, CAVE_H = 3.7;

export function createHarness(canvas) {
  const renderer = new THREE.WebGLRenderer({
    canvas, antialias: true, powerPreference: "high-performance",
    preserveDrawingBuffer: true,   // so we can toDataURL() thumbnails reliably
  });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0b0a09);
  scene.fog = new THREE.FogExp2(0x0b0a09, 0.009);

  // base lighting identical to the live museum (main.js)
  scene.add(new THREE.AmbientLight(0x8a8378, 0.42));
  scene.add(new THREE.HemisphereLight(0x9a8f7c, 0x2a241c, 0.5));

  const camera = new THREE.PerspectiveCamera(62, 1.5, 0.08, 240);

  const artManager = new ArtManager(scene);
  const world = buildWorld(scene, artManager);
  const styles = buildStyles();

  const sections = buildSectionList(world, styles);

  // ---- lighting: the live museum only keeps the ~9 nearest lights on. For a
  // still we brighten a generous neighbourhood around the camera. ----
  const _lv = new THREE.Vector3();
  function prepLights(camPos, count = 16, range = 46) {
    const scored = [];
    for (const l of world.lights) {
      l.getWorldPosition(_lv);
      const d = _lv.distanceTo(camPos);
      if (d < range) scored.push([d, l]);
      else l.visible = false;
    }
    scored.sort((a, b) => a[0] - b[0]);
    scored.forEach(([, l], i) => (l.visible = i < count));
    for (const f of world.fires) if (f.light) f.light.visible = true;
  }

  function animate(t) {
    for (const f of world.fires) f.update(t);
    for (const s of world.shimmers) s(t);
  }

  // ---- convert a section-local point to world space ----
  function toWorld(section, p) {
    const v = new THREE.Vector3(p.x, p.y, p.z);
    if (section.isCave) return v;                 // cave is authored in world coords
    return v.applyAxisAngle(UP, -section.rad);    // wings are rotated groups
  }

  function applyView(section, viewKey) {
    const spec = viewSpecs(section)[viewKey];
    if (!spec) return;
    const eye = toWorld(section, spec.eye);
    const target = toWorld(section, spec.target);
    camera.position.copy(eye);
    camera.up.set(0, 1, 0);
    camera.lookAt(target);
    camera.updateMatrixWorld();
  }

  function resize(w, h) {
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  function render(camPos = camera.position, t = 0) {
    animate(t);
    artManager.update(camPos);
    prepLights(camPos);
    renderer.render(scene, camera);
  }

  return {
    canvas, renderer, scene, camera, world, artManager, sections,
    applyView, render, resize, prepLights, animate,
    viewSpecs,
  };
}

// The eight named viewpoints for a section, expressed in section-local coords
// (x = lateral, z = along the hall). `into` is the direction that goes DEEPER
// into the room; `out` is back toward the entrance/approach.
export function viewSpecs(section) {
  const { zE, zX, mid, halfW, ceilH } = section;
  const into = Math.sign(zX - zE) || -1;   // wings: -1 (−Z), cave: +1 (+Z)
  const out = -into;
  return {
    entrance_out: {
      eye: { x: 0, y: EYE_H, z: zE + out * 3.4 },
      target: { x: 0, y: 1.75, z: zE + into * 3.0 },
    },
    entrance_in: {
      eye: { x: 0, y: EYE_H, z: zE + into * 3.2 },
      target: { x: 0, y: 1.8, z: zE + out * 3.0 },
    },
    exit_out: {
      eye: { x: 0, y: EYE_H, z: zX + into * 3.4 },
      target: { x: 0, y: 1.75, z: zX + out * 3.0 },
    },
    exit_in: {
      eye: { x: 0, y: EYE_H, z: zX + out * 3.2 },
      target: { x: 0, y: 1.8, z: zX + into * 3.0 },
    },
    floor: {
      eye: { x: 0, y: 3.1, z: mid + into * 3.0 },
      target: { x: 0, y: 0, z: mid + out * 1.5 },
    },
    ceiling: {
      eye: { x: 0, y: 1.1, z: mid + into * 2.0 },
      target: { x: 0, y: ceilH, z: mid + out * 1.5 },
    },
    wall_left: {
      eye: { x: 2.7, y: EYE_H, z: mid },
      target: { x: -halfW, y: 1.8, z: mid },
    },
    wall_right: {
      eye: { x: -2.7, y: EYE_H, z: mid },
      target: { x: halfW, y: 1.8, z: mid },
    },
  };
}

export const VIEW_ORDER = [
  { key: "entrance_out", label: "Entrance · from outside" },
  { key: "entrance_in",  label: "Entrance · from inside" },
  { key: "exit_out",     label: "Exit · from outside" },
  { key: "exit_in",      label: "Exit · from inside" },
  { key: "floor",        label: "Floor" },
  { key: "ceiling",      label: "Ceiling" },
  { key: "wall_left",    label: "Left wall" },
  { key: "wall_right",   label: "Right wall" },
];

// Build the flat list of sections (one per era-room, plus the prehistoric cave)
// with all the geometry the camera needs.
function buildSectionList(world, styles) {
  const out = [];

  // Prehistoric cave — authored in world coords along +Z, no wing rotation.
  out.push({
    id: "prehistoric",
    eraKey: "prehistoric",
    name: ERAS.prehistoric.label,
    period: ERAS.prehistoric.period,
    styleKey: ERAS.prehistoric.style,
    regionKey: "prehistoric",
    regionLabel: "Prehistory",
    isCave: true,
    rad: 0,
    zE: HUB_R - 1,                 // mouth, near the hub
    zX: HUB_R + CAVE_LEN,          // deep end (spawn)
    mid: HUB_R - 1 + CAVE_LEN / 2,
    halfW: CAVE_W / 2,
    ceilH: CAVE_H,
  });

  const regionOrder = new Map(REGIONS.map((r, i) => [r.key, i]));
  const wings = [...world.wingsInfo].sort(
    (a, b) => (regionOrder.get(a.key) ?? 0) - (regionOrder.get(b.key) ?? 0));

  for (const wing of wings) {
    wing.segments.forEach((seg, i) => {
      const era = ERAS[seg.eraKey];
      const style = styles[era.style] || {};
      out.push({
        id: seg.eraKey,
        eraKey: seg.eraKey,
        name: era.label,
        period: era.period,
        styleKey: era.style,
        regionKey: wing.key,
        regionLabel: wing.label,
        isCave: false,
        rad: wing.rad,
        segIndex: i,
        zE: seg.z0,
        zX: seg.z1,
        mid: (seg.z0 + seg.z1) / 2,
        halfW: HALL_W / 2,
        ceilH: style.ceilH || 5.2,
      });
    });
  }
  return out;
}
