"""
Unit and integration tests for Stygian Onslaught (Fearless Mode) pipeline:
- Purple loading screen classification
- Accurate countdown onset cutting
- Victory 'Time Elapsed' screen detection with 2.0s dwell buffer
- Multi-topology flexible BGM recommendation engine
- 4-file Stygian CapCut draft assembly and YouTube chapters
"""

import os
import cv2
import json
import pytest
import numpy as np
from pathlib import Path

from execution.auto_edit_abyss import (
    classify_frame_loading_state,
    is_stygian_time_elapsed_screen,
    detect_stygian_entry_cut,
    detect_stygian_tail_cut,
    assemble_stygian_project
)
from execution.music_recommender import recommend_stygian_bgm_suite


def create_synthetic_stygian_video(path: Path, segments: list, fps: int = 10, width: int = 160, height: int = 90) -> Path:
    """Creates synthetic test video for Stygian boundary testing without numpy.random."""
    fourcc = cv2.VideoWriter_fourcc(*"mp4v")
    out = cv2.VideoWriter(str(path), fourcc, float(fps), (width, height), isColor=True)

    # Base texture with arithmetic gradient
    x_coords = np.arange(width, dtype=np.uint8)
    y_coords = np.arange(height, dtype=np.uint8)[:, None]
    base_tex = ((x_coords * 3 + y_coords * 5) % 140 + 50).astype(np.uint8)
    base_bgr = cv2.cvtColor(base_tex, cv2.COLOR_GRAY2BGR)

    for seg_type, dur_s in segments:
        num_frames = int(dur_s * fps)
        for f_idx in range(num_frames):
            if seg_type == "purple_loading":
                # Violet in BGR: (85, 20, 80)
                frame = np.full((height, width, 3), (85, 20, 80), dtype=np.uint8)
            elif seg_type == "gameplay":
                # Simulated complex arena with HUD
                frame = base_bgr.copy()
                # Draw white skill buttons in bottom right
                cv2.circle(frame, (width - 15, height - 15), 8, (255, 255, 255), 2)
            elif seg_type == "victory_summary":
                # Darkened modal with bright summary text
                frame = np.full((height, width, 3), (35, 25, 45), dtype=np.uint8)
                # Bright title in upper-center
                cv2.putText(frame, "Battle Complete", (width // 4, height // 5), cv2.FONT_HERSHEY_SIMPLEX, 0.3, (255, 255, 255), 1)
                # Table rows in middle
                cv2.putText(frame, "Time Elapsed: 85s", (width // 4, height // 2), cv2.FONT_HERSHEY_SIMPLEX, 0.3, (220, 220, 220), 1)
            else:
                frame = np.zeros((height, width, 3), dtype=np.uint8)
            out.write(frame)

    out.release()
    return path


def test_classify_purple_stygian_loading():
    """Verifies that purple loading screens are detected as purple_stygian with high confidence."""
    # Uniform violet frame in BGR: (85, 20, 80)
    frame = np.full((120, 200, 3), (85, 20, 80), dtype=np.uint8)
    is_load, s_type, conf, _ = classify_frame_loading_state(frame)
    assert is_load is True
    assert s_type == "purple_stygian"
    assert conf >= 0.85

    # Non-purple gameplay frame
    gameplay = np.full((120, 200, 3), (180, 180, 40), dtype=np.uint8)
    is_load, s_type, _, _ = classify_frame_loading_state(gameplay)
    assert is_load is False


def test_detect_stygian_entry_cut_preserves_countdown(tmp_path):
    """Verifies that the cut starts at the exact frame where the purple screen ends (countdown onset)."""
    test_vid = tmp_path / "test_entry.mp4"
    # 2.0s purple loading screen, followed by 5.0s gameplay
    create_synthetic_stygian_video(test_vid, [("purple_loading", 2.0), ("gameplay", 5.0)])

    cut_start = detect_stygian_entry_cut(test_vid, 7.0)
    # Must cut right at the end of the loading screen (~2.0s)
    assert 1.6 <= cut_start <= 2.2


def test_detect_stygian_entry_cut_no_loading(tmp_path):
    """Verifies that if recorded mid-countdown (no loading screen), cut starts at 0.0s."""
    test_vid = tmp_path / "test_no_load.mp4"
    create_synthetic_stygian_video(test_vid, [("gameplay", 5.0)])

    cut_start = detect_stygian_entry_cut(test_vid, 5.0)
    assert cut_start == 0.0


def test_detect_stygian_tail_cut_preserves_victory_screen(tmp_path):
    """Verifies that tail cut locks onto the summary screen and preserves a 2.0s dwell buffer."""
    test_vid = tmp_path / "test_tail.mp4"
    # 5.0s gameplay, followed by 3.0s victory summary
    create_synthetic_stygian_video(test_vid, [("gameplay", 5.0), ("victory_summary", 3.0)])

    cut_end = detect_stygian_tail_cut(test_vid, 8.0)
    # Summary starts at 5.0s. Holding 2.0s brings end cut to ~7.0s
    assert 6.5 <= cut_end <= 7.9


def test_recommend_stygian_bgm_suite_topologies():
    """Verifies that the BGM recommender evaluates all 4 topologies and handles arbitrary lengths."""
    res = recommend_stygian_bgm_suite([70.0, 65.0, 110.0], builds_duration=120.0)

    assert res["status"] == "ok"
    assert "topologies" in res
    topos = res["topologies"]
    assert "topology_2x2" in topos
    assert "topology_1_1_combined" in topos
    assert "topology_unified_combat" in topos
    assert "topology_discrete_4" in topos

    # Verify topology_2x2 slot targets
    t2x2_slots = topos["topology_2x2"]["assignments"]
    assert "boss_1_2" in t2x2_slots
    assert t2x2_slots["boss_1_2"]["target_sec"] == 70.0 + 65.0
    assert "boss_3_builds" in t2x2_slots
    assert t2x2_slots["boss_3_builds"]["target_sec"] == 110.0 + 120.0

    # Verify topology_unified_combat
    t_uni = topos["topology_unified_combat"]["assignments"]
    assert t_uni["all_bosses"]["target_sec"] == 70.0 + 65.0 + 110.0
    assert t_uni["builds"]["target_sec"] == 120.0


def test_assemble_stygian_project_synthetic(tmp_path):
    """Tests full orchestration of a 4-file Stygian project generating valid CapCut draft and chapters."""
    b1 = create_synthetic_stygian_video(tmp_path / "b1.mp4", [("purple_loading", 1.0), ("gameplay", 4.0), ("victory_summary", 2.0)])
    b2 = create_synthetic_stygian_video(tmp_path / "b2.mp4", [("purple_loading", 1.0), ("gameplay", 4.0), ("victory_summary", 2.0)])
    b3 = create_synthetic_stygian_video(tmp_path / "b3.mp4", [("purple_loading", 1.0), ("gameplay", 5.0), ("victory_summary", 2.0)])
    builds = create_synthetic_stygian_video(tmp_path / "builds.mp4", [("gameplay", 6.0)])

    result = assemble_stygian_project(
        boss_files=[b1, b2, b3],
        builds_file=builds,
        project_name="Pytest_Stygian_Run",
        sync_to_cloud=False,
        auto_launch=False
    )

    assert result["status"] == "success"
    assert result["mode"] == "stygian"
    assert len(result["segments"]) == 4
    assert len(result["chapters"]) == 4
    assert Path(result["draft_path"]).exists()
    assert "Battlefield 1" in result["chapters"][0]
    assert "Character Builds" in result["chapters"][3]
