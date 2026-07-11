// Hidden Live Mode for /entity — press L (or open ?live=1).
// Embeds the real museum (../) in a picture-in-picture iframe and taps its
// window.__museum debug hook (same origin, zero changes to the app) to
// narrate runtime processes and fire the matching graph relationships live:
// walk the halls over there, watch nodes pulse and edges flash over here.

const POLL_MS = 250;
const SAVE_KEY = "museum.pos.v2";
const SRC_COLORS = {
  "world.js": "#f0a24a", "art.js": "#c987e8", "controls.js": "#6fd3a8",
  "ui.js": "#8fb7f0", "audio.js": "#f0d264", "persist.js": "#9fa8bc",
  "main.js": "#ff8d7e", "live": "#4cc3e8",
};

let api = null, active = false;
let root = null, logBody = null, statsEl = null, statusDot = null, followEl = null, iframe = null;
let timer = null, last = null;

const eraNodeId = (eraKey) =>
  eraKey === "hub" ? "concept:rotunda" :
  eraKey === "prehistoric" ? "concept:cave" : `era:${eraKey}`;

export function toggleLive(liveApi) {
  api = liveApi;
  active ? teardown() : setup();
}

function setup() {
  active = true;
  last = { booted: false, eraNode: null, wingKey: null, art: new Map(), artBaselined: false,
           panelOpen: false, panelTitle: null, lights: -1, lightLogAt: 0,
           save: localStorage.getItem(SAVE_KEY), saveLogAt: 0,
           x: null, z: null, moving: false, movedAt: 0, muted: null };

  root = document.createElement("div");
  root.id = "live-root";
  root.innerHTML = `
  <style>
    #live-pip { position: fixed; right: 14px; bottom: 14px; width: 480px; z-index: 20;
      background: var(--panel); border: 1px solid var(--line); border-radius: 10px;
      overflow: hidden; box-shadow: 0 12px 40px rgba(0,0,0,0.5); }
    #live-pip header { display: flex; align-items: center; gap: 8px; padding: 7px 10px;
      font-size: 11.5px; color: var(--dim); user-select: none; }
    #live-dot { width: 8px; height: 8px; border-radius: 50%; background: #e2b53e; flex: none; }
    #live-dot.on { background: #4ade80; }
    #live-pip header b { color: var(--text); font-weight: 600; }
    #live-pip header label { display: flex; align-items: center; gap: 5px; margin-left: auto;
      cursor: pointer; }
    #live-pip header input { accent-color: var(--accent); margin: 0; }
    #live-close { background: none; border: none; color: var(--dim); font-size: 16px;
      cursor: pointer; padding: 0 2px; }
    #live-close:hover { color: #fff; }
    #live-frame { display: block; width: 100%; aspect-ratio: 16/10; border: 0;
      border-top: 1px solid var(--line); background: #000; }
    #live-log { position: fixed; left: 14px; bottom: 14px; width: 400px; z-index: 20;
      background: var(--panel); border: 1px solid var(--line); border-radius: 10px; }
    #live-log h2 { font-size: 10.5px; text-transform: uppercase; letter-spacing: 1px;
      color: var(--dim); margin: 0; padding: 8px 12px 4px; font-weight: 600; }
    #live-stats { padding: 0 12px 6px; color: var(--text); font-size: 11.5px;
      border-bottom: 1px solid var(--line); min-height: 16px; }
    #live-entries { height: 210px; overflow-y: auto; padding: 6px 10px;
      font: 11px/1.5 ui-monospace, Menlo, monospace; }
    #live-entries div { margin-bottom: 2px; word-break: break-word; }
    #live-entries .t { color: #5a6274; margin-right: 6px; }
    #live-entries .src { font-weight: 700; margin-right: 6px; }
  </style>
  <div id="live-pip">
    <header>
      <span id="live-dot"></span><b>Live</b> — walk the museum, the graph reacts
      <label><input id="live-follow" type="checkbox" checked>follow</label>
      <button id="live-close" aria-label="Close">×</button>
    </header>
    <iframe id="live-frame" src="../" allow="autoplay; fullscreen"></iframe>
  </div>
  <div id="live-log">
    <h2>Runtime processes</h2>
    <div id="live-stats">waiting for the museum to boot…</div>
    <div id="live-entries"></div>
  </div>`;
  document.body.appendChild(root);
  iframe = root.querySelector("#live-frame");
  logBody = root.querySelector("#live-entries");
  statsEl = root.querySelector("#live-stats");
  statusDot = root.querySelector("#live-dot");
  followEl = root.querySelector("#live-follow");
  root.querySelector("#live-close").onclick = teardown;

  log("live", "Live Mode on — click the museum, Enter, then walk. Click back here for graph keys.");
  timer = setInterval(poll, POLL_MS);
}

function teardown() {
  active = false;
  clearInterval(timer);
  timer = null;
  root?.remove();
  root = null;
  api.setMarker(null);
}

function log(src, msg) {
  const d = document.createElement("div");
  const t = new Date().toLocaleTimeString([], { hour12: false });
  d.innerHTML = `<span class="t">${t}</span><span class="src" style="color:${SRC_COLORS[src] || "#9aa"}">${src}</span>${msg}`;
  const pinned = logBody.scrollHeight - logBody.scrollTop - logBody.clientHeight < 30;
  logBody.appendChild(d);
  while (logBody.children.length > 140) logBody.firstChild.remove();
  if (pinned) logBody.scrollTop = logBody.scrollHeight;
}

function poll() {
  let M;
  try { M = iframe.contentWindow?.__museum; } catch { M = null; }
  if (!M || !M.world || !M.controls) { statusDot.classList.remove("on"); return; }
  statusDot.classList.add("on");
  const now = performance.now();

  if (!last.booted) {
    last.booted = true;
    log("world.js", `buildWorld() assembled the museum — rotunda, cave, 6 wings, ${M.artManager.items.length} artworks placed`);
    api.pulse("concept:museum", 0x4cc3e8, 1400);
    api.flashTouching("concept:museum");
  }

  const p = M.controls.pos;
  const loc = M.world.locate(p);

  // ---- room / era transitions → the contains/creates/loads chain fires ----
  if (loc) {
    const nodeId = eraNodeId(loc.eraKey);
    if (nodeId !== last.eraNode && api.hasNode(nodeId)) {
      log("world.js", `locate(pos) → ${loc.region} · ${loc.era}`);
      log("audio.js", `setRoom('${loc.eraKey}') — ambient score retunes for the room`);
      api.setMarker(nodeId);
      api.pulse(nodeId, 0x4cc3e8, 1300);
      api.flashTouching(nodeId, 1600);
      api.pulse("js/audio.js", 0xf0d264, 700);
      api.flashEdge("js/audio.js", "concept:audio");
      if (loc.wingKey) {
        const wingId = `wing:${loc.wingKey}`;
        if (wingId !== `wing:${last.wingKey}`) {
          log("world.js", `entered ${api.label(wingId) || loc.region}`);
          api.pulse(wingId, 0x4cc3e8, 1300);
          api.flashEdge("concept:museum", wingId, 1600);
        }
        api.flashEdge(wingId, nodeId, 1600);
        last.wingKey = loc.wingKey;
      }
      if (followEl.checked) api.flyTo(nodeId);
      last.eraNode = nodeId;
    }
  }

  // ---- movement: gliding, and the end-light teleport back to the hub ----
  if (last.x !== null) {
    const d = Math.hypot(p.x - last.x, p.z - last.z);
    if (d > 12) {
      // returnToLobby() always lands at (0, 6.4); any other jump is a debug teleport
      if (Math.abs(p.x) < 2 && Math.abs(p.z - 6.4) < 2) {
        log("main.js", "end-of-hall light — returnToLobby() flashes you back to the Grand Crossing");
        api.pulse("concept:portals", 0xffffff, 1400);
        api.flashTouching("concept:portals", 1600);
      } else {
        log("live", "teleport detected (debug hook)");
      }
    } else if (d > 0.08) {
      if (!last.moving) {
        log("controls.js", "visitor gliding — collision-clamped by world.clampMove()");
        api.pulse("concept:player", 0x6fd3a8, 800);
        api.flashEdge("js/controls.js", "concept:player");
      }
      last.moving = true;
      last.movedAt = now;
    } else if (last.moving && now - last.movedAt > 800) {
      last.moving = false;
    }
  }
  last.x = p.x; last.z = p.z;

  // ---- artwork image streaming (art.js lazy loader) ----
  const items = M.artManager.items;
  let ready = 0;
  const changes = [];
  for (const it of items) {
    if (it.state === "ready") ready++;
    const prev = last.art.get(it.art.id);
    if (prev !== it.state) {
      last.art.set(it.art.id, it.state);
      if (last.artBaselined) changes.push([it, prev]);
    }
  }
  if (!last.artBaselined) last.artBaselined = true;
  else if (changes.length > 6) {
    log("art.js", `${changes.length} artworks changed state near you (streaming images)`);
  } else {
    for (const [it, prev] of changes) {
      const artId = `art:${it.art.id}`;
      const src = it.url && !it.url.startsWith("http") ? "local image" : "Wikimedia image";
      if (it.state === "loading") {
        log("art.js", `load('${it.art.title}') — fetching ${src}`);
        api.pulse(artId, 0xc987e8, 700);
      } else if (it.state === "ready") {
        log("art.js", `'${it.art.title}' texture ready — downscaled and hung`);
        api.pulse(artId, 0xffffff, 1100);
        api.flashEdge(eraNodeId(it.eraKey), artId);
        api.flashEdge("js/art.js", it.url && !it.url.startsWith("http") ? "asset:localart" : "asset:wikimedia");
      } else if (it.state === "failed") {
        log("art.js", `'${it.art.title}' image failed (rate limit?) — placeholder kept`);
      } else if (it.state === "empty" && prev === "ready") {
        log("art.js", `unload('${it.art.title}') — GPU texture released (walked away)`);
      }
    }
  }

  // ---- info panel (ui.js) — selects the artwork node in the graph ----
  let doc = null;
  try { doc = iframe.contentDocument; } catch { /* cross-origin never happens here */ }
  const panel = doc?.getElementById("panel");
  const panelOpen = !!panel && !panel.hidden;
  const title = doc?.getElementById("panel-title")?.textContent || null;
  if (panelOpen && (!last.panelOpen || title !== last.panelTitle)) {
    log("ui.js", `openPanel('${title}') — artwork info panel`);
    api.pulse("concept:hud", 0x8fb7f0, 900);
    api.flashEdge("js/ui.js", "concept:hud");
    const artNode = api.findArtByTitle(title);
    if (artNode) { api.select(artNode); api.flyTo(artNode); api.pulse(artNode, 0xffffff, 1400); }
  } else if (!panelOpen && last.panelOpen) {
    log("ui.js", "closePanel()");
  }
  last.panelOpen = panelOpen; last.panelTitle = title;

  // ---- light culling (main.js render loop) ----
  const lights = M.world.lights.reduce((n, l) => n + (l.visible ? 1 : 0), 0);
  if (lights !== last.lights && now - last.lightLogAt > 2000) {
    if (last.lights >= 0) log("main.js", `cullLights() — ${lights} nearest lights live`);
    last.lightLogAt = now;
  }
  last.lights = lights;

  // ---- persistence (persist.js writes localStorage, shared origin) ----
  const save = localStorage.getItem(SAVE_KEY);
  if (save !== last.save && now - last.saveLogAt > 5000) {
    log("persist.js", `savePos() → localStorage['${SAVE_KEY}']`);
    api.pulse("concept:save", 0x9fa8bc, 700);
    api.flashEdge("js/persist.js", "concept:save");
    last.saveLogAt = now;
  }
  last.save = save;

  // ---- mute toggle ----
  const muted = M.Audio?.isMuted?.();
  if (last.muted !== null && muted !== last.muted)
    log("audio.js", muted ? "toggleMute() — music muted" : "toggleMute() — music on");
  last.muted = muted ?? null;

  statsEl.textContent = loc
    ? `${loc.region} · ${loc.era}   |   images ${ready}/${items.length} · lights ${lights} · x ${p.x.toFixed(1)} z ${p.z.toFixed(1)}`
    : "outside any mapped region";
}
