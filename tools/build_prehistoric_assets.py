# Builds the Prehistoric cave assets → assets/models/prehistoric.glb.
# Uses the real PBR height map from the concept-art brief for genuine rock
# displacement (not sine-wave planes).
#
#   /Applications/Blender.app/Contents/MacOS/Blender --background \
#       --python tools/build_prehistoric_assets.py
#
# Named parts (contract with js/world.js buildCave; JS re-materials by name):
#   Archway     — eroded, asymmetric natural rock arch for the cave mouth.
#                 Opening ~3.0 wide x 2.9 tall (clears the DOOR_W hub door).
#   WallBayA/B  — displaced rock wall panels, ~4.5 wide, art-safe flatter
#                 central zone. Modeled facing Blender -Y (placed on both
#                 walls in JS with rotation.y = -side*pi/2, like ArcadeBay).
#   CeilingBay  — lumpy low rock ceiling panel, hangs DOWN 0..0.7 m.
import bpy
import math
import os

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "assets", "models", "prehistoric.glb")
HEIGHT_IMG = os.path.join(
    HERE, "..", "concept-art", "subsections", "prehistoric",
    "textures", "cave_limestone_wall_height_2k.png")

# must match js/world.js
CAVE_W = 6.4
CAVE_H = 3.7
DOOR_W = 3.4
BAY_LEN = 4.5     # wall/ceiling module length along the corridor

# ---------------- helpers ----------------

def pmat(name, color=(0.5, 0.42, 0.32)):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes.get("Principled BSDF")
    b.inputs["Base Color"].default_value = (*color, 1.0)
    b.inputs["Roughness"].default_value = 0.95
    return m

ROCK = None  # set after factory reset

def uv_plane(nx, ny, w, h):
    """Grid mesh in the X(width)/Z(height) plane, facing -Y, with a UV that
    tiles the rock detail ~every 3 m. Returns the bmesh-free object."""
    verts, faces, uvs = [], [], []
    for j in range(ny + 1):
        for i in range(nx + 1):
            x = -w / 2 + w * i / nx
            z = h * j / ny
            verts.append((x, 0.0, z))
            uvs.append((x / 3.0, z / 3.0))
    for j in range(ny):
        for i in range(nx):
            a = j * (nx + 1) + i
            faces.append((a, a + 1, a + nx + 2, a + nx + 1))
    me = bpy.data.meshes.new("bay")
    me.from_pydata(verts, [], faces)
    me.update()
    uvl = me.uv_layers.new(name="UVMap")
    for poly in me.polygons:
        for li in poly.loop_indices:
            vi = me.loops[li].vertex_index
            uvl.data[li].uv = uvs[vi]
    return me

def height_texture():
    if "caveHeight" in bpy.data.textures:
        return bpy.data.textures["caveHeight"]
    img = bpy.data.images.load(os.path.abspath(HEIGHT_IMG))
    t = bpy.data.textures.new("caveHeight", type="IMAGE")
    t.image = img
    t.extension = "REPEAT"
    return t

def noise_texture(name, size):
    t = bpy.data.textures.new(name, type="CLOUDS")
    t.noise_scale = size
    return t

def displace_bay(name, parent, w, h, out_axis=-1, art_safe=True,
                 img_strength=0.55, img_mid=0.42, noise_strength=0.45,
                 noise_size=1.6):
    """Build a displaced rock panel. out_axis: which local-Y direction rock
    bulges toward the viewer (protrusions capped so the path stays clear)."""
    nx = max(6, int(w * 5))
    ny = max(6, int(h * 5))
    me = uv_plane(nx, ny, w, h)
    ob = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(ob)

    # vertex group: 1 = rough (displace), 0 = art-safe central rectangle
    vg = ob.vertex_groups.new(name="rough")
    for v in me.vertices:
        x, z = v.co.x, v.co.z
        safe = art_safe and abs(x) < 1.45 and 0.9 < z < 2.65
        w_edge = 1.0
        if safe:
            w_edge = 0.0
        else:
            # feather near the safe rectangle so it blends
            dx = max(0.0, 1.45 - abs(x))
            dz = max(0.0, min(z - 0.9, 2.65 - z)) if 0.9 < z < 2.65 else 1.0
            if art_safe and dx > 0 and 0.9 < z < 2.65:
                w_edge = min(1.0, max(dx, dz) * 2.2)
        vg.add([v.index], w_edge, "REPLACE")

    # fine rock detail from the real height map (via UV)
    d1 = ob.modifiers.new("imgDisp", "DISPLACE")
    d1.texture = height_texture()
    d1.texture_coords = "UV"
    d1.direction = "Y"
    d1.mid_level = img_mid
    d1.strength = out_axis * img_strength
    d1.vertex_group = "rough"

    # large-scale forms so the silhouette breaks up
    d2 = ob.modifiers.new("bigDisp", "DISPLACE")
    d2.texture = noise_texture(name + "N", noise_size)
    d2.texture_coords = "GLOBAL"
    d2.direction = "Y"
    d2.mid_level = 0.45
    d2.strength = out_axis * noise_strength
    d2.vertex_group = "rough"

    bpy.context.view_layer.objects.active = ob
    bpy.ops.object.modifier_apply(modifier="imgDisp")
    bpy.ops.object.modifier_apply(modifier="bigDisp")

    me.materials.append(ROCK)
    for p in me.polygons:
        p.use_smooth = True
    ob.parent = parent
    return ob

def box_uv(me, scale=3.0):
    uv = me.uv_layers.get("UVMap") or me.uv_layers.new(name="UVMap")
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

def empty(name):
    e = bpy.data.objects.new(name, None)
    bpy.context.scene.collection.objects.link(e)
    return e

# ================= build =================
bpy.ops.wm.read_factory_settings(use_empty=True)
ROCK = pmat("CaveRock")

# ---- WallBay A / B (two noise seeds via different noise sizes/positions) ----
# out_axis=+1: bulk of rock recedes AWAY from the walkway (only the height
# map's dark pockets dimple toward the player, capped well inside the
# collision clearance). Art-safe centre stays perfectly flat (weight 0).
wallA = empty("WallBayA")
p = displace_bay("WallA_mesh", wallA, BAY_LEN, CAVE_H + 0.8, out_axis=1,
                 img_strength=0.6, img_mid=0.55, noise_strength=0.35,
                 noise_size=1.7)
wallB = empty("WallBayB")
p = displace_bay("WallB_mesh", wallB, BAY_LEN, CAVE_H + 0.8, out_axis=1,
                 img_strength=0.6, img_mid=0.5, noise_strength=0.35,
                 noise_size=1.15)

# ---- CeilingBay: horizontal panel, hangs downward ----
ceil = empty("CeilingBay")
me = uv_plane(int((CAVE_W + 1.6) * 4), int(BAY_LEN * 4), CAVE_W + 1.6, BAY_LEN)
# rotate the plane flat: it was built in X/Z; lay it into X/Y
for v in me.vertices:
    v.co = (v.co.x, v.co.z, 0.0)
me.update()
cob = bpy.data.objects.new("Ceil_mesh", me)
bpy.context.scene.collection.objects.link(cob)
d1 = cob.modifiers.new("imgDisp", "DISPLACE")
d1.texture = height_texture(); d1.texture_coords = "UV"; d1.direction = "Z"
d1.mid_level = 0.0; d1.strength = -0.45   # hang down 0..0.45
d2 = cob.modifiers.new("bigDisp", "DISPLACE")
d2.texture = noise_texture("ceilN", 2.2); d2.texture_coords = "GLOBAL"
d2.direction = "Z"; d2.mid_level = 0.35; d2.strength = -0.5
bpy.context.view_layer.objects.active = cob
bpy.ops.object.modifier_apply(modifier="imgDisp")
bpy.ops.object.modifier_apply(modifier="bigDisp")
me.materials.append(ROCK)
for pp in me.polygons:
    pp.use_smooth = True
cob.parent = ceil

# ---- Archway: chunky eroded rock surround for the cave mouth ----
arch = empty("Archway")
AW, AH, AT = CAVE_W + 2.2, CAVE_H + 1.4, 1.5      # outer block
OPEN_W, OPEN_H = 3.1, 3.0                          # clear opening
# slab
bpy.ops.mesh.primitive_cube_add(size=1, location=(0, AT / 2, AH / 2))
slab = bpy.context.active_object
slab.scale = (AW, AT, AH)
bpy.ops.object.transform_apply(scale=True)
# opening cutter: rounded-top, slightly asymmetric arch profile
prof = []
prof.append((-OPEN_W / 2 - 0.15, -0.2))
prof.append((-OPEN_W / 2 - 0.10, OPEN_H * 0.52))
for k in range(21):
    a = math.pi * k / 20.0
    x = -math.cos(a) * (OPEN_W / 2) * (1.0 + 0.06 * math.sin(a * 3))
    z = OPEN_H * 0.62 + math.sin(a) * (OPEN_H * 0.40)
    prof.append((x + 0.12 * math.sin(a * 2), z))   # asymmetry
prof.append((OPEN_W / 2 + 0.10, OPEN_H * 0.52))
prof.append((OPEN_W / 2 + 0.15, -0.2))
n = len(prof)
cv = [(x, -0.5, z) for (x, z) in prof] + [(x, AT + 0.5, z) for (x, z) in prof]
cf = [tuple(range(n)), tuple(range(2 * n - 1, n - 1, -1))]
for i in range(n):
    j = (i + 1) % n
    cf.append((i, j, n + j, n + i))
cme = bpy.data.meshes.new("cut"); cme.from_pydata(cv, [], cf); cme.update()
cutter = bpy.data.objects.new("cut", cme)
bpy.context.scene.collection.objects.link(cutter)
bpy.context.view_layer.objects.active = slab
mod = slab.modifiers.new("cut", "BOOLEAN")
mod.operation = "DIFFERENCE"; mod.object = cutter; mod.solver = "EXACT"
bpy.ops.object.modifier_apply(modifier="cut")
bpy.data.objects.remove(cutter)
# erode the surround with the height map + noise (light, keeps opening clear)
# voxel-remesh to uniform rock topology (even faces displace without tenting)
rm = slab.modifiers.new("remesh", "REMESH")
rm.mode = "VOXEL"; rm.voxel_size = 0.14; rm.adaptivity = 0.35
bpy.context.view_layer.objects.active = slab
bpy.ops.object.modifier_apply(modifier="remesh")
# gentle organic erosion along vertex normals (now safe — even topology)
ed = slab.modifiers.new("erode", "DISPLACE")
ed.texture = noise_texture("archN", 0.9); ed.texture_coords = "GLOBAL"
ed.direction = "NORMAL"; ed.mid_level = 0.5; ed.strength = 0.12
bpy.ops.object.modifier_apply(modifier="erode")
slab.name = "Arch_mesh"
box_uv(slab.data, scale=2.2)  # larger rock grain on the arch (README)
slab.data.materials.clear(); slab.data.materials.append(ROCK)
for pp in slab.data.polygons:
    pp.use_smooth = True
slab.parent = arch

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
aim((0.0, -9.0, 2.6), (0.0, 0.0, 2.2))
render(os.path.join(prev, "preview_pre_arch.png"), {"Archway"})
aim((0.0, -6.0, 2.0), (0.0, 0.0, 2.0))
render(os.path.join(prev, "preview_pre_wall.png"), {"WallBayA"})
aim((0.0, -0.2, 5.5), (0.0, 2.2, 0.0))
render(os.path.join(prev, "preview_pre_ceil.png"), {"CeilingBay"})
