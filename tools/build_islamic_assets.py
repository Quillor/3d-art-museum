# Builds the Islamic Golden Age (Moorish / Alhambra) assets → assets/models/islamic.glb.
# Concept: concept-art/subsections/middle-east-islamic (Hallway-17) — zellij
# star-tile dado, carved stucco arabesque panels, a muqarnas (honeycomb) ceiling,
# mashrabiya screens, brass lanterns, and a pointed-arch portal w/ muqarnas
# spandrels.
#
#   /Applications/Blender.app/Contents/MacOS/Blender --background \
#       --python tools/build_islamic_assets.py
#
# Named parts (JS re-materials by name prefix in corridor.js applyIslamicMats):
#   Portal     — pointed-arch stucco frame, zellij side panels, arabesque
#                tympanum, muqarnas spandrel bumps. Backing keeps clear.
#   Muqarnas   — a small honeycomb corbel cluster for the ceiling cornice.
#   Mashrabiya — pierced lattice screen (glows from behind).
#   Lantern    — brass Moroccan lamp (glows).
# Prefixes: Stucco→cream wall, Zellij→star tile (texture in JS), Arabesque→carved
#           panel (texture in JS), Brass→brass, Glow→lit, Wood→mashrabiya frame.
import bpy
import math
import os
import bmesh

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "assets", "models", "islamic.glb")

HALL_W = 7.0
CEIL_H = 5.8
DOOR_W, DOOR_H = 3.4, 3.5
FACADE_H = 6.0

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
    "Stucco": pmat("Stucco", (0.86, 0.82, 0.72), 0.8),
    "Zellij": pmat("Zellij", (0.5, 0.45, 0.3), 0.5),
    "Arabesque": pmat("Arabesque", (0.82, 0.78, 0.66), 0.7),
    "Brass": pmat("Brass", (0.72, 0.55, 0.24), 0.35, 0.8),
    "Glow": pmat("Glow", (1.0, 0.82, 0.5), 0.4),
    "Wood": pmat("Wood", (0.28, 0.18, 0.10), 0.6),
}


def empty(name):
    e = bpy.data.objects.new(name, None)
    bpy.context.scene.collection.objects.link(e)
    return e


def finish(ob, name, parent, smooth=False):
    ob.name = name
    key = next((k for k in MATS if name.startswith(k)), "Stucco")
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


def cube_rot(name, parent, sx, sy, sz, cx, cy, cz, roty=0.0):
    """Cube like cube(), but rotated about Y (tilts the long local-X axis
    within the X-Z plane) — used for diagonal lattice strips."""
    bpy.ops.mesh.primitive_cube_add(size=1, location=(cx, cy, cz), rotation=(0, roty, 0))
    ob = bpy.context.active_object
    ob.scale = (sx, sy, sz)
    bpy.ops.object.transform_apply(scale=True, rotation=True)
    return finish(ob, name, parent)


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


def qbez(p0, cp, p1, t):
    u = 1 - t
    return (u * u * p0[0] + 2 * u * t * cp[0] + t * t * p1[0],
            u * u * p0[1] + 2 * u * t * cp[1] + t * t * p1[1])


def pointed_band(name, parent, cx, z_s, w_out, w_in, rise_out, rise_in, y0, y1, seg=12):
    """Pointed (lancet) arch band via quadratic curves meeting at an apex."""
    outer, inner = [], []
    apex_o = (cx, z_s + rise_out)
    apex_i = (cx, z_s + rise_in)
    # left then right for outer
    for t in [i / seg for i in range(seg + 1)]:
        outer.append(qbez((cx - w_out, z_s), (cx - w_out, z_s + rise_out * 0.75), apex_o, t))
    for t in [i / seg for i in range(seg + 1)]:
        outer.append(qbez(apex_o, (cx + w_out, z_s + rise_out * 0.75), (cx + w_out, z_s), t))
    for t in [i / seg for i in range(seg + 1)]:
        inner.append(qbez((cx + w_in, z_s), (cx + w_in, z_s + rise_in * 0.75), apex_i, t))
    for t in [i / seg for i in range(seg + 1)]:
        inner.append(qbez(apex_i, (cx - w_in, z_s + rise_in * 0.75), (cx - w_in, z_s), t))
    return extrude_poly(name, parent, outer + inner, y0, y1)


def muqarnas(prefix, parent, cx, cy, cz, s=1.0):
    """A honeycomb corbel cluster (approximate muqarnas): 3 tiers, each
    smaller and stepping inward (toward the wall) and up, with generous
    vertical overlap between tiers so it reads as one corbelled mass
    instead of disconnected floating rows."""
    tiers = [4, 3, 2]  # cells per tier, largest/lowest first
    cell_h = 0.22 * s
    overlap = 0.09 * s        # vertical overlap between consecutive tiers
    step = cell_h - overlap   # net upward advance per tier
    inward = 0.09 * s         # how far each higher tier steps toward the wall
    nT = len(tiers)
    for tier, n in enumerate(tiers):
        z = cz + tier * step
        y = cy - (nT - 1 - tier) * inward
        cellw = 0.25 * s - tier * 0.02 * s
        spacing = cellw + 0.02 * s
        for k in range(n):
            x = cx + (k - (n - 1) / 2) * spacing
            cube(prefix + "_cell", parent, cellw, 0.2 * s, cell_h, x, y, z)


# ================= Portal: pointed-arch Moorish gate =================
portal = empty("Portal")
DEPTH = 0.55
OH = 1.7
SPRING = 3.2
APEX = SPRING + 2.2
SW = HALL_W / 2 - OH
# solid stucco shoulders
for side, tag in ((-1, "L"), (1, "R")):
    sx = side * (OH + SW / 2)
    shoulder = cube("Stucco_shoulder" + tag, portal, SW, DEPTH, FACADE_H, sx, DEPTH / 2, FACADE_H / 2)
    # box UVs on the reveal (jamb) faces — default cube UV stretches badly
    # across the tall/thin shoulder box (SW x DEPTH x FACADE_H)
    box_uv(shoulder, scale=2.5)
    # zellij tile pilaster panel on each shoulder
    vplane("Zellij_pil" + tag, portal, SW - 0.3, SPRING + 1.5, sx, -0.02, (SPRING + 1.5) / 2 + 0.2)
    # brass lantern on each shoulder
    cyl("Brass_lantbody" + tag, portal, 0.14, 0.1, 0.4, (side * (OH + 0.55), -0.3, 2.7), verts=8)
    cube("Glow_lant" + tag, portal, 0.16, 0.16, 0.3, side * (OH + 0.55), -0.3, 2.7)
# pointed arch stucco band over the opening
arch = pointed_band("Stucco_arch", portal, 0.0, SPRING, OH + 0.4, OH, APEX + 0.3 - SPRING, APEX - SPRING, -0.02, DEPTH)
box_uv(arch)
# arabesque tympanum inside the arch head
vplane("Arabesque_tymp", portal, OH * 1.4, 1.2, 0.0, -0.01, SPRING + 0.8)
# muqarnas spandrel bumps in the arch corners
for side in (-1, 1):
    muqarnas("Stucco", portal, side * (OH + 0.1), -0.05, SPRING + 0.2, s=0.9)
# arabesque frieze + cornice above the arch
vplane("Arabesque_frieze", portal, HALL_W, 0.5, 0.0, -0.02, APEX + 0.55)
cube("Stucco_cornice", portal, HALL_W + 0.2, DEPTH + 0.12, 0.2, 0, DEPTH / 2, APEX + 0.9)
cube("Stucco_field", portal, HALL_W, DEPTH, FACADE_H - (APEX + 1.0), 0, DEPTH / 2, (APEX + 1.0 + FACADE_H) / 2)
# marble threshold
cube("Stucco_threshold", portal, DOOR_W + 0.6, 0.6, 0.06, 0, -0.15, 0.03)
# backing
BK_Y = DEPTH + 0.07
BK_T = 0.14
SIDE_W = SW + 0.1
for side, nm in ((-1, "Stucco_backL"), (1, "Stucco_backR")):
    cube(nm, portal, SIDE_W, BK_T, FACADE_H + 0.4, side * (OH + SIDE_W / 2 - 0.05), BK_Y, (FACADE_H + 0.4) / 2)
cube("Stucco_backHdr", portal, OH * 2 + 0.2, BK_T, FACADE_H + 0.4 - (APEX), 0, BK_Y, (APEX + FACADE_H + 0.4) / 2)


# ================= Muqarnas: honeycomb corbel cluster =================
muq = empty("Muqarnas")
muqarnas("Stucco", muq, 0, -0.2, 0, s=1.0)


# ================= Mashrabiya: pierced lattice screen =================
# A thin wood border (not a solid backing slab) around a diagonal criss-cross
# lattice (2 directions, 8 strips each), so gaps between the strips actually
# let the recessed glow plate show through — previously a solid dark
# "Wood_mashframe" backing slab defeated the pierced-screen effect.
mash = empty("Mashrabiya")
MW, MH = 1.1, 2.2  # overall panel envelope (unchanged, corridor.js positions off this)
BT = 0.06           # border strip thickness
# thin border frame (outline only)
cube("Wood_mashframe_top", mash, MW, 0.06, BT, 0, -0.04, MH - BT / 2)
cube("Wood_mashframe_bot", mash, MW, 0.06, BT, 0, -0.04, BT / 2)
cube("Wood_mashframe_L", mash, BT, 0.06, MH, -MW / 2 + BT / 2, -0.04, MH / 2)
cube("Wood_mashframe_R", mash, BT, 0.06, MH, MW / 2 - BT / 2, -0.04, MH / 2)
# recessed backlight plate, inset from the border so the lattice reads as
# pierced against the glow rather than a flat glowing slab
cube("Glow_mashback", mash, MW - 0.22, 0.02, MH - 0.22, 0, 0.03, MH / 2)
# diagonal lattice filling the interior opening — strips are clipped to the
# opening bounds (via diag_len_at) so they don't overhang past the frame.
IW, IH = MW - 0.16, MH - 0.16
hw, hh = IW / 2, IH / 2
diag = math.hypot(IW, IH)
theta = math.atan2(IH, IW)
rng = IW * IH / diag           # half-span of the perpendicular offset
N = 13   # was 8 — audit read the sparse X-lattice as a bare frame
offs = [-rng + (i + 0.5) * (2 * rng / N) for i in range(N)]
n1 = (-math.sin(theta), math.cos(theta))
n2 = (math.sin(theta), math.cos(theta))


def diag_len_at(o, n, d):
    """Clip the infinite line through o*n along direction d to the
    [-hw,hw] x [-hh,hh] rect; return (cx, cz, length) or None."""
    ox, oz = o * n[0], o * n[1]
    tx = sorted([(-hw - ox) / d[0], (hw - ox) / d[0]]) if abs(d[0]) > 1e-9 else [-1e9, 1e9]
    tz = sorted([(-hh - oz) / d[1], (hh - oz) / d[1]]) if abs(d[1]) > 1e-9 else [-1e9, 1e9]
    t0, t1 = max(tx[0], tz[0]), min(tx[1], tz[1])
    if t1 <= t0:
        return None
    return (ox + d[0] * (t0 + t1) / 2, oz + d[1] * (t0 + t1) / 2, t1 - t0)


d1 = (math.cos(theta), math.sin(theta))
d2 = (math.cos(theta), -math.sin(theta))
for i, o in enumerate(offs):
    r = diag_len_at(o, n1, d1)
    if r:
        cx, cz, L = r
        cube_rot(f"Wood_mashx{i}", mash, L * 1.06, 0.05, 0.03, cx, -0.06, MH / 2 + cz, roty=theta)
    r = diag_len_at(o, n2, d2)
    if r:
        cx, cz, L = r
        cube_rot(f"Wood_mashy{i}", mash, L * 1.06, 0.05, 0.03, cx, -0.06, MH / 2 + cz, roty=-theta)


# ================= Lantern: brass Moroccan lamp =================
lantern = empty("Lantern")
cyl("Brass_lchain", lantern, 0.015, 0.015, 0.5, (0, 0, 0.25), verts=5)
cyl("Brass_ltop", lantern, 0.05, 0.14, 0.16, (0, 0, -0.05), verts=8)
cyl("Brass_lbody", lantern, 0.16, 0.12, 0.34, (0, 0, -0.28), verts=8)
cyl("Glow_lcore", lantern, 0.11, 0.09, 0.3, (0, 0, -0.28), verts=8)


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
scene.render.resolution_y = 780
cam_data = bpy.data.cameras.new("cam")
cam = bpy.data.objects.new("cam", cam_data)
scene.collection.objects.link(cam)
scene.camera = cam
cam_data.lens = 26
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
aim((0.0, -14.0, 3.8), (0.0, 0.0, 3.6))
render(os.path.join(prev, "preview_islamic_portal.png"), {"Portal"})
aim((0.0, -1.8, 0.13), (0.0, -0.29, 0.13))
render(os.path.join(prev, "preview_islamic_muqarnas.png"), {"Muqarnas"})
aim((0.0, -2.6, 1.1), (0.0, 0.0, 1.1))
render(os.path.join(prev, "preview_islamic_mashrabiya.png"), {"Mashrabiya"})
