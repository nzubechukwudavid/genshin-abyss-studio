import os, sys, json, uuid, time, asyncio, base64
from pathlib import Path
from io import BytesIO
from typing import Optional, Dict, Any, List
from fastapi import APIRouter, UploadFile, File, Query, HTTPException, Body, Request
from fastapi.responses import JSONResponse, FileResponse
from pydantic import BaseModel
from PIL import Image
from app.core.config import DATA_DIR, CACHE_DIR, OUTPUT_DIR
from app.core.logger import logger
from app.core.fs import atomic_write_bytes, atomic_write_json
from app.services.security_service import validate_safe_media_path
from execution.generate_abyss_thumbnail import ThumbnailRenderer, AssetManager
router = APIRouter(tags=['assembly'])
_bgm_suite_lock = asyncio.Lock()


# 7. Export Request Model
class ExportSide(BaseModel):
    name: str
    customName: str = ""
    const: str = "C0"
    archetype: str = "HYPERCARRY"
    imgUrl: str = ""
    panX: float = 0.0
    panY: float = 0.0
    scale: float = 1.0
    mirror: bool = False


class ExportPayload(BaseModel):
    side1: ExportSide
    side2: ExportSide
    floor: str = "12"
    patch: str = "5.2"


MAX_CANVAS_PAYLOAD_SIZE = 15 * 1024 * 1024  # 15 MB

@router.post("/api/export-canvas")
async def export_canvas_blob(image: UploadFile = File(...)):
    try:
        content = await image.read(MAX_CANVAS_PAYLOAD_SIZE + 1)
        if len(content) > MAX_CANVAS_PAYLOAD_SIZE:
            raise HTTPException(status_code=413, detail="Payload exceeds maximum allowed size (15MB).")
        if not content:
            raise HTTPException(status_code=400, detail="Empty image payload.")

        try:
            with Image.open(BytesIO(content)) as img:
                img_format = img.format
                width, height = img.size
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid or corrupt image payload.")

        if img_format not in ("PNG", "JPEG", "WEBP"):
            raise HTTPException(status_code=400, detail=f"Unsupported format {img_format}. Allowed: PNG, JPEG, WEBP.")

        if width < 64 or height < 64 or width > 4096 or height > 4096:
            raise HTTPException(status_code=400, detail=f"Invalid image dimensions ({width}x{height}).")

        out_path = OUTPUT_DIR / "latest_abyss_thumbnail.png"
        atomic_write_bytes(out_path, content)
        return {"status": "ok", "path": str(out_path), "width": width, "height": height}
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Error saving canvas export")
        raise HTTPException(status_code=500, detail=f"Internal export failure: {str(e)}")

# 8. Server-Side Export Sync
@router.post("/api/export")
async def export_thumbnail(payload: ExportPayload):
    try:
        # Resolve images
        img1 = AssetManager.get_character_image(payload.side1.imgUrl or payload.side1.name)
        img2 = AssetManager.get_character_image(payload.side2.imgUrl or payload.side2.name)

        renderer = ThumbnailRenderer(width=1920, height=1080)
        final_img = renderer.render(
            side1_img=img1,
            side2_img=img2,
            side1_name=payload.side1.customName or payload.side1.name,
            side1_const=payload.side1.const,
            side1_archetype=payload.side1.archetype,
            side2_name=payload.side2.customName or payload.side2.name,
            side2_const=payload.side2.const,
            side2_archetype=payload.side2.archetype,
            floor=payload.floor,
            patch=payload.patch,
            zoom1=payload.side1.scale,
            offset_x1=int(payload.side1.panX),
            offset_y1=int(payload.side1.panY),
            mirror1=payload.side1.mirror,
            zoom2=payload.side2.scale,
            offset_x2=int(payload.side2.panX),
            offset_y2=int(payload.side2.panY),
            mirror2=payload.side2.mirror,
            auto_normalize=False
        )

        out_path = OUTPUT_DIR / "latest_abyss_thumbnail.png"
        final_img.save(out_path, format="PNG")

        # Save team metadata cache
        try:
            teams_cache = CACHE_DIR / "last_exported_teams.json"
            s1_tag = f"{payload.side1.name} {payload.side1.const} {payload.side1.archetype}".strip()
            s2_tag = f"{payload.side2.name} {payload.side2.const} {payload.side2.archetype}".strip()
            teams_data = {
                "side1": s1_tag,
                "side2": s2_tag,
                "updated_at": time.time()
            }
            atomic_write_json(teams_cache, teams_data)
        except Exception as e:
            logger.warning(f"Could not persist last_exported_teams.json: {e}")

        return {"status": "ok", "path": str(out_path)}
    except Exception as e:
        logger.exception("Server export error")
        return {"status": "error", "message": str(e)}


# 8. Auto-Edited Abyss Video Chapter Sync & Cloud Bridge Endpoints
IN_MEMORY_CLOUD_CHAPTERS = None
SYNC_SECRET_TOKEN = os.environ.get("ABYSS_SYNC_TOKEN")


@router.post("/api/sync-chapters")
async def sync_chapters_endpoint(request: Request, payload: dict = Body(default={})):
    """Allows authenticated laptop client or local desktop to push exact chapter metadata."""
    client_host = request.client.host if request.client else ""
    is_local = client_host in ("127.0.0.1", "::1", "localhost", "testclient")

    token = request.headers.get("X-Sync-Token") or request.query_params.get("token")
    if SYNC_SECRET_TOKEN:
        if token != SYNC_SECRET_TOKEN:
            raise HTTPException(status_code=403, detail="Invalid sync token")
    else:
        if not is_local:
            raise HTTPException(
                status_code=401,
                detail="Remote synchronization disabled. Set ABYSS_SYNC_TOKEN environment variable."
            )

    data = payload if payload else (await request.json())
    global IN_MEMORY_CLOUD_CHAPTERS
    IN_MEMORY_CLOUD_CHAPTERS = data

    # Attempt to persist locally if filesystem is writable
    try:
        cache_path = Path(__file__).resolve().parent / "data" / "cache" / "latest_abyss_chapters.json"
        atomic_write_json(cache_path, data)
    except Exception as e:
        logger.warning(f"Could not persist latest_abyss_chapters.json: {e}")

    return {"status": "ok", "message": "Chapters synced successfully to cloud"}



@router.get("/api/youtube/playlists")
async def get_youtube_playlists():
    """Retrieve creator YouTube playlists for upload assignment."""
    playlists_file = DATA_DIR / "yt_playlists.json"
    if playlists_file.exists():
        try:
            return json.loads(playlists_file.read_text(encoding="utf-8"))
        except Exception as e:
            logger.warning(f"Failed to read yt_playlists.json: {e}")
    # Default curated presets for Genshin Abyss creators
    return {
        "status": "ok",
        "playlists": [
            {"id": "PL_abyss_5x", "name": "Spiral Abyss 5.x Full Star Guides"},
            {"id": "PL_abyss_solos", "name": "Spiral Abyss Solo & Duo Showcases"},
            {"id": "PL_character_showcases", "name": "Character Meta & Rotation Showcases"},
            {"id": "PL_f2p_clears", "name": "F2P & Low-Investment Abyss Clears"}
        ]
    }


@router.get("/api/auto-edit-chapters")
async def get_auto_edit_chapters():
    # 1. Check in-memory store (e.g. on Render)
    global IN_MEMORY_CLOUD_CHAPTERS
    if IN_MEMORY_CLOUD_CHAPTERS:
        return {"status": "ok", **IN_MEMORY_CLOUD_CHAPTERS}

    # 2. Check disk cache
    search_paths = [
        Path(__file__).resolve().parent.parent / "data" / "cache" / "latest_abyss_chapters.json",
        Path(__file__).resolve().parent / "data" / "cache" / "latest_abyss_chapters.json",
        Path.cwd() / "data" / "cache" / "latest_abyss_chapters.json"
    ]
    for p in search_paths:
        if p.exists():
            try:
                data = json.loads(p.read_text(encoding="utf-8"))
                return {"status": "ok", **data}
            except Exception as e:
                logger.error(f"Error reading chapters cache: {e}")
    return {"status": "not_found", "message": "No auto-edited abyss run found yet."}


# 9. Hardware-Accelerated Video & Audio Range Streaming Endpoints
ALLOWED_VIDEO_EXTS = {".mp4", ".mov", ".mkv", ".webm", ".avi"}
ALLOWED_AUDIO_EXTS = {".mp3", ".m4a", ".wav", ".flac", ".ogg", ".aac", ".wma"}


def parse_byte_range(range_header: str, file_size: int):
    """Parses HTTP Range header according to RFC 7233.
    Raises HTTPException 416 if the requested range is unsatisfiable.
    """
    if not range_header or "=" not in range_header:
        return 0, max(0, file_size - 1)
    
    if file_size <= 0:
        raise HTTPException(
            status_code=416,
            detail="Range Not Satisfiable",
            headers={"Content-Range": "bytes */0"}
        )

    try:
        unit, range_str = range_header.strip().split("=", 1)
        if unit.strip().lower() != "bytes":
            raise HTTPException(
                status_code=416,
                detail="Range Not Satisfiable",
                headers={"Content-Range": f"bytes */{file_size}"}
            )

        parts = range_str.split("-", 1)
        if not parts[0]:
            # Suffix range: bytes=-500 (last 500 bytes)
            suffix_len = int(parts[1])
            if suffix_len <= 0:
                raise HTTPException(
                    status_code=416,
                    detail="Range Not Satisfiable",
                    headers={"Content-Range": f"bytes */{file_size}"}
                )
            start = max(0, file_size - suffix_len)
            end = file_size - 1
        else:
            start = int(parts[0])
            end = int(parts[1]) if (len(parts) > 1 and parts[1].strip()) else file_size - 1

        if start < 0 or start >= file_size or end < start:
            raise HTTPException(
                status_code=416,
                detail="Range Not Satisfiable",
                headers={"Content-Range": f"bytes */{file_size}"}
            )

        end = min(end, file_size - 1)
        return start, end
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=416,
            detail="Range Not Satisfiable",
            headers={"Content-Range": f"bytes */{file_size}"}
        )

@router.post("/api/assemble-capcut")
async def assemble_capcut_endpoint(payload: dict = Body(default={})):
    """Synthesizes the 4-file Abyss project into CapCut with multi-track BGM and launches CapCut PC."""
    try:
        from execution.auto_edit_abyss import (
            get_default_recordings_dir,
            find_latest_screen_recordings,
            assemble_abyss_project,
            launch_capcut
        )

        suite = payload.get("suite", [])
        if suite and any(suite):
            cache_file = CACHE_DIR / "active_bgm_suite.json"
            async with _bgm_suite_lock:
                atomic_write_json(cache_file, suite)

        rec_dir = get_default_recordings_dir()
        session_id = payload.get("session_id")
        clip_paths = payload.get("clip_paths")
        recs = []
        if clip_paths and isinstance(clip_paths, list):
            valid_paths = [Path(p) for p in clip_paths if Path(p).exists()]
            if len(valid_paths) >= 3:
                recs = valid_paths
        
        if not recs and session_id:
            sessions_raw = cluster_recording_sessions(rec_dir)
            for idx, s in enumerate(sessions_raw):
                s_clips = s.get("clips", [])
                if session_id == f"session_{idx}_run1":
                    recs = s_clips[:4]
                    break
                elif session_id == f"session_{idx}_run2":
                    recs = s_clips[4:8]
                    break
                elif session_id == f"session_{idx}":
                    recs = s_clips[:4] if len(s_clips) >= 4 else s_clips
                    break

        if not recs:
            recs = find_latest_screen_recordings(rec_dir, count=4)

        if len(recs) < 3:
            return {"status": "error", "message": f"Found only {len(recs)} clips in session. Need at least 3 chamber clips."}

        chamber_files = recs[:3]
        builds_file = recs[3] if len(recs) >= 4 else None
        trans = payload.get("transition", "black_fade")
        raw_m_vol = payload.get("music_volume", payload.get("volume", 0.0316))
        raw_c_vol = payload.get("clip_volume", 0.10)
        # Support both decibels (negative numbers like -30) and linear ratios (0.0316)
        m_vol = 10.0 ** (float(raw_m_vol) / 20.0) if float(raw_m_vol) < 0 else float(raw_m_vol)
        c_vol = 10.0 ** (float(raw_c_vol) / 20.0) if float(raw_c_vol) < 0 else float(raw_c_vol)

        # Run project assembly in thread to not block event loop
        result = await asyncio.to_thread(
            assemble_abyss_project,
            chamber_files=chamber_files,
            builds_file=builds_file,
            transition_type=trans,
            music_volume=m_vol,
            clip_volume=c_vol,
            auto_launch=False,
            sync_to_cloud=True
        )

        # Ensure CapCut PC is launched cleanly via Windows Shell
        launched = launch_capcut()

        return {
            "status": "ok",
            "message": "CapCut draft synthesized and opened!" if launched else "CapCut draft synthesized! (Open CapCut PC to view)",
            "capcut_launched": launched,
            "project_name": result.get("project_name", "Abyss Floor 12 Run (Auto-Edited)"),
            "total_duration": result.get("total_duration_formatted", "00:00"),
            "chapters": result.get("chapters", [])
        }
    except Exception as e:
        logger.exception(f"Error in assemble_capcut_endpoint: {e}")
        return {"status": "error", "message": str(e)}



def _run_native_picker_isolated(title: str, multiple: bool):
    """Executes native file dialog in an isolated process to avoid Tkinter event loop deadlock."""
    import subprocess, sys, json
    code = f'''
import tkinter as tk
from tkinter import filedialog
import json
root = tk.Tk()
root.withdraw()
root.attributes("-topmost", True)
if {multiple}:
    files = filedialog.askopenfilenames(title="{title}", filetypes=[("MP4 Video", "*.mp4"), ("All Files", "*.*")])
    print("__PICKED__" + json.dumps(list(files)))
else:
    f = filedialog.askopenfilename(title="{title}", filetypes=[("MP4 Video", "*.mp4"), ("All Files", "*.*")])
    print("__PICKED__" + json.dumps([f] if f else []))
root.destroy()
'''
    try:
        res = subprocess.run([sys.executable, "-c", code], capture_output=True, text=True, timeout=60)
        for line in res.stdout.splitlines():
            if line.startswith("__PICKED__"):
                return json.loads(line[len("__PICKED__"):])
    except Exception as e:
        logger.warning(f"Native picker subprocess error: {e}")
    return []


@router.post("/api/pick-video-file")
async def pick_video_file_endpoint(payload: dict = Body(default={})):
    """Opens native Windows file dialog to select a single video file."""
    try:
        from execution.auto_edit_abyss import probe_video_metadata, format_timestamp
        title = payload.get("title", "Select MP4 Video File")
        file_strings = await asyncio.to_thread(_run_native_picker_isolated, title, False)
        if file_strings and file_strings[0]:
            p = Path(file_strings[0])
            dur_s = 0.0
            try:
                dur_s, _, _, _ = probe_video_metadata(p)
            except Exception:
                pass
            return {
                "status": "ok",
                "clip": {
                    "filename": p.name,
                    "path": str(p.resolve()),
                    "duration": dur_s,
                    "duration_formatted": format_timestamp(dur_s),
                    "thumbnail_url": f"/api/video-thumbnail?path={p.resolve()}"
                }
            }
        return {"status": "cancelled"}
    except Exception as e:
        return {"status": "error", "message": str(e)}


@router.post("/api/pick-multiple-video-files")
async def pick_multiple_video_files_endpoint(payload: dict = Body(default={})):
    """Opens native Windows file dialog to select multiple video files."""
    try:
        from execution.auto_edit_abyss import probe_video_metadata, format_timestamp
        title = payload.get("title", "Select 7 or 8 Video Files")
        file_strings = await asyncio.to_thread(_run_native_picker_isolated, title, True)
        if file_strings:
            paths = sorted([Path(f) for f in file_strings if f], key=lambda x: x.name)
            res = []
            for p in paths:
                dur_s = 0.0
                try:
                    dur_s, _, _, _ = probe_video_metadata(p)
                except Exception:
                    pass
                res.append({
                    "filename": p.name,
                    "path": str(p.resolve()),
                    "duration": dur_s,
                    "duration_formatted": format_timestamp(dur_s),
                    "thumbnail_url": f"/api/video-thumbnail?path={p.resolve()}"
                })
            return {"status": "ok", "clips": res}
        return {"status": "cancelled"}
    except Exception as e:
        return {"status": "error", "message": str(e)}


@router.post("/api/assemble-showcase-capcut")
async def assemble_showcase_capcut_endpoint(payload: dict = Body(default={})):
    """Synthesizes the dual inverse runs into 2 CapCut projects and launches CapCut PC."""
    try:
        from execution.auto_edit_abyss import (
            assemble_inverse_showcase_projects,
            launch_capcut
        )

        run1_files = payload.get("run1_files", [])
        run2_files = payload.get("run2_files", [])
        team_a = payload.get("team_a_name", "Team A Showcase")
        team_b = payload.get("team_b_name", "Team B Showcase")
        builds_mode = payload.get("builds_mode", "combined")
        split_s = float(payload.get("builds_split_seconds", 30.0))
        comb_builds = payload.get("combined_builds_file")
        a_builds = payload.get("team_a_builds_file")
        b_builds = payload.get("team_b_builds_file")
        trans = payload.get("transition", "black_fade")
        raw_m_vol = payload.get("music_volume", payload.get("volume", 0.0316))
        raw_c_vol = payload.get("clip_volume", 0.10)
        # Support both decibels (negative numbers like -30) and linear ratios (0.0316)
        m_vol = 10.0 ** (float(raw_m_vol) / 20.0) if float(raw_m_vol) < 0 else float(raw_m_vol)
        c_vol = 10.0 ** (float(raw_c_vol) / 20.0) if float(raw_c_vol) < 0 else float(raw_c_vol)
        open_cc = bool(payload.get("open_capcut", True))

        r1_paths = [Path(p) for p in run1_files if p and Path(p).exists()]
        r2_paths = [Path(p) for p in run2_files if p and Path(p).exists()]

        if len(r1_paths) < 3:
            return {"status": "error", "message": f"Run 1 requires 3 valid chamber clips (found {len(r1_paths)})."}
        if len(r2_paths) < 3:
            return {"status": "error", "message": f"Run 2 requires 3 valid chamber clips (found {len(r2_paths)})."}

        comb_path = Path(comb_builds) if comb_builds and Path(comb_builds).exists() else None
        a_builds_path = Path(a_builds) if a_builds and Path(a_builds).exists() else None
        b_builds_path = Path(b_builds) if b_builds and Path(b_builds).exists() else None

        if builds_mode == "combined" and not comb_path:
            return {"status": "error", "message": "Combined builds clip not found or not specified."}

        results = await asyncio.to_thread(
            assemble_inverse_showcase_projects,
            run1_chambers=r1_paths,
            run2_chambers=r2_paths,
            builds_file=comb_path,
            builds_split_s=split_s,
            team_a_builds=a_builds_path,
            team_b_builds=b_builds_path,
            team_a_name=team_a,
            team_b_name=team_b,
            transition_type=trans,
            music_volume=m_vol,
            clip_volume=c_vol,
            sync_to_cloud=True,
            auto_launch=False
        )

        launched = False
        if open_cc:
            launched = launch_capcut()

        def _serialize_paths(o):
            if isinstance(o, Path):
                return str(o)
            if isinstance(o, dict):
                return {str(k): _serialize_paths(v) for k, v in o.items()}
            if isinstance(o, (list, tuple)):
                return [_serialize_paths(x) for x in o]
            return o

        return {
            "status": "ok",
            "message": "Dual Showcase CapCut drafts synthesized and opened!" if launched else "Dual Showcase drafts synthesized! (Open CapCut PC to view)",
            "capcut_launched": launched,
            "results": _serialize_paths(results)
        }
    except Exception as e:
        logger.exception(f"Error in assemble_showcase_capcut_endpoint: {e}")
        return {"status": "error", "message": str(e)}


if __name__ == "__main__":
    host = os.environ.get("HOST", "0.0.0.0")
    port = int(os.environ.get("PORT", "7860"))
    logger.info(f"Starting Genshin Spiral Abyss Thumbnail Studio on http://{host}:{port}...")
    uvicorn.run(app, host=host, port=port, log_level="info")



@router.post("/api/assemble-stygian-capcut")
async def assemble_stygian_capcut_endpoint(payload: dict = Body(default={})):
    """Synthesizes the Stygian Onslaught 4-file project into CapCut with multi-track BGM."""
    try:
        from execution.auto_edit_abyss import assemble_stygian_project

        boss_files = [Path(f) for f in payload.get("boss_files", [])]
        builds_file = Path(payload.get("builds_file")) if payload.get("builds_file") else None
        music_tracks = [Path(f) for f in payload.get("music_tracks", []) if f]
        topo = payload.get("topology", "topology_2x2")
        trans = payload.get("transition_type", "black_fade")
        p_name = payload.get("project_name", "Stygian Onslaught Fearless Run (Auto-Edited)")
        b_names = payload.get("boss_names", ["Battlefield 1", "Battlefield 2", "Battlefield 3"])
        auto_launch = payload.get("auto_launch", False)

        result = assemble_stygian_project(
            boss_files=boss_files,
            builds_file=builds_file,
            music_tracks=music_tracks,
            bgm_topology=topo,
            transition_type=trans,
            project_name=p_name,
            boss_names=b_names,
            auto_launch=auto_launch
        )
        return {"status": "success", "result": result}
    except Exception as e:
        return {"status": "error", "message": str(e)}
