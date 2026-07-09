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
const STORE_KEY = "museum-admin-v1";
const THUMB_KEY = "museum-admin-thumbs-v1";
const MUTE_KEY = "museum-muted";     // shared with js/audio.js

const store = loadStore();
let thumbs = loadThumbs();

function loadStore() {
  try {
    const s = JSON.parse(localStorage.getItem(STORE_KEY)) || {};
    return { ratings: {}, notes: {}, pins: {}, general: {}, ...s };
  } catch { return { ratings: {}, notes: {}, pins: {}, general: {} }; }
}
function saveStore() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(store)); } catch {}
}
function loadThumbs() {
  try { return JSON.parse(localStorage.getItem(THUMB_KEY)) || {}; } catch { return {}; }
}
function persistThumbs() {
  try { localStorage.setItem(THUMB_KEY, JSON.stringify(thumbs)); }
  catch { /* quota — thumbnails are a cache, safe to drop */ }
}

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

// single live loop — only paints while a detail view is on screen & not frozen
let mode = "dash";
let current = null, curView = VIEW_ORDER[0].key, frozen = false;
let liveW = 0, liveH = 0;
let stageEl = null;
const t0 = performance.now();

function paintLive() {
  if (mode !== "detail" || !current || frozen || !stageEl) return;
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
function snapshotThumb() {
  const c = document.createElement("canvas");
  c.width = 384; c.height = 240;
  try {
    c.getContext("2d").drawImage(canvas, 0, 0, c.width, c.height);
    return c.toDataURL("image/jpeg", 0.62);
  } catch { return null; }
}

// render one section's cover shot (entrance from outside) into the thumb cache.
// Uses timers (not rAF) so it keeps progressing even when the tab is
// backgrounded and requestAnimationFrame is throttled to a crawl.
async function renderThumb(section) {
  canvas.classList.remove("live");
  H.resize(384, 240);
  H.applyView(section, "entrance_out");
  const cam = H.camera.position.clone();
  H.render(cam, 0.2);           // kicks off art/texture streaming for this spot
  await sleep(140);
  H.render(cam, 0.45);
  await sleep(220);
  H.render(cam, 0.7);
  return snapshotThumb();
}

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

/* ------------------------------------------------------------ dashboard */
const app = document.getElementById("app");
const REGION_LABELS = [...new Map(SECTIONS.map((s) => [s.regionKey, s.regionLabel]))];

let filters = { q: "", region: "all", rating: "all", sort: "order" };

function renderDashboard() {
  mode = "dash";
  current = null; stageEl = null;
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
function renderDetail(id) {
  const s = byId.get(id);
  if (!s) { location.hash = "#/"; return; }
  mode = "detail"; current = s; frozen = false; curView = VIEW_ORDER[0].key;
  liveW = liveH = 0;
  app.innerHTML = "";

  app.append(el("a", { class: "back", href: "#/", text: "← All sections" }));

  const head = el("div", { class: "detail-head" });
  const meta = el("div", { class: "meta" });
  meta.append(el("h1", { text: s.name }),
    el("div", { class: "crumbs", html: `<b>${s.regionLabel}</b> &nbsp;·&nbsp; ${s.period} &nbsp;·&nbsp; style: <b>${s.styleKey}</b>${s.isCave ? " &nbsp;·&nbsp; (entrance corridor)" : ""}` }));
  head.append(meta);
  app.append(head);

  const layout = el("div", { class: "detail-layout" });

  /* --- viewer column --- */
  const viewer = el("div", { class: "viewer" });
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

  /* --- side column --- */
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

  const pinBox = el("div", { class: "box" });
  pinBox.append(el("h4", { text: "Pins on this view" }));
  const pinList = el("div", { class: "pin-list" });
  pinBox.append(pinList);
  side.append(pinBox);

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

  layout.append(side);
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

/* --------------------------------------------------------------- router */
function route() {
  const m = location.hash.match(/^#\/s\/(.+)$/);
  if (m) renderDetail(decodeURIComponent(m[1]));
  else renderDashboard();
}
window.addEventListener("hashchange", route);
route();

// debug hook
window.__admin = { H, SECTIONS, store, thumbs };
