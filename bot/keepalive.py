"""Render için HTTP health endpoint + kendini uyandıran self-ping."""
import logging
import threading
import time
import urllib.request
from http.server import BaseHTTPRequestHandler, HTTPServer

from core.config import settings

logger = logging.getLogger(__name__)


class _Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.send_header("Content-Type", "text/plain")
        self.end_headers()
        self.wfile.write(b"OK")

    def do_HEAD(self):
        self.send_response(200)
        self.send_header("Content-Type", "text/plain")
        self.end_headers()

    def log_message(self, *args):
        pass


def _serve():
    HTTPServer(("0.0.0.0", settings.PORT), _Handler).serve_forever()


def _self_ping():
    time.sleep(30)
    while True:
        try:
            if settings.RENDER_URL:
                urllib.request.urlopen(settings.RENDER_URL, timeout=10)
        except Exception as e:
            logger.warning(f"Self-ping başarısız: {e}")
        time.sleep(600)


def baslat():
    threading.Thread(target=_serve, daemon=True).start()
    threading.Thread(target=_self_ping, daemon=True).start()
    logger.info(f"✅ HTTP sunucusu port {settings.PORT}")
