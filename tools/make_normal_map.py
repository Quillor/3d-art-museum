#!/usr/bin/env python3
"""Derive a tangent-space normal map from an albedo image's luminance (Sobel height-field).

Usage: python3 tools/make_normal_map.py <in.png|jpg> <out_normal.jpg> [strength]
"""
import sys
import numpy as np
from PIL import Image


def make_normal_map(src_path, out_path, strength=3.0):
    im = Image.open(src_path).convert("L")
    h = np.asarray(im, dtype=np.float32) / 255.0

    # Sobel gradients, wrapped (seamless tiling source -> seamless normal map)
    hx = np.roll(h, -1, axis=1) - np.roll(h, 1, axis=1)
    hy = np.roll(h, -1, axis=0) - np.roll(h, 1, axis=0)

    nx = -hx * strength
    ny = -hy * strength
    nz = np.ones_like(h)

    length = np.sqrt(nx * nx + ny * ny + nz * nz)
    nx, ny, nz = nx / length, ny / length, nz / length

    r = ((nx * 0.5 + 0.5) * 255).astype(np.uint8)
    g = ((ny * 0.5 + 0.5) * 255).astype(np.uint8)
    b = ((nz * 0.5 + 0.5) * 255).astype(np.uint8)

    normal = np.stack([r, g, b], axis=-1)
    Image.fromarray(normal, mode="RGB").save(out_path, quality=92)
    print(f"wrote {out_path} ({normal.shape[1]}x{normal.shape[0]})")


if __name__ == "__main__":
    src, out = sys.argv[1], sys.argv[2]
    strength = float(sys.argv[3]) if len(sys.argv) > 3 else 3.0
    make_normal_map(src, out, strength)
