# Builds the Japan (shoin-style timber gallery) assets → assets/models/japan.glb.
# Concept: concept-art/subsections/asia-japan (Hallway-23) — a dark timber
# post-and-beam corridor with backlit shoji screens, tokonoma display alcoves
# (hanging scroll + raised tatami + vessel), exposed beams, wall andon lanterns,
# and a refined timber threshold portal with a stone step.
#
#   /Applications/Blender.app/Contents/MacOS/Blender --background \
#       --python tools/build_japan_assets.py
#
# Named parts (JS re-materials by name prefix in corridor.js applyJapanMats):
#   Portal   — timber post+lintel frame, transom lattice, dark wainscot, stone
#              threshold step. Backing keeps the doorway clear.
#   Tokonoma — display alcove: dark timber frame, plaster back, raised tatami
#              platform, hanging scroll, vessel. Protrudes 0.24.
#   Lantern  — wall andon (timber box + shoji glow panels).
#   Post     — square dark-timber post.
#   Beam     — exposed timber ceiling beam.
# Prefixes: Wood→dark timber, Shoji→warm paper glow, Tatami→straw mat,
#           Scroll→hanging scroll (texture in JS), Stone→threshold, Glow→emissive.
import bpy
import math
import os

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "assets", "models", "japan.glb")

HALL_W = 7.0
CEIL_H = 4.6
DOOR_W, DOOR_H = 3.4, 3.5
FACADE_H = 5.0

bpy.ops.wm.read_factory_settings(use_empty=True)


def pmat(name, color, rough=0.85, emit=None):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes.get("Principled BSDF")
    b.inputs["Base Color"].default_value = (*color, 1.0)
    b.inputs["Roughness"].default_value = rough
    if emit is not None:
        b.inputs["Emission Color"].default_value = (*emit, 1.0)
        b.inputs["Emission Strength"].default_value = 1.0
    return m


MATS = {
    "Wood": pmat("Wood", (0.20, 0.13, 0.08)),
    "Shoji": pmat("Shoji", (0.95, 0.88, 0.72), 0.6, emit=(0.9, 0.8, 0.6)),
    "Tatami": pmat("Tatami", (0.62, 0.58, 0.38)),
    "Scroll": pmat("Scroll", (0.80, 0.75, 0.62)),
    "Stone": pmat("Stone", (0.42, 0.41, 0.38)),
    "Glow": pmat("Glow", (1.0, 0.82, 0.5)),
}


def empty(name):
    e = bpy.data.objects.new(name, None)
    bpy.context.scene.collection.objects.link(e)
    return e


def finish(ob, name, parent, smooth=False):
    ob.name = name
    key = next((k for k in MATS if name.startswith(k)), "Wood")
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


def cyl(name, parent, r1, r2, h, loc, rot=(0, 0, 0), verts=12, smooth=True):
    bpy.ops.mesh.primitive_cone_add(vertices=verts, radius1=r1, radius2=r2,
                                    depth=h, location=loc, rotation=rot)
    return finish(bpy.context.active_object, name, parent, smooth)


def box_uv(ob, scale=2.5):
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


def lattice(prefix, parent, w, h, cx, cy, cz, nx, nz, t=0.03, depth=0.05):
    """A wooden lattice grid in the x-z plane (vertical panel)."""
    for i in range(nx + 1):
        x = cx - w / 2 + i * w / nx
        cube(prefix, parent, t, depth, h, x, cy, cz)
    for j in range(nz + 1):
        z = cz - h / 2 + j * h / nz
        cube(prefix, parent, w, depth, t, cx, cy, z)


# ================= Portal: timber threshold frame =================
portal = empty("Portal")
DEPTH = 0.5
# square timber posts flanking the door
for side in (-1, 1):
    cube("Wood_post", portal, 0.26, DEPTH, DOOR_H + 0.3,
         side * (DOOR_W / 2 + 0.13), DEPTH / 2, (DOOR_H + 0.3) / 2)
# head lintel + a second beam
cube("Wood_lintel", portal, DOOR_W + 0.9, DEPTH, 0.3, 0, DEPTH / 2, DOOR_H + 0.35)
cube("Wood_head", portal, HALL_W, DEPTH, 0.22, 0, DEPTH / 2, DOOR_H + 0.95)
# transom lattice (ranma) above the door between posts
lattice("Wood_ranma", portal, DOOR_W, 0.5, 0, 0.04, DOOR_H + 0.62, 9, 2)
# plaster shoulders + dark wainscot, framed by posts
for side in (-1, 1):
    sw = (HALL_W - DOOR_W) / 2
    sx = side * (DOOR_W / 2 + sw / 2)
    cube("Shoji_shoulder", portal, sw - 0.1, DEPTH - 0.06, DOOR_H - 0.7, sx, DEPTH / 2, (DOOR_H - 0.7) / 2 + 0.7)
    cube("Wood_wainscot", portal, sw, DEPTH, 0.7, sx, DEPTH / 2, 0.35)
    cube("Wood_cornerpost", portal, 0.24, DEPTH, DOOR_H + 0.3, side * (HALL_W / 2 - 0.12), DEPTH / 2, (DOOR_H + 0.3) / 2)
# facade field above
cube("Wood_beamtop", portal, HALL_W, DEPTH, FACADE_H - (DOOR_H + 1.06),
     0, DEPTH / 2, (DOOR_H + 1.06 + FACADE_H) / 2)
# Museum adaptation: a flush stone threshold preserves the visual boundary
# without carrying the historical raised sill through the accessible route.
cube("Stone_step", portal, DOOR_W + 0.5, 0.5, 0.025, 0, -0.32, 0.0125)
# backing frame keeps the doorway clear
BK_Y = DEPTH + 0.07
BK_T = 0.14
SIDE_W = (HALL_W - DOOR_W) / 2 + 0.1
for side, nm in ((-1, "Shoji_backL"), (1, "Shoji_backR")):
    cube(nm, portal, SIDE_W, BK_T, FACADE_H + 0.4,
         side * (DOOR_W / 2 + SIDE_W / 2), BK_Y, (FACADE_H + 0.4) / 2)
cube("Shoji_backHdr", portal, DOOR_W, BK_T, FACADE_H + 0.4 - DOOR_H,
     0, BK_Y, DOOR_H + (FACADE_H + 0.4 - DOOR_H) / 2)


# ================= Tokonoma: display alcove =================
# Modeled protruding toward -Y (placed with rotation.y = -side*pi/2).
toko = empty("Tokonoma")
TD = 0.24
TW, TH = 1.5, 2.4
for side in (-1, 1):
    cube("Wood_tokoPost", toko, 0.14, TD, TH, side * TW / 2, -TD / 2, TH / 2)
cube("Wood_tokoLintel", toko, TW + 0.28, TD, 0.2, 0, -TD / 2, TH)
cube("Wood_tokoBase", toko, TW + 0.28, TD + 0.12, 0.22, 0, -(TD + 0.12) / 2, 0.11)
# plaster back
cube("Shoji_tokoBack", toko, TW - 0.04, 0.06, TH - 0.3, 0, 0.06, TH / 2 + 0.05)
# raised tatami platform
cube("Tatami_platform", toko, TW - 0.1, TD - 0.02, 0.18, 0, -(TD - 0.02) / 2, 0.31)
# hanging scroll (kakemono)
cube("Scroll_kake", toko, 0.62, 0.02, 1.5, 0, 0.02, TH / 2 + 0.15)
# a small vessel on the platform
cyl("Wood_vase", toko, 0.08, 0.12, 0.26, (0, -0.1, 0.53), verts=12)


# ================= Lantern: wall andon =================
lantern = empty("Lantern")
for dz in (-0.28, 0.28):
    cube("Wood_lanternRail", lantern, 0.3, 0.16, 0.05, 0, -0.08, dz)
for dx in (-0.14, 0.14):
    cube("Wood_lanternPost", lantern, 0.05, 0.16, 0.62, dx, -0.08, 0)
cube("Shoji_lanternPaper", lantern, 0.24, 0.02, 0.52, 0, -0.16, 0)
cube("Glow_lanternCore", lantern, 0.16, 0.10, 0.44, 0, -0.08, 0)


# ================= Post + Beam =================
post = empty("Post")
cube("Wood_post", post, 0.22, 0.22, CEIL_H, 0, -0.11, CEIL_H / 2)
beam = empty("Beam")
cube("Wood_beam", beam, HALL_W + 0.3, 0.2, 0.26, 0, 0, CEIL_H - 0.14)


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
scene.render.resolution_y = 720
cam_data = bpy.data.cameras.new("cam")
cam = bpy.data.objects.new("cam", cam_data)
scene.collection.objects.link(cam)
scene.camera = cam
cam_data.lens = 30
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
aim((0.0, -11.0, 3.0), (0.0, 0.0, 2.6))
render(os.path.join(prev, "preview_japan_portal.png"), {"Portal"})
aim((0.7, -3.0, 1.3), (0.0, 0.0, 1.3))
render(os.path.join(prev, "preview_japan_toko.png"), {"Tokonoma"})
