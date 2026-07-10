#!/usr/bin/env python3
"""Before/after visual summary of the quality-pass changes.

Composes labeled side-by-side panels into scratch_previews/fable-improvements/
so progress is reviewable at a glance. Re-run after each verification sweep:

    python3 tools/make_improvement_previews.py

BEFORE = review/audit/  (the first valid full sweep of this pass)
AFTER  = review/audit-after/  (latest verification sweep)
Panels whose view is missing in BEFORE (e.g. the later-added "approach" view)
fall back to entrance_out on the before side.
"""
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
BEFORE = ROOT / "review" / "audit"
AFTER = ROOT / "review" / "audit-after"
OUT = ROOT / "scratch_previews" / "fable-improvements"

BEFORE_W2 = ROOT / "review" / "audit-wave1"   # snapshot taken before wave 2

# Wave 2 (triage-driven fix packages): before = audit-wave1 snapshot.
# (index, room, view, title) — indices 30+ so wave-1 panels keep their names.
PAIRS_W2 = [
    (30, "prehistoric",  "wall_left",    "Cave: rust-red rock -> tan/buff sandstone albedo + lifted ochre stencils + 14-light budget"),
    (31, "prehistoric",  "approach",     "Cave mouth: first-ever title plaque (the one room with no portal)"),
    (32, "persia",       "entrance_out", "Persia: smooth cylinders -> fluted bull-protome columns + winged-disk emblem panel"),
    (33, "islamic",      "wall_left",    "Islamic: solid panels -> pierced mashrabiya lattice; brass bowls; tiered muqarnas"),
    (34, "classical",    "wall_left",    "Greek: empty niches -> amphora on plinth; entablature; red/tan mosaic carpet"),
    (35, "baroque",      "ceiling",      "Baroque: Sputnik ring -> tiered candelabra; walnut grain; softer chandelier light"),
    (36, "china",        "entrance_out", "China: plain torus gate -> bosses+crest; bronze-vessel niches; ice-ray lattice"),
    (37, "mesoamerica",  "entrance_out", "Meso: textile-scale frets -> architectural scale; detailed inner portal face"),
    (38, "japan",        "wall_right",   "Japan: faint scroll -> bold ink kakemono; ranma band; tatami platform + toro"),
    (39, "impressionism","floor",        "Impressionism: FLUX honey parquet + deeper sage walls + marble threshold"),
    (40, "americasmodern","wall_left",   "Americas Modern: bare walls -> plinth + bronze sculpture rhythm"),
    (41, "renaissance",  "ceiling",      "Renaissance: plank photo -> coffered walnut + gold rosettes; hotspots tamed"),
    (42, "neolithic",    "wall_left",    "Neolithic: pebbly speckle -> smooth creamy lime plaster"),
    (43, "kingdoms",     "approach",     "Kingdoms: boxy facade -> tapered massing + toron pegs; legible carved band"),
    (44, "ocevoyage",    "wall_left",    "Voyagers: bleached gold -> stained voyaging timber palette"),
    (45, "mesopotamia",  "wall_left",    "Mesopotamia: glazed striding-lion panels near the exit; softer uplight pools"),
    (46, "traditions",   "wall_left",    "Traditions: carved figures in niches; raffia floor; carved posts"),
    (47, "southasia",    "entrance_out", "Mughal: grey arch soffit -> red sandstone collar; sign clear of the pishtaq"),
    (48, "amsalon",      "floor",        "19th C: straight planks -> herringbone parquet; settee; softer sconces"),
    (49, "medieval",     "wall_left",    "Medieval: benches + heraldic tapestries between lanterns; dim-chapel lighting"),
]

# (index, room, view, title)
PAIRS = [
    (1,  "egypt",        "entrance_out", "Egypt portal: mirror-tiled upside-down deity/jamb files -> upright FLUX reliefs"),
    (2,  "seasia",       "wall_left",    "Southeast Asia: apsara panels rendered 180deg inverted -> flipY fix + new devata panel"),
    (3,  "mesopotamia",  "entrance_out", "Mesopotamia: inverted reliefs -> upright lamassu jambs + procession walls"),
    (4,  "persia",       "wall_left",    "Persia: inverted guard reliefs + Rorschach archer frieze -> upright FLUX panels"),
    (5,  "islamic",      "approach",     "Islamic: plain fallback arch -> zellij-jamb pointed-arch kit portal (was never wired)"),
    (6,  "oceancient",   "approach",     "Ancient Oceania: no kit at all -> stacked-slab shelter mouth + stratified sandstone"),
    (7,  "oceancient",   "wall_left",    "Ancient Oceania walls: flat painted bands -> Kakadu strata + packed-earth floor"),
    (8,  "oceliving",    "exit_in",      "Living Traditions: was pixel-identical to Voyagers -> gabled rafters + tukutuku split"),
    (9,  "memodern",     "wall_left",    "Middle-East Modern: generic white cube -> backlit mashrabiya screens + warm sand"),
    (10, "medieval",     "wall_left",    "Medieval: flat cream walls -> FLUX limestone ashlar (also drives the emissive lift)"),
    (11, "romantic",     "wall_right",   "Romantic salon: two-tone stencil wallpaper -> flocked damask"),
    (12, "classical",    "floor",        "Classical: meander border crushed to 'pink hatch' -> 90deg UV rotation, legible keys"),
    (13, "mesoamerica",  "entrance_out", "Mesoamerica: deity mask split by a wrapped UV seam -> single upright mask (kit rebuild)"),
    (14, "kingdoms",     "wall_left",    "Kingdoms: flat orange walls + plastic louvers -> banco plaster, carved band, wood grain"),
    (15, "andes",        "wall_left",    "Andes: flat bright cream -> cool dry-fit andesite + clean textile (was kaleidoscope)"),
    (16, "nativenorth",  "wall_left",    "Native North America: speckled cork walls -> troweled adobe plaster"),
    (17, "traditions",   "ceiling",      "Traditions: ceiling loaded the FLOOR texture (cork speckle) -> timber planks"),
    (18, "japan",        "wall_right",   "Japan: tokonoma scroll blew out to blank white -> toned paper material"),
    (19, "impressionism","approach",     "Impressionism: era plaque hidden behind skylight fan -> lowered, fully legible"),
    (20, "baroque",      "entrance_out", "Baroque: damask smeared down portal jambs -> dedicated texture with corrected repeat"),
    (21, "ocevoyage",    "entrance_in",  "Voyagers: signage judged from real approach + tapa band split from kowhaiwhai"),
    (22, "neolithic",    "wall_left",    "Neolithic: missing floor file (404) + placeholder band -> generated floor + ochre figures"),
]

TITLE_H = 42


def load(p, size):
    if not p.exists():
        im = Image.new("RGB", size, (24, 22, 20))
        d = ImageDraw.Draw(im)
        d.text((size[0] // 2 - 60, size[1] // 2), "(no shot)", fill=(160, 150, 135))
        return im
    im = Image.open(p).convert("RGB")
    im.thumbnail(size)
    return im


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    half = (760, 507)
    made = 0
    jobs = [(BEFORE, e) for e in PAIRS] + [(BEFORE_W2, e) for e in PAIRS_W2]
    for bdir, (idx, room, view, title) in jobs:
        b = bdir / room / f"{view}.jpg"
        if not b.exists():
            b = bdir / room / "entrance_out.jpg"   # approach view postdates BEFORE sweep
        a = AFTER / room / f"{view}.jpg"
        bi, ai = load(b, half), load(a, half)
        w = bi.width + ai.width + 12
        h = max(bi.height, ai.height) + TITLE_H + 24
        panel = Image.new("RGB", (w, h), (16, 15, 13))
        d = ImageDraw.Draw(panel)
        d.text((10, 8), f"{idx:02d}. {title}", fill=(240, 232, 215))
        d.text((10, TITLE_H - 14), "BEFORE", fill=(200, 140, 120))
        d.text((bi.width + 22, TITLE_H - 14), "AFTER", fill=(140, 200, 140))
        panel.paste(bi, (4, TITLE_H + 12))
        panel.paste(ai, (bi.width + 12, TITLE_H + 12))
        panel.save(OUT / f"{idx:02d}-{room}-{view}.jpg", quality=87)
        made += 1
    # one combined overview (grid of the after-side thumbnails is already
    # covered by review/distinctiveness_sheet.jpg — copy it in for convenience)
    ds = ROOT / "review" / "distinctiveness_sheet.jpg"
    if ds.exists():
        Image.open(ds).save(OUT / "00-all-31-rooms-current.jpg", quality=87)
    print(f"wrote {made} before/after panels -> {OUT}")


if __name__ == "__main__":
    main()
