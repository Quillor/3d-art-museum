# Builds the Andes (Inca/Tiwanaku ashlar) assets → assets/models/inca.glb.
# Concept: concept-art/subsections/americas-andes (Hallway-03) — dry-fit
# andesite ashlar, TRAPEZOIDAL niches holding ceramics/textiles under concealed
# uplights, and a monumental trapezoidal doorway with a monolithic lintel.
#
#   /Applications/Blender.app/Contents/MacOS/Blender --background \
#       --python tools/build_inca_assets.py
#
# Named parts (JS re-materials by name prefix in corridor.js applyIncaMats):
#   Portal — trapezoidal ashlar doorway (battered jambs leaning inward, huge
#            monolithic lintel). Opening clears doorW/H; backing frame keeps it
#            walk-through.
#   Niche  — trapezoidal wall niche (proud ashlar surround, recessed dark back,
#            ceramic pot on a sill, glow backplate). Protrudes 0.24 (unreachable).
# Prefixes: Stone→andesite wall, Dark→recess, Terra→ceramic, Textile→woven
#           accent, Glow→emissive uplight.
import bpy
import math
import os
import bmesh

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "assets", "models", "inca.glb")

HALL_W = 7.0
CEIL_H = 4.8
DOOR_W, DOOR_H = 3.4, 3.5
FACADE_H = 5.2

bpy.ops.wm.read_factory_settings(use_empty=True)


def pmat(name, color, rough=0.95):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes.get("Principled BSDF")
    b.inputs["Base Color"].default_value = (*color, 1.0)
    b.inputs["Roughness"].default_value = rough
    return m


MATS = {
    "Stone": pmat("Stone", (0.42, 0.40, 0.37)),
    "Dark": pmat("Dark", (0.14, 0.13, 0.12)),
    "Terra": pmat("Terra", (0.60, 0.34, 0.18)),
    "Textile": pmat("Textile", (0.66, 0.28, 0.16)),
    "Glow": pmat("Glow", (1.0, 0.76, 0.40)),
}


def empty(name):
    e = bpy.data.objects.new(name, None)
    bpy.context.scene.collection.objects.link(e)
    return e


def finish(ob, name, parent, smooth=False):
    ob.name = name
    key = next((k for k in MATS if name.startswith(k)), "Stone")
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
    """Extrude a polygon given as (x, z) points along Y from y0 to y1.
    Used for battered/trapezoidal masses. Normals are recalculated."""
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
    # recalc outward normals
    bm = bmesh.new()
    bm.from_mesh(me)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(me)
    bm.free()
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


def vplane(name, parent, w, h, cx, y, cz, flip=False):
    bpy.ops.mesh.primitive_plane_add(size=1, location=(cx, y, cz))
    ob = bpy.context.active_object
    ob.scale = (w, h, 1)
    ob.rotation_euler.x = -math.pi / 2 if flip else math.pi / 2
    bpy.ops.object.transform_apply(scale=True, rotation=True)
    return finish(ob, name, parent)


# ================= Portal: trapezoidal ashlar doorway =================
portal = empty("Portal")
DEPTH = 0.65
# battered jambs — the door is WIDER at the bottom than the top (Inca trapezoid)
DB = 2.07    # wider sill preserves the battered profile and 3.4 m head clearance
DT = 1.70    # door half-width at the lintel (guaranteed clear opening)
JT = 3.6     # jamb top (opening height)
for side, tag in ((-1, "L"), (1, "R")):
    pts = [(side * DB, 0.0), (side * HALL_W / 2, 0.0),
           (side * HALL_W / 2, JT), (side * DT, JT)]
    jb = extrude_poly("Stone_jamb" + tag, portal, pts, 0.0, DEPTH)
    box_uv(jb)
# monolithic lintel — a single huge block, projecting proud and overhanging
lintel = extrude_poly("Stone_lintel", portal,
                      [(-HALL_W / 2 - 0.15, JT), (HALL_W / 2 + 0.15, JT),
                       (HALL_W / 2 + 0.15, JT + 0.9), (-HALL_W / 2 - 0.15, JT + 0.9)],
                      -0.18, DEPTH)
box_uv(lintel)
# a plain ashlar course above the lintel up to the facade top
crs = cube("Stone_course", portal, HALL_W, DEPTH, FACADE_H - (JT + 0.9),
           0, DEPTH / 2, (JT + 0.9 + FACADE_H) / 2)
box_uv(crs)
# backing frame — blank see-through OUTBOARD of the jambs, header above the
# opening. Jambs are solid to |x|>=DT so backing at |x|>1.85 never intrudes.
BK_Y = DEPTH + 0.07
BK_T = 0.14
SIDE_W = (HALL_W - 3.7) / 2 + 0.1
for side, nm in ((-1, "Stone_backL"), (1, "Stone_backR")):
    b = cube(nm, portal, SIDE_W, BK_T, FACADE_H + 0.4,
             side * (1.85 + SIDE_W / 2), BK_Y, (FACADE_H + 0.4) / 2)
    box_uv(b)
bh = cube("Stone_backHdr", portal, 3.7, BK_T, FACADE_H + 0.4 - JT,
          0, BK_Y, JT + (FACADE_H + 0.4 - JT) / 2)
box_uv(bh)


# ================= Niche: trapezoidal wall niche =================
# Modeled protruding toward -Y (placed with rotation.y = -side*pi/2).
niche = empty("Niche")
ND = 0.24            # projection of the surround (< 0.42, unreachable)
NH = 2.15            # niche height
NB = 0.52            # opening half-width at the sill
NT = 0.34            # opening half-width at the top
# proud ashlar surround: two battered jambs + a lintel
for side, tag in ((-1, "L"), (1, "R")):
    pts = [(side * NB, 0.0), (side * 0.72, 0.0),
           (side * 0.72, NH), (side * NT, NH)]
    jb = extrude_poly("Stone_niche" + tag, niche, pts, -ND, 0.0)
    box_uv(jb, scale=1.8)
nl = cube("Stone_nicheLintel", niche, 1.7, ND + 0.06, 0.34, 0, -(ND + 0.06) / 2, NH + 0.02)
box_uv(nl, scale=1.8)
nsill = cube("Stone_nicheSill", niche, 1.5, ND + 0.10, 0.30, 0, -(ND + 0.10) / 2, 0.15)
box_uv(nsill, scale=1.8)
# recessed dark back set INTO the wall, with a warm glow backplate + woven runner
vplane("Dark_nicheback", niche, 1.05, NH - 0.1, 0.0, 0.10, NH / 2 + 0.1)
vplane("Glow_nicheback", niche, 0.86, NH - 0.5, 0.0, 0.055, NH / 2 + 0.1)
vplane("Textile_runner", niche, 0.7, 1.1, 0.0, 0.03, NH - 0.85)
# ceramic pot on the sill
cyl("Terra_potbody", niche, 0.11, 0.20, 0.34, (0, -0.02, 0.48), verts=14)
cyl("Terra_potneck", niche, 0.20, 0.10, 0.16, (0, -0.02, 0.72), verts=14)


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
aim((0.0, -12.0, 3.0), (0.0, 0.0, 2.8))
render(os.path.join(prev, "preview_inca_portal.png"), {"Portal"})
aim((0.9, -3.4, 1.3), (0.0, 0.0, 1.2))
render(os.path.join(prev, "preview_inca_niche.png"), {"Niche"})
