// Loads Blender-authored .glb architectural assets (see tools/build_*.py).
// One fetch per file; named parts are cloned out on demand, so a hall can
// stamp the same vault bay down its whole length. Loading is async — parts
// pop in a beat after the procedural shell, which is fine at startup.
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const loader = new GLTFLoader();
const cache = new Map();

function load(url) {
  if (!cache.has(url)) {
    cache.set(url, new Promise((resolve, reject) =>
      loader.load(url, (g) => resolve(g.scene), undefined, reject)));
  }
  return cache.get(url);
}

// Clone the named top-level part of a model and hand it to onReady.
// Failures are non-fatal: the procedural architecture still stands.
export function spawnPart(url, name, onReady) {
  load(url).then((scene) => {
    const src = scene.getObjectByName(name);
    if (!src) throw new Error(`part "${name}" not in ${url}`);
    onReady(src.clone(true));
  }).catch((e) => console.warn("[models]", e.message || e));
}
