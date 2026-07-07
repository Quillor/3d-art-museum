// Procedural canvas textures — every wall, floor and ceiling surface in the
// museum is generated here; no external image assets are used for the
// architecture. All generators are deterministic (seeded RNG).
import * as THREE from "three";

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
  grime(ctx, 512, 512, rand, { speckle: 1400, alpha: 0.035, blotch: 18, blotchAlpha: 0.05, ...opts });
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

// ---------- Floors ----------

export function checkerFloor(a = "#ded5c2", b = "#3d3833", seed = 6) {
  const [c, ctx] = canvas(512, 512);
  const rand = rng(seed);
  const n = 4, s = 512 / n;
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++) {
      ctx.fillStyle = (i + j) % 2 ? b : a;
      ctx.fillRect(i * s, j * s, s, s);
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
    ctx.strokeStyle = "rgba(30,18,8,0.55)";
    ctx.lineWidth = 2;
    ctx.strokeRect(i * pw + 1, -2, pw - 2, 516);
    // grain
    ctx.strokeStyle = "rgba(40,24,10,0.22)";
    for (let g = 0; g < 7; g++) {
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      let x = i * pw + rand() * pw;
      ctx.moveTo(x, 0);
      for (let y = 0; y <= 512; y += 64) ctx.lineTo(x + (rand() - 0.5) * 7, y);
      ctx.stroke();
    }
    // butt joints
    const jy = rand() * 512;
    ctx.strokeStyle = "rgba(30,18,8,0.6)";
    ctx.beginPath(); ctx.moveTo(i * pw, jy); ctx.lineTo((i + 1) * pw, jy); ctx.stroke();
  }
  grime(ctx, 512, 512, rand, { speckle: 500, alpha: 0.05 });
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
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 512, 128);
  ctx.strokeStyle = ink;
  ctx.lineWidth = 7;
  const step = 64;
  for (let x = 0; x < 512; x += step) {
    ctx.beginPath();
    ctx.moveTo(x + 6, 96);
    ctx.lineTo(x + 6, 40); ctx.lineTo(x + 26, 40); ctx.lineTo(x + 26, 60);
    ctx.lineTo(x + 46, 60); ctx.lineTo(x + 46, 80); ctx.lineTo(x + step + 2, 80);
    ctx.stroke();
  }
  ctx.strokeStyle = ink; ctx.lineWidth = 5;
  ctx.strokeRect(0, 8, 512, 112);
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
      ctx.fillStyle = "#3a2c1a";
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

// Kente/kuba-inspired painted triangles band (African traditions)
export function triangleBand(bg = "#7c4a2a", a = "#e0c27d", b = "#2e1d10", seed = 19) {
  const [c, ctx] = canvas(512, 128);
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

// ---------- Text signage ----------

export function signTexture(main, sub = "", opts = {}) {
  const { w = 1024, h = 256, bg = "rgba(16,13,10,0.92)", fg = "#d6b578",
          sub_fg = "#a89a82", border = true, mainSize = 72, subSize = 34 } = opts;
  const [c, ctx] = canvas(w, h);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);
  if (border) {
    ctx.strokeStyle = fg;
    ctx.lineWidth = 4;
    ctx.strokeRect(10, 10, w - 20, h - 20);
    ctx.lineWidth = 1.5;
    ctx.strokeRect(20, 20, w - 40, h - 40);
  }
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = fg;
  ctx.font = `600 ${mainSize}px Optima, Trajan, 'Times New Roman', serif`;
  const track = (s) => s.toUpperCase().split("").join(" ");
  ctx.fillText(track(main), w / 2, sub ? h * 0.40 : h * 0.5, w - 80);
  if (sub) {
    ctx.fillStyle = sub_fg;
    ctx.font = `${subSize}px Optima, 'Times New Roman', serif`;
    ctx.fillText(sub, w / 2, h * 0.72, w - 100);
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
