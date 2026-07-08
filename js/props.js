// Hero props: one real CC0 (Poly Haven, public-domain, no attribution) museum
// piece per wing, mounted on an era-styled plinth at the centre of the wing's
// first gallery. Every imported material is re-created as a MeshToonMaterial so
// the photoreal scans read in the same cel-shaded language as the rest of the
// museum. A keep-out collider is added at the plinth so visitors flow around it.
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { toon } from "./shading.js";
import { signTexture } from "./textures.js";

const MODELS_BASE = "assets/models/";
const UP = new THREE.Vector3(0, 1, 0);
const box = new THREE.BoxGeometry(1, 1, 1);

// Per-wing spec. `h` = target height of the piece (m); `tint` multiplies the
// diffuse map; `plinth` picks a stone colour that suits the era. `label`/`sub`
// print on a small placard. `flat:true` discards the diffuse for a pure toon
// colour (used where the scan's own colour clashes with the era).
// `faceYaw` rotates the piece (radians) so its front greets the approaching
// visitor — each scan models "forward" along a different axis.
const SPECS = {
  europe:    { file: "marble_bust_01/marble_bust_01_1k.gltf",                 h: 1.15, tint: 0xf0ebdf, plinth: 0xd8d0be, faceYaw: -Math.PI / 2, label: "Marble Portrait Bust", sub: "after the antique · CC0" },
  middleeast:{ file: "bull_head/bull_head_1k.gltf",                           h: 0.95, tint: 0xcaa46a, plinth: 0xb59a70, faceYaw:  Math.PI / 2, label: "Bull's Head", sub: "Mesopotamian motif · CC0" },
  asia:      { file: "carved_wooden_elephant/carved_wooden_elephant_1k.gltf", h: 0.9,  tint: 0xd8c19a, plinth: 0x6e5335, faceYaw:  Math.PI,     label: "Carved Elephant", sub: "South Asian woodwork · CC0" },
  africa:    { file: "concrete_cat_statue/concrete_cat_statue_1k.gltf",       h: 1.0,  tint: 0xd6c19a, plinth: 0xbfa06a, faceYaw:  Math.PI,     label: "Seated Cat", sub: "after Egyptian bronzes · CC0" },
  americas:  { file: "ceramic_pot/ceramic_pot_1k.gltf",                       h: 0.75, tint: 0xffffff, plinth: 0x8a7a5f, faceYaw:  0,           label: "Ceramic Vessel", sub: "Pre-Columbian form · CC0" },
  oceania:   { file: "lion_head/lion_head_1k.gltf",                           h: 0.8,  tint: 0x7a5330, plinth: 0x54371e, faceYaw:  0,           label: "Carved Figure", sub: "Pacific woodcarving · CC0" },
};

// Build the plinth + placard synchronously (known footprint → collider now),
// then stream the model in and drop it on top when it arrives.
export function placeHeroProps(scene, world) {
  const loader = new GLTFLoader();
  const PLINTH_R = 0.62;                 // footprint half-width
  const PLAYER_R = 0.32;

  for (const info of world.wingsInfo) {
    const spec = SPECS[info.key];
    if (!spec) continue;
    const seg = info.segments[0];        // first gallery of the wing
    const zLocal = (seg.z0 + seg.z1) / 2;
    const worldPos = new THREE.Vector3(0, 0, zLocal).applyAxisAngle(UP, -info.rad);

    const group = new THREE.Group();
    group.position.copy(worldPos);
    // face back toward the hub so busts greet the approaching visitor
    group.rotation.y = info.rad + Math.PI + (spec.faceYaw || 0);
    scene.add(group);

    const plinthH = spec.h > 1.0 ? 0.95 : 1.15;   // shorter pedestal for tall pieces
    buildPlinth(group, spec, plinthH);
    addPlacard(group, spec, plinthH);

    // keep-out collider (centre of the wing) so no one walks through the plinth
    world.colliders.push({ x: worldPos.x, z: worldPos.z, r: PLINTH_R + PLAYER_R });

    // soft warm uplight on the piece — joins the culled light pool
    const spot = new THREE.PointLight(0xffe8c0, 12, 7, 2);
    spot.position.set(worldPos.x, plinthH + spec.h + 0.6, worldPos.z);
    spot.visible = false;
    scene.add(spot);
    world.lights.push(spot);

    loadModel(loader, spec, group, plinthH);
  }
}

function loadModel(loader, spec, group, plinthH) {
  loader.load(MODELS_BASE + spec.file, (gltf) => {
    const model = gltf.scene;
    // retoon every material — keep the diffuse map (unless flat), drop the rest
    model.traverse((o) => {
      if (!o.isMesh) return;
      const src = o.material;
      o.material = toon({
        map: spec.flat ? null : (src && src.map) || null,
        color: spec.tint,
      });
      o.castShadow = o.receiveShadow = false;
      if (src && src !== o.material) src.dispose && src.dispose();
    });
    // normalise size + seat the base on the plinth top
    const bboxA = new THREE.Box3().setFromObject(model);
    const size = new THREE.Vector3(); bboxA.getSize(size);
    const s = spec.h / Math.max(size.y, 1e-3);
    model.scale.setScalar(s);
    const bbox = new THREE.Box3().setFromObject(model);
    const c = new THREE.Vector3(); bbox.getCenter(c);
    model.position.x -= c.x;
    model.position.z -= c.z;
    model.position.y += plinthH - bbox.min.y;   // sit on the plinth top
    group.add(model);
  }, undefined, (err) => {
    console.warn("[props] failed to load", spec.file, err);
  });
}

function buildPlinth(group, spec, plinthH) {
  const mat = toon({ color: spec.plinth });
  const capMat = toon({ color: mix(spec.plinth, 0xffffff, 0.12) });
  // base slab
  const base = new THREE.Mesh(box, capMat);
  base.scale.set(1.24, 0.12, 1.24);
  base.position.y = 0.06;
  group.add(base);
  // shaft (slight taper via two stacked boxes)
  const shaft = new THREE.Mesh(box, mat);
  shaft.scale.set(0.94, plinthH - 0.24, 0.94);
  shaft.position.y = 0.12 + (plinthH - 0.24) / 2;
  group.add(shaft);
  // cap
  const cap = new THREE.Mesh(box, capMat);
  cap.scale.set(1.16, 0.12, 1.16);
  cap.position.y = plinthH - 0.06;
  group.add(cap);
}

function addPlacard(group, spec, plinthH) {
  const tex = signTexture(spec.label, spec.sub, { w: 512, h: 160, bg: "#241e16", mainSize: 46, subSize: 26 });
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: false });
  const placard = new THREE.Mesh(new THREE.PlaneGeometry(0.86, 0.27), mat);
  // on the hub-facing side of the shaft (group already faces the hub, +Z)
  placard.position.set(0, plinthH * 0.62, 0.481);
  group.add(placard);
}

function mix(a, b, t) {
  const ca = new THREE.Color(a), cb = new THREE.Color(b);
  return ca.lerp(cb, t).getHex();
}
