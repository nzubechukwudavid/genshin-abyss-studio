"""
Synthetic video pipeline tests for Genshin Abyss Studio.
Uses programmatically generated OpenCV test fixtures to verify video metadata probing,
luminance analysis, and intermission detection confidence.
"""

import pytest
import numpy as np
import cv2
from pathlib import Path

from execution.auto_edit_abyss import (
    probe_video_metadata,
    IntermissionResult,
    format_timestamp
)


def create_synthetic_mp4(path: Path, width: int = 320, height: int = 180, fps: int = 30, frames_desc: list = None) -> Path:
    """Helper to generate a lightweight synthetic MP4 video file."""
    fourcc = cv2.VideoWriter_fourcc(*"mp4v")
    out = cv2.VideoWriter(str(path), fourcc, float(fps), (width, height), isColor=True)
    
    if not frames_desc:
        # Default: 30 dark frames (1 second)
        frames_desc = [("black", 30)]

    for f_type, count in frames_desc:
        for _ in range(count):
            if f_type == "black":
                frame = np.zeros((height, width, 3), dtype=np.uint8)
            elif f_type == "white":
                frame = np.full((height, width, 3), 255, dtype=np.uint8)
            elif f_type == "noise":
                frame = np.random.randint(40, 200, (height, width, 3), dtype=np.uint8)
            else:
                frame = np.full((height, width, 3), 128, dtype=np.uint8)
            out.write(frame)

    out.release()
    return path


def test_synthetic_metadata_probing(tmp_path):
    """Verify probe_video_metadata accurately measures synthetic video duration and dimensions."""
    test_video = tmp_path / "probe_test.mp4"
    create_synthetic_mp4(test_video, width=320, height=180, fps=30, frames_desc=[("noise", 60)])

    dur_s, w, h, frames = probe_video_metadata(test_video)
    assert w == 320
    assert h == 180
    assert frames == 60
    assert abs(dur_s - 2.0) < 0.1


def test_synthetic_intermission_result_contract():
    """Verify IntermissionResult tuple indexing, dict access, and confidence bounds."""
    res = IntermissionResult(start_s=45.2, end_s=52.8, dur_s=120.0, confidence=0.88)
    
    # Tuple unpacking
    start, end = res
    assert start == 45.2
    assert end == 52.8

    # Dict access
    assert res["start_s"] == 45.2
    assert res["end_s"] == 52.8
    assert res["confidence"] == 0.88
    assert res.trimmed == round(52.8 - 45.2, 2)
    assert res.h1_dur == 45.2
    assert res.h2_dur == round(120.0 - 52.8, 2)

    d = res.to_dict()
    assert d["confidence"] == 0.88
    assert d["trimmed"] == 7.6


def test_format_timestamp_helper():
    """Verify timestamp formatting for short and long durations."""
    assert format_timestamp(0.0) == "00:00"
    assert format_timestamp(65.0) == "01:05"
    assert format_timestamp(3665.0) == "61:05"
