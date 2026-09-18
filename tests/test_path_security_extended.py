"""
Extended Path Security and Boundary Validation Test Suite for Genshin Abyss Studio.
Exhaustively verifies path traversal protections across media streaming,
thumbnail generation, and project persistence endpoints against sophisticated injection vectors.
"""

import pytest
from fastapi.testclient import TestClient
from app import app

client = TestClient(app)

TRAVERSAL_PAYLOADS = [
    "../../../../etc/passwd",
    "..\\..\\..\\..\\windows\\win.ini",
    "%2e%2e%2f%2e%2e%2fetc%2fpasswd",
    "%252e%252e%252fetc%252fpasswd",
    "..%2f..%2f..%2f..%2fetc%2fpasswd",
    "/etc/passwd",
    "C:\\Windows\\System32\\drivers\\etc\\hosts",
    "\\\\attacker-server\\share\\malicious.mp4",
    "file:///etc/passwd",
    "data/../../../sensitive.json",
    "..%2f..%2fboot.ini%00.mp4",
    "test_project%00.abyss"
]


@pytest.mark.parametrize("payload", TRAVERSAL_PAYLOADS)
def test_stream_audio_path_traversal_rejection(payload):
    """Verify /api/stream-audio cleanly rejects traversal and escape vectors."""
    resp = client.get(f"/api/stream-audio?path={payload}")
    assert resp.status_code in (400, 403, 404), f"Payload '{payload}' was not rejected: status {resp.status_code}"


@pytest.mark.parametrize("payload", TRAVERSAL_PAYLOADS)
def test_video_thumbnail_path_traversal_rejection(payload):
    """Verify /api/video-thumbnail cleanly rejects traversal and escape vectors."""
    resp = client.get(f"/api/video-thumbnail?path={payload}&time_s=1.0")
    assert resp.status_code in (400, 403, 404), f"Payload '{payload}' was not rejected: status {resp.status_code}"


@pytest.mark.parametrize("payload", TRAVERSAL_PAYLOADS)
def test_project_get_path_traversal_rejection(payload):
    """Verify /api/project/{filename} sanitizes filename and prevents directory escapes."""
    resp = client.get(f"/api/project/{payload}")
    assert resp.status_code in (400, 404), f"Payload '{payload}' was not rejected: status {resp.status_code}"
