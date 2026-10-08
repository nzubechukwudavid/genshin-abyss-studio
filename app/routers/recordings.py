import os, json, asyncio, time
from pathlib import Path
from typing import Optional, Dict, Any, List
from fastapi import APIRouter, Request, Query, HTTPException, Body
from fastapi.responses import FileResponse, StreamingResponse, JSONResponse
from app.core.fs import atomic_write_json
from app.core.config import DATA_DIR, CACHE_DIR, ALLOWED_VIDEO_EXTS, ALLOWED_AUDIO_EXTS
from app.core.logger import logger
from app.services.security_service import validate_safe_media_path
from app.services.media_service import parse_byte_range, stream_file_range
router = APIRouter(tags=['recordings'])


@router.get("/api/stream-video")
async def stream_video_endpoint(request: Request, path: Optional[str] = None, slot: Optional[int] = None):
    """Streams local MP4 video with HTTP 206 byte-ranges for zero-lag in-browser playback."""
    target_path = None
    if path:
        p = validate_safe_media_path(path)
        if p.suffix.lower() in ALLOWED_VIDEO_EXTS:
            target_path = p
        else:
            raise HTTPException(status_code=400, detail="Invalid video extension.")
    elif slot is not None and 0 <= slot < 4:
        try:
            from execution.auto_edit_abyss import get_default_recordings_dir, find_latest_screen_recordings
            rec_dir = get_default_recordings_dir()
            recs = find_latest_screen_recordings(rec_dir, count=4)
            if slot < len(recs):
                target_path = recs[slot]
        except Exception as e:
            logger.error(f"Error resolving slot video: {e}")

    if not target_path or not target_path.exists():
        raise HTTPException(status_code=404, detail="Video file not found")

    file_size = target_path.stat().st_size
    range_header = request.headers.get("Range")

    if range_header:
        start, end = parse_byte_range(range_header, file_size)
        content_length = end - start + 1
        headers = {
            "Content-Range": f"bytes {start}-{end}/{file_size}",
            "Accept-Ranges": "bytes",
            "Content-Length": str(content_length),
            "Content-Type": "video/mp4",
            "Access-Control-Allow-Origin": "*"
        }
        return StreamingResponse(stream_file_range(target_path, start, end), status_code=206, headers=headers)

    headers = {
        "Accept-Ranges": "bytes",
        "Content-Length": str(file_size),
        "Content-Type": "video/mp4",
        "Access-Control-Allow-Origin": "*"
    }
    return StreamingResponse(stream_file_range(target_path, 0, file_size - 1), status_code=200, headers=headers)


@router.get("/api/stream-audio")
async def stream_audio_endpoint(request: Request, path: Optional[str] = None, id: Optional[str] = None):
    """Streams local audio track with HTTP 206 byte-ranges for synchronized live auditioning."""
    target_path = None
    if path:
        p = validate_safe_media_path(path)
        if p.suffix.lower() in ALLOWED_AUDIO_EXTS:
            target_path = p
        else:
            raise HTTPException(status_code=400, detail="Invalid audio extension.")
    elif id:
        try:
            from execution.music_indexer import load_music_catalog
            cat = load_music_catalog()
            for t in cat.get("tracks", []):
                if t.get("id") == id:
                    p = validate_safe_media_path(t["path"])
                    if p.suffix.lower() in ALLOWED_AUDIO_EXTS:
                        target_path = p
                        break
        except HTTPException:
            raise
        except Exception as e:
            logger.warning(f"Error resolving audio by id {id}: {e}")

    if not target_path or not target_path.exists():
        raise HTTPException(status_code=404, detail="Audio file not found")

    file_size = target_path.stat().st_size
    ext = target_path.suffix.lower()
    media_type = "audio/mpeg" if ext == ".mp3" else ("audio/mp4" if ext == ".m4a" else ("audio/wav" if ext == ".wav" else "audio/ogg"))

    range_header = request.headers.get("Range")
    if range_header:
        start, end = parse_byte_range(range_header, file_size)
        content_length = end - start + 1
        headers = {
            "Content-Range": f"bytes {start}-{end}/{file_size}",
            "Accept-Ranges": "bytes",
            "Content-Length": str(content_length),
            "Content-Type": media_type,
            "Access-Control-Allow-Origin": "*"
        }
        return StreamingResponse(stream_file_range(target_path, start, end), status_code=206, headers=headers)

    headers = {
        "Accept-Ranges": "bytes",
        "Content-Length": str(file_size),
        "Content-Type": media_type,
        "Access-Control-Allow-Origin": "*"
    }
    return StreamingResponse(stream_file_range(target_path, 0, file_size - 1), status_code=200, headers=headers)


@router.get("/api/video-thumbnail")
async def get_video_thumbnail_endpoint(path: Optional[str] = None, slot: Optional[int] = None):
    """Returns a JPEG preview thumbnail for a screen recording clip."""
    try:
        from execution.auto_edit_abyss import get_default_recordings_dir, find_latest_screen_recordings, get_or_create_thumbnail
        target_path = None
        if path:
            p = validate_safe_media_path(path)
            if p.suffix.lower() in ALLOWED_VIDEO_EXTS:
                target_path = p
            else:
                raise HTTPException(status_code=400, detail="Invalid video extension.")
        elif slot is not None:
            recs = find_latest_screen_recordings(get_default_recordings_dir(), count=4)
            if 0 <= slot < len(recs):
                target_path = recs[slot]

        if not target_path or not target_path.exists():
            raise HTTPException(status_code=404, detail="Video recording not found")

        thumb_path = get_or_create_thumbnail(target_path)
        if thumb_path and thumb_path.exists():
            return FileResponse(str(thumb_path), media_type="image/jpeg")
        raise HTTPException(status_code=404, detail="Thumbnail could not be generated")
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Thumbnail generation error for {path}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/api/recordings/sessions")
async def get_recording_sessions_endpoint(session_id: Optional[str] = Query(None)):
    """Returns clustered recording sessions and active slot assignments instantly (< 15ms)."""
    try:
        from execution.auto_edit_abyss import (
            get_default_recordings_dir,
            cluster_recording_sessions,
            find_latest_screen_recordings,
            probe_video_metadata,
            format_timestamp
        )
        rec_dir = get_default_recordings_dir()
        sessions_raw = cluster_recording_sessions(rec_dir)
        sessions_data = []

        # Read cached cuts if available
        inter_cache_file = CACHE_DIR / "intermissions_cache.json"
        cached_cuts = {}
        if inter_cache_file.exists():
            try:
                cached_cuts = json.loads(inter_cache_file.read_text(encoding="utf-8"))
            except Exception:
                pass

        all_clips_pool = []
        for idx, s in enumerate(sessions_raw):
            c_list = []
            for p in s.get("clips", []):
                dur_s = 0.0
                try:
                    dur_s, _, _, _ = probe_video_metadata(p)
                except Exception:
                    pass
                clip_obj = {
                    "filename": p.name,
                    "path": str(p.resolve()),
                    "duration_sec": dur_s,
                    "duration_formatted": format_timestamp(dur_s),
                    "thumbnail_url": f"/api/video-thumbnail?path={p.resolve()}"
                }
                c_list.append(clip_obj)
                all_clips_pool.append(clip_obj)

            label = s.get("label", f"Session {idx + 1}")
            time_fmt = s.get("time_formatted", label.split(" - ")[0] if " - " in label else label)
            if len(c_list) > 4:
                run1_clips = c_list[:4]
                sessions_data.append({
                    "session_id": f"session_{idx}_run1",
                    "label": f"{label} • Run 1 (Clips 1-4)",
                    "title": f"{label} • Run 1 (Clips 1-4)",
                    "time_formatted": time_fmt,
                    "clip_count": len(run1_clips),
                    "clips": run1_clips
                })
                run2_clips = c_list[4:8]
                sessions_data.append({
                    "session_id": f"session_{idx}_run2",
                    "label": f"{label} • Run 2 (Clips 5-{4 + len(run2_clips)})",
                    "title": f"{label} • Run 2 (Clips 5-{4 + len(run2_clips)})",
                    "time_formatted": time_fmt,
                    "clip_count": len(run2_clips),
                    "clips": run2_clips
                })
                sessions_data.append({
                    "session_id": f"session_{idx}",
                    "label": f"{label} • All {len(c_list)} Clips",
                    "title": f"{label} • All {len(c_list)} Clips",
                    "time_formatted": time_fmt,
                    "clip_count": len(c_list),
                    "clips": c_list
                })
            else:
                sessions_data.append({
                    "session_id": f"session_{idx}",
                    "label": label,
                    "title": label,
                    "time_formatted": time_fmt,
                    "clip_count": len(c_list),
                    "clips": c_list
                })

        # Add "All Recordings Pool" session option
        if all_clips_pool:
            sessions_data.append({
                "session_id": "session_all",
                "label": f"📁 All Folder Recordings ({len(all_clips_pool)} clips)",
                "title": f"All Folder Recordings ({len(all_clips_pool)} clips)",
                "time_formatted": "All Clips",
                "clip_count": len(all_clips_pool),
                "clips": all_clips_pool
            })

        # Resolve target session based on requested session_id
        target_idx = 0
        if session_id:
            for idx, s in enumerate(sessions_data):
                if s["session_id"] == session_id:
                    target_idx = idx
                    break

        if sessions_data:
            target_session = sessions_data[target_idx]
            s_clips_objs = target_session.get("clips", [])
            # For 4 standard slots, use first 4 clips (or last 4)
            recs_objs = s_clips_objs[:4] if len(s_clips_objs) >= 4 else s_clips_objs
            selected_session_id = target_session["session_id"]
        else:
            recs_objs = []
            selected_session_id = "session_0"

        active_slots = []
        labels = ["Chamber 1 (Floor 12-1)", "Chamber 2 (Floor 12-2)", "Chamber 3 (Floor 12-3)", "Character Builds & Weapons"]
        
        # Always output at least 4 slots so missing ones render as actionable placeholders
        for i in range(4):
            if i < len(recs_objs):
                clip = recs_objs[i]
                p = Path(clip["path"])
                dur_s = clip["duration_sec"]
                f_size = 0
                try:
                    f_size = p.stat().st_size
                except Exception:
                    pass

                # Check cached cut info (< 0.1ms, zero frame decoding)
                cut_info = None
                cache_key = f"{p.name}_{int(p.stat().st_mtime)}_{f_size}" if p.exists() else ""
                if cache_key and cache_key in cached_cuts:
                    c = cached_cuts[cache_key]
                    cut_info = {
                        "h1_dur_formatted": format_timestamp(float(c.get("start", 0))),
                        "h2_dur_formatted": format_timestamp(float(c.get("end", 0))),
                        "trimmed_sec": round(float(c.get("end", 0)) - float(c.get("start", 0)), 2),
                        "confidence": c.get("confidence", 0.95),
                        "screen_type": c.get("screen_type", "dark")
                    }

                active_slots.append({
                    "slot": i,
                    "label": labels[i],
                    "filename": clip["filename"],
                    "path": clip["path"],
                    "duration_sec": dur_s,
                    "duration_formatted": clip["duration_formatted"],
                    "filesize_mb": round(f_size / (1024 * 1024), 1),
                    "thumbnail_url": clip["thumbnail_url"],
                    "cut_info": cut_info,
                    "is_assigned": True
                })
            else:
                # Unassigned placeholder slot
                active_slots.append({
                    "slot": i,
                    "label": labels[i],
                    "filename": "Not assigned",
                    "path": "",
                    "duration_sec": 0,
                    "duration_formatted": "00:00",
                    "filesize_mb": 0,
                    "thumbnail_url": "",
                    "cut_info": None,
                    "is_assigned": False
                })

        return {
            "status": "ok",
            "directory": str(rec_dir),
            "selected_session_id": selected_session_id,
            "active_slots": active_slots,
            "sessions": sessions_data
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}


@router.get("/api/recordings/all-clips")
async def get_all_recordings_clips_endpoint():
    """Returns all video clips in the recordings directory for the In-Studio Clip Picker modal."""
    try:
        from execution.auto_edit_abyss import (
            get_default_recordings_dir,
            probe_video_metadata,
            format_timestamp
        )
        rec_dir = get_default_recordings_dir()
        mp4s = sorted(
            [f for f in rec_dir.glob("*.mp4") if not f.name.startswith("._")],
            key=lambda x: x.stat().st_mtime,
            reverse=True
        )
        res = []
        for p in mp4s:
            dur_s = 0.0
            try:
                dur_s, _, _, _ = probe_video_metadata(p)
            except Exception:
                pass
            res.append({
                "filename": p.name,
                "path": str(p.resolve()),
                "duration_sec": dur_s,
                "duration_formatted": format_timestamp(dur_s),
                "thumbnail_url": f"/api/video-thumbnail?path={p.resolve()}",
                "size_mb": round(p.stat().st_size / (1024 * 1024), 1),
                "modified": p.stat().st_mtime
            })
        return {"status": "ok", "directory": str(rec_dir), "clips": res}
    except Exception as e:
        return {"status": "error", "message": str(e)}


@router.post("/api/recordings/process-cuts")
async def process_recordings_cuts_endpoint(payload: dict = Body(default={})):
    """Explicitly analyzes active chamber clips for loading screen intermission cuts with live progress."""
    try:
        from execution.auto_edit_abyss import (
            probe_video_metadata,
            detect_chamber_intermission,
            format_timestamp
        )
        clip_paths = payload.get("clip_paths", [])
        results = {}

        for p_str in clip_paths:
            if not p_str:
                continue
            p = Path(p_str)
            if not p.exists():
                continue
            dur_s, _, _, _ = probe_video_metadata(p)
            if dur_s >= 20.0:
                try:
                    c = detect_chamber_intermission(p, dur_s)
                    results[str(p.resolve())] = {
                        "filename": p.name,
                        "h1_dur_formatted": format_timestamp(c.h1_dur),
                        "h2_dur_formatted": format_timestamp(c.h2_dur),
                        "trimmed_sec": round(c.trimmed, 2),
                        "confidence": c.confidence,
                        "screen_type": getattr(c, "screen_type", "dark")
                    }
                except Exception as e:
                    logger.warning(f"Cut detection failed for {p.name}: {e}")

        return {"status": "ok", "processed_count": len(results), "cuts": results}
    except Exception as e:
        return {"status": "error", "message": str(e)}


_trim_overrides_lock = asyncio.Lock()

@router.post("/api/recordings/trim-override")
async def save_trim_override_endpoint(payload: dict = Body(...)):
    """Allows creator to persist manual cut point adjustments."""
    video_name = payload.get("filename")
    start_s = payload.get("start_s")
    end_s = payload.get("end_s")
    if not video_name or start_s is None or end_s is None:
        raise HTTPException(status_code=400, detail="Missing required filename, start_s, or end_s")

    override_file = CACHE_DIR / "user_trim_overrides.json"
    async with _trim_overrides_lock:
        overrides = {}
        if override_file.exists():
            try:
                overrides = json.loads(override_file.read_text(encoding="utf-8"))
            except Exception as e:
                logger.warning(f"Could not parse user_trim_overrides.json: {e}")
        overrides[video_name] = {
            "start": float(start_s),
            "end": float(end_s),
            "updated_at": time.time()
        }
        atomic_write_json(override_file, overrides)
    return {"status": "ok", "message": f"Trim override saved for {video_name}", "override": overrides[video_name]}


@router.get("/api/recording-slots")
async def get_recording_slots(session_id: Optional[str] = Query(None)):
    try:
        from execution.auto_edit_abyss import (
            get_default_recordings_dir,
            cluster_recording_sessions,
            find_latest_screen_recordings,
            probe_video_metadata,
            format_timestamp,
            estimate_chamber_cut_duration
        )
        rec_dir = get_default_recordings_dir()
        recs = []
        if session_id:
            sessions_raw = cluster_recording_sessions(rec_dir)
            for idx, s in enumerate(sessions_raw):
                if f"session_{idx}" == session_id:
                    s_clips = s.get("clips", [])
                    recs = s_clips[-4:] if len(s_clips) >= 4 else s_clips
                    break
        if not recs:
            recs = find_latest_screen_recordings(rec_dir, count=4)
        slots = []
        labels = ["Chamber 1", "Chamber 2", "Chamber 3", "Character Builds"]
        for i, f in enumerate(recs):
            raw_dur_s = 0.0
            try:
                raw_dur_s, _, _, _ = probe_video_metadata(f)
            except Exception as e:
                logger.debug(f"Could not probe raw duration for {f}: {e}")
            
            # Compute true post-cut combat fight duration (stripping loading screens)
            cut_dur_s = raw_dur_s
            try:
                cut_dur_s = estimate_chamber_cut_duration(f, is_builds=(i == 3))
            except Exception as e:
                logger.debug(f"Could not estimate cut duration for {f}: {e}")

            f_size = 0
            try:
                f_size = f.stat().st_size
            except Exception as e:
                logger.debug(f"Could not stat file size for {f}: {e}")
            slots.append({
                "slot": i,
                "label": labels[i] if i < len(labels) else f"Clip {i+1}",
                "filename": f.name,
                "path": str(f.resolve()),
                "duration_sec": cut_dur_s,
                "duration_formatted": format_timestamp(cut_dur_s),
                "raw_duration_sec": raw_dur_s,
                "raw_duration_formatted": format_timestamp(raw_dur_s),
                "filesize": f_size,
                "thumbnail_url": f"/api/video-thumbnail?slot={i}"
            })
        return {"status": "ok", "directory": str(rec_dir), "slots": slots}
    except Exception as e:
        return {"status": "error", "message": str(e)}


