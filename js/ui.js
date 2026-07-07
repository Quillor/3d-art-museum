// DOM overlay: intro splash, era HUD chip, hint bar, artwork info panel.
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
  window.addEventListener("keydown", (e) => { if (e.key === "Escape") closePanel(); });
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

let panelOpen = false;
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
  const url = IMAGE_URLS[art.id];
  if (url) {
    wrap.style.display = "";
    img.src = url;
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
