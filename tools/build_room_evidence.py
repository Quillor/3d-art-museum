#!/usr/bin/env python3
"""Compose three final audit views per room into phone-friendly evidence sheets.

Usage:
    python tools/build_room_evidence.py review/final review/final-evidence

The input directory is produced by tools/audit_shots.mjs. Each output JPEG is
one 1200 px-wide vertical sheet containing the approach, left wall, and reverse
entrance views at a readable size on a phone. A JSON manifest records every
source frame so the evidence package is auditable rather than hand-selected.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageOps


VIEWS = (
    ("approach", "1 · APPROACH / ROOM NAME"),
    ("wall_left", "2 · COLLECTION WALL / MATERIALS"),
    ("entrance_in", "3 · INTERIOR / REVERSE SIGN"),
)
SHEET_WIDTH = 1200
PANEL_HEIGHT = 670
HEADER_HEIGHT = 92
CAPTION_HEIGHT = 52
GUTTER = 18
BG = "#151311"
FG = "#f2e9d8"
MUTED = "#b9aa92"


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    candidates = (
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf" if bold else
        "/System/Library/Fonts/Supplemental/Arial.ttf",
        "/System/Library/Fonts/Helvetica.ttc",
    )
    for candidate in candidates:
        try:
            return ImageFont.truetype(candidate, size=size, index=1 if bold and candidate.endswith(".ttc") else 0)
        except (OSError, ValueError):
            continue
    return ImageFont.load_default()


TITLE_FONT = font(34, bold=True)
CAPTION_FONT = font(22, bold=True)
META_FONT = font(19)


def fit_cover(image: Image.Image, width: int, height: int) -> Image.Image:
    return ImageOps.fit(
        image.convert("RGB"),
        (width, height),
        method=Image.Resampling.LANCZOS,
        centering=(0.5, 0.5),
    )


def room_title(room_key: str, registry: dict) -> str:
    room = registry.get(room_key, {})
    return room.get("displayTitle") or room_key.replace("_", " ").title()


def load_registry(path: Path) -> dict[str, dict]:
    if not path.exists():
        return {}
    payload = json.loads(path.read_text(encoding="utf-8"))
    return {room["eraKey"]: room for room in payload.get("rooms", [])}


def build_sheet(room_dir: Path, out_dir: Path, registry: dict) -> dict:
    missing = [key for key, _ in VIEWS if not (room_dir / f"{key}.jpg").exists()]
    if missing:
        raise FileNotFoundError(f"{room_dir.name}: missing {', '.join(missing)}")

    total_height = HEADER_HEIGHT + len(VIEWS) * (CAPTION_HEIGHT + PANEL_HEIGHT) + (len(VIEWS) + 1) * GUTTER
    sheet = Image.new("RGB", (SHEET_WIDTH, total_height), BG)
    draw = ImageDraw.Draw(sheet)
    title = room_title(room_dir.name, registry)
    room_id = registry.get(room_dir.name, {}).get("room_id", "")
    heading = f"{room_id} · {title}" if room_id else title
    draw.text((42, 22), heading.upper(), fill=FG, font=TITLE_FONT)
    draw.text((SHEET_WIDTH - 42, 34), room_dir.name, fill=MUTED, font=META_FONT, anchor="ra")

    y = HEADER_HEIGHT + GUTTER
    source_rows = []
    for key, caption in VIEWS:
        src = room_dir / f"{key}.jpg"
        draw.text((42, y + 7), caption, fill=FG, font=CAPTION_FONT)
        y += CAPTION_HEIGHT
        panel = fit_cover(Image.open(src), SHEET_WIDTH - 84, PANEL_HEIGHT)
        sheet.paste(panel, (42, y))
        draw.rectangle((41, y - 1, SHEET_WIDTH - 42, y + PANEL_HEIGHT), outline="#4a4339", width=2)
        source_rows.append({"view": key, "source": str(src.resolve())})
        y += PANEL_HEIGHT + GUTTER

    out_dir.mkdir(parents=True, exist_ok=True)
    output = out_dir / f"{room_dir.name}.jpg"
    sheet.save(output, "JPEG", quality=88, optimize=True, progressive=True)
    return {
        "eraKey": room_dir.name,
        "roomId": room_id or None,
        "title": title,
        "output": str(output.resolve()),
        "views": source_rows,
        "pixelSize": [SHEET_WIDTH, total_height],
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("input_dir", type=Path)
    parser.add_argument("output_dir", type=Path)
    parser.add_argument(
        "--registry",
        type=Path,
        default=Path("concept-art/room-designs.json"),
        help="Machine room registry used for display titles",
    )
    args = parser.parse_args()

    registry = load_registry(args.registry)
    room_dirs = sorted(
        path for path in args.input_dir.iterdir()
        if path.is_dir() and (path / "approach.jpg").exists()
    )
    if not room_dirs:
        raise SystemExit(f"No room audit directories found in {args.input_dir}")

    entries = [build_sheet(room_dir, args.output_dir, registry) for room_dir in room_dirs]
    manifest = {
        "schemaVersion": "museum-room-evidence/1.0",
        "inputDirectory": str(args.input_dir.resolve()),
        "roomCount": len(entries),
        "viewsPerRoom": len(VIEWS),
        "rooms": entries,
    }
    manifest_path = args.output_dir / "manifest.json"
    manifest_path.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(f"Built {len(entries)} room evidence sheets in {args.output_dir}")


if __name__ == "__main__":
    main()
