"""
CapCut PC Draft Integration Router for Genshin Abyss Studio.
Discovers local CapCut drafts, extracts cut timestamps, chapter markers,
and background music tracks.
"""

import json
from pathlib import Path
from typing import Optional, Dict, Any, List
from fastapi import APIRouter, Query

from app.core import DATA_DIR
from app.core.logger import logger

router = APIRouter(prefix="/api/capcut", tags=["capcut"])

@router.get("/projects")
async def get_capcut_projects():
    """Discovers and lists all CapCut PC draft projects sorted latest modified first."""
    try:
        from execution.auto_edit_abyss import get_capcut_drafts_dir
        drafts_dir = get_capcut_drafts_dir()
        if not drafts_dir or not drafts_dir.exists():
            return {"status": "ok", "projects": [], "drafts_dir": str(drafts_dir) if drafts_dir else None}

        projects = []
        for d in drafts_dir.iterdir():
            if not d.is_dir():
                continue
            content_file = d / "draft_content.json"
            if not content_file.is_file():
                continue
            try:
                stat = content_file.stat()
                mtime = stat.st_mtime
                dur_s = 0.0
                segs = 0
                try:
                    cdata = json.loads(content_file.read_text(encoding="utf-8", errors="ignore"))
                    dur_us = cdata.get("duration", 0)
                    dur_s = dur_us / 1000000.0 if dur_us else 0
                    v_track = next((t for t in cdata.get("tracks", []) if t.get("type") == "video"), None)
                    if v_track:
                        segs = len(v_track.get("segments", []))
                except Exception:
                    pass

                m_int = int(dur_s // 60)
                s_int = int(dur_s % 60)
                projects.append({
                    "name": d.name,
                    "mtime": mtime,
                    "duration_sec": round(dur_s, 1),
                    "duration_formatted": f"{m_int:02d}:{s_int:02d}",
                    "segments_count": segs
                })
            except Exception as pe:
                logger.warning(f"Could not parse CapCut draft {d.name}: {pe}")

        projects.sort(key=lambda x: x["mtime"], reverse=True)
        return {"status": "ok", "projects": projects, "drafts_dir": str(drafts_dir)}
    except Exception as e:
        logger.exception(f"Error reading CapCut projects: {e}")
        return {"status": "error", "message": str(e), "projects": []}

@router.get("/project-chapters")
async def get_capcut_project_chapters(project_name: str = Query(...), mode: str = Query(None)):
    """Extracts exact cut timestamps, chapter markers, and BGM tracks from chosen CapCut project."""
    try:
        from execution.auto_edit_abyss import get_capcut_drafts_dir
        drafts_dir = get_capcut_drafts_dir()
        if not drafts_dir or not drafts_dir.exists():
            return {"status": "error", "message": "CapCut drafts folder not found"}

        clean_name = Path(project_name).name
        target_dir = drafts_dir / clean_name
        if not target_dir.is_dir():
            return {"status": "error", "message": f"Project '{clean_name}' not found in CapCut drafts"}

        content_file = target_dir / "draft_content.json"
        if not content_file.is_file():
            return {"status": "error", "message": "Draft content file missing"}

        content = json.loads(content_file.read_text(encoding="utf-8", errors="ignore"))
        duration_us = content.get("duration", 0)
        total_dur_sec = duration_us / 1000000.0 if duration_us else 0
        total_mins = int(total_dur_sec // 60)
        total_secs = int(total_dur_sec % 60)
        total_formatted = f"{total_mins:02d}:{total_secs:02d}"

        v_track = next((t for t in content.get("tracks", []) if t.get("type") == "video"), None)
        if not v_track or not v_track.get("segments"):
            return {"status": "error", "message": "No video segments found in draft"}

        segments_raw = v_track.get("segments", [])
        n_segs = len(segments_raw)
        parsed_segments = []

        is_stygian = (mode == "stygian") or ("stygian" in clean_name.lower())

        stygian_boss_names = ["Domovoy", "Overseer Device", "Guardian Blade"]
        stygian_cache_file = DATA_DIR / "stygian_live_cache.json"
        if stygian_cache_file.exists():
            try:
                s_cache = json.loads(stygian_cache_file.read_text(encoding="utf-8"))
                bosses = s_cache.get("bosses", [])
                if len(bosses) >= 3:
                    stygian_boss_names = [b.get("short_name", f"Boss {i+1}") for i, b in enumerate(bosses[:3])]
            except Exception:
                pass

        mapping_stygian_4 = [
            ("boss_1", 1, f"Boss 1 ({stygian_boss_names[0]})"),
            ("boss_2", 2, f"Boss 2 ({stygian_boss_names[1]})"),
            ("boss_3", 3, f"Boss 3 ({stygian_boss_names[2]})"),
            ("builds", None, "Character Builds, Weapons & Artifacts")
        ]
        mapping_stygian_3 = [
            ("boss_1", 1, f"Boss 1 ({stygian_boss_names[0]})"),
            ("boss_2", 2, f"Boss 2 ({stygian_boss_names[1]})"),
            ("boss_3", 3, f"Boss 3 ({stygian_boss_names[2]})")
        ]
        mapping_7 = [
            ("1-1", 1, "Chamber 1 (Side 1)"),
            ("1-2", 2, "Chamber 1 (Side 2)"),
            ("2-1", 1, "Chamber 2 (Side 1)"),
            ("2-2", 2, "Chamber 2 (Side 2)"),
            ("3-1", 1, "Chamber 3 (Side 1)"),
            ("3-2", 2, "Chamber 3 (Side 2)"),
            ("builds", None, "Character Builds, Weapons & Artifacts")
        ]
        mapping_4 = [
            ("1", 1, "Chamber 1 (Floor 12-1)"),
            ("2", 1, "Chamber 2 (Floor 12-2)"),
            ("3", 1, "Chamber 3 (Floor 12-3)"),
            ("builds", None, "Character Builds, Weapons & Artifacts")
        ]

        for idx, s in enumerate(segments_raw):
            start_us = s.get("target_timerange", {}).get("start", 0)
            start_sec = max(0, start_us / 1000000.0)
            m = int(start_sec // 60)
            sc = int(start_sec % 60)
            time_str = f"{m:02d}:{sc:02d}"

            if is_stygian and n_segs == 4:
                ch, side, lbl = mapping_stygian_4[idx]
            elif is_stygian and n_segs == 3:
                ch, side, lbl = mapping_stygian_3[idx]
            elif n_segs == 7:
                ch, side, lbl = mapping_7[idx]
            elif n_segs == 4:
                ch, side, lbl = mapping_4[idx]
            else:
                if idx == n_segs - 1:
                    ch, side, lbl = "builds", None, "Character Builds, Weapons & Artifacts"
                else:
                    ch = f"{idx + 1}"
                    side = 1 if idx % 2 == 0 else 2
                    lbl = f"Chamber Segment {idx + 1}"

            parsed_segments.append({
                "time": time_str,
                "seconds": round(start_sec, 2),
                "chamber": ch,
                "side": side,
                "label": lbl
            })

        # Extract BGM audio tracks and timestamps
        audio_materials = {}
        for a in content.get("materials", {}).get("audios", []):
            a_id = a.get("id")
            if a_id:
                raw_name = a.get("name") or Path(a.get("path", "")).name or "BGM Track"
                try:
                    from execution.music_indexer import clean_track_title
                    c_title = clean_track_title(raw_name)
                except Exception:
                    c_title = raw_name
                audio_materials[a_id] = {
                    "id": a_id,
                    "name": c_title,
                    "path": a.get("path", "")
                }

        bgm_tracks = []
        for t in content.get("tracks", []):
            if t.get("type") == "audio":
                for seg in t.get("segments", []):
                    mat_id = seg.get("material_id")
                    if mat_id in audio_materials:
                        mat = audio_materials[mat_id]
                        start_us = seg.get("target_timerange", {}).get("start", 0)
                        dur_us = seg.get("target_timerange", {}).get("duration", 0)
                        start_sec = max(0, start_us / 1000000.0)
                        dur_sec = max(0, dur_us / 1000000.0)
                        m = int(start_sec // 60)
                        s = int(start_sec % 60)
                        time_str = f"{m:02d}:{s:02d}"

                        if mat["name"] and (not bgm_tracks or bgm_tracks[-1]["title"] != mat["name"]):
                            bgm_tracks.append({
                                "title": mat["name"],
                                "timestamp": time_str,
                                "seconds": round(start_sec, 2),
                                "duration_sec": round(dur_sec, 2)
                            })

        return {
            "status": "ok",
            "project_name": clean_name,
            "mode": "stygian" if is_stygian else "abyss",
            "total_duration_sec": round(total_dur_sec, 2),
            "total_duration_formatted": total_formatted,
            "segments": parsed_segments,
            "bgm_tracks": bgm_tracks
        }
    except Exception as e:
        logger.exception(f"Error parsing CapCut chapters for {project_name}: {e}")
        return {"status": "error", "message": str(e)}
