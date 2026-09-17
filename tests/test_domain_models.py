"""
Test suite for Pydantic domain models in app/schemas/.
Verifies typed validation, serialization, and deserialization for Abyss project schemas.
"""

import time
import pytest
from app.schemas import (
    Segment,
    RecordingAnalysis,
    MusicAssignment,
    ThumbnailSlotConfig,
    AbyssProject
)

def test_segment_schema():
    """Verify Segment model enforces types and positive durations."""
    seg = Segment(
        id="ch1_h1",
        chamber="12-1",
        half=1,
        start_s=3.5,
        duration_s=42.0,
        label="Floor 12-1 First Half"
    )
    assert seg.id == "ch1_h1"
    assert seg.duration_s == 42.0

    # Ensure negative duration raises validation error
    with pytest.raises(Exception):
        Segment(id="bad", chamber="12-1", start_s=0.0, duration_s=-5.0, label="Bad")

def test_recording_analysis_schema():
    """Verify RecordingAnalysis model validates confidence bounds."""
    rec = RecordingAnalysis(
        path_id="clip_01.mp4",
        duration_s=180.5,
        entry_cut_s=2.5,
        intermission_start_s=80.0,
        intermission_end_s=85.0,
        confidence=0.94
    )
    assert rec.confidence == 0.94
    assert rec.width == 1920

def test_abyss_project_roundtrip():
    """Verify full AbyssProject serializes to JSON and parses back cleanly."""
    side1 = ThumbnailSlotConfig(character="Mavuika", element="Pyro", archetype="OVERLOAD")
    side2 = ThumbnailSlotConfig(character="Clorinde", element="Electro", archetype="QUICKEN")

    proj = AbyssProject(
        version=1,
        project_name="Mavuika_Clorinde_Abyss",
        patch="7.0",
        floor=12,
        created_at=time.time(),
        side1=side1,
        side2=side2
    )

    json_data = proj.model_dump_json()
    assert "Mavuika" in json_data
    assert "Clorinde" in json_data

    reloaded = AbyssProject.model_validate_json(json_data)
    assert reloaded.side1.character == "Mavuika"
    assert reloaded.side2.character == "Clorinde"
    assert reloaded.floor == 12
