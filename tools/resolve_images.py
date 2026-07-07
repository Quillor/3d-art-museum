#!/usr/bin/env python3
"""Resolve Wikimedia Commons filenames in js/data/*.js to direct, verified
upload.wikimedia.org thumbnail URLs, and write js/data/imageUrls.js.

For each artwork `file` entry it requests
  https://commons.wikimedia.org/wiki/Special:FilePath/<name>?width=1280
and records the final redirected URL. If the exact filename does not exist,
it falls back to a Commons fulltext file search built from the artwork title
and picks the best-scoring image result. Failures are reported to
tools/unresolved.json for manual fixing.

Usage: python3 tools/resolve_images.py
"""
import concurrent.futures as cf
import json
import os
import random
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "js", "data")
UA = {"User-Agent": "ArtMuseum3D/1.0 (personal education project; hello@timrosenberg.com)"}
WIDTH = 1280

DATA_FILES = ["prehistoric.js", "americas.js", "europe.js", "oceania.js",
              "middleeast.js", "asia.js", "africa.js"]


def parse_entries():
    entries = []
    for fn in DATA_FILES:
        src = open(os.path.join(DATA, fn), encoding="utf-8").read()
        ids = re.findall(r'id:\s*"([^"]+)"', src)
        files = re.findall(r'file:\s*"([^"]+)"', src)
        titles = re.findall(r'title:\s*"([^"]+)"', src)
        artists = re.findall(r'artist:\s*"([^"]+)"', src)
        if not (len(ids) == len(files) == len(titles) == len(artists)):
            sys.exit(f"parse mismatch in {fn}: {len(ids)} ids / {len(files)} files")
        for i, f, t, a in zip(ids, files, titles, artists):
            entries.append({"id": i, "file": f, "title": t, "artist": a})
    return entries


def fetch(url, timeout=30, tries=5):
    """GET with retry/backoff — Wikimedia 429s bursty clients."""
    last = None
    for attempt in range(tries):
        try:
            req = urllib.request.Request(url, headers=UA)
            return urllib.request.urlopen(req, timeout=timeout)
        except urllib.error.HTTPError as e:
            last = e
            if e.code in (429, 503):
                wait = float(e.headers.get("Retry-After") or 0) or (2 ** attempt + random.random())
                time.sleep(min(wait, 30))
                continue
            raise
        except Exception as e:
            last = e
            time.sleep(1 + attempt)
    raise last


def filepath_url(name, width):
    q = urllib.parse.quote(name)
    u = f"https://commons.wikimedia.org/wiki/Special:FilePath/{q}"
    if width:
        u += f"?width={width}"
    return u


def try_filepath(name):
    """Return final URL if the exact Commons filename resolves, else None."""
    for width in (WIDTH, None):  # no-width fallback for small originals
        try:
            resp = fetch(filepath_url(name, width))
            final = resp.geturl()
            ctype = resp.headers.get("Content-Type", "")
            if resp.status == 200 and ctype.startswith("image/"):
                return final
        except urllib.error.HTTPError:
            continue
        except Exception as e:
            print(f"  ({name[:40]}: {e})", file=sys.stderr)
            continue
    return None


STOPWORDS = {"the", "of", "a", "an", "and", "in", "at", "on", "from", "with",
             "unknown", "culture", "period", "dynasty", "peoples", "school"}


def search_commons(entry):
    """Fulltext file-namespace search; return candidate list of (name, w, h, url)."""
    title = re.sub(r"[:,()'‘’]", " ", entry["title"])
    artist = entry["artist"].split(",")[0]
    if any(w in artist.lower() for w in ("unknown", "culture", "builders", "makers",
                                          "neolithic", "peoples", "scribes", "monks",
                                          "masons", "potters", "carvers", "painters",
                                          "glaziers", "embroiderers", "calligraphers",
                                          "kilns", "workshop", "court", "dynasty",
                                          "empire", "kingdom")):
        query = title
    else:
        query = f"{title} {artist}"
    params = urllib.parse.urlencode({
        "action": "query", "format": "json",
        "generator": "search",
        "gsrsearch": query,
        "gsrnamespace": "6", "gsrlimit": "8",
        "prop": "imageinfo", "iiprop": "url|size|mime",
        "iiurlwidth": str(WIDTH),
    })
    try:
        data = json.load(fetch(f"https://commons.wikimedia.org/w/api.php?{params}"))
    except Exception:
        return []
    pages = (data.get("query") or {}).get("pages") or {}
    out = []
    for p in pages.values():
        info = (p.get("imageinfo") or [{}])[0]
        mime = info.get("mime", "")
        if not mime.startswith("image/") or mime == "image/gif":
            continue
        if mime in ("image/svg+xml", "image/tiff", "image/webp"):
            continue
        w, h = info.get("width", 0), info.get("height", 0)
        if w < 500 or h < 400:
            continue
        url = info.get("thumburl") or info.get("url")
        name = p.get("title", "").replace("File:", "")
        # score: keyword overlap between title words and filename
        words = [w2 for w2 in re.findall(r"[a-z]{3,}", title.lower())
                 if w2 not in STOPWORDS]
        name_l = name.lower()
        overlap = sum(1 for w2 in words if w2 in name_l)
        score = overlap * 10 + min(w, 4000) / 1000 - p.get("index", 9)
        out.append((score, name, url))
    out.sort(reverse=True)
    return out


def resolve(entry):
    url = try_filepath(entry["file"])
    if url:
        return entry["id"], url, "exact", entry["file"]
    cands = search_commons(entry)
    if cands:
        score, name, url = cands[0]
        return entry["id"], url, f"search({score:.0f})", name
    return entry["id"], None, "FAILED", entry["file"]


def load_existing():
    """Previously resolved URLs (so re-runs only retry failures)."""
    path = os.path.join(DATA, "imageUrls.js")
    if not os.path.exists(path):
        return {}
    found = re.findall(r'"([a-z]+-\d+)": (null|"[^"]+")',
                       open(path, encoding="utf-8").read())
    return {aid: json.loads(v) for aid, v in found if v != "null"}


def main():
    entries = parse_entries()
    results = load_existing()
    meta = {a: {"how": "cached", "resolvedFile": ""} for a in results}
    todo = [e for e in entries if not results.get(e["id"])]
    print(f"{len(entries)} artworks, {len(todo)} to resolve")
    with cf.ThreadPoolExecutor(max_workers=3) as ex:
        for aid, url, how, name in ex.map(resolve, todo):
            results[aid] = url
            meta[aid] = {"how": how, "resolvedFile": name}
            mark = " " if how == "exact" else ("!" if url else "X")
            print(f" [{mark}] {aid:7s} {how:12s} {name[:80]}", flush=True)
    order = [e["id"] for e in entries]
    failed = [a for a in order if not results.get(a)]
    searched = [a for a in order
                if results.get(a) and meta[a]["how"] not in ("exact", "cached")]

    with open(os.path.join(DATA, "imageUrls.js"), "w", encoding="utf-8") as f:
        f.write("// GENERATED by tools/resolve_images.py — do not edit by hand.\n")
        f.write("// Direct Wikimedia Commons image URLs, verified at build time.\n")
        f.write("export const IMAGE_URLS = {\n")
        for aid in order:
            u = results.get(aid)
            f.write(f'  "{aid}": {json.dumps(u)},\n')
        f.write("};\n")

    report = {"failed": failed,
              "searchResolved": {a: meta[a]["resolvedFile"] for a in searched}}
    with open(os.path.join(ROOT, "tools", "unresolved.json"), "w") as f:
        json.dump(report, f, indent=2, ensure_ascii=False)
    print(f"\nexact: {len(order) - len(searched) - len(failed)}, "
          f"via search: {len(searched)}, FAILED: {len(failed)}")
    if failed:
        print("failed ids:", ", ".join(failed))


if __name__ == "__main__":
    main()
