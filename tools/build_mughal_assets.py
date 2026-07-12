"""Build the H24 Fatehpur Sikri / Akbar-period architectural kit.

Run with:

    /Applications/Blender.app/Contents/MacOS/Blender --background \
        --python tools/build_mughal_assets.py

The kit is a museum-scale adaptation of the red-sandstone, predominantly
trabeate palace architecture at Fatehpur Sikri (c. 1571-85).  It follows the
Archaeological Survey of India's description of beam-and-post construction,
ornamental arches, brackets, chhajjas, and perforated stone windows.  The
UNESCO property description is the authority for date, material dominance,
and the indigenous/Persian synthesis.

Primary references:
  https://asi.nic.in/search?searchText=Fatehpur+Sikri
  https://whc.unesco.org/en/list/255

Runtime contract (root names and origins MUST remain stable):
  Portal       zero origin; 7.00 m shell; clear opening 3.40 x 3.50 m
  ArcadeBay    zero origin; calm artwork field between the engaged piers
  Jali         zero origin; 0.92 x 2.82 m perforated sandstone screen
  PietraPanel  zero origin; legacy root name, rebuilt as carved sandstone

Blender coordinates are Z-up.  glTF export converts them for Three.js.
The geometry intentionally avoids Taj-like white-marble massing, bulbous
domes, and pietra-dura inlay.  Arches are shallow ornamental reliefs carried
above structural lintels, keeping the trabeate system visually primary.
"""

import math
import os

import bpy
import mathutils


HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.abspath(os.path.join(HERE, "..", "assets", "models", "mughal.glb"))
DEFAULT_PREVIEW_DIR = os.path.abspath(
    os.path.join(HERE, "..", "review", "geometry", "h24_mughal_fatehpur_sikri")
)

HALL_W = 7.0
FACADE_H = 6.4
DOOR_W = 3.4
DOOR_H = 3.5


# ---------------------------------------------------------------------------
# Scene and material helpers


def material(name, color, roughness=0.82, metallic=0.0):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*color, 1.0)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*color, 1.0)
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = metallic
    return mat


def planar_box_uv(mesh, scale=2.0):
    """Simple world-scale box projection suitable for runtime replacement."""
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


def empty(name):
    obj = bpy.data.objects.new(name, None)
    bpy.context.scene.collection.objects.link(obj)
    obj.location = (0.0, 0.0, 0.0)
    return obj


def finish_mesh(obj, name, parent, mat, uv_scale=2.0, smooth=False):
    obj.name = name
    obj.parent = parent
    if mat and len(obj.data.materials) == 0:
        obj.data.materials.append(mat)
    for poly in obj.data.polygons:
        poly.use_smooth = smooth
    planar_box_uv(obj.data, uv_scale)
    obj.select_set(False)
    return obj


def apply_bevel(obj, width=0.018, segments=2, angle=0.52):
    if width <= 0:
        return obj
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    modifier = obj.modifiers.new("WearReadyBevel", "BEVEL")
    modifier.width = width
    modifier.segments = segments
    modifier.limit_method = "ANGLE"
    modifier.angle_limit = angle
    modifier.miter_outer = "MITER_ARC"
    bpy.ops.object.modifier_apply(modifier=modifier.name)
    obj.select_set(False)
    return obj


def box(name, location, dimensions, parent, mat, bevel=0.018, rotation=None):
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=location)
    obj = bpy.context.active_object
    obj.dimensions = dimensions
    if rotation:
        obj.rotation_euler = rotation
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    apply_bevel(obj, bevel)
    return finish_mesh(obj, name, parent, mat)


def cylinder(
    name,
    location,
    radius,
    depth,
    parent,
    mat,
    vertices=12,
    rotation=None,
    bevel=0.012,
):
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=vertices,
        radius=radius,
        depth=depth,
        location=location,
        rotation=rotation or (0.0, 0.0, 0.0),
    )
    obj = bpy.context.active_object
    apply_bevel(obj, bevel)
    return finish_mesh(obj, name, parent, mat, uv_scale=1.0)


def profile_prism_xz(name, points, y_front, y_back, parent, mat, bevel=0.012):
    """Extrude a front-elevation X/Z polygon through Y."""
    count = len(points)
    verts = [(x, y_front, z) for x, z in points]
    verts += [(x, y_back, z) for x, z in points]
    faces = [tuple(reversed(range(count))), tuple(range(count, count * 2))]
    for i in range(count):
        j = (i + 1) % count
        faces.append((i, j, count + j, count + i))
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(verts, [], faces)
    mesh.validate(verbose=False)
    mesh.update(calc_edges=True)
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.scene.collection.objects.link(obj)
    apply_bevel(obj, bevel)
    return finish_mesh(obj, name, parent, mat)


def profile_prism_yz(name, points, x_center, width, parent, mat, bevel=0.012):
    """Extrude a side-elevation Y/Z polygon through X."""
    x0, x1 = x_center - width / 2.0, x_center + width / 2.0
    count = len(points)
    verts = [(x0, y, z) for y, z in points]
    verts += [(x1, y, z) for y, z in points]
    faces = [tuple(reversed(range(count))), tuple(range(count, count * 2))]
    for i in range(count):
        j = (i + 1) % count
        faces.append((i, j, count + j, count + i))
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(verts, [], faces)
    mesh.validate(verbose=False)
    mesh.update(calc_edges=True)
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.scene.collection.objects.link(obj)
    apply_bevel(obj, bevel)
    return finish_mesh(obj, name, parent, mat)


def shallow_arch_points(span, spring, apex, steps=28):
    """A restrained shouldered/pointed ornamental arch, left to right."""
    points = []
    half_steps = steps // 2
    for i in range(half_steps + 1):
        t = i / half_steps
        x = -span / 2.0 * (1.0 - t)
        # Flat shoulder followed by a steeper rise; ornamental, not structural.
        z = spring + (apex - spring) * (0.22 * t + 0.78 * t * t)
        points.append((x, z))
    points += [(-x, z) for x, z in reversed(points[:-1])]
    return points


def arch_band(name, inner, outer, y_front, y_back, parent, mat, bevel=0.010):
    if len(inner) != len(outer):
        raise ValueError("Arch band profiles must have equal point counts")
    count = len(inner)
    fi = [(x, y_front, z) for x, z in inner]
    fo = [(x, y_front, z) for x, z in outer]
    bi = [(x, y_back, z) for x, z in inner]
    bo = [(x, y_back, z) for x, z in outer]
    verts = fi + fo + bi + bo
    FI, FO, BI, BO = 0, count, 2 * count, 3 * count
    faces = []
    for i in range(count - 1):
        faces.append((FI + i, FI + i + 1, FO + i + 1, FO + i))
        faces.append((BI + i, BO + i, BO + i + 1, BI + i + 1))
        faces.append((FO + i, FO + i + 1, BO + i + 1, BO + i))
        faces.append((FI + i, BI + i, BI + i + 1, FI + i + 1))
    faces.append((FI, FO, BO, BI))
    faces.append((FI + count - 1, BI + count - 1, BO + count - 1, FO + count - 1))
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(verts, [], faces)
    mesh.validate(verbose=False)
    mesh.update(calc_edges=True)
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.scene.collection.objects.link(obj)
    apply_bevel(obj, bevel)
    return finish_mesh(obj, name, parent, mat)


def line_rect_segment(slope, intercept, xmin, xmax, zmin, zmax):
    """Clip z=slope*x+intercept to an axis-aligned X/Z rectangle."""
    candidates = []
    for x in (xmin, xmax):
        z = slope * x + intercept
        if zmin - 1e-8 <= z <= zmax + 1e-8:
            candidates.append((x, z))
    if abs(slope) > 1e-8:
        for z in (zmin, zmax):
            x = (z - intercept) / slope
            if xmin - 1e-8 <= x <= xmax + 1e-8:
                candidates.append((x, z))
    unique = []
    for point in candidates:
        if not any(math.dist(point, old) < 1e-6 for old in unique):
            unique.append(point)
    if len(unique) < 2:
        return None
    best = max(
        ((a, b) for i, a in enumerate(unique) for b in unique[i + 1 :]),
        key=lambda pair: math.dist(pair[0], pair[1]),
    )
    return best


def rail(name, p0, p1, y, depth, width, parent, mat, bevel=0.007):
    dx, dz = p1[0] - p0[0], p1[1] - p0[1]
    length = math.hypot(dx, dz)
    angle = math.atan2(dz, dx)
    return box(
        name,
        ((p0[0] + p1[0]) / 2.0, y, (p0[1] + p1[1]) / 2.0),
        (length, depth, width),
        parent,
        mat,
        bevel=bevel,
        rotation=(0.0, -angle, 0.0),
    )


def join_meshes(objects, name, parent):
    if not objects:
        raise ValueError("Nothing to join")
    bpy.ops.object.select_all(action="DESELECT")
    for obj in objects:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]
    bpy.ops.object.join()
    joined = bpy.context.active_object
    joined.name = name
    joined.parent = parent
    joined.select_set(False)
    return joined


def rectangular_frame(prefix, cx, cy, cz, width, height, rail_w, depth, parent, mat):
    parts = [
        box(
            f"{prefix}_L_tmp",
            (cx - width / 2.0 + rail_w / 2.0, cy, cz),
            (rail_w, depth, height),
            parent,
            mat,
            bevel=0.012,
        ),
        box(
            f"{prefix}_R_tmp",
            (cx + width / 2.0 - rail_w / 2.0, cy, cz),
            (rail_w, depth, height),
            parent,
            mat,
            bevel=0.012,
        ),
        box(
            f"{prefix}_T_tmp",
            (cx, cy, cz + height / 2.0 - rail_w / 2.0),
            (width - 2 * rail_w, depth, rail_w),
            parent,
            mat,
            bevel=0.012,
        ),
        box(
            f"{prefix}_B_tmp",
            (cx, cy, cz - height / 2.0 + rail_w / 2.0),
            (width - 2 * rail_w, depth, rail_w),
            parent,
            mat,
            bevel=0.012,
        ),
    ]
    return join_meshes(parts, prefix, parent)


def carved_bracket(name, x, y_front, y_back, base_z, outward, parent, mat, scale=1.0):
    """Stepped front-elevation bracket capital; outward is -1 or +1."""
    points = [
        (x, base_z),
        (x + outward * 0.10 * scale, base_z + 0.08 * scale),
        (x + outward * 0.20 * scale, base_z + 0.22 * scale),
        (x + outward * 0.42 * scale, base_z + 0.31 * scale),
        (x + outward * 0.42 * scale, base_z + 0.43 * scale),
        (x - outward * 0.05 * scale, base_z + 0.43 * scale),
    ]
    return profile_prism_xz(name, points, y_front, y_back, parent, mat, bevel=0.010)


def chhajja_bracket(name, x, z, parent, mat, width=0.18, projection=0.38):
    """Stone corbel under a projecting chhajja, modeled in side section."""
    points = [
        (0.11, z - 0.38),
        (-0.02, z - 0.38),
        (-projection, z - 0.03),
        (-projection, z + 0.07),
        (0.11, z + 0.07),
    ]
    return profile_prism_yz(name, points, x, width, parent, mat, bevel=0.010)


def make_rosette(name, x, y, z, radius, parent, mat, vertices=12):
    return cylinder(
        name,
        (x, y, z),
        radius,
        0.075,
        parent,
        mat,
        vertices=vertices,
        rotation=(math.pi / 2.0, 0.0, 0.0),
        bevel=0.008,
    )


# ---------------------------------------------------------------------------
# Build assets


bpy.ops.wm.read_factory_settings(use_empty=True)

RED = material("FatehpurRedSandstone", (0.46, 0.19, 0.095), roughness=0.88)
RED_LIGHT = material("FatehpurDressedStone", (0.58, 0.27, 0.14), roughness=0.84)
RED_DARK = material("FatehpurCarvedRecess", (0.31, 0.105, 0.055), roughness=0.92)
AMBER = material("JaliBacklightPreview", (0.74, 0.32, 0.08), roughness=1.0)


# Portal --------------------------------------------------------------------
# A trabeate gate scaled to the existing museum shell.  The central opening is
# rectangular and fully clear; a shallow ornamental arch appears only in the
# upper relief field.  The 0.62 m mass and reveal return make the entry read as
# carved stone construction instead of a flat applique.

portal = empty("Portal")

box("PishtaqMassL", (-2.60, 0.31, FACADE_H / 2.0), (1.80, 0.62, FACADE_H), portal, RED, 0.025)
box("PishtaqMassR", (2.60, 0.31, FACADE_H / 2.0), (1.80, 0.62, FACADE_H), portal, RED, 0.025)
box(
    "PishtaqMassTop",
    (0.0, 0.31, (DOOR_H + 0.05 + FACADE_H) / 2.0),
    (DOOR_W, 0.62, FACADE_H - DOOR_H - 0.05),
    portal,
    RED,
    0.025,
)

# Deep dressed reveal: joined under the legacy ArchEdgeSoffit child name.
reveal_parts = [
    box("RevealL_tmp", (-1.74, 0.30, 1.75), (0.08, 0.66, 3.50), portal, RED_DARK, 0.010),
    box("RevealR_tmp", (1.74, 0.30, 1.75), (0.08, 0.66, 3.50), portal, RED_DARK, 0.010),
    box("RevealTop_tmp", (0.0, 0.30, 3.585), (3.48, 0.66, 0.09), portal, RED_DARK, 0.010),
]
join_meshes(reveal_parts, "ArchEdgeSoffit", portal)

# Proud beam-and-post entrance frame. Inner edges stay beyond x=+-1.70 m and
# the lintel underside is above z=3.50 m.
box("PishtaqL", (-1.94, -0.09, 1.75), (0.34, 0.22, 3.50), portal, RED_LIGHT, 0.022)
box("PishtaqR", (1.94, -0.09, 1.75), (0.34, 0.22, 3.50), portal, RED_LIGHT, 0.022)
box("PishtaqTop", (0.0, -0.09, 3.685), (4.22, 0.22, 0.27), portal, RED_LIGHT, 0.022)

edge_parts = [
    box("ArchEdgeL_tmp", (-1.765, -0.225, 1.76), (0.055, 0.06, 3.47), portal, RED_DARK, 0.009),
    box("ArchEdgeR_tmp", (1.765, -0.225, 1.76), (0.055, 0.06, 3.47), portal, RED_DARK, 0.009),
    box("ArchEdgeTop_tmp", (0.0, -0.225, 3.535), (3.585, 0.06, 0.055), portal, RED_DARK, 0.009),
]
join_meshes(edge_parts, "ArchEdge", portal)

# Bracket capitals express the beam-and-post load path.
for side, label in ((-1, "L"), (1, "R")):
    carved_bracket(
        f"CapPortal{label}",
        side * 1.94,
        -0.22,
        0.01,
        3.08,
        side,
        portal,
        RED_LIGHT,
        scale=0.82,
    )
    box(
        f"CapPortalAbacus{label}",
        (side * 1.94, -0.095, 3.59),
        (0.48, 0.25, 0.13),
        portal,
        RED_LIGHT,
        0.016,
    )

# Flanking recesses receive the separately spawned runtime Jali roots.
for side, label in ((-1, "L"), (1, "R")):
    rectangular_frame(
        f"PishtaqJaliRecess{label}",
        side * 2.95,
        -0.035,
        2.39,
        1.06,
        3.10,
        0.12,
        0.13,
        portal,
        RED_LIGHT,
    )
    box(
        f"PishtaqJaliShadow{label}",
        (side * 2.95, 0.005, 2.39),
        (0.91, 0.055, 2.82),
        portal,
        RED_DARK,
        0.006,
    )

# Calm sign field: the runtime sign is 3.05 m wide and at about z=4.7 m.
rectangular_frame("PishtaqSignFrame", 0.0, -0.035, 4.72, 3.46, 1.06, 0.12, 0.13, portal, RED_LIGHT)
box("PishtaqSignRecess", (0.0, 0.005, 4.72), (3.18, 0.055, 0.78), portal, RED_DARK, 0.006)

# Small carved bosses flank the upper relief without competing with the sign.
make_rosette("RosetteL", -2.20, -0.055, 5.74, 0.16, portal, RED_LIGHT, vertices=12)
make_rosette("RosetteR", 2.20, -0.055, 5.74, 0.16, portal, RED_LIGHT, vertices=12)

# Shallow ornamental arcuate cue above the structurally trabeate opening.
portal_arch_inner = shallow_arch_points(2.62, 5.52, 5.98, 32)
portal_arch_outer = shallow_arch_points(3.02, 5.41, 6.12, 32)
arch_band(
    "ArcadeArchPortalRelief",
    portal_arch_inner,
    portal_arch_outer,
    -0.105,
    0.025,
    portal,
    RED_LIGHT,
    bevel=0.010,
)

# Deep chhajja with actual corbels.  Front-most point is y=-0.40 m, leaving
# the runtime sign plane at +0.46 m on the approach face unobstructed.
box("PishtaqChhajja", (0.0, -0.105, 5.34), (7.0, 0.59, 0.16), portal, RED_LIGHT, 0.020)
box("PishtaqChhajjaDrip", (0.0, -0.385, 5.255), (7.0, 0.06, 0.10), portal, RED_DARK, 0.010)
for i, x in enumerate((-3.12, -2.48, -1.92, 1.92, 2.48, 3.12), 1):
    chhajja_bracket(f"CapChhajja{i:02d}", x, 5.20, portal, RED_LIGHT, width=0.17, projection=0.36)

# Outer engaged octagonal piers and bracketed capitals emphasize mass and
# provide the irregular highlight breaks characteristic of dressed sandstone.
for side, label in ((-1, "L"), (1, "R")):
    cylinder(
        f"PilOuter{label}",
        (side * 3.19, -0.095, 2.35),
        0.16,
        4.44,
        portal,
        RED_LIGHT,
        vertices=8,
        bevel=0.010,
    )
    box(f"CapOuter{label}", (side * 3.19, -0.095, 4.63), (0.43, 0.24, 0.14), portal, RED_LIGHT, 0.015)
    carved_bracket(
        f"CapOuterBracket{label}",
        side * 3.19,
        -0.22,
        0.01,
        4.51,
        side,
        portal,
        RED_LIGHT,
        scale=0.72,
    )


# Arcade bay ---------------------------------------------------------------
# The artwork zone is deliberately empty: x=-1.98..1.98, z=0.25..3.25.
# The shallow arch is an ornamental relieving motif above a real lintel.

arcade = empty("ArcadeBay")

for side, label in ((-1, "L"), (1, "R")):
    box(f"PilBase{label}", (side * 2.38, -0.09, 0.16), (0.42, 0.22, 0.32), arcade, RED_LIGHT, 0.018)
    cylinder(
        f"Pil{label}",
        (side * 2.38, -0.09, 1.72),
        0.145,
        2.90,
        arcade,
        RED,
        vertices=8,
        bevel=0.010,
    )
    box(f"Cap{label}", (side * 2.38, -0.09, 3.25), (0.46, 0.24, 0.16), arcade, RED_LIGHT, 0.016)
    carved_bracket(
        f"CapArcadeBracket{label}",
        side * 2.38,
        -0.21,
        0.01,
        3.23,
        side,
        arcade,
        RED_LIGHT,
        scale=0.76,
    )

box("CuspBand", (0.0, -0.08, 3.57), (4.62, 0.20, 0.25), arcade, RED_LIGHT, 0.020)
box("PishtaqArcadeFrieze", (0.0, -0.02, 3.84), (4.80, 0.13, 0.18), arcade, RED, 0.015)

arc_inner = shallow_arch_points(3.62, 3.78, 4.38, 32)
arc_outer = shallow_arch_points(4.02, 3.68, 4.53, 32)
arch_band("ArcadeArch", arc_inner, arc_outer, -0.19, -0.02, arcade, RED_LIGHT, bevel=0.010)
make_rosette("Keel", 0.0, -0.205, 4.49, 0.105, arcade, RED_DARK, vertices=12)

box("PishtaqArcadeChhajja", (0.0, -0.11, 4.66), (4.90, 0.48, 0.14), arcade, RED_LIGHT, 0.018)
box("PishtaqArcadeDrip", (0.0, -0.325, 4.585), (4.90, 0.05, 0.08), arcade, RED_DARK, 0.008)
for i, x in enumerate((-2.10, -1.55, 1.55, 2.10), 1):
    chhajja_bracket(f"CapArcadeChhajja{i:02d}", x, 4.56, arcade, RED_LIGHT, width=0.15, projection=0.30)


# Jali screen ---------------------------------------------------------------
# The screen is a thick, carved-stone lattice, not a bundle of round rods.
# A diamond grid is cut to a rectangular opening and held by dressed rails;
# its depth and beveled edges give the perforations real reveal shadows.

jali = empty("Jali")
JALI_W = 0.92
JALI_H = 2.82

rectangular_frame("JaliBorder", 0.0, 0.0, JALI_H / 2.0, JALI_W, JALI_H, 0.115, 0.16, jali, RED_LIGHT)
box("JaliSill", (0.0, 0.0, 0.055), (1.02, 0.20, 0.11), jali, RED_LIGHT, 0.014)

# A restrained central cap preserves the legacy child name without inventing
# a late-Mughal bulbous finial.
profile_prism_xz(
    "JaliFinial",
    [(-0.075, 2.82), (0.0, 2.90), (0.075, 2.82), (0.0, 2.75)],
    -0.055,
    0.055,
    jali,
    RED_LIGHT,
    bevel=0.007,
)

xmin, xmax = -0.335, 0.335
zmin, zmax = 0.19, 2.63
segments = []
for slope in (-2.0, 2.0):
    min_c = min(zmin - slope * xmin, zmin - slope * xmax)
    max_c = max(zmax - slope * xmin, zmax - slope * xmax)
    for i in range(10):
        intercept = min_c + (max_c - min_c) * i / 9.0
        segment = line_rect_segment(slope, intercept, xmin, xmax, zmin, zmax)
        if segment and math.dist(*segment) > 0.12:
            segments.append(segment)

bar_objects = []
for index, (p0, p1) in enumerate(segments, 1):
    bar_objects.append(
        rail(
            f"JaliBar{index:02d}_tmp",
            p0,
            p1,
            0.0,
            0.11,
            0.046,
            jali,
            RED,
            bevel=0.006,
        )
    )
join_meshes(bar_objects, "JaliBars", jali)

# Small horizontal stone ties prevent the screen from reading as metal mesh.
tie_objects = []
for index, z in enumerate((0.64, 1.41, 2.18), 1):
    tie_objects.append(
        box(
            f"JaliTie{index:02d}_tmp",
            (0.0, 0.0, z),
            (0.70, 0.11, 0.042),
            jali,
            RED,
            bevel=0.006,
        )
    )
join_meshes(tie_objects, "JaliStoneTies", jali)

# Emissive backing stays behind the 0.11 m-deep stonework.
box("Glow", (0.0, 0.072, 1.41), (0.69, 0.012, 2.45), jali, AMBER, bevel=0.0)


# Legacy PietraPanel root ----------------------------------------------------
# Runtime still spawns this name between bays.  The old white-marble inlay
# face is intentionally gone; this is now a deep carved red-sandstone panel
# based on Fatehpur Sikri's relief vocabulary.

panel = empty("PietraPanel")
PANEL_W = 0.84
PANEL_H = 3.02

rectangular_frame("Sandframe", 0.0, 0.0, PANEL_H / 2.0, PANEL_W, PANEL_H, 0.11, 0.17, panel, RED_LIGHT)
box("JaliPanelBacking", (0.0, 0.055, PANEL_H / 2.0), (0.61, 0.07, 2.77), panel, RED_DARK, 0.008)

for index, z in enumerate((0.58, 1.51, 2.44), 1):
    rectangular_frame(
        f"JaliReliefFrame{index:02d}",
        0.0,
        -0.055,
        z,
        0.54,
        0.72,
        0.055,
        0.07,
        panel,
        RED,
    )
    make_rosette(f"RosettePanel{index:02d}", 0.0, -0.105, z, 0.16, panel, RED_LIGHT, vertices=12)
    make_rosette(f"RosettePanelCore{index:02d}", 0.0, -0.15, z, 0.065, panel, RED_DARK, vertices=8)


# ---------------------------------------------------------------------------
# Contract validation and export


ROOT_NAMES = ("Portal", "ArcadeBay", "Jali", "PietraPanel")


def descendants(root):
    return [obj for obj in bpy.context.scene.objects if obj.type == "MESH" and obj.parent == root]


def object_bounds(obj):
    corners = [obj.matrix_world @ mathutils.Vector(corner) for corner in obj.bound_box]
    return (
        tuple(min(c[i] for c in corners) for i in range(3)),
        tuple(max(c[i] for c in corners) for i in range(3)),
    )


def root_bounds(root):
    meshes = descendants(root)
    bounds = [object_bounds(obj) for obj in meshes]
    return (
        tuple(min(bound[0][i] for bound in bounds) for i in range(3)),
        tuple(max(bound[1][i] for bound in bounds) for i in range(3)),
    )


def overlaps_clearance(obj, xmin, xmax, zmin, zmax, tolerance=0.006):
    low, high = object_bounds(obj)
    return (
        high[0] > xmin + tolerance
        and low[0] < xmax - tolerance
        and high[2] > zmin + tolerance
        and low[2] < zmax - tolerance
    )


def has_vertex_in_clearance(obj, xmin, xmax, zmin, zmax, tolerance=0.006):
    """Test joined frame parts without their combined AABB causing false hits."""
    return any(
        xmin + tolerance < (world := obj.matrix_world @ vertex.co).x < xmax - tolerance
        and zmin + tolerance < world.z < zmax - tolerance
        for vertex in obj.data.vertices
    )


def validate_contract():
    roots = {name: bpy.data.objects.get(name) for name in ROOT_NAMES}
    missing = [name for name, obj in roots.items() if obj is None]
    if missing:
        raise RuntimeError(f"Missing runtime roots: {missing}")
    for name, root in roots.items():
        if root.type != "EMPTY":
            raise RuntimeError(f"{name} must remain an EMPTY root")
        if root.location.length > 1e-8:
            raise RuntimeError(f"{name} origin moved: {tuple(root.location)}")

    pmin, pmax = root_bounds(roots["Portal"])
    if pmin[0] < -3.501 or pmax[0] > 3.501 or pmin[2] < -0.001 or pmax[2] > 6.401:
        raise RuntimeError(f"Portal escaped 7 m shell contract: {pmin} {pmax}")
    door_blockers = [
        obj.name
        for obj in descendants(roots["Portal"])
        if has_vertex_in_clearance(obj, -DOOR_W / 2.0, DOOR_W / 2.0, 0.0, DOOR_H)
    ]
    if door_blockers:
        raise RuntimeError(f"Door clearance blocked by: {door_blockers}")

    art_blockers = [
        obj.name
        for obj in descendants(roots["ArcadeBay"])
        if has_vertex_in_clearance(obj, -1.98, 1.98, 0.25, 3.25)
    ]
    if art_blockers:
        raise RuntimeError(f"Artwork calm zone blocked by: {art_blockers}")

    for name, root in roots.items():
        meshes = descendants(root)
        verts = sum(len(obj.data.vertices) for obj in meshes)
        tris = sum(sum(len(poly.vertices) - 2 for poly in obj.data.polygons) for obj in meshes)
        low, high = root_bounds(root)
        print(
            "KIT_STATS",
            name,
            "meshes=", len(meshes),
            "verts=", verts,
            "tris=", tris,
            "bounds=", tuple(round(v, 4) for v in low), tuple(round(v, 4) for v in high),
        )
    print("CONTRACT_OK roots=", ROOT_NAMES, "door=3.40x3.50", "shell=7.00x6.40")


validate_contract()
os.makedirs(os.path.dirname(OUT), exist_ok=True)
bpy.ops.object.select_all(action="DESELECT")
for root_name in ROOT_NAMES:
    root = bpy.data.objects[root_name]
    root.select_set(True)
    for child in descendants(root):
        child.select_set(True)
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
# Orthographic QA previews


preview_dir = os.environ.get("PREVIEW_DIR", DEFAULT_PREVIEW_DIR)
os.makedirs(preview_dir, exist_ok=True)

scene = bpy.context.scene
scene.render.engine = "BLENDER_WORKBENCH"
scene.render.resolution_x = 1400
scene.render.resolution_y = 1050
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "PNG"
scene.display.shading.light = "STUDIO"
scene.display.shading.color_type = "MATERIAL"
scene.display.shading.show_shadows = True
scene.display.shading.show_cavity = True
scene.display.shading.cavity_type = "BOTH"
scene.display.shading.curvature_ridge_factor = 1.6
scene.display.shading.curvature_valley_factor = 1.25
scene.display.shading.background_type = "WORLD"
if scene.world is None:
    scene.world = bpy.data.worlds.new("H24_QA_World")
scene.world.color = (0.028, 0.032, 0.038)
scene.render.film_transparent = False

camera_data = bpy.data.cameras.new("QA_OrthoCamera")
camera_data.type = "ORTHO"
camera = bpy.data.objects.new("QA_OrthoCamera", camera_data)
bpy.context.scene.collection.objects.link(camera)
scene.camera = camera


def aim_camera(location, target, ortho_scale):
    camera.location = location
    direction = mathutils.Vector(target) - mathutils.Vector(location)
    camera.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()
    camera.data.ortho_scale = ortho_scale


def set_visible(root_names):
    allowed = set(root_names)
    for obj in bpy.context.scene.objects:
        if obj.type != "MESH":
            continue
        top = obj
        while top.parent:
            top = top.parent
        obj.hide_render = top.name not in allowed


def render_preview(filename, root_names, location, target, ortho_scale, resolution=(1400, 1050)):
    set_visible(root_names)
    scene.render.resolution_x, scene.render.resolution_y = resolution
    aim_camera(location, target, ortho_scale)
    path = os.path.join(preview_dir, filename)
    scene.render.filepath = path
    bpy.ops.render.render(write_still=True)
    print("RENDERED", path)


render_preview(
    "preview_mughal_portal_front.png",
    {"Portal"},
    (0.0, -12.0, 3.20),
    (0.0, 0.10, 3.20),
    7.25,
)
render_preview(
    "preview_mughal_portal_34.png",
    {"Portal"},
    (8.7, -11.5, 6.6),
    (0.0, 0.15, 3.05),
    7.65,
)
render_preview(
    "preview_mughal_arcade_front.png",
    {"ArcadeBay"},
    (0.0, -8.0, 2.35),
    (0.0, 0.0, 2.35),
    5.25,
)
render_preview(
    "preview_mughal_jali_front.png",
    {"Jali"},
    (0.0, -5.0, 1.43),
    (0.0, 0.0, 1.43),
    3.25,
    resolution=(900, 1200),
)
render_preview(
    "preview_mughal_carved_panel_front.png",
    {"PietraPanel"},
    (0.0, -5.0, 1.52),
    (0.0, 0.0, 1.52),
    3.35,
    resolution=(900, 1200),
)

# One front-orthographic kit plate, produced without changing exported origins.
saved_locations = {name: bpy.data.objects[name].location.copy() for name in ROOT_NAMES}
bpy.data.objects["Portal"].location.x = -4.45
bpy.data.objects["ArcadeBay"].location.x = 1.60
bpy.data.objects["Jali"].location.x = 5.15
bpy.data.objects["PietraPanel"].location.x = 6.75
render_preview(
    "preview_mughal_kit_front_ortho.png",
    set(ROOT_NAMES),
    (-0.25, -18.0, 3.20),
    (-0.25, 0.0, 3.20),
    8.20,
    resolution=(1800, 1000),
)
for name, location in saved_locations.items():
    bpy.data.objects[name].location = location

print("BUILD_COMPLETE H24 Fatehpur Sikri geometry kit")
