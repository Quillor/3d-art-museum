# Builds the Persia (Persepolis / Achaemenid) assets → assets/models/persia.glb.
# Concept: concept-art/subsections/middle-east-persia (Hallway-16) — a limestone
# relief gallery of Achaemenid guards/tribute-bearers, blue+gold rosette friezes,
# and an Apadana portal with fluted bull-protome columns and a winged disk.
#
#   /Applications/Blender.app/Contents/MacOS/Blender --background \
#       --python tools/build_persia_assets.py
#
# Named parts (JS re-materials by name prefix in corridor.js applyPersiaMats):
#   Portal — Apadana gate: fluted columns w/ bull-protome capitals, winged-disk
#            lintel, rosette frieze, flanking guard reliefs. Backing keeps clear.
#   Relief — tall Achaemenid guard relief panel; "Relief" field textured in JS.
#   Beam   — linear ceiling beam.
# Prefixes: Stone→limestone, Glaze→blue glaze, Gold→gold, Relief→figure relief
#           (texture in JS), Band→rosette band (texture in JS).
import bpy
import math
import os

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "assets", "models", "persia.glb")

HALL_W = 7.0
CEIL_H = 6.0
DOOR_W, DOOR_H = 3.4, 3.5
FACADE_H = 6.2

bpy.ops.wm.read_factory_settings(use_empty=True)


def pmat(name, color, rough=0.6, metal=0.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes.get("Principled BSDF")
    b.inputs["Base Color"].default_value = (*color, 1.0)
    b.inputs["Roughness"].default_value = rough
    b.inputs["Metallic"].default_value = metal
    return m


MATS = {
    "Stone": pmat("Stone", (0.68, 0.62, 0.50), 0.7),
    "Glaze": pmat("Glaze", (0.16, 0.30, 0.55), 0.3),
    "Gold": pmat("Gold", (0.80, 0.62, 0.26), 0.35, 0.7),
    "Relief": pmat("Relief", (0.66, 0.60, 0.48), 0.75),
    "Band": pmat("Band", (0.5, 0.45, 0.3), 0.6),
}


def empty(name):
    e = bpy.data.objects.new(name, None)
    bpy.context.scene.collection.objects.link(e)
    return e


def finish(ob, name, parent, smooth=False):
    ob.name = name
    key = next((k for k in MATS if name.startswith(k)), "Stone")
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


def cyl(name, parent, r1, r2, h, loc, rot=(0, 0, 0), verts=20, smooth=True):
    bpy.ops.mesh.primitive_cone_add(vertices=verts, radius1=r1, radius2=r2,
                                    depth=h, location=loc, rotation=rot)
    return finish(bpy.context.active_object, name, parent, smooth)


def box_uv(ob, scale=3.0):
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


def fluted_shaft(prefix, parent, cx, cy, z0, h, r1, r2, n=14):
    """A vertical shaft with real fluting: a slightly recessed core cylinder
    plus n thin rod-like ridges around the circumference, so the column reads
    as fluted in silhouette (not just a smooth cylinder) up close."""
    rmid = (r1 + r2) / 2.0
    cyl(prefix + "_shaftcore", parent, r1 * 0.82, r2 * 0.82, h, (cx, cy, z0 + h / 2), verts=24)
    for i in range(n):
        ang = 2 * math.pi * i / n
        fx = cx + math.cos(ang) * rmid * 0.92
        fy = cy + math.sin(ang) * rmid * 0.92
        cyl(prefix + "_flute", parent, rmid * 0.11, rmid * 0.11, h * 0.985,
            (fx, fy, z0 + h / 2), verts=6)


def bull_column(prefix, parent, cx, cy, base_z, top_z):
    h = top_z - base_z
    cube(prefix + "_plinth", parent, 0.6, 0.6, 0.3, cx, cy, base_z + 0.15)
    # fluted shaft: 14 shallow vertical ridges around a recessed core
    fluted_shaft(prefix, parent, cx, cy, base_z + 0.3, h - 1.4, 0.26, 0.3, n=14)
    # capital block
    cube(prefix + "_capblock", parent, 0.44, 0.44, 0.3, cx, cy, top_z - 0.95)
    # double bull-protome: two foreparts back to back (simplified wedges + horns)
    for s in (-1, 1):
        cube(prefix + "_bullbody", parent, 0.5, 0.34, 0.4, cx, cy + s * 0.3, top_z - 0.62)
        cube(prefix + "_bullhead", parent, 0.24, 0.3, 0.24, cx, cy + s * 0.55, top_z - 0.5)
        for hx in (-1, 1):
            cyl(prefix + "_bullhorn", parent, 0.04, 0.01, 0.3,
                (cx + hx * 0.1, cy + s * 0.6, top_z - 0.28), rot=(s * 0.5, 0, 0), verts=6)


# ================= Portal: Apadana gate =================
portal = empty("Portal")
DEPTH = 0.6
ENT = DOOR_H + 0.7
SW = HALL_W / 2 - DOOR_W / 2
# solid stone shoulders
for side, tag in ((-1, "L"), (1, "R")):
    sx = side * (DOOR_W / 2 + SW / 2)
    sh = cube("Stone_shoulder" + tag, portal, SW, DEPTH, FACADE_H, sx, DEPTH / 2, FACADE_H / 2)
    box_uv(sh)
    # fluted bull-protome column engaged on the reveal
    bull_column("Stone", portal, side * (DOOR_W / 2 + 0.45), 0.0, 0.0, ENT)
    # guard relief on the outboard shoulder
    vplane("Relief_guard" + tag, portal, SW - 0.5, ENT - 0.6, side * (DOOR_W / 2 + 0.95 + (SW - 0.5) / 2), -0.02, (ENT - 0.6) / 2 + 0.3)
# lintel + entablature
cube("Stone_lintel", portal, HALL_W, DEPTH, 0.5, 0, DEPTH / 2, ENT + 0.25)
# winged disk (Faravahar) centred on the lintel
cyl("Gold_wingdisk", portal, 0.3, 0.3, 0.08, (0, -0.02, ENT + 0.25), verts=20)
for s in (-1, 1):
    cube("Gold_wing", portal, 0.7, 0.06, 0.16, s * 0.62, -0.02, ENT + 0.25)
# flat "Wing" panel mount, proud of the sculptural disk/wings, so the
# persia_wingdisk texture (JS applyPersiaMats: name.startsWith("Gold_wing"))
# reads as a legible flat emblem rather than being smeared over the cylinder
vplane("Gold_wingpanel", portal, 1.6, 0.8, 0.0, -0.05, ENT + 0.25)
# rosette frieze band above (glazedBand texture in JS)
vplane("Band_frieze", portal, HALL_W, 0.5, 0.0, -0.02, ENT + 0.75)
cube("Stone_cornice", portal, HALL_W + 0.2, DEPTH + 0.12, 0.2, 0, DEPTH / 2, ENT + 1.1)
cube("Stone_field", portal, HALL_W, DEPTH, FACADE_H - (ENT + 1.2), 0, DEPTH / 2, (ENT + 1.2 + FACADE_H) / 2)
# backing
BK_Y = DEPTH + 0.07
BK_T = 0.14
SIDE_W = SW + 0.1
for side, nm in ((-1, "Stone_backL"), (1, "Stone_backR")):
    cube(nm, portal, SIDE_W, BK_T, FACADE_H + 0.4, side * (DOOR_W / 2 + SIDE_W / 2), BK_Y, (FACADE_H + 0.4) / 2)
cube("Stone_backHdr", portal, DOOR_W, BK_T, FACADE_H + 0.4 - DOOR_H, 0, BK_Y, DOOR_H + (FACADE_H + 0.4 - DOOR_H) / 2)


# ================= Relief: tall guard panel =================
relief = empty("Relief")
cube("Stone_relframe", relief, 1.4, 0.12, ENT - 0.2, 0, -0.06, (ENT - 0.2) / 2)
vplane("Relief_field", relief, 1.2, ENT - 0.5, 0.0, -0.13, (ENT - 0.5) / 2 + 0.15)


# ================= Beam =================
beam = empty("Beam")
cube("Stone_beam", beam, HALL_W + 0.3, 0.24, 0.3, 0, 0, CEIL_H - 0.16)


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
cam_data.lens = 26
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
aim((0.0, -14.0, 3.8), (0.0, 0.0, 3.6))
render(os.path.join(prev, "preview_persia_portal.png"), {"Portal"})
