# Builds the Oceania Voyagers/Living (Pacific timber+woven) assets →
# assets/models/oceanic.glb.  Shared by oceania-voyagers + oceania-living.
# Concept: concept-art/subsections/oceania-voyagers (Hallway-30) — a timber and
# woven gallery: lashed carved timber posts, a canoe-rib ceiling, woven pandanus
# panels, glowing navigation-star screens, and woven lantern sconces.
#
#   /Applications/Blender.app/Contents/MacOS/Blender --background \
#       --python tools/build_oceanic_assets.py
#
# Named parts (JS re-materials by name prefix in corridor.js applyOceanicMats):
#   Portal — lashed-beam entrance: carved timber posts, lashed lintel, shell
#            frieze, navigation-star screens. Backing keeps clear.
#   Post   — lashed carved timber post with rope rings.
#   Sconce — woven lantern sconce.
# Prefixes: Timber→dark carved wood, Weave→pandanus, Shell→pale shell inlay,
#           Star→navigation-star screen (texture in JS), Rope→lashing, Glow→lit.
import bpy
import math
import os

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "assets", "models", "oceanic.glb")

HALL_W = 7.0
CEIL_H = 4.6
DOOR_W, DOOR_H = 3.4, 3.5
FACADE_H = 5.0

bpy.ops.wm.read_factory_settings(use_empty=True)


def pmat(name, color, rough=0.7, metal=0.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes.get("Principled BSDF")
    b.inputs["Base Color"].default_value = (*color, 1.0)
    b.inputs["Roughness"].default_value = rough
    b.inputs["Metallic"].default_value = metal
    return m


MATS = {
    "Timber": pmat("Timber", (0.24, 0.15, 0.09), 0.6),
    "Weave": pmat("Weave", (0.55, 0.42, 0.24), 0.85),
    "Shell": pmat("Shell", (0.82, 0.80, 0.72), 0.4),
    "Star": pmat("Star", (0.1, 0.2, 0.35), 0.5),
    "Rope": pmat("Rope", (0.62, 0.5, 0.3), 0.9),
    "Glow": pmat("Glow", (1.0, 0.82, 0.5), 0.4),
}


def empty(name):
    e = bpy.data.objects.new(name, None)
    bpy.context.scene.collection.objects.link(e)
    return e


def finish(ob, name, parent, smooth=False):
    ob.name = name
    key = next((k for k in MATS if name.startswith(k)), "Timber")
    ob.data.materials.clear()
    ob.data.materials.append(MATS[key])
    if smooth:
        for p in ob.data.polygons:
            p.use_smooth = True
    ob.parent = parent
    return ob


def cube(name, parent, sx, sy, sz, cx, cy, cz):
    bpy.ops.mesh.primitive_cube_add(size=1, location=(cx, cy, cz))
    ob = bpy.context.active_object
    ob.scale = (sx, sy, sz)
    bpy.ops.object.transform_apply(scale=True)
    return finish(ob, name, parent)


def cyl(name, parent, r1, r2, h, loc, rot=(0, 0, 0), verts=14, smooth=True):
    bpy.ops.mesh.primitive_cone_add(vertices=verts, radius1=r1, radius2=r2,
                                    depth=h, location=loc, rotation=rot)
    return finish(bpy.context.active_object, name, parent, smooth)


def torus(name, parent, R, r, loc, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_torus_add(major_radius=R, minor_radius=r, location=loc,
                                     rotation=rot, major_segments=16, minor_segments=6)
    return finish(bpy.context.active_object, name, parent, True)


def box_uv(ob, scale=2.6):
    me = ob.data
    uv = me.uv_layers.active or me.uv_layers.new(name="UVMap")
    for poly in me.polygons:
        nrm = poly.normal
        ax = max(range(3), key=lambda i: abs(nrm[i]))
        for li in poly.loop_indices:
            co = me.vertices[me.loops[li].vertex_index].co
            if ax == 0:
                uv.data[li].uv = (co.y / scale, co.z / scale)
            elif ax == 1:
                uv.data[li].uv = (co.x / scale, co.z / scale)
            else:
                uv.data[li].uv = (co.x / scale, co.y / scale)


def vplane(name, parent, w, h, cx, y, cz):
    bpy.ops.mesh.primitive_plane_add(size=1, location=(cx, y, cz))
    ob = bpy.context.active_object
    ob.scale = (w, h, 1)
    ob.rotation_euler.x = math.pi / 2
    bpy.ops.object.transform_apply(scale=True, rotation=True)
    return finish(ob, name, parent)


def lashed_post(prefix, parent, cx, cy, base_z, top_z, half=0.16):
    h = top_z - base_z
    sh = cube(prefix + "_shaft", parent, half * 2, half * 2, h, cx, cy, base_z + h / 2)
    box_uv(sh, 1.5)
    # rope lashing rings
    for zf in (0.15, 0.55, 0.9):
        torus("Rope_lash", parent, half * 1.5, 0.04, (cx, cy, base_z + zf * h), rot=(0, math.pi / 2, 0))
    # carved cap notch
    cube(prefix + "_cap", parent, half * 2.4, half * 2.4, 0.2, cx, cy, top_z - 0.1)


# ================= Portal: lashed-beam entrance =================
portal = empty("Portal")
DEPTH = 0.6
# carved timber posts flanking
for side in (-1, 1):
    lashed_post("Timber", portal, side * (DOOR_W / 2 + 0.3), DEPTH / 2, 0.0, DOOR_H + 0.4, half=0.2)
# woven panels on the shoulders
SW = HALL_W / 2 - DOOR_W / 2 - 0.6
for side in (-1, 1):
    sx = side * (DOOR_W / 2 + 0.6 + SW / 2)
    p = cube("Weave_shoulder", portal, SW, DEPTH, DOOR_H + 0.2, sx, DEPTH / 2, (DOOR_H + 0.2) / 2)
    box_uv(p)
    # navigation-star screen inset in each shoulder
    vplane("Star_screen", portal, SW - 0.3, DOOR_H - 0.8, sx, -0.02, (DOOR_H - 0.8) / 2 + 0.4)
# lashed beam lintel (heavy timber) + rope lashings at the ends
cube("Timber_lintel", portal, HALL_W, DEPTH + 0.2, 0.5, 0, DEPTH / 2 - 0.1, DOOR_H + 0.55)
for side in (-1, 1):
    torus("Rope_lintel", portal, 0.28, 0.05, (side * (DOOR_W / 2 + 0.3), DEPTH / 2, DOOR_H + 0.55), rot=(0, 0, 0))
# shell-inlay frieze across the top
vplane("Shell_frieze", portal, HALL_W, 0.4, 0.0, -0.02, DOOR_H + 0.95)
cube("Timber_ridge", portal, HALL_W + 0.3, DEPTH + 0.14, 0.24, 0, DEPTH / 2, DOOR_H + 1.25)
# gable field above (woven)
cube("Weave_field", portal, HALL_W, DEPTH, FACADE_H - (DOOR_H + 1.37), 0, DEPTH / 2, (DOOR_H + 1.37 + FACADE_H) / 2)
# raised timber threshold
cube("Timber_threshold", portal, DOOR_W + 0.6, 0.6, 0.14, 0, -0.2, 0.07)
# backing
BK_Y = DEPTH + 0.07
BK_T = 0.14
SIDE_W = (HALL_W - DOOR_W) / 2 + 0.1
for side, nm in ((-1, "Weave_backL"), (1, "Weave_backR")):
    cube(nm, portal, SIDE_W, BK_T, FACADE_H + 0.4, side * (DOOR_W / 2 + SIDE_W / 2), BK_Y, (FACADE_H + 0.4) / 2)
cube("Weave_backHdr", portal, DOOR_W, BK_T, FACADE_H + 0.4 - DOOR_H, 0, BK_Y, DOOR_H + (FACADE_H + 0.4 - DOOR_H) / 2)


# ================= Post: lashed carved timber post =================
post = empty("Post")
lashed_post("Timber", post, 0.0, -0.12, 0.0, CEIL_H, half=0.16)


# ================= Sconce: woven lantern =================
sc = empty("Sconce")
cube("Timber_scArm", sc, 0.06, 0.2, 0.06, 0, -0.1, 0.14)
cube("Weave_scBody", sc, 0.2, 0.2, 0.3, 0, -0.2, 0)
cube("Glow_scCore", sc, 0.13, 0.13, 0.24, 0, -0.2, 0)


# ---------------- export ----------------
os.makedirs(os.path.dirname(os.path.abspath(OUT)), exist_ok=True)
bpy.ops.object.select_all(action="SELECT")
bpy.ops.export_scene.gltf(filepath=os.path.abspath(OUT), export_format="GLB",
                          export_apply=True, export_yup=True)
print("EXPORTED", os.path.abspath(OUT))

# ---------------- preview renders ----------------
scene = bpy.context.scene
scene.render.engine = "BLENDER_WORKBENCH"
scene.display.shading.light = "STUDIO"
scene.display.shading.show_cavity = True
scene.render.resolution_x = 1000
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
aim((0.0, -12.0, 3.2), (0.0, 0.0, 2.8))
render(os.path.join(prev, "preview_oceanic_portal.png"), {"Portal"})
