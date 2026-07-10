# Builds the Faith & Living Traditions assets → assets/models/traditions.glb.
# Concept: concept-art/subsections/africa-traditions (Hallway-28) — carved
# hardwood portal posts + lintel, wall posts, woven lantern sconces, plaster
# display niches. Carved-wood meshes are UV-mapped for the
# traditions_carved_hardwood albedo (assigned by JS).
#
#   /Applications/Blender.app/Contents/MacOS/Blender --background \
#       --python tools/build_traditions_assets.py
#
# Named parts (JS re-materials by name prefix):
#   Portal — carved post + lintel doorway in a plaster facade, 7 x 5.9
#            (covers the kingdoms neighbour at 4.8 and its own 4.6).
#            Opening 3.4 x 3.5.
#   Post   — carved hardwood wall post, EXACTLY 4.6 tall (= S.earthen ceilH).
#   Sconce — woven lantern: glowing half-cylinder in a wood frame.
#   Niche  — plaster display niche with wood shelf, pot + glow.
# Prefixes: Plaster→wall, Wood→carved hardwood, Glow→emissive, Terra→ceramic.
import bpy
import math
import os

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "assets", "models", "traditions.glb")

HALL_W = 7.0
CEIL_H = 4.6
DOOR_W, DOOR_H = 3.4, 3.5
FACADE_H = 5.9

bpy.ops.wm.read_factory_settings(use_empty=True)

def pmat(name, color):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes.get("Principled BSDF")
    b.inputs["Base Color"].default_value = (*color, 1.0)
    b.inputs["Roughness"].default_value = 0.92
    return m

MATS = {
    "Plaster": pmat("Plaster", (0.72, 0.6, 0.45)),
    "Wood": pmat("Wood", (0.2, 0.13, 0.08)),
    "Glow": pmat("Glow", (1.0, 0.72, 0.35)),
    "Terra": pmat("Terra", (0.45, 0.28, 0.16)),
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

def cyl(name, parent, r1, r2, h, loc, rot=(0, 0, 0), verts=14, smooth=True):
    bpy.ops.mesh.primitive_cone_add(vertices=verts, radius1=r1, radius2=r2,
                                    depth=h, location=loc, rotation=rot)
    return finish(bpy.context.active_object, name, parent, smooth)

def box_uv(ob, scale=1.6):
    me = ob.data
    uv = me.uv_layers.active or me.uv_layers.new(name="UVMap")
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

def vplane(name, parent, w, h, cx, y, cz, urep=1.0):
    bpy.ops.mesh.primitive_plane_add(size=1, location=(cx, y, cz))
    ob = bpy.context.active_object
    ob.scale = (w, h, 1)
    ob.rotation_euler.x = math.pi / 2
    bpy.ops.object.transform_apply(scale=True, rotation=True)
    for d in ob.data.uv_layers.active.data:
        d.uv = (d.uv[0] * urep, d.uv[1])
    return finish(ob, name, parent)

def carved_post(name, parent, r, h, zc, verts=12):
    """Segmented carved post: stacked drums with ring breaks, box-UV'd for
    the carved hardwood texture."""
    g = []
    n = 4
    seg = h / n
    for i in range(n):
        p = cyl(name, parent, r * (1.0 if i % 2 else 0.94),
                r * (0.94 if i % 2 else 1.0), seg,
                (0, 0, zc - h / 2 + (i + 0.5) * seg), verts=verts)
        box_uv(p, scale=1.1)
        g.append(p)
    return g

# ================= Portal: carved post + lintel doorway =================
portal = empty("Portal")
DEPTH = 0.6
# plaster facade: shoulders + header (the quiet ground the wood sits on)
for side in (-1, 1):
    s = cube("Plaster_shoulder", portal, (HALL_W - DOOR_W) / 2 - 0.0, DEPTH,
             FACADE_H, side * (DOOR_W / 2 + (HALL_W - DOOR_W) / 4),
             DEPTH / 2, FACADE_H / 2)
    box_uv(s, scale=3.2)
hd = cube("Plaster_header", portal, DOOR_W + 0.2, DEPTH, FACADE_H - DOOR_H - 0.5,
          0, DEPTH / 2, (FACADE_H + DOOR_H + 0.5) / 2)
box_uv(hd, scale=3.2)
# carved hardwood posts flanking the opening (proud of the plaster face)
for side in (-1, 1):
    carved_post("Wood_post", portal, 0.24, 4.15, 4.15 / 2 - 0.01)
    for ob in portal.children:
        if ob.name.startswith("Wood_post") and abs(ob.location.x) < 0.01:
            ob.location.x = side * (DOOR_W / 2 + 0.28)
            ob.location.y = 0.06
# massive carved lintel over the posts
lin = cube("Wood_lintel", portal, DOOR_W + 1.5, 0.5, 0.62, 0, 0.12, 4.35)
box_uv(lin, scale=1.3)
# carved side panels above the lintel corners
for side in (-1, 1):
    p = cube("Wood_panel", portal, 0.72, 0.14, 1.05,
             side * (DOOR_W / 2 + 0.55), 0.10, 5.2)
    box_uv(p, scale=1.1)

# ================= Post: carved hardwood wall post =================
post = empty("Post")
cube("Wood_postbase", post, 0.5, 0.5, 0.16, 0, 0, 0.08)
POST_R = 0.17
SHAFT_H = CEIL_H - 0.32
SHAFT_Z0 = 0.16
SHAFT_Z1 = SHAFT_Z0 + SHAFT_H
carved_post("Wood_postshaft", post, POST_R, SHAFT_H, SHAFT_H / 2 + SHAFT_Z0)
cube("Wood_postcap", post, 0.44, 0.44, 0.16, 0, 0, CEIL_H - 0.08)
# carved relief on the post: shallow ring grooves along the shaft + a
# diamond-notch band at mid-shaft (concept: carved hardwood totem posts)
for i, gz in enumerate((0.95, 1.65, 3.05, 3.75)):
    bpy.ops.mesh.primitive_torus_add(major_radius=POST_R + 0.015, minor_radius=0.022,
                                     location=(0, 0, gz), major_segments=16,
                                     minor_segments=6)
    finish(bpy.context.active_object, f"Wood_postgroove{i}", post, smooth=True)
MID_Z = (SHAFT_Z0 + SHAFT_Z1) / 2
N_DIAMOND = 8
for i in range(N_DIAMOND):
    ang = i * (2 * math.pi / N_DIAMOND)
    dx = (POST_R - 0.02) * math.cos(ang)
    dy = (POST_R - 0.02) * math.sin(ang)
    bpy.ops.mesh.primitive_cube_add(size=1, location=(dx, dy, MID_Z))
    ob = bpy.context.active_object
    ob.scale = (0.09, 0.09, 0.09)
    ob.rotation_euler = (0, 0, ang + math.pi / 4)
    bpy.ops.object.transform_apply(scale=True, rotation=True)
    finish(ob, f"Wood_postdiamond{i}", post, smooth=False)

# ================= Sconce: woven lantern =================
sconce = empty("Sconce")
# glowing half-cylinder (full cyl is fine, half hides in the wall)
cyl("Glow_lantern", sconce, 0.16, 0.16, 0.52, (0, 0, 0), verts=10)
cube("Wood_scTop", sconce, 0.38, 0.38, 0.05, 0, 0, 0.29)
cube("Wood_scBot", sconce, 0.38, 0.38, 0.05, 0, 0, -0.29)

# ================= Niche: plaster display niche =================
niche = empty("Niche")
NW, NH, ND = 1.0, 1.7, 0.38
sl = cube("Plaster_nL", niche, 0.24, ND, NH, -(NW - 0.24) / 2, -ND / 2, NH / 2)
sr = cube("Plaster_nR", niche, 0.24, ND, NH, (NW - 0.24) / 2, -ND / 2, NH / 2)
st = cube("Plaster_nT", niche, NW, ND, 0.26, 0, -ND / 2, NH - 0.13)
for ob in (sl, sr, st):
    box_uv(ob, scale=2.4)
sb = cube("Wood_nShelf", niche, NW, ND, 0.30, 0, -ND / 2, 0.32)
box_uv(sb, scale=1.2)
vplane("Glow_nBack", niche, NW - 0.5, NH - 0.75, 0.0, -0.03, (NH + 0.45) / 2 - 0.28)
cyl("Terra_nPot", niche, 0.09, 0.15, 0.24, (0, -ND / 2, 0.6), verts=12)

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
aim((0.0, -12.0, 2.8), (0.0, 0.0, 2.8))
render(os.path.join(prev, "preview_tr_portal.png"), {"Portal"})
aim((1.4, -4.2, 1.2), (0.0, 0.0, 1.0))
render(os.path.join(prev, "preview_tr_niche.png"), {"Niche", "Sconce"})
aim((0.9, -1.1, 2.3), (0.0, 0.0, 2.3))
render(os.path.join(prev, "preview_tr_post.png"), {"Post"})
aim((1.7, -2.1, 2.3), (0.0, 0.0, 2.3))
render(os.path.join(prev, "preview_tr_post_full.png"), {"Post"})
