// Device profile: mobile / low-memory devices get lighter GPU settings so
// the browser is less likely to kill and reload the tab under memory pressure.
export const isMobile =
  /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) ||
  (matchMedia("(pointer: coarse)").matches && navigator.maxTouchPoints > 0);

const lowMemory = navigator.deviceMemory !== undefined && navigator.deviceMemory <= 4;

export const QUALITY = (isMobile || lowMemory)
  ? { pixelRatioCap: 1.5, maxTex: 512, loadDist: 24, unloadDist: 38, anisotropy: 4 }
  : { pixelRatioCap: 2, maxTex: 768, loadDist: 30, unloadDist: 55, anisotropy: 8 };
