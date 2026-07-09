# Builds the early-Modern gallery (Art Deco, 1890-1930) assets →
# assets/models/modern.glb.  Shared by all four *-modern subsections.
# Concept: concept-art/subsections/{americas,europe,asia,middle-east}-modern —
# a refined early-modern gallery: skylit laylight ceiling + track lighting,
# painted plaster with a picture rail, terrazzo floor with an inlaid border,
# bronze deco railings, and a geometric Art Deco portal (blackened steel +
# bronze, sunburst transom, tube sconces).
#
#   /Applications/Blender.app/Contents/MacOS/Blender --background \
#       --python tools/build_modern_assets.py
#
# Named parts (JS re-materials by name prefix in corridor.js applyModernMats):
#   Portal — Art Deco geometric gate (stepped blackened-steel + bronze frame,
#            gold sunburst transom, flanking tube sconces). Backing keeps clear.
#   Rail   — low bronze deco railing unit set against the wall.
# Prefixes: Wall→plaster, Dark→blackened steel, Bronze→bronze, Deco→bright
#           brass motif, Glass→frosted glow.
import bpy
import math
import os

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "assets", "models", "modern.glb")

HALL_W = 7.0
CEIL_H = 4.8
DOOR_W, DOOR_H = 3.4, 3.5
FACADE_H = 6.2          # blank taller neighbours (Ottoman/Mughal 5.8) at the seam

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
    "Wall": pmat("Wall", (0.82, 0.80, 0.75), 0.9),
    "Dark": pmat("Dark", (0.10, 0.10, 0.11), 0.4, 0.7),
    "Bronze": pmat("Bronze", (0.55, 0.42, 0.20), 0.35, 0.8),
    "Deco": pmat("Deco", (0.80, 0.62, 0.28), 0.3, 0.85),
    "Glass": pmat("Glass", (1.0, 0.95, 0.85), 0.2),
}


def empty(name):
    e = bpy.data.objects.new(name, None)
    bpy.context.scene.collection.objects.link(e)
    return e


def finish(ob, name, parent, smooth=False):
    ob.name = name
    key = next((k for k in MATS if name.startswith(k)), "Wall")
    ob.data.materials.clear()
    ob.data.materials.append(MATS[key])
    if smooth:
        for p in ob.data.polygons:
            p.use_smooth = True
    ob.parent = parent
    return ob


def cube(name, parent, sx, sy, sz, cx, cy, cz, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add(size=1, location=(cx, cy, cz), rotation=rot)
    ob = bpy.context.active_object
    ob.scale = (sx, sy, sz)
    bpy.ops.object.transform_apply(scale=True)
    return finish(ob, name, parent)


def cyl(name, parent, r1, r2, h, loc, rot=(0, 0, 0), verts=16, smooth=True):
    bpy.ops.mesh.primitive_cone_add(vertices=verts, radius1=r1, radius2=r2,
                                    depth=h, location=loc, rotation=rot)
    return finish(bpy.context.active_object, name, parent, smooth)


# ================= Portal: Art Deco geometric gate =================
portal = empty("Portal")
DEPTH = 0.5
# stepped blackened-steel + bronze frame around the opening (three reveals)
reveals = [(0.0, "Dark", 0.20), (0.14, "Bronze", 0.10), (0.26, "Dark", 0.10)]
for off, mat, w in reveals:
    prd = -off - 0.02          # each step stands slightly more proud
    # jambs
    for side in (-1, 1):
        cube(mat + "_frameJ", portal, w, DEPTH + 2 * off, DOOR_H + 0.2 + off,
             side * (DOOR_W / 2 + off + w / 2), (DEPTH) / 2 - off, (DOOR_H + 0.2 + off) / 2)
    # lintel
    cube(mat + "_frameL", portal, DOOR_W + 2 * off + 2 * w, DEPTH + 2 * off, w,
         0, DEPTH / 2 - off, DOOR_H + 0.2 + off + w / 2)
# transom panel above the door
tw = DOOR_W + 0.9
cube("Wall_transom", portal, tw, DEPTH, 1.0, 0, DEPTH / 2, DOOR_H + 0.95)
# gold sunburst fan in the transom (radiating bars from bottom-centre)
for k in range(-3, 4):
    ang = k * 0.26
    cube("Deco_ray", portal, 0.07, 0.06, 0.86, 0, -0.02, DOOR_H + 0.98,
         rot=(0, -ang, 0))
cyl("Deco_hub", portal, 0.16, 0.16, 0.08, (0, -0.05, DOOR_H + 0.6),
    rot=(math.pi / 2, 0, 0), verts=20)
# stepped crown above the transom
cube("Dark_crown1", portal, tw + 0.5, DEPTH + 0.1, 0.16, 0, DEPTH / 2, DOOR_H + 1.55)
cube("Bronze_crown2", portal, tw + 0.2, DEPTH + 0.06, 0.08, 0, DEPTH / 2 - 0.02, DOOR_H + 1.68)
# flanking Art Deco tube sconces
for side in (-1, 1):
    cube("Bronze_sconceB", portal, 0.16, 0.22, 0.5, side * 2.55, -0.18, 2.5)
    cyl("Glass_sconce", portal, 0.09, 0.09, 0.8, (side * 2.55, -0.28, 2.5),
        rot=(0, 0, 0), verts=14)
# plaster field filling the facade above the crown
fld = cube("Wall_field", portal, HALL_W, DEPTH, FACADE_H - (DOOR_H + 1.75),
           0, DEPTH / 2, (DOOR_H + 1.75 + FACADE_H) / 2)
# plaster shoulders beside the door (so the frame reads against wall, not void)
for side in (-1, 1):
    cube("Wall_shoulder", portal, (HALL_W - DOOR_W) / 2 - 0.5, DEPTH, DOOR_H + 1.75,
         side * (DOOR_W / 2 + 0.5 + ((HALL_W - DOOR_W) / 2 - 0.5) / 2), DEPTH / 2,
         (DOOR_H + 1.75) / 2)
# backing frame (shoulders + header) keeps the doorway clear
BK_Y = DEPTH + 0.07
BK_T = 0.14
SIDE_W = (HALL_W - DOOR_W) / 2 + 0.1
for side, nm in ((-1, "Wall_backL"), (1, "Wall_backR")):
    cube(nm, portal, SIDE_W, BK_T, FACADE_H + 0.4,
         side * (DOOR_W / 2 + SIDE_W / 2), BK_Y, (FACADE_H + 0.4) / 2)
cube("Wall_backHdr", portal, DOOR_W, BK_T, FACADE_H + 0.4 - DOOR_H,
     0, BK_Y, DOOR_H + (FACADE_H + 0.4 - DOOR_H) / 2)


# ================= Rail: low bronze deco railing =================
# Modeled along X (corridor after rotation), protruding toward -Y.
rail = empty("Rail")
RL = 2.0            # length
RH = 0.92           # height
RY = -0.12          # standoff from wall
for x in (-RL / 2, 0, RL / 2):
    cube("Dark_post", rail, 0.06, 0.06, RH, x, RY, RH / 2)
for z in (0.42, RH - 0.04):
    cyl("Bronze_bar", rail, 0.03, 0.03, RL, (0, RY, z), rot=(0, math.pi / 2, 0), verts=10)


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
aim((0.0, -11.0, 3.0), (0.0, 0.0, 2.8))
render(os.path.join(prev, "preview_modern_portal.png"), {"Portal"})
