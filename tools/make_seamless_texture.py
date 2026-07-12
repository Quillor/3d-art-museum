#!/usr/bin/env python3
"""Build a deterministic, wrap-safe color texture from a preserved source.

The half-tile offset moves the source boundary into the tile interior. Raised-
cosine crossfades replace those interior seams with continuous source regions,
then a narrow opposite-edge blend makes the exported boundary periodic. This
does not synthesize normal, roughness, AO, or height data from the color image.
"""

from __future__ import annotations

import argparse
import math
from pathlib import Path

from PIL import Image, ImageChops, ImageStat


def raised_cosine_mask(length: int, crossfade_fraction: float) -> Image.Image:
    half_width = max(2.0, length * crossfade_fraction * 0.5)
    center = (length - 1) * 0.5
    values = []
    for position in range(length):
        distance = abs(position - center)
        if distance >= half_width:
            weight = 0.0
        else:
            weight = 0.5 * (1.0 + math.cos(math.pi * distance / half_width))
        values.append(round(255.0 * weight))
    mask = Image.new("L", (length, 1))
    mask.putdata(values)
    return mask


def crossfade_offset_seams(image: Image.Image, fraction: float) -> Image.Image:
    width, height = image.size
    offset_x = width // 2
    offset_y = height // 2

    shifted_xy = ImageChops.offset(image, offset_x, offset_y)
    shifted_y = ImageChops.offset(image, 0, offset_y)
    shifted_x = ImageChops.offset(image, offset_x, 0)

    mask_x = raised_cosine_mask(width, fraction).resize(
        (width, height), Image.Resampling.NEAREST
    )
    mask_y = raised_cosine_mask(height, fraction).rotate(90, expand=True).resize(
        (width, height), Image.Resampling.NEAREST
    )

    # Use unshifted content only around the new interior seam. The outer edge
    # stays on adjacent source pixels and therefore remains naturally periodic.
    vertical_base = Image.composite(shifted_y, shifted_xy, mask_x)
    vertical_alt = Image.composite(image, shifted_x, mask_x)
    return Image.composite(vertical_alt, vertical_base, mask_y)


def blend_opposite_edges(image: Image.Image, fraction: float) -> Image.Image:
    result = image.copy()
    pixels = result.load()
    width, height = result.size
    band_x = max(2, min(width // 4, round(width * fraction)))
    band_y = max(2, min(height // 4, round(height * fraction)))

    def weight(index: int, band: int) -> float:
        if band <= 1:
            return 1.0
        return 0.5 * (1.0 + math.cos(math.pi * index / (band - 1)))

    for y in range(height):
        for index in range(band_x):
            left_x = index
            right_x = width - 1 - index
            left = pixels[left_x, y]
            right = pixels[right_x, y]
            average = tuple(round((a + b) * 0.5) for a, b in zip(left, right))
            strength = weight(index, band_x)
            pixels[left_x, y] = tuple(
                round(a + (m - a) * strength) for a, m in zip(left, average)
            )
            pixels[right_x, y] = tuple(
                round(b + (m - b) * strength) for b, m in zip(right, average)
            )

    for x in range(width):
        for index in range(band_y):
            top_y = index
            bottom_y = height - 1 - index
            top = pixels[x, top_y]
            bottom = pixels[x, bottom_y]
            average = tuple(round((a + b) * 0.5) for a, b in zip(top, bottom))
            strength = weight(index, band_y)
            pixels[x, top_y] = tuple(
                round(a + (m - a) * strength) for a, m in zip(top, average)
            )
            pixels[x, bottom_y] = tuple(
                round(b + (m - b) * strength) for b, m in zip(bottom, average)
            )

    return result


def combined_edge_rms(image: Image.Image) -> tuple[float, float]:
    width, height = image.size
    left = image.crop((0, 0, 1, height))
    right = image.crop((width - 1, 0, width, height))
    top = image.crop((0, 0, width, 1))
    bottom = image.crop((0, height - 1, width, height))

    def combined(first: Image.Image, second: Image.Image) -> float:
        channels = ImageStat.Stat(ImageChops.difference(first, second)).rms
        return math.sqrt(sum(value * value for value in channels) / len(channels))

    return combined(left, right), combined(top, bottom)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--size", type=int, required=True)
    parser.add_argument("--quality", type=int, default=92)
    parser.add_argument("--interior-crossfade", type=float, default=0.30)
    parser.add_argument("--edge-blend", type=float, default=0.04)
    args = parser.parse_args()

    if not 0.05 <= args.interior_crossfade <= 0.75:
        parser.error("--interior-crossfade must be between 0.05 and 0.75")
    if not 0.005 <= args.edge_blend <= 0.15:
        parser.error("--edge-blend must be between 0.005 and 0.15")

    with Image.open(args.source) as opened:
        source = opened.convert("RGB").resize(
            (args.size, args.size), Image.Resampling.LANCZOS
        )
    seamless = crossfade_offset_seams(source, args.interior_crossfade)
    seamless = blend_opposite_edges(seamless, args.edge_blend)

    args.output.parent.mkdir(parents=True, exist_ok=True)
    seamless.save(
        args.output,
        format="JPEG",
        quality=args.quality,
        optimize=True,
        progressive=True,
        subsampling=0,
    )

    with Image.open(args.output) as exported:
        lr_rms, tb_rms = combined_edge_rms(exported.convert("RGB"))
    print(
        f"{args.output}: {args.size}x{args.size}; "
        f"edge RMS LR={lr_rms:.3f}, TB={tb_rms:.3f}"
    )


if __name__ == "__main__":
    main()
