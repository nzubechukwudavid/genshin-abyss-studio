"""
Test suite for video analysis confidence scoring and manual trim overrides.
Verifies multi-signal detector outputs and override persistence.
"""

from pathlib import Path
from fastapi.testclient import TestClient
from app import app
from execution.auto_edit_abyss import detect_chamber_intermission, CACHE_DIR

client = TestClient(app)

def test_trim_override_api_and_detector():
    """Verify /api/recordings/trim-override persists and is honored by detector."""
    fake_clip = Path("mock_chamber_12_1.mp4")
    
    # 1. Post manual trim override
    payload = {
        "filename": fake_clip.name,
        "start_s": 52.5,
        "end_s": 58.0
    }
    response = client.post("/api/recordings/trim-override", json=payload)
    assert response.status_code == 200
    assert response.json()["status"] == "ok"

    # 2. Call detector on this clip
    res = detect_chamber_intermission(fake_clip, dur_s=150.0)
    assert res.start_s == 52.5
    assert res.end_s == 58.0
    assert res.confidence == 1.0  # Creator override gets 100% confidence
    assert res.trimmed == 5.5

    # 3. Clean up override
    override_file = CACHE_DIR / "user_trim_overrides.json"
    if override_file.exists():
        try:
            import json
            ov = json.loads(override_file.read_text(encoding="utf-8"))
            ov.pop(fake_clip.name, None)
            override_file.write_text(json.dumps(ov, indent=2), encoding="utf-8")
        except Exception:
            pass
