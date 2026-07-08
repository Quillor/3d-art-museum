# Builds the Gothic architectural assets (ribbed vault bay + pointed-arch
# portal facade) and exports them as assets/models/gothic.glb.
#
#   /Applications/Blender.app/Contents/MacOS/Blender --background \
#       --python tools/build_gothic_assets.py
#
# Everything is modeled in Blender coords (Z up, corridor along +Y); the glTF
# exporter converts to Three.js coords (Y up, corridor along -Z).
#
# Scene layout (object names are the contract with js/corridor.js):
#   Vault    — one quadripartite rib-vault bay, 7.0 wide x 5.5 long.
#              Springing 4.2, apex 8.05 (for a corridor ceilH of 8.2).
#              Children: Web, RibDiag, RibWallL, RibWallR, ArchT, Corbels, Boss
#   EndArch  — an extra transverse arch + corbels for the far end of the
#              last bay (each bay only carries the arch on its near edge).
#   Portal   — 7.0 x 8.2 facade slab with a pointed-arch opening
#              (3.4 wide, springing 2.3, apex 4.7) + archivolts, capitals,
#              hood molding, plinths.
import bpy
import math
import os

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "assets", "models", "gothic.glb")

# ---- corridor dimensions (must match js/corridor.js + js/styles.js) ----
HALL_W = 7.0
BAY_LEN = 5.5
CEIL_H = 8.2      # gothic ceilH in styles.js
SPRING = 4.2      # vault springing height
APEX = 8.05       # vault apex height

DOOR_W = 3.4      # portal opening (world.js DOOR_W)
P_SPRING = 2.3    # portal arch springing
P_APEX = 4.7      # portal arch apex

# ---------------- pointed-arch math ----------------
# Two-centred arch spanning [-s/2, s/2], springing at z=spring, apex at z=apex.
# Right arc centred at (c, spring) with c = s/2 - R; pointed when rise > s/2.

def arch_params(span, spring, apex):
    rise = apex - spring
    R = (rise * rise + span * span / 4.0) / span
    c = span / 2.0 - R
    return R, c

def arch_z(x, span, spring, apex):
    """Height of the arch at horizontal offset x from centre."""
    R, c = arch_params(span, spring, apex)
    ax = abs(x)
    d = R * R - (ax - c) ** 2
    return spring + math.sqrt(max(d, 0.0))

def arch_inv(h, span, spring, apex, lo, hi):
    """Inverse: |x| >= 0 such that arch_z == h (bisection, arch monotonic)."""
    for _ in range(48):
        mid = (lo + hi) / 2.0
        if arch_z(mid, span, spring, apex) > h:
            lo = mid
        else:
            hi = mid
    return (lo + hi) / 2.0

def f(x):   # transverse profile (across the 7 m width)
    return arch_z(x, HALL_W, SPRING, APEX)

def g(y):   # longitudinal profile (along the 5.5 m bay, centred at 2.75)
    return arch_z(y - BAY_LEN / 2.0, BAY_LEN, SPRING, APEX)

def g_inv(h):
    """y in [0, BAY_LEN/2] with g(y) == h."""
    x = arch_inv(h, BAY_LEN, SPRING, APEX, 0.0, BAY_LEN / 2.0)
    return BAY_LEN / 2.0 - x

def f_inv(h):
    """x in [0, HALL_W/2] with f(x) == h."""
    return arch_inv(h, HALL_W, SPRING, APEX, 0.0, HALL_W / 2.0)

# ---------------- scene helpers ----------------

def pmat(name, color, rough=0.9, metal=0.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    bsdf = m.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*color, 1.0)
    bsdf.inputs["Roughness"].default_value = rough
    bsdf.inputs["Metallic"].default_value = metal
    return m

def link(ob, parent):
    bpy.context.scene.collection.objects.link(ob)
    ob.parent = parent
    return ob

def mesh_obj(name, verts, faces, parent, mat, flip_down=False, smooth=True):
    me = bpy.data.meshes.new(name)
    me.from_pydata(verts, [], faces)
    me.update()
    if flip_down:
        # vault surfaces are seen from below — make normals point down
        up = sum(p.normal.z for p in me.polygons)
        if up > 0:
            me.flip_normals()
    for p in me.polygons:
        p.use_smooth = smooth
    me.materials.append(mat)
    box_uv(me)
    ob = bpy.data.objects.new(name, me)
    return link(ob, parent)

def box_uv(me, scale=4.0):
    """Context-free box projection: project each face along its dominant
    normal axis, 1 UV tile per `scale` metres (matches wallUV=4)."""
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

def grid_faces(nu, nv):
    faces = []
    for i in range(nu - 1):
        for j in range(nv - 1):
            a = i * nv + j
            faces.append((a, a + 1, a + nv + 1, a + nv))
    return faces

def tube(name, splines, radius, parent, mat):
    """Polyline(s) swept with a circular profile, converted to mesh."""
    cu = bpy.data.curves.new(name, "CURVE")
    cu.dimensions = "3D"
    cu.bevel_depth = radius
    cu.bevel_resolution = 4
    cu.use_fill_caps = True
    for pts in splines:
        sp = cu.splines.new("POLY")
        sp.points.add(len(pts) - 1)
        for p, pt in zip(sp.points, pts):
            p.co = (pt[0], pt[1], pt[2], 1.0)
    ob = bpy.data.objects.new(name, cu)
    link(ob, parent)
    # convert to mesh so the exporter gets real geometry
    bpy.context.view_layer.objects.active = ob
    ob.select_set(True)
    bpy.ops.object.convert(target="MESH")
    ob = bpy.context.active_object
    ob.name = name
    for p in ob.data.polygons:
        p.use_smooth = True
    ob.data.materials.append(mat)
    box_uv(ob.data, scale=1.0)
    ob.select_set(False)
    return ob

def box(name, loc, dim, parent, mat, bevel=0.0):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    ob = bpy.context.active_object
    ob.name = name
    ob.scale = (dim[0], dim[1], dim[2])
    bpy.ops.object.transform_apply(scale=True)
    if bevel > 0:
        m = ob.modifiers.new("bev", "BEVEL")
        m.width = bevel
        m.segments = 2
        bpy.ops.object.modifier_apply(modifier="bev")
    ob.data.materials.append(mat)
    box_uv(ob.data)
    # primitive was linked to the scene collection already; just parent it
    ob.parent = parent
    ob.select_set(False)
    return ob

def lerp(a, b, t):
    return a + (b - a) * t

# ================= build =================
bpy.ops.wm.read_factory_settings(use_empty=True)

STONE = pmat("VaultStone", (0.42, 0.40, 0.36))
TRIM = pmat("TrimStone", (0.55, 0.52, 0.47))
GILT = pmat("Gilt", (0.72, 0.55, 0.24), rough=0.35, metal=0.8)

def empty(name):
    e = bpy.data.objects.new(name, None)
    bpy.context.scene.collection.objects.link(e)
    return e

# ---------------- the vault bay ----------------
vault = empty("Vault")
HW = HALL_W / 2.0

# --- webs: 4 patches meeting exactly at the groins ---
# South/North webs are barrel surfaces z=f(x); East/West are z=g(y).
NU, NV = 48, 9

def south_web(mirror):
    verts = []
    for i in range(NU):
        x = lerp(-HW, HW, i / (NU - 1))
        yg = g_inv(f(x))                       # groin plan position
        for j in range(NV):
            y = lerp(0.0, yg, j / (NV - 1))
            if mirror:
                y = BAY_LEN - y
            verts.append((x, y, f(x)))
    return verts

def west_web(mirror):
    verts = []
    for j in range(NU):
        y = lerp(0.0, BAY_LEN, j / (NU - 1))
        xg = -f_inv(g(y))                      # groin plan position
        for i in range(NV):
            x = lerp(-HW, xg, i / (NV - 1))
            if mirror:
                x = -x
            verts.append((x, y, g(y)))
    return verts

web_verts, web_faces = [], []
for patch in (south_web(False), south_web(True), west_web(False), west_web(True)):
    base = len(web_verts)
    web_verts += patch
    web_faces += [tuple(base + k for k in q) for q in grid_faces(NU, NV)]
mesh_obj("Web", web_verts, web_faces, vault, STONE, flip_down=True)

# --- ribs (paths sunk 0.04 below the web so the tube protrudes) ---
DROP = 0.04

# transverse arch on the near edge of the bay
pts = [(lerp(-HW, HW, t / 47.0), 0.03, f(lerp(-HW, HW, t / 47.0)) - DROP)
       for t in range(48)]
tube("ArchT", [pts], 0.12, vault, TRIM)

# wall ribs, both sides, full bay length
for side, nm in ((-1, "RibWallL"), (1, "RibWallR")):
    pts = [(side * (HW - 0.06), lerp(0.0, BAY_LEN, t / 39.0),
            g(lerp(0.0, BAY_LEN, t / 39.0)) - DROP) for t in range(40)]
    tube(nm, [pts], 0.08, vault, TRIM)

# diagonal (groin) ribs: 4 branches from the corners to the crown
def groin(sx, sy):
    pts = [(sx * HW, (BAY_LEN / 2.0) * (1 - sy) if False else (0.0 if sy > 0 else BAY_LEN), SPRING - DROP)]
    for k in range(1, 37):
        x = sx * HW * (1 - k / 36.0)
        h = f(x)
        y = g_inv(h)
        if sy < 0:
            y = BAY_LEN - y
        pts.append((x, y, h - DROP))
    return pts

tube("RibDiag", [groin(-1, 1), groin(1, 1), groin(-1, -1), groin(1, -1)],
     0.10, vault, TRIM)

# boss at the crown
bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=0.20,
                                      location=(0, BAY_LEN / 2.0, APEX - 0.06))
boss = bpy.context.active_object
boss.name = "Boss"
for p in boss.data.polygons:
    p.use_smooth = True
boss.data.materials.append(GILT)
box_uv(boss.data)
boss.parent = vault
boss.select_set(False)

# corbels where the ribs gather (near edge only — tiles like ArchT)
def corbels(parent, y):
    for side, nm in ((-1, "CorbelL"), (1, "CorbelR")):
        bpy.ops.mesh.primitive_cone_add(vertices=8, radius1=0.07, radius2=0.30,
                                        depth=0.65,
                                        location=(side * (HW - 0.22), y, SPRING - 0.30))
        c = bpy.context.active_object
        c.name = nm + parent.name
        c.data.materials.append(TRIM)
        box_uv(c.data)
        c.parent = parent
        c.select_set(False)

corbels(vault, 0.12)

# ---------------- the end arch (far boundary of the last bay) ----------------
end = empty("EndArch")
pts = [(lerp(-HW, HW, t / 47.0), 0.03, f(lerp(-HW, HW, t / 47.0)) - DROP)
       for t in range(48)]
tube("ArchTEnd", [pts], 0.12, end, TRIM)
corbels(end, 0.12)

# ---------------- the portal facade ----------------
portal = empty("Portal")
T = 0.55  # slab thickness; occupies y in [0, T]

# slab with the arch opening cut through
box("Slab", (0, T / 2.0, CEIL_H / 2.0), (HALL_W, T, CEIL_H), portal, STONE)
slab = portal.children[-1] if portal.children else None
# (box() returns the object; grab it explicitly instead)
slab = bpy.data.objects["Slab"]

# cutter: extruded pointed-arch profile
prof = [(-DOOR_W / 2.0, -0.2)]
prof += [(-DOOR_W / 2.0, P_SPRING)]
for k in range(1, 25):
    zz = lerp(P_SPRING, P_APEX, k / 24.0)
    prof.append((-arch_inv(zz, DOOR_W, P_SPRING, P_APEX, 0.0, DOOR_W / 2.0), zz))
for k in range(24, 0, -1):
    zz = lerp(P_SPRING, P_APEX, k / 24.0)
    prof.append((arch_inv(zz, DOOR_W, P_SPRING, P_APEX, 0.0, DOOR_W / 2.0), zz))
prof += [(DOOR_W / 2.0, P_SPRING), (DOOR_W / 2.0, -0.2)]

cv, cf = [], []
n = len(prof)
for (x, z) in prof:
    cv.append((x, -0.4, z))
for (x, z) in prof:
    cv.append((x, T + 0.4, z))
cf.append(tuple(range(n)))                      # front cap
cf.append(tuple(range(2 * n - 1, n - 1, -1)))   # back cap
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
box_uv(slab.data)  # re-project after the cut

# archivolt orders + hood molding: concentric pointed arches
R0, C0 = arch_params(DOOR_W, P_SPRING, P_APEX)

def order_path(d, jambs=True):
    """Path at radial offset d outside the opening edge."""
    R = R0 + d
    x_spring = DOOR_W / 2.0 + d
    pts = []
    if jambs:
        pts.append((-x_spring, 0.0, 0.0))
    th_max = math.acos(-C0 / R)
    # left arc: mirror of the right one
    for k in range(25):
        th = th_max * (k / 24.0)          # 0 at springing, th_max at apex
        x = C0 + R * math.cos(th)
        z = P_SPRING + R * math.sin(th)
        pts.append((-x, 0.0, z))
    for k in range(24, -1, -1):
        th = th_max * (k / 24.0)
        x = C0 + R * math.cos(th)
        z = P_SPRING + R * math.sin(th)
        pts.append((x, 0.0, z))
    if jambs:
        pts.append((x_spring, 0.0, 0.0))
    return pts

def at_y(pts, y):
    return [(x, y, z) for (x, _, z) in pts]

tube("Archivolt1", [at_y(order_path(0.14), 0.10)], 0.085, portal, TRIM)
tube("Archivolt2", [at_y(order_path(0.36), 0.02)], 0.105, portal, TRIM)
tube("Hood", [at_y(order_path(0.58, jambs=False), -0.05)], 0.075, portal, TRIM)

# capitals at the springing, plinths at the floor
for side in (-1, 1):
    x = side * (DOOR_W / 2.0 + 0.25)
    box("Capital" + ("L" if side < 0 else "R"),
        (x, 0.10, P_SPRING + 0.02), (0.62, 0.5, 0.30), portal, TRIM, bevel=0.05)
    box("Plinth" + ("L" if side < 0 else "R"),
        (x, 0.10, 0.28), (0.68, 0.55, 0.56), portal, TRIM, bevel=0.05)

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
cam_data.lens = 22

import mathutils

def aim(cam, frm, to):
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
# vault: from inside the corridor looking up at the bay
aim(cam, (0.0, -3.6, 1.8), (0.0, 2.75, 6.8))
render(os.path.join(prev, "preview_vault.png"), {"Vault", "EndArch"})
# portal: straight on
aim(cam, (0.0, -10.5, 3.2), (0.0, 0.0, 3.6))
render(os.path.join(prev, "preview_portal.png"), {"Portal"})
