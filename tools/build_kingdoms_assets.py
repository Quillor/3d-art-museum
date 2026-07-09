# Builds the Kingdoms-of-Africa (Sahel banco) assets → assets/models/kingdoms.glb.
# Concept: concept-art/subsections/africa-kingdoms (Hallway-27) — mud-plaster
# gate with toron beam projections, sculpted artifact niches, timber ceiling.
#
#   /Applications/Blender.app/Contents/MacOS/Blender --background \
#       --python tools/build_kingdoms_assets.py
#
# Named parts (JS re-materials by name prefix):
#   Portal — banco gate 7 x 6.05, tapered rounded buttresses, toron pegs,
#            timber lintel, painted band. Opening 3.4 x 3.5 (doorW/H).
#   Niche  — sculpted display niche (protrudes 0.40 <= 0.42 so players can't
#            reach it: no collider needed) with terracotta pot + glow.
#   Beam   — round toron ceiling timber spanning the 7 m hall.
# Prefixes: Banco→wall, Timber→dark wood, Band→painted band, Terra→terracotta,
#           Glow→emissive.
import bpy
import math
import os

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "assets", "models", "kingdoms.glb")

HALL_W = 7.0
CEIL_H = 4.8
DOOR_W, DOOR_H = 3.4, 3.5
FACADE_H = 6.05          # covers the taller Egypt neighbour (5.8)

bpy.ops.wm.read_factory_settings(use_empty=True)

def pmat(name, color):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes.get("Principled BSDF")
    b.inputs["Base Color"].default_value = (*color, 1.0)
    b.inputs["Roughness"].default_value = 0.95
    return m

MATS = {
    "Banco": pmat("Banco", (0.62, 0.45, 0.29)),
    "Timber": pmat("Timber", (0.24, 0.16, 0.10)),
    "Band": pmat("Band", (0.6, 0.4, 0.25)),
    "Terra": pmat("Terra", (0.55, 0.3, 0.17)),
    "Glow": pmat("Glow", (1.0, 0.75, 0.4)),
}

def empty(name):
    e = bpy.data.objects.new(name, None)
    bpy.context.scene.collection.objects.link(e)
    return e

def finish(ob, name, parent, smooth=False):
    ob.name = name
    key = next((k for k in MATS if name.startswith(k)), "Banco")
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

def prism(name, parent, x_lo, x_hi, y_lo, y_hi, z_lo, z_hi,
          top_shrink_x=0.0, top_shrink_y=0.0):
    """Box whose top face shrinks inward — hand-shaped banco taper."""
    cx = (x_lo + x_hi) / 2
    v = [
        (x_lo, y_lo, z_lo), (x_hi, y_lo, z_lo),
        (x_hi, y_hi, z_lo), (x_lo, y_hi, z_lo),
        (x_lo + top_shrink_x if x_lo < cx else x_lo - top_shrink_x,
         y_lo + top_shrink_y, z_hi),
        (x_hi - top_shrink_x if x_hi > cx else x_hi + top_shrink_x,
         y_lo + top_shrink_y, z_hi),
        (x_hi - top_shrink_x if x_hi > cx else x_hi + top_shrink_x,
         y_hi - top_shrink_y, z_hi),
        (x_lo + top_shrink_x if x_lo < cx else x_lo - top_shrink_x,
         y_hi - top_shrink_y, z_hi),
    ]
    f = [(0, 1, 2, 3), (7, 6, 5, 4), (0, 4, 5, 1),
         (1, 5, 6, 2), (2, 6, 7, 3), (3, 7, 4, 0)]
    me = bpy.data.meshes.new(name)
    me.from_pydata(v, [], f)
    me.update()
    ob = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(ob)
    return finish(ob, name, parent)

def box_uv(ob, scale=3.5):
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

def vplane(name, parent, w, h, cx, y, cz, urep=1.0, flip=False):
    bpy.ops.mesh.primitive_plane_add(size=1, location=(cx, y, cz))
    ob = bpy.context.active_object
    ob.scale = (w, h, 1)
    ob.rotation_euler.x = -math.pi / 2 if flip else math.pi / 2  # flip: face +Y (room)
    bpy.ops.object.transform_apply(scale=True, rotation=True)
    for d in ob.data.uv_layers.active.data:
        d.uv = (d.uv[0] * urep, d.uv[1])
    return finish(ob, name, parent)

# ================= Portal: banco gate =================
portal = empty("Portal")
DEPTH = 0.9
# tapered rounded buttress towers (front faces Blender -Y = Three +Z)
for side, name in ((-1, "Banco_towerL"), (1, "Banco_towerR")):
    t = prism(name, portal, side * DOOR_W / 2, side * HALL_W / 2,
              0.0, DEPTH, 0.0, 6.05, top_shrink_x=0.28, top_shrink_y=0.16)
    box_uv(t)
# rounded caps on the towers
for side in (-1, 1):
    c = cyl("Banco_cap", portal, 0.62, 0.30, 0.55,
            (side * (DOOR_W / 2 + (HALL_W - DOOR_W) / 4), DEPTH / 2, 6.15),
            verts=10)
    box_uv(c)
# header above the timber lintel
hd = prism("Banco_header", portal, -DOOR_W / 2 - 0.1, DOOR_W / 2 + 0.1,
           0.10, 0.82, 3.80, 6.05, top_shrink_x=0.05)
box_uv(hd)
# heavy timber lintel
cube("Timber_lintel", portal, DOOR_W + 0.9, 0.72, 0.42, 0, 0.38, DOOR_H + 0.2)
# painted geometric band across the header (one texture tile ~2.5 m)
vplane("Band_header", portal, 3.3, 0.72, 0.0, 0.055, 5.1, urep=1.3)
# backing frame: the tapered towers pull away from the side walls near the
# top, so a slab behind them blanks any see-through gap. It must NOT cover
# the doorway itself, though — a full slab there reads as a walled-off gate
# with no opening. So the backing is a frame: full-height slabs behind each
# tower + a header slab above the door, leaving the DOOR_W x DOOR_H opening
# clear (you can now see through into the gallery).
BK_Y = DEPTH + 0.07                       # backing-plane centre (Y)
BK_T = 0.14                               # backing thickness
SIDE_W = (HALL_W - DOOR_W) / 2 + 0.1      # width of one side backing slab
for side, nm in ((-1, "Banco_backL"), (1, "Banco_backR")):
    b = cube(nm, portal, SIDE_W, BK_T, FACADE_H + 0.4,
             side * (DOOR_W / 2 + SIDE_W / 2), BK_Y, (FACADE_H + 0.4) / 2)
    box_uv(b)
bh = cube("Banco_backHdr", portal, DOOR_W, BK_T, FACADE_H + 0.4 - DOOR_H,
          0, BK_Y, DOOR_H + (FACADE_H + 0.4 - DOOR_H) / 2)
box_uv(bh)

# toron pegs: thick, short, banco-toned stubs — top two rows only (concept).
# Placed on BOTH faces so the gate reads the same from inside the gallery.
IN_Y = BK_Y + BK_T / 2                     # interior wall face (room side)
for side in (-1, 1):
    xc = side * (DOOR_W / 2 + (HALL_W - DOOR_W) / 4)
    for row, zr in enumerate((4.6, 5.45)):
        for k in (-1, 0, 1):
            x = xc + k * 0.55
            z = zr + (row % 2) * 0.10
            p = cyl("Banco_toron", portal, 0.115, 0.10, 0.38,
                    (x, -0.05, z), rot=(math.pi / 2, 0, 0), verts=9)
            box_uv(p, scale=1.2)
            pi = cyl("Banco_toron", portal, 0.115, 0.10, 0.38,
                     (x, IN_Y + 0.05, z), rot=(math.pi / 2, 0, 0), verts=9)
            box_uv(pi, scale=1.2)

# interior gate dressing so the entrance matches the outer view from inside:
# a timber lintel across the doorway head + the painted geometric band,
# both facing the gallery (+Y).
cube("Timber_lintelIn", portal, DOOR_W + 0.9, 0.72, 0.42,
     0, IN_Y + 0.21, DOOR_H + 0.2)
vplane("Band_headerIn", portal, 3.3, 0.72, 0.0, IN_Y + 0.02, 5.1,
       urep=1.3, flip=True)

# ================= Niche: sculpted artifact display =================
# Modeled facing -Y (placed on walls with rotation.y = -side*pi/2).
niche = empty("Niche")
NW, NH, ND = 1.15, 2.0, 0.40
# sculpted surround: U-shaped banco mass around a recessed cavity
sl = prism("Banco_nicheL", niche, -NW / 2, -NW / 2 + 0.26, -ND, 0.0, 0.0, NH,
           top_shrink_y=0.04)
sr = prism("Banco_nicheR", niche, NW / 2 - 0.26, NW / 2, -ND, 0.0, 0.0, NH,
           top_shrink_y=0.04)
st = cube("Banco_nicheTop", niche, NW, ND, 0.30, 0, -ND / 2, NH - 0.15)
sb = cube("Banco_nicheSill", niche, NW, ND, 0.42, 0, -ND / 2, 0.21)
for ob in (sl, sr, st, sb):
    box_uv(ob, scale=2.0)
# warm glow backplate: a low concealed uplight wash behind the vessel — kept
# short so it reads as warm hidden light in the recess, not a tall pale bar
# towering above the pot (concept: recessed uplights, discreet spotlights).
vplane("Glow_back", niche, NW - 0.52, 0.86, 0.0, -0.05, 0.72)
# terracotta pot on the sill — substantial display vessel
cyl("Terra_potbody", niche, 0.13, 0.21, 0.34, (0, -ND / 2, 0.59), verts=14)
cyl("Terra_potneck", niche, 0.21, 0.11, 0.16, (0, -ND / 2, 0.84), verts=14)

# ================= Beam: round toron ceiling timber =================
beam = empty("Beam")
cyl("Timber_beam", beam, 0.085, 0.085, HALL_W + 0.3,
    (0, 0, CEIL_H - 0.085), rot=(0, math.pi / 2, 0), verts=9)

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
aim((0.0, -12.0, 3.0), (0.0, 0.0, 3.0))
render(os.path.join(prev, "preview_kg_portal.png"), {"Portal"})
aim((0.8, -3.6, 1.2), (0.0, 0.0, 1.0))
render(os.path.join(prev, "preview_kg_niche.png"), {"Niche"})
