// Deterministic procedural canvas textures and cached external color maps.
// Physical normal/roughness companions live in materials.js; cultural color
// and ornament must never be converted into false depth channels here.
import * as THREE from "three";
import { loadCachedTexture } from "./materials.js";

export function rng(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function canvas(w, h) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  return [c, c.getContext("2d")];
}

export function toTexture(c) {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

// ---------- Photoreal texture pack ----------
// Files in assets/textures/ (generated from TEXTURE_PROMPTS.md). Each surface
// starts on its procedural texture and swaps to the photo the moment it
// loads, so a missing file just means the procedural look stays.
const TEXTURE_DIR = "assets/textures/";
const TEXTURE_FILES = new Set([
  "adobe_wall", "band_archers", "band_greca", "band_hieroglyphs", "band_ishtar",
  "band_iznik", "band_meander", "band_meander_floor", "band_mudcloth", "band_zellige", "baroque_wall",
  "amsalon_wall", "amsalon_floor", "amsalon_band",
  "adobe_painted_frieze", "baroque_ceiling_fresco", "baroque_damask", "baroque_parquet",
  "glazed_brick", "greek_coffer",
  "inca_andesite", "inca_flagstone", "inca_textile", "indus_brick", "indus_floor",
  "islamic_floor", "islamic_muqarnas", "islamic_zellij",
  "japan_shoji_paper", "japan_tatami", "khmer_floor", "khmer_lintel_relief",
  "khmer_sandstone", "meso_greca_carved", "meso_limestone_floor",
  "modern_laylight", "modern_terrazzo", "neolithic_floor", "neolithic_wall",
  "neolithic_reed", "pietra_serena", "salon_damask",
  "salon_parquet", "salon2_parquet", "salon2_sage_damask",
  "oceania_floor", "oceania_sandstone", "oceanic_tapa", "ottoman_iznik",
  "persia_floor", "persia_wingdisk",
  "adobe_basket.png", "indus_seal.png", "islamic_arabesque.jpg",
  "japan_scroll.jpg", "khmer_apsara.jpg",
  "meso_deity_mask.jpg", "mesopotamia_lamassu.jpg", "mesopotamia_procession.jpg",
  "neolithic_ochre_figures.jpg", "persia_guard.jpg", "renaissance_fresco.jpg",
  "cave_dirt", "cave_rock", "china_floor", "china_lacquer", "egypt_stone",
  "egypt_sandstone", "egypt_floor", "egypt_frieze",
  "gothic_ashlar", "gothic_floor", "gothic_stone", "greek_floor", "greek_marble", "hub_floor",
  "kingdoms_wall", "kingdoms_floor", "kingdoms_band",
  "traditions_wall", "traditions_floor", "traditions_wood",
  "hub_stone", "inca_stone", "islamic_plaster", "japan_floor", "japan_shoji",
  "khmer_stone", "meso_stone", "modern_floor", "modern_wall", "mudbrick",
  "mughal_marble", "persia_stone", "renaissance_ceiling", "renaissance_floor",
  "renaissance_plaster", "sahel_banco", "salon_wall", "window_lancet",
  "mesopotamia_lion", "egypt_wingsun", "ottoman_runner", "khmer_band", "asiamodern_concrete",
]);

export function fileTex(name, fallbackTex) {
  const hasExt = /\.(jpe?g|png)$/i.test(name);
  const key = hasExt ? name : `${name}.jpg`;
  if (!TEXTURE_FILES.has(name) && !TEXTURE_FILES.has(key)) return fallbackTex;
  return loadCachedTexture(TEXTURE_DIR + key, { fallback: fallbackTex });
}

// Plaited pandanus / basket weave for the Oceania wing
export function weave(base = "#b3915e", seed = 21) {
  const [c, ctx] = canvas(512, 512);
  const rand = rng(seed);
  ctx.fillStyle = shadeStr(base, -70);
  ctx.fillRect(0, 0, 512, 512);
  const n = 8, s = 512 / n;
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++) {
      const horiz = (i + j) % 2 === 0;
      ctx.fillStyle = shadeStr(base, (rand() - 0.5) * 30 + (horiz ? 6 : -8));
      ctx.fillRect(i * s + 1.5, j * s + 1.5, s - 3, s - 3);
      // strand lines + edge shading to suggest over-under weave
      ctx.strokeStyle = "rgba(60,40,20,0.35)";
      ctx.lineWidth = 1.4;
      for (let k = 1; k < 4; k++) {
        ctx.beginPath();
        if (horiz) {
          ctx.moveTo(i * s, j * s + (k * s) / 4);
          ctx.lineTo((i + 1) * s, j * s + (k * s) / 4);
        } else {
          ctx.moveTo(i * s + (k * s) / 4, j * s);
          ctx.lineTo(i * s + (k * s) / 4, (j + 1) * s);
        }
        ctx.stroke();
      }
      const g = horiz
        ? ctx.createLinearGradient(i * s, 0, (i + 1) * s, 0)
        : ctx.createLinearGradient(0, j * s, 0, (j + 1) * s);
      g.addColorStop(0, "rgba(30,18,8,0.35)");
      g.addColorStop(0.5, "rgba(0,0,0,0)");
      g.addColorStop(1, "rgba(30,18,8,0.35)");
      ctx.fillStyle = g;
      ctx.fillRect(i * s + 1.5, j * s + 1.5, s - 3, s - 3);
    }
  return toTexture(c);
}

// Woven pandanus mat with a geometric diamond lattice — the Oceania voyagers
// gallery floor (concept Hallway-30: honey woven mat, dark diamond motifs,
// shell-key border). Warm plaited ground + a tapa-style diamond grid.
export function pandanusMat(base = "#b9975e", seed = 44) {
  const [c, ctx] = canvas(512, 512);
  const rand = rng(seed);
  // plaited woven ground
  ctx.fillStyle = shadeStr(base, -52);
  ctx.fillRect(0, 0, 512, 512);
  const n = 16, s = 512 / n;
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++) {
      const horiz = (i + j) % 2 === 0;
      ctx.fillStyle = shadeStr(base, (rand() - 0.5) * 22 + (horiz ? 9 : -7));
      ctx.fillRect(i * s + 0.7, j * s + 0.7, s - 1.4, s - 1.4);
      // faint over-under strand line
      ctx.strokeStyle = "rgba(52,34,16,0.28)"; ctx.lineWidth = 1;
      ctx.beginPath();
      if (horiz) { ctx.moveTo(i * s, j * s + s / 2); ctx.lineTo((i + 1) * s, j * s + s / 2); }
      else { ctx.moveTo(i * s + s / 2, j * s); ctx.lineTo(i * s + s / 2, (j + 1) * s); }
      ctx.stroke();
    }
  // geometric diamond lattice (dark tapa motif over the weave)
  const dark = shadeStr(base, -104);
  const d = 128; // diamond period — tiles cleanly at 512
  ctx.strokeStyle = dark; ctx.lineWidth = 5;
  ctx.beginPath();
  for (let k = -4; k <= 8; k++) {
    ctx.moveTo(k * d, 0); ctx.lineTo(k * d + 512, 512);
    ctx.moveTo(k * d, 512); ctx.lineTo(k * d + 512, 0);
  }
  ctx.stroke();
  // small solid diamonds at each lattice node
  for (let gx = 0; gx <= 512; gx += d)
    for (let gy = 0; gy <= 512; gy += d) {
      const r = 17;
      ctx.fillStyle = dark;
      ctx.beginPath();
      ctx.moveTo(gx, gy - r); ctx.lineTo(gx + r, gy); ctx.lineTo(gx, gy + r); ctx.lineTo(gx - r, gy);
      ctx.closePath(); ctx.fill();
    }
  grime(ctx, 512, 512, rand, { speckle: 500, alpha: 0.03 });
  return toTexture(c);
}

// Mother-of-pearl shell-inlay diamond frieze on dark timber (Oceania portal
// lintel + wall frieze). 4:1 band that tiles horizontally.
export function shellInlay(seed = 45) {
  const [c, ctx] = canvas(256, 64);
  ctx.fillStyle = "#2c1d10"; ctx.fillRect(0, 0, 256, 64); // dark timber ground
  const r = 22;
  for (let x = 0; x <= 256; x += 64) {
    const grad = ctx.createLinearGradient(x - r, 4, x + r, 60);
    grad.addColorStop(0, "#eef0ea"); grad.addColorStop(0.5, "#cbd1ca"); grad.addColorStop(1, "#a9b2b0");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(x, 6); ctx.lineTo(x + r, 32); ctx.lineTo(x, 58); ctx.lineTo(x - r, 32);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "#6f5c3a"; ctx.lineWidth = 2; ctx.stroke();
    // small carved shell dot between the diamonds
    ctx.fillStyle = "#c9b382";
    ctx.beginPath(); ctx.arc(x + 32, 32, 3.2, 0, Math.PI * 2); ctx.fill();
  }
  return toTexture(c);
}

// Māori-style kōwhaiwhai rafter band: a red painted ground carrying black-and-
// white koru scrolls (the concept's "painted trim band in natural pigments:
// red, black and white"). 4:1 tile — the Oceania living/voyagers frieze.
export function kowhaiwhai(bg = "#8f3320", seed = 112) {
  const [c, ctx] = canvas(512, 128);
  const rand = rng(seed);
  ctx.fillStyle = bg; ctx.fillRect(0, 0, 512, 128);
  // painted mottle + top/bottom shading so the red reads as pigment on timber
  const g = ctx.createLinearGradient(0, 0, 0, 128);
  g.addColorStop(0, "rgba(0,0,0,0.22)"); g.addColorStop(0.5, "rgba(0,0,0,0)"); g.addColorStop(1, "rgba(0,0,0,0.26)");
  ctx.fillStyle = g; ctx.fillRect(0, 0, 512, 128);
  // thin black framing rails
  ctx.fillStyle = "#150806"; ctx.fillRect(0, 0, 512, 7); ctx.fillRect(0, 121, 512, 7);
  const white = "#efe5ce", black = "#150806";
  const unit = 128;               // 4 koru along the tile
  for (let u = 0; u < 4; u++) {
    const ox = u * unit + unit / 2;
    const up = u % 2 === 0 ? 1 : -1;   // alternate hook direction (mirror rows)
    ctx.save(); ctx.translate(ox, 64); ctx.scale(1, up);
    // koru stalk sweeping into a spiral bulb (white with black core)
    ctx.strokeStyle = white; ctx.lineWidth = 11; ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-54, 36);
    ctx.quadraticCurveTo(-4, 32, 8, -8);
    ctx.quadraticCurveTo(16, -36, -12, -34);
    ctx.stroke();
    ctx.fillStyle = white; ctx.beginPath(); ctx.arc(-14, -22, 18, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = black; ctx.beginPath(); ctx.arc(-14, -22, 7, 0, Math.PI * 2); ctx.fill();
    // small crescent accent on the tail
    ctx.fillStyle = white; ctx.beginPath(); ctx.arc(42, 22, 10, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = black; ctx.beginPath(); ctx.arc(42, 22, 3.6, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  return toTexture(c);
}

// Fine speckle + large soft blotches, for material richness.
function grime(ctx, w, h, rand, opts = {}) {
  const { speckle = 900, alpha = 0.05, blotch = 14, blotchAlpha = 0.05 } = opts;
  for (let i = 0; i < blotch; i++) {
    const x = rand() * w, y = rand() * h, r = (0.08 + rand() * 0.2) * w;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    const dark = rand() > 0.5;
    g.addColorStop(0, `rgba(${dark ? "0,0,0" : "255,250,240"},${blotchAlpha * rand()})`);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  for (let i = 0; i < speckle; i++) {
    ctx.fillStyle = `rgba(${rand() > 0.5 ? "255,255,255" : "0,0,0"},${alpha * rand()})`;
    ctx.fillRect(rand() * w, rand() * h, 1 + rand() * 2, 1 + rand() * 2);
  }
}

// ---------- Wall surfaces ----------

export function plaster(base, seed = 1, opts = {}) {
  const [c, ctx] = canvas(512, 512);
  const rand = rng(seed);
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, 512, 512);
  // very subtle trowel mottle — large soft ellipses, kept almost invisible
  // (≤3% value swing); used by many rooms so this must stay nearly imperceptible
  // up close. Centres are inset from the edges so the soft falloff never gets
  // cropped by the canvas boundary (would show as a hard edge when tiled).
  for (let i = 0; i < 7; i++) {
    const x = 60 + rand() * 392, y = 60 + rand() * 392;
    const rx = 90 + rand() * 130, ry = rx * (0.35 + rand() * 0.3);
    const ang = rand() * Math.PI;
    const lighter = rand() > 0.5;
    ctx.save();
    ctx.translate(x, y); ctx.rotate(ang); ctx.scale(1, ry / rx);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
    g.addColorStop(0, `rgba(${lighter ? "255,255,255" : "0,0,0"},${0.012 + rand() * 0.018})`);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(-rx, -rx, rx * 2, rx * 2);
    ctx.restore();
  }
  grime(ctx, 512, 512, rand, { speckle: 1400, alpha: 0.035, blotch: 18, blotchAlpha: 0.05, ...opts });
  return toTexture(c);
}

// Deep flocked damask wall covering (Romantic salon). Tonal ogee motif over a
// rich base so paintings still read; a touch of gilt in the motif centre.
export function damask(base = "#5c2128", motif = "#743036", gold = "#8a6a34", seed = 40) {
  const [c, ctx] = canvas(512, 512);
  const rand = rng(seed);
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, 512, 512);
  grime(ctx, 512, 512, rand, { speckle: 1100, alpha: 0.028, blotch: 14, blotchAlpha: 0.05 });
  function motifAt(cx, cy, s) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.fillStyle = motif;
    // central urn / pineapple
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.5);
    ctx.bezierCurveTo(s * 0.28, -s * 0.34, s * 0.30, -s * 0.02, 0, s * 0.16);
    ctx.bezierCurveTo(-s * 0.30, -s * 0.02, -s * 0.28, -s * 0.34, 0, -s * 0.5);
    ctx.fill();
    // flanking C-scroll leaves
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(side * s * 0.10, -s * 0.08);
      ctx.bezierCurveTo(side * s * 0.46, -s * 0.10, side * s * 0.50, s * 0.20, side * s * 0.16, s * 0.30);
      ctx.bezierCurveTo(side * s * 0.34, s * 0.12, side * s * 0.30, -s * 0.02, side * s * 0.10, -s * 0.08);
      ctx.fill();
      // small leaf above
      ctx.beginPath();
      ctx.moveTo(side * s * 0.06, -s * 0.30);
      ctx.bezierCurveTo(side * s * 0.30, -s * 0.44, side * s * 0.30, -s * 0.20, side * s * 0.08, -s * 0.16);
      ctx.fill();
    }
    ctx.fillStyle = gold;
    ctx.globalAlpha = 0.5;
    ctx.beginPath(); ctx.ellipse(0, -s * 0.16, s * 0.045, s * 0.12, 0, 0, 7); ctx.fill();
    ctx.globalAlpha = 1;
    ctx.restore();
  }
  const S = 150, cols = [128, 384];
  for (let ci = 0; ci < 2; ci++) {
    const x = cols[ci], yoff = ci * 128;
    for (let y = -170 + yoff; y < 512 + 170; y += 256) {
      motifAt(x, y, S);
      motifAt(x - 512, y, S); motifAt(x + 512, y, S);
      motifAt(x, y - 512, S); motifAt(x, y + 512, S);
    }
  }
  return toTexture(c);
}

export function stoneBlocks({ base = "#8d8478", mortar = "#565048", rows = 4, cols = 3, seed = 2, jitterCol = 14 } = {}) {
  const [c, ctx] = canvas(512, 512);
  const rand = rng(seed);
  const bh = 512 / rows, bw = 512 / cols;
  ctx.fillStyle = mortar;
  ctx.fillRect(0, 0, 512, 512);
  for (let r = 0; r < rows; r++) {
    const off = (r % 2) * bw * 0.5;
    for (let col = -1; col <= cols; col++) {
      const x = col * bw + off, y = r * bh;
      const t = 24 * (rand() - 0.5);
      ctx.fillStyle = shade(base, (rand() - 0.5) * jitterCol + t * 0);
      ctx.fillRect(x + 3, y + 3, bw - 6, bh - 6);
      // subtle top highlight / bottom shadow for depth
      ctx.fillStyle = "rgba(255,255,255,0.07)";
      ctx.fillRect(x + 3, y + 3, bw - 6, 4);
      ctx.fillStyle = "rgba(0,0,0,0.12)";
      ctx.fillRect(x + 3, y + bh - 9, bw - 6, 6);
    }
  }
  grime(ctx, 512, 512, rand, { speckle: 1100, alpha: 0.05 });
  return toTexture(c);
}

export function mudbrick(seed = 3) {
  return stoneBlocks({ base: "#a3805a", mortar: "#6e5334", rows: 8, cols: 5, seed, jitterCol: 20 });
}

// Crisp horizontal-coursed mudbrick — flat glazed mudbrick with strong,
// even horizontal courses and thin mortar, warm ochre with gentle per-brick
// tone variation. Deliberately FLAT (no puffy top-highlight/bottom-shadow
// relief): the concept's Mesopotamian walls read as flat coursed brick, not
// 3D bump-mapped sandstone blocks.
export function mudbrickCoursed(base = "#a67c4c", mortar = "#6a4c2c", rows = 16, cols = 6, seed = 3) {
  const [c, ctx] = canvas(512, 512);
  const rand = rng(seed);
  const bh = 512 / rows, bw = 512 / cols;
  ctx.fillStyle = mortar; ctx.fillRect(0, 0, 512, 512);
  for (let r = 0; r < rows; r++) {
    const off = (r % 2) * bw * 0.5;      // running bond
    const y = r * bh;
    for (let col = -1; col <= cols; col++) {
      const x = col * bw + off;
      ctx.fillStyle = shade(base, (rand() - 0.5) * 15);   // subtle warm tone jitter
      ctx.fillRect(x + 1.3, y + 1.7, bw - 2.6, bh - 3.2); // thin mortar, courses dominate
    }
  }
  grime(ctx, 512, 512, rand, { speckle: 240, alpha: 0.028 });  // faint, glaze stays smooth
  return toTexture(c);
}

// Dark coffered timber-beam ceiling — a grid of dark wooden beams framing
// recessed near-black panels (concept: Hallway-15 dark coffered beam ceiling
// with recessed spots). Kept DARK so it reads as heavy timber, not a glowing
// amber field; the corridor point-lights graze the beams for relief.
export function beamCeiling(beam = "#463424", panel = "#221913", seed = 20) {
  const [c, ctx] = canvas(512, 512);
  const rand = rng(seed);
  ctx.fillStyle = beam; ctx.fillRect(0, 0, 512, 512);
  const n = 3, s = 512 / n, m = 15;      // 3x3 coffers per tile
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++) {
      const x = i * s, y = j * s;
      ctx.fillStyle = panel;
      ctx.fillRect(x + m, y + m, s - 2 * m, s - 2 * m);
      ctx.strokeStyle = "rgba(0,0,0,0.38)"; ctx.lineWidth = 3;   // recess shadow
      ctx.strokeRect(x + m, y + m, s - 2 * m, s - 2 * m);
      ctx.strokeStyle = "rgba(122,96,62,0.22)"; ctx.lineWidth = 1.4; // faint lit bevel
      ctx.strokeRect(x + m + 4, y + m + 4, s - 2 * m - 8, s - 2 * m - 8);
    }
  grime(ctx, 512, 512, rand, { speckle: 180, alpha: 0.04 });
  return toTexture(c);
}

export function marble(base = "#e8e2d5", vein = "rgba(120,115,105,0.25)", seed = 4) {
  const [c, ctx] = canvas(512, 512);
  const rand = rng(seed);
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 9; i++) {
    ctx.strokeStyle = vein;
    ctx.lineWidth = 0.6 + rand() * 1.6;
    ctx.beginPath();
    let x = rand() * 512, y = -20;
    ctx.moveTo(x, y);
    while (y < 532) {
      x += (rand() - 0.5) * 90;
      y += 30 + rand() * 60;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  grime(ctx, 512, 512, rand, { speckle: 500, alpha: 0.03 });
  return toTexture(c);
}

export function rock(base = "#5d5248", seed = 5) {
  const [c, ctx] = canvas(512, 512);
  const rand = rng(seed);
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 60; i++) {
    const x = rand() * 512, y = rand() * 512, r = 20 + rand() * 90;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(${rand() > 0.45 ? "30,24,18" : "120,105,88"},${0.10 + rand() * 0.12})`);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  // cracks
  ctx.strokeStyle = "rgba(20,14,10,0.5)";
  for (let i = 0; i < 14; i++) {
    ctx.lineWidth = 0.5 + rand() * 1.5;
    ctx.beginPath();
    let x = rand() * 512, y = rand() * 512;
    ctx.moveTo(x, y);
    for (let s = 0; s < 6; s++) {
      x += (rand() - 0.5) * 120; y += (rand() - 0.5) * 120;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  grime(ctx, 512, 512, rand, { speckle: 1600, alpha: 0.07 });
  return toTexture(c);
}

// Warm, light stratified sandstone — the layered bedding-plane rock of an
// Oceanian rock-shelter (concept: Hallway-29). Horizontal warm bands (cream →
// ochre) separated by thin darker seams, with soot pockets and grit. Kept
// bright so it reads as sunlit sandstone under torchlight, not a dark cave.
export function sandstone(base = "#c7965f", seed = 20) {
  const [c, ctx] = canvas(512, 512);
  const rand = rng(seed);
  // warm sandstone band palette, light → deeper ochre
  const bands = ["#d8b184", "#c99b64", "#c08a54", "#d1a06e", "#b87f49", "#c9955c", "#dcb888"];
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, 512, 512);
  // lay down horizontal strata of varying thickness
  let y = -18;
  let bi = (rand() * bands.length) | 0;
  while (y < 512) {
    const h = 34 + rand() * 46;
    ctx.fillStyle = bands[bi % bands.length];
    // slightly wavy top edge so beds aren't ruler-straight
    ctx.beginPath();
    ctx.moveTo(0, y);
    for (let x = 0; x <= 512; x += 64) ctx.lineTo(x, y + (rand() - 0.5) * 8);
    ctx.lineTo(512, y + h + 10);
    for (let x = 512; x >= 0; x -= 64) ctx.lineTo(x, y + h + (rand() - 0.5) * 8);
    ctx.closePath();
    ctx.fill();
    // thin darker bedding seam at the base of the layer
    ctx.strokeStyle = "rgba(96,62,36,0.5)";
    ctx.lineWidth = 1 + rand() * 1.6;
    ctx.beginPath();
    ctx.moveTo(0, y + h);
    for (let x = 0; x <= 512; x += 48) ctx.lineTo(x, y + h + (rand() - 0.5) * 6);
    ctx.stroke();
    y += h;
    bi += 1 + ((rand() * 2) | 0);
  }
  // broad tonal mottling within the beds (weathering)
  for (let i = 0; i < 40; i++) {
    const x = rand() * 512, cy = rand() * 512, r = 24 + rand() * 80;
    const g = ctx.createRadialGradient(x, cy, 0, x, cy, r);
    const warm = rand() > 0.4;
    g.addColorStop(0, `rgba(${warm ? "224,188,140" : "120,82,48"},${0.06 + rand() * 0.10})`);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(x - r, cy - r, r * 2, r * 2);
  }
  // occasional dark soot pockets (torch smoke, matches concept's dark patches)
  for (let i = 0; i < 5; i++) {
    const x = rand() * 512, cy = rand() * 512, r = 30 + rand() * 60;
    const g = ctx.createRadialGradient(x, cy, 0, x, cy, r);
    g.addColorStop(0, `rgba(38,26,16,${0.14 + rand() * 0.12})`);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(x - r, cy - r, r * 2, r * 2);
  }
  grime(ctx, 512, 512, rand, { speckle: 900, alpha: 0.05 });
  return toTexture(c);
}

// ---------- Floors ----------

// Taj Mahal terrace pattern: a diagonal checker of cream marble and red
// sandstone diamonds with dark inlay outlines between them.
export function tajFloor(seed = 6, a = "#e8ddc8", b = "#9c4f38") {
  const [c, ctx] = canvas(512, 512);
  const rand = rng(seed);
  const s = 128; // diamond half-diagonal 64 — period 128 px, tiles cleanly
  ctx.fillStyle = a;
  ctx.fillRect(0, 0, 512, 512);
  for (let i = -1; i <= 9; i++) {
    for (let j = -1; j <= 9; j++) {
      if ((i + j) % 2) continue;
      const x = i * (s / 2), y = j * (s / 2), h = s / 2;
      ctx.beginPath();
      ctx.moveTo(x, y - h);
      ctx.lineTo(x + h, y);
      ctx.lineTo(x, y + h);
      ctx.lineTo(x - h, y);
      ctx.closePath();
      ctx.fillStyle = ((i % 2) + 2) % 2 ? b : a;
      ctx.fill();
      ctx.strokeStyle = "rgba(38,24,16,0.85)";
      ctx.lineWidth = 4;
      ctx.stroke();
    }
  }
  grime(ctx, 512, 512, rand, { speckle: 600, alpha: 0.035 });
  return toTexture(c);
}

// Medieval encaustic floor tile (concept Hallway-08): a warm grid of glazed
// clay tiles — buff and red-ochre on a 2-colour checker, each carrying an
// inscribed slate/buff diamond and a quatrefoil knit at the tile corners, with
// dark grout. This is the "encaustic tile inset" that runs down the cloister
// aisle between the worn-flagstone borders. Tiles cleanly at 128 px.
export function encaustic(seed = 88) {
  const [c, ctx] = canvas(512, 512);
  const rand = rng(seed);
  const s = 128;
  const buff = "#c8b184", red = "#9c4a30", slate = "#4a463d", gold = "#b78a44";
  ctx.fillStyle = "#2a231b"; // grout
  ctx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      const x = i * s, y = j * s, m = 5; // grout margin
      const base = (i + j) % 2 ? buff : red;
      ctx.fillStyle = base;
      ctx.fillRect(x + m, y + m, s - 2 * m, s - 2 * m);
      // per-tile value jitter (~±5%) — glazed clay never fires perfectly even
      const jit = (rand() - 0.5) * 0.10;
      ctx.fillStyle = jit >= 0 ? `rgba(255,255,255,${jit})` : `rgba(0,0,0,${-jit})`;
      ctx.fillRect(x + m, y + m, s - 2 * m, s - 2 * m);
      const cx = x + s / 2, cy = y + s / 2;
      // inscribed diamond in a contrasting tone
      const r = s * 0.31;
      ctx.fillStyle = base === buff ? slate : buff;
      ctx.beginPath();
      ctx.moveTo(cx, cy - r); ctx.lineTo(cx + r, cy);
      ctx.lineTo(cx, cy + r); ctx.lineTo(cx - r, cy); ctx.closePath();
      ctx.fill();
      // gold quarter-fans at every corner → full rosettes at the grid nodes
      ctx.fillStyle = gold;
      const cr = s * 0.17;
      for (const [dx, dy, a0] of [[0, 0, 0], [s, 0, Math.PI / 2], [s, s, Math.PI], [0, s, -Math.PI / 2]]) {
        ctx.beginPath();
        ctx.moveTo(x + dx, y + dy);
        ctx.arc(x + dx, y + dy, cr, a0, a0 + Math.PI / 2);
        ctx.closePath();
        ctx.fill();
      }
      // centre pip
      ctx.fillStyle = base === buff ? red : buff;
      ctx.beginPath(); ctx.arc(cx, cy, s * 0.075, 0, Math.PI * 2); ctx.fill();
      // grout-line darkening — 1px darker border just inside the tile edge (bevel/dirt)
      ctx.strokeStyle = "rgba(10,8,5,0.35)";
      ctx.lineWidth = 1;
      ctx.strokeRect(x + m + 0.5, y + m + 0.5, s - 2 * m - 1, s - 2 * m - 1);
      // sparse glaze-wear lighter specks
      if (rand() < 0.6) {
        const wn = 1 + ((rand() * 3) | 0);
        for (let w = 0; w < wn; w++) {
          ctx.fillStyle = `rgba(255,250,235,${0.05 + rand() * 0.06})`;
          const wx = x + m + rand() * (s - 2 * m), wy = y + m + rand() * (s - 2 * m);
          ctx.beginPath(); ctx.arc(wx, wy, 1 + rand() * 1.5, 0, Math.PI * 2); ctx.fill();
        }
      }
    }
  }
  grime(ctx, 512, 512, rand, { speckle: 520, alpha: 0.05 });
  return toTexture(c);
}

// Dressed Mughal red sandstone (Agra Fort / Fatehpur Sikri) — warm terracotta
// red with subtle tonal mottling and fine horizontal dressing marks. Used for
// the arcade pilasters, cusped arch rings, jali frames and pishtaq bands that
// frame the white-marble panels in the concept sheet.
export function redSandstone(seed = 24, base = "#a8583a") {
  const [c, ctx] = canvas(256, 256);
  const rand = rng(seed);
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 46; i++) {
    const x = rand() * 256, y = rand() * 256, r = 12 + rand() * 46;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    const warm = rand() > 0.45;
    g.addColorStop(0, `rgba(${warm ? "198,106,68" : "126,56,32"},${0.10 + rand() * 0.14})`);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  ctx.strokeStyle = "rgba(90,40,24,0.16)";
  for (let y = 0; y < 256; y += 16 + rand() * 10) {
    ctx.lineWidth = 0.6 + rand();
    ctx.beginPath();
    ctx.moveTo(0, y);
    for (let x = 0; x <= 256; x += 32) ctx.lineTo(x, y + (rand() - 0.5) * 3);
    ctx.stroke();
  }
  grime(ctx, 256, 256, rand, { speckle: 300, alpha: 0.04 });
  return toTexture(c);
}

// Painted coffered Mughal ceiling (concept Hallway-24): a cream field divided
// into panels by slim gold + dark borders, each panel carrying a muted
// terracotta/gold floral rosette. Kept light so the ceiling reads luminous.
export function mughalCeiling(seed = 7, cream = "#ece0c6", gold = "#b8924e", red = "#a8583a") {
  const [c, ctx] = canvas(512, 512);
  const rand = rng(seed);
  ctx.fillStyle = cream;
  ctx.fillRect(0, 0, 512, 512);
  // faint veining/age
  for (let i = 0; i < 6; i++) {
    ctx.strokeStyle = "rgba(150,124,86,0.10)";
    ctx.lineWidth = 0.6 + rand();
    ctx.beginPath();
    let x = rand() * 512, y = -20;
    ctx.moveTo(x, y);
    while (y < 532) { x += (rand() - 0.5) * 80; y += 40 + rand() * 60; ctx.lineTo(x, y); }
    ctx.stroke();
  }
  // coffer panel frame (tiles into a continuous grid)
  const frame = (inset, w, color) => { ctx.strokeStyle = color; ctx.lineWidth = w; ctx.strokeRect(inset, inset, 512 - 2 * inset, 512 - 2 * inset); };
  frame(22, 3, "rgba(70,48,26,0.85)");
  frame(30, 6, gold);
  frame(38, 2, "rgba(70,48,26,0.7)");
  // central floral rosette: shaded painted petals around a gold hub (a flat
  // red ellipse fill read as "clip-art daisy" in the quality audit — each
  // petal now carries a painted gradient, outline and mid-vein)
  const cx = 256, cy = 256;
  for (let p = 0; p < 8; p++) {
    const a = (p / 8) * Math.PI * 2;
    ctx.save();
    ctx.translate(cx + Math.cos(a) * 44, cy + Math.sin(a) * 44);
    ctx.rotate(a);
    const pg = ctx.createLinearGradient(-26, 0, 26, 0);
    pg.addColorStop(0, "rgba(122,52,32,0.95)");   // shaded inner end
    pg.addColorStop(0.45, red);
    pg.addColorStop(1, "rgba(196,110,74,0.95)");  // lit tip
    ctx.beginPath();
    ctx.ellipse(0, 0, 26, 12, 0, 0, Math.PI * 2);
    ctx.fillStyle = pg; ctx.fill();
    ctx.strokeStyle = "rgba(70,40,24,0.7)"; ctx.lineWidth = 1.6; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-20, 0); ctx.lineTo(20, 0);
    ctx.strokeStyle = "rgba(70,40,24,0.35)"; ctx.lineWidth = 1; ctx.stroke();
    ctx.restore();
    // small gold bud between petals
    const b = a + Math.PI / 8;
    ctx.beginPath();
    ctx.arc(cx + Math.cos(b) * 58, cy + Math.sin(b) * 58, 4.5, 0, Math.PI * 2);
    ctx.fillStyle = gold; ctx.fill();
  }
  const hub = ctx.createRadialGradient(cx - 5, cy - 5, 2, cx, cy, 20);
  hub.addColorStop(0, "#d8b46a"); hub.addColorStop(1, gold);
  ctx.beginPath(); ctx.arc(cx, cy, 20, 0, Math.PI * 2); ctx.fillStyle = hub; ctx.fill();
  ctx.strokeStyle = "rgba(70,48,26,0.8)"; ctx.lineWidth = 2; ctx.stroke();
  // small corner curls (pietra dura scroll suggestion)
  ctx.strokeStyle = gold; ctx.lineWidth = 2.5;
  for (const [ox, oy] of [[70, 70], [442, 70], [70, 442], [442, 442]]) {
    ctx.beginPath(); ctx.arc(ox, oy, 12, 0, Math.PI * 1.4); ctx.stroke();
  }
  grime(ctx, 512, 512, rand, { speckle: 300, alpha: 0.02 });
  return toTexture(c);
}

// Polished Mughal marble paving (concept Hallway-24): a luminous cream marble
// field framed by slim inlaid borders (dark line + red-sandstone band + dark
// line) with a small red star medallion at each panel centre. Reads mostly
// LIGHT and polished — NOT a heavy 50/50 red checkerboard like tajFloor.
export function mughalFloor(seed = 8, cream = "#efe6d3", red = "#b0563a", dark = "rgba(74,44,26,0.9)") {
  const [c, ctx] = canvas(512, 512);
  const rand = rng(seed);
  ctx.fillStyle = cream;
  ctx.fillRect(0, 0, 512, 512);
  // faint marble veining
  for (let i = 0; i < 7; i++) {
    ctx.strokeStyle = "rgba(150,130,108,0.13)";
    ctx.lineWidth = 0.6 + rand() * 1.2;
    ctx.beginPath();
    let x = rand() * 512, y = -20;
    ctx.moveTo(x, y);
    while (y < 532) { x += (rand() - 0.5) * 80; y += 30 + rand() * 60; ctx.lineTo(x, y); }
    ctx.stroke();
  }
  // inlaid border frame near the tile edges (tiles into a continuous grid)
  const frame = (inset, w, color) => {
    ctx.strokeStyle = color; ctx.lineWidth = w;
    ctx.strokeRect(inset, inset, 512 - 2 * inset, 512 - 2 * inset);
  };
  frame(26, 3, dark);   // outer dark inlay line
  frame(35, 9, red);    // red sandstone band
  frame(44, 3, dark);   // inner dark inlay line
  // central red star medallion (8-point)
  const cx = 256, cy = 256, R = 44, r = 19;
  ctx.beginPath();
  for (let k = 0; k < 16; k++) {
    const ang = (k / 16) * Math.PI * 2 - Math.PI / 2;
    const rad = k % 2 ? r : R;
    const px = cx + Math.cos(ang) * rad, py = cy + Math.sin(ang) * rad;
    k ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = red; ctx.fill();
  ctx.strokeStyle = dark; ctx.lineWidth = 2.5; ctx.stroke();
  ctx.beginPath(); ctx.arc(cx, cy, 6, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(74,44,26,0.95)"; ctx.fill();
  grime(ctx, 512, 512, rand, { speckle: 380, alpha: 0.022 });
  return toTexture(c);
}

// Pietra-dura floral inlay panel (concept Hallway-24): a white-marble field
// framed by a red-sandstone keyline and a cusped-arch niche outline, filled
// with a symmetric flowering vine (vase -> stem -> curling leaves -> blossoms)
// in the classic red / blue / gold / green inlay palette. Mapped 0..1 onto
// each wall panel (NOT tiled), so one vine fills one bay — the marble panels
// with pietra-dura floral inlay that are the concept's signature wall feature.
export function pietraDura(seed = 31, cream = "#efe7d5", red = "#a8583a") {
  const W = 240, H = 760;
  const [c, ctx] = canvas(W, H);
  const rand = rng(seed);
  const cx = W / 2;
  ctx.fillStyle = cream; ctx.fillRect(0, 0, W, H);
  // faint marble veining
  for (let i = 0; i < 5; i++) {
    ctx.strokeStyle = "rgba(150,130,108,0.12)";
    ctx.lineWidth = 0.6 + rand();
    ctx.beginPath();
    let x = rand() * W, y = -20;
    ctx.moveTo(x, y);
    while (y < H + 20) { x += (rand() - 0.5) * 44; y += 40 + rand() * 60; ctx.lineTo(x, y); }
    ctx.stroke();
  }
  // red-sandstone keyline border
  ctx.strokeStyle = red; ctx.lineWidth = 7; ctx.strokeRect(12, 12, W - 24, H - 24);
  ctx.strokeStyle = "rgba(74,44,26,0.5)"; ctx.lineWidth = 1.5; ctx.strokeRect(20, 20, W - 40, H - 40);
  // cusped-arch niche outline (pointed keel) enclosing the vine
  const ax = 38, aw = W - 76, top = 78, spring = 250, bottom = H - 40;
  ctx.strokeStyle = red; ctx.lineWidth = 4.5;
  ctx.beginPath();
  ctx.moveTo(ax, bottom); ctx.lineTo(ax, spring);
  ctx.quadraticCurveTo(ax + aw * 0.16, top + 46, cx, top);
  ctx.quadraticCurveTo(ax + aw * 0.84, top + 46, ax + aw, spring);
  ctx.lineTo(ax + aw, bottom);
  ctx.stroke();
  // ---- the flowering vine ----
  const blossom = (x, y, r, pc, hc) => {
    for (let p = 0; p < 6; p++) {
      const a = (p / 6) * Math.PI * 2;
      ctx.save();
      ctx.translate(x + Math.cos(a) * r * 0.7, y + Math.sin(a) * r * 0.7);
      ctx.rotate(a);
      ctx.beginPath(); ctx.ellipse(0, 0, r * 0.6, r * 0.32, 0, 0, Math.PI * 2);
      ctx.fillStyle = pc; ctx.fill();
      ctx.restore();
    }
    ctx.beginPath(); ctx.arc(x, y, r * 0.42, 0, Math.PI * 2); ctx.fillStyle = hc; ctx.fill();
  };
  const leaf = (x, y, dir, len) => {
    ctx.save(); ctx.translate(x, y); ctx.scale(dir, 1);
    ctx.beginPath(); ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(len * 0.55, -len * 0.55, len, -len * 0.12);
    ctx.quadraticCurveTo(len * 0.5, -len * 0.06, 0, 0);
    ctx.fillStyle = "#547e46"; ctx.fill();
    ctx.restore();
  };
  const stemTop = top + 34, stemBot = bottom - 66;
  ctx.strokeStyle = "#5f7038"; ctx.lineWidth = 5; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(cx, stemBot);
  ctx.bezierCurveTo(cx - 16, stemBot - 130, cx + 16, stemBot - 270, cx, stemTop);
  ctx.stroke();
  const levels = [0.18, 0.40, 0.62, 0.82];
  const cols = ["#a83a2a", "#2f5c86", "#c0932f", "#a83a2a"];
  for (let i = 0; i < levels.length; i++) {
    const y = stemBot - (stemBot - stemTop) * levels[i];
    leaf(cx - 6, y, 1, 48); leaf(cx + 6, y, -1, 48);
    blossom(cx - 42, y - 20, 15, cols[i], "#e8c96a");
    blossom(cx + 42, y - 20, 15, cols[(i + 1) % cols.length], "#e8c96a");
  }
  blossom(cx, stemTop - 4, 20, "#a83a2a", "#c0932f");
  // urn base
  ctx.fillStyle = red;
  ctx.beginPath();
  ctx.moveTo(cx - 30, stemBot); ctx.quadraticCurveTo(cx - 42, stemBot + 40, cx - 22, stemBot + 62);
  ctx.lineTo(cx + 22, stemBot + 62); ctx.quadraticCurveTo(cx + 42, stemBot + 40, cx + 30, stemBot);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "rgba(74,44,26,0.6)"; ctx.lineWidth = 2; ctx.stroke();
  grime(ctx, W, H, rand, { speckle: 200, alpha: 0.02 });
  return toTexture(c);
}

export function checkerFloor(a = "#ded5c2", b = "#3d3833", seed = 6) {
  const [c, ctx] = canvas(512, 512);
  const rand = rng(seed);
  const n = 4, s = 512 / n;
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++) {
      ctx.fillStyle = (i + j) % 2 ? b : a;
      ctx.fillRect(i * s, j * s, s, s);
      // per-tile value jitter (~±4%) so each square reads as a stone slab, not a flat vector fill
      const jit = (rand() - 0.5) * 0.08;
      ctx.fillStyle = jit >= 0 ? `rgba(255,255,255,${jit})` : `rgba(0,0,0,${-jit})`;
      ctx.fillRect(i * s, j * s, s, s);
      // faint curving marble veins — clipped to this tile so they stay cell-local (wrap-safe)
      ctx.save();
      ctx.beginPath(); ctx.rect(i * s, j * s, s, s); ctx.clip();
      const veinCount = 1 + ((rand() * 3) | 0);
      for (let v = 0; v < veinCount; v++) {
        ctx.strokeStyle = `rgba(0,0,0,${0.05 + rand() * 0.05})`;
        ctx.lineWidth = 0.6 + rand() * 0.8;
        let vx = i * s + rand() * s, vy = j * s + rand() * s;
        ctx.beginPath(); ctx.moveTo(vx, vy);
        const segs = 2 + ((rand() * 2) | 0);
        for (let seg = 0; seg < segs; seg++) {
          vx += (rand() - 0.5) * s * 0.6;
          vy += (rand() - 0.5) * s * 0.6;
          ctx.lineTo(vx, vy);
        }
        ctx.stroke();
      }
      ctx.restore();
      ctx.strokeStyle = "rgba(0,0,0,0.25)";
      ctx.strokeRect(i * s + 0.5, j * s + 0.5, s - 1, s - 1);
    }
  grime(ctx, 512, 512, rand, { speckle: 700, alpha: 0.04 });
  return toTexture(c);
}

export function woodFloor(base = "#7a5b3d", seed = 7) {
  const [c, ctx] = canvas(512, 512);
  const rand = rng(seed);
  const planks = 8, pw = 512 / planks;
  for (let i = 0; i < planks; i++) {
    ctx.fillStyle = shade(base, (rand() - 0.5) * 26);
    ctx.fillRect(i * pw, 0, pw, 512);
    // fine per-plank value jitter, layered over the coarser board-tone variance above
    const jit = (rand() - 0.5) * 0.08;
    ctx.fillStyle = jit >= 0 ? `rgba(255,255,255,${jit})` : `rgba(0,0,0,${-jit})`;
    ctx.fillRect(i * pw, 0, pw, 512);
    ctx.strokeStyle = "rgba(30,18,8,0.55)";
    ctx.lineWidth = 2;
    ctx.strokeRect(i * pw + 1, -2, pw - 2, 516);
    // grain hairlines — mix of darker & lighter streaks along the plank's long axis
    for (let g = 0; g < 6; g++) {
      const lighter = rand() > 0.65;
      ctx.strokeStyle = lighter ? "rgba(210,180,130,0.10)" : "rgba(40,24,10,0.20)";
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      let x = i * pw + rand() * pw;
      ctx.moveTo(x, 0);
      for (let y = 0; y <= 512; y += 64) ctx.lineTo(x + (rand() - 0.5) * 7, y);
      ctx.stroke();
    }
    // occasional soft wear patch (worn sheen), clipped to this plank so it stays cell-local
    if (rand() < 0.35) {
      ctx.save();
      ctx.beginPath(); ctx.rect(i * pw, 0, pw, 512); ctx.clip();
      const wx = i * pw + rand() * pw, wy = 60 + rand() * 392, wr = 30 + rand() * 60;
      const g = ctx.createRadialGradient(wx, wy, 0, wx, wy, wr);
      g.addColorStop(0, `rgba(255,248,225,${0.05 + rand() * 0.04})`);
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g; ctx.fillRect(wx - wr, wy - wr, wr * 2, wr * 2);
      ctx.restore();
    }
    // butt joints
    const jy = rand() * 512;
    ctx.strokeStyle = "rgba(30,18,8,0.6)";
    ctx.beginPath(); ctx.moveTo(i * pw, jy); ctx.lineTo((i + 1) * pw, jy); ctx.stroke();
  }
  grime(ctx, 512, 512, rand, { speckle: 500, alpha: 0.05 });
  return toTexture(c);
}

// Herringbone / chevron parquet (Paris salon, point de Hongrie). Diagonal
// honey-toned boards meeting in continuous V columns, with a warm patina —
// the signature floor of a 19th-century impressionist gallery. Seamless: an
// even number of columns (cw wide) with alternating slope, plank height 2·cw
// so each board is a 2:1 parallelogram and column joints break half-a-board.
export function herringbone(base = "#9a7038", seed = 55) {
  const size = 512;
  const [c, ctx] = canvas(size, size);
  const rand = rng(seed);
  ctx.fillStyle = shade(base, -34);              // dark grout / bevel shadow
  ctx.fillRect(0, 0, size, size);
  const cw = 64;                                 // column width
  const ph = 128;                                // plank height (2:1 boards)
  const cols = size / cw;                        // 8 (even → slope pattern wraps)
  for (let ci = -1; ci <= cols; ci++) {
    const slope = (((ci % 2) + 2) % 2 === 0) ? 1 : -1;
    const x0 = ci * cw;
    for (let row = -2; row <= size / ph + 2; row++) {
      const yL = row * ph;
      const yR = yL + slope * cw;
      ctx.beginPath();
      ctx.moveTo(x0, yL);
      ctx.lineTo(x0 + cw, yR);
      ctx.lineTo(x0 + cw, yR + ph);
      ctx.lineTo(x0, yL + ph);
      ctx.closePath();
      ctx.fillStyle = shade(base, (rand() - 0.5) * 34);
      ctx.fill();
      // fine per-plank value jitter (~±4%), on top of the coarser board-tone fill above
      const jit = (rand() - 0.5) * 0.08;
      ctx.fillStyle = jit >= 0 ? `rgba(255,255,255,${jit})` : `rgba(0,0,0,${-jit})`;
      ctx.fill();
      // board seam — stroke only the top + two long (slanted) edges. The bottom
      // edge is left for the row below to draw as ITS top edge; stroking both
      // would double-composite the same pixels and read as a periodic dark
      // horizontal band every `ph` px when the texture tiles (the audited
      // "module seam"). Each shared edge now gets exactly one stroke pass.
      ctx.strokeStyle = "rgba(28,16,7,0.5)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x0, yL + ph);
      ctx.lineTo(x0, yL);
      ctx.lineTo(x0 + cw, yR);
      ctx.lineTo(x0 + cw, yR + ph);
      ctx.stroke();
      // grain running along the board (parallel to the sloped edges) — mostly
      // faint, plus 2-3 slightly stronger darker/lighter hairlines per plank
      const grainLines = 4;
      for (let g = 1; g <= grainLines; g++) {
        const gy = (ph / (grainLines + 1)) * g;
        const isHairline = g === 1 || g === grainLines || (grainLines > 4 && g === 3);
        const lighter = rand() > 0.6;
        ctx.strokeStyle = isHairline
          ? (lighter ? "rgba(220,192,140,0.14)" : "rgba(30,16,6,0.24)")
          : "rgba(44,26,10,0.12)";
        ctx.lineWidth = isHairline ? 0.9 : 0.6;
        ctx.beginPath();
        ctx.moveTo(x0, yL + gy);
        ctx.lineTo(x0 + cw, yR + gy);
        ctx.stroke();
      }
      // occasional soft wear patch, clipped to this plank's own polygon (cell-local)
      if (rand() < 0.22) {
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(x0, yL); ctx.lineTo(x0 + cw, yR);
        ctx.lineTo(x0 + cw, yR + ph); ctx.lineTo(x0, yL + ph);
        ctx.closePath(); ctx.clip();
        const wx = x0 + cw * 0.5, wy = yL + ph * (0.25 + rand() * 0.5), wr = cw * (0.7 + rand() * 0.5);
        const wg = ctx.createRadialGradient(wx, wy, 0, wx, wy, wr);
        wg.addColorStop(0, `rgba(255,246,222,${0.05 + rand() * 0.04})`);
        wg.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = wg;
        ctx.fillRect(wx - wr, wy - wr, wr * 2, wr * 2);
        ctx.restore();
      }
    }
  }
  // warm wax patina + fine speck so it catches light unevenly like real parquet
  grime(ctx, size, size, rand, { speckle: 380, alpha: 0.05, blotch: 16, blotchAlpha: 0.06 });
  return toTexture(c);
}

export function dirtFloor(seed = 8) {
  const [c, ctx] = canvas(512, 512);
  const rand = rng(seed);
  ctx.fillStyle = "#4c4034";
  ctx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 90; i++) {
    const x = rand() * 512, y = rand() * 512, r = 6 + rand() * 46;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(${rand() > 0.5 ? "72,60,46" : "44,36,28"},${0.2 + rand() * 0.25})`);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  for (let i = 0; i < 70; i++) { // pebbles
    ctx.fillStyle = `rgba(${110 + (rand() * 50) | 0},${95 + (rand() * 40) | 0},${80 + (rand() * 30) | 0},0.5)`;
    const x = rand() * 512, y = rand() * 512, r = 1 + rand() * 3.2;
    ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
  }
  // straw flecks — short pale strokes scattered sparsely (chaff bound into packed earth)
  ctx.lineCap = "round";
  for (let i = 0; i < 55; i++) {
    const x = rand() * 512, y = rand() * 512, len = 3 + rand() * 3, ang = rand() * Math.PI;
    ctx.strokeStyle = `rgba(196,168,104,${0.14 + rand() * 0.12})`;
    ctx.lineWidth = 0.8 + rand() * 0.6;
    ctx.beginPath();
    ctx.moveTo(x - (Math.cos(ang) * len) / 2, y - (Math.sin(ang) * len) / 2);
    ctx.lineTo(x + (Math.cos(ang) * len) / 2, y + (Math.sin(ang) * len) / 2);
    ctx.stroke();
  }
  // large soft compaction blotches (foot-traffic wear), low-contrast ±4% value.
  // Centres inset from the edges so the soft falloff never gets cropped by the
  // canvas boundary, which would show as a mismatch when the texture tiles.
  for (let i = 0; i < 10; i++) {
    const x = 60 + rand() * 392, y = 60 + rand() * 392, r = 50 + rand() * 90;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    const lighter = rand() > 0.5;
    g.addColorStop(0, `rgba(${lighter ? "255,250,235" : "0,0,0"},${0.03 + rand() * 0.03})`);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  return toTexture(c);
}

export function concreteFloor(seed = 9) {
  const [c, ctx] = canvas(512, 512);
  const rand = rng(seed);
  ctx.fillStyle = "#b9b6b0";
  ctx.fillRect(0, 0, 512, 512);
  grime(ctx, 512, 512, rand, { speckle: 2200, alpha: 0.05, blotch: 22, blotchAlpha: 0.05 });
  return toTexture(c);
}

export function stoneFloor(base = "#847a6b", seed = 10) {
  return stoneBlocks({ base, mortar: shadeStr(base, -40), rows: 3, cols: 3, seed });
}

// Terrazzo — pale warm cement matrix scattered with polished aggregate chips
// (marble / granite flecks) in mixed neutral + warm tones. The signature
// early-modern gallery floor (concept: Hallway-06 *-modern). Base kept light
// and warm so it reads as pale stone under gallery light, not muddy concrete.
export function terrazzo(base = "#dcd6c8", seed = 57) {
  const [c, ctx] = canvas(512, 512);
  const rand = rng(seed);
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, 512, 512);
  // faint cement mottle so the matrix isn't dead-flat
  grime(ctx, 512, 512, rand, { speckle: 500, alpha: 0.025, blotch: 8, blotchAlpha: 0.03 });
  // scattered aggregate chips — small irregular polygons in mixed stone tones
  const chipCols = ["#8f8577", "#b9ae98", "#efe9dc", "#6f6558",
                    "#a97c54", "#cbb690", "#7d7a72", "#efe6d4"];
  // ~40% smaller chips, count raised ~2.8x to compensate (area ∝ r²) so the
  // overall aggregate coverage/value reads the same, just finer-grained
  const n = 1550;
  for (let i = 0; i < n; i++) {
    const x = rand() * 512, y = rand() * 512;
    const r = (3 + rand() * 8) * 0.6;                // chip radius (px), ~40% smaller
    const col = chipCols[(rand() * chipCols.length) | 0];
    ctx.fillStyle = col;
    ctx.beginPath();
    const verts = 4 + ((rand() * 3) | 0);
    for (let k = 0; k < verts; k++) {
      const a = (k / verts) * Math.PI * 2 + rand() * 0.7;
      const rr = r * (0.55 + rand() * 0.55);
      const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr;
      if (k === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    // softened chip edge — a blur-ish mid-tone outline blended between the
    // chip and the cement matrix, instead of a hard near-black line
    ctx.strokeStyle = mixHex(col, base, 0.5, 0.16);
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  return toTexture(c);
}

// Irregular megalithic flagstone — large dry-laid polygonal slabs with tight
// dark seams and per-stone tonal variation (concept: Hallway-03 Andes floor,
// "irregular ashlar flagstone, avoid square modern masonry grids").
export function flagstone(base = "#8c8981", seed = 30) {
  const [c, ctx] = canvas(512, 512);
  const rand = rng(seed);
  // dark seams / packed grit between stones
  ctx.fillStyle = shadeStr(base, -58);
  ctx.fillRect(0, 0, 512, 512);
  // jittered lattice of corner points → irregular quad slabs (wraps seamlessly)
  const N = 4, S = 512 / N;
  const jit = S * 0.24;
  const pt = (i, j) => {
    // deterministic per-lattice-node offset, identical on opposite edges so the
    // tile repeats without a visible seam
    const r = rng((((i % N) + N) % N) * 131 + (((j % N) + N) % N) * 977 + seed * 7);
    if (i % N === 0 || j % N === 0) { /* keep edge nodes offset-consistent */ }
    return [i * S + (r() - 0.5) * 2 * jit, j * S + (r() - 0.5) * 2 * jit];
  };
  for (let i = 0; i < N; i++) {
    for (let j = 0; j < N; j++) {
      const a = pt(i, j), b = pt(i + 1, j), d = pt(i, j + 1), e = pt(i + 1, j + 1);
      const g = S * 0.05; // seam gap: pull each corner slightly inward
      const cx = (a[0] + b[0] + d[0] + e[0]) / 4, cy = (a[1] + b[1] + d[1] + e[1]) / 4;
      const inw = (p) => [p[0] + (cx - p[0]) * 0.06 + Math.sign(cx - p[0]) * g,
                          p[1] + (cy - p[1]) * 0.06 + Math.sign(cy - p[1]) * g];
      const A = inw(a), B = inw(b), E = inw(e), D = inw(d);
      const tone = (rand() - 0.5) * 30; // ±~6% per-stone value jitter
      ctx.fillStyle = shadeStr(base, tone);
      ctx.beginPath();
      ctx.moveTo(A[0], A[1]); ctx.lineTo(B[0], B[1]);
      ctx.lineTo(E[0], E[1]); ctx.lineTo(D[0], D[1]); ctx.closePath();
      ctx.fill();
      // soft top-edge highlight + bottom shadow so each slab catches light
      ctx.strokeStyle = "rgba(255,250,240,0.10)";
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(D[0], D[1]); ctx.lineTo(A[0], A[1]); ctx.lineTo(B[0], B[1]); ctx.stroke();
      ctx.strokeStyle = "rgba(0,0,0,0.22)";
      ctx.beginPath(); ctx.moveTo(B[0], B[1]); ctx.lineTo(E[0], E[1]); ctx.lineTo(D[0], D[1]); ctx.stroke();
      // 1-2px darker inner-edge line all around the slab (bevel/dirt read)
      ctx.strokeStyle = "rgba(0,0,0,0.20)";
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(A[0], A[1]); ctx.lineTo(B[0], B[1]);
      ctx.lineTo(E[0], E[1]); ctx.lineTo(D[0], D[1]); ctx.closePath();
      ctx.stroke();
      // sparse speckle within the stone, near its centre so it stays cell-local
      const speckN = (rand() * 4) | 0;
      for (let sp = 0; sp < speckN; sp++) {
        ctx.fillStyle = `rgba(${rand() > 0.5 ? "255,250,240" : "20,16,10"},${0.06 + rand() * 0.06})`;
        const sx = cx + (rand() - 0.5) * S * 0.5, sy = cy + (rand() - 0.5) * S * 0.5;
        ctx.fillRect(sx, sy, 1 + rand(), 1 + rand());
      }
    }
  }
  grime(ctx, 512, 512, rand, { speckle: 1300, alpha: 0.05, blotch: 16, blotchAlpha: 0.06 });
  return toTexture(c);
}

// ---------- Decorative bands ----------

// Egyptian pseudo-hieroglyph band
export function hieroglyphBand(bg = "#c8a86a", ink = "#3a2c18", seed = 11) {
  const [c, ctx] = canvas(512, 256);
  const rand = rng(seed);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 512, 256);
  ctx.strokeStyle = ink;
  ctx.fillStyle = ink;
  const cols = 8;
  for (let i = 0; i < cols; i++) {
    const cx = (i + 0.5) * (512 / cols);
    let y = 22;
    // column dividers
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(i * 512 / cols, 0); ctx.lineTo(i * 512 / cols, 256); ctx.stroke();
    while (y < 235) {
      const t = rand(), s = 9 + rand() * 9;
      ctx.lineWidth = 2.4;
      if (t < 0.2) { // eye
        ctx.beginPath(); ctx.ellipse(cx, y, s, s * 0.5, 0, 0, 7); ctx.stroke();
        ctx.beginPath(); ctx.arc(cx, y, s * 0.24, 0, 7); ctx.fill();
      } else if (t < 0.4) { // bird-ish
        ctx.beginPath(); ctx.moveTo(cx - s, y + s * 0.7); ctx.quadraticCurveTo(cx, y - s, cx + s, y + s * 0.4);
        ctx.lineTo(cx + s * 0.2, y + s * 0.6); ctx.closePath(); ctx.stroke();
      } else if (t < 0.6) { // zigzag water
        ctx.beginPath(); ctx.moveTo(cx - s, y);
        for (let k = 0; k < 4; k++) ctx.lineTo(cx - s + (k + 0.5) * s / 1.5, y + (k % 2 ? 5 : -5));
        ctx.stroke();
      } else if (t < 0.8) { // ankh-ish
        ctx.beginPath(); ctx.arc(cx, y - s * 0.35, s * 0.4, 0, 7); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx, y); ctx.lineTo(cx, y + s * 0.9);
        ctx.moveTo(cx - s * 0.55, y + s * 0.3); ctx.lineTo(cx + s * 0.55, y + s * 0.3); ctx.stroke();
      } else { // box
        ctx.strokeRect(cx - s * 0.7, y - s * 0.35, s * 1.4, s * 0.8);
      }
      y += s * 2 + 8 + rand() * 8;
    }
  }
  return toTexture(c);
}

// Mesoamerican stepped-fret (greca) band
export function grecaBand(bg = "#7d5b3f", ink = "#2e2013", seed = 12) {
  const [c, ctx] = canvas(512, 128);
  const rand = rng(seed);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 512, 128);
  // desaturate the ink ~8% toward the background so it reads as fired pigment,
  // not a flat vector stroke
  const inkTone = mixHex(ink, bg, 0.08);
  ctx.strokeStyle = inkTone;
  ctx.lineWidth = 7;
  const step = 64;
  for (let x = 0; x < 512; x += step) {
    ctx.beginPath();
    ctx.moveTo(x + 6, 96);
    ctx.lineTo(x + 6, 40); ctx.lineTo(x + 26, 40); ctx.lineTo(x + 26, 60);
    ctx.lineTo(x + 46, 60); ctx.lineTo(x + 46, 80); ctx.lineTo(x + step + 2, 80);
    ctx.stroke();
  }
  ctx.strokeStyle = inkTone; ctx.lineWidth = 5;
  ctx.strokeRect(0, 8, 512, 112);
  // fine pigment-noise overlay — same recipe as triangleBand
  for (let i = 0; i < 3200; i++) {
    ctx.fillStyle = rand() > 0.5 ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";
    ctx.fillRect(rand() * 512, rand() * 128, 1, 1);
  }
  return toTexture(c);
}

// Islamic 8-point star tile
export function starTile(bg = "#1d4e6b", star = "#e4d9b8", accent = "#3f8ea6", seed = 13) {
  const [c, ctx] = canvas(512, 512);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 512, 512);
  const n = 2, s = 512 / n;
  function star8(cx, cy, R, r, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    for (let k = 0; k < 16; k++) {
      const ang = (k * Math.PI) / 8 - Math.PI / 2;
      const rad = k % 2 === 0 ? R : r;
      const x = cx + rad * Math.cos(ang), y = cy + rad * Math.sin(ang);
      k === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.closePath(); ctx.fill();
  }
  for (let i = 0; i <= n; i++)
    for (let j = 0; j <= n; j++) {
      star8(i * s, j * s, s * 0.38, s * 0.155, star);
      star8(i * s, j * s, s * 0.155, s * 0.085, accent);
    }
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++) {
      star8((i + 0.5) * s, (j + 0.5) * s, s * 0.30, s * 0.12, accent);
      star8((i + 0.5) * s, (j + 0.5) * s, s * 0.12, s * 0.06, star);
    }
  return toTexture(c);
}

// Glazed-brick band with rosettes (Ishtar Gate style)
export function glazedBand(bg = "#1c4d7c", rosette = "#e8c95f", seed = 14) {
  const [c, ctx] = canvas(512, 128);
  const rand = rng(seed);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 512, 128);
  // brick joints
  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.lineWidth = 2;
  for (let y = 0; y < 128; y += 32) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(512, y); ctx.stroke(); }
  for (let i = 0; i < 6; i++) {
    const cx = (i + 0.5) * 512 / 6, cy = 64;
    ctx.fillStyle = rosette;
    for (let p = 0; p < 8; p++) {
      const a = (p / 8) * Math.PI * 2;
      ctx.beginPath();
      ctx.ellipse(cx + Math.cos(a) * 22, cy + Math.sin(a) * 22, 9, 5, a, 0, 7);
      ctx.fill();
    }
    ctx.fillStyle = "#f4ecd9";
    ctx.beginPath(); ctx.arc(cx, cy, 8, 0, 7); ctx.fill();
  }
  return toTexture(c);
}

// Ishtar-Gate glazed rosette frieze — rows of gold flower-rosettes on
// lapis-blue glazed brick, framed top & bottom by cream/gold rules. This is
// the Babylonian procession-way signature motif (Hallway-15). Rounded petals,
// not spiky stars: a ring of gold petals, a cream ring, a gold hub + cream pip.
export function rosetteBand(bg = "#1b4a78", gold = "#cca63e", cream = "#ecdfbd", seed = 14) {
  const [c, ctx] = canvas(1024, 256);
  ctx.fillStyle = bg; ctx.fillRect(0, 0, 1024, 256);
  // faint glazed-brick joints so the ground reads as glazed brick, not flat paint
  ctx.strokeStyle = "rgba(228,236,255,0.055)"; ctx.lineWidth = 2;
  for (let y = 16; y < 256; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(1024, y); ctx.stroke(); }
  for (let x = 0; x < 1024; x += 68) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 256); ctx.stroke(); }
  // top & bottom framing rules (cream hairline + gold band + cream hairline)
  const rule = (y) => {
    ctx.fillStyle = cream; ctx.fillRect(0, y, 1024, 5);
    ctx.fillStyle = gold; ctx.fillRect(0, y + 7, 1024, 10);
    ctx.fillStyle = cream; ctx.fillRect(0, y + 19, 1024, 3);
  };
  rule(6); rule(256 - 27);
  // Each petal filled gold then thinly outlined in dark lapis so it reads as a
  // SEPARATE glazed segment — a detailed concentric rosette, not a flat sunflower.
  const petalRing = (cx, cy, count, radius, len, wid, color, phase) => {
    for (let p = 0; p < count; p++) {
      const a = phase + (p / count) * Math.PI * 2;
      ctx.beginPath();
      ctx.ellipse(cx + Math.cos(a) * radius, cy + Math.sin(a) * radius, len, wid, a, 0, Math.PI * 2);
      ctx.fillStyle = color; ctx.fill();
      ctx.lineWidth = 1.6; ctx.strokeStyle = "rgba(14,24,50,0.6)"; ctx.stroke();
    }
  };
  const n = 4, step = 1024 / n, cy = 130, R = 76;
  for (let i = 0; i < n; i++) {
    const cx = (i + 0.5) * step;
    ctx.fillStyle = cream; ctx.beginPath(); ctx.arc(cx, cy, R * 0.90, 0, 7); ctx.fill();  // white keyline ring
    ctx.fillStyle = bg;    ctx.beginPath(); ctx.arc(cx, cy, R * 0.80, 0, 7); ctx.fill();  // lapis field
    petalRing(cx, cy, 16, R * 0.54, R * 0.30, R * 0.075, gold, 0);           // 16 outlined gold petals
    ctx.fillStyle = cream; ctx.beginPath(); ctx.arc(cx, cy, R * 0.32, 0, 7); ctx.fill();  // cream ring
    ctx.fillStyle = bg;    ctx.beginPath(); ctx.arc(cx, cy, R * 0.25, 0, 7); ctx.fill();  // blue inset
    petalRing(cx, cy, 8, R * 0.155, R * 0.10, R * 0.045, gold, Math.PI / 8); // short inner petals
    ctx.fillStyle = gold;  ctx.beginPath(); ctx.arc(cx, cy, R * 0.11, 0, 7); ctx.fill();  // gold hub
    ctx.fillStyle = cream; ctx.beginPath(); ctx.arc(cx, cy, R * 0.05, 0, 7); ctx.fill();  // cream pip
  }
  return toTexture(c);
}

// Shoji screen (Japan) — lit paper panels in a wood lattice
export function shoji(seed = 15) {
  const [c, ctx] = canvas(512, 512);
  ctx.fillStyle = "#e9e0cb";
  ctx.fillRect(0, 0, 512, 512);
  const g = ctx.createRadialGradient(256, 256, 60, 256, 256, 380);
  g.addColorStop(0, "rgba(255,248,225,0.5)");
  g.addColorStop(1, "rgba(190,175,150,0.35)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 512, 512);
  ctx.strokeStyle = "#4a3520";
  ctx.lineWidth = 10;
  const n = 4;
  for (let i = 0; i <= n; i++) {
    const p = (i * 512) / n;
    ctx.beginPath(); ctx.moveTo(p, 0); ctx.lineTo(p, 512); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, p); ctx.lineTo(512, p); ctx.stroke();
  }
  ctx.lineWidth = 4;
  for (let i = 0; i <= n * 3; i++) {
    const p = (i * 512) / (n * 3);
    ctx.beginPath(); ctx.moveTo(0, p); ctx.lineTo(512, p); ctx.stroke();
  }
  return toTexture(c);
}

// Coffered ceiling (Renaissance)
export function coffered(base = "#6b5232", inner = "#463520", gold = "#c9a256", seed = 16) {
  const [c, ctx] = canvas(512, 512);
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, 512, 512);
  const n = 2, s = 512 / n;
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++) {
      const x = i * s, y = j * s;
      ctx.fillStyle = inner;
      ctx.fillRect(x + 26, y + 26, s - 52, s - 52);
      ctx.strokeStyle = gold;
      ctx.lineWidth = 6;
      ctx.strokeRect(x + 26, y + 26, s - 52, s - 52);
      ctx.strokeStyle = "rgba(255,220,150,0.5)";
      ctx.lineWidth = 3;
      ctx.strokeRect(x + 52, y + 52, s - 104, s - 104);
      // rosette
      ctx.fillStyle = gold;
      ctx.beginPath(); ctx.arc(x + s / 2, y + s / 2, 16, 0, 7); ctx.fill();
    }
  return toTexture(c);
}

// Gothic stained-glass lancet (emissive window texture)
export function stainedGlass(seed = 17) {
  const [c, ctx] = canvas(256, 512);
  const rand = rng(seed);
  ctx.fillStyle = "#141210";
  ctx.fillRect(0, 0, 256, 512);
  const colors = ["#274a8f", "#8f1d24", "#b98a1f", "#2c6b34", "#5a2d7a", "#1d6b8f"];
  // pointed-arch clip
  ctx.beginPath();
  ctx.moveTo(20, 512);
  ctx.lineTo(20, 190);
  ctx.quadraticCurveTo(20, 40, 128, 26);
  ctx.quadraticCurveTo(236, 40, 236, 190);
  ctx.lineTo(236, 512);
  ctx.closePath();
  ctx.save(); ctx.clip();
  const cell = 42;
  for (let y = 0; y < 512; y += cell)
    for (let x = 0; x < 256; x += cell) {
      ctx.fillStyle = colors[(rand() * colors.length) | 0];
      ctx.fillRect(x, y, cell, cell);
      ctx.fillStyle = `rgba(255,255,255,${0.06 + rand() * 0.16})`;
      ctx.fillRect(x, y, cell, cell);
    }
  // leading
  ctx.strokeStyle = "#0a0908";
  ctx.lineWidth = 5;
  for (let y = 0; y <= 512; y += cell) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(256, y); ctx.stroke(); }
  for (let x = 0; x <= 256; x += cell) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 512); ctx.stroke(); }
  // central medallion
  ctx.fillStyle = "#b98a1f";
  ctx.beginPath(); ctx.arc(128, 200, 42, 0, 7); ctx.fill();
  ctx.strokeStyle = "#0a0908"; ctx.lineWidth = 6;
  ctx.beginPath(); ctx.arc(128, 200, 42, 0, 7); ctx.stroke();
  ctx.restore();
  const t = toTexture(c);
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}

// Adobe / earthen wall with painted geometric frieze
export function earthenWall(base = "#a5714a", paint = "#4d3524", seed = 18) {
  const [c, ctx] = canvas(512, 512);
  const rand = rng(seed);
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, 512, 512);
  grime(ctx, 512, 512, rand, { speckle: 1600, alpha: 0.05, blotch: 20, blotchAlpha: 0.07 });
  return toTexture(c);
}

// Warm, lit packed-earth / adobe floor (Pueblo passage). Lighter and warmer
// than dirtFloor so it catches the uplights instead of swallowing them.
export function packedEarth(seed = 30) {
  const [c, ctx] = canvas(512, 512);
  const rand = rng(seed);
  ctx.fillStyle = "#a67a4c";
  ctx.fillRect(0, 0, 512, 512);
  // broad tonal blotches (troweled adobe) — warm, low contrast, kept subtle so
  // the non-tiling variation doesn't reveal a seam at the floor UV boundary
  for (let i = 0; i < 55; i++) {
    const x = rand() * 512, y = rand() * 512, r = 16 + rand() * 60;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    const warm = rand() > 0.45;
    g.addColorStop(0, `rgba(${warm ? "190,146,94" : "138,102,66"},${0.08 + rand() * 0.09})`);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  for (let i = 0; i < 60; i++) { // fine grit
    ctx.fillStyle = `rgba(${140 + (rand() * 50) | 0},${112 + (rand() * 36) | 0},${78 + (rand() * 26) | 0},0.45)`;
    const x = rand() * 512, y = rand() * 512, r = 0.8 + rand() * 2.4;
    ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
  }
  // finer grain — dense 1px speckle for photographic micro-texture (breaks the
  // otherwise-regular look of the blotch/grit passes above)
  for (let i = 0; i < 900; i++) {
    ctx.fillStyle = `rgba(${rand() > 0.5 ? "255,240,210" : "40,30,20"},${0.02 + rand() * 0.03})`;
    ctx.fillRect(rand() * 512, rand() * 512, 1, 1);
  }
  // a few soft footpath-darkened patches (worn traffic lanes). Elongated via a
  // scale transform; centres inset from the edges to avoid a cropped-gradient
  // seam when the texture tiles.
  for (let i = 0; i < 4; i++) {
    const x = 70 + rand() * 372, y = 70 + rand() * 372, rx = 60 + rand() * 70, ry = 24 + rand() * 30;
    const R = Math.max(rx, ry);
    ctx.save();
    ctx.translate(x, y); ctx.scale(rx / R, ry / R); ctx.translate(-x, -y);
    const g = ctx.createRadialGradient(x, y, 0, x, y, R);
    g.addColorStop(0, `rgba(60,44,28,${0.05 + rand() * 0.04})`);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(x - R, y - R, R * 2, R * 2);
    ctx.restore();
  }
  grime(ctx, 512, 512, rand, { speckle: 700, alpha: 0.03, blotch: 8, blotchAlpha: 0.04 });
  return toTexture(c);
}

// Woven Pueblo/Navajo textile panel — cream ground with banded rows of
// diamonds, chevrons and terraced stripes in mineral red / black / ochre.
// Portrait tile, hung flat on the adobe walls (concept: Hallway-04 side panels).
export function puebloTextile(seed = 31) {
  const W = 256, H = 512;
  const [c, ctx] = canvas(W, H);
  const rand = rng(seed);
  const cream = "#e6d0a4", red = "#9c3a22", blk = "#241812", ochre = "#c78a38";
  ctx.fillStyle = cream;
  ctx.fillRect(0, 0, W, H);
  // subtle weft texture
  ctx.globalAlpha = 0.06;
  for (let y = 0; y < H; y += 3) { ctx.fillStyle = y % 6 ? "#000" : "#fff"; ctx.fillRect(0, y, W, 1); }
  ctx.globalAlpha = 1;
  const bands = [
    { t: "stripe", col: red, h: 18 },
    { t: "step", col: blk, h: 46 },
    { t: "stripe", col: ochre, h: 10 },
    { t: "diamond", col: red, alt: blk, h: 92 },
    { t: "stripe", col: ochre, h: 10 },
    { t: "step", col: red, h: 46 },
    { t: "stripe", col: blk, h: 18 },
    { t: "diamond", col: blk, alt: red, h: 92 },
    { t: "stripe", col: ochre, h: 10 },
    { t: "step", col: blk, h: 46 },
    { t: "stripe", col: red, h: 18 },
  ];
  let y = 6;
  for (const b of bands) {
    if (b.t === "stripe") {
      ctx.fillStyle = b.col; ctx.fillRect(0, y, W, b.h);
    } else if (b.t === "step") {
      // terraced (stepped) motif row
      ctx.fillStyle = b.col;
      const n = 4, s = W / n;
      for (let i = 0; i < n; i++) {
        const x0 = i * s, cx = x0 + s / 2;
        ctx.beginPath();
        ctx.moveTo(x0 + 3, y + b.h);
        ctx.lineTo(x0 + 3, y + b.h * 0.62);
        ctx.lineTo(cx - s * 0.18, y + b.h * 0.62);
        ctx.lineTo(cx - s * 0.18, y + b.h * 0.28);
        ctx.lineTo(cx + s * 0.18, y + b.h * 0.28);
        ctx.lineTo(cx + s * 0.18, y + b.h * 0.62);
        ctx.lineTo(x0 + s - 3, y + b.h * 0.62);
        ctx.lineTo(x0 + s - 3, y + b.h);
        ctx.closePath(); ctx.fill();
      }
    } else if (b.t === "diamond") {
      const n = 3, s = W / n;
      for (let i = 0; i < n; i++) {
        const cx = i * s + s / 2, cy = y + b.h / 2;
        ctx.fillStyle = b.col;
        ctx.beginPath();
        ctx.moveTo(cx, cy - b.h * 0.42); ctx.lineTo(cx + s * 0.42, cy);
        ctx.lineTo(cx, cy + b.h * 0.42); ctx.lineTo(cx - s * 0.42, cy);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = b.alt;
        ctx.beginPath();
        ctx.moveTo(cx, cy - b.h * 0.20); ctx.lineTo(cx + s * 0.20, cy);
        ctx.lineTo(cx, cy + b.h * 0.20); ctx.lineTo(cx - s * 0.20, cy);
        ctx.closePath(); ctx.fill();
      }
    }
    y += b.h;
  }
  // dark selvedge edges
  ctx.fillStyle = blk;
  ctx.fillRect(0, 0, W, 5); ctx.fillRect(0, H - 5, W, 5);
  ctx.fillRect(0, 0, 5, H); ctx.fillRect(W - 5, 0, 5, H);
  const t = toTexture(c);
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}

// Terraced (stepped-pyramid) frieze band with circular medallions — the
// painted motif that frames the top of the Pueblo passage (concept: Hallway-04).
export function steppedBand(bg = "#c79a63", seed = 32) {
  const [c, ctx] = canvas(512, 96);
  const red = "#9c3a22", blk = "#241812";
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 512, 96);
  ctx.fillStyle = blk; ctx.fillRect(0, 6, 512, 5); ctx.fillRect(0, 85, 512, 5);
  const n = 4, s = 512 / n;
  for (let i = 0; i < n; i++) {
    const x0 = i * s, cx = x0 + s / 2;
    // stepped pyramid rising to the centre
    ctx.fillStyle = i % 2 ? red : blk;
    for (let k = 0; k < 4; k++) {
      const w = s * 0.4 - k * s * 0.09;
      ctx.fillRect(cx - w, 66 - k * 13, w * 2, 11);
    }
    // circular medallion between pyramids
    const mx = x0;
    ctx.strokeStyle = red; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(mx, 48, 12, 0, 7); ctx.stroke();
    ctx.fillStyle = blk; ctx.beginPath(); ctx.arc(mx, 48, 4, 0, 7); ctx.fill();
  }
  return toTexture(c);
}

// Kente/kuba-inspired painted triangles band (African traditions)
export function triangleBand(bg = "#7c4a2a", a = "#e0c27d", b = "#2e1d10", seed = 19) {
  const [c, ctx] = canvas(512, 128);
  const rand = rng(seed);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 512, 128);
  const n = 10, s = 512 / n;
  for (let i = 0; i < n; i++) {
    ctx.fillStyle = i % 2 ? a : b;
    ctx.beginPath();
    ctx.moveTo(i * s, 112); ctx.lineTo(i * s + s / 2, 16); ctx.lineTo((i + 1) * s, 112);
    ctx.closePath(); ctx.fill();
  }
  ctx.fillStyle = a;
  ctx.fillRect(0, 0, 512, 8);
  ctx.fillRect(0, 120, 512, 8);
  // fine pigment-noise overlay — 1px dots, both darker + lighter, ~6% opacity —
  // so the painted triangles read as mineral pigment on plaster, not vector fills
  for (let i = 0; i < 3200; i++) {
    ctx.fillStyle = rand() > 0.5 ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";
    ctx.fillRect(rand() * 512, rand() * 128, 1, 1);
  }
  return toTexture(c);
}

// Greek meander (key) band
export function meanderBand(bg = "#20242c", ink = "#d9cfb8", seed = 20) {
  const [c, ctx] = canvas(512, 96);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 512, 96);
  ctx.strokeStyle = ink;
  ctx.lineWidth = 7;
  const s = 64;
  for (let x = 0; x < 512; x += s) {
    ctx.beginPath();
    ctx.moveTo(x, 72);
    ctx.lineTo(x, 24); ctx.lineTo(x + 44, 24); ctx.lineTo(x + 44, 52);
    ctx.lineTo(x + 20, 52); ctx.lineTo(x + 20, 38); ctx.lineTo(x + 32, 38);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, 72); ctx.lineTo(x + s, 72);
    ctx.stroke();
  }
  return toTexture(c);
}

function shade(hex, amt) {
  return shadeStr(hex, amt);
}
function shadeStr(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, Math.min(255, (n >> 16) + amt));
  const g = Math.max(0, Math.min(255, ((n >> 8) & 255) + amt));
  const b = Math.max(0, Math.min(255, (n & 255) + amt));
  return `rgb(${r},${g},${b})`;
}
// Blend hexA toward hexB by fraction t (0 = hexA, 1 = hexB); optional alpha.
function mixHex(hexA, hexB, t, alpha = 1) {
  const na = parseInt(hexA.slice(1), 16), nb = parseInt(hexB.slice(1), 16);
  const ar = (na >> 16) & 255, ag = (na >> 8) & 255, ab = na & 255;
  const br = (nb >> 16) & 255, bg = (nb >> 8) & 255, bb = nb & 255;
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const b = Math.round(ab + (bb - ab) * t);
  return `rgba(${r},${g},${b},${alpha})`;
}

// ---------- Text signage ----------

function drawTrackedText(ctx, text, x, y, maxW, tracking) {
  const chars = [...text];
  if (!chars.length) return;
  const widths = chars.map((ch) => ctx.measureText(ch).width);
  const rawW = widths.reduce((a, b) => a + b, 0) + Math.max(0, chars.length - 1) * tracking;
  const sx = Math.min(1, maxW / Math.max(1, rawW));
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(sx, 1);
  let cursor = -rawW / 2;
  ctx.textAlign = "left";
  for (let i = 0; i < chars.length; i++) {
    ctx.fillText(chars[i], cursor, 0);
    cursor += widths[i] + tracking;
  }
  ctx.restore();
}

function drawSignBorder(ctx, w, h, fg, style) {
  if (style === "none" || style === false) return;
  ctx.save();
  ctx.strokeStyle = fg;
  ctx.lineJoin = "miter";
  if (style === "single") {
    ctx.lineWidth = 4;
    ctx.strokeRect(12, 12, w - 24, h - 24);
  } else if (style === "stepped") {
    ctx.lineWidth = 4;
    ctx.strokeRect(12, 12, w - 24, h - 24);
    ctx.lineWidth = 2;
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
      const x = sx < 0 ? 24 : w - 24, y = sy < 0 ? 24 : h - 24;
      ctx.beginPath();
      ctx.moveTo(x, y + sy * 26); ctx.lineTo(x + sx * 26, y + sy * 26);
      ctx.lineTo(x + sx * 26, y); ctx.lineTo(x + sx * 52, y);
      ctx.stroke();
    }
  } else if (style === "deco") {
    ctx.lineWidth = 5;
    ctx.strokeRect(11, 11, w - 22, h - 22);
    ctx.lineWidth = 2;
    ctx.strokeRect(22, 22, w - 44, h - 44);
    for (const x of [w * 0.18, w * 0.82]) {
      ctx.beginPath(); ctx.moveTo(x - 34, 18); ctx.lineTo(x, 32); ctx.lineTo(x + 34, 18); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x - 34, h - 18); ctx.lineTo(x, h - 32); ctx.lineTo(x + 34, h - 18); ctx.stroke();
    }
  } else if (style === "arched") {
    ctx.lineWidth = 4;
    ctx.strokeRect(12, 12, w - 24, h - 24);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(22, h - 22); ctx.lineTo(22, 54);
    ctx.quadraticCurveTo(22, 22, 54, 22);
    ctx.lineTo(w - 54, 22); ctx.quadraticCurveTo(w - 22, 22, w - 22, 54);
    ctx.lineTo(w - 22, h - 22); ctx.stroke();
  } else if (style === "woven") {
    ctx.lineWidth = 3;
    ctx.setLineDash([13, 7]);
    ctx.strokeRect(12, 12, w - 24, h - 24);
    ctx.setLineDash([]);
    ctx.lineWidth = 1.5;
    ctx.strokeRect(21, 21, w - 42, h - 42);
  } else {
    ctx.lineWidth = 4;
    ctx.strokeRect(10, 10, w - 20, h - 20);
    ctx.lineWidth = 1.5;
    ctx.strokeRect(20, 20, w - 40, h - 40);
  }
  ctx.restore();
}

function drawSignMotif(ctx, w, h, fg, motif) {
  if (!motif || motif === "none") return;
  ctx.save();
  ctx.strokeStyle = fg;
  ctx.fillStyle = fg;
  ctx.globalAlpha = 0.62;
  ctx.lineWidth = 2.5;
  const ys = [h * 0.30, h * 0.70];
  const xs = [48, w - 48];
  for (const x of xs) for (const y of ys) {
    ctx.save(); ctx.translate(x, y);
    if (motif === "ochre") {
      ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(0, 0, 13, 0.25, Math.PI * 1.55); ctx.stroke();
    } else if (motif === "diamond" || motif === "weave") {
      ctx.rotate(Math.PI / 4); ctx.strokeRect(-8, -8, 16, 16);
      if (motif === "weave") ctx.strokeRect(-3, -3, 6, 6);
    } else if (motif === "star") {
      ctx.beginPath();
      for (let i = 0; i < 16; i++) {
        const a = -Math.PI / 2 + i * Math.PI / 8, r = i % 2 ? 5 : 13;
        const px = Math.cos(a) * r, py = Math.sin(a) * r;
        if (!i) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath(); ctx.stroke();
    } else if (motif === "rosette" || motif === "sun") {
      const petals = motif === "sun" ? 8 : 6;
      for (let i = 0; i < petals; i++) {
        const a = i * Math.PI * 2 / petals;
        ctx.beginPath(); ctx.ellipse(Math.cos(a) * 8, Math.sin(a) * 8, 7, 3, a, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.beginPath(); ctx.arc(0, 0, 3, 0, Math.PI * 2); ctx.fill();
    } else if (motif === "arch") {
      ctx.beginPath(); ctx.moveTo(-11, 12); ctx.lineTo(-11, -2); ctx.quadraticCurveTo(0, -17, 11, -2); ctx.lineTo(11, 12); ctx.stroke();
    } else if (motif === "lattice" || motif === "grid") {
      for (const d of [-7, 0, 7]) {
        ctx.beginPath(); ctx.moveTo(-12, d); ctx.lineTo(12, d); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(d, -12); ctx.lineTo(d, 12); ctx.stroke();
      }
    } else if (motif === "meander") {
      ctx.beginPath(); ctx.moveTo(-13, 8); ctx.lineTo(-4, 8); ctx.lineTo(-4, -3); ctx.lineTo(7, -3); ctx.lineTo(7, 8); ctx.lineTo(13, 8); ctx.stroke();
    } else if (motif === "chevron") {
      ctx.beginPath(); ctx.moveTo(-13, 7); ctx.lineTo(0, -7); ctx.lineTo(13, 7); ctx.stroke();
    } else if (motif === "deco") {
      for (const a of [-0.7, -0.35, 0, 0.35, 0.7]) {
        ctx.beginPath(); ctx.moveTo(0, 11); ctx.lineTo(Math.sin(a) * 13, -10); ctx.stroke();
      }
    } else {
      ctx.beginPath(); ctx.moveTo(-13, 0); ctx.lineTo(13, 0); ctx.stroke();
    }
    ctx.restore();
  }
  ctx.restore();
}

function addSignGrain(ctx, w, h, amount, seedText) {
  if (!amount) return;
  let seed = 2166136261;
  for (const ch of seedText) seed = Math.imul(seed ^ ch.codePointAt(0), 16777619);
  const rand = rng(seed >>> 0);
  const n = Math.round(700 + amount * 4200);
  ctx.save();
  for (let i = 0; i < n; i++) {
    const light = rand() > 0.48;
    ctx.fillStyle = light
      ? `rgba(255,245,220,${amount * (0.08 + rand() * 0.12)})`
      : `rgba(0,0,0,${amount * (0.07 + rand() * 0.10)})`;
    const s = rand() > 0.88 ? 2 : 1;
    ctx.fillRect(Math.floor(rand() * w), Math.floor(rand() * h), s, s);
  }
  ctx.restore();
}

export function signTexture(main, sub = "", opts = {}) {
  const { w = 1024, h = 256, bg = "rgba(16,13,10,0.92)", fg = "#d6b578",
          sub_fg = "#a89a82", anchor = "", anchor_fg = sub_fg,
          border = true, borderStyle = border ? "double" : "none", motif = "none",
          mainSize = 72, subSize = 34, anchorSize = 17,
          fontFamily = "Optima, Trajan, 'Times New Roman', serif",
          subFontFamily = "Optima, 'Times New Roman', serif",
          fontWeight = 600, tracking = 4.2, uppercase = true, grain = 0 } = opts;
  const [c, ctx] = canvas(w, h);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);
  addSignGrain(ctx, w, h, grain, `${main}|${sub}|${anchor}`);
  drawSignBorder(ctx, w, h, fg, borderStyle);
  drawSignMotif(ctx, w, h, fg, motif);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = fg;
  ctx.font = `${fontWeight} ${mainSize}px ${fontFamily}`;
  const title = uppercase ? main.toUpperCase() : main;
  const hasAnchor = Boolean(anchor);
  drawTrackedText(ctx, title, w / 2, hasAnchor ? h * 0.28 : (sub ? h * 0.40 : h * 0.5), w - 150, tracking);
  if (sub) {
    ctx.fillStyle = sub_fg;
    ctx.font = `${subSize}px ${subFontFamily}`;
    drawTrackedText(ctx, sub, w / 2, hasAnchor ? h * 0.56 : h * 0.72, w - 150, Math.min(2.2, tracking * 0.45));
  }
  if (anchor) {
    ctx.fillStyle = anchor_fg;
    ctx.font = `600 ${anchorSize}px ${subFontFamily}`;
    drawTrackedText(ctx, anchor.toUpperCase(), w / 2, h * 0.79, w - 150, Math.min(1.8, tracking * 0.32));
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

export function plaqueTexture(art) {
  const [c, ctx] = canvas(512, 288);
  ctx.fillStyle = "#241e16";
  ctx.fillRect(0, 0, 512, 288);
  ctx.strokeStyle = "#8a744f";
  ctx.lineWidth = 3;
  ctx.strokeRect(8, 8, 496, 272);
  ctx.textAlign = "left";
  ctx.fillStyle = "#e8dcc2";
  ctx.font = "600 34px Optima, Georgia, serif";
  wrapText(ctx, art.title, 28, 62, 456, 40, 2);
  ctx.fillStyle = "#c9a256";
  ctx.font = "26px Optima, Georgia, serif";
  wrapText(ctx, art.artist, 28, 168, 456, 32, 2);
  ctx.fillStyle = "#948a72";
  ctx.font = "24px Optima, Georgia, serif";
  ctx.fillText(art.date, 28, 246, 456);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function wrapText(ctx, text, x, y, maxW, lineH, maxLines) {
  const words = text.split(" ");
  let line = "", lines = 0;
  for (const w of words) {
    const test = line ? line + " " + w : w;
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, x, y, maxW);
      y += lineH;
      if (++lines >= maxLines - 1) { line = w; break; }
      line = w;
    } else line = test;
  }
  if (line) ctx.fillText(line, x, y, maxW);
}

// Placeholder shown on an artwork before (or if) its image loads
export function placeholderArt(art, failed = false) {
  const [c, ctx] = canvas(512, 384);
  const g = ctx.createLinearGradient(0, 0, 0, 384);
  g.addColorStop(0, "#2b251c");
  g.addColorStop(1, "#1c1812");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 512, 384);
  ctx.strokeStyle = "rgba(214,181,120,0.4)";
  ctx.lineWidth = 2;
  ctx.strokeRect(14, 14, 484, 356);
  ctx.textAlign = "center";
  ctx.fillStyle = "#c9b998";
  ctx.font = "600 30px Optima, Georgia, serif";
  wrapTextCenter(ctx, art.title, 256, 165, 440, 38);
  ctx.fillStyle = "#8d8069";
  ctx.font = "22px Optima, Georgia, serif";
  ctx.fillText(failed ? "image unavailable" : "· loading image ·", 256, 268, 440);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function wrapTextCenter(ctx, text, cx, y, maxW, lineH) {
  const words = text.split(" ");
  const lines = [];
  let line = "";
  for (const w of words) {
    const test = line ? line + " " + w : w;
    if (ctx.measureText(test).width > maxW && line) { lines.push(line); line = w; }
    else line = test;
  }
  if (line) lines.push(line);
  const y0 = y - ((lines.length - 1) * lineH) / 2;
  lines.forEach((l, i) => ctx.fillText(l, cx, y0 + i * lineH, maxW));
}
