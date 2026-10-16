import shutil
import tempfile
from pathlib import Path

from django.http import Http404
from django.test import RequestFactory, SimpleTestCase, override_settings

from config.spa import serve_frontend


def response_bytes(response):
    if hasattr(response, "streaming_content"):
        return b"".join(response.streaming_content)
    return response.content


class SpaServingTests(SimpleTestCase):
    def setUp(self):
        self.dist = Path(tempfile.mkdtemp())
        self.addCleanup(shutil.rmtree, self.dist, ignore_errors=True)
        (self.dist / "index.html").write_text("<!doctype html><title>Shop</title>", encoding="utf-8")
        assets = self.dist / "assets"
        assets.mkdir()
        (assets / "app.js").write_text("console.log('ok')", encoding="utf-8")

    def test_explains_when_the_frontend_is_not_built(self):
        missing = self.dist / "does-not-exist"
        with override_settings(FRONTEND_DIST=missing):
            response = self.client.get("/")
        self.assertEqual(response.status_code, 503)
        self.assertIn(b"npm run build", response_bytes(response))

    def test_serves_index_for_the_home_page_and_react_routes(self):
        with override_settings(FRONTEND_DIST=self.dist):
            home = self.client.get("/")
            shop = self.client.get("/shop")
            product = self.client.get("/products/rose-water-toner")
        self.assertEqual(home.status_code, 200)
        self.assertEqual(shop.status_code, 200)
        self.assertEqual(product.status_code, 200)
        self.assertIn(b"<title>Shop</title>", response_bytes(home))
        self.assertIn(b"<title>Shop</title>", response_bytes(shop))

    def test_serves_built_asset_files(self):
        with override_settings(FRONTEND_DIST=self.dist):
            response = self.client.get("/assets/app.js")
        self.assertEqual(response.status_code, 200)
        self.assertIn(b"console.log", response_bytes(response))

    def test_rejects_path_traversal(self):
        request = RequestFactory().get("/")
        with override_settings(FRONTEND_DIST=self.dist), self.assertRaises(Http404):
            serve_frontend(request, path="../outside.txt")

    def test_api_routes_are_not_stolen_by_the_spa(self):
        with override_settings(FRONTEND_DIST=self.dist):
            response = self.client.get("/api/health/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"status": "ok"})
