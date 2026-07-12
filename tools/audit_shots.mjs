// Canonical museum audit driver.
// Shoots every section × the 9 admin-harness views into <outDir>/<eraKey>/,
// then runs an in-page scene analysis (bare materials, coplanar z-fight
// candidates, walkway intrusions vs BASE_HALF), architecture QA, and console
// capture. This is evidence tooling; it does not mutate the museum scene.
//
// Usage: node tools/audit_shots.mjs [outDir]   (default review/audit)
// Requires the static server:  cd .. && python3 -m http.server 8471
import fs from "node:fs";
import path from "node:path";
import puppeteer from "puppeteer-core";

const OUT = process.argv[2] || "review/audit";
const URL = "http://localhost:8471/3d-art-museum/admin/shoot.html";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
// Guaranteed unobstructed central circulation path. Wall-attached benches,
// engaged columns, and display furniture may occupy the remaining side zones;
// anything entering this 3.4 m clear path is a release blocker.
const CLEAR_PATH_HALF = 1.7;

const browser = await puppeteer.launch({
  executablePath: CHROME, headless: "new",
  args: ["--no-sandbox", "--use-gl=angle", "--use-angle=metal", "--enable-webgl", "--window-size=1250,900"],
});
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1250, height: 900, deviceScaleFactor: 1 });
  const errs = [];
  const failedRequests = [];
  const responseErrors = [];
  page.on("console", m => { if (m.type() === "error") errs.push(m.text()); });
  page.on("requestfailed", r => failedRequests.push({ url: r.url(), error: r.failure()?.errorText || "unknown" }));
  page.on("response", r => {
    if (r.status() >= 400) {
      responseErrors.push({ status: r.status(), url: r.url() });
      console.error(`${r.status()}:`, r.url());
    }
  });
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
  const audit = await page.evaluate((CLEAR_PATH_HALF) => {
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
          // Wing groups are authored with rotation.y = -rad. Apply +rad
          // here to recover wing-local coordinates from a world position.
          lx = p.x * c + p.z * sn;
          lz = -p.x * sn + p.z * c;
        }
        const zLo = Math.min(s.zE, s.zX) - 0.8, zHi = Math.max(s.zE, s.zX) + 0.8;
        if (lz >= zLo && lz <= zHi && Math.abs(lx) <= s.halfW + 4) return { s, lx, lz };
      }
      return null;
    };

    const bare = [], thin = [], intrusions = [];
    const boxes = [];

    const toSectionLocal = (point, section) => {
      if (section.isCave) return point;
      const c = Math.cos(section.rad), sn = Math.sin(section.rad);
      const x = point.x * c + point.z * sn;
      const z = -point.x * sn + point.z * c;
      point.x = x;
      point.z = z;
      return point;
    };

    // Clip a triangle/polygon to one horizontal half-plane. Exact triangle
    // clipping avoids treating disconnected joined meshes (for example a
    // doorway's two jambs plus its high lintel) as one solid centre blocker.
    const clipAtY = (poly, y, keepAbove) => {
      const out = [];
      for (let i = 0; i < poly.length; i++) {
        const a = poly[(i + poly.length - 1) % poly.length];
        const b = poly[i];
        const aIn = keepAbove ? a.y >= y : a.y <= y;
        const bIn = keepAbove ? b.y >= y : b.y <= y;
        if (aIn !== bIn) {
          const t = (y - a.y) / (b.y - a.y);
          out.push({
            x: a.x + (b.x - a.x) * t,
            y,
            z: a.z + (b.z - a.z) * t,
          });
        }
        if (bIn) out.push(b);
      }
      return out;
    };

    const pedestrianMinAbsX = (mesh, section) => {
      const attr = mesh.geometry?.attributes?.position;
      if (!attr || mesh.isInstancedMesh) return Infinity;
      const index = mesh.geometry.index;
      const triCount = Math.floor((index ? index.count : attr.count) / 3);
      let minAbs = Infinity;
      for (let tri = 0; tri < triCount; tri++) {
        const poly = [];
        for (let corner = 0; corner < 3; corner++) {
          const sequenceIndex = tri * 3 + corner;
          const vertexIndex = index ? index.getX(sequenceIndex) : sequenceIndex;
          const point = mesh.geometry.boundingBox.min.clone()
            .fromBufferAttribute(attr, vertexIndex)
            .applyMatrix4(mesh.matrixWorld);
          toSectionLocal(point, section);
          poly.push({ x: point.x, y: point.y, z: point.z });
        }
        let clipped = clipAtY(poly, 0.05, true);
        if (clipped.length < 3) continue;
        clipped = clipAtY(clipped, 2.05, false);
        if (clipped.length < 3) continue;
        const xMin = Math.min(...clipped.map((p) => p.x));
        const xMax = Math.max(...clipped.map((p) => p.x));
        const here = xMin <= 0 && xMax >= 0
          ? 0
          : Math.min(Math.abs(xMin), Math.abs(xMax));
        minAbs = Math.min(minAbs, here);
      }
      return minAbs;
    };

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
      // Exact mesh bounds in the owning wing's local coordinate frame. Rotating
      // a world AABB back into a wing exaggerates its footprint and produced
      // hundreds of false intrusion/z-fight reports in angled wings.
      let localBB = null;
      if (loc) {
        const c = Math.cos(loc.s.rad), sn = Math.sin(loc.s.rad);
        const mn = { x: Infinity, y: Infinity, z: Infinity };
        const mx = { x: -Infinity, y: -Infinity, z: -Infinity };
        const gb = geo.boundingBox;
        for (const gx of [gb.min.x, gb.max.x]) for (const gy of [gb.min.y, gb.max.y]) for (const gz of [gb.min.z, gb.max.z]) {
          const wp = gb.min.clone().set(gx, gy, gz).applyMatrix4(o.matrixWorld);
          const lx = wp.x * c + wp.z * sn;
          const lz = -wp.x * sn + wp.z * c;
          mn.x = Math.min(mn.x, lx); mn.y = Math.min(mn.y, wp.y); mn.z = Math.min(mn.z, lz);
          mx.x = Math.max(mx.x, lx); mx.y = Math.max(mx.y, wp.y); mx.z = Math.max(mx.z, lz);
        }
        localBB = { min: mn, max: mx };
      }

      // bare surfaces: lit material, no texture map, big enough to notice
      for (const m of mats) {
        if (!m) continue;
        const isGlow = m.isMeshBasicMaterial || (m.emissive && (m.emissive.r + m.emissive.g + m.emissive.b) > 0.35 && !m.map);
        const big = Math.max(size.x, size.y, size.z) > 2.5 && (size.x * size.y + size.y * size.z + size.x * size.z) > 6;
        if (!m.map && !isGlow && big && (m.isMeshLambertMaterial || m.isMeshPhongMaterial || m.isMeshStandardMaterial)) {
          bare.push({ eraKey, name: o.name || "(unnamed)", mat: m.name || m.type, color: m.color ? "#" + m.color.getHexString() : null, size: { x: +size.x.toFixed(2), y: +size.y.toFixed(2), z: +size.z.toFixed(2) } });
          break;
        }
      }

      // thin meshes → z-fight candidate pool
      const localSize = localBB ? {
        x: localBB.max.x - localBB.min.x,
        y: localBB.max.y - localBB.min.y,
        z: localBB.max.z - localBB.min.z,
      } : null;
      const dims = localSize
        ? [["x", localSize.x], ["y", localSize.y], ["z", localSize.z]].sort((a, b) => a[1] - b[1])
        : [];
      if (localBB && dims[0][1] < 0.02 && dims[1][1] > 0.25 && dims[2][1] > 0.25) {
        thin.push({ eraKey, name: o.name || "(unnamed)", axis: dims[0][0], bb: localBB, renderOrder: o.renderOrder, poly: !!(mats[0] && mats[0].polygonOffset), depthW: !!(mats[0] && mats[0].depthWrite) });
      }

      // Walkway intrusion: a solid object entering the guaranteed 3.4 m
      // central circulation path. Full-width floors/walls/portal headers are
      // structural spans and are excluded; compact centre-crossing objects are not.
      if (loc && localBB && !loc.s.isCave && localBB.min.y < 2.05 && localBB.max.y > 0.05) {
        const crosses = localBB.min.x < 0 && localBB.max.x > 0;
        const width = localBB.max.x - localBB.min.x;
        const depth = localBB.max.z - localBB.min.z;
        const fullStructuralSpan = crosses && width > 6.2;
        const minAbs = pedestrianMinAbsX(o, loc.s);
        if (!fullStructuralSpan && minAbs < CLEAR_PATH_HALF - 0.02 && width * depth > 0.01) {
          intrusions.push({ eraKey, name: o.name || "(unnamed)", minAbsX: +minAbs.toFixed(2), zLocal: +loc.lz.toFixed(1), h: +localBB.max.y.toFixed(2) });
        }
      }
      boxes.push({ eraKey, bb, size, name: o.name });
    });

    // pair up coplanar thin meshes (same axis, near-identical plane, overlapping)
    const zfight = [];
    for (let i = 0; i < thin.length; i++) for (let j = i + 1; j < thin.length; j++) {
      const a = thin[i], b = thin[j];
      if (a.axis !== b.axis || a.eraKey !== b.eraKey) continue;
      if (!a.depthW && !b.depthW) continue;
      if ((a.poly || b.poly) && a.renderOrder !== b.renderOrder) continue;
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
  }, CLEAR_PATH_HALF);

  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, "scene_audit.json"), JSON.stringify(audit, null, 2));
  fs.writeFileSync(path.join(OUT, "sections.json"), JSON.stringify(sections, null, 2));
  const architectureQa = await page.evaluate(() => {
    const world = window.__shoot?.harness?.world;
    return typeof world?.auditArchitecture === "function"
      ? world.auditArchitecture()
      : { unavailable: true };
  });
  fs.writeFileSync(path.join(OUT, "architecture_qa.json"), JSON.stringify(architectureQa, null, 2));

  // A sign existing in the scene is not enough: its actual title band must be
  // readable from both visitor directions. Test the approach/front face and
  // the room-side/reverse face with crop-safe samples spanning the rendered
  // title area. This catches ceiling beams, deep portal trim, wrong-facing
  // planes, and evidence framing regressions that a bounding-box audit cannot.
  const signVisibilityQa = await page.evaluate(() => {
    const shoot = window.__shoot;
    const h = shoot.harness;
    const { scene, camera, canvas } = h;
    const sampleXs = [-0.42, -0.28, -0.14, 0, 0.14, 0.28, 0.42];
    // signTexture() lays its 56 px title around local y=.22; this samples the
    // whole glyph band rather than only its centreline.
    const sampleYs = [0.12, 0.22, 0.32];
    const cropLimit = { x: 0.95, y: 0.85 };
    const targetTolerance = 0.03;
    const blockerTolerance = 0.015;
    const minTitleWidthPx = 160;
    const minTitleBandPx = 8;

    const ancestorsVisible = (object) => {
      for (let o = object; o; o = o.parent) if (o.visible === false) return false;
      return true;
    };
    const hitMaterial = (hit) => {
      const materials = Array.isArray(hit.object.material)
        ? hit.object.material
        : [hit.object.material];
      return materials[hit.face?.materialIndex ?? 0] || materials[0];
    };
    const materialActive = (hit) => {
      const material = hitMaterial(hit);
      return ancestorsVisible(hit.object) && material && material.visible !== false
        && (material.opacity ?? 1) > 0.02;
    };
    const opaqueBlocker = (hit) => {
      const material = hitMaterial(hit);
      if (!materialActive(hit) || material.depthWrite === false) return false;
      // Raycaster cannot resolve holes in alpha-tested/transparent imagery.
      // Report those separately, but do not fail a solid-geometry LOS gate on
      // a texture-space ambiguity.
      if (material.alphaTest > 0 || (material.transparent && (material.opacity ?? 1) < 0.98)) return false;
      return (material.opacity ?? 1) >= 0.98;
    };

    const checks = [];
    const softWarnings = [];
    for (const section of shoot.sections) {
      for (const [face, view] of [["front", "approach"], ["back", "entrance_in"]]) {
        shoot.shoot(section.id, view);
        scene.updateMatrixWorld(true);
        camera.updateMatrixWorld(true);

        const matches = [];
        scene.traverse((object) => {
          const meta = object.userData?.archSign;
          if (meta?.eraKey === section.eraKey && meta.face === face) matches.push(object);
        });
        const sign = matches[0];
        const samples = [];
        let croppedSamples = 0;
        let blockedSamples = 0;
        let targetMisses = 0;
        let facingCamera = false;
        let titleWidthPx = 0;
        let titleBandPx = 0;
        const ndcBounds = { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity };

        if (sign?.geometry) {
          if (!sign.geometry.boundingBox) sign.geometry.computeBoundingBox();
          const local = sign.geometry.boundingBox.min.clone();
          const normal = sign.position.clone().set(0, 0, 1).transformDirection(sign.matrixWorld);
          const centre = sign.getWorldPosition(sign.position.clone());
          facingCamera = normal.dot(camera.position.clone().sub(centre).normalize()) > 0.5;

          const projectLocal = (x, y) => local.clone().set(x, y, 0)
            .applyMatrix4(sign.matrixWorld).project(camera);
          const titleLeft = projectLocal(-0.426, 0.22);
          const titleRight = projectLocal(0.426, 0.22);
          const titleBottom = projectLocal(0, 0.11);
          const titleTop = projectLocal(0, 0.33);
          titleWidthPx = Math.abs(titleRight.x - titleLeft.x) * canvas.width / 2;
          titleBandPx = Math.abs(titleTop.y - titleBottom.y) * canvas.height / 2;

          for (const localY of sampleYs) {
            for (const localX of sampleXs) {
              const point = local.clone().set(localX, localY, 0).applyMatrix4(sign.matrixWorld);
              const ndc = point.clone().project(camera);
              const finite = [ndc.x, ndc.y, ndc.z].every(Number.isFinite);
              const inCrop = finite && Math.abs(ndc.x) <= cropLimit.x
                && Math.abs(ndc.y) <= cropLimit.y && ndc.z >= -1 && ndc.z <= 1;
              ndcBounds.minX = Math.min(ndcBounds.minX, ndc.x);
              ndcBounds.maxX = Math.max(ndcBounds.maxX, ndc.x);
              ndcBounds.minY = Math.min(ndcBounds.minY, ndc.y);
              ndcBounds.maxY = Math.max(ndcBounds.maxY, ndc.y);
              if (!inCrop) croppedSamples += 1;

              const delta = point.clone().sub(camera.position);
              const targetDistance = delta.length();
              h.artManager.raycaster.set(camera.position, delta.normalize());
              h.artManager.raycaster.near = 0.001;
              h.artManager.raycaster.far = targetDistance + targetTolerance;
              const hits = h.artManager.raycaster.intersectObjects(scene.children, true)
                .filter(materialActive);
              const hardHits = hits.filter(opaqueBlocker);
              const firstHard = hardHits[0];
              const hitTarget = firstHard?.object === sign
                && Math.abs(firstHard.distance - targetDistance) <= targetTolerance;
              const blocker = firstHard && firstHard.distance < targetDistance - blockerTolerance
                ? firstHard
                : null;
              if (!hitTarget) targetMisses += 1;
              if (blocker) blockedSamples += 1;

              for (const hit of hits) {
                if (hit.distance >= targetDistance - blockerTolerance) break;
                if (!opaqueBlocker(hit)) {
                  const material = hitMaterial(hit);
                  softWarnings.push({
                    eraKey: section.eraKey,
                    face,
                    object: hit.object.name || "(unnamed)",
                    material: material?.name || material?.type || "unknown",
                    reason: material?.alphaTest > 0 ? "alpha-tested" : "translucent-or-non-depth-writing",
                    gap: +(targetDistance - hit.distance).toFixed(3),
                  });
                  break;
                }
              }

              samples.push({
                local: [localX, localY],
                ndc: [+(ndc.x).toFixed(3), +(ndc.y).toFixed(3), +(ndc.z).toFixed(3)],
                inCrop,
                hitTarget,
                blocker: blocker ? {
                  object: blocker.object.name || "(unnamed)",
                  material: hitMaterial(blocker)?.name || hitMaterial(blocker)?.type || "unknown",
                  gap: +(targetDistance - blocker.distance).toFixed(3),
                } : null,
              });
            }
          }
        }

        const check = {
          eraKey: section.eraKey,
          face,
          view,
          signCount: matches.length,
          facingCamera,
          titleWidthPx: +titleWidthPx.toFixed(1),
          titleBandPx: +titleBandPx.toFixed(1),
          ndcBounds: Object.fromEntries(Object.entries(ndcBounds).map(([key, value]) => [
            key, Number.isFinite(value) ? +value.toFixed(3) : null,
          ])),
          sampleCount: samples.length,
          croppedSamples,
          blockedSamples,
          targetMisses,
          samples,
        };
        check.pass = check.signCount === 1 && check.facingCamera
          && check.sampleCount === sampleXs.length * sampleYs.length
          && check.croppedSamples === 0 && check.blockedSamples === 0 && check.targetMisses === 0
          && check.titleWidthPx >= minTitleWidthPx && check.titleBandPx >= minTitleBandPx;
        checks.push(check);
      }
    }

    const failures = checks.filter((check) => !check.pass).map((check) => ({
      eraKey: check.eraKey,
      face: check.face,
      view: check.view,
      signCount: check.signCount,
      facingCamera: check.facingCamera,
      titleWidthPx: check.titleWidthPx,
      titleBandPx: check.titleBandPx,
      ndcBounds: check.ndcBounds,
      croppedSamples: check.croppedSamples,
      blockedSamples: check.blockedSamples,
      targetMisses: check.targetMisses,
    }));
    return {
      schemaVersion: "museum-sign-visibility/1.0",
      criteria: {
        views: { front: "approach", back: "entrance_in" },
        sampleXs,
        sampleYs,
        cropLimit,
        targetTolerance,
        blockerTolerance,
        minTitleWidthPx,
        minTitleBandPx,
        canvasPixels: [canvas.width, canvas.height],
      },
      summary: {
        expectedChecks: shoot.sections.length * 2,
        actualChecks: checks.length,
        passed: checks.filter((check) => check.pass).length,
        failed: failures.length,
        softWarnings: softWarnings.length,
      },
      failures,
      softWarnings,
      checks,
    };
  });
  fs.writeFileSync(path.join(OUT, "sign_visibility_qa.json"), JSON.stringify(signVisibilityQa, null, 2));
  fs.writeFileSync(path.join(OUT, "browser_qa.json"), JSON.stringify({
    consoleErrors: errs,
    failedRequests,
    responseErrors,
  }, null, 2));
  fs.writeFileSync(path.join(OUT, "evidence_manifest.json"), JSON.stringify({
    schemaVersion: "museum-audit-evidence/1.0",
    generatedAt: new Date().toISOString(),
    url: URL,
    sectionCount: sections.length,
    viewCount: views.length,
    expectedImageCount: sections.length * views.length,
    qa: {
      scene: "scene_audit.json",
      architecture: "architecture_qa.json",
      signVisibility: "sign_visibility_qa.json",
      browser: "browser_qa.json",
    },
    sections: sections.map(s => ({
      id: s.id,
      eraKey: s.eraKey,
      name: s.name,
      period: s.period,
      images: views.map(view => `${s.eraKey}/${view}.jpg`),
    })),
  }, null, 2));
  console.log(`scene audit: bare=${audit.bare.length} zfight=${audit.zfight.length} intrusions=${audit.intrusions.length} meshes=${audit.meshCount}`);
  console.log(`architecture QA: signs=${architectureQa.counts?.signs ?? "n/a"} portals=${architectureQa.counts?.portals ?? "n/a"} decor/art=${architectureQa.decorArtOverlaps?.length ?? "n/a"} sign/portal=${architectureQa.signPortalIntersections?.length ?? "n/a"}`);
  console.log(`sign visibility QA: passed=${signVisibilityQa.summary.passed}/${signVisibilityQa.summary.actualChecks} failed=${signVisibilityQa.summary.failed} soft-warnings=${signVisibilityQa.summary.softWarnings}`);
  console.log("browser errors:", errs.length + failedRequests.length + responseErrors.length,
    { console: errs.slice(0, 5), failedRequests: failedRequests.slice(0, 5), responses: responseErrors.slice(0, 5) });
  if (signVisibilityQa.summary.failed > 0) {
    throw new Error(`Sign visibility release gate failed for ${signVisibilityQa.summary.failed} face(s)`);
  }
} finally {
  await browser.close();
}
