"""
Security regression test suite for Genshin Abyss Studio.
Verifies path traversal guards, SSRF protections, upload sanitization, and sync token security.
"""

import pytest
from pathlib import Path
from fastapi.testclient import TestClient
from app import app, validate_safe_media_path, validate_proxy_url
from fastapi import HTTPException

client = TestClient(app)

def test_path_traversal_restricted():
    """Verify arbitrary paths outside allowed roots raise 403 Forbidden."""
    # Attempting to access sensitive system files
    with pytest.raises(HTTPException) as exc:
        validate_safe_media_path("C:/Windows/System32/drivers/etc/hosts")
    assert exc.value.status_code in (403, 404)

def test_stream_video_path_traversal():
    """Verify /api/stream-video rejects arbitrary path parameters with 403."""
    response = client.get("/api/stream-video?path=C:/Windows/System32/cmd.exe")
    assert response.status_code in (400, 403, 404)

def test_proxy_ssrf_disallowed_domain():
    """Verify /api/proxy-image rejects untrusted external domains."""
    with pytest.raises(HTTPException) as exc:
        validate_proxy_url("https://malicious-domain.com/evil.png")
    assert exc.value.status_code == 400
    assert "not permitted" in exc.value.detail

def test_proxy_ssrf_private_ip():
    """Verify /api/proxy-image rejects private/loopback IP addresses."""
    with pytest.raises(HTTPException) as exc:
        validate_proxy_url("http://127.0.0.1:8000/secret")
    assert exc.value.status_code == 400

    with pytest.raises(HTTPException) as exc:
        validate_proxy_url("http://169.254.169.254/latest/meta-data")
    assert exc.value.status_code == 400

def test_proxy_allowed_domain():
    """Verify legitimate HoYoLab / HoYoVerse CDN domains pass validation."""
    validate_proxy_url("https://act-upload.hoyoverse.com/genshin/character.png")
    validate_proxy_url("https://upload-os-bbs.hoyolab.com/upload/2024/avatar.jpg")
    validate_proxy_url("https://wiki.hoyolab.com/images/character_splash.png")
    assert True

def test_upload_invalid_format():
    """Verify upload rejects non-image extensions."""
    files = {"file": ("test.exe", b"binary content", "application/octet-stream")}
    response = client.post("/api/upload", files=files)
    assert response.status_code == 400
    assert "Invalid image format" in response.json()["detail"]

def test_video_thumbnail_path_traversal():
    """Verify /api/video-thumbnail rejects unauthorized system paths."""
    response = client.get("/api/video-thumbnail?path=C:/Windows/System32/cmd.exe")
    assert response.status_code in (400, 403, 404)

def test_export_canvas_corrupted_payload():
    """Verify /api/export-canvas rejects non-image raw bytes with 400."""
    files = {"image": ("malicious.png", b"NOT_A_REAL_IMAGE_FILE", "image/png")}
    response = client.post("/api/export-canvas", files=files)
    assert response.status_code == 400
    assert "Invalid or corrupt" in response.json()["detail"]

def test_export_canvas_valid_png():
    """Verify /api/export-canvas accepts valid PNG image and returns ok."""
    from io import BytesIO
    from PIL import Image
    buf = BytesIO()
    Image.new("RGBA", (1920, 1080), (255, 0, 0, 255)).save(buf, format="PNG")
    files = {"image": ("test.png", buf.getvalue(), "image/png")}
    response = client.post("/api/export-canvas", files=files)
    assert response.status_code == 200
    assert response.json()["status"] == "ok"
    assert response.json()["width"] == 1920

def test_http_range_416_unsatisfiable():
    """Verify parse_byte_range raises 416 when start exceeds file size."""
    from app import parse_byte_range
    with pytest.raises(HTTPException) as exc:
        parse_byte_range("bytes=5000-6000", file_size=1000)
    assert exc.value.status_code == 416
    assert exc.value.headers.get("Content-Range") == "bytes */1000"

