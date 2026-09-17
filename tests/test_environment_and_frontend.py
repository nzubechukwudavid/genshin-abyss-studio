"""
Tests for Environment Capability Detection and Frontend Contract Integrity (PR 8).
Verifies /api/environment, cloud sandbox fallback, and essential DOM element integrity.
"""

import os
import pytest
from pathlib import Path
from fastapi.testclient import TestClient

from app import app

client = TestClient(app)


def test_api_environment_default_mode():
    """Verify /api/environment returns desktop mode with active platform capabilities."""
    res = client.get("/api/environment")
    assert res.status_code == 200
    data = res.json()
    assert "mode" in data
    assert data["mode"] in ("desktop", "cloud")
    assert "capabilities" in data
    caps = data["capabilities"]
    assert "local_recordings" in caps
    assert "local_music" in caps
    assert "capcut_launch" in caps
    assert "cloud_sync" in caps


def test_api_environment_simulated_cloud(monkeypatch):
    """Verify /api/environment switches to cloud mode when container/cloud env is present."""
    monkeypatch.setenv("RENDER", "true")
    res = client.get("/api/environment")
    assert res.status_code == 200
    data = res.json()
    assert data["mode"] == "cloud"
    assert data["capabilities"]["cloud_sync"] is True
    assert data["capabilities"]["local_recordings"] is False


def test_static_assets_served():
    """Verify primary application html, css, and js are served correctly."""
    html_res = client.get("/")
    assert html_res.status_code == 200
    assert "text/html" in html_res.headers.get("content-type", "")

    css_res = client.get("/static/style.css")
    assert css_res.status_code == 200
    assert "text/css" in css_res.headers.get("content-type", "")

    js_res = client.get("/static/studio.js")
    assert js_res.status_code == 200
    assert "application/javascript" in js_res.headers.get("content-type", "")


def test_html_contains_critical_creator_controls():
    """Verify index.html contains all newly introduced creator and environment elements."""
    html_path = Path("web/index.html")
    assert html_path.exists()
    content = html_path.read_text(encoding="utf-8")

    # Environment Capability Badge
    assert 'id="envCapabilityPill"' in content
    assert 'id="envCapabilityText"' in content

    # History Stack (Undo / Redo)
    assert 'id="tbUndo"' in content
    assert 'id="tbRedo"' in content

    # Project Persistence (.abyss)
    assert 'id="tbSaveProject"' in content
    assert 'id="tbOpenProject"' in content
    assert 'id="projectFileInput"' in content
