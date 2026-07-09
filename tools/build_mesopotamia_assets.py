# Builds the Mesopotamia (Ishtar Gate / Babylon) assets → assets/models/mesopotamia.glb.
# Concept: concept-art/subsections/middle-east-mesopotamia (Hallway-15) — a
# glazed-brick processional corridor: lapis-blue glazed bands with gold rosettes,
# crenellated (merlon) tops, guardian lamassu reliefs, and procession relief
# panels. (Crenellation along the corridor, glazed dado and floor uplights in JS.)
#
#   /Applications/Blender.app/Contents/MacOS/Blender --background \
#       --python tools/build_mesopotamia_assets.py
#
# Named parts (JS re-materials by name prefix in corridor.js applyMesoptMats):
#   Portal   — monumental glazed gate: blue jambs studded with gold rosettes,
#              a glazed frieze band, crenellated merlon top, flanking lamassu
#              guardian reliefs. Backing keeps clear.
#   Relief   — procession/guardian relief panel; "Relief" field textured in JS.
#   Merlon   — a single crenellation block for the corridor wall-tops.
# Prefixes: Brick→mudbrick, Glaze→lapis-blue glaze, Gold→ochre-gold rosette,
#           Relief→figure relief (texture in JS), Band→glazed band (texture in JS).
import bpy
import math
import os

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "assets", "models", "mesopotamia.glb")

HALL_W = 7.0
CEIL_H = 5.4
DOOR_W, DOOR_H = 3.4, 3.5
FACADE_H = 5.9

bpy.ops.wm.read_factory_settings(use_empty=True)


def pmat(name, color, rough=0.5, metal=0.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes.get("Principled BSDF")
    b.inputs["Base Color"].default_value = (*color, 1.0)
    b.inputs["Roughness"].default_value = rough
    b.inputs["Metallic"].default_value = metal
    return m


MATS = {
    "Brick": pmat("Brick", (0.55, 0.36, 0.20), 0.9),
    "Glaze": pmat("Glaze", (0.13, 0.26, 0.5), 0.25),
    "Gold": pmat("Gold", (0.78, 0.60, 0.24), 0.35, 0.6),
    "Relief": pmat("Relief", (0.60, 0.45, 0.26), 0.8),
    "Band": pmat("Band", (0.6, 0.5, 0.3), 0.6),
}


def empty(name):
    e = bpy.data.objects.new(name, None)
    bpy.context.scene.collection.objects.link(e)
    return e


def finish(ob, name, parent, smooth=False):
    ob.name = name
    key = next((k for k in MATS if name.startswith(k)), "Brick")
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


def cyl(name, parent, r1, r2, h, loc, rot=(0, 0, 0), verts=16, smooth=True):
    bpy.ops.mesh.primitive_cone_add(vertices=verts, radius1=r1, radius2=r2,
                                    depth=h, location=loc, rotation=rot)
    return finish(bpy.context.active_object, name, parent, smooth)


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


def rosette(prefix, parent, cx, cy, cz, r=0.2):
    cyl(prefix + "_ros", parent, r, r, 0.06, (cx, cy, cz), verts=18)
    cyl(prefix + "_roshub", parent, r * 0.4, r * 0.4, 0.09, (cx, cy - 0.02, cz), verts=12)


def crenel(prefix, parent, cx, cy, cz):
    """Stepped merlon (two receding blocks)."""
    cube(prefix + "_m1", parent, 0.42, 0.34, 0.34, cx, cy, cz)
    cube(prefix + "_m2", parent, 0.26, 0.34, 0.22, cx, cy, cz + 0.28)


# ================= Portal: monumental glazed gate =================
portal = empty("Portal")
DEPTH = 0.6
JT = DOOR_H + 0.6
SW = HALL_W / 2 - DOOR_W / 2
for side, tag in ((-1, "L"), (1, "R")):
    sx = side * (DOOR_W / 2 + SW / 2)
    jb = cube("Glaze_jamb" + tag, portal, SW, DEPTH, JT, sx, DEPTH / 2, JT / 2)
    box_uv(jb)
    # rosette column up each jamb
    for k in range(5):
        rosette("Gold", portal, side * (DOOR_W / 2 + 0.45), -0.02, 0.7 + k * 0.85)
    # lamassu guardian relief on the lower outboard jamb face
    vplane("Relief_lamassu" + tag, portal, SW - 0.6, 2.2, side * (DOOR_W / 2 + 0.35 + (SW - 0.6) / 2), -0.02, 1.4)
# glazed frieze band across the top (glazedBand texture in JS)
vplane("Band_frieze", portal, HALL_W, 0.6, 0.0, -0.02, JT + 0.35)
cube("Glaze_lintelcourse", portal, HALL_W, DEPTH, 0.14, 0, DEPTH / 2, JT + 0.72)
# crenellated merlon top
nm = 7
for i in range(nm):
    x = -HALL_W / 2 + 0.5 + i * ((HALL_W - 1.0) / (nm - 1))
    crenel("Glaze", portal, x, DEPTH / 2, JT + 0.95)
# backing frame
BK_Y = DEPTH + 0.07
BK_T = 0.14
SIDE_W = SW + 0.1
for side, nm2 in ((-1, "Brick_backL"), (1, "Brick_backR")):
    cube(nm2, portal, SIDE_W, BK_T, FACADE_H + 0.4, side * (DOOR_W / 2 + SIDE_W / 2), BK_Y, (FACADE_H + 0.4) / 2)
cube("Brick_backHdr", portal, DOOR_W, BK_T, FACADE_H + 0.4 - DOOR_H, 0, BK_Y, DOOR_H + (FACADE_H + 0.4 - DOOR_H) / 2)


# ================= Relief: procession panel =================
relief = empty("Relief")
cube("Glaze_relframe", relief, 1.9, 0.12, 2.4, 0, -0.06, 0)
vplane("Relief_field", relief, 1.7, 2.2, 0.0, -0.13, 0)


# ================= Merlon: single crenellation block =================
merlon = empty("Merlon")
crenel("Glaze", merlon, 0, 0, 0)


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
scene.render.resolution_y = 760
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
aim((0.0, -13.0, 3.6), (0.0, 0.0, 3.4))
render(os.path.join(prev, "preview_mesopt_portal.png"), {"Portal"})
