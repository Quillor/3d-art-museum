from pathlib import Path
from PIL import Image, ImageChops, ImageDraw, ImageEnhance, ImageFilter, ImageOps
import math
import random

ROOT = Path(__file__).resolve().parent
TEX = ROOT / "textures"
RNG = random.Random(2607)


def load_rgb(name):
    return Image.open(TEX / name).convert("RGB")


def save(img, name):
    img.save(TEX / name, quality=95)


def yellow_sandstone_grade(img, strength=0.42):
    """Warm existing stone toward sun-baked yellow ochre without flattening it."""
    img = img.convert("RGB")
    ochre = Image.new("RGB", img.size, (222, 178, 85))
    graded = Image.blend(img, ochre, strength)
    graded = ImageOps.autocontrast(graded, cutoff=1)
    return Image.blend(img, graded, 0.72)


def gentle_warm_grade(img, strength=0.18):
    img = img.convert("RGB")
    img = ImageEnhance.Contrast(img).enhance(0.76)
    img = ImageEnhance.Brightness(img).enhance(1.05)
    ochre = Image.new("RGB", img.size, (218, 178, 100))
    return Image.blend(img, ochre, strength)


def add_mineral_variation(img):
    w, h = img.size
    wash = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(wash, "RGBA")
    for _ in range(80):
        x = RNG.randrange(w)
        y = RNG.randrange(h)
        rx = RNG.randrange(40, 170)
        ry = RNG.randrange(25, 130)
        col = RNG.choice([(248, 210, 105, 18), (142, 91, 39, 14), (255, 234, 155, 12)])
        d.ellipse((x - rx, y - ry, x + rx, y + ry), fill=col)
    wash = wash.filter(ImageFilter.GaussianBlur(18))
    return Image.alpha_composite(img.convert("RGBA"), wash).convert("RGB")


def draw_bird(d, x, y, s, fill, width):
    d.arc((x, y + s * 0.12, x + s * 0.80, y + s * 0.72), 190, 350, fill=fill, width=width)
    d.line((x + s * 0.62, y + s * 0.36, x + s * 0.94, y + s * 0.23), fill=fill, width=width)
    d.line((x + s * 0.56, y + s * 0.64, x + s * 0.48, y + s * 0.96), fill=fill, width=width)
    d.line((x + s * 0.66, y + s * 0.62, x + s * 0.72, y + s * 0.94), fill=fill, width=width)
    d.ellipse((x + s * 0.42, y + s * 0.20, x + s * 0.56, y + s * 0.34), outline=fill, width=width)


def draw_eye(d, x, y, s, fill, width):
    d.arc((x, y + s * 0.18, x + s, y + s * 0.68), 190, 350, fill=fill, width=width)
    d.arc((x, y + s * 0.05, x + s, y + s * 0.82), 20, 160, fill=fill, width=width)
    d.ellipse((x + s * 0.43, y + s * 0.34, x + s * 0.58, y + s * 0.50), outline=fill, width=width)
    d.line((x + s * 0.46, y + s * 0.66, x + s * 0.38, y + s * 1.00), fill=fill, width=width)
    d.line((x + s * 0.60, y + s * 0.62, x + s * 0.72, y + s * 0.92), fill=fill, width=width)


def draw_reed(d, x, y, s, fill, width):
    d.line((x + s * 0.52, y + s * 0.12, x + s * 0.52, y + s), fill=fill, width=width)
    d.line((x + s * 0.52, y + s * 0.16, x + s * 0.18, y + s * 0.46), fill=fill, width=width)
    d.line((x + s * 0.52, y + s * 0.16, x + s * 0.88, y + s * 0.46), fill=fill, width=width)
    d.line((x + s * 0.52, y + s * 0.34, x + s * 0.28, y + s * 0.72), fill=fill, width=width)


def draw_ankh(d, x, y, s, fill, width):
    d.ellipse((x + s * 0.28, y + s * 0.04, x + s * 0.72, y + s * 0.42), outline=fill, width=width)
    d.line((x + s * 0.50, y + s * 0.42, x + s * 0.50, y + s), fill=fill, width=width)
    d.line((x + s * 0.16, y + s * 0.56, x + s * 0.84, y + s * 0.56), fill=fill, width=width)


def draw_cartouche(d, x, y, w, h, fill, width):
    r = min(w, h) * 0.18
    d.rounded_rectangle((x, y, x + w, y + h), radius=int(r), outline=fill, width=width)
    d.line((x + w * 0.18, y + h * 0.16, x + w * 0.82, y + h * 0.16), fill=fill, width=max(1, width - 1))
    d.line((x + w * 0.22, y + h * 0.78, x + w * 0.76, y + h * 0.78), fill=fill, width=max(1, width - 1))
    draw_reed(d, x + w * 0.12, y + h * 0.24, h * 0.38, fill, max(2, width - 1))
    draw_ankh(d, x + w * 0.44, y + h * 0.24, h * 0.40, fill, max(2, width - 1))
    draw_eye(d, x + w * 0.22, y + h * 0.52, h * 0.32, fill, max(2, width - 1))


def build_large_glyph_mask(size):
    w, h = size
    mask = Image.new("L", size, 0)
    d = ImageDraw.Draw(mask)
    cells = [
        (150, 170, 420, 520), (615, 90, 470, 610), (1215, 170, 420, 520),
        (250, 790, 520, 520), (945, 830, 420, 480), (1530, 745, 360, 580),
        (120, 1425, 470, 430), (760, 1320, 540, 520), (1450, 1350, 390, 500),
    ]
    for i, (x, y, cw, ch) in enumerate(cells):
        alpha = RNG.randrange(86, 132)
        width = RNG.randrange(7, 12)
        if i % 3 == 0:
            draw_cartouche(d, x, y, cw, ch, alpha, width)
        elif i % 3 == 1:
            draw_bird(d, x + 20, y + 40, min(cw, ch) * 0.72, alpha, width)
            draw_reed(d, x + cw * 0.58, y + 80, min(cw, ch) * 0.70, alpha, width)
            draw_ankh(d, x + cw * 0.18, y + ch * 0.48, min(cw, ch) * 0.38, alpha, max(3, width - 2))
        else:
            draw_eye(d, x + 10, y + 35, min(cw, ch) * 0.84, alpha, width)
            draw_ankh(d, x + cw * 0.54, y + ch * 0.34, min(cw, ch) * 0.44, alpha, max(3, width - 2))
    mask = mask.filter(ImageFilter.GaussianBlur(0.65))
    weather = Image.effect_noise(size, 85).convert("L").filter(ImageFilter.GaussianBlur(1.0))
    return ImageChops.multiply(mask, ImageOps.autocontrast(weather))


def incise_wall(albedo):
    glyph = build_large_glyph_mask(albedo.size)
    dark = Image.new("RGBA", albedo.size, (91, 57, 26, 0))
    dark.putalpha(glyph.point(lambda v: int(v * 0.72)))
    hi = Image.new("RGBA", albedo.size, (255, 224, 132, 0))
    hi_mask = ImageChops.offset(glyph, -3, -3).filter(ImageFilter.GaussianBlur(0.6))
    hi.putalpha(hi_mask.point(lambda v: int(v * 0.33)))
    out = Image.alpha_composite(albedo.convert("RGBA"), dark)
    out = Image.alpha_composite(out, hi).convert("RGB")
    return out, glyph


def height_from_albedo(albedo, glyph=None, scale=0.8):
    gray = ImageOps.grayscale(albedo)
    gray = ImageOps.autocontrast(gray, cutoff=1)
    h = Image.blend(Image.new("L", albedo.size, 132), gray, scale)
    if glyph is not None:
        incised = ImageOps.invert(glyph).point(lambda v: int(116 + v * 0.42))
        h = ImageChops.multiply(h, incised)
    return h.filter(ImageFilter.GaussianBlur(0.45))


def normal_from_height(height, strength=5.0):
    w, h = height.size
    pix = height.load()
    out = Image.new("RGB", (w, h))
    dst = out.load()
    for y in range(h):
        ym = (y - 1) % h
        yp = (y + 1) % h
        for x in range(w):
            xm = (x - 1) % w
            xp = (x + 1) % w
            dx = (pix[xp, y] - pix[xm, y]) / 255.0
            dy = (pix[x, yp] - pix[x, ym]) / 255.0
            nx, ny, nz = -dx * strength, -dy * strength, 1.0
            ln = math.sqrt(nx * nx + ny * ny + nz * nz)
            dst[x, y] = (
                int((nx / ln * 0.5 + 0.5) * 255),
                int((ny / ln * 0.5 + 0.5) * 255),
                int((nz / ln * 0.5 + 0.5) * 255),
            )
    return out.filter(ImageFilter.GaussianBlur(0.35))


def roughness_from_height(height, base=228):
    edges = height.filter(ImageFilter.FIND_EDGES).filter(ImageFilter.GaussianBlur(1.2))
    return ImageChops.screen(Image.new("L", height.size, base), edges.point(lambda v: int(v * 0.18)))


def ao_from_height(height):
    inv = ImageOps.invert(height).filter(ImageFilter.GaussianBlur(4))
    return ImageOps.autocontrast(inv, cutoff=2).point(lambda v: int(214 + v * 0.16))


def grade_frieze(img):
    img = yellow_sandstone_grade(img, 0.28)
    gold = Image.new("RGBA", img.size, (236, 190, 78, 0))
    mask = ImageOps.grayscale(img).point(lambda v: 58 if v > 120 else 12)
    gold.putalpha(mask)
    return Image.alpha_composite(img.convert("RGBA"), gold).convert("RGB")


def contact_sheet(items):
    thumb_w, thumb_h = 260, 220
    label_h = 34
    cols = 4
    rows = math.ceil(len(items) / cols)
    sheet = Image.new("RGB", (cols * 300, rows * (thumb_h + label_h + 18)), (13, 12, 10))
    d = ImageDraw.Draw(sheet)
    for i, name in enumerate(items):
        img = Image.open(TEX / name).convert("RGB")
        img.thumbnail((thumb_w, thumb_h), Image.Resampling.LANCZOS)
        x = (i % cols) * 300 + 40
        y = (i // cols) * (thumb_h + label_h + 18)
        sheet.paste(img, (x, y))
        d.text((x, y + thumb_h + 6), name[:38], fill=(232, 222, 198))
    save(sheet, "texture_contact_sheet.png")


def main():
    wall = add_mineral_variation(yellow_sandstone_grade(load_rgb("egypt_sandstone_relief_wall_albedo_2k.png"), 0.48))
    wall, glyph = incise_wall(wall)
    wall_h = height_from_albedo(wall, glyph, 0.72)
    save(wall, "egypt_sandstone_relief_wall_albedo_2k.png")
    save(wall_h, "egypt_sandstone_relief_wall_height_2k.png")
    save(normal_from_height(wall_h, 5.4), "egypt_sandstone_relief_wall_normal_2k.png")
    save(roughness_from_height(wall_h, 225), "egypt_sandstone_relief_wall_roughness_2k.png")
    save(ao_from_height(wall_h), "egypt_sandstone_relief_wall_ao_2k.png")
    save(wall, "wall_masonry_seamless.png")

    frieze = grade_frieze(load_rgb("egypt_painted_frieze_band_albedo_2k.png"))
    frieze_h = height_from_albedo(frieze, None, 0.84)
    save(frieze, "egypt_painted_frieze_band_albedo_2k.png")
    save(frieze_h, "egypt_painted_frieze_band_height_2k.png")
    save(normal_from_height(frieze_h, 4.0), "egypt_painted_frieze_band_normal_2k.png")
    save(roughness_from_height(frieze_h, 226), "egypt_painted_frieze_band_roughness_2k.png")
    save(ao_from_height(frieze_h), "egypt_painted_frieze_band_ao_2k.png")
    save(frieze, "carved_band_seamless.png")

    floor = gentle_warm_grade(load_rgb("egypt_limestone_slab_floor_albedo_2k.png"), 0.18)
    floor_h = height_from_albedo(floor, None, 0.65)
    save(floor, "egypt_limestone_slab_floor_albedo_2k.png")
    save(floor_h, "egypt_limestone_slab_floor_height_2k.png")
    save(normal_from_height(floor_h, 2.8), "egypt_limestone_slab_floor_normal_2k.png")
    save(roughness_from_height(floor_h, 229), "egypt_limestone_slab_floor_roughness_2k.png")
    save(ao_from_height(floor_h), "egypt_limestone_slab_floor_ao_2k.png")
    save(floor, "floor_worn_stone_seamless.png")

    contact_sheet([
        "egypt_sandstone_relief_wall_albedo_2k.png",
        "egypt_sandstone_relief_wall_normal_2k.png",
        "egypt_sandstone_relief_wall_height_2k.png",
        "egypt_sandstone_relief_wall_roughness_2k.png",
        "egypt_limestone_slab_floor_albedo_2k.png",
        "egypt_limestone_slab_floor_normal_2k.png",
        "egypt_painted_frieze_band_albedo_2k.png",
        "egypt_painted_frieze_band_normal_2k.png",
        "wall_masonry_seamless.png",
        "floor_worn_stone_seamless.png",
        "carved_band_seamless.png",
    ])


if __name__ == "__main__":
    main()
