// 3D annotation / feedback tool. Enabled with ?comment=1.
// Click any surface to drop a numbered pin and attach a note; notes persist in
// localStorage, list in a side panel, and export as Markdown for hand-off.
import * as THREE from "three";

const KEY = "museum-comments-v1";

export function initAnnotate(ctx) {
  const active = new URLSearchParams(location.search).get("comment") === "1";
  if (!active) return { active: false, handleClick() {} };

  const { scene, camera, controls, world, artManager } = ctx;
  const pins = new THREE.Group();
  scene.add(pins);
  const ray = new THREE.Raycaster();
  ray.far = 80;

  let comments = load();
  let pending = null; // {x,y,z,near}
  let listEl, editorEl, taEl;

  try {
    buildUI();
    comments.forEach(addPin);
    refreshList();
  } catch (e) {
    console.error("annotate setup failed:", e);
  }

  function load() {
    try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; }
  }
  function save() {
    // persist only the data — never the live THREE pin object
    const data = comments.map(({ x, y, z, note, near, n, t }) => ({ x, y, z, note, near, n, t }));
    localStorage.setItem(KEY, JSON.stringify(data));
  }

  function nearestLabel(p) {
    let best = null, bd = 3.2;
    for (const it of artManager.items) {
      const d = it.pos.distanceTo(p);
      if (d < bd) { bd = d; best = it.art.title; }
    }
    if (best) return best;
    const loc = world.locate(p);
    return loc ? `${loc.region}${loc.era && loc.era !== loc.region ? " · " + loc.era : ""}` : "scene";
  }

  function handleClick(nx, ny) {
    ray.setFromCamera(new THREE.Vector2(nx, ny), camera);
    const hits = ray.intersectObjects(scene.children, true)
      .filter((h) => !h.object.userData.annotPin && h.object.visible && h.object.type === "Mesh");
    if (!hits.length) return;
    const p = hits[0].point;
    pending = { x: +p.x.toFixed(2), y: +p.y.toFixed(2), z: +p.z.toFixed(2), near: nearestLabel(p) };
    openEditor("");
  }

  // ---- pins ----
  function addPin(c) {
    const g = new THREE.Group();
    g.userData.annotPin = true;
    const head = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.16, 0),
      new THREE.MeshBasicMaterial({ color: 0xffd24a }));
    head.userData.annotPin = true;
    const stem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.02, 0.02, 0.5, 6),
      new THREE.MeshBasicMaterial({ color: 0xffd24a }));
    stem.position.y = -0.33; stem.userData.annotPin = true;
    const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: numberTex(c.n), depthTest: false }));
    spr.scale.set(0.7, 0.7, 1); spr.position.y = 0.42; spr.userData.annotPin = true;
    g.add(head, stem, spr);
    g.position.set(c.x, c.y, c.z);
    c._pin = g;
    pins.add(g);
  }
  function rebuildPins() {
    [...pins.children].forEach((p) => pins.remove(p));
    comments.forEach((c, i) => { c.n = i + 1; addPin(c); });
  }

  function commit(note) {
    if (!pending) return;
    comments.push({ ...pending, note, n: comments.length + 1, t: Date.now() });
    addPin(comments[comments.length - 1]);
    save(); refreshList();
    pending = null;
  }
  function remove(i) {
    comments.splice(i, 1);
    rebuildPins(); save(); refreshList();
  }
  function lookAt(c) {
    const from = controls.pos;
    const dx = c.x - from.x, dz = c.z - from.z, dy = c.y - from.y;
    controls.yaw = Math.atan2(-dx, -dz);
    controls.pitch = Math.max(-0.7, Math.min(0.7, Math.atan2(dy, Math.hypot(dx, dz))));
  }

  // ---- DOM ----
  function buildUI() {
    const banner = el("div", "annot-banner", "COMMENT MODE · click any surface to leave feedback");
    const cross = el("div", "annot-cross", "");
    const panel = el("div", "annot-panel", "");
    panel.innerHTML = `<div class="annot-head">Feedback <span id="annot-count"></span>
      <button id="annot-hide" title="collapse">–</button></div>
      <div id="annot-list"></div>
      <div class="annot-actions">
        <button id="annot-copy">Copy all</button>
        <button id="annot-clear">Clear all</button>
      </div>`;
    const editor = el("div", "annot-editor", "");
    editor.hidden = true;
    editor.innerHTML = `<div class="annot-ed-near" id="annot-ednear"></div>
      <textarea id="annot-ta" rows="3" placeholder="Type your feedback…"></textarea>
      <div class="annot-ed-btns"><button id="annot-cancel">Cancel</button>
      <button id="annot-save" class="primary">Save pin</button></div>`;
    document.body.append(banner, cross, panel, editor);
    listEl = panel.querySelector("#annot-list");
    editorEl = editor;
    taEl = editor.querySelector("#annot-ta");

    panel.querySelector("#annot-copy").onclick = copyAll;
    panel.querySelector("#annot-clear").onclick = () => { if (confirm("Delete all feedback pins?")) { comments = []; rebuildPins(); save(); refreshList(); } };
    panel.querySelector("#annot-hide").onclick = (e) => { panel.classList.toggle("collapsed"); e.target.textContent = panel.classList.contains("collapsed") ? "+" : "–"; };
    editor.querySelector("#annot-cancel").onclick = () => { editorEl.hidden = true; pending = null; };
    editor.querySelector("#annot-save").onclick = () => { commit(taEl.value.trim()); editorEl.hidden = true; };
    taEl.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { commit(taEl.value.trim()); editorEl.hidden = true; }
      e.stopPropagation();
    });
  }

  function openEditor(text) {
    editorEl.querySelector("#annot-ednear").textContent = "on: " + pending.near;
    taEl.value = text;
    editorEl.hidden = false;
    setTimeout(() => taEl.focus(), 30);
  }

  function refreshList() {
    document.getElementById("annot-count").textContent = `(${comments.length})`;
    listEl.innerHTML = "";
    comments.forEach((c, i) => {
      const row = document.createElement("div");
      row.className = "annot-item";
      row.innerHTML = `<span class="annot-n">${i + 1}</span>
        <div class="annot-body"><div class="annot-note"></div><div class="annot-near"></div></div>
        <button class="annot-look" title="look at">◎</button>
        <button class="annot-del" title="delete">×</button>`;
      row.querySelector(".annot-note").textContent = c.note || "(no text)";
      row.querySelector(".annot-near").textContent = c.near;
      row.querySelector(".annot-look").onclick = () => lookAt(c);
      row.querySelector(".annot-del").onclick = () => remove(i);
      listEl.appendChild(row);
    });
  }

  function copyAll() {
    const md = ["# Museum feedback (" + comments.length + ")", ""];
    comments.forEach((c, i) => md.push(`${i + 1}. **${c.near}** — ${c.note || "(no text)"}  \n   \`(${c.x}, ${c.y}, ${c.z})\``));
    const text = md.join("\n");
    navigator.clipboard?.writeText(text).then(
      () => flashBtn("#annot-copy", "Copied!"),
      () => flashBtn("#annot-copy", "Copy failed"));
  }
  function flashBtn(sel, msg) {
    const b = document.querySelector(sel); const o = b.textContent;
    b.textContent = msg; setTimeout(() => (b.textContent = o), 1400);
  }

  return { active: true, handleClick };
}

function el(tag, id, text) { const e = document.createElement(tag); e.id = id; if (text) e.textContent = text; return e; }

function numberTex(n) {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const x = c.getContext("2d");
  x.fillStyle = "rgba(20,16,10,0.85)"; x.beginPath(); x.arc(32, 32, 30, 0, 7); x.fill();
  x.strokeStyle = "#ffd24a"; x.lineWidth = 3; x.stroke();
  x.fillStyle = "#ffe9a8"; x.font = "bold 34px sans-serif";
  x.textAlign = "center"; x.textBaseline = "middle"; x.fillText(String(n), 32, 34);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
