"""
Unit & Integration Tests for Unified Bi-Modal Loading Screen Detection Pipeline.
Tests Daytime (White), Nighttime (Dark), and Combat Burst Rejection filters.
"""

import cv2
import pytest
import numpy as np
from pathlib import Path

from execution.auto_edit_abyss import (
    classify_frame_loading_state,
    detect_chamber_intermission,
    detect_entry_loading_screen,
    detect_tail_loading_screen,
    IntermissionResult
)


def create_synthetic_test_video(path: Path, segments: list, fps: int = 10, width: int = 160, height: int = 90) -> Path:
    """
    Helper to create synthetic test videos with specified frame types.
    segments: list of (type_str, duration_s)
    Types: 'gameplay', 'dark_loading', 'white_loading', 'burst_flash'
    """
    fourcc = cv2.VideoWriter_fourcc(*"mp4v")
    out = cv2.VideoWriter(str(path), fourcc, float(fps), (width, height), isColor=True)

    for seg_type, dur_s in segments:
        num_frames = int(dur_s * fps)
        for _ in range(num_frames):
            if seg_type == "gameplay":
                # Simulated complex gameplay arena (textured noise)
                frame = np.random.randint(40, 200, (height, width, 3), dtype=np.uint8)
            elif seg_type == "dark_loading":
                # Simulated Genshin nighttime loading screen (deep charcoal + small center element)
                frame = np.full((height, width, 3), (22, 22, 26), dtype=np.uint8)
                # Add small center icon
                cy, cx = height // 2, width // 2
                frame[cy-4:cy+4, cx-10:cx+10] = (240, 240, 240)
            elif seg_type == "white_loading":
                # Simulated Genshin daytime loading screen (cream background + small dark element)
                frame = np.full((height, width, 3), (225, 230, 235), dtype=np.uint8)
                cy, cx = height // 2, width // 2
                frame[cy-4:cy+4, cx-10:cx+10] = (40, 40, 40)
            elif seg_type == "burst_flash":
                # Simulated combat burst: high contrast center bloom, dark perimeter
                frame = np.full((height, width, 3), (10, 10, 15), dtype=np.uint8)
                cy, cx = height // 2, width // 2
                frame[cy-15:cy+15, cx-25:cx+25] = (255, 255, 255)
            else:
                frame = np.zeros((height, width, 3), dtype=np.uint8)

            out.write(frame)

    out.release()
    return path


def test_classify_dark_loading_screen():
    """Verify dark loading screen frame is correctly identified as 'dark'."""
    frame = np.full((720, 1280, 3), (20, 20, 26), dtype=np.uint8)
    # Add small center icons
    frame[350:370, 600:680] = (230, 230, 230)

    is_loading, screen_type, conf, thumb = classify_frame_loading_state(frame)
    assert is_loading is True
    assert screen_type == "dark"
    assert conf >= 0.85


def test_classify_white_loading_screen():
    """Verify white/cream loading screen frame is correctly identified as 'white'."""
    frame = np.full((720, 1280, 3), (230, 230, 235), dtype=np.uint8)
    # Add small dark icons
    frame[350:370, 600:680] = (35, 35, 35)

    is_loading, screen_type, conf, thumb = classify_frame_loading_state(frame)
    assert is_loading is True
    assert screen_type == "white"
    assert conf >= 0.85


def test_classify_combat_burst_rejection():
    """Verify high-contrast combat bursts are rejected by standard deviation filtering."""
    # Frame with dark background and bright central explosion
    frame = np.full((720, 1280, 3), (12, 12, 18), dtype=np.uint8)
    frame[250:470, 450:830] = (255, 255, 255)

    is_loading, screen_type, conf, thumb = classify_frame_loading_state(frame)
    assert is_loading is False
    assert screen_type is None


def test_intermission_result_schema_contract():
    """Verify IntermissionResult retains tuple unpacking and exposes screen_type."""
    res = IntermissionResult(start_s=42.5, end_s=46.2, dur_s=100.0, confidence=0.96, screen_type="white")

    # Tuple unpacking
    start, end = res
    assert start == 42.5
    assert end == 46.2

    # Attributes
    assert res.screen_type == "white"
    assert res.trimmed == 3.7
    assert res["screen_type"] == "white"
    assert res.to_dict()["screen_type"] == "white"


def test_intermission_detection_on_synthetic_dark_clip(tmp_path):
    """Verify detect_chamber_intermission detects dark/nighttime loading screen."""
    clip = tmp_path / "dark_intermission.mp4"
    create_synthetic_test_video(
        clip,
        segments=[
            ("gameplay", 25.0),
            ("dark_loading", 4.0),
            ("gameplay", 25.0)
        ],
        fps=10
    )

    res = detect_chamber_intermission(clip, dur_s=54.0)
    assert res.confidence >= 0.70
    assert res.screen_type == "dark"
    # Expected intermission between 24.0s and 30.0s
    assert 22.0 <= res.start_s <= 27.0
    assert 27.0 <= res.end_s <= 31.0


def test_intermission_detection_on_synthetic_white_clip(tmp_path):
    """Verify detect_chamber_intermission detects daytime white loading screen."""
    clip = tmp_path / "white_intermission.mp4"
    create_synthetic_test_video(
        clip,
        segments=[
            ("gameplay", 25.0),
            ("white_loading", 4.0),
            ("gameplay", 25.0)
        ],
        fps=10
    )

    res = detect_chamber_intermission(clip, dur_s=54.0)
    assert res.confidence >= 0.70
    assert res.screen_type == "white"
    # Expected intermission between 24.0s and 30.0s
    assert 22.0 <= res.start_s <= 27.0
    assert 27.0 <= res.end_s <= 31.0


def test_entry_loading_screen_bi_modal(tmp_path):
    """Verify detect_entry_loading_screen cuts clean entry on both white and dark starts."""
    # 1. Dark entry clip
    dark_clip = tmp_path / "dark_entry.mp4"
    create_synthetic_test_video(dark_clip, segments=[("dark_loading", 2.0), ("gameplay", 10.0)], fps=10)
    entry_dark = detect_entry_loading_screen(dark_clip, dur_s=12.0)
    assert entry_dark >= 1.5

    # 2. White entry clip
    white_clip = tmp_path / "white_entry.mp4"
    create_synthetic_test_video(white_clip, segments=[("white_loading", 2.0), ("gameplay", 10.0)], fps=10)
    entry_white = detect_entry_loading_screen(white_clip, dur_s=12.0)
    assert entry_white >= 1.5
