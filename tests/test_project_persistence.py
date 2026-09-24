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


def test_project_full_disk_roundtrip(tmp_path):
    """Verify complete state roundtrip from AbyssProject model -> file -> deserialized model."""
    from app.core.fs import atomic_write_text
    
    orig = AbyssProject(
        version=1,
        project_name="Full_Roundtrip_Test",
        patch="5.2",
        floor=12,
        created_at=time.time(),
        side1=ThumbnailSlotConfig(
            character="Mavuika",
            element="Pyro",
            scale=1.25,
            offset_x=45.0,
            offset_y=-20.0,
            mirrored=True,
            archetype="VAPORIZE",
            constellation="C2",
            teammates=["Mavuika", "Yelan", "Xianyun", "Furina"]
        ),
        side2=ThumbnailSlotConfig(
            character="Chasca",
            element="Anemo",
            scale=0.95,
            offset_x=-30.0,
            offset_y=10.0,
            mirrored=False,
            archetype="RAINBOW",
            constellation="C1",
            teammates=["Chasca", "Bennett", "Fischl", "Ororon"]
        ),
        thumbnail_extra={"notes": "Roundtrip test verified"},
        segments=[
            Segment(id="seg1", chamber="12-1", half=1, start_s=4.5, duration_s=65.2, label="12-1-1")
        ]
    )

    test_file = tmp_path / "test_roundtrip.abyss"
    atomic_write_text(test_file, orig.model_dump_json(indent=2))
    assert test_file.exists()

    loaded_raw = test_file.read_text(encoding="utf-8")
    restored = AbyssProject.model_validate_json(loaded_raw)

    assert restored.project_name == orig.project_name
    assert restored.version == orig.version
    assert restored.floor == orig.floor
    assert restored.side1.character == orig.side1.character
    assert restored.side1.scale == orig.side1.scale
    assert restored.side1.mirrored is True
    assert restored.side1.teammates == ["Mavuika", "Yelan", "Xianyun", "Furina"]
    assert restored.side2.character == "Chasca"
    assert len(restored.segments) == 1
    assert restored.segments[0].duration_s == 65.2


def test_project_invalid_version_rejection():
    """Verify projects with missing or incompatible schemas fail validation."""
    malformed_payload = {
        "version": "invalid_not_an_int",
        "project_name": "Broken_Project",
        "floor": 12
    }
    resp = client.post("/api/project/validate", json=malformed_payload)
    assert resp.status_code == 422
    assert resp.json()["detail"]["valid"] is False



def test_text_overlay_and_badges_persistence_roundtrip():
    """Verify HP-2, HP-3, HP-4: overlays, starBadge, and watermark persist through AbyssProject schema."""
    import time
    from app.schemas.models import AbyssProject, ThumbnailSlotConfig

    payload = AbyssProject(
        version=1,
        project_name="Overlay_Suite_Test",
        patch="7.0",
        floor=12,
        created_at=time.time(),
        side1=ThumbnailSlotConfig(
            character="Mavuika",
            element="Pyro",
            img_url="",
            scale=1.0,
            offset_x=0.0,
            offset_y=0.0,
            mirrored=False,
            archetype="OVERLOAD",
            constellation="C0",
            teammates=["Mavuika"]
        ),
        side2=ThumbnailSlotConfig(
            character="Chasca",
            element="Anemo",
            img_url="",
            scale=1.0,
            offset_x=0.0,
            offset_y=0.0,
            mirrored=True,
            archetype="RAINBOW HYPER",
            constellation="C0",
            teammates=["Chasca"]
        ),
        thumbnail_extra={
            "starBadge": {
                "enabled": True,
                "text": "36★ CLEAR",
                "position": "top-left"
            },
            "watermark": {
                "enabled": True,
                "text": "@Sireula",
                "position": "bottom-left",
                "opacity": 0.8
            },
            "overlays": [
                {
                    "id": "ov_test_1",
                    "text": "C0",
                    "x": 960,
                    "y": 240,
                    "fontSize": 72,
                    "color": "#FFFFFF",
                    "strokeWidth": 6,
                    "visible": True
                },
                {
                    "id": "ov_test_2",
                    "text": "SOLO",
                    "x": 960,
                    "y": 340,
                    "fontSize": 80,
                    "color": "#FFD54F",
                    "strokeWidth": 6,
                    "visible": True
                }
            ]
        },
        segments=[],
        music_suite=[]
    )

    # 1. Validate against API validate endpoint
    val_res = client.post("/api/project/validate", json=payload.model_dump())
    assert val_res.status_code == 200
    assert val_res.json()["valid"] is True

    # 2. Save and Retrieve full project schema
    save_res = client.post("/api/project/save", json=payload.model_dump())
    assert save_res.status_code == 200
    filename = save_res.json()["filename"]

    get_res = client.get(f"/api/project/{filename}")
    assert get_res.status_code == 200
    retrieved = get_res.json()
    extra = retrieved.get("thumbnail_extra", {})
    assert "overlays" in extra
    assert len(extra["overlays"]) == 2
    assert extra["overlays"][0]["text"] == "C0"
    assert extra["overlays"][1]["text"] == "SOLO"
    assert extra["starBadge"]["text"] == "36★ CLEAR"
    assert extra["watermark"]["text"] == "@Sireula"



def test_full_overlay_and_branding_fidelity_persistence(tmp_path):
    """Verify Phase 3: Comprehensive round-trip persistence of overlays, badges, watermarks, and A/B compare notes with unicode/emoji."""
    import time
    from app.schemas.models import AbyssProject, ThumbnailSlotConfig
    from app.core.fs import atomic_write_text

    full_overlays = [
        {
            "id": "ov_detailed_1",
            "text": "36★ 螺旋クリア (Full Clear)",
            "fontFamily": "Norwester",
            "fontSize": 72,
            "color": "#FFD54F",
            "strokeColor": "#000000",
            "strokeWidth": 8,
            "opacity": 0.95,
            "visible": True,
            "zIndex": 10,
            "x": 960,
            "y": 180
        },
        {
            "id": "ov_detailed_2",
            "text": "👑 C6 R5 NO HEALER",
            "fontFamily": "Anton",
            "fontSize": 84,
            "color": "#FFFFFF",
            "strokeColor": "#D32F2F",
            "strokeWidth": 6,
            "opacity": 1.0,
            "visible": True,
            "zIndex": 12,
            "x": 480,
            "y": 920
        }
    ]

    extra_payload = {
        "starBadge": {
            "enabled": True,
            "preset": "36_star_clear",
            "text": "36★ CLEAR",
            "position": "spire-center",
            "scale": 1.15
        },
        "watermark": {
            "enabled": True,
            "text": "@Sireula_Official",
            "position": "top-right",
            "opacity": 0.75,
            "shadow": True
        },
        "abCompare": {
            "notes": "Testing high contrast Gold Star badge vs red text stamp for mobile CTR",
            "variantA_title": "Mavuika C6 Overload 36★",
            "variantB_title": "Solo Chasca 36★ Clear"
        },
        "overlays": full_overlays
    }

    project = AbyssProject(
        version=1,
        project_name="Full_Branding_Fidelity_Suite",
        patch="5.5",
        floor=12,
        created_at=time.time(),
        side1=ThumbnailSlotConfig(
            character="Mavuika",
            element="Pyro",
            img_url="https://act-upload.hoyoverse.com/mavuika.png",
            scale=1.2,
            offset_x=15.0,
            offset_y=-30.0,
            mirrored=False,
            archetype="OVERLOAD",
            constellation="C6",
            teammates=["Mavuika", "Iansan", "Chevreuse", "Bennett"]
        ),
        side2=ThumbnailSlotConfig(
            character="Chasca",
            element="Anemo",
            img_url="https://act-upload.hoyoverse.com/chasca.png",
            scale=1.1,
            offset_x=-20.0,
            offset_y=10.0,
            mirrored=True,
            archetype="RAINBOW HYPER",
            constellation="C0",
            teammates=["Chasca", "Furina", "Ororon", "Bennett"]
        ),
        thumbnail_extra=extra_payload,
        segments=[],
        music_suite=[]
    )

    # 1. Test API Project Save & Load
    save_res = client.post("/api/project/save", json=project.model_dump())
    assert save_res.status_code == 200
    fname = save_res.json()["filename"]

    get_res = client.get(f"/api/project/{fname}")
    assert get_res.status_code == 200
    loaded = get_res.json()
    loaded_extra = loaded["thumbnail_extra"]

    # Assert 100% fidelity on overlays
    assert len(loaded_extra["overlays"]) == 2
    o1 = loaded_extra["overlays"][0]
    assert o1["text"] == "36★ 螺旋クリア (Full Clear)"
    assert o1["fontFamily"] == "Norwester"
    assert o1["fontSize"] == 72
    assert o1["strokeWidth"] == 8
    assert o1["opacity"] == 0.95
    assert o1["zIndex"] == 10

    o2 = loaded_extra["overlays"][1]
    assert o2["text"] == "👑 C6 R5 NO HEALER"
    assert o2["strokeColor"] == "#D32F2F"

    # Assert starBadge fidelity
    assert loaded_extra["starBadge"]["preset"] == "36_star_clear"
    assert loaded_extra["starBadge"]["position"] == "spire-center"
    assert loaded_extra["starBadge"]["scale"] == 1.15

    # Assert watermark fidelity
    assert loaded_extra["watermark"]["text"] == "@Sireula_Official"
    assert loaded_extra["watermark"]["opacity"] == 0.75

    # Assert abCompare notes fidelity
    assert loaded_extra["abCompare"]["notes"] == "Testing high contrast Gold Star badge vs red text stamp for mobile CTR"

    # 2. Test Direct Disk .abyss File Serialization Round-Trip
    target_file = tmp_path / "deep_fidelity_test.abyss"
    atomic_write_text(target_file, project.model_dump_json(indent=2))
    assert target_file.exists()

    disk_loaded = AbyssProject.model_validate_json(target_file.read_text(encoding="utf-8"))
    disk_extra = disk_loaded.thumbnail_extra
    assert disk_extra["overlays"][0]["text"] == "36★ 螺旋クリア (Full Clear)"
    assert disk_extra["overlays"][1]["text"] == "👑 C6 R5 NO HEALER"
    assert disk_extra["starBadge"]["text"] == "36★ CLEAR"
    assert disk_extra["watermark"]["text"] == "@Sireula_Official"
    assert disk_extra["abCompare"]["notes"] == "Testing high contrast Gold Star badge vs red text stamp for mobile CTR" 
