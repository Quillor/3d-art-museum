#!/usr/bin/env python3
"""Rebuild museum texture files from documented photographic sources.

The script intentionally lives in review/ because the brief only allows changes
under assets/textures/ and review/. It keeps the existing texture filenames and
extensions, caches source downloads, writes provenance ledgers, and emits 3x3
tiling montages for QA.
"""

from __future__ import annotations

import csv
import io
import json
import math
import os
import re
import shutil
import sys
import textwrap
import time
import urllib.parse
import urllib.request
import urllib.error
import zipfile
from dataclasses import dataclass
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageEnhance, ImageFilter, ImageOps, ImageStat


ROOT = Path(__file__).resolve().parents[1]
TEXTURE_DIR = ROOT / "assets" / "textures"
REVIEW_DIR = ROOT / "review"
SOURCE_DIR = REVIEW_DIR / "source_assets"
MONTAGE_DIR = REVIEW_DIR / "texture_montages"
ORIGINAL_DIR = REVIEW_DIR / "original_textures_backup"


AMBIENT_LICENSE = "CC0 / Public Domain equivalent (ambientCG)"
AMBIENT_SOURCES = {
    "warm_sandstone": ("Bricks084", "Warm sandstone block scan"),
    "sandstone_floor": ("Tiles144", "Golden rough sandstone tile scan"),
    "cool_limestone": ("Tiles143", "Rough beige limestone tile scan"),
    "grey_stone": ("Rock051", "Grey rock/stone scan"),
    "grey_stone_wall": ("Bricks098", "Irregular grey-beige stone wall scan"),
    "grey_paving": ("PavingStones142", "Dark grey medieval paving stone scan"),
    "marble": ("Marble021", "Bright white veined marble scan"),
    "plaster": ("Plaster001", "Rough white stucco/plaster scan"),
    "earth": ("Ground103", "Old brown dirt/earth scan"),
    "rock_dirt": ("Ground068", "Dirt and rock ground scan"),
    "brick": ("Bricks071", "Orange fired brick wall scan"),
    "old_brick": ("Bricks097", "Old damaged red-brown brick scan"),
    "glazed_tile": ("Tiles135B", "Old dark blue glazed tile scan"),
    "wood": ("WoodFloor051", "Polished light parquet/plank floor scan"),
    "dark_wood": ("WoodFloor064", "Dark parquet/plank floor scan"),
    "fabric": ("Fabric019", "White woven fabric scan"),
    "red_fabric": ("Fabric016", "Red woven fabric scan"),
    "paper": ("Paper006", "Warm brown handmade paper scan"),
    "white_paper": ("Paper001", "White paper scan"),
    "tatami": ("Tatami001", "Yellow tatami mat scan"),
    "terrazzo": ("Terrazzo013", "White terrazzo scan"),
}


EXACT_COMMONS = {
    "damask": (
        "Woven_silk_damask_MET_DP-12900-001.jpg",
        "Woven silk damask, Italian/Venetian, mid 17th century, The Met",
        "Public domain / Met Open Access via Wikimedia Commons",
    ),
    "adobe_basket": (
        "Basket,_Apache_people,_Arizona,_c._1900,_coiled_willow_and_devil's_claw_-_Chazen_Museum_of_Art_-_DSC01849.JPG",
        "Apache coiled willow and devil's claw basket, Chazen Museum of Art",
        "Public domain",
    ),
    "zellige": (
        "Ceramic_Tile_Tessellations_in_Marrakech_(detail).jpg",
        "Islamic ceramic tile tessellations in Marrakech, Morocco",
        "CC BY-SA 3.0",
    ),
    "mudcloth": (
        "BogolanMali4.JPG",
        "Malian bogolan / mudcloth textile",
        "CC BY-SA 3.0",
    ),
    "baroque_fresco": (
        "G.B.Gaulli-Triumph_of_the_Name_of_Jesus.jpg",
        "Giovanni Battista Gaulli, Triumph of the Name of Jesus ceiling fresco",
        "Wikimedia Commons free license / public-domain artwork",
    ),
    "inca_textile": (
        "Tupa-inca-tunic.png",
        "Tupa / tocapu Inca tunic, Dumbarton Oaks",
        "Wikimedia Commons free license",
    ),
    "islamic_arabesque": (
        "Arabescos_en_la_Alhambra.JPG",
        "Arabesque plaster carvings in the Alhambra",
        "CC BY-SA 3.0 / GFDL",
    ),
    "islamic_muqarnas": (
        "Detail_ceiling_two_sisters_hall_Alhambra_Granada_Spain.jpg",
        "Muqarnas ceiling detail, Hall of the Two Sisters, Alhambra",
        "CC0 1.0",
    ),
    "japan_scroll": (
        "破墨山水図-Splashed-Ink_Landscape_MET_DP-12232-043.jpg",
        "Bokusho Shusho, Splashed-Ink Landscape hanging scroll, The Met",
        "CC0 / Met Open Access via Wikimedia Commons",
    ),
    "khmer_apsara": (
        "Apsara_Relief_Sculpture_on_Angkor_Wat_Temple_Wall_Feb_10_2000.jpg",
        "Apsara relief sculpture on Angkor Wat temple wall",
        "Wikimedia Commons free license",
    ),
    "khmer_lintel": (
        "Fronton_Cambodge_Musée_Guimet_9972.jpg",
        "Cambodian Banteay Srei sandstone pediment, Musée Guimet",
        "Wikimedia Commons free license",
    ),
    "meso_mask": (
        "TurquoiseAztecMask.jpg",
        "Mixtec-Aztec turquoise mask, British Museum",
        "Wikimedia Commons free license",
    ),
    "meso_greca": (
        "FretworkRoomPalace1Mitla.JPG",
        "Stone fretwork room, Palace of Columns, Mitla, Oaxaca",
        "CC BY-SA 3.0 / GFDL",
    ),
    "lamassu": (
        "A_front_picture_of_Lamassu_from_The_British_Museum.jpg",
        "Lamassu from the Throne Room, North-West Palace at Nimrud, British Museum",
        "Wikimedia Commons free license",
    ),
    "mesopotamia_procession": (
        "Alabaster_bas-relief,_procession_of_Assyrian_warriors,_reign_of_Sennacherib,_from_Nineveh,_Iraq._7th_century_BCE._Pergamon_Museum,_Berlin.jpg",
        "Alabaster bas-relief, procession of Assyrian warriors, Pergamon Museum",
        "Wikimedia Commons free license",
    ),
    "ochre_figures": (
        "Lascaux2.jpg",
        "Lascaux cave painting photograph / public-domain Paleolithic art",
        "Public domain",
    ),
    "persia_guard": (
        "Persépolis,_Irán,_2016-09-24,_DD_15.jpg",
        "Bas-reliefs of Achaemenid warriors at Tachara, Persepolis",
        "Wikimedia Commons free license",
    ),
    "persia_wingdisk": (
        "Ahuramazda_in_the_winged_disk,_from_the_Hall_of_100_Columns,_Persepolis,_Achaemenid_Persia,_486-460_BC,_limestone,_traces_of_paint_-_Sackler_Museum_-_Harvard_University_-_DSC01735.jpg",
        "Ahuramazda in the winged disk from Persepolis, Sackler Museum",
        "Public domain",
    ),
    "renaissance_fresco": (
        "Raphael_School_of_Athens.jpg",
        "Raphael, The School of Athens fresco",
        "Public domain",
    ),
    "stained_glass": (
        "York_Minster_window_n16_\"The_Five_sisters\"_(16157008236).jpg",
        "York Minster Five Sisters lancet windows",
        "Wikimedia Commons free license",
    ),
}


DISABLED_SOURCE_KEYS = {
    # The resolved file is a photographed display/case rather than a usable flat
    # bogolan textile crop; keeping it would be a motif downgrade.
    "mudcloth",
}


COMMONS_QUERIES = {
    "hieroglyphs": "Karnak sandstone hieroglyph relief",
    "egypt_deity": "Egyptian temple relief deity sandstone",
    "greek_meander": "Greek key meander stone frieze",
    "archers": "Assyrian archers relief British Museum",
    "ishtar": "Ishtar Gate glazed brick lion relief",
    "iznik": "Iznik tile pattern blue red museum",
    "zellige": "Moroccan zellige tile photo",
    "mudcloth": "Bogolan mud cloth textile",
    "baroque_fresco": "Baroque ceiling fresco Wikimedia Commons",
    "inca_textile": "Inca textile pattern museum",
    "indus_seal": "Indus Valley seal unicorn",
    "islamic_arabesque": "Alhambra arabesque plaster",
    "islamic_muqarnas": "Alhambra muqarnas plaster",
    "japan_scroll": "Japanese handscroll painting public domain",
    "khmer_apsara": "Angkor apsara relief sandstone",
    "khmer_lintel": "Khmer lintel relief sandstone",
    "meso_mask": "Maya deity mask stone relief",
    "meso_greca": "Mitla greca stone relief",
    "lamassu": "Lamassu relief British Museum",
    "mesopotamia_procession": "Assyrian procession relief",
    "ochre_figures": "Lascaux cave painting public domain",
    "persia_guard": "Persepolis guard relief",
    "persia_wingdisk": "Persepolis winged symbol relief",
    "renaissance_fresco": "Renaissance fresco grotesque ornament",
    "stained_glass": "Gothic lancet stained glass window",
    "damask": "damask fabric textile close up",
    "tapa": "Tapa cloth barkcloth pattern",
}


@dataclass(frozen=True)
class Source:
    key: str
    label: str
    url: str
    license: str
    path: Path


LEDGER: list[dict[str, str]] = []
SOURCES: dict[str, Source] = {}


def urlopen(url: str, timeout: int = 120) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": "3d-art-museum-texture-rebuild/1.0"})
    last_exc: Exception | None = None
    for attempt in range(5):
        try:
            with urllib.request.urlopen(req, timeout=timeout) as r:
                return r.read()
        except urllib.error.HTTPError as exc:
            last_exc = exc
            if exc.code in {429, 500, 502, 503, 504}:
                time.sleep(2.5 * (attempt + 1))
                continue
            raise
        except urllib.error.URLError as exc:
            last_exc = exc
            time.sleep(1.5 * (attempt + 1))
    raise RuntimeError(f"Failed to fetch {url}: {last_exc}")


def ensure_dirs() -> None:
    SOURCE_DIR.mkdir(parents=True, exist_ok=True)
    MONTAGE_DIR.mkdir(parents=True, exist_ok=True)
    ORIGINAL_DIR.mkdir(parents=True, exist_ok=True)
    for p in TEXTURE_DIR.iterdir():
        if p.is_file() and not (ORIGINAL_DIR / p.name).exists():
            shutil.copy2(p, ORIGINAL_DIR / p.name)


def download_ambient(key: str, asset_id: str, label: str) -> Source:
    zip_path = SOURCE_DIR / f"{asset_id}_1K-JPG.zip"
    if not zip_path.exists():
        url = f"https://ambientCG.com/get?file={asset_id}_1K-JPG.zip"
        print(f"Downloading ambientCG {asset_id}...")
        zip_path.write_bytes(urlopen(url))
    out_path = SOURCE_DIR / f"{asset_id}_Color.jpg"
    if not out_path.exists():
        with zipfile.ZipFile(zip_path) as z:
            color_names = [n for n in z.namelist() if n.lower().endswith("_color.jpg")]
            if not color_names:
                raise RuntimeError(f"No Color.jpg in {zip_path}")
            out_path.write_bytes(z.read(color_names[0]))
    return Source(key, label, f"https://ambientCG.com/view?id={asset_id}", AMBIENT_LICENSE, out_path)


def download_commons_exact(key: str, filename: str, label: str, license_name: str) -> Source | None:
    cache_meta = SOURCE_DIR / f"commons_{key}.json"
    if cache_meta.exists():
        meta = json.loads(cache_meta.read_text())
        return Source(key, meta["label"], meta["url"], meta["license"], SOURCE_DIR / meta["file"])
    if os.environ.get("EXACT_COMMONS_CACHE_ONLY") == "1":
        return None

    page_url = f"https://commons.wikimedia.org/wiki/File:{urllib.parse.quote(filename.replace(' ', '_'))}"
    file_url = f"https://commons.wikimedia.org/wiki/Special:FilePath/{urllib.parse.quote(filename)}?width=2400"
    file_path = SOURCE_DIR / f"commons_{key}.jpg"
    try:
        file_path.write_bytes(urlopen(file_url, timeout=90))
        Image.open(file_path).verify()
    except Exception as exc:
        print(f"WARN: exact Commons source failed for {key}: {filename} ({exc})")
        file_path.unlink(missing_ok=True)
        return None

    meta = {"label": label, "url": page_url, "license": license_name, "file": file_path.name}
    cache_meta.write_text(json.dumps(meta, indent=2, ensure_ascii=False))
    time.sleep(0.4)
    return Source(key, label, page_url, license_name, file_path)


def commons_api(params: dict[str, str]) -> dict:
    params = {"format": "json", "origin": "*", **params}
    url = "https://commons.wikimedia.org/w/api.php?" + urllib.parse.urlencode(params)
    return json.loads(urlopen(url, timeout=60).decode("utf-8"))


def safe_name(s: str) -> str:
    return re.sub(r"[^a-z0-9]+", "_", s.lower()).strip("_")


def download_commons(key: str, query: str) -> Source | None:
    cache_meta = SOURCE_DIR / f"commons_{key}.json"
    if cache_meta.exists():
        meta = json.loads(cache_meta.read_text())
        return Source(key, meta["label"], meta["url"], meta["license"], SOURCE_DIR / meta["file"])
    if os.environ.get("COMMONS_CACHE_ONLY") == "1":
        return None

    print(f"Searching Commons: {query}")
    data = commons_api({
        "action": "query",
        "generator": "search",
        "gsrsearch": query,
        "gsrnamespace": "6",
        "gsrlimit": "24",
        "prop": "imageinfo",
        "iiprop": "url|mime|size|extmetadata",
        "iiurlwidth": "2200",
    })
    pages = list(data.get("query", {}).get("pages", {}).values())
    pages.sort(key=lambda p: p.get("index", 999))
    for page in pages:
        info = (page.get("imageinfo") or [{}])[0]
        mime = info.get("mime", "")
        if not mime.startswith("image/"):
            continue
        url = info.get("thumburl") or info.get("url")
        if not url:
            continue
        title = page.get("title", "Commons image")
        ext = Path(urllib.parse.urlparse(url).path).suffix.lower()
        if ext not in {".jpg", ".jpeg", ".png", ".webp"}:
            ext = ".jpg"
        file_path = SOURCE_DIR / f"commons_{key}{ext}"
        try:
            time.sleep(0.4)
            file_path.write_bytes(urlopen(url, timeout=90))
            Image.open(file_path).verify()
        except Exception:
            file_path.unlink(missing_ok=True)
            continue
        extmeta = info.get("extmetadata", {})
        license_short = extmeta.get("LicenseShortName", {}).get("value", "Wikimedia Commons license")
        artist = re.sub("<[^>]+>", "", extmeta.get("Artist", {}).get("value", "")).strip()
        desc_url = info.get("descriptionurl") or f"https://commons.wikimedia.org/wiki/{urllib.parse.quote(title.replace(' ', '_'))}"
        label = title.replace("File:", "")
        if artist:
            label += f" by {artist[:120]}"
        meta = {"label": label, "url": desc_url, "license": license_short, "file": file_path.name}
        cache_meta.write_text(json.dumps(meta, indent=2))
        time.sleep(0.8)
        return Source(key, label, desc_url, license_short, file_path)
    return None


def load_sources() -> None:
    for key, (asset_id, label) in AMBIENT_SOURCES.items():
        SOURCES[key] = download_ambient(key, asset_id, label)
    for key, (filename, label, license_name) in EXACT_COMMONS.items():
        if key in DISABLED_SOURCE_KEYS:
            continue
        src = download_commons_exact(key, filename, label, license_name)
        if src:
            SOURCES[key] = src
    for key, query in COMMONS_QUERIES.items():
        if key in DISABLED_SOURCE_KEYS:
            continue
        if key in SOURCES:
            continue
        src = download_commons(key, query)
        if src:
            SOURCES[key] = src
        else:
            print(f"WARN: no Commons source for {key}: {query}")


def rgb_from_hex(hex_color: str) -> tuple[float, float, float]:
    h = hex_color.strip().lstrip("#")
    if h.startswith("0x"):
        h = h[2:]
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def open_rgb(path: Path) -> Image.Image:
    im = Image.open(path)
    if im.mode not in {"RGB", "RGBA"}:
        im = im.convert("RGB")
    if im.mode == "RGBA":
        bg = Image.new("RGB", im.size, (235, 230, 216))
        bg.paste(im, mask=im.split()[-1])
        im = bg
    return im.convert("RGB")


def cover(im: Image.Image, size: tuple[int, int]) -> Image.Image:
    w, h = im.size
    tw, th = size
    scale = max(tw / w, th / h)
    nw, nh = max(tw, round(w * scale)), max(th, round(h * scale))
    im = im.resize((nw, nh), Image.Resampling.LANCZOS)
    left = (nw - tw) // 2
    top = (nh - th) // 2
    return im.crop((left, top, left + tw, top + th))


def mirror_seamless(im: Image.Image, size: tuple[int, int], horizontal_only: bool = False) -> Image.Image:
    tw, th = size
    if horizontal_only:
        half = cover(im, (max(1, tw // 2), th))
        out = Image.new("RGB", size)
        out.paste(half, (0, 0))
        out.paste(ImageOps.mirror(half), (tw // 2, 0))
        return out
    quarter = cover(im, (max(1, tw // 2), max(1, th // 2)))
    out = Image.new("RGB", size)
    out.paste(quarter, (0, 0))
    out.paste(ImageOps.mirror(quarter), (tw // 2, 0))
    out.paste(ImageOps.flip(quarter), (0, th // 2))
    out.paste(ImageOps.flip(ImageOps.mirror(quarter)), (tw // 2, th // 2))
    return out


def match_palette(im: Image.Image, target_hex: str, strength: float = 0.72, contrast: float = 1.03) -> Image.Image:
    im = im.convert("RGB")
    target = rgb_from_hex(target_hex)
    mean = ImageStat.Stat(im.resize((1, 1), Image.Resampling.BOX)).mean
    scales = [(target[i] + 18) / (mean[i] + 18) for i in range(3)]
    channels = []
    for i, ch in enumerate(im.split()):
        lut = [max(0, min(255, round(v * scales[i]))) for v in range(256)]
        channels.append(ch.point(lut))
    out = Image.merge("RGB", channels)
    tint = Image.new("RGB", out.size, tuple(round(v) for v in target))
    out = Image.blend(out, tint, strength * 0.22)
    out = ImageEnhance.Color(out).enhance(max(0.25, 1 - strength * 0.18))
    out = ImageEnhance.Contrast(out).enhance(contrast)
    return out


def sharpen_material(im: Image.Image, amount: float = 0.55) -> Image.Image:
    smooth = im.filter(ImageFilter.GaussianBlur(0.55))
    detail = ImageChops.subtract(im, smooth, scale=1.25, offset=128)
    return Image.blend(im, ImageChops.add(im, ImageChops.subtract(detail, Image.new("RGB", im.size, (128, 128, 128)))), amount * 0.18)


def source_image(key: str) -> Image.Image:
    return open_rgb(SOURCES[key].path)


def crop_fraction(im: Image.Image, box: tuple[float, float, float, float]) -> Image.Image:
    w, h = im.size
    l, t, r, b = box
    return im.crop((round(l * w), round(t * h), round(r * w), round(b * h)))


def material_tile(key: str, size: tuple[int, int], target: str, strength: float = 0.72) -> Image.Image:
    im = cover(source_image(key), size)
    im = match_palette(im, target, strength=strength)
    return sharpen_material(im)


def photo_tile(key: str, size: tuple[int, int], target: str, strength: float = 0.62, horizontal_only: bool = False) -> Image.Image:
    if key not in SOURCES:
        raise KeyError(key)
    im = mirror_seamless(source_image(key), size, horizontal_only=horizontal_only)
    im = match_palette(im, target, strength=strength)
    return sharpen_material(im)


def photo_tile_crop(
    key: str,
    size: tuple[int, int],
    target: str,
    strength: float,
    crop_box: tuple[float, float, float, float],
    horizontal_only: bool = False,
) -> Image.Image:
    if key not in SOURCES:
        raise KeyError(key)
    src = crop_fraction(source_image(key), crop_box)
    im = mirror_seamless(src, size, horizontal_only=horizontal_only)
    im = match_palette(im, target, strength=strength)
    return sharpen_material(im)


def make_alpha_panel(im: Image.Image, size: tuple[int, int], target: str, alpha_shape: str = "full") -> Image.Image:
    im = cover(im, size)
    im = match_palette(im, target, strength=0.44, contrast=1.07)
    rgba = im.convert("RGBA")
    if alpha_shape != "full":
        alpha = Image.new("L", size, 0)
        d = ImageDraw.Draw(alpha)
        pad_x, pad_y = round(size[0] * 0.045), round(size[1] * 0.035)
        if alpha_shape == "basket":
            d.ellipse((pad_x, pad_y, size[0] - pad_x, size[1] - pad_y), fill=255)
        else:
            d.rounded_rectangle((pad_x, pad_y, size[0] - pad_x, size[1] - pad_y), radius=max(4, min(size) // 34), fill=255)
        alpha = alpha.filter(ImageFilter.GaussianBlur(0.45))
        rgba.putalpha(alpha)
    else:
        rgba.putalpha(Image.new("L", size, 255))
    return rgba


def save_image(name: str, im: Image.Image, source_keys: list[str], base: str, status: str = "PASS", note: str = "") -> None:
    out = TEXTURE_DIR / name
    out.parent.mkdir(parents=True, exist_ok=True)
    if out.suffix.lower() in {".jpg", ".jpeg"}:
        im.convert("RGB").save(out, quality=94, subsampling=1, optimize=True)
    else:
        if im.mode != "RGBA":
            im = im.convert("RGBA")
        im.save(out, optimize=True)
    metrics = image_metrics(out)
    LEDGER.append({
        "file": name,
        "status": status,
        "base": base,
        "sources": ", ".join(source_keys),
        "mean": metrics["mean"],
        "edge_delta": metrics["edge_delta"],
        "note": note or "Photographic source, palette-matched, format preserved.",
    })


def skip_file(name: str, reason: str) -> None:
    original = ORIGINAL_DIR / name
    target = TEXTURE_DIR / name
    if original.exists():
        shutil.copy2(original, target)
    LEDGER.append({
        "file": name,
        "status": "SKIP",
        "base": "existing fallback kept",
        "sources": "original file",
        "mean": image_metrics(target)["mean"],
        "edge_delta": image_metrics(target)["edge_delta"],
        "note": reason,
    })


def image_metrics(path: Path) -> dict[str, str]:
    im = Image.open(path).convert("RGB")
    small = im.resize((1, 1), Image.Resampling.BOX)
    r, g, b = small.getpixel((0, 0))
    sample = im.resize((min(256, im.width), min(256, im.height)), Image.Resampling.BOX)
    px = sample.load()
    w, h = sample.size
    lr_total = 0
    for y in range(h):
        a, bpx = px[0, y], px[w - 1, y]
        lr_total += sum(abs(a[i] - bpx[i]) for i in range(3)) / 3
    tb_total = 0
    for x in range(w):
        a, bpx = px[x, 0], px[x, h - 1]
        tb_total += sum(abs(a[i] - bpx[i]) for i in range(3)) / 3
    edge = ((lr_total / max(1, h)) + (tb_total / max(1, w))) / 2
    return {"mean": f"#{r:02x}{g:02x}{b:02x}", "edge_delta": f"{edge:.1f}"}


def build_montage(name: str) -> None:
    p = TEXTURE_DIR / name
    im = Image.open(p).convert("RGBA")
    thumb_w = 256
    thumb_h = max(48, round(thumb_w * im.height / im.width))
    tile = im.resize((thumb_w, thumb_h), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (thumb_w * 3, thumb_h * 3), (26, 24, 20, 255))
    for y in range(3):
        for x in range(3):
            canvas.alpha_composite(tile, (x * thumb_w, y * thumb_h))
    canvas.convert("RGB").save(MONTAGE_DIR / f"{Path(name).stem}_3x3.jpg", quality=90)


def build_contact_sheet() -> None:
    files = sorted([p for p in TEXTURE_DIR.iterdir() if p.is_file() and p.suffix.lower() in {".jpg", ".png"}])
    cell_w, cell_h = 170, 142
    cols = 6
    rows = math.ceil(len(files) / cols)
    sheet = Image.new("RGB", (cols * cell_w, rows * cell_h), (35, 34, 31))
    draw = ImageDraw.Draw(sheet)
    for i, p in enumerate(files):
        im = Image.open(p).convert("RGB")
        im.thumbnail((cell_w - 12, cell_h - 34), Image.Resampling.LANCZOS)
        x = (i % cols) * cell_w
        y = (i // cols) * cell_h
        sheet.paste(im, (x + (cell_w - im.width) // 2, y + 5))
        draw.text((x + 6, y + cell_h - 25), p.name[:25], fill=(230, 224, 210))
    sheet.save(REVIEW_DIR / "texture_contact_sheet_photoreal.jpg", quality=92)


def write_ledgers() -> None:
    rows = sorted(LEDGER, key=lambda r: r["file"])
    md = ["# Texture Ledger", "", "Generated by `review/rebuild_photoreal_textures.py`.", ""]
    md.append("| File | Status | Base | Sources | Mean | Edge delta | Notes |")
    md.append("|---|---|---|---|---|---:|---|")
    for r in rows:
        md.append("| {file} | {status} | {base} | {sources} | {mean} | {edge_delta} | {note} |".format(
            **{k: str(v).replace("|", "\\|") for k, v in r.items()}
        ))
    (REVIEW_DIR / "TEXTURE_LEDGER.md").write_text("\n".join(md) + "\n")

    smd = ["# Texture Sources", "", "All new source imagery is photographic or scan-derived. ambientCG materials are CC0/public-domain equivalent; Commons entries retain their listed license and URL.", ""]
    for key in sorted(SOURCES):
        s = SOURCES[key]
        smd.append(f"## {key}")
        smd.append(f"- Label: {s.label}")
        smd.append(f"- URL: {s.url}")
        smd.append(f"- License: {s.license}")
        smd.append(f"- Cached file: `review/source_assets/{s.path.name}`")
        smd.append("")
    (REVIEW_DIR / "SOURCES.md").write_text("\n".join(smd))


def generate_all() -> None:
    mat = material_tile
    photo = photo_tile

    specs: dict[str, tuple[str, tuple[int, int], str, float, str]] = {
        # Warm sandstone family
        "egypt_stone.jpg": ("warm_sandstone", (1024, 1024), "#c2a06c", .78, "warm carved sandstone"),
        "egypt_sandstone.jpg": ("warm_sandstone", (2048, 2048), "#c8a86a", .76, "warm carved sandstone"),
        "egypt_floor.jpg": ("sandstone_floor", (1024, 1024), "#a88c5e", .74, "warm carved sandstone floor"),
        "khmer_sandstone.jpg": ("warm_sandstone", (1024, 1024), "#bda274", .72, "warm carved sandstone"),
        "khmer_stone.jpg": ("warm_sandstone", (1024, 1024), "#9c855e", .75, "warm carved sandstone"),
        "khmer_floor.jpg": ("sandstone_floor", (1024, 1024), "#a38d64", .72, "warm carved sandstone floor"),
        "persia_stone.jpg": ("warm_sandstone", (1024, 1024), "#c7bda4", .62, "warm limestone/sandstone"),
        "persia_floor.jpg": ("sandstone_floor", (1024, 1024), "#c2b99f", .62, "warm limestone floor"),
        "oceania_sandstone.jpg": ("warm_sandstone", (1024, 1024), "#a36a3f", .78, "weathered honey sandstone"),
        # Cool limestone / grey stone family
        "inca_andesite.jpg": ("grey_stone_wall", (1024, 1024), "#9a9b98", .70, "cool grey ashlar/andesite"),
        "inca_stone.jpg": ("grey_stone_wall", (1024, 1024), "#8f8c83", .72, "cool grey ashlar/andesite"),
        "inca_flagstone.jpg": ("grey_paving", (1024, 1024), "#b6b5af", .64, "cool flagstone floor"),
        "gothic_stone.jpg": ("cool_limestone", (1024, 1024), "#b8ac93", .68, "warm pale limestone ashlar"),
        "gothic_floor.jpg": ("cool_limestone", (1024, 1024), "#a89e8b", .68, "worn limestone flagstone"),
        "pietra_serena.jpg": ("grey_stone_wall", (1024, 1024), "#8f9088", .58, "pietra serena blue-grey sandstone"),
        "meso_stone.jpg": ("cool_limestone", (1024, 1024), "#9b8a6d", .74, "warm limestone block"),
        "meso_limestone_floor.jpg": ("cool_limestone", (1024, 1024), "#8a7a5f", .74, "warm limestone floor"),
        "hub_stone.jpg": ("cool_limestone", (1024, 1024), "#d1b387", .58, "museum hub limestone"),
        "hub_floor.jpg": ("cool_limestone", (1024, 1024), "#938574", .62, "museum hub stone floor"),
        # Marble / polished stone
        "greek_marble.jpg": ("marble", (1024, 1024), "#ece5d6", .42, "polished veined marble"),
        "greek_floor.jpg": ("marble", (1024, 1024), "#e7dec9", .46, "warm polished marble floor"),
        "greek_coffer.jpg": ("marble", (512, 512), "#d7cdb6", .48, "carved marble coffer"),
        "mughal_marble.jpg": ("marble", (1024, 1024), "#f0e7d4", .45, "warm white marble"),
        "renaissance_floor.jpg": ("marble", (1024, 1024), "#b5652f", .74, "terracotta-warm stone floor"),
        "renaissance_ceiling.jpg": ("wood", (1024, 1024), "#7a5a34", .72, "warm timber coffer base"),
        # Earth/plaster family
        "adobe_wall.jpg": ("earth", (1024, 1024), "#c39362", .72, "soft natural earth plaster"),
        "sahel_banco.jpg": ("earth", (1024, 1024), "#a5714a", .75, "banco earth plaster"),
        "mudbrick.jpg": ("earth", (1024, 1024), "#98693f", .76, "mudbrick earth"),
        "neolithic_wall.jpg": ("earth", (1024, 1024), "#c2a075", .68, "soft cave/earth plaster"),
        "neolithic_reed.jpg": ("fabric", (512, 512), "#b08a5c", .75, "woven reed/fiber"),
        "islamic_plaster.jpg": ("plaster", (1024, 1024), "#efe6d2", .55, "warm Islamic plaster"),
        "renaissance_plaster.jpg": ("plaster", (1024, 1024), "#cbb794", .62, "warm lime plaster"),
        "kingdoms_wall.jpg": ("earth", (1024, 1024), "#a5714a", .74, "earthen plaster"),
        "traditions_wall.jpg": ("earth", (1024, 1024), "#c79a63", .72, "earthen plaster"),
        "cave_dirt.jpg": ("rock_dirt", (1024, 1024), "#a7895b", .74, "cave dirt"),
        "cave_rock.jpg": ("rock_dirt", (1024, 1024), "#c29f68", .68, "cave rock"),
        "modern_wall.jpg": ("plaster", (1024, 1024), "#e9e6df", .45, "modern painted plaster"),
        "salon_wall.jpg": ("plaster", (1024, 1024), "#d8ccae", .58, "salon plaster"),
        "baroque_wall.jpg": ("red_fabric", (1024, 1024), "#7a261f", .72, "deep red textile/plaster wall"),
        # Brick / ceramic / floor
        "indus_brick.jpg": ("brick", (1024, 1024), "#baa284", .62, "fired brick"),
        "indus_floor.jpg": ("old_brick", (1024, 1024), "#91714b", .72, "mudbrick floor"),
        "glazed_brick.jpg": ("glazed_tile", (1024, 1024), "#406278", .62, "blue glazed brick"),
        "islamic_floor.jpg": ("cool_limestone", (1024, 1024), "#cdb488", .62, "warm stone floor"),
        "islamic_zellij.jpg": ("glazed_tile", (512, 512), "#396278", .58, "blue glazed zellij"),
        "ottoman_iznik.jpg": ("glazed_tile", (1024, 1024), "#e8ddc2", .42, "Iznik ceramic tile base"),
        # Wood / parquet
        "salon_parquet.jpg": ("dark_wood", (1024, 1024), "#6b4526", .65, "walnut parquet"),
        "salon2_parquet.jpg": ("wood", (1024, 1024), "#a1783f", .65, "honey parquet"),
        "baroque_parquet.jpg": ("dark_wood", (1024, 1024), "#9a7038", .68, "warm baroque parquet"),
        "traditions_wood.jpg": ("dark_wood", (1024, 1024), "#4c3a26", .72, "dark carved wood"),
        "japan_floor.jpg": ("wood", (1024, 1024), "#cbb693", .52, "warm Japanese wood floor"),
        "china_floor.jpg": ("dark_wood", (1024, 1024), "#4a3220", .72, "dark lacquered wood floor"),
        "china_lacquer.jpg": ("dark_wood", (1024, 1024), "#8f2b1e", .82, "red lacquered wood"),
        "kingdoms_floor.jpg": ("old_brick", (1024, 1024), "#96653f", .74, "earthen floor"),
        "traditions_floor.jpg": ("earth", (1024, 1024), "#6a4a2e", .78, "packed earth floor"),
        "modern_floor.jpg": ("terrazzo", (1024, 1024), "#c0b9ae", .58, "modern terrazzo floor"),
        "modern_terrazzo.jpg": ("terrazzo", (1024, 1024), "#dcd6c8", .52, "modern terrazzo"),
        # Textile / paper
        "japan_tatami.jpg": ("tatami", (512, 512), "#b49d6c", .62, "tatami weave"),
        "oceania_floor.jpg": ("fabric", (1024, 1024), "#bd9a60", .72, "woven pandanus mat"),
        "oceanic_tapa.jpg": ("fabric", (1024, 1024), "#56331a", .82, "woven tapa cloth base"),
        "amsalon_floor.jpg": ("dark_wood", (1024, 1024), "#6e4a2c", .67, "varnished parquet"),
        "modern_laylight.jpg": ("white_paper", (512, 512), "#dfdcd4", .32, "frosted paper/glass laylight"),
        "japan_shoji.jpg": ("paper", (1024, 1024), "#af977b", .55, "shoji paper and fiber"),
        "japan_shoji_paper.jpg": ("white_paper", (512, 512), "#e8e0cb", .38, "rice paper"),
    }

    for name, (key, size, target, strength, base) in specs.items():
        save_image(name, mat(key, size, target, strength), [key], base)

    photo_specs = {
        "band_hieroglyphs.jpg": ("hieroglyphs", (2048, 512), "#bf9447", .70, "Egyptian sandstone relief band"),
        "egypt_frieze.jpg": ("hieroglyphs", (1536, 384), "#786147", .68, "Egyptian sandstone relief frieze"),
        "egypt_jamb.jpg": ("hieroglyphs", (512, 2048), "#b47f26", .70, "vertical Egyptian relief jamb"),
        "egypt_deity_l.jpg": ("egypt_deity", (1024, 2048), "#9e6e27", .72, "Egyptian deity relief panel"),
        "egypt_deity_r.jpg": ("egypt_deity", (1024, 2048), "#9e6e27", .72, "Egyptian deity relief panel"),
        "band_archers.jpg": ("archers", (2048, 512), "#c7bda4", .66, "Assyrian/Persian archer relief"),
        "band_ishtar.jpg": ("ishtar", (2048, 512), "#1b4a78", .58, "Ishtar Gate glazed-brick relief"),
        "band_iznik.jpg": ("iznik", (2048, 512), "#e8ddc2", .50, "Iznik tile band"),
        "band_zellige.jpg": ("zellige", (2048, 512), "#3f8ea6", .54, "zellige tile band"),
        "band_meander.jpg": ("greek_meander", (2048, 512), "#7c2f26", .58, "Greek meander stone band"),
        "band_greca.jpg": ("meso_greca", (2048, 512), "#7d5b3f", .66, "Mesoamerican greca relief band"),
        "band_mudcloth.jpg": ("mudcloth", (2048, 512), "#634c31", .70, "Bogolan mudcloth band"),
        "amsalon_band.jpg": ("damask", (1536, 384), "#75562b", .70, "gilt woven salon band"),
        "kingdoms_band.jpg": ("mudcloth", (1536, 384), "#86654b", .72, "African textile band"),
        "adobe_painted_frieze.jpg": ("mudcloth", (2048, 512), "#ae8555", .70, "painted adobe/textile frieze"),
        "baroque_ceiling_fresco.jpg": ("baroque_fresco", (2048, 512), "#603025", .50, "Baroque fresco crop"),
        "salon_damask.jpg": ("damask", (1024, 1024), "#5c2128", .76, "photographic damask textile"),
        "salon2_sage_damask.jpg": ("damask", (1024, 1024), "#dde3cf", .54, "sage photographic damask textile"),
        "baroque_damask.jpg": ("damask", (1024, 1024), "#5e1f1d", .78, "deep red photographic damask textile"),
        "amsalon_wall.jpg": ("damask", (1024, 1024), "#6a2c30", .78, "wine damask wall textile"),
        "inca_textile.jpg": ("inca_textile", (512, 768), "#7e5439", .66, "Inca textile crop"),
        "islamic_muqarnas.jpg": ("islamic_muqarnas", (1024, 1024), "#eadcbf", .54, "muqarnas plaster crop"),
        "khmer_lintel_relief.jpg": ("khmer_lintel", (2048, 512), "#847550", .68, "Khmer lintel relief crop"),
        "meso_greca_carved.jpg": ("meso_greca", (512, 512), "#9d907a", .68, "Mitla greca stone relief crop"),
        "persia_wingdisk.jpg": ("persia_wingdisk", (2048, 512), "#8f8259", .62, "Persepolis winged disk relief crop"),
        "window_lancet.jpg": ("stained_glass", (768, 1536), "#866b53", .45, "Gothic lancet stained glass crop"),
    }
    for name, (key, size, target, strength, base) in photo_specs.items():
        try:
            if key == "damask":
                im = photo_tile_crop(
                    key,
                    size,
                    target,
                    strength,
                    (0.13, 0.10, 0.46, 0.91),
                    horizontal_only=size[0] > size[1] * 2.5,
                )
            else:
                im = photo(key, size, target, strength, horizontal_only=size[0] > size[1] * 2.5)
            save_image(name, im, [key], base)
        except KeyError:
            skip_file(name, f"No acceptable Commons photograph found for {key}; existing file kept.")

    png_specs = {
        "adobe_basket.png": ("adobe_basket", (512, 512), "#9c7850", "basket", "Apache coiled basket photo crop"),
        "indus_seal.png": ("indus_seal", (512, 512), "#7c5638", "panel", "Indus seal photo crop"),
        "islamic_arabesque.png": ("islamic_arabesque", (512, 512), "#e3d7bd", "panel", "Islamic arabesque plaster photo crop"),
        "japan_scroll.png": ("japan_scroll", (384, 960), "#9d8769", "full", "Japanese handscroll photo crop"),
        "khmer_apsara.png": ("khmer_apsara", (512, 1024), "#594b3a", "panel", "Angkor apsara relief photo crop"),
        "meso_deity_mask.png": ("meso_mask", (1024, 768), "#917b64", "panel", "Maya deity mask photo crop"),
        "mesopotamia_lamassu.png": ("lamassu", (512, 768), "#554a37", "panel", "Lamassu relief photo crop"),
        "mesopotamia_procession.png": ("mesopotamia_procession", (512, 768), "#9c784a", "panel", "Assyrian procession relief photo crop"),
        "neolithic_ochre_figures.png": ("ochre_figures", (1024, 512), "#ae8655", "panel", "ochre cave-painting photo crop"),
        "persia_guard.png": ("persia_guard", (512, 1024), "#af936c", "panel", "Persepolis guard relief photo crop"),
        "renaissance_fresco.png": ("renaissance_fresco", (512, 1024), "#bfae8e", "full", "Renaissance fresco ornament photo crop"),
    }
    for name, (key, size, target, alpha_shape, base) in png_specs.items():
        try:
            src = source_image(key)
            save_image(name, make_alpha_panel(src, size, target, alpha_shape), [key], base)
        except KeyError:
            skip_file(name, f"No acceptable source found for {key}; existing file kept.")


def main() -> int:
    ensure_dirs()
    load_sources()
    generate_all()
    for p in sorted(TEXTURE_DIR.iterdir()):
        if p.is_file() and p.suffix.lower() in {".jpg", ".png"}:
            if p.name not in {r["file"] for r in LEDGER}:
                skip_file(p.name, "Not in rebuild map; existing file kept for manual review.")
            build_montage(p.name)
    build_contact_sheet()
    write_ledgers()
    print(f"Processed {len(LEDGER)} texture files.")
    print(f"Review: {REVIEW_DIR / 'TEXTURE_LEDGER.md'}")
    print(f"Sources: {REVIEW_DIR / 'SOURCES.md'}")
    print(f"Contact sheet: {REVIEW_DIR / 'texture_contact_sheet_photoreal.jpg'}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
