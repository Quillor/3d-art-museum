# Builds the Mesoamerica (Maya/Zapotec/Aztec temple) assets → assets/models/meso.glb.
# Concept: concept-art/subsections/americas-mesoamerica (Hallway-02) — a
# processional limestone temple gallery: engaged square piers with red greca
# bands, carved step-fret (greca) friezes, a stepped ceremonial portal with a
# deity-mask lintel, low stone benches, and deep stone ceiling beams.
#
#   /Applications/Blender.app/Contents/MacOS/Blender --background \
#       --python tools/build_meso_assets.py
#
# Named parts (JS re-materials by name prefix in corridor.js applyMesoMats):
#   Portal — stepped temple gate 7 x 5.6, battered jamb masses, carved lintel
#            with a deity-mask panel, receding talud crown, red greca jambs.
#            Opening 3.4 x 3.5 (doorW/H); backing frame leaves it clear.
#   Pier   — engaged limestone pilaster (base + shaft + cornice cap) with a
#            recessed red greca strip on its face. Projects 0.30 (unreachable).
#   Bench  — low stone bench (seat + legs) set against the wall base.
#   Beam   — deep transverse stone ceiling beam spanning the 7 m hall.
# Prefixes: Lime→limestone wall, Red→red mineral pigment, Dark→dark relief
#           stone, Fret→greca texture (assigned in JS), Glow→emissive.
import bpy
import math
import os

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "assets", "models", "meso.glb")

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
    "Lime": pmat("Lime", (0.72, 0.63, 0.47)),
    "Red": pmat("Red", (0.52, 0.24, 0.16)),
    "Dark": pmat("Dark", (0.34, 0.26, 0.18)),
    "Fret": pmat("Fret", (0.55, 0.32, 0.20)),
    "Glow": pmat("Glow", (1.0, 0.78, 0.42)),
}


def empty(name):
    e = bpy.data.objects.new(name, None)
    bpy.context.scene.collection.objects.link(e)
    return e


def finish(ob, name, parent, smooth=False):
    ob.name = name
    key = next((k for k in MATS if name.startswith(k)), "Lime")
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


def prism(name, parent, x_lo, x_hi, y_lo, y_hi, z_lo, z_hi,
          top_shrink_x=0.0, top_shrink_y=0.0):
    """Box whose top face shrinks inward — battered temple stone."""
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


def box_uv(ob, scale=3.0):
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


def panel_uv(ob):
    """Map the object's local bounds to one 0..1 UV tile (x->u, z->v). For
    one-off pictorial panels (the deity mask): box_uv's coords/scale mapping
    put u=0 mid-panel, so the texture wrapped into two copies meeting at a
    centre seam (Phase 0 audit defect)."""
    me = ob.data
    uv = me.uv_layers.active or me.uv_layers.new(name="UVMap")
    xs = [v.co.x for v in me.vertices]
    zs = [v.co.z for v in me.vertices]
    x0, x1 = min(xs), max(xs)
    z0, z1 = min(zs), max(zs)
    for poly in me.polygons:
        for li in poly.loop_indices:
            co = me.vertices[me.loops[li].vertex_index].co
            uv.data[li].uv = ((co.x - x0) / ((x1 - x0) or 1), (co.z - z0) / ((z1 - z0) or 1))


def vplane(name, parent, w, h, cx, y, cz, urep=1.0, vrep=1.0, flip=False):
    """Vertical plane facing -Y (viewer) by default; flip=True faces +Y."""
    bpy.ops.mesh.primitive_plane_add(size=1, location=(cx, y, cz))
    ob = bpy.context.active_object
    ob.scale = (w, h, 1)
    ob.rotation_euler.x = -math.pi / 2 if flip else math.pi / 2
    bpy.ops.object.transform_apply(scale=True, rotation=True)
    for d in ob.data.uv_layers.active.data:
        d.uv = (d.uv[0] * urep, d.uv[1] * vrep)
    return finish(ob, name, parent)


# ================= Portal: stepped temple gate =================
# Front (viewer / hub side) faces Blender -Y; the mass extends toward +Y (into
# the gallery). Decorated faces sit at the small-Y side.
portal = empty("Portal")
DEPTH = 0.7

# battered jamb masses either side of the opening (two stacked courses so the
# stone reads as a stepped temple pier, talud-tablero flavour)
for side, tag in ((-1, "L"), (1, "R")):
    lo = prism("Lime_jamb" + tag, portal,
               side * DOOR_W / 2, side * HALL_W / 2, 0.0, DEPTH, 0.0, 2.7,
               top_shrink_x=0.10, top_shrink_y=0.05)
    box_uv(lo)
    hi = prism("Lime_jamb" + tag + "2", portal,
               side * (DOOR_W / 2 + 0.12), side * (HALL_W / 2 - 0.12),
               0.06, DEPTH - 0.02, 2.7, 4.3,
               top_shrink_x=0.14, top_shrink_y=0.05)
    box_uv(hi)
    # recessed red greca strip up the face of each jamb (vrep lowered so the
    # fret motif reads at architectural scale, not a tiled "textile" pattern)
    vplane("Fret_jamb" + tag, portal, 0.5, 3.0,
           side * (DOOR_W / 2 + 0.55), -0.02, 1.7, urep=1, vrep=2)

# heavy carved lintel across the opening
lintel = cube("Lime_lintel", portal, DOOR_W + 1.5, DEPTH + 0.24, 0.7,
              0, DEPTH / 2 - 0.12, DOOR_H + 0.35)
box_uv(lintel)
# horizontal greca frieze on the lintel face
vplane("Fret_head", portal, DOOR_W + 1.2, 0.5, 0.0, -0.24, DOOR_H + 0.62,
       urep=3, vrep=1)
# deity-mask relief panel centred on the lintel (dark ceremonial stone)
mask = cube("Dark_mask", portal, 1.5, 0.16, 0.86, 0.0, -0.20, DOOR_H + 0.05)
panel_uv(mask)   # one upright 0..1 tile — box_uv wrapped a seam at panel centre
mfr = cube("Lime_maskframe", portal, 1.72, 0.12, 1.06, 0.0, -0.12, DOOR_H + 0.05)
box_uv(mfr)

# receding talud crown courses above the lintel (stepped temple top)
c1 = cube("Lime_crown1", portal, HALL_W, DEPTH + 0.1, 0.4, 0, DEPTH / 2, 4.35)
box_uv(c1)
c2 = cube("Lime_crown2", portal, HALL_W - 0.7, DEPTH + 0.2, 0.42,
          0, DEPTH / 2 - 0.06, 4.75)
box_uv(c2)
c3 = cube("Red_crownband", portal, HALL_W - 0.5, 0.1, 0.14, 0, -0.15, 4.35)

# backing frame — blank the see-through behind the battered jambs WITHOUT
# covering the doorway (shoulders + header only). Sits toward +Y (interior).
BK_Y = DEPTH + 0.07
BK_T = 0.14
SIDE_W = (HALL_W - DOOR_W) / 2 + 0.1
for side, nm in ((-1, "Lime_backL"), (1, "Lime_backR")):
    b = cube(nm, portal, SIDE_W, BK_T, FACADE_H + 0.4,
             side * (DOOR_W / 2 + SIDE_W / 2), BK_Y, (FACADE_H + 0.4) / 2)
    box_uv(b)
bh = cube("Lime_backHdr", portal, DOOR_W, BK_T, FACADE_H + 0.4 - DOOR_H,
          0, BK_Y, DOOR_H + (FACADE_H + 0.4 - DOOR_H) / 2)
box_uv(bh)
# interior lintel so the gate reads from the gallery side too
cube("Lime_lintelIn", portal, DOOR_W + 1.2, 0.4, 0.6, 0, BK_Y + 0.2, DOOR_H + 0.3)
# inner (gallery-side) faces mirror the outer treatment: greca strips up the
# jamb shoulders + a frieze and dark accent trim on the interior lintel, so
# the portal doesn't read as bare Lime boxes from inside the gallery.
IN_Y = BK_Y + BK_T / 2       # outward-facing (+Y) surface of the backing wall
for side in (-1, 1):
    vplane("Fret_jambIn" + ("L" if side < 0 else "R"), portal, 0.5, 3.0,
           side * (DOOR_W / 2 + 0.55), IN_Y + 0.02, 1.7, urep=1, vrep=2, flip=True)
vplane("Fret_headIn", portal, DOOR_W + 0.9, 0.3, 0.0, BK_Y + 0.4 + 0.02,
       DOOR_H + 0.42, urep=3, vrep=1, flip=True)
cube("Dark_lintelInTrim", portal, DOOR_W + 0.9, 0.06, 0.06,
     0, BK_Y + 0.2 + 0.23, DOOR_H + 0.02)


# ================= Pier: engaged limestone pilaster =================
# Modeled protruding toward -Y (placed on walls with rotation.y = -side*pi/2,
# so it projects into the hall). Back face sits on the wall plane (y = 0).
pier = empty("Pier")
PD = 0.30                 # projection into the hall (< 0.42 so unreachable)
base = cube("Lime_pierbase", pier, 0.74, PD + 0.06, 0.36, 0, -(PD + 0.06) / 2, 0.18)
box_uv(base)
shaft = cube("Lime_piershaft", pier, 0.56, PD, CEIL_H, 0, -PD / 2, CEIL_H / 2)
box_uv(shaft)
cap = cube("Lime_piercap", pier, 0.76, PD + 0.08, 0.32, 0, -(PD + 0.08) / 2, CEIL_H - 0.20)
box_uv(cap)
# recessed red greca strip up the pier face
vplane("Fret_pier", pier, 0.34, CEIL_H - 1.1, 0, -PD - 0.011, CEIL_H / 2 - 0.05,
       urep=1, vrep=3)


# ================= Bench: low stone bench =================
bench = empty("Bench")
BD = 0.34
seat = cube("Lime_benchseat", bench, 1.5, BD, 0.14, 0, -BD / 2, 0.46)
box_uv(seat, scale=1.5)
for k in (-1, 1):
    lg = cube("Dark_benchleg", bench, 0.18, BD - 0.06, 0.46,
              k * 0.6, -(BD - 0.06) / 2, 0.23)
    box_uv(lg, scale=1.0)
# thin red pigment line along the seat front (mineral trace, concept)
cube("Red_benchline", bench, 1.5, 0.05, 0.05, 0, -BD - 0.006, 0.42)


# ================= Beam: deep transverse ceiling beam =================
beam = empty("Beam")
bm = cube("Lime_beam", beam, HALL_W + 0.3, 0.34, 0.44, 0, 0, CEIL_H - 0.22)
box_uv(bm)
cube("Red_beamline", beam, HALL_W + 0.3, 0.36, 0.06, 0, 0, CEIL_H - 0.44)


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
render(os.path.join(prev, "preview_meso_portal.png"), {"Portal"})
aim((1.2, -2.6, 1.6), (0.0, 0.0, 2.2))
render(os.path.join(prev, "preview_meso_pier.png"), {"Pier"})
aim((0.0, 12.0, 3.0), (0.0, 0.0, 3.0))
render(os.path.join(prev, "preview_meso_portal_inner.png"), {"Portal"})
