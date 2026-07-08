// Places artworks on walls and lazy-loads their Wikimedia images by
// proximity. Textures are downscaled for the GPU and released again when the
// visitor walks far away; the info panel always uses the full-size URL.
import * as THREE from "three";
import { IMAGE_URLS } from "./data/imageUrls.js";
import { placeholderArt, plaqueTexture } from "./textures.js";
import { FRAME_MATS } from "./styles.js";

const LOAD_DIST = 30;
const UNLOAD_DIST = 55;
const MAX_CONCURRENT = 4;
const MAX_TEX = 768;

const planeGeo = new THREE.PlaneGeometry(1, 1);
const boxGeo = new THREE.BoxGeometry(1, 1, 1);

export class ArtManager {
  constructor(scene) {
    this.scene = scene;
    this.items = [];
    this.targets = [];       // raycastable meshes
    this.loading = 0;
    this.raycaster = new THREE.Raycaster();
    this.raycaster.far = 14;
  }

  place(art, opts) {
    const { pos, rotY, frame = "darkwood", cave = false,
            maxW = 2.35, maxH = 1.75, region, eraKey } = opts;
    const group = new THREE.Group();
    group.position.copy(pos);
    group.rotation.y = rotY;

    const w0 = cave ? 1.7 : 1.95, h0 = cave ? 1.25 : 1.5;

    const artMat = new THREE.MeshBasicMaterial({
      map: placeholderArt(art), transparent: cave,
      // cave paintings sit dim and warm, as if lit only by the fire
      color: cave ? 0xa8988a : 0xffffff,
    });
    const artMesh = new THREE.Mesh(planeGeo, artMat);
    artMesh.scale.set(w0, h0, 1);
    artMesh.position.z = 0.032;
    group.add(artMesh);

    let frameMesh = null;
    if (frame !== "none") {
      frameMesh = new THREE.Mesh(boxGeo, FRAME_MATS[frame] || FRAME_MATS.darkwood);
      frameMesh.scale.set(w0 + 0.17, h0 + 0.17, 0.075);
      frameMesh.position.z = -0.006;
      group.add(frameMesh);
    }

    let plaque = null;
    if (!cave) {
      plaque = new THREE.Mesh(planeGeo,
        new THREE.MeshLambertMaterial({ color: 0x1d1812, emissive: 0x0f0c08 }));
      plaque.scale.set(0.52, 0.3, 1);
      plaque.position.set(w0 / 2 + 0.48, -0.32, 0.01);
      group.add(plaque);
    }

    this.scene.add(group);

    const item = {
      art, group, artMesh, frameMesh, plaque,
      maxW, maxH, cave, region, eraKey,
      url: IMAGE_URLS[art.id] || null,
      state: "empty",            // empty | loading | ready | failed
      plaqueDone: false,
      pos: group.position,
    };
    artMesh.userData.item = item;
    if (frameMesh) frameMesh.userData.item = item;
    this.items.push(item);
    this.targets.push(artMesh);
    if (frameMesh) this.targets.push(frameMesh);
  }

  // called every ~0.4 s from the main loop
  update(playerPos) {
    // sort a shallow copy by distance so the nearest queue first
    const near = [];
    for (const it of this.items) {
      const d = it.pos.distanceTo(playerPos);
      if (d < LOAD_DIST && it.state === "empty" && it.url) near.push([d, it]);
      else if (d > UNLOAD_DIST && it.state === "ready") this.unload(it);
      if (d < LOAD_DIST && !it.plaqueDone && it.plaque) {
        it.plaque.material = new THREE.MeshBasicMaterial({ map: plaqueTexture(it.art) });
        it.plaqueDone = true;
      }
    }
    near.sort((a, b) => a[0] - b[0]);
    for (const [, it] of near) {
      if (this.loading >= MAX_CONCURRENT) break;
      this.load(it);
    }
  }

  load(item) {
    item.state = "loading";
    this.loading++;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      this.loading--;
      try {
        const tex = makeDownscaledTexture(img, item.cave);
        const aspect = img.width / img.height;
        let w = Math.min(item.maxW, item.maxH * aspect);
        let h = w / aspect;
        item.artMesh.scale.set(w, h, 1);
        if (item.frameMesh) item.frameMesh.scale.set(w + 0.17, h + 0.17, 0.075);
        if (item.plaque) item.plaque.position.set(w / 2 + 0.48, -0.32, 0.01);
        item.artMesh.material.map.dispose();
        item.artMesh.material.map = tex;
        item.artMesh.material.needsUpdate = true;
        item.state = "ready";
      } catch (e) {
        console.warn("texture failed", item.art.id, e);
        this.fail(item);
      }
    };
    img.onerror = () => { this.loading--; this.fail(item); };
    img.src = item.url;
  }

  fail(item) {
    item.state = "failed";
    item.artMesh.material.map.dispose();
    item.artMesh.material.map = placeholderArt(item.art, true);
    item.artMesh.material.needsUpdate = true;
  }

  unload(item) {
    item.artMesh.material.map.dispose();
    item.artMesh.material.map = placeholderArt(item.art);
    item.artMesh.material.needsUpdate = true;
    item.state = "empty";
  }

  hitTest(ndc, camera) {
    this.raycaster.setFromCamera(ndc, camera);
    const hits = this.raycaster.intersectObjects(this.targets, false);
    return hits.length ? hits[0].object.userData.item : null;
  }
}

function makeDownscaledTexture(img, cave) {
  const scale = Math.min(1, MAX_TEX / Math.max(img.width, img.height));
  const w = Math.max(2, Math.round(img.width * scale));
  const h = Math.max(2, Math.round(img.height * scale));
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const ctx = c.getContext("2d");
  ctx.drawImage(img, 0, 0, w, h);
  if (cave) {
    // fade the edges so paintings sit on the rock like pigment, not posters
    ctx.globalCompositeOperation = "destination-in";
    const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.28, w / 2, h / 2, Math.max(w, h) * 0.62);
    g.addColorStop(0, "rgba(0,0,0,1)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = "source-over";
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}
