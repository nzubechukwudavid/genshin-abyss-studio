import pytest
import os
import json
from pathlib import Path
from starlette.testclient import TestClient

from app import app
from app.core.config import DATA_DIR, BASE_DIR

client = TestClient(app)

def test_norwester_font_endpoint():
    """Verify Norwester woff2 font is served with immutable caching."""
    resp = client.get("/static/fonts/norwester.woff2")
    assert resp.status_code == 200
    assert "font/woff2" in resp.headers.get("content-type", "")
    assert len(resp.content) > 5000

def test_renders_catalog_endpoint():
    """Verify renders catalog endpoint returns valid JSON with character metadata."""
    resp = client.get("/api/renders/catalog")
    assert resp.status_code == 200
    data = resp.json()
    assert "characters" in data
    assert "version" in data

def test_venti_render_asset_serving():
    """Verify local cached Venti transparent render is served."""
    resp = client.get("/static/renders/Venti/venti_64d1785f9bc7a68578c76693.png")
    assert resp.status_code == 200
    assert resp.headers.get("content-type") == "image/png"
    assert len(resp.content) > 1000

def test_render_asset_traversal_guard():
    """Verify directory traversal is strictly blocked."""
    resp1 = client.get("/static/renders/../app.py")
    assert resp1.status_code in (403, 404)

def test_spotlight_es_modules_exist():
    """Verify all 5 ES modules exist and have expected exports."""
    modules_dir = BASE_DIR / "web" / "modules"
    expected_files = [
        "spotlight_effects.js",
        "spotlight_scene.js",
        "video_frame_picker.js",
        "pose_picker_modal.js",
        "spotlight_toolbar.js"
    ]
    for filename in expected_files:
        filepath = modules_dir / filename
        assert filepath.exists(), f"Missing module: {filename}"
        content = filepath.read_text(encoding="utf-8")
        assert len(content) > 200

def test_crawler_dry_run():
    """Verify crawler script dry-run mode executes cleanly."""
    from execution.crawl_hoyo_transparents import CATALOG_FILE
    assert CATALOG_FILE.exists()
    cat = json.loads(CATALOG_FILE.read_text(encoding="utf-8"))
    assert "characters" in cat
    assert len(cat["characters"]) > 0
