"""Build the H01 Prehistoric cave kit -> assets/models/prehistoric.glb.

The runtime contract is intentionally small and stable:

    Archway     natural Chauvet-inspired porch/threshold, origin (0, 0, 0)
    WallBayA/B  4.5 m erosion-smoothed limestone wall modules, base at Z=0
    CeilingBay  8.0 x 4.5 m ceiling module, top plane at Z=0

The cave is a museum interpretation, not a replica.  Geometry is informed by
the Chauvet-Pont d'Arc site's water-eroded limestone masses, ceiling pendants,
clay circulation floors, and prehistoric rock-fall porch.  It deliberately
avoids a masonry arch, dense procedural crags, pseudo art, torch hardware, and
symbolic ornament.  Fine mineral detail belongs to the runtime PBR material;
this file authors the physically meaningful room-scale silhouette.

Run:

    PREVIEW_DIR=/tmp/h01-prehistoric-geometry \
      /Applications/Blender.app/Contents/MacOS/Blender --background \
      --python tools/build_prehistoric_assets.py
"""

import bmesh
import bpy
import math
import mathutils
import os


HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.abspath(os.path.join(HERE, "..", "assets", "models", "prehistoric.glb"))

# Must stay aligned with js/world.js.
CAVE_W = 6.4
CAVE_H = 3.7
BAY_LEN = 4.5
WALL_H = CAVE_H + 0.8

# Geometry gates.  Wall protrusion is measured toward the visitor (negative
# Blender Y); ceiling hang is negative Blender Z.  These leave a generous,
# level museum circulation zone after runtime placement.
MAX_WALL_INTRUSION = 0.20
MAX_CEILING_HANG = 0.56
MIN_HEAD_CLEARANCE = CAVE_H - MAX_CEILING_HANG
PORCH_CLEAR_HALF_W = 1.78
PORCH_CLEAR_H = 3.08


# ---------------------------------------------------------------------------
# General helpers

def pmat(name, color, roughness=0.92):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*color, 1.0)
    bsdf.inputs["Roughness"].default_value = roughness
    return mat


def empty(name):
    obj = bpy.data.objects.new(name, None)
    bpy.context.scene.collection.objects.link(obj)
    obj.location = (0.0, 0.0, 0.0)
    return obj


def clamp(value, lo, hi):
    return max(lo, min(hi, value))


def smoothstep01(t):
    t = clamp(t, 0.0, 1.0)
    return t * t * (3.0 - 2.0 * t)


def gaussian(x, z, cx, cz, rx, rz):
    return math.exp(-(((x - cx) / rx) ** 2 + ((z - cz) / rz) ** 2) * 1.55)


def calm_display_mask(x, z):
    """Soft, broad calm zone; it never snaps to a perfectly flat rectangle."""
    mx = 1.0 - smoothstep01((abs(x) - 1.12) / 0.48)
    mz0 = smoothstep01((z - 0.58) / 0.42)
    mz1 = 1.0 - smoothstep01((z - 2.78) / 0.44)
    return mx * mz0 * mz1


def grid_mesh(name, nx, nz, coord_fn, uv_fn):
    """High-density quad surface; faces wind toward local -Y for wall use."""
    verts = []
    uvs = []
    faces = []
    for j in range(nz + 1):
        v = j / nz
        for i in range(nx + 1):
            u = i / nx
            verts.append(coord_fn(u, v))
            uvs.append(uv_fn(u, v))
    for j in range(nz):
        for i in range(nx):
            a = j * (nx + 1) + i
            faces.append((a, a + 1, a + nx + 2, a + nx + 1))
    mesh = bpy.data.meshes.new(name + "_geo")
    mesh.from_pydata(verts, [], faces)
    mesh.update(calc_edges=True)
    uv_layer = mesh.uv_layers.new(name="UVMap")
    for poly in mesh.polygons:
        for loop_index in poly.loop_indices:
            vertex_index = mesh.loops[loop_index].vertex_index
            uv_layer.data[loop_index].uv = uvs[vertex_index]
        poly.use_smooth = True
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.scene.collection.objects.link(obj)
    return obj


def box_uv(mesh, scale=2.8):
    """Deterministic triplanar-style UV projection for remeshed porch rock."""
    uv = mesh.uv_layers.get("UVMap") or mesh.uv_layers.new(name="UVMap")
    for poly in mesh.polygons:
        axis = max(range(3), key=lambda i: abs(poly.normal[i]))
        for loop_index in poly.loop_indices:
            co = mesh.vertices[mesh.loops[loop_index].vertex_index].co
            if axis == 0:
                uv.data[loop_index].uv = (co.y / scale, co.z / scale)
            elif axis == 1:
                uv.data[loop_index].uv = (co.x / scale, co.z / scale)
            else:
                uv.data[loop_index].uv = (co.x / scale, co.y / scale)


def top_parent(obj):
    while obj.parent:
        obj = obj.parent
    return obj


# ---------------------------------------------------------------------------
# Broad water-eroded wall morphology

WALL_FORMS = {
    "A": [
        (-1.72, 3.46, 0.92, 1.06, -0.16),
        (1.74, 3.18, 0.90, 1.18, -0.10),
        (-1.82, 0.62, 0.78, 0.86, -0.13),
        (1.68, 0.50, 0.92, 0.78, -0.09),
        (-0.35, 3.92, 1.55, 0.72, 0.19),
        (0.68, 1.78, 1.22, 1.38, 0.16),
    ],
    "B": [
        (-1.74, 3.04, 0.88, 1.32, -0.10),
        (1.78, 3.62, 0.82, 0.92, -0.17),
        (-1.55, 0.46, 1.03, 0.72, -0.08),
        (1.72, 0.84, 0.82, 1.02, -0.14),
        (-0.62, 3.94, 1.52, 0.68, 0.17),
        (0.54, 1.64, 1.38, 1.50, 0.14),
    ],
}


def wall_depth(x, z, variant):
    """Positive Y recedes into rock; negative Y projects toward the aisle."""
    depth = 0.075
    for cx, cz, rx, rz, amplitude in WALL_FORMS[variant]:
        depth += amplitude * gaussian(x, z, cx, cz, rx, rz)

    # Only two primary bedding discontinuities per module.  Their changing
    # elevation and broad shoulders read as limestone erosion, not a noisy
    # displacement texture or repeated brick course.
    phase = 0.0 if variant == "A" else 1.37
    seam_a = 3.36 + 0.09 * math.sin(x * 1.10 + phase)
    seam_b = 0.58 + 0.07 * math.sin(x * 1.34 + 0.8 + phase)
    edge_weight = 1.0 - 0.78 * calm_display_mask(x, z)
    depth -= 0.055 * math.exp(-((z - seam_a) / 0.105) ** 2) * edge_weight
    depth += 0.032 * math.exp(-((z - seam_a + 0.15) / 0.17) ** 2) * edge_weight
    depth -= 0.038 * math.exp(-((z - seam_b) / 0.115) ** 2) * edge_weight

    # Restrained secondary undulation only; PBR maps carry mineral-scale
    # detail.  This keeps grazing-light silhouettes broad and believable.
    depth += 0.014 * math.sin(x * 1.55 + z * 0.68 + phase)
    depth += 0.009 * math.sin(x * 0.74 - z * 1.12 + phase * 0.6)

    calm = calm_display_mask(x, z)
    calm_depth = 0.105 + 0.010 * math.sin(x * 0.72 + z * 0.48 + phase)
    depth = depth * (1.0 - 0.88 * calm) + calm_depth * (0.88 * calm)
    return clamp(depth, -MAX_WALL_INTRUSION, 0.36)


def build_wall(name, variant, rock):
    root = empty(name)

    def coords(u, v):
        x = -BAY_LEN / 2.0 + BAY_LEN * u
        z = WALL_H * v
        return (x, wall_depth(x, z, variant), z)

    mesh = grid_mesh(
        name.replace("Bay", "") + "_mesh",
        72,
        68,
        coords,
        lambda u, v: (u * BAY_LEN / 2.8, v * WALL_H / 2.8),
    )
    mesh.data.materials.append(rock)
    mesh.parent = root
    return root


# ---------------------------------------------------------------------------
# Broad ceiling masses and limited pendants

CEILING_FORMS = [
    (-3.18, 0.78, 1.02, 1.08, 0.30),
    (2.94, 1.38, 1.18, 1.34, 0.34),
    (-2.48, 3.36, 1.24, 1.18, 0.38),
    (2.36, 3.74, 1.05, 0.92, 0.25),
    (-0.62, 2.62, 1.32, 1.52, 0.17),
]


def ceiling_hang(x, y):
    hang = 0.055
    for cx, cy, rx, ry, amplitude in CEILING_FORMS:
        hang += amplitude * gaussian(x, y, cx, cy, rx, ry)

    # The center circulation axis remains calmer/higher.  Two shallow seams
    # provide fractured ledges without turning every polygon into a spike.
    hang -= 0.052 * math.exp(-((x + 0.18) / 1.34) ** 2)
    seam_a = 1.06 + 0.10 * math.sin(x * 0.72)
    seam_b = 3.72 + 0.08 * math.sin(x * 0.58 + 1.2)
    edge = smoothstep01((abs(x) - 1.2) / 1.6)
    hang += 0.052 * math.exp(-((y - seam_a) / 0.14) ** 2) * edge
    hang += 0.038 * math.exp(-((y - seam_b) / 0.16) ** 2) * edge
    hang += 0.012 * math.sin(x * 0.86 + y * 0.58)
    return clamp(hang, 0.025, MAX_CEILING_HANG)


def build_ceiling(rock):
    root = empty("CeilingBay")

    def coords(u, v):
        x = -(CAVE_W + 1.6) / 2.0 + (CAVE_W + 1.6) * u
        y = BAY_LEN * v
        return (x, y, -ceiling_hang(x, y))

    mesh = grid_mesh(
        "Ceil_mesh",
        84,
        56,
        coords,
        lambda u, v: (u * (CAVE_W + 1.6) / 2.8, v * BAY_LEN / 2.8),
    )
    mesh.data.materials.append(rock)
    mesh.parent = root
    return root


# ---------------------------------------------------------------------------
# Natural porch: one eroded cliff mass with an irregular water-cut opening.


def profile_prism_xz(name, points, y_front, y_back):
    """Extrude a closed X/Z outline through Y as a manifold prism."""
    count = len(points)
    verts = [(x, y_front, z) for x, z in points] + [(x, y_back, z) for x, z in points]
    faces = [tuple(reversed(range(count))), tuple(range(count, count * 2))]
    for index in range(count):
        nxt = (index + 1) % count
        faces.append((index, nxt, count + nxt, count + index))
    mesh = bpy.data.meshes.new(name + "_geo")
    mesh.from_pydata(verts, [], faces)
    mesh.update(calc_edges=True)
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.scene.collection.objects.link(obj)
    return obj

def eroded_ellipsoid(name, location, scale, rotation, phase):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=3, radius=1.0, location=location)
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = scale
    obj.rotation_euler = rotation
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    # Broad, low-amplitude erosion on an already meaningful ellipsoid.  It is
    # deliberately not multi-octave noise and cannot drive jagged silhouette.
    for vertex in obj.data.vertices:
        co = vertex.co
        factor = (
            1.0
            + 0.030 * math.sin(co.x * 1.18 + co.z * 0.72 + phase)
            + 0.020 * math.sin(co.y * 1.62 - co.z * 0.54 + phase * 0.7)
        )
        co *= factor
    obj.data.update()
    return obj


def build_porch(rock):
    root = empty("Archway")
    # The outer line is intentionally cliff-like and asymmetric, not a row of
    # rounded voussoirs. The opening remains wider than the runtime door and
    # satisfies the full 3.56 x 3.08 m clear prism.
    left_outline = [
        (-4.18, -0.28), (-1.92, -0.28), (-1.92, 2.70), (-1.86, 3.12),
        (-1.44, 3.42), (-1.12, 5.48), (-3.18, 5.12), (-4.42, 4.02),
        (-4.16, 2.06),
    ]
    right_outline = [
        (1.92, -0.24), (4.12, -0.24), (4.36, 0.78), (4.18, 2.35),
        (4.46, 4.12), (3.58, 5.10), (1.88, 5.42), (1.45, 3.42),
        (1.86, 3.12), (1.92, 2.70),
    ]
    roof_outline = [
        (-1.44, 3.42), (-0.62, 3.58), (0.08, 3.45), (0.78, 3.55),
        (1.45, 3.42), (1.88, 5.42), (0.34, 5.30), (-1.12, 5.48),
    ]
    porch_pieces = []
    for index, outline in enumerate((left_outline, right_outline, roof_outline), 1):
        porch = profile_prism_xz(f"ArchRockMass{index:02d}", outline, -0.55, 1.62)
        # Broad reveal-depth variation adds erosion without moving the inner
        # opening edges into the guaranteed clear prism.
        for vertex in porch.data.vertices:
            x, y, z = vertex.co
            vertex.co.y += 0.075 * math.sin(x * 0.78 + z * 0.91) + 0.035 * math.sin(z * 1.73)
        porch.data.update()
        porch_pieces.append(porch)

    bpy.ops.object.select_all(action="DESELECT")
    for piece in porch_pieces:
        piece.select_set(True)
    bpy.context.view_layer.objects.active = porch_pieces[0]
    bpy.ops.object.join()
    porch = bpy.context.active_object
    porch.name = "Arch_mesh"
    remesh = porch.modifiers.new("continuous_eroded_cliff", "REMESH")
    remesh.mode = "VOXEL"
    remesh.voxel_size = 0.055
    remesh.adaptivity = 0.0
    bpy.ops.object.modifier_apply(modifier=remesh.name)
    smooth = porch.modifiers.new("water_erosion_soften", "SMOOTH")
    smooth.factor = 0.15
    smooth.iterations = 1
    bpy.ops.object.modifier_apply(modifier=smooth.name)
    porch.data.materials.append(rock)
    for poly in porch.data.polygons:
        poly.use_smooth = True
    box_uv(porch.data, scale=2.6)
    porch.parent = root

    # Two restrained rock-fall fragments ground the threshold. They remain
    # fully outside the clear opening and keep their irregular icosphere form.
    for spec in (
        ("PorchRockfallL", (-2.62, -0.12, 0.28), (0.48, 0.46, 0.30), (0.08, 0.12, -0.18), 7.1),
        ("PorchRockfallR", (2.55, -0.08, 0.24), (0.42, 0.40, 0.27), (-0.06, -0.16, 0.12), 7.8),
    ):
        fragment = eroded_ellipsoid(*spec)
        fragment.data.materials.append(rock)
        for poly in fragment.data.polygons:
            poly.use_smooth = True
        box_uv(fragment.data, scale=1.2)
        fragment.parent = root
    return root


# ---------------------------------------------------------------------------
# QA and export

def object_bounds(root):
    points = []
    for obj in root.children_recursive:
        if obj.type == "MESH":
            points.extend(obj.matrix_world @ mathutils.Vector(corner) for corner in obj.bound_box)
    lo = tuple(min(point[i] for point in points) for i in range(3))
    hi = tuple(max(point[i] for point in points) for i in range(3))
    return lo, hi


def root_stats(root):
    verts = polys = tris = degenerate = boundary = nonmanifold = 0
    nonfinite = 0
    for obj in root.children_recursive:
        if obj.type != "MESH":
            continue
        mesh = obj.data
        verts += len(mesh.vertices)
        polys += len(mesh.polygons)
        tris += sum(max(0, len(poly.vertices) - 2) for poly in mesh.polygons)
        degenerate += sum(1 for poly in mesh.polygons if poly.area < 1.0e-9)
        nonfinite += sum(
            1 for vertex in mesh.vertices
            if not all(math.isfinite(component) for component in vertex.co)
        )
        bm = bmesh.new()
        bm.from_mesh(mesh)
        boundary += sum(1 for edge in bm.edges if edge.is_boundary)
        nonmanifold += sum(1 for edge in bm.edges if not edge.is_manifold and not edge.is_boundary)
        bm.free()
    lo, hi = object_bounds(root)
    return {
        "verts": verts,
        "polys": polys,
        "tris": tris,
        "degenerate": degenerate,
        "nonfinite": nonfinite,
        "boundary": boundary,
        "nonmanifold": nonmanifold,
        "bounds": tuple(round(value, 3) for value in (*lo, *hi)),
    }


def porch_clearance_violations(porch):
    # Vertex test for the guaranteed clear prism.  Authored masses also use
    # conservative primitive bounds, so no triangle bridges this empty space.
    violations = 0
    for obj in porch.children_recursive:
        if obj.type != "MESH":
            continue
        for vertex in obj.data.vertices:
            world = obj.matrix_world @ vertex.co
            if (
                abs(world.x) < PORCH_CLEAR_HALF_W
                and -0.18 < world.y < 1.50
                and 0.02 < world.z < PORCH_CLEAR_H
            ):
                violations += 1
    return violations


def validate_contract(roots):
    expected = {"Archway", "WallBayA", "WallBayB", "CeilingBay"}
    actual = {root.name for root in roots}
    if actual != expected:
        raise RuntimeError("runtime part contract changed: %r" % sorted(actual))
    for root in roots:
        if root.location.length > 1.0e-8 or any(abs(a) > 1.0e-8 for a in root.rotation_euler):
            raise RuntimeError("runtime root origin/rotation changed: " + root.name)


def print_validation(roots):
    print("H01_GEOMETRY_CONTRACT", sorted(root.name for root in roots))
    for root in roots:
        print("H01_GEOMETRY_STAT", root.name, root_stats(root))
    wall_intrusion = max(
        max(0.0, -vertex.co.y)
        for name in ("WallA_mesh", "WallB_mesh")
        for vertex in bpy.data.objects[name].data.vertices
    )
    ceiling_min = min(vertex.co.z for vertex in bpy.data.objects["Ceil_mesh"].data.vertices)
    print("H01_WALL_MAX_AISLE_INTRUSION_M", round(wall_intrusion, 4))
    print("H01_CEILING_MIN_CLEARANCE_M", round(CAVE_H + ceiling_min, 4))
    print("H01_PORCH_CLEAR_PRISM_M", 2.0 * PORCH_CLEAR_HALF_W, PORCH_CLEAR_H)
    print("H01_PORCH_CLEARANCE_VERTEX_VIOLATIONS", porch_clearance_violations(bpy.data.objects["Archway"]))
    if wall_intrusion > MAX_WALL_INTRUSION + 1.0e-5:
        raise RuntimeError("wall intrusion gate failed")
    if CAVE_H + ceiling_min < MIN_HEAD_CLEARANCE - 1.0e-5:
        raise RuntimeError("ceiling clearance gate failed")
    if porch_clearance_violations(bpy.data.objects["Archway"]):
        raise RuntimeError("porch clear-prism gate failed")


def export_roots(roots):
    bpy.ops.object.select_all(action="DESELECT")
    for root in roots:
        root.select_set(True)
        for child in root.children_recursive:
            child.select_set(True)
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=OUT,
        export_format="GLB",
        use_selection=True,
        export_apply=True,
        export_yup=True,
        export_cameras=False,
        export_lights=False,
    )
    print("EXPORTED", OUT, os.path.getsize(OUT), "bytes")


# ---------------------------------------------------------------------------
# Isolated inspection renders (created only after GLB export)

def aim(camera, origin, target):
    camera.location = origin
    direction = mathutils.Vector(target) - mathutils.Vector(origin)
    camera.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()


def set_visible_roots(show):
    for obj in bpy.context.scene.objects:
        if obj.type != "MESH":
            continue
        obj.hide_render = top_parent(obj).name not in show


def render_preview(scene, camera, path, show, origin, target, ortho=None, engine="BLENDER_WORKBENCH"):
    set_visible_roots(show)
    scene.render.engine = engine
    camera.data.type = "ORTHO" if ortho else "PERSP"
    if ortho:
        camera.data.ortho_scale = ortho
    else:
        camera.data.lens = 42
    aim(camera, origin, target)
    scene.render.filepath = path
    bpy.ops.render.render(write_still=True)
    print("RENDERED", path)


def render_previews(roots, rock):
    preview_dir = os.environ.get("PREVIEW_DIR", os.path.join(HERE, "prehistoric-previews"))
    os.makedirs(preview_dir, exist_ok=True)
    scene = bpy.context.scene
    scene.render.resolution_x = 1100
    scene.render.resolution_y = 820
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.display.shading.light = "STUDIO"
    scene.display.shading.show_cavity = True
    scene.display.shading.cavity_type = "WORLD"
    scene.display.shading.curvature_ridge_factor = 1.7
    scene.display.shading.curvature_valley_factor = 1.25
    scene.display.shading.color_type = "MATERIAL"
    if scene.world is None:
        scene.world = bpy.data.worlds.new("H01_QA_World")
    scene.world.color = (0.018, 0.014, 0.011)

    camera_data = bpy.data.cameras.new("H01_preview_camera")
    camera = bpy.data.objects.new("H01_preview_camera", camera_data)
    scene.collection.objects.link(camera)
    scene.camera = camera

    render_preview(
        scene, camera, os.path.join(preview_dir, "h01_arch_front_ortho.png"),
        {"Archway"}, (0.0, 9.0, 2.55), (0.0, 0.55, 2.48), ortho=9.7,
    )
    render_preview(
        scene, camera, os.path.join(preview_dir, "h01_arch_beauty.png"),
        {"Archway"}, (-5.9, 8.4, 3.35), (0.0, 0.58, 2.22), ortho=None,
    )
    render_preview(
        scene, camera, os.path.join(preview_dir, "h01_wallA_front_ortho.png"),
        {"WallBayA"}, (0.0, -7.0, 2.25), (0.0, 0.08, 2.25), ortho=5.35,
    )
    render_preview(
        scene, camera, os.path.join(preview_dir, "h01_wallB_front_ortho.png"),
        {"WallBayB"}, (0.0, -7.0, 2.25), (0.0, 0.08, 2.25), ortho=5.35,
    )
    render_preview(
        scene, camera, os.path.join(preview_dir, "h01_ceiling_bottom_ortho.png"),
        {"CeilingBay"}, (0.0, 2.25, -8.0), (0.0, 2.25, -0.12), ortho=8.9,
    )


# ---------------------------------------------------------------------------
# Build

bpy.ops.wm.read_factory_settings(use_empty=True)
ROCK = pmat("CaveRock", (0.46, 0.38, 0.28), roughness=0.96)

wall_a = build_wall("WallBayA", "A", ROCK)
wall_b = build_wall("WallBayB", "B", ROCK)
ceiling = build_ceiling(ROCK)
porch = build_porch(ROCK)
ROOTS = [porch, wall_a, wall_b, ceiling]

validate_contract(ROOTS)
print_validation(ROOTS)
export_roots(ROOTS)
render_previews(ROOTS, ROCK)
