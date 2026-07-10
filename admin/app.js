// Curator Console — hidden product-management tool for the museum.
//
// AUDIO NOTE (per spec: "only 1 music audio at a time, mute by default"):
// this console NEVER imports js/audio.js and never embeds the museum in an
// <iframe> — each iframe would spin up its own AudioContext and stack looping
// scores. Instead it builds ONE scene with ONE renderer and zero audio, so
// previews are always silent. A dashboard toggle also lets you force the real
// museum to start muted (its persisted "museum-muted" preference).
import { createHarness, VIEW_ORDER } from "./harness.js";

/* ------------------------------------------------------------------ store */
// Feedback (ratings/notes/pins/general) is "global" — it lives server-side
// (admin/server.py -> admin/feedback-data.json) so it's shared across every
// browser/session that hits this server, not siloed per-browser. If the API
// isn't reachable (e.g. static hosting with no server.py) we transparently
// fall back to this-browser-only localStorage so the tool still works.
const STORE_KEY = "museum-admin-v1";       // localStorage fallback key
const THUMB_KEY = "museum-admin-thumbs-v1";
const ANGLE_THUMB_KEY = "museum-admin-angle-thumbs-v1";
const MUTE_KEY = "museum-muted";     // shared with js/audio.js
const API_URL = "api/feedback";      // relative to <base href> -> .../api/feedback
const EMPTY_STORE = () => ({ ratings: {}, notes: {}, pins: {}, general: {} });

let store = EMPTY_STORE();
let storeReady = false;
let offline = false;         // true once we've given up on the server API
let saveTimer = null;

async function initStore() {
  try {
    const res = await fetch(API_URL, { cache: "no-store" });
    if (!res.ok) throw new Error(`status ${res.status}`);
    const data = await res.json();
    store = { ...EMPTY_STORE(), ...data };
  } catch (e) {
    console.warn("Feedback server unavailable — falling back to this browser only.", e);
    offline = true;
    store = loadStoreLocal();
  }
  storeReady = true;
  route(); // repaint with the loaded data
  refreshFeedbackWidget();
}

function loadStoreLocal() {
  try {
    const s = JSON.parse(localStorage.getItem(STORE_KEY)) || {};
    return { ...EMPTY_STORE(), ...s };
  } catch { return EMPTY_STORE(); }
}
function saveStore() {
  refreshFeedbackWidget();   // keep the global feedback widget's badge/list in sync
  if (offline) {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(store)); } catch {}
    return;
  }
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(store),
    }).catch((e) => {
      console.warn("Failed to save feedback to server — switching to localStorage fallback.", e);
      offline = true;
      try { localStorage.setItem(STORE_KEY, JSON.stringify(store)); } catch {}
    });
  }, 250);
}
function loadThumbs() {
  try { return JSON.parse(localStorage.getItem(THUMB_KEY)) || {}; } catch { return {}; }
}
function persistThumbs() {
  try { localStorage.setItem(THUMB_KEY, JSON.stringify(thumbs)); }
  catch { /* quota — thumbnails are a cache, safe to drop */ }
}
function loadAngleThumbs() {
  try { return JSON.parse(localStorage.getItem(ANGLE_THUMB_KEY)) || {}; } catch { return {}; }
}
function persistAngleThumbs() {
  try { localStorage.setItem(ANGLE_THUMB_KEY, JSON.stringify(angleThumbs)); }
  catch { /* quota — angle previews are a cache, safe to drop */ }
}
let thumbs = loadThumbs();
let angleThumbs = loadAngleThumbs();

const getRating = (id) => store.ratings[id] || 0;
const getNote = (id, v) => (store.notes[id] || {})[v] || "";
const getGeneral = (id) => store.general[id] || "";
const getPins = (id, v) => (store.pins[id] || {})[v] || [];
function setRating(id, n) { if (n) store.ratings[id] = n; else delete store.ratings[id]; saveStore(); }
function setNote(id, v, txt) { (store.notes[id] = store.notes[id] || {})[v] = txt; saveStore(); }
function setGeneral(id, txt) { store.general[id] = txt; saveStore(); }
function setPins(id, v, arr) { (store.pins[id] = store.pins[id] || {})[v] = arr; saveStore(); }

function sectionHasFeedback(id) {
  if (getRating(id)) return true;
  if (getGeneral(id).trim()) return true;
  const n = store.notes[id] || {}, p = store.pins[id] || {};
  if (Object.values(n).some((t) => t && t.trim())) return true;
  if (Object.values(p).some((a) => a && a.length)) return true;
  return false;
}

/* --------------------------------------------------------------- helpers */
const raf = () => new Promise((r) => requestAnimationFrame(r));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function el(tag, props = {}, kids = []) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === "class") e.className = v;
    else if (k === "html") e.innerHTML = v;
    else if (k === "text") e.textContent = v;
    else if (k.startsWith("on") && typeof v === "function") e.addEventListener(k.slice(2), v);
    else if (v !== null && v !== undefined) e.setAttribute(k, v);
  }
  for (const kid of [].concat(kids)) if (kid) e.append(kid.nodeType ? kid : document.createTextNode(kid));
  return e;
}
let toastTimer;
function toast(msg) {
  let t = document.querySelector(".toast");
  if (!t) { t = el("div", { class: "toast" }); document.body.append(t); }
  t.textContent = msg; t.classList.add("show");
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove("show"), 1600);
}
async function copyText(txt) {
  try { await navigator.clipboard.writeText(txt); toast("Copied to clipboard"); }
  catch {
    const ta = el("textarea"); ta.value = txt; document.body.append(ta);
    ta.select(); document.execCommand("copy"); ta.remove(); toast("Copied to clipboard");
  }
}

// A plain `href="#/"` anchor resolves against admin/index.html's
// <base href="../"> (needed for the museum's asset paths) and lands on the
// MAIN APP's "#/" instead of staying on this page — so every "back" link
// navigates via JS instead of relying on href resolution.
function backLink(text, onclick) {
  const a = el("a", { class: "back", href: "#", text, onclick: (e) => { e.preventDefault(); onclick(); } });
  return a;
}

function starsEl(value, { readonly = false, big = false, onset } = {}) {
  const wrap = el("span", { class: "stars" + (readonly ? " readonly" : "") + (big ? " big-stars" : "") });
  for (let i = 1; i <= 5; i++) {
    const s = el("span", { class: "s" + (i <= value ? " on" : ""), text: "★" });
    if (!readonly) s.addEventListener("click", () => onset && onset(i));
    wrap.append(s);
  }
  return wrap;
}

/* ------------------------------------------------------------- rendering */
const canvas = document.getElementById("render-canvas");
const H = createHarness(canvas);
const SECTIONS = H.sections;
const byId = new Map(SECTIONS.map((s) => [s.id, s]));

// concept-art reference sheet per era (concept-art/subsections/<region>-<era>/
// Hallway-NN-<region>-<era>.png), resolved relative to <base href> (project root).
const CONCEPT_ART = {
  prehistoric: "concept-art/subsections/prehistoric/Hallway-01-prehistoric.png",
  mesoamerica: "concept-art/subsections/americas-mesoamerica/Hallway-02-americas-mesoamerica.png",
  andes: "concept-art/subsections/americas-andes/Hallway-03-americas-andes.png",
  nativenorth: "concept-art/subsections/americas-native-north/Hallway-04-americas-native-north.png",
  americas19: "concept-art/subsections/americas-19th-century/Hallway-05-americas-19th-century.png",
  americasmodern: "concept-art/subsections/americas-modern/Hallway-06-americas-modern.png",
  classical: "concept-art/subsections/europe-classical/Hallway-07-europe-classical.png",
  medieval: "concept-art/subsections/europe-medieval/Hallway-08-europe-medieval.png",
  renaissance: "concept-art/subsections/europe-renaissance/Hallway-09-europe-renaissance.png",
  baroque: "concept-art/subsections/europe-baroque/Hallway-10-europe-baroque.png",
  romantic: "concept-art/subsections/europe-romantic/Hallway-11-europe-romantic.png",
  impressionism: "concept-art/subsections/europe-impressionism/Hallway-12-europe-impressionism.png",
  euromodern: "concept-art/subsections/europe-modern/Hallway-13-europe-modern.png",
  neolithic: "concept-art/subsections/middle-east-neolithic/Hallway-14-middle-east-neolithic.png",
  mesopotamia: "concept-art/subsections/middle-east-mesopotamia/Hallway-15-middle-east-mesopotamia.png",
  persia: "concept-art/subsections/middle-east-persia/Hallway-16-middle-east-persia.png",
  islamic: "concept-art/subsections/middle-east-islamic/Hallway-17-middle-east-islamic.png",
  ottoman: "concept-art/subsections/middle-east-ottoman/Hallway-18-middle-east-ottoman.png",
  memodern: "concept-art/subsections/middle-east-modern/Hallway-19-middle-east-modern.png",
  indus: "concept-art/subsections/asia-indus/Hallway-20-asia-indus.png",
  china: "concept-art/subsections/asia-china/Hallway-21-asia-china.png",
  seasia: "concept-art/subsections/asia-southeast/Hallway-22-asia-southeast.png",
  japan: "concept-art/subsections/asia-japan/Hallway-23-asia-japan.png",
  southasia: "concept-art/subsections/asia-mughal/Hallway-24-asia-mughal.png",
  asiamodern: "concept-art/subsections/asia-modern/Hallway-25-asia-modern.png",
  egypt: "concept-art/subsections/africa-egypt/Hallway-26-africa-egypt.png",
  kingdoms: "concept-art/subsections/africa-kingdoms/Hallway-27-africa-kingdoms.png",
  traditions: "concept-art/subsections/africa-traditions/Hallway-28-africa-traditions.png",
  oceancient: "concept-art/subsections/oceania-ancient/Hallway-29-oceania-ancient.png",
  ocevoyage: "concept-art/subsections/oceania-voyagers/Hallway-30-oceania-voyagers.png",
  oceliving: "concept-art/subsections/oceania-living/Hallway-31-oceania-living.png",
};
const conceptArtFor = (s) => CONCEPT_ART[s.eraKey] || null;

// single live loop — only paints while the focus view is on screen & not frozen
let mode = "dash";
let current = null, curView = VIEW_ORDER[0].key, frozen = false;
let detailSub = "list";  // "list" (all angles) | "focus" (single live/annotate view)
let liveW = 0, liveH = 0;
let stageEl = null;
const t0 = performance.now();

function paintLive() {
  if (mode !== "detail" || detailSub !== "focus" || !current || frozen || !stageEl) return;
  const w = stageEl.clientWidth, h = stageEl.clientHeight;
  if (!w || !h) return;
  if (w !== liveW || h !== liveH) { liveW = w; liveH = h; H.resize(w, h); }
  H.applyView(current, curView);
  H.render(H.camera.position, (performance.now() - t0) / 1000);
}
// rAF gives smooth animation when the tab is focused; the interval is a
// fallback so a backgrounded/throttled tab still shows (and updates) a frame.
function frameLoop() { requestAnimationFrame(frameLoop); paintLive(); }
requestAnimationFrame(frameLoop);
setInterval(paintLive, 250);

// snapshot the current render into a small cached JPEG
function snapshotThumb(w = 384, h = 240) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  try {
    c.getContext("2d").drawImage(canvas, 0, 0, c.width, c.height);
    return c.toDataURL("image/jpeg", 0.62);
  } catch { return null; }
}

// render one section's given view into a still JPEG at w×h.
// Uses timers (not rAF) so it keeps progressing even when the tab is
// backgrounded and requestAnimationFrame is throttled to a crawl.
async function renderSnapshot(section, viewKey, w = 384, h = 240) {
  canvas.classList.remove("live");
  H.resize(w, h);
  H.applyView(section, viewKey);
  const cam = H.camera.position.clone();
  H.render(cam, 0.2);           // kicks off art/texture streaming for this spot
  await sleep(140);
  H.render(cam, 0.45);
  await sleep(220);
  H.render(cam, 0.7);
  return snapshotThumb(w, h);
}
const renderThumb = (section) => renderSnapshot(section, "entrance_out");
// angle-list previews are shown much larger than dashboard cover thumbs, so
// render them at a higher resolution or they'd look soft when scaled up.
const ANGLE_W = 720, ANGLE_H = 450;

let thumbGen = 0;   // generation token to cancel an in-flight pass
async function ensureThumbs() {
  const gen = ++thumbGen;
  // let common GLB/textures stream in before the very first pass
  if (!Object.keys(thumbs).length) await sleep(700);
  for (const s of SECTIONS) {
    if (gen !== thumbGen) return;            // superseded (navigated / regenerated)
    if (mode !== "dash") { await waitForDash(gen); if (gen !== thumbGen) return; }
    if (thumbs[s.id]) { paintCardThumb(s.id, thumbs[s.id]); continue; }
    let url = null;
    try { url = await renderThumb(s); } catch (e) { console.warn("thumb failed", s.id, e); }
    if (gen !== thumbGen) return;
    if (url) { thumbs[s.id] = url; persistThumbs(); paintCardThumb(s.id, url); }
  }
}
function waitForDash(gen) {
  return new Promise((res) => {
    const check = () => { if (gen !== thumbGen || mode === "dash") res(); else setTimeout(check, 300); };
    check();
  });
}
function paintCardThumb(id, url) {
  const t = document.querySelector(`.thumb[data-id="${CSS.escape(id)}"]`);
  if (t) { t.style.backgroundImage = `url(${url})`; const ph = t.querySelector(".ph"); if (ph) ph.remove(); }
}

/* ------------------------------------------------------ angle-list previews */
// Renders (and caches) a still snapshot per camera angle for the "all angles"
// list view. Runs sequentially against the one shared renderer/canvas, same
// trick as ensureThumbs() on the dashboard, and is cancellable via angleGen
// so navigating away/into focus mode mid-pass doesn't keep clobbering the canvas.
let angleGen = 0;
async function ensureAngleThumbs(section, onPaint) {
  const gen = ++angleGen;
  for (const v of VIEW_ORDER) {
    if (gen !== angleGen) return;                 // superseded
    const key = `${section.id}::${v.key}`;
    if (angleThumbs[key]) { onPaint(v.key, angleThumbs[key]); continue; }
    let url = null;
    try { url = await renderSnapshot(section, v.key, ANGLE_W, ANGLE_H); } catch (e) { console.warn("angle preview failed", key, e); }
    if (gen !== angleGen) return;
    if (url) { angleThumbs[key] = url; persistAngleThumbs(); onPaint(v.key, url); }
  }
}

/* ------------------------------------------------------------ dashboard */
const app = document.getElementById("app");
const REGION_LABELS = [...new Map(SECTIONS.map((s) => [s.regionKey, s.regionLabel]))];

let filters = { q: "", region: "all", rating: "all", sort: "order" };

function renderDashboard() {
  mode = "dash";
  current = null; stageEl = null;
  angleGen++;                          // cancel any in-flight angle-list preview pass
  canvas.classList.remove("live");
  document.body.appendChild(canvas);   // park the render canvas offscreen

  app.innerHTML = "";
  app.append(topBar());

  const tb = el("div", { class: "toolbar" });
  const search = el("input", { type: "search", placeholder: "Search sections…", value: filters.q });
  search.addEventListener("input", () => { filters.q = search.value; refreshGrid(); });

  const region = el("select");
  region.append(el("option", { value: "all", text: "All regions" }));
  for (const [key, label] of REGION_LABELS) region.append(el("option", { value: key, text: label }));
  region.value = filters.region;
  region.addEventListener("change", () => { filters.region = region.value; refreshGrid(); });

  const rating = el("select");
  [["all", "Any rating"], ["unrated", "Unrated"], ["rated", "Rated"],
   ["5", "★★★★★ (5)"], ["4", "★★★★ (4)"], ["3", "★★★ (3)"], ["2", "★★ (2)"], ["1", "★ (1)"]]
    .forEach(([v, l]) => rating.append(el("option", { value: v, text: l })));
  rating.value = filters.rating;
  rating.addEventListener("change", () => { filters.rating = rating.value; refreshGrid(); });

  const sort = el("select");
  [["order", "Museum order"], ["rating-desc", "Rating: high → low"],
   ["rating-asc", "Rating: low → high"], ["name", "Name (A–Z)"]]
    .forEach(([v, l]) => sort.append(el("option", { value: v, text: l })));
  sort.value = filters.sort;
  sort.addEventListener("change", () => { filters.sort = sort.value; refreshGrid(); });

  const count = el("span", { class: "count" });
  const spacer = el("span", { style: "flex:1" });

  const copyAll = el("button", { class: "small", text: "Copy all feedback",
    onclick: () => copyText(buildAllMarkdown()) });
  const regen = el("button", { class: "small", text: "Regenerate previews",
    onclick: () => { thumbs = {}; persistThumbs(); refreshGrid(); ensureThumbs(); } });

  tb.append(el("label", { text: "Filter" }), search, region, rating,
    el("label", { text: "Sort" }), sort, spacer, count, copyAll, regen);
  app.append(tb);

  const grid = el("div", { class: "grid" });
  app.append(grid);

  function refreshGrid() {
    const list = filteredSections();
    count.textContent = `${list.length} of ${SECTIONS.length} sections`;
    grid.innerHTML = "";
    for (const s of list) grid.append(card(s));
    // repaint thumbs we already have; queue the rest
    for (const s of list) if (thumbs[s.id]) paintCardThumb(s.id, thumbs[s.id]);
  }
  refreshGrid();
  ensureThumbs();
}

function filteredSections() {
  let list = SECTIONS.filter((s) => {
    if (filters.region !== "all" && s.regionKey !== filters.region) return false;
    const r = getRating(s.id);
    if (filters.rating === "unrated" && r) return false;
    if (filters.rating === "rated" && !r) return false;
    if (/^[1-5]$/.test(filters.rating) && r !== +filters.rating) return false;
    if (filters.q) {
      const q = filters.q.toLowerCase();
      if (!(s.name + " " + s.regionLabel + " " + s.period + " " + s.styleKey).toLowerCase().includes(q)) return false;
    }
    return true;
  });
  const s = filters.sort;
  if (s === "name") list = [...list].sort((a, b) => a.name.localeCompare(b.name));
  else if (s === "rating-desc") list = [...list].sort((a, b) => getRating(b.id) - getRating(a.id));
  else if (s === "rating-asc") list = [...list].sort((a, b) => getRating(a.id) - getRating(b.id));
  return list;
}

function topBar() {
  const bar = el("header", { class: "top" });
  const brand = el("div", { class: "brand" });
  brand.append(el("h1", { text: "🏛️ Curator Console" }),
    el("span", { class: "sub", text: "Timeline of Art — internal review & QA" }));
  const spacer = el("div", { class: "spacer" });

  // audio preference toggle (mute the real museum by default)
  const muted = localStorage.getItem(MUTE_KEY) !== "0"; // default: muted
  const chip = el("label", { class: "silent-chip", title: "Previews are always silent. This sets the live museum's saved audio preference." });
  const cb = el("input", { type: "checkbox" });
  cb.checked = muted;
  cb.addEventListener("change", () => localStorage.setItem(MUTE_KEY, cb.checked ? "1" : "0"));
  chip.append(cb, el("span", { html: "Museum starts <b>muted</b>" }));

  const silent = el("span", { class: "silent-chip", text: "🔇 Silent preview — single renderer, no audio" });
  bar.append(brand, spacer, silent, chip);
  return bar;
}

function card(s) {
  const c = el("div", { class: "card" });
  const thumb = el("button", { class: "thumb", "data-id": s.id, "aria-label": `Open ${s.name}`,
    onclick: () => (location.hash = `#/s/${encodeURIComponent(s.id)}`) });
  if (thumbs[s.id]) thumb.style.backgroundImage = `url(${thumbs[s.id]})`;
  else thumb.append(el("span", { class: "ph", html: 'rendering <span class="spin"></span>' }));
  thumb.append(el("span", { class: "region-tag", text: s.regionLabel }));

  const body = el("div", { class: "body" });
  body.append(el("h3", { text: s.name }), el("div", { class: "period", text: s.period }));

  const ratingRow = el("div", { class: "rating-row" });
  const rerender = () => {
    ratingRow.innerHTML = "";
    ratingRow.append(starsEl(getRating(s.id), { onset: (n) => { setRating(s.id, getRating(s.id) === n ? 0 : n); rerender(); refreshFootNote(); } }));
    if (getRating(s.id)) ratingRow.append(el("span", { class: "clear", text: "clear", onclick: () => { setRating(s.id, 0); rerender(); refreshFootNote(); } }));
  };
  rerender();
  body.append(ratingRow);

  const foot = el("div", { class: "foot" });
  const notes = el("span", { class: "has-notes" });
  const refreshFootNote = () => { notes.textContent = sectionHasFeedback(s.id) && !getRating(s.id) ? "✎ notes" : (getRating(s.id) && sectionHasFeedback(s.id) ? "✎ notes" : ""); };
  refreshFootNote();
  foot.append(notes, el("span", { class: "open", text: "Inspect →" }));
  body.append(foot);

  c.append(thumb, body);
  return c;
}

/* --------------------------------------------------------------- detail */
// Two sub-views share one section: "list" (default) shows all 8 camera
// angles at once with an inline note per angle + the concept-art reference;
// "focus" is the old single-canvas live/annotate view, reached by opening a
// specific angle (pin-dropping needs a live/frozen canvas + click coords).
function renderDetail(id) {
  const s = byId.get(id);
  if (!s) { location.hash = "#/"; return; }
  mode = "detail"; current = s; frozen = false;
  liveW = liveH = 0;
  app.innerHTML = "";
  app.append(backLink("← All sections", () => (location.hash = "#/")));

  const head = el("div", { class: "detail-head" });
  const meta = el("div", { class: "meta" });
  meta.append(el("h1", { text: s.name }),
    el("div", { class: "crumbs", html: `<b>${s.regionLabel}</b> &nbsp;·&nbsp; ${s.period} &nbsp;·&nbsp; style: <b>${s.styleKey}</b>${s.isCave ? " &nbsp;·&nbsp; (entrance corridor)" : ""}` }));
  head.append(meta);
  app.append(head);

  if (detailSub === "focus") renderFocusView(s, curView);
  else renderAngleList(s);
}

// side panel shared by both sub-views: rating, general notes, copy-to-Claude.
// `extra` (e.g. the per-view pin box) is spliced in after the rating box.
function buildSidePanel(s, extra) {
  const side = el("div", { class: "side" });

  const ratingBox = el("div", { class: "box" });
  ratingBox.append(el("h4", { text: "Rating" }));
  const rRow = el("div", { class: "rating-row" });
  const drawRating = () => {
    rRow.innerHTML = "";
    rRow.append(starsEl(getRating(s.id), { big: true, onset: (n) => { setRating(s.id, getRating(s.id) === n ? 0 : n); drawRating(); } }));
    if (getRating(s.id)) rRow.append(el("span", { class: "clear", text: "clear", onclick: () => { setRating(s.id, 0); drawRating(); } }));
  };
  drawRating();
  ratingBox.append(rRow);
  side.append(ratingBox);

  if (extra) side.append(extra);

  const genBox = el("div", { class: "box" });
  genBox.append(el("h4", { text: "General notes" }));
  const genTa = el("textarea", { placeholder: "Overall feedback for this section…" });
  genTa.value = getGeneral(s.id);
  genTa.addEventListener("input", () => setGeneral(s.id, genTa.value));
  genBox.append(genTa);
  side.append(genBox);

  const copyBox = el("div", { class: "box" });
  copyBox.append(el("h4", { text: "Send to Claude" }));
  const actions = el("div", { class: "copy-actions" });
  actions.append(
    el("button", { class: "primary", text: "Copy this section", onclick: () => copyText(buildSectionMarkdown(s)) }),
    el("button", { class: "ghost small", text: "Preview", onclick: () => alert(buildSectionMarkdown(s)) }),
  );
  copyBox.append(actions);
  side.append(copyBox);

  return side;
}

/* ---- "list" sub-view: all 8 angles + concept art, shown by default ---- */
function renderAngleList(s) {
  detailSub = "list";
  stageEl = null;
  canvas.classList.remove("live");
  document.body.appendChild(canvas);   // park the render canvas offscreen

  const layout = el("div", { class: "detail-layout" });
  const main = el("div", { class: "angle-main" });

  const art = conceptArtFor(s);
  if (art) {
    const box = el("div", { class: "concept-box" });
    box.append(el("h4", { text: "Concept art reference" }));
    const a = el("a", { href: art, target: "_blank", rel: "noopener" },
      el("img", { class: "concept-img", src: art, alt: `Concept art — ${s.name}`, loading: "lazy" }));
    box.append(a);
    main.append(box);
  }

  main.append(el("h4", { class: "angle-list-title", text: "All camera angles" }));
  const list = el("div", { class: "angle-list" });
  main.append(list);
  layout.append(main);

  const cards = {};
  for (const v of VIEW_ORDER) {
    const card = el("div", { class: "angle-card" });
    const shot = el("button", { class: "angle-shot", "aria-label": `Open ${v.label} live`,
      onclick: () => { curView = v.key; detailSub = "focus"; renderDetail(s.id); } });
    if (angleThumbs[`${s.id}::${v.key}`]) shot.style.backgroundImage = `url(${angleThumbs[`${s.id}::${v.key}`]})`;
    else shot.append(el("span", { class: "ph", html: 'rendering <span class="spin"></span>' }));
    const pins = getPins(s.id, v.key);
    if (pins.length) shot.append(el("span", { class: "pin-count", text: `📌 ${pins.length}` }));
    card.append(shot);

    const body = el("div", { class: "angle-body" });
    const headRow = el("div", { class: "angle-head" });
    headRow.append(el("span", { class: "angle-label", text: v.label }),
      el("button", { class: "small ghost", text: "Open live & annotate →",
        onclick: () => { curView = v.key; detailSub = "focus"; renderDetail(s.id); } }));
    body.append(headRow);
    const note = el("textarea", { class: "view-note", placeholder: "What should change about this view?" });
    note.value = getNote(s.id, v.key);
    note.addEventListener("input", () => setNote(s.id, v.key, note.value));
    body.append(note);
    card.append(body);

    list.append(card);
    cards[v.key] = shot;
  }

  layout.append(buildSidePanel(s));
  app.append(layout);

  ensureAngleThumbs(s, (key, url) => {
    const shot = cards[key];
    if (!shot) return;
    shot.style.backgroundImage = `url(${url})`;
    const ph = shot.querySelector(".ph");
    if (ph) ph.remove();
  });
}

/* ---- "focus" sub-view: single live canvas, tabs, annotate/pin — the ---- */
/* ---- original detail UI, now reached from an angle card ---- */
function renderFocusView(s, startView) {
  detailSub = "focus";
  curView = startView || VIEW_ORDER[0].key;
  angleGen++;                          // cancel any in-flight angle-list preview pass

  const layout = el("div", { class: "detail-layout" });

  const viewer = el("div", { class: "viewer" });
  viewer.append(backLink("← All angles", () => { detailSub = "list"; renderDetail(s.id); }));

  const tabs = el("div", { class: "view-tabs" });
  const tabBtns = {};
  for (const v of VIEW_ORDER) {
    const b = el("button", { text: v.label, onclick: () => selectView(v.key) });
    tabBtns[v.key] = b;
    tabs.append(b);
  }
  viewer.append(tabs);

  const stage = el("div", { class: "stage" });
  stageEl = stage;
  const pinLayer = el("div", { class: "pin-layer" });
  pinLayer.addEventListener("click", onStageClick);
  stage.append(pinLayer);
  viewer.append(stage);

  const bar = el("div", { class: "stage-bar" });
  const viewLabel = el("span", { class: "label" });
  const annotateBtn = el("button", { class: "small", text: "📌 Annotate" });
  const refreshBtn = el("button", { class: "small ghost", text: "↻ Nudge render",
    title: "Re-trigger art/texture streaming for this view" });
  const hint = el("span", { class: "hint" });
  bar.append(viewLabel, el("span", { class: "spacer" }), hint, refreshBtn, annotateBtn);
  viewer.append(bar);

  // per-view note textarea
  viewer.append(el("div", { class: "note-label", text: "Note for this view" }));
  const viewNote = el("textarea", { class: "view-note", placeholder: "What should change about this view?" });
  viewer.append(viewNote);

  layout.append(viewer);

  const pinBox = el("div", { class: "box" });
  pinBox.append(el("h4", { text: "Pins on this view" }));
  const pinList = el("div", { class: "pin-list" });
  pinBox.append(pinList);

  layout.append(buildSidePanel(s, pinBox));
  app.append(layout);

  /* --- view logic --- */
  function selectView(key) {
    curView = key;
    frozen = false;
    stage.classList.remove("annotating");
    annotateBtn.textContent = "📌 Annotate";
    liveW = liveH = 0;                    // force a resize/repaint
    for (const [k, b] of Object.entries(tabBtns)) b.classList.toggle("active", k === key);
    const label = VIEW_ORDER.find((v) => v.key === key).label;
    viewLabel.textContent = label;
    hint.textContent = "live";
    // per-view note binding
    viewNote.value = getNote(s.id, key);
    viewNote.oninput = () => { setNote(s.id, key, viewNote.value); };
    canvas.classList.add("live");
    stage.insertBefore(canvas, pinLayer);  // put the live canvas under the pin layer
    drawPins();
    paintLive();                            // immediate first frame
    setTimeout(paintLive, 40);              // again once layout settles
  }

  annotateBtn.addEventListener("click", () => {
    frozen = !frozen;
    stage.classList.toggle("annotating", frozen);
    annotateBtn.textContent = frozen ? "✓ Done annotating" : "📌 Annotate";
    hint.textContent = frozen ? "frozen — click the image to drop pins" : "live";
    if (frozen) H.render(H.camera.position, (performance.now() - t0) / 1000); // freeze a fresh frame
  });

  refreshBtn.addEventListener("click", () => {
    H.artManager.update(H.camera.position);
    H.render(H.camera.position, (performance.now() - t0) / 1000);
    toast("Nudged — art/textures streaming");
  });

  function onStageClick(e) {
    if (!frozen) { toast("Turn on 📌 Annotate first"); return; }
    const rect = pinLayer.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    const arr = getPins(s.id, curView).slice();
    arr.push({ x: +x.toFixed(4), y: +y.toFixed(4), note: "" });
    setPins(s.id, curView, arr);
    drawPins();
    // focus the freshly added note input
    const inputs = pinList.querySelectorAll("input");
    inputs[inputs.length - 1]?.focus();
  }

  function drawPins() {
    // markers on the stage
    stage.querySelectorAll(".pin").forEach((p) => p.remove());
    const arr = getPins(s.id, curView);
    arr.forEach((p, i) => {
      const m = el("div", { class: "pin", style: `left:${p.x * 100}%; top:${p.y * 100}%` },
        el("span", { text: String(i + 1) }));
      stage.append(m);
    });
    // list in the side panel
    pinList.innerHTML = "";
    if (!arr.length) { pinList.append(el("div", { class: "empty-hint", text: "No pins. Turn on Annotate, then click the image to mark a spot." })); return; }
    arr.forEach((p, i) => {
      const item = el("div", { class: "pin-item" });
      const input = el("input", { value: p.note, placeholder: `Note for pin ${i + 1}…`,
        style: "flex:1; background:var(--bg2); border:1px solid var(--line); color:var(--ink); border-radius:7px; padding:6px 8px; font:inherit" });
      input.addEventListener("input", () => { const a = getPins(s.id, curView).slice(); a[i] = { ...a[i], note: input.value }; setPins(s.id, curView, a); });
      const del = el("span", { class: "del", text: "✕", title: "Delete pin",
        onclick: () => { const a = getPins(s.id, curView).slice(); a.splice(i, 1); setPins(s.id, curView, a); drawPins(); } });
      item.append(el("span", { class: "num", text: String(i + 1) }), input, del);
      pinList.append(item);
    });
  }

  selectView(curView);
}

/* ----------------------------------------------------- markdown export */
function labelFor(v) { return VIEW_ORDER.find((x) => x.key === v).label; }

function buildSectionMarkdown(s) {
  const lines = [];
  lines.push(`## Feedback — ${s.name} (${s.regionLabel} · ${s.period})`);
  lines.push(`Section id: \`${s.id}\`  ·  style: \`${s.styleKey}\``);
  const r = getRating(s.id);
  lines.push(`Rating: ${r ? "★".repeat(r) + "☆".repeat(5 - r) + ` (${r}/5)` : "— not rated"}`);
  lines.push("");
  let any = false;
  for (const v of VIEW_ORDER) {
    const note = getNote(s.id, v.key).trim();
    const pins = getPins(s.id, v.key);
    if (!note && !pins.length) continue;
    any = true;
    lines.push(`### ${labelFor(v.key)}`);
    if (note) lines.push(note);
    pins.forEach((p, i) => {
      const loc = `${Math.round(p.x * 100)}% across, ${Math.round(p.y * 100)}% down`;
      lines.push(`- 📌 Pin ${i + 1} (${loc}): ${p.note.trim() || "(no note)"}`);
    });
    lines.push("");
  }
  const gen = getGeneral(s.id).trim();
  if (gen) { lines.push("### General notes", gen, ""); any = true; }
  if (!any && !r) lines.push("_No feedback recorded yet._");
  return lines.join("\n").trim() + "\n";
}

function buildAllMarkdown() {
  const rated = SECTIONS.filter((s) => sectionHasFeedback(s.id));
  if (!rated.length) return "# Museum review\n\n_No sections rated or annotated yet._\n";
  const out = ["# Museum review — Curator Console export", "",
    `${rated.length} section(s) with feedback.`, ""];
  for (const s of rated) { out.push(buildSectionMarkdown(s)); out.push("\n---\n"); }
  return out.join("\n");
}

/* ------------------------------------------------------------ feedback widget */
// A floating, always-present summary of feedback across every section (not
// just what's on screen) — lets a reviewer see/clear the whole review without
// hunting through 31 sections one at a time. Appended once to <body>, so it
// survives dashboard/detail route() re-renders untouched.
const fabBadge = el("span", { class: "fab-badge hide" });
const fab = el("button", { class: "feedback-fab", "aria-label": "Open feedback summary",
  onclick: () => togglePanel() });
fab.append(el("span", { class: "fab-icon", text: "💬" }), fabBadge);

const panel = el("div", { class: "feedback-panel" });
document.body.append(fab, panel);

let panelOpen = false;
function togglePanel(force) {
  panelOpen = force !== undefined ? force : !panelOpen;
  panel.classList.toggle("open", panelOpen);
  if (panelOpen) renderFeedbackPanel();
}

function refreshFeedbackWidget() {
  const list = SECTIONS.filter((s) => sectionHasFeedback(s.id));
  fabBadge.textContent = String(list.length);
  fabBadge.classList.toggle("hide", list.length === 0);
  if (panelOpen) renderFeedbackPanel();
}

function renderFeedbackPanel() {
  const list = SECTIONS.filter((s) => sectionHasFeedback(s.id));
  panel.innerHTML = "";

  const head = el("div", { class: "fp-head" });
  head.append(el("h4", { text: `Feedback across sections (${list.length})` }),
    el("button", { class: "small ghost", text: "✕", onclick: () => togglePanel(false) }));
  panel.append(head);

  const actions = el("div", { class: "fp-actions" });
  const clearAllBtn = el("button", { class: "small ghost danger", text: "Clear all…",
    onclick: () => {
      if (!list.length) return;
      if (confirm(`Clear feedback for all ${list.length} section(s)? This can't be undone.`)) clearAllFeedback();
    } });
  if (!list.length) clearAllBtn.disabled = true;
  actions.append(
    el("button", { class: "small", text: "Copy all feedback", onclick: () => copyText(buildAllMarkdown()) }),
    clearAllBtn,
  );
  panel.append(actions);

  const body = el("div", { class: "fp-list" });
  panel.append(body);
  if (!list.length) { body.append(el("div", { class: "empty-hint", text: "No feedback recorded yet." })); return; }

  for (const s of list) {
    const row = el("div", { class: "fp-row" });
    const r = getRating(s.id);
    const pinCount = Object.values(store.pins[s.id] || {}).reduce((n, a) => n + (a?.length || 0), 0);
    const noteCount = Object.values(store.notes[s.id] || {}).filter((t) => t && t.trim()).length;
    const metaBits = [
      r ? "★".repeat(r) : null,
      noteCount ? `${noteCount} note${noteCount > 1 ? "s" : ""}` : null,
      pinCount ? `${pinCount} pin${pinCount > 1 ? "s" : ""}` : null,
      getGeneral(s.id).trim() ? "general" : null,
    ].filter(Boolean).join(" · ") || "—";
    const info = el("a", { class: "fp-info", href: "#",
      onclick: (e) => { e.preventDefault(); togglePanel(false); location.hash = `#/s/${encodeURIComponent(s.id)}`; } });
    info.append(el("span", { class: "fp-name", text: s.name }), el("span", { class: "fp-meta", text: metaBits }));
    row.append(info, el("span", { class: "fp-del", text: "✕", title: "Clear feedback for this section",
      onclick: () => { if (confirm(`Clear feedback for "${s.name}"?`)) clearSectionFeedback(s.id); } }));
    body.append(row);
  }
}

function clearSectionFeedback(id) {
  delete store.ratings[id]; delete store.notes[id]; delete store.pins[id]; delete store.general[id];
  saveStore();     // also refreshes the widget
  route();         // repaint whatever's on screen so it reflects the clear
  toast("Feedback cleared");
}
function clearAllFeedback() {
  store = EMPTY_STORE();
  saveStore();
  route();
  toast("All feedback cleared");
}

/* --------------------------------------------------------------- router */
function route() {
  const m = location.hash.match(/^#\/s\/(.+)$/);
  // hash-driven navigation (typed URL, browser back/forward, dashboard card
  // click) always lands on the angle list; the list<->focus toggle within a
  // section calls renderDetail() directly (not via the hash) and sets
  // detailSub itself, so it isn't clobbered here.
  if (m) { detailSub = "list"; renderDetail(decodeURIComponent(m[1])); }
  else renderDashboard();
}
window.addEventListener("hashchange", route);
route();          // first paint (empty store while the fetch above resolves)
initStore();      // load global feedback, then re-route to repaint with it

// debug hook
Object.defineProperty(window, "__admin", { get: () => ({ H, SECTIONS, store, thumbs, angleThumbs, offline }) });
