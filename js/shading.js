// Cel-shaded look, Breath-of-the-Wild style: every lit surface uses
// MeshToonMaterial with a shared stepped gradient, so light falls in clean
// painted bands instead of smooth photoreal falloff. Emissive things (art,
// signs, flames, the end lights) stay MeshBasic and read as painted light.
import * as THREE from "three";

let grad = null;

// Four bands: deep shadow, shadow, mid, lit — tuned so the dark band stays
// readable (BotW shadows are coloured, never black).
export function toonGradient() {
  if (!grad) {
    const steps = new Uint8Array([105, 165, 225, 255]);
    grad = new THREE.DataTexture(steps, steps.length, 1, THREE.RedFormat);
    grad.minFilter = THREE.NearestFilter;
    grad.magFilter = THREE.NearestFilter;
    grad.needsUpdate = true;
  }
  return grad;
}

export function toon(opts = {}) {
  return new THREE.MeshToonMaterial({ gradientMap: toonGradient(), ...opts });
}
