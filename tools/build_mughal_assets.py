# Builds the Mughal architectural assets and exports assets/models/mughal.glb.
#
#   /Applications/Blender.app/Contents/MacOS/Blender --background \
#       --python tools/build_mughal_assets.py
#
# Modeled in Blender coords (Z up); glTF export converts to Three.js coords.
#
# Scene layout (object names are the contract with js/corridor.js):
#   Portal    — 7.0 x 5.8 marble facade, cusped (multifoil) arch opening in
#               a rectangular pishtaq frame, spandrel rosettes.
#   ArcadeBay — blind cusped arch with engaged pilasters, stamped on the
#               hall walls behind every artwork (concept: marble arcade).
#   Jali      — pointed-arch pierced screen (diagonal lattice); JS adds a
#               glowing plane behind it.
import bpy
import math
import os

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "assets", "models", "mughal.glb")

HALL_W = 7.0
CEIL_H = 5.8      # mughal ceilH in styles.js
T = 0.55          # facade slab thickness

# ---------------- arch math (same as build_gothic_assets.py) ----------------

def arch_params(span, spring, apex):
    rise = apex - spring
    R = (rise * rise + span * span / 4.0) / span
    c = span / 2.0 - R
    return R, c

def arch_z(x, span, spring, apex):
    R, c = arch_params(span, spring, apex)
    d = R * R - (abs(x) - c) ** 2
    return spring + math.sqrt(max(d, 0.0))

def cusped_pts(span, spring, apex, k=8, depth=0.14, per=9):
    """Pointed arch with k foils bulging inward; cusp junctions sit on the
    base arch, and k even keeps the keel point at the apex. Returns the
    profile left springing -> apex -> right springing as (x, z) pairs."""
    R, c = arch_params(span, spring, apex)
    th_max = math.acos(-c / R)
    pts = []
    n = k * per
    for i in range(n + 1):
        s = i / n
        if s <= 0.5:
            th = th_max * (s / 0.5)
            x = -(c + R * math.cos(th))
            z = spring + R * math.sin(th)
            ctr = (-c, spring)
        else:
            th = th_max * ((1 - s) / 0.5)
            x = c + R * math.cos(th)
            z = spring + R * math.sin(th)
            ctr = (c, spring)
        dx, dz = ctr[0] - x, ctr[1] - z
        L = math.hypot(dx, dz) or 1.0
        off = depth * math.sin(math.pi * ((s * k) % 1.0))
        pts.append((x + dx / L * off, z + dz / L * off))
    return pts

# ---------------- scene helpers ----------------

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

def tube(name, splines, radius, parent, mat):
    cu = bpy.data.curves.new(name, "CURVE")
    cu.dimensions = "3D"
    cu.bevel_depth = radius
    cu.bevel_resolution = 3
    cu.use_fill_caps = True
    for pts in splines:
        sp = cu.splines.new("POLY")
        sp.points.add(len(pts) - 1)
        for p, pt in zip(sp.points, pts):
            p.co = (pt[0], pt[1], pt[2], 1.0)
    ob = bpy.data.objects.new(name, cu)
    bpy.context.scene.collection.objects.link(ob)
    bpy.context.view_layer.objects.active = ob
    ob.select_set(True)
    bpy.ops.object.convert(target="MESH")
    ob = bpy.context.active_object
    ob.name = name
    for p in ob.data.polygons:
        p.use_smooth = True
    ob.data.materials.append(mat)
    box_uv(ob.data, scale=1.0)
    ob.parent = parent
    ob.select_set(False)
    return ob

def empty(name):
    e = bpy.data.objects.new(name, None)
    bpy.context.scene.collection.objects.link(e)
    return e

# ================= build =================
bpy.ops.wm.read_factory_settings(use_empty=True)

MARBLE = pmat("Marble", (0.87, 0.84, 0.78), rough=0.45)
TRIM = pmat("TrimMarble", (0.80, 0.75, 0.66), rough=0.55)

# ---------------- the pishtaq portal ----------------
portal = empty("Portal")
P_SPAN, P_SPRING, P_APEX = 3.4, 2.2, 4.6

slab = box("Slab", (0, T / 2, CEIL_H / 2), (HALL_W, T, CEIL_H), portal, MARBLE)

# cutter: extruded cusped-arch profile
prof = [(-P_SPAN / 2, -0.2), (-P_SPAN / 2, P_SPRING)]
prof += cusped_pts(P_SPAN, P_SPRING, P_APEX, k=8, depth=0.15)
prof += [(P_SPAN / 2, P_SPRING), (P_SPAN / 2, -0.2)]
n = len(prof)
cv = [(x, -0.4, z) for (x, z) in prof] + [(x, T + 0.4, z) for (x, z) in prof]
cf = [tuple(range(n)), tuple(range(2 * n - 1, n - 1, -1))]
for i in range(n):
    j = (i + 1) % n
    cf.append((i, j, n + j, n + i))
cut_me = bpy.data.meshes.new("Cutter")
cut_me.from_pydata(cv, [], cf)
cut_me.update()
cutter = bpy.data.objects.new("Cutter", cut_me)
bpy.context.scene.collection.objects.link(cutter)
bpy.context.view_layer.objects.active = slab
mod = slab.modifiers.new("cut", "BOOLEAN")
mod.operation = "DIFFERENCE"
mod.object = cutter
mod.solver = "EXACT"
bpy.ops.object.modifier_apply(modifier="cut")
bpy.data.objects.remove(cutter)
box_uv(slab.data)

# molding following the cusped edge (jambs + arch), proud of the front face
edge = [(-P_SPAN / 2, -0.03, 0.05)]
edge += [(x, -0.03, z) for (x, z) in
         [(-P_SPAN / 2, P_SPRING)] + cusped_pts(P_SPAN, P_SPRING, P_APEX, k=8, depth=0.15) + [(P_SPAN / 2, P_SPRING)]]
edge += [(P_SPAN / 2, -0.03, 0.05)]
tube("ArchEdge", [edge], 0.05, portal, TRIM)

# rectangular pishtaq frame band
box("PishtaqL", (-2.35, -0.06, 2.6), (0.30, 0.12, 5.2), portal, TRIM)
box("PishtaqR", (2.35, -0.06, 2.6), (0.30, 0.12, 5.2), portal, TRIM)
box("PishtaqTop", (0, -0.06, 5.05), (5.0, 0.12, 0.30), portal, TRIM)

# spandrel rosettes
for side, nm in ((-1, "RosetteL"), (1, "RosetteR")):
    bpy.ops.mesh.primitive_cylinder_add(vertices=16, radius=0.15, depth=0.10,
                                        location=(side * 1.85, -0.04, 4.35),
                                        rotation=(math.pi / 2, 0, 0))
    finish(bpy.context.active_object, nm, portal, TRIM, smooth=True)

# ---------------- the blind arcade bay ----------------
# Pilasters sit at ±2.16 so they clear the widest artwork (2.35 + frame)
# AND its side plaque (outer edge |x| ≈ 1.92, see js/art.js).
arcade = empty("ArcadeBay")
A_SPAN, A_SPRING, A_APEX = 4.32, 2.3, 4.55

box("PilL", (-2.16, -0.07, 1.15), (0.20, 0.14, 2.30), arcade, TRIM, bevel=0.03)
box("PilR", (2.16, -0.07, 1.15), (0.20, 0.14, 2.30), arcade, TRIM, bevel=0.03)
box("CapL", (-2.16, -0.08, 2.36), (0.32, 0.16, 0.14), arcade, TRIM, bevel=0.03)
box("CapR", (2.16, -0.08, 2.36), (0.32, 0.16, 0.14), arcade, TRIM, bevel=0.03)
apts = [(x, -0.08, z) for (x, z) in cusped_pts(A_SPAN, A_SPRING, A_APEX, k=8, depth=0.13)]
tube("ArcadeArch", [apts], 0.045, arcade, TRIM)
box("Keel", (0, -0.08, 4.61), (0.09, 0.11, 0.22), arcade, TRIM)

# ---------------- the jali screen ----------------
# Shouldered ogee outline (foil shoulder + keel point, like real Mughal
# jali frames) filled with a honeycomb lattice. Narrow enough (0.84) to
# fit the 0.98 m gap between adjacent arcade bays.
jali = empty("Jali")
J_HW, J_SPRING, J_APEX = 0.42, 1.05, 1.82

def ogee_profile(hw, spring, apex, r1=0.16):
    """Right side of the frame, (hw, spring) -> (0, apex): a convex
    shoulder foil, then an ogee rise arriving steeply (keel point)."""
    pts = []
    cx = hw - r1
    for i in range(18):
        th = math.radians(85.0 * i / 17.0)
        pts.append((cx + r1 * math.cos(th), spring + r1 * math.sin(th)))
    x1, z1 = pts[-1]
    ctrl = (0.03 * hw, z1 + 0.33 * (apex - z1))
    for i in range(1, 15):
        t = i / 14.0
        x = (1 - t) ** 2 * x1 + 2 * (1 - t) * t * ctrl[0]
        z = (1 - t) ** 2 * z1 + 2 * (1 - t) * t * ctrl[1] + t * t * apex
        pts.append((x, z))
    return pts

prof_r = ogee_profile(J_HW, J_SPRING, J_APEX)          # ascending to apex
outline = [(-J_HW, 0.0, 0.0), (-J_HW, 0.0, J_SPRING)]
outline += [(-x, 0.0, z) for (x, z) in prof_r]
outline += [(x, 0.0, z) for (x, z) in reversed(prof_r)]
outline += [(J_HW, 0.0, J_SPRING), (J_HW, 0.0, 0.0)]
tube("JaliBorder", [outline], 0.045, jali, TRIM)
box("JaliSill", (0, 0.0, 0.02), (2 * J_HW + 0.14, 0.12, 0.10), jali, TRIM)
# leaf finial at the keel
bpy.ops.mesh.primitive_cone_add(vertices=8, radius1=0.038, radius2=0.0,
                                depth=0.10, location=(0, 0.0, J_APEX + 0.06))
finish(bpy.context.active_object, "JaliFinial", jali, TRIM, smooth=True)

# boundary as x(z) for clipping (z is monotonic along the profile)
prof_zx = [(J_SPRING, J_HW)] + [(z, x) for (x, z) in prof_r]

def x_bound(z):
    if z <= J_SPRING:
        return J_HW
    for k in range(len(prof_zx) - 1):
        z0, x0 = prof_zx[k]
        z1, x1 = prof_zx[k + 1]
        if z0 <= z <= z1:
            t = (z - z0) / max(z1 - z0, 1e-9)
            return x0 + (x1 - x0) * t
    return 0.0

def inside(x, z):
    return 0.05 <= z <= J_APEX - 0.05 and abs(x) <= x_bound(z) - 0.035

# honeycomb lattice: pointy-top hexes, deduped shared edges, run-clipped
HEX_R = 0.062
bars, seen = [], set()
dx, dz = 1.5 * HEX_R, math.sqrt(3) * HEX_R
ci = 0
x = -J_HW
while x < J_HW + dx:
    zoff = (ci % 2) * dz / 2.0
    z = -dz
    while z < J_APEX + dz:
        cx, cz = x, z + zoff
        for k in range(6):
            a0 = math.radians(60 * k + 30)
            a1 = math.radians(60 * (k + 1) + 30)
            p0 = (cx + HEX_R * math.cos(a0), cz + HEX_R * math.sin(a0))
            p1 = (cx + HEX_R * math.cos(a1), cz + HEX_R * math.sin(a1))
            key = (round((p0[0] + p1[0]) * 500), round((p0[1] + p1[1]) * 500))
            if key in seen:
                continue
            seen.add(key)
            # clip the edge to the frame region
            run = None
            for s in range(9):
                t = s / 8.0
                px = p0[0] + (p1[0] - p0[0]) * t
                pz = p0[1] + (p1[1] - p0[1]) * t
                if inside(px, pz):
                    if run is None:
                        run = [px, pz, px, pz]
                    else:
                        run[2], run[3] = px, pz
            if run and math.hypot(run[2] - run[0], run[3] - run[1]) > 0.03:
                bars.append([(run[0], 0.0, run[1]), (run[2], 0.0, run[3])])
        z += dz
    x += dx
    ci += 1
tube("JaliBars", bars, 0.014, jali, TRIM)

# arch-shaped glow plate, part of the asset so it can never misalign;
# js/corridor.js assigns the emissive material by the "Glow" name.
gl, gr = [], []
NZ = 30
for i in range(NZ + 1):
    z = 0.04 + (J_APEX - 0.07 - 0.04) * i / NZ
    xb = max(x_bound(z) - 0.02, 0.01)
    gl.append((-xb, 0.02, z))
    gr.append((xb, 0.02, z))
glow_verts = gl + list(reversed(gr))
glow_me = bpy.data.meshes.new("Glow")
glow_me.from_pydata(glow_verts, [], [tuple(range(len(glow_verts)))])
glow_me.update()
glow_me.materials.append(MARBLE)
glow_me.uv_layers.new(name="UVMap")
glow_ob = bpy.data.objects.new("Glow", glow_me)
bpy.context.scene.collection.objects.link(glow_ob)
glow_ob.parent = jali

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
aim((0.0, -10.5, 2.9), (0.0, 0.0, 2.9))
render(os.path.join(prev, "preview_mughal_portal.png"), {"Portal"})
aim((0.0, -6.0, 2.2), (0.0, 0.0, 2.0))
render(os.path.join(prev, "preview_mughal_arcade.png"), {"ArcadeBay"})
aim((0.0, -3.2, 1.1), (0.0, 0.0, 1.1))
render(os.path.join(prev, "preview_mughal_jali.png"), {"Jali"})
