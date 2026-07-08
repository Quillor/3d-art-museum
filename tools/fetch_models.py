#!/usr/bin/env python3
"""Download CC0 (Poly Haven, no attribution) hero props, keeping only geometry +
diffuse texture, and strip the glTF so normal/rough/AO maps are never fetched at
runtime. Result is retooned in js/props.js to match the cel-shaded museum."""
import json, os, urllib.request, sys

PICK = {  # slug -> wing key (for our own reference)
    "marble_bust_01": "europe",
    "bull_head": "middleeast",
    "carved_wooden_elephant": "asia",
    "concrete_cat_statue": "africa",
    "ceramic_pot": "americas",
    "lion_head": "oceania",
}
ROOT = os.path.join(os.path.dirname(__file__), "..", "assets", "models")

def get(url, dest):
    if os.path.exists(dest) and os.path.getsize(dest) > 0:
        print("  cached", os.path.basename(dest)); return
    req = urllib.request.Request(url, headers={"User-Agent": "museum-fetch"})
    with urllib.request.urlopen(req, timeout=60) as r, open(dest, "wb") as f:
        f.write(r.read())
    print("  got", os.path.basename(dest), os.path.getsize(dest)//1024, "KB")

def strip_gltf(path, keep_basenames):
    """Drop every texture ref except baseColor; prune unreferenced images."""
    g = json.load(open(path))
    for m in g.get("materials", []):
        pbr = m.get("pbrMetallicRoughness", {})
        pbr.pop("metallicRoughnessTexture", None)
        # neutral PBR factors (unused by toon, but keeps validators happy)
        pbr.setdefault("metallicFactor", 0)
        pbr.setdefault("roughnessFactor", 1)
        m["pbrMetallicRoughness"] = pbr
        for k in ("normalTexture", "occlusionTexture", "emissiveTexture"):
            m.pop(k, None)
    # figure out which texture indices are still used
    used_tex = set()
    for m in g.get("materials", []):
        t = m.get("pbrMetallicRoughness", {}).get("baseColorTexture")
        if t: used_tex.add(t["index"])
    used_img = set(g["textures"][i]["source"] for i in used_tex) if g.get("textures") else set()
    # blank out image URIs we didn't download so the loader never requests them
    for i, img in enumerate(g.get("images", [])):
        if i not in used_img:
            img["uri"] = ""  # unreferenced; loader won't fetch
    json.dump(g, open(path, "w"))
    print("  stripped ->", os.path.basename(path))

def main():
    manifest = {}
    for slug, wing in PICK.items():
        print("==", slug)
        files = json.load(open(f"/tmp/f_{slug}.json"))
        node = files["gltf"]["1k"]["gltf"]
        inc = node["include"]
        d = os.path.join(ROOT, slug)
        os.makedirs(os.path.join(d, "textures"), exist_ok=True)
        # main gltf
        gltf_name = node["url"].split("/")[-1]
        get(node["url"], os.path.join(d, gltf_name))
        # .bin + diffuse texture only
        for path, meta in inc.items():
            base = path.split("/")[-1]
            if path.endswith(".bin") or "_diff_" in base:
                sub = "textures" if path.startswith("textures/") else ""
                get(meta["url"], os.path.join(d, sub, base))
        strip_gltf(os.path.join(d, gltf_name), None)
        manifest[wing] = f"{slug}/{gltf_name}"
    json.dump(manifest, open(os.path.join(ROOT, "manifest.json"), "w"), indent=2)
    print("\nmanifest:", json.dumps(manifest, indent=2))

if __name__ == "__main__":
    main()
