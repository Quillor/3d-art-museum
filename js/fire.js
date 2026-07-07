// The campfire at the start of the cave — logs, stones, animated flames and a
// flickering light.
import * as THREE from "three";
import { rng } from "./textures.js";

export function createFire(pos) {
  const group = new THREE.Group();
  group.position.copy(pos);
  const rand = rng(555);

  // stones
  const stoneMat = new THREE.MeshLambertMaterial({ color: 0x4e463c });
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
  const logMat = new THREE.MeshLambertMaterial({ color: 0x3c2a18 });
  const logGeo = new THREE.CylinderGeometry(0.05, 0.06, 0.7, 6);
  for (let i = 0; i < 4; i++) {
    const l = new THREE.Mesh(logGeo, logMat);
    l.rotation.z = Math.PI / 2 - 0.35;
    l.rotation.y = (i / 4) * Math.PI * 2 + 0.4;
    l.position.y = 0.12;
    group.add(l);
  }

  // flames: crossed planes with a canvas gradient, additive
  const flameTex = makeFlameTexture();
  const flames = [];
  for (let i = 0; i < 3; i++) {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(0.55, 0.8),
      new THREE.MeshBasicMaterial({
        map: flameTex, transparent: true, depthWrite: false,
        blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      }));
    m.position.y = 0.5;
    m.rotation.y = (i / 3) * Math.PI;
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

  const light = new THREE.PointLight(0xff8434, 30, 22, 2);
  light.position.set(0, 1.0, 0);
  group.add(light);

  function update(t) {
    const flick =
      0.78 + 0.14 * Math.sin(t * 11.3) + 0.09 * Math.sin(t * 23.7 + 1.7) + 0.07 * Math.sin(t * 5.1 + 0.4);
    light.intensity = 30 * flick;
    light.position.x = Math.sin(t * 7.3) * 0.05;
    light.position.z = Math.cos(t * 6.1) * 0.05;
    flames.forEach((f, i) => {
      const ph = t * (7 + i * 1.7) + i * 2.1;
      f.scale.y = 0.86 + 0.2 * Math.sin(ph);
      f.scale.x = 0.92 + 0.1 * Math.sin(ph * 1.4 + 1);
      f.material.opacity = 0.75 + 0.2 * Math.sin(ph * 1.2 + i);
    });
    ember.material.opacity = 0.55 + 0.2 * flick;
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
