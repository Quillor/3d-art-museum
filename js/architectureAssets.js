import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { toon } from "./shading.js";

const BASE = "assets/architecture/";
const loader = new GLTFLoader();
const cache = new Map();
const pending = new Map();

const PORTAL_ASSETS = {
  classical: "classical_doric_portal.glb",
  gothic: "gothic_pointed_arch.glb",
  renaissance: "renaissance_round_arch.glb",
  baroque: "baroque_ornate_portal.glb",
  salon: "renaissance_round_arch.glb",
  modern: null,
  meso: "meso_stepped_gateway.glb",
  inca: "inca_trapezoid_portal.glb",
  adobe: "adobe_rounded_portal.glb",
  mudbrick: "mudbrick_lintel_portal.glb",
  ishtar: "ishtar_blue_gate.glb",
  persepolis: "persepolis_gateway.glb",
  islamic: "islamic_keel_arch.glb",
  ottoman: "ottoman_iznik_domed_arch.glb",
  china: "china_moon_gate.glb",
  japan: "japan_shoji_entry.glb",
  khmer: "khmer_carved_lintel.glb",
  mughal: "mughal_cusped_arch.glb",
  egypt: "egyptian_pylon.glb",
  sahel: "djenne_banco_portal.glb",
  earthen: "earthen_rounded_portal.glb",
  rock: "rock_shelter_portal.glb",
  oceanic: "oceanic_carved_wood.glb",
  woven: "pandanus_woven_portal.glb",
};

export function buildPortalModel(parent, kit, ctx) {
  const file = PORTAL_ASSETS[kit];
  if (!file) return false;

  const anchor = new THREE.Group();
  anchor.name = `architecture_asset_${kit}`;
  anchor.position.set(0, 0, ctx.z + 0.03);
  const scale = ctx.doorW ? ctx.doorW / 3.4 : 1;
  anchor.scale.setScalar(scale);
  parent.add(anchor);

  loadAsset(file).then((source) => {
    const model = source.clone(true);
    model.traverse((node) => {
      if (!node.isMesh) return;
      const color = node.material?.color?.getHex?.() ?? 0xffffff;
      node.material = toon({ color });
      node.castShadow = false;
      node.receiveShadow = false;
    });
    anchor.add(model);
  }).catch((err) => {
    console.warn("[architecture] failed to load", file, err);
    parent.remove(anchor);
  });

  return true;
}

function loadAsset(file) {
  if (cache.has(file)) return Promise.resolve(cache.get(file));
  if (pending.has(file)) return pending.get(file);
  const promise = new Promise((resolve, reject) => {
    loader.load(BASE + file, (gltf) => {
      cache.set(file, gltf.scene);
      pending.delete(file);
      resolve(gltf.scene);
    }, undefined, (err) => {
      pending.delete(file);
      reject(err);
    });
  });
  pending.set(file, promise);
  return promise;
}
