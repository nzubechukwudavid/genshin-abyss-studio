"""
Tests for Project Persistence & Undo/Redo Data Contracts (PR 7).
Verifies .abyss project validation, serialization, disk persistence, and path traversal security.
"""

import time
import pytest
from pathlib import Path
from fastapi.testclient import TestClient

from app import app
from app.schemas.models import AbyssProject, ThumbnailSlotConfig, Segment, MusicAssignment

client = TestClient(app)


def test_abyss_project_schema_roundtrip():
    """Verify AbyssProject Pydantic model serialization and roundtrip integrity."""
    proj = AbyssProject(
        version=1,
        project_name="Mavuika_Chasca_Floor_12",
        patch="7.0",
        floor=12,
        created_at=time.time(),
        side1=ThumbnailSlotConfig(
            character="Mavuika",
            element="Pyro",
            img_url="https://example.com/mavuika.png",
            scale=1.1,
            offset_x=10.0,
            offset_y=-30.0,
            mirrored=False,
            archetype="OVERLOAD",
            constellation="C0",
            teammates=["Mavuika", "Iansan", "Chevreuse", "Ororon"]
        ),
        side2=ThumbnailSlotConfig(
            character="Chasca",
            element="Anemo",
            img_url="https://example.com/chasca.png",
            scale=1.05,
            offset_x=-15.0,
            offset_y=-40.0,
            mirrored=True,
            archetype="RAINBOW HYPER",
            constellation="C2",
            teammates=["Chasca", "Furina", "Bennett", "Ororon"]
        ),
        thumbnail_extra={
            "centerStyle": "spire",
            "rosterLayout": "dock",
            "showEyeGuide": True
        },
        segments=[
            Segment(
                id="ch1_h1",
                chamber="12-1",
                half=1,
                start_s=5.0,
                duration_s=85.0,
                label="Chamber 1 (First Half)"
            )
        ]
    )

    data = proj.model_dump()
    assert data["project_name"] == "Mavuika_Chasca_Floor_12"
    assert data["side1"]["character"] == "Mavuika"
    assert data["side2"]["mirrored"] is True
    assert data["thumbnail_extra"]["centerStyle"] == "spire"
    assert len(data["segments"]) == 1

    # Re-instantiate from dict
    restored = AbyssProject(**data)
    assert restored.project_name == proj.project_name
    assert restored.side1.scale == 1.1


def test_api_project_validate_success():
    """Verify /api/project/validate succeeds with valid project payload."""
    payload = {
        "version": 1,
        "project_name": "Test_Abyss_Run",
        "patch": "7.0",
        "floor": 12,
        "created_at": time.time(),
        "side1": {
            "character": "Mavuika",
            "element": "Pyro",
            "img_url": "",
            "scale": 1.0,
            "offset_x": 0.0,
            "offset_y": 0.0,
            "mirrored": False,
            "archetype": "OVERLOAD",
            "constellation": "C0",
            "teammates": ["Mavuika", "Bennett", "Chevreuse", "Fischl"]
        },
        "side2": {
            "character": "Chasca",
            "element": "Anemo",
            "img_url": "",
            "scale": 1.0,
            "offset_x": 0.0,
            "offset_y": 0.0,
            "mirrored": True,
            "archetype": "RAINBOW HYPER",
            "constellation": "C0",
            "teammates": ["Chasca", "Furina", "Bennett", "Ororon"]
        }
    }

    res = client.post("/api/project/validate", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["valid"] is True
    assert data["project_name"] == "Test_Abyss_Run"
    assert data["side1_character"] == "Mavuika"
    assert data["side2_character"] == "Chasca"


def test_api_project_validate_failure():
    """Verify /api/project/validate returns 422 for missing required fields."""
    invalid_payload = {
        "version": 1,
        "project_name": "Incomplete_Project"
        # Missing created_at, side1, side2
    }

    res = client.post("/api/project/validate", json=invalid_payload)
    assert res.status_code == 422
    data = res.json()
    assert data["detail"]["valid"] is False


def test_api_project_save_and_retrieve(tmp_path):
    """Verify /api/project/save writes .abyss project and /api/project/{filename} retrieves it."""
    proj_name = f"Pytest_Run_{int(time.time())}"
    payload = {
        "version": 1,
        "project_name": proj_name,
        "patch": "7.0",
        "floor": 12,
        "created_at": time.time(),
        "side1": {
            "character": "Mavuika",
            "element": "Pyro",
            "img_url": "",
            "scale": 1.0,
            "offset_x": 0.0,
            "offset_y": 0.0,
            "mirrored": False,
            "archetype": "OVERLOAD",
            "constellation": "C0",
            "teammates": []
        },
        "side2": {
            "character": "Chasca",
            "element": "Anemo",
            "img_url": "",
            "scale": 1.0,
            "offset_x": 0.0,
            "offset_y": 0.0,
            "mirrored": True,
            "archetype": "RAINBOW HYPER",
            "constellation": "C0",
            "teammates": []
        }
    }

    # Save
    save_res = client.post("/api/project/save", json=payload)
    assert save_res.status_code == 200
    save_data = save_res.json()
    assert save_data["saved"] is True
    filename = save_data["filename"]
    assert filename.endswith(".abyss")

    # List
    list_res = client.get("/api/project/list")
    assert list_res.status_code == 200
    files = [p["filename"] for p in list_res.json()["projects"]]
    assert filename in files

    # Get
    get_res = client.get(f"/api/project/{filename}")
    assert get_res.status_code == 200
    retrieved = get_res.json()
    assert retrieved["project_name"] == proj_name
    assert retrieved["side1"]["character"] == "Mavuika"


def test_api_project_path_traversal_protection():
    """Verify path traversal filenames are sanitized and cannot escape project storage."""
    payload = {
        "version": 1,
        "project_name": "../../etc_passwd_exploit",
        "patch": "7.0",
        "floor": 12,
        "created_at": time.time(),
        "side1": {
            "character": "Mavuika",
            "element": "Pyro",
            "img_url": "",
            "scale": 1.0,
            "offset_x": 0.0,
            "offset_y": 0.0,
            "mirrored": False,
            "archetype": "OVERLOAD",
            "constellation": "C0",
            "teammates": []
        },
        "side2": {
            "character": "Chasca",
            "element": "Anemo",
            "img_url": "",
            "scale": 1.0,
            "offset_x": 0.0,
            "offset_y": 0.0,
            "mirrored": True,
            "archetype": "RAINBOW HYPER",
            "constellation": "C0",
            "teammates": []
        }
    }

    save_res = client.post("/api/project/save", json=payload)
    assert save_res.status_code == 200
    safe_filename = save_res.json()["filename"]
    # Ensure ../ was stripped out
    assert ".." not in safe_filename
    assert safe_filename.endswith(".abyss")
