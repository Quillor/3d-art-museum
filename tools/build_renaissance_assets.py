# Builds the Renaissance (Florentine palazzo) assets → assets/models/renaissance.glb.
# Concept: concept-art/subsections/europe-renaissance (Hallway-09) — pietra
# serena grey-stone pilasters and a round-ARCHED entrance portal with a carved
# surround, frescoed spandrel roundels and an ornament frieze, against cream
# fresco plaster. (Coffered ceiling already textured; floor border in JS.)
#
#   /Applications/Blender.app/Contents/MacOS/Blender --background \
#       --python tools/build_renaissance_assets.py
#
# Named parts (JS re-materials by name prefix in corridor.js applyRenMats):
#   Portal   — round-arched pietra serena surround w/ pilasters, frieze,
#              spandrel roundels. The blanking field rises to 8.6 so it covers
#              the taller Gothic (8.2) neighbour. Opening stays clear.
#   Pilaster — engaged pietra serena pilaster with base + capital.
#   Aedicula — pedimented pietra frame holding a fresco panel. Protrudes 0.2.
# Prefixes: Plaster→cream wall, Pietra→grey stone, Fresco→fresco field (texture
#           in JS), Marble→threshold, Gold→gilt accent.
import bpy
import math
import os
import bmesh

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "assets", "models", "renaissance.glb")

HALL_W = 7.0
CEIL_H = 5.4
DOOR_W, DOOR_H = 3.4, 3.5
BLANK_H = 8.6           # blank the taller Gothic neighbour opening

bpy.ops.wm.read_factory_settings(use_empty=True)


def pmat(name, color, rough=0.7):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes.get("Principled BSDF")
    b.inputs["Base Color"].default_value = (*color, 1.0)
    b.inputs["Roughness"].default_value = rough
    return m


MATS = {
    "Plaster": pmat("Plaster", (0.80, 0.74, 0.60)),
    "Pietra": pmat("Pietra", (0.46, 0.46, 0.44)),
    "Fresco": pmat("Fresco", (0.74, 0.68, 0.54)),
    "Marble": pmat("Marble", (0.62, 0.58, 0.50)),
    "Gold": pmat("Gold", (0.72, 0.56, 0.26), 0.4),
}


def empty(name):
    e = bpy.data.objects.new(name, None)
    bpy.context.scene.collection.objects.link(e)
    return e


def finish(ob, name, parent, smooth=False):
    ob.name = name
    key = next((k for k in MATS if name.startswith(k)), "Plaster")
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


def vplane(name, parent, w, h, cx, y, cz):
    bpy.ops.mesh.primitive_plane_add(size=1, location=(cx, y, cz))
    ob = bpy.context.active_object
    ob.scale = (w, h, 1)
    ob.rotation_euler.x = math.pi / 2
    bpy.ops.object.transform_apply(scale=True, rotation=True)
    return finish(ob, name, parent)


def pilaster(prefix, parent, cx, cy, base_z, top_z, half=0.28, depth=0.16):
    h = top_z - base_z
    cube(prefix + "_base", parent, half * 2 + 0.14, depth + 0.06, 0.26, cx, cy, base_z + 0.13)
    sh = cube(prefix + "_shaft", parent, half * 2, depth, h - 0.6, cx, cy, base_z + 0.3 + (h - 0.6) / 2)
    box_uv(sh)
    cap = cube(prefix + "_cap", parent, half * 2 + 0.22, depth + 0.08, 0.3, cx, cy, top_z - 0.15)
    box_uv(cap)


# ================= Portal: round-arched pietra serena =================
portal = empty("Portal")
DEPTH = 0.5
OH = 1.7                 # opening half-width
SPRING = 3.5            # arch springs at door height
CORNICE = SPRING + OH + 0.35
# solid plaster shoulders each side of the opening, up to the blanking height
SW = HALL_W / 2 - OH
for side, tag in ((-1, "L"), (1, "R")):
    sx = side * (OH + SW / 2)
    cube("Plaster_shoulder" + tag, portal, SW, DEPTH, BLANK_H, sx, DEPTH / 2, BLANK_H / 2)
    # engaged pietra pilaster on each shoulder face
    pilaster("Pietra", portal, side * (OH + 0.28), 0.0, 0.0, CORNICE - 0.1)
# round archivolt over the opening
arch = arch_band("Pietra_arch", portal, 0.0, SPRING, OH + 0.34, OH, -0.02, DEPTH)
box_uv(arch)
# keystone
cube("Pietra_key", portal, 0.34, DEPTH + 0.06, 0.5, 0, DEPTH / 2 - 0.03, SPRING + OH + 0.05)
# fill above the arch crown up to the cornice
cube("Plaster_tympfill", portal, OH * 2, DEPTH, CORNICE - (SPRING + OH),
     0, DEPTH / 2, (SPRING + OH + CORNICE) / 2)
# frescoed spandrel roundels
for side in (-1, 1):
    cyl("Fresco_roundel", portal, 0.4, 0.4, 0.05,
        (side * (OH - 0.5), -0.03, SPRING + 0.55), verts=20)
# entablature: frieze band + cornice across the full width
cube("Gold_frieze", portal, HALL_W, DEPTH + 0.02, 0.32, 0, DEPTH / 2, CORNICE + 0.16)
cube("Pietra_cornice", portal, HALL_W + 0.2, DEPTH + 0.16, 0.2, 0, DEPTH / 2, CORNICE + 0.42)
# plain plaster blanking field above the cornice up to BLANK_H (covers Gothic)
cube("Plaster_field", portal, HALL_W, DEPTH, BLANK_H - (CORNICE + 0.52),
     0, DEPTH / 2, (CORNICE + 0.52 + BLANK_H) / 2)
# marble threshold with a dark inlay line
cube("Marble_threshold", portal, DOOR_W + 0.6, 0.6, 0.06, 0, -0.15, 0.03)
# backing header above the arch crown (shoulders are already solid full height)
cube("Plaster_backHdr", portal, OH * 2 + 0.2, 0.14, BLANK_H - (SPRING + OH),
     0, DEPTH + 0.1, (SPRING + OH + BLANK_H) / 2)


# ================= Pilaster: engaged pietra serena =================
pil = empty("Pilaster")
pilaster("Pietra", pil, 0.0, -0.08, 0.0, CEIL_H)


# ================= Aedicula: pedimented fresco frame =================
aed = empty("Aedicula")
AD = 0.16
AW, AH = 1.3, 2.4
SILL = 0.7
for side in (-1, 1):
    pilaster("Pietra", aed, side * (AW / 2 + 0.1), -AD / 2, SILL, SILL + AH, half=0.09, depth=AD)
cube("Pietra_aedArch", aed, AW + 0.5, AD, 0.16, 0, -AD / 2, SILL + AH + 0.08)
extrude_poly("Pietra_aedPed", aed,
             [(-(AW / 2 + 0.28), SILL + AH + 0.16), (AW / 2 + 0.28, SILL + AH + 0.16),
              (0, SILL + AH + 0.55)], -AD, 0.0)
cube("Pietra_aedSill", aed, AW + 0.5, AD + 0.08, 0.16, 0, -(AD + 0.08) / 2, SILL - 0.03)
vplane("Fresco_aedPanel", aed, AW, AH - 0.1, 0.0, 0.03, SILL + AH / 2)


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
aim((0.0, -13.0, 4.0), (0.0, 0.0, 4.0))
render(os.path.join(prev, "preview_ren_portal.png"), {"Portal"})
aim((0.6, -3.2, 1.7), (0.0, 0.0, 1.8))
render(os.path.join(prev, "preview_ren_aed.png"), {"Aedicula"})
