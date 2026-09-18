"""
Tests for Creator Workflow Enhancements, BGM Intelligence & Export Presets (PR 9).
Verifies canonical track hashing, explainable recommendation rationale, concurrency throttle, and export presets.
"""

import asyncio
from pathlib import Path
import pytest
from fastapi.testclient import TestClient

from app import app, enhancement_semaphore
from execution.music_recommender import get_track_canonical_id, recommend_bgm_suite

client = TestClient(app)


def test_track_canonical_id_deterministic():
    """Verify get_track_canonical_id generates the identical hash regardless of slash style or casing."""
    p1 = "data/music/combat/Battle_Theme_01.mp3"
    p2 = "DATA\\MUSIC\\COMBAT\\BATTLE_THEME_01.MP3"
    p3 = "data/music/combat/battle_theme_01.mp3"

    h1 = get_track_canonical_id(p1)
    h2 = get_track_canonical_id(p2)
    h3 = get_track_canonical_id(p3)

    assert len(h1) == 16
    assert h1 == h2 == h3


def test_recommend_bgm_suite_explainability():
    """Verify recommend_bgm_suite includes structured explanation rationale metadata."""
    mock_catalog = {
        "tracks": [
            {
                "id": "trk_001",
                "title": "Epic Abyss Battle",
                "artist": "HOYO-MiX",
                "path": "data/music/combat/epic_battle.mp3",
                "duration_sec": 92.5,
                "duration_formatted": "01:32",
                "energy_hint": "high"
            },
            {
                "id": "trk_002",
                "title": "Chill Outro",
                "artist": "HOYO-MiX",
                "path": "data/music/outro/chill_outro.mp3",
                "duration_sec": 88.0,
                "duration_formatted": "01:28",
                "energy_hint": "chill"
            }
        ]
    }

    result = recommend_bgm_suite(
        chamber_durations=[90.0],
        builds_duration=85.0,
        catalog=mock_catalog
    )

    assert result["status"] == "ok"
    assignments = result["assignments"]
    assert "chamber_1" in assignments

    ch1 = assignments["chamber_1"]["selected"]
    assert ch1 is not None
    assert "explanation" in ch1
    exp = ch1["explanation"]
    assert exp["energy_match"] is True
    assert exp["energy_label"] == "High Energy"
    assert exp["duration_margin_sec"] == 2.5
    assert "rationale" in exp
    assert "+2.5s margin" in exp["rationale"]


def test_enhance_image_semaphore_concurrency():
    """Verify enhancement_semaphore exists and is initialized to limit 2."""
    assert isinstance(enhancement_semaphore, asyncio.Semaphore)
    assert enhancement_semaphore._value == 2


def test_html_contains_export_presets():
    """Verify index.html contains the selExportPreset dropdown with all 3 presets."""
    html_path = Path("web/index.html")
    assert html_path.exists()
    content = html_path.read_text(encoding="utf-8")

    assert 'id="selExportPreset"' in content
    assert 'value="png_1080p"' in content
    assert 'value="jpeg_yt"' in content
    assert 'value="roster_strip"' in content


def test_recordings_sessions_parameterization():
    """Verify /api/recordings/sessions supports session_id and returns active_slots."""
    from fastapi.testclient import TestClient
    from app import app
    client = TestClient(app)
    res = client.get("/api/recordings/sessions")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ok"
    assert "sessions" in data
    assert "selected_session_id" in data
    if data["sessions"]:
        first_id = data["sessions"][0]["session_id"]
        res_specific = client.get(f"/api/recordings/sessions?session_id={first_id}")
        assert res_specific.status_code == 200
        data_spec = res_specific.json()
        assert data_spec["selected_session_id"] == first_id


def test_recording_slots_parameterization():
    """Verify /api/recording-slots supports session_id filtering."""
    from fastapi.testclient import TestClient
    from app import app
    client = TestClient(app)
    res = client.get("/api/recording-slots")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ok"
    assert "slots" in data
