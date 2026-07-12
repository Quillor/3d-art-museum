// Shared museum layout dimensions used by both artwork placement and
// architecture/decor keep-outs. Keep these values in one place: wall decor must
// reserve the complete maximum artwork footprint, including frame and plaque,
// rather than relying on a smaller centre-to-centre guess.

export const ART_MAX_W = 2.35;
export const ART_MAX_H = 1.75;
export const ART_FRAME_PAD = 0.17;
export const ART_PLAQUE_W = 0.52;
export const ART_PLAQUE_H = 0.30;
export const ART_PLAQUE_GAP = 0.48;
export const ART_CLEAR_MARGIN = 0.14;

export function artworkWallHalfSpan({
  maxW = ART_MAX_W,
  framePad = ART_FRAME_PAD,
  plaqueW = ART_PLAQUE_W,
  plaqueGap = ART_PLAQUE_GAP,
  margin = ART_CLEAR_MARGIN,
} = {}) {
  const framedHalf = (maxW + framePad) / 2;
  const plaqueEdge = maxW / 2 + plaqueGap + plaqueW / 2;
  return Math.max(framedHalf, plaqueEdge) + margin;
}

export const ART_WALL_KEEP_OUT_HALF = artworkWallHalfSpan();

// `arts` is the list of Z anchors on one wall. `objectHalfSpan` reserves the
// candidate decor's own width. `plaqueDirection` is the wall-local direction
// the one-sided plaque extends along corridor Z (-1 left wall, +1 right wall).
// A zero direction deliberately uses the conservative symmetric envelope.
export function isWallArtClear(z, arts, objectHalfSpan = 0, plaqueDirection = 0) {
  const half = Math.max(0, objectHalfSpan);
  const frameHalf = (ART_MAX_W + ART_FRAME_PAD) / 2 + ART_CLEAR_MARGIN;
  const plaqueExtent = ART_MAX_W / 2 + ART_PLAQUE_GAP + ART_PLAQUE_W / 2 + ART_CLEAR_MARGIN;
  return !arts.some((anchorZ) => {
    if (!plaqueDirection) return Math.abs(anchorZ - z) < ART_WALL_KEEP_OUT_HALF + half;
    const lo = anchorZ - (plaqueDirection < 0 ? plaqueExtent : frameHalf);
    const hi = anchorZ + (plaqueDirection > 0 ? plaqueExtent : frameHalf);
    return z + half > lo && z - half < hi;
  });
}

export function filterWallArtClear(spots, arts, objectHalfSpan = 0, plaqueDirection = 0) {
  return spots.filter((z) => isWallArtClear(z, arts, objectHalfSpan, plaqueDirection));
}
