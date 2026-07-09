# Builds the Baroque (palace gallery) assets → assets/models/baroque.glb.
# Concept: concept-art/subsections/europe-baroque (Hallway-10) — a grand vaulted
# palace gallery: gilded stucco cartouches, deep-red damask walls, carved walnut
# wainscot, bronze chandeliers + candelabra sconces, and a majestic arched marble
# portal with a gilded crest. (Barrel vault, wainscot and floor medallion in JS.)
#
#   /Applications/Blender.app/Contents/MacOS/Blender --background \
#       --python tools/build_baroque_assets.py
#
# Named parts (JS re-materials by name prefix in corridor.js applyBaroqueMats):
#   Portal     — arched marble surround, gilt pilasters, gilded cartouche crest.
#   Chandelier — bronze/gilt ring with candle arms (flames + light added in JS).
#   Sconce     — gilt wall candelabra (branches + cups).
#   Cartouche  — gilded stucco oval cartouche for the walls.
# Prefixes: Marble→cream marble, Gilt→gold, Damask→red wall, Walnut→dark wood,
#           Ember→candle flame stand-in, Dark→shadow line.
import bpy
import math
import os
import bmesh

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "assets", "models", "baroque.glb")

HALL_W = 7.0
CEIL_H = 5.4
DOOR_W, DOOR_H = 3.4, 3.5
FACADE_H = 5.6

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
    "Marble": pmat("Marble", (0.85, 0.82, 0.75), 0.4),
    "Gilt": pmat("Gilt", (0.80, 0.63, 0.26), 0.32, 0.85),
    "Damask": pmat("Damask", (0.36, 0.12, 0.11), 0.8),
    "Walnut": pmat("Walnut", (0.22, 0.13, 0.08), 0.6),
    "Ember": pmat("Ember", (1.0, 0.7, 0.35), 0.5),
    "Dark": pmat("Dark", (0.12, 0.10, 0.08), 0.8),
}


def empty(name):
    e = bpy.data.objects.new(name, None)
    bpy.context.scene.collection.objects.link(e)
    return e


def finish(ob, name, parent, smooth=False):
    ob.name = name
    key = next((k for k in MATS if name.startswith(k)), "Marble")
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


def sphere(name, parent, r, loc):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=r, location=loc, segments=16, ring_count=8)
    return finish(bpy.context.active_object, name, parent, True)


def torus(name, parent, R, r, loc, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_torus_add(major_radius=R, minor_radius=r, location=loc,
                                     rotation=rot, major_segments=24, minor_segments=8)
    return finish(bpy.context.active_object, name, parent, True)


def extrude_poly(name, parent, pts, y0, y1):
    n = len(pts)
    verts = [(x, y0, z) for (x, z) in pts] + [(x, y1, z) for (x, z) in pts]
    faces = [list(range(n)), list(range(2 * n - 1, n - 1, -1))]
    for i in range(n):
        j = (i + 1) % n
        faces.append((i, j, j + n, i + n))
    me = bpy.data.meshes.new(name)
    me.from_pydata(verts, [], faces)
    me.update()
    ob = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(ob)
    bm = bmesh.new(); bm.from_mesh(me)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(me); bm.free()
    return finish(ob, name, parent)


def arch_band(name, parent, cx, cz, R, r, y0, y1, seg=12):
    pts = []
    for i in range(seg + 1):
        a = math.pi * i / seg
        pts.append((cx + R * math.cos(a), cz + R * math.sin(a)))
    for i in range(seg + 1):
        a = math.pi * (seg - i) / seg
        pts.append((cx + r * math.cos(a), cz + r * math.sin(a)))
    return extrude_poly(name, parent, pts, y0, y1)


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


def cartouche(prefix, parent, cx, cy, cz, s=1.0):
    """A gilded oval cartouche with a small central shield + scroll bumps."""
    torus(prefix + "_ring", parent, 0.42 * s, 0.06 * s, (cx, cy, cz), rot=(math.pi / 2, 0, 0))
    ob = bpy.context.active_object
    # squash to an oval
    ob.scale = (1.0, 1.0, 1.3)
    bpy.ops.object.transform_apply(scale=True)
    cube(prefix + "_shield", parent, 0.34 * s, 0.05 * s, 0.5 * s, cx, cy - 0.01, cz)
    for a in range(6):
        ang = a * math.pi / 3
        cyl(prefix + "_ray", parent, 0.03 * s, 0.01 * s, 0.28 * s,
            (cx + 0.5 * s * math.cos(ang), cy, cz + 0.62 * s * math.sin(ang)),
            rot=(math.pi / 2 + ang, 0, 0), verts=6)


# ================= Portal: arched marble with gilt crest =================
portal = empty("Portal")
DEPTH = 0.55
OH = 1.7
SPRING = 3.4
CORN = SPRING + OH + 0.3
SW = HALL_W / 2 - OH
for side, tag in ((-1, "L"), (1, "R")):
    sx = side * (OH + SW / 2)
    cube("Damask_shoulder" + tag, portal, SW, DEPTH, FACADE_H, sx, DEPTH / 2, FACADE_H / 2)
    # gilt-marble pilaster on the shoulder
    cube("Marble_pil" + tag, portal, 0.5, DEPTH + 0.06, CORN - 0.1, side * (OH + 0.3), DEPTH / 2, (CORN - 0.1) / 2)
    cube("Gilt_pilcap" + tag, portal, 0.6, DEPTH + 0.1, 0.24, side * (OH + 0.3), DEPTH / 2, CORN - 0.2)
# marble archivolt
arch = arch_band("Marble_arch", portal, 0.0, SPRING, OH + 0.4, OH, -0.02, DEPTH)
box_uv(arch)
cyl("Gilt_key", portal, 0.24, 0.18, 0.55, (0, DEPTH / 2 - 0.02, SPRING + OH + 0.08), rot=(0, 0, 0), verts=4)
# fill above the arch + entablature
cube("Marble_tymp", portal, OH * 2, DEPTH, CORN - (SPRING + OH), 0, DEPTH / 2, (SPRING + OH + CORN) / 2)
cube("Marble_cornice", portal, HALL_W, DEPTH + 0.14, 0.22, 0, DEPTH / 2, CORN + 0.11)
cube("Damask_field", portal, HALL_W, DEPTH, FACADE_H - (CORN + 0.22), 0, DEPTH / 2, (CORN + 0.22 + FACADE_H) / 2)
# gilded cartouche crest on top of the cornice
cartouche("Gilt", portal, 0.0, -0.05, CORN + 0.7, s=1.4)
# marble threshold with a medallion inlay line
cube("Marble_threshold", portal, DOOR_W + 0.6, 0.6, 0.06, 0, -0.15, 0.03)
# backing frame
BK_Y = DEPTH + 0.07
BK_T = 0.14
for side, nm in ((-1, "Damask_backL"), (1, "Damask_backR")):
    cube(nm, portal, SW + 0.1, BK_T, FACADE_H + 0.3, side * (OH + (SW + 0.1) / 2 - 0.05), BK_Y, (FACADE_H + 0.3) / 2)
cube("Damask_backHdr", portal, OH * 2 + 0.2, BK_T, FACADE_H + 0.3 - (SPRING + OH),
     0, BK_Y, (SPRING + OH + FACADE_H + 0.3) / 2)


# ================= Chandelier =================
ch = empty("Chandelier")
cyl("Gilt_chain", ch, 0.02, 0.02, 0.8, (0, 0, 0.4), verts=6)
sphere("Gilt_hub", ch, 0.14, (0, 0, -0.1))
torus("Gilt_ring", ch, 0.5, 0.04, (0, 0, -0.35), rot=(math.pi / 2, 0, 0))
for a in range(8):
    ang = a * math.pi / 4
    x, y = 0.5 * math.cos(ang), 0.5 * math.sin(ang)
    cyl("Gilt_arm", ch, 0.02, 0.02, 0.4, (x * 0.6, y * 0.6, -0.28), rot=(math.pi / 2, 0, ang + math.pi / 2), verts=6)
    cyl("Gilt_cup", ch, 0.05, 0.03, 0.08, (x, y, -0.28), verts=8)
    cyl("Ember_candle", ch, 0.025, 0.02, 0.14, (x, y, -0.18), verts=6)


# ================= Sconce =================
sc = empty("Sconce")
cube("Gilt_scBack", sc, 0.12, 0.05, 0.34, 0, -0.02, 0)
for s in (-1, 1):
    cyl("Gilt_scArm", sc, 0.02, 0.02, 0.34, (s * 0.12, -0.14, -0.02), rot=(math.pi / 2, 0, s * 0.7), verts=6)
    cyl("Gilt_scCup", sc, 0.045, 0.03, 0.07, (s * 0.2, -0.22, 0.04), verts=8)
    cyl("Ember_scCandle", sc, 0.022, 0.018, 0.12, (s * 0.2, -0.22, 0.14), verts=6)


# ================= Cartouche (standalone wall ornament) =================
cart = empty("Cartouche")
cartouche("Gilt", cart, 0.0, -0.05, 0.0, s=1.3)


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
aim((0.0, -13.0, 3.6), (0.0, 0.0, 3.6))
render(os.path.join(prev, "preview_baroque_portal.png"), {"Portal"})
aim((0.0, -2.4, -0.2), (0.0, 0.0, -0.3))
render(os.path.join(prev, "preview_baroque_chand.png"), {"Chandelier"})
