// Phase 0.2/0.4 audit driver (review/QUALITY_PASS_PLAN.md).
// Shoots every section × the 8 admin-harness views into review/audit/<eraKey>/,
// then runs an in-page scene analysis (bare materials, coplanar z-fight
// candidates, walkway intrusions vs BASE_HALF) → review/audit/scene_audit.json.
//
// Usage: node tools/audit_shots.mjs [outDir]   (default review/audit)
// Requires the static server:  cd .. && python3 -m http.server 8471
import fs from "node:fs";
import path from "node:path";
import puppeteer from "puppeteer-core";

const OUT = process.argv[2] || "review/audit";
const URL = "http://localhost:8471/3d-art-museum/admin/shoot.html";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const BASE_HALF = 7 / 2 - 0.42; // HALL_W/2 - 0.42, mirrors js/world.js:68

const browser = await puppeteer.launch({
  executablePath: CHROME, headless: "new",
  args: ["--no-sandbox", "--use-gl=angle", "--use-angle=metal", "--enable-webgl", "--window-size=1250,900"],
});
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1250, height: 900, deviceScaleFactor: 1 });
  const errs = [];
  page.on("console", m => { if (m.type() === "error") errs.push(m.text()); });
  page.on("response", r => { if (r.status() === 404) console.error("404:", r.url()); });
  await page.goto(URL, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForFunction("window.__shootReady === true", { timeout: 90000 });
  // async GLB kits + texture files stream in after world build — give them time
  await new Promise(r => setTimeout(r, 15000));

  const sections = await page.evaluate(() => window.__shoot.sections);
  const views = await page.evaluate(() => window.__shoot.VIEW_ORDER.map(v => v.key));
  views.push("approach"); // long-approach portal/signage view (shoot.html special case)
  console.log(`sections: ${sections.length}, views: ${views.length}`);

  for (const s of sections) {
    const dir = path.join(OUT, s.eraKey);
    fs.mkdirSync(dir, { recursive: true });
    for (const v of views) {
      const dataUrl = await page.evaluate(
        (id, vk) => window.__shoot.shoot(id, vk), s.id, v);
      if (!dataUrl) { console.error(`FAIL ${s.eraKey}/${v}`); continue; }
      fs.writeFileSync(path.join(dir, `${v}.jpg`), Buffer.from(dataUrl.split(",")[1], "base64"));
    }
    console.log(`shot ${s.eraKey}`);
  }

  // ---------- scene analysis ----------
  const audit = await page.evaluate((BASE_HALF) => {
    const h = window.__shoot.harness;
    const scene = h.scene;
    const secs = window.__shoot.sections;
    const UP_Y = { x: 0, y: 1, z: 0 };

    // world pos -> owning section (rotate into wing-local frame, test z range)
    const locate = (p) => {
      for (const s of secs) {
        let lx, lz;
        if (s.isCave) { lx = p.x; lz = p.z; }
        else {
          const c = Math.cos(s.rad), sn = Math.sin(s.rad);
          lx = p.x * c - p.z * sn;   // rotate by +rad (inverse of the -rad wing rotation)
          lz = p.x * sn + p.z * c;
        }
        const zLo = Math.min(s.zE, s.zX) - 0.8, zHi = Math.max(s.zE, s.zX) + 0.8;
        if (lz >= zLo && lz <= zHi && Math.abs(lx) <= s.halfW + 4) return { s, lx, lz };
      }
      return null;
    };

    const bare = [], thin = [], intrusions = [];
    const boxes = [];
    scene.updateMatrixWorld(true);
    scene.traverse(o => {
      if (!o.isMesh || o.visible === false) return;
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      const geo = o.geometry;
      if (!geo) return;
      if (!geo.boundingBox) geo.computeBoundingBox();
      const bb = geo.boundingBox.clone().applyMatrix4(o.matrixWorld);
      const size = { x: bb.max.x - bb.min.x, y: bb.max.y - bb.min.y, z: bb.max.z - bb.min.z };
      const center = { x: (bb.min.x + bb.max.x) / 2, y: (bb.min.y + bb.max.y) / 2, z: (bb.min.z + bb.max.z) / 2 };
      const loc = locate(center);
      const eraKey = loc ? loc.s.eraKey : "unmapped";

      // bare surfaces: lit material, no texture map, big enough to notice
      for (const m of mats) {
        if (!m) continue;
        const isGlow = m.isMeshBasicMaterial || (m.emissive && (m.emissive.r + m.emissive.g + m.emissive.b) > 0.35 && !m.map);
        const big = Math.max(size.x, size.y, size.z) > 0.9 && (size.x * size.y + size.y * size.z + size.x * size.z) > 0.8;
        if (!m.map && !isGlow && big && (m.isMeshLambertMaterial || m.isMeshPhongMaterial || m.isMeshStandardMaterial)) {
          bare.push({ eraKey, name: o.name || "(unnamed)", mat: m.name || m.type, color: m.color ? "#" + m.color.getHexString() : null, size: { x: +size.x.toFixed(2), y: +size.y.toFixed(2), z: +size.z.toFixed(2) } });
          break;
        }
      }

      // thin meshes → z-fight candidate pool
      const dims = [["x", size.x], ["y", size.y], ["z", size.z]].sort((a, b) => a[1] - b[1]);
      if (dims[0][1] < 0.02 && dims[1][1] > 0.25 && dims[2][1] > 0.25) {
        thin.push({ eraKey, name: o.name || "(unnamed)", axis: dims[0][0], bb: { min: bb.min, max: bb.max }, renderOrder: o.renderOrder, poly: !!(mats[0] && mats[0].polygonOffset), depthW: !!(mats[0] && mats[0].depthWrite) });
      }

      // walkway intrusion: solid decor inside the walk band
      if (loc && !loc.s.isCave && center.y < 2.0 && bb.max.y > 0.25) {
        // recompute lateral extent in wing-local x for the whole bbox (rotate corners)
        const c = Math.cos(loc.s.rad), sn = Math.sin(loc.s.rad);
        let minAbs = Infinity;
        for (const cx of [bb.min.x, bb.max.x]) for (const cz of [bb.min.z, bb.max.z]) {
          const lx = cx * c - cz * sn;
          minAbs = Math.min(minAbs, Math.abs(lx));
        }
        // spans across centre (walls/floor/portals) are not lateral intruders
        const spansCentre = [[bb.min.x, bb.min.z], [bb.max.x, bb.max.z]].map(([cx, cz]) => cx * c - cz * sn);
        const crosses = spansCentre[0] * spansCentre[1] < 0;
        if (!crosses && minAbs < BASE_HALF - 0.02 && size.x * size.z > 0.01) {
          const zLoc = loc.lz;
          intrusions.push({ eraKey, name: o.name || "(unnamed)", minAbsX: +minAbs.toFixed(2), zLocal: +zLoc.toFixed(1), h: +bb.max.y.toFixed(2) });
        }
      }
      boxes.push({ eraKey, bb, size, name: o.name });
    });

    // pair up coplanar thin meshes (same axis, near-identical plane, overlapping)
    const zfight = [];
    for (let i = 0; i < thin.length; i++) for (let j = i + 1; j < thin.length; j++) {
      const a = thin[i], b = thin[j];
      if (a.axis !== b.axis || a.eraKey !== b.eraKey) continue;
      const ax = a.axis;
      const ca = (a.bb.min[ax] + a.bb.max[ax]) / 2, cb = (b.bb.min[ax] + b.bb.max[ax]) / 2;
      if (Math.abs(ca - cb) > 0.004) continue;
      const other = ["x", "y", "z"].filter(k => k !== ax);
      const overlap = other.every(k =>
        Math.min(a.bb.max[k], b.bb.max[k]) - Math.max(a.bb.min[k], b.bb.min[k]) > 0.15);
      if (overlap) zfight.push({
        eraKey: a.eraKey, a: a.name, b: b.name, axis: ax,
        gap: +Math.abs(ca - cb).toFixed(4),
        at: { x: +((a.bb.min.x + a.bb.max.x) / 2).toFixed(2), y: +((a.bb.min.y + a.bb.max.y) / 2).toFixed(2), z: +((a.bb.min.z + a.bb.max.z) / 2).toFixed(2) },
        size: { x: +(a.bb.max.x - a.bb.min.x).toFixed(2), z: +(a.bb.max.z - a.bb.min.z).toFixed(2) },
        renderOrders: [a.renderOrder, b.renderOrder], depthWrite: [a.depthW, b.depthW],
      });
    }
    return { bare, zfight, intrusions, thinCount: thin.length, meshCount: boxes.length };
  }, BASE_HALF);

  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, "scene_audit.json"), JSON.stringify(audit, null, 2));
  fs.writeFileSync(path.join(OUT, "sections.json"), JSON.stringify(sections, null, 2));
  console.log(`scene audit: bare=${audit.bare.length} zfight=${audit.zfight.length} intrusions=${audit.intrusions.length} meshes=${audit.meshCount}`);
  console.log("console errors:", errs.length, errs.slice(0, 5));
} finally {
  await browser.close();
}
