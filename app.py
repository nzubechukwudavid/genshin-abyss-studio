import gc
"""
Genshin Impact Spiral Abyss YouTube Thumbnail Studio - Web Application
DOE-VERSION: 2026.09.10

FastAPI-powered studio featuring:
- Canva-style interactive visual cropping with live 60fps touch/mouse manipulation
- Complete 130-character official HoYoWiki roster with avatars
- Dynamic HoYoWiki Gallery Filmstrip (announcements, birthday art, character cards, splash)
- Zero-latency client-side rendering with instant 1080p export
- Non-blocking async proxy streaming (via httpx) with persistent WebP thumbnail caching
"""

import os
import sys
import time
import json
import socket
import hashlib
import asyncio
import logging
from pathlib import Path
from io import BytesIO
from typing import Optional, List
from PIL import Image
import cv2
import numpy as np
import uuid
from urllib.parse import urlparse
import ipaddress

import httpx
import uvicorn

from contextlib import asynccontextmanager
from fastapi import FastAPI, UploadFile, File, Query, HTTPException, Response, Request, Body
from fastapi.responses import HTMLResponse, FileResponse, JSONResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Add project root to sys.path
if getattr(sys, "frozen", False):
    BASE_DIR = Path(sys.executable).resolve().parent
else:
    BASE_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BASE_DIR))

from app.core.config import APP_NAME, APP_VERSION
from app.core.logger import logger

from execution.generate_abyss_thumbnail import (
    ThumbnailRenderer,
    AssetManager,
    ALL_CHARACTERS,
    HOYOWIKI_CATALOG_FILE,
    OUTPUT_DIR,
    CACHE_DIR,
    ASSETS_DIR
)

DATA_DIR = BASE_DIR / "data"
WEB_DIR = BASE_DIR / "web"
THUMBS_DIR = CACHE_DIR / "thumbs"
THUMBS_DIR.mkdir(parents=True, exist_ok=True)
AVATARS_DIR = CACHE_DIR / "characters"
AVATARS_DIR.mkdir(parents=True, exist_ok=True)

# Non-blocking async HTTP client with connection pooling
# Limits concurrent external connections to prevent overwhelming network/Hoyoverse CDN
HTTP_SEMAPHORE = asyncio.Semaphore(12)
http_client: Optional[httpx.AsyncClient] = None

async def warmup_popular_roster():
    # Only run in cloud environments with unmetered connections
    if os.environ.get("AUTO_WARMUP", "0") != "1":
        logger.info("Data-Saver Mode: Auto-warmup disabled to protect mobile data.")
        return
    try:
        from execution.cache_all_assets import cache_all_assets
        await asyncio.sleep(2)
        await cache_all_assets(limit_chars=30, max_per_char=2)
    except Exception as e:
        logger.warning(f"Background warmup note: {e}")

@asynccontextmanager
async def lifespan(app: FastAPI):
    global http_client
    limits = httpx.Limits(max_keepalive_connections=20, max_connections=40)
    timeout = httpx.Timeout(15.0, connect=5.0)
    http_client = httpx.AsyncClient(limits=limits, timeout=timeout)
    asyncio.create_task(warmup_popular_roster())
    yield
    if http_client:
        await http_client.aclose()

app = FastAPI(
    title=APP_NAME,
    description="Production-Grade Spiral Abyss Video Auto-Editor, CapCut PC Draft Synthesizer, 1080p Canvas Studio & BGM Intelligence Hub",
    version=APP_VERSION,
    lifespan=lifespan
)

from app.routers import (
    catalog_router,
    project_router,
    settings_router,
    capcut_router,
    stygian_router,
    characters_router,
    recordings_router,
    music_router,
    assembly_router,
)
from app.routers.characters import enhancement_semaphore
from app.services.security_service import validate_safe_media_path, validate_proxy_url
from app.services.media_service import parse_byte_range, stream_file_range

app.include_router(catalog_router)
app.include_router(project_router)
app.include_router(settings_router)
app.include_router(capcut_router)
app.include_router(stygian_router)
app.include_router(characters_router)
app.include_router(recordings_router)
app.include_router(music_router)
app.include_router(assembly_router)

# Enable CORS
# Configure explicit CORS origins for security
cors_origins = [
    "http://127.0.0.1:7860",
    "http://localhost:7860",
    "http://127.0.0.1:8000",
    "http://localhost:8000"
]
if custom_cors := os.environ.get("ALLOWED_CORS_ORIGINS"):
    cors_origins.extend([o.strip() for o in custom_cors.split(",") if o.strip()])

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# In-memory bounded LRU byte cache for fast hot-path responses
from collections import OrderedDict
from app.core.fs import atomic_write_bytes, atomic_write_text, atomic_write_json

logger = logging.getLogger("genshin_abyss_studio")

MEMORY_CACHE: OrderedDict[str, bytes] = OrderedDict()
MAX_MEMORY_CACHE_ITEMS = 25

def memory_cache_get(key: str) -> Optional[bytes]:
    if key in MEMORY_CACHE:
        MEMORY_CACHE.move_to_end(key)
        return MEMORY_CACHE[key]
    return None

def memory_cache_set(key: str, data: bytes) -> None:
    MEMORY_CACHE[key] = data
    MEMORY_CACHE.move_to_end(key)
    if len(MEMORY_CACHE) > MAX_MEMORY_CACHE_ITEMS:
        MEMORY_CACHE.popitem(last=False)



# 1. Main UI
@app.get("/", response_class=HTMLResponse)
async def serve_studio():
    index_file = WEB_DIR / "index.html"
    if not index_file.exists():
        raise HTTPException(status_code=404, detail="Studio interface not found")
    return HTMLResponse(
        content=index_file.read_text(encoding="utf-8"),
        headers={"Cache-Control": "no-cache"}
    )


@app.get("/favicon.ico")
async def serve_favicon():
    icon_file = BASE_DIR / "data" / "assets" / "app_icon.ico"
    if icon_file.exists():
        return FileResponse(icon_file, media_type="image/x-icon")
    raise HTTPException(status_code=404, detail="Favicon not found")


# 2. Static Assets (CSS, JS, Assets)
@app.get("/static/style.css")
async def serve_css():
    return FileResponse(
        WEB_DIR / "style.css",
        media_type="text/css",
        headers={
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0"
        }
    )


@app.get("/static/studio.js")
async def serve_js():
    return FileResponse(
        WEB_DIR / "studio.js",
        media_type="application/javascript",
        headers={
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0"
        }
    )


@app.get("/static/modules/{filename}")
async def serve_module_file(filename: str):
    module_path = WEB_DIR / "modules" / filename
    if module_path.exists() and module_path.is_file():
        return FileResponse(
            module_path,
            media_type="application/javascript",
            headers={
                "Cache-Control": "no-cache, no-store, must-revalidate",
                "Pragma": "no-cache",
                "Expires": "0"
            }
        )
    raise HTTPException(status_code=404, detail=f"Module {filename} not found")


@app.get("/static/assets/bosses/{filename}")
async def serve_boss_asset(filename: str):
    file_path = ASSETS_DIR / "bosses" / filename
    if file_path.exists() and file_path.is_file():
        return FileResponse(
            file_path,
            headers={"Cache-Control": "public, max-age=86400"}
        )
    raise HTTPException(status_code=404, detail="Boss asset not found")



@app.get("/static/assets/{filename}")
async def serve_badge_asset(filename: str):
    file_path = ASSETS_DIR / filename
    if file_path.exists() and file_path.is_file():
        return FileResponse(
            file_path,
            headers={"Cache-Control": "public, max-age=86400, immutable"}
        )
    raise HTTPException(status_code=404, detail="Asset not found")



@app.get("/static/fonts/{filename}")
async def serve_font_asset(filename: str):
    font_path = WEB_DIR / "fonts" / filename
    if not font_path.exists():
        font_path = ASSETS_DIR / "fonts" / filename
    if font_path.exists() and font_path.is_file():
        media_type = "font/woff2" if filename.endswith(".woff2") else ("font/otf" if filename.endswith(".otf") else "font/ttf")
        return FileResponse(
            font_path,
            media_type=media_type,
            headers={"Cache-Control": "public, max-age=31536000, immutable"}
        )
    raise HTTPException(status_code=404, detail=f"Font {filename} not found")


@app.get("/static/renders/{char_name}/{filename}")
async def serve_render_asset(char_name: str, filename: str):
    if ".." in char_name or ".." in filename or "/" in filename or "\\" in filename:
        raise HTTPException(status_code=403, detail="Access denied")
    render_path = DATA_DIR / "renders" / char_name / filename
    if render_path.exists() and render_path.is_file():
        return FileResponse(
            render_path,
            media_type="image/png",
            headers={"Cache-Control": "public, max-age=86400"}
        )
    raise HTTPException(status_code=404, detail="Render not found")



@app.get("/api/environment")
async def get_environment_info():
    """Returns runtime execution environment and hardware/cloud capability status."""
    is_docker = os.path.exists("/.dockerenv") or bool(os.environ.get("CONTAINER"))
    is_cloud = bool(
        os.environ.get("RENDER")
        or os.environ.get("SPACE_ID")
        or os.environ.get("FLY_ALLOC_ID")
        or is_docker
    )
    mode = "cloud" if is_cloud else "desktop"
    return {
        "mode": mode,
        "version": APP_VERSION,
        "platform": sys.platform,
        "capabilities": {
            "local_recordings": not is_cloud,
            "local_music": not is_cloud,
            "capcut_launch": not is_cloud and sys.platform == "win32",
            "cloud_sync": is_cloud
        },
        "description": "Cloud Sandbox (Limited local media automation)" if is_cloud else "Local Desktop Mode (Full hardware & media automation unlocked)"
    }




@app.get("/api/health")
async def health_check():
    """Authoritative service health check and readiness probe with subsystem diagnostics."""
    from app.core.config import APP_VERSION, APP_NAME, CATALOG_DIR, CACHE_DIR

    checks = {}

    # 1. Catalog readability
    catalog_ok = (CATALOG_DIR / "meta_teams.json").exists() and (CATALOG_DIR / "meta_archetypes.json").exists()
    checks["catalog"] = "ok" if catalog_ok else "missing"

    # 2. Cache writability
    try:
        test_file = CACHE_DIR / f".health_probe_{os.getpid()}.tmp"
        test_file.write_text("ok", encoding="utf-8")
        test_file.unlink()
        checks["cache_writable"] = True
    except Exception:
        checks["cache_writable"] = False

    # 3. Local recordings directory
    try:
        from execution.auto_edit_abyss import get_default_recordings_dir
        rec_dir = get_default_recordings_dir()
        checks["recordings_dir"] = "available" if rec_dir.exists() else "not_configured"
    except Exception:
        checks["recordings_dir"] = "unavailable"

    # 4. CapCut PC installation
    try:
        from execution.auto_edit_abyss import get_capcut_drafts_dir
        drafts_dir = get_capcut_drafts_dir()
        checks["capcut_detected"] = bool(drafts_dir and drafts_dir.exists())
    except Exception:
        checks["capcut_detected"] = False

    overall_status = "ok" if (checks["catalog"] == "ok" and checks["cache_writable"]) else "degraded"

    return {
        "status": overall_status,
        "app": APP_NAME,
        "version": APP_VERSION,
        "service": "genshin-abyss-studio",
        "mode": "desktop" if sys.platform == "win32" else "cloud",
        "timestamp": time.time(),
        "checks": checks
    }


