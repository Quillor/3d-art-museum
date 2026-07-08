// DOM overlay: intro splash, era HUD chip, hint bar, artwork modal, and the
// fullscreen pinch-to-zoom image viewer.
import { IMAGE_URLS } from "./data/imageUrls.js";
import { ERAS } from "./data/artworks.js";

const $ = (id) => document.getElementById(id);

export const isTouch = matchMedia("(pointer: coarse)").matches || "ontouchstart" in window;

export function initUI({ onEnter }) {
  const intro = $("intro");
  const controls = $("intro-controls");
  controls.innerHTML = isTouch
    ? `<div><span class="k">swipe ↑↓</span> walk forward / back</div>
       <div><span class="k">swipe ←→</span> turn</div>
       <div><span class="k">tap art</span> read its story</div>`
    : `<div><span class="k">↑</span><span class="k">↓</span> walk — hold to speed up &nbsp;·&nbsp; <span class="k">←</span><span class="k">→</span> turn</div>
       <div><span class="k">two-finger swipe</span> glide with momentum</div>
       <div><span class="k">drag</span> look around &nbsp;·&nbsp; <span class="k">click art</span> read its story</div>`;

  $("enter-btn").addEventListener("click", () => {
    intro.classList.add("hidden");
    $("hud").hidden = false;
    showHint(isTouch
      ? "Swipe to walk toward the light — tap a painting to learn more"
      : "Walk toward the light — ↑ to move, click a painting to learn more");
    onEnter();
  });

  $("panel-close").addEventListener("click", closePanel);
  $("panel-img").addEventListener("click", openZoom);
  initZoomer();
  window.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (!$("zoomer").hidden) closeZoom();
    else closePanel();
  });
}

export function worldReady() {
  $("loading").classList.add("hidden");
}

let hintTimer = null;
export function showHint(text, ms = 7000) {
  const bar = $("hint-bar");
  bar.textContent = text;
  bar.classList.remove("faded");
  clearTimeout(hintTimer);
  hintTimer = setTimeout(() => bar.classList.add("faded"), ms);
}

let lastEraKey = "";
export function setEra(loc) {
  if (!loc) return;
  const key = loc.region + loc.era;
  if (key === lastEraKey) return;
  lastEraKey = key;
  $("era-region").textContent = loc.region === loc.era ? loc.region : `${loc.region} — ${loc.era}`;
  $("era-period").textContent = loc.period;
}

// ---------------- Artwork modal ----------------

let panelOpen = false;
let currentUrl = null;
let currentId = null;

export function openPanel(item) {
  const { art } = item;
  $("panel-title").textContent = art.title;
  $("panel-artist").textContent = art.artist;
  $("panel-date").textContent = art.date;
  const era = ERAS[item.eraKey];
  $("panel-context").textContent = `${item.region} · ${era ? era.label : ""}${era ? " · " + era.period : ""}`;
  $("panel-desc").textContent = art.desc;

  const img = $("panel-img");
  const wrap = $("panel-imgwrap");
  currentUrl = IMAGE_URLS[art.id] || null;
  currentId = art.id;
  if (currentUrl || currentId) {
    wrap.style.display = "";
    // offline-first: local copy, fall back to remote
    img.onerror = () => { img.onerror = null; if (currentUrl) img.src = currentUrl; };
    img.src = `assets/art/${art.id}.jpg`;
    img.alt = art.title;
  } else {
    wrap.style.display = "none";
  }

  const panel = $("panel");
  panel.hidden = false;
  requestAnimationFrame(() => panel.classList.add("open"));
  panelOpen = true;
}

export function closePanel() {
  const panel = $("panel");
  panel.classList.remove("open");
  panelOpen = false;
  setTimeout(() => { if (!panelOpen) panel.hidden = true; }, 350);
}

export function isPanelOpen() { return panelOpen; }

// ---------------- Fullscreen viewer with pinch / scroll zoom ----------------

let Z = null; // zoomer state

function initZoomer() {
  const el = $("zoomer"), img = $("zoomer-img");
  Z = { el, img, scale: 1, tx: 0, ty: 0, pointers: new Map(), pinch: null };
  $("zoomer-close").addEventListener("click", closeZoom);
  el.addEventListener("click", (e) => { if (e.target === el) closeZoom(); });

  el.addEventListener("pointerdown", (e) => {
    el.setPointerCapture(e.pointerId);
    Z.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (Z.pointers.size === 2) {
      const [a, b] = [...Z.pointers.values()];
      Z.pinch = { d0: Math.hypot(a.x - b.x, a.y - b.y), s0: Z.scale };
    }
  });
  el.addEventListener("pointermove", (e) => {
    const p = Z.pointers.get(e.pointerId);
    if (!p) return;
    const px = e.clientX, py = e.clientY;
    if (Z.pointers.size === 2 && Z.pinch) {
      p.x = px; p.y = py;
      const [a, b] = [...Z.pointers.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      const cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2;
      zoomAbout(cx, cy, (Z.pinch.s0 * d) / Z.pinch.d0);
    } else if (Z.pointers.size === 1 && Z.scale > 1) {
      Z.tx += px - p.x;
      Z.ty += py - p.y;
      p.x = px; p.y = py;
      applyTransform();
    } else {
      p.x = px; p.y = py;
    }
  });
  const up = (e) => {
    Z.pointers.delete(e.pointerId);
    if (Z.pointers.size < 2) Z.pinch = null;
  };
  el.addEventListener("pointerup", up);
  el.addEventListener("pointercancel", up);

  el.addEventListener("wheel", (e) => {
    e.preventDefault();
    zoomAbout(e.clientX, e.clientY, Z.scale * Math.exp(-e.deltaY * 0.0022));
  }, { passive: false });

  el.addEventListener("dblclick", (e) => {
    zoomAbout(e.clientX, e.clientY, Z.scale > 1.6 ? 1 : 3);
  });
}

function zoomAbout(cx, cy, s) {
  s = Math.max(1, Math.min(8, s));
  // keep the image point under (cx, cy) fixed while the scale changes
  const vx = cx - innerWidth / 2, vy = cy - innerHeight / 2;
  const k = s / Z.scale;
  Z.tx = vx - (vx - Z.tx) * k;
  Z.ty = vy - (vy - Z.ty) * k;
  Z.scale = s;
  if (s === 1) { Z.tx = 0; Z.ty = 0; }
  applyTransform();
}

function applyTransform() {
  // limit panning so the image can't be flung entirely off screen
  const lim = (Z.scale - 1) * Math.max(innerWidth, innerHeight) * 0.55 + 40;
  Z.tx = Math.max(-lim, Math.min(lim, Z.tx));
  Z.ty = Math.max(-lim, Math.min(lim, Z.ty));
  Z.img.style.transform = `translate(${Z.tx}px, ${Z.ty}px) scale(${Z.scale})`;
}

function openZoom() {
  if (!currentUrl && !currentId) return;
  Z.scale = 1; Z.tx = 0; Z.ty = 0;
  applyTransform();
  // offline-first: local copy → higher-res remote rendition → known-good remote
  const local = currentId ? `assets/art/${currentId}.jpg` : null;
  const hi = currentUrl ? currentUrl.replace(/\/(\d+)px-/, "/2560px-") : null;
  let stage = 0;
  // best quality when online (2560), local copy when offline, then any fallback
  const chain = [...new Set([hi, local, currentUrl].filter(Boolean))];
  Z.img.onerror = () => { stage++; if (stage < chain.length) Z.img.src = chain[stage]; else Z.img.onerror = null; };
  Z.img.src = chain[0];
  $("zoomer-hint").textContent = isTouch
    ? "pinch to zoom · drag to pan · tap outside to close"
    : "scroll to zoom · drag to pan · double-click to toggle";
  const el = Z.el;
  el.hidden = false;
  requestAnimationFrame(() => el.classList.add("open"));
}

function closeZoom() {
  Z.el.classList.remove("open");
  setTimeout(() => { Z.el.hidden = true; Z.img.src = ""; }, 260);
}
