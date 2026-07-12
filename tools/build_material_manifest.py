#!/usr/bin/env python3
"""Write deterministic provenance and integrity metadata for material masters."""

from __future__ import annotations

import hashlib
import json
import re
import zipfile
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE_DIR = ROOT / "review" / "source_assets"
MASTER_DIR = ROOT / "assets" / "materials" / "masters"
LICENSE = {
    "spdx": "CC0-1.0",
    "name": "Creative Commons CC0 1.0 Universal",
    "url": "https://docs.ambientcg.com/license/",
}
VERIFIED_ON = "2026-07-11"

# Technique labels are normalized from the official ambientCG asset pages.
# Tiles143 is deliberately unknown: its archive is present, but its individual
# page/technique could not be independently retrieved during this audit.
SOURCES = (
    ("stone_limestone_dressed_v1", "Tiles143", "unknown", None),
    ("stone_sandstone_warm_v1", "Bricks084", "surface-photogrammetry", "Surface Photogrammetry"),
    ("rock_natural_grey_v1", "Rock051", "surface-photogrammetry", "Surface Photogrammetry"),
    ("earth_rocky_v1", "Ground068", "surface-photogrammetry", "Surface Photogrammetry"),
    ("masonry_stone_irregular_v1", "Bricks098", "surface-photogrammetry", "Surface Photogrammetry"),
    ("paving_stone_grey_v1", "PavingStones142", "surface-photogrammetry", "Surface Photogrammetry"),
    ("plaster_lime_v1", "Plaster001", "surface-fully-procedural", "Procedural"),
    ("earth_compacted_v1", "Ground103", "surface-photogrammetry", "Surface Photogrammetry"),
    ("timber_parquet_light_v1", "WoodFloor051", "surface-fully-procedural", "Procedural"),
    ("timber_parquet_dark_v1", "WoodFloor064", "surface-procedural-bitmap-elements", "Procedural with Bitmap Elements"),
    ("stone_marble_white_v1", "Marble021", "surface-fully-procedural", "Procedural"),
    ("masonry_fired_brick_v1", "Bricks071", "surface-fully-procedural", "Procedural"),
    ("fabric_woven_neutral_v1", "Fabric019", "surface-fully-procedural", "Procedural"),
    ("ceramic_glazed_blue_v1", "Tiles135B", "surface-fully-procedural", "Procedural"),
    ("terrazzo_white_v1", "Terrazzo013", "surface-fully-procedural", "Procedural"),
    ("paper_white_v1", "Paper001", "surface-approximated", "Approximation"),
    ("tatami_yellow_v1", "Tatami001", "surface-fully-procedural", "Procedural"),
)
CHANNEL_FILES = {
    "color": "color.jpg",
    "normalGL": "normal_gl.jpg",
    "roughness": "roughness.jpg",
}


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def relative(path: Path) -> str:
    return path.relative_to(ROOT).as_posix()


def file_record(path: Path, include_image: bool = True) -> dict:
    record = {
        "path": relative(path),
        "bytes": path.stat().st_size,
        "sha256": sha256(path),
    }
    if include_image:
        with Image.open(path) as image:
            record.update(
                width=image.width,
                height=image.height,
                mode=image.mode,
            )
    return record


def archive_channels(archive: Path, asset_id: str) -> list[str]:
    pattern = re.compile(rf"{re.escape(asset_id)}_1K-JPG_(.+)\.(?:jpg|png)$", re.I)
    with zipfile.ZipFile(archive) as bundle:
        channels = {
            match.group(1)
            for name in bundle.namelist()
            if (match := pattern.match(Path(name).name))
        }
    return sorted(channels)


def ambient_source(asset_id: str, method: str, provider_label: str | None) -> dict:
    evidence = {
        "status": "verified" if method != "unknown" else "unverified",
        "checkedOn": VERIFIED_ON,
    }
    if method == "unknown":
        evidence["note"] = "Official asset technique was not retrievable during the audit; no method is inferred."
    return {
        "provider": "ambientCG",
        "assetId": asset_id,
        "assetUrl": f"https://ambientcg.com/a/{asset_id}",
        "license": LICENSE,
        "creationMethod": {
            "classification": method,
            "providerLabel": provider_label,
            "evidence": evidence,
        },
    }


def output_tiers(master_id: str) -> dict:
    tiers = {}
    for tier in ("desktop", "mobile"):
        tiers[tier] = {
            channel: file_record(MASTER_DIR / master_id / tier / filename)
            for channel, filename in CHANNEL_FILES.items()
        }
    return tiers


def ambient_master(master_id: str, asset_id: str, method: str, provider_label: str | None) -> dict:
    archive = SOURCE_DIR / f"{asset_id}_1K-JPG.zip"
    available = archive_channels(archive, asset_id)
    included = ["Color", "NormalGL", "Roughness"]
    return {
        "id": master_id,
        "provenance": {
            "colorAndSurfaceResponse": ambient_source(asset_id, method, provider_label),
        },
        "sourceArchive": file_record(archive, include_image=False),
        "channels": {
            "availableInSourceArchive": available,
            "included": included,
            "intentionallyOmitted": sorted(set(available) - set(included)),
        },
        "build": {
            "desktop": "byte-copy of ambientCG 1K JPG Color, NormalGL, and Roughness",
            "mobile": "aspect-preserving 512 px long-edge resize of the same authored channels",
        },
        "tiers": output_tiers(master_id),
    }


def asante_master(plaster_source: dict) -> dict:
    source_image = MASTER_DIR / "plaster_earthen_asante_v1" / "source" / "albedo_1254.png"
    response_archive = SOURCE_DIR / "Plaster001_1K-JPG.zip"
    return {
        "id": "plaster_earthen_asante_v1",
        "provenance": {
            "color": {
                "provider": "OpenAI image generation via Codex",
                "creationMethod": {"classification": "ai-generated"},
                "sourceImage": file_record(source_image),
                "rightsNote": "Project-generated source; this manifest does not assert a third-party asset license.",
            },
            "surfaceResponse": plaster_source,
        },
        "sourceArchive": file_record(response_archive, include_image=False),
        "channels": {
            "included": ["generated Color", "Plaster001 NormalGL", "Plaster001 Roughness"],
            "intentionallyOmitted": ["AmbientOcclusion", "Displacement", "NormalDX"],
        },
        "build": {
            "color": "deterministic half-tile offset, raised-cosine interior crossfade, opposite-edge wrap blend, then tier resize",
            "surfaceResponse": "byte-copy at desktop and aspect-preserving resize at mobile from Plaster001 authored companions; never derived from generated color",
        },
        "tiers": output_tiers("plaster_earthen_asante_v1"),
    }


def main() -> None:
    masters = [ambient_master(*source) for source in SOURCES]
    plaster_source = next(
        master["provenance"]["colorAndSurfaceResponse"]
        for master in masters
        if master["id"] == "plaster_lime_v1"
    )
    masters.insert(3, asante_master(plaster_source))
    manifest = {
        "schemaVersion": 1,
        "generatedBy": relative(Path(__file__).resolve()),
        "integrityAlgorithm": "SHA-256",
        "licenseDefinitions": {"ambientCG": LICENSE},
        "masters": masters,
    }
    destination = MASTER_DIR / "manifest.json"
    destination.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n")
    print(f"Wrote {relative(destination)} with {len(masters)} masters")


if __name__ == "__main__":
    main()
