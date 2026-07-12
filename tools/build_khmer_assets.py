# Builds the Southeast Asia (Khmer / Angkor sandstone) assets →
# assets/models/khmer.glb.
# Concept: concept-art/subsections/asia-southeast (Hallway-22) — a sandstone
# gallery of carved bas-relief panels (apsaras + floral) framed by colonnette
# pilasters, a carved sandstone temple doorway with a lintel relief + pediment,
# a corbelled timber-accented ceiling, and grazing uplights.
#
#   /Applications/Blender.app/Contents/MacOS/Blender --background \
#       --python tools/build_khmer_assets.py
#
# Named parts (JS re-materials by name prefix in corridor.js applyKhmerMats):
#   Portal   — carved doorway: flanking colonnettes, lintel + pediment relief,
#              layered step threshold, lotus base band. Backing keeps clear.
#   Pilaster — engaged Khmer colonnette (stepped base + carved capital).
#   Relief   — framed sandstone bas-relief panel; "Relief" field textured in JS.
#   Beam     — timber ceiling beam.
# Prefixes: Sand→sandstone, Wood→timber, Relief→carved field (texture in JS),
#           Deity→lintel/pediment relief field (texture in JS), Glow→emissive.
import bpy
import math
import os
import bmesh

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "assets", "models", "khmer.glb")

HALL_W = 7.0
CEIL_H = 5.2
DOOR_W, DOOR_H = 3.4, 3.5
FACADE_H = 5.6

bpy.ops.wm.read_factory_settings(use_empty=True)


def pmat(name, color, rough=0.95):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes.get("Principled BSDF")
    b.inputs["Base Color"].default_value = (*color, 1.0)
    b.inputs["Roughness"].default_value = rough
    return m


MATS = {
    "Sand": pmat("Sand", (0.49, 0.47, 0.40)),
    "Wood": pmat("Wood", (0.26, 0.17, 0.10)),
    "Relief": pmat("Relief", (0.52, 0.50, 0.43)),
    "Deity": pmat("Deity", (0.50, 0.48, 0.41)),
    "Glow": pmat("Glow", (1.0, 0.78, 0.42)),
}


def empty(name):
    e = bpy.data.objects.new(name, None)
    bpy.context.scene.collection.objects.link(e)
    return e


def finish(ob, name, parent, smooth=False):
    ob.name = name
    key = next((k for k in MATS if name.startswith(k)), "Sand")
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


def vplane(name, parent, w, h, cx, y, cz):
    bpy.ops.mesh.primitive_plane_add(size=1, location=(cx, y, cz))
    ob = bpy.context.active_object
    ob.scale = (w, h, 1)
    ob.rotation_euler.x = math.pi / 2
    bpy.ops.object.transform_apply(scale=True, rotation=True)
    return finish(ob, name, parent)


def colonnette(prefix, parent, cx, cy, base_z, top_z):
    """A slender Khmer engaged colonnette (ringed shaft, stepped base+cap)."""
    h = top_z - base_z
    cube(prefix + "_base", parent, 0.44, 0.30, 0.30, cx, cy, base_z + 0.15)
    sh = cyl(prefix + "_shaft", parent, 0.15, 0.15, h - 0.7,
             (cx, cy, base_z + 0.35 + (h - 0.7) / 2), verts=12)
    # ring mouldings up the shaft
    for i in range(1, 5):
        z = base_z + 0.35 + i * (h - 0.9) / 5
        cyl(prefix + "_ring", parent, 0.18, 0.18, 0.06, (cx, cy, z),
            rot=(0, 0, 0), verts=12)
    cube(prefix + "_cap", parent, 0.4, 0.34, 0.34, cx, cy, top_z - 0.18)
    return sh


# ================= Portal: carved sandstone doorway =================
portal = empty("Portal")
DEPTH = 0.7
# flanking colonnettes just outside the opening
for side in (-1, 1):
    colonnette("Sand", portal, side * (DOOR_W / 2 + 0.35), -0.05, 0.0, DOOR_H + 0.1)
# tall apsara relief panels on the door shoulders
for side, tag in ((-1, "L"), (1, "R")):
    fw = (HALL_W / 2 - (DOOR_W / 2 + 0.7))
    fx = side * (DOOR_W / 2 + 0.7 + fw / 2)
    cube("Sand_jamb" + tag, portal, fw, DEPTH, DOOR_H + 0.1, fx, DEPTH / 2, (DOOR_H + 0.1) / 2)
    vplane("Relief_jamb" + tag, portal, fw - 0.3, DOOR_H - 0.5, fx, -0.02, (DOOR_H) / 2)
# carved lintel block + relief band
lin = cube("Sand_lintel", portal, DOOR_W + 1.9, DEPTH + 0.2, 0.7,
           0, DEPTH / 2 - 0.1, DOOR_H + 0.45)
box_uv(lin)
vplane("Deity_lintel", portal, DOOR_W + 0.8, 0.5, 0.0, -0.22, DOOR_H + 0.45)
# stepped pediment (tympanum) above the lintel with a seated-figure relief
ped = extrude_poly("Sand_pediment", portal,
                   [(-(DOOR_W / 2 + 1.0), DOOR_H + 0.8),
                    (DOOR_W / 2 + 1.0, DOOR_H + 0.8),
                    (DOOR_W / 2 + 0.5, DOOR_H + 1.9),
                    (-(DOOR_W / 2 + 0.5), DOOR_H + 1.9)], 0.0, DEPTH)
box_uv(ped)
vplane("Deity_pediment", portal, 1.5, 0.9, 0.0, -0.02, DOOR_H + 1.25)
# lotus base band across the foot
cube("Sand_lotus", portal, HALL_W, DEPTH + 0.08, 0.24, 0, DEPTH / 2, 0.12)
# Layered sandstone threshold translated into two flush inlay courses so the
# museum route stays level while retaining the original depth cue.
for i, w in enumerate([DOOR_W + 1.2, DOOR_W + 0.6]):
    cube("Sand_step", portal, w, 0.34 - i * 0.12, 0.025, 0, -0.5 + i * 0.16, 0.0125)
# brick/sandstone field above the pediment to the facade top
cube("Sand_field", portal, HALL_W, DEPTH, FACADE_H - (DOOR_H + 1.9),
     0, DEPTH / 2, (DOOR_H + 1.9 + FACADE_H) / 2)
# backing frame keeps the doorway clear
BK_Y = DEPTH + 0.07
BK_T = 0.14
SIDE_W = (HALL_W - DOOR_W) / 2 + 0.1
for side, nm in ((-1, "Sand_backL"), (1, "Sand_backR")):
    cube(nm, portal, SIDE_W, BK_T, FACADE_H + 0.4,
         side * (DOOR_W / 2 + SIDE_W / 2), BK_Y, (FACADE_H + 0.4) / 2)
cube("Sand_backHdr", portal, DOOR_W, BK_T, FACADE_H + 0.4 - DOOR_H,
     0, BK_Y, DOOR_H + (FACADE_H + 0.4 - DOOR_H) / 2)


# ================= Pilaster: engaged Khmer colonnette =================
pilaster = empty("Pilaster")
colonnette("Sand", pilaster, 0.0, -0.14, 0.0, CEIL_H)


# ================= Relief: framed bas-relief panel =================
relief = empty("Relief")
RW, RH = 1.2, 2.6
cube("Sand_relframe", relief, RW + 0.24, 0.14, RH + 0.24, 0, -0.07, RH / 2)
vplane("Relief_field", relief, RW, RH, 0.0, -0.15, RH / 2)


# ================= Beam: timber ceiling beam =================
beam = empty("Beam")
cube("Wood_beam", beam, HALL_W + 0.3, 0.24, 0.30, 0, 0, CEIL_H - 0.16)


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
aim((0.0, -12.0, 3.2), (0.0, 0.0, 3.0))
render(os.path.join(prev, "preview_khmer_portal.png"), {"Portal"})
