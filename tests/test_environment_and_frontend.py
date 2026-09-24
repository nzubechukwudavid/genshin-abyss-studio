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


def test_duplicate_left_to_right_contract():
    """Verify index.html and studio.js satisfy 1-click duplicate Left to Right with dock and mirrored position."""
    html_content = Path("web/index.html").read_text(encoding="utf-8")
    assert 'id="btnDuplicateTeam1"' in html_content
    assert 'Duplicate Left to Right' in html_content

    js_content = Path("web/studio.js").read_text(encoding="utf-8")
    assert 'window.duplicateSide1ToSide2 = function()' in js_content
    assert 'window.duplicateLeftToRight' in js_content
    # Verifies full dock duplication
    assert 's2.showDock = s1.showDock !== false;' in js_content
    assert 's2.teammates = ' in js_content
    assert 'preloadTeammateImages(s2)' in js_content
    # Verifies exact position & flip duplication
    assert 's2.mirror = true;' in js_content
    assert 's2.panX = -s1.panX;' in js_content
    assert 's2.panY = s1.panY;' in js_content
    assert 's2.scale = s1.scale;' in js_content
    assert 's2.img = s1.img;' in js_content
    assert 's2.imgUrl = s1.imgUrl;' in js_content


def test_single_export_listener_and_mutex_contract():
    """Verify HP-0: studio.js has mutex re-entrancy lock and thumbnail_toolbar doesn't double-bind btnExport."""
    toolbar_js = Path("web/modules/thumbnail_toolbar.js").read_text(encoding="utf-8")
    assert "btnExportToolbar = document.getElementById('btnExportToolbar');" in toolbar_js
    assert "document.getElementById('btnExportToolbar') || document.getElementById('btnExport')" not in toolbar_js

    studio_js = Path("web/studio.js").read_text(encoding="utf-8")
    assert "state.isExporting" in studio_js
    assert "if (state.isExporting)" in studio_js
    assert "window.exportThumbnail = exportThumbnail;" in studio_js


def test_description_lock_and_sync_contract():
    """Verify HP-1 and MP-1: description lock guard, auto button, and flash-highlight exist."""
    html = Path("web/index.html").read_text(encoding="utf-8")
    assert 'id="btnUnlockDesc"' in html
    assert 'id="descLockIndicator"' in html

    studio_js = Path("web/studio.js").read_text(encoding="utf-8")
    assert "descriptionLocked" in studio_js
    assert "!state.descriptionLocked" in studio_js
    assert "btnUnlockDesc" in studio_js

    css = Path("web/style.css").read_text(encoding="utf-8")
    assert ".flash-highlight" in css


def test_duplicate_shortcut_contract():
    """Verify HP-5: Alt+D keyboard shortcut and button markup."""
    html = Path("web/index.html").read_text(encoding="utf-8")
    assert "[Alt+D]" in html
    assert "Shortcut: Alt+D" in html

    studio_js = Path("web/studio.js").read_text(encoding="utf-8")
    assert "e.altKey && (e.key === 'd' || e.key === 'D')" in studio_js


def test_phase2_badges_and_overlays_contract():
    """Verify Phase 2 (HP-3 & HP-4): Star Badge and Channel Watermark controls and render pipelines."""
    html = Path("web/index.html").read_text(encoding="utf-8")
    # Section Card 4
    assert 'id="cardBadgesOverlays"' in html
    # Star badge controls
    assert 'id="chkStarBadge"' in html
    assert 'id="inputStarBadgeText"' in html
    assert 'id="selStarBadgePos"' in html
    assert 'id="tbStarBadge"' in html
    # Watermark controls
    assert 'id="chkWatermark"' in html
    assert 'id="inputWatermarkText"' in html
    assert 'id="selWatermarkPos"' in html
    assert 'id="tbWatermark"' in html

    # Studio.js definitions
    studio_js = Path("web/studio.js").read_text(encoding="utf-8")
    assert "function renderStarBadge()" in studio_js
    assert "function renderWatermark()" in studio_js
    assert "renderStarBadge();" in studio_js
    assert "renderWatermark();" in studio_js
    assert "setupBadgesAndOverlaysUI()" in studio_js
    assert "updateBadgesAndOverlaysUI" in studio_js
    assert "starBadge:" in studio_js
    assert "watermark:" in studio_js

    # Snapshot and Project Persistence
    assert "starBadge: JSON.parse" in studio_js
    assert "watermark: JSON.parse" in studio_js
    assert "starBadge: state.starBadge" in studio_js
    assert "watermark: state.watermark" in studio_js

    # Toolbar bindings
    toolbar_js = Path("web/modules/thumbnail_toolbar.js").read_text(encoding="utf-8")
    assert "btnStarBadge = document.getElementById('tbStarBadge')" in toolbar_js
    assert "btnWatermark = document.getElementById('tbWatermark')" in toolbar_js


def test_phase3_text_overlay_module_contract():
    """Verify Phase 3 (HP-2): Modular Canvas Text Overlay Engine and UI controls."""
    module_path = Path("web/modules/text_overlay_manager.js")
    assert module_path.exists(), "text_overlay_manager.js must exist"
    module_js = module_path.read_text(encoding="utf-8")

    assert "export function createDefaultOverlay" in module_js
    assert "export function renderTextOverlays" in module_js
    assert "export function findOverlayAtCoords" in module_js
    assert "export function addTextOverlay" in module_js
    assert "export function removeTextOverlay" in module_js
    assert "export function updateTextOverlay" in module_js
    assert "export function renderOverlayListUI" in module_js

    # HTML bindings
    html = Path("web/index.html").read_text(encoding="utf-8")
    assert 'id="btnAddTextOverlay"' in html
    assert 'class="text-preset-btn"' in html
    assert 'id="textOverlayList"' in html
    assert "text_overlay_manager.js" in html

    # Studio.js canvas rendering and pointer interaction
    studio_js = Path("web/studio.js").read_text(encoding="utf-8")
    assert "overlays:" in studio_js
    assert "renderTextOverlays" in studio_js
    assert "draggedOverlay" in studio_js
    assert "findOverlayAtCoords" in studio_js
    assert "updateTextOverlaysUI" in studio_js

    # Snapshot and Project Persistence
    assert "overlays: JSON.parse" in studio_js
    assert "overlays: state.overlays" in studio_js
    assert "overlays: extra.overlays" in studio_js
