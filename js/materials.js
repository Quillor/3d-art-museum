// Source-authored PBR material registry.
//
// Cultural albedos (motifs, bands, inscriptions, hero panels) stay separate
// from these substrate companions. Normal and roughness maps are always loaded
// from their declared source packages; this module never derives a channel
// from color. See assets/materials/masters/manifest.json for provenance.
import * as THREE from "three";
import { QUALITY } from "./device.js";

const MASTER_ROOT = "assets/materials/masters";

export const ARCHITECTURE_TEXTURE_TIER = QUALITY.maxTex <= 512
  ? "mobile"
  : "desktop";

export const MATERIAL_MASTERS = Object.freeze({
  stone_limestone_dressed_v1: {
    source: "ambientCG Tiles143 (CC0)",
    tileMeters: [2.5, 2.5],
    roughness: 1.0,
    normalScale: 0.18,
  },
  stone_sandstone_warm_v1: {
    source: "ambientCG Bricks084 (CC0)",
    tileMeters: [2.2, 1.1],
    roughness: 1.0,
    normalScale: 0.24,
  },
  rock_natural_grey_v1: {
    source: "ambientCG Rock051 (CC0, surface photogrammetry)",
    tileMeters: [2.8, 2.8],
    roughness: 1.0,
    normalScale: 0.20,
  },
  earth_rocky_v1: {
    source: "ambientCG Ground068 (CC0, surface photogrammetry)",
    tileMeters: [2.5, 2.5],
    roughness: 1.0,
    normalScale: 0.22,
  },
  masonry_stone_irregular_v1: {
    source: "ambientCG Bricks098 (CC0, surface photogrammetry)",
    tileMeters: [2.6, 2.6],
    roughness: 1.0,
    normalScale: 0.20,
  },
  paving_stone_grey_v1: {
    source: "ambientCG PavingStones142 (CC0, surface photogrammetry)",
    tileMeters: [2.2, 2.2],
    roughness: 1.0,
    normalScale: 0.18,
  },
  plaster_lime_v1: {
    source: "ambientCG Plaster001 (CC0)",
    tileMeters: [2.5, 2.5],
    roughness: 1.0,
    normalScale: 0.12,
  },
  plaster_earthen_asante_v1: {
    source: "Asante albedo v1 + ambientCG Plaster001 response (CC0 companion)",
    tileMeters: [3.0, 3.0],
    roughness: 1.0,
    normalScale: 0.14,
  },
  earth_compacted_v1: {
    source: "ambientCG Ground103 (CC0)",
    tileMeters: [2.5, 2.5],
    roughness: 1.0,
    normalScale: 0.24,
  },
  timber_parquet_light_v1: {
    source: "ambientCG WoodFloor051 (CC0)",
    tileMeters: [2.4, 2.4],
    roughness: 0.82,
    normalScale: 0.08,
  },
  timber_parquet_dark_v1: {
    source: "ambientCG WoodFloor064 (CC0)",
    tileMeters: [2.4, 2.4],
    roughness: 0.90,
    normalScale: 0.10,
  },
  stone_marble_white_v1: {
    source: "ambientCG Marble021 (CC0)",
    tileMeters: [3.0, 3.0],
    roughness: 0.62,
    normalScale: 0.04,
  },
  masonry_fired_brick_v1: {
    source: "ambientCG Bricks071 (CC0)",
    tileMeters: [1.8, 1.8],
    roughness: 1.0,
    normalScale: 0.18,
  },
  fabric_woven_neutral_v1: {
    source: "ambientCG Fabric019 (CC0)",
    tileMeters: [1.2, 1.2],
    roughness: 1.0,
    normalScale: 0.10,
  },
  ceramic_glazed_blue_v1: {
    source: "ambientCG Tiles135B (CC0)",
    tileMeters: [1.0, 1.0],
    roughness: 0.45,
    normalScale: 0.05,
  },
  terrazzo_white_v1: {
    source: "ambientCG Terrazzo013 (CC0)",
    tileMeters: [2.0, 2.0],
    roughness: 0.72,
    normalScale: 0.04,
  },
  paper_white_v1: {
    source: "ambientCG Paper001 (CC0)",
    tileMeters: [1.0, 0.586],
    roughness: 1.0,
    normalScale: 0.04,
  },
  tatami_yellow_v1: {
    source: "ambientCG Tatami001 (CC0)",
    tileMeters: [1.82, 0.91],
    roughness: 1.0,
    normalScale: 0.14,
  },
});

const textureLoader = new THREE.TextureLoader();
const textureCache = new Map();

function stagingCanvasFor(image) {
  if (!image?.width || !image?.height || typeof document === "undefined") return null;
  // Keep one immutable GPU allocation while the photographic replacement
  // streams in. WebGL2 immutable texture storage cannot be resized in place;
  // replacing a 512px procedural canvas with a 1024px image caused ANGLE
  // texSubImage overflow warnings on phones. The staging canvas preserves the
  // fallback aspect ratio at the device texture tier, then receives the photo.
  const maxSide = QUALITY.maxTex <= 512 ? 512 : 1024;
  const scale = maxSide / Math.max(image.width, image.height);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(2, Math.round(image.width * scale));
  canvas.height = Math.max(2, Math.round(image.height * scale));
  canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas;
}

function textureKey(url, { colorSpace, wrapS, wrapT, flipY }) {
  return [url, colorSpace, wrapS, wrapT, flipY ? 1 : 0].join("|");
}

function configureTexture(texture, { colorSpace, wrapS, wrapT, flipY }) {
  texture.colorSpace = colorSpace;
  texture.wrapS = wrapS;
  texture.wrapT = wrapT;
  texture.flipY = flipY;
  texture.anisotropy = QUALITY.anisotropy;
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  // TextureLoader returns its Texture before the image request completes.
  // Flagging that empty texture for upload makes Three retry every frame,
  // flooding mobile WebGL with "no image data" warnings and wasting GPU time.
  // The loader callback reaches this function again with a real image.
  if (texture.image) texture.needsUpdate = true;
  return texture;
}

// Returns one shared texture per URL + sampling/orientation contract. Texture
// transforms are deliberately excluded: repeats belong in geometry UVs so one
// room cannot mutate a shared texture used by another room.
export function loadCachedTexture(url, options = {}) {
  const config = {
    colorSpace: options.colorSpace ?? THREE.SRGBColorSpace,
    wrapS: options.wrapS ?? THREE.RepeatWrapping,
    wrapT: options.wrapT ?? THREE.RepeatWrapping,
    flipY: options.flipY ?? true,
  };
  const key = textureKey(url, config);
  if (textureCache.has(key)) return textureCache.get(key);

  const stagingCanvas = stagingCanvasFor(options.fallback?.image);

  const texture = textureLoader.load(
    url,
    (loaded) => {
      if (stagingCanvas) {
        const incoming = loaded.image;
        const context = stagingCanvas.getContext("2d");
        context.clearRect(0, 0, stagingCanvas.width, stagingCanvas.height);
        context.drawImage(incoming, 0, 0, stagingCanvas.width, stagingCanvas.height);
        loaded.image = stagingCanvas;
      }
      configureTexture(loaded, config);
    },
    undefined,
    () => {
      // Keep the caller's procedural fallback if one was supplied. Missing
      // material files are reported once without throwing during world build.
      if (!options.fallback) console.warn(`[materials] texture unavailable: ${url}`);
    },
  );
  configureTexture(texture, config);

  // `TextureLoader` replaces this image when its request completes. Supplying
  // a fallback preserves the museum's instant procedural startup appearance.
  if (stagingCanvas) {
    texture.image = stagingCanvas;
    texture.needsUpdate = true;
  }

  textureCache.set(key, texture);
  return texture;
}

function masterUrl(masterId, channel, tier = ARCHITECTURE_TEXTURE_TIER) {
  const filename = channel === "color" ? "color.jpg"
    : channel === "normal" ? "normal_gl.jpg"
      : "roughness.jpg";
  return `${MASTER_ROOT}/${masterId}/${tier}/${filename}`;
}

export function getMaterialMaster(masterId) {
  const spec = MATERIAL_MASTERS[masterId];
  if (!spec) throw new Error(`Unknown material master: ${masterId}`);
  return spec;
}

export function loadMasterTextures(masterId, options = {}) {
  getMaterialMaster(masterId);
  const tier = options.tier ?? ARCHITECTURE_TEXTURE_TIER;
  const sampling = {
    wrapS: options.wrapS ?? THREE.RepeatWrapping,
    wrapT: options.wrapT ?? THREE.RepeatWrapping,
    flipY: options.flipY ?? true,
  };

  const map = options.albedoTexture ?? loadCachedTexture(
    options.albedoUrl ?? masterUrl(masterId, "color", tier),
    { ...sampling, colorSpace: THREE.SRGBColorSpace, fallback: options.fallback },
  );
  const normalMap = loadCachedTexture(masterUrl(masterId, "normal", tier), {
    ...sampling,
    colorSpace: THREE.NoColorSpace,
  });
  const roughnessMap = loadCachedTexture(masterUrl(masterId, "roughness", tier), {
    ...sampling,
    colorSpace: THREE.NoColorSpace,
  });

  return { map, normalMap, roughnessMap };
}

// Create a conservative physical material using source-authored companions. A
// room-specific cultural albedo may be supplied through `albedoUrl` while the
// substrate normal/roughness remain independent of its color.
export function createSourceAuthoredMaterial(masterId, options = {}) {
  const spec = getMaterialMaster(masterId);
  const maps = loadMasterTextures(masterId, options);
  const normalScale = options.normalScale ?? spec.normalScale;
  const material = new THREE.MeshStandardMaterial({
    ...maps,
    color: options.color ?? 0xffffff,
    roughness: options.roughness ?? spec.roughness,
    metalness: options.metalness ?? 0.0,
    side: options.side ?? THREE.FrontSide,
    transparent: options.transparent ?? false,
    alphaTest: options.alphaTest ?? 0,
  });
  material.normalScale.set(normalScale, normalScale);
  material.name = options.name ?? `master:${masterId}`;
  material.userData.materialMaster = masterId;
  material.userData.tileMeters = [...spec.tileMeters];
  material.userData.textureTier = options.tier ?? ARCHITECTURE_TEXTURE_TIER;
  return material;
}

export function getMaterialTextureCacheStats() {
  return {
    tier: ARCHITECTURE_TEXTURE_TIER,
    textureCount: textureCache.size,
    keys: [...textureCache.keys()],
  };
}

export function clearMaterialTextureCache({ dispose = true } = {}) {
  if (dispose) {
    for (const texture of textureCache.values()) texture.dispose();
  }
  textureCache.clear();
}
