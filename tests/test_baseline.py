"""
Baseline test suite for Genshin Abyss Studio.
Verifies core environment health, application initialization, and file structure.
"""

import pytest
from pathlib import Path

def test_imports():
    """Verify that all core dependencies import cleanly."""
    import fastapi
    import httpx
    import pydantic
    import PIL
    import cv2
    import numpy
    assert True

def test_base_directory_structure():
    """Verify required project assets and folders exist."""
    root = Path(__file__).resolve().parent.parent
    assert (root / "app.py").exists(), "app.py must exist"
    assert (root / "web" / "index.html").exists(), "web/index.html must exist"
    assert (root / "web" / "studio.js").exists(), "web/studio.js must exist"
    assert (root / "web" / "style.css").exists(), "web/style.css must exist"
    assert (root / "execution" / "generate_abyss_thumbnail.py").exists(), "Thumbnail renderer must exist"
    assert (root / "execution" / "auto_edit_abyss.py").exists(), "Auto editor must exist"

def test_app_instance_initialization():
    """Verify FastAPI app instance can be loaded without unhandled exceptions."""
    from app import app
    assert app is not None
    assert app.title == "Genshin Abyss Studio" or "Genshin" in app.title

def test_health_check_endpoint_version():
    """Verify /api/health endpoint returns 200 OK and authoritative version 2.1.0."""
    from fastapi.testclient import TestClient
    from app import app
    from app.core.config import APP_VERSION
    client = TestClient(app)
    resp = client.get("/api/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] in ("ok", "degraded")
    assert data["version"] == APP_VERSION
    assert data["version"] == "2.1.0"
    assert "checks" in data
    assert "catalog" in data["checks"]
    assert "cache_writable" in data["checks"]
    assert data["checks"]["cache_writable"] is True

