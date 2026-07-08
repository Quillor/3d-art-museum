from __future__ import annotations

from pathlib import Path
import math

import numpy as np
from PIL import Image, ImageChops, ImageFilter, ImageOps, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "assets" / "textures"
OUT = ROOT / "concept-art" / "subsections" / "americas-mesoamerica" / "textures"
REF = ROOT / "concept-art" / "subsections" / "americas-mesoamerica" / "references"
SIZE = 2048
SEED = 22


def load_rgb(path: Path, size: tuple[int, int] | None = None) -> Image.Image:
    img = Image.open(path).convert("RGB")
    if size is None:
        return img
    return ImageOps.fit(img, size, method=Image.Resampling.LANCZOS)


def save(img: Image.Image, name: str) -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    img.save(OUT / name)


def np_img(img: Image.Image) -> np.ndarray:
    return np.asarray(img).astype(np.float32) / 255.0


def pil_img(arr: np.ndarray) -> Image.Image:
    arr = np.clip(arr * 255.0, 0, 255).astype(np.uint8)
    return Image.fromarray(arr)


def blur_noise(shape: tuple[int, int], radius: float, seed_offset: int) -> np.ndarray:
    rng = np.random.default_rng(SEED + seed_offset)
    arr = (rng.random(shape) * 255).astype(np.uint8)
    img = Image.fromarray(arr, mode="L").filter(ImageFilter.GaussianBlur(radius))
    return np.asarray(img).astype(np.float32) / 255.0


def match_palette(base: np.ndarray, target_rgb: tuple[float, float, float], strength: float) -> np.ndarray:
    current = base.mean(axis=(0, 1))
    target = np.array(target_rgb, dtype=np.float32)
    scale = np.clip(target / np.maximum(current, 1e-5), 0.7, 1.35)
    mixed = base * (1.0 - strength) + (base * scale) * strength
    return np.clip(mixed, 0.0, 1.0)


def edge_blend_tile(img: Image.Image, band: int = 32) -> Image.Image:
    arr = np_img(img)
    h, w, _ = arr.shape
    for i in range(band):
        t = 0.5 - 0.5 * math.cos(math.pi * (i + 1) / (band + 1))
        left = arr[:, i, :].copy()
        right = arr[:, w - band + i, :].copy()
        mix = left * (1.0 - t) + right * t
        arr[:, i, :] = mix
        arr[:, w - band + i, :] = mix
    for i in range(band):
        t = 0.5 - 0.5 * math.cos(math.pi * (i + 1) / (band + 1))
        top = arr[i, :, :].copy()
        bottom = arr[h - band + i, :, :].copy()
        mix = top * (1.0 - t) + bottom * t
        arr[i, :, :] = mix
        arr[h - band + i, :, :] = mix
    # Force exact agreement on the wrap edges after the soft blend pass.
    edge_lr = (arr[:, 0, :] + arr[:, -1, :]) * 0.5
    arr[:, 0, :] = edge_lr
    arr[:, -1, :] = edge_lr
    edge_tb = (arr[0, :, :] + arr[-1, :, :]) * 0.5
    arr[0, :, :] = edge_tb
    arr[-1, :, :] = edge_tb
    return pil_img(arr)


def soften(img: Image.Image, radius: float, amount: float) -> Image.Image:
    blurred = img.filter(ImageFilter.GaussianBlur(radius))
    return Image.blend(img, blurred, amount)


def color_variation(arr: np.ndarray, value_scale: float, warm_shift: tuple[float, float, float], seed_offset: int) -> np.ndarray:
    n1 = blur_noise(arr.shape[:2], 26, seed_offset)
    n2 = blur_noise(arr.shape[:2], 90, seed_offset + 1)
    v = (n1 - 0.5) * value_scale + (n2 - 0.5) * (value_scale * 0.7)
    tint = np.dstack([v * warm_shift[0], v * warm_shift[1], v * warm_shift[2]])
    out = arr + tint
    return np.clip(out, 0.0, 1.0)


def build_wall() -> Image.Image:
    wall_ref = np_img(load_rgb(REF / "wall_block_reference.png", (SIZE, SIZE)))
    stone_ref = np_img(load_rgb(SRC / "meso_stone.jpg", (SIZE, SIZE)))
    wall = wall_ref * 0.86 + stone_ref * 0.14
    wall = match_palette(wall, (0.74, 0.69, 0.58), 0.95)
    wall = color_variation(wall, 0.05, (0.04, 0.03, -0.005), 10)
    dust = blur_noise((SIZE, SIZE), 56, 12)
    wall *= np.dstack([0.95 + dust * 0.06, 0.95 + dust * 0.05, 0.96 + dust * 0.03])
    wall = np.clip(wall, 0.0, 1.0)
    img = pil_img(wall)
    img = soften(img, 0.8, 0.12)
    return edge_blend_tile(img, 28)


def build_floor(wall_img: Image.Image) -> Image.Image:
    floor = np_img(load_rgb(SRC / "egypt_floor.jpg", (SIZE, SIZE)))
    wall = np_img(wall_img)
    floor = floor * 0.72 + wall * 0.28
    floor = match_palette(floor, tuple((wall.mean(axis=(0, 1)) * np.array([0.97, 0.96, 0.95])).tolist()), 0.92)
    floor = color_variation(floor, 0.05, (0.03, 0.02, -0.005), 20)
    wear = blur_noise((SIZE, SIZE), 120, 21)
    wear = (wear - 0.5) * 0.05
    floor = np.clip(floor + np.dstack([wear, wear, wear]), 0.0, 1.0)
    img = pil_img(floor)
    img = soften(img, 0.7, 0.16)
    return edge_blend_tile(img, 28)


def build_band(wall_img: Image.Image) -> Image.Image:
    wall_strip = ImageOps.fit(wall_img, (SIZE, 512), method=Image.Resampling.LANCZOS)
    arr = np_img(wall_strip)
    arr = match_palette(arr, (0.63, 0.58, 0.49), 0.55)
    arr = color_variation(arr, 0.03, (0.03, 0.02, -0.003), 30)
    base = pil_img(arr)

    w, h = base.size
    draw = ImageDraw.Draw(base)
    draw.rectangle([0, 30, w, 44], fill=(118, 78, 58))
    draw.rectangle([0, 56, w, 78], fill=(64, 55, 44))

    carve = Image.new("L", base.size, 0)
    cdraw = ImageDraw.Draw(carve)
    y0, y1 = 118, 360
    module_w = 238
    gap = 28
    start_x = -64
    for i in range(10):
        x0 = start_x + i * (module_w + gap)
        x1 = x0 + module_w
        cdraw.rounded_rectangle([x0, y0, x1, y1], radius=6, outline=235, width=20)
        inset = 44
        mx0, mx1 = x0 + inset, x1 - inset
        my0, my1 = y0 + inset, y1 - inset
        path = [
            (mx0, my0),
            (mx1, my0),
            (mx1, my0 + 28),
            (mx0 + 52, my0 + 28),
            (mx0 + 52, my1 - 26),
            (mx1 - 26, my1 - 26),
            (mx1 - 26, my1),
            (mx0, my1),
        ]
        cdraw.line(path, fill=220, width=18, joint="curve")
        cdraw.line([(mx0 + 48, my0 + 86), (mx1 - 34, my0 + 86)], fill=210, width=16)
        cdraw.line([(mx0 + 48, my0 + 138), (mx1 - 78, my0 + 138)], fill=195, width=14)

    carve = carve.filter(ImageFilter.GaussianBlur(1.2))
    shadow = ImageFilter.GaussianBlur(4)
    recess = carve.filter(shadow)
    highlight = ImageChops.offset(carve, -8, -7).filter(ImageFilter.GaussianBlur(6))

    base_arr = np_img(base)
    recess_np = np.asarray(recess).astype(np.float32) / 255.0
    highlight_np = np.asarray(highlight).astype(np.float32) / 255.0
    base_arr *= np.dstack([1.0 - recess_np * 0.38, 1.0 - recess_np * 0.36, 1.0 - recess_np * 0.33])
    base_arr += np.dstack([highlight_np * 0.08, highlight_np * 0.07, highlight_np * 0.05])

    pigment = Image.new("L", base.size, 0)
    pdraw = ImageDraw.Draw(pigment)
    for i in range(10):
        x0 = start_x + i * (module_w + gap)
        x1 = x0 + module_w
        pdraw.rectangle([x0, y0, x1, y1], outline=180, width=10)
    pigment = pigment.filter(ImageFilter.GaussianBlur(2.2))
    pigment_np = np.asarray(pigment).astype(np.float32) / 255.0
    wear = 0.72 + blur_noise((h, w), 40, 34) * 0.16
    base_arr[:, :, 0] = base_arr[:, :, 0] * (1.0 - pigment_np * 0.18) + pigment_np * 0.36 * wear
    base_arr[:, :, 1] = base_arr[:, :, 1] * (1.0 - pigment_np * 0.22) + pigment_np * 0.24 * wear
    base_arr[:, :, 2] = base_arr[:, :, 2] * (1.0 - pigment_np * 0.22) + pigment_np * 0.18 * wear

    img = pil_img(np.clip(base_arr, 0.0, 1.0))
    img = soften(img, 0.85, 0.12)
    return edge_blend_tile(img, 28)


def build_relief_panel(wall_img: Image.Image) -> Image.Image:
    ref = Image.open(REF / "relief_panel_reference.png").convert("RGB")
    # Perspective-correct the photographed / concept reference into a straight-on
    # relief source before translating it into a reusable texture.
    quad = (30, 82, 414, 124, 424, 468, 22, 432)
    rectified = ref.transform((1200, 1600), Image.Transform.QUAD, quad, Image.Resampling.BICUBIC)

    wall = ImageOps.fit(wall_img, (1536, 2048), method=Image.Resampling.LANCZOS)
    arr = np_img(wall)
    arr = match_palette(arr, (0.56, 0.45, 0.29), 0.82)
    arr = color_variation(arr, 0.04, (0.05, 0.02, -0.01), 40)

    # Extract the relief as shape/depth information, not as a pasted image.
    relief_gray = ImageOps.autocontrast(rectified.convert("L"), cutoff=2)
    relief_gray = relief_gray.filter(ImageFilter.GaussianBlur(1.1))
    relief_small = ImageOps.fit(relief_gray, (1290, 1500), method=Image.Resampling.LANCZOS)
    mask = np.asarray(relief_small).astype(np.float32) / 255.0
    mask = np.clip((1.0 - mask) * 1.25, 0.0, 1.0)
    mask = np.power(mask, 1.15)

    pigment = blur_noise((1500, 1290), 26, 41)
    warm = np.dstack([
        0.38 + pigment * 0.18,
        0.27 + pigment * 0.10,
        0.15 + pigment * 0.06,
    ])

    panel = arr.copy()
    y0, x0 = 270, 122
    base_slice = panel[y0:y0 + 1500, x0:x0 + 1290, :]
    base_slice *= np.dstack([1.0 - mask * 0.34, 1.0 - mask * 0.30, 1.0 - mask * 0.26])
    base_slice += warm * np.dstack([mask * 0.52, mask * 0.48, mask * 0.42])

    # Build front-facing carved relief response from the extracted shape.
    emboss = Image.fromarray((mask * 255).astype(np.uint8), mode="L")
    shadow = np.asarray(emboss.filter(ImageFilter.GaussianBlur(6))).astype(np.float32) / 255.0
    highlight = np.asarray(ImageChops.offset(emboss, -10, -8).filter(ImageFilter.GaussianBlur(8))).astype(np.float32) / 255.0
    base_slice *= np.dstack([1.0 - shadow * 0.20, 1.0 - shadow * 0.18, 1.0 - shadow * 0.16])
    base_slice += np.dstack([highlight * 0.08, highlight * 0.07, highlight * 0.05])
    panel[y0:y0 + 1500, x0:x0 + 1290, :] = np.clip(base_slice, 0.0, 1.0)

    # Frame it as a reusable carved stone panel texture.
    img = pil_img(np.clip(panel, 0.0, 1.0))
    draw = ImageDraw.Draw(img)
    draw.rectangle([88, 236, 1448, 1812], outline=(78, 58, 34), width=20)
    draw.rectangle([112, 260, 1424, 1788], outline=(116, 87, 54), width=10)
    return soften(img, 0.7, 0.08)


def build_arch_frieze(wall_img: Image.Image) -> Image.Image:
    base = build_band(wall_img)
    return ImageOps.fit(base, (2048, 384), method=Image.Resampling.LANCZOS)


def to_gray(img: Image.Image) -> np.ndarray:
    return np.asarray(img.convert("L")).astype(np.float32) / 255.0


def build_height(img: Image.Image, contrast: float = 1.0, blur: float = 1.2) -> Image.Image:
    gray = to_gray(img)
    lap = (
        gray
        - 0.25 * np.roll(gray, 1, axis=0)
        - 0.25 * np.roll(gray, -1, axis=0)
        - 0.25 * np.roll(gray, 1, axis=1)
        - 0.25 * np.roll(gray, -1, axis=1)
    )
    height = np.clip(0.5 + lap * contrast + (gray - gray.mean()) * 0.55, 0.0, 1.0)
    out = Image.fromarray((height * 255).astype(np.uint8), mode="L")
    if blur > 0:
        out = out.filter(ImageFilter.GaussianBlur(blur))
    return out


def build_normal(height_img: Image.Image, strength: float = 2.5) -> Image.Image:
    h = np.asarray(height_img).astype(np.float32) / 255.0
    dx = np.roll(h, -1, axis=1) - np.roll(h, 1, axis=1)
    dy = np.roll(h, -1, axis=0) - np.roll(h, 1, axis=0)
    nx = -dx * strength
    ny = -dy * strength
    nz = np.ones_like(h)
    norm = np.sqrt(nx * nx + ny * ny + nz * nz)
    normal = np.dstack([(nx / norm + 1.0) * 0.5, (ny / norm + 1.0) * 0.5, (nz / norm + 1.0) * 0.5])
    return pil_img(normal)


def build_ao(height_img: Image.Image) -> Image.Image:
    h = np.asarray(height_img).astype(np.float32) / 255.0
    blur = Image.fromarray((h * 255).astype(np.uint8), mode="L").filter(ImageFilter.GaussianBlur(12))
    b = np.asarray(blur).astype(np.float32) / 255.0
    ao = np.clip(0.62 + (1.0 - b) * 0.85, 0.0, 1.0)
    return Image.fromarray((ao * 255).astype(np.uint8), mode="L")


def build_roughness(img: Image.Image, low: float, high: float) -> Image.Image:
    gray = to_gray(img)
    noise = blur_noise(gray.shape, 18, 60)
    rough = high - gray * (high - low) * 0.25 + (noise - 0.5) * 0.07
    rough = np.clip(rough, low, high)
    return Image.fromarray((rough * 255).astype(np.uint8), mode="L")


def export_set(prefix: str, seamless_name: str, img: Image.Image, height_contrast: float, normal_strength: float, rough_range: tuple[float, float]) -> None:
    albedo = img
    height = build_height(albedo, contrast=height_contrast)
    normal = build_normal(height, strength=normal_strength)
    ao = build_ao(height)
    rough = build_roughness(albedo, rough_range[0], rough_range[1])
    save(albedo, f"{prefix}_albedo_2k.png")
    save(height, f"{prefix}_height_2k.png")
    save(normal, f"{prefix}_normal_2k.png")
    save(ao, f"{prefix}_ao_2k.png")
    save(rough, f"{prefix}_roughness_2k.png")
    save(albedo, seamless_name)


def export_hero_set(prefix: str, img: Image.Image, height_contrast: float, normal_strength: float, rough_range: tuple[float, float]) -> None:
    albedo = img
    height = build_height(albedo, contrast=height_contrast)
    normal = build_normal(height, strength=normal_strength)
    ao = build_ao(height)
    rough = build_roughness(albedo, rough_range[0], rough_range[1])
    save(albedo, f"{prefix}_albedo_2k.png")
    save(height, f"{prefix}_height_2k.png")
    save(normal, f"{prefix}_normal_2k.png")
    save(ao, f"{prefix}_ao_2k.png")
    save(rough, f"{prefix}_roughness_2k.png")


def make_contact_sheet(items: list[tuple[str, Path]]) -> None:
    thumbs = []
    for label, path in items:
        img = Image.open(path).convert("RGB")
        thumb = ImageOps.contain(img, (360, 360), method=Image.Resampling.LANCZOS)
        card = Image.new("RGB", (380, 430), (14, 14, 14))
        card.paste(thumb, ((380 - thumb.width) // 2, 16))
        draw = ImageDraw.Draw(card)
        draw.text((12, 390), label, fill=(220, 220, 220))
        thumbs.append(card)
    cols = 3
    rows = math.ceil(len(thumbs) / cols)
    sheet = Image.new("RGB", (cols * 380, rows * 430), (8, 8, 8))
    for idx, card in enumerate(thumbs):
        x = (idx % cols) * 380
        y = (idx // cols) * 430
        sheet.paste(card, (x, y))
    save(sheet, "texture_contact_sheet.png")


def seam_report(img: Image.Image) -> tuple[float, float]:
    arr = np.asarray(img).astype(np.float32)
    dx = np.abs(arr[:, 0, :] - arr[:, -1, :]).mean()
    dy = np.abs(arr[0, :, :] - arr[-1, :, :]).mean()
    return float(dx), float(dy)


def main() -> None:
    wall = build_wall()
    floor = build_floor(wall)
    band = build_band(wall)
    relief = build_relief_panel(wall)
    arch_frieze = build_arch_frieze(wall)

    export_set("meso_limestone_wall", "wall_masonry_seamless.png", wall, 1.35, 2.6, (0.72, 0.96))
    export_set("meso_limestone_floor", "floor_worn_stone_seamless.png", floor, 1.1, 2.2, (0.68, 0.92))
    export_set("meso_upper_frieze_band", "carved_band_seamless.png", band, 1.95, 3.4, (0.74, 0.97))
    export_hero_set("meso_entry_relief_panel", relief, 2.1, 4.0, (0.76, 0.98))
    export_hero_set("meso_entry_arch_frieze", arch_frieze, 2.0, 3.6, (0.74, 0.97))

    make_contact_sheet([
        ("meso_limestone_wall_albedo_2k.png", OUT / "meso_limestone_wall_albedo_2k.png"),
        ("meso_limestone_wall_normal_2k.png", OUT / "meso_limestone_wall_normal_2k.png"),
        ("meso_limestone_wall_height_2k.png", OUT / "meso_limestone_wall_height_2k.png"),
        ("meso_limestone_wall_roughness_2k.png", OUT / "meso_limestone_wall_roughness_2k.png"),
        ("meso_limestone_floor_albedo_2k.png", OUT / "meso_limestone_floor_albedo_2k.png"),
        ("meso_limestone_floor_normal_2k.png", OUT / "meso_limestone_floor_normal_2k.png"),
        ("meso_upper_frieze_band_albedo_2k.png", OUT / "meso_upper_frieze_band_albedo_2k.png"),
        ("meso_upper_frieze_band_normal_2k.png", OUT / "meso_upper_frieze_band_normal_2k.png"),
        ("meso_entry_relief_panel_albedo_2k.png", OUT / "meso_entry_relief_panel_albedo_2k.png"),
        ("meso_entry_arch_frieze_albedo_2k.png", OUT / "meso_entry_arch_frieze_albedo_2k.png"),
        ("wall_masonry_seamless.png", OUT / "wall_masonry_seamless.png"),
        ("floor_worn_stone_seamless.png", OUT / "floor_worn_stone_seamless.png"),
        ("carved_band_seamless.png", OUT / "carved_band_seamless.png"),
    ])

    for name in ("wall_masonry_seamless.png", "floor_worn_stone_seamless.png", "carved_band_seamless.png"):
        dx, dy = seam_report(Image.open(OUT / name).convert("RGB"))
        print(name, f"dx={dx:.4f}", f"dy={dy:.4f}")


if __name__ == "__main__":
    main()
