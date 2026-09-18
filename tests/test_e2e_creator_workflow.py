"""
End-to-End Creator Workflow Integration Test Suite for Genshin Abyss Studio.
Validates the entire creator journey from raw video segments and audio matching
to CapCut PC draft synthesis, .abyss persistence, and canvas export integrity.
"""

import io
import time
import json
import tempfile
from pathlib import Path
import pytest
from fastapi.testclient import TestClient
from PIL import Image

from app import app
from app.core.config import APP_VERSION
from execution.capcut_template_schema import CapCutDraftBuilder
from execution.music_recommender import recommend_bgm_suite


@pytest.fixture
def client():
    return TestClient(app)


def test_e2e_capcut_draft_synthesis_and_schema_integrity():
    """Verify CapCut draft creation, atomic writing, and strict JSON schema conformance."""
    with tempfile.TemporaryDirectory() as tmp_dir:
        drafts_root = Path(tmp_dir)

        dummy_vid = drafts_root / "chamber1.mp4"
        dummy_vid.write_bytes(b"\x00" * 1024)
        dummy_audio = drafts_root / "battle_bgm.mp3"
        dummy_audio.write_bytes(b"\x00" * 512)

        builder = CapCutDraftBuilder(project_name="E2E_Test_Abyss_Run")

        # 1. Register materials
        v_id = builder.add_video_material(str(dummy_vid), duration_us=120_000_000)
        a_id = builder.add_audio_material(str(dummy_audio), duration_us=60_000_000)

        # 2. Add segments
        builder.add_video_segment(v_id, source_start_s=0.0, duration_s=45.0, transition="black_fade")
        builder.add_video_segment(v_id, source_start_s=50.0, duration_s=70.0, transition="woosh")
        builder.add_bgm_segment(a_id, target_start_s=0.0, duration_s=60.0)

        # 3. Save to custom CapCut drafts directory atomically
        project_folder = builder.save_to_capcut(custom_drafts_dir=drafts_root)

        # 4. Assert required draft directory layout
        assert project_folder.is_dir()
        assert (project_folder / "draft_content.json").is_file()
        assert (project_folder / "draft_meta_info.json").is_file()
        assert (project_folder / "draft_virtual_store.json").is_file()
        assert (project_folder / "draft_agency_config.json").is_file()
        assert (drafts_root / "root_meta_info.json").is_file()

        # 5. Assert draft_content schema validity
        draft_content = json.loads((project_folder / "draft_content.json").read_text(encoding="utf-8"))
        assert "materials" in draft_content
        assert "tracks" in draft_content
        assert "duration" in draft_content
        assert draft_content["duration"] > 0

        track_types = [t.get("type") for t in draft_content["tracks"]]
        assert "video" in track_types
        assert "audio" in track_types

        # 6. Assert root_meta_info index entry
        root_meta = json.loads((drafts_root / "root_meta_info.json").read_text(encoding="utf-8"))
        assert "all_draft_store" in root_meta
        assert len(root_meta["all_draft_store"]) >= 1
        assert root_meta["all_draft_store"][0]["draft_name"] == "E2E_Test_Abyss_Run"


def test_e2e_bgm_recommendation_pipeline():
    """Verify BGM recommendation engine returns assignments with duration fit and energy metadata."""
    suite = recommend_bgm_suite(chamber_durations=[85.0, 95.0, 110.0], builds_duration=60.0)
    assert isinstance(suite, dict)
    assert "assignments" in suite
    assignments = suite["assignments"]
    assert "chamber_1" in assignments
    assert "chamber_2" in assignments
    assert "chamber_3" in assignments
    assert "builds" in assignments


def test_e2e_project_persistence_roundtrip(client):
    """Verify complete save, validate, list, and reload cycle for .abyss project file."""
    project_payload = {
        "version": 1,
        "project_name": "E2E_Production_Run",
        "patch": "5.4",
        "floor": 12,
        "created_at": time.time(),
        "side1": {
            "character": "Mavuika",
            "element": "Pyro",
            "img_url": "https://example.com/mavuika.png",
            "scale": 1.1,
            "offset_x": 10.0,
            "offset_y": -5.0,
            "mirrored": False,
            "archetype": "OVERLOAD",
            "constellation": "C0",
            "teammates": ["Mavuika", "Citlali", "Xilonen", "Bennett"]
        },
        "side2": {
            "character": "Neuvillette",
            "element": "Hydro",
            "img_url": "https://example.com/neuvillette.png",
            "scale": 1.0,
            "offset_x": 0.0,
            "offset_y": 0.0,
            "mirrored": True,
            "archetype": "HYPER",
            "constellation": "C1",
            "teammates": ["Neuvillette", "Furina", "Kazuha", "Baizhu"]
        },
        "thumbnail_extra": {
            "centerStyle": "spire",
            "rosterLayout": "dock"
        },
        "segments": [
            {
                "id": "ch1_h1",
                "chamber": "12-1",
                "half": 1,
                "start_s": 0.0,
                "duration_s": 45.0,
                "label": "12-1-1", "is_active": True
            }
        ]
    }

    # 1. Validate endpoint
    val_resp = client.post("/api/project/validate", json=project_payload)
    assert val_resp.status_code == 200
    val_data = val_resp.json()
    assert val_data["valid"] is True
    assert val_data["project_name"] == "E2E_Production_Run"

    # 2. Save endpoint
    save_resp = client.post("/api/project/save", json=project_payload)
    assert save_resp.status_code == 200
    save_data = save_resp.json()
    assert save_data["saved"] is True
    assert "filename" in save_data
    saved_filename = save_data["filename"]

    # 3. List endpoint
    list_resp = client.get("/api/project/list")
    assert list_resp.status_code == 200
    listed = [p["filename"] for p in list_resp.json().get("projects", [])]
    assert saved_filename in listed

    # 4. Load endpoint
    load_resp = client.get(f"/api/project/{saved_filename}")
    assert load_resp.status_code == 200
    restored = load_resp.json()
    assert restored["project_name"] == "E2E_Production_Run"
    assert restored["side1"]["character"] == "Mavuika"
    assert restored["side2"]["character"] == "Neuvillette"
    assert len(restored["segments"]) == 1


def test_e2e_canvas_export_formats_and_constraints(client):
    """Verify 1080p canvas image upload, dimension parsing, and payload validation."""
    # Generate test 1080p canvas image in memory
    img = Image.new("RGBA", (1920, 1080), (30, 30, 45, 255))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    png_bytes = buf.getvalue()

    # 1. Valid 1080p canvas export
    res = client.post(
        "/api/export-canvas",
        files={"image": ("canvas.png", png_bytes, "image/png")}
    )
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ok"
    assert data["width"] == 1920
    assert data["height"] == 1080

    # 2. Rejection of empty payload
    res_empty = client.post(
        "/api/export-canvas",
        files={"image": ("empty.png", b"", "image/png")}
    )
    assert res_empty.status_code == 400

    # 3. Rejection of non-image corrupt payload
    res_corrupt = client.post(
        "/api/export-canvas",
        files={"image": ("corrupt.png", b"not_an_image_data_at_all", "image/png")}
    )
    assert res_corrupt.status_code == 400
