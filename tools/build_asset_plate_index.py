#!/usr/bin/env python3
"""Compose Blender evidence renders into labeled six-view asset sheets."""

from __future__ import annotations

import html
import json
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
MANIFEST = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else ROOT / "review/asset-plates/manifest.json"
OUT = Path(sys.argv[2]).resolve() if len(sys.argv) > 2 else ROOT / "review/asset-plates/sheets"
ORDER = ["front", "back", "top", "left", "right", "three_quarter"]


def font(size: int, bold: bool = False):
    candidates = [
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf" if bold else "/System/Library/Fonts/Supplemental/Arial.ttf",
        "/System/Library/Fonts/SFNS.ttf",
    ]
    for candidate in candidates:
        try:
            return ImageFont.truetype(candidate, size)
        except OSError:
            pass
    return ImageFont.load_default()


def compose(asset: dict) -> Path:
    tile = 420
    header = 112
    sheet = Image.new("RGB", (tile * 3, header + tile * 2), (18, 16, 14))
    draw = ImageDraw.Draw(sheet)
    dims = asset["dimensions_m"]
    draw.text((24, 18), f'{asset["model_id"]} · {asset["part"]}', fill=(242, 231, 211), font=font(30, True))
    draw.text(
        (24, 59),
        f'W {dims[0]:.3f} m  ·  D {dims[1]:.3f} m  ·  H {dims[2]:.3f} m  ·  {asset["triangles"]:,} triangles',
        fill=(192, 174, 145),
        font=font(20),
    )
    for i, view in enumerate(ORDER):
        x = (i % 3) * tile
        y = header + (i // 3) * tile
        image_path = ROOT / asset["views"][view]
        image = Image.open(image_path).convert("RGB")
        image.thumbnail((tile - 12, tile - 42), Image.Resampling.LANCZOS)
        sheet.paste(image, (x + (tile - image.width) // 2, y + 32 + (tile - 38 - image.height) // 2))
        draw.rectangle((x, y, x + tile - 1, y + tile - 1), outline=(74, 65, 52), width=1)
        draw.text((x + 14, y + 7), view.replace("_", " ").upper(), fill=(218, 194, 154), font=font(17, True))
    model_dir = OUT / asset["model_id"]
    model_dir.mkdir(parents=True, exist_ok=True)
    output = model_dir / f'{asset["part_id"].split(":", 1)[1]}.jpg'
    sheet.save(output, quality=91, subsampling=0)
    return output


def main() -> None:
    data = json.loads(MANIFEST.read_text(encoding="utf-8"))
    OUT.mkdir(parents=True, exist_ok=True)
    rows = []
    for asset in data["assets"]:
        path = compose(asset)
        rows.append((asset, path))
    cards = []
    for asset, path in rows:
        rel = path.relative_to(OUT.parent).as_posix()
        cards.append(
            f'<figure data-model="{html.escape(asset["model_id"])}">'
            f'<img src="{html.escape(rel)}" loading="lazy" alt="{html.escape(asset["part"])} orthographic plate">'
            f'<figcaption>{html.escape(asset["model_id"])} · {html.escape(asset["part"])}</figcaption></figure>'
        )
    index = OUT.parent / "index.html"
    page = (
        '<!doctype html><html lang="en"><meta charset="utf-8">'
        '<meta name="viewport" content="width=device-width,initial-scale=1">\n'
        '<link rel="icon" href="data:,">'
        '<title>Museum asset plates</title><style>'
        'body{margin:0;background:#12100e;color:#eadfcd;font:15px system-ui;padding:24px}'
        'h1{font:600 30px Georgia;margin:0 0 8px}'
        'p{color:#b8a98e;max-width:78ch}'
        '.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(420px,1fr));gap:20px}'
        'figure{margin:0;background:#1b1814;border:1px solid #443b30;padding:9px}'
        'img{display:block;width:100%;height:auto}'
        'figcaption{padding:9px 4px 2px;color:#d8c49f}'
        '</style><h1>Blender asset orthographic plates</h1>'
        '<p>Front, back, top, left, right, and three-quarter evidence views. '
        'Dimensions are evaluated in meters from the exported GLB.</p>'
        '<div class="grid">'
        + "\n".join(cards)
        + '</div></html>\n'
    )
    index.write_text(page, encoding="utf-8")
    print(f"wrote {len(rows)} asset sheets and {index}")


if __name__ == "__main__":
    main()
