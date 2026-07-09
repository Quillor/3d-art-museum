# Builds the Indus Valley (Harappan baked-brick) assets → assets/models/indus.glb.
# Concept: concept-art/subsections/asia-indus (Hallway-20) — precisely-laid
# fired-brick gallery: engaged brick piers, recessed niches with pots under
# cool-white light, square terracotta motif plaques, and a monumental brick
# portal with a heavy TIMBER lintel and worn steps.
#
#   /Applications/Blender.app/Contents/MacOS/Blender --background \
#       --python tools/build_indus_assets.py
#
# Named parts (JS re-materials by name prefix in corridor.js applyIndusMats):
#   Portal — brick entry, engaged piers, heavy timber lintel, low threshold.
#   Niche  — recessed brick niche + pot on a sill + glow. Protrudes 0.22.
#   Pier   — engaged brick pilaster with a plaster reveal cap. Projects 0.20.
#   Plaque — framed square terracotta plaque; the "Plaque" field gets an Indus
#            motif texture in JS. Projects 0.06.
#   Beam   — timber ceiling beam spanning the hall.
# Prefixes: Brick→fired brick wall, Wood→timber, Terra→terracotta, Plaque→motif
#           (texture in JS), Glow→emissive.
import bpy
import math
import os

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "assets", "models", "indus.glb")

HALL_W = 7.0
CEIL_H = 4.6
DOOR_W, DOOR_H = 3.4, 3.5
FACADE_H = 5.0

bpy.ops.wm.read_factory_settings(use_empty=True)


def pmat(name, color, rough=0.95):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes.get("Principled BSDF")
    b.inputs["Base Color"].default_value = (*color, 1.0)
    b.inputs["Roughness"].default_value = rough
    return m


MATS = {
    "Brick": pmat("Brick", (0.55, 0.34, 0.22)),
    "Wood": pmat("Wood", (0.30, 0.19, 0.10)),
    "Terra": pmat("Terra", (0.62, 0.36, 0.20)),
    "Plaque": pmat("Plaque", (0.60, 0.38, 0.22)),
    "Glow": pmat("Glow", (0.85, 0.92, 1.0)),   # cool-white niche accent
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


def cyl(name, parent, r1, r2, h, loc, rot=(0, 0, 0), verts=14, smooth=True):
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


# ================= Portal: brick entry with timber lintel =================
portal = empty("Portal")
DEPTH = 0.7
# engaged brick piers flanking the door
SW = (HALL_W - DOOR_W) / 2
for side, tag in ((-1, "L"), (1, "R")):
    p = cube("Brick_pier" + tag, portal, SW, DEPTH, DOOR_H + 0.3,
             side * (DOOR_W / 2 + SW / 2), DEPTH / 2, (DOOR_H + 0.3) / 2)
    box_uv(p)
    # plaster-reveal band on the pier inner edge
    cube("Brick_reveal" + tag, portal, 0.12, DEPTH + 0.06, DOOR_H + 0.2,
         side * (DOOR_W / 2 + 0.06), DEPTH / 2, (DOOR_H + 0.2) / 2)
# heavy worn TIMBER lintel across the head (the Indus signature)
lin = cube("Wood_lintel", portal, HALL_W + 0.5, DEPTH + 0.35, 0.6,
           0, DEPTH / 2 - 0.06, DOOR_H + 0.55)
box_uv(lin, scale=3.5)
# brick parapet above the lintel
hd = cube("Brick_parapet", portal, HALL_W, DEPTH, FACADE_H - (DOOR_H + 0.85),
          0, DEPTH / 2, (DOOR_H + 0.85 + FACADE_H) / 2)
box_uv(hd)
# low worn threshold bar (kept low so a first-segment approach reads cleanly)
cube("Brick_threshold", portal, DOOR_W + 0.4, 0.5, 0.08, 0, -0.18, 0.04)
# backing frame keeps the doorway clear
BK_Y = DEPTH + 0.07
BK_T = 0.14
SIDE_W = SW + 0.1
for side, nm in ((-1, "Brick_backL"), (1, "Brick_backR")):
    b = cube(nm, portal, SIDE_W, BK_T, FACADE_H + 0.4,
             side * (DOOR_W / 2 + SIDE_W / 2), BK_Y, (FACADE_H + 0.4) / 2)
    box_uv(b)
bh = cube("Brick_backHdr", portal, DOOR_W, BK_T, FACADE_H + 0.4 - DOOR_H,
          0, BK_Y, DOOR_H + (FACADE_H + 0.4 - DOOR_H) / 2)
box_uv(bh)


# ================= Niche: recessed brick niche =================
niche = empty("Niche")
ND = 0.22
NW, NH = 1.1, 1.5
SILL = 0.7
for side, tag in ((-1, "L"), (1, "R")):
    cube("Brick_niche" + tag, niche, 0.2, ND, NH,
         side * (NW / 2 + 0.1), -ND / 2, SILL + NH / 2)
cube("Brick_nicheTop", niche, NW + 0.4, ND, 0.2, 0, -ND / 2, SILL + NH + 0.1)
cube("Brick_nicheSill", niche, NW + 0.4, ND + 0.08, 0.22, 0, -(ND + 0.08) / 2, SILL - 0.05)
vplane("Brick_nicheback", niche, NW, NH, 0.0, 0.08, SILL + NH / 2)
vplane("Glow_nicheback", niche, NW - 0.2, NH - 0.25, 0.0, 0.04, SILL + NH / 2)
cyl("Terra_potbody", niche, 0.13, 0.19, 0.30, (0, -0.02, SILL + 0.18), verts=14)
cyl("Terra_potneck", niche, 0.19, 0.11, 0.12, (0, -0.02, SILL + 0.39), verts=14)


# ================= Pier: engaged brick pilaster =================
pier = empty("Pier")
PD = 0.20
cube("Brick_piershaft", pier, 0.6, PD, CEIL_H, 0, -PD / 2, CEIL_H / 2)
cube("Brick_piercap", pier, 0.72, PD + 0.06, 0.24, 0, -(PD + 0.06) / 2, CEIL_H - 0.18)
cube("Brick_pierbase", pier, 0.72, PD + 0.06, 0.28, 0, -(PD + 0.06) / 2, 0.14)


# ================= Plaque: framed terracotta motif panel =================
plaque = empty("Plaque")
PW = 0.86
cube("Terra_plaqueframe", plaque, PW + 0.18, 0.10, PW + 0.18, 0, -0.05, 0)
vplane("Plaque_field", plaque, PW, PW, 0.0, -0.11, 0)


# ================= Beam: timber ceiling beam =================
beam = empty("Beam")
cube("Wood_beam", beam, HALL_W + 0.3, 0.26, 0.30, 0, 0, CEIL_H - 0.16)


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
render(os.path.join(prev, "preview_indus_portal.png"), {"Portal"})
aim((0.7, -3.0, 1.3), (0.0, 0.0, 1.4))
render(os.path.join(prev, "preview_indus_niche.png"), {"Niche"})
