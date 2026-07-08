# Builds the Americas 19th-century salon assets → assets/models/amsalon.glb.
# Concept: concept-art/subsections/americas-19th-century (Hallway-05) —
# carved dark-wood door surround with gilded entablature + crest, and
# gaslight globe sconces.
#
#   /Applications/Blender.app/Contents/MacOS/Blender --background \
#       --python tools/build_amsalon_assets.py
#
# Named parts (JS re-materials by name prefix):
#   Portal — walnut surround w/ gilt bands + crest in a wallpapered facade,
#            7 x 5.5 (covers own 5.2 ceilH + adobe 4.6 neighbour).
#            Opening 3.4 x 3.5.
#   Sconce — gaslight: wood back plate, brass arm, glowing globe.
# Prefixes: Paper→wallpaper (style.wall), Wood→walnut, Gilt→brass/gold,
#           Globe→emissive white-warm.
import bpy
import math
import os

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "assets", "models", "amsalon.glb")

HALL_W = 7.0
DOOR_W, DOOR_H = 3.4, 3.5
FACADE_H = 5.5

bpy.ops.wm.read_factory_settings(use_empty=True)

def pmat(name, color, rough=0.7):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes.get("Principled BSDF")
    b.inputs["Base Color"].default_value = (*color, 1.0)
    b.inputs["Roughness"].default_value = rough
    return m

MATS = {
    "Paper": pmat("Paper", (0.42, 0.2, 0.2), 0.9),
    "Wood": pmat("Wood", (0.2, 0.12, 0.07), 0.55),
    "Gilt": pmat("Gilt", (0.75, 0.58, 0.25), 0.35),
    "Band": pmat("Band", (0.72, 0.56, 0.24), 0.4),  # JS swaps in the wall band texture
    "Globe": pmat("Globe", (1.0, 0.93, 0.78), 0.5),
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

def box_uv(ob, scale=2.4):
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

def band_uv(ob, length, urep=1.0):
    """Horizontal trim bar: X -> U (tiling `urep` times), Z -> V (0..1 over the
    bar height). Matches how the corridor walls map the same band texture."""
    me = ob.data
    zs = [v.co.z for v in me.vertices]
    xs = [v.co.x for v in me.vertices]
    z0, z1, x0 = min(zs), max(zs), min(xs)
    uv = me.uv_layers.active or me.uv_layers.new(name="UVMap")
    for poly in me.polygons:
        for li in poly.loop_indices:
            co = me.vertices[me.loops[li].vertex_index].co
            u = (co.x - x0) / length * urep
            v = (co.z - z0) / (z1 - z0) if z1 > z0 else 0.0
            uv.data[li].uv = (u, v)

# ================= Portal: walnut + gilt surround =================
portal = empty("Portal")
DEPTH = 0.5
# wallpapered facade shoulders + header
BAND_Y, BAND_H = 4.55, 0.42  # must match S.amsalon.band in styles.js
for side in (-1, 1):
    s = cube("Paper_shoulder", portal, (HALL_W - DOOR_W) / 2, DEPTH, FACADE_H,
             side * (DOOR_W / 2 + (HALL_W - DOOR_W) / 4), DEPTH / 2,
             FACADE_H / 2)
    box_uv(s)
    # ornate gilt crown strip on the shoulder's hall-facing surface, at the
    # corridor's ceiling-band height and TEXTURED with the same band as the
    # walls (Band_ prefix -> style.band.mat in JS) so the crown reads as one
    # continuous ornate line into the doorway corner
    sw = (HALL_W - DOOR_W) / 2 - 0.02
    sb = cube("Band_shoulder", portal, sw, 0.06, BAND_H,
              side * (DOOR_W / 2 + (HALL_W - DOOR_W) / 4), DEPTH + 0.03, BAND_Y)
    band_uv(sb, sw, urep=sw / 1.7)
hd = cube("Paper_header", portal, DOOR_W + 0.2, DEPTH, FACADE_H - DOOR_H - 0.2,
          0, DEPTH / 2, (FACADE_H + DOOR_H + 0.2) / 2)
box_uv(hd)
# The columns AND the whole doorframe crown are built IDENTICALLY on both
# faces of the reveal so the doorway looks the same walking either way:
#   approach face  y≈0.02  (proud toward -Y),  interior face y≈DEPTH-0.02.
# The gilt line across the top is the ornate wall-crown BAND texture (Band_
# prefix), at the exact same height (BAND_Y) as the corridor crown molding —
# not solid gold and not a separate lower entablature line.
PIL_TOP = 4.30
DHW = DOOR_W + 1.15                       # door-head band width
for y, fy, ynorm in ((0.02, -0.115, -0.03), (DEPTH - 0.02, DEPTH + 0.115, DEPTH + 0.03)):
    # fluted walnut pilasters up to the crown line
    for side in (-1, 1):
        x = side * (DOOR_W / 2 + 0.3)
        cube("Wood_pilaster", portal, 0.52, 0.24, PIL_TOP, x, y, PIL_TOP / 2)
        for k in (-1, 1):
            cube("Wood_flute", portal, 0.09, 0.05, PIL_TOP - 0.32,
                 x + k * 0.15, fy, (PIL_TOP - 0.32) / 2)
        cube("Gilt_pcap", portal, 0.6, 0.3, 0.14, x, y, PIL_TOP + 0.03)
        cube("Wood_pbase", portal, 0.6, 0.3, 0.3, x, y, 0.15)
    # wood architrave lintel directly over the opening
    cube("Wood_architrave", portal, DOOR_W + 1.2, 0.28, 0.24, 0, y, DOOR_H + 0.24)
    # ornate gilt band across the full door head, at the wall-crown height
    bh = cube("Band_doorhead", portal, DHW, 0.05, BAND_H, 0, ynorm, BAND_Y)
    band_uv(bh, DHW, urep=DHW / 1.7)
    # slim wood cornice capping the band
    cube("Wood_cornice", portal, DOOR_W + 1.5, 0.34, 0.14, 0, y, BAND_Y + BAND_H / 2 + 0.13)
    # crest: gilt medallion on a bar, above the cornice (kept under ceilH 5.2)
    cube("Gilt_crestbar", portal, 1.4, 0.16, 0.12, 0, y, BAND_Y + 0.36)
    for r in (0.26, 0.16):
        bpy.ops.mesh.primitive_cylinder_add(vertices=18, radius=r, depth=0.11,
                                            location=(0, ynorm, BAND_Y + 0.52),
                                            rotation=(math.pi / 2, 0, 0))
        finish(bpy.context.active_object,
               "Gilt_medallion" if r == 0.26 else "Wood_medcore", portal, smooth=True)

# ================= Sconce: gaslight globe (concept: brass wall lamp) ====
sconce = empty("Sconce")
# small round brass backplate against the wall
bpy.ops.mesh.primitive_cylinder_add(vertices=16, radius=0.09, depth=0.04,
                                    location=(0, 0.02, 0),
                                    rotation=(math.pi / 2, 0, 0))
finish(bpy.context.active_object, "Gilt_plate", sconce, smooth=True)
# slim curved arm: two angled segments out from the plate, rising to the cup
bpy.ops.mesh.primitive_cylinder_add(vertices=10, radius=0.018, depth=0.20,
                                    location=(0, -0.09, -0.01),
                                    rotation=(math.pi / 2.6, 0, 0))
finish(bpy.context.active_object, "Gilt_arm1", sconce, smooth=True)
bpy.ops.mesh.primitive_cylinder_add(vertices=10, radius=0.018, depth=0.16,
                                    location=(0, -0.20, 0.045),
                                    rotation=(math.pi / 5.5, 0, 0))
finish(bpy.context.active_object, "Gilt_arm2", sconce, smooth=True)
# brass cup and frosted glass globe above it
bpy.ops.mesh.primitive_cone_add(vertices=14, radius1=0.045, radius2=0.075,
                                depth=0.07, location=(0, -0.24, 0.135))
finish(bpy.context.active_object, "Gilt_cup", sconce, smooth=True)
bpy.ops.mesh.primitive_uv_sphere_add(segments=16, ring_count=12, radius=0.115,
                                     location=(0, -0.24, 0.26))
finish(bpy.context.active_object, "Globe_lamp", sconce, smooth=True)

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
aim((0.0, -10.5, 2.8), (0.0, 0.0, 2.8))
render(os.path.join(prev, "preview_am_portal.png"), {"Portal"})
aim((0.5, -1.6, 0.2), (0.0, 0.0, 0.05))
render(os.path.join(prev, "preview_am_sconce.png"), {"Sconce"})
