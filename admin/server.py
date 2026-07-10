#!/usr/bin/env python3
"""Static file server + tiny JSON feedback API for the Curator Console.

Serves the repo (same behavior as `python3 -m http.server`) so the museum's
relative asset paths keep working, and adds one extra route:

    GET  /api/feedback   -> current feedback store (JSON)
    POST /api/feedback   -> replaces the feedback store with the JSON body

The store is a single JSON file on disk (admin/feedback-data.json), so
ratings/notes/pins/general survive across browsers and machines that hit
this server -- not just the browser that wrote them (localStorage).
"""
import http.server
import json
import os
import threading
from urllib.parse import urlparse

PORT = int(os.environ.get("PORT", "8471"))
DATA_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "feedback-data.json")
EMPTY_STORE = {"ratings": {}, "notes": {}, "pins": {}, "general": {}}
LOCK = threading.Lock()


def read_store():
    if not os.path.exists(DATA_FILE):
        return dict(EMPTY_STORE)
    try:
        with open(DATA_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
        return {**EMPTY_STORE, **data}
    except Exception:
        return dict(EMPTY_STORE)


def write_store(data):
    os.makedirs(os.path.dirname(DATA_FILE), exist_ok=True)
    tmp = DATA_FILE + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(data, f)
    os.replace(tmp, DATA_FILE)


class Handler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        if urlparse(self.path).path.rstrip("/").endswith("/api/feedback"):
            with LOCK:
                data = read_store()
            self._send_json(200, data)
            return
        super().do_GET()

    def do_POST(self):
        if urlparse(self.path).path.rstrip("/").endswith("/api/feedback"):
            length = int(self.headers.get("Content-Length", 0))
            raw = self.rfile.read(length) if length else b"{}"
            try:
                data = json.loads(raw)
            except Exception:
                self._send_json(400, {"error": "invalid JSON"})
                return
            with LOCK:
                write_store(data)
            self._send_json(204, None)
            return
        self.send_error(404)

    def _send_json(self, status, payload):
        body = b"" if payload is None else json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        if body:
            self.wfile.write(body)


if __name__ == "__main__":
    http.server.ThreadingHTTPServer.allow_reuse_address = True
    with http.server.ThreadingHTTPServer(("", PORT), Handler) as httpd:
        print(f"Serving on port {PORT} (feedback store: {DATA_FILE})")
        httpd.serve_forever()
