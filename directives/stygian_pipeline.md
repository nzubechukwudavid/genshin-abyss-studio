# Stygian Onslaught Pipeline Directive
<!-- DOE-VERSION: 2026.10.08 -->

## Goal
Automate the end-to-end editing, frame classification, audio topology synchronization, and CapCut draft assembly for Genshin Impact's 3-boss endgame combat mode (**Stygian Onslaught**), transforming raw OBS/GeForce recordings into a polished, high-retention creator video with automated YouTube chapters and thumbnail integration.

## Trigger Phrases
- "stygian onslaught pipeline"
- "stygian video assembly"
- "stygian auto edit"
- "stygian chapter sync"
- "stygian arranger"

---

## 1. Pipeline Architecture Overview

The Stygian Onslaught pipeline processes **3 separate boss encounter recordings** (plus an optional 4th character build showcase recording) through an automated multi-stage pipeline:

raw recordings (3 bosses + optional builds)
        |
        v
[Frame Analysis & Computer Vision Engine]
        |   |-- Purple Loading Screen Classifier (HSV/RGB color gating)
        |   |-- Entry Cut: Trim load screen, preserve 3-2-1 countdown
        |   `-- Tail Cut: Detect HP zero / clear banner, preserve victory freeze + 1.5s
        v
[Audio Topology Selection & Alignment]
        |   |-- Topology 1: Continuous (Unified epic soundtrack across all 3 bosses)
        |   |-- Topology 2: Dual Movement (Boss 1-2 build-up + Boss 3 climax)
        |   `-- Topology 3: Per-Boss Triad (Distinct thematic track per encounter)
        v
[CapCut Project Assembly]
        |   |-- Generates native CapCut PC draft_content.json
        |   |-- Precise segment placement & audio crossfades
        |   `-- Automated BGM extraction & timeline markers
        v
[Metadata & Publishing Studio]
           |-- 1-Click CapCut Chapter Sync (00:00 Boss 1, mm:ss Boss 2, mm:ss Boss 3, mm:ss Builds)
           |-- Extracted BGM Credit Section (Song titles & start timestamps)
           `-- Synchronized Thumbnail Generation & Clipboard Export

---

## 2. Ingestion & Arranger Requirements
1. **Discrete Recording Paradigm**:
   - Creators record each boss attempt separately. Single continuous recordings introduce user fraction when retrying encounters.
   - Recommended structure: 3 clean boss runs + 1 optional builds run.
2. **Arranger Desktop Ingestion**:
   - Supports file-picker selection, native modal browser (/api/recordings/sessions), and HTML5drag-and-drop (.stygian-slot-card drop targets).
   - Real-time video metadata probing: duration, resolution, thumbnail preview, and file size badges.

---

## 3. Computer Vision & Frame Trimming Heuristics
1. **Purple Loading Screen Detection**:
   - Detects the signature purple domain warp loading screen via RGB channel thresholding (execution/video_trimmer.py and execution/stygian_pipeline.py).
   - Rejects black transition screens and domain entry tunnels while preserving the domain countdown.
2. **Entry Cut Positioning
*:
   - Trims loading screen immediately before domain spawn.
   - Preserves 1.5 seconds of the countdown/camera swing so viewers orient themselves to team positions.
3. **Tail Cut & Victory Screen Preservation**:
   - Detects challenge completion freeze-frame / victory animation.
   - Holds 1.5s post-clear padding to preserve character pose before cutting prior to reward collection screen.

---

## 4. Audio Topologies

- **Continuous** (`topology_continuous`): 1 unified track spanning the entire 3-boss video with crossfade into builds. Best for speedruns and unified musical themes.
- **Dual Movement** (`topology_2x2`): Track A for Boss 1 & Boss 2; Track B for Climax Boss 3. Best for standard progression runs with a climactic finale.
- **Per-Boss Triad** (`topology_per_boss`): 3 distinct high-energy tracks tailored to each individual boss. Best for extended showcases and variety character teams.

---

## 5. YouTube Chapter & BGM Sync

- CapCut drafts export `materials.audios` and timeline segments.
- Endpoint `/api/capcut/project-chapters?project_name=...&mode=stygian` produces structured JSON:
  - `segments`: Exact MM:SS timestamps mapped to Boss 1, Boss 2, Boss 3, and Builds.
  - `bgm_tracks`: Song titles sanitized of bitrate/file-extension tags with timeline start times.
- Front-end YouTube Description Builder auto-populates:
  - Timestamps section (00:00 Boss 1, ...)
  - Background Music section (Song titles with timestamps)

---

## 6. Verification & Test Suite

All Stygian Onslaught pipeline modifications must pass unit and integration verification:
```bash
# Synthetic video and boss classification tests
python -m pytest tests/test_stygian_pipeline.py -v

# CapCut sync and chapter extraction tests
python -m pytest tests/test_capcut_sync.py -v

# Full suite verification
python -m pytest tests -v
```
