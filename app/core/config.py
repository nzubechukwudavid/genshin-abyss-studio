"""
Centralized Configuration & Settings for Genshin Abyss Studio.
Loads environment variables, defines canonical directories, and manages security policies.
"""

import os
import sys
from pathlib import Path
from typing import List

# Canonical Application Information
APP_NAME = "Genshin Abyss Studio"
APP_VERSION = "2.0.0"

# Base directory resolution
if getattr(sys, "frozen", False):
    BASE_DIR = Path(sys.executable).resolve().parent
else:
    BASE_DIR = Path(__file__).resolve().parent.parent.parent

DATA_DIR = BASE_DIR / "data"
CATALOG_DIR = DATA_DIR / "catalog"
ASSETS_DIR = DATA_DIR / "assets"
CACHE_DIR = DATA_DIR / "cache"
THUMBS_DIR = CACHE_DIR / "thumbs"
AVATARS_DIR = CACHE_DIR / "characters"
WEB_DIR = BASE_DIR / "web"
OUTPUT_DIR = BASE_DIR / "output"

# Ensure runtime directories exist
CACHE_DIR.mkdir(parents=True, exist_ok=True)
THUMBS_DIR.mkdir(parents=True, exist_ok=True)
AVATARS_DIR.mkdir(parents=True, exist_ok=True)
CATALOG_DIR.mkdir(parents=True, exist_ok=True)
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# Security Policies
ALLOWED_PROXY_DOMAINS = {
    "act-upload.hoyoverse.com",
    "upload-os-bbs.hoyolab.com",
    "wiki.hoyolab.com",
    "fastly.jsdelivr.net",
    "images.weserv.nl",
    "raw.githubusercontent.com",
    "uploadstatic.mihoyo.com",
    "bbs.hoyolab.com",
}

ALLOWED_VIDEO_EXTS = {".mp4", ".mov", ".mkv", ".avi", ".webm"}
ALLOWED_AUDIO_EXTS = {".mp3", ".wav", ".m4a", ".aac", ".ogg", ".flac"}
ALLOWED_IMAGE_EXTS = {".png", ".jpg", ".jpeg", ".webp"}

SYNC_SECRET_TOKEN = os.environ.get("ABYSS_SYNC_TOKEN")

def get_allowed_media_roots() -> List[Path]:
    """Returns validated directories permitted for video and audio streaming."""
    roots = [
        Path.home() / "Videos",
        Path.home() / "Desktop",
        Path.home() / "Music",
        Path.home() / "Downloads",
        DATA_DIR,
        CACHE_DIR,
    ]
    if custom := os.environ.get("ABYSS_MEDIA_ROOT"):
        roots.append(Path(custom).resolve())
    return [r.resolve() for r in roots if r.exists()]

def get_cors_origins() -> List[str]:
    """Returns configured CORS origins."""
    origins = [
        "http://127.0.0.1:7860",
        "http://localhost:7860",
        "http://127.0.0.1:8000",
        "http://localhost:8000"
    ]
    if custom_cors := os.environ.get("ALLOWED_CORS_ORIGINS"):
        origins.extend([o.strip() for o in custom_cors.split(",") if o.strip()])
    return origins
