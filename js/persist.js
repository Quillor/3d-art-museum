// Saves the visitor's position + facing to localStorage so a mobile tab
// reload (memory pressure) resumes where they left off instead of the cave.
const KEY = "museum.pos.v1";

export function loadSaved() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const d = JSON.parse(raw);
    if (!d || typeof d !== "object") return null;
    const { x, z, yaw, pitch } = d;
    if (![x, z, yaw].every(Number.isFinite)) return null;
    if (Math.abs(x) > 500 || Math.abs(z) > 500) return null;
    return { x, z, yaw, pitch: Number.isFinite(pitch) ? Math.max(-0.7, Math.min(0.7, pitch)) : 0 };
  } catch {
    return null;
  }
}

export function savePos(pos, yaw, pitch) {
  try {
    localStorage.setItem(KEY, JSON.stringify({
      x: +pos.x.toFixed(2), z: +pos.z.toFixed(2),
      yaw: +yaw.toFixed(3), pitch: +pitch.toFixed(3),
    }));
  } catch { /* storage full or unavailable — resume just won't work */ }
}

export function clearSaved() {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
}
