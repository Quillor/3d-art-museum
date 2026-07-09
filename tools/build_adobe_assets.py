# Builds the Native North America (Pueblo / Ancestral Puebloan adobe) assets →
# assets/models/adobe.glb.
# Concept: concept-art/subsections/americas-native-north (Hallway-04) — smooth
# adobe plaster, a timber VIGA (round-log) ceiling, ARCHED wall niches holding
# ceramics and woven baskets under low uplights, painted geometric friezes.
#
#   /Applications/Blender.app/Contents/MacOS/Blender --background \
#       --python tools/build_adobe_assets.py
#
# Named parts (JS re-materials by name prefix in corridor.js applyAdobeMats):
#   Portal — thick plastered adobe entry, round-log lintel, painted motif band,
#            step threshold. Opening clears doorW/H; backing frame keeps clear.
#   Niche  — arched adobe niche (proud plaster surround, recessed back, ceramic
#            pot on sill). Protrudes 0.24 (unreachable).
#   Viga   — fat round timber ceiling log spanning the 7 m hall.
# Prefixes: Adobe→earthen wall, Wood→timber, Terra→ceramic, Paint→painted band
#           (texture assigned in JS), Glow→emissive uplight.
import bpy
import math
import os
import bmesh

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "assets", "models", "adobe.glb")

HALL_W = 7.0
CEIL_H = 4.4
DOOR_W, DOOR_H = 3.4, 3.5
FACADE_H = 5.0

bpy.ops.wm.read_factory_settings(use_empty=True)


def pmat(name, color, rough=0.98):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes.get("Principled BSDF")
    b.inputs["Base Color"].default_value = (*color, 1.0)
    b.inputs["Roughness"].default_value = rough
    return m


MATS = {
    "Adobe": pmat("Adobe", (0.66, 0.47, 0.31)),
    "Wood": pmat("Wood", (0.30, 0.19, 0.10)),
    "Terra": pmat("Terra", (0.62, 0.36, 0.20)),
    "Paint": pmat("Paint", (0.55, 0.30, 0.18)),
    "Glow": pmat("Glow", (1.0, 0.74, 0.40)),
}


def empty(name):
    e = bpy.data.objects.new(name, None)
    bpy.context.scene.collection.objects.link(e)
    return e


def finish(ob, name, parent, smooth=False):
    ob.name = name
    key = next((k for k in MATS if name.startswith(k)), "Adobe")
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
    bm = bmesh.new()
    bm.from_mesh(me)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(me)
    bm.free()
    return finish(ob, name, parent)


def arch_band(name, parent, cx, cz, R, r, y0, y1, seg=10):
    """A semicircular arch band (annulus, flat bottom) in the x-z plane."""
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


def vplane(name, parent, w, h, cx, y, cz, urep=1.0, flip=False):
    bpy.ops.mesh.primitive_plane_add(size=1, location=(cx, y, cz))
    ob = bpy.context.active_object
    ob.scale = (w, h, 1)
    ob.rotation_euler.x = -math.pi / 2 if flip else math.pi / 2
    bpy.ops.object.transform_apply(scale=True, rotation=True)
    for d in ob.data.uv_layers.active.data:
        d.uv = (d.uv[0] * urep, d.uv[1])
    return finish(ob, name, parent)


# ================= Portal: thick plastered adobe entry =================
portal = empty("Portal")
DEPTH = 0.8
# thick plaster jamb masses (chamfered top-inner corner for a soft adobe read)
for side, tag in ((-1, "L"), (1, "R")):
    pts = [(side * DOOR_W / 2, 0.0), (side * HALL_W / 2, 0.0),
           (side * HALL_W / 2, DOOR_H + 0.9),
           (side * (DOOR_W / 2 + 0.35), DOOR_H + 0.9),
           (side * DOOR_W / 2, DOOR_H + 0.55)]
    jb = extrude_poly("Adobe_jamb" + tag, portal, pts, 0.0, DEPTH)
    box_uv(jb)
# round-log timber lintel (a bundle of vigas across the head)
for k in (-1, 0, 1):
    lg = cyl("Wood_lintel", portal, 0.16, 0.16, DOOR_W + 1.3,
             (0, 0.02 + (0.34 if k == 0 else 0.02), DOOR_H + 0.28 + abs(k) * 0.0),
             rot=(0, math.pi / 2, 0), verts=12)
# projecting viga ends above the lintel (Pueblo look)
for x in (-2.4, -1.2, 0, 1.2, 2.4):
    cyl("Wood_vigaend", portal, 0.13, 0.13, DEPTH + 0.5,
        (x, DEPTH / 2 - 0.2, DOOR_H + 0.95), rot=(math.pi / 2, 0, 0), verts=10)
# thick plaster header/parapet above
hd = cube("Adobe_parapet", portal, HALL_W, DEPTH, FACADE_H - (DOOR_H + 1.2),
          0, DEPTH / 2, (DOOR_H + 1.2 + FACADE_H) / 2)
box_uv(hd)
# painted stepped motif band across the parapet (texture assigned in JS)
vplane("Paint_band", portal, HALL_W - 0.6, 0.62, 0.0, -0.02, DOOR_H + 1.55, urep=5)
# low step threshold (adobe entry step) — set toward the viewer, outside door
stp = cube("Adobe_step", portal, DOOR_W + 0.6, 0.5, 0.16, 0, -0.4, 0.08)
box_uv(stp)
# backing frame — shoulders + header keep the doorway clear
BK_Y = DEPTH + 0.07
BK_T = 0.14
SIDE_W = (HALL_W - DOOR_W) / 2 + 0.1
for side, nm in ((-1, "Adobe_backL"), (1, "Adobe_backR")):
    b = cube(nm, portal, SIDE_W, BK_T, FACADE_H + 0.4,
             side * (DOOR_W / 2 + SIDE_W / 2), BK_Y, (FACADE_H + 0.4) / 2)
    box_uv(b)
bh = cube("Adobe_backHdr", portal, DOOR_W, BK_T, FACADE_H + 0.4 - DOOR_H,
          0, BK_Y, DOOR_H + (FACADE_H + 0.4 - DOOR_H) / 2)
box_uv(bh)


# ================= Niche: arched adobe niche =================
niche = empty("Niche")
ND = 0.24
OW = 0.5          # opening half-width
SPRING = 1.55     # arch spring height
SILL = 0.5
# jambs (sill -> spring)
for side, tag in ((-1, "L"), (1, "R")):
    pts = [(side * OW, SILL), (side * (OW + 0.22), SILL),
           (side * (OW + 0.22), SPRING), (side * OW, SPRING)]
    jb = extrude_poly("Adobe_niche" + tag, niche, pts, -ND, 0.0)
    box_uv(jb, scale=1.6)
# arched top surround
arch = arch_band("Adobe_nichearch", niche, 0.0, SPRING, OW + 0.22, OW, -ND, 0.0, seg=9)
box_uv(arch, scale=1.6)
# sill
sl = cube("Adobe_nichesill", niche, 2 * OW + 0.44, ND + 0.10, 0.20,
          0, -(ND + 0.10) / 2, SILL - 0.02)
box_uv(sl, scale=1.6)
# recessed back + warm glow
vplane("Adobe_nicheback", niche, 2 * OW, SPRING + OW - SILL, 0.0, 0.09,
       (SILL + SPRING + OW) / 2 - 0.05)
vplane("Glow_nicheback", niche, 2 * OW - 0.18, SPRING + OW - SILL - 0.25, 0.0, 0.045,
       (SILL + SPRING + OW) / 2 - 0.05)
# ceramic olla on the sill
cyl("Terra_potbody", niche, 0.13, 0.20, 0.30, (0, -0.02, SILL + 0.18), verts=14)
cyl("Terra_potneck", niche, 0.20, 0.12, 0.12, (0, -0.02, SILL + 0.39), verts=14)


# ================= Viga: round timber ceiling log =================
viga = empty("Viga")
cyl("Wood_viga", viga, 0.15, 0.15, HALL_W + 0.5,
    (0, 0, CEIL_H - 0.15), rot=(0, math.pi / 2, 0), verts=14)


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
aim((0.0, -12.0, 3.0), (0.0, 0.0, 2.6))
render(os.path.join(prev, "preview_adobe_portal.png"), {"Portal"})
aim((0.7, -3.0, 1.3), (0.0, 0.0, 1.3))
render(os.path.join(prev, "preview_adobe_niche.png"), {"Niche"})
