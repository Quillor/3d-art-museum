#!/usr/bin/env python3
"""Generate photoreal museum textures with FLUX 1.1 Pro (via fal.ai) where no
good photographic scan/source exists.

Sibling to `rebuild_photoreal_textures.py` — same output/ledger conventions,
different source (AI generation instead of ambientCG/Wikimedia Commons). Use
this for bespoke, era-specific motifs that aren't real photographable objects
(e.g. an imagined temple facade material) rather than as a default over real
photo sources.

Requires: FAL_KEY env var (see fal.ai/dashboard/keys).

Usage:
    python3 review/generate_ai_textures.py                  # generate all specs
    python3 review/generate_ai_textures.py --only egypt_deity_glow.jpg
    python3 review/generate_ai_textures.py --dry-run         # print prompts only
"""

from __future__ import annotations

import argparse
import base64
import io
import json
import os
import sys
import time
import urllib.request
import urllib.error
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
TEXTURE_DIR = ROOT / "assets" / "textures"
REVIEW_DIR = ROOT / "review"
SOURCE_DIR = REVIEW_DIR / "source_assets_ai"
MONTAGE_DIR = REVIEW_DIR / "texture_montages"

FAL_MODEL = "fal-ai/flux-pro/v1.1"
FAL_URL = f"https://fal.run/{FAL_MODEL}"
FAL_FILL_URL = "https://fal.run/fal-ai/flux-pro/v1/fill"

SEAM_FILL_PROMPT_SUFFIX = (
    ", seamlessly continue the surrounding material across this region, "
    "matching grain, carving depth, color and lighting exactly, no visible "
    "seam or edge, no blur, sharp in-focus photographic detail"
)


def load_dotenv(path: Path) -> None:
    if not path.exists():
        return
    for line in path.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        key, value = key.strip(), value.strip().strip('"').strip("'")
        os.environ.setdefault(key, value)

# FLUX has no native tiling mode, so seamlessness is requested via prompt
# language, then reinforced by the offset+blend post-process below. Appended
# automatically based on a spec's tiling mode — don't repeat it per-prompt.
#   "all"  -> tiles on every edge (wall/floor fill textures)
#   "band" -> tiles only left/right, meant to run as a horizontal strip
#             (friezes, borders, cornices); top/bottom are NOT seamless.
#   False  -> no tiling requested or enforced
SEAMLESS_SUFFIX = {
    "all": (
        ", seamless tileable texture, seamless repeating pattern in all "
        "directions, flat orthographic texture map, edge-to-edge uniform "
        "lighting, no vignette, no drop shadow, PBR material scan, tiling swatch"
    ),
    "band": (
        ", seamless horizontally-repeating frieze band, continuous pattern "
        "that repeats left to right, flat orthographic elevation view, "
        "edge-to-edge uniform lighting, no vignette, no drop shadow, "
        "architectural relief band scan"
    ),
}
# "band-tile" generates a square unit motif, so it uses the "all" suffix.
SEAMLESS_SUFFIX["band-tile"] = SEAMLESS_SUFFIX["all"]
# "band-tile-v" is the same square-unit approach stacked VERTICALLY (tall jamb
# strips / stacked registers) — replaces the old naive mirror-tiling that put
# upside-down figures on the egypt jamb (see QUALITY_PASS_PLAN.md).
SEAMLESS_SUFFIX["band-tile-v"] = SEAMLESS_SUFFIX["all"]

# name -> (prompt, (width, height), tiling)
# width/height are generation size (FLUX supports up to 1440 on the long edge
# by default); output is resized/tiled to the final texture size after.
# tiling:
#   "all"       -> generate at (w,h) directly, blend both axes seamless.
#   "band"      -> generate a wide strip directly at (w,h), blend only the
#                  left/right seam. FLUX tends to drift content/lighting
#                  across a wide canvas, so this is unreliable above ~2:1.
#   "band-tile" -> generate ONE square unit motif at size (unit_px, unit_px)
#                  ("height" slot is ignored), make it seamless on all sides,
#                  then repeat it programmatically `repeats` times left to
#                  right. Sidesteps FLUX drift entirely — recommended for
#                  wide friezes/borders.
# Shared prompt discipline (QUALITY_PASS_PLAN.md constraint 6): rich shallow
# relief, LOW-contrast soft ambient shadow only — never strong baked cast
# shadows (they read wrong on flat geometry) — photoreal material scan.
SOFT = (
    ", low-contrast soft ambient occlusion only, rich shallow relief detail, "
    "no strong cast shadows, no harsh highlights, photorealistic material scan, "
    "muted natural pigments, no watermark, no text, no labels, no lettering, "
    "no annotations"
)
# For single (non-tiling) panels the tiling suffix never fires, so bake the
# flat-scan language in here instead.
PANEL = (
    ", flat orthographic view, edge-to-edge uniform lighting, no vignette, "
    "no drop shadow, museum artifact photograph, sharp focus"
)

SPECS: dict[str, tuple[str, tuple[int, int], str | bool]] = {
    # ---- Tranche A (Phase 1, review/QUALITY_PASS_PLAN.md): the TEXTURE_LEDGER
    # SKIP rows that are actually consumed at runtime, palette-anchored to the
    # procedural fallbacks in js/styles.js + js/corridor.js. Dead SKIP files
    # (meso_greca_carved, band_meander, islamic_muqarnas) are documented in the
    # ledger instead — no generation.
    # -- mesoamerica (meso) --
    "band_greca.jpg": (
        "extreme close-up macro photo of one square carved stone tile with a "
        "single pre-Columbian Maya stepped key-fret motif: bold angular "
        "T-shaped spiral meander like Mitla Zapotec geometric mosaic, painted "
        "red ochre #a8482f pigment over dark umber #2e2013 shadowed recesses, "
        "weathered limestone, strictly rectilinear geometry, no floral "
        "elements, no rosettes" + SOFT,
        (512, 5),
        "band-tile",
    ),
    "meso_deity_mask.jpg": (
        "carved Maya deity mask lintel panel in warm bronze-brown stone, "
        "frontal stylized face with headdress, deep recessed carving softly "
        "lit, weathered limestone surround" + SOFT + PANEL,
        (768, 960),
        False,
    ),
    # -- native north america (adobe) --
    "adobe_painted_frieze.jpg": (
        "close-up of an Ancestral Puebloan painted earthen frieze band, "
        "repeating stepped triangle motif in dark red #7c3a22 and cream "
        "#e0c27d on burnt umber #2e1d10 clay plaster, hand-painted mineral "
        "pigment, matte earthen surface" + SOFT,
        (512, 5),
        "band-tile",
    ),
    # -- africa traditions (earthen) --
    "band_mudcloth.jpg": (
        "flat scan of authentic Malian bogolanfini mudcloth, BOLD wide "
        "off-white geometric marks — zigzag rows, crosses, dots — hand "
        "painted on very dark brown-black #241a10 dyed cotton, high graphic "
        "clarity, thick confident brushwork, traditional bamana mud-dye "
        "textile" + SOFT,
        (512, 5),
        "band-tile",
    ),
    # -- africa kingdoms (sahel) --
    "kingdoms_band.jpg": (
        "close-up of a carved West African Sahel architectural frieze band, "
        "repeating geometric lozenge and zigzag relief carved into warm "
        "terracotta banco earth plaster #a5714a, Djenné mosque style" + SOFT,
        (512, 5),
        "band-tile",
    ),
    # -- middle-east neolithic --
    "neolithic_ochre_figures.jpg": (
        "close-up of a Neolithic Çatalhöyük wall painting band, small red "
        "ochre #7a2f1d hunter and deer figures on warm lime plaster "
        "#b08a5c, faded mineral pigment, 9000 year old mural" + SOFT,
        (512, 5),
        "band-tile",
    ),
    "neolithic_floor.jpg": (
        "top-down macro photo of smooth packed earth floor, warm clay "
        "#ac8353, subtle sweep marks and fine cracks, matte compacted "
        "surface" + SOFT,
        (1024, 1024),
        "all",
    ),
    # -- greek (classical) floor mosaic border; live name is band_meander_floor --
    "band_meander_floor.jpg": (
        "extreme close-up flat scan of one ancient Roman mosaic floor tile "
        "with a single Greek-key meander motif, Pompeian red #7c2f26 "
        "tesserae on cream #ecdcbc limestone tesserae, tiny visible mosaic "
        "grout lines" + SOFT,
        (512, 5),
        "band-tile",
    ),
    # -- southeast asia (khmer) --
    "khmer_apsara.jpg": (
        "museum photograph of an ancient carved stone temple panel from "
        "Angkor Wat, one devata guardian figure in shallow bas-relief wearing "
        "full traditional Khmer ceremonial costume with ornate jewelry, tall "
        "pointed crown and long pleated sampot robe, modest fully-clothed "
        "depiction, weathered grey sandstone, whole figure centered head to "
        "feet" + SOFT + PANEL,
        (720, 1280),
        False,
    ),
    "khmer_lintel_relief.jpg": (
        "carved Khmer temple lintel in grey-brown sandstone, dense scrolling "
        "foliate kala-head relief, Angkor period architectural carving" + SOFT + PANEL,
        (1152, 576),
        False,
    ),
    # -- japan --
    "japan_scroll.jpg": (
        "Japanese hanging scroll kakemono, sumi-e ink wash painting of pine "
        "branches and distant mountain on cream silk, small red artist seal "
        "stamp lower right, brocade mounting border top and bottom" + SOFT + PANEL,
        (512, 1408),
        False,
    ),
    # -- mesopotamia --
    "mesopotamia_procession.jpg": (
        "ancient Assyrian palace alabaster relief from Nimrud, one bearded "
        "tribute bearer walking in strict profile view, tight rows of "
        "spiral-curled hair and long square-curled beard, fringed layered "
        "Mesopotamian robe, bare muscular forearm carrying a vessel, "
        "shallow carved relief in warm tan #9b784a gypsum stone, cuneiform-"
        "era stylization" + SOFT + PANEL,
        (768, 1152),
        False,
    ),
    "mesopotamia_lamassu.jpg": (
        "Babylonian glazed brick panel of a striding lamassu winged bull in "
        "profile, gold #c8a048 and cream glazed relief bricks on deep lapis "
        "blue #1c4d7c glazed brick field, Ishtar Gate style, visible brick "
        "courses" + SOFT + PANEL,
        (768, 1152),
        False,
    ),
    # -- persia --
    "persia_guard.jpg": (
        "Persepolis stone relief of one standing Achaemenid immortal guard "
        "in profile holding a spear, pleated robe, curled beard, shallow "
        "carved grey-gold limestone #a99a7e relief" + SOFT + PANEL,
        (720, 1280),
        False,
    ),
    "persia_wingdisk.jpg": (
        "Achaemenid faravahar winged sun disk emblem, glazed brick relief in "
        "gold #d8b44e and ochre #8d7442 on warm stone, centered symmetrical "
        "royal Persian motif" + SOFT + PANEL,
        (1152, 576),
        False,
    ),
    # -- renaissance --
    "renaissance_fresco.jpg": (
        "quattrocento Italian fresco painting filling the entire image edge "
        "to edge, muted earth pigment Madonna within a painted architectural "
        "border, aged lime plaster surface, faded terra verde and ochre "
        "palette, fine craquelure, full-bleed flat frontal view, no "
        "background visible, no wall around it" + SOFT + PANEL,
        (1024, 1024),
        False,
    ),
    # -- gothic (medieval) --
    "window_lancet.jpg": (
        "tall gothic stained glass lancet window, deep cobalt blue and ruby "
        "red glass panels with a standing saint figure, black lead cames, "
        "quatrefoil tracery top, glowing backlit cathedral glass, "
        "13th century Chartres style" + PANEL,
        (576, 1440),
        False,
    ),
    # -- islamic (requires re-wiring corridor.js:2978 from forced-procedural
    #    back to fileTex once this ships a real motif) --
    "islamic_arabesque.jpg": (
        "flat scan of one carved stucco arabesque tile, interlacing "
        "biomorphic scroll and palmette motif, ivory #e3d7bd plaster with "
        "soft gold accents, Alhambra style shallow relief" + SOFT,
        (768, 768),
        "all",
    ),
    # ---- Tranche B (Phase 1): shipped photo-pipeline files that were naive
    # vertical/horizontal MIRROR tiles — upside-down figures baked into the
    # image (egypt portal set; see QUALITY_PASS_PLAN.md "flipped textures").
    "egypt_deity_l.jpg": (
        "ancient Egyptian temple wall relief of falcon-headed god Horus "
        "standing in strict profile facing right, holding an ankh and was "
        "sceptre, double crown, shallow sunk-relief carving in warm golden "
        "sandstone, hieroglyph column beside the figure" + SOFT + PANEL,
        (720, 1440),
        False,
    ),
    "egypt_deity_r.jpg": (
        "ancient Egyptian temple wall relief of ibis-headed god Thoth "
        "standing in strict profile facing left, holding an ankh and writing "
        "palette, lunar crown, shallow sunk-relief carving in warm golden "
        "sandstone, hieroglyph column beside the figure" + SOFT + PANEL,
        (720, 1440),
        False,
    ),
    "egypt_jamb.jpg": (
        "one square register of an ancient Egyptian door jamb carved with "
        "columns of upright hieroglyphs — ankh, scarab, reed, falcon signs — "
        "shallow sunk relief in warm golden sandstone, all glyphs oriented "
        "the same way up" + SOFT,
        (512, 4),
        "band-tile-v",
    ),
    "egypt_frieze.jpg": (
        "one square section of an ancient Egyptian painted procession frieze, "
        "offering bearers and a seated pharaoh in strict profile all facing "
        "right, upright hieroglyphs above, shallow painted relief on warm "
        "sandstone" + SOFT,
        (512, 4),
        "band-tile",
    ),
    # Tranche B continued: shipped files that were left-right MIRROR tiles of
    # directional content (Rorschach-butterfly seams flagged in Phase 0 audit).
    "band_archers.jpg": (
        "one square section of the Susa glazed-brick Frieze of Archers, "
        "Achaemenid immortal guards marching in profile all facing the same "
        "direction, ochre and gold robes on deep lapis blue glazed bricks, "
        "visible brick courses" + SOFT,
        (512, 5),
        "band-tile",
    ),
    "band_iznik.jpg": (
        "one square Ottoman Iznik ceramic tile, cobalt blue and coral red "
        "tulip and carnation floral motif on white ground, glazed ceramic "
        "sheen, 16th century Turkish tilework" + SOFT,
        (512, 5),
        "band-tile",
    ),
    "baroque_ceiling_fresco.jpg": (
        "one square section of a baroque palace ceiling fresco, warm golden "
        "sky with soft luminous clouds breaking into light, ringed by an "
        "ornate gilded stucco border frame, quadratura style, muted aged "
        "pigment" + SOFT,
        (512, 4),
        "band-tile",
    ),
    # Tranche B continued: walls/textiles the Phase 0 audit flagged as flat
    # procedural or kaleidoscope-mirrored sources.
    "inca_andesite.jpg": (
        "close-up photo of Inca dry-fitted andesite ashlar wall, precisely "
        "cut interlocking grey stone blocks with tight seams and gently "
        "pillowed faces, cool dark grey volcanic stone, Cusco masonry" + SOFT,
        (1024, 1024),
        "all",
    ),
    "inca_textile.jpg": (
        "flat scan of an Andean woven textile, bold geometric stepped "
        "diamond and bird motifs in red ochre, umber, cream and dark brown "
        "alpaca wool bands, tight tapestry weave" + SOFT,
        (768, 768),
        "all",
    ),
    "adobe_wall.jpg": (
        "close-up photo of smooth hand-troweled adobe plaster wall, warm "
        "earthen tan #c39362, soft sweeping trowel marks and faint straw "
        "flecks, matte mud plaster, Ancestral Puebloan architecture" + SOFT,
        (1024, 1024),
        "all",
    ),
    "traditions_wall.jpg": (
        "close-up photo of warm sand-colored banco earth plaster wall, soft "
        "hand-smoothed relief undulation, light amber #c79a63 mud render, "
        "West African earthen architecture, matte" + SOFT,
        (1024, 1024),
        "all",
    ),
    # Backlog polish round (QUALITY_BACKLOG.md): flat procedural walls.
    "gothic_ashlar.jpg": (
        "close-up photo of a medieval cathedral wall of light warm cream "
        "limestone ashlar blocks #c8bc9e, fine dressed stone with subtle "
        "tooling marks and thin pale mortar joints, gently weathered" + SOFT,
        (1024, 1024),
        "all",
    ),
    "salon_damask.jpg": (
        "flat scan of tone-on-tone crimson flocked damask wallpaper, matte "
        "deep red #5c2128 velvet acanthus medallion pattern on slightly "
        "lighter satin red #743036 ground, strictly two close red tones, no "
        "gold, no metallic, perfectly even lighting across the whole image, "
        "19th century salon wall covering" + SOFT,
        (768, 768),
        "all",
    ),
    # Backlog: oceania-ancient rock-shelter (H29) — the shipped oceania_*.jpg
    # were "featureless dark blobs" (styles.js note); regenerate properly.
    "oceania_sandstone.jpg": (
        "close-up photo of Australian rock shelter sandstone wall, warm "
        "golden-orange horizontally stratified layers #c99a63, weathered "
        "bands of ochre and cream stone, Kakadu escarpment rock face" + SOFT,
        (1024, 1024),
        "all",
    ),
    "oceania_floor.jpg": (
        "top-down photo of nearly flat compacted red-brown dust floor of a "
        "rock shelter, very fine even gravel and dust, smooth level trodden "
        "earth #a57048, extremely subtle low relief, no deep cracks, no "
        "erosion channels" + SOFT,
        (1024, 1024),
        "all",
    ),
    # ---- Pre-plan starter set (shipped) ----
    "meso_stucco_relief.jpg": (
        "extreme close-up macro photo of ancient Maya carved limestone stucco "
        "relief, weathered red ochre pigment, deep undercut carving, museum "
        "lighting, photorealistic, 4k texture scan, no watermark",
        (1024, 1024),
        "all",
    ),
    "khmer_sandstone_carved.jpg": (
        "macro photo of Angkor-style carved grey sandstone wall texture, "
        "shallow bas-relief floral motif, weathered stone, soft studio "
        "lighting, photorealistic material scan, no watermark",
        (1024, 1024),
        "all",
    ),
    "band_meso_glyph.jpg": (
        "extreme close-up macro photo of a single carved Maya stone stepped-"
        "fret (greca) motif tile, weathered limestone, warm museum lighting, "
        "photorealistic, 4k texture scan, no watermark",
        (512, 4),  # (unit_px, repeats) for tiling="band-tile"
        "band-tile",
    ),

    # ---- Tranche C (review pass): regen + net-new motifs, palette-anchored
    # to js/styles.js. See AI_TEXTURE_LEDGER.md for verdicts.
    "renaissance_ceiling.jpg": (
        "top-down view straight up at an Italian Renaissance coffered timber "
        "ceiling grid, deep square walnut beam coffers #7a5a34 with dark "
        "umber #4a3420 shadowed recesses, a gilded gold #caa24e rosette "
        "carved at the center of each coffer, quattrocento palace hall, "
        "shallow relief" + SOFT,
        (1024, 1024),
        "all",
    ),
    "neolithic_wall.jpg": (
        "flat material scan of a smooth ancient lime-plaster wall surface, "
        "warm cream #c2a075 tone, very subtle trowel undulation only, faint "
        "straw fiber traces, blank unmarked plaster, NOT pebbly, NOT "
        "speckled, NOT stippled, continuous smooth hand-finished mud "
        "plaster, plain empty surface with no writing, no plaque, no sign, "
        "no stock-photo overlay" + SOFT,
        (1024, 1024),
        "all",
    ),
    "khmer_sandstone.jpg": (
        "close-up photo of Angkor Wat temple wall, large irregular-sized "
        "dressed sandstone ashlar blocks in warm muted honey-tan #bda274 "
        "natural stone, thin dark warm-brown mortar joints #6f5c40, subtle "
        "weathered laterite pitting and mineral staining, matte natural "
        "stone finish, soft even tone, NOT glossy, NOT saturated orange, "
        "NOT uniform brick coursing, NOT cartoonish, NOT grey, warm Khmer "
        "temple masonry" + SOFT,
        (1024, 1024),
        "all",
    ),
    "khmer_band.jpg": (
        "close-up of a carved Khmer temple frieze band, dense scrolling "
        "foliate floral vine motif in shallow bas-relief with small modest "
        "fully-clothed apsara dancer figures in traditional robes woven "
        "into the foliage, warm amber-grey sandstone #c7ac78 with dark "
        "umber #5a4830 shadowed recesses, Angkor Wat architectural carving, "
        "no nudity, decorative botanical emphasis" + SOFT,
        (512, 5),
        "band-tile",
    ),
    "japan_scroll.jpg": (
        "Japanese hanging scroll kakemono, BOLD high-contrast sumi-e ink "
        "wash painting of a gnarled pine branch and distant mountain peak, "
        "strong black ink strokes with deep saturated contrast against cream "
        "silk, clearly visible brushwork, small red artist seal stamp lower "
        "right, brocade mounting border top and bottom, striking legible "
        "ink painting, not faint, not washed out" + SOFT + PANEL,
        (512, 1408),
        False,
    ),
    "kingdoms_band.jpg": (
        "close-up of a carved and painted West African Sahel architectural "
        "frieze band, HIGH-CONTRAST geometric lozenge and zigzag pattern "
        "painted in bold red-ochre #96653f and black on a cream #e0c27d "
        "ground, Djenné mosque style, crisp graphic clarity, strong color "
        "separation, not tone-on-tone, not monochrome" + SOFT,
        (512, 5),
        "band-tile",
    ),
    "salon_parquet.jpg": (
        "top-down photo of a 19th-century herringbone oak parquet floor, "
        "honey-brown #6b4526 wood tone, aged waxed patina, fine grain, "
        "tight herringbone weave pattern, gallery flooring" + SOFT,
        (1024, 1024),
        "all",
    ),
    "salon2_parquet.jpg": (
        "overhead photo of a pale honey-brown chevron parquet wood floor "
        "#a1783f, bright satin waxed sheen, fine straight wood grain, tight "
        "chevron weave pattern, evenly and brightly lit, airy sunlit salon "
        "flooring, plain bare floor with nothing on it and no markings" + SOFT,
        (1024, 1024),
        "all",
    ),
    "mesopotamia_lion.jpg": (
        "one square section of the Babylonian Processional Way glazed brick "
        "relief, a striding lion in profile all facing the same direction, "
        "white and gold #ede2c4 lion figure with a gold #c2a044 mane on deep "
        "royal lapis blue #1a3670 glazed brick field, visible horizontal "
        "brick courses, Ishtar Gate style" + SOFT,
        (512, 4),
        "band-tile",
    ),
    "egypt_wingsun.jpg": (
        "ancient Egyptian temple lintel emblem of a winged sun disk, gold "
        "#c8a86a painted and carved sandstone disc at center, symmetric "
        "outstretched falcon wings spreading left and right, uraeus cobras, "
        "shallow sunk relief on warm sandstone #8a7350, centered frontal "
        "composition" + SOFT + PANEL,
        (1152, 384),
        False,
    ),
    "ottoman_runner.jpg": (
        "top-down photo of an Ottoman palace carpet runner, deep red "
        "#9c2c22 field, a column of ornate gold #c7a24a medallions running "
        "down the center, intricate floral border along both long edges, "
        "dense woven wool pile, Iznik-palette palace textile" + SOFT,
        (512, 4),
        "band-tile-v",
    ),
    "asiamodern_concrete.jpg": (
        "close-up photo of an early-modern polished concrete and grey "
        "plaster wall #ddd2bd, subtle surface mottle, faint formwork board "
        "hints, cool light grey tone, smooth minimalist mid-century "
        "architectural finish" + SOFT,
        (1024, 1024),
        "all",
    ),
    "cave_wall_soft.jpg": (
        "close-up photo of a warm tan and buff colored limestone cave wall, "
        "pale sandy beige stone surface, soft undulating relief, subtle "
        "mineral striations, weathered prehistoric rock shelter wall" + SOFT,
        (1024, 1024),
        "all",
    ),
}


def urlopen_json(req: urllib.request.Request, timeout: int = 180) -> dict:
    last_exc: Exception | None = None
    for attempt in range(4):
        try:
            with urllib.request.urlopen(req, timeout=timeout) as r:
                return json.loads(r.read().decode("utf-8"))
        except urllib.error.HTTPError as exc:
            body = exc.read().decode("utf-8", "ignore")
            if exc.code in {429, 500, 502, 503, 504}:
                last_exc = exc
                time.sleep(3 * (attempt + 1))
                continue
            raise RuntimeError(f"fal.ai request failed ({exc.code}): {body}") from exc
        except urllib.error.URLError as exc:
            last_exc = exc
            time.sleep(2 * (attempt + 1))
    raise RuntimeError(f"fal.ai request failed after retries: {last_exc}")


def generate_image(prompt: str, size: tuple[int, int], api_key: str) -> bytes:
    payload = {
        "prompt": prompt,
        "image_size": {"width": size[0], "height": size[1]},
        "num_images": 1,
        "safety_tolerance": "2",
        "output_format": "jpeg",
    }
    req = urllib.request.Request(
        FAL_URL,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Key {api_key}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    result = urlopen_json(req)
    images = result.get("images") or []
    if not images:
        raise RuntimeError(f"No images returned: {result}")
    image_url = images[0]["url"]
    with urllib.request.urlopen(image_url, timeout=90) as r:
        return r.read()


def image_to_data_uri(im: Image.Image, fmt: str = "JPEG") -> str:
    buf = io.BytesIO()
    im.save(buf, format=fmt)
    mime = "image/jpeg" if fmt == "JPEG" else "image/png"
    return f"data:{mime};base64,{base64.b64encode(buf.getvalue()).decode()}"


def fal_fill(image: Image.Image, mask: Image.Image, prompt: str, api_key: str) -> Image.Image:
    """Inpaint the masked region with FLUX Fill — regenerates real, sharp
    detail that matches the surroundings, instead of blurring a seam."""
    payload = {
        "prompt": prompt,
        "image_url": image_to_data_uri(image, "JPEG"),
        "mask_url": image_to_data_uri(mask, "PNG"),
        "num_images": 1,
        "safety_tolerance": "2",
        "output_format": "jpeg",
    }
    req = urllib.request.Request(
        FAL_FILL_URL,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Key {api_key}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    result = urlopen_json(req, timeout=180)
    images = result.get("images") or []
    if not images:
        raise RuntimeError(f"No images returned from fill: {result}")
    with urllib.request.urlopen(images[0]["url"], timeout=90) as r:
        raw = r.read()
    out = Image.open(io.BytesIO(raw)).convert("RGB")
    if out.size != image.size:
        out = out.resize(image.size, Image.Resampling.LANCZOS)
    return out


def seam_mask(w: int, h: int, mode: str, band_frac: float = 0.16) -> Image.Image:
    """Hard-edged mask marking the seam region to inpaint: white = regenerate,
    black = keep. mode="all" masks a cross at the center (both seams);
    mode="band" masks only the vertical strip (left/right seam)."""
    band_w = max(8, round(w * band_frac))
    band_h = max(8, round(h * band_frac))
    mask = Image.new("L", (w, h), 0)
    px = mask.load()
    for x in range(max(0, w // 2 - band_w), min(w, w // 2 + band_w)):
        for y in range(h):
            px[x, y] = 255
    if mode == "all":
        for y in range(max(0, h // 2 - band_h), min(h, h // 2 + band_h)):
            for x in range(w):
                px[x, y] = 255
    return mask


def make_seamless(im: Image.Image, mode: str, prompt: str, api_key: str) -> Image.Image:
    """Wrap the image by half its size so the original edges land in the
    middle as a seam, then inpaint just that seam region with FLUX Fill so
    it's regenerated as real, matching, in-focus detail — not blurred.

    mode="all" fixes both the vertical and horizontal seam (tiles on every
    edge). mode="band" fixes only the vertical seam, so left/right repeat
    cleanly but top/bottom are left untouched (not meant to stack vertically)."""
    w, h = im.size
    im = im.convert("RGB")
    offset = Image.new("RGB", (w, h))
    offset.paste(im, (w // 2, 0))
    offset.paste(im, (w // 2 - w, 0))
    if mode == "all":
        offset2 = Image.new("RGB", (w, h))
        offset2.paste(offset, (0, h // 2))
        offset2.paste(offset, (0, h // 2 - h))
        offset = offset2

    mask = seam_mask(w, h, mode)
    fill_prompt = prompt + SEAM_FILL_PROMPT_SUFFIX
    return fal_fill(offset, mask, fill_prompt, api_key)


def tile_horizontally(unit: Image.Image, repeats: int) -> Image.Image:
    """Repeat a pre-seamless square unit tile left to right. The unit must
    already be made seamless (mode="all") so the repeat boundary is clean."""
    uw, uh = unit.size
    out = Image.new("RGB", (uw * repeats, uh))
    for i in range(repeats):
        out.paste(unit, (i * uw, 0))
    return out


def tile_vertically(unit: Image.Image, repeats: int) -> Image.Image:
    """Stack a pre-seamless square unit tile top to bottom (jamb strips,
    stacked hieroglyph registers). Never mirror — every repeat is upright."""
    uw, uh = unit.size
    out = Image.new("RGB", (uw, uh * repeats))
    for i in range(repeats):
        out.paste(unit, (0, i * uh))
    return out


def image_metrics(im: Image.Image) -> dict[str, str]:
    small = im.convert("RGB").resize((min(256, im.width), min(256, im.height)), Image.Resampling.BOX)
    px = small.load()
    w, h = small.size
    lr_total = sum(sum(abs(px[0, y][i] - px[w - 1, y][i]) for i in range(3)) / 3 for y in range(h))
    tb_total = sum(sum(abs(px[x, 0][i] - px[x, h - 1][i]) for i in range(3)) / 3 for x in range(w))
    edge = ((lr_total / max(1, h)) + (tb_total / max(1, w))) / 2
    return {"edge_delta": f"{edge:.1f}"}


def build_montage(name: str, mode: str | bool = "all") -> None:
    """Tile the saved texture in context so seams are easy to eyeball.
    mode="all" -> 3x3 grid (tests every edge). mode="band" -> a single row
    of 4 (tests only the left/right seam; vertical stacking isn't implied)."""
    p = TEXTURE_DIR / name
    im = Image.open(p).convert("RGBA")
    MONTAGE_DIR.mkdir(parents=True, exist_ok=True)
    if mode in ("band", "band-tile"):
        thumb_h = 220
        thumb_w = max(48, round(thumb_h * im.width / im.height))
        tile = im.resize((thumb_w, thumb_h), Image.Resampling.LANCZOS)
        canvas = Image.new("RGBA", (thumb_w * 4, thumb_h), (26, 24, 20, 255))
        for x in range(4):
            canvas.alpha_composite(tile, (x * thumb_w, 0))
        canvas.convert("RGB").save(MONTAGE_DIR / f"{Path(name).stem}_strip.jpg", quality=90)
        return
    thumb_w = 256
    thumb_h = max(48, round(thumb_w * im.height / im.width))
    tile = im.resize((thumb_w, thumb_h), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (thumb_w * 3, thumb_h * 3), (26, 24, 20, 255))
    for y in range(3):
        for x in range(3):
            canvas.alpha_composite(tile, (x * thumb_w, y * thumb_h))
    canvas.convert("RGB").save(MONTAGE_DIR / f"{Path(name).stem}_3x3.jpg", quality=90)


def read_ledger_rows() -> dict[str, dict[str, str]]:
    """Parse existing ledger rows so incremental runs merge instead of
    clobbering earlier entries."""
    path = REVIEW_DIR / "AI_TEXTURE_LEDGER.md"
    rows: dict[str, dict[str, str]] = {}
    if not path.exists():
        return rows
    for line in path.read_text().splitlines():
        if not line.startswith("| ") or line.startswith("| File ") or line.startswith("|---"):
            continue
        cells = [c.strip() for c in line.strip().strip("|").split(" | ")]
        if len(cells) >= 5:
            rows[cells[0]] = {
                "file": cells[0], "model": cells[1], "tiling": cells[2],
                "edge_delta": cells[3], "prompt": " | ".join(cells[4:]),
            }
    return rows


def write_ledger(rows: list[dict[str, str]]) -> None:
    merged = read_ledger_rows()
    for r in rows:
        merged[r["file"]] = r
    rows = list(merged.values())
    md = [
        "# AI Texture Ledger",
        "",
        "Generated by `review/generate_ai_textures.py` using FLUX 1.1 Pro (fal.ai). "
        "Use only where no acceptable photographic source exists — see "
        "`TEXTURE_LEDGER.md` for the photo-sourced set.",
        "",
        "| File | Model | Tiling | Edge delta | Prompt |",
        "|---|---|---|---:|---|",
    ]
    for r in sorted(rows, key=lambda r: r["file"]):
        md.append("| {file} | {model} | {tiling} | {edge_delta} | {prompt} |".format(
            **{k: str(v).replace("|", "\\|") for k, v in r.items()}
        ))
    (REVIEW_DIR / "AI_TEXTURE_LEDGER.md").write_text("\n".join(md) + "\n")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--only", help="Generate a single texture by output filename")
    parser.add_argument("--dry-run", action="store_true", help="Print prompts without calling the API")
    args = parser.parse_args()

    specs = SPECS
    if args.only:
        if args.only not in specs:
            print(f"Unknown key: {args.only}. Options: {', '.join(specs)}", file=sys.stderr)
            return 1
        specs = {args.only: specs[args.only]}

    if args.dry_run:
        for name, (prompt, size, tiling) in specs.items():
            full_prompt = prompt + SEAMLESS_SUFFIX[tiling] if tiling else prompt
            if tiling == "band-tile":
                unit_px, repeats = size
                dims = f"{unit_px}x{unit_px} unit x{repeats} -> {unit_px * repeats}x{unit_px}"
            else:
                dims = f"{size[0]}x{size[1]}"
            print(f"{name} [{dims}, tiling={tiling}]\n  {full_prompt}\n")
        return 0

    load_dotenv(ROOT / ".env")
    api_key = os.environ.get("FAL_KEY")
    if not api_key:
        print("FAL_KEY not set. Get a key at fal.ai/dashboard/keys and `export FAL_KEY=...`, "
              "or put FAL_KEY=... in 3d-art-museum/.env.", file=sys.stderr)
        return 1

    SOURCE_DIR.mkdir(parents=True, exist_ok=True)
    TEXTURE_DIR.mkdir(parents=True, exist_ok=True)
    rows = []
    for name, (prompt, size, tiling) in specs.items():
        full_prompt = prompt + SEAMLESS_SUFFIX[tiling] if tiling else prompt
        print(f"Generating {name}...")
        if tiling in ("band-tile", "band-tile-v"):
            unit_px, repeats = size
            raw = generate_image(full_prompt, (unit_px, unit_px), api_key)
            (SOURCE_DIR / f"{Path(name).stem}_raw.jpg").write_bytes(raw)
            unit = Image.open(io.BytesIO(raw)).convert("RGB")
            unit = make_seamless(unit, "all", prompt, api_key)
            im = tile_horizontally(unit, repeats) if tiling == "band-tile" else tile_vertically(unit, repeats)
        else:
            raw = generate_image(full_prompt, size, api_key)
            (SOURCE_DIR / f"{Path(name).stem}_raw.jpg").write_bytes(raw)
            im = Image.open(io.BytesIO(raw)).convert("RGB")
            if tiling:
                im = make_seamless(im, tiling, prompt, api_key)
        out_path = TEXTURE_DIR / name
        if out_path.suffix.lower() in {".jpg", ".jpeg"}:
            im.save(out_path, quality=94, subsampling=1, optimize=True)
        else:
            im.convert("RGBA").save(out_path, optimize=True)
        build_montage(name, mode=tiling)
        rows.append({
            "file": name,
            "model": FAL_MODEL,
            "tiling": str(tiling),
            "edge_delta": image_metrics(im)["edge_delta"],
            "prompt": full_prompt,
        })
        time.sleep(0.5)

    write_ledger(rows)
    print(f"Generated {len(rows)} texture(s). Ledger: {REVIEW_DIR / 'AI_TEXTURE_LEDGER.md'}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
