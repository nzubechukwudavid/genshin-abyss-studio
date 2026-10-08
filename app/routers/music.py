import os, json, asyncio
from pathlib import Path
from typing import Optional, Dict, Any, List
from fastapi import APIRouter, Query, HTTPException, Body
from fastapi.responses import JSONResponse
from app.core.config import DATA_DIR, CACHE_DIR
from app.core.logger import logger
from app.core.fs import atomic_write_json
router = APIRouter(tags=['music'])
_bgm_suite_lock = asyncio.Lock()


@router.get("/api/music-catalog/status")
async def get_music_catalog_status():
    try:
        from execution.music_indexer import load_music_catalog, DEFAULT_MUSIC_DIR
        cat = load_music_catalog()
        return {
            "status": "ok",
            "total_tracks": cat.get("total_tracks", 0),
            "music_dir": cat.get("music_dir", str(DEFAULT_MUSIC_DIR)),
            "last_scanned_at": cat.get("last_scanned_at", 0),
            "scan_time_sec": cat.get("scan_time_sec", 0),
            "throughput": cat.get("throughput_files_per_sec", 0)
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}


@router.post("/api/music-catalog/rescan")
async def rescan_music_catalog_endpoint(payload: dict = Body(default={})):
    try:
        from execution.music_indexer import index_music_library, DEFAULT_MUSIC_DIR
        target_dir = payload.get("music_dir")
        p = Path(target_dir) if target_dir else DEFAULT_MUSIC_DIR
        cat = await asyncio.to_thread(index_music_library, p, force_rescan=True)
        return {
            "status": "ok",
            "total_tracks": cat.get("total_tracks", 0),
            "scan_time_sec": cat.get("scan_time_sec", 0)
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}


@router.get("/api/music-catalog/recommend")
async def recommend_bgm_endpoint(
    c1: Optional[float] = None,
    c2: Optional[float] = None,
    c3: Optional[float] = None,
    builds: Optional[float] = 90.0
):
    try:
        from execution.music_recommender import recommend_bgm_suite
        from execution.auto_edit_abyss import (
            get_default_recordings_dir,
            find_latest_screen_recordings,
            probe_video_metadata,
            estimate_chamber_cut_duration
        )

        # If durations not provided, auto-probe recent recording files in chronological order
        # using accurate post-cut combat fight durations so BGM suggestions match CapCut exactly
        if c1 is None or c2 is None or c3 is None:
            rec_dir = get_default_recordings_dir()
            recs = find_latest_screen_recordings(rec_dir, count=4)
            if not recs:
                return {
                    "status": "empty",
                    "message": "No screen recordings found in directory",
                    "assignments": {}
                }
            durations = []
            for i, f in enumerate(recs[:3]):
                try:
                    dur = estimate_chamber_cut_duration(f, is_builds=False)
                    durations.append(dur)
                except Exception:
                    durations.append(90.0)
            while len(durations) < 3:
                durations.append(90.0)
            c1, c2, c3 = durations[0], durations[1], durations[2]

            if len(recs) >= 4 and (builds is None or builds == 90.0):
                try:
                    builds = estimate_chamber_cut_duration(recs[3], is_builds=True)
                except Exception:
                    builds = 90.0

        res = recommend_bgm_suite([c1, c2, c3], builds_duration=builds)
        return res
    except Exception as e:
        return {"status": "error", "message": str(e)}



@router.get("/api/music-catalog/recommend-stygian")
async def recommend_stygian_bgm_endpoint(
    b1: Optional[float] = None,
    b2: Optional[float] = None,
    b3: Optional[float] = None,
    builds: Optional[float] = 90.0,
    topology: Optional[str] = None
):
    """Recommends multi-topology BGM suites tailored to Stygian Onslaught clear lengths."""
    try:
        from execution.music_recommender import recommend_stygian_bgm_suite
        d1 = b1 if b1 is not None and b1 > 0 else 85.0
        d2 = b2 if b2 is not None and b2 > 0 else 76.0
        d3 = b3 if b3 is not None and b3 > 0 else 105.0
        db = builds if builds is not None and builds > 0 else 90.0
        return recommend_stygian_bgm_suite([d1, d2, d3], builds_duration=db, preferred_topology=topology)
    except Exception as e:
        return {"status": "error", "message": str(e)}

@router.get("/api/music-catalog/tracks")
async def get_catalog_tracks(
    query: Optional[str] = None,
    target_sec: Optional[float] = None,
    energy: Optional[str] = None,
    limit: int = 60
):
    """Searches and sorts library tracks by keyword or closest duration fitness."""
    try:
        from execution.music_indexer import load_music_catalog
        cat = load_music_catalog()
        tracks = list(cat.get("tracks", []))

        # Filter by search query
        if query and query.strip():
            q = query.lower().strip()
            tracks = [t for t in tracks if q in f"{t.get('title', '')} {t.get('artist', '')} {t.get('album', '')}".lower()]

        # Filter by energy
        if energy and energy in ("high", "chill"):
            tracks = [t for t in tracks if t.get("energy_hint") == energy]

        # Sort by distance to target_sec if requested
        if target_sec and target_sec > 0:
            tracks.sort(key=lambda t: abs(float(t.get("duration_sec", 0.0)) - target_sec))
        else:
            tracks.sort(key=lambda t: t.get("title", "").lower())

        results = []
        for t in tracks[:limit]:
            d = float(t.get("duration_sec", 0.0))
            delta = d - target_sec if target_sec else 0.0
            fit_label = f"{'+' if delta >= 0 else ''}{delta:.1f}s" if target_sec else ""
            results.append({
                **t,
                "delta_sec": round(delta, 2),
                "fit_label": fit_label,
                "in_point_sec": 0.0
            })

        return {"status": "ok", "total_matched": len(tracks), "tracks": results}
    except Exception as e:
        return {"status": "error", "message": str(e)}


_bgm_suite_lock = asyncio.Lock()

@router.post("/api/export-bgm-suite")
async def export_bgm_suite_endpoint(payload: dict = Body(default={})):
    try:
        suite = payload.get("suite", [])
        cache_file = CACHE_DIR / "active_bgm_suite.json"
        async with _bgm_suite_lock:
            atomic_write_json(cache_file, suite)
        return {"status": "ok", "message": "BGM suite active for next CapCut edit"}
    except Exception as e:
        logger.exception("Error exporting BGM suite")
        return {"status": "error", "message": str(e)}


