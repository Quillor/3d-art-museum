# Builds the Egypt hypostyle assets → assets/models/egypt.glb.
# Concept: concept-art/subsections/africa-egypt (Hallway-26) — battered pylon
# portal with winged-sun frieze, lotus columns, painted ceiling beams,
# ceremonial braziers.
#
#   /Applications/Blender.app/Contents/MacOS/Blender --background \
#       --python tools/build_egypt_assets.py
#
# Named parts (contract with js/corridor.js; JS re-materials by name prefix):
#   Portal   — pylon facade 7 wide x 6.42 tall, opening 3.4 x 3.5 (= doorW/H,
#              collision unchanged). Front faces Blender -Y (Three +Z).
#   Column   — lotus column EXACTLY 5.8 tall (= S.egypt ceilH, china
#              convention: not height-scaled in JS).
#   Beam     — painted ceiling beam spanning the 7 m hall, 0.42 deep.
#   Brazier  — bronze bowl on a stand, ember disc on top (~1.25 tall).
# Mesh name prefixes → JS materials:
#   Slab→sandstone wall, Band→painted frieze, Ember→emissive, Metal→bronze,
#   Capital→painted lotus, everything else→limestone trim.
import bpy
import math
import os

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "assets", "models", "egypt.glb")

HALL_W = 7.0
CEIL_H = 5.8
DOOR_W, DOOR_H = 3.4, 3.5
FACADE_H = 6.42          # covers ceilH 5.8 and any shorter/equal neighbour

bpy.ops.wm.read_factory_settings(use_empty=True)

def pmat(name, color):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes.get("Principled BSDF")
    b.inputs["Base Color"].default_value = (*color, 1.0)
    b.inputs["Roughness"].default_value = 0.9
    return m

MATS = {
    "Slab": pmat("Sandstone", (0.72, 0.58, 0.38)),
    "Band": pmat("Frieze", (0.75, 0.62, 0.42)),
    "Trim": pmat("Limestone", (0.82, 0.74, 0.58)),
    "Capital": pmat("Painted", (0.55, 0.6, 0.5)),
    "Metal": pmat("Bronze", (0.16, 0.12, 0.08)),
    "Ember": pmat("Ember", (1.0, 0.55, 0.2)),
    "DeityL": pmat("DeityL", (0.7, 0.55, 0.35)),
    "DeityR": pmat("DeityR", (0.7, 0.55, 0.35)),
    "Jamb": pmat("JambBand", (0.7, 0.55, 0.35)),
}

def empty(name):
    e = bpy.data.objects.new(name, None)
    bpy.context.scene.collection.objects.link(e)
    return e

def finish(ob, name, parent, smooth=False):
    ob.name = name
    key = next((k for k in MATS if name.startswith(k)), "Trim")
    ob.data.materials.clear()
    ob.data.materials.append(MATS[key])
    if smooth:
        for p in ob.data.polygons:
            p.use_smooth = True
    ob.parent = parent
    return ob

def cyl(name, parent, r1, r2, h, zc, verts=20, smooth=True):
    bpy.ops.mesh.primitive_cone_add(vertices=verts, radius1=r1, radius2=r2,
                                    depth=h, location=(0, 0, zc))
    return finish(bpy.context.active_object, name, parent, smooth)

def cube(name, parent, sx, sy, sz, cx, cy, cz):
    bpy.ops.mesh.primitive_cube_add(size=1, location=(cx, cy, cz))
    ob = bpy.context.active_object
    ob.scale = (sx, sy, sz)
    bpy.ops.object.transform_apply(scale=True)
    return finish(ob, name, parent)

def vplane(name, parent, w, h, cx, y, cz, urep=1.0):
    """Vertical plane facing Blender -Y (Three +Z), UV u scaled by urep."""
    bpy.ops.mesh.primitive_plane_add(size=1, location=(cx, y, cz))
    ob = bpy.context.active_object
    ob.scale = (w, h, 1)
    ob.rotation_euler.x = math.pi / 2
    bpy.ops.object.transform_apply(scale=True, rotation=True)
    for d in ob.data.uv_layers.active.data:
        d.uv = (d.uv[0] * urep, d.uv[1])
    return finish(ob, name, parent)

def prism(name, parent, x_lo, x_hi, y_lo, y_hi, z_lo, z_hi,
          top_dx=0.0, top_dy=0.0, front_lean=0.0):
    """Box with the top face optionally grown (cavetto) or the outer/front
    faces battered. top_dx/top_dy expand the top; front_lean pulls the front
    (-Y) top edge back."""
    v = [
        (x_lo, y_lo, z_lo), (x_hi, y_lo, z_lo),
        (x_hi, y_hi, z_lo), (x_lo, y_hi, z_lo),
        (x_lo - top_dx, y_lo + front_lean - top_dy, z_hi),
        (x_hi + top_dx, y_lo + front_lean - top_dy, z_hi),
        (x_hi + top_dx, y_hi + top_dy, z_hi),
        (x_lo - top_dx, y_hi + top_dy, z_hi),
    ]
    f = [(0, 1, 2, 3), (7, 6, 5, 4), (0, 4, 5, 1),
         (1, 5, 6, 2), (2, 6, 7, 3), (3, 7, 4, 0)]
    me = bpy.data.meshes.new(name)
    me.from_pydata(v, [], f)
    me.update()
    ob = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(ob)
    return finish(ob, name, parent)

def battered_tower(name, parent, x_in, x_out, y0, y1, h, batter):
    """Pylon tower: outer face + front/back lean inward going up; the
    door-side face (x_in) stays plumb so the opening is clean."""
    s = 1 if x_out > x_in else -1
    v = [
        (x_in, y0, 0), (x_out, y0, 0), (x_out, y1, 0), (x_in, y1, 0),
        (x_in, y0 + batter * 0.6, h), (x_out - s * batter, y0 + batter * 0.6, h),
        (x_out - s * batter, y1 - batter * 0.6, h), (x_in, y1 - batter * 0.6, h),
    ]
    f = [(0, 1, 2, 3), (7, 6, 5, 4), (0, 4, 5, 1),
         (1, 5, 6, 2), (2, 6, 7, 3), (3, 7, 4, 0)]
    me = bpy.data.meshes.new(name)
    me.from_pydata(v, [], f)
    me.update()
    ob = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(ob)
    return finish(ob, name, parent)

def reeded(name, parent, r_bot, r_top, h, z_bot, reeds=9, amp=0.05,
           verts=72, rings=6, uv_around=3.0, uv_h=2.6):
    """Bundled-reed (fluted) column segment: radius modulated by |sin| so the
    surface reads as bound papyrus stalks. Open-ended (ends hidden)."""
    vs, fs, uvs = [], [], []
    for j in range(rings + 1):
        t = j / rings
        r = r_bot + (r_top - r_bot) * t
        z = z_bot + h * t
        for i in range(verts):
            a = 2 * math.pi * i / verts
            rr = r * (1 - amp) + r * amp * abs(math.sin(reeds * a / 2))
            vs.append((rr * math.cos(a), rr * math.sin(a), z))
    for j in range(rings):
        for i in range(verts):
            a = j * verts + i
            b = j * verts + (i + 1) % verts
            fs.append((a, b, b + verts, a + verts))
    me = bpy.data.meshes.new(name)
    me.from_pydata(vs, [], fs)
    me.update()
    uvl = me.uv_layers.new(name="UVMap")
    for poly in me.polygons:
        for li in poly.loop_indices:
            vi = me.loops[li].vertex_index
            ring, col = divmod(vi, verts)
            uvl.data[li].uv = (col / verts * uv_around, (ring / rings) * h / uv_h)
    ob = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(ob)
    return finish(ob, name, parent, smooth=True)

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

# ================= Portal: battered pylon facade =================
portal = empty("Portal")
DEPTH = 0.85
for side, name in ((-1, "Slab_towerL"), (1, "Slab_towerR")):
    t = battered_tower(name, portal, side * DOOR_W / 2,
                       side * HALL_W / 2, 0.0, DEPTH, 6.05, 0.14)
    box_uv(t)
# header above the lintel
hd = prism("Slab_header", portal, -DOOR_W / 2 - 0.05, DOOR_W / 2 + 0.05,
           0.10, 0.80, 3.92, 6.05)
box_uv(hd)
# lintel block bridging the opening (carved sandstone, not blank limestone)
lt = prism("Slab_lintel", portal, -DOOR_W / 2 - 0.35, DOOR_W / 2 + 0.35,
           0.04, 0.78, DOOR_H, 3.95)
box_uv(lt, scale=2.0)
# plumb jamb bands framing the opening (proud of the face) — carved
# sandstone so the door edge reads like the concept's hieroglyph bands
for side in (-1, 1):
    j = prism("Slab_jamb", portal, side * (DOOR_W / 2 + 0.02),
              side * (DOOR_W / 2 + 0.40), -0.10, 0.30, 0.0, 3.95)
    box_uv(j, scale=2.0)
# cavetto cornice: flared crown across the full facade
prism("Trim_cavetto", portal, -HALL_W / 2, HALL_W / 2, 0.0, DEPTH,
      6.05, FACADE_H, top_dx=0.16, top_dy=0.12)
# torus roll molding under the cavetto
cube("Trim_roll", portal, HALL_W, DEPTH + 0.10, 0.12, 0, DEPTH / 2 - 0.02, 6.0)
# winged-sun frieze plate above the lintel (one full texture tile)
vplane("Band_wingedsun", portal, 3.25, 0.82, 0.0, 0.015, 4.42, urep=1.0)
# painted deity figures flanking the door (concept: pylon entrance panel)
vplane("DeityL_fig", portal, 1.35, 3.15, -2.55, -0.015, 2.1)
vplane("DeityR_fig", portal, 1.35, 3.15, 2.55, -0.015, 2.1)
# vertical hieroglyph bands on the jamb fronts
for side in (-1, 1):
    vplane("Jamb_band", portal, 0.42, 3.7, side * (DOOR_W / 2 + 0.21), -0.115, 1.9)
# second, smaller winged-sun strip on the lintel face itself, so the motif
# stays visible through the low neck doorway on approach
vplane("Band_lintelsun", portal, 3.3, 0.44, 0.0, 0.02, 3.72, urep=1.0)

# ================= Column: lotus, exactly CEIL_H tall =================
column = empty("Column")
cube("Trim_plinth", column, 0.95, 0.95, 0.20, 0, 0, 0.10)
cyl("Trim_basering", column, 0.46, 0.44, 0.16, 0.28)
# bundled-reed fluted shaft (concept: papyrus-bundle lotus column)
reeded("Slab_shaft", column, 0.37, 0.30, 4.10, 0.36, reeds=9, amp=0.055)
# binding collar where the reeds are lashed, then the painted band ring
cyl("Trim_collar", column, 0.335, 0.335, 0.10, 4.50, verts=20)
bpy.ops.mesh.primitive_cylinder_add(vertices=20, radius=0.318, depth=0.30,
                                    location=(0, 0, 4.70))
ring = bpy.context.active_object
for d in ring.data.uv_layers.active.data:
    d.uv = (d.uv[0] * 2.0, d.uv[1])
finish(ring, "Band_ring", column, smooth=True)
# lotus bell: flaring reeded segments (petal ridges)
reeded("Capital_a", column, 0.30, 0.42, 0.28, 4.85, reeds=12, amp=0.07)
reeded("Capital_b", column, 0.42, 0.58, 0.26, 5.13, reeds=12, amp=0.09)
reeded("Capital_c", column, 0.58, 0.65, 0.16, 5.39, reeds=12, amp=0.10)
cyl("Capital_lip", column, 0.65, 0.60, 0.09, 5.55)
cube("Trim_abacus", column, 0.80, 0.80, 0.21, 0, 0, 5.695)  # top = 5.8

# ================= Beam: painted ceiling beam =================
beam = empty("Beam")
bb = cube("Trim_beambody", beam, HALL_W, 0.55, 0.42, 0, 0.28, CEIL_H - 0.21)
box_uv(bb)
# painted frieze strips on both long faces (texture tiles 4x along)
vplane("Band_beamF", beam, HALL_W, 0.30, 0.0, -0.006, CEIL_H - 0.21, urep=4.0)
bf = vplane("Band_beamB", beam, HALL_W, 0.30, 0.0, 0.566, CEIL_H - 0.21, urep=4.0)
bf.rotation_euler.z = math.pi
bpy.ops.object.transform_apply(rotation=True)

# ================= Brazier: bronze bowl on a stand =================
brazier = empty("Brazier")
for k in range(3):
    a = k * 2 * math.pi / 3
    leg = cube("Metal_leg", brazier, 0.055, 0.055, 0.5,
               math.cos(a) * 0.14, math.sin(a) * 0.14, 0.25)
    leg.rotation_euler = (math.sin(a) * 0.35, -math.cos(a) * 0.35, 0)
cyl("Metal_stem", brazier, 0.05, 0.04, 0.75, 0.62, verts=12)
cyl("Metal_bowl", brazier, 0.15, 0.37, 0.26, 1.10, verts=16)
cyl("Metal_rim", brazier, 0.38, 0.38, 0.05, 1.245, verts=16)
cyl("Ember_coals", brazier, 0.31, 0.31, 0.04, 1.255, verts=16)

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
aim((0.0, -11.0, 3.2), (0.0, 0.0, 3.2))
render(os.path.join(prev, "preview_eg_portal.png"), {"Portal"})
aim((2.4, -7.5, 2.6), (0.0, 0.0, 3.0))
render(os.path.join(prev, "preview_eg_column.png"), {"Column"})
aim((1.2, -3.4, 0.9), (0.0, 0.0, 0.75), )
render(os.path.join(prev, "preview_eg_brazier.png"), {"Brazier"})
aim((0.0, -8.0, 5.0), (0.0, 0.0, 5.5))
render(os.path.join(prev, "preview_eg_beam.png"), {"Beam"})
