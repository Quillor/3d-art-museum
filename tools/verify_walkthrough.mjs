// Gameplay collision verification for the complete museum route.
// Loads the LIVE site (not the harness), waits past both refreshDecorColliders
// passes, then exercises world.clampMove directly:
//   A. penetration — approach every keep-out circle from 4 angles aiming at
//      its center; the resolved position must stay outside the radius.
//   B. traversal — simulate the real player journey (cave spawn → hub, hub →
//      far end of every wing, and back) with steering; flag stuck spots.
//   C. idempotency — re-running refreshDecorColliders must not grow colliders.
//
// Usage: node tools/verify_walkthrough.mjs   (server on :8471 required)
import puppeteer from "puppeteer-core";

const URL = "http://localhost:8471/3d-art-museum/";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const browser = await puppeteer.launch({
  executablePath: CHROME, headless: "new",
  args: ["--no-sandbox", "--use-gl=angle", "--use-angle=metal", "--enable-webgl", "--window-size=1250,900"],
});
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1250, height: 900 });
  const errs = [];
  page.on("console", m => { if (m.type() === "error") errs.push(m.text()); });
  await page.goto(URL, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForFunction("!!window.__museum", { timeout: 90000 });
  console.log("world built — waiting 20s for GLB streams + both collider passes…");
  await new Promise(r => setTimeout(r, 20000));

  const report = await page.evaluate(() => {
    const { world } = window.__museum;
    const clamp = world.clampMove;

    // -- C. idempotency + auto/manual split (auto circles are tagged) --
    const n1 = world.refreshDecorColliders();
    const total1 = world.colliders.length;
    const n2 = world.refreshDecorColliders();
    const total2 = world.colliders.length;
    const manual = world.colliders.filter(c => !c.auto);

    // -- A. penetration: press toward every guarded prop frame-by-frame, the
    // way the real controls move (≤0.15 m/frame), from 4 approach sides.
    // world.decorGuards records each prop's minimum expected clearance
    // (circle radius minus pad, or the AABB's smaller half-extent for
    // profile-narrow guards). Manual colliders are checked the same way.
    const penetrations = [];
    const grazes = [];
    const targets = [
      ...world.decorGuards.map(g => ({ kind: "auto", ...g })),
      ...manual.map(c => ({ kind: "manual", x: c.x, z: c.z, clear: c.r - 0.15 })),
    ];
    for (const t of targets) {
      for (const a of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
        let px = t.x + Math.cos(a) * (t.clear + 0.55), pz = t.z + Math.sin(a) * (t.clear + 0.55);
        let minD = Math.hypot(px - t.x, pz - t.z);
        for (let f = 0; f < 150; f++) {
          const dx = t.x - px, dz = t.z - pz;
          const d = Math.hypot(dx, dz) || 1e-5;
          const res = clamp({ x: px, y: 1.6, z: pz },
                            { x: px + (dx / d) * 0.12, y: 1.6, z: pz + (dz / d) * 0.12 });
          px = res.x; pz = res.z;
          const now = Math.hypot(px - t.x, pz - t.z);
          if (now < minD) minD = now;
        }
        const rec = { kind: t.kind, x: +t.x.toFixed(2), z: +t.z.toFixed(2), clear: +t.clear.toFixed(2), minD: +minD.toFixed(3), angle: +(a * 180 / Math.PI).toFixed(0) };
        if (minD < t.clear) penetrations.push(rec);
        else if (minD < t.clear + 0.08) grazes.push(rec);
      }
    }

    // -- B. traversal with steering --
    const walk = (from, to, maxSteps) => {
      let pos = { x: from.x, z: from.z }, best = Infinity, stuck = 0;
      for (let i = 0; i < maxSteps; i++) {
        const dx = to.x - pos.x, dz = to.z - pos.z;
        const dist = Math.hypot(dx, dz);
        if (dist < 0.7) return { ok: true, steps: i };
        let ang = Math.atan2(dz, dx);
        if (stuck > 25) { // steer around obstacles: ±40°, ±80°, ±120° sweeps
          const k = Math.floor((stuck - 25) / 45) + 1;
          ang += (k % 2 ? 1 : -1) * Math.min(2.1, 0.7 * Math.ceil(k / 2));
        }
        const res = clamp({ x: pos.x, y: 1.6, z: pos.z },
                          { x: pos.x + Math.cos(ang) * 0.12, y: 1.6, z: pos.z + Math.sin(ang) * 0.12 });
        pos = { x: res.x, z: res.z };
        if (dist < best - 0.01) { best = dist; stuck = 0; } else stuck++;
      }
      return { ok: false, at: { x: +pos.x.toFixed(2), z: +pos.z.toFixed(2) }, remaining: +best.toFixed(2) };
    };

    const legs = [];
    const spawn = world.spawn.pos;
    legs.push({ name: "cave spawn → hub", ...walk({ x: spawn.x, z: spawn.z }, { x: 0, z: 0 }, 4000) });
    world.halls.forEach((h, i) => {
      const end = { x: h.ox + h.dx * (h.len - 0.9), z: h.oz + h.dz * (h.len - 0.9) };
      legs.push({ name: `hub → hall[${i}] end`, ...walk({ x: 0, z: 0 }, end, 8000) });
      legs.push({ name: `hall[${i}] end → hub`, ...walk(end, { x: 0, z: 0 }, 8000) });
    });

    return {
      autoCount: n2, guardCount: world.decorGuards.length, manualCount: manual.length,
      idempotent: n1 === n2 && total1 === total2,
      penetrations, grazes, legs,
      failedLegs: legs.filter(l => !l.ok),
    };
  });

  console.log(`auto guards: ${report.autoCount} active (${report.guardCount} props tracked), manual: ${report.manualCount}, idempotent: ${report.idempotent}`);
  console.log(`penetrations: ${report.penetrations.length}, grazes (inside keep-out pad, outside mesh): ${report.grazes.length}`);
  for (const p of report.penetrations) console.log("  PENETRATION", JSON.stringify(p));
  for (const g of report.grazes.slice(0, 12)) console.log("  graze", JSON.stringify(g));
  console.log(`traversal legs: ${report.legs.length}, failed: ${report.failedLegs.length}`);
  for (const l of report.legs) console.log(`  ${l.ok ? "ok  " : "STUCK"} ${l.name}${l.ok ? ` (${l.steps} steps)` : ` at ${JSON.stringify(l.at)}, ${l.remaining}m short`}`);
  console.log("console errors:", errs.length ? errs.join(" | ") : "none");
  const pass = report.penetrations.length === 0 && report.failedLegs.length === 0 && report.idempotent;
  console.log(pass ? "WALKTHROUGH VERIFY: PASS" : "WALKTHROUGH VERIFY: FAIL");
  process.exitCode = pass ? 0 : 1;
} finally {
  await browser.close();
}
