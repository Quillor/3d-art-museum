// Headless in-app screenshot of one museum room, for unattended texture QA.
// Usage: node tools/shoot.mjs <eraKey> <outPath.png> [view] [segOffset]
//   view: approach (default) | wall | ceiling
// Requires the static server running at http://localhost:8471/3d-art-museum/
// and Google Chrome installed. Captures via canvas.toDataURL right after a
// synchronous render, so the WebGL buffer is intact (no blank frames).
import fs from "node:fs";
import puppeteer from "puppeteer-core";

const [, , era, out, view = "approach", offStr = "0"] = process.argv;
if (!era || !out) { console.error("usage: node tools/shoot.mjs <eraKey> <out.png> [view] [segOffset]"); process.exit(2); }
const off = parseFloat(offStr) || 0;
const URL = "http://localhost:8471/3d-art-museum/";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const browser = await puppeteer.launch({
  executablePath: CHROME, headless: "new",
  args: ["--no-sandbox", "--use-gl=angle", "--use-angle=metal", "--enable-webgl", "--window-size=900,1000"],
});
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 900, height: 1000, deviceScaleFactor: 1 });
  const errs = [];
  page.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });
  await page.goto(URL, { waitUntil: "domcontentloaded", timeout: 60000 });
  // wait for the museum to finish building
  await page.waitForFunction("typeof window.__museum !== 'undefined' && window.__museum.world", { timeout: 60000 });

  const teleport = (era, view, off) => {
    const m = window.__museum, { controls, camera, renderer, scene, world } = m;
    [...document.querySelectorAll('button,a,[role=button]')].forEach(b => { if (/enter/i.test(b.textContent)) b.click(); });
    const ov = document.querySelector('.intro,#intro,.overlay,#overlay'); if (ov) ov.style.display = 'none';
    try { localStorage.removeItem('museum.pos.v2'); } catch (e) {}
    controls.enabled = false;
    const w = world.wingsInfo.find(w => w.segments.some(s => s.eraKey === era));
    if (!w) return { ok: false, err: "era not found: " + era };
    const seg = w.segments.find(s => s.eraKey === era);
    const rad = w.rad, dx = Math.sin(rad), dz = -Math.cos(rad);
    const s = -(seg.z0 + seg.z1) / 2 - 7 + off;
    let px = dx * (7 + s), pz = dz * (7 + s), yaw, pitch = 0.06;
    if (view === "wall") { px += -dz * 1.5; pz += dx * 1.5; yaw = Math.atan2(-dx, -dz) - 0.6; }
    else if (view === "ceiling") { yaw = Math.atan2(-dx, -dz); pitch = 0.5; }
    else { yaw = Math.atan2(-dx, -dz); }
    controls.pos.set(px, 1.6, pz); controls.yaw = yaw; controls.pitch = pitch;
    controls.applyTo(camera);
    const p = camera.position; world.lights.forEach(l => { l.visible = l.position.distanceTo(p) < 30; });
    renderer.render(scene, camera);
    return { ok: true, era: world.locate(controls.pos).era };
  };

  const r1 = await page.evaluate(teleport, era, view, off);
  if (!r1.ok) { console.error("TELEPORT FAIL:", r1.err); process.exit(3); }
  // let async GLB parts + textures finish loading, then re-render + capture
  await new Promise((res) => setTimeout(res, 3500));
  const dataUrl = await page.evaluate((era, view, off) => {
    const t = (window.__shoot_teleport || (() => {}));
    return null;
  }, era, view, off).catch(() => null);
  // re-run teleport (re-applies camera + lights) then grab the buffer synchronously
  const png = await page.evaluate((era, view, off) => {
    const m = window.__museum, { controls, camera, renderer, scene, world } = m;
    const w = world.wingsInfo.find(w => w.segments.some(s => s.eraKey === era));
    const seg = w.segments.find(s => s.eraKey === era);
    const rad = w.rad, dx = Math.sin(rad), dz = -Math.cos(rad);
    const s = -(seg.z0 + seg.z1) / 2 - 7 + off;
    let px = dx * (7 + s), pz = dz * (7 + s), yaw, pitch = 0.06;
    if (view === "wall") { px += -dz * 1.5; pz += dx * 1.5; yaw = Math.atan2(-dx, -dz) - 0.6; }
    else if (view === "ceiling") { yaw = Math.atan2(-dx, -dz); pitch = 0.5; }
    else { yaw = Math.atan2(-dx, -dz); }
    controls.pos.set(px, 1.6, pz); controls.yaw = yaw; controls.pitch = pitch;
    controls.applyTo(camera);
    const p = camera.position; world.lights.forEach(l => { l.visible = l.position.distanceTo(p) < 30; });
    renderer.render(scene, camera);
    return document.querySelector("canvas").toDataURL("image/png");
  }, era, view, off);

  fs.writeFileSync(out, Buffer.from(png.split(",")[1], "base64"));
  console.log("WROTE", out, "| era:", r1.era, "| consoleErrors:", errs.length);
} finally {
  await browser.close();
}
