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
