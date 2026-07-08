#!/usr/bin/env python3
"""Generate modular GLB architecture assets for the museum.

This is a dependency-free bridge until Blender is available locally. It writes
real glTF/GLB mesh assets, not runtime Three.js box assemblies, so the app can
load era portals through GLTFLoader and later swap these files for Blender-made
equivalents.
"""

from __future__ import annotations

import json
import math
import struct
from pathlib import Path


OUT_DIR = Path("assets/architecture")


def vadd(a, b):
    return (a[0] + b[0], a[1] + b[1], a[2] + b[2])


def vsub(a, b):
    return (a[0] - b[0], a[1] - b[1], a[2] - b[2])


def vcross(a, b):
    return (
        a[1] * b[2] - a[2] * b[1],
        a[2] * b[0] - a[0] * b[2],
        a[0] * b[1] - a[1] * b[0],
    )


def vnorm(a):
    l = math.sqrt(a[0] * a[0] + a[1] * a[1] + a[2] * a[2])
    if l < 1e-8:
        return (0.0, 1.0, 0.0)
    return (a[0] / l, a[1] / l, a[2] / l)


def rotate(p, rot):
    x, y, z = p
    rx, ry, rz = rot
    if rx:
        c, s = math.cos(rx), math.sin(rx)
        y, z = y * c - z * s, y * s + z * c
    if ry:
        c, s = math.cos(ry), math.sin(ry)
        x, z = x * c + z * s, -x * s + z * c
    if rz:
        c, s = math.cos(rz), math.sin(rz)
        x, y = x * c - y * s, x * s + y * c
    return (x, y, z)


def color_tuple(hex_color):
    return (
        ((hex_color >> 16) & 255) / 255.0,
        ((hex_color >> 8) & 255) / 255.0,
        (hex_color & 255) / 255.0,
        1.0,
    )


class MeshBuilder:
    def __init__(self, name):
        self.name = name
        self.prims = {}

    def prim(self, color):
        if color not in self.prims:
            self.prims[color] = {"pos": [], "norm": [], "idx": []}
        return self.prims[color]

    def tri(self, color, a, b, c, normal=None):
        p = self.prim(color)
        n = normal or vnorm(vcross(vsub(b, a), vsub(c, a)))
        base = len(p["pos"])
        p["pos"].extend([a, b, c])
        p["norm"].extend([n, n, n])
        p["idx"].extend([base, base + 1, base + 2])

    def quad(self, color, a, b, c, d):
        n = vnorm(vcross(vsub(b, a), vsub(c, a)))
        p = self.prim(color)
        base = len(p["pos"])
        p["pos"].extend([a, b, c, d])
        p["norm"].extend([n, n, n, n])
        p["idx"].extend([base, base + 1, base + 2, base, base + 2, base + 3])

    def box(self, color, center, size, rot=(0, 0, 0)):
        sx, sy, sz = (size[0] / 2, size[1] / 2, size[2] / 2)
        corners = [
            (-sx, -sy, -sz), (sx, -sy, -sz), (sx, sy, -sz), (-sx, sy, -sz),
            (-sx, -sy, sz), (sx, -sy, sz), (sx, sy, sz), (-sx, sy, sz),
        ]
        pts = [vadd(rotate(c, rot), center) for c in corners]
        faces = [(0, 1, 2, 3), (5, 4, 7, 6), (4, 0, 3, 7), (1, 5, 6, 2), (3, 2, 6, 7), (4, 5, 1, 0)]
        for f in faces:
            self.quad(color, pts[f[0]], pts[f[1]], pts[f[2]], pts[f[3]])

    def cylinder(self, color, center, radius, height, axis="y", seg=16):
        def pt(a, h):
            ca, sa = math.cos(a) * radius, math.sin(a) * radius
            if axis == "y":
                return (center[0] + ca, center[1] + h, center[2] + sa)
            if axis == "x":
                return (center[0] + h, center[1] + ca, center[2] + sa)
            return (center[0] + ca, center[1] + sa, center[2] + h)

        h0, h1 = -height / 2, height / 2
        cap0, cap1 = pt(0, h0), pt(0, h1)
        if axis == "y":
            cap0, cap1 = (center[0], center[1] + h0, center[2]), (center[0], center[1] + h1, center[2])
        elif axis == "x":
            cap0, cap1 = (center[0] + h0, center[1], center[2]), (center[0] + h1, center[1], center[2])
        else:
            cap0, cap1 = (center[0], center[1], center[2] + h0), (center[0], center[1], center[2] + h1)
        for i in range(seg):
            a0, a1 = (i / seg) * math.tau, ((i + 1) / seg) * math.tau
            p00, p01, p11, p10 = pt(a0, h0), pt(a1, h0), pt(a1, h1), pt(a0, h1)
            self.quad(color, p00, p01, p11, p10)
            self.tri(color, cap0, p01, p00)
            self.tri(color, cap1, p10, p11)

    def torus(self, color, center, radius, tube, seg=40, tube_seg=10):
        grid = []
        for i in range(seg + 1):
            u = (i / seg) * math.tau
            row = []
            for j in range(tube_seg + 1):
                v = (j / tube_seg) * math.tau
                x = center[0] + (radius + tube * math.cos(v)) * math.cos(u)
                y = center[1] + (radius + tube * math.cos(v)) * math.sin(u)
                z = center[2] + tube * math.sin(v)
                row.append((x, y, z))
            grid.append(row)
        for i in range(seg):
            for j in range(tube_seg):
                self.quad(color, grid[i][j], grid[i + 1][j], grid[i + 1][j + 1], grid[i][j + 1])

    def prism(self, color, points, depth, z=0.0):
        front = [(x, y, z + depth / 2) for x, y in points]
        back = [(x, y, z - depth / 2) for x, y in points]
        for i in range(1, len(points) - 1):
            self.tri(color, front[0], front[i], front[i + 1])
            self.tri(color, back[0], back[i + 1], back[i])
        for i in range(len(points)):
            j = (i + 1) % len(points)
            self.quad(color, back[i], back[j], front[j], front[i])

    def lattice(self, color, x, y, z, w, h, depth, bars=4):
        for i in range(bars + 1):
            px = x - w / 2 + w * i / bars
            self.box(color, (px, y, z), (0.055, h, depth))
        for j in range(bars + 1):
            py = y - h / 2 + h * j / bars
            self.box(color, (x, py, z), (w, 0.055, depth))


def outline_round(dw=3.4, dh=3.5, n=18):
    hw, spring = dw / 2, dh * 0.55
    pts = [(-hw, 0), (-hw, spring)]
    for i in range(n + 1):
        a = math.pi - math.pi * i / n
        pts.append((math.cos(a) * hw, spring + math.sin(a) * hw))
    pts += [(hw, spring), (hw, 0)]
    return pts


def outline_pointed(dw=3.4, dh=3.5, n=10):
    hw, spring, apex = dw / 2, dh * 0.42, dh * 1.16
    pts = [(-hw, 0), (-hw, spring)]
    for i in range(1, n + 1):
        t = i / n
        pts.append((-hw * (1 - t), spring * (1 - t) + apex * t))
    for i in range(1, n + 1):
        t = i / n
        pts.append((hw * t, apex * (1 - t) + spring * t))
    pts += [(hw, 0)]
    return pts


def outline_keel(dw=3.4, dh=3.5, n=12):
    hw, spring, apex = dw / 2, dh * 0.38, dh * 1.32
    pts = [(-hw, 0), (-hw, spring)]
    for i in range(1, n + 1):
        t = i / n
        x = -hw * (1 - t)
        y = spring + (apex - spring) * (math.sin(t * math.pi / 2) ** 0.82)
        pts.append((x, y))
    for i in range(1, n + 1):
        t = i / n
        x = hw * t
        y = apex - (apex - spring) * (1 - math.cos(t * math.pi / 2)) ** 0.82
        pts.append((x, y))
    pts += [(hw, 0)]
    return pts


def outline_rock(dw=3.4, dh=3.5):
    hw = dw / 2
    return [
        (-hw * 1.1, 0), (-hw * 1.15, dh * 0.25), (-hw * 0.84, dh * 0.62),
        (-hw * 0.42, dh * 1.04), (0, dh * 1.18), (hw * 0.44, dh),
        (hw * 0.88, dh * 0.56), (hw * 1.12, dh * 0.2), (hw * 1.1, 0),
    ]


def add_voussoirs(m, color, outline, depth=0.72, size=(0.32, 0.22), min_y=0.15):
    for a, b in zip(outline, outline[1:]):
        ax, ay = a
        bx, by = b
        if (ay + by) / 2 < min_y:
            continue
        dx, dy = bx - ax, by - ay
        seg = math.hypot(dx, dy)
        pieces = max(1, int(seg / 0.28))
        ang = math.atan2(dy, dx)
        for p in range(pieces):
            t = (p + 0.5) / pieces
            x, y = ax + dx * t, ay + dy * t
            m.box(color, (x, y, 0.34), (size[0], size[1], depth), (0, 0, ang))


def layered_rect(m, color, pad_w=1.4, pad_h=0.8, thick=0.34, depth=0.7, door_w=3.4, door_h=3.5):
    ow, oh = door_w + pad_w, door_h + pad_h
    m.box(color, (-(door_w / 2 + thick / 2), oh / 2, 0.34), (thick, oh, depth))
    m.box(color, ((door_w / 2 + thick / 2), oh / 2, 0.34), (thick, oh, depth))
    m.box(color, (0, oh - thick / 2, 0.34), (ow, thick, depth))
    m.box(color, (0, 0.08, 0.34), (ow, 0.16, depth))


def columns(m, color, xs, h=4.2, z=0.34, r=0.16):
    for x in xs:
        m.cylinder(color, (x, h / 2, z), r, h, "y", 20)
        m.box(color, (x, 0.1, z), (r * 3.4, 0.2, r * 3.4))
        m.box(color, (x, h - 0.18, z), (r * 3.8, 0.24, r * 3.8))
        m.box(color, (x, h - 0.48, z), (r * 4.2, 0.26, r * 2.4))


def asset_classical():
    m = MeshBuilder("classical_doric_portal")
    marble, shadow, gold = 0xE6DFD0, 0xCFC7B6, 0xB9AD95
    columns(m, marble, [-2.45, 2.45], 4.55, 0.3, 0.18)
    m.box(marble, (0, 3.82, 0.32), (5.65, 0.34, 0.8))
    m.box(shadow, (0, 4.18, 0.33), (5.95, 0.32, 0.82))
    m.prism(marble, [(-2.95, 4.35), (0, 5.08), (2.95, 4.35)], 0.72, 0.34)
    for i in range(8):
        m.box(gold, (-2.15 + i * 0.62, 3.58, 0.78), (0.22, 0.18, 0.12))
    return m


def asset_gothic():
    m = MeshBuilder("gothic_pointed_arch")
    stone, dark, blue = 0x6A6258, 0x3C372F, 0x4A6F85
    add_voussoirs(m, stone, outline_pointed(), 0.82, (0.32, 0.24), 0.45)
    columns(m, stone, [-2.22, 2.22], 4.55, 0.24, 0.11)
    columns(m, stone, [-2.55, 2.55], 4.05, 0.18, 0.08)
    for x in [-2.9, 2.9]:
        m.box(dark, (x, 1.65, 0.22), (0.28, 1.9, 0.38))
        m.cylinder(stone, (x, 2.67, 0.22), 0.23, 0.32, "z", 14)
        m.box(blue, (x, 1.95, 0.46), (0.12, 1.1, 0.08))
    return m


def asset_renaissance():
    m = MeshBuilder("renaissance_round_arch")
    plaster, trim, gold = 0xCBB794, 0xA8946E, 0xC9A256
    layered_rect(m, trim, 1.7, 0.98, 0.28, 0.75)
    add_voussoirs(m, plaster, outline_round(), 0.66, (0.3, 0.22), 1.75)
    columns(m, trim, [-2.35, 2.35], 4.12, 0.26, 0.12)
    for x in [-1.35, 0, 1.35]:
        m.box(gold, (x, 4.05, 0.74), (0.52, 0.08, 0.12))
    return m


def asset_baroque():
    m = MeshBuilder("baroque_ornate_portal")
    red, gold, stone = 0x5E1F1D, 0xC9A256, 0xB9A276
    layered_rect(m, red, 2.25, 1.2, 0.38, 0.86)
    columns(m, stone, [-2.55, 2.55], 4.35, 0.32, 0.17)
    m.box(gold, (0, 3.92, 0.84), (5.45, 0.1, 0.18))
    for x in [-0.72, 0.72]:
        m.torus(gold, (x, 4.45, 0.86), 0.22, 0.035, 22, 8)
    return m


def asset_meso():
    m = MeshBuilder("meso_stepped_gateway")
    stone, glyph, dark = 0x9B8A6D, 0x7D5B3F, 0x2E2013
    for i in range(4):
        layered_rect(m, stone, 2.0 - i * 0.28, 1.25 - i * 0.12, 0.32, 0.88 - i * 0.08)
    m.box(glyph, (0, 4.23, 0.92), (5.55, 0.34, 0.2))
    for i in range(14):
        m.box(dark if i % 2 else glyph, (-2.25 + i * 0.34, 4.23 + math.sin(i) * 0.05, 1.05), (0.18, 0.18, 0.1))
    return m


def asset_inca():
    m = MeshBuilder("inca_trapezoid_portal")
    stone, dark = 0x8D8A80, 0x57534B
    left = [(-2.38, 0), (-1.72, 0), (-1.18, 3.72), (-1.62, 3.72)]
    right = [(2.38, 0), (1.72, 0), (1.18, 3.72), (1.62, 3.72)]
    top = [(-1.6, 3.35), (1.6, 3.35), (1.35, 3.9), (-1.35, 3.9)]
    m.prism(stone, left, 0.86, 0.38)
    m.prism(stone, right, 0.86, 0.38)
    m.prism(stone, top, 0.86, 0.38)
    for r in range(6):
        for side in [-1, 1]:
            m.box(dark if r % 2 else stone, (side * (2.12 - r * 0.07), 0.38 + r * 0.52, 0.9), (0.34, 0.09, 0.1), (0, 0, -side * 0.12))
    return m


def asset_adobe():
    m = MeshBuilder("adobe_rounded_portal")
    adobe, wood = 0xB98D5F, 0x6E5335
    layered_rect(m, adobe, 1.7, 0.9, 0.48, 0.96)
    add_voussoirs(m, adobe, outline_round(), 0.82, (0.42, 0.28), 1.62)
    for i in range(6):
        m.cylinder(wood, (-1.7 + i * 0.68, 3.92, 0.94), 0.07, 1.05, "z", 8)
    return m


def asset_mudbrick():
    m = MeshBuilder("mudbrick_lintel_portal")
    brick, dark = 0xA3805A, 0x6F5135
    layered_rect(m, brick, 1.5, 0.82, 0.38, 0.78)
    for r in range(7):
        for side in [-1, 1]:
            m.box(dark if (r + side) % 2 else brick, (side * 2.18, 0.32 + r * 0.45, 0.82), (0.45, 0.22, 0.14))
    return m


def asset_ishtar():
    m = MeshBuilder("ishtar_blue_gate")
    blue, gold, dark = 0x1C4D7C, 0xE8C95F, 0x123657
    layered_rect(m, blue, 2.05, 1.25, 0.36, 0.92)
    add_voussoirs(m, blue, outline_round(), 0.82, (0.32, 0.24), 1.62)
    for i in range(17):
        m.box(gold if i % 2 else dark, (-2.6 + i * 0.32, 4.15, 1.02), (0.17, 0.18, 0.12))
    for x in [-2.78, 2.78]:
        m.box(gold, (x, 1.8, 1.02), (0.13, 2.4, 0.14))
    return m


def asset_persepolis():
    m = MeshBuilder("persepolis_gateway")
    stone, relief = 0xB09A72, 0x7F6B48
    layered_rect(m, stone, 1.72, 0.9, 0.3, 0.8)
    columns(m, stone, [-2.55, 2.55], 4.72, 0.34, 0.15)
    for side in [-1, 1]:
        x = side * 3.05
        m.box(relief, (x, 0.8, 0.74), (0.58, 0.55, 0.28))
        m.box(relief, (x + side * 0.18, 1.18, 0.74), (0.26, 0.32, 0.28))
        for i in range(4):
            m.box(relief, (x - side * 0.22 + side * i * 0.13, 0.25, 0.74), (0.06, 0.42, 0.2))
    return m


def asset_islamic():
    m = MeshBuilder("islamic_keel_arch")
    cream, teal, tile = 0xE3D7BD, 0x2A5B78, 0x3F8EA6
    layered_rect(m, cream, 2.0, 1.25, 0.24, 0.58)
    add_voussoirs(m, teal, outline_keel(), 0.72, (0.25, 0.22), 0.7)
    for row in range(3):
        count = 5 + row * 2
        for i in range(count):
            x = -1.25 + i * (2.5 / max(1, count - 1))
            m.box(tile if i % 2 else teal, (x, 3.62 + row * 0.18, 0.92), (0.16, 0.16, 0.18))
    return m


def asset_ottoman():
    m = MeshBuilder("ottoman_iznik_domed_arch")
    cream, blue, red = 0xECE5D2, 0x27516E, 0x7C3B3B
    layered_rect(m, cream, 1.8, 1.0, 0.28, 0.68)
    add_voussoirs(m, blue, outline_pointed(), 0.72, (0.25, 0.21), 0.8)
    m.torus(red, (0, 4.05, 0.72), 0.86, 0.12, 32, 8)
    for i in range(11):
        m.box(blue if i % 2 else red, (-1.7 + i * 0.34, 3.88, 0.98), (0.16, 0.12, 0.1))
    return m


def asset_china():
    m = MeshBuilder("china_moon_gate")
    red, black, paper = 0x8F2B1E, 0x1F140E, 0xD9C089
    m.torus(red, (0, 2.05, 0.55), 1.78, 0.18, 48, 10)
    columns(m, red, [-2.8, 2.8], 4.38, 0.28, 0.15)
    m.box(black, (0, 4.15, 0.34), (5.8, 0.28, 0.48))
    for x in [-3.32, 3.32]:
        m.lattice(paper, x, 1.9, 0.64, 0.82, 1.55, 0.08, 4)
    return m


def asset_japan():
    m = MeshBuilder("japan_shoji_entry")
    wood, paper = 0x3C2C1A, 0xE8DFC8
    layered_rect(m, wood, 1.25, 0.45, 0.2, 0.5)
    for x in [-2.45, 2.45]:
        m.box(paper, (x, 1.82, 0.58), (0.92, 2.65, 0.05))
        m.lattice(wood, x, 1.82, 0.65, 0.92, 2.65, 0.07, 5)
    for y in [0.35, 3.35]:
        m.box(wood, (0, y, 0.64), (4.9, 0.09, 0.12))
    return m


def asset_khmer():
    m = MeshBuilder("khmer_carved_lintel")
    stone, dark = 0x7E7A6A, 0x4A473C
    layered_rect(m, stone, 1.95, 1.0, 0.34, 0.78)
    m.box(stone, (0, 4.05, 0.82), (5.65, 0.46, 0.5))
    for i in range(11):
        m.box(dark, (-2.2 + i * 0.44, 4.06, 1.12), (0.14, 0.2, 0.1))
    return m


def asset_mughal():
    m = MeshBuilder("mughal_cusped_arch")
    marble, screen, red = 0xECE2D2, 0xD8CBB4, 0x8D4A3C
    add_voussoirs(m, marble, outline_keel(3.4, 3.35), 0.7, (0.25, 0.2), 0.45)
    layered_rect(m, marble, 2.15, 1.2, 0.25, 0.6)
    for i, x in enumerate([-0.9, -0.45, 0, 0.45, 0.9]):
        m.cylinder(red, (x, 2.92 + abs(x) * 0.18, 0.96), 0.055, 0.28, "z", 10)
    for x in [-2.85, 2.85]:
        m.lattice(screen, x, 1.85, 0.7, 0.92, 2.25, 0.08, 5)
    return m


def asset_egypt():
    m = MeshBuilder("egyptian_pylon")
    sand, relief = 0xC2A06C, 0x7A5A2D
    for side in [-1, 1]:
        x0, x1 = side * 1.95, side * 3.05
        pts = [(x0, 0), (x1, 0), (side * 2.65, 4.35), (side * 1.55, 4.35)]
        m.prism(sand, pts, 0.92, 0.4)
        m.box(relief, (side * 2.3, 2.25, 0.96), (0.07, 2.45, 0.1))
    m.box(sand, (0, 3.82, 0.4), (3.55, 0.36, 0.82))
    m.box(relief, (0, 4.16, 0.96), (3.1, 0.08, 0.1))
    return m


def asset_sahel():
    m = MeshBuilder("djenne_banco_portal")
    earth, wood = 0xA5714A, 0x4A2D18
    for side in [-1, 1]:
        m.prism(earth, [(side * 1.75, 0), (side * 2.45, 0), (side * 2.25, 4.05), (side * 1.55, 4.05)], 0.9, 0.34)
        m.cylinder(earth, (side * 2.82, 2.05, 0.34), 0.22, 4.1, "y", 8)
    m.box(earth, (0, 3.8, 0.34), (4.65, 0.42, 0.82))
    for i in range(9):
        m.cylinder(wood, (-2.2 + i * 0.55, 3.95, 0.88), 0.055, 0.9, "z", 6)
    return m


def asset_earthen():
    m = MeshBuilder("earthen_rounded_portal")
    earth, wood = 0x8D5A3A, 0x4C3A26
    layered_rect(m, earth, 1.45, 0.75, 0.48, 0.84)
    add_voussoirs(m, earth, outline_round(), 0.72, (0.38, 0.26), 1.75)
    for i in range(7):
        m.cylinder(wood, (-1.82 + i * 0.6, 3.78, 0.88), 0.055, 0.78, "z", 6)
    return m


def asset_rock():
    m = MeshBuilder("rock_shelter_portal")
    rock, dark = 0xA06844, 0x6F412D
    pts = outline_rock()
    for i, (x, y) in enumerate(pts):
        if y < 0.05:
            continue
        s = 0.35 + (i % 4) * 0.08
        m.box(rock if i % 3 else dark, (x, y, 0.42), (s * 1.25, s * 1.65, s), (0.2 * i, 0.15 * i, 0.4 * i))
    for i in range(12):
        x = -2.5 + i * 0.45
        y = 3.62 + math.sin(i * 0.8) * 0.38
        m.box(rock if i % 2 else dark, (x, y, 0.55), (0.42, 0.36, 0.5), (0, 0, i * 0.23))
    return m


def asset_oceanic():
    m = MeshBuilder("oceanic_carved_wood")
    wood, ochre = 0x54371E, 0x9D6A32
    columns(m, wood, [-2.28, 2.28], 4.15, 0.34, 0.17)
    m.box(wood, (0, 3.82, 0.35), (4.9, 0.36, 0.72))
    for x in [-2.28, 2.28]:
        for i in range(7):
            m.box(ochre, (x, 0.55 + i * 0.48, 0.82), (0.09, 0.09, 0.12))
    return m


def asset_woven():
    m = MeshBuilder("pandanus_woven_portal")
    reed, dark, wood = 0xB3915E, 0x6E4F2C, 0x54371E
    layered_rect(m, reed, 1.6, 0.66, 0.28, 0.56)
    for x in [-2.72, 2.72]:
        m.lattice(dark, x, 1.8, 0.66, 0.86, 2.35, 0.08, 5)
    for i in range(8):
        m.cylinder(wood, (-1.95 + i * 0.55, 3.75, 0.92), 0.045, 0.78, "z", 6)
    return m


ASSETS = {
    "classical_doric_portal.glb": asset_classical,
    "gothic_pointed_arch.glb": asset_gothic,
    "renaissance_round_arch.glb": asset_renaissance,
    "baroque_ornate_portal.glb": asset_baroque,
    "meso_stepped_gateway.glb": asset_meso,
    "inca_trapezoid_portal.glb": asset_inca,
    "adobe_rounded_portal.glb": asset_adobe,
    "mudbrick_lintel_portal.glb": asset_mudbrick,
    "ishtar_blue_gate.glb": asset_ishtar,
    "persepolis_gateway.glb": asset_persepolis,
    "islamic_keel_arch.glb": asset_islamic,
    "ottoman_iznik_domed_arch.glb": asset_ottoman,
    "china_moon_gate.glb": asset_china,
    "japan_shoji_entry.glb": asset_japan,
    "khmer_carved_lintel.glb": asset_khmer,
    "mughal_cusped_arch.glb": asset_mughal,
    "egyptian_pylon.glb": asset_egypt,
    "djenne_banco_portal.glb": asset_sahel,
    "earthen_rounded_portal.glb": asset_earthen,
    "rock_shelter_portal.glb": asset_rock,
    "oceanic_carved_wood.glb": asset_oceanic,
    "pandanus_woven_portal.glb": asset_woven,
}


def pack_floats(values):
    return struct.pack("<" + "f" * len(values), *values)


def pack_uints(values):
    return struct.pack("<" + "I" * len(values), *values)


def align4(data, pad=b"\x00"):
    return data + pad * ((4 - len(data) % 4) % 4)


def write_glb(path: Path, mesh: MeshBuilder):
    materials = []
    material_index = {}
    accessors, buffer_views = [], []
    bin_blob = b""
    primitives = []

    def add_view(blob, target):
        nonlocal bin_blob
        bin_blob = align4(bin_blob)
        offset = len(bin_blob)
        bin_blob += blob
        view = {"buffer": 0, "byteOffset": offset, "byteLength": len(blob), "target": target}
        buffer_views.append(view)
        return len(buffer_views) - 1

    for color, prim in mesh.prims.items():
        if not prim["idx"]:
            continue
        if color not in material_index:
            material_index[color] = len(materials)
            materials.append({
                "name": f"mat_{color:06x}",
                "pbrMetallicRoughness": {
                    "baseColorFactor": list(color_tuple(color)),
                    "metallicFactor": 0.0,
                    "roughnessFactor": 0.82,
                },
            })
        pos_flat = [c for p in prim["pos"] for c in p]
        norm_flat = [c for n in prim["norm"] for c in n]
        idx = prim["idx"]
        pos_view = add_view(pack_floats(pos_flat), 34962)
        norm_view = add_view(pack_floats(norm_flat), 34962)
        idx_view = add_view(pack_uints(idx), 34963)
        xs = [p[0] for p in prim["pos"]]
        ys = [p[1] for p in prim["pos"]]
        zs = [p[2] for p in prim["pos"]]
        pos_accessor = len(accessors)
        accessors.append({
            "bufferView": pos_view,
            "componentType": 5126,
            "count": len(prim["pos"]),
            "type": "VEC3",
            "min": [min(xs), min(ys), min(zs)],
            "max": [max(xs), max(ys), max(zs)],
        })
        norm_accessor = len(accessors)
        accessors.append({
            "bufferView": norm_view,
            "componentType": 5126,
            "count": len(prim["norm"]),
            "type": "VEC3",
        })
        idx_accessor = len(accessors)
        accessors.append({
            "bufferView": idx_view,
            "componentType": 5125,
            "count": len(idx),
            "type": "SCALAR",
            "min": [min(idx)],
            "max": [max(idx)],
        })
        primitives.append({
            "attributes": {"POSITION": pos_accessor, "NORMAL": norm_accessor},
            "indices": idx_accessor,
            "material": material_index[color],
        })

    gltf = {
        "asset": {"version": "2.0", "generator": "tools/generate_architecture_assets.py"},
        "scene": 0,
        "scenes": [{"nodes": [0]}],
        "nodes": [{"name": mesh.name, "mesh": 0}],
        "meshes": [{"name": mesh.name, "primitives": primitives}],
        "materials": materials,
        "buffers": [{"byteLength": len(bin_blob)}],
        "bufferViews": buffer_views,
        "accessors": accessors,
    }

    json_blob = align4(json.dumps(gltf, separators=(",", ":")).encode("utf-8"), b" ")
    bin_blob = align4(bin_blob)
    total = 12 + 8 + len(json_blob) + 8 + len(bin_blob)
    with path.open("wb") as f:
        f.write(struct.pack("<III", 0x46546C67, 2, total))
        f.write(struct.pack("<II", len(json_blob), 0x4E4F534A))
        f.write(json_blob)
        f.write(struct.pack("<II", len(bin_blob), 0x004E4942))
        f.write(bin_blob)


def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    manifest = {}
    for filename, factory in ASSETS.items():
        mesh = factory()
        path = OUT_DIR / filename
        write_glb(path, mesh)
        triangles = sum(len(p["idx"]) // 3 for p in mesh.prims.values())
        manifest[filename] = {"name": mesh.name, "triangles": triangles, "bytes": path.stat().st_size}
        print(f"wrote {path} ({triangles} tris, {path.stat().st_size} bytes)")
    (OUT_DIR / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")


if __name__ == "__main__":
    main()
