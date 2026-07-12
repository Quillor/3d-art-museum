#!/usr/bin/env python3
"""Render dimensioned orthographic evidence for every named GLB kit part.

Run with Blender, not the system Python:

  /Applications/Blender.app/Contents/MacOS/Blender --background \
    --python tools/render_asset_plates.py -- \
    assets/models review/asset-plates/raw review/asset-plates/manifest.json

The script does not modify source GLBs. It imports each kit, isolates every
top-level named part, records evaluated world-space bounds and triangle count,
and renders front/back/left/right/top/three-quarter evidence views.
"""

from __future__ import annotations

import json
import math
import sys
from pathlib import Path

import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[1]
argv = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
MODEL_DIR = (ROOT / (argv[0] if len(argv) > 0 else "assets/models")).resolve()
OUT_DIR = (ROOT / (argv[1] if len(argv) > 1 else "review/asset-plates/raw")).resolve()
MANIFEST = (ROOT / (argv[2] if len(argv) > 2 else "review/asset-plates/manifest.json")).resolve()

VIEWS = {
    "front": Vector((0.0, -1.0, 0.0)),
    "back": Vector((0.0, 1.0, 0.0)),
    "left": Vector((-1.0, 0.0, 0.0)),
    "right": Vector((1.0, 0.0, 0.0)),
    "top": Vector((0.0, 0.0, 1.0)),
    "three_quarter": Vector((1.15, -1.35, 0.82)).normalized(),
}


def clear_scene() -> None:
    bpy.ops.wm.read_factory_settings(use_empty=True)


def descendants(root: bpy.types.Object) -> set[bpy.types.Object]:
    found = {root}
    stack = list(root.children)
    while stack:
        obj = stack.pop()
        if obj in found:
            continue
        found.add(obj)
        stack.extend(obj.children)
    return found


def evaluated_bounds(objects: set[bpy.types.Object]) -> tuple[Vector, Vector]:
    depsgraph = bpy.context.evaluated_depsgraph_get()
    points: list[Vector] = []
    for obj in objects:
        if obj.type != "MESH":
            continue
        ev = obj.evaluated_get(depsgraph)
        points.extend(ev.matrix_world @ Vector(corner) for corner in ev.bound_box)
    if not points:
        raise ValueError("part has no mesh bounds")
    return (
        Vector(tuple(min(p[i] for p in points) for i in range(3))),
        Vector(tuple(max(p[i] for p in points) for i in range(3))),
    )


def triangle_count(objects: set[bpy.types.Object]) -> int:
    depsgraph = bpy.context.evaluated_depsgraph_get()
    total = 0
    for obj in objects:
        if obj.type != "MESH":
            continue
        ev = obj.evaluated_get(depsgraph)
        mesh = ev.to_mesh()
        try:
            mesh.calc_loop_triangles()
            total += len(mesh.loop_triangles)
        finally:
            ev.to_mesh_clear()
    return total


def safe_name(name: str) -> str:
    return "".join(ch.lower() if ch.isalnum() else "-" for ch in name).strip("-")


def setup_renderer() -> tuple[bpy.types.Scene, bpy.types.Object]:
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_WORKBENCH"
    scene.display.shading.light = "STUDIO"
    scene.display.shading.studio_light = "paint.sl"
    scene.display.shading.color_type = "MATERIAL"
    scene.display.shading.show_cavity = True
    scene.display.shading.cavity_type = "BOTH"
    scene.display.shading.curvature_ridge_factor = 1.35
    scene.display.shading.curvature_valley_factor = 1.1
    scene.display.shading.show_shadows = True
    scene.display.shading.show_specular_highlight = True
    scene.display.shading.background_type = "WORLD"
    if scene.world is None:
        scene.world = bpy.data.worlds.new("AssetPlateWorld")
    scene.world.color = (0.025, 0.022, 0.019)
    scene.render.film_transparent = False
    scene.render.resolution_x = 560
    scene.render.resolution_y = 560
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.image_settings.color_depth = "8"

    camera_data = bpy.data.cameras.new("AssetPlateCamera")
    camera = bpy.data.objects.new("AssetPlateCamera", camera_data)
    scene.collection.objects.link(camera)
    scene.camera = camera
    camera_data.type = "ORTHO"
    camera_data.lens = 55
    return scene, camera


def aim_camera(camera: bpy.types.Object, center: Vector, direction: Vector, scale: float) -> None:
    distance = max(8.0, scale * 3.2)
    camera.location = center + direction * distance
    camera.rotation_euler = (center - camera.location).to_track_quat("-Z", "Y").to_euler()
    camera.data.ortho_scale = max(0.45, scale * 1.22)


def part_roots(imported: set[bpy.types.Object]) -> list[bpy.types.Object]:
    roots = [obj for obj in imported if obj.parent not in imported]
    useful = []
    for root in roots:
        members = descendants(root)
        if any(obj.type == "MESH" for obj in members):
            useful.append(root)
    return sorted(useful, key=lambda obj: obj.name.lower())


def render_model(glb: Path) -> list[dict]:
    clear_scene()
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=str(glb))
    imported = set(bpy.data.objects) - before
    scene, camera = setup_renderer()
    records: list[dict] = []

    for root in part_roots(imported):
        members = descendants(root)
        try:
            bmin, bmax = evaluated_bounds(members)
        except ValueError:
            continue
        center = (bmin + bmax) * 0.5
        dims = bmax - bmin
        tris = triangle_count(members)
        model_slug = safe_name(glb.stem)
        part_slug = safe_name(root.name)
        part_dir = OUT_DIR / model_slug / part_slug
        part_dir.mkdir(parents=True, exist_ok=True)

        for obj in imported:
            obj.hide_render = obj not in members
            obj.hide_viewport = obj not in members

        paths = {}
        for view_name, direction in VIEWS.items():
            if view_name in {"front", "back"}:
                scale = max(dims.x, dims.z)
            elif view_name in {"left", "right"}:
                scale = max(dims.y, dims.z)
            elif view_name == "top":
                scale = max(dims.x, dims.y)
            else:
                scale = max(dims.x, dims.y, dims.z)
            aim_camera(camera, center, direction, scale)
            path = part_dir / f"{view_name}.png"
            scene.render.filepath = str(path)
            bpy.ops.render.render(write_still=True)
            try:
                paths[view_name] = str(path.relative_to(ROOT))
            except ValueError:
                paths[view_name] = str(path)

        try:
            model_path = str(glb.relative_to(ROOT))
        except ValueError:
            model_path = str(glb)
        records.append(
            {
                "model": model_path,
                "model_id": glb.stem,
                "part": root.name,
                "part_id": f"{model_slug}:{part_slug}",
                "dimensions_m": [round(dims.x, 4), round(dims.y, 4), round(dims.z, 4)],
                "bounds_min_m": [round(v, 4) for v in bmin],
                "bounds_max_m": [round(v, 4) for v in bmax],
                "triangles": tris,
                "views": paths,
            }
        )
    return records


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    MANIFEST.parent.mkdir(parents=True, exist_ok=True)
    records: list[dict] = []
    for glb in sorted(MODEL_DIR.glob("*.glb")):
        print(f"PLATES {glb.name}")
        records.extend(render_model(glb))
    payload = {
        "schema": "museum-asset-plates/1.0",
        "units": "meters",
        "views": list(VIEWS),
        "assets": records,
    }
    MANIFEST.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(f"WROTE {MANIFEST} ({len(records)} named assets)")


if __name__ == "__main__":
    main()
