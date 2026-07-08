// The campfire at the start of the cave — logs, stones, layered flames, a
// hard-flickering light, and a column of rising embers.
import * as THREE from "three";
import { rng } from "./textures.js";
import { toon } from "./shading.js";

const EMBER_COUNT = 44;

export function createFire(pos) {
  const group = new THREE.Group();
  group.position.copy(pos);
  const rand = rng(555);

  // stones
  const stoneMat = toon({ color: 0x4e463c });
  const stoneGeo = new THREE.DodecahedronGeometry(1, 0);
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    const s = new THREE.Mesh(stoneGeo, stoneMat);
    const sc = 0.11 + rand() * 0.07;
    s.scale.set(sc, sc * 0.75, sc);
    s.position.set(Math.cos(a) * 0.52, 0.06, Math.sin(a) * 0.52);
    s.rotation.set(rand() * 3, rand() * 3, 0);
    group.add(s);
  }

  // logs
  const logMat = toon({ color: 0x3c2a18 });
  const logGeo = new THREE.CylinderGeometry(0.05, 0.06, 0.7, 6);
  for (let i = 0; i < 4; i++) {
    const l = new THREE.Mesh(logGeo, logMat);
    l.rotation.z = Math.PI / 2 - 0.35;
    l.rotation.y = (i / 4) * Math.PI * 2 + 0.4;
    l.position.y = 0.12;
    group.add(l);
  }

  // flames: four crossed planes, big jitter
  const flameTex = makeFlameTexture();
  const flames = [];
  for (let i = 0; i < 4; i++) {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(0.55, 0.8),
      new THREE.MeshBasicMaterial({
        map: flameTex, transparent: true, depthWrite: false,
        blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      }));
    m.position.y = 0.5 + (i === 3 ? 0.16 : 0);
    m.scale.setScalar(i === 3 ? 0.62 : 1);   // a smaller inner tongue
    m.rotation.y = (i / 4) * Math.PI * 2;
    group.add(m);
    flames.push(m);
  }

  // ember glow disc
  const ember = new THREE.Mesh(
    new THREE.CircleGeometry(0.3, 16),
    new THREE.MeshBasicMaterial({ color: 0xff5a12, transparent: true, opacity: 0.7 }));
  ember.rotation.x = -Math.PI / 2;
  ember.position.y = 0.1;
  group.add(ember);

  // rising ember sparks
  const eGeo = new THREE.BufferGeometry();
  const ePos = new Float32Array(EMBER_COUNT * 3);
  const eSeed = [];
  for (let i = 0; i < EMBER_COUNT; i++) {
    eSeed.push({
      speed: 0.5 + rand() * 0.9,
      wobble: 1.5 + rand() * 4,
      wAmp: 0.03 + rand() * 0.1,
      r: rand() * 0.26,
      a: rand() * Math.PI * 2,
      life: 0.9 + rand() * 1.2,       // max height above the fire
      off: rand() * 10,
    });
    ePos[i * 3] = 0; ePos[i * 3 + 1] = -1; ePos[i * 3 + 2] = 0;
  }
  eGeo.setAttribute("position", new THREE.BufferAttribute(ePos, 3));
  const sparks = new THREE.Points(eGeo, new THREE.PointsMaterial({
    map: makeSparkTexture(), color: 0xffa050, size: 0.055,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    sizeAttenuation: true,
  }));
  group.add(sparks);

  const light = new THREE.PointLight(0xff8434, 34, 24, 2);
  light.position.set(0, 1.0, 0);
  group.add(light);

  function update(t) {
    // a slow, gently breathing fire — all motion runs on a heavily slowed clock
    const ts = t * 0.28;
    const flick =
      0.74 + 0.15 * Math.sin(ts * 11.3) + 0.1 * Math.sin(ts * 23.7 + 1.7) +
      0.08 * Math.sin(ts * 5.1 + 0.4) + 0.04 * Math.sin(ts * 41.3 + 2.2);
    light.intensity = 34 * flick;
    light.position.x = Math.sin(ts * 7.3) * 0.07;
    light.position.z = Math.cos(ts * 6.1) * 0.07;
    flames.forEach((f, i) => {
      const ph = ts * (7.5 + i * 1.9) + i * 2.1;
      const base = i === 3 ? 0.62 : 1;
      f.scale.y = base * (0.78 + 0.26 * Math.sin(ph) * Math.sin(ph * 0.37 + i));
      f.scale.x = base * (0.88 + 0.13 * Math.sin(ph * 1.4 + 1));
      f.material.opacity = 0.66 + 0.28 * Math.sin(ph * 1.2 + i);
      f.rotation.z = 0.05 * Math.sin(ph * 0.8);
    });
    ember.material.opacity = 0.45 + 0.3 * flick;

    // embers drift slowly upward and respawn
    const p = sparks.geometry.attributes.position;
    for (let i = 0; i < EMBER_COUNT; i++) {
      const s = eSeed[i];
      const cycle = (ts * s.speed + s.off) % s.life;
      const h = 0.25 + cycle;
      p.setXYZ(i,
        Math.cos(s.a + ts * 0.4) * s.r + Math.sin(cycle * s.wobble * 3 + s.off) * s.wAmp * cycle,
        h,
        Math.sin(s.a + ts * 0.4) * s.r + Math.cos(cycle * s.wobble * 2.3 + s.off) * s.wAmp * cycle);
    }
    p.needsUpdate = true;
  }

  return { group, light, update };
}

function makeFlameTexture() {
  const c = document.createElement("canvas");
  c.width = 128; c.height = 192;
  const ctx = c.getContext("2d");
  const g = ctx.createRadialGradient(64, 150, 6, 64, 120, 120);
  g.addColorStop(0, "rgba(255,240,180,0.95)");
  g.addColorStop(0.25, "rgba(255,170,60,0.8)");
  g.addColorStop(0.55, "rgba(230,80,20,0.45)");
  g.addColorStop(1, "rgba(120,20,5,0)");
  ctx.fillStyle = g;
  // teardrop
  ctx.beginPath();
  ctx.moveTo(64, 6);
  ctx.quadraticCurveTo(118, 110, 96, 158);
  ctx.quadraticCurveTo(64, 192, 32, 158);
  ctx.quadraticCurveTo(10, 110, 64, 6);
  ctx.closePath();
  ctx.fill();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeSparkTexture() {
  const c = document.createElement("canvas");
  c.width = 32; c.height = 32;
  const ctx = c.getContext("2d");
  const g = ctx.createRadialGradient(16, 16, 1, 16, 16, 15);
  g.addColorStop(0, "rgba(255,235,190,1)");
  g.addColorStop(0.4, "rgba(255,150,50,0.85)");
  g.addColorStop(1, "rgba(255,90,20,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 32, 32);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
