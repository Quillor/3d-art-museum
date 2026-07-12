// Read-only architecture QA. This intentionally reports data without mutating
// the scene, so it is safe to call from the browser console or capture harness
// after asynchronous GLB parts have loaded.
import * as THREE from "three";

const _inv = new THREE.Matrix4();
const _corner = new THREE.Vector3();

function objectBoxInLocalSpace(object, localRoot) {
  _inv.copy(localRoot.matrixWorld).invert();
  const out = new THREE.Box3().makeEmpty();
  object.traverse((mesh) => {
    if (!mesh.isMesh || !mesh.geometry) return;
    if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
    const bb = mesh.geometry.boundingBox;
    for (const x of [bb.min.x, bb.max.x]) {
      for (const y of [bb.min.y, bb.max.y]) {
        for (const z of [bb.min.z, bb.max.z]) {
          _corner.set(x, y, z).applyMatrix4(mesh.matrixWorld).applyMatrix4(_inv);
          out.expandByPoint(_corner);
        }
      }
    }
  });
  return out;
}

export function auditArchitecture(scene, artManager) {
  scene.updateMatrixWorld(true);
  const signs = [];
  const portals = [];
  const decor = [];
  scene.traverse((o) => {
    if (o.userData.archSign) signs.push(o);
    if (o.userData.archPortal) portals.push(o);
    if (o.userData.archDecor) decor.push(o);
  });

  const decorArtOverlaps = [];
  for (const d of decor) {
    for (const item of artManager.items) {
      const clearance = item.group.userData.artClearance;
      if (!clearance || clearance.eraKey !== d.userData.archDecor.eraKey) continue;
      const local = objectBoxInLocalSpace(d, item.group);
      if (local.isEmpty()) continue;
      if (local.max.x <= -clearance.halfSpan || local.min.x >= clearance.halfSpan) continue;
      if (local.max.y <= -1.08 || local.min.y >= 1.08) continue;
      if (local.max.z <= -1.25 || local.min.z >= 1.25) continue;
      decorArtOverlaps.push({
        eraKey: clearance.eraKey,
        artId: item.art.id,
        decor: d.userData.archDecor.kind,
        decorName: d.name || "(unnamed)",
      });
    }
  }

  // Signs are intentionally surface-mounted on portal architecture. Treat the
  // mount as faulty only when the sign centre is buried behind the portal's
  // approach/reverse face, not merely because the two bounding boxes touch.
  const signPortalIntersections = [];
  for (const s of signs) {
    for (const p of portals) {
      if (p.userData.archPortal.eraKey !== s.userData.archSign.eraKey) continue;
      const localPortalBox = objectBoxInLocalSpace(p, p);
      if (localPortalBox.isEmpty()) continue;
      _inv.copy(p.matrixWorld).invert();
      const signCenter = s.getWorldPosition(new THREE.Vector3()).applyMatrix4(_inv);
      const front = s.userData.archSign.face === "front";
      const reversed = !!p.userData.archPortal.naturalArchitectureException;
      const approachPositive = reversed ? !front : front;
      const tolerance = 0.22;
      const safelyMounted = approachPositive
        ? signCenter.z >= localPortalBox.max.z - tolerance
        : signCenter.z <= localPortalBox.min.z + tolerance;
      if (!safelyMounted) {
        signPortalIntersections.push({
          eraKey: s.userData.archSign.eraKey,
          face: s.userData.archSign.face,
          portal: p.name || "Portal",
          signDepth: +signCenter.z.toFixed(3),
          portalDepth: [
            +localPortalBox.min.z.toFixed(3),
            +localPortalBox.max.z.toFixed(3),
          ],
        });
      }
    }
  }

  const signFacesByEra = {};
  for (const s of signs) {
    const { eraKey, face } = s.userData.archSign;
    signFacesByEra[eraKey] ||= [];
    signFacesByEra[eraKey].push(face);
  }
  for (const faces of Object.values(signFacesByEra)) faces.sort();

  const portalEraKeys = [...new Set(portals.map((p) => p.userData.archPortal.eraKey))].sort();
  const missingSigns = [];
  const duplicateSigns = [];
  for (const eraKey of portalEraKeys) {
    const faces = signFacesByEra[eraKey] || [];
    for (const face of ["front", "back"]) {
      const n = faces.filter((f) => f === face).length;
      if (n === 0) missingSigns.push({ eraKey, face });
      if (n > 1) duplicateSigns.push({ eraKey, face, count: n });
    }
  }

  const portalClearanceViolations = [];
  for (const p of portals) {
    const meta = p.userData.archPortal;
    if (!Number.isFinite(meta.clearWidth) || !Number.isFinite(meta.clearHeight)) {
      portalClearanceViolations.push({ eraKey: meta.eraKey, issue: "missing-clearance-contract" });
      continue;
    }
    const minHeight = meta.naturalArchitectureException ? 3.0 : 3.5;
    if (meta.clearWidth < 3.4 || meta.clearHeight < minHeight) {
      portalClearanceViolations.push({
        eraKey: meta.eraKey,
        clearWidth: meta.clearWidth,
        clearHeight: meta.clearHeight,
        required: [3.4, minHeight],
      });
    }
  }

  return {
    counts: { signs: signs.length, portals: portals.length, checkedDecor: decor.length },
    signFacesByEra,
    missingSigns,
    duplicateSigns,
    decorArtOverlaps,
    signPortalIntersections,
    portalClearanceViolations,
  };
}
