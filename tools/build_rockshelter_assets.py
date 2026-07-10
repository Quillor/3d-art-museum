# Builds the Ancient Oceania rock-shelter assets → assets/models/rockshelter.glb.
# Concept: concept-art/subsections/oceania-ancient (Hallway-29) — a sandstone
# rock-shelter gallery: stratified stone, ochre rock art, warm concealed light.
# This room previously had NO kit at all (QUALITY_BACKLOG.md blocker): its
# portal was the plain box fallback and the walls were bare planes.
#
#   /Applications/Blender.app/Contents/MacOS/Blender --background \
#       --python tools/build_rockshelter_assets.py
#
# Named parts (JS re-materials by name prefix in corridor.js applyRockshelterMats):
#   Portal — irregular stacked-slab opening: jittered horizontal sandstone
#            slabs corbelling inward over the doorway like a natural overhang,
#            plus a blanking facade that seals the neighbouring era's opening.
#   Ledge  — protruding strata shelf strip to break the flat gallery wall.
#   Boulder — irregular rock prop (floor scatter near the jambs).
# Prefixes: Sand→stratified sandstone (style wall texture), Dark→shadowed
#           recess stone.
import math
import os
import random

import bpy

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "assets", "models", "rockshelter.glb")

HALL_W = 7.0
CEIL_H = 4.4
DOOR_W, DOOR_H = 3.4, 3.5
FACADE_H = 5.0     # blank the (taller, 4.6) oceanic neighbour's opening

bpy.ops.wm.read_factory_settings(use_empty=True)
random.seed(29)


def pmat(name, color, rough=0.9):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes.get("Principled BSDF")
    b.inputs["Base Color"].default_value = (*color, 1.0)
    b.inputs["Roughness"].default_value = rough
    return m


MATS = {
    "Sand": pmat("Sand", (0.79, 0.60, 0.39), 0.95),
    "Dark": pmat("Dark", (0.32, 0.22, 0.13), 0.95),
}


def empty(name):
    e = bpy.data.objects.new(name, None)
    bpy.context.scene.collection.objects.link(e)
    return e


def finish(ob, name, parent):
    ob.name = name
    key = next((k for k in MATS if name.startswith(k)), "Sand")
    ob.data.materials.clear()
    ob.data.materials.append(MATS[key])
    ob.parent = parent
    return ob


def box_uv(ob, scale=3.0):
    me = ob.data
    uv = me.uv_layers.active or me.uv_layers.new(name="UVMap")
    for poly in me.polygons:
        n = poly.normal
        ax = max(range(3), key=lambda i: abs(n[i]))
        for li in poly.loop_indices:
            co = me.vertices[me.loops[li].vertex_index].co
            if ax == 0:
                uv.data[li].uv = (co.y / scale, co.z / scale)
            elif ax == 1:
                uv.data[li].uv = (co.x / scale, co.z / scale)
            else:
                uv.data[li].uv = (co.x / scale, co.y / scale)


def cube(name, parent, sx, sy, sz, cx, cy, cz, rz=0.0):
    bpy.ops.mesh.primitive_cube_add(size=1, location=(cx, cy, cz))
    ob = bpy.context.active_object
    ob.scale = (sx, sy, sz)
    ob.rotation_euler.z = rz
    bpy.ops.object.transform_apply(scale=True, rotation=True)
    box_uv(ob, scale=2.6)
    return finish(ob, name, parent)


def rock(name, parent, r, cx, cy, cz):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=r, location=(cx, cy, cz))
    ob = bpy.context.active_object
    # jitter vertices for an irregular boulder, then squash it a little
    for v in ob.data.vertices:
        v.co.x *= 1.0 + (random.random() - 0.5) * 0.5
        v.co.y *= 1.0 + (random.random() - 0.5) * 0.5
        v.co.z *= 0.72 + (random.random() - 0.5) * 0.3
    ob.data.update()
    box_uv(ob, scale=1.4)
    return finish(ob, name, parent)


# ================= Portal: stacked-slab shelter mouth =================
# Front (viewer / hub side) faces -Y, mass extends toward +Y, same
# conventions as every other kit. The jambs are uneven horizontal sandstone
# slabs; the top courses corbel inward over the opening like a natural
# overhang; a blanking facade seals the seam with the neighbouring era.
portal = empty("Portal")
DEPTH = 0.66

SLAB_H = 0.44
n_slabs = int(DOOR_H / SLAB_H) + 1
for side, tag in ((-1, "L"), (1, "R")):
    for i in range(n_slabs):
        z0 = i * SLAB_H
        # jitter each slab's reach toward the doorway so the jamb reads as
        # natural strata, not a dressed pier (inner edge wobbles ±0.14)
        inner = DOOR_W / 2 + (random.random() - 0.5) * 0.28
        outer = HALL_W / 2
        w = outer - inner
        d = DEPTH + (random.random() - 0.5) * 0.16
        cube(f"Sand_slab{tag}{i}", portal, w, d, SLAB_H - 0.025,
             side * (inner + w / 2), 0.0, z0 + SLAB_H / 2)

# corbelled overhang courses stepping inward above the opening. Fronts stay
# flush with the slab faces and the interior tail stays short so neither the
# approach sign (z+0.75) nor the interior sign (z-0.95) is swallowed.
corbels = [
    (DOOR_W + 1.30, DOOR_H + 0.22, DEPTH + 0.12),
    (DOOR_W + 0.55, DOOR_H + 0.62, DEPTH + 0.24),
    (DOOR_W - 0.45, DOOR_H + 1.00, DEPTH + 0.36),
]
for i, (w, z, d) in enumerate(corbels):
    cube(f"Sand_corbel{i}", portal, w, d, 0.42, 0.0, (d - DEPTH) / 2, z + 0.21)

# shadowed soffit strip under the corbels (reads as shelter-mouth shadow
# WITHOUT blocking the opening — a full panel here would wall off the door)
cube("Dark_soffit", portal, DOOR_W + 0.2, DEPTH + 0.05, 0.16,
     0.0, 0.0, DOOR_H + 0.08)

# blanking facade above + beside the mouth (seals the neighbour's opening)
cube("Sand_blankTop", portal, HALL_W, 0.3, FACADE_H - (DOOR_H + 1.2),
     0.0, 0.0, DOOR_H + 1.2 + (FACADE_H - (DOOR_H + 1.2)) / 2)
for side in (-1, 1):
    cube(f"Sand_blank{side}", portal, (HALL_W - DOOR_W) / 2 - 0.02, 0.3, 1.2,
         side * (DOOR_W / 2 + (HALL_W - DOOR_W) / 4), 0.0, DOOR_H + 0.6)

# a boulder pair flanking the approach
rock("Sand_boulderL", portal, 0.45, -(DOOR_W / 2 + 0.9), -0.8, 0.28)
rock("Dark_boulderR", portal, 0.32, DOOR_W / 2 + 1.1, -0.7, 0.2)

# ================= Ledge: protruding strata shelf =================
# Placed by buildRockshelterDecor along the walls; local X runs along the
# wall, protrudes toward -Y (room side), sits at its own origin height.
ledge = empty("Ledge")
lw = 2.6
for i in range(3):
    d = 0.16 + 0.07 * i          # deeper toward the bottom course
    cube(f"Sand_shelf{i}", ledge, lw - 0.25 * i, d, 0.11,
         (random.random() - 0.5) * 0.2, -d / 2, -0.13 * i)

# ================= Boulder: floor scatter prop =================
boulder = empty("Boulder")
rock("Sand_rock0", boulder, 0.5, 0.0, 0.0, 0.3)
rock("Dark_rock1", boulder, 0.28, 0.62, 0.25, 0.18)

# ================= export =================
for ob in bpy.data.objects:
    ob.select_set(True)
bpy.ops.export_scene.gltf(filepath=OUT, export_format="GLB", export_yup=True)
print("WROTE", OUT)

# ---- preview renders (optional, PREVIEW_DIR) ----
scene = bpy.context.scene
scene.render.engine = "BLENDER_EEVEE"
sun = bpy.data.objects.new("sun", bpy.data.lights.new("sun", type="SUN"))
scene.collection.objects.link(sun)
sun.rotation_euler = (math.radians(55), 0, math.radians(20))
scene.render.resolution_x = 900
scene.render.resolution_y = 740
cam_data = bpy.data.cameras.new("cam")
cam = bpy.data.objects.new("cam", cam_data)
scene.collection.objects.link(cam)
scene.camera = cam
cam_data.lens = 28
import mathutils


def aim(frm, to):
    cam.location = frm
    d = mathutils.Vector(to) - mathutils.Vector(frm)
    cam.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()


def render(path, show):
    for ob in bpy.data.objects:
        if ob.type == "MESH":
            top = ob
            while top.parent:
                top = top.parent
            ob.hide_render = top.name not in show
    scene.render.filepath = path
    bpy.ops.render.render(write_still=True)
    print("RENDERED", path)


prev = os.environ.get("PREVIEW_DIR", HERE)
aim((0.0, -11.0, 3.0), (0.0, 0.0, 2.4))
render(os.path.join(prev, "preview_rockshelter_portal.png"), {"Portal"})
