#!/usr/bin/env python3
"""Phase 4 distinctiveness check (QUALITY_PASS_PLAN.md): one contact sheet of
every room's approach shot — a reviewer must be able to name each era from its
thumbnail. Usage: python3 tools/distinctiveness_sheet.py [shotdir] [out]"""
import json
import sys
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
SHOTS = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "review" / "audit-after"
OUT = Path(sys.argv[2]) if len(sys.argv) > 2 else ROOT / "review" / "distinctiveness_sheet.jpg"

rooms = json.load(open(ROOT / "review" / "room_matrix.json"))["rooms"]
cols, cw, ch, cap = 6, 300, 200, 16
rows = (len(rooms) + cols - 1) // cols
sheet = Image.new("RGB", (cols * cw, rows * (ch + cap)), (18, 16, 14))
d = ImageDraw.Draw(sheet)
for i, r in enumerate(rooms):
    x, y = (i % cols) * cw, (i // cols) * (ch + cap)
    p = SHOTS / r["eraKey"] / "approach.jpg"
    if not p.exists():
        p = SHOTS / r["eraKey"] / "entrance_out.jpg"
    if p.exists():
        im = Image.open(p).convert("RGB")
        im.thumbnail((cw - 4, ch - 4))
        sheet.paste(im, (x + 2 + (cw - 4 - im.width) // 2, y + 2))
    d.text((x + 4, y + ch + 2), f'H{r["hallway"]:02d} {r["eraKey"]}', fill=(235, 225, 205))
sheet.save(OUT, quality=88)
print("wrote", OUT)
