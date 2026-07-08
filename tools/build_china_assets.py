# Builds the China (Tang/Song) architectural assets and exports them as
# assets/models/china.glb.
#
#   /Applications/Blender.app/Contents/MacOS/Blender --background \
#       --python tools/build_china_assets.py
#
# Modeled in Blender coords (Z up, corridor along +Y); glTF export converts
# to Three.js coords (Y up, corridor along -Z).
#
# Scene layout (object names are the contract with js/corridor.js):
#   Portal — 7.0 x 5.4 facade slab with a circular moon-gate opening
#            (r 1.95, centre 1.30 above the floor — floor half-chord 1.45,
#            comfortably wider than the 1.28 collision half-width), dark
#            ring frames + lining, tiled eave with brackets along the top.
#   Column — red lacquered shaft on a stone drum base with a simplified
#            dougong bracket cluster, exactly ceilH (5.4) tall.
import bpy
import math
import os

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "assets", "models", "china.glb")

HALL_W = 7.0
CEIL_H = 5.4      # china ceilH in styles.js
T = 0.55          # facade slab thickness

GATE_R = 1.95     # moon-gate opening radius
GATE_CY = 1.30    # opening centre height

# ---------------- helpers (same conventions as build_gothic_assets.py) ----

def pmat(name, color, rough=0.9, metal=0.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    bsdf = m.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*color, 1.0)
    bsdf.inputs["Roughness"].default_value = rough
    bsdf.inputs["Metallic"].default_value = metal
    return m

def box_uv(me, scale=4.0):
    uv = me.uv_layers.new(name="UVMap")
    for poly in me.polygons:
        n = poly.normal
        ax = max(range(3), key=lambda i: abs(n[i]))
        for li in poly.loop_indices:
            co = me.vertices[me.loops[li].vertex_index].co
            if ax == 0:
                uv.data[li].uv = (co.y / scale, co.z / scale)
            elif ax == 1:
                uv.data[li].uv = (co.x / scale, co.z / scale)
            else:
                uv.data[li].uv = (co.x / scale, co.y / scale)

def finish(ob, name, parent, mat, smooth=False):
    ob.name = name
    for p in ob.data.polygons:
        p.use_smooth = smooth
    ob.data.materials.append(mat)
    box_uv(ob.data)
    ob.parent = parent
    ob.select_set(False)
    return ob

def box(name, loc, dim, parent, mat, rot=None, bevel=0.0):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    ob = bpy.context.active_object
    ob.scale = dim
    if rot:
        ob.rotation_euler = rot
    bpy.ops.object.transform_apply(scale=True)
    if bevel > 0:
        m = ob.modifiers.new("bev", "BEVEL")
        m.width = bevel
        m.segments = 2
        bpy.ops.object.modifier_apply(modifier="bev")
    return finish(ob, name, parent, mat)

def cyl(name, loc, r, depth, parent, mat, rot=None, r2=None, verts=24):
    if r2 is None:
        r2 = r
    bpy.ops.mesh.primitive_cone_add(vertices=verts, radius1=r, radius2=r2,
                                    depth=depth, location=loc)
    ob = bpy.context.active_object
    if rot:
        ob.rotation_euler = rot
        bpy.ops.object.transform_apply(rotation=True)
    return finish(ob, name, parent, mat, smooth=True)

def torus(name, loc, major, minor, parent, mat):
    bpy.ops.mesh.primitive_torus_add(major_radius=major, minor_radius=minor,
                                     location=loc,
                                     rotation=(math.pi / 2, 0, 0),
                                     major_segments=48, minor_segments=12)
    return finish(bpy.context.active_object, name, parent, mat, smooth=True)

def empty(name):
    e = bpy.data.objects.new(name, None)
    bpy.context.scene.collection.objects.link(e)
    return e

# ================= build =================
bpy.ops.wm.read_factory_settings(use_empty=True)

LACQUER = pmat("Lacquer", (0.42, 0.09, 0.06), rough=0.5)
DARK = pmat("DarkWood", (0.055, 0.035, 0.022), rough=0.8)
STONE = pmat("Stone", (0.44, 0.42, 0.38))

# ---------------- the moon-gate portal ----------------
portal = empty("Portal")

# red slab with the circular opening cut through
slab = box("Slab", (0, T / 2, CEIL_H / 2), (HALL_W, T, CEIL_H), portal, LACQUER)
bpy.ops.mesh.primitive_cylinder_add(vertices=64, radius=GATE_R, depth=3.0,
                                    location=(0, T / 2, GATE_CY),
                                    rotation=(math.pi / 2, 0, 0))
cutter = bpy.context.active_object
bpy.context.view_layer.objects.active = slab
mod = slab.modifiers.new("cut", "BOOLEAN")
mod.operation = "DIFFERENCE"
mod.object = cutter
mod.solver = "EXACT"
bpy.ops.object.modifier_apply(modifier="cut")
bpy.data.objects.remove(cutter)
box_uv(slab.data)  # re-project after the cut

# dark ring frames on both faces + a lining tube through the reveal
torus("RingF", (0, 0.02, GATE_CY), GATE_R + 0.07, 0.15, portal, DARK)
torus("RingB", (0, T - 0.02, GATE_CY), GATE_R + 0.07, 0.15, portal, DARK)
bpy.ops.mesh.primitive_cylinder_add(vertices=64, radius=GATE_R + 0.02,
                                    depth=T + 0.1, end_fill_type="NOTHING",
                                    location=(0, T / 2, GATE_CY),
                                    rotation=(math.pi / 2, 0, 0))
finish(bpy.context.active_object, "Lining", portal, DARK, smooth=True)

# tiled eave roof along the top of the facade, with brackets beneath
box("Eave", (0, -0.18, 5.10), (HALL_W + 0.3, 0.85, 0.13), portal, DARK,
    rot=(0.35, 0, 0))
box("Fascia", (0, -0.50, 4.93), (HALL_W + 0.3, 0.10, 0.17), portal, DARK)
box("Ridge", (0, -0.02, 5.36), (HALL_W + 0.3, 0.34, 0.10), portal, DARK)
for i, x in enumerate(range(-3, 4)):
    box(f"Bracket{i}", (x * 1.0, -0.13, 4.70), (0.14, 0.30, 0.42), portal, DARK)

# ---------------- the column (dougong capital) ----------------
col = empty("Column")

cyl("BaseDrum", (0, 0, 0.09), 0.30, 0.18, col, STONE)
torus("BaseRing", (0, 0, 0.20), 0.21, 0.055, col, STONE)
# BaseRing torus was built standing (XZ); lay it flat again
br = bpy.data.objects["BaseRing"]
br.rotation_euler = (math.pi / 2, 0, 0)
bpy.context.view_layer.objects.active = br
br.select_set(True)
bpy.ops.object.transform_apply(rotation=True)
br.select_set(False)

cyl("Shaft", (0, 0, 2.40), 0.165, 4.40, col, LACQUER)
box("DouBlock", (0, 0, 4.68), (0.30, 0.30, 0.16), col, DARK, bevel=0.03)
box("ArmX1", (0, 0, 4.82), (0.85, 0.17, 0.13), col, DARK, bevel=0.03)
box("ArmY1", (0, 0, 4.82), (0.17, 0.85, 0.13), col, DARK, bevel=0.03)
box("ArmX2", (0, 0, 4.97), (1.30, 0.19, 0.14), col, DARK, bevel=0.03)
box("ArmY2", (0, 0, 4.97), (0.19, 1.30, 0.14), col, DARK, bevel=0.03)
box("CapPlate", (0, 0, 5.10), (0.52, 0.52, 0.12), col, DARK, bevel=0.03)
box("Riser", (0, 0, 5.28), (0.24, 0.24, 0.24), col, DARK)

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
bpy.context.scene.collection.objects.link(cam)
scene.camera = cam
cam_data.lens = 24

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
aim((0.0, -9.5, 2.6), (0.0, 0.0, 2.7))
render(os.path.join(prev, "preview_china_portal.png"), {"Portal"})
aim((2.6, -2.6, 2.6), (0.0, 0.0, 2.6))
render(os.path.join(prev, "preview_china_column.png"), {"Column"})
