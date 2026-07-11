// Generates entity/graph.js — the node/edge data for the /entity codebase
// visualizer. Rerun after adding modules, eras, or artworks:
//
//   node tools/generate_entity_graph.mjs
//
// Nodes: engine modules (js/), data files (js/data/), domain concepts
// (museum, rotunda, cave, wings, era sections, artworks) and assets
// (GLB kits, texture/image sources). Edges: imports / creates / contains /
// configures / loads.
import { readFileSync, readdirSync, writeFileSync, existsSync } from "node:fs";
import { join, resolve, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// ---- import the data modules ------------------------------------------
// package.json says "type": "commonjs", so Node would refuse the ESM data
// files by path. They are dependency-free (only sibling imports), so inline
// them as data: URLs, rewriting sibling specifiers recursively.
const dataUrlCache = new Map();
function toDataUrl(relFile) {
  if (dataUrlCache.has(relFile)) return dataUrlCache.get(relFile);
  let src = readFileSync(join(ROOT, relFile), "utf8");
  src = src.replace(/from\s+"\.\/([\w.-]+)"/g,
    (_, sib) => `from "${toDataUrl(join(dirname(relFile), sib))}"`);
  const url = "data:text/javascript;base64," + Buffer.from(src).toString("base64");
  dataUrlCache.set(relFile, url);
  return url;
}
const { REGIONS, ERAS, PREHISTORIC } = await import(toDataUrl("js/data/artworks.js"));

// ---- collect module + data files ---------------------------------------
const MODULE_DESC = {
  "main.js":     "Entry point — renderer, camera, the main loop, light culling, resume wiring.",
  "world.js":    "Assembles the museum: rotunda hub, entrance cave, six wings, collision + locate().",
  "corridor.js": "Builds each hall era by era — walls, bands, columns, portals, decor, end lights.",
  "art.js":      "ArtManager — hangs artworks, streams images as you approach, click hit-testing.",
  "controls.js": "First-person movement: pointer & touch look, glide, collision clamping.",
  "ui.js":       "Intro splash, HUD era chip, artwork info panel, fullscreen image zoomer.",
  "audio.js":    "Procedural ambient music and per-room soundscapes (WebAudio).",
  "styles.js":   "Era style definitions — materials, friezes, columns, portals, kit references.",
  "textures.js": "Procedural canvas texture library (~50 generators) plus the file-texture loader.",
  "models.js":   "GLTFLoader wrapper — spawns named parts out of the era architecture kits.",
  "fire.js":     "Animated flame sprites, torches and campfires.",
  "device.js":   "Mobile detection and the QUALITY performance profile.",
  "persist.js":  "Saves and restores the visitor's position in localStorage.",
};
const DATA_DESC = {
  "artworks.js":   "Master index — ERAS metadata, REGIONS wing layout, ALL_ARTWORKS.",
  "imageUrls.js":  "Generated map of Wikimedia Commons image URLs (tools/resolve_images.py).",
  "imageLocal.js": "Map of locally bundled artwork images.",
};

const nodes = [];
const edges = [];
const nodeById = new Map();
function addNode(n) {
  if (nodeById.has(n.id)) return nodeById.get(n.id);
  nodeById.set(n.id, n);
  nodes.push(n);
  return n;
}
function addEdge(s, t, type) {
  if (!nodeById.has(s) || !nodeById.has(t)) return;
  if (edges.some(e => e.s === s && e.t === t && e.type === type)) return;
  edges.push({ s, t, type });
}

const jsFiles = readdirSync(join(ROOT, "js")).filter(f => f.endsWith(".js"));
const dataFiles = readdirSync(join(ROOT, "js/data")).filter(f => f.endsWith(".js"));

for (const f of jsFiles)
  addNode({ id: `js/${f}`, label: f, cat: "module", path: `js/${f}`,
            desc: MODULE_DESC[f] || "Engine module." });
for (const f of dataFiles) {
  const region = REGIONS.find(r => `${r.key}.js` === f);
  const desc = DATA_DESC[f] ||
    (region ? `${region.artworks.length} works for the ${region.label} wing.` :
     f === "prehistoric.js" ? `${PREHISTORIC.length} works displayed in the entrance cave.` :
     "Artwork data.");
  addNode({ id: `js/data/${f}`, label: f, cat: "data", path: `js/data/${f}`, desc });
}

addNode({ id: "lib:three", label: "Three.js", cat: "asset",
          desc: "WebGL 3D engine, v0.160 via the CDN import map." });

// ---- imports edges (parsed from real import statements) -----------------
for (const rel of [...jsFiles.map(f => `js/${f}`), ...dataFiles.map(f => `js/data/${f}`)]) {
  const src = readFileSync(join(ROOT, rel), "utf8");
  for (const m of src.matchAll(/^import\s[^;]*?from\s+["']([^"']+)["']/gm)) {
    const spec = m[1];
    if (spec === "three" || spec.startsWith("three/")) { addEdge(rel, "lib:three", "imports"); continue; }
    const target = join(dirname(rel), spec).replace(/\\/g, "/");
    addEdge(rel, target, "imports");
  }
}

// ---- domain concepts -----------------------------------------------------
addNode({ id: "concept:museum",  label: "Timeline of Art Museum", cat: "concept",
          desc: "The whole walkable scene — cave, rotunda, six wings, 40,000 years of art." });
addNode({ id: "concept:rotunda", label: "Grand Crossing (Rotunda)", cat: "concept",
          desc: "Domed hub where the six wings meet; you return here from every end light." });
addNode({ id: "concept:cave",    label: "Prehistoric Cave", cat: "concept",
          desc: "Firelit entrance cave — the spawn point, hung with the first artworks." });
addNode({ id: "concept:player",  label: "Visitor (Player)", cat: "concept",
          desc: "First-person camera at eye height 1.62 m, collision-clamped to the halls." });
addNode({ id: "concept:styles",  label: "Era Styles", cat: "concept",
          desc: `${Object.keys(ERAS).length} architecture styles keyed by era — walls, floors, portals, kits.` });
addNode({ id: "concept:portals", label: "Portals & End Lights", cat: "concept",
          desc: "Era doorways with signs, and the light curtains that carry you back to the hub." });
addNode({ id: "concept:hud",     label: "HUD & Info Panel", cat: "concept",
          desc: "Era chip, hint bar, artwork panel and fullscreen zoomer overlays." });
addNode({ id: "concept:audio",   label: "Music & Room Audio", cat: "concept",
          desc: "Procedural ambient score that shifts per room and era." });
addNode({ id: "concept:save",    label: "Saved Position", cat: "concept",
          desc: "localStorage resume point — validated against collision before restoring." });
addNode({ id: "concept:quality", label: "Quality Profile", cat: "concept",
          desc: "Device-based performance settings: pixel ratio cap, texture sizes, light budget." });
addNode({ id: "concept:fires",   label: "Fires & Torches", cat: "concept",
          desc: "Animated flames lighting the cave and rotunda." });
addNode({ id: "concept:kits",    label: "Architecture Kits", cat: "concept",
          desc: "Blender GLB decor kits — one per era style, streamed in as named parts." });

addEdge("concept:museum", "concept:rotunda", "contains");
addEdge("concept:museum", "concept:cave", "contains");

// who builds what
addEdge("js/world.js", "concept:museum", "creates");
addEdge("js/world.js", "concept:rotunda", "creates");
addEdge("js/world.js", "concept:cave", "creates");
addEdge("js/corridor.js", "concept:portals", "creates");
addEdge("js/controls.js", "concept:player", "creates");
addEdge("js/styles.js", "concept:styles", "creates");
addEdge("js/ui.js", "concept:hud", "creates");
addEdge("js/audio.js", "concept:audio", "creates");
addEdge("js/persist.js", "concept:save", "creates");
addEdge("js/device.js", "concept:quality", "creates");
addEdge("js/fire.js", "concept:fires", "creates");
addEdge("js/data/artworks.js", "concept:museum", "configures");

// ---- style key → GLB kit name (parsed from styles.js `S.key = {...glb:"x"}`) ----
const styleSrc = readFileSync(join(ROOT, "js/styles.js"), "utf8");
const styleGlb = {};
let curStyle = null;
for (const line of styleSrc.split("\n")) {
  const s = line.match(/^\s*S\.(\w+)\s*=\s*\{/);
  if (s) curStyle = s[1];
  const g = line.match(/glb:\s*"(\w+)"/);
  if (g && curStyle) styleGlb[curStyle] = g[1];
}

// GLB kit asset nodes (only files that exist on disk)
const kitFiles = readdirSync(join(ROOT, "assets/models")).filter(f => f.endsWith(".glb"));
for (const f of kitFiles) {
  addNode({ id: `kit:${basename(f, ".glb")}`, label: f, cat: "asset",
            path: `assets/models/${f}`, desc: "Blender architecture kit (portal, decor, props)." });
  addEdge("concept:kits", `kit:${basename(f, ".glb")}`, "contains");
}
addEdge("js/models.js", "concept:kits", "loads");
addEdge("js/world.js", "kit:prehistoric", "loads"); // PRE_GLB, loaded directly for the cave

// other asset sources
const texCount = readdirSync(join(ROOT, "assets/textures")).length;
addNode({ id: "asset:texfiles", label: "Texture Files", cat: "asset", path: "assets/textures/",
          desc: `${texCount} baked surface images (FLUX pipeline), with procedural fallbacks.` });
addNode({ id: "asset:wikimedia", label: "Wikimedia Images", cat: "asset",
          desc: "Remote artwork images, streamed from Wikimedia Commons as you approach." });
addNode({ id: "asset:localart", label: "Local Images", cat: "asset", path: "assets/art/",
          desc: "Locally bundled artwork images that override remote URLs." });
addEdge("js/textures.js", "asset:texfiles", "loads");
addEdge("js/art.js", "asset:wikimedia", "loads");
addEdge("js/art.js", "asset:localart", "loads");
addEdge("js/data/imageUrls.js", "asset:wikimedia", "loads");
addEdge("js/data/imageLocal.js", "asset:localart", "loads");

// ---- wings, era sections, artworks --------------------------------------
function addArtworks(list, parentId, pathHint) {
  for (const a of list) {
    addNode({ id: `art:${a.id}`, label: a.title, cat: "art", path: pathHint,
              desc: `${a.artist} — ${a.date}` });
    addEdge(parentId, `art:${a.id}`, "contains");
  }
}

for (const region of REGIONS) {
  const wingId = `wing:${region.key}`;
  addNode({ id: wingId, label: `${region.label} Wing`, cat: "concept",
            desc: `Hall at ${region.angleDeg}° from the rotunda — ${region.artworks.length} works, moving forward in time.` });
  addEdge("concept:museum", wingId, "contains");
  addEdge("js/world.js", wingId, "creates");
  addEdge(`js/data/${region.key}.js`, wingId, "configures");

  // group by era preserving order, exactly like world.js buildWing does
  const segs = [];
  for (const a of region.artworks) {
    const last = segs[segs.length - 1];
    if (last && last.era === a.era) last.items.push(a);
    else segs.push({ era: a.era, items: [a] });
  }
  for (const seg of segs) {
    const era = ERAS[seg.era];
    const eraId = `era:${seg.era}`;
    addNode({ id: eraId, label: era.label, cat: "concept",
              desc: `${era.period} · "${era.style}" architecture · ${seg.items.length} works.` });
    addEdge(wingId, eraId, "contains");
    addEdge("js/corridor.js", eraId, "creates");
    const glb = styleGlb[era.style];
    if (glb && nodeById.has(`kit:${glb}`)) addEdge(eraId, `kit:${glb}`, "loads");
    addArtworks(seg.items, eraId, `js/data/${region.key}.js`);
  }
}
addEdge("js/data/prehistoric.js", "concept:cave", "configures");
addArtworks(PREHISTORIC, "concept:cave", "js/data/prehistoric.js");
const preGlb = styleGlb[ERAS.prehistoric?.style];
if (preGlb && nodeById.has(`kit:${preGlb}`)) addEdge("concept:cave", `kit:${preGlb}`, "loads");

// ---- degree-based sizing --------------------------------------------------
const deg = new Map();
for (const e of edges) {
  deg.set(e.s, (deg.get(e.s) || 0) + 1);
  deg.set(e.t, (deg.get(e.t) || 0) + 1);
}
for (const n of nodes) {
  n.deg = deg.get(n.id) || 0;
  const base = { module: 2.2, data: 1.9, concept: 2.0, art: 0.85, asset: 1.5 }[n.cat];
  n.size = +(base + Math.sqrt(n.deg) * 0.45).toFixed(2);
}

const counts = {};
for (const n of nodes) counts[n.cat] = (counts[n.cat] || 0) + 1;
const out = `// GENERATED by tools/generate_entity_graph.mjs — do not edit by hand.
// ${new Date().toISOString()} · ${nodes.length} nodes · ${edges.length} edges
export const GRAPH = ${JSON.stringify({ nodes, edges }, null, 1)};
`;
writeFileSync(join(ROOT, "entity/graph.js"), out);
console.log(`entity/graph.js: ${nodes.length} nodes (${Object.entries(counts).map(([k, v]) => `${v} ${k}`).join(", ")}), ${edges.length} edges`);
