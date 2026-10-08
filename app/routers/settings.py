"""
Settings & System Router for Genshin Abyss Studio.
Handles configuration persistence (recordings folder, music library, output directory),
native Windows folder picker invocation, and live directory statistics.
"""

from __future__ import annotations

import asyncio
import json
import os
import platform
import shutil
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Body, HTTPException, Query, status
from pydantic import BaseModel, Field

from app.core import BASE_DIR, DATA_DIR, OUTPUT_DIR, CACHE_DIR, APP_NAME, APP_VERSION
from app.core.config import USER_SETTINGS_PATH, ALLOWED_VIDEO_EXTS, ALLOWED_AUDIO_EXTS
from app.core.logger import logger
from app.schemas.models import UserSettings

router = APIRouter(prefix="/api/settings", tags=["settings"])

def get_default_recordings_path() -> Path:
    from execution.auto_edit_abyss import get_default_recordings_dir
    try:
        return get_default_recordings_dir()
    except Exception:
        return Path.home() / "Videos" / "Captures"

def get_default_music_path() -> Path:
    if (Path.home() / "Music" / "NCS Music").exists():
        return Path.home() / "Music" / "NCS Music"
    if (Path.home() / "Music").exists():
        return Path.home() / "Music"
    return BASE_DIR / "music"

def get_default_settings() -> Dict[str, Any]:
    return {
        "recordings_dir": str(get_default_recordings_path().resolve()).replace("\\", "/"),
        "music_dir": str(get_default_music_path().resolve()).replace("\\", "/"),
        "output_dir": str(OUTPUT_DIR.resolve()).replace("\\", "/"),
        "default_audio_mode": "auto",
        "fallback_music_volume": 0.40,
        "video_volume": 1.0,
        "normalize_audio": True,
        "auto_scan_recordings": True,
        "subfolder_music_scan": True,
    }

def read_user_settings() -> Dict[str, Any]:
    settings = get_default_settings()
    if USER_SETTINGS_PATH.exists():
        try:
            stored = json.loads(USER_SETTINGS_PATH.read_text(encoding="utf-8"))
            if isinstance(stored, dict):
                for k, v in stored.items():
                    if k in settings and v is not None:
                        settings[k] = v
        except Exception as e:
            logger.warning(f"Failed to read user_settings.json: {e}")
    return settings

def write_user_settings(settings: Dict[str, Any]) -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    tmp_path = USER_SETTINGS_PATH.with_suffix(".tmp")
    tmp_path.write_text(json.dumps(settings, indent=2, ensure_ascii=False), encoding="utf-8")
    tmp_path.replace(USER_SETTINGS_PATH)

def count_directory_files(directory: Path, allowed_exts: set, recursive: bool = True) -> int:
    if not directory.exists() or not directory.is_dir():
        return 0
    count = 0
    try:
        if recursive:
            for root, _, files in os.walk(directory):
                for f in files:
                    if Path(f).suffix.lower() in allowed_exts and not f.startswith("._"):
                        count += 1
        else:
            for f in directory.iterdir():
                if f.is_file() and f.suffix.lower() in allowed_exts and not f.name.startswith("._"):
                    count += 1
    except Exception as e:
        logger.debug(f"Error counting files in {directory}: {e}")
    return count

def compute_settings_stats(settings: Dict[str, Any]) -> Dict[str, Any]:
    rec_p = Path(settings["recordings_dir"]) if settings.get("recordings_dir") else None
    mus_p = Path(settings["music_dir"]) if settings.get("music_dir") else None
    out_p = Path(settings["output_dir"]) if settings.get("output_dir") else None

    rec_valid = bool(rec_p and rec_p.exists() and rec_p.is_dir())
    mus_valid = bool(mus_p and mus_p.exists() and mus_p.is_dir())
    out_valid = bool(out_p and (out_p.exists() or out_p.parent.exists()))

    subfolder_scan = bool(settings.get("subfolder_music_scan", True))

    rec_count = count_directory_files(rec_p, ALLOWED_VIDEO_EXTS, recursive=False) if rec_valid else 0
    mus_count = count_directory_files(mus_p, ALLOWED_AUDIO_EXTS, recursive=subfolder_scan) if mus_valid else 0

    return {
        "recordings_count": rec_count,
        "recordings_dir_valid": rec_valid,
        "music_tracks_count": mus_count,
        "music_dir_valid": mus_valid,
        "output_dir_valid": out_valid,
    }

def get_system_environment_info() -> Dict[str, Any]:
    ffmpeg_bin = shutil.which("ffmpeg")
    return {
        "app_name": APP_NAME,
        "app_version": APP_VERSION,
        "python_version": sys.version.split()[0],
        "platform": f"{platform.system()} {platform.release()}",
        "ffmpeg_detected": ffmpeg_bin is not None,
        "ffmpeg_path": ffmpeg_bin or "Not found in PATH",
    }

@router.get("")
async def get_settings():
    """Retrieve current application settings, directory stats, and system info."""
    settings = read_user_settings()
    stats = compute_settings_stats(settings)
    sys_info = get_system_environment_info()
    return {
        "status": "ok",
        "settings": settings,
        "stats": stats,
        "system_info": sys_info,
    }

@router.post("")
async def save_settings(payload: UserSettings):
    """Validate and persist user settings."""
    current = read_user_settings()
    update_data = payload.model_dump(exclude_unset=True)

    # Sanitize and validate directory paths
    for key in ["recordings_dir", "music_dir", "output_dir"]:
        if key in update_data and update_data[key]:
            val = str(update_data[key]).strip().replace("\\", "/")
            update_data[key] = val

    current.update({k: v for k, v in update_data.items() if v is not None})
    write_user_settings(current)

    stats = compute_settings_stats(current)
    return {
        "status": "ok",
        "message": "Settings saved successfully",
        "settings": current,
        "stats": stats,
    }

def _pick_folder_thread(initial_dir: Optional[str] = None) -> Dict[str, Any]:
    """Runs native Windows Tkinter directory picker on dedicated background thread."""
    try:
        import tkinter as tk
        from tkinter import filedialog
        
        root = tk.Tk()
        root.withdraw()
        root.attributes('-topmost', True)
        
        start_path = initial_dir if (initial_dir and Path(initial_dir).is_dir()) else str(Path.home())
        selected = filedialog.askdirectory(
            initialdir=start_path,
            title="Select Directory - Genshin Abyss Studio"
        )
        root.destroy()
        
        if selected:
            norm = str(Path(selected).resolve()).replace("\\", "/")
            return {"status": "ok", "path": norm, "canceled": False}
        return {"status": "ok", "path": "", "canceled": True}
    except Exception as e:
        logger.error(f"Native folder picker error: {e}")
        return {"status": "error", "message": str(e), "canceled": True}

class BrowseFolderRequest(BaseModel):
    initial_dir: Optional[str] = None
    field: Optional[str] = None

@router.post("/browse-folder")
async def browse_folder(request: BrowseFolderRequest = Body(default=BrowseFolderRequest())):
    """Spawns native OS folder picker dialogue and returns chosen directory."""
    result = await asyncio.to_thread(_pick_folder_thread, request.initial_dir)
    return result

@router.post("/rescan-music")
async def rescan_music():
    """Trigger on-demand indexing of the configured music library."""
    try:
        from execution.music_indexer import index_music_library
        settings = read_user_settings()
        mus_p = Path(settings["music_dir"])
        if not mus_p.exists() or not mus_p.is_dir():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Music directory does not exist: {mus_p}"
            )
        catalog = await asyncio.to_thread(index_music_library, mus_p, True)
        return {
            "status": "ok",
            "message": f"Successfully indexed {catalog.get('total_tracks', 0)} tracks",
            "total_tracks": catalog.get("total_tracks", 0),
            "music_dir": str(mus_p),
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Rescan music failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.post("/reset")
async def reset_settings():
    """Reset configuration to system defaults."""
    defaults = get_default_settings()
    write_user_settings(defaults)
    stats = compute_settings_stats(defaults)
    return {
        "status": "ok",
        "message": "Settings reset to defaults",
        "settings": defaults,
        "stats": stats,
    }
