# Builds the Classical Antiquity (Greek/Roman) assets → assets/models/greek.glb.
# Concept: concept-art/subsections/europe-classical (Hallway-07) — a colonnaded
# marble gallery with a temple-front pediment portal, pedimented aedicula wall
# niches, and bronze wall lamps. (Coffered ceiling, dado band and mosaic floor
# border are built procedurally in corridor.js buildGreekDecor.)
#
#   /Applications/Blender.app/Contents/MacOS/Blender --background \
#       --python tools/build_greek_assets.py
#
# Named parts (JS re-materials by name prefix in corridor.js applyGreekMats):
#   Portal   — temple front: fluted pilasters, entablature (architrave + painted
#              frieze + dentil cornice), triangular pediment. Backing keeps clear.
#   Aedicula — wall niche framed by pilasters + a small pediment. Protrudes 0.22.
#   Sconce   — bronze wall lamp (bracket + bowl); flame + light added in JS.
# Prefixes: Marble→wall, Stone→cream trim, Poly→painted polychrome (red frieze),
#           Gold→gilt accent, Bronze→bronze, Dark→dentil shadow.
import bpy
import math
import os
import bmesh

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "assets", "models", "greek.glb")

HALL_W = 7.0
CEIL_H = 5.6
DOOR_W, DOOR_H = 3.4, 3.5
FACADE_H = 5.6

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
    "Marble": pmat("Marble", (0.86, 0.83, 0.76), 0.45),
    "Stone": pmat("Stone", (0.82, 0.78, 0.68), 0.6),
    "Poly": pmat("Poly", (0.55, 0.18, 0.15), 0.7),
    "Gold": pmat("Gold", (0.78, 0.62, 0.28), 0.35, 0.8),
    "Bronze": pmat("Bronze", (0.42, 0.30, 0.16), 0.4, 0.8),
    "Dark": pmat("Dark", (0.20, 0.18, 0.15), 0.8),
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


def cyl(name, parent, r1, r2, h, loc, rot=(0, 0, 0), verts=20, smooth=True):
    bpy.ops.mesh.primitive_cone_add(vertices=verts, radius1=r1, radius2=r2,
                                    depth=h, location=loc, rotation=rot)
    return finish(bpy.context.active_object, name, parent, smooth)


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


def fluted_pilaster(prefix, parent, cx, cy, base_z, top_z, half=0.28):
    h = top_z - base_z
    cube(prefix + "_base", parent, half * 2 + 0.16, 0.3, 0.3, cx, cy, base_z + 0.15)
    sh = cube(prefix + "_shaft", parent, half * 2, 0.24, h - 0.7, cx, cy, base_z + 0.35 + (h - 0.7) / 2)
    box_uv(sh)
    # a few flute grooves (thin recessed strips)
    for i in range(-2, 3):
        cube(prefix + "_flute", parent, 0.03, 0.02, h - 0.9,
             cx + i * (half / 2.6), cy - 0.13, base_z + 0.4 + (h - 0.9) / 2)
    cube(prefix + "_cap", parent, half * 2 + 0.2, 0.32, 0.28, cx, cy, top_z - 0.14)


# ================= Portal: temple front with pediment =================
portal = empty("Portal")
DEPTH = 0.55
ENT = DOOR_H + 0.3      # top of pilasters / bottom of entablature
for side in (-1, 1):
    fluted_pilaster("Stone", portal, side * (DOOR_W / 2 + 0.4), DEPTH / 2, 0.0, ENT)
# entablature: architrave + painted frieze + dentil cornice
cube("Stone_architrave", portal, HALL_W, DEPTH, 0.28, 0, DEPTH / 2, ENT + 0.14)
cube("Poly_frieze", portal, HALL_W, DEPTH + 0.04, 0.42, 0, DEPTH / 2, ENT + 0.49)
# dentils
for i in range(-14, 15):
    cube("Stone_dentil", portal, 0.12, DEPTH + 0.12, 0.12, i * 0.24, DEPTH / 2, ENT + 0.82)
cube("Stone_cornice", portal, HALL_W + 0.3, DEPTH + 0.2, 0.2, 0, DEPTH / 2, ENT + 0.98)
# triangular pediment
ped = extrude_poly("Stone_pediment", portal,
                   [(-(HALL_W / 2 + 0.15), ENT + 1.08), (HALL_W / 2 + 0.15, ENT + 1.08),
                    (0, ENT + 1.9)], 0.0, DEPTH)
box_uv(ped)
cube("Gold_acroterion", portal, 0.2, DEPTH, 0.3, 0, DEPTH / 2, ENT + 1.95)
# backing frame keeps the doorway clear
BK_Y = DEPTH + 0.07
BK_T = 0.14
SIDE_W = (HALL_W - DOOR_W) / 2 + 0.1
for side, nm in ((-1, "Marble_backL"), (1, "Marble_backR")):
    cube(nm, portal, SIDE_W, BK_T, ENT + 0.2,
         side * (DOOR_W / 2 + SIDE_W / 2), BK_Y, (ENT + 0.2) / 2)
cube("Marble_backHdr", portal, DOOR_W, BK_T, ENT + 0.2 - DOOR_H,
     0, BK_Y, DOOR_H + (ENT + 0.2 - DOOR_H) / 2)


# ================= Aedicula: pedimented wall niche =================
aed = empty("Aedicula")
AD = 0.22
AW, AH = 1.0, 2.2
SILL = 0.7
for side in (-1, 1):
    fluted_pilaster("Stone", aed, side * (AW / 2 + 0.12), -AD / 2, SILL, SILL + AH, half=0.1)
cube("Stone_aedFrieze", aed, AW + 0.6, AD, 0.18, 0, -AD / 2, SILL + AH + 0.1)
extrude_poly("Stone_aedPed", aed,
             [(-(AW / 2 + 0.3), SILL + AH + 0.19), (AW / 2 + 0.3, SILL + AH + 0.19),
              (0, SILL + AH + 0.62)], -AD, 0.0)
cube("Stone_aedSill", aed, AW + 0.6, AD + 0.1, 0.2, 0, -(AD + 0.1) / 2, SILL - 0.05)
cube("Poly_aedBack", aed, AW - 0.1, 0.06, AH - 0.2, 0, 0.06, SILL + AH / 2)


# ================= Sconce: bronze wall lamp =================
sconce = empty("Sconce")
cube("Bronze_scPlate", sconce, 0.18, 0.06, 0.4, 0, -0.03, 0)
cube("Bronze_scArm", sconce, 0.08, 0.3, 0.08, 0, -0.16, -0.12)
cyl("Bronze_scBowl", sconce, 0.16, 0.09, 0.14, (0, -0.3, -0.12), verts=16)


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
aim((0.0, -12.0, 3.4), (0.0, 0.0, 3.2))
render(os.path.join(prev, "preview_greek_portal.png"), {"Portal"})
aim((0.6, -3.0, 1.6), (0.0, 0.0, 1.7))
render(os.path.join(prev, "preview_greek_aed.png"), {"Aedicula"})
