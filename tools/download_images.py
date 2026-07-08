#!/usr/bin/env python3
"""Download a local copy of every resolved artwork image into assets/art/<id>.jpg
so the museum works fully offline. Re-runnable: skips files already present.

Reads the generated js/data/imageUrls.js. Concurrency kept low (Wikimedia
rate-limits bursts). Usage: python3 tools/download_images.py
"""
import concurrent.futures as cf
import json
import os
import re
import sys
import time
import urllib.error
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "assets", "art")
UA = {"User-Agent": "ArtMuseum3D/1.0 (personal education project; hello@timrosenberg.com)"}


def load_urls():
    src = open(os.path.join(ROOT, "js", "data", "imageUrls.js"), encoding="utf-8").read()
    pairs = re.findall(r'"([a-z]+-\d+)":\s*(null|"[^"]+")', src)
    return {aid: json.loads(v) for aid, v in pairs if v != "null"}


def fetch(url, tries=5):
    last = None
    for attempt in range(tries):
        try:
            req = urllib.request.Request(url, headers=UA)
            with urllib.request.urlopen(req, timeout=60) as r:
                return r.read()
        except urllib.error.HTTPError as e:
            last = e
            if e.code in (429, 503):
                time.sleep(min(2 ** attempt + 1, 30)); continue
            raise
        except Exception as e:
            last = e
            time.sleep(1 + attempt)
    raise last


def one(item):
    aid, url = item
    path = os.path.join(OUT, aid + ".jpg")
    if os.path.exists(path) and os.path.getsize(path) > 1024:
        return aid, "skip"
    try:
        data = fetch(url)
        with open(path, "wb") as f:
            f.write(data)
        return aid, f"ok {len(data)//1024}k"
    except Exception as e:
        return aid, f"FAIL {e}"


def main():
    os.makedirs(OUT, exist_ok=True)
    urls = load_urls()
    print(f"{len(urls)} images → {OUT}")
    ok = skip = fail = 0
    with cf.ThreadPoolExecutor(max_workers=3) as ex:
        for aid, status in ex.map(one, urls.items()):
            if status.startswith("ok"): ok += 1
            elif status == "skip": skip += 1
            else: fail += 1; print(f" [X] {aid}: {status}", flush=True)
    print(f"\ndownloaded: {ok}, already had: {skip}, failed: {fail}")
    total = sum(os.path.getsize(os.path.join(OUT, f)) for f in os.listdir(OUT))
    print(f"assets/art total: {total//(1024*1024)} MB")
    if fail:
        sys.exit(1)


if __name__ == "__main__":
    main()
