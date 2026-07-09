# Builds the Romantic salon (19th-c European salon gallery) assets →
# assets/models/salon.glb.
# Concept: concept-art/subsections/europe-romantic (Hallway-11) — deep-red
# flocked walls, gilded picture rails, carved walnut wainscot, plaster ceiling
# medallions, brass candelabra sconces, heavy velvet drapery, and an ornate
# arched carved-wood portal with a gilded crest.
#
#   /Applications/Blender.app/Contents/MacOS/Blender --background \
#       --python tools/build_salon_assets.py
#
# Named parts (JS re-materials by name prefix in corridor.js applySalonMats):
#   Portal   — arched carved-wood surround + gilt cartouche crest. Backing clear.
#   Sconce   — brass candelabra (3 arms + glass globes; light added in JS).
#   Drape    — heavy pleated velvet curtain + valance.
#   Medallion— plaster ceiling rosette.
# Prefixes: Wood→walnut, Gilt→gold, Velvet→red velvet, Plaster→cream,
#           Brass→brass, Globe→lit glass, Marble→threshold.
import bpy
import math
import os
import bmesh

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "assets", "models", "salon.glb")

HALL_W = 7.0
CEIL_H = 5.2
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
    "Wood": pmat("Wood", (0.24, 0.14, 0.08), 0.5),
    "Gilt": pmat("Gilt", (0.80, 0.63, 0.26), 0.32, 0.85),
    "Velvet": pmat("Velvet", (0.40, 0.10, 0.11), 0.9),
    "Plaster": pmat("Plaster", (0.82, 0.76, 0.62), 0.8),
    "Brass": pmat("Brass", (0.72, 0.55, 0.24), 0.35, 0.8),
    "Globe": pmat("Globe", (1.0, 0.94, 0.8), 0.3),
    "Marble": pmat("Marble", (0.24, 0.24, 0.26), 0.4),
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


def cyl(name, parent, r1, r2, h, loc, rot=(0, 0, 0), verts=16, smooth=True):
    bpy.ops.mesh.primitive_cone_add(vertices=verts, radius1=r1, radius2=r2,
                                    depth=h, location=loc, rotation=rot)
    return finish(bpy.context.active_object, name, parent, smooth)


def sphere(name, parent, r, loc):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=r, location=loc, segments=14, ring_count=7)
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


# ================= Portal: arched carved-wood + gilt crest =================
portal = empty("Portal")
DEPTH = 0.5
OH = 1.7
SPRING = 3.4
CORN = SPRING + OH + 0.25
SW = HALL_W / 2 - OH
for side, tag in ((-1, "L"), (1, "R")):
    sx = side * (OH + SW / 2)
    cube("Wood_shoulder" + tag, portal, SW, DEPTH, FACADE_H, sx, DEPTH / 2, FACADE_H / 2)
    cube("Wood_pil" + tag, portal, 0.46, DEPTH + 0.06, CORN - 0.1, side * (OH + 0.28), DEPTH / 2, (CORN - 0.1) / 2)
    cube("Gilt_pilcap" + tag, portal, 0.56, DEPTH + 0.1, 0.2, side * (OH + 0.28), DEPTH / 2, CORN - 0.16)
arch = arch_band("Wood_arch", portal, 0.0, SPRING, OH + 0.42, OH, -0.02, DEPTH)
box_uv(arch)
cube("Gilt_key", portal, 0.3, DEPTH + 0.06, 0.5, 0, DEPTH / 2 - 0.02, SPRING + OH + 0.05)
cube("Wood_tymp", portal, OH * 2, DEPTH, CORN - (SPRING + OH), 0, DEPTH / 2, (SPRING + OH + CORN) / 2)
cube("Gilt_cornice", portal, HALL_W, DEPTH + 0.12, 0.2, 0, DEPTH / 2, CORN + 0.1)
cube("Wood_field", portal, HALL_W, DEPTH, FACADE_H - (CORN + 0.2), 0, DEPTH / 2, (CORN + 0.2 + FACADE_H) / 2)
# gilded cartouche crest
torus("Gilt_crest", portal, 0.5, 0.06, (0, -0.05, CORN + 0.55), rot=(math.pi / 2, 0, 0))
cube("Gilt_crestShield", portal, 0.4, 0.06, 0.6, 0, -0.06, CORN + 0.55)
# marble threshold
cube("Marble_threshold", portal, DOOR_W + 0.6, 0.6, 0.06, 0, -0.15, 0.03)
# backing frame
BK_Y = DEPTH + 0.07
BK_T = 0.14
for side, nm in ((-1, "Wood_backL"), (1, "Wood_backR")):
    cube(nm, portal, SW + 0.1, BK_T, FACADE_H + 0.3, side * (OH + (SW + 0.1) / 2 - 0.05), BK_Y, (FACADE_H + 0.3) / 2)
cube("Wood_backHdr", portal, OH * 2 + 0.2, BK_T, FACADE_H + 0.3 - (SPRING + OH),
     0, BK_Y, (SPRING + OH + FACADE_H + 0.3) / 2)


# ================= Sconce: brass candelabra with globes =================
sc = empty("Sconce")
cube("Brass_back", sc, 0.12, 0.05, 0.3, 0, -0.02, 0)
for s in (-1, 0, 1):
    ax = s * 0.18
    cyl("Brass_arm", sc, 0.02, 0.02, 0.3 + abs(s) * 0.05, (ax * 0.5, -0.13, 0.02 + (0.05 if s == 0 else 0)),
        rot=(math.pi / 2, 0, s * 0.5), verts=6)
    sphere("Globe_ball", sc, 0.06, (ax, -0.24, 0.08 + (0.08 if s == 0 else 0)))


# ================= Drape: heavy pleated velvet curtain =================
drape = empty("Drape")
cube("Wood_valanceRod", drape, 1.5, 0.08, 0.08, 0, -0.08, 3.4)
cube("Velvet_valance", drape, 1.5, 0.06, 0.4, 0, -0.06, 3.1)
for i in range(6):
    x = -0.6 + i * 0.24
    cyl("Velvet_pleat", drape, 0.1, 0.1, 3.0, (x, -0.1, 1.5), rot=(0, 0, 0), verts=8)


# ================= Medallion: plaster ceiling rosette =================
med = empty("Medallion")
cyl("Plaster_medOuter", med, 0.7, 0.7, 0.08, (0, 0, 0), verts=28)
cyl("Plaster_medMid", med, 0.5, 0.5, 0.12, (0, 0, 0.04), verts=24)
cyl("Plaster_medInner", med, 0.24, 0.24, 0.14, (0, 0, 0.08), verts=20)
for a in range(12):
    ang = a * math.pi / 6
    cube("Plaster_petal", med, 0.1, 0.5, 0.06, 0.45 * math.cos(ang), 0.45 * math.sin(ang), 0.03)
    bpy.context.active_object.rotation_euler.z = ang
    bpy.ops.object.transform_apply(rotation=True)


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
aim((0.0, -13.0, 3.5), (0.0, 0.0, 3.5))
render(os.path.join(prev, "preview_salon_portal.png"), {"Portal"})
