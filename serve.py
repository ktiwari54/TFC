"""Local dev server — disables browser caching for all files."""
import os
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

os.chdir(os.path.dirname(os.path.abspath(__file__)))


class NoCacheHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()


if __name__ == "__main__":
    port = 8080
    with ThreadingHTTPServer(("", port), NoCacheHandler) as httpd:
        print(f"Serving TFC (no-cache) on http://localhost:{port}/")
        httpd.serve_forever()