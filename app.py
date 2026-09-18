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

from app.routers import catalog_router, project_router
app.include_router(catalog_router)
app.include_router(project_router)

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
MAX_MEMORY_CACHE_ITEMS = 250

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


@app.get("/static/assets/{filename}")
async def serve_badge_asset(filename: str):
    file_path = ASSETS_DIR / filename
    if file_path.exists() and file_path.is_file():
        return FileResponse(
            file_path,
            headers={"Cache-Control": "public, max-age=86400, immutable"}
        )
    raise HTTPException(status_code=404, detail="Asset not found")


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
        "platform": sys.platform,
        "capabilities": {
            "local_recordings": not is_cloud,
            "local_music": not is_cloud,
            "capcut_launch": not is_cloud and sys.platform == "win32",
            "cloud_sync": is_cloud
        },
        "description": "Cloud Sandbox (Limited local media automation)" if is_cloud else "Local Desktop Mode (Full hardware & media automation unlocked)"
    }



# 3. Characters Roster API (130 Units)
@app.get("/api/characters")
async def get_characters():
    if HOYOWIKI_CATALOG_FILE.exists():
        try:
            with open(HOYOWIKI_CATALOG_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                return JSONResponse(
                    content=data,
                    headers={"Cache-Control": "public, max-age=86400"}
                )
        except Exception as e:
            logger.error(f"Catalog read error: {e}")

    fallback = {name: {"id": "", "icon": ""} for name in ALL_CHARACTERS}
    return JSONResponse(content=fallback)


AVATAR_ALIAS_MAP = {
    "raiden": "raiden_shogun",
    "shogun": "raiden_shogun",
    "ei": "raiden_shogun",
    "kazuha": "kaedehara_kazuha",
    "ayaka": "kamisato_ayaka",
    "ayato": "kamisato_ayato",
    "kokomi": "sangonomiya_kokomi",
    "itto": "arataki_itto",
    "sara": "kujou_sara",
    "mizuki": "yumemizuki_mizuki",
    "heizou": "shikanoin_heizou",
    "shinobu": "kuki_shinobu",
    "yae": "yae_miko",
    "childe": "tartaglia",
    "tao": "hu_tao",
    "hutao": "hu_tao",
    "scara": "wanderer",
    "scaramouche": "wanderer",
    "yunjin": "yun_jin",
    "traveler": "traveler_anemo",
    "traveler_anemo": "traveler_anemo",
    "traveler_geo": "traveler_geo",
    "traveler_electro": "traveler_electro",
    "traveler_dendro": "traveler_dendro",
    "traveler_hydro": "traveler_hydro",
    "traveler_pyro": "traveler_pyro",
    "traveler_cryo": "traveler_cryo",
}

def safe_avatar_name(name: str) -> str:
    clean = name.lower().replace(" ", "_").replace("'", "").replace("-", "_").replace("(", "").replace(")", "").strip("_")
    if clean in AVATAR_ALIAS_MAP:
        return AVATAR_ALIAS_MAP[clean]
    if (AVATARS_DIR / f"{clean}_icon.png").exists():
        return clean
    # Suffix / partial match against existing avatar icon files
    for f in AVATARS_DIR.glob("*_icon.png"):
        stem = f.name[:-9]
        if stem == clean or stem.endswith(f"_{clean}") or clean.endswith(f"_{stem}"):
            return stem
    return clean

# 3b. Local High-Speed Avatar API (100% Offline, Zero Mobile Data, Zero CORS)
@app.get("/api/avatar/{character_name}")
async def get_character_avatar(character_name: str):
    clean = safe_avatar_name(character_name)
    avatar_file = AVATARS_DIR / f"{clean}_icon.png"
    if avatar_file.exists() and avatar_file.stat().st_size > 500:
        return FileResponse(
            avatar_file,
            media_type="image/png",
            headers={"Cache-Control": "public, max-age=604800, immutable", "Access-Control-Allow-Origin": "*"}
        )
    # Fallback to catalog URL proxy if not yet cached
    if HOYOWIKI_CATALOG_FILE.exists():
        try:
            with open(HOYOWIKI_CATALOG_FILE, "r", encoding="utf-8") as f:
                catalog = json.load(f)
                info = catalog.get(character_name)
                if not info:
                    c_low = character_name.lower().replace("_", " ")
                    for k, v in catalog.items():
                        if k.lower() == c_low or k.lower().endswith(c_low) or c_low.endswith(k.lower()):
                            info = v
                            break
                if info and info.get("icon"):
                    return await proxy_image_endpoint(url=info["icon"], thumb=True)
        except Exception:
            pass
    raise HTTPException(status_code=404, detail=f"Avatar for {character_name} not found")



# 4. Character Gallery & Media Illustrations (HoYoWiki API)
@app.get("/api/character-images/{name_or_id}")
async def get_character_images(name_or_id: str):
    raw_images = AssetManager.get_character_gallery_images(name_or_id)
    enriched = []
    for idx, u in enumerate(raw_images):
        if idx == 0:
            b_type = "portrait"
            badge = "👑 1800p Portrait"
            label = "Official Character Portrait"
            rec = True
        elif idx == 1:
            b_type = "splash"
            badge = "✨ 2K Splash"
            label = "Official Splash Illustration"
            rec = True
        else:
            is_jpg = any(ext in u.lower() for ext in [".jpg", ".jpeg"])
            b_type = "scene" if is_jpg else "art"
            badge = "🖼️ Scene / Wallpaper" if is_jpg else f"🎨 Official Art #{idx + 1}"
            label = "Scene / Wallpaper" if is_jpg else "Official Media Illustration"
            rec = False
        enriched.append({
            "url": u,
            "type": b_type,
            "badge": badge,
            "label": label,
            "recommended": rec,
            "index": idx
        })
    return JSONResponse(
        content=enriched,
        headers={
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0"
        }
    )


# Helper function to generate WebP thumbnail in background worker thread
def _make_webp_thumbnail(raw_bytes: bytes) -> bytes:
    im = Image.open(BytesIO(raw_bytes)).convert("RGBA")
    im.thumbnail((220, 360), Image.Resampling.BILINEAR)
    buf = BytesIO()
    im.save(buf, format="WEBP", quality=80)
    return buf.getvalue()


ALLOWED_PROXY_DOMAINS = {
    "act-upload.hoyoverse.com",
    "act-webstatic.hoyoverse.com",
    "upload-os-bbs.hoyolab.com",
    "wiki.hoyolab.com",
    "fastly.jsdelivr.net",
    "images.weserv.nl",
    "raw.githubusercontent.com",
    "uploadstatic.mihoyo.com",
    "bbs.hoyolab.com",
}

def validate_proxy_url(url: str):
    parsed = urlparse(url)
    if parsed.scheme not in ("http", "https"):
        raise HTTPException(status_code=400, detail="Invalid URL protocol. Only HTTP and HTTPS are permitted.")
    
    hostname = (parsed.hostname or "").lower()
    if not hostname:
        raise HTTPException(status_code=400, detail="Missing hostname in URL.")
    
    is_allowed = any(hostname == d or hostname.endswith("." + d) for d in ALLOWED_PROXY_DOMAINS)
    if not is_allowed:
        raise HTTPException(status_code=400, detail=f"Proxy target host '{hostname}' is not permitted.")
    
    try:
        ip = ipaddress.ip_address(hostname)
        if ip.is_private or ip.is_loopback or ip.is_reserved or ip.is_link_local:
            raise HTTPException(status_code=400, detail="Private or loopback IP proxy targets are strictly prohibited.")
    except ValueError:
        pass


# 5. Non-Blocking Image Proxy with Async HTTP & Fast WebP Caching
@app.get("/api/proxy-image")
async def proxy_image(
    url: str = Query(..., description="External image URL to proxy"),
    thumb: bool = Query(False, description="Serve lightweight thumbnail for filmstrips")
):
    validate_proxy_url(url)

    url_hash = hashlib.md5(url.encode()).hexdigest()
    cache_key = f"{'thumb_' if thumb else 'full_'}{url_hash}"

    # 1. Hot memory cache check (<0.1ms)
    cached_mem = memory_cache_get(cache_key)
    if cached_mem is not None:
        media_type = "image/webp" if thumb else ("image/png" if url.lower().endswith(".png") else "image/jpeg")
        return Response(
            content=cached_mem,
            media_type=media_type,
            headers={"Cache-Control": "public, max-age=604800, immutable", "Access-Control-Allow-Origin": "*"}
        )

    # 2. Fast disk thumbnail cache check
    if thumb:
        cached_thumb = THUMBS_DIR / f"thumb_{url_hash}.webp"
        if cached_thumb.exists():
            thumb_bytes = cached_thumb.read_bytes()
            memory_cache_set(cache_key, thumb_bytes)
            return Response(
                content=thumb_bytes,
                media_type="image/webp",
                headers={"Cache-Control": "public, max-age=604800, immutable", "Access-Control-Allow-Origin": "*"}
            )

    # 3. Disk full proxy check
    cached_proxy = CACHE_DIR / f"proxy_{url_hash}.bin"
    content = None
    if cached_proxy.exists():
        try:
            content = cached_proxy.read_bytes()
        except Exception:
            pass

    # 4. Asynchronous external download without blocking event loop
    if content is None:
        global http_client
        if http_client is None:
            http_client = httpx.AsyncClient(timeout=httpx.Timeout(15.0, connect=5.0))

        headers = {
            "Referer": "https://wiki.hoyolab.com/",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }

        async with HTTP_SEMAPHORE:
            try:
                r = await http_client.get(url, headers=headers)
                if r.status_code == 200:
                    content = r.content
                    atomic_write_bytes(cached_proxy, content)
                else:
                    raise HTTPException(status_code=r.status_code, detail="Could not fetch upstream image")
            except HTTPException:
                raise
            except Exception as e:
                raise HTTPException(status_code=502, detail=f"Upstream download failed: {str(e)}")

    # 5. Generate and cache WebP thumbnail asynchronously in worker thread
    if thumb:
        try:
            cached_thumb = THUMBS_DIR / f"thumb_{url_hash}.webp"
            thumb_bytes = await asyncio.to_thread(_make_webp_thumbnail, content)
            atomic_write_bytes(cached_thumb, thumb_bytes)
            memory_cache_set(cache_key, thumb_bytes)
            return Response(
                content=thumb_bytes,
                media_type="image/webp",
                headers={"Cache-Control": "public, max-age=604800, immutable", "Access-Control-Allow-Origin": "*"}
            )
        except Exception as e:
            logger.warning(f"Thumbnail generation error: {e}")

    # Return full image
    if len(content) < 5_000_000:
        memory_cache_set(cache_key, content)

    media_type = "image/png" if url.lower().endswith(".png") else "image/jpeg"
    return Response(
        content=content,
        media_type=media_type,
        headers={"Cache-Control": "public, max-age=86400, immutable", "Access-Control-Allow-Origin": "*"}
    )


enhancement_semaphore = asyncio.Semaphore(2)


# 5b. Local Anime Super-Sampling & Edge Restoration Engine (100% Offline, Zero Mobile Data)
@app.get("/api/enhance-image")
async def enhance_image(
    url: str = Query(..., description="Image URL or cache path to super-sample"),
    factor: int = Query(2, ge=2, le=4, description="Super-sampling factor (2x, 3x, or 4x)"),
    sharpen: float = Query(0.45, ge=0.0, le=1.5, description="Adaptive unsharp mask intensity")
):
    url_hash = hashlib.md5(url.encode()).hexdigest()
    enhanced_filename = f"enhanced_{url_hash}_{factor}x.png"
    cached_enhanced = CACHE_DIR / enhanced_filename

    # 1. Hot cache check (<0.5ms)
    if cached_enhanced.exists() and cached_enhanced.stat().st_size > 1000:
        return FileResponse(
            cached_enhanced,
            media_type="image/png",
            headers={"Cache-Control": "public, max-age=604800, immutable", "Access-Control-Allow-Origin": "*"}
        )

    # 2. Locate raw source bytes locally
    raw_bytes = None
    cached_proxy = CACHE_DIR / f"proxy_{url_hash}.bin"
    if cached_proxy.exists():
        raw_bytes = cached_proxy.read_bytes()
    elif "name=" in url:
        fn = url.split("name=")[-1]
        local_f = CACHE_DIR / fn
        if local_f.exists():
            raw_bytes = local_f.read_bytes()
    elif "/api/avatar/" in url:
        aname = url.split("/api/avatar/")[-1]
        local_a = AVATARS_DIR / f"{safe_avatar_name(aname)}_icon.png"
        if local_a.exists():
            raw_bytes = local_a.read_bytes()

    # If not yet downloaded, fetch using existing proxy logic
    if raw_bytes is None and (url.startswith("http://") or url.startswith("https://")):
        proxy_resp = await proxy_image(url=url, thumb=False)
        if hasattr(proxy_resp, "body"):
            raw_bytes = proxy_resp.body
        elif cached_proxy.exists():
            raw_bytes = cached_proxy.read_bytes()

    if not raw_bytes:
        raise HTTPException(status_code=404, detail="Source image could not be loaded for enhancement")

    # 3. High-fidelity image upsampling using Lanczos4 resampling in worker thread
    def _process_enhancement(data: bytes, f_scale: int, sh: float) -> bytes:
        img = cv2.imdecode(np.frombuffer(data, np.uint8), cv2.IMREAD_UNCHANGED)
        if img is None:
            raise ValueError("Could not decode image bytes")

        h, w = img.shape[:2]
        # Cap max target dimension to prevent out-of-memory (max 3600px)
        max_dim = max(h, w)
        if max_dim * f_scale > 3600:
            f_scale = max(2, 3600 // max_dim)

        target_w = w * f_scale
        target_h = h * f_scale

        if img.shape[2] == 4:
            bgr = img[:, :, :3]
            alpha = img[:, :, 3] / 255.0

            # Premultiply alpha to eliminate dark halo fringes during Lanczos interpolation
            bgr_pre = bgr.astype(np.float32) * alpha[:, :, np.newaxis]
            bgr_up = cv2.resize(bgr_pre, (target_w, target_h), interpolation=cv2.INTER_LANCZOS4)
            alpha_up = cv2.resize(alpha, (target_w, target_h), interpolation=cv2.INTER_LANCZOS4)
            alpha_up = np.clip(alpha_up, 0.0, 1.0)

            # Un-premultiply alpha safely
            alpha_mask = alpha_up > 0.001
            for c in range(3):
                bgr_up[:, :, c] = np.where(alpha_mask, bgr_up[:, :, c] / np.maximum(alpha_up, 0.001), 0.0)

            bgr_final = np.clip(bgr_up, 0, 255).astype(np.uint8)
            alpha_final = np.clip(alpha_up * 255.0, 0, 255).astype(np.uint8)

            # Gentle sharpening only if explicitly requested (capped at 0.15 to avoid edge halos)
            gentle_sh = min(max(sh, 0.0), 0.15)
            if gentle_sh > 0:
                blur = cv2.GaussianBlur(bgr_final, (0, 0), sigmaX=1.0)
                bgr_final = np.clip(cv2.addWeighted(bgr_final, 1.0 + gentle_sh, blur, -gentle_sh, 0), 0, 255).astype(np.uint8)

            res = cv2.merge([bgr_final, alpha_final])
        else:
            up = cv2.resize(img, (target_w, target_h), interpolation=cv2.INTER_LANCZOS4)
            gentle_sh = min(max(sh, 0.0), 0.15)
            if gentle_sh > 0:
                blur = cv2.GaussianBlur(up, (0, 0), sigmaX=1.0)
                res = np.clip(cv2.addWeighted(up, 1.0 + gentle_sh, blur, -gentle_sh, 0), 0, 255).astype(np.uint8)
            else:
                res = up

        ok, buf = cv2.imencode(".png", res, [cv2.IMWRITE_PNG_COMPRESSION, 4])
        if not ok:
            raise ValueError("PNG encoding failed")
        return buf.tobytes()

    try:
        async with enhancement_semaphore:
            enhanced_bytes = await asyncio.to_thread(_process_enhancement, raw_bytes, factor, sharpen)
        cached_enhanced.write_bytes(enhanced_bytes)
        return Response(
            content=enhanced_bytes,
            media_type="image/png",
            headers={"Cache-Control": "public, max-age=604800, immutable", "Access-Control-Allow-Origin": "*"}
        )
    except Exception as e:
        logger.warning(f"Enhancement error, falling back to raw image: {e}")
        # Graceful fallback to serving original raw bytes
        return Response(
            content=raw_bytes,
            media_type="image/png",
            headers={"Cache-Control": "public, max-age=86400", "Access-Control-Allow-Origin": "*"}
        )


# 6. File Upload with UUID Sanitization & Format Validation
@app.post("/api/upload")
async def upload_custom_image(file: UploadFile = File(...)):
    raw_name = file.filename or "image.png"
    ext = Path(raw_name).suffix.lower()
    if ext not in {".png", ".jpg", ".jpeg", ".webp"}:
        raise HTTPException(status_code=400, detail="Invalid image format. Allowed: PNG, JPG, JPEG, WEBP.")
    
    content = await file.read()
    if len(content) > 25 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Uploaded image exceeds 25MB limit.")
    
    try:
        im = Image.open(BytesIO(content))
        im.verify()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid or corrupted image payload.")

    safe_filename = f"upload_{uuid.uuid4().hex[:12]}{ext}"
    out_path = CACHE_DIR / safe_filename
    out_path.write_bytes(content)
    return {"status": "ok", "url": f"/api/cache-file?name={safe_filename}", "filename": safe_filename}


@app.get("/api/cache-file")
async def get_cached_file(name: str = Query(...)):
    safe_name = Path(name).name
    target = (CACHE_DIR / safe_name).resolve()
    if not target.is_relative_to(CACHE_DIR.resolve()) or not target.exists() or not target.is_file():
        raise HTTPException(status_code=404, detail="File not found in cache")
    media_type = "image/png" if safe_name.lower().endswith(".png") else "image/jpeg"
    return FileResponse(target, media_type=media_type)


# 6b. Offline HoYoWiki Asset Cache Downloader & Status API
_cache_task_state = {
    "status": "idle",
    "current": 0,
    "total": 0,
    "percentage": 0,
    "cached_mb": 0.0,
    "message": "Ready"
}
_cache_task_handle: Optional[asyncio.Task] = None

def _get_cache_dir_size_mb() -> float:
    try:
        total_bytes = sum(f.stat().st_size for f in CACHE_DIR.glob("*") if f.is_file())
        total_bytes += sum(f.stat().st_size for f in THUMBS_DIR.glob("*") if f.is_file())
        return round(total_bytes / (1024 * 1024), 2)
    except Exception:
        return 0.0

async def _run_cache_all_assets_task(full_mode: bool = False):
    global _cache_task_state
    galleries_file = CACHE_DIR / "all_galleries.json"
    if not galleries_file.exists():
        _cache_task_state.update({
            "status": "error",
            "message": "all_galleries.json not found in cache"
        })
        return

    try:
        with open(galleries_file, "r", encoding="utf-8") as f:
            galleries = json.load(f)

        urls_to_cache = []
        for name, urls in galleries.items():
            if not urls:
                continue
            if full_mode:
                urls_to_cache.extend(urls)
            else:
                priority = [u for u in urls if "card" in u.lower() or "character" in u.lower()]
                other = [u for u in urls if u not in priority]
                # Default pre-cache includes priority assets + up to 10 images per character
                urls_to_cache.extend((priority + other)[:10])

        total = len(urls_to_cache)
        _cache_task_state.update({
            "status": "running",
            "total": total,
            "current": 0,
            "percentage": 0,
            "cached_mb": _get_cache_dir_size_mb(),
            "message": f"Pre-caching {total} assets..."
        })

        semaphore = asyncio.Semaphore(10)
        limits = httpx.Limits(max_keepalive_connections=15, max_connections=30)
        timeout = httpx.Timeout(20.0, connect=6.0)

        processed = 0

        async with httpx.AsyncClient(limits=limits, timeout=timeout) as client:
            async def _worker(url: str):
                nonlocal processed
                url_hash = hashlib.md5(url.encode()).hexdigest()
                proxy_file = CACHE_DIR / f"proxy_{url_hash}.bin"
                thumb_file = THUMBS_DIR / f"thumb_{url_hash}.webp"

                raw_bytes = None
                if proxy_file.exists():
                    try:
                        raw_bytes = proxy_file.read_bytes()
                    except Exception:
                        pass

                if raw_bytes is None:
                    headers = {
                        "Referer": "https://wiki.hoyolab.com/",
                        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
                    }
                    async with semaphore:
                        try:
                            resp = await client.get(url, headers=headers)
                            if resp.status_code == 200:
                                raw_bytes = resp.content
                                proxy_file.write_bytes(raw_bytes)
                        except Exception:
                            pass

                if raw_bytes and not thumb_file.exists():
                    try:
                        thumb_bytes = await asyncio.to_thread(_make_webp_thumbnail, raw_bytes)
                        if thumb_bytes:
                            thumb_file.write_bytes(thumb_bytes)
                    except Exception:
                        pass

                processed += 1
                if processed % 5 == 0 or processed == total:
                    pct = int((processed / max(total, 1)) * 100)
                    _cache_task_state.update({
                        "current": processed,
                        "percentage": pct,
                        "cached_mb": _get_cache_dir_size_mb(),
                        "message": f"Cached {processed}/{total} ({pct}%)"
                    })

            tasks = [_worker(u) for u in urls_to_cache]
            await asyncio.gather(*tasks, return_exceptions=True)

        _cache_task_state.update({
            "status": "completed",
            "current": total,
            "percentage": 100,
            "cached_mb": _get_cache_dir_size_mb(),
            "message": f"All {total} character assets cached locally for offline use!"
        })
    except Exception as e:
        _cache_task_state.update({
            "status": "error",
            "message": f"Caching failed: {str(e)}"
        })

# Helper to retrieve character gallery URLs from all_galleries.json or AssetManager
def _get_character_gallery_urls(character_name: str) -> list:
    galleries_file = CACHE_DIR / "all_galleries.json"
    if galleries_file.exists():
        try:
            with open(galleries_file, "r", encoding="utf-8") as f:
                g = json.load(f)
                if character_name in g:
                    return g[character_name]
                c_low = character_name.lower().replace(" ", "").replace("_", "")
                for k, v in g.items():
                    if k.lower().replace(" ", "").replace("_", "") == c_low:
                        return v
        except Exception:
            pass
    return AssetManager.get_character_gallery_images(character_name)

@app.get("/api/assets/character-cache-status/{character_name}")
async def get_character_cache_status(character_name: str):
    urls = _get_character_gallery_urls(character_name)
    if not urls:
        return {"character": character_name, "cached": 0, "total": 0, "is_complete": True}

    cached_count = 0
    for u in urls:
        url_hash = hashlib.md5(u.encode()).hexdigest()
        proxy_file = CACHE_DIR / f"proxy_{url_hash}.bin"
        if proxy_file.exists() and proxy_file.stat().st_size > 500:
            cached_count += 1

    return {
        "character": character_name,
        "cached": cached_count,
        "total": len(urls),
        "is_complete": (cached_count >= len(urls))
    }

@app.post("/api/assets/cache-character/{character_name}")
async def cache_character_gallery(character_name: str):
    urls = _get_character_gallery_urls(character_name)
    if not urls:
        return {"status": "empty", "character": character_name, "cached": 0, "total": 0}

    semaphore = asyncio.Semaphore(8)
    headers = {
        "Referer": "https://wiki.hoyolab.com/",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }

    cached_count = 0
    async with httpx.AsyncClient(timeout=httpx.Timeout(20.0, connect=6.0)) as client:
        async def _cache_single_image(url: str):
            nonlocal cached_count
            url_hash = hashlib.md5(url.encode()).hexdigest()
            proxy_file = CACHE_DIR / f"proxy_{url_hash}.bin"
            thumb_file = THUMBS_DIR / f"thumb_{url_hash}.webp"

            raw_bytes = None
            if proxy_file.exists() and proxy_file.stat().st_size > 500:
                try:
                    raw_bytes = proxy_file.read_bytes()
                except Exception:
                    pass

            if raw_bytes is None:
                async with semaphore:
                    try:
                        r = await client.get(url, headers=headers)
                        if r.status_code == 200:
                            raw_bytes = r.content
                            proxy_file.write_bytes(raw_bytes)
                    except Exception as e:
                        logger.warning(f"Error caching {url}: {e}")

            if raw_bytes:
                cached_count += 1
                if not thumb_file.exists():
                    try:
                        thumb_bytes = await asyncio.to_thread(_make_webp_thumbnail, raw_bytes)
                        if thumb_bytes:
                            thumb_file.write_bytes(thumb_bytes)
                    except Exception as e:
                        logger.warning(f"Thumb generation error: {e}")

        tasks = [_cache_single_image(u) for u in urls]
        await asyncio.gather(*tasks, return_exceptions=True)

    return {
        "status": "ok",
        "character": character_name,
        "cached": cached_count,
        "total": len(urls),
        "is_complete": (cached_count >= len(urls))
    }

@app.post("/api/assets/cache-hoyowiki")
async def trigger_hoyowiki_cache(full: bool = Query(False)):
    global _cache_task_handle, _cache_task_state
    if _cache_task_state["status"] == "running":
        return {"status": "already_running", "progress": _cache_task_state}

    _cache_task_state = {
        "status": "running",
        "current": 0,
        "total": 0,
        "percentage": 0,
        "cached_mb": _get_cache_dir_size_mb(),
        "message": "Initializing asset download..."
    }
    _cache_task_handle = asyncio.create_task(_run_cache_all_assets_task(full_mode=full))
    return {"status": "started", "progress": _cache_task_state}

@app.get("/api/assets/cache-status")
async def get_hoyowiki_cache_status():
    _cache_task_state["cached_mb"] = _get_cache_dir_size_mb()
    return _cache_task_state


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

@app.post("/api/export-canvas")
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
@app.post("/api/export")
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


@app.post("/api/sync-chapters")
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


@app.get("/api/auto-edit-chapters")
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


def stream_file_range(file_path: Path, start: int, end: int, chunk_size: int = 1024 * 1024):
    with open(file_path, "rb") as f:
        f.seek(start)
        remaining = end - start + 1
        while remaining > 0:
            read_len = min(chunk_size, remaining)
            chunk = f.read(read_len)
            if not chunk:
                break
            remaining -= len(chunk)
            yield chunk


def get_allowed_media_roots() -> list[Path]:
    roots = [
        Path.home() / "Videos",
        Path.home() / "Desktop",
        Path.home() / "Music",
        Path.home() / "Downloads",
        BASE_DIR / "data",
        CACHE_DIR,
    ]
    if custom := os.environ.get("ABYSS_MEDIA_ROOT"):
        roots.append(Path(custom).resolve())
    return [r.resolve() for r in roots if r.exists()]


def validate_safe_media_path(path_str: str) -> Path:
    try:
        target = Path(path_str).resolve()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid path string.")
    
    allowed_roots = get_allowed_media_roots()
    if not any(target == r or r in target.parents for r in allowed_roots):
        raise HTTPException(status_code=403, detail="Access to the specified media path is restricted.")
    if not target.exists() or not target.is_file():
        raise HTTPException(status_code=404, detail="Requested media file not found.")
    return target


@app.get("/api/stream-video")
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


@app.get("/api/stream-audio")
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


# 10. Music Catalog & Recommendation Endpoints
@app.get("/api/music-catalog/status")
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


@app.post("/api/music-catalog/rescan")
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


@app.get("/api/music-catalog/recommend")
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


@app.get("/api/video-thumbnail")
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


@app.get("/api/recordings/sessions")
async def get_recording_sessions_endpoint(session_id: Optional[str] = Query(None)):
    """Returns clustered recording sessions and active slot assignments for the Video Arranger."""
    try:
        from execution.auto_edit_abyss import (
            get_default_recordings_dir,
            cluster_recording_sessions,
            find_latest_screen_recordings,
            probe_video_metadata,
            detect_chamber_intermission,
            format_timestamp
        )
        rec_dir = get_default_recordings_dir()
        sessions_raw = cluster_recording_sessions(rec_dir)
        sessions_data = []
        for idx, s in enumerate(sessions_raw):
            c_list = []
            for p in s.get("clips", []):
                dur_s = 0.0
                try:
                    dur_s, _, _, _ = probe_video_metadata(p)
                except Exception:
                    pass
                c_list.append({
                    "filename": p.name,
                    "path": str(p.resolve()),
                    "duration_sec": dur_s,
                    "duration_formatted": format_timestamp(dur_s),
                    "thumbnail_url": f"/api/video-thumbnail?path={p.resolve()}"
                })
            sessions_data.append({
                "session_id": f"session_{idx}",
                "label": s["label"],
                "clip_count": len(c_list),
                "clips": c_list
            })

        # Resolve target session based on requested session_id
        target_idx = 0
        if session_id:
            for idx in range(len(sessions_raw)):
                if f"session_{idx}" == session_id:
                    target_idx = idx
                    break

        if sessions_raw:
            target_session = sessions_raw[target_idx]
            s_clips = target_session.get("clips", [])
            recs = s_clips[-4:] if len(s_clips) >= 4 else s_clips
            selected_session_id = f"session_{target_idx}"
        else:
            recs = find_latest_screen_recordings(rec_dir, count=4)
            selected_session_id = "session_0"

        active_slots = []
        labels = ["Chamber 1 (Floor 12-1)", "Chamber 2 (Floor 12-2)", "Chamber 3 (Floor 12-3)", "Character Builds & Weapons"]
        for i, f in enumerate(recs):
            dur_s = 0.0
            try:
                dur_s, _, _, _ = probe_video_metadata(f)
            except Exception:
                pass
            f_size = 0
            try:
                f_size = f.stat().st_size
            except Exception:
                pass

            cut_info = None
            is_builds = (i == 3) or (len(recs) == 4 and i == 3)
            if not is_builds and dur_s > 0:
                try:
                    c = detect_chamber_intermission(f, dur_s)
                    cut_info = {
                        "h1_dur_formatted": format_timestamp(c.h1_dur),
                        "h2_dur_formatted": format_timestamp(c.h2_dur),
                        "trimmed_sec": round(c.trimmed, 2),
                        "confidence": c.confidence
                    }
                except Exception as e:
                    logging.getLogger("abyss_studio").warning(f"Failed to detect intermission for {f.name}: {e}")

            active_slots.append({
                "slot": i,
                "label": labels[i] if i < len(labels) else f"Clip {i+1}",
                "filename": f.name,
                "path": str(f.resolve()),
                "duration_sec": dur_s,
                "duration_formatted": format_timestamp(dur_s),
                "filesize_mb": round(f_size / (1024 * 1024), 1),
                "thumbnail_url": f"/api/video-thumbnail?path={f.resolve()}",
                "cut_info": cut_info
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


_trim_overrides_lock = asyncio.Lock()

@app.post("/api/recordings/trim-override")
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


@app.get("/api/recording-slots")
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


@app.get("/api/music-catalog/tracks")
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

@app.post("/api/export-bgm-suite")
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


@app.post("/api/assemble-capcut")
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
                if f"session_{idx}" == session_id:
                    s_clips = s.get("clips", [])
                    recs = s_clips[-4:] if len(s_clips) >= 4 else s_clips
                    break

        if not recs:
            recs = find_latest_screen_recordings(rec_dir, count=4)

        if len(recs) < 3:
            return {"status": "error", "message": f"Found only {len(recs)} clips in session. Need at least 3 chamber clips."}

        chamber_files = recs[:3]
        builds_file = recs[3] if len(recs) >= 4 else None
        trans = payload.get("transition", "black_fade")
        vol = float(payload.get("volume", 0.10))

        # Run project assembly in thread to not block event loop
        result = await asyncio.to_thread(
            assemble_abyss_project,
            chamber_files=chamber_files,
            builds_file=builds_file,
            transition_type=trans,
            music_volume=vol,
            clip_volume=vol,
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


if __name__ == "__main__":
    host = os.environ.get("HOST", "0.0.0.0")
    port = int(os.environ.get("PORT", "7860"))
    logger.info(f"Starting Genshin Spiral Abyss Thumbnail Studio on http://{host}:{port}...")
    uvicorn.run(app, host=host, port=port, log_level="info")

